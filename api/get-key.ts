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

    // A common user error is to paste a JS object (with unquoted keys)
    // instead of a valid JSON string. This correction step makes the endpoint
    // more robust by adding quotes around unquoted keys before parsing.
    const correctedJsonString = firebaseConfigString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    try {
        const configObject = JSON.parse(correctedJsonString);
        return res.status(200).json(configObject);
    } catch (e) {
        console.error("FIREBASE_CONFIG is not valid JSON even after attempting correction. Original value:", firebaseConfigString);
        console.error("Parsing error:", e);
        return res.status(500).json({ 
            error: "Server configuration error: The FIREBASE_CONFIG environment variable contains invalid JSON." 
        });
    }
}