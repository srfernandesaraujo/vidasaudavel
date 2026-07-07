import React, { useMemo } from 'react';
import { db } from '../../utils/db';
import '../Styles/musclemap.css';

interface MuscleGroup {
  id: string;
  name: string;
  type: 'Superior' | 'Inferior';
  svg: (fill: string, opacity: number, active: boolean) => React.ReactNode;
}

export const MuscleMap: React.FC = () => {
  // Busca dados do banco para calcular frequências
  const workoutLogs = db.getWorkoutLogs();
  const exercises = db.getExercises();

  // 12 Grupos Musculares e seus desenhos SVG correspondentes
  const muscleGroups: MuscleGroup[] = useMemo(() => [
    {
      id: 'Peitoral',
      name: 'Peitoral',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Corpo / Torso base */}
          <path d="M20,10 L80,10 L85,40 L70,80 L30,80 L15,40 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          <path d="M50,10 L50,80" stroke="#4e5366" strokeWidth="1" strokeDasharray="2,2" />
          {/* Peito Esquerdo e Direito */}
          <path d="M25,20 C35,20 45,22 48,32 C42,42 32,45 23,38 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M75,20 C65,20 55,22 52,32 C58,42 68,45 77,38 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Dorsal',
      name: 'Dorsal',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Dorso base */}
          <path d="M20,10 L80,10 L75,45 L65,80 L35,80 L25,45 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Asas laterais (Costas) */}
          <path d="M21,12 L35,12 L30,65 L26,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M79,12 L65,12 L70,65 L74,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M35,15 L50,5 L65,15 L50,75 Z" fill="none" stroke="#4e5366" strokeWidth="1" />
        </svg>
      )
    },
    {
      id: 'Trapézio',
      name: 'Trapézio',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M30,30 L70,30 L80,60 L60,85 L40,85 L20,60 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Pescoço e Trapézio superior */}
          <path d="M38,30 C42,20 45,10 50,10 C55,10 58,20 62,30 Z" fill="none" stroke="#4e5366" strokeWidth="1.5" />
          <path d="M38,30 L50,15 L62,30 L70,42 L50,45 L30,42 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Deltóide',
      name: 'Deltóide',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M30,15 L70,15 L85,45 L70,80 L30,80 L15,45 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Ombros (Deltóides laterais) */}
          <path d="M15,45 C12,30 20,20 28,17 C26,28 22,38 18,44 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M85,45 C88,30 80,20 72,17 C74,28 78,38 82,44 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Bíceps',
      name: 'Bíceps',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Braço base */}
          <path d="M30,10 L70,10 L75,85 L25,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Bíceps */}
          <path d="M35,25 C35,15 65,15 65,25 C65,45 35,45 35,25" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M35,40 L65,40" stroke="#4e5366" strokeWidth="1.5" />
        </svg>
      )
    },
    {
      id: 'Tríceps',
      name: 'Tríceps',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M30,10 L70,10 L75,85 L25,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Tríceps */}
          <path d="M28,20 C28,45 42,50 42,20 C42,10 28,10 28,20" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M72,20 C72,45 58,50 58,20 C58,10 72,10 72,20" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Antebraço',
      name: 'Antebraço',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Antebraço base */}
          <path d="M35,10 C45,10 55,10 65,10 L58,85 C53,85 47,85 42,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Músculo braquiorradial/extensores do antebraço */}
          <path d="M36,15 C40,45 48,65 42,80 C36,45 35,25 36,15 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M64,15 C60,45 52,65 58,80 C64,45 65,25 64,15 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Abdominal',
      name: 'Abdominal',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M25,10 L75,10 L70,85 L30,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Reto abdominal (Six pack) */}
          <path d="M38,20 L62,20 L60,75 L40,75 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          {/* Linhas transversas para simular gomos */}
          <line x1="38" y1="35" x2="62" y2="35" stroke="#12141c" strokeWidth="2" />
          <line x1="38" y1="50" x2="62" y2="50" stroke="#12141c" strokeWidth="2" />
          <line x1="38" y1="65" x2="62" y2="65" stroke="#12141c" strokeWidth="2" />
          <line x1="50" y1="20" x2="50" y2="75" stroke="#12141c" strokeWidth="1" />
        </svg>
      )
    },
    {
      id: 'Quadríceps',
      name: 'Quadríceps',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Coxas frente */}
          <path d="M15,10 L85,10 L75,85 L25,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Coxa esquerda e direita (Quadríceps) */}
          <path d="M22,15 C33,15 45,20 45,55 C38,80 30,80 25,65 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M78,15 C67,15 55,20 55,55 C62,80 70,80 75,65 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Glúteos',
      name: 'Glúteos',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Quadris traseira */}
          <path d="M20,10 L80,10 L75,80 L25,80 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Glúteo máximo */}
          <path d="M23,30 C30,22 48,25 48,55 C45,70 30,75 25,60 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M77,30 C70,22 52,25 52,55 C55,70 70,75 75,60 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Posteriores',
      name: 'Posteriores',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Coxas traseira */}
          <path d="M15,10 L85,10 L75,85 L25,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Isquiotibiais (Posteriores) */}
          <path d="M24,15 C32,15 44,18 42,70 C36,80 28,80 26,60 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M76,15 C68,15 56,18 58,70 C64,80 72,80 74,60 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Panturrilha',
      name: 'Panturrilha',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Canela/panturrilha base */}
          <path d="M30,10 C40,10 60,10 70,10 L60,85 C55,85 45,85 40,85 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.5" />
          {/* Músculo Gastrocnêmio (Panturrilha lateral e interna) */}
          <path d="M34,15 C30,30 42,45 44,50 C46,40 42,20 34,15 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
          <path d="M66,15 C70,30 58,45 56,50 C54,40 56,20 66,15 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 4px var(--accent-emerald))' : 'none' }} />
        </svg>
      )
    }
  ], []);

  // Calcula estatísticas reais por grupo muscular nos últimos 14 dias
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const lastDates: Record<string, string> = {};

    // Inicializa contadores
    muscleGroups.forEach(g => {
      counts[g.id] = 0;
      lastDates[g.id] = 'Nunca treinado';
    });

    // Ordena logs do mais antigo para o mais recente
    const sortedLogs = [...workoutLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedLogs.forEach(log => {
      log.exercises.forEach(ex => {
        const group = ex.muscleGroup;
        if (counts[group] !== undefined) {
          counts[group] += 1;
          const [year, month, day] = log.date.split('-');
          lastDates[group] = `${day}/${month}/${year}`;
        }
      });
    });

    return { counts, lastDates };
  }, [workoutLogs, muscleGroups]);

  // Calcula a frequência teórica
  const theoreticalFreq = useMemo(() => {
    const freqs: Record<string, number> = {};
    muscleGroups.forEach(g => {
      freqs[g.id] = exercises.filter(ex => ex.muscleGroup === g.id).length;
    });
    return freqs;
  }, [exercises, muscleGroups]);

  return (
    <div className="muscle-grid">
      {muscleGroups.map((muscle) => {
        const trainedCount = stats.counts[muscle.id];
        const hasExercises = theoreticalFreq[muscle.id] > 0;
        const lastTrainedDate = stats.lastDates[muscle.id];
        
        // Define a cor de opacidade do highlight com base na frequência recente de treino
        const highlightOpacity = trainedCount > 0 ? 0.9 : (hasExercises ? 0.35 : 0.08);
        const highlightColor = trainedCount > 0 ? '#10b981' : (hasExercises ? '#c084fc' : '#ff4d4d');

        return (
          <div key={muscle.id} className="muscle-card glass-card">
            <div className="muscle-svg-container">
              {muscle.svg(highlightColor, highlightOpacity, trainedCount > 0)}
            </div>
            
            <div className="muscle-card-info">
              <span className="muscle-name">{muscle.name}</span>
              <span className={`badge ${muscle.type === 'Superior' ? 'badge-superior' : 'badge-inferior'} muscle-tag`}>
                {muscle.type}
              </span>
              
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frequência de Exercícios:</div>
                <div className="muscle-count" style={{ color: hasExercises ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                  {theoreticalFreq[muscle.id]} {theoreticalFreq[muscle.id] === 1 ? 'exercício' : 'exercícios'}
                </div>
              </div>

              <div style={{ marginTop: '0.2rem', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Histórico: </span>
                <span style={{ fontWeight: 600, color: trainedCount > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {trainedCount}x executado
                </span>
                <div className="muscle-last-date">{lastTrainedDate}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
