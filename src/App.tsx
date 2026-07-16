import React, { useState, useEffect, Component } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Workouts } from './components/Workouts';
import { RunTracker } from './components/RunTracker';
import { Diet } from './components/Diet';
import { CalendarView } from './components/CalendarView';
import { AICoach } from './components/AICoach';
import { AIAnalyzer } from './components/AIAnalyzer';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { Achievements } from './components/Achievements';
import { auth as firebaseAuth, isFirebaseConfigured } from './utils/firebase';
import { subscribeToUserFirestore } from './utils/db';
import { type Unsubscribe } from 'firebase/firestore';

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AppErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', color: '#ff6b6b', textAlign: 'left', background: 'rgba(255, 0, 0, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 0, 0, 0.15)', margin: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>⚠️ Falha Crítica no Componente de Treinos</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Ocorreu um erro inesperado ao carregar as informações desta aba. Por favor, compartilhe o erro abaixo com o suporte:
          </p>
          <pre style={{ background: '#12141c', padding: '1.5rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', color: '#fca5a5', border: '1px solid #1f2232' }}>
            {this.state.error?.toString()}
            {"\n\nStack Trace:\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isFirebaseConfigured);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'achievement' | 'overload' } | null>(null);

  // Escuta eventos globais de conquistas e sobrecarga progressiva
  useEffect(() => {
    let timeoutId: any = null;

    const handleAchievement = (e: Event) => {
      const ach = (e as CustomEvent).detail;
      setToastMessage({
        title: `🏆 Conquista Desbloqueada!`,
        desc: `Você desbloqueou: "${ach.title}" - ${ach.description}`,
        type: 'achievement'
      });

      // Dispara confetes comemorativos
      import('canvas-confetti').then((confettiModule) => {
        confettiModule.default({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.35 }
        });
      });

      // Auto dismiss após 6 segundos
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setToastMessage(null), 6000);
    };

    const handleOverload = (e: Event) => {
      const overload = (e as CustomEvent).detail;
      setToastMessage({
        title: `⚡ Sobrecarga Progressiva!`,
        desc: `Carga de "${overload.exerciseName}" atualizada automaticamente de ${overload.oldWeight}kg para ${overload.newWeight}kg para a próxima semana!`,
        type: 'overload'
      });

      // Dispara confetes de sucesso
      import('canvas-confetti').then((confettiModule) => {
        confettiModule.default({
          particleCount: 90,
          colors: ['#ffd700', '#ffae42', '#3b82f6', '#10b981']
        });
      });

      // Auto dismiss após 6 segundos
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setToastMessage(null), 6000);
    };

    window.addEventListener('vs_achievement_unlocked', handleAchievement);
    window.addEventListener('vs_progressive_overload_applied', handleOverload);

    return () => {
      window.removeEventListener('vs_achievement_unlocked', handleAchievement);
      window.removeEventListener('vs_progressive_overload_applied', handleOverload);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Escuta autenticação do Firebase no boot
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribeAuth = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Escuta e sincroniza dados do Firestore em tempo real quando logado
  useEffect(() => {
    if (!currentUser || currentUser.isDemo) return;

    // Subscreve às coleções do usuário logado
    const unsubscribes: Unsubscribe[] = subscribeToUserFirestore(currentUser.uid);

    // Limpa inscrições ao deslogar ou mudar usuário
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [currentUser]);

  // Escuta evento global de atualização do banco local de outros componentes
  const [dbVer, setDbVer] = useState(0);
  useEffect(() => {
    const handleDbUpdate = () => {
      setDbVer(prev => prev + 1);
    };
    window.addEventListener('vs_database_update', handleDbUpdate);
    return () => window.removeEventListener('vs_database_update', handleDbUpdate);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      if (isFirebaseConfigured && firebaseAuth) {
        await firebaseAuth.signOut();
      }
      setCurrentUser(null);
      localStorage.clear(); // Limpa cache local ao deslogar por segurança
      window.location.reload();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} key={dbVer} />;
      case 'workouts':
        return (
          <AppErrorBoundary>
            <Workouts key={dbVer} />
          </AppErrorBoundary>
        );
      case 'runtracker':
        return <RunTracker key={dbVer} />;
      case 'diet':
        return <Diet key={dbVer} />;
      case 'calendar':
        return <CalendarView key={dbVer} />;
      case 'aicoach':
        return <AICoach />;
      case 'aianalyzer':
        return <AIAnalyzer key={dbVer} />;
      case 'achievements':
        return <Achievements />;
      case 'settings':
        return <Settings key={dbVer} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} key={dbVer} />;
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-primary)' }}>
        <div className="typing-indicator" style={{ background: 'transparent', border: 'none' }}>
          <span className="typing-dot" style={{ width: 12, height: 12, backgroundColor: 'var(--accent-purple)' }}></span>
          <span className="typing-dot" style={{ width: 12, height: 12, backgroundColor: 'var(--accent-blue)' }}></span>
          <span className="typing-dot" style={{ width: 12, height: 12, backgroundColor: 'var(--accent-emerald)' }}></span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Carregando sessão segura...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-container">
      {/* Barra lateral / Menu principal */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={currentUser}
        onLogout={handleLogout}
      />
      
      {/* Conteúdo dinâmico à direita */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Pop-up de Notificação Premium (Toasts) */}
      {toastMessage && (
        <div className="premium-toast" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toastMessage.type === 'achievement' ? 'linear-gradient(135deg, #7c3aed, #4c1d95)' : 'linear-gradient(135deg, #059669, #064e3b)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '1.1rem 1.35rem',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
          maxWidth: '360px',
          backdropFilter: 'blur(8px)',
          animation: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          textAlign: 'left',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'var(--font-heading)' }}>{toastMessage.title}</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', opacity: 0.9, lineHeight: 1.4 }}>{toastMessage.desc}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '1.2rem', 
              opacity: 0.6, 
              padding: 0,
              lineHeight: 1,
              marginTop: '-2px'
            }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
