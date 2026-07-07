import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  isFirebaseConfigured 
} from '../utils/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  AlertTriangle,
  Dumbbell,
  Check,
  Sparkles,
  Flame,
  Scale,
  X
} from 'lucide-react';
import './Styles/auth.css';

interface AuthProps {
  onLoginSuccess: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lida com login clássico E-mail / Senha
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    if (!isFirebaseConfigured) {
      // Login simulado local caso Firebase esteja desconfigurado
      setTimeout(() => {
        setIsLoading(false);
        setIsModalOpen(false);
        onLoginSuccess({
          uid: 'local-demo-user',
          email: email || 'demo@vida.saudavel',
          displayName: 'Atleta Local',
          isDemo: true
        });
      }, 1000);
      return;
    }

    try {
      if (isLogin) {
        // Realizar Login
        const credentials = await signInWithEmailAndPassword(auth!, email, password);
        onLoginSuccess(credentials.user);
      } else {
        // Realizar Cadastro
        const credentials = await createUserWithEmailAndPassword(auth!, email, password);
        onLoginSuccess(credentials.user);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      let translatedError = 'Falha ao autenticar. Verifique seus dados.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        translatedError = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/email-already-in-use') {
        translatedError = 'Este e-mail já está sendo utilizado.';
      } else if (error.code === 'auth/weak-password') {
        translatedError = 'A senha deve conter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        translatedError = 'Formato de e-mail inválido.';
      }
      setErrorMsg(translatedError);
    } finally {
      setIsLoading(false);
    }
  };

  // Lida com Login do Google
  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    if (!isFirebaseConfigured) {
      // Login do Google simulado local
      setTimeout(() => {
        setIsLoading(false);
        setIsModalOpen(false);
        onLoginSuccess({
          uid: 'local-google-user',
          email: 'google.demo@vida.saudavel',
          displayName: 'Atleta Google Demo',
          isDemo: true
        });
      }, 1000);
      return;
    }

    try {
      const credentials = await signInWithPopup(auth!, googleProvider);
      onLoginSuccess(credentials.user);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Erro no Login do Google:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Falha ao autenticar com o Google: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openAuthModal = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  return (
    <div className="landing-layout">
      {/* 1. Header/Navbar */}
      <header className="landing-navbar">
        <div className="navbar-logo">
          <div className="logo-icon-wrapper">
            <Dumbbell className="logo-icon" size={22} />
          </div>
          <span className="logo-text">Vida Saudável</span>
        </div>
        <nav className="navbar-menu">
          <a href="#solucao">Solução</a>
          <a href="#mecanismo">Recursos</a>
          <a href="#resultados">Evolução</a>
        </nav>
        <div className="navbar-actions">
          <button className="nav-btn-link" onClick={() => openAuthModal(true)}>Entrar</button>
          <button className="nav-btn-primary" onClick={() => openAuthModal(false)}>Começar grátis</button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero" id="solucao">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot">●</span>
              <span>100% Gratuito & Código Aberto</span>
            </div>
            
            <h1 className="hero-title">
              A forma mais simples de gerenciar seus <br />
              <span className="text-gradient">Treinos e Corridas</span>
            </h1>
            
            <p className="hero-description">
              Uma única plataforma para planejar sua rotina de musculação, registrar corridas de rua, catalogar medidas corporais e contar com um treinador de Inteligência Artificial. Sem planilhas confusas, sem anúncios irritantes.
            </p>
            
            <div className="hero-actions">
              <button className="hero-btn-primary" onClick={() => openAuthModal(false)}>
                Começar grátis
              </button>
              <a href="#mecanismo" className="hero-btn-secondary">
                Ver recursos
              </a>
            </div>
            
            <div className="hero-features">
              <div className="feature-item">
                <Check className="feature-check" size={16} />
                <span>Sem necessidade de cartão</span>
              </div>
              <div className="feature-item">
                <Check className="feature-check" size={16} />
                <span>Sincronização em nuvem segura</span>
              </div>
              <div className="feature-item">
                <Check className="feature-check" size={16} />
                <span>Interface limpa & premium</span>
              </div>
            </div>
          </div>

          {/* Seção Mockup de Celular com Balões de Status */}
          <div className="hero-visual">
            <div className="phone-mockup-wrapper">
              <div className="phone-mockup">
                <div className="phone-screen">
                  {/* Mini Simulador do App */}
                  <div className="mini-app-header">
                    <div className="mini-avatar">SA</div>
                    <div className="mini-greeting">
                      <div className="mini-name">Olá, Sergio!</div>
                      <div className="mini-xp">⚡ 4850 XP</div>
                    </div>
                  </div>
                  
                  <div className="mini-app-card blue">
                    <div className="mini-card-tag">HOJE • TREINO C</div>
                    <div className="mini-card-title">LEGS</div>
                    <div className="mini-card-desc">7 exercícios planejados</div>
                    <div className="mini-card-action">Iniciar treino →</div>
                  </div>

                  <div className="mini-app-card dark">
                    <div className="mini-card-title">Progresso Recente</div>
                    <div className="mini-weight-stat">
                      <span className="val">84 kg</span>
                      <span className="trend desc">-6kg</span>
                    </div>
                    {/* Linha de gráfico simples */}
                    <div className="mini-chart-svg">
                      <svg viewBox="0 0 100 30" width="100%" height="30">
                        <path d="M0,25 C20,10 40,30 60,15 C80,5 100,20 100,10" fill="none" stroke="var(--accent-purple)" strokeWidth="2" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balões flutuantes */}
              <div className="floating-card c1">
                <div className="floating-icon-box orange">
                  <Scale size={16} />
                </div>
                <div>
                  <div className="floating-val">84,0 kg</div>
                  <div className="floating-label">peso atualizado</div>
                </div>
              </div>

              <div className="floating-card c2">
                <div className="floating-icon-box green">
                  <Dumbbell size={16} />
                </div>
                <div>
                  <div className="floating-val">Treino Concluído</div>
                  <div className="floating-label">Peito & Ombros</div>
                </div>
              </div>

              <div className="floating-card c3">
                <div className="floating-icon-box blue">
                  <Flame size={16} />
                </div>
                <div>
                  <div className="floating-val">Pace 4.8 min/km</div>
                  <div className="floating-label">Corrida de 10km</div>
                </div>
              </div>

              <div className="floating-card c4">
                <div className="floating-icon-box purple">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="floating-val">Treinador IA</div>
                  <div className="floating-label">Dica gerada com sucesso</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção Evolução (Preview do Dashboard Financeiro/Corporativo) */}
      <section className="landing-evolution" id="resultados">
        <div className="evolution-container">
          <div className="evolution-header">
            <span className="section-subtitle">Acompanhamento Corporal</span>
            <h2 className="section-title">Comande sua evolução com dados de verdade</h2>
            <p className="section-desc">
              Visualize estatísticas, percentuais de gordura ideal, massa muscular e dados de ritmo de corrida. Sem achismo, tudo documentado para otimizar seus ganhos.
            </p>
          </div>
          
          <div className="dashboard-preview-card glass-card">
            <div className="preview-top">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span className="preview-title">Painel de Evolução • Vida Saudável</span>
            </div>
            
            <div className="preview-body">
              <div className="preview-stats-grid">
                <div className="preview-stat-box">
                  <div className="lbl">INICIAL</div>
                  <div className="val">90 kg</div>
                  <div className="trend red">Ponto de partida</div>
                </div>
                <div className="preview-stat-box">
                  <div className="lbl">ATUAL</div>
                  <div className="val">84 kg</div>
                  <div className="trend green">▼ 6kg perdidos</div>
                </div>
                <div className="preview-stat-box">
                  <div className="lbl">GORDURA CORPORAL</div>
                  <div className="val">3.9%</div>
                  <div className="trend purple">Estável / Atlética</div>
                </div>
              </div>
              
              <div className="preview-chart-area">
                <div className="chart-header-fake">
                  <span className="chart-name">Histórico de Peso (kg)</span>
                  <div className="chart-pills">
                    <span>7D</span>
                    <span>1M</span>
                    <span>3M</span>
                    <span className="active">Todos</span>
                  </div>
                </div>
                {/* Linha e Área do Gráfico simuladas */}
                <div className="fake-chart-container">
                  <svg viewBox="0 0 500 120" width="100%" height="100%" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Linhas de Grade horizontais */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#1f2232" strokeWidth="1" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2232" strokeWidth="1" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#1f2232" strokeWidth="1" />
                    
                    {/* Gráfico preenchido */}
                    <path d="M0,30 Q80,25 150,60 T300,50 T420,90 L500,80 L500,120 L0,120 Z" fill="url(#chartGrad)" />
                    {/* Linha do Gráfico */}
                    <path d="M0,30 Q80,25 150,60 T300,50 T420,90 L500,80" fill="none" stroke="#2563eb" strokeWidth="3" />
                    
                    {/* Bolinhas no Gráfico */}
                    <circle cx="150" cy="60" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="300" cy="50" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="420" cy="90" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="500" cy="80" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Modal Interativo de Autenticação */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="auth-modal-card glass-card">
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>

            {/* Banner de Demonstração Local (se Firebase não configurado) */}
            {!isFirebaseConfigured && (
              <div className="auth-demo-banner" style={{ textAlign: 'left', margin: '0 0 1rem 0' }}>
                <div style={{ display: 'flex', gap: '0.4rem', fontWeight: 'bold', marginBottom: '0.15rem', alignItems: 'center' }}>
                  <AlertTriangle size={14} />
                  Modo de Demonstração Local
                </div>
                Firebase desconfigurado. Clique em qualquer botão para logar na conta local de testes.
              </div>
            )}

            <header className="auth-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <h2>{isLogin ? 'Conectar ao Vida Saudável' : 'Criar sua conta grátis'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {isLogin 
                  ? 'Acesse para sincronizar seus treinos e bioimpedância' 
                  : 'Inscreva-se em segundos para salvar suas estatísticas'
                }
              </p>
            </header>

            {errorMsg && (
              <div style={{ color: '#ff4a4a', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255, 74, 74, 0.08)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255, 74, 74, 0.2)', marginBottom: '1.25rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="email" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: '36px', width: '100%', height: '42px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    placeholder="exemplo@atleta.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="password" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    style={{ paddingLeft: '36px', width: '100%', height: '42px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '46px', fontWeight: 600 }} disabled={isLoading}>
                {isLoading ? (
                  <span className="typing-dot" style={{ width: 6, height: 6, margin: '0 2px' }}></span>
                ) : isLogin ? (
                  <>
                    <LogIn size={16} />
                    Fazer Login
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Cadastrar
                  </>
                )}
              </button>
            </form>

            <div className="auth-divider">ou continue com</div>

            {/* Login Google */}
            <button type="button" onClick={handleGoogleAuth} className="btn btn-google" style={{ width: '100%', height: '46px', background: '#fff', color: '#11131a', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }} disabled={isLoading}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.87 2.69-6.57zm-8.64 8.8c2.43 0 4.47-.8 5.96-2.2l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.92v2.32c1.48 2.94 4.53 4.96 8.08 4.96z" fill="#4285F4"/>
                <path d="M3.95 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.96H.92C.33 6.14 0 7.48 0 9s.33 2.86.92 4.04l3.03-2.32z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0 5.45 0 2.4 2.02.92 4.96l3.03 2.32c.71-2.13 2.7-3.7 5.05-3.7z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="auth-toggle-link" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isLogin ? 'Novo no Vida Saudável?' : 'Já tem cadastro?'}
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', marginLeft: '0.35rem' }}
              >
                {isLogin ? 'Crie uma conta' : 'Fazer Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
