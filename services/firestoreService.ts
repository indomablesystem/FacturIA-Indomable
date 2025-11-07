import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, serverTimestamp, orderBy, getFirestore, Firestore } from "firebase/firestore";
import { getFirebaseApp } from '../firebase/config';
import { Invoice, InvoiceData } from "../types";

const INVOICES_COLLECTION = 'invoices';

let dbInstance: Firestore | null = null;
const getDb = async (): Promise<Firestore> => {
    if (!dbInstance) {
        const app = await getFirebaseApp();
        dbInstance = getFirestore(app);
    }
    return dbInstance;
}

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
        }, (error) => {
            console.error("Error fetching invoices from onSnapshot:", error);
            // This is often a permission error. Guide the user.
            onError(new Error("No se pudo conectar con la base de datos. Verifica tus reglas de seguridad en Firestore."));
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