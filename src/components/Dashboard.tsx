import React, { useMemo } from 'react';
import { db } from '../utils/db';
import { 
  Dumbbell, 
  Footprints, 
  TrendingDown, 
  Calendar, 
  ChevronRight, 
  Bot, 
  HeartPulse 
} from 'lucide-react';
import './Styles/dashboard.css';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const settings = db.getSettings();
  const workoutLogs = db.getWorkoutLogs();
  const runLogs = db.getRunLogs();
  const bodyCompLogs = db.getBodyCompLogs();
  const races = db.getRaces();

  // Cálculos de Resumo
  const lastWorkout = useMemo(() => {
    if (workoutLogs.length === 0) return null;
    const last = workoutLogs[0];
    const diffTime = Math.abs(new Date().getTime() - new Date(last.date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
    return {
      name: last.workoutName,
      date: last.date.split('-').reverse().join('/'),
      days: diffDays
    };
  }, [workoutLogs]);

  const lastRun = useMemo(() => {
    if (runLogs.length === 0) return null;
    return runLogs[0];
  }, [runLogs]);

  const latestBody = useMemo(() => {
    if (bodyCompLogs.length === 0) return null;
    return bodyCompLogs[bodyCompLogs.length - 1];
  }, [bodyCompLogs]);

  const nextRace = useMemo(() => {
    const registeredRaces = races.filter(r => r.isRegistered);
    if (registeredRaces.length === 0) return null;
    
    // Filtra corridas futuras
    const nowTime = new Date().getTime();
    const upcoming = registeredRaces.filter(r => new Date(r.date).getTime() >= nowTime);
    
    if (upcoming.length === 0) return null;
    // Ordena por data mais próxima
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0];
  }, [races]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header className="dashboard-header">
        <h1>Olá, {settings.userName}!</h1>
        <p>Aqui está o resumo das suas atividades e composição corporal para hoje.</p>
      </header>

      {/* Grid de Estatísticas Rápidas */}
      <section className="stats-grid">
        {/* Musculação */}
        <div className="glass-card stat-card stat-green">
          <div className="stat-top">
            <span>Último Treino</span>
            <Dumbbell className="stat-icon" size={18} color="var(--accent-emerald)" />
          </div>
          {lastWorkout ? (
            <div>
              <div className="stat-value">{lastWorkout.name}</div>
              <div className="stat-desc">Realizado em {lastWorkout.date} ({lastWorkout.days} dias atrás)</div>
            </div>
          ) : (
            <div>
              <div className="stat-value">Sem Treinos</div>
              <div className="stat-desc">Nenhum treino no histórico.</div>
            </div>
          )}
        </div>

        {/* Corrida */}
        <div className="glass-card stat-card stat-blue">
          <div className="stat-top">
            <span>Última Corrida</span>
            <Footprints className="stat-icon" size={18} color="var(--accent-blue)" />
          </div>
          {lastRun ? (
            <div>
              <div className="stat-value">{lastRun.distance} km</div>
              <div className="stat-desc">Pace de {lastRun.pace} min/km em {lastRun.date.split('-').reverse().join('/')}</div>
            </div>
          ) : (
            <div>
              <div className="stat-value">Sem Registros</div>
              <div className="stat-desc">Nenhuma corrida registrada.</div>
            </div>
          )}
        </div>

        {/* Composição Corporal */}
        <div className="glass-card stat-card stat-purple">
          <div className="stat-top">
            <span>Peso & Gordura</span>
            <TrendingDown className="stat-icon" size={18} color="var(--accent-purple)" />
          </div>
          {latestBody ? (
            <div>
              <div className="stat-value">{latestBody.weight} kg</div>
              <div className="stat-desc">{latestBody.bodyFat}% de gordura (Meta: {latestBody.bodyFatGoal}%)</div>
            </div>
          ) : (
            <div>
              <div className="stat-value">Sem Biometria</div>
              <div className="stat-desc">Cadastre dados corporais.</div>
            </div>
          )}
        </div>

        {/* Próxima Corrida */}
        <div className="glass-card stat-card stat-orange">
          <div className="stat-top">
            <span>Próxima Corrida</span>
            <Calendar className="stat-icon" size={18} color="var(--accent-orange)" />
          </div>
          {nextRace ? (
            <div>
              <div className="stat-value" style={{ fontSize: '1.25rem', padding: '0.4rem 0' }}>
                {nextRace.name.length > 25 ? nextRace.name.substring(0, 25) + '...' : nextRace.name}
              </div>
              <div className="stat-desc">{nextRace.distance} em {nextRace.date.split('-').reverse().join('/')}</div>
            </div>
          ) : (
            <div>
              <div className="stat-value" style={{ fontSize: '1.25rem', padding: '0.4rem 0' }}>Nenhuma Prova</div>
              <div className="stat-desc">Inscreva-se em corridas na aba.</div>
            </div>
          )}
        </div>
      </section>

      {/* Linha Inferior: Painel de Progresso & Ações Rápidas */}
      <div className="dashboard-row">
        {/* Metas Corporais Atuais */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="dashboard-panel-title">
            <TrendingDown size={20} color="var(--accent-purple)" />
            Progresso de Metas Recentes
          </h2>
          
          {latestBody ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
              <div>
                <div className="flex-between" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <span>Controle de Peso</span>
                  <span style={{ fontWeight: 600 }}>{latestBody.weight}kg / {latestBody.idealWeight}kg (Ideal)</span>
                </div>
                <div className="progress-bar-container">
                  {/* Calcula progresso. Se peso atual é maior que ideal, mostra a proporção. */}
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, (latestBody.idealWeight / latestBody.weight) * 100)}%`,
                      backgroundColor: 'var(--accent-purple)' 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <span>Percentual de Gordura</span>
                  <span style={{ fontWeight: 600 }}>{latestBody.bodyFat}% / {latestBody.bodyFatGoal}% (Meta)</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, (latestBody.bodyFatGoal / latestBody.bodyFat) * 100)}%`,
                      backgroundColor: 'var(--accent-blue)' 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <span>Massa Muscular</span>
                  <span style={{ fontWeight: 600 }}>{latestBody.muscleMass}kg / {latestBody.muscleMassGoal}kg (Meta)</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, (latestBody.muscleMass / latestBody.muscleMassGoal) * 100)}%`,
                      backgroundColor: 'var(--accent-emerald)' 
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 0', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Nenhum dado de bioimpedância cadastrado ainda. Vá na aba **Corrida & Corpo** e registre sua composição corporal!
            </div>
          )}
        </div>

        {/* Ações Rápidas */}
        <div className="glass-card">
          <h2 className="dashboard-panel-title">Ações Rápidas</h2>
          <div className="quick-action-list">
            <button className="quick-action-item" onClick={() => setActiveTab('workouts')}>
              <div className="quick-action-info">
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px' }}>
                  <Dumbbell size={18} color="var(--accent-emerald)" />
                </div>
                <div>
                  <div className="quick-action-title">Lançar Treino Executado</div>
                  <div className="quick-action-subtitle">Registrar série muscular concluída</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>

            <button className="quick-action-item" onClick={() => setActiveTab('runtracker')}>
              <div className="quick-action-info">
                <div style={{ background: 'rgba(0, 229, 255, 0.15)', padding: '8px', borderRadius: '8px' }}>
                  <Footprints size={18} color="var(--accent-blue)" />
                </div>
                <div>
                  <div className="quick-action-title">Registrar Corrida / Biometria</div>
                  <div className="quick-action-subtitle">Gravar progresso aeróbico e corporal</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>

            <button className="quick-action-item" onClick={() => setActiveTab('aicoach')}>
              <div className="quick-action-info">
                <div style={{ background: 'rgba(138, 43, 226, 0.15)', padding: '8px', borderRadius: '8px' }}>
                  <Bot size={18} color="var(--accent-purple)" />
                </div>
                <div>
                  <div className="quick-action-title">Falar com o Treinador IA</div>
                  <div className="quick-action-subtitle">Dúvidas, treinos e orientações</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>

            <button className="quick-action-item" onClick={() => setActiveTab('aianalyzer')}>
              <div className="quick-action-info">
                <div style={{ background: 'rgba(255, 107, 74, 0.15)', padding: '8px', borderRadius: '8px' }}>
                  <HeartPulse size={18} color="var(--accent-orange)" />
                </div>
                <div>
                  <div className="quick-action-title">Análise de Saúde IA</div>
                  <div className="quick-action-subtitle">Verificar riscos e exames sugeridos</div>
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
