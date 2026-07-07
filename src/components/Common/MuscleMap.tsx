import React, { useMemo } from 'react';
import { db } from '../../utils/db';
import '../Styles/musclemap.css';

interface MuscleGroup {
  id: string;
  name: string;
  type: 'Superior' | 'Inferior';
  svg: (fill: string, opacity: number, active: boolean) => React.ReactNode;
}

// 1. RENDERER DE PARTE SUPERIOR FRONTAL (Peitoral, Deltóide, Bíceps, Abdominal, Antebraço)
const renderFrontUpper = (highlighted: string, fill: string, opacity: number, active: boolean) => {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="bodyGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222634" />
          <stop offset="100%" stopColor="#151722" />
        </linearGradient>
      </defs>
      
      {/* Silhueta Base - Cabeça e Pescoço */}
      <path d="M 44,14 C 44,8 56,8 56,14 L 57,23 L 43,23 Z" fill="url(#bodyGradFront)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Silhueta Base - Ombros e Braços */}
      <path d="M 20,41 C 18,48 20,55 23,59 C 20,65 19,72 22,78 C 20,86 17,94 15,98 L 21,100 C 23,95 26,86 26,78 C 27,70 30,62 33,56 M 80,41 C 82,48 80,55 77,59 C 80,65 81,72 78,78 C 74,86 77,95 79,100 L 85,98 C 83,94 80,86 78,78 C 81,72 80,65 77,59" fill="url(#bodyGradFront)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Silhueta Base - Tronco */}
      <path d="M 43,23 C 36,25 32,27 31,28 C 27,33 34,56 37,56 L 40,88 L 60,88 L 63,56 C 66,56 73,33 69,28 C 68,27 64,25 57,23 Z" fill="url(#bodyGradFront)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Linhas Internas Gerais */}
      <path d="M 43,23 C 45,26 48,27 50,27 C 52,27 55,26 57,23" fill="none" stroke="#2a2e3d" strokeWidth="1" />
      <line x1="50" y1="28" x2="50" y2="56" stroke="#252a37" strokeWidth="1" />
      <line x1="40" y1="56" x2="60" y2="56" stroke="#252a37" strokeWidth="1" />

      {/* Desenhos de todos os músculos em cinza-escuro (não selecionados) */}
      <g fill="#1b1d26" stroke="#252a37" strokeWidth="0.8">
        {/* Peitoral Esquerdo e Direito */}
        <path d="M 50,30 C 43,30 36,33 34,44 C 34,53 42,56 50,56 Z" />
        <path d="M 50,30 C 57,30 64,33 66,44 C 66,53 58,56 50,56 Z" />
        {/* Deltóides */}
        <path d="M 31,28 C 26,30 22,35 20,41 C 18,48 20,55 23,59 C 25,54 28,42 31,28 Z" />
        <path d="M 69,28 C 74,30 78,35 80,41 C 82,48 80,55 77,59 C 75,54 72,42 69,28 Z" />
        {/* Bíceps */}
        <path d="M 23,59 C 20,65 19,72 22,78 C 24,75 26,68 25,61 Z" />
        <path d="M 77,59 C 80,65 81,72 78,78 C 76,75 74,68 75,61 Z" />
        {/* Antebraço */}
        <path d="M 22,78 C 20,86 17,94 15,98 L 21,100 C 23,95 26,86 26,78 Z" />
        <path d="M 78,78 C 80,86 83,94 85,98 L 79,100 C 77,95 74,86 74,78 Z" />
        {/* Abdominais */}
        <rect x="41" y="58" width="8" height="7" rx="1.5" />
        <rect x="51" y="58" width="8" height="7" rx="1.5" />
        <rect x="41" y="67" width="8" height="7" rx="1.5" />
        <rect x="51" y="67" width="8" height="7" rx="1.5" />
        <rect x="41" y="76" width="8" height="7" rx="1.5" />
        <rect x="51" y="76" width="8" height="7" rx="1.5" />
      </g>

      {/* HIGHLIGHT ATIVO */}
      {highlighted === 'Peitoral' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 50,30 C 43,30 36,33 34,44 C 34,53 42,56 50,56 Z" />
          <path d="M 50,30 C 57,30 64,33 66,44 C 66,53 58,56 50,56 Z" />
          <line x1="50" y1="30" x2="50" y2="56" stroke="#12141c" strokeWidth="1.2" />
        </g>
      )}

      {highlighted === 'Deltóide' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 31,28 C 26,30 22,35 20,41 C 18,48 20,55 23,59 C 25,54 28,42 31,28 Z" />
          <path d="M 69,28 C 74,30 78,35 80,41 C 82,48 80,55 77,59 C 75,54 72,42 69,28 Z" />
        </g>
      )}

      {highlighted === 'Bíceps' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 23,59 C 20,65 19,72 22,78 C 24,75 26,68 25,61 Z" />
          <path d="M 77,59 C 80,65 81,72 78,78 C 76,75 74,68 75,61 Z" />
        </g>
      )}

      {highlighted === 'Antebraço' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 22,78 C 20,86 17,94 15,98 L 21,100 C 23,95 26,86 26,78 Z" />
          <path d="M 78,78 C 80,86 83,94 85,98 L 79,100 C 77,95 74,86 74,78 Z" />
        </g>
      )}

      {highlighted === 'Abdominal' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <rect x="41" y="58" width="8" height="7" rx="1.5" />
          <rect x="51" y="58" width="8" height="7" rx="1.5" />
          <rect x="41" y="67" width="8" height="7" rx="1.5" />
          <rect x="51" y="67" width="8" height="7" rx="1.5" />
          <rect x="41" y="76" width="8" height="7" rx="1.5" />
          <rect x="51" y="76" width="8" height="7" rx="1.5" />
        </g>
      )}
    </svg>
  );
};

// 2. RENDERER DE PARTE SUPERIOR TRASEIRA (Dorsal, Trapézio, Tríceps)
const renderBackUpper = (highlighted: string, fill: string, opacity: number, active: boolean) => {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="bodyGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222634" />
          <stop offset="100%" stopColor="#151722" />
        </linearGradient>
      </defs>
      
      {/* Head & Neck */}
      <path d="M 44,14 C 44,8 56,8 56,14 L 57,23 L 43,23 Z" fill="url(#bodyGradBack)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Arms Outline */}
      <path d="M 20,41 C 18,48 20,55 23,59 C 20,65 19,72 22,78 C 20,86 17,94 15,98 L 21,100 C 23,95 26,86 26,78 C 27,70 30,62 33,56 M 80,41 C 82,48 80,55 77,59 C 80,65 81,72 78,78 C 74,86 77,95 79,100 L 85,98 C 83,94 80,86 78,78 C 81,72 80,65 77,59" fill="url(#bodyGradBack)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Tronco Base */}
      <path d="M 43,23 C 36,25 32,27 31,28 C 27,33 34,56 37,56 L 40,88 L 60,88 L 63,56 C 66,56 73,33 69,28 C 68,27 64,25 57,23 Z" fill="url(#bodyGradBack)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Spine line */}
      <line x1="50" y1="23" x2="50" y2="88" stroke="#252a37" strokeWidth="1" />

      {/* Desenhos de todos os músculos em cinza-escuro */}
      <g fill="#1b1d26" stroke="#252a37" strokeWidth="0.8">
        {/* Trapézio */}
        <path d="M 43,23 L 57,23 L 64,32 L 50,48 L 36,32 Z" />
        {/* Dorsais (Asas) */}
        <path d="M 36,32 C 34,44 37,62 41,78 L 50,78 L 50,48 C 41,48 36,38 36,32 Z" />
        <path d="M 64,32 C 66,44 63,62 59,78 L 50,78 L 50,48 C 59,48 64,38 64,32 Z" />
        {/* Tríceps */}
        <path d="M 23,59 C 20,65 19,72 22,78 C 24,75 26,68 25,61 Z" />
        <path d="M 77,59 C 80,65 81,72 78,78 C 76,75 74,68 75,61 Z" />
      </g>

      {/* HIGHLIGHT ATIVO */}
      {highlighted === 'Trapézio' && (
        <path d="M 43,23 L 57,23 L 64,32 L 50,48 L 36,32 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }} />
      )}

      {highlighted === 'Dorsal' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 36,32 C 34,44 37,62 41,78 L 50,78 L 50,48 C 41,48 36,38 36,32 Z" />
          <path d="M 64,32 C 66,44 63,62 59,78 L 50,78 L 50,48 C 59,48 64,38 64,32 Z" />
          <line x1="50" y1="48" x2="50" y2="78" stroke="#12141c" strokeWidth="1.2" />
        </g>
      )}

      {highlighted === 'Tríceps' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 23,59 C 20,65 19,72 22,78 C 24,75 26,68 25,61 Z" />
          <path d="M 77,59 C 80,65 81,72 78,78 C 76,75 74,68 75,61 Z" />
        </g>
      )}
    </svg>
  );
};

// 3. RENDERER DE PARTE INFERIOR FRONTAL (Quadríceps)
const renderFrontLower = (highlighted: string, fill: string, opacity: number, active: boolean) => {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="bodyGradLowerFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222634" />
          <stop offset="100%" stopColor="#151722" />
        </linearGradient>
      </defs>
      
      {/* Pelvis/Quadril */}
      <path d="M 30,5 L 70,5 L 74,20 L 26,20 Z" fill="url(#bodyGradLowerFront)" stroke="#383e4f" strokeWidth="0.8" />
      {/* Joelhos */}
      <circle cx="36" cy="78" r="3.5" fill="url(#bodyGradLowerFront)" stroke="#383e4f" strokeWidth="0.8" />
      <circle cx="64" cy="78" r="3.5" fill="url(#bodyGradLowerFront)" stroke="#383e4f" strokeWidth="0.8" />
      {/* Canelas */}
      <path d="M 33,81 L 31,98 L 37,98 L 37,81 Z" fill="url(#bodyGradLowerFront)" stroke="#383e4f" strokeWidth="0.8" />
      <path d="M 67,81 L 69,98 L 63,98 L 63,81 Z" fill="url(#bodyGradLowerFront)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Coxas base outline */}
      <path d="M 26,20 C 26,38 32,58 35,75 L 49,75 L 45,20 Z" fill="#1b1d26" stroke="#383e4f" strokeWidth="1" />
      <path d="M 74,20 C 74,38 68,58 65,75 L 51,75 L 55,20 Z" fill="#1b1d26" stroke="#383e4f" strokeWidth="1" />

      {/* HIGHLIGHT ATIVO */}
      {highlighted === 'Quadríceps' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 26,20 C 26,38 32,58 35,75 L 49,75 L 45,20 Z" />
          <path d="M 74,20 C 74,38 68,58 65,75 L 51,75 L 55,20 Z" />
          <line x1="50" y1="20" x2="50" y2="75" stroke="#12141c" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
};

// 4. RENDERER DE PARTE INFERIOR TRASEIRA (Glúteos, Posteriores, Panturrilha)
const renderBackLower = (highlighted: string, fill: string, opacity: number, active: boolean) => {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="bodyGradLowerBack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#222634" />
          <stop offset="100%" stopColor="#151722" />
        </linearGradient>
      </defs>
      
      {/* Quadril Silhouette */}
      <path d="M 30,5 L 70,5 L 72,20 L 28,20 Z" fill="url(#bodyGradLowerBack)" stroke="#383e4f" strokeWidth="0.8" />
      
      {/* Desenho dos músculos em cinza-escuro */}
      <g fill="#1b1d26" stroke="#383e4f" strokeWidth="0.8">
        {/* Coxas Traseira Base */}
        <path d="M 28,40 C 28,52 32,68 36,78 L 48,78 L 48,40 Z" />
        <path d="M 72,40 C 72,52 68,68 64,78 L 52,78 L 52,40 Z" />
        {/* Panturrilhas Base */}
        <path d="M 36,78 C 32,82 34,90 36,98 L 44,98 L 44,78 Z" />
        <path d="M 64,78 C 68,82 66,90 64,98 L 56,98 L 56,78 Z" />
        {/* Glúteos base */}
        <path d="M 28,20 C 28,32 38,40 50,40 C 62,40 72,32 72,20 Z" />
      </g>

      {/* HIGHLIGHT ATIVO */}
      {highlighted === 'Glúteos' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 28,20 C 28,32 38,40 50,40 Z" />
          <path d="M 72,20 C 72,32 62,40 50,40 Z" />
          <line x1="50" y1="20" x2="50" y2="40" stroke="#12141c" strokeWidth="1.2" />
        </g>
      )}

      {highlighted === 'Posteriores' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 28,40 C 28,52 32,68 36,78 L 48,78 L 48,40 Z" />
          <path d="M 72,40 C 72,52 68,68 64,78 L 52,78 L 52,40 Z" />
          <line x1="50" y1="40" x2="50" y2="78" stroke="#12141c" strokeWidth="1.2" />
        </g>
      )}

      {highlighted === 'Panturrilha' && (
        <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 6px ' + fill + ')' : 'none' }}>
          <path d="M 36,78 C 32,82 34,90 36,98 L 48,98 L 44,78 Z" />
          <path d="M 64,78 C 68,82 66,90 64,98 L 52,98 L 56,78 Z" />
        </g>
      )}
    </svg>
  );
};

