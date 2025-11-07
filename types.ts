
export interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: string;
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
}

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