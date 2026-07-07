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
  AlertTriangle 
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
    } catch (error: any) {
      console.error('Erro no Login do Google:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Falha ao autenticar com o Google: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-card">
        {/* Banner de Demonstração Local (se Firebase não configurado) */}
        {!isFirebaseConfigured && (
          <div className="auth-demo-banner">
            <div style={{ display: 'flex', gap: '0.4rem', fontWeight: 'bold', marginBottom: '0.15rem', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={14} />
              Demonstração Local Offline
            </div>
            O Firebase está desconfigurado no arquivo <code>.env.local</code>. Clique em qualquer botão para entrar no modo de testes local.
          </div>
        )}

        <header className="auth-header">
          <h2>{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
          <p>
            {isLogin 
              ? 'Conecte-se para salvar seus treinos e corridas na nuvem' 
              : 'Registre seus dados e comece sua jornada saudável'
            }
          </p>
        </header>

        {errorMsg && (
          <div style={{ color: 'var(--accent-orange)', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255, 107, 74, 0.08)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255, 107, 74, 0.2)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                className="form-control"
                style={{ paddingLeft: '36px', width: '100%' }}
                placeholder="atleta@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                className="form-control"
                style={{ paddingLeft: '36px', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '46px' }} disabled={isLoading}>
            {isLoading ? (
              <span className="typing-dot" style={{ width: 6, height: 6, margin: '0 2px' }}></span>
            ) : isLogin ? (
              <>
                <LogIn size={16} />
                Entrar
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Registrar
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">Ou entre com</div>

        {/* Botão de Login do Google */}
        <button type="button" onClick={handleGoogleAuth} className="btn btn-google" style={{ width: '100%', height: '46px' }} disabled={isLoading}>
          {/* Ícone vetorizado do Google */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.87 2.69-6.57zm-8.64 8.8c2.43 0 4.47-.8 5.96-2.2l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.58-5.05-3.71H.92v2.32c1.48 2.94 4.53 4.96 8.08 4.96z" fill="#4285F4"/>
            <path d="M3.95 10.72c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.96H.92C.33 6.14 0 7.48 0 9s.33 2.86.92 4.04l3.03-2.32z" fill="#FBBC05"/>
            <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0 5.45 0 2.4 2.02.92 4.96l3.03 2.32c.71-2.13 2.7-3.7 5.05-3.7z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="auth-toggle-link">
          {isLogin ? 'Não tem uma conta?' : 'Já possui cadastro?'}
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};