export const MuscleMap: React.FC = () => {
  // Busca dados do banco para calcular frequências
  const workoutLogs = db.getWorkoutLogs();
  const exercises = db.getExercises();

  // 12 Grupos Musculares e seus desenhos correspondentes (SVG ou PNG)
  const muscleGroups: MuscleGroup[] = useMemo(() => [
    {
      id: 'Peitoral',
      name: 'Peitoral',
      type: 'Superior',
      svg: (fill, opacity, active) => renderFrontUpper('Peitoral', fill, opacity, active)
    },
    {
      id: 'Dorsal',
      name: 'Dorsal',
      type: 'Superior',
      svg: (fill, opacity, active) => renderBackUpper('Dorsal', fill, opacity, active)
    },
    {
      id: 'Trapézio',
      name: 'Trapézio',
      type: 'Superior',
      svg: (fill, opacity, active) => renderBackUpper('Trapézio', fill, opacity, active)
    },
    {
      id: 'Deltóide',
      name: 'Deltóide',
      type: 'Superior',
      svg: (fill, opacity, active) => renderFrontUpper('Deltóide', fill, opacity, active)
    },
    {
      id: 'Bíceps',
      name: 'Bíceps',
      type: 'Superior',
      svg: (fill, opacity, active) => renderFrontUpper('Bíceps', fill, opacity, active)
    },
    {
      id: 'Tríceps',
      name: 'Tríceps',
      type: 'Superior',
      svg: (fill, opacity, active) => renderBackUpper('Tríceps', fill, opacity, active)
    },
    {
      id: 'Antebraço',
      name: 'Antebraço',
      type: 'Superior',
      svg: (fill, opacity, active) => renderFrontUpper('Antebraço', fill, opacity, active)
    },
    {
      id: 'Abdominal',
      name: 'Abdominal',
      type: 'Superior',
      svg: (fill, opacity, active) => renderFrontUpper('Abdominal', fill, opacity, active)
    },
    {
      id: 'Quadríceps',
      name: 'Quadríceps',
      type: 'Inferior',
      svg: (fill, opacity, active) => renderFrontLower('Quadríceps', fill, opacity, active)
    },
    {
      id: 'Glúteos',
      name: 'Glúteos',
      type: 'Inferior',
      svg: (fill, opacity, active) => renderBackLower('Glúteos', fill, opacity, active)
    },
    {
      id: 'Posteriores',
      name: 'Posteriores',
      type: 'Inferior',
      svg: (fill, opacity, active) => renderBackLower('Posteriores', fill, opacity, active)
    },
    {
      id: 'Panturrilha',
      name: 'Panturrilha',
      type: 'Inferior',
      svg: (fill, opacity, active) => renderBackLower('Panturrilha', fill, opacity, active)
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
