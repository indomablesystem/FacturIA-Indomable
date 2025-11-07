import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../firebase/config';

const getAuthToken = async (): Promise<string> => {
    const app = await getFirebaseApp();
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated.");
    }
    return user.getIdToken();
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const handleApiError = async (response: Response, defaultMessage: string): Promise<Error> => {
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            return new Error(errorData.error || defaultMessage);
        } else {
            const errorText = await response.text();
            // Provide a cleaner message for common Vercel errors
            if (errorText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
                return new Error('El análisis de la factura tardó demasiado (10s) y excedió el tiempo límite del servidor. Intenta con un archivo más pequeño o simple.');
            }
             if (errorText.includes('A server error occurred') || response.status === 500) {
                return new Error('Ocurrió un error inesperado en el servidor. Por favor, revisa la configuración de Vercel (variables de entorno) y los logs de la función para más detalles.');
            }
            return new Error(errorText || defaultMessage);
        }
    } catch (e) {
        // Fallback if parsing the error response also fails
        return new Error(`${defaultMessage} (Status: ${response.status})`);
    }
};

export const processInvoice = async (file: File) => {
    const token = await getAuthToken();
    const base64Data = await fileToBase64(file);

    const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            fileData: base64Data,
            mimeType: file.type
        })
    });

    if (!response.ok) {
        throw await handleApiError(response, 'Failed to process invoice.');
    }

    return response.json();
};

export const sendChatMessage = async (message: string, invoices: any[]): Promise<string> => {
    const token = await getAuthToken();

    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, invoicesContext: invoices })
    });

    if (!response.ok) {
        throw await handleApiError(response, 'Failed to get chat response.');
    }
    
    const data = await response.json();
    return data.response;
};