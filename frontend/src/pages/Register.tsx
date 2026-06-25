import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const { register } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card animate">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <Shield size={48} style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '2rem', margin: '0' }}>Create Account</h2>
                    <p style={{ color: '#94a3b8' }}>Join PrimIa for better insurance</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8' }}>
                    Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
