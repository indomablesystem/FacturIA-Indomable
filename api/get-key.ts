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

    // We will validate the JSON on the server first.
    // This ensures that if the environment variable is malformed, we catch it here
    // and send a clean error response to the client.
    try {
        JSON.parse(firebaseConfigString);
    } catch (e) {
        console.error("FIREBASE_CONFIG is not valid JSON. Value:", firebaseConfigString);
        return res.status(500).json({ 
            error: "Server configuration error: The FIREBASE_CONFIG environment variable contains invalid JSON." 
        });
    }

    // If the JSON is valid, we send the raw string directly.
    // This avoids any potential issues with the server re-stringifying the object
    // and ensures the client receives the exact value from the environment variable.
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(firebaseConfigString);
}