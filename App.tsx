import React, { useState, useCallback, useEffect } from 'react';
import { Invoice, View } from './types';
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

    useEffect(() => {
        if (user) {
            const unsubscribe = getInvoices(user.uid, (newInvoices) => {
                setInvoices(newInvoices);
                if (newInvoices.length === 0) {
                    setView(View.UPLOAD);
                } else {
                    setView(View.DASHBOARD);
                }
            });
            return () => unsubscribe();
        } else {
            setInvoices([]);
        }
    }, [user]);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!user) {
            setError("Debes iniciar sesión para subir facturas.");
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const extractedData = await processInvoice(file);
            await addInvoice(user.uid, { ...extractedData, fileName: file.name });
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
        if (invoices.length === 0 && view !== View.UPLOAD) {
             setView(View.UPLOAD); // Force upload view if no invoices exist
        }

        if (invoices.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl font-bold mb-4 text-white">{t('welcome_title')}</h2>
                        <p className="text-lg text-gray-300 mb-8">
                           {t('welcome_subtitle')}
                        </p>
                        <InvoiceUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
                        {error && <p className="text-red-400 mt-4 animate-fade-in">{error}</p>}
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
                <div className="flex space-x-2 mb-6 border-b border-gray-700">
                    <button onClick={() => setView(View.UPLOAD)} className={`py-2 px-4 font-medium transition-colors ${view === View.UPLOAD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('upload_more')}</button>
                    <button onClick={() => setView(View.DASHBOARD)} className={`py-2 px-4 font-medium transition-colors ${view === View.DASHBOARD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('dashboard')}</button>
                    <button onClick={() => setView(View.INVOICES)} className={`py-2 px-4 font-medium transition-colors ${view === View.INVOICES ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>{t('all_invoices')}</button>
                </div>

                {view === View.UPLOAD && <InvoiceUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />}
                {view === View.DASHBOARD && <Dashboard invoices={invoices} />}
                {view === View.INVOICES && <InvoiceList invoices={invoices} onView={handleViewInvoice} onDelete={handleDeleteInvoice} />}
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