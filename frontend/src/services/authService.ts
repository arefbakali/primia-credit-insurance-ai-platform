const API_URL = 'http://localhost:3000/api/auth';

// Helper function to get auth token
const getToken = (): string | null => {
    return localStorage.getItem('primia_token');
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const authService = {
    async login(credentials: any) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            return data;
        } catch (error: any) {
            console.error('Login API error:', error);
            throw error;
        }
    },

    async register(userData: any) {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Registration failed');
        return data;
    },

    async getUsers() {
        const response = await fetch(`${API_URL}/users`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error fetching users');
        return data;
    },

    async updateUserRole(userData: { email: string; role: string }) {
        const response = await fetch(`${API_URL}/users`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error updating user role');
        return data;
    },
};
