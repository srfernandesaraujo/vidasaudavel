import React, { useState } from 'react';
import { db, type UserSettings } from '../utils/db';
import { Settings as SettingsIcon, Save, Key, ShieldAlert, Sparkles } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(db.getSettings());
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveSettings(settings);
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
                <strong>Segurança de Dados:</strong> Sua chave de API é salva estritamente no seu computador local (`localStorage`) e as conexões com as APIs do Gemini ou OpenAI são executadas diretamente do seu navegador. Nenhum servidor intermediário retém seus dados.
              </span>
            </div>
          )}
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
