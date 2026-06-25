import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            console.log('Submitting login form:', formData);
            await login(formData);
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card animate">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <Shield size={48} style={{ color: '#2563eb', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '2rem', margin: '0' }}>Welcome Back</h2>
                    <p style={{ color: '#94a3b8' }}>Log in to your PrimIa account</p>
                </div>

                <form onSubmit={handleSubmit}>
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
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
