import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleIcon } from './icons';

const Login: React.FC = () => {
    const { login, initError, loginError } = useAuth();

    return (
        <div className="min-h-screen bg-primary flex flex-col items-center justify-center animate-fade-in">
            <div className="text-center p-8">
                <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className="w-8 h-8 bg-accent"></div>
                    <h1 className="text-5xl font-bold text-white tracking-wider">
                        Indomable Factur<span className="text-accent">IA</span>
                    </h1>
                </div>
                <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
                    Tu asistente inteligente para la gestión de facturas. Inicia sesión para empezar a organizar tus finanzas.
                </p>
                {initError ? (
                    <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg max-w-md mx-auto" role="alert">
                        <strong className="font-bold">Error de Conexión</strong>
                        <span className="block mt-1">{initError}</span>
                    </div>
                ) : (
                    <button
                        onClick={login}
                        className="inline-flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-gray-200 transition-all transform hover:scale-105"
                    >
                        <GoogleIcon />
                        <span>Iniciar Sesión con Google</span>
                    </button>
                )}
                {loginError && (
                    <div className="mt-4 bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg max-w-md mx-auto animate-fade-in" role="alert">
                         <strong className="font-bold">Error al Iniciar Sesión</strong>
                        <span className="block mt-1">{loginError}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;