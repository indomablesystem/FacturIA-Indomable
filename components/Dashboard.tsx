
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Invoice } from '../types';

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

const procesarIngresosPorTiempo = (invoices: Invoice[]) => {
    const ingresos = invoices.reduce((acc, inv) => {
        const month = new Date(inv.date).toLocaleString('es-ES', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + inv.totalAmount;
        return acc;
    }, {} as { [key: string]: number });

    const monthMap: { [key: string]: number } = { 'ene.': 0, 'feb.': 1, 'mar.': 2, 'abr.': 3, 'may.': 4, 'jun.': 5, 'jul.': 6, 'ago.': 7, 'sep.': 8, 'oct.': 9, 'nov.': 10, 'dic.': 11 };
    
    const sortedMonths = Object.keys(ingresos).sort((a, b) => {
        const [aMonthStr, aYear] = a.replace('.', '').split(' ');
        const [bMonthStr, bYear] = b.replace('.', '').split(' ');
        const aMonthIndex = monthMap[aMonthStr + '.'] ?? -1;
        const bMonthIndex = monthMap[bMonthStr + '.'] ?? -1;
        const aDate = new Date(parseInt(`20${aYear}`), aMonthIndex);
        const bDate = new Date(parseInt(`20${bYear}`), bMonthIndex);
        return aDate.getTime() - bDate.getTime();
    });

    return sortedMonths.map(month => ({ name: month, ingreso: ingresos[month] }));
};


const Dashboard: React.FC<DashboardProps> = ({ invoices }) => {
    const totalIngresado = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalIRPF = invoices.reduce((sum, inv) => sum + (inv.irpfAmount || 0), 0);
    const valorPromedioFactura = invoices.length > 0 ? totalIngresado / invoices.length : 0;
    const ingresosPorClienteData = procesarIngresosPorCliente(invoices);
    const ingresosPorTiempoData = procesarIngresosPorTiempo(invoices);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-secondary p-2 border border-gray-700 rounded-lg shadow-lg">
                    <p className="label text-light">{`${label} : ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(payload[0].value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Facturado" value={totalIngresado.toFixed(2)} isCurrency />
                <StatCard title="Total Facturas" value={invoices.length.toString()} />
                <StatCard title="Valor Promedio Factura" value={valorPromedioFactura.toFixed(2)} isCurrency />
                <StatCard title="Total IRPF Retenido" value={totalIRPF.toFixed(2)} isCurrency isNegative />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="Ingresos por Cliente">
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

                <ChartContainer title="Ingresos a lo largo del tiempo">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ingresosPorTiempoData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" tickFormatter={(value) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value as number)} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(245, 130, 31, 0.2)' }}/>
                            <Bar dataKey="ingreso" fill="#F5821F" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; isCurrency?: boolean; isNegative?: boolean }> = ({ title, value, isCurrency, isNegative }) => (
    <div className="bg-secondary rounded-xl p-6 shadow-lg border border-gray-800">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <p className={`text-3xl font-bold mt-1 ${isNegative ? 'text-red-400' : 'text-white'}`}>
            {isCurrency && '€'}{isCurrency ? new Intl.NumberFormat('es-ES').format(parseFloat(value)) : value}
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