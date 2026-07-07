import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Workouts } from './components/Workouts';
import { RunTracker } from './components/RunTracker';
import { CalendarView } from './components/CalendarView';
import { AICoach } from './components/AICoach';
import { AIAnalyzer } from './components/AIAnalyzer';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { auth as firebaseAuth, isFirebaseConfigured } from './utils/firebase';
import { subscribeToUserFirestore } from './utils/db';
import { type Unsubscribe } from 'firebase/firestore';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isFirebaseConfigured);

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
        return <Workouts key={dbVer} />;
      case 'runtracker':
        return <RunTracker key={dbVer} />;
      case 'calendar':
        return <CalendarView key={dbVer} />;
      case 'aicoach':
        return <AICoach />;
      case 'aianalyzer':
        return <AIAnalyzer key={dbVer} />;
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
    </div>
  );
}

export default App;
