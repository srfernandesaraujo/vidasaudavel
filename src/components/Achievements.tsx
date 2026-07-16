import React, { useState, useEffect } from 'react';
import { db, type Achievement } from '../utils/db';
import { 
  Dumbbell, 
  Award, 
  Trophy, 
  Zap, 
  Flame, 
  Activity, 
  Footprints, 
  Calendar, 
  Lock, 
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';
import './Styles/achievements.css';

const IconMap: Record<string, React.ComponentType<any>> = {
  Dumbbell,
  Award,
  Trophy,
  Zap,
  Flame,
  Activity,
  Footprints,
  Calendar,
  Lock
};

export const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadAchievements = () => {
    // Garante que recalculou com os dados mais frescos antes de carregar
    db.checkAchievements();
    setAchievements(db.getAchievements());
  };

  useEffect(() => {
    loadAchievements();

    // Escuta atualizações do banco
    const handleUpdate = () => {
      setAchievements(db.getAchievements());
    };
    window.addEventListener('vs_database_update', handleUpdate);
    return () => window.removeEventListener('vs_database_update', handleUpdate);
  }, []);

  // Filtros e busca
  const filteredAchievements = achievements.filter(ach => {
    const matchesSearch = ach.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ach.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'unlocked') {
      return matchesSearch && !!ach.unlockedAt;
    }
    if (filter === 'locked') {
      return matchesSearch && !ach.unlockedAt;
    }
    return matchesSearch;
  });

  const unlockedCount = achievements.filter(a => !!a.unlockedAt).length;
  const totalCount = achievements.length;
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Retorna classe de cor para medalha baseada no tipo
  const getGradientClass = (type: string, isUnlocked: boolean) => {
    if (!isUnlocked) return 'medal-locked';
    switch (type) {
      case 'workout_count':
        return 'gradient-green';
      case 'run_count':
        return 'gradient-blue';
      case 'max_pr':
        return 'gradient-gold';
      case 'pace':
        return 'gradient-orange';
      case 'streak':
        return 'gradient-purple';
      default:
        return 'gradient-blue';
    }
  };

  return (
    <div className="achievements-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho */}
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={28} color="var(--accent-gold)" />
            Suas Conquistas
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Mantenha o foco nos treinos e corridas para desbloquear novos troféus e subir de nível.</p>
        </div>
      </header>

      {/* Card de Progresso Geral */}
      <div className="glass-card general-progress-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(20, 22, 32, 0.9), rgba(17, 19, 26, 0.9))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textAlign: 'left' }}>
          <div className="progress-circular-badge">
            <Sparkles size={24} color="var(--accent-gold)" className="animate-pulse" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>Evolução do Perfil</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Você desbloqueou <strong>{unlockedCount} de {totalCount}</strong> conquistas disponíveis.
            </p>
          </div>
        </div>

        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>Progresso Geral</span>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{progressPct}%</span>
          </div>
          <div style={{ height: '10px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${progressPct}%`, 
              background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-gold))',
              boxShadow: '0 0 10px rgba(255, 215, 0, 0.4)',
              borderRadius: '99px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="filters-bar glass-card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Botões de Filtro */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('all')}
          >
            Todos ({totalCount})
          </button>
          <button 
            className={`btn ${filter === 'unlocked' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('unlocked')}
          >
            Desbloqueados ({unlockedCount})
          </button>
          <button 
            className={`btn ${filter === 'locked' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
            onClick={() => setFilter('locked')}
          >
            Bloqueados ({totalCount - unlockedCount})
          </button>
        </div>

        {/* Input de Busca */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            style={{ paddingLeft: '2rem', height: '38px', fontSize: '0.8rem' }}
            placeholder="Buscar conquista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Medalhas */}
      {filteredAchievements.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          <Trophy size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p>Nenhuma conquista encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="achievements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filteredAchievements.map((ach) => {
            const IconComponent = IconMap[ach.icon] || Trophy;
            const isUnlocked = !!ach.unlockedAt;
            const gradientClass = getGradientClass(ach.type, isUnlocked);
            
            // Cálculo de progresso percentual individual
            let individualPct = 0;
            if (isUnlocked) {
              individualPct = 100;
            } else if (ach.type === 'pace') {
              // Menor pace é melhor. Se for 0, progresso é 0.
              individualPct = ach.progress > 0 ? Math.min(100, Math.round((ach.target / ach.progress) * 100)) : 0;
            } else {
              individualPct = Math.min(100, Math.round((ach.progress / ach.target) * 100));
            }

            return (
              <div 
                key={ach.id} 
                className={`glass-card achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem', 
                  position: 'relative',
                  border: isUnlocked ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid var(--border-subtle)',
                  background: isUnlocked ? 'rgba(20, 22, 32, 0.6)' : 'rgba(20, 22, 32, 0.35)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', textAlign: 'left' }}>
                  {/* Círculo do Ícone */}
                  <div className={`medal-icon-holder ${gradientClass}`} style={{ flexShrink: 0 }}>
                    {isUnlocked ? (
                      <IconComponent size={20} color="#fff" />
                    ) : (
                      <Lock size={18} color="var(--text-muted)" />
                    )}
                  </div>

                  {/* Informações */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: isUnlocked ? '#fff' : 'var(--text-secondary)' }}>{ach.title}</h4>
                      {isUnlocked && <CheckCircle2 size={13} color="var(--accent-emerald)" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: isUnlocked ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: '1.3' }}>
                      {ach.description}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso e Rodapé */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Progresso</span>
                    <span>
                      {ach.type === 'pace' 
                        ? (ach.progress > 0 ? `${ach.progress.toFixed(2)} / ${ach.target.toFixed(2)} min/km` : `Ainda sem corrida`)
                        : `${ach.progress} / ${ach.target}`}
                    </span>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${individualPct}%`, 
                      background: isUnlocked ? 'var(--accent-emerald)' : 'var(--accent-blue)',
                      borderRadius: '99px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>

                  {isUnlocked && ach.unlockedAt && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', fontWeight: 500, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                      <span>Desbloqueado em:</span>
                      <strong>{ach.unlockedAt.split('-').reverse().join('/')}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
