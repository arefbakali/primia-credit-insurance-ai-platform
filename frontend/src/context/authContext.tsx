import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

interface User {
    email: string;
    name: string;
    role: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    register: (userData: any) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('makina_user');
        const savedToken = localStorage.getItem('makina_token');
        
        if (savedUser && savedToken) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Error parsing saved user:', error);
                // Clear invalid data
                localStorage.removeItem('makina_user');
                localStorage.removeItem('makina_token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (credentials: any) => {
        try {
            console.log('Attempting login with:', credentials.email);
            const data = await authService.login(credentials);
            
            if (!data || !data.user) {
                throw new Error('Invalid response from server');
            }
            
            const userData = data.user;
            const token = data.token;
            
            if (!token) {
                throw new Error('No token received from server');
            }
            
            setUser(userData);
            localStorage.setItem('makina_user', JSON.stringify(userData));
            localStorage.setItem('makina_token', token);
            console.log('Login successful for:', userData.email);
        } catch (error: any) {
            console.error('Login error in context:', error);
            throw error;
        }
    };

    const register = async (userData: any) => {
        const data = await authService.register(userData);
        const newUser = data.user;
        const token = data.token;
        
        if (!token) {
            throw new Error('No token received from server');
        }
        
        setUser(newUser);
        localStorage.setItem('makina_user', JSON.stringify(newUser));
        localStorage.setItem('makina_token', token);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('makina_user');
        localStorage.removeItem('makina_token');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
