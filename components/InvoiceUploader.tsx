import React, { useState, useCallback } from 'react';
import { UploadIcon, SpinnerIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoiceUploaderProps {
    onFileUpload: (file: File) => void;
    isProcessing: boolean;
}

const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({ onFileUpload, isProcessing }) => {
    const [isDragging, setIsDragging] = useState(false);
    const { t } = useLanguage();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            onFileUpload(event.target.files[0]);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileUpload(e.dataTransfer.files[0]);
        }
    }, [onFileUpload]);

    return (
        <div className="w-full max-w-2xl mx-auto p-4 animate-slide-in">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-all duration-300
                    ${isDragging ? 'border-accent bg-secondary' : 'border-gray-600 hover:border-gray-500 bg-secondary/50'}`}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept="application/pdf, image/png, image/jpeg, image/webp"
                    disabled={isProcessing}
                />
                {isProcessing ? (
                    <div className="flex flex-col items-center text-center">
                        <SpinnerIcon />
                        <p className="mt-4 text-lg font-semibold text-gray-300">{t('analyzing_invoice')}</p>
                        <p className="text-sm text-gray-400">{t('this_may_take_a_moment')}</p>
                    </div>
                ) : (
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center p-4">
                        <UploadIcon />
                        <p className="mt-4 text-lg font-semibold text-gray-300">{t('drop_invoice_here')}</p>
                        <p className="text-sm text-gray-400">{t('click_to_browse_pre')} <span className="text-accent font-medium">{t('click_to_browse_link')}</span></p>
                        <p className="mt-2 text-xs text-gray-500">{t('supports')} PDF, PNG, JPG, WEBP</p>
                    </label>
                )}
            </div>
        </div>
    );
};

export default InvoiceUploader;