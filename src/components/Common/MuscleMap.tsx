import React, { useMemo } from 'react';
import { db } from '../../utils/db';
import '../Styles/musclemap.css';

interface MuscleGroup {
  id: string;
  name: string;
  type: 'Superior' | 'Inferior';
  svg?: (fill: string, opacity: number, active: boolean) => React.ReactNode;
  image?: string;
}

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
      image: '/images/muscles/peitoral.png'
    },
    {
      id: 'Dorsal',
      name: 'Dorsal',
      type: 'Superior',
      image: '/images/muscles/dorsal.png'
    },
    {
      id: 'Trapézio',
      name: 'Trapézio',
      type: 'Superior',
      image: '/images/muscles/trapezio.png'
    },
    {
      id: 'Deltóide',
      name: 'Deltóide',
      type: 'Superior',
      image: '/images/muscles/deltoide.png'
    },
    {
      id: 'Bíceps',
      name: 'Bíceps',
      type: 'Superior',
      image: '/images/muscles/biceps.png'
    },
    {
      id: 'Tríceps',
      name: 'Tríceps',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Traseira Superior */}
          <path d="M44,12 C44,6 56,6 56,12 L58,20 L42,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M36,22 C31,23 27,27 25,33 C23,39 25,44 28,47 C30,44 33,35 36,22 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M64,22 C69,23 73,27 75,33 C77,39 75,44 72,47 C70,44 67,35 64,22 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M16,60 C14,72 12,82 10,88 L16,90 C18,84 21,72 21,62 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M84,60 C86,72 88,82 90,88 L84,90 C82,84 79,72 79,62 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M50,15 L36,30 C34,42 37,60 41,75 L59,75 C63,60 66,42 64,30 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights do Tríceps (Costas do braço) */}
          <path d="M25,33 C22,40 20,48 24,54 C27,51 28,42 25,33 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M75,33 C78,40 80,48 76,54 C73,51 72,42 75,33 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Antebraço',
      name: 'Antebraço',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Frontal Superior */}
          <path d="M44,12 C44,6 56,6 56,12 L58,20 L42,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M37,52 L63,52 L60,84 L40,84 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M36,22 C31,23 27,27 25,33 C23,39 25,44 28,47 C30,44 33,35 36,22 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1" />
          <path d="M64,22 C69,23 73,27 75,33 C77,39 75,44 72,47 C70,44 67,35 64,22 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1" />
          <path d="M25,33 L16,60 L21,62 L28,47 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M75,33 L84,60 L79,62 L72,47 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M50,22 C42,22 36,25 36,36 C36,46 41,52 50,52 C59,52 64,46 64,36 C64,25 58,22 50,22 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights do Antebraço */}
          <path d="M16,60 C14,72 12,82 10,88 L16,90 C18,84 21,72 21,62 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M84,60 C86,72 88,82 90,88 L84,90 C82,84 79,72 79,62 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
        </svg>
      )
    },
    {
      id: 'Abdominal',
      name: 'Abdominal',
      type: 'Superior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Frontal Superior */}
          <path d="M44,12 C44,6 56,6 56,12 L58,20 L42,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M36,22 C31,23 27,27 25,33 C23,39 25,44 28,47 C30,44 33,35 36,22 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M64,22 C69,23 73,27 75,33 C77,39 75,44 72,47 C70,44 67,35 64,22 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M25,33 L16,60 L21,62 L28,47 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M75,33 L84,60 L79,62 L72,47 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M16,60 C14,72 12,82 10,88 L16,90 C18,84 21,72 21,62 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M84,60 C86,72 88,82 90,88 L84,90 C82,84 79,72 79,62 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M50,22 C42,22 36,25 36,36 C36,46 41,52 50,52 C59,52 64,46 64,36 C64,25 58,22 50,22 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Abs Outline do Abdomem */}
          <path d="M37,52 L63,52 L60,84 L40,84 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights do Abdomem (Gomos / Six Pack) */}
          <g fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }}>
            <rect x="41" y="55" width="8" height="7" rx="1.5" />
            <rect x="51" y="55" width="8" height="7" rx="1.5" />
            <rect x="41" y="64" width="8" height="7" rx="1.5" />
            <rect x="51" y="64" width="8" height="7" rx="1.5" />
            <rect x="41" y="73" width="8" height="7" rx="1.5" />
            <rect x="51" y="73" width="8" height="7" rx="1.5" />
            <path d="M37,52 L40,82 L37,82 Z" />
            <path d="M63,52 L60,82 L63,82 Z" />
          </g>
        </svg>
      )
    },
    {
      id: 'Quadríceps',
      name: 'Quadríceps',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Perna Frontal */}
          <path d="M30,5 L70,5 L74,20 L26,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <circle cx="36" cy="78" r="3.5" fill="#1b1d26" stroke="#333846" />
          <circle cx="64" cy="78" r="3.5" fill="#1b1d26" stroke="#333846" />
          <path d="M33,81 L31,98 L37,98 L37,81 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M67,81 L69,98 L63,98 L63,81 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          
          {/* Coxas Base */}
          <path d="M26,20 C26,38 32,58 35,75 L49,75 L45,20 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          <path d="M74,20 C74,38 68,58 65,75 L51,75 L55,20 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights do Quadríceps (Frente da Coxa) */}
          <path d="M26,20 C26,38 32,58 35,75 L49,75 L45,20 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M74,20 C74,38 68,58 65,75 L51,75 L55,20 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <line x1="50" y1="20" x2="50" y2="75" stroke="#12141c" strokeWidth="1.5" />
        </svg>
      )
    },
    {
      id: 'Glúteos',
      name: 'Glúteos',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Perna Traseira */}
          <path d="M30,5 L70,5 L72,20 L28,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M28,40 C28,52 32,68 36,78 L48,78 L48,40 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M72,40 C72,52 68,68 64,78 L52,78 L52,40 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M36,78 C32,82 34,90 36,98 L44,98 L44,78 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M64,78 C68,82 66,90 64,98 L56,98 L56,78 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          
          {/* Quadris base */}
          <path d="M28,20 C28,32 38,40 50,40 C62,40 72,32 72,20 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights dos Glúteos */}
          <path d="M28,20 C28,32 38,40 50,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M72,20 C72,32 62,40 50,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <line x1="50" y1="20" x2="50" y2="40" stroke="#12141c" strokeWidth="1.5" />
        </svg>
      )
    },
    {
      id: 'Posteriores',
      name: 'Posteriores',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Perna Traseira */}
          <path d="M30,5 L70,5 L72,20 L28,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M28,20 C28,32 38,40 50,40 C62,40 72,32 72,20 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M36,78 C32,82 34,90 36,98 L44,98 L44,78 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M64,78 C68,82 66,90 64,98 L56,98 L56,78 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          
          {/* Coxas Traseira Base */}
          <path d="M28,40 C28,52 32,68 36,78 L49,78 L45,40 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          <path d="M72,40 C72,52 68,68 64,78 L51,78 L55,40 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights do Posterior (Isquiotibiais) */}
          <path d="M28,40 C28,52 32,68 36,78 L49,78 L45,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M72,40 C72,52 68,68 64,78 L51,78 L55,40 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <line x1="50" y1="40" x2="50" y2="78" stroke="#12141c" strokeWidth="1.5" />
        </svg>
      )
    },
    {
      id: 'Panturrilha',
      name: 'Panturrilha',
      type: 'Inferior',
      svg: (fill, opacity, active) => (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          {/* Silhueta Base Perna Traseira */}
          <path d="M30,5 L70,5 L72,20 L28,20 Z" fill="#242835" stroke="#4e5366" strokeWidth="1" />
          <path d="M28,20 C28,32 38,40 50,40 C62,40 72,32 72,20 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M28,40 C28,52 32,68 36,78 L49,78 L45,40 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          <path d="M72,40 C72,52 68,68 64,78 L51,78 L55,40 Z" fill="#1b1d26" stroke="#333846" strokeWidth="1" />
          
          {/* Panturrilha Base */}
          <path d="M36,78 C32,82 34,90 36,98 L48,98 L44,78 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          <path d="M64,78 C68,82 66,90 64,98 L52,98 L56,78 Z" fill="#1b1d26" stroke="#4e5366" strokeWidth="1.2" />
          
          {/* Highlights da Panturrilha (Gastrocnêmio / Gêmeos) */}
          <path d="M36,78 C32,82 34,90 36,98 L48,98 L44,78 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <path d="M64,78 C68,82 66,90 64,98 L52,98 L56,78 Z" fill={fill} opacity={opacity} style={{ transition: 'all 0.5s ease', filter: active ? 'drop-shadow(0 0 5px ' + fill + ')' : 'none' }} />
          <line x1="50" y1="78" x2="50" y2="98" stroke="#12141c" strokeWidth="1.5" />
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
              {muscle.image ? (
                <img 
                  src={muscle.image} 
                  alt={muscle.name} 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: trainedCount > 0 
                      ? 'hue-rotate(105deg) saturate(1.8) brightness(1.1) drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' 
                      : (hasExercises 
                        ? 'hue-rotate(240deg) saturate(1.5) brightness(1.1) drop-shadow(0 0 6px rgba(192, 132, 252, 0.4))' 
                        : 'grayscale(1) opacity(0.22) brightness(0.65)'),
                    transition: 'all 0.5s ease'
                  }}
                />
              ) : (
                muscle.svg && muscle.svg(highlightColor, highlightOpacity, trainedCount > 0)
              )}
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
