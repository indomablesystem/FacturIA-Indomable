import admin from 'firebase-admin';

let isInitialized = false;

// Initialize the Firebase Admin SDK only if it hasn't been already.
// This prevents re-initialization on every function invocation in a warm serverless environment.
if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.ADMIN_CONFIG_JSON;
    if (!serviceAccountString) {
        throw new Error('The ADMIN_CONFIG_JSON environment variable is not set or is empty.');
    }

    // A common user error is to paste a JS object (with unquoted keys)
    // instead of a valid JSON string. This correction step makes the endpoint
    // more robust by adding quotes around unquoted keys before parsing.
    const correctedJsonString = serviceAccountString.trim().replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    
    const serviceAccount = JSON.parse(correctedJsonString);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isInitialized = true;
    
  } catch (error: any) {
    let errorMessage = 'Firebase Admin SDK initialization error: ';
    if (error instanceof SyntaxError) {
        errorMessage += 'The ADMIN_CONFIG_JSON environment variable contains invalid JSON. Please ensure it is a valid, quoted JSON string.';
    } else {
        errorMessage += error.message;
    }
    console.error(errorMessage);
    // isInitialized remains false
  }
} else {
    isInitialized = true;
}

export { admin, isInitialized };