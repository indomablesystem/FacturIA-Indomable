import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Invoice, InvoiceData, View } from './types';
import Header from './components/Header';
import InvoiceUploader from './components/InvoiceUploader';
import InvoiceList from './components/InvoiceList';
import Dashboard from './components/Dashboard';
import Chatbot from './components/Chatbot';
import Login from './components/Login';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import { processInvoice, sendChatMessage } from './services/apiService';
import { getInvoices, addInvoice, deleteInvoice as deleteInvoiceFromDb } from './services/firestoreService';
import { BotIcon } from './components/icons';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';
import { Unsubscribe } from 'firebase/firestore';

const App: React.FC = () => {
    const { user, loadingAuth } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>(View.DASHBOARD);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const { t } = useLanguage();
    const isInitialDataLoaded = useRef(false);

    useEffect(() => {
        if (user) {
            isInitialDataLoaded.current = false; // Reset for new user login
            const unsubscribe = getInvoices(user.uid, (newInvoices) => {
                setInvoices(newInvoices);

                // This logic runs only once when the data first loads for a user,
                // or when the last invoice is deleted. It avoids overriding intentional
                // view changes, like after an upload.
                if (!isInitialDataLoaded.current) {
                    if (newInvoices.length === 0) {
                        setView(View.UPLOAD);
                    } else {
                        setView(View.DASHBOARD);
                    }
                    isInitialDataLoaded.current = true;
                } else if (newInvoices.length === 0) {
                    // Handle the case where the user deletes the last invoice
                    setView(View.UPLOAD);
                }
            });
            return () => unsubscribe();
        } else {
            setInvoices([]);
            isInitialDataLoaded.current = false;
        }
    }, [user]);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!user) {
            setError("Debes iniciar sesión para subir facturas.");
            return;
        }
        
        // Vercel has a 4.5MB payload limit. Base64 encoding increases file size by ~33%.
        // A 3MB limit provides a safe margin.
        const MAX_FILE_SIZE_MB = 3;
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setError(`El archivo es demasiado grande. El tamaño máximo permitido es de ${MAX_FILE_SIZE_MB} MB para evitar exceder los límites del servidor.`);
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            const extractedData = await processInvoice(file);
            
            // Sanitize data before saving to prevent Firestore errors from undefined values
            const newInvoiceData: InvoiceData = {
                fileName: file.name,
                cliente: extractedData.cliente || 'N/A',
                invoiceNumber: extractedData.invoiceNumber || 'N/A',
                date: extractedData.date || new Date().toISOString().split('T')[0],
                dueDate: extractedData.dueDate || '',
                totalAmount: extractedData.totalAmount || 0,
                taxAmount: extractedData.taxAmount || 0,
                irpfAmount: extractedData.irpfAmount || 0,
                currency: extractedData.currency || 'EUR',
                lineItems: extractedData.lineItems || [],
            };

            await addInvoice(user.uid, newInvoiceData);
            setView(View.DASHBOARD);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al analizar la factura.';
            setError(`${t('error_processing_invoice')} ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    }, [user, t]);

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!user) return;
        try {
            await deleteInvoiceFromDb(user.uid, invoiceId);
        } catch (error) {
            console.error("Error deleting invoice:", error);
            setError("No se pudo eliminar la factura.");
        }
    };

    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
    };
    
    const getChatbotResponse = async (history: any[]) => {
        if (!user) return "Por favor, inicia sesión para usar el chat.";
        const lastUserMessage = history.filter(m => m.sender === 'user').pop()?.text || "";
        return await sendChatMessage(lastUserMessage, invoices);
    }

    if (loadingAuth) {
        return <div className="min-h-screen bg-primary flex items-center justify-center text-white">Cargando...</div>;
    }
    
    if (!user) {
        return <Login />;
    }

    const MainContent: React.FC = () => {
        const hasInvoices = invoices.length > 0;
    
        return (
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
                {hasInvoices && (
                    <div className="flex space-x-2 mb-6 border-b border-gray-700">
                        <button onClick={() => setView(View.UPLOAD)} className={`py-2 px-4 font-medium transition-colors ${view === View.UPLOAD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('upload_more')}</button>
                        <button onClick={() => setView(View.DASHBOARD)} className={`py-2 px-4 font-medium transition-colors ${view === View.DASHBOARD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('dashboard')}</button>
                        <button onClick={() => setView(View.INVOICES)} className={`py-2 px-4 font-medium transition-colors ${view === View.INVOICES ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('all_invoices')}</button>
                    </div>
                )}
    
                {/* Content Area */}
                <div className={!hasInvoices ? "flex flex-col items-center justify-center text-center" : ""}>
                    {view === View.UPLOAD && (
                        <>
                            {!hasInvoices && (
                                <div className="max-w-2xl mb-8">
                                    <h2 className="text-4xl font-bold mb-4 text-white">{t('welcome_title')}</h2>
                                    <p className="text-lg text-gray-300 mb-8">
                                       {t('welcome_subtitle')}
                                    </p>
                                </div>
                            )}
                            <InvoiceUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
                        </>
                    )}
                    
                    {view === View.DASHBOARD && <Dashboard invoices={invoices} />}
                    {view === View.INVOICES && <InvoiceList invoices={invoices} onView={handleViewInvoice} onDelete={handleDeleteInvoice} />}
                </div>
    
                {error && <p className="text-red-400 mt-4 animate-fade-in text-center">{error}</p>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-primary flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4">
                <MainContent />
            </main>
            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="fixed bottom-6 right-6 bg-accent text-white p-4 rounded-full shadow-lg hover:bg-accent-hover transform hover:scale-110 transition-all z-50"
                aria-label="Abrir Asistente IA"
            >
                <BotIcon />
            </button>
            <Chatbot
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                getBotResponse={getChatbotResponse}
            />
            {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
        </div>
    );
};

export default App;