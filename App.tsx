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
import { BotIcon, SpinnerIcon } from './components/icons';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext';

const App: React.FC = () => {
    const { user, loadingAuth } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>(View.UPLOAD);
    const [loadingInvoices, setLoadingInvoices] = useState<boolean>(true);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const { t } = useLanguage();
    const isInitialDataLoaded = useRef(false);

    useEffect(() => {
        if (user) {
            setLoadingInvoices(true);
            isInitialDataLoaded.current = false; // Reset for new user login
            const unsubscribe = getInvoices(
                user.uid, 
                (unsortedInvoices) => { // onSuccess callback
                    const newInvoices = unsortedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    setInvoices(prevInvoices => {
                        if (!isInitialDataLoaded.current) {
                            setView(newInvoices.length === 0 ? View.UPLOAD : View.DASHBOARD);
                            isInitialDataLoaded.current = true;
                        } else if (prevInvoices.length > 0 && newInvoices.length === 0) {
                            setView(View.UPLOAD);
                        }
                        return newInvoices;
                    });
                    setLoadingInvoices(false);
                    setError(null); // Clear previous errors on success
                },
                (err) => { // onError callback
                    console.error("Firestore error:", err);
                    setError(err.message);
                    setLoadingInvoices(false);
                }
            );
            return () => unsubscribe();
        } else if (!loadingAuth) {
            setInvoices([]);
            setLoadingInvoices(false);
            isInitialDataLoaded.current = false;
        }
    }, [user, loadingAuth]);

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
        return (
             <div className="min-h-screen bg-primary flex items-center justify-center text-white">
                <div className="text-center">
                    <SpinnerIcon className="w-12 h-12 mx-auto text-accent"/>
                    <p className="mt-4 text-lg">Autenticando...</p>
                </div>
            </div>
        );
    }
    
    if (!user) {
        return <Login />;
    }

    const MainContent: React.FC = () => {
        const hasInvoices = invoices.length > 0;

        // If there's an error, display it prominently.
        if (error) {
             return <div className="w-full flex justify-center items-center text-center">
                <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg max-w-md mx-auto">
                    <strong className="font-bold">Error de Carga</strong>
                    <span className="block mt-1">{error}</span>
                    <p className="text-xs mt-2 text-gray-400">Intenta refrescar la página. Si el problema persiste, revisa las reglas de seguridad de Firestore.</p>
                </div>
            </div>;
        }
    
        return (
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in w-full">
                {hasInvoices && (
                    <div className="flex space-x-2 mb-6 border-b border-gray-700">
                        <button onClick={() => setView(View.UPLOAD)} className={`py-2 px-4 font-medium transition-colors ${view === View.UPLOAD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('upload_more')}</button>
                        <button onClick={() => setView(View.DASHBOARD)} className={`py-2 px-4 font-medium transition-colors ${view === View.DASHBOARD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('dashboard')}</button>
                        <button onClick={() => setView(View.INVOICES)} className={`py-2 px-4 font-medium transition-colors ${view === View.INVOICES ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('all_invoices')}</button>
                    </div>
                )}
    
                {/* Content Area */}
                <div className={!hasInvoices && view === View.UPLOAD ? "flex flex-col items-center justify-center text-center h-full" : ""}>
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
                    
                    {view === View.DASHBOARD && hasInvoices && <Dashboard invoices={invoices} />}
                    {view === View.INVOICES && hasInvoices && <InvoiceList invoices={invoices} onView={handleViewInvoice} onDelete={handleDeleteInvoice} />}
                </div>
    
                {isProcessing && error && <p className="text-red-400 mt-4 animate-fade-in text-center">{error}</p>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-primary flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4 flex">
                {loadingInvoices ? (
                    <div className="w-full flex justify-center items-center">
                        <SpinnerIcon className="w-12 h-12 text-accent" />
                    </div>
                ) : (
                    <MainContent />
                )}
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