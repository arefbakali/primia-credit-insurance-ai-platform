import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, Activity, LogOut, Search, Bell, CheckCircle, Edit, Trash2, Download, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quoteService } from '../services/quoteService';
import { authService } from '../services/authService';

export const InsurerDashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [currentView, setCurrentView] = useState<'quotes' | 'users'>('quotes');
    const [editingQuote, setEditingQuote] = useState<any>(null);
    const [viewingQuote, setViewingQuote] = useState<any>(null);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [editData, setEditData] = useState({ base_amount: 0, tva_rate: 19, status: '', admin_notes: '', commission_optimale: 0 });
    const [originalCommissionPredite, setOriginalCommissionPredite] = useState<number | null>(null);

    useEffect(() => {
        if (currentView === 'quotes') fetchQuotes();
        else fetchUsers();
    }, [currentView]);

    const fetchQuotes = async () => {
        setFetchLoading(true);
        try {
            const data = await quoteService.getQuotes();
            setQuotes(data);
        } catch (error) {
            console.error('Error fetching admin quotes:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    const fetchUsers = async () => {
        setFetchLoading(true);
        try {
            const data = await authService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    const handleRoleToggle = async (email: string, currentRole: string) => {
        const nextRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            await authService.updateUserRole({ email, role: nextRole });
            fetchUsers();
        } catch (error) {
            console.error('Error updating role:', error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            // If commission_optimale changed, recalculate base_amount
            const updatePayload: any = { ...editData };
            
            if (editingQuote?.commission_optimale !== editData.commission_optimale && editData.commission_optimale > 0) {
                // Recalculate base_amount based on new commission
                const montant_credit = editingQuote.montant_credit || editingQuote.base_amount || 0;
                const new_montant_commission = (editData.commission_optimale * montant_credit) / 100;
                updatePayload.base_amount = new_montant_commission;
            }
            
            await quoteService.updateQuote(editingQuote.quote_id || editingQuote.id, updatePayload);
            setEditingQuote(null);
            setOriginalCommissionPredite(null);
            fetchQuotes();
        } catch (error) {
            console.error('Error updating quote:', error);
            alert('Erreur lors de la mise à jour');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleConfirm = async (quoteId: string) => {
        if (!confirm('Confirmer ce devis ? Il sera envoyé à l\'utilisateur.')) return;
        try {
            await quoteService.confirmQuote(quoteId);
            fetchQuotes();
            alert('Devis confirmé avec succès !');
        } catch (error: any) {
            alert(error.message || 'Erreur lors de la confirmation');
        }
    };

    const handleDownload = async (quoteId: string) => {
        try {
            await quoteService.downloadQuote(quoteId);
        } catch (error: any) {
            alert(error.message || 'Erreur lors du téléchargement');
        }
    };

    const startEdit = (quote: any) => {
        setEditingQuote(quote);
        setOriginalCommissionPredite(quote.commission_predite || null);
        setEditData({
            base_amount: quote.base_amount || 0,
            tva_rate: quote.tva_rate || 19,
            status: quote.status || '',
            admin_notes: quote.admin_notes || '',
            commission_optimale: quote.commission_optimale || 0
        });
    };

    const resetCommissionToModel = () => {
        if (originalCommissionPredite !== null) {
            setEditData({ ...editData, commission_optimale: originalCommissionPredite });
        }
    };

    const viewQuote = async (quoteId: string) => {
        try {
            const quote = await quoteService.getQuote(quoteId);
            setViewingQuote(quote);
        } catch (error: any) {
            alert(error.message || 'Erreur lors du chargement');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: 'white' }}>
            {/* Sidebar */}
            <aside style={{ width: '260px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    <Shield color="#2563eb" /> PrimIa Admin
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={() => setCurrentView('quotes')}
                        className={`btn ${currentView === 'quotes' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ textAlign: 'left', border: currentView === 'quotes' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: currentView === 'quotes' ? 'rgba(37, 99, 235, 0.1)' : 'transparent', color: currentView === 'quotes' ? '#60a5fa' : 'white' }}
                    >
                        <Activity size={18} style={{ marginRight: '10px' }} /> Gestion Devis
                    </button>
                    <button
                        onClick={() => setCurrentView('users')}
                        className={`btn ${currentView === 'users' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ textAlign: 'left', border: currentView === 'users' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: currentView === 'users' ? 'rgba(37, 99, 235, 0.1)' : 'transparent', color: currentView === 'users' ? '#60a5fa' : 'white' }}
                    >
                        <Users size={18} style={{ marginRight: '10px' }} /> Gestion Users
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', border: 'none', color: '#ef4444' }}>
                        <LogOut size={18} style={{ marginRight: '10px' }} /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem', position: 'relative' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>{currentView === 'quotes' ? 'Gestion des Devis' : 'Gestion des Utilisateurs'}</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Administrateur</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #2563eb, #a855f7)' }}></div>
                    </div>
                </header>

                {currentView === 'quotes' ? (
                    <div className="glass-card" style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '1.5rem' }}>Utilisateur</th>
                                    <th style={{ padding: '1.5rem' }}>Secteur</th>
                                    <th style={{ padding: '1.5rem' }}>Statut</th>
                                    <th style={{ padding: '1.5rem' }}>Montant</th>
                                    <th style={{ padding: '1.5rem' }}>Risque</th>
                                    <th style={{ padding: '1.5rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetchLoading ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Chargement...</td>
                                    </tr>
                                ) : quotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Aucun devis.</td>
                                    </tr>
                                ) : (
                                    quotes.map((quote) => (
                                        <tr key={quote.quote_id || quote.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1.5rem' }}>{quote.user_email}</td>
                                            <td style={{ padding: '1.5rem' }}>{quote.sector || 'N/A'}</td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '999px', background: quote.status === 'confirmed' ? 'rgba(34, 197, 94, 0.2)' : quote.status === 'generated' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: quote.status === 'confirmed' ? '#22c55e' : quote.status === 'generated' ? '#60a5fa' : '#fbbf24', fontWeight: '600' }}>
                                                    {quote.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                {quote.total_amount > 0 ? (
                                                    <div style={{ fontWeight: 'bold', color: '#22c55e' }}>{quote.total_amount?.toLocaleString()} DT</div>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>Non généré</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                {quote.facteur_risque ? (
                                                    <span style={{ color: quote.facteur_risque > 7 ? '#ef4444' : quote.facteur_risque > 5 ? '#fbbf24' : '#22c55e', fontWeight: 'bold' }}>
                                                        {quote.facteur_risque}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#64748b' }}>N/A</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => viewQuote(quote.quote_id || quote.id)} className="btn btn-outline" style={{ padding: '0.5rem' }} title="Voir détails">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button onClick={() => startEdit(quote)} className="btn btn-outline" style={{ padding: '0.5rem' }} title="Modifier">
                                                        <Edit size={16} />
                                                    </button>
                                                    {quote.status === 'generated' && (
                                                        <button onClick={() => handleConfirm(quote.quote_id || quote.id)} className="btn btn-outline" style={{ padding: '0.5rem', color: '#22c55e' }} title="Confirmer">
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    {quote.status === 'confirmed' && (
                                                        <button onClick={() => handleDownload(quote.quote_id || quote.id)} className="btn btn-outline" style={{ padding: '0.5rem', color: '#60a5fa' }} title="Télécharger PDF">
                                                            <Download size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '1.5rem' }}>Nom</th>
                                    <th style={{ padding: '1.5rem' }}>Email</th>
                                    <th style={{ padding: '1.5rem' }}>Rôle</th>
                                    <th style={{ padding: '1.5rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetchLoading ? (
                                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>Chargement...</td></tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1.5rem' }}>{u.name}</td>
                                            <td style={{ padding: '1.5rem' }}>{u.email}</td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: '999px', background: u.role === 'admin' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(100, 116, 139, 0.2)', color: u.role === 'admin' ? '#60a5fa' : '#64748b', fontWeight: '600' }}>
                                                    {u.role?.toUpperCase() || 'USER'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.5rem' }}>
                                                <button onClick={() => handleRoleToggle(u.email, u.role)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                                                    {u.role === 'admin' ? 'Rétrograder' : 'Promouvoir Admin'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Edit Modal */}
                {editingQuote && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-card" style={{ padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Modifier le Devis</h3>
                                <button onClick={() => setEditingQuote(null)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Montant de base (DT)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editData.base_amount}
                                            onChange={(e) => setEditData({ ...editData, base_amount: parseFloat(e.target.value) || 0 })}
                                            className="input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Taux TVA (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editData.tva_rate}
                                            onChange={(e) => setEditData({ ...editData, tva_rate: parseFloat(e.target.value) || 19 })}
                                            className="input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Statut</label>
                                        <select
                                            value={editData.status}
                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                            className="input"
                                            style={{ width: '100%' }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="generated">Generated</option>
                                            <option value="confirmed">Confirmed</option>
                                        </select>
                                    </div>
                                    {editingQuote?.commission_predite && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <label style={{ fontSize: '0.875rem' }}>Commission Optimale (%)</label>
                                                {originalCommissionPredite !== null && (
                                                    <button
                                                        type="button"
                                                        onClick={resetCommissionToModel}
                                                        className="btn btn-outline"
                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        title={`Réinitialiser à ${originalCommissionPredite}% (valeur du modèle ML)`}
                                                    >
                                                        Réinitialiser ({originalCommissionPredite}%)
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                Modèle ML: {editingQuote.commission_predite}%
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.3"
                                                max="4.0"
                                                value={editData.commission_optimale}
                                                onChange={(e) => setEditData({ ...editData, commission_optimale: parseFloat(e.target.value) || 0 })}
                                                className="input"
                                                style={{ width: '100%' }}
                                            />
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                Montant commission: {((editData.commission_optimale * (editingQuote.montant_credit || editingQuote.base_amount || 0)) / 100).toLocaleString()} DT
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notes Admin</label>
                                        <textarea
                                            value={editData.admin_notes}
                                            onChange={(e) => setEditData({ ...editData, admin_notes: e.target.value })}
                                            className="input"
                                            style={{ width: '100%', minHeight: '100px' }}
                                            placeholder="Notes internes..."
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="submit" className="btn btn-primary" disabled={updateLoading}>
                                            {updateLoading ? 'Enregistrement...' : 'Enregistrer'}
                                        </button>
                                        <button type="button" onClick={() => setEditingQuote(null)} className="btn btn-outline">
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View Quote Modal */}
                {viewingQuote && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-card" style={{ padding: '2rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Détails du Devis</h3>
                                <button onClick={() => setViewingQuote(null)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Basic Info */}
                                <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#60a5fa' }}>Informations Générales</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div>Utilisateur: <span style={{ color: '#cbd5e1' }}>{viewingQuote.user_email}</span></div>
                                        <div>Secteur: <span style={{ color: '#cbd5e1' }}>{viewingQuote.sector}</span></div>
                                        <div>Statut: <span style={{ color: '#cbd5e1' }}>{viewingQuote.status}</span></div>
                                        <div>Date: <span style={{ color: '#cbd5e1' }}>{new Date(viewingQuote.quote_created_at || viewingQuote.created_at).toLocaleDateString('fr-FR')}</span></div>
                                    </div>
                                </div>

                                {/* Credit Info */}
                                {viewingQuote.montant_credit && (
                                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#60a5fa' }}>Informations de Crédit</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div>Montant: <span style={{ color: '#cbd5e1' }}>{viewingQuote.montant_credit?.toLocaleString()} DT</span></div>
                                            <div>Durée: <span style={{ color: '#cbd5e1' }}>{viewingQuote.duree} mois</span></div>
                                            <div>Taux: <span style={{ color: '#cbd5e1' }}>{viewingQuote.taux_interet}%</span></div>
                                            <div>Type: <span style={{ color: '#cbd5e1' }}>{viewingQuote.type_credit}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Risk Factors */}
                                {viewingQuote.facteur_risque && (
                                    <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fbbf24' }}>Analyse des Risques</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fbbf24' }}>Facteur de Risque: {viewingQuote.facteur_risque}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div>Montant: <span style={{ color: '#cbd5e1' }}>{viewingQuote.montant_score}</span></div>
                                            <div>Taux: <span style={{ color: '#cbd5e1' }}>{viewingQuote.taux_score}</span></div>
                                            <div>Durée: <span style={{ color: '#cbd5e1' }}>{viewingQuote.duree_score}</span></div>
                                            <div>Secteur: <span style={{ color: '#cbd5e1' }}>{viewingQuote.secteur_score}</span></div>
                                            <div>Sinistres: <span style={{ color: '#cbd5e1' }}>{viewingQuote.sinistres_score}</span></div>
                                            <div>Type crédit: <span style={{ color: '#cbd5e1' }}>{viewingQuote.type_credit_score}</span></div>
                                            <div>État financier: <span style={{ color: '#cbd5e1' }}>{viewingQuote.etat_financier_score}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Commission */}
                                {viewingQuote.commission_optimale && (
                                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#22c55e' }}>Commission</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div>Commission optimale: <span style={{ color: '#cbd5e1' }}>{viewingQuote.commission_optimale}%</span></div>
                                            {viewingQuote.commission_predite && <div>ML Prédiction: <span style={{ color: '#cbd5e1' }}>{viewingQuote.commission_predite}%</span></div>}
                                            <div>Montant commission: <span style={{ color: '#cbd5e1' }}>{viewingQuote.montant_commission?.toLocaleString()} DT</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Amounts */}
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Montants</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div>Montant de base: <span style={{ color: '#cbd5e1' }}>{viewingQuote.base_amount?.toLocaleString()} DT</span></div>
                                        <div>TVA ({viewingQuote.tva_rate || 19}%): <span style={{ color: '#cbd5e1' }}>{((viewingQuote.base_amount || 0) * (viewingQuote.tva_rate || 19) / 100).toLocaleString()} DT</span></div>
                                        <div style={{ gridColumn: '1 / -1', fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e', marginTop: '0.5rem' }}>
                                            Total: {viewingQuote.total_amount?.toLocaleString()} DT
                                        </div>
                                    </div>
                                </div>

                                {viewingQuote.admin_notes && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Notes Admin</div>
                                        <p style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{viewingQuote.admin_notes}</p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    {viewingQuote.status === 'generated' && (
                                        <button onClick={() => { handleConfirm(viewingQuote.quote_id || viewingQuote.id); setViewingQuote(null); }} className="btn btn-primary">
                                            <CheckCircle size={16} style={{ marginRight: '0.5rem' }} /> Confirmer le Devis
                                        </button>
                                    )}
                                    {viewingQuote.status === 'confirmed' && (
                                        <button onClick={() => { handleDownload(viewingQuote.quote_id || viewingQuote.id); }} className="btn btn-outline">
                                            <Download size={16} style={{ marginRight: '0.5rem' }} /> Télécharger PDF
                                        </button>
                                    )}
                                    <button onClick={() => setViewingQuote(null)} className="btn btn-outline">
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
