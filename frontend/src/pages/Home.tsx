import { Link } from 'react-router-dom';
import { Shield, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="container">
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield className="text-primary" /> PrimIa
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {user ? (
                        <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-outline">Login</Link>
                            <Link to="/register" className="btn btn-primary">Start Free</Link>
                        </>
                    )}
                </div>
            </nav>

            <header className="hero animate">
                <h1>Insurance that works <br /> for the future.</h1>
                <p>PrimIa uses advanced AI to assess risk and provide the most competitive rates for your business and personal needs.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>Get Started</Link>
                    <button className="btn btn-outline" style={{ padding: '1rem 2.5rem' }}>Learn More</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
                <div className="glass-card animate" style={{ animationDelay: '0.2s' }}>
                    <Zap size={40} style={{ color: '#fbbf24', marginBottom: '1rem' }} />
                    <h3>Instant Quotes</h3>
                    <p style={{ color: '#94a3b8' }}>Get accurately priced insurance quotes in under 2 minutes using our proprietary scoring model.</p>
                </div>
                <div className="glass-card animate" style={{ animationDelay: '0.4s' }}>
                    <Shield size={40} style={{ color: '#22c55e', marginBottom: '1rem' }} />
                    <h3>Total Protection</h3>
                    <p style={{ color: '#94a3b8' }}>Comprehensive coverage tailored specifically to your data profile and business risk footprint.</p>
                </div>
                <div className="glass-card animate" style={{ animationDelay: '0.6s' }}>
                    <TrendingUp size={40} style={{ color: '#a855f7', marginBottom: '1rem' }} />
                    <h3>Dynamic Rates</h3>
                    <p style={{ color: '#94a3b8' }}>Unlike traditional insurance, our rates move with your business. Perform better, pay less.</p>
                </div>
            </div>
        </div>
    );
};

export default Home;
