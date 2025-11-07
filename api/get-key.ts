// This file is a Vercel serverless function.
// It will be hosted at the endpoint /api/get-key.
// Its purpose is to securely expose your API_KEY environment variable to the frontend application.

// We use 'any' for the request and response types to avoid adding external dependencies like '@vercel/node'.
export default function handler(req: any, res: any) {
    // This function only responds to GET requests.
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const apiKey = process.env.API_KEY;

    // If the API_KEY is not set in your Vercel project settings, return an error.
    if (!apiKey) {
        console.error("API_KEY environment variable is not set on the server.");
        return res.status(500).json({ 
            error: "La clave de API no está configurada en el servidor. Asegúrate de haberla añadido en la configuración de Vercel." 
        });
    }

    // Send the API key back to the client.
    // For security, you should restrict your Gemini API key in the Google Cloud console
    // to only be usable from your application's domain.
    res.status(200).json({ apiKey });
}
