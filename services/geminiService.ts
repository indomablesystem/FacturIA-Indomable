import { GoogleGenAI, Type } from "@google/genai";
import { Invoice, ChatMessage } from '../types';

// Caching mechanism to store the API key after fetching it once.
let apiKeyPromise: Promise<string> | null = null;

const getApiKey = (): Promise<string> => {
    // If we already have a promise to fetch the key, return it to avoid multiple requests.
    if (apiKeyPromise) {
        return apiKeyPromise;
    }

    // In a browser environment where process.env is not available,
    // we fetch the key from a secure serverless function.
    // This function reads the API_KEY from Vercel's environment variables.
    apiKeyPromise = fetch('/api/get-key')
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                // Throw the user-friendly error from our serverless function if available.
                throw new Error(data.error || `Error del servidor: ${response.status}`);
            }
            return data;
        })
        .then(data => {
            if (!data.apiKey) {
                throw new Error("La respuesta del servidor no contenía una API Key.");
            }
            // Once we have the key, we resolve the promise with it.
            return data.apiKey;
        })
        .catch(err => {
            // If fetching fails, clear the promise to allow for retries.
            apiKeyPromise = null; 
            throw err;
        });
    
    return apiKeyPromise;
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
        cliente: { type: Type.STRING, description: "El nombre de la empresa o persona a la que se le emite la factura (el cliente)." },
        invoiceNumber: { type: Type.STRING, description: "El identificador único de la factura." },
        date: { type: Type.STRING, description: "La fecha de emisión de la factura (YYYY-MM-DD)." },
        dueDate: { type: Type.STRING, description: "La fecha de vencimiento para el pago (YYYY-MM-DD)." },
        totalAmount: { type: Type.NUMBER, description: "El importe total a cobrar." },
        taxAmount: { type: Type.NUMBER, description: "El importe total de impuestos (IVA)." },
        irpfAmount: { type: Type.NUMBER, description: "El importe total de la retención de IRPF. Busca explícitamente 'TOTAL IRPF' en la factura. Si no existe, devuelve 0." },
        currency: { type: Type.STRING, description: "La moneda de los importes (ej. USD, EUR)." },
        lineItems: {
            type: Type.ARRAY,
            description: "Una lista de todos los artículos o servicios facturados.",
            items: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                },
                required: ["description", "quantity", "unitPrice", "total"]
            }
        },
    },
    required: ["cliente", "invoiceNumber", "date", "totalAmount"]
};


export const extractInvoiceData = async (file: File): Promise<Omit<Invoice, 'id' | 'fileName'>> => {
    const apiKey = await getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error('Solo se admiten archivos de imagen y PDF para la extracción.');
    }

    const filePart = await fileToGenerativePart(file);

    const prompt = "Eres un experto asistente de contabilidad. Analiza el siguiente documento de factura (imagen o PDF) y extrae la información especificada. Presta especial atención a extraer el valor etiquetado como 'TOTAL IRPF' para el campo `irpfAmount`. Si un campo no está presente, devuelve null para su valor (o 0 para campos numéricos como irpfAmount). La respuesta debe estar en formato JSON coincidiendo con el esquema proporcionado.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [ {text: prompt}, filePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: invoiceSchema,
        },
    });

    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse Gemini response:", jsonText);
        throw new Error("La IA no pudo devolver datos válidos. El documento puede no ser claro.");
    }
};

export const getChatbotResponse = async (history: ChatMessage[], invoices: Invoice[]): Promise<string> => {
    const apiKey = await getApiKey();
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const context = `
      Eres Indomable FacturIA, un asistente de contabilidad IA amigable y perspicaz.
      Tu objetivo es ayudar al usuario a entender sus datos financieros basados en las facturas de VENTA (lo que ha ganado) que ha subido.
      Sé conciso, útil y usa los datos proporcionados para responder preguntas.
      Si no tienes suficiente información, dilo. No inventes datos.
      Fecha Actual: ${new Date().toLocaleDateString('es-ES')}
      
      Aquí están los datos de las facturas del usuario en formato JSON:
      ${JSON.stringify(invoices, null, 2)}
    `;

    const userMessages = history.filter(m => m.sender === 'user').map(m => m.text);
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (!lastUserMessage) {
        return "Disculpa, no entendí tu pregunta. ¿Podrías repetirla?";
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: lastUserMessage,
        config: {
          systemInstruction: context,
        },
    });

    return response.text;
};