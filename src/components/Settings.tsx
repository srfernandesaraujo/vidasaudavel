import React, { useState } from 'react';
import { db, type UserSettings } from '../utils/db';
import { Settings as SettingsIcon, Save, Key, ShieldAlert, Sparkles, Mail } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../utils/firebase';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(db.getSettings());
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSettings(settings);

    try {
      const uid = auth?.currentUser?.uid;
      if (uid && firestore) {
        const regDocRef = doc(firestore, 'registered_daily_emails', uid);
        await setDoc(regDocRef, {
          uid,
          email: settings.emailForList || '',
          resendApiKey: settings.resendApiKey || '',
          resendFromEmail: settings.resendFromEmail || '',
          dailyEmailTime: settings.dailyDietEmailTime || '06:00',
          dailyEmailEnabled: !!settings.dailyDietEmailEnabled,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
          lastSentDate: ''
        }, { merge: true });
      }
    } catch (syncErr) {
      console.warn('Erro ao salvar agendamento de email no Firestore:', syncErr);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleClearData = () => {
    if (window.confirm('Atenção: Isso irá apagar todo o histórico de treinos, corridas e biometria salvos no seu computador. Deseja redefinir os dados para o padrão?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '650px', textAlign: 'left' }}>
      <header>
        <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={28} color="var(--accent-purple)" />
          Configurações do Sistema
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Ajuste seus dados biométricos básicos e conecte suas chaves de inteligência artificial.</p>
      </header>

      <form onSubmit={handleSave} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
        {/* Dados Básicos */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent-emerald)" />
            Perfil & Biometria
          </h3>

          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="setUserName">Nome Completo / Apelido</label>
              <input
                id="setUserName"
                type="text"
                className="form-control"
                value={settings.userName}
                onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="setHeight">Altura (cm) - Para cálculo de IMC</label>
              <input
                id="setHeight"
                type="number"
                min="50"
                max="250"
                className="form-control"
                value={settings.height}
                onChange={(e) => setSettings({ ...settings, height: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid-cols-2" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="setAge">Idade (anos) - Para zonas cardíacas</label>
              <input
                id="setAge"
                type="number"
                min="1"
                max="120"
                className="form-control"
                value={settings.age || 30}
                onChange={(e) => setSettings({ ...settings, age: Number(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="setRHR">FC em Repouso (bpm) - Fórmula Karvonen</label>
              <input
                id="setRHR"
                type="number"
                min="30"
                max="120"
                className="form-control"
                value={settings.restingHeartRate || 60}
                onChange={(e) => setSettings({ ...settings, restingHeartRate: Number(e.target.value) })}
                required
              />
            </div>
          </div>
        </div>

        {/* Integração de IA */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem' }}>
            <Key size={16} color="var(--accent-blue)" />
            Chave de API de Inteligência Artificial
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Por padrão, o Treinador IA e o Analisador utilizam uma simulação inteligente local offline. Ao cadastrar sua própria chave de API abaixo, o chat passará a funcionar com inteligência artificial real respondendo com base em todo o seu histórico.
          </p>

          <div className="grid-cols-2" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="setProvider">Provedor de IA</label>
              <select
                id="setProvider"
                className="form-control"
                value={settings.apiProvider}
                onChange={(e) => setSettings({ ...settings, apiProvider: e.target.value as any })}
              >
                <option value="none">Simulador Local (Sem custo / Offline)</option>
                <option value="gemini">Google Gemini API (Modelo 2.5 Flash)</option>
                <option value="openai">OpenAI ChatGPT API (Modelo GPT-4o Mini)</option>
              </select>
            </div>

            {settings.apiProvider !== 'none' && (
              <div className="form-group">
                <label htmlFor="setApiKey">Chave de API (Secret Key)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="setApiKey"
                    type={showKey ? 'text' : 'password'}
                    className="form-control"
                    style={{ flex: 1 }}
                    placeholder={settings.apiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? 'Ocultar' : 'Exibir'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {settings.apiProvider !== 'none' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.15)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#88eaff' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ textAlign: 'left' }}>
                <strong>Sincronização & Portabilidade:</strong> Sua chave de API é salva de forma criptografada na sua conta de banco de dados na nuvem (Firestore) e no seu dispositivo local. Desta forma, ao fazer login em outros dispositivos ou no trabalho, as configurações da IA e chave serão carregadas automaticamente, com requisições diretas de IA a partir de seu navegador sem intermediários.
              </span>
            </div>
          )}
        </div>

        {/* Configurações de Envio da Lista de Compras */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem' }}>
            <Key size={16} color="var(--accent-orange)" />
            Envio Automático de Lista de Compras
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Configure seu e-mail de destino, remetente verificado e a chave da API do Resend para habilitar o envio automático da lista de compras gerada a partir do seu cardápio de refeições semanal (toda sexta-feira às 18:00h).
          </p>

          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="setEmailForList">E-mail de Destino (Para quem enviar)</label>
              <input
                id="setEmailForList"
                type="email"
                className="form-control"
                placeholder="exemplo@email.com"
                value={settings.emailForList || ''}
                onChange={(e) => setSettings({ ...settings, emailForList: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="setResendFromEmail">E-mail de Origem (Remetente do Resend)</label>
              <input
                id="setResendFromEmail"
                type="email"
                className="form-control"
                placeholder="ex: compras@seudominio.com ou onboarding@resend.dev"
                value={settings.resendFromEmail || ''}
                onChange={(e) => setSettings({ ...settings, resendFromEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="setResendApiKey">Chave de API do Resend (re_...)</label>
            <input
              id="setResendApiKey"
              type="password"
              className="form-control"
              placeholder="Chave secreta para envio automático"
              value={settings.resendApiKey || ''}
              onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
            />
          </div>
        </div>

        {/* Email Diário do Cardápio Semanal */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem' }}>
            <Mail size={16} color="var(--accent-blue)" />
            Envio Diário do Cardápio por E-mail
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Receba todas as manhãs um e-mail com as suas refeições planejadas para o dia, incluindo lista de ingredientes e modo de preparo de receitas.
          </p>

          <div className="grid-cols-2">
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px', marginTop: '1.5rem' }}>
              <input
                id="setDailyEmailEnabled"
                type="checkbox"
                checked={!!settings.dailyDietEmailEnabled}
                onChange={(e) => setSettings({ ...settings, dailyDietEmailEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="setDailyEmailEnabled" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 600 }}>Ativar E-mail Diário do Cardápio</label>
            </div>

            <div className="form-group">
              <label htmlFor="setDailyEmailTime">Horário de Envio (Fuso Horário Local)</label>
              <input
                id="setDailyEmailTime"
                type="time"
                className="form-control"
                value={settings.dailyDietEmailTime || '06:00'}
                onChange={(e) => setSettings({ ...settings, dailyDietEmailTime: e.target.value })}
                disabled={!settings.dailyDietEmailEnabled}
              />
            </div>
          </div>
        </div>

        {/* Configurações de Nutrição Avançada */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.5rem' }}>
            <Sparkles size={16} color="var(--accent-emerald)" />
            Nutrição Inteligente & Integração de Treinos
          </h3>
          
          <div className="grid-cols-2">
            <div className="form-group">
              <label htmlFor="setTdeeMode">Cálculo de Gasto Energético (TDEE)</label>
              <select
                id="setTdeeMode"
                className="form-control"
                value={settings.tdeeMode || 'auto'}
                onChange={(e) => setSettings({ ...settings, tdeeMode: e.target.value as 'none' | 'auto' })}
              >
                <option value="auto">Adaptativo (Soma Musculação/Corrida do dia)</option>
                <option value="none">Estático (Apenas Taxa Metabólica Basal)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="setCarbCyclingMode">Ciclo de Carboidratos (Carb Cycling)</label>
              <select
                id="setCarbCyclingMode"
                className="form-control"
                value={settings.carbCyclingMode || 'auto'}
                onChange={(e) => setSettings({ ...settings, carbCyclingMode: e.target.value as 'none' | 'auto' })}
              >
                <option value="auto">Automatizado (Ajusta macros pelo treino do dia)</option>
                <option value="none">Desativado (Macros lineares fixos todos os dias)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rodapé e Salvar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary" style={{ color: '#ff6b6b' }} onClick={handleClearData}>
            Limpar Todos os Dados
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {saveSuccess && (
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Configurações salvas!
              </span>
            )}
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Salvar Ajustes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default Settings;
