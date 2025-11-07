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
        throw new Error("La configuración de Firebase no se pudo obtener del servidor. Asegúrate de que la variable de entorno FIREBASE_CONFIG esté correctamente configurada en Vercel.");
    }

    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        throw new Error("La configuración de Firebase obtenida es inválida o incompleta. Faltan campos clave como 'apiKey', 'authDomain' o 'projectId'.");
    }

    try {
        return initializeApp(firebaseConfig);
    } catch (error) {
        console.error("La inicialización de Firebase ha fallado:", error);
        throw new Error("La inicialización de Firebase ha fallado. Revisa la consola del navegador para más detalles sobre el error de configuración.");
    }
};

export const getFirebaseApp = (): Promise<FirebaseApp> => {
    if (!appPromise) {
        appPromise = initializeFirebase();
    }
    return appPromise;
};