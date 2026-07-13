import React, { useState, useMemo, useEffect } from 'react';
import { db, type Exercise, type Workout, type WorkoutLog } from '../utils/db';
import { MuscleMap, normalizeMuscleName } from './Common/MuscleMap';
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
  Award,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Styles/workouts.css';

class TabErrorBoundary extends React.Component<any, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("TabErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'left', background: 'rgba(255, 0, 0, 0.08)', borderRadius: '12px', border: '1px solid rgba(255, 0, 0, 0.2)', margin: '1rem 0' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>⚠️ Ocorreu um erro ao renderizar o Mapa Muscular</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Para nos ajudar a corrigir, por favor tire um print ou copie o erro abaixo:
          </p>
          <pre style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'monospace', color: '#fca5a5' }}>
            {this.state.error?.toString()}
            {"\n\nStack Trace:\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

class SafeMuscleMap extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("SafeMuscleMap caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center', background: 'rgba(255,0,0,0.05)', borderRadius: '8px' }}>
          Ocorreu um erro ao renderizar as imagens do mapa muscular. Tente reiniciar seu navegador.
        </div>
      );
    }
    return <MuscleMap {...this.props} />;
  }
}

const processImageForTransparency = (base64Str: string, maxSize: number = 800): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Amostra a cor de fundo nos 4 cantos
      const getPixelColor = (x: number, y: number) => {
        const idx = (y * width + x) * 4;
        return { r: data[idx], g: data[idx+1], b: data[idx+2] };
      };

      const corners = [
        getPixelColor(0, 0),
        getPixelColor(width - 1, 0),
        getPixelColor(0, height - 1),
        getPixelColor(width - 1, height - 1)
      ];

      // Média aritmética das cores dos cantos
      let bgR = 0, bgG = 0, bgB = 0;
      corners.forEach(c => {
        bgR += c.r;
        bgG += c.g;
        bgB += c.b;
      });
      bgR = Math.round(bgR / 4);
      bgG = Math.round(bgG / 4);
      bgB = Math.round(bgB / 4);

      // Limiar do Chroma-keying (35 é ideal para fundo escuro, suporta também fundo branco)
      const threshold = 35;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];

        const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);

        if (dist < threshold) {
          // Suavização das bordas com canal alfa progressivo
          const alpha = Math.round((dist / threshold) * 255);
          data[i+3] = dist < (threshold * 0.5) ? 0 : alpha;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

// Helper para extrair o ID de vídeo do YouTube e retornar o link de embed
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return null;
}

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

  // Cálculo de volume semanal (séries executadas nos últimos 7 dias) por grupo muscular
  const muscleVolumeList = useMemo(() => {
    const muscles = [
      'Peitoral', 'Dorsal', 'Trapézio', 'Deltóide', 'Bíceps', 'Tríceps',
      'Antebraço', 'Abdominal', 'Quadríceps', 'Glúteos', 'Posteriores', 'Panturrilha'
    ];
    
    const volume: Record<string, number> = {};
    muscles.forEach(m => { volume[m] = 0; });

    try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const safeLogs = Array.isArray(logs) ? logs : [];
      safeLogs.forEach(log => {
        if (log && log.date && Array.isArray(log.exercises)) {
          const logDateObj = new Date(log.date);
          if (logDateObj && !isNaN(logDateObj.getTime()) && logDateObj >= sevenDaysAgo) {
            log.exercises.forEach(ex => {
              if (ex && ex.muscleGroup) {
                const groups = ex.muscleGroup.split(',').map(m => normalizeMuscleName(m.trim())).filter(Boolean);
                groups.forEach(group => {
                  if (volume[group] !== undefined) {
                    volume[group] += Number(ex.series) || 0;
                  }
                });
              }
            });
          }
        }
      });
    } catch (err) {
      console.error("Erro no cálculo do volume muscular:", err);
    }

    return muscles.map(m => ({
      name: m,
      count: volume[m],
      target: 10,
      pct: Math.min(100, Math.round((volume[m] / 10) * 100))
    }));
  }, [logs]);

  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedExerciseForView, setSelectedExerciseForView] = useState<Exercise | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    muscleGroup: 'Peitoral',
    workoutId: '',
    series: 4,
    repetitions: '10',
    prWeight: 0,
    notes: '',
    executionType: 'reps',
    instructions: '',
    image: '',
    videoUrl: ''
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

  // Migração automática de imagens existentes para PNG transparente de alta resolução
  useEffect(() => {
    const migrateImages = async () => {
      const allExercises = db.getExercises();
      let updatedAny = false;

      for (const ex of allExercises) {
        if (ex.image && (ex.image.includes('image/jpeg') || !ex.image.includes('image/png'))) {
          try {
            const transparentImage = await processImageForTransparency(ex.image, 800);
            db.saveExercise({
              ...ex,
              image: transparentImage
            });
            updatedAny = true;
          } catch (err) {
            console.error('Erro ao converter imagem do exercício:', ex.name, err);
          }
        }
      }

      if (updatedAny) {
        setExercises(db.getExercises());
      }
    };

    migrateImages();
  }, []);

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
      notes: '',
      executionType: 'reps',
      instructions: '',
      image: '',
      videoUrl: ''
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
      notes: exercise.notes,
      executionType: exercise.executionType || 'reps',
      instructions: exercise.instructions || '',
      image: exercise.image || '',
      videoUrl: exercise.videoUrl || ''
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
      notes: exerciseForm.notes,
      executionType: exerciseForm.executionType as 'reps' | 'time',
      instructions: exerciseForm.instructions,
      image: exerciseForm.image,
      videoUrl: exerciseForm.videoUrl
    });

    setIsExerciseModalOpen(false);
    setEditingExercise(null);
    refreshData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Src = event.target?.result as string;
        try {
          // Processa a imagem para deixá-la transparente e em alta resolução (máx 800px)
          const transparentPng = await processImageForTransparency(base64Src, 800);
          setExerciseForm(prev => ({ ...prev, image: transparentPng }));
        } catch (err) {
          console.error('Erro ao processar imagem:', err);
          setExerciseForm(prev => ({ ...prev, image: base64Src }));
        }
      };
      reader.readAsDataURL(file);
    }
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
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Record<string, boolean>>({});

  const openLogWorkoutModal = (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita expandir o card
    setSelectedWorkoutForLog(workout);
    setLogDate(new Date().toISOString().split('T')[0]);
    
    // Inicializa cargas, RPEs e exercícios concluídos
    const workoutExs = exercises.filter(ex => ex.workoutId === workout.id);
    const initialWeights: Record<string, number> = {};
    const initialRpes: Record<string, number> = {};
    const initialCompleted: Record<string, boolean> = {};
    workoutExs.forEach(ex => {
      initialWeights[ex.id] = ex.prWeight || 0;
      initialRpes[ex.id] = 8; // RPE padrão = 8
      initialCompleted[ex.id] = true; // Por padrão, todos começam como marcados (realizados)
    });
    setLogWeights(initialWeights);
    setLogRpes(initialRpes);
    setCompletedExerciseIds(initialCompleted);
    setIsLogModalOpen(true);
  };

  const handleSaveWorkoutLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkoutForLog) return;

    const workoutExs = exercises.filter(ex => ex.workoutId === selectedWorkoutForLog.id);
    const activeWorkoutExs = workoutExs.filter(ex => completedExerciseIds[ex.id]);

    if (activeWorkoutExs.length === 0) {
      alert("Selecione pelo menos um exercício realizado para registrar o treino!");
      return;
    }

    const loggedExercises = activeWorkoutExs.map(ex => ({
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

    // Atualiza os PRs locais apenas dos exercícios efetivamente executados se a carga anotada for maior que o PR anterior
    let isNewPR = false;
    activeWorkoutExs.forEach(ex => {
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
        <TabErrorBoundary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Grade de Progresso de Volume Semanal */}
            <section className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <Award size={20} color="var(--accent-blue)" />
                Volume de Séries por Grupo Muscular (Últimos 7 dias)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Meta científica recomendada: mínimo de **10 séries semanais** por grupo muscular para estímulo hipertrófico ideal.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {muscleVolumeList.map((m) => {
                  const isTargetMet = m.count >= m.target;
                  return (
                    <div key={m.name} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{m.name}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isTargetMet ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                          {m.count} / {m.target} séries
                        </span>
                      </div>
                      
                      <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${m.pct}%`, 
                          background: isTargetMet 
                            ? 'linear-gradient(90deg, #10b981, #059669)' 
                            : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                          boxShadow: isTargetMet 
                            ? '0 0 8px rgba(16, 185, 129, 0.6)' 
                            : '0 0 8px rgba(59, 130, 246, 0.4)',
                          borderRadius: '99px',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        <span>{m.pct}% da meta</span>
                        {isTargetMet ? (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Atingida! 🔥</span>
                        ) : (
                          <span>Faltam {Math.max(0, m.target - m.count)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <SafeMuscleMap />
            </section>
          </div>
        </TabErrorBoundary>
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
                const musclesUnique = Array.from(
                  new Set(
                    workoutExs.flatMap(e => e.muscleGroup ? e.muscleGroup.split(',').map(m => m.trim()) : []).filter(Boolean)
                  )
                );
                const workedMuscles = musclesUnique.length === 0 
                  ? 'Sem exercícios' 
                  : musclesUnique.slice(0, 3).join(' • ') + (musclesUnique.length > 3 ? '...' : '');

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
                                  <th>Reps/Tempo</th>
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
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                          {ex.muscleGroup.split(',').map(m => {
                                            const trimmed = m.trim();
                                            return (
                                              <span key={trimmed} className={`badge ${muscleGroupsList.slice(0, 8).includes(trimmed) ? 'badge-superior' : 'badge-inferior'}`}>
                                                {trimmed}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </td>
                                      <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <button 
                                            type="button"
                                            onClick={() => setSelectedExerciseForView(ex)}
                                            style={{ background: 'none', border: 'none', color: '#ffffff', font: 'inherit', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline', textAlign: 'left' }}
                                            title="Ver detalhes do exercício"
                                          >
                                            {ex.name}
                                          </button>
                                          {(ex.instructions || ex.image || ex.videoUrl) && (
                                            <span style={{ display: 'inline-flex', cursor: 'pointer' }} onClick={() => setSelectedExerciseForView(ex)} title={ex.videoUrl ? "Possui vídeo demonstrativo" : "Possui guia de execução"}>
                                              <Eye size={12} color="#3b82f6" />
                                            </span>
                                          )}
                                        </div>
                                      </td>
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
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {!editingExercise && (
                  <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
                    <label htmlFor="exCopier" style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>Copiar de um Exercício Existente?</label>
                    <select
                      id="exCopier"
                      className="form-control"
                      style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}
                      value=""
                      onChange={(e) => {
                        const selectedEx = exercises.find(ex => ex.id === e.target.value);
                        if (selectedEx) {
                          setExerciseForm(prev => ({
                            ...prev,
                            name: selectedEx.name,
                            muscleGroup: selectedEx.muscleGroup,
                            series: selectedEx.series,
                            repetitions: selectedEx.repetitions,
                            prWeight: selectedEx.prWeight,
                            notes: selectedEx.notes,
                            executionType: selectedEx.executionType || 'reps',
                            instructions: selectedEx.instructions || '',
                            image: selectedEx.image || '',
                            videoUrl: selectedEx.videoUrl || ''
                          }));
                        }
                      }}
                      disabled={exercises.length === 0}
                    >
                      {exercises.length === 0 ? (
                        <option value="">Nenhum exercício cadastrado no sistema para copiar</option>
                      ) : (
                        <>
                          <option value="">-- Selecione para preencher automaticamente --</option>
                          {Array.from(new Map(exercises.map(ex => [ex.name, ex])).values()).map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscleGroup})</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                )}

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

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Grupo(s) Muscular(es) (Selecione um ou mais)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {muscleGroupsList.map(g => {
                      const activeMuscles = exerciseForm.muscleGroup ? exerciseForm.muscleGroup.split(',').map(m => m.trim()) : [];
                      const isActive = activeMuscles.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          className={`muscle-chip ${isActive ? 'active' : ''}`}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '99px',
                            fontSize: '0.8rem',
                            border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                            background: isActive ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                            color: isActive ? '#60a5fa' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: isActive ? 600 : 400,
                          }}
                          onClick={() => {
                            let newMuscles: string[];
                            if (isActive) {
                              newMuscles = activeMuscles.filter(m => m !== g);
                              if (newMuscles.length === 0) newMuscles = [g];
                            } else {
                              newMuscles = [...activeMuscles, g];
                            }
                            setExerciseForm({ ...exerciseForm, muscleGroup: newMuscles.join(', ') });
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Tipo de Execução</label>
                  <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="executionType"
                        value="reps"
                        checked={exerciseForm.executionType === 'reps'}
                        onChange={() => setExerciseForm({ ...exerciseForm, executionType: 'reps' })}
                      />
                      Repetições
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="executionType"
                        value="time"
                        checked={exerciseForm.executionType === 'time'}
                        onChange={() => setExerciseForm({ ...exerciseForm, executionType: 'time' })}
                      />
                      Tempo (Duração)
                    </label>
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
                    <label htmlFor="exReps">
                      {exerciseForm.executionType === 'time' ? 'Tempo (ex: 30s)' : 'Repetições'}
                    </label>
                    <input
                      id="exReps"
                      type="text"
                      className="form-control"
                      placeholder={exerciseForm.executionType === 'time' ? 'Ex: 30s' : 'Ex: 10 ou 8-12'}
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
                  <label htmlFor="exInstructions">Instruções Passo a Passo</label>
                  <textarea
                    id="exInstructions"
                    className="form-control"
                    rows={3}
                    placeholder="Descreva o passo a passo da execução do movimento..."
                    value={exerciseForm.instructions}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, instructions: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="exImage">Imagem Demonstrativa (Guia Visual)</label>
                  <input
                    id="exImage"
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleImageUpload}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {exerciseForm.image && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <img 
                        src={exerciseForm.image} 
                        alt="Preview" 
                        style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '4px' }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '0.25rem 0.5rem', color: '#ff6b6b', fontSize: '0.75rem' }}
                        onClick={() => setExerciseForm(prev => ({ ...prev, image: '' }))}
                      >
                        Remover Imagem
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="exVideoUrl">Link do Vídeo Demonstrativo (YouTube)</label>
                  <input
                    id="exVideoUrl"
                    type="url"
                    className="form-control"
                    placeholder="Ex: https://www.youtube.com/watch?v=s8Yy1J6XGis"
                    value={exerciseForm.videoUrl}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, videoUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="exNotes">Observações Adicionais</label>
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
                
                {exercises.filter(ex => ex.workoutId === selectedWorkoutForLog.id).map(ex => {
                  const isCompleted = !!completedExerciseIds[ex.id];
                  return (
                    <div 
                      key={ex.id} 
                      className="flex-between" 
                      style={{ 
                        background: isCompleted ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.01)', 
                        padding: '0.65rem 1rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-subtle)', 
                        flexWrap: 'wrap', 
                        gap: '0.75rem',
                        opacity: isCompleted ? 1 : 0.45,
                        transition: 'all 0.25s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '150px' }}>
                        <input
                          type="checkbox"
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--accent-blue)',
                          }}
                          checked={isCompleted}
                          onChange={(e) => setCompletedExerciseIds({
                            ...completedExerciseIds,
                            [ex.id]: e.target.checked
                          })}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: isCompleted ? 'none' : 'line-through', color: isCompleted ? '#ffffff' : 'var(--text-muted)' }}>{ex.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ex.series}x{ex.repetitions} • PR: {ex.prWeight > 0 ? `${ex.prWeight}kg` : 'Nenhum'}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'left' }}>Peso (kg)</span>
                          <input 
                            type="number" 
                            min="0"
                            className="form-control" 
                            style={{ width: '80px', height: '36px', textAlign: 'center', padding: '0.25rem', background: isCompleted ? '' : 'rgba(0,0,0,0.2)' }}
                            value={logWeights[ex.id] || ''}
                            onChange={(e) => setLogWeights({
                              ...logWeights,
                              [ex.id]: Number(e.target.value)
                            })}
                            placeholder="kg"
                            disabled={!isCompleted}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'left' }}>Esforço RPE</span>
                          <select 
                            className="form-control" 
                            style={{ width: '105px', height: '36px', fontSize: '0.75rem', padding: '0 0.25rem', background: isCompleted ? 'var(--bg-card)' : 'rgba(0,0,0,0.2)' }}
                            value={logRpes[ex.id] || 8}
                            onChange={(e) => setLogRpes({
                              ...logRpes,
                              [ex.id]: Number(e.target.value)
                            })}
                            disabled={!isCompleted}
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
                  );
                })}
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

      {/* Modal Visualizar Detalhes do Exercício */}
      {selectedExerciseForView && (
        <div className="modal-overlay" onClick={() => setSelectedExerciseForView(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="var(--accent-blue)" />
                Detalhes do Exercício
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setSelectedExerciseForView(null)}>X</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
              <div>
                <h4 style={{ fontSize: '1.35rem', margin: '0 0 0.25rem 0', color: '#ffffff' }}>{selectedExerciseForView.name}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {selectedExerciseForView.muscleGroup.split(',').map(m => {
                    const trimmed = m.trim();
                    return (
                      <span key={trimmed} className={`badge ${muscleGroupsList.slice(0, 8).includes(trimmed) ? 'badge-superior' : 'badge-inferior'}`}>
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Séries e Execução</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginTop: '0.15rem' }}>
                    {selectedExerciseForView.series} séries x {selectedExerciseForView.repetitions}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recorde Pessoal (PR)</span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-blue)', marginTop: '0.15rem' }}>
                    {selectedExerciseForView.prWeight > 0 ? `${selectedExerciseForView.prWeight} kg` : 'Sem registro'}
                  </div>
                </div>
              </div>

              {selectedExerciseForView.instructions && (
                <div>
                  <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>Instruções de Execução</h5>
                  <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedExerciseForView.instructions}
                  </p>
                </div>
              )}

              {selectedExerciseForView.image && (
                <div>
                  <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>Guia Visual</h5>
                  <img 
                    src={selectedExerciseForView.image} 
                    alt={`Guia de execução para ${selectedExerciseForView.name}`}
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '8px' }} 
                  />
                </div>
              )}

              {selectedExerciseForView.videoUrl && (
                (() => {
                  const embedUrl = getYouTubeEmbedUrl(selectedExerciseForView.videoUrl);
                  if (!embedUrl) return null;
                  return (
                    <div>
                      <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>Vídeo Demonstrativo</h5>
                      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <iframe
                          src={embedUrl}
                          title={`Vídeo demonstrativo de ${selectedExerciseForView.name}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        />
                      </div>
                    </div>
                  );
                })()
              )}

              {selectedExerciseForView.notes && !selectedExerciseForView.instructions && (
                <div>
                  <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>Anotações</h5>
                  <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0 }}>{selectedExerciseForView.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedExerciseForView(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
