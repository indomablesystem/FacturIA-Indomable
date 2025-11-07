import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let isInitialized = false;

// Initialize the Firebase Admin SDK only if it hasn't been already.
if (!getApps().length) {
  try {
    const serviceAccountString = process.env.ADMIN_CONFIG_JSON;
    if (!serviceAccountString) {
        throw new Error('The ADMIN_CONFIG_JSON environment variable is not set or is empty.');
    }

    const correctedJsonString = serviceAccountString.trim().replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    const serviceAccount = JSON.parse(correctedJsonString);

    // Add crucial checks for essential properties before initializing
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('The parsed service account JSON is missing one or more required fields (project_id, private_key, client_email).');
    }
    
    initializeApp({
      credential: cert(serviceAccount)
    });
    isInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
    
  } catch (error: any) {
    let errorMessage = 'CRITICAL: Firebase Admin SDK initialization failed. ';
    if (error instanceof SyntaxError) {
        errorMessage += 'The ADMIN_CONFIG_JSON environment variable contains invalid JSON. Please ensure it is a valid, quoted JSON string.';
    } else {
        errorMessage += error.message;
    }
    // Log detailed info to Vercel logs for easier debugging
    console.error(errorMessage);
    console.error("Full initialization error object:", error);
  }
} else {
    isInitialized = true;
}

/**
 * Gets the admin Auth instance safely.
 * @returns The Auth instance if initialized, otherwise null.
 */
const getAdminAuth = (): Auth | null => {
    if (isInitialized) {
        try {
            return getAuth();
        } catch (e) {
            console.error("Failed to get Firebase Auth instance even though app is initialized.", e);
            return null;
        }
    }
    return null;
};

// The `isInitialized` flag is the primary gatekeeper for its usage.
export { getAdminAuth, isInitialized };
