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
    const serviceAccount = JSON.parse(serviceAccountString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isInitialized = true;
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // isInitialized remains false
  }
} else {
    isInitialized = true;
}

export { admin, isInitialized };
