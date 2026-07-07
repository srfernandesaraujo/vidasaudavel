import React, { useState, useMemo } from 'react';
import { db, type Exercise, type Workout, type WorkoutLog } from '../utils/db';
import { MuscleMap } from './Common/MuscleMap';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Dumbbell, 
  Edit3, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Award
} from 'lucide-react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import confetti from 'canvas-confetti';
import './Styles/workouts.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export const Workouts: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'workouts' | 'musclemap'>('workouts');
  const [workouts, setWorkouts] = useState<Workout[]>(db.getWorkouts());
  const [exercises, setExercises] = useState<Exercise[]>(db.getExercises());
  const [logs, setLogs] = useState<WorkoutLog[]>(db.getWorkoutLogs());

  // Estado dos Modais
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Estados dos Formulários
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [selectedWorkoutForLog, setSelectedWorkoutForLog] = useState<Workout | null>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logWeights, setLogWeights] = useState<Record<string, number>>({});

  // Cálculo de volume semanal (séries executadas nos últimos 7 dias) para o Radar Chart
  const muscleVolumeData = useMemo(() => {
    const muscles = [
      'Peitoral', 'Dorsal', 'Trapézio', 'Deltóide', 'Bíceps', 'Tríceps',
      'Antebraço', 'Abdominal', 'Quadríceps', 'Glúteos', 'Posteriores', 'Panturrilha'
    ];
    
    const volume: Record<string, number> = {};
    muscles.forEach(m => { volume[m] = 0; });

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const safeLogs = Array.isArray(logs) ? logs : [];
    safeLogs.forEach(log => {
      const logDateObj = log.date ? new Date(log.date) : null;
      if (logDateObj && logDateObj >= sevenDaysAgo && Array.isArray(log.exercises)) {
        log.exercises.forEach(ex => {
          if (ex && ex.muscleGroup && volume[ex.muscleGroup] !== undefined) {
            volume[ex.muscleGroup] += Number(ex.series) || 0;
          }
        });
      }
    });

    return {
      labels: muscles,
      datasets: [
        {
          label: 'Séries Executadas (Últimos 7 dias)',
          data: muscles.map(m => volume[m]),
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          borderColor: '#2563eb',
          borderWidth: 2,
          pointBackgroundColor: '#2563eb',
          pointRadius: 3
        },
        {
          label: 'Meta Científica Mínima (Hipertrofia)',
          data: muscles.map(() => 10),
          backgroundColor: 'rgba(16, 185, 129, 0.02)',
          borderColor: 'rgba(16, 185, 129, 0.35)',
          borderWidth: 1.2,
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    };
  }, [logs]);

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9ba1b0', font: { family: 'Inter', size: 10 } }
      },
      tooltip: {
        backgroundColor: '#141620',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: '#1f2232',
        borderWidth: 1
      }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.02)' },
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        pointLabels: { color: '#9ba1b0', font: { family: 'Inter', size: 9, weight: 600 } },
        ticks: { display: false },
        min: 0,
        suggestedMax: 15
      }
    }
  };

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    muscleGroup: 'Peitoral',
    workoutId: '',
    series: 4,
    repetitions: '10',
    prWeight: 0,
    notes: ''
  });

  // Controle de colapsáveis (Cardio e Observações)
  const [isCardioExpanded, setIsCardioExpanded] = useState(false);
  const [isObsExpanded, setIsObsExpanded] = useState(false);

  // Controle de expansão de exercícios de cada treino
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});

  const toggleWorkoutExercises = (workoutId: string) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [workoutId]: !prev[workoutId]
    }));
  };

  const muscleGroupsList = [
    'Peitoral', 'Dorsal', 'Trapézio', 'Deltóide', 'Bíceps', 'Tríceps', 
    'Antebraço', 'Abdominal', 'Quadríceps', 'Glúteos', 'Posteriores', 'Panturrilha'
  ];

  // Recarrega dados do banco
  const refreshData = () => {
    setWorkouts(db.getWorkouts());
    setExercises(db.getExercises());
    setLogs(db.getWorkoutLogs());
  };

  // Mapeamento dinâmico de dias sugeridos para exibição premium
  const getSuggestedDay = (workoutName: string, index: number) => {
    const nameLower = workoutName.toLowerCase();
    if (nameLower.includes('treino a') || nameLower.includes('força a')) return 'Segunda-feira & Quinta-feira';
    if (nameLower.includes('treino b') || nameLower.includes('força b')) return 'Terça-feira & Sexta-feira';
    if (nameLower.includes('treino c') || nameLower.includes('força c')) return 'Quarta-feira & Sábado';
    
    // Fallback inteligente
    const fallbacks = [
      'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    return fallbacks[index % fallbacks.length];
  };

  // -------------------------------------------------------------
  // HANDLERS DE TREINO (WORKOUT)
  // -------------------------------------------------------------
  const handleCreateWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;

    const newId = `treino-${Date.now()}`;
    db.saveWorkout({
      id: newId,
      name: newWorkoutName.trim(),
      isTemplate: true
    });

    setNewWorkoutName('');
    setIsWorkoutModalOpen(false);
    refreshData();
  };

  const handleDeleteWorkout = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita expandir o card ao deletar
    if (window.confirm('Deseja realmente deletar este treino e todos os seus exercícios associados?')) {
      db.deleteWorkout(id);
      refreshData();
    }
  };

  // -------------------------------------------------------------
  // HANDLERS DE EXERCÍCIO
  // -------------------------------------------------------------
  const openAddExerciseModal = (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita colapsar ao clicar no botão
    setEditingExercise(null);
    setExerciseForm({
      name: '',
      muscleGroup: 'Peitoral',
      workoutId: workoutId,
      series: 4,
      repetitions: '10',
      prWeight: 0,
      notes: ''
    });
    setIsExerciseModalOpen(true);
  };

  const openEditExerciseModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setExerciseForm({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      workoutId: exercise.workoutId,
      series: exercise.series,
      repetitions: exercise.repetitions,
      prWeight: exercise.prWeight,
      notes: exercise.notes
    });
    setIsExerciseModalOpen(true);
  };

  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseForm.name.trim() || !exerciseForm.workoutId) return;

    db.saveExercise({
      id: editingExercise ? editingExercise.id : `ex-${Date.now()}`,
      name: exerciseForm.name.trim(),
      muscleGroup: exerciseForm.muscleGroup,
      workoutId: exerciseForm.workoutId,
      series: Number(exerciseForm.series),
      repetitions: exerciseForm.repetitions,
      prWeight: Number(exerciseForm.prWeight),
      notes: exerciseForm.notes
    });

    setIsExerciseModalOpen(false);
    setEditingExercise(null);
    refreshData();
  };

  const handleDeleteExercise = (id: string) => {
    if (window.confirm('Excluir este exercício do treino?')) {
      db.deleteExercise(id);
      refreshData();
    }
  };

  // -------------------------------------------------------------
  // HANDLERS DE HISTÓRICO / REGISTRO
  // -------------------------------------------------------------
  const [logRpes, setLogRpes] = useState<Record<string, number>>({});

  const openLogWorkoutModal = (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita expandir o card
    setSelectedWorkoutForLog(workout);
    setLogDate(new Date().toISOString().split('T')[0]);
    
    // Inicializa cargas e RPEs
    const workoutExs = exercises.filter(ex => ex.workoutId === workout.id);
    const initialWeights: Record<string, number> = {};
    const initialRpes: Record<string, number> = {};
    workoutExs.forEach(ex => {
      initialWeights[ex.id] = ex.prWeight || 0;
      initialRpes[ex.id] = 8; // RPE padrão = 8
    });
    setLogWeights(initialWeights);
    setLogRpes(initialRpes);
    setIsLogModalOpen(true);
  };

  const handleSaveWorkoutLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkoutForLog) return;

    const workoutExs = exercises.filter(ex => ex.workoutId === selectedWorkoutForLog.id);
    const loggedExercises = workoutExs.map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      series: ex.series,
      repetitions: ex.repetitions,
      weight: logWeights[ex.id] || 0,
      rpe: logRpes[ex.id] || 8
    }));

    db.addWorkoutLog({
      workoutId: selectedWorkoutForLog.id,
      workoutName: selectedWorkoutForLog.name,
      date: logDate,
      exercises: loggedExercises
    });

    // Atualiza os PRs locais se a carga anotada for maior que o PR anterior e monitora se houve recorde
    let isNewPR = false;
    workoutExs.forEach(ex => {
      const weightLogged = logWeights[ex.id] || 0;
      if (weightLogged > ex.prWeight) {
        isNewPR = true;
        db.saveExercise({
          ...ex,
          prWeight: weightLogged
        });
      }
    });

    setIsLogModalOpen(false);
    setSelectedWorkoutForLog(null);
    refreshData();

    // Efeito festivo de confetes
    confetti({
      particleCount: 80,
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6']
    });

    if (isNewPR) {
      // Confete dourado duplo para celebrar o PR
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#fffbeb']
        });
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#fffbeb']
        });
      }, 300);
      alert('Treino registrado! 🏆 NOVO RECORDE PESSOAL (PR) DETECTADO! Continue evoluindo!');
    } else {
      alert('Treino registrado com sucesso!');
    }
  };

  const handleTemplateSelection = (templateType: 'hypertrophy' | 'power') => {
    if (window.confirm('Esta operação irá sobrescrever seus treinos e exercícios de demonstração padrão. Prosseguir?')) {
      // Limpa dados anteriores
      workouts.forEach(w => db.deleteWorkout(w.id));
      
      if (templateType === 'hypertrophy') {
        db.saveWorkout({ id: 'treino-a', name: 'Treino A (Puxar)', isTemplate: true });
        db.saveWorkout({ id: 'treino-b', name: 'Treino B (Empurrar)', isTemplate: true });
        db.saveWorkout({ id: 'treino-c', name: 'Treino C (Pernas)', isTemplate: true });

        // Treino A Exercícios
        db.saveExercise({ id: 'ex-a1', name: 'Puxada Alta (Barra)', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10-12', prWeight: 45, notes: '' });
        db.saveExercise({ id: 'ex-a2', name: 'Remada Baixa', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 50, notes: '' });
        db.saveExercise({ id: 'ex-a3', name: 'Rosca Direta HBL', muscleGroup: 'Bíceps', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 26, notes: 'Barra W' });
        db.saveExercise({ id: 'ex-a4', name: 'Rosca Martelo', muscleGroup: 'Bíceps', workoutId: 'treino-a', series: 3, repetitions: '12', prWeight: 12, notes: '' });
        db.saveExercise({ id: 'ex-a5', name: 'Panturrilha Gêmeos', muscleGroup: 'Panturrilha', workoutId: 'treino-a', series: 4, repetitions: '15', prWeight: 40, notes: '' });

        // Treino B Exercícios
        db.saveExercise({ id: 'ex-b1', name: 'Supino Reto HBL', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '8-10', prWeight: 70, notes: '' });
        db.saveExercise({ id: 'ex-b2', name: 'Supino Inclinado Halteres', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 24, notes: 'Cada halter' });
        db.saveExercise({ id: 'ex-b3', name: 'Tríceps Pulley Corda', muscleGroup: 'Tríceps', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 20, notes: '' });
        db.saveExercise({ id: 'ex-b4', name: 'Tríceps Testa HBL', muscleGroup: 'Tríceps', workoutId: 'treino-b', series: 3, repetitions: '10-12', prWeight: 22, notes: '' });
        db.saveExercise({ id: 'ex-b5', name: 'Abdominal Supra', muscleGroup: 'Abdominal', workoutId: 'treino-b', series: 4, repetitions: '20', prWeight: 0, notes: '' });

        // Treino C Exercícios
        db.saveExercise({ id: 'ex-c1', name: 'Agachamento Livre', muscleGroup: 'Quadríceps', workoutId: 'treino-c', series: 4, repetitions: '8', prWeight: 80, notes: 'Amplitude máxima' });
        db.saveExercise({ id: 'ex-c2', name: 'Leg Press 45', muscleGroup: 'Quadríceps', workoutId: 'treino-c', series: 4, repetitions: '10', prWeight: 180, notes: '' });
        db.saveExercise({ id: 'ex-c3', name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', workoutId: 'treino-c', series: 3, repetitions: '12', prWeight: 45, notes: '' });
        db.saveExercise({ id: 'ex-c4', name: 'Mesa Flexora', muscleGroup: 'Posteriores', workoutId: 'treino-c', series: 4, repetitions: '10', prWeight: 35, notes: '' });
        db.saveExercise({ id: 'ex-c5', name: 'Elevação Pélvica', muscleGroup: 'Glúteos', workoutId: 'treino-c', series: 3, repetitions: '10', prWeight: 60, notes: '' });
      } else if (templateType === 'power') {
        db.saveWorkout({ id: 'treino-a', name: 'Força A (Agachamento & Pernas)', isTemplate: true });
        db.saveWorkout({ id: 'treino-b', name: 'Força B (Supino & Braços)', isTemplate: true });
        db.saveWorkout({ id: 'treino-c', name: 'Força C (Levantamento Terra & Costas)', isTemplate: true });

        db.saveExercise({ id: 'ex-p1', name: 'Agachamento Barra', muscleGroup: 'Quadríceps', workoutId: 'treino-a', series: 5, repetitions: '5', prWeight: 100, notes: 'Foco em força' });
        db.saveExercise({ id: 'ex-p2', name: 'Supino Reto Barra', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 5, repetitions: '5', prWeight: 85, notes: 'Pausa no peito' });
        db.saveExercise({ id: 'ex-p3', name: 'Levantamento Terra', muscleGroup: 'Dorsal', workoutId: 'treino-c', series: 5, repetitions: '5', prWeight: 120, notes: 'Sem impulso' });
      }

      setIsTemplateModalOpen(false);
      refreshData();
      alert('Template carregado com sucesso!');
    }
  };

  // -------------------------------------------------------------
  // CÁLCULO DADOS COMPILADOS DE EXERCÍCIOS
  // -------------------------------------------------------------
  const exerciseStats = useMemo(() => {
    const stats: Record<string, { lastDate: string; daysAgo: number | string }> = {};

    exercises.forEach(ex => {
      const matchLogs = logs.filter(log => 
        log.workoutId === ex.workoutId && 
        log.exercises.some(le => le.name === ex.name)
      );

      if (matchLogs.length > 0) {
        const lastDateStr = matchLogs[0].date;
        const diffTime = Math.abs(new Date().getTime() - new Date(lastDateStr).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
        
        stats[ex.id] = {
          lastDate: lastDateStr.split('-').reverse().join('/'),
          daysAgo: diffDays
        };
      } else {
        stats[ex.id] = {
          lastDate: 'Não realizado',
          daysAgo: '-'
        };
      }
    });

    return stats;
  }, [exercises, logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabeçalho superior */}
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Treinos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie suas rotinas semanais, execute séries e veja o mapa de fadiga.</p>
        </div>

        <div className="workouts-header-actions">
          <button className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>
            <Copy size={16} />
            Modelos/Templates
          </button>
          <button className="btn btn-primary" onClick={() => setIsWorkoutModalOpen(true)}>
            <Plus size={16} />
            Criar Treino
          </button>
        </div>
      </header>

      {/* Abas */}
      <div className="workouts-tabs">
        <button 
          className={`workout-tab-btn ${activeSubTab === 'workouts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('workouts')}
        >
          Distribuição do planejamento
        </button>
        <button 
          className={`workout-tab-btn ${activeSubTab === 'musclemap' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('musclemap')}
        >
          Mapa e Frequência Muscular
        </button>
      </div>

      {activeSubTab === 'musclemap' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gráfico de Radar de Volume Semanal */}
          <section className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Award size={20} color="var(--accent-blue)" />
              Volume de Séries por Grupo Muscular
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Distribuição semanal de séries completadas nos últimos 7 dias comparada com a meta científica mínima (10 séries).
            </p>
            <div style={{ height: '320px', position: 'relative' }}>
              <Radar data={muscleVolumeData} options={radarOptions} />
            </div>
          </section>

          <section className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <AlertCircle size={20} color="var(--accent-emerald)" />
              Frequência de Grupos Musculares Trabalhados
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Os cards abaixo mostram o volume teórico nos treinos cadastrados (azul/roxo) e quantas vezes foram ativados no histórico de execuções (verde).
            </p>
            <MuscleMap />
          </section>
        </div>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {workouts.length > 0 && (
            <>
              {/* 1. Colapsável: Exercício Aeróbico */}
              <div className="glass-card collapsible-panel">
                <button 
                  className="collapsible-header"
                  onClick={() => setIsCardioExpanded(!isCardioExpanded)}
                >
                  <div className="header-left">
                    <Activity size={18} className="icon-blue" />
                    <span>Exercício aeróbico</span>
                  </div>
                  {isCardioExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isCardioExpanded && (
                  <div className="collapsible-content">
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Sugerido: 20 a 30 minutos de corrida moderada ou caminhada inclinada após a musculação, 3 vezes por semana. Mantém o condicionamento e auxilia na recuperação ativa de membros inferiores.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Colapsável: Observações */}
              <div className="glass-card collapsible-panel">
                <button 
                  className="collapsible-header"
                  onClick={() => setIsObsExpanded(!isObsExpanded)}
                >
                  <div className="header-left">
                    <FileText size={18} className="icon-purple" />
                    <span>Observações</span>
                  </div>
                  {isObsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isObsExpanded && (
                  <div className="collapsible-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <div>• Focar em cadência controlada (2s concêntrica, 3s excêntrica) para melhor ativação.</div>
                    <div>• Descanso sugerido: 60s a 90s entre séries normais; até 120s para agachamento e terra.</div>
                    <div>• Hidrate-se: beber no mínimo 500ml de água durante a sessão de treino.</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Listagem de Treinos Semanais (Inspirado no Prime) */}
          {workouts.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <Dumbbell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Nenhum treino criado. Comece criando um treino manual ou carregando um template pronto!</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => setIsWorkoutModalOpen(true)}>Criar Manualmente</button>
                <button className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>Carregar Template de Treino</button>
              </div>
            </div>
          ) : (
            <div className="workout-cards-list">
              {workouts.map((workout, index) => {
                const workoutExs = exercises.filter(e => e.workoutId === workout.id);
                
                // Calcula músculos trabalhados dinamicamente para o cabeçalho do card
                const workedMuscles = useMemo(() => {
                  if (workoutExs.length === 0) return 'Sem exercícios';
                  const muscles = Array.from(new Set(workoutExs.map(e => e.muscleGroup)));
                  return muscles.slice(0, 3).join(' • ') + (muscles.length > 3 ? '...' : '');
                }, [workoutExs]);

                const isExpanded = !!expandedWorkouts[workout.id];
                const suggestedDay = getSuggestedDay(workout.name, index);

                return (
                  <div 
                    key={workout.id} 
                    className={`workout-card-premium glass-card ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleWorkoutExercises(workout.id)}
                  >
                    <div className="premium-card-main">
                      <div className="premium-card-info">
                        <span className="suggested-day">{suggestedDay}</span>
                        <h2 className="workout-muscles">{workedMuscles}</h2>
                        
                        <div className="premium-card-footer">
                          <div className="team-indicator">
                            <div className="team-avatar">VS</div>
                            <span>Vida Saudável</span>
                          </div>
                        </div>
                      </div>

                      <div className="premium-card-actions">
                        <span className="workout-tag-pill">{workout.name}</span>
                        
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.85rem' }}>
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ height: '32px', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} 
                            onClick={(e) => openLogWorkoutModal(workout, e)}
                          >
                            Iniciar treino
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ height: '32px', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }} 
                            onClick={(e) => openAddExerciseModal(workout.id, e)}
                          >
                            + Add
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ height: '32px', padding: '0.35rem 0.5rem', color: '#ff6b6b' }} 
                            onClick={(e) => handleDeleteWorkout(workout.id, e)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Exercícios Expansíveis por dentro do card */}
                    {isExpanded && (
                      <div className="premium-card-exercises" onClick={(e) => e.stopPropagation()}>
                        <h3 className="exercises-title">Exercícios da Planilha ({workoutExs.length})</h3>
                        {workoutExs.length === 0 ? (
                          <p className="no-exercises-text">Nenhum exercício cadastrado. Clique em "+ Add" acima para adicionar.</p>
                        ) : (
                          <div className="table-container" style={{ marginTop: '0.5rem' }}>
                            <table className="custom-table">
                              <thead>
                                <tr>
                                  <th>Grupo</th>
                                  <th>Exercício</th>
                                  <th>Séries</th>
                                  <th>Reps</th>
                                  <th>PR Carga</th>
                                  <th>Último</th>
                                  <th>Dias</th>
                                  <th>Anotações</th>
                                  <th style={{ width: '80px' }}>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {workoutExs.map((ex) => {
                                  const stats = exerciseStats[ex.id] || { lastDate: '-', daysAgo: '-' };
                                  return (
                                    <tr key={ex.id}>
                                      <td>
                                        <span className={`badge ${muscleGroupsList.slice(0, 8).includes(ex.muscleGroup) ? 'badge-superior' : 'badge-inferior'}`}>
                                          {ex.muscleGroup}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 600 }}>{ex.name}</td>
                                      <td>{ex.series}</td>
                                      <td>{ex.repetitions}</td>
                                      <td>
                                        <span className="exercise-pr-tag">
                                          {ex.prWeight > 0 ? `${ex.prWeight} kg` : 'Sem peso'}
                                        </span>
                                      </td>
                                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.lastDate}</td>
                                      <td style={{ fontSize: '0.8rem', fontWeight: 600, color: stats.daysAgo === '-' ? 'var(--text-muted)' : (Number(stats.daysAgo) > 7 ? 'var(--accent-orange)' : 'var(--accent-emerald)') }}>
                                        {stats.daysAgo}
                                      </td>
                                      <td className="exercise-notes" title={ex.notes}>{ex.notes || '-'}</td>
                                      <td>
                                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                                          <button 
                                            className="btn btn-secondary" 
                                            style={{ padding: '0.25rem 0.4rem' }} 
                                            onClick={() => openEditExerciseModal(ex)}
                                          >
                                            <Edit3 size={11} />
                                          </button>
                                          <button 
                                            className="btn btn-secondary" 
                                            style={{ padding: '0.25rem 0.4rem', color: '#ff6b6b' }} 
                                            onClick={() => handleDeleteExercise(ex.id)}
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------
          MODAIS DE INTERFACE
         ------------------------------------------------------------- */}

      {/* Modal Criar Treino */}
      {isWorkoutModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Criar Novo Grupo de Treino</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsWorkoutModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleCreateWorkout}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="wName">Nome do Treino</label>
                  <input
                    id="wName"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Treino C, Treino de Pernas, Superior A"
                    value={newWorkoutName}
                    onChange={(e) => setNewWorkoutName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkoutModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Treino</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição Exercício */}
      {isExerciseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingExercise ? 'Editar Exercício' : 'Cadastrar Novo Exercício'}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsExerciseModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSaveExercise}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="exName">Nome do Exercício</label>
                  <input
                    id="exName"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Supino Reto, Agachamento, Rosca Direta"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label htmlFor="exMuscle">Grupo Muscular</label>
                    <select
                      id="exMuscle"
                      className="form-control"
                      value={exerciseForm.muscleGroup}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, muscleGroup: e.target.value })}
                    >
                      {muscleGroupsList.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="exWorkout">Treino Associado</label>
                    <select
                      id="exWorkout"
                      className="form-control"
                      value={exerciseForm.workoutId}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, workoutId: e.target.value })}
                      required
                    >
                      <option value="" disabled>Escolha um treino...</option>
                      {workouts.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="exSeries">Séries</label>
                    <input
                      id="exSeries"
                      type="number"
                      min="1"
                      max="12"
                      className="form-control"
                      value={exerciseForm.series}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, series: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exReps">Repetições</label>
                    <input
                      id="exReps"
                      type="text"
                      className="form-control"
                      placeholder="Ex: 10 ou 8-12"
                      value={exerciseForm.repetitions}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, repetitions: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exWeight">PR Peso (kg)</label>
                    <input
                      id="exWeight"
                      type="number"
                      min="0"
                      className="form-control"
                      value={exerciseForm.prWeight}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, prWeight: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="exNotes">Anotações / Instruções</label>
                  <textarea
                    id="exNotes"
                    className="form-control"
                    rows={2}
                    placeholder="Ex: Pegada aberta, cadência lenta..."
                    value={exerciseForm.notes}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExerciseModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingExercise ? 'Salvar Alterações' : 'Criar Exercício'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Iniciar / Concluir Treino (Anotar Cargas Executadas) */}
      {isLogModalOpen && selectedWorkoutForLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Registrar Execução: {selectedWorkoutForLog.name}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsLogModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSaveWorkoutLog}>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="logDate">Data da Conclusão</label>
                  <input 
                    id="logDate"
                    type="date" 
                    className="form-control" 
                    value={logDate} 
                    onChange={(e) => setLogDate(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '0.5rem 0' }}></div>
                
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anote as Cargas Concluídas (kg)</h4>
                
                {exercises.filter(ex => ex.workoutId === selectedWorkoutForLog.id).map(ex => (
                  <div key={ex.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.15)', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'left', flex: 1, minWidth: '150px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ex.series}x{ex.repetitions} • PR: {ex.prWeight > 0 ? `${ex.prWeight}kg` : 'Nenhum'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'left' }}>Peso (kg)</span>
                        <input 
                          type="number" 
                          min="0"
                          className="form-control" 
                          style={{ width: '80px', height: '36px', textAlign: 'center', padding: '0.25rem' }}
                          value={logWeights[ex.id] || ''}
                          onChange={(e) => setLogWeights({
                            ...logWeights,
                            [ex.id]: Number(e.target.value)
                          })}
                          placeholder="kg"
                        />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'left' }}>Esforço RPE</span>
                        <select 
                          className="form-control" 
                          style={{ width: '105px', height: '36px', fontSize: '0.75rem', padding: '0 0.25rem', background: 'var(--bg-card)' }}
                          value={logRpes[ex.id] || 8}
                          onChange={(e) => setLogRpes({
                            ...logRpes,
                            [ex.id]: Number(e.target.value)
                          })}
                        >
                          <option value="10">10 (Máximo)</option>
                          <option value="9">9 (1 Rep. Res.)</option>
                          <option value="8">8 (2 Rep. Res.)</option>
                          <option value="7">7 (3 Rep. Res.)</option>
                          <option value="6">6 (Aquecim.)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLogModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Treino Concluído</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modelos/Templates */}
      {isTemplateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Escolha um Modelo de Treino</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsTemplateModalOpen(false)}>X</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                Os templates pré-configurados preenchem sua planilha com treinos focados nos principais objetivos esportivos:
              </p>
              <div className="template-grid">
                <div className="template-card" onClick={() => handleTemplateSelection('hypertrophy')}>
                  <div className="template-card-title">Treino ABC (Hipertrofia)</div>
                  <div className="template-card-desc">Divisão clássica de Puxar (A), Empurrar (B) e Pernas (C) com exercícios compostos de alto volume.</div>
                </div>
                <div className="template-card" onClick={() => handleTemplateSelection('power')}>
                  <div className="template-card-title">Treino SL 5x5 (Força)</div>
                  <div className="template-card-desc">Focado em ganho absoluto de força com agachamento livre, supino reto e terra.</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
