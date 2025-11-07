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

export const getInvoices = (userId: string, callback: (invoices: Invoice[]) => void) => {
    let unsubscribe: () => void = () => {};
    
    getDb().then(db => {
        const q = query(
            collection(db, INVOICES_COLLECTION),
            where("userId", "==", userId),
            orderBy("date", "desc")
        );
        
        unsubscribe = onSnapshot(q, (querySnapshot) => {
            const invoices: Invoice[] = [];
            querySnapshot.forEach((doc) => {
                invoices.push({ id: doc.id, ...doc.data() } as Invoice);
            });
            callback(invoices);
        }, (error) => {
            console.error("Error fetching invoices:", error);
        });
    }).catch(error => {
        console.error("Failed to get Firestore instance for getInvoices", error);
    });

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
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not save invoice to the database.");
    }
};

export const deleteInvoice = async (userId: string, invoiceId: string): Promise<void> => {
    const db = await getDb();
    try {
        const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
        await deleteDoc(invoiceRef);
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw new Error("Could not delete invoice from the database.");
    }
};
