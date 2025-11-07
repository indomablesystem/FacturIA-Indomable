// Vercel Serverless Function: /api/invoices.ts
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Add explicit import for Buffer to resolve TypeScript type error.
// The Buffer object is available globally in Node.js environments (like Vercel serverless functions),
// but importing it explicitly makes the dependency clear and helps with type checking.
import { Buffer } from "buffer";

/**
 * Verifies a Firebase Auth ID token using Google's Identity Toolkit REST API.
 * This avoids the need for the Firebase Admin SDK and service account credentials.
 * @param token The ID token from the client.
 * @returns A promise that resolves to true if the token is valid, false otherwise.
 */
async function verifyToken(token: string): Promise<boolean> {
    const firebaseConfigString = process.env.FIREBASE_CONFIG;
    if (!firebaseConfigString) {
        console.error("Server Error: FIREBASE_CONFIG environment variable is not set.");
        return false;
    }

    let firebaseApiKey;
    try {
        const correctedJsonString = firebaseConfigString.trim().replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        const configObject = JSON.parse(correctedJsonString);
        firebaseApiKey = configObject.apiKey;
        if (!firebaseApiKey) {
            console.error("Server Error: 'apiKey' not found in parsed FIREBASE_CONFIG.");
            return false;
        }
    } catch (e) {
        console.error("Server Error: Failed to parse FIREBASE_CONFIG to get apiKey:", e);
        return false;
    }


    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Token verification failed:', errorData?.error?.message || 'Unknown error from Identity Toolkit');
            return false;
        }
        
        // If the request succeeds with a 200 OK, the token is valid.
        return true;

    } catch (error) {
        console.error('Network error during token verification:', error);
        return false;
    }
}


// This function is the single entry point for invoice processing.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // Verify Firebase Authentication token using the simplified REST API method
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        const isValid = await verifyToken(token);
        if (!isValid) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
        }
    } catch (error) {
        console.error('Error during token verification process:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }

    const { downloadUrl, mimeType } = req.body;

    if (!downloadUrl || !mimeType) {
        return res.status(400).json({ error: 'Missing downloadUrl or mimeType in request body.' });
    }

    let fileData;
    try {
        // Fetch the file from the public URL provided by Firebase Storage
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
            throw new Error(`Failed to download file from storage: ${fileResponse.statusText}`);
        }
        // Convert the file to a buffer, then to a base64 string
        const fileBuffer = await fileResponse.arrayBuffer();
        fileData = Buffer.from(fileBuffer).toString('base64');
    } catch (error: any) {
        console.error('Error fetching invoice file from URL:', error);
        return res.status(500).json({ error: `Failed to retrieve invoice file from storage. ${error.message}` });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable is not set.");
        return res.status(500).json({ error: "Server configuration error: API key not found." });
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const invoiceSchema = {
        type: Type.OBJECT,
        properties: {
            cliente: { type: Type.STRING, description: "The name of the company or person the invoice is issued to (the client)." },
            invoiceNumber: { type: Type.STRING, description: "The unique identifier for the invoice." },
            date: { type: Type.STRING, description: "The issue date of the invoice (YYYY-MM-DD)." },
            dueDate: { type: Type.STRING, description: "The due date for the payment (YYYY-MM-DD)." },
            totalAmount: { type: Type.NUMBER, description: "The total amount to be charged." },
            taxAmount: { type: Type.NUMBER, description: "The total amount of taxes (VAT/IVA)." },
            irpfAmount: { type: Type.NUMBER, description: "The total amount of IRPF withholding. Explicitly look for 'TOTAL IRPF'. If not present, return 0." },
            currency: { type: Type.STRING, description: "The currency of the amounts (e.g., USD, EUR)." },
            lineItems: {
                type: Type.ARRAY,
                description: "A list of all billed items or services.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unitPrice: { type: Type.NUMBER },
                        total: { type: Type.NUMBER },
                    },
                    required: ["description", "quantity", "unitPrice", "total"]
                }
            },
        },
        required: ["cliente", "invoiceNumber", "date", "totalAmount"]
    };

    try {
        const filePart = { inlineData: { data: fileData, mimeType } };
        const prompt = "You are an expert accounting assistant. Analyze the following invoice document (image or PDF) and extract the specified information. Pay close attention to extracting the value labeled 'TOTAL IRPF' for the `irpfAmount` field. If a field is not present, return null for its value (or 0 for numeric fields like irpfAmount). The response must be in JSON format matching the provided schema.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, filePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: invoiceSchema,
            },
        });
        
        const jsonText = response.text.trim();
        let parsedData = JSON.parse(jsonText);
        
        // --- START: Server-Side Data Sanitization ---
        // Ensures data stored in Firestore is clean and consistent.
        const isValidDateString = (dateStr: any) => {
            if (typeof dateStr !== 'string' || dateStr.trim() === '') return false;
            return !isNaN(new Date(dateStr).getTime());
        };

        const sanitizedData = {
            cliente: parsedData.cliente || "N/A",
            invoiceNumber: parsedData.invoiceNumber || "N/A",
            date: isValidDateString(parsedData.date) ? parsedData.date : new Date().toISOString().split('T')[0],
            dueDate: isValidDateString(parsedData.dueDate) ? parsedData.dueDate : "",
            totalAmount: Number(parsedData.totalAmount) || 0,
            taxAmount: Number(parsedData.taxAmount) || 0,
            irpfAmount: Number(parsedData.irpfAmount) || 0,
            currency: parsedData.currency || "EUR",
            lineItems: Array.isArray(parsedData.lineItems) ? parsedData.lineItems : []
        };
        // --- END: Server-Side Data Sanitization ---

        res.status(200).json(sanitizedData);

    } catch (error) {
        console.error('Error processing invoice with Gemini:', error);
        res.status(500).json({ error: 'Failed to extract data from invoice. The AI model could not process the document.' });
    }
}