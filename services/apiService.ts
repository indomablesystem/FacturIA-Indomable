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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process invoice.');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get chat response.');
    }
    
    const data = await response.json();
    return data.response;
};
