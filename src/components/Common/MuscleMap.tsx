import React, { useMemo } from 'react';
import { db } from '../../utils/db';
import '../Styles/musclemap.css';

interface MuscleGroup {
  id: string;
  name: string;
  type: 'Superior' | 'Inferior';
  image: string;
}

export const MuscleMap: React.FC = () => {
  // Busca dados do banco de forma segura
  const workoutLogs = db.getWorkoutLogs() || [];
  const exercises = db.getExercises() || [];

  // 12 Grupos Musculares e seus recortes PNG correspondentes
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
      image: '/images/muscles/triceps.png'
    },
    {
      id: 'Antebraço',
      name: 'Antebraço',
      type: 'Superior',
      image: '/images/muscles/antebraco.png'
    },
    {
      id: 'Abdominal',
      name: 'Abdominal',
      type: 'Superior',
      image: '/images/muscles/abdominal.png'
    },
    {
      id: 'Quadríceps',
      name: 'Quadríceps',
      type: 'Inferior',
      image: '/images/muscles/quadriceps.png'
    },
    {
      id: 'Glúteos',
      name: 'Glúteos',
      type: 'Inferior',
      image: '/images/muscles/gluteos.png'
    },
    {
      id: 'Posteriores',
      name: 'Posteriores',
      type: 'Inferior',
      image: '/images/muscles/posteriores.png'
    },
    {
      id: 'Panturrilha',
      name: 'Panturrilha',
      type: 'Inferior',
      image: '/images/muscles/panturrilha.png'
    }
  ], []);

  // Calcula estatísticas reais por grupo muscular com try-catch preventivo contra dados corrompidos
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const lastDates: Record<string, string> = {};

    // Inicializa contadores padronizados
    muscleGroups.forEach(g => {
      counts[g.id] = 0;
      lastDates[g.id] = 'Nunca treinado';
    });

    try {
      const safeLogs = Array.isArray(workoutLogs) ? [...workoutLogs] : [];
      const sortedLogs = safeLogs.sort((a, b) => {
        const aTime = a && a.date ? new Date(a.date).getTime() : 0;
        const bTime = b && b.date ? new Date(b.date).getTime() : 0;
        return aTime - bTime;
      });

      sortedLogs.forEach(log => {
        if (log && Array.isArray(log.exercises)) {
          log.exercises.forEach(ex => {
            if (ex && ex.muscleGroup) {
              const group = ex.muscleGroup;
              // Tratamento de acentuação e correspondência robusta
              if (counts[group] !== undefined) {
                counts[group] += 1;
                if (log.date) {
                  const parts = log.date.split('-');
                  if (parts.length === 3) {
                    const [year, month, day] = parts;
                    lastDates[group] = `${day}/${month}/${year}`;
                  } else {
                    lastDates[group] = log.date;
                  }
                }
              }
            }
          });
        }
      });
    } catch (err) {
      console.error("Erro ao processar estatísticas do mapa muscular:", err);
    }

    return { counts, lastDates };
  }, [workoutLogs, muscleGroups]);

  // Calcula a frequência teórica de forma resiliente
  const theoreticalFreq = useMemo(() => {
    const freqs: Record<string, number> = {};
    muscleGroups.forEach(g => {
      freqs[g.id] = 0;
    });

    try {
      const safeExercises = Array.isArray(exercises) ? exercises : [];
      muscleGroups.forEach(g => {
        freqs[g.id] = safeExercises.filter(ex => ex && ex.muscleGroup === g.id).length;
      });
    } catch (err) {
      console.error("Erro ao calcular frequências teóricas:", err);
    }
    return freqs;
  }, [exercises, muscleGroups]);

  return (
    <div className="muscle-grid">
      {muscleGroups.map((muscle) => {
        const trainedCount = stats.counts[muscle.id] || 0;
        const hasExercises = (theoreticalFreq[muscle.id] || 0) > 0;
        const lastTrainedDate = stats.lastDates[muscle.id] || 'Nunca treinado';
        
        // Define o filtro de cores CSS dinâmico (hue-rotate atua sobre o vermelho original do músculo)
        let imageFilter = 'none';
        if (trainedCount > 0) {
          // Muda vermelho para verde-esmeralda (+105deg) e adiciona brilho de sucesso
          imageFilter = 'hue-rotate(105deg) saturate(2) brightness(1.2) drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))';
        } else if (hasExercises) {
          // Muda vermelho para roxo/azul-elétrico (+245deg) e adiciona brilho médio
          imageFilter = 'hue-rotate(245deg) saturate(1.8) brightness(1.15) drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))';
        } else {
          // Inativo: deixa a silhueta em escala de cinza e escurece a imagem
          imageFilter = 'grayscale(1) opacity(0.35) brightness(0.6)';
        }

        return (
          <div key={muscle.id} className="muscle-card glass-card">
            <div className="muscle-image-container">
              <img 
                src={muscle.image} 
                alt={muscle.name} 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: imageFilter,
                  transition: 'all 0.4s ease'
                }}
              />
            </div>
            
            <div className="muscle-card-info">
              <span className="muscle-name">{muscle.name}</span>
              <span className={`badge ${muscle.type === 'Superior' ? 'badge-superior' : 'badge-inferior'} muscle-tag`}>
                {muscle.type}
              </span>
              
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Frequência de Exercícios:</div>
                <div className="muscle-count" style={{ color: hasExercises ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                  {theoreticalFreq[muscle.id] || 0} {(theoreticalFreq[muscle.id] || 0) === 1 ? 'exercício' : 'exercícios'}
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
