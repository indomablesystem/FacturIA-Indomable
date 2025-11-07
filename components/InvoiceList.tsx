import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { DownloadIcon, SearchIcon, EyeIcon, TrashIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoiceListProps {
    invoices: Invoice[];
    onView: (invoice: Invoice) => void;
    onDelete: (invoiceId: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onView, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { language, t } = useLanguage();

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice =>
            invoice.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (invoice.lineItems && invoice.lineItems.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase())))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, searchTerm]);

    const exportToCSV = () => {
        const headers = ['Cliente', 'Nº Factura', 'Fecha', 'Vencimiento', 'Total', 'Impuestos', 'IRPF', 'Moneda', 'Nombre Archivo'];
        const rows = filteredInvoices.map(inv => [
            inv.cliente, inv.invoiceNumber, inv.date, inv.dueDate, inv.totalAmount, inv.taxAmount, inv.irpfAmount, inv.currency, inv.fileName
        ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "facturas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const locale = language === 'es' ? 'es-ES' : 'en-US';

    return (
        <div className="bg-secondary rounded-xl shadow-lg p-4 sm:p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-white">{t('all_invoices')}</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_invoices')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <button onClick={exportToCSV} className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors">
                        <DownloadIcon />
                        <span>{t('export')}</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-700 text-sm text-gray-400">
                        <tr>
                            <th className="p-3">{t('client')}</th>
                            <th className="p-3">{t('invoice_no')}</th>
                            <th className="p-3">{t('date')}</th>
                            <th className="p-3 text-right">{t('irpf')}</th>
                            <th className="p-3 text-right">{t('total')}</th>
                            <th className="p-3 text-center">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.map(invoice => (
                            <tr key={invoice.id} className="border-b border-gray-800 hover:bg-primary/50">
                                <td className="p-3 font-medium text-white">{invoice.cliente}</td>
                                <td className="p-3 text-gray-300">{invoice.invoiceNumber}</td>
                                <td className="p-3 text-gray-300">{new Date(invoice.date).toLocaleDateString(locale)}</td>
                                <td className="p-3 text-right text-red-400">{new Intl.NumberFormat(locale, { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.irpfAmount || 0)}</td>
                                <td className="p-3 text-right font-semibold text-white">{new Intl.NumberFormat(locale, { style: 'currency', currency: invoice.currency || 'EUR' }).format(invoice.totalAmount)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <button 
                                            onClick={() => onView(invoice)} 
                                            className="text-blue-400 hover:text-blue-300 p-1 rounded-full transition-colors"
                                            aria-label={t('view_invoice')}
                                        >
                                            <EyeIcon />
                                        </button>
                                        <button 
                                            onClick={() => onDelete(invoice.id)} 
                                            className="text-red-500 hover:text-red-400 p-1 rounded-full transition-colors"
                                            aria-label={t('delete_invoice')}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredInvoices.length === 0 && (
                    <p className="text-center py-8 text-gray-400">{t('no_invoices_found')}</p>
                )}
            </div>
        </div>
    );
};

export default InvoiceList;