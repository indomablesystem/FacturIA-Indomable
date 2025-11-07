import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../firebase/config';
import { Invoice } from '../types';

const API_TIMEOUT_MS = 15000; // 15-second client-side timeout

const getAuthToken = async (): Promise<string> => {
    const app = await getFirebaseApp();
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated.");
    }
    return user.getIdToken();
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


export const processInvoice = async (downloadUrl: string, mimeType: string) => {
    const token = await getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch('/api/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                downloadUrl,
                mimeType
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw await handleApiError(response, 'Failed to process invoice.');
        }

        return response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('El análisis de la factura tardó demasiado y la solicitud fue cancelada. Por favor, intenta de nuevo con un archivo más pequeño o revisa tu conexión.');
        }
        throw error;
    }
};

export const sendChatMessage = async (message: string, invoices: any[]): Promise<string> => {
    const token = await getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, invoicesContext: invoices }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw await handleApiError(response, 'Failed to get chat response.');
        }
        
        const data = await response.json();
        return data.response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('La solicitud al asistente de IA tardó demasiado y fue cancelada. Por favor, intenta de nuevo.');
        }
        throw error;
    }
};