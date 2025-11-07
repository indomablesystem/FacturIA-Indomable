import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, Auth } from 'firebase/auth';
import { getFirebaseApp } from '../firebase/config';

interface AuthContextType {
    user: User | null;
    loadingAuth: boolean;
    initError: string | null;
    loginError: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [authInstance, setAuthInstance] = useState<Auth | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        getFirebaseApp()
            .then(app => {
                const auth = getAuth(app);
                setAuthInstance(auth);
                unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                    setUser(currentUser);
                    setLoadingAuth(false);
                });
            })
            .catch(err => {
                console.error("Failed to initialize Firebase Auth", err);
                const baseMessage = "No se pudo inicializar la autenticación.";
                const userMessage = (err instanceof Error) ? err.message : "Error desconocido.";
                const fullError = `${baseMessage} ${userMessage} Asegúrate de que la configuración en Vercel sea correcta y que el dominio '${window.location.hostname}' esté añadido a los 'dominios autorizados' en la consola de Firebase Authentication.`;
                setInitError(fullError);
                setLoadingAuth(false);
            });
            
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const login = async () => {
        if (!authInstance) {
            console.error("Intento de login fallido: la instancia de autenticación no está lista.");
            setInitError("El servicio de autenticación no está listo. Por favor, refresca la página.");
            return;
        }
        setLoginError(null); // Clear previous login errors
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(authInstance, provider);
        } catch (error: any) {
            console.error("Error durante el inicio de sesión con Google", error);
            let errorMessage = "Ocurrió un error al intentar iniciar sesión.";
            if (error.code === 'auth/operation-not-allowed') {
                 errorMessage = "El inicio de sesión con Google no está habilitado. Por favor, actívalo en la consola de Firebase.";
            } else if (error.code === 'auth/auth-domain-config-error') {
                 errorMessage = `El dominio de esta aplicación no está autorizado. Añade '${window.location.hostname}' a la lista de dominios autorizados en la configuración de autenticación de Firebase.`;
            }
            setLoginError(errorMessage);
        }
    };

    const logout = async () => {
        if (!authInstance) return;
        try {
            await signOut(authInstance);
        } catch (error) {
            console.error("Error durante el cierre de sesión", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loadingAuth, initError, loginError, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};