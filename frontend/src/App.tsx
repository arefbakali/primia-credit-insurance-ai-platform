import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { InsurerDashboard } from './components/InsurerDashboard';
import UserDashboard from './pages/UserDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (user) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <PublicRoute>
                                    <Register />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardSwitcher />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

const DashboardSwitcher = () => {
    const { user } = useAuth();
    if (user?.role === 'admin') return <InsurerDashboard />;
    return <UserDashboard />;
};

export default App;
