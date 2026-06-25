const API_URL = 'http://localhost:3000/api/quotes';

// Helper function to get auth token
const getToken = (): string | null => {
    // Try new key first
    let token = localStorage.getItem('primia_token');
    
    // Fallback to old key for backward compatibility
    if (!token) {
        token = localStorage.getItem('makina_token');
    }
    
    return token;
};

export const quoteService = {
    async requestQuote(formData: FormData) {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/request`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response (${response.status}): ${text.slice(0, 200)}...`);
        }

        if (!response.ok) {
            const errorMsg = data.details ? `${data.message}: ${data.details}` : (data.message || 'Error requesting quote');
            throw new Error(errorMsg);
        }
        return data;
    },

    async generateQuote(formData: FormData) {
        // Try multiple ways to get the token
        let token = getToken();
        
        // Fallback: try old key name
        if (!token) {
            token = localStorage.getItem('makina_token');
        }
        
        // Fallback: try to get from auth context
        if (!token) {
            const savedUser = localStorage.getItem('primia_user') || localStorage.getItem('makina_user');
            if (savedUser) {
                console.warn('Token not found but user data exists. User may need to log in again.');
            }
        }
        
        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }

        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`
        };
        // Note: Do NOT set Content-Type for FormData - browser will set it automatically with boundary

        console.log('[QuoteService] Sending request with token:', token ? 'Token exists' : 'No token');

        const response = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response (${response.status}): ${text.slice(0, 200)}...`);
        }

        if (!response.ok) {
            const errorMsg = data.error ? `${data.message}: ${data.error}` : (data.message || 'Error generating quote');
            throw new Error(errorMsg);
        }
        return data;
    },

    async getQuotes() {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(API_URL, {
            method: 'GET',
            headers,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error fetching quotes');
        return data;
    },

    async getQuote(id: string) {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${id}`, {
            method: 'GET',
            headers,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error fetching quote');
        return data;
    },

    async updateQuote(id: string, updateData: { base_amount?: number; tva_rate?: number; status?: string; admin_notes?: string; commission_optimale?: number }) {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error updating quote');
        return data;
    },

    async confirmQuote(id: string) {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${id}/confirm`, {
            method: 'POST',
            headers,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error confirming quote');
        return data;
    },

    async downloadQuote(id: string) {
        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/${id}/download`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                throw new Error(data.message || 'Error downloading quote');
            } else {
                const text = await response.text();
                throw new Error(text || 'Error downloading quote');
            }
        }

        // Get blob and create download link
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-${id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};
