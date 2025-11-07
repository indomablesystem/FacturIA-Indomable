import React from 'react';
import { Invoice } from '../types';
import { CloseIcon } from './icons';

interface InvoiceDetailModalProps {
    invoice: Invoice;
    onClose: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ invoice, onClose }) => {

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: invoice.currency || 'EUR' }).format(amount || 0);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-xl shadow-lg w-full max-w-2xl m-4 border border-gray-700 animate-slide-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Detalles de la Factura</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6 text-sm">
                        <div>
                            <p className="text-gray-400">Cliente</p>
                            <p className="text-white font-semibold">{invoice.cliente}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Nº Factura</p>
                            <p className="text-white">{invoice.invoiceNumber}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Fecha Emisión</p>
                            <p className="text-white">{new Date(invoice.date).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Fecha Vencimiento</p>
                            <p className="text-white">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-ES') : 'N/A'}</p>
                        </div>
                         <div>
                            <p className="text-gray-400">Total Impuestos (IVA)</p>
                            <p className="text-white">{formatCurrency(invoice.taxAmount)}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Total IRPF</p>
                            <p className="text-red-400">{formatCurrency(invoice.irpfAmount)}</p>
                        </div>
                        <div className="text-lg md:col-start-3 md:row-start-2 md:text-right">
                            <p className="text-gray-400">Importe Total</p>
                            <p className="text-accent font-bold text-xl">{formatCurrency(invoice.totalAmount)}</p>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">Conceptos</h3>
                    <div className="overflow-x-auto border border-gray-700 rounded-lg">
                        <table className="w-full text-left">
                            <thead className="bg-primary/50 text-xs text-gray-400 uppercase">
                                <tr>
                                    <th className="p-3">Descripción</th>
                                    <th className="p-3 text-right">Cantidad</th>
                                    <th className="p-3 text-right">P. Unidad</th>
                                    <th className="p-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.lineItems && invoice.lineItems.length > 0 ? (
                                    invoice.lineItems.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-800 last:border-b-0">
                                            <td className="p-3 text-white">{item.description}</td>
                                            <td className="p-3 text-gray-300 text-right">{item.quantity}</td>
                                            <td className="p-3 text-gray-300 text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="p-3 font-semibold text-white text-right">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-gray-400">No hay conceptos detallados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 text-right">
                    <button 
                        onClick={onClose}
                        className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetailModal;