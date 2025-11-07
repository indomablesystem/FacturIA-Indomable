
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-secondary/30 backdrop-blur-sm p-4 border-b border-gray-800 sticky top-0 z-40">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent"></div>
                    <h1 className="text-2xl font-bold text-white tracking-wider">
                        Indomable Factur<span className="text-accent">IA</span>
                    </h1>
                </div>
                {/* Placeholder for future controls like theme switcher or user profile */}
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400 hidden sm:block">ES</span>
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                        U
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;