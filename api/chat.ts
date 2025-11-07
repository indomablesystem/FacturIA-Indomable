// Vercel Serverless Function: /api/chat.ts
import { GoogleGenAI } from "@google/genai";
import { getAdminAuth, isInitialized } from './_utils/firebase-admin';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    if (!isInitialized) {
        console.error("Aborting chat request: Firebase Admin SDK is not initialized.");
        return res.status(500).json({ error: 'Server configuration error: Could not connect to authentication service.' });
    }

    // Verify Firebase Authentication token
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        const auth = getAdminAuth();
        if (!auth) {
            return res.status(500).json({ error: 'Server configuration error: Authentication service is not available.' });
        }
        await auth.verifyIdToken(token);
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
    
    const { message, invoicesContext } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing message in request body.' });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable is not set.");
        return res.status(500).json({ error: "Server configuration error: API key not found." });
    }
    
    const ai = new GoogleGenAI({ apiKey });

    const context = `
      You are Indomable FacturIA, a friendly and insightful AI accounting assistant.
      Your goal is to help the user understand their financial data based on the SALES invoices (what they have earned) they have uploaded.
      Be concise, helpful, and use the provided data to answer questions.
      If you don't have enough information, say so. Do not invent data.
      Current Date: ${new Date().toLocaleDateString('es-ES')}
      
      Here is the user's invoice data in JSON format:
      ${JSON.stringify(invoicesContext, null, 2)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
              systemInstruction: context,
            },
        });

        res.status(200).json({ response: response.text });
    } catch (error) {
        console.error('Error getting chat response from Gemini:', error);
        res.status(500).json({ error: 'Failed to get a response from the AI assistant.' });
    }
}