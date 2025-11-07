import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, Auth } from 'firebase/auth';
import { getFirebaseApp } from '../firebase/config';

interface AuthContextType {
    user: User | null;
    loadingAuth: boolean;
    initError: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [authInstance, setAuthInstance] = useState<Auth | null>(null);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        getFirebaseApp()
            .then(app => {
                const auth = getAuth(app);
                setAuthInstance(auth);
                const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                    setUser(currentUser);
                    setLoadingAuth(false);
                });
                return () => unsubscribe();
            })
            .catch(err => {
                console.error("Failed to initialize Firebase Auth", err);
                setInitError("No se pudo inicializar la autenticación. Revisa la configuración del proyecto en Vercel.");
                setLoadingAuth(false);
            });
    }, []);

    const login = async () => {
        if (!authInstance) {
            console.error("Intento de login fallido: la instancia de autenticación no está lista.");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(authInstance, provider);
        } catch (error) {
            console.error("Error durante el inicio de sesión con Google", error);
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
        <AuthContext.Provider value={{ user, loadingAuth, initError, login, logout }}>
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