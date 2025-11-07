import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { SendIcon, CloseIcon, BotIcon, UserIcon, SpinnerIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    getBotResponse: (history: ChatMessage[]) => Promise<string>;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, getBotResponse }) => {
    const { t } = useLanguage();
    
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'initial', text: t('chatbot_greeting'), sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Update initial message if language changes and chat is reset
        setMessages([{ id: 'initial', text: t('chatbot_greeting'), sender: 'bot' }]);
    }, [t]);

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const botResponseText = await getBotResponse([...messages, userMessage]);
            const botMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: botResponseText, sender: 'bot' };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), text: t('chatbot_error'), sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-20 right-6 w-[calc(100%-3rem)] sm:w-96 h-[60vh] max-h-[700px] bg-secondary shadow-2xl rounded-2xl flex flex-col z-50 animate-slide-in border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">{t('ai_assistant')}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <CloseIcon />
                </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                        {message.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-1"><BotIcon className="w-5 h-5" /></div>}
                        <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${message.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-primary text-light rounded-bl-none'}`}>
                           <p className="text-sm">{message.text}</p>
                        </div>
                         {message.sender === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center mt-1"><UserIcon /></div>}
                    </div>
                ))}
                 {isLoading && (
                     <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-1"><BotIcon className="w-5 h-5" /></div>
                         <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-2xl bg-primary text-light rounded-bl-none">
                            <SpinnerIcon className="w-5 h-5" />
                         </div>
                     </div>
                 )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-700">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={t('ask_about_finances')}
                        className="w-full bg-primary border border-gray-600 rounded-full py-2 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent text-white p-1.5 rounded-full hover:bg-accent-hover transition-colors disabled:bg-gray-500">
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;