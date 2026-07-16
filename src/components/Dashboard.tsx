import React, { useMemo, useState } from 'react';
import { db } from '../utils/db';
import { askAICoach, type ChatMessage } from '../utils/aiEngine';
import { 
  Dumbbell, 
  Footprints, 
  TrendingDown, 
  ChevronRight, 
  Bot, 
  HeartPulse,
  Droplet,
  Apple,
  Sparkles,
  Scale,
  Send,
  Trophy
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
  const workouts = db.getWorkouts();
  const exercises = db.getExercises();

  // 1RM / Recordes de força
  const topExercisesPr = useMemo(() => {
    const safeExs = Array.isArray(exercises) ? exercises : [];
    return [...safeExs]
      .filter(ex => ex && ex.prWeight > 0)
      .sort((a, b) => b.prWeight - a.prWeight)
      .slice(0, 3);
  }, [exercises]);

  const getEstimated1RM = (weight: number, repetitionsStr: string) => {
    const reps = parseInt(repetitionsStr) || 10;
    return Math.round(weight * (1 + reps / 30));
  };

  // Treinador IA
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Olá, **${settings.userName}**! Sou o seu Treinador Particular de IA. Analisei seu histórico recente. Como posso ajudar com sua musculação ou corrida hoje?`
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    
    // Adiciona mensagem do usuário
    const updatedMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(updatedMessages);
    setIsTyping(true);

    try {
      // Chama o coach de IA
      const response = await askAICoach(userMsg, chatMessages);
      setChatMessages([...updatedMessages, { role: 'assistant' as const, content: response }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...updatedMessages, { role: 'assistant' as const, content: 'Desculpe, encontrei um erro ao processar sua resposta. Tente novamente em breve.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 1. Cálculo de XP Real
  const totalXP = useMemo(() => {
    const workoutXP = workoutLogs.length * 150;
    const runXP = runLogs.length * 500;
    const raceXP = races.filter(r => r.isRegistered).length * 1000;
    return 1500 + workoutXP + runXP + raceXP; // Base de 1500 XP
  }, [workoutLogs, runLogs, races]);

  // 2. Cálculo de Sequência (Streak) de Dias Consecutivos Ativos
  const streakInfo = useMemo(() => {
    if (workoutLogs.length === 0 && runLogs.length === 0) {
      return { current: 0, record: 5 };
    }

    // Une todas as datas de logs (Musculação + Corrida)
    const dates = new Set<string>();
    workoutLogs.forEach(l => dates.add(l.date));
    runLogs.forEach(l => dates.add(l.date));


    let currentStreak = 0;
    let recordStreak = 5; // Recorde padrão de teste
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Verifica se treinou hoje ou ontem para começar a contar
    let hasActivityRecently = dates.has(todayStr) || dates.has(yesterdayStr);
    
    if (hasActivityRecently) {
      let checkDate = new Date();
      // Se não treinou hoje mas treinou ontem, começa de ontem
      if (!dates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dates.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calcula maior sequência histórica (simplificado)
    let tempStreak = 0;
    const allDatesAsc = Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let prevDate: Date | null = null;

    allDatesAsc.forEach(dateStr => {
      const currentDate = new Date(dateStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > recordStreak) {
            recordStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      prevDate = currentDate;
    });

    if (tempStreak > recordStreak) {
      recordStreak = tempStreak;
    }

    return {
      current: currentStreak,
      record: Math.max(recordStreak, currentStreak, 6)
    };
  }, [workoutLogs, runLogs]);

  // 3. Dias da Semana para o Calendário (Dom a Sáb da semana atual)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Dom, 1 = Seg, ...
    
    const days = [];
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // Obtém as datas de todos os logs da musculação e corrida para marcar com bolinhas
    const loggedDates = new Set<string>();
    workoutLogs.forEach(l => loggedDates.add(l.date));
    runLogs.forEach(l => loggedDates.add(l.date));

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - currentDay + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === currentDay;
      const hasLog = loggedDates.has(dateStr);

      days.push({
        name: names[i],
        dayNum: d.getDate(),
        isToday,
        hasLog,
        dateStr
      });
    }
    return days;
  }, [workoutLogs, runLogs]);

  // 4. Determina o Treino de Hoje baseado no Dia da Semana
  const todayWorkout = useMemo(() => {
    if (workouts.length === 0) return null;
    
    const dayOfWeek = new Date().getDay(); // 0 = Dom, 1 = Seg...
    
    // Se for Fim de Semana (Dom = 0, Sáb = 6), sugere descanso ou Treino C se houver
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (workouts.length > 2) {
        return {
          label: 'HOJE • TREINO EXTRA',
          name: workouts[2].name,
          id: workouts[2].id,
          exercisesCount: db.getExercises().filter(e => e.workoutId === workouts[2].id).length
        };
      }
      return null;
    }

    // Segunda (1) -> Treino A (index 0)
    // Terça (2) -> Treino B (index 1)
    // Quarta (3) -> Treino A (index 0)
    // Quinta (4) -> Treino B (index 1)
    // Sexta (5) -> Treino A (index 0)
    const idx = (dayOfWeek % 2 === 1) ? 0 : 1;
    const activeWorkout = workouts[idx] || workouts[0];
    
    const exercisesCount = db.getExercises().filter(e => e.workoutId === activeWorkout.id).length;

    return {
      label: `HOJE • TREINO ${activeWorkout.name.replace('Treino ', '')}`,
      name: activeWorkout.name,
      id: activeWorkout.id,
      exercisesCount
    };
  }, [workouts]);

  // 5. Estatísticas de Peso e Variação
  const weightStats = useMemo(() => {
    if (bodyCompLogs.length === 0) return null;
    const latest = bodyCompLogs[bodyCompLogs.length - 1];
    const first = bodyCompLogs[0];
    const diff = latest.weight - first.weight;
    
    let trend = 'Estável';
    if (diff < -0.5) trend = 'Descendo';
    else if (diff > 0.5) trend = 'Subindo';

    return {
      current: latest.weight,
      diff: diff.toFixed(1),
      trend,
      ideal: latest.idealWeight
    };
  }, [bodyCompLogs]);

  const bodyFatStats = useMemo(() => {
    if (bodyCompLogs.length === 0) return null;
    const latest = bodyCompLogs[bodyCompLogs.length - 1];
    
    return {
      current: latest.bodyFat,
      goal: latest.bodyFatGoal
    };
  }, [bodyCompLogs]);

  return (
    <div className="dashboard-container">
      {/* 1. Cabeçalho Azul Premium (Inspirado no Prime) */}
      <section className="dashboard-header-card">
        <div className="header-card-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="user-avatar-badge">
              {settings.userName.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div>
              <h1 className="header-greeting">Olá, {settings.userName}!</h1>
              <p className="header-subtitle">Pronto para mais um dia de evolução?</p>
            </div>
          </div>
          <div className="xp-pill">
            <Sparkles size={14} />
            <span>{totalXP} XP</span>
          </div>
        </div>

        <div className="header-card-row">
          {/* Caixa de Sequência */}
          <div className="streak-box">
            <div className="streak-value-wrapper">
              <span className="streak-fire-icon">🔥</span>
              <div className="streak-numbers">
                <div className="val">{streakInfo.current} {streakInfo.current === 1 ? 'dia' : 'dias'}</div>
                <div className="lbl">MELHOR SEQUÊNCIA</div>
              </div>
            </div>
            <div className="streak-record">Recorde atual: {streakInfo.record}</div>
          </div>

          {/* Quadro de trackings */}
          <div className="trackings-board">
            <div className="tracking-item">
              <Droplet size={14} className="icon-blue" />
              <span className="lbl">Água:</span>
              <span className="val">2.5L / dia</span>
            </div>
            <div className="tracking-item">
              <Apple size={14} className="icon-orange" />
              <span className="lbl">Dieta:</span>
              <span className="val">100% Saudável</span>
            </div>
            <div className="tracking-item">
              <Dumbbell size={14} className="icon-green" />
              <span className="lbl">Treinos:</span>
              <span className="val">{workoutLogs.length} concluídos</span>
            </div>
            <div className="tracking-item">
              <Footprints size={14} className="icon-purple" />
              <span className="lbl">Cardio:</span>
              <span className="val">{runLogs.length} corridas</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Calendário Semanal (Pills de Dias da Semana) */}
      <section className="weekly-calendar-bar glass-card">
        {weekDays.map((day, idx) => (
          <div 
            key={idx} 
            className={`calendar-day-pill ${day.isToday ? 'active' : ''}`}
            title={day.dateStr}
          >
            <span className="day-name">{day.name}</span>
            <span className="day-num">{day.dayNum}</span>
            {day.hasLog && <span className="day-dot"></span>}
          </div>
        ))}
      </section>

      {/* 3. Hoje / Treino Ativo de Hoje */}
      {todayWorkout ? (
        <section className="active-workout-section">
          <div className="active-workout-card" onClick={() => setActiveTab('workouts')}>
            <div className="workout-card-content">
              <span className="workout-card-label">{todayWorkout.label}</span>
              <h2 className="workout-card-title">{todayWorkout.name.toUpperCase()}</h2>
              <p className="workout-card-desc">{todayWorkout.exercisesCount} exercícios cadastrados para hoje</p>
            </div>
            <button className="workout-card-btn">
              <span>Ver treino</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      ) : (
        <section className="active-workout-section">
          <div className="active-workout-card rest-day" onClick={() => setActiveTab('workouts')}>
            <div className="workout-card-content">
              <span className="workout-card-label">HOJE • RECURSO</span>
              <h2 className="workout-card-title">DIA DE DESCANSO</h2>
              <p className="workout-card-desc">Aproveite para regenerar sua massa muscular e hidratar-se!</p>
            </div>
            <button className="workout-card-btn">
              <span>Ver ficha</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}

      {/* 4. Progresso Rápido de Biometria */}
      <section className="progress-section">
        <h3 className="section-title-small">Seu Progresso Recente</h3>
        <div className="progress-cards-grid">
          {/* Card Peso */}
          <div className="glass-card progress-mini-card" onClick={() => setActiveTab('runtracker')}>
            <div className="mini-card-top-icon">
              <Scale size={18} className="icon-blue" />
              <ChevronRight size={16} className="arrow-right-icon" />
            </div>
            {weightStats ? (
              <div className="mini-card-info-block">
                <div className="value-row">
                  <span className="val">{weightStats.current} <span className="unit">kg</span></span>
                  <span className={`trend-tag ${weightStats.trend === 'Descendo' ? 'green' : 'orange'}`}>
                    {weightStats.diff.startsWith('-') ? '' : '+'}{weightStats.diff}kg
                  </span>
                </div>
                <div className="desc-row">
                  <span>Peso corporal (Ideal: {weightStats.ideal}kg)</span>
                  <span className="trend-lbl">{weightStats.trend}</span>
                </div>
              </div>
            ) : (
              <div className="mini-card-info-block">
                <div className="value-row">Sem dados</div>
                <div className="desc-row">Registre sua biometria na aba Corrida & Corpo</div>
              </div>
            )}
          </div>

          {/* Card Gordura */}
          <div className="glass-card progress-mini-card" onClick={() => setActiveTab('runtracker')}>
            <div className="mini-card-top-icon">
              <TrendingDown size={18} className="icon-purple" />
              <ChevronRight size={16} className="arrow-right-icon" />
            </div>
            {bodyFatStats ? (
              <div className="mini-card-info-block">
                <div className="value-row">
                  <span className="val">{bodyFatStats.current} <span className="unit">%</span></span>
                  <span className="trend-tag purple">Estável</span>
                </div>
                <div className="desc-row">
                  <span>Gordura corporal (Meta: {bodyFatStats.goal}%)</span>
                  <span className="trend-lbl">Atlética</span>
                </div>
              </div>
            ) : (
              <div className="mini-card-info-block">
                <div className="value-row">Sem dados</div>
                <div className="desc-row">Registre sua biometria na aba Corrida & Corpo</div>
              </div>
            )}
          </div>

          {/* Card Recordes de Força (PR) */}
          <div className="glass-card progress-mini-card" onClick={() => setActiveTab('workouts')} style={{ minHeight: '120px' }}>
            <div className="mini-card-top-icon">
              <Dumbbell size={18} style={{ color: 'var(--accent-emerald)' }} />
              <ChevronRight size={16} className="arrow-right-icon" />
            </div>
            <div className="mini-card-info-block" style={{ gap: '0.4rem', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#e2e8f0', textAlign: 'left' }}>
                🏆 Recordes de Força & 1RM
              </div>
              
              {topExercisesPr.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                  {topExercisesPr.map((ex, idx) => {
                    const estimated1RM = getEstimated1RM(ex.prWeight, ex.repetitions);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }} title={ex.name}>
                          {ex.name}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{ex.prWeight}kg</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>1RM: {estimated1RM}kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', lineHeight: 1.3 }}>
                  Conclua treinos com peso para listar seus recordes de força.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 Treinador IA - Relatório e Chat Interativo (Novo) */}
      <section className="ai-coach-section glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div className="icon-wrapper purple-bg" style={{ width: 32, height: 32 }}>
            <Bot size={16} color="var(--accent-purple)" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>🤖 Treinador IA - Seu Personal Coach</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Orientação personalizada com base no seu histórico real</span>
          </div>
        </div>

        <div className="ai-coach-chat-area" style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: msg.role === 'user' ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid var(--border-subtle)',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              maxWidth: '85%',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              color: '#e2e8f0',
              textAlign: 'left'
            }}>
              {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#fff' }}>{part}</strong> : part)}
            </div>
          ))}
          {isTyping && (
            <div style={{ 
              alignSelf: 'flex-start',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              Digitando...
            </div>
          )}
        </div>

        <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="form-control" 
            style={{ flex: 1, height: '38px', fontSize: '0.8rem', padding: '0 0.85rem' }}
            placeholder="Pergunte ao seu treinador... (ex: 'como melhorar meu pace?')"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.85rem', height: '38px' }} disabled={isTyping}>
            <Send size={14} />
          </button>
        </form>
      </section>

      {/* 5. Ações Rápidas (Abaixo, Estilizado) */}
      <section className="quick-actions-section">
        <h3 className="section-title-small">Ações Rápidas</h3>
        <div className="quick-actions-grid">
          <button className="quick-btn glass-card" onClick={() => setActiveTab('workouts')}>
            <div className="icon-wrapper green-bg">
              <Dumbbell size={18} color="var(--accent-emerald)" />
            </div>
            <div className="text-wrapper">
              <span className="title">Lançar Treino Executado</span>
              <span className="subtitle">Registrar série muscular concluída</span>
            </div>
            <ChevronRight size={16} className="arrow" />
          </button>

          <button className="quick-btn glass-card" onClick={() => setActiveTab('runtracker')}>
            <div className="icon-wrapper blue-bg">
              <Footprints size={18} color="var(--accent-blue)" />
            </div>
            <div className="text-wrapper">
              <span className="title">Registrar Corrida / Biometria</span>
              <span className="subtitle">Gravar progresso aeróbico e corporal</span>
            </div>
            <ChevronRight size={16} className="arrow" />
          </button>

          <button className="quick-btn glass-card" onClick={() => setActiveTab('aicoach')}>
            <div className="icon-wrapper purple-bg">
              <Bot size={18} color="var(--accent-purple)" />
            </div>
            <div className="text-wrapper">
              <span className="title">Falar com o Treinador IA</span>
              <span className="subtitle">Dúvidas, treinos e orientações</span>
            </div>
            <ChevronRight size={16} className="arrow" />
          </button>

          <button className="quick-btn glass-card" onClick={() => setActiveTab('aianalyzer')}>
            <div className="icon-wrapper orange-bg">
              <HeartPulse size={18} color="var(--accent-orange)" />
            </div>
            <div className="text-wrapper">
              <span className="title">Análise de Saúde IA</span>
              <span className="subtitle">Verificar riscos e exames sugeridos</span>
            </div>
            <ChevronRight size={16} className="arrow" />
          </button>

          <button className="quick-btn glass-card" onClick={() => setActiveTab('achievements')}>
            <div className="icon-wrapper purple-bg" style={{ backgroundColor: 'rgba(251, 191, 36, 0.12)' }}>
              <Trophy size={18} color="var(--accent-gold)" />
            </div>
            <div className="text-wrapper">
              <span className="title">Minhas Conquistas</span>
              <span className="subtitle">Ver medalhas e evolução do perfil</span>
            </div>
            <ChevronRight size={16} className="arrow" />
          </button>
        </div>
      </section>
    </div>
  );
};
