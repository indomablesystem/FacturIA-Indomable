import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, serverTimestamp, orderBy, getFirestore, Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, Storage } from "firebase/storage";
import { getFirebaseApp } from '../firebase/config';
import { Invoice, InvoiceData } from "../types";

const INVOICES_COLLECTION = 'invoices';
const INVOICE_FILES_FOLDER = 'invoice_files';

let dbInstance: Firestore | null = null;
let storageInstance: Storage | null = null;

const getDb = async (): Promise<Firestore> => {
    if (!dbInstance) {
        const app = await getFirebaseApp();
        dbInstance = getFirestore(app);
    }
    return dbInstance;
}

const getStorageInstance = async (): Promise<Storage> => {
    if (!storageInstance) {
        const app = await getFirebaseApp();
        storageInstance = getStorage(app);
    }
    return storageInstance;
}

export const uploadInvoiceFile = (userId: string, file: File): Promise<string> => {
    const UPLOAD_TIMEOUT_MS = 25000; // 25-second timeout to match API service

    const uploadOperation = async (): Promise<string> => {
        try {
            const storage = await getStorageInstance();
            // Create a unique path for the file to prevent overwrites
            const filePath = `${INVOICE_FILES_FOLDER}/${userId}/${Date.now()}-${file.name}`;
            const fileRef = ref(storage, filePath);
            const snapshot = await uploadBytes(fileRef, file);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Error uploading file to Firebase Storage:", error);
            // Providing a more specific, user-facing error message is crucial for debugging.
            // Firebase Storage errors often relate to security rules.
            throw new Error("No se pudo subir el archivo original. Verifica tus reglas de seguridad en Firebase Storage y tu conexión a internet.");
        }
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error('La subida del archivo original tardó demasiado (25s) y fue cancelada. Esto puede ocurrir con conexiones lentas.'));
        }, UPLOAD_TIMEOUT_MS);
    });

    return Promise.race([uploadOperation(), timeoutPromise]);
};


export const getInvoices = (
    userId: string, 
    onSuccess: (invoices: Invoice[]) => void,
    onError: (error: Error) => void
) => {
    let unsubscribe: () => void = () => {};
    
    getDb().then(db => {
        const q = query(
            collection(db, INVOICES_COLLECTION),
            where("userId", "==", userId)
        );
        
        unsubscribe = onSnapshot(q, (querySnapshot) => {
            const invoices: Invoice[] = [];
            querySnapshot.forEach((doc) => {
                invoices.push({ id: doc.id, ...doc.data() } as Invoice);
            });
            onSuccess(invoices);
        }, (error: any) => {
            console.error("Error fetching invoices from onSnapshot:", error);
            if (error.code === 'permission-denied') {
                // This is the most common error. Provide a very specific message.
                onError(new Error("Permiso denegado por Firestore al leer las facturas. Esto casi siempre se debe a las reglas de seguridad. Asegúrate de que permitan la lectura para los dueños de los datos. Ejemplo: 'allow read: if request.auth.uid == resource.data.userId;'"));
            } else {
                // Generic error for other issues (e.g., network, missing index)
                onError(new Error("No se pudo conectar con la base de datos para leer las facturas. Verifica tu conexión y la configuración de Firestore."));
            }
        });
    }).catch(error => {
        console.error("Failed to get Firestore instance for getInvoices:", error);
        onError(new Error("Error de inicialización de la base de datos."));
    });

    // This returned function is called by useEffect when the component unmounts.
    return () => unsubscribe();
};


export const addInvoice = async (userId: string, invoiceData: InvoiceData): Promise<string> => {
    const db = await getDb();
    try {
        const docRef = await addDoc(collection(db, INVOICES_COLLECTION), {
            ...invoiceData,
            userId: userId,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e: any) {
        console.error("Error adding document to Firestore: ", e);
        if (e && e.code === 'permission-denied') {
            throw new Error("Permiso denegado por Firestore. Por favor, revisa tus reglas de seguridad para permitir que los usuarios autenticados escriban en la colección 'invoices'.");
        }
        throw new Error("No se pudo guardar la factura en la base de datos.");
    }
};

export const deleteInvoice = async (userId: string, invoiceId: string): Promise<void> => {
    const db = await getDb();
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        await deleteDoc(invoiceRef);
    } catch (e: any) {
        console.error("Error deleting document from Firestore: ", e);
        if (e && e.code === 'permission-denied') {
             throw new Error("Permiso denegado por Firestore. No se pudo eliminar la factura. Revisa tus reglas de seguridad.");
        }
        throw new Error("No se pudo eliminar la factura de la base de datos.");
    }
};