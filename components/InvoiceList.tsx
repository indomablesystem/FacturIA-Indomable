import React, { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { DownloadIcon, SearchIcon, EyeIcon, TrashIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

// FIX: Defined the InvoiceListProps interface to type the component's props.
interface InvoiceListProps {
    invoices: Invoice[];
    onView: (invoice: Invoice) => void;
    onDelete: (invoiceId: string) => void;
}

const safeFormatDate = (dateStr: string, locale: string): string => {
    // Dates from sanitization are YYYY-MM-DD.
    // To avoid timezone issues where this becomes the previous day,
    // we parse and format it consistently as UTC.
    if (!dateStr || typeof dateStr !== 'string') return 'N/A';
    // Appending T00:00:00Z ensures it's parsed as UTC midnight
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (isNaN(date.getTime())) {
        return 'Fecha Inválida';
    }
    // Formatting with UTC timezone ensures the output matches the input date
    return date.toLocaleDateString(locale, { timeZone: 'UTC' });
};

/**
 * A robust currency formatting function that prevents the UI from crashing
 * due to invalid currency codes.
 * @param amount - The number to format.
 * @param currencyCode - The ISO 4217 currency code (e.g., "USD", "EUR").
 * @param locale - The locale string (e.g., "en-US", "es-ES").
 * @returns A formatted currency string.
 */
const safeFormatCurrency = (amount: number, currencyCode: string, locale: string): string => {
    try {
        // The `currency` property must be a valid ISO 4217 currency code.
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode || 'EUR', // Fallback to EUR if code is null/undefined
        }).format(amount);
    } catch (e) {
        // This catch block handles errors from invalid currency codes (e.g., "Euros" instead of "EUR").
        console.warn(`Invalid currency code "${currencyCode}" detected. Falling back to EUR for formatting.`);
        // Fallback to a known valid currency to prevent a crash.
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    }
};


const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onView, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { language, t } = useLanguage();

    const filteredInvoices = useMemo(() => {
        // Robust date parsing for sorting. Handles invalid dates gracefully.
        const safeGetTime = (dateStr: any): number => {
            if (!dateStr || typeof dateStr !== 'string') return 0;
            const date = new Date(dateStr);
            // Check if date is valid
            return isNaN(date.getTime()) ? 0 : date.getTime();
        };

        // Defensive filtering to prevent crashes from malformed invoice objects.
        const defensivelyFiltered = invoices.filter(invoice => {
            if (!invoice) return false; // Guard against null/undefined items in the array
            try {
                const term = searchTerm.toLowerCase();

                const clientMatch = invoice.cliente && typeof invoice.cliente === 'string' 
                    ? invoice.cliente.toLowerCase().includes(term)
                    : false;

                const numberMatch = invoice.invoiceNumber && typeof invoice.invoiceNumber === 'string'
                    ? invoice.invoiceNumber.toLowerCase().includes(term)
                    : false;

                const lineItemsMatch = Array.isArray(invoice.lineItems)
                    ? invoice.lineItems.some(item =>
                        item && item.description && typeof item.description === 'string'
                            ? item.description.toLowerCase().includes(term)
                            : false
                      )
                    : false;

                return clientMatch || numberMatch || lineItemsMatch;
            } catch (e) {
                console.error("Error filtering an invoice, skipping it:", invoice, e);
                return false; // Exclude problematic invoice from the list
            }
        });

        // Sort the defensively filtered results.
        return defensivelyFiltered.sort((a, b) => safeGetTime(b.date) - safeGetTime(a.date));

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
                                <td className="p-3 text-gray-300">{safeFormatDate(invoice.date, locale)}</td>
                                <td className="p-3 text-right text-red-400">{safeFormatCurrency(invoice.irpfAmount || 0, invoice.currency, locale)}</td>
                                <td className="p-3 text-right font-semibold text-white">{safeFormatCurrency(invoice.totalAmount, invoice.currency, locale)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center items-center gap-3">
                                        {invoice.downloadUrl && (
                                            <a
                                                href={invoice.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={invoice.fileName}
                                                className="text-green-400 hover:text-green-300 p-1 rounded-full transition-colors"
                                                aria-label={t('download_original_invoice')}
                                                title={t('download_original_invoice')}
                                            >
                                                <DownloadIcon />
                                            </a>
                                        )}
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