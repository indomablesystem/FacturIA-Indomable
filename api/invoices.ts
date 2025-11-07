// Vercel Serverless Function: /api/invoices.ts
import { GoogleGenAI, Type } from "@google/genai";
import admin from './_utils/firebase-admin';

// This function is the single entry point for invoice processing.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // Verify Firebase Authentication token
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        await admin.auth().verifyIdToken(token);
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }

    const { fileData, mimeType } = req.body;

    if (!fileData || !mimeType) {
        return res.status(400).json({ error: 'Missing fileData or mimeType in request body.' });
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
        const parsedData = JSON.parse(jsonText);

        res.status(200).json(parsedData);

    } catch (error) {
        console.error('Error processing invoice with Gemini:', error);
        res.status(500).json({ error: 'Failed to extract data from invoice. The AI model could not process the document.' });
    }
}