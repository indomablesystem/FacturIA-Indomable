import admin from 'firebase-admin';

// Initialize the Firebase Admin SDK only if it hasn't been already.
// This is a singleton pattern to prevent re-initialization on every function invocation in a warm serverless environment.
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.ADMIN_CONFIG_JSON!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error', error.stack);
  }
}

export default admin;