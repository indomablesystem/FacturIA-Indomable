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
    // Clone the response so we can read its body multiple times if needed (once for JSON, once for text)
    const clonedResponse = response.clone();

    // Prioritize parsing a JSON error message, as this is the expected format from our API
    try {
        const errorData = await response.json();
        if (errorData && typeof errorData.error === 'string') {
            return new Error(errorData.error);
        }
    } catch (e) {
        // If JSON parsing fails, the response is likely text or HTML from Vercel
        try {
            const errorText = await clonedResponse.text();

            if (errorText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
                return new Error('El análisis de la factura tardó demasiado (10s) y excedió el tiempo límite del servidor. Intenta con un archivo más pequeño o simple.');
            }
            if (errorText.includes('A server error occurred')) {
                return new Error('Ocurrió un error inesperado en el servidor. Por favor, revisa la configuración de Vercel (variables de entorno) y los logs de la función para más detalles.');
            }
            // If there's any other text, return it.
            if (errorText) {
                return new Error(errorText);
            }
        } catch (textErr) {
            // This would happen if reading the body as text also fails, which is very unlikely.
            // We'll fall through to the generic error.
        }
    }
    
    // Fallback if the response was not JSON, had no specific text, or if the JSON was malformed/lacked an .error property
    return new Error(`${defaultMessage} (Status: ${response.status})`);
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