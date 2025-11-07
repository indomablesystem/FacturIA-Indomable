import { initializeApp, FirebaseApp } from "firebase/app";

let appPromise: Promise<FirebaseApp> | null = null;

const initializeFirebase = async (): Promise<FirebaseApp> => {
    // FIX: Cast import.meta to any to resolve TypeScript error with Vite env variables.
    const configString = (import.meta as any).env.VITE_FIREBASE_CONFIG;
    if (!configString) {
        const errorMessage = "La configuración de Firebase no se ha encontrado. Asegúrate de que la variable de entorno VITE_FIREBASE_CONFIG esté correctamente configurada en Vercel.";
        console.error(errorMessage);
        // Muestra un error claro en la pantalla si la variable no está configurada
        document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: sans-serif; background: #0D0E1C; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center;"><div><h1>Error de Configuración</h1><p>${errorMessage}</p><p>Por favor, revisa las instrucciones y la configuración de tu proyecto en Vercel.</p></div></div>`;
        throw new Error(errorMessage);
    }

    try {
        const firebaseConfig = JSON.parse(configString);
        if (!firebaseConfig.apiKey) {
            throw new Error("La configuración de Firebase no es válida o le falta la apiKey.");
        }
        return initializeApp(firebaseConfig);
    } catch (error) {
        console.error("La inicialización de Firebase ha fallado:", error);
        throw error;
    }
};

export const getFirebaseApp = (): Promise<FirebaseApp> => {
    if (!appPromise) {
        appPromise = initializeFirebase();
    }
    return appPromise;
};
