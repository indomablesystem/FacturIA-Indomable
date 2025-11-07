export type Language = 'es' | 'en';

type Translation = {
    [key: string]: string;
};

type Translations = {
    es: Translation;
    en: Translation;
};

export const translations: Translations = {
    es: {
        // App
        'welcome_title': 'Bienvenido a Indomable FacturIA',
        'welcome_subtitle': 'Comienza subiendo tu primera factura. Nuestra IA extraerá los datos automáticamente y desbloqueará tu panel de finanzas.',
        'upload_more': 'Subir Más',
        'dashboard': 'Panel',
        'all_invoices': 'Todas las Facturas',
        'error_processing_invoice': 'Error al analizar la factura.',
        // Uploader
        'drop_invoice_here': 'Arrastra y suelta tu factura aquí',
        'click_to_browse_pre': 'o',
        'click_to_browse_link': 'haz clic para buscar',
        'supports': 'Soporta:',
        'analyzing_invoice': 'Analizando Factura...',
        'this_may_take_a_moment': 'Esto puede tardar un momento.',
        // Invoice List
        'search_invoices': 'Buscar facturas...',
        'export': 'Exportar',
        'client': 'Cliente',
        'invoice_no': 'Factura Nº',
        'date': 'Fecha',
        'irpf': 'IRPF',
        'total': 'Total',
        'actions': 'Acciones',
        'view_invoice': 'Ver factura',
        'delete_invoice': 'Eliminar factura',
        'no_invoices_found': 'No se encontraron facturas.',
        // Modal
        'invoice_details': 'Detalles de la Factura',
        'issue_date': 'Fecha Emisión',
        'due_date': 'Fecha Vencimiento',
        'taxes': 'Impuestos',
        'vat': 'IVA',
        'total_amount': 'Importe Total',
        'concepts': 'Conceptos',
        'description': 'Descripción',
        'quantity': 'Cantidad',
        'unit_price': 'P. Unidad',
        'no_line_items': 'No hay conceptos detallados.',
        'close': 'Cerrar',
        // Dashboard
        'total_invoiced': 'Total Facturado',
        'total_invoices_count': 'Total Facturas',
        'average_invoice_value': 'Valor Promedio Factura',
        'total_irpf_withheld': 'Total IRPF Retenido',
        'revenue_by_client': 'Ingresos por Cliente',
        'revenue_over_time': 'Ingresos a lo largo del tiempo',
        'revenue': 'ingreso',
        // Chatbot
        'ai_assistant': 'Asistente IA',
        'chatbot_greeting': '¡Hola! Soy Indomable FacturIA, tu asistente de IA. Pregúntame lo que quieras sobre tus facturas.',
        'ask_about_finances': 'Pregunta sobre tus finanzas...',
        'chatbot_error': 'Lo siento, he encontrado un error. Por favor, inténtalo de nuevo.',
    },
    en: {
        // App
        'welcome_title': 'Welcome to Indomable FacturIA',
        'welcome_subtitle': 'Start by uploading your first invoice. Our AI will automatically extract the data and unlock your finance dashboard.',
        'upload_more': 'Upload More',
        'dashboard': 'Dashboard',
        'all_invoices': 'All Invoices',
        'error_processing_invoice': 'Error processing invoice.',
        // Uploader
        'drop_invoice_here': 'Drag and drop your invoice here',
        'click_to_browse_pre': 'or',
        'click_to_browse_link': 'click to browse',
        'supports': 'Supports:',
        'analyzing_invoice': 'Analyzing Invoice...',
        'this_may_take_a_moment': 'This may take a moment.',
        // Invoice List
        'search_invoices': 'Search invoices...',
        'export': 'Export',
        'client': 'Client',
        'invoice_no': 'Invoice #',
        'date': 'Date',
        'irpf': 'IRPF',
        'total': 'Total',
        'actions': 'Actions',
        'view_invoice': 'View invoice',
        'delete_invoice': 'Delete invoice',
        'no_invoices_found': 'No invoices found.',
        // Modal
        'invoice_details': 'Invoice Details',
        'issue_date': 'Issue Date',
        'due_date': 'Due Date',
        'taxes': 'Taxes',
        'vat': 'VAT',
        'total_amount': 'Total Amount',
        'concepts': 'Line Items',
        'description': 'Description',
        'quantity': 'Quantity',
        'unit_price': 'Unit Price',
        'no_line_items': 'No line items detailed.',
        'close': 'Close',
        // Dashboard
        'total_invoiced': 'Total Invoiced',
        'total_invoices_count': 'Total Invoices',
        'average_invoice_value': 'Average Invoice Value',
        'total_irpf_withheld': 'Total IRPF Withheld',
        'revenue_by_client': 'Revenue by Client',
        'revenue_over_time': 'Revenue Over Time',
        'revenue': 'revenue',
        // Chatbot
        'ai_assistant': 'AI Assistant',
        'chatbot_greeting': 'Hi! I am Indomable FacturIA, your AI assistant. Ask me anything about your invoices.',
        'ask_about_finances': 'Ask about your finances...',
        'chatbot_error': 'Sorry, I encountered an error. Please try again.',
    }
};
