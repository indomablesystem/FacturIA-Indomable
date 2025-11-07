import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Invoice } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
    invoices: Invoice[];
}

const COLORS = ['#F5821F', '#F9A826', '#FBBF24', '#FCD34D', '#FDBA74'];

const procesarIngresosPorCliente = (invoices: Invoice[]) => {
    const ingresos = invoices.reduce((acc, inv) => {
        acc[inv.cliente] = (acc[inv.cliente] || 0) + inv.totalAmount;
        return acc;
    }, {} as { [key: string]: number });
    return Object.entries(ingresos)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
};

const procesarIngresosPorTiempo = (invoices: Invoice[], language: string) => {
    const locale = language === 'es' ? 'es-ES' : 'en-US';
    const ingresos = invoices.reduce((acc, inv) => {
        if (!inv.date || typeof inv.date !== 'string') {
            return acc; // Defensively skip invoices with invalid or missing dates
        }
        // Parse date as UTC to avoid timezone-related shifts
        const date = new Date(`${inv.date}T00:00:00Z`);
        if (isNaN(date.getTime())) {
            return acc; // Skip if the sanitized date string is somehow still invalid
        }
        const month = date.toLocaleString(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
        if (!acc[month]) {
            acc[month] = { total: 0, date: date };
        }
        acc[month].total += inv.totalAmount;
        return acc;
    }, {} as { [key: string]: { total: number, date: Date } });

    return Object.entries(ingresos)
        .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
        .map(([name, { total }]) => ({ name, ingreso: total }));
};


const Dashboard: React.FC<DashboardProps> = ({ invoices }) => {
    const { language, t } = useLanguage();
    const locale = language === 'es' ? 'es-ES' : 'en-US';

    const totalIngresado = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalIRPF = invoices.reduce((sum, inv) => sum + (inv.irpfAmount || 0), 0);
    const valorPromedioFactura = invoices.length > 0 ? totalIngresado / invoices.length : 0;
    const ingresosPorClienteData = procesarIngresosPorCliente(invoices);
    const ingresosPorTiempoData = procesarIngresosPorTiempo(invoices, language);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-secondary p-2 border border-gray-700 rounded-lg shadow-lg">
                    <p className="label text-light">{`${label} : ${new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(payload[0].value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t('total_invoiced')} value={totalIngresado.toFixed(2)} isCurrency locale={locale} />
                <StatCard title={t('total_invoices_count')} value={invoices.length.toString()} locale={locale} />
                <StatCard title={t('average_invoice_value')} value={valorPromedioFactura.toFixed(2)} isCurrency locale={locale} />
                <StatCard title={t('total_irpf_withheld')} value={totalIRPF.toFixed(2)} isCurrency isNegative locale={locale} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title={t('revenue_by_client')}>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={ingresosPorClienteData.slice(0, 5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#F5821F" label>
                                {ingresosPorClienteData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title={t('revenue_over_time')}>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ingresosPorTiempoData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" tickFormatter={(value) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 130, 31, 0.2)' }}/>
                            <Bar dataKey="ingreso" name={t('revenue')} fill="#F5821F" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; isCurrency?: boolean; isNegative?: boolean; locale: string }> = ({ title, value, isCurrency, isNegative, locale }) => (
    <div className="bg-secondary rounded-xl p-6 shadow-lg border border-gray-800">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <p className={`text-3xl font-bold mt-1 ${isNegative ? 'text-red-400' : 'text-white'}`}>
            {isCurrency ? new Intl.NumberFormat(locale, {style: 'currency', currency: 'EUR'}).format(parseFloat(value)) : value}
        </p>
    </div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-secondary rounded-xl p-6 shadow-lg border border-gray-800">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        {children}
    </div>
);


export default Dashboard;