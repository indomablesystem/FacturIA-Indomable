

export interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: string; // Document ID from Firestore
    fileName: string;
    cliente: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    totalAmount: number;
    taxAmount: number;
    irpfAmount: number;
    currency: string;
    lineItems: LineItem[];
    downloadUrl?: string; // URL to the original file in Firebase Storage
}

export type InvoiceData = Omit<Invoice, 'id'>;

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

export enum View {
    UPLOAD,
    DASHBOARD,
    INVOICES
}