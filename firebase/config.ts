import { initializeApp, FirebaseApp } from "firebase/app";

let appPromise: Promise<FirebaseApp> | null = null;

const fetchFirebaseConfig = async () => {
    try {
        const response = await fetch('/api/get-key');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to fetch Firebase config: ${errorData.error || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching Firebase config:", error);
        return null;
    }
};

const initializeFirebase = async (): Promise<FirebaseApp> => {
    const firebaseConfig = await fetchFirebaseConfig();

    if (!firebaseConfig) {
        const errorMessage = "La configuración de Firebase no se pudo obtener del servidor. Asegúrate de que la variable de entorno FIREBASE_CONFIG esté correctamente configurada en Vercel.";
        console.error(errorMessage);
        document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: sans-serif; background: #0D0E1C; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center;"><div><h1>Error de Configuración</h1><p>${errorMessage}</p><p>Por favor, revisa las instrucciones y la configuración de tu proyecto en Vercel.</p></div></div>`;
        throw new Error(errorMessage);
    }

    try {
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