// Vercel Serverless Function: /api/get-key.ts

// This function securely provides the frontend Firebase config.
export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const firebaseConfigString = process.env.FIREBASE_CONFIG;

    if (!firebaseConfigString) {
        console.error("FIREBASE_CONFIG environment variable is not set.");
        return res.status(500).json({ error: "Server configuration error: Firebase config not found." });
    }

    // We will parse the JSON string on the server.
    // If it's invalid, we catch the error and send a clear response.
    // If it's valid, we re-serialize it with res.json() to ensure the client
    // receives a perfectly formatted JSON object, free of any extra characters
    // or whitespace that might have been in the original environment variable string.
    try {
        const configObject = JSON.parse(firebaseConfigString);
        return res.status(200).json(configObject);
    } catch (e) {
        console.error("FIREBASE_CONFIG is not valid JSON. Value:", firebaseConfigString);
        return res.status(500).json({ 
            error: "Server configuration error: The FIREBASE_CONFIG environment variable contains invalid JSON." 
        });
    }
}