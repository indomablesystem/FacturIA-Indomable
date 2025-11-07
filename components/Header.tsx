import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoginIcon } from './icons';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { language, setLanguage } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLanguageToggle = () => {
        setLanguage(language === 'es' ? 'en' : 'es');
    };

    return (
        <header className="bg-secondary/30 backdrop-blur-sm p-4 border-b border-gray-800 sticky top-0 z-40">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent"></div>
                    <h1 className="text-2xl font-bold text-white tracking-wider">
                        Indomable Factur<span className="text-accent">IA</span>
                    </h1>
                </div>
                {user && (
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={handleLanguageToggle} 
                            className="text-sm text-gray-400 hover:text-white transition-colors font-semibold hidden sm:block"
                        >
                            {language.toUpperCase()}
                        </button>
                        <div className="relative">
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold hover:bg-accent-hover transition-colors focus:outline-none"
                                aria-label="User Menu"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full rounded-full" />
                                ) : (
                                    <span>{user.displayName?.charAt(0) || 'U'}</span>
                                )}
                            </button>
                            {isMenuOpen && (
                                <div 
                                    className="absolute right-0 mt-2 w-48 bg-secondary rounded-md shadow-lg py-1 border border-gray-700 animate-fade-in"
                                    onMouseLeave={() => setIsMenuOpen(false)}
                                >
                                    <div className="px-4 py-2 text-sm text-white border-b border-gray-700">
                                        <p className="font-semibold">{user.displayName}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-primary"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;