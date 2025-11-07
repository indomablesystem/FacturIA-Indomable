import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import Login from './components/Login';
import Header from './components/Header';
import InvoiceUploader from './components/InvoiceUploader';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import Chatbot from './components/Chatbot';
import { BotIcon, FileTextIcon, SpinnerIcon, UploadIcon } from './components/icons';
import { Invoice, View, ChatMessage } from './types';
import { getInvoices, addInvoice, deleteInvoice } from './services/firestoreService';
import { processInvoice, sendChatMessage } from './services/apiService';

/**
 * A robust sanitization function to ensure invoice data from any source (like Firestore)
 * is clean, consistent, and safe for UI components to render. It handles various data types,
 * especially different date formats (Firestore Timestamps, JS Dates, strings), and provides
 * safe defaults for all properties.
 * @param invoices - The raw array of invoices fetched from the database.
 * @returns A new array of fully sanitized Invoice objects.
 */
const sanitizeInvoices = (invoices: any[]): Invoice[] => {
    // CRITICAL FIX: Ensure the input is a processable array and filter out any nullish/invalid entries
    // before mapping. This prevents the entire app from crashing if the fetched data contains
    // corrupted records (e.g., null, undefined).
    if (!Array.isArray(invoices)) {
        console.error("Sanitization function received a non-array input:", invoices);
        return [];
    }

    const today = new Date().toISOString().split('T')[0];

    return invoices
        .filter(inv => inv && typeof inv === 'object') // This line prevents crashes from null/undefined items in the array.
        .map(inv => {
            // Universal date handler for 'date' field
            const sanitizeDate = (dateField: any): string => {
                if (!dateField) return today;
                if (dateField.toDate && typeof dateField.toDate === 'function') { // Firestore Timestamp
                    try { return dateField.toDate().toISOString().split('T')[0]; } catch (e) { return today; }
                }
                if (dateField instanceof Date) { // JavaScript Date Object
                     try { return dateField.toISOString().split('T')[0]; } catch (e) { return today; }
                }
                if (typeof dateField === 'string' && !isNaN(new Date(dateField).getTime())) { // Valid Date String
                    return dateField.split('T')[0];
                }
                return today; // Fallback for any invalid format
            };
            
            // Universal date handler for 'dueDate' field (can be empty)
            const sanitizeDueDate = (dateField: any): string => {
                 if (!dateField) return '';
                if (dateField.toDate && typeof dateField.toDate === 'function') { // Firestore Timestamp
                    try { return dateField.toDate().toISOString().split('T')[0]; } catch (e) { return ''; }
                }
                 if (dateField instanceof Date) { // JavaScript Date Object
                    try { return dateField.toISOString().split('T')[0]; } catch (e) { return ''; }
                }
                if (typeof dateField === 'string' && !isNaN(new Date(dateField).getTime())) { // Valid Date String
                    return dateField.split('T')[0];
                }
                return ''; // Fallback for any invalid format
            };

            return {
                id: inv.id || '',
                fileName: inv.fileName || 'Unknown File',
                cliente: inv.cliente || 'Cliente Desconocido',
                invoiceNumber: inv.invoiceNumber || 'N/A',
                date: sanitizeDate(inv.date),
                dueDate: sanitizeDueDate(inv.dueDate),
                totalAmount: Number(inv.totalAmount) || 0,
                taxAmount: Number(inv.taxAmount) || 0,
                irpfAmount: Number(inv.irpfAmount) || 0,
                currency: inv.currency || 'EUR',
                lineItems: Array.isArray(inv.lineItems) ? inv.lineItems.map(item => ({
                    description: item.description || '',
                    quantity: Number(item.quantity) || 0,
                    unitPrice: Number(item.unitPrice) || 0,
                    total: Number(item.total) || 0
                })) : [],
            };
        });
};


const App: React.FC = () => {
    // Hooks
    const { user, loadingAuth } = useAuth();
    const { t } = useLanguage();

    // State
    const [view, setView] = useState<View>(View.DASHBOARD);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [loadingInvoices, setLoadingInvoices] = useState(true);

    // Effects
    useEffect(() => {
        if (user) {
            setLoadingInvoices(true);
            const unsubscribe = getInvoices(
                user.uid,
                (fetchedInvoices) => {
                    // CRITICAL: Sanitize data immediately after fetching and before setting state
                    const sanitizedData = sanitizeInvoices(fetchedInvoices);
                    setInvoices(sanitizedData);
                    
                    // Determine initial view based on sanitized data
                    if (sanitizedData.length > 0) {
                       setView(v => (v === View.UPLOAD ? View.DASHBOARD : v));
                    } else {
                       setView(View.UPLOAD);
                    }
                    setLoadingInvoices(false);
                },
                (err) => {
                    console.error(err);
                    setError(err.message);
                    setLoadingInvoices(false);
                }
            );
            return () => unsubscribe();
        } else {
            setInvoices([]);
            setView(View.UPLOAD);
            setLoadingInvoices(false);
        }
    }, [user]);

    // Handlers
    const handleFileUpload = async (file: File) => {
        if (!user) return;
        setIsProcessing(true);
        setError(null);
        try {
            const invoiceData = await processInvoice(file);
            await addInvoice(user.uid, { ...invoiceData, fileName: file.name });
            // The onSnapshot listener from useEffect will automatically update the invoices list.
        } catch (err: any) {
            console.error("Error processing invoice:", err);
            setError(err.message || t('error_processing_invoice'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!user) return;
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await deleteInvoice(user.uid, invoiceId);
            } catch (err: any) {
                console.error("Error deleting invoice:", err);
                setError(err.message);
            }
        }
    };
    
    const getBotResponse = async (history: ChatMessage[]) => {
        const lastMessage = history[history.length - 1].text;
        return sendChatMessage(lastMessage, invoices);
    };


    // Render logic
    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <SpinnerIcon className="w-12 h-12" />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }
    
    const renderContent = () => {
        if (loadingInvoices) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 mt-10">
                    <SpinnerIcon className="w-10 h-10 mb-4" />
                    <p className="text-lg text-gray-300">Loading your invoices...</p>
                </div>
            );
        }

        if (invoices.length === 0 && !isProcessing) {
            return (
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                    <div className="max-w-xl">
                         <FileTextIcon className="w-16 h-16 text-accent mx-auto mb-4" />
                         <h2 className="text-3xl font-bold text-white mb-2">{t('welcome_title')}</h2>
                         <p className="text-gray-400 mb-6">{t('welcome_subtitle')}</p>
                         <InvoiceUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
                    </div>
                </div>
            );
        }

        switch (view) {
            case View.DASHBOARD:
                return <Dashboard invoices={invoices} />;
            case View.INVOICES:
                return <InvoiceList invoices={invoices} onView={setSelectedInvoice} onDelete={handleDeleteInvoice} />;
            case View.UPLOAD:
                 return <InvoiceUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />;
            default:
                 return <Dashboard invoices={invoices} />;
        }
    };


    return (
        <div className="bg-primary min-h-screen text-light font-sans">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {invoices.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <nav className="flex items-center space-x-2 bg-secondary/50 p-1.5 rounded-lg">
                            <button
                                onClick={() => setView(View.DASHBOARD)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === View.DASHBOARD ? 'bg-accent text-white' : 'text-gray-300 hover:bg-secondary'}`}
                            >
                                {t('dashboard')}
                            </button>
                            <button
                                onClick={() => setView(View.INVOICES)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === View.INVOICES ? 'bg-accent text-white' : 'text-gray-300 hover:bg-secondary'}`}
                            >
                                {t('all_invoices')}
                            </button>
                        </nav>
                         <button
                            onClick={() => setView(View.UPLOAD)}
                            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors w-full sm:w-auto justify-center"
                        >
                            <UploadIcon className="w-5 h-5" />
                            <span>{t('upload_more')}</span>
                        </button>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
                        <span className="font-medium">Error:</span> {error}
                        <button onClick={() => setError(null)} className="float-right font-bold text-lg">&times;</button>
                    </div>
                )}
                
                {renderContent()}

            </main>

            {invoices.length > 0 && !isChatbotOpen && (
                 <button 
                    onClick={() => setIsChatbotOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-accent rounded-full shadow-lg flex items-center justify-center text-white hover:bg-accent-hover transition-colors transform hover:scale-110 z-40"
                    aria-label="Open AI Assistant"
                 >
                     <BotIcon className="w-8 h-8"/>
                 </button>
            )}

            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} getBotResponse={getBotResponse} />

            {selectedInvoice && (
                <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
            )}
        </div>
    );
};

export default App;