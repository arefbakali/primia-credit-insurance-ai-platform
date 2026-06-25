import React, { useState, useEffect } from 'react';
import { FileText, Send, History, LogOut, Shield, Eye, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { quoteService } from '../services/quoteService';

const UserDashboard = () => {
    const { user, logout } = useAuth();
    const [sector, setSector] = useState('');
    const [bankReport, setBankReport] = useState<File | null>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [currentView, setCurrentView] = useState<'form' | 'history'>('form');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [isDragging, setIsDragging] = useState(false);
    const [viewingQuote, setViewingQuote] = useState<any>(null);

    useEffect(() => {
        if (currentView === 'history') fetchQuotes();
    }, [currentView]);

    const fetchQuotes = async () => {
        setFetchLoading(true);
        try {
            const data = await quoteService.getQuotes();
            setQuotes(data);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setFetchLoading(false);
        }
    };

    const sectors = [
        "BANQUES", "ASSURANCES", "SERVICES FINANCIERS", "DISTRIBUTION",
        "AGROALIMENT BOISSONS", "PROD MENAGER SOINS PERSO", "INDUSTRIES",
        "BATIMENT MATERIAUX CONSTRUCTION", "MATERIAUX DE BASE"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankReport) {
            setMessage({ text: 'Veuillez sélectionner un fichier PDF', type: 'error' });
            return;
        }
        if (!sector) {
            setMessage({ text: 'Veuillez sélectionner un secteur', type: 'error' });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // Check if user is authenticated
            if (!user) {
                setMessage({ text: 'Vous devez être connecté pour générer un devis. Redirection...', type: 'error' });
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            const formData = new FormData();
            formData.append('description', 'Analyse automatique du rapport financier');
            formData.append('sector', sector);
            formData.append('bank_report', bankReport);

            setMessage({ text: 'Génération du devis en cours... Cela peut prendre quelques instants.', type: 'info' });
            const result = await quoteService.generateQuote(formData);
            setMessage({ text: 'Devis généré avec succès ! Retrouvez-le dans votre historique.', type: 'success' });
            setSector('');
            setBankReport(null);
            // Refresh quotes if on history view
            if (currentView === 'history') {
                fetchQuotes();
            }
        } catch (error: any) {
            setMessage({ text: error.message || 'Erreur lors de la génération du devis', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (quoteId: string) => {
        try {
            await quoteService.downloadQuote(quoteId);
        } catch (error: any) {
            alert(error.message || 'Erreur lors du téléchargement');
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

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: 'white' }}>
            {/* Sidebar */}
            <aside style={{ width: '280px', background: 'rgba(15, 23, 42, 0.8)', padding: '2rem', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield size={28} color="#2563eb" />
                    <span>PrimIa <span style={{ color: '#2563eb' }}>Assurance</span></span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={() => setCurrentView('form')}
                        className="btn"
                        style={{
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: currentView === 'form' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                            color: currentView === 'form' ? '#60a5fa' : '#94a3b8',
                            border: '1px solid',
                            borderColor: currentView === 'form' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                            padding: '0.75rem 1rem'
                        }}
                    >
                        <Send size={18} /> Nouvelle Demande
                    </button>
                    <button
                        onClick={() => setCurrentView('history')}
                        className="btn"
                        style={{
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: currentView === 'history' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                            color: currentView === 'history' ? '#60a5fa' : '#94a3b8',
                            border: '1px solid',
                            borderColor: currentView === 'history' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                            padding: '0.75rem 1rem'
                        }}
                    >
                        <History size={18} /> Historique Devis
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <button onClick={logout} className="btn" style={{ width: '100%', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <LogOut size={18} /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bonjour, {user?.name}</h1>
                        <p style={{ color: '#94a3b8' }}>
                            {currentView === 'form' ? 'Soumettez une nouvelle demande de devis personnalisée.' : 'Consultez le statut de vos demandes et téléchargez vos devis.'}
                        </p>
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(45deg, #2563eb, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {user?.name?.charAt(0)}
                    </div>
                </header>

                <div style={{ maxWidth: '900px' }}>
                    {currentView === 'form' ? (
                        <div className="glass-card animate" style={{ padding: '3rem' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FileText size={24} color="#2563eb" /> Détails de votre Demande
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>
                                        Choisissez votre secteur d'activité
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                                        {sectors.map((s) => (
                                            <div
                                                key={s}
                                                onClick={() => setSector(s)}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    background: sector === s ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${sector === s ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s ease',
                                                    color: sector === s ? '#60a5fa' : '#94a3b8'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>{s}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>
                                        Rapport Financier (PDF ou Image)
                                    </label>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                setBankReport(e.dataTransfer.files[0]);
                                            }
                                        }}
                                        style={{
                                            border: `2px dashed ${isDragging ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                                            borderRadius: '16px',
                                            padding: '3rem 2rem',
                                            textAlign: 'center',
                                            background: isDragging ? 'rgba(37, 99, 235, 0.05)' : 'rgba(255,255,255,0.02)',
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            onChange={(e) => setBankReport(e.target.files ? e.target.files[0] : null)}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                            accept=".pdf,image/*"
                                        />
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                                                <Shield size={32} />
                                            </div>
                                            {bankReport ? (
                                                <div>
                                                    <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '0.25rem' }}>{bankReport.name}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Cliquer pour changer le fichier</div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ color: '#cbd5e1', fontWeight: '500', marginBottom: '0.25rem' }}>Glissez votre rapport ici ou cliquez</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Formats acceptés: PDF, PNG, JPG</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                    {loading ? 'Traitement en cours...' : <><Send size={20} /> Envoyer la demande</>}
                                </button>
                                {message.text && (
                                    <div style={{
                                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                                        color: message.type === 'success' ? '#22c55e' : '#f87171',
                                        marginTop: '1.5rem',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.9rem'
                                    }}>
                                        {message.text}
                                    </div>
                                )}
                            </form>
                        </div>
                    ) : (
                        <div className="animate">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Votre Historique</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {fetchLoading ? (
                                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                                        <div style={{ color: '#94a3b8' }}>Chargement de vos documents...</div>
                                    </div>
                                ) : quotes.length === 0 ? (
                                    <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                                        <History size={48} color="#334155" style={{ marginBottom: '1.5rem' }} />
                                        <p style={{ color: '#94a3b8' }}>Vous n'avez pas encore de demande de devis.</p>
                                        <button onClick={() => setCurrentView('form')} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Faire ma première demande</button>
                                    </div>
                                ) : (
                                    quotes
                                        .filter((quote) => quote.status === 'pending' || quote.status === 'confirmed')
                                        .map((quote) => (
                                        <div key={quote.quote_id || quote.id} className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: '6px',
                                                        background: quote.status === 'confirmed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                                        color: quote.status === 'confirmed' ? '#22c55e' : '#fbbf24',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {quote.status === 'confirmed' ? 'CONFIRMÉ' : 'EN ATTENTE'}
                                                    </span>
                                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                                        Secteur: <span style={{ color: '#94a3b8' }}>{quote.sector}</span>
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>Devis ID: {(quote.quote_id || quote.id)?.slice(0, 8)}</div>
                                                </div>
                                                <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{new Date(quote.quote_created_at || quote.created_at).toLocaleDateString('fr-FR')}</span>
                                            </div>

                                            {/* Show details only if confirmed */}
                                            {quote.status === 'confirmed' ? (
                                                <>
                                                    <p style={{ marginBottom: '1.5rem', fontSize: '1rem', color: '#cbd5e1', lineHeight: '1.5' }}>{quote.description}</p>

                                                    {/* Credit Info */}
                                                    {quote.montant_credit && (
                                                        <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#60a5fa' }}>Informations de Crédit</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                                <div>Montant: <span style={{ color: '#cbd5e1' }}>{quote.montant_credit?.toLocaleString()} DT</span></div>
                                                                <div>Durée: <span style={{ color: '#cbd5e1' }}>{quote.duree} mois</span></div>
                                                                <div>Taux: <span style={{ color: '#cbd5e1' }}>{quote.taux_interet}%</span></div>
                                                                <div>Type: <span style={{ color: '#cbd5e1' }}>{quote.type_credit}</span></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Risk Factors */}
                                                    {quote.facteur_risque && (
                                                        <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fbbf24' }}>Analyse des Risques</div>
                                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fbbf24' }}>Facteur de Risque: {quote.facteur_risque}</div>
                                                        </div>
                                                    )}

                                                    {/* Commission */}
                                                    {quote.commission_optimale && (
                                                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                                            <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#22c55e' }}>Commission</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                                <div>Commission: <span style={{ color: '#cbd5e1' }}>{quote.commission_optimale}%</span></div>
                                                                {quote.commission_predite && <div>ML Prédiction: <span style={{ color: '#cbd5e1' }}>{quote.commission_predite}%</span></div>}
                                                                <div>Montant: <span style={{ color: '#cbd5e1' }}>{quote.montant_commission?.toLocaleString()} DT</span></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Total Amount */}
                                                    {quote.base_amount > 0 && (
                                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                            <div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Montant Total</div>
                                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{quote.total_amount?.toLocaleString()} DT</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                                                        <button 
                                                            onClick={() => viewQuote(quote.quote_id || quote.id)}
                                                            className="btn btn-outline" 
                                                            style={{ fontSize: '0.875rem', padding: '0.6rem 1.2rem', gap: '0.5rem', display: 'flex', alignItems: 'center', flex: 1 }}
                                                        >
                                                            <Eye size={16} /> Voir les détails
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDownload(quote.quote_id || quote.id)}
                                                            className="btn btn-primary" 
                                                            style={{ fontSize: '0.875rem', padding: '0.6rem 1.2rem', gap: '0.5rem', display: 'flex', alignItems: 'center', flex: 1 }}
                                                        >
                                                            <Download size={16} /> Télécharger PDF
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(251, 191, 36, 0.05)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                                                    <p style={{ color: '#fbbf24', fontSize: '0.875rem', marginBottom: '0.5rem' }}>⏳ En attente de traitement</p>
                                                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Votre demande est en cours de traitement par l'administrateur. Les détails seront disponibles une fois le devis confirmé.</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* View Quote Modal */}
                {viewingQuote && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div className="glass-card" style={{ padding: '2rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Détails du Devis</h3>
                                <button onClick={() => setViewingQuote(null)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Basic Info */}
                                <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#60a5fa' }}>Informations Générales</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div>Secteur: <span style={{ color: '#cbd5e1' }}>{viewingQuote.sector}</span></div>
                                        <div>Date: <span style={{ color: '#cbd5e1' }}>{new Date(viewingQuote.quote_created_at || viewingQuote.created_at).toLocaleDateString('fr-FR')}</span></div>
                                        <div>Statut: <span style={{ color: '#cbd5e1' }}>{viewingQuote.status}</span></div>
                                        <div>Devis ID: <span style={{ color: '#cbd5e1' }}>{(viewingQuote.quote_id || viewingQuote.id)?.slice(0, 8)}</span></div>
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
                                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Notes Administrateur</div>
                                        <p style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{viewingQuote.admin_notes}</p>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button onClick={() => handleDownload(viewingQuote.quote_id || viewingQuote.id)} className="btn btn-primary" style={{ flex: 1 }}>
                                        <Download size={16} style={{ marginRight: '0.5rem' }} /> Télécharger PDF
                                    </button>
                                    <button onClick={() => setViewingQuote(null)} className="btn btn-outline" style={{ flex: 1 }}>
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

export default UserDashboard;
