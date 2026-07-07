import React, { useState, useMemo } from 'react';
import { db, type Exercise, type Workout, type WorkoutLog } from '../utils/db';
import { MuscleMap } from './Common/MuscleMap';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  Dumbbell, 
  Edit3, 
  AlertCircle
} from 'lucide-react';
import './Styles/workouts.css';

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

  const handleDeleteWorkout = (id: string) => {
    if (window.confirm('Deseja realmente deletar este treino e todos os seus exercícios associados?')) {
      db.deleteWorkout(id);
      refreshData();
    }
  };

  // -------------------------------------------------------------
  // HANDLERS DE EXERCÍCIO
  // -------------------------------------------------------------
  const openAddExerciseModal = (workoutId: string) => {
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

    const targetId = editingExercise ? editingExercise.id : `ex-${Date.now()}`;
    db.saveExercise({
      id: targetId,
      name: exerciseForm.name.trim(),
      muscleGroup: exerciseForm.muscleGroup,
      workoutId: exerciseForm.workoutId,
      series: Number(exerciseForm.series),
      repetitions: exerciseForm.repetitions,
      prWeight: Number(exerciseForm.prWeight),
      notes: exerciseForm.notes
    });

    setIsExerciseModalOpen(false);
    refreshData();
  };

  const handleDeleteExercise = (id: string) => {
    if (window.confirm('Deseja realmente excluir este exercício?')) {
      db.deleteExercise(id);
      refreshData();
    }
  };

  // -------------------------------------------------------------
  // REGISTRO DE TREINO EXECUTADO (LOG)
  // -------------------------------------------------------------
  const openLogWorkoutModal = (workout: Workout) => {
    setSelectedWorkoutForLog(workout);
    setLogDate(new Date().toISOString().split('T')[0]);
    
    // Inicializa pesos com PR atual de cada exercício
    const workoutExs = exercises.filter(e => e.workoutId === workout.id);
    const initialWeights: Record<string, number> = {};
    workoutExs.forEach(ex => {
      initialWeights[ex.id] = ex.prWeight || 0;
    });
    setLogWeights(initialWeights);
    setIsLogModalOpen(true);
  };

  const handleSaveWorkoutLog = () => {
    if (!selectedWorkoutForLog) return;

    const workoutExs = exercises.filter(e => e.workoutId === selectedWorkoutForLog.id);
    if (workoutExs.length === 0) {
      alert('Adicione pelo menos um exercício ao treino antes de registrá-lo.');
      return;
    }

    const logExercises = workoutExs.map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      series: ex.series,
      repetitions: ex.repetitions,
      weight: logWeights[ex.id] || 0
    }));

    db.addWorkoutLog({
      workoutId: selectedWorkoutForLog.id,
      workoutName: selectedWorkoutForLog.name,
      date: logDate,
      exercises: logExercises
    });

    setIsLogModalOpen(false);
    setSelectedWorkoutForLog(null);
    refreshData();
    alert('Treino registrado com sucesso! O histórico e os recordes de carga foram atualizados.');
  };

  // -------------------------------------------------------------
  // TEMPLATES PRÉ-DEFINIDOS (CARREGAMENTO)
  // -------------------------------------------------------------
  const loadDefaultTemplate = (templateType: 'abc' | 'power') => {
    if (window.confirm('Carregar este template irá substituir seus treinos atuais. Deseja continuar?')) {
      // Limpa dados atuais
      const currentWorkouts = db.getWorkouts();
      currentWorkouts.forEach(w => db.deleteWorkout(w.id));

      if (templateType === 'abc') {
        db.saveWorkout({ id: 'treino-a', name: 'Treino A (Costas & Bíceps)', isTemplate: true });
        db.saveWorkout({ id: 'treino-b', name: 'Treino B (Peito & Tríceps)', isTemplate: true });
        db.saveWorkout({ id: 'treino-c', name: 'Treino C (Pernas Completas)', isTemplate: true });

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
  // Agrupa logs para consulta rápida do "Último treino" e "Dias decorridos" por exercício
  const exerciseStats = useMemo(() => {
    const stats: Record<string, { lastDate: string; daysAgo: number | string }> = {};

    exercises.forEach(ex => {
      // Acha o log mais recente que tenha o nome do exercício
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
          lastDate: 'Ainda não realizado',
          daysAgo: '-'
        };
      }
    });

    return stats;
  }, [exercises, logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Módulo de Musculação
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie seus treinos, crie templates, e acompanhe o mapa de fadiga muscular.</p>
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
          Minha Planilha de Treinos
        </button>
        <button 
          className={`workout-tab-btn ${activeSubTab === 'musclemap' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('musclemap')}
        >
          Mapa e Frequência Muscular
        </button>
      </div>

      {activeSubTab === 'musclemap' ? (
        <section className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} color="var(--accent-emerald)" />
            Frequência de Grupos Musculares Trabalhados
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Os cards abaixo mostram o volume teórico nos treinos cadastrados (roxo) e quantas vezes foram ativados no histórico de execuções (verde).
          </p>
          <MuscleMap />
        </section>
      ) : (
        <section>
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
            workouts.map((workout) => {
              const workoutExs = exercises.filter(e => e.workoutId === workout.id);
              
              return (
                <div key={workout.id} className="glass-card workout-group-card" style={{ padding: '1.5rem' }}>
                  <div className="workout-group-header">
                    <div className="workout-group-title">
                      <Dumbbell size={20} color="var(--accent-emerald)" />
                      <span>{workout.name}</span>
                      <span className="workout-group-badge">{workoutExs.length} {workoutExs.length === 1 ? 'Exercício' : 'Exercícios'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openLogWorkoutModal(workout)}>
                        <Check size={14} color="var(--accent-emerald)" />
                        Iniciar/Concluir Treino
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openAddExerciseModal(workout.id)}>
                        <Plus size={14} />
                        Adicionar Exercício
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', color: '#ff6b6b' }} onClick={() => handleDeleteWorkout(workout.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {workoutExs.length === 0 ? (
                    <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                      Nenhum exercício cadastrado para este treino. Clique em "Adicionar Exercício" acima.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Grupo Muscular</th>
                            <th>Exercício</th>
                            <th>Séries</th>
                            <th>Repetições</th>
                            <th>PR Peso (Carga Máx)</th>
                            <th>Último Treino</th>
                            <th>Dias decorridos</th>
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
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stats.lastDate}</td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 600, color: stats.daysAgo === '-' ? 'var(--text-muted)' : (Number(stats.daysAgo) > 7 ? 'var(--accent-orange)' : 'var(--accent-emerald)') }}>
                                  {stats.daysAgo}
                                </td>
                                <td className="exercise-notes" title={ex.notes}>{ex.notes || '-'}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.3rem 0.5rem' }} 
                                      onClick={() => openEditExerciseModal(ex)}
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.3rem 0.5rem', color: '#ff6b6b' }} 
                                      onClick={() => handleDeleteExercise(ex.id)}
                                    >
                                      <Trash2 size={12} />
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
              );
            })
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
                <button type="submit" className="btn btn-primary">Salvar Exercício</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modelos/Templates */}
      {isTemplateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Modelos de Ficha de Treino</h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsTemplateModalOpen(false)}>X</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Selecione um modelo pré-configurado para inicializar seu cronograma instantaneamente. Isso apagará sua lista de treinos atual!
              </p>
              
              <div className="template-grid">
                <div className="template-card" onClick={() => loadDefaultTemplate('abc')}>
                  <div className="template-card-title">Divisão ABC (Hipertrofia)</div>
                  <div className="template-card-desc">Ficha padrão para 3 dias na semana. Peito/Tríceps, Costas/Bíceps e Pernas.</div>
                </div>

                <div className="template-card" onClick={() => loadDefaultTemplate('power')}>
                  <div className="template-card-title">Treino de Força (5x5)</div>
                  <div className="template-card-desc">Focado em Levantamento Terra, Supino Reto e Agachamento Livre para ganho de força.</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(false)}>Voltar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Iniciar/Concluir Treino (Lançar Log) */}
      {isLogModalOpen && selectedWorkoutForLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Dumbbell size={20} color="var(--accent-emerald)" />
                Registrar Execução: {selectedWorkoutForLog.name}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsLogModalOpen(false)}>X</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="logDate">Data da Execução</label>
                <input
                  id="logDate"
                  type="date"
                  className="form-control"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  required
                />
              </div>

              <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
                Exercícios Realizados & Cargas
              </h4>

              {exercises.filter(e => e.workoutId === selectedWorkoutForLog.id).map(ex => (
                <div key={ex.id} className="flex-between" style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ex.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.series}x{ex.repetitions} • PR atual: {ex.prWeight}kg</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      style={{ width: '80px', padding: '0.4rem 0.6rem', textAlign: 'center' }}
                      value={logWeights[ex.id] ?? 0}
                      onChange={(e) => setLogWeights({ ...logWeights, [ex.id]: Number(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>kg</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsLogModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveWorkoutLog}>Concluir & Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
