
import React, { useState, useCallback } from 'react';
import { Invoice, ChatMessage, View } from './types';
import Header from './components/Header';
import InvoiceUploader from './components/InvoiceUploader';
import InvoiceList from './components/InvoiceList';
import Dashboard from './components/Dashboard';
import Chatbot from './components/Chatbot';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import { extractInvoiceData, getChatbotResponse } from './services/geminiService';
import { BotIcon } from './components/icons';

const App: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>(View.UPLOAD);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const handleFileUpload = useCallback(async (file: File) => {
        setIsProcessing(true);
        setError(null);
        try {
            const extractedData = await extractInvoiceData(file);
            const newInvoice = { ...extractedData, id: Date.now().toString(), fileName: file.name };
            setInvoices(prev => [...prev, newInvoice]);
            setView(View.DASHBOARD);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al analizar la factura.';
            setError(`Error al analizar la factura. ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDeleteInvoice = (invoiceId: string) => {
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    };

    const handleViewInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
    };

    const MainContent: React.FC = () => {
        if (invoices.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl font-bold mb-4 text-white">Bienvenido a Indomable FacturIA</h2>
                        <p className="text-lg text-gray-300 mb-8">
                            Comienza subiendo tu primera factura. Nuestra IA extraerá los datos automáticamente y desbloqueará tu panel de finanzas.
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
                    <button onClick={() => setView(View.UPLOAD)} className={`py-2 px-4 font-medium transition-colors ${view === View.UPLOAD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>Subir Más</button>
                    <button onClick={() => setView(View.DASHBOARD)} className={`py-2 px-4 font-medium transition-colors ${view === View.DASHBOARD ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>Panel</button>
                    <button onClick={() => setView(View.INVOICES)} className={`py-2 px-4 font-medium transition-colors ${view === View.INVOICES ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}>Todas las Facturas</button>
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
                getBotResponse={(history) => getChatbotResponse(history, invoices)}
            />
            {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
        </div>
    );
};

export default App;