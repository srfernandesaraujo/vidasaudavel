import React, { useState, useMemo, useEffect } from 'react';
import { db, type RunLog, type BodyCompLog, type RunningPlan, type RunningPlanWeekDay, type UserSettings } from '../utils/db';
import { generateRunningPlan, type RunningPlanRequest } from '../utils/aiEngine';
import { RunPlanOnboarding, type RunOnboardingForm } from './RunPlanOnboarding';
import { 
  Footprints, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Heart, 
  Flame, 
  Clock, 
  Activity,
  Award,
  Edit2,
  Calendar,
  CalendarClock,
  List,
  Printer,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Watch,
  X
} from 'lucide-react';
import { Chart as ChartJS, registerables, type ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import confetti from 'canvas-confetti';
import './Styles/runtracker.css';

// Registra módulos do Chart.js
ChartJS.register(...registerables);

const parseTrainingText = (text: string) => {
  const lines = text.split('\n');
  let title = '';
  let warmUp = '';
  let mainSet = '';
  let coolDown = '';
  let coachTip = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('⚡') || trimmed.startsWith('📈') || trimmed.startsWith('🏃‍♂️') || trimmed.startsWith('🏆')) {
      title = trimmed;
    } else if (trimmed.toLowerCase().includes('desaquecimento:')) {
      // Precisa ser checado antes de "aquecimento:", já que "desaquecimento" contém esse texto como substring
      coolDown = trimmed.replace(/^-\s*desaquecimento:\s*/i, '').replace(/^desaquecimento:\s*/i, '');
    } else if (trimmed.toLowerCase().includes('aquecimento:')) {
      warmUp = trimmed.replace(/^-\s*aquecimento:\s*/i, '').replace(/^aquecimento:\s*/i, '');
    } else if (trimmed.toLowerCase().includes('parte principal:')) {
      mainSet = trimmed.replace(/^-\s*parte principal:\s*/i, '').replace(/^parte principal:\s*/i, '');
    } else if (trimmed.toLowerCase().includes('dica do treinador:')) {
      coachTip = trimmed.replace(/^-\s*dica do treinador:\s*/i, '').replace(/^dica do treinador:\s*/i, '');
    }
  });

  // Se não bater no parser (ex: planos antigos ou gerados por IA de outra forma), retorna a string original formatada
  if (!warmUp && !mainSet && !coolDown) {
    return { isParsed: false, title: '', warmUp: '', mainSet: '', coolDown: '', coachTip: '', rawText: text };
  }

  return {
    isParsed: true,
    title,
    warmUp,
    mainSet,
    coolDown,
    coachTip,
    rawText: text
  };
};

export const RunTracker: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'runs' | 'bodycomp'>('runs');
  const [runLogs, setRunLogs] = useState<RunLog[]>(db.getRunLogs());
  const [bodyCompLogs, setBodyCompLogs] = useState<BodyCompLog[]>(db.getBodyCompLogs());

  // Configurações do perfil e zonas cardíacas
  const settings = db.getSettings();
  const age = settings.age || 30;
  const rhr = settings.restingHeartRate || 60;
  
  // Fórmula de Karvonen
  const mhr = 220 - age;
  const hrr = mhr - rhr;

  const hrZones = useMemo(() => {
    return {
      z1: { min: Math.round(rhr + 0.50 * hrr), max: Math.round(rhr + 0.60 * hrr) },
      z2: { min: Math.round(rhr + 0.60 * hrr), max: Math.round(rhr + 0.70 * hrr) },
      z3: { min: Math.round(rhr + 0.70 * hrr), max: Math.round(rhr + 0.80 * hrr) },
      z4: { min: Math.round(rhr + 0.80 * hrr), max: Math.round(rhr + 0.90 * hrr) },
      z5: { min: Math.round(rhr + 0.90 * hrr), max: mhr }
    };
  }, [age, rhr, hrr, mhr]);

  // Fórmula de Riegel para estimativa de tempos de corrida
  const referenceRun = useMemo(() => {
    if (!runLogs || runLogs.length === 0) {
      return { distance: 5.0, time: 25.0, isDefault: true }; // Padrão: 5k em 25min
    }
    // Seleciona a corrida com maior distância como base confiável
    const sortedByDist = [...runLogs].sort((a, b) => b.distance - a.distance);
    const best = sortedByDist[0];
    return { distance: best.distance, time: best.time, isDefault: false };
  }, [runLogs]);

  const riegelProjections = useMemo(() => {
    const { distance: d1, time: t1 } = referenceRun;
    const project = (d2: number) => t1 * Math.pow(d2 / d1, 1.06);

    return [
      { name: '5 km', dist: 5.0, time: project(5.0) },
      { name: '10 km', dist: 10.0, time: project(10.0) },
      { name: 'Meia Maratona (21.1k)', dist: 21.1, time: project(21.1) },
      { name: 'Maratona (42.2k)', dist: 42.2, time: project(42.2) }
    ];
  }, [referenceRun]);

  const formatProjectedTime = (minutesDecimal: number) => {
    const totalSeconds = Math.round(minutesDecimal * 60);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  };
  
  // Modais
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isBodyModalOpen, setIsBodyModalOpen] = useState(false);
  const [editingBodyLogId, setEditingBodyLogId] = useState<string | null>(null);

  // Planilha de Corrida IA — suporta múltiplas planilhas ativas (uma por distância)
  const [activePlans, setActivePlans] = useState<RunningPlan[]>(db.getActiveRunningPlans());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => activePlans[0]?.id || null);
  const runningPlan = useMemo(
    () => activePlans.find(p => p.id === selectedPlanId) ?? activePlans[0] ?? null,
    [activePlans, selectedPlanId]
  );
  const getPlanBaseDate = (plan: RunningPlan) => plan.startDate ? new Date(plan.startDate + 'T00:00:00') : new Date(plan.createdAt);

  const updatePlanInState = (plan: RunningPlan) => {
    db.saveRunningPlan(plan);
    setActivePlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [...prev, plan];
    });
    setSelectedPlanId(plan.id);
  };

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [wizardMode, setWizardMode] = useState<'new' | 'adjust'>('new');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });

  const formatMinutesToPace = (totalMinutes: number): string => {
    const m = Math.floor(totalMinutes);
    const s = Math.round((totalMinutes - m) * 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const buildOnboardingInitialForm = (): RunOnboardingForm => {
    const s = db.getSettings();
    const birthParts = s.birthDate ? s.birthDate.split('-') : ['', '', ''];
    const seedPlan = wizardMode === 'adjust' ? runningPlan : null;
    const suggestedPace = referenceRun && referenceRun.distance > 0
      ? formatMinutesToPace(referenceRun.time / referenceRun.distance)
      : '06:00';
    return {
      goalType: seedPlan?.goalType || '',
      skillLevel: s.runningSkillLevel || '',
      injuryHistory: s.injuryHistory || '',
      birthDay: birthParts[2] ? String(Number(birthParts[2])) : '',
      birthMonth: birthParts[1] ? String(Number(birthParts[1])) : '',
      birthYear: birthParts[0] || '',
      gender: s.gender || '',
      availableDays: s.availableRunDays && s.availableRunDays.length > 0 ? s.availableRunDays : ['segunda', 'quarta', 'sabado'],
      referencePace: seedPlan?.referencePace || suggestedPace,
      daysPerWeek: '3',
      targetDistance: seedPlan ? String(seedPlan.targetDistance) : '5',
      weeksCount: seedPlan ? String(seedPlan.weeksCount) : '4',
      longRunDay: 'sabado',
      startDateOption: 'hoje',
      customStartDate: '',
      hasWearable: seedPlan?.hasWearable || false,
      maxHeartRate: seedPlan?.maxHeartRate ? String(seedPlan.maxHeartRate) : '190',
      replaceExisting: false
    };
  };

  // Controle de Visualização do Calendário e Modal de Detalhes
  const [planViewMode, setPlanViewMode] = useState<'calendar' | 'weeks'>('calendar');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(() => {
    const plan = db.getActiveRunningPlans()[0];
    return plan ? getPlanBaseDate(plan) : new Date();
  });

  useEffect(() => {
    if (runningPlan) {
      setCurrentCalendarMonth(getPlanBaseDate(runningPlan));
    }
  }, [runningPlan]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{
    dateStr: string;
    planDay?: RunningPlanWeekDay;
    weekNumber?: number;
    dayIndex?: number;
    runs?: RunLog[];
  } | null>(null);

  // Ajuste de Data Inicial e Drag & Drop
  const [isStartDateModalOpen, setIsStartDateModalOpen] = useState(false);
  const [startDateInputValue, setStartDateInputValue] = useState('');

  // Formulário para registrar corrida pelo calendário
  const [isLogFromCalendarOpen, setIsLogFromCalendarOpen] = useState(false);
  const [logFromCalendarData, setLogFromCalendarData] = useState({
    time: 30,
    distance: 5.0,
    heartRate: 140,
    calories: 300,
    notes: ''
  });

  // Mapeia os dias do plano para datas reais no formato YYYY-MM-DD
  const planDaysByDate = useMemo(() => {
    const mapping: Record<string, { weekNumber: number; dayIndex: number; day: RunningPlanWeekDay }> = {};
    if (!runningPlan) return mapping;

    const planDate = getPlanBaseDate(runningPlan);

    runningPlan.weeks.forEach((week) => {
      week.days.forEach((day, dIdx) => {
        let dateStr = day.date;

        if (!dateStr) {
          const d = new Date(planDate);
          d.setDate(planDate.getDate() + ((week.weekNumber - 1) * 7 + dIdx));
          
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dateStr = `${yyyy}-${mm}-${dd}`;
        }
        
        mapping[dateStr] = {
          weekNumber: week.weekNumber,
          dayIndex: dIdx,
          day
        };
      });
    });

    return mapping;
  }, [runningPlan]);

  // Agrupa as corridas reais realizadas no histórico por data YYYY-MM-DD
  const runsByDate = useMemo(() => {
    const mapping: Record<string, RunLog[]> = {};
    runLogs.forEach((run) => {
      if (!mapping[run.date]) {
        mapping[run.date] = [];
      }
      mapping[run.date].push(run);
    });
    return mapping;
  }, [runLogs]);

  // Dias a serem desenhados na grade do calendário mensal
  const calendarDays = useMemo(() => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    // Primeiro dia do mês
    const firstDayOfMonth = new Date(year, month, 1);
    // Dia da semana do primeiro dia (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    let firstDayOfWeek = firstDayOfMonth.getDay();
    // Ajusta para segunda-feira como início da semana (0 = Segunda, ..., 6 = Domingo)
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Número de dias no mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Preenche os dias do mês anterior
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      days.push({ date: prevDate, isCurrentMonth: false, dateStr });
    }

    // Preenche os dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ date: currDate, isCurrentMonth: true, dateStr });
    }

    // Preenche os dias do próximo mês para completar a grade de 7 colunas (geralmente até 35 ou 42 dias no total)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const nextDaysCount = totalSlots - days.length;
    for (let i = 1; i <= nextDaysCount; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      days.push({ date: nextDate, isCurrentMonth: false, dateStr });
    }

    return days;
  }, [currentCalendarMonth]);

  const getDayDateStr = (weekNumber: number, dIdx: number, day: RunningPlanWeekDay) => {
    if (day.date) return day.date;
    if (!runningPlan) return '';
    const planDate = getPlanBaseDate(runningPlan);
    const d = new Date(planDate);
    d.setDate(planDate.getDate() + ((weekNumber - 1) * 7 + dIdx));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDragStart = (e: React.DragEvent, dateStr: string, planInfo: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ sourceDate: dateStr, planInfo }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    if (!runningPlan) return;

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;

      const { sourceDate, planInfo } = JSON.parse(dataStr);
      if (sourceDate === targetDateStr) return;

      const updatedWeeks = runningPlan.weeks.map(week => {
        const updatedDays = week.days.map((day, dIdx) => {
          const originalDateStr = getDayDateStr(week.weekNumber, dIdx, day);

          if (week.weekNumber === planInfo.weekNumber && dIdx === planInfo.dayIndex) {
            return {
              ...day,
              date: targetDateStr
            };
          }

          if (originalDateStr === targetDateStr) {
            return {
              ...day,
              date: sourceDate
            };
          }

          return day;
        });

        return { ...week, days: updatedDays };
      });

      const updatedPlan = {
        ...runningPlan,
        weeks: updatedWeeks
      };

      updatePlanInState(updatedPlan);
    } catch (err) {
      console.error('Erro ao processar o drop do treino de corrida:', err);
    }
  };

  const handleSaveStartDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runningPlan || !startDateInputValue) return;

    const [year, month, day] = startDateInputValue.split('-').map(Number);
    const newStartDate = new Date(year, month - 1, day);

    const updatedWeeks = runningPlan.weeks.map(week => {
      const updatedDays = week.days.map(day => {
        const { date: _, ...rest } = day;
        return rest;
      });
      return { ...week, days: updatedDays };
    });

    const updatedPlan: RunningPlan = {
      ...runningPlan,
      startDate: startDateInputValue,
      weeks: updatedWeeks
    };

    updatePlanInState(updatedPlan);

    setCurrentCalendarMonth(newStartDate);
    setIsStartDateModalOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    const planInfo = planDaysByDate[dateStr];
    const runsInfo = runsByDate[dateStr];
    
    setSelectedCalendarDay({
      dateStr,
      planDay: planInfo?.day,
      weekNumber: planInfo?.weekNumber,
      dayIndex: planInfo?.dayIndex,
      runs: runsInfo
    });
  };

  const handleSaveRunFromCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalendarDay) return;

    const { dateStr, planDay, weekNumber } = selectedCalendarDay;

    // 1. Salva a corrida no histórico de corridas (runLogs)
    const newRun: Omit<RunLog, 'id'> = {
      date: dateStr,
      time: Number(logFromCalendarData.time),
      distance: Number(logFromCalendarData.distance),
      pace: Number((Number(logFromCalendarData.time) / Number(logFromCalendarData.distance)).toFixed(2)),
      calories: Number(logFromCalendarData.calories),
      heartRate: Number(logFromCalendarData.heartRate)
    };

    db.addRunLog(newRun);
    const updatedRunLogs = db.getRunLogs();
    setRunLogs(updatedRunLogs);

    // 2. Se for um treino da planilha, marca o dia como concluído (isDone = true)
    if (planDay && weekNumber !== undefined) {
      handleToggleDayDone(weekNumber, planDay.dayName, true);
    }

    // 3. Atualiza os dados selecionados na tela e fecha o sub-modal de logs
    setIsLogFromCalendarOpen(false);
    
    // Atualiza o estado de selectedCalendarDay para que mostre o novo log de corrida adicionado
    setSelectedCalendarDay(prev => {
      if (!prev) return null;
      return {
        ...prev,
        runs: [...(prev.runs || []), { ...newRun, id: `run-${Date.now()}` }]
      };
    });

    // Animação de confetes
    confetti({
      particleCount: 45,
      spread: 50,
      colors: ['#10b981', '#3b82f6']
    });
  };

  const handleDeleteRunFromCalendar = (runId: string) => {
    if (window.confirm('Excluir esta corrida do histórico?')) {
      db.deleteRunLog(runId);
      const updatedRunLogs = db.getRunLogs();
      setRunLogs(updatedRunLogs);
      
      // Atualiza o modal de detalhes
      setSelectedCalendarDay(prev => {
        if (!prev) return null;
        return {
          ...prev,
          runs: (prev.runs || []).filter(r => r.id !== runId)
        };
      });
    }
  };

  const handleWizardComplete = async (request: RunningPlanRequest, profileUpdates: Partial<UserSettings>) => {
    setIsPlanModalOpen(false);
    setIsGeneratingPlan(true);
    try {
      // Salva os dados de perfil coletados no onboarding para reaproveitar/pré-preencher da próxima vez
      db.saveSettings({ ...db.getSettings(), ...profileUpdates });

      const plan = await generateRunningPlan(request);

      // Uma planilha ativa da mesma distância (se houver) é substituída pela nova
      const conflicting = activePlans.find(p => p.targetDistance === request.targetDistance);
      if (conflicting) {
        db.deleteRunningPlan(conflicting.id);
      }
      db.saveRunningPlan(plan);
      setActivePlans(prev => [...prev.filter(p => p.id !== conflicting?.id), plan]);
      setSelectedPlanId(plan.id);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981']
      });
      alert('Sua planilha de treinos com IA foi gerada com sucesso! Bons treinos!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar a planilha com IA. Tente novamente mais tarde.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleDeletePlan = () => {
    if (!runningPlan) return;
    if (window.confirm('Deseja realmente excluir esta planilha de treinos? Todo o seu progresso nela será perdido.')) {
      db.deleteRunningPlan(runningPlan.id);
      const next = activePlans.filter(p => p.id !== runningPlan.id);
      setActivePlans(next);
      setSelectedPlanId(next[0]?.id || null);
      alert('Planilha excluída com sucesso.');
    }
  };

  const handleToggleDayDone = (weekNumber: number, dayName: string, isDone: boolean) => {
    if (!runningPlan) return;
    
    const updatedWeeks = runningPlan.weeks.map(week => {
      if (week.weekNumber === weekNumber) {
        const updatedDays = week.days.map(day => {
          if (day.dayName === dayName) {
            return { ...day, isDone };
          }
          return day;
        });
        return { ...week, days: updatedDays };
      }
      return week;
    });

    const updatedPlan = {
      ...runningPlan,
      weeks: updatedWeeks
    };

    updatePlanInState(updatedPlan);

    // Se concluiu todas as corridas da semana, confetes leves!
    const targetWeek = updatedWeeks.find(w => w.weekNumber === weekNumber);
    if (targetWeek) {
      const weekWorkouts = targetWeek.days.filter(d => !d.isRest);
      const isWeekDone = weekWorkouts.length > 0 && weekWorkouts.every(d => d.isDone);
      if (isWeekDone && isDone) {
        confetti({
          particleCount: 50,
          spread: 45,
          colors: ['#10b981', '#059669']
        });
        alert(`Parabéns! Você concluiu todos os treinos da Semana ${weekNumber}! 🎉`);
      }
    }
  };

  const handleOpenBodyModal = () => {
    setEditingBodyLogId(null);
    const latest = bodyCompLogs.length > 0 ? bodyCompLogs[bodyCompLogs.length - 1] : null;
    setBodyForm({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      idealWeight: latest ? String(latest.idealWeight) : '',
      bodyFat: '',
      bodyFatGoal: latest ? String(latest.bodyFatGoal) : '',
      muscleMass: '',
      muscleMassGoal: latest ? String(latest.muscleMassGoal) : '',
      bodyWater: latest ? String(latest.bodyWater) : '',
      boneMass: latest ? String(latest.boneMass) : '',
      basalMetabolism: latest ? String(latest.basalMetabolism) : '',
      proteins: latest ? String(latest.proteins) : '',
      visceralFat: '',
      visceralFatGoal: latest ? String(latest.visceralFatGoal) : '',
      metabolicAge: latest ? String(latest.metabolicAge) : '',
      heartRate: latest ? String(latest.heartRate) : ''
    });
    setIsBodyModalOpen(true);
  };

  const handleEditBody = (log: BodyCompLog) => {
    setEditingBodyLogId(log.id);
    setBodyForm({
      date: log.date,
      weight: String(log.weight),
      idealWeight: String(log.idealWeight || ''),
      bodyFat: String(log.bodyFat || ''),
      bodyFatGoal: String(log.bodyFatGoal || ''),
      muscleMass: String(log.muscleMass || ''),
      muscleMassGoal: String(log.muscleMassGoal || ''),
      bodyWater: String(log.bodyWater || ''),
      boneMass: String(log.boneMass || ''),
      basalMetabolism: String(log.basalMetabolism || ''),
      proteins: String(log.proteins || ''),
      visceralFat: String(log.visceralFat || ''),
      visceralFatGoal: String(log.visceralFatGoal || ''),
      metabolicAge: String(log.metabolicAge || ''),
      heartRate: String(log.heartRate || '')
    });
    setIsBodyModalOpen(true);
  };

  // Forms
  const [runForm, setRunForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    distance: '',
    calories: '',
    heartRate: ''
  });

  const [bodyForm, setBodyForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    idealWeight: '',
    bodyFat: '',
    bodyFatGoal: '',
    muscleMass: '',
    muscleMassGoal: '',
    bodyWater: '',
    boneMass: '',
    basalMetabolism: '',
    proteins: '',
    visceralFat: '',
    visceralFatGoal: '',
    metabolicAge: '',
    heartRate: ''
  });

  // Efeito para calcular TMB e Idade Metabólica automaticamente conforme o peso/gordura/músculo mudam
  useEffect(() => {
    const weightNum = Number(bodyForm.weight);
    const fatNum = Number(bodyForm.bodyFat);
    const muscleNum = Number(bodyForm.muscleMass);

    if (weightNum > 0) {
      const settings = db.getSettings();
      const age = settings.age || 30;
      const height = settings.height || 175;

      // 1. TMB (Basal) via Katch-McArdle se houver percentual de gordura, caso contrário Mifflin-St Jeor
      let computedBMR = 1600;
      if (fatNum > 0) {
        const lbm = weightNum * (1 - fatNum / 100);
        computedBMR = Math.round(370 + 21.6 * lbm);
      } else {
        computedBMR = Math.round(10 * weightNum + 6.25 * height - 5 * age + 5);
      }

      // 2. Idade Metabólica aproximada baseada na composição corporal
      let computedMetabolicAge = age;
      if (fatNum > 0 && muscleNum > 0) {
        const muscleRatio = muscleNum / weightNum;
        const fatOffset = (fatNum - 18) * 0.4;
        const muscleOffset = (muscleRatio - 0.4) * 30;
        computedMetabolicAge = Math.max(12, Math.round(age + fatOffset - muscleOffset));
      }

      setBodyForm(prev => ({
        ...prev,
        basalMetabolism: String(computedBMR),
        metabolicAge: String(computedMetabolicAge)
      }));
    }
  }, [bodyForm.weight, bodyForm.bodyFat, bodyForm.muscleMass]);

  const handleGPXUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const gpxText = event.target?.result as string;
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
        
        // Obter pontos do trajeto
        const trkpts = xmlDoc.getElementsByTagName('trkpt');
        if (trkpts.length === 0) {
          alert('O arquivo GPX não contém pontos de trajeto válidos.');
          return;
        }

        // 1. Extrair data
        const firstTimeTag = xmlDoc.getElementsByTagName('time')[0];
        let runDate = new Date().toISOString().split('T')[0];
        if (firstTimeTag && firstTimeTag.textContent) {
          runDate = firstTimeTag.textContent.split('T')[0];
        }

        // 2. Calcular distância usando a fórmula de Haversine
        let totalDistance = 0;
        let prevLat = null as number | null;
        let prevLon = null as number | null;
        
        let hrSum = 0;
        let hrCount = 0;

        for (let i = 0; i < trkpts.length; i++) {
          const pt = trkpts[i];
          const lat = parseFloat(pt.getAttribute('lat') || '0');
          const lon = parseFloat(pt.getAttribute('lon') || '0');

          if (prevLat !== null && prevLon !== null) {
            const R = 6371; // Raio da Terra em km
            const dLat = (lat - prevLat) * Math.PI / 180;
            const dLon = (lon - prevLon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(prevLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            totalDistance += d;
          }
          prevLat = lat;
          prevLon = lon;

          // Tenta ler batimentos cardíacos
          const hrTags = pt.getElementsByTagNameNS('*', 'hr');
          const hrTag = hrTags.length > 0 ? hrTags[0] : pt.getElementsByTagName('hr')[0];
          if (hrTag && hrTag.textContent) {
            const hrVal = parseInt(hrTag.textContent, 10);
            if (!isNaN(hrVal) && hrVal > 30) {
              hrSum += hrVal;
              hrCount++;
            }
          }
        }

        // 3. Calcular tempo
        let totalMinutes = 30; // default
        const timeTags = xmlDoc.getElementsByTagName('time');
        if (timeTags.length >= 2) {
          const startTime = new Date(timeTags[0].textContent || '');
          const endTime = new Date(timeTags[timeTags.length - 1].textContent || '');
          if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
            const diffMs = endTime.getTime() - startTime.getTime();
            totalMinutes = Number((diffMs / (1000 * 60)).toFixed(1));
          }
        }

        const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : 0;
        
        // Estimativa de calorias baseado no peso
        const weightLogs = db.getBodyCompLogs();
        const weight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : 70;
        const estimatedCalories = Math.round(1.03 * weight * totalDistance);

        // Preenche os dados do formulário
        setRunForm({
          date: runDate,
          time: String(totalMinutes),
          distance: String(totalDistance.toFixed(2)),
          calories: String(estimatedCalories),
          heartRate: String(avgHr > 0 ? avgHr : '')
        });

        alert(`Arquivo GPX carregado com sucesso!\nDistância: ${totalDistance.toFixed(2)} km\nTempo: ${totalMinutes} min\nFC Média: ${avgHr > 0 ? avgHr + ' bpm' : 'N/A'}`);
      } catch (err) {
        console.error('Erro ao processar arquivo GPX:', err);
        alert('Erro ao processar o arquivo GPX. Verifique se o formato está correto.');
      }
    };
    reader.readAsText(file);
  };

  const refreshData = () => {
    setRunLogs(db.getRunLogs());
    setBodyCompLogs(db.getBodyCompLogs());
  };

  // Pace dinâmico para visualização no form de corrida
  const calculatedPace = useMemo(() => {
    const time = Number(runForm.time);
    const dist = Number(runForm.distance);
    if (time > 0 && dist > 0) {
      return (time / dist).toFixed(2);
    }
    return '0.00';
  }, [runForm.time, runForm.distance]);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleSaveRun = (e: React.FormEvent) => {
    e.preventDefault();
    const time = Number(runForm.time);
    const distance = Number(runForm.distance);
    if (time <= 0 || distance <= 0) {
      alert('Tempo e Distância devem ser maiores que zero.');
      return;
    }

    const pace = Number((time / distance).toFixed(2));

    db.addRunLog({
      date: runForm.date,
      time,
      distance,
      pace,
      calories: Number(runForm.calories) || 0,
      heartRate: Number(runForm.heartRate) || 0
    });

    setIsRunModalOpen(false);
    setRunForm({
      date: new Date().toISOString().split('T')[0],
      time: '',
      distance: '',
      calories: '',
      heartRate: ''
    });
    refreshData();

    // Confetes ciano e azul para comemorar o cardio concluído
    confetti({
      particleCount: 85,
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#00e5ff', '#2563eb', '#3b82f6']
    });
    alert('Sessão de corrida registrada com sucesso! Continue mantendo o ritmo!');
  };

  const handleDeleteRun = (id: string) => {
    if (window.confirm('Excluir esta corrida do histórico?')) {
      db.deleteRunLog(id);
      refreshData();
    }
  };

  const handleSaveBodyComp = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = Number(bodyForm.weight);
    const bodyFat = Number(bodyForm.bodyFat);
    const muscleMass = Number(bodyForm.muscleMass);
    
    if (weight <= 0) {
      alert('Peso é obrigatório.');
      return;
    }

    const payload = {
      date: bodyForm.date,
      weight,
      idealWeight: Number(bodyForm.idealWeight) || weight,
      bodyFat: bodyFat || 0,
      bodyFatGoal: Number(bodyForm.bodyFatGoal) || 15,
      muscleMass: muscleMass || 0,
      muscleMassGoal: Number(bodyForm.muscleMassGoal) || 35,
      bodyWater: Number(bodyForm.bodyWater) || 55,
      boneMass: Number(bodyForm.boneMass) || 3,
      basalMetabolism: Number(bodyForm.basalMetabolism) || 1600,
      proteins: Number(bodyForm.proteins) || 16,
      visceralFat: Number(bodyForm.visceralFat) || 5,
      visceralFatGoal: Number(bodyForm.visceralFatGoal) || 5,
      metabolicAge: Number(bodyForm.metabolicAge) || 30,
      heartRate: Number(bodyForm.heartRate) || 60
    };

    if (editingBodyLogId) {
      db.updateBodyCompLog(editingBodyLogId, payload);
      setEditingBodyLogId(null);
      alert('Medição de bioimpedância atualizada com sucesso!');
    } else {
      db.addBodyCompLog(payload);
      alert('Nova medição de bioimpedância registrada com sucesso!');
    }

    setIsBodyModalOpen(false);
    // Reinicia form
    setBodyForm({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      idealWeight: '',
      bodyFat: '',
      bodyFatGoal: '',
      muscleMass: '',
      muscleMassGoal: '',
      bodyWater: '',
      boneMass: '',
      basalMetabolism: '',
      proteins: '',
      visceralFat: '',
      visceralFatGoal: '',
      metabolicAge: '',
      heartRate: ''
    });
    refreshData();
  };

  const handleDeleteBody = (id: string) => {
    if (window.confirm('Excluir esta medição corporal?')) {
      db.deleteBodyCompLog(id);
      refreshData();
    }
  };

  // -------------------------------------------------------------
  // CONFIGURAÇÃO E FILTRO DE GRÁFICOS (CHART.JS)
  // -------------------------------------------------------------
  const [periodFilter, setPeriodFilter] = useState<'7D' | '1M' | '3M' | '6M' | '1A' | 'ALL'>('ALL');

  const filteredBodyLogs = useMemo(() => {
    if (periodFilter === 'ALL') return bodyCompLogs;
    
    const now = new Date();
    const cutoff = new Date();
    if (periodFilter === '7D') cutoff.setDate(now.getDate() - 7);
    else if (periodFilter === '1M') cutoff.setDate(now.getDate() - 30);
    else if (periodFilter === '3M') cutoff.setDate(now.getDate() - 90);
    else if (periodFilter === '6M') cutoff.setDate(now.getDate() - 180);
    else if (periodFilter === '1A') cutoff.setDate(now.getDate() - 365);
    
    // Filtra comparando a data ISO (YYYY-MM-DD)
    return bodyCompLogs.filter(log => new Date(log.date) >= cutoff);
  }, [bodyCompLogs, periodFilter]);

  const chartOptions = (_titleStr: string, yLabel: string): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ba1b0',
          font: { family: 'Inter', size: 11 }
        }
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
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#535868', font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#535868', font: { family: 'Inter', size: 10 } },
        title: {
          display: true,
          text: yLabel,
          color: '#535868',
          font: { family: 'Inter', size: 10 }
        }
      }
    }
  });

  // Gráficos Data Mappers usando os dados filtrados
  const dates = filteredBodyLogs.map(log => log.date.split('-').reverse().slice(0, 2).join('/')); // DD/MM

  const weightChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Peso Atual (kg)',
        data: filteredBodyLogs.map(log => log.weight),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      },
      {
        label: 'Peso Ideal (Meta)',
        data: filteredBodyLogs.map(log => log.idealWeight),
        borderColor: '#535868',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };

  const fatChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Gordura Corporal (%)',
        data: filteredBodyLogs.map(log => log.bodyFat),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4
      },
      {
        label: 'Meta de Gordura',
        data: filteredBodyLogs.map(log => log.bodyFatGoal),
        borderColor: '#f97316',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };

  const muscleChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Massa Muscular (kg)',
        data: filteredBodyLogs.map(log => log.muscleMass),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      },
      {
        label: 'Meta de Massa Muscular',
        data: filteredBodyLogs.map(log => log.muscleMassGoal),
        borderColor: '#a78bfa',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };

  const visceralChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Gordura Visceral',
        data: filteredBodyLogs.map(log => log.visceralFat),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f97316',
        pointRadius: 4
      },
      {
        label: 'Meta de Visceral',
        data: filteredBodyLogs.map(log => log.visceralFatGoal),
        borderColor: '#10b981',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }
    ]
  };

  // Gráficos de Performance de Corrida (Pace vs FC Média)
  const runDates = runLogs.map(r => r.date.split('-').reverse().slice(0, 2).join('/'));

  const runPerformanceChartData = {
    labels: runDates,
    datasets: [
      {
        label: 'Pace Médio (min/km)',
        data: runLogs.map(r => r.pace),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        tension: 0.4,
        yAxisID: 'y',
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      },
      {
        label: 'FC Média (bpm)',
        data: runLogs.map(r => r.heartRate > 0 ? r.heartRate : null),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        tension: 0.4,
        yAxisID: 'y1',
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointRadius: 4
      }
    ]
  };

  const runChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9ba1b0', font: { family: 'Inter', size: 11 } }
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
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#535868', font: { family: 'Inter', size: 10 } }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#2563eb', font: { family: 'Inter', size: 10 } },
        title: {
          display: true,
          text: 'Pace (min/km)',
          color: '#2563eb',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#ef4444', font: { family: 'Inter', size: 10 } },
        title: {
          display: true,
          text: 'Frequência Cardíaca (bpm)',
          color: '#ef4444',
          font: { family: 'Inter', size: 10, weight: 'bold' }
        }
      }
    }
  };

  // Últimas métricas de bioimpedância para resumos rápidos
  const latestComp = useMemo(() => {
    if (bodyCompLogs.length === 0) return null;
    return bodyCompLogs[bodyCompLogs.length - 1];
  }, [bodyCompLogs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        /* Grade do Calendário */
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.4rem;
          margin-top: 0.5rem;
        }

        .calendar-header-day {
          text-align: center;
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--text-secondary);
          padding: 0.4rem 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .calendar-day-cell {
          min-height: 96px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0.45rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .calendar-day-cell:hover {
          transform: translateY(-2px);
          border-color: rgba(59, 130, 246, 0.4);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        }

        .calendar-day-cell.other-month {
          opacity: 0.25;
        }

        .calendar-day-number {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          align-self: flex-start;
          margin-bottom: 0.25rem;
        }

        .calendar-day-cell.today {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.03);
        }

        .calendar-day-cell.today .calendar-day-number {
          color: #60a5fa;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
        }

        /* Blocos de Treino no Calendário */
        .calendar-workout-block {
          padding: 0.25rem 0.45rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-align: left;
          line-height: 1.25;
          margin-top: 0.2rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        /* Cores de Status */
        .workout-proposto {
          background: rgba(37, 99, 235, 0.15);
          border-left: 3px solid #3b82f6;
          color: #93c5fd;
        }
        .workout-feito {
          background: rgba(16, 185, 129, 0.15);
          border-left: 3px solid #10b981;
          color: #6ee7b7;
        }
        .workout-perdido {
          background: rgba(239, 68, 68, 0.15);
          border-left: 3px solid #ef4444;
          color: #fca5a5;
        }
        .workout-avulso {
          background: rgba(245, 158, 11, 0.15);
          border-left: 3px solid #f59e0b;
          color: #fde047;
        }
        .workout-descanso {
          background: rgba(255, 255, 255, 0.03);
          border-left: 3px solid rgba(255, 255, 255, 0.15);
          color: var(--text-muted);
          font-style: italic;
        }

        /* Barra de Ações Superior */
        .plan-actions-bar {
          display: flex;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 0.35rem;
          gap: 0.35rem;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 1.25rem;
        }

        .plan-action-btn {
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.4rem 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }

        .plan-action-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
        }

        .plan-action-btn.active {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        .plan-action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
        }

        /* Legendas de Cores */
        .legends-container {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          align-items: center;
          color: var(--text-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        /* Animações e Impressão */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .running-plan-section, .running-plan-section * {
            visibility: visible;
          }
          .running-plan-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .plan-actions-bar, .legends-container {
            display: none !important;
          }
        }
      `}</style>
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Corrida & Composição Corporal
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Registre suas sessões de corrida de rua e acompanhe a evolução de métricas de bioimpedância.</p>
        </div>

        <div>
          {activeSubTab === 'runs' ? (
            <button className="btn btn-accent" onClick={() => setIsRunModalOpen(true)}>
              <Plus size={16} />
              Registrar Corrida
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleOpenBodyModal}>
              <Plus size={16} />
              Registrar Biometria
            </button>
          )}
        </div>
      </header>

      {/* Abas */}
      <div className="runtracker-tabs">
        <button 
          className={`runtracker-tab-btn ${activeSubTab === 'runs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('runs')}
        >
          Treinos de Corrida
        </button>
        <button 
          className={`runtracker-tab-btn ${activeSubTab === 'bodycomp' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('bodycomp')}
        >
          Composição Corporal & Biometria
        </button>
      </div>

      {activeSubTab === 'runs' ? (
        <section>
          {/* Métricas rápidas de Corrida */}
          <div className="runcomp-summary-metrics">
            <div className="metric-mini-card">
              <div className="metric-mini-title">Total Corridas</div>
              <div className="metric-mini-value" style={{ color: 'var(--accent-blue)' }}>{runLogs.length}</div>
              <div className="metric-mini-subtitle">Treinos Registrados</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-title">Distância Total</div>
              <div className="metric-mini-value" style={{ color: 'var(--accent-blue)' }}>
                {runLogs.reduce((acc, r) => acc + r.distance, 0).toFixed(1)} km
              </div>
              <div className="metric-mini-subtitle">Volume Acumulado</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-title">Pace Médio Global</div>
              <div className="metric-mini-value">
                {runLogs.length > 0 
                  ? (runLogs.reduce((acc, r) => acc + r.pace, 0) / runLogs.length).toFixed(2)
                  : '0.00'
                } min/km
              </div>
              <div className="metric-mini-subtitle">Ritmo das Corridas</div>
            </div>
            <div className="metric-mini-card">
              <div className="metric-mini-title">Calorias Queimadas</div>
              <div className="metric-mini-value" style={{ color: 'var(--accent-orange)' }}>
                {runLogs.reduce((acc, r) => acc + r.calories, 0)} kcal
              </div>
              <div className="metric-mini-subtitle">Energia Consumida</div>
            </div>
          </div>

          {/* Seção da Planilha de Treino de Corrida */}
          <div className="running-plan-section" style={{ marginBottom: '2rem' }}>
            {!runningPlan ? (
              <div className="glass-card plan-promo-card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.05))', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ textAlign: 'left', flex: 1, minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={20} color="var(--accent-blue)" />
                    Planilha de Corrida Inteligente (IA)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
                    Defina sua distância alvo (ex: 5km, 10km) e o prazo em semanas. Nosso treinador de IA montará um planejamento de treinos progressivo e sob medida para você alcançar sua meta!
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(90deg, #2563eb, #8b5cf6)', border: 'none', boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)' }}
                  onClick={() => { setWizardMode('new'); setIsPlanModalOpen(true); }}
                >
                  <Activity size={16} />
                  Gerar Planilha com IA
                </button>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '2rem' }}>
                {activePlans.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {activePlans.map(p => {
                      const isSelected = p.id === runningPlan?.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlanId(p.id)}
                          style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                            border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                            color: isSelected ? '#60a5fa' : 'var(--text-secondary)'
                          }}
                        >
                          {p.targetDistance} km
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* 1. Cabeçalho de Resumo da Planilha Ativa (estilo Imagem 2) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                    <div style={{ 
                      width: '52px', 
                      height: '52px', 
                      borderRadius: '50%', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem'
                    }}>
                      🏃‍♀️
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.35rem', margin: 0, color: '#ffffff', fontWeight: 700 }}>
                        Planilha de {settings.userName || 'Atleta'}
                      </h3>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span><strong>Distância Meta:</strong> {runningPlan.targetDistance} km</span>
                        <span><strong>Prazo:</strong> {runningPlan.weeksCount} semanas</span>
                        <span><strong>Idade:</strong> {age} anos</span>
                        <span><strong>Dispositivo:</strong> {runningPlan.hasWearable ? 'Wearable Ativo' : 'Sem monitor'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.4rem 0.75rem', borderRadius: '8px', color: '#ff6b6b', fontSize: '0.8rem', fontWeight: 600 }}>
                    🔒 Planilha Ativa
                  </div>
                </div>

                {/* 2. Menu de Controle Superior (estilo Imagem 2) */}
                <div className="plan-actions-bar">
                  <button 
                    type="button"
                    className={`plan-action-btn ${planViewMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setPlanViewMode('calendar')}
                    title="Visualizar em formato de Calendário Mensal"
                  >
                    <Calendar size={15} />
                    Calendário
                  </button>
                  <button 
                    type="button"
                    className={`plan-action-btn ${planViewMode === 'weeks' ? 'active' : ''}`}
                    onClick={() => setPlanViewMode('weeks')}
                    title="Visualizar em formato de Lista de Semanas"
                  >
                    <List size={15} />
                    Lista Semanal
                  </button>
                  <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)', margin: '0 0.25rem' }}></div>
                  <button
                    type="button"
                    className="plan-action-btn"
                    onClick={() => { setWizardMode('adjust'); setIsPlanModalOpen(true); }}
                    title="Reconfigurar esta planilha com a IA"
                  >
                    <Sparkles size={14} color="#60a5fa" />
                    Ajustar com IA
                  </button>
                  <button
                    type="button"
                    className="plan-action-btn"
                    onClick={() => { setWizardMode('new'); setIsPlanModalOpen(true); }}
                    title="Criar uma planilha ativa para outra distância"
                  >
                    <Plus size={14} color="#34d399" />
                    Nova Planilha
                  </button>
                  <button
                    type="button"
                    className="plan-action-btn"
                    onClick={() => {
                      setStartDateInputValue(runningPlan ? getPlanBaseDate(runningPlan).toISOString().split('T')[0] : '');
                      setIsStartDateModalOpen(true);
                    }}
                    title="Ajustar data de início de fato da planilha de treino"
                  >
                    <CalendarClock size={14} color="#fbbf24" />
                    Ajustar Início
                  </button>
                  <button 
                    type="button"
                    className="plan-action-btn"
                    onClick={() => {
                      const zonesEl = document.getElementById('cardio-zones-section');
                      if (zonesEl) zonesEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="Ver zonas de esforço cardíaco"
                  >
                    <Heart size={14} color="#f87171" />
                    Zonas FC
                  </button>
                  <button 
                    type="button"
                    className="plan-action-btn"
                    onClick={() => setIsRunModalOpen(true)}
                    title="Registrar corrida manual no histórico"
                  >
                    <Plus size={14} color="#34d399" />
                    Registrar Corrida
                  </button>
                  <button 
                    type="button"
                    className="plan-action-btn"
                    onClick={() => window.print()}
                    title="Imprimir calendário de treinos"
                  >
                    <Printer size={14} />
                    Imprimir
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button 
                    type="button"
                    className="plan-action-btn danger"
                    style={{ color: '#ff6b6b' }}
                    onClick={handleDeletePlan}
                    title="Excluir a planilha de treinos e todo o progresso"
                  >
                    <Trash2 size={14} />
                    Excluir Planilha
                  </button>
                </div>

                {/* 3. Barra de Progresso dos Treinos */}
                {(() => {
                  const totalDays = runningPlan.weeks.reduce((acc, w) => acc + w.days.filter(d => !d.isRest).length, 0);
                  const doneDays = runningPlan.weeks.reduce((acc, w) => acc + w.days.filter(d => !d.isRest && d.isDone).length, 0);
                  const pct = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
                  return (
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Progresso da Planilha de Corrida</span>
                        <span style={{ fontWeight: 700, color: '#60a5fa' }}>{doneDays} de {totalDays} treinos concluídos ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })()}

                {/* 4. Barra de Legendas de Cores (Estilo Imagem 2) */}
                <div className="legends-container">
                  <div className="legend-item">
                    <div className="legend-color-dot" style={{ background: '#3b82f6' }}></div>
                    <span>Treino Proposto</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color-dot" style={{ background: '#10b981' }}></div>
                    <span>Treino Feito</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color-dot" style={{ background: '#f59e0b' }}></div>
                    <span>Treino Avulso</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color-dot" style={{ background: '#ef4444' }}></div>
                    <span>Treino Perdido</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color-dot" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-subtle)' }}></div>
                    <span>Descanso</span>
                  </div>
                </div>

                {/* 5. Conteúdo Dinâmico (Calendário vs Semanas) */}
                {planViewMode === 'calendar' ? (
                  <div style={{ animation: 'fadeIn 0.25s ease' }}>
                    {/* Barra de Navegação do Mês do Calendário */}
                    <div className="flex-between" style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0.5rem' }}
                        onClick={handlePrevMonth}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize', color: '#ffffff' }}>
                        {currentCalendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0.5rem' }}
                        onClick={handleNextMonth}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Grade de Cabeçalho dos Dias da Semana */}
                    <div className="calendar-grid" style={{ marginBottom: '0.25rem' }}>
                      {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(d => (
                        <div key={d} className="calendar-header-day">
                          {d.slice(0, 3)}
                        </div>
                      ))}
                    </div>

                    {/* Grade dos Dias do Mês */}
                    <div className="calendar-grid">
                      {calendarDays.map((slot, index) => {
                        const planInfo = planDaysByDate[slot.dateStr];
                        const runsInfo = runsByDate[slot.dateStr];
                        const isToday = new Date().toISOString().split('T')[0] === slot.dateStr;
                        
                        let blockClass = '';
                        let blockLabel = '';
                        
                        if (planInfo) {
                          const { day } = planInfo;
                          if (day.isRest) {
                            blockClass = 'workout-descanso';
                            blockLabel = '💤 Descanso';
                          } else {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isPast = slot.dateStr < todayStr;
                            
                            if (day.isDone || (runsInfo && runsInfo.length > 0)) {
                              blockClass = 'workout-feito';
                              blockLabel = `✓ ${day.dayName.slice(0, 3)}: Feito`;
                            } else if (isPast) {
                              blockClass = 'workout-perdido';
                              blockLabel = `❌ ${day.dayName.slice(0, 3)}: Perdido`;
                            } else {
                              blockClass = 'workout-proposto';
                              blockLabel = `🏃‍♂️ ${day.dayName.slice(0, 3)}: Proposto`;
                            }
                          }
                        } else if (runsInfo && runsInfo.length > 0) {
                          blockClass = 'workout-avulso';
                          blockLabel = `⭐ Avulso: ${runsInfo[0].distance}km`;
                        }

                        return (
                          <div 
                            key={index} 
                            className={`calendar-day-cell ${!slot.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => handleDayClick(slot.dateStr)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, slot.dateStr)}
                          >
                            <span className="calendar-day-number">{slot.date.getDate()}</span>
                            
                            {blockLabel && (
                              <div 
                                className={`calendar-workout-block ${blockClass}`}
                                draggable={blockClass === 'workout-proposto' || blockClass === 'workout-feito' || blockClass === 'workout-perdido'}
                                onDragStart={(e) => {
                                  if (planInfo) {
                                    handleDragStart(e, slot.dateStr, planInfo);
                                  }
                                }}
                                style={{
                                  cursor: (blockClass === 'workout-proposto' || blockClass === 'workout-feito' || blockClass === 'workout-perdido') ? 'grab' : 'default'
                                }}
                              >
                                {blockLabel}
                              </div>
                            )}

                            {/* Mostrar pequenos pontos extras se houver múltiplos treinos ou corrida em dia de descanso */}
                            {planInfo && !planInfo.day.isRest && runsInfo && runsInfo.length > 0 && (
                              <div style={{ fontSize: '0.6rem', color: '#10b981', textAlign: 'left', marginTop: '0.2rem', fontWeight: 600 }}>
                                🏃‍♂️ {runsInfo[0].distance} km real
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Visualização em lista tradicional (Semanal)
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease' }}>
                    {runningPlan.weeks.map((week) => {
                      const isExpanded = !!expandedWeeks[week.weekNumber];
                      const weekWorkouts = week.days.filter(d => !d.isRest);
                      const weekDoneWorkouts = weekWorkouts.filter(d => d.isDone);
                      const isWeekCompleted = weekWorkouts.length > 0 && weekWorkouts.length === weekDoneWorkouts.length;

                      return (
                        <div 
                          key={week.weekNumber} 
                          className="glass-card" 
                          style={{ 
                            border: isWeekCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            background: isWeekCompleted ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255,255,255,0.01)',
                            padding: 0
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedWeeks({
                              ...expandedWeeks,
                              [week.weekNumber]: !isExpanded
                            })}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '1rem 1.25rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              color: '#ffffff',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ 
                                background: isWeekCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.1)', 
                                color: isWeekCompleted ? '#10b981' : '#60a5fa', 
                                borderRadius: '4px', 
                                padding: '0.2rem 0.5rem', 
                                fontSize: '0.75rem', 
                                fontWeight: 700 
                              }}>
                                Semana {week.weekNumber}
                              </span>
                              {isWeekCompleted && (
                                <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                  ✓ Concluída!
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {weekDoneWorkouts.length} / {weekWorkouts.length} treinos
                            </div>
                          </button>

                          {isExpanded && (
                            <div style={{ 
                              borderTop: '1px solid var(--border-subtle)', 
                              padding: '1.25rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.1rem',
                              background: 'rgba(0, 0, 0, 0.12)'
                            }}>
                              {week.days.map((day, dIdx) => {
                                if (day.isRest) {
                                  return (
                                    <div 
                                      key={dIdx}
                                      style={{
                                        padding: '0.85rem 1.25rem',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.01)',
                                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        opacity: 0.55
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '1.15rem' }}>💤</span>
                                        <div style={{ textAlign: 'left' }}>
                                          <strong style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>{day.dayName}</strong>
                                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>Descanso Total ou Recuperação Muscular</span>
                                        </div>
                                      </div>
                                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>Rest</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div 
                                    key={dIdx}
                                    style={{
                                      padding: '1.5rem',
                                      borderRadius: '12px',
                                      background: day.isDone ? 'rgba(16, 185, 129, 0.02)' : 'linear-gradient(180deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.005) 100%)',
                                      border: day.isDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '1.1rem',
                                      transition: 'all 0.3s ease',
                                      opacity: day.isDone ? 0.75 : 1
                                    }}
                                  >
                                    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '0.75rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <input 
                                          type="checkbox"
                                          style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: 'pointer',
                                            accentColor: '#10b981'
                                          }}
                                          checked={!!day.isDone}
                                          onChange={(e) => handleToggleDayDone(week.weekNumber, day.dayName, e.target.checked)}
                                        />
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{day.dayName}</span>
                                      </div>
                                      
                                      {(() => {
                                        let badgeColor = '#60a5fa';
                                        let bg = 'rgba(59, 130, 246, 0.12)';
                                        let label = 'Corrida';
                                        
                                        const textLower = day.training.toLowerCase();
                                        if (textLower.includes('intervalado') || textLower.includes('tiros') || textLower.includes('velocidade')) {
                                          badgeColor = '#f87171';
                                          bg = 'rgba(248, 113, 113, 0.12)';
                                          label = '⚡ Intervalado';
                                        } else if (textLower.includes('ritmo') || textLower.includes('tempo run') || textLower.includes('limiar')) {
                                          badgeColor = '#38bdf8';
                                          bg = 'rgba(56, 189, 248, 0.12)';
                                          label = '📈 Tempo Run';
                                        } else if (textLower.includes('longo') || textLower.includes('longão') || textLower.includes('desafio final')) {
                                          badgeColor = '#34d399';
                                          bg = 'rgba(52, 211, 153, 0.12)';
                                          label = '🏃‍♂️ Longão';
                                        }
                                        
                                        return (
                                          <span style={{ 
                                            color: badgeColor, 
                                            background: bg, 
                                            padding: '0.3rem 0.65rem', 
                                            borderRadius: '6px', 
                                            fontSize: '0.72rem', 
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                          }}>
                                            {label}
                                          </span>
                                        );
                                      })()}
                                    </div>

                                    {(() => {
                                      const parsed = parseTrainingText(day.training);
                                      if (!parsed.isParsed) {
                                        return (
                                          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: '1.6', textAlign: 'left' }}>
                                            {day.training}
                                          </div>
                                        );
                                      }

                                      return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                          {parsed.title && (
                                            <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '1rem', color: '#ffffff', fontWeight: 700, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                              {parsed.title}
                                            </h4>
                                          )}
                                          
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                            {parsed.warmUp && (
                                              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.02)', borderLeft: '3px solid #3b82f6', textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>🧘‍♂️ Aquecimento Ativo</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{parsed.warmUp}</div>
                                              </div>
                                            )}

                                            {parsed.mainSet && (
                                              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.02)', borderLeft: '3px solid #ec4899', textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f472b6', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>⚡ Trabalho Principal</div>
                                                <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500, lineHeight: '1.5' }}>{parsed.mainSet}</div>
                                              </div>
                                            )}

                                            {parsed.coolDown && (
                                              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.02)', borderLeft: '3px solid #10b981', textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>🌀 Volta à Calma</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{parsed.coolDown}</div>
                                              </div>
                                            )}

                                            {parsed.coachTip && (
                                              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.02)', border: '1px dashed rgba(245, 158, 11, 0.15)', textAlign: 'left' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>💡 Dica do Coach</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>"{parsed.coachTip}"</div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {(day.objective || day.successCriteria) && (
                                      <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                                        gap: '1rem',
                                        marginTop: '0.2rem',
                                        background: 'rgba(0, 0, 0, 0.25)',
                                        padding: '0.9rem 1.1rem',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255, 255, 255, 0.03)'
                                      }}>
                                        {day.objective && (
                                          <div style={{ textAlign: 'left' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa', display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎯 Adaptação Fisiológica</span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{day.objective}</span>
                                          </div>
                                        )}
                                        {day.successCriteria && (
                                          <div style={{ textAlign: 'left' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Critério de Sucesso</span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{day.successCriteria}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sessão Premium de Zonas e Projeções */}
          <div className="cardio-premium-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Zonas de Esforço Cardíaco */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 600 }}>
                <Heart size={18} color="#ff6b6b" />
                Zonas de Esforço Cardíaco (Karvonen)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                Calculado com FCR de {rhr} bpm e FCM de {mhr} bpm.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Z1 - Regenerativo (50-60%)</span>
                    <span>{hrZones.z1.min} - {hrZones.z1.max} bpm</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '60%', height: '100%', background: '#38bdf8' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Z2 - Queima de Gordura (60-70%)</span>
                    <span>{hrZones.z2.min} - {hrZones.z2.max} bpm</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Z3 - Ritmo / Endurance (70-80%)</span>
                    <span>{hrZones.z3.min} - {hrZones.z3.max} bpm</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '80%', height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Z4 - Limiar Anaeróbico (80-90%)</span>
                    <span>{hrZones.z4.min} - {hrZones.z4.max} bpm</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '90%', height: '100%', background: '#f97316' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Z5 - Esforço Máximo (90-100%)</span>
                    <span>{hrZones.z5.min}+ bpm</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: '#ef4444' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Projeção de Ritmos (Riegel) */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 600 }}>
                <Award size={18} color="var(--accent-blue)" />
                Projeção de Tempos de Prova (Riegel)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                {referenceRun.isDefault 
                  ? 'Baseado no ritmo padrão (5km em 25min).'
                  : `Baseado na sua melhor corrida (${referenceRun.distance}km em ${referenceRun.time}min).`
                }
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {riegelProjections.map((proj, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{proj.name}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '0.15rem' }}>
                      {formatProjectedTime(proj.time)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Pace: {(proj.time / proj.dist).toFixed(2)} min/km
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico de Performance de Corrida */}
          {runLogs.length > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <TrendingUp size={18} color="var(--accent-blue)" />
                Evolução de Performance Cardiovascular
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Acompanhamento integrado de ritmo (min/km) e freq. cardíaca média (bpm) ao longo do tempo.
              </p>
              <div style={{ height: '250px', width: '100%' }}>
                <Line data={runPerformanceChartData} options={runChartOptions} />
              </div>
            </div>
          )}

          {/* Tabela de logs de Corrida */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--accent-blue)" />
              Histórico de Sessões de Corrida
            </h3>
            {runLogs.length === 0 ? (
              <div style={{ padding: '3rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                Nenhuma corrida registrada no histórico. Clique em "Registrar Corrida" acima para começar!
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Distância (km)</th>
                      <th>Tempo (min)</th>
                      <th>Pace Médio (min/km)</th>
                      <th>Calorias</th>
                      <th>FC Média (bpm)</th>
                      <th style={{ width: '60px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runLogs.map((run) => (
                      <tr key={run.id}>
                        <td style={{ fontWeight: 600 }}>{run.date.split('-').reverse().join('/')}</td>
                        <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{run.distance} km</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} color="var(--text-muted)" />
                            {run.time} min
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{run.pace.toFixed(2)} min/km</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Flame size={12} color="var(--accent-orange)" />
                            {run.calories} kcal
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Heart size={12} color="#ff6b6b" />
                            {run.heartRate > 0 ? `${run.heartRate} bpm` : '-'}
                          </div>
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.3rem 0.5rem', color: '#ff6b6b' }}
                            onClick={() => handleDeleteRun(run.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section>
          {/* Cards Rápidos de Bioimpedância */}
          {latestComp ? (
            <div className="runcomp-summary-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="metric-mini-card">
                <div className="metric-mini-title">Peso</div>
                <div className="metric-mini-value" style={{ color: 'var(--accent-purple)' }}>{latestComp.weight} kg</div>
                <div className="metric-mini-subtitle">Meta: {latestComp.idealWeight} kg</div>
              </div>
              <div className="metric-mini-card">
                <div className="metric-mini-title">IMC</div>
                <div className="metric-mini-value">{latestComp.bmi}</div>
                <div className="metric-mini-subtitle">Índice Corporal</div>
              </div>
              <div className="metric-mini-card">
                <div className="metric-mini-title">Gordura Corporal</div>
                <div className="metric-mini-value" style={{ color: 'var(--accent-blue)' }}>{latestComp.bodyFat}%</div>
                <div className="metric-mini-subtitle">Meta: {latestComp.bodyFatGoal}%</div>
              </div>
              <div className="metric-mini-card">
                <div className="metric-mini-title">Massa Muscular</div>
                <div className="metric-mini-value" style={{ color: 'var(--accent-emerald)' }}>{latestComp.muscleMass} kg</div>
                <div className="metric-mini-subtitle">Meta: {latestComp.muscleMassGoal} kg</div>
              </div>
              <div className="metric-mini-card">
                <div className="metric-mini-title">Gordura Visceral</div>
                <div className="metric-mini-value" style={{ color: 'var(--accent-orange)' }}>{latestComp.visceralFat}</div>
                <div className="metric-mini-subtitle">Meta: {latestComp.visceralFatGoal}</div>
              </div>
              <div className="metric-mini-card">
                <div className="metric-mini-title">Idade Metabólica</div>
                <div className="metric-mini-value">{latestComp.metabolicAge} anos</div>
                <div className="metric-mini-subtitle">Metabolismo</div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Nenhuma medição corporal registrada. Registre seus dados de bioimpedância para gerar os gráficos de evolução.
            </div>
          )}

          {/* Seção de Gráficos de Progressão */}
          {bodyCompLogs.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} color="var(--accent-blue)" />
                    Gráficos de Evolução Corporal
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Acompanhamento de peso, gordura, massa muscular e gordura visceral.</p>
                </div>
                <div className="period-filter-pills">
                  {(['7D', '1M', '3M', '6M', '1A', 'ALL'] as const).map(p => (
                    <button 
                      key={p}
                      type="button"
                      className={`period-pill ${periodFilter === p ? 'active' : ''}`}
                      onClick={() => setPeriodFilter(p)}
                    >
                      {p === 'ALL' ? 'Todos' : p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="charts-grid">
                <div className="chart-container-card glass-card">
                  <div className="chart-title">Evolução do Peso vs. Peso Ideal</div>
                  <div style={{ height: '220px' }}>
                    <Line data={weightChartData} options={chartOptions('Evolução do Peso', 'Peso (kg)')} />
                  </div>
                </div>

                <div className="chart-container-card glass-card">
                  <div className="chart-title">Evolução do % de Gordura vs. Meta</div>
                  <div style={{ height: '220px' }}>
                    <Line data={fatChartData} options={chartOptions('Percentual de Gordura', 'Gordura (%)')} />
                  </div>
                </div>

                <div className="chart-container-card glass-card">
                  <div className="chart-title">Evolução de Massa Muscular vs. Meta</div>
                  <div style={{ height: '220px' }}>
                    <Line data={muscleChartData} options={chartOptions('Massa Muscular', 'Massa (kg)')} />
                  </div>
                </div>

                <div className="chart-container-card glass-card">
                  <div className="chart-title">Evolução de Gordura Visceral vs. Meta</div>
                  <div style={{ height: '220px' }}>
                    <Line data={visceralChartData} options={chartOptions('Gordura Visceral', 'Nível')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de logs Biométricos */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--accent-purple)" />
              Histórico de Medições de Bioimpedância
            </h3>
            {bodyCompLogs.length === 0 ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                Sem medições de bioimpedância no histórico.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso</th>
                      <th>IMC</th>
                      <th>% Gordura</th>
                      <th>Massa Muscular</th>
                      <th>% Água</th>
                      <th>Massa Magra</th>
                      <th>Massa Óssea</th>
                      <th>TMB (Metab.)</th>
                      <th>% Proteínas</th>
                      <th>Visceral</th>
                      <th>Idade Metab.</th>
                      <th>FC Repouso</th>
                      <th style={{ width: '85px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyCompLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600 }}>{log.date.split('-').reverse().join('/')}</td>
                        <td style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{log.weight} kg</td>
                        <td style={{ fontWeight: 600 }}>{log.bmi}</td>
                        <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{log.bodyFat}%</td>
                        <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{log.muscleMass} kg</td>
                        <td>{log.bodyWater}%</td>
                        <td>{log.leanMass} kg</td>
                        <td>{log.boneMass} kg</td>
                        <td>{log.basalMetabolism} kcal</td>
                        <td>{log.proteins}%</td>
                        <td style={{ fontWeight: 600 }}>{log.visceralFat}</td>
                        <td>{log.metabolicAge} anos</td>
                        <td>{log.heartRate} bpm</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.4rem', color: 'var(--accent-blue)' }}
                              onClick={() => handleEditBody(log)}
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.4rem', color: '#ff6b6b' }}
                              onClick={() => handleDeleteBody(log.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          MODAIS
         ------------------------------------------------------------- */}

      {/* Modal Registrar Corrida */}
      {isRunModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Footprints size={20} color="var(--accent-blue)" />
                Registrar Corrida de Rua
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsRunModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSaveRun}>
              <div className="modal-body">
                {/* Zona de Sincronização GPX */}
                <div style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                  background: 'rgba(255, 255, 255, 0.01)',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept=".gpx"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                    onChange={handleGPXUpload}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <Watch size={24} color="var(--accent-blue)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Importar Corrida (GPX)</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Arraste seu arquivo esportivo GPX ou clique aqui</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="runDate">Data da Corrida</label>
                  <input
                    id="runDate"
                    type="date"
                    className="form-control"
                    value={runForm.date}
                    onChange={(e) => setRunForm({ ...runForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label htmlFor="runDist">Distância (km)</label>
                    <input
                      id="runDist"
                      type="number"
                      step="0.01"
                      min="0.1"
                      className="form-control"
                      placeholder="Ex: 5.2"
                      value={runForm.distance}
                      onChange={(e) => setRunForm({ ...runForm, distance: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="runTime">Tempo (minutos)</label>
                    <input
                      id="runTime"
                      type="number"
                      step="0.1"
                      min="0.5"
                      className="form-control"
                      placeholder="Ex: 30"
                      value={runForm.time}
                      onChange={(e) => setRunForm({ ...runForm, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="runCals">Calorias (Kcal)</label>
                    <input
                      id="runCals"
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="Ex: 350"
                      value={runForm.calories}
                      onChange={(e) => setRunForm({ ...runForm, calories: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="runFc">FC Média (bpm)</label>
                    <input
                      id="runFc"
                      type="number"
                      min="30"
                      max="220"
                      className="form-control"
                      placeholder="Ex: 150"
                      value={runForm.heartRate}
                      onChange={(e) => setRunForm({ ...runForm, heartRate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Pace Estimado</label>
                    <div className="form-control" style={{ background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {calculatedPace} min/km
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsRunModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-accent">Salvar Corrida</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Biometria / Composição Corporal */}
      {isBodyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--accent-purple)" />
                {editingBodyLogId ? 'Editar Medição de Bioimpedância' : 'Lançar Dados de Bioimpedância'}
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.3rem' }} onClick={() => setIsBodyModalOpen(false)}>X</button>
            </div>
            <form onSubmit={handleSaveBodyComp}>
              <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <div className="form-group">
                  <label htmlFor="bodyDate">Data da Medição</label>
                  <input
                    id="bodyDate"
                    type="date"
                    className="form-control"
                    value={bodyForm.date}
                    onChange={(e) => setBodyForm({ ...bodyForm, date: e.target.value })}
                    required
                  />
                </div>

                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
                  Peso e Composição de Gordura / Músculo
                </h4>

                <div className="bodycomp-grid-inputs">
                  <div className="form-group">
                    <label htmlFor="weight">Peso (kg)</label>
                    <input
                      id="weight"
                      type="number"
                      step="0.05"
                      min="20"
                      max="300"
                      className="form-control"
                      value={bodyForm.weight}
                      onChange={(e) => setBodyForm({ ...bodyForm, weight: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="idealWeight">Peso Ideal (kg)</label>
                    <input
                      id="idealWeight"
                      type="number"
                      step="0.05"
                      min="20"
                      className="form-control"
                      value={bodyForm.idealWeight}
                      onChange={(e) => setBodyForm({ ...bodyForm, idealWeight: e.target.value })}
                      placeholder="Ex: 75"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bodyFat">Gordura (%)</label>
                    <input
                      id="bodyFat"
                      type="number"
                      step="0.1"
                      min="1"
                      max="70"
                      className="form-control"
                      value={bodyForm.bodyFat}
                      onChange={(e) => setBodyForm({ ...bodyForm, bodyFat: e.target.value })}
                      placeholder="Ex: 18.5"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bodyFatGoal">Meta Gordura (%)</label>
                    <input
                      id="bodyFatGoal"
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={bodyForm.bodyFatGoal}
                      onChange={(e) => setBodyForm({ ...bodyForm, bodyFatGoal: e.target.value })}
                      placeholder="Ex: 12"
                    />
                  </div>
                </div>

                <div className="bodycomp-grid-inputs" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="muscleMass">Massa Musc. (kg)</label>
                    <input
                      id="muscleMass"
                      type="number"
                      step="0.1"
                      min="5"
                      className="form-control"
                      value={bodyForm.muscleMass}
                      onChange={(e) => setBodyForm({ ...bodyForm, muscleMass: e.target.value })}
                      placeholder="Ex: 34"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="muscleMassGoal">Meta Massa (kg)</label>
                    <input
                      id="muscleMassGoal"
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={bodyForm.muscleMassGoal}
                      onChange={(e) => setBodyForm({ ...bodyForm, muscleMassGoal: e.target.value })}
                      placeholder="Ex: 38"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="visceralFat">Gordura Visceral</label>
                    <input
                      id="visceralFat"
                      type="number"
                      min="1"
                      max="30"
                      className="form-control"
                      value={bodyForm.visceralFat}
                      onChange={(e) => setBodyForm({ ...bodyForm, visceralFat: e.target.value })}
                      placeholder="Ex: 8"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="visceralFatGoal">Meta Visceral</label>
                    <input
                      id="visceralFatGoal"
                      type="number"
                      className="form-control"
                      value={bodyForm.visceralFatGoal}
                      onChange={(e) => setBodyForm({ ...bodyForm, visceralFatGoal: e.target.value })}
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', marginTop: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
                  Água, Estrutura e Metabolismo
                </h4>

                <div className="bodycomp-grid-inputs">
                  <div className="form-group">
                    <label htmlFor="bodyWater">Água (%)</label>
                    <input
                      id="bodyWater"
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={bodyForm.bodyWater}
                      onChange={(e) => setBodyForm({ ...bodyForm, bodyWater: e.target.value })}
                      placeholder="Ex: 55.4"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="boneMass">Massa Óssea (kg)</label>
                    <input
                      id="boneMass"
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={bodyForm.boneMass}
                      onChange={(e) => setBodyForm({ ...bodyForm, boneMass: e.target.value })}
                      placeholder="Ex: 3.2"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="basal">TMB Metabólica (kcal)</label>
                    <input
                      id="basal"
                      type="number"
                      className="form-control"
                      value={bodyForm.basalMetabolism}
                      onChange={(e) => setBodyForm({ ...bodyForm, basalMetabolism: e.target.value })}
                      placeholder="Ex: 1750"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="proteins">Proteínas (%)</label>
                    <input
                      id="proteins"
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={bodyForm.proteins}
                      onChange={(e) => setBodyForm({ ...bodyForm, proteins: e.target.value })}
                      placeholder="Ex: 16.8"
                    />
                  </div>
                </div>

                <div className="bodycomp-grid-inputs" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="metAge">Idade Metabólica</label>
                    <input
                      id="metAge"
                      type="number"
                      className="form-control"
                      value={bodyForm.metabolicAge}
                      onChange={(e) => setBodyForm({ ...bodyForm, metabolicAge: e.target.value })}
                      placeholder="Ex: 28"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pulse">FC Repouso (bpm)</label>
                    <input
                      id="pulse"
                      type="number"
                      className="form-control"
                      value={bodyForm.heartRate}
                      onChange={(e) => setBodyForm({ ...bodyForm, heartRate: e.target.value })}
                      placeholder="Ex: 60"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBodyModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Biometria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Data de Início */}
      {isStartDateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', background: '#131520', border: '1px solid #1f2232' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #1f2232', paddingBottom: '0.75rem' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                <CalendarClock size={18} color="var(--accent-orange)" />
                Ajustar Data de Início do Plano
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem', color: '#ffffff', borderColor: 'transparent', background: 'transparent' }} 
                onClick={() => setIsStartDateModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveStartDate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left', paddingTop: '1.25rem' }}>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                  Ao redefinir a data de início, todos os treinos propostos e dias de descanso da planilha serão reposicionados sequencialmente para as datas futuras correspondentes. Quaisquer ajustes manuais anteriores de arrastar e soltar serão reiniciados para a nova data inicial.
                </p>
                <div className="form-group">
                  <label htmlFor="planStartDate" style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Nova Data da Primeira Aula</label>
                  <input
                    id="planStartDate"
                    type="date"
                    className="form-control"
                    required
                    style={{ background: '#1c1e2d', color: '#ffffff', border: '1px solid #2d3142' }}
                    value={startDateInputValue}
                    onChange={(e) => setStartDateInputValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid #1f2232', paddingTop: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: '#ffffff', borderColor: '#2d3142', background: 'transparent' }}
                  onClick={() => setIsStartDateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)', border: 'none', color: '#ffffff', fontWeight: 'bold' }}
                >
                  Salvar e Reposicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding para Gerar/Ajustar Planilha */}
      {isPlanModalOpen && (
        <RunPlanOnboarding
          initialForm={buildOnboardingInitialForm()}
          activeDistances={activePlans.filter(p => p.id !== runningPlan?.id).map(p => p.targetDistance)}
          onComplete={handleWizardComplete}
          onCancel={() => setIsPlanModalOpen(false)}
        />
      )}

      {/* Overlay de carregamento enquanto a IA monta a planilha */}
      {isGeneratingPlan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-body" style={{ padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(59, 130, 246, 0.1)',
                borderTopColor: 'var(--accent-blue)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div>
                <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>IA estruturando sua planilha...</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Montando aquecimentos, tiros técnicos, longões e descansos.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Dia Selecionado */}
      {selectedCalendarDay && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <div style={{ textAlign: 'left' }}>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {new Date(selectedCalendarDay.dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                </span>
                <h3 className="modal-title" style={{ fontSize: '1.25rem', marginTop: '0.15rem', color: '#ffffff', fontWeight: 700 }}>
                  {new Date(selectedCalendarDay.dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', fontSize: '0.85rem' }} 
                onClick={() => setSelectedCalendarDay(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem 0.5rem 1.25rem 0', overflowY: 'auto', flex: 1 }}>
              
              {/* Informações do Treino Planejado (IA) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.9rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Calendar size={15} />
                  Treino Planejado
                </h4>
                
                {selectedCalendarDay.planDay ? (
                  selectedCalendarDay.planDay.isRest ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontStyle: 'italic' }}>
                      <span>💤</span> Dia de Descanso Total ou Recuperação Muscular. Aproveite para relaxar e regenerar suas fibras!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="flex-between">
                        <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
                          Semana {selectedCalendarDay.weekNumber} - {selectedCalendarDay.planDay.dayName}
                        </strong>
                        <span style={{ 
                          background: selectedCalendarDay.planDay.isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)', 
                          color: selectedCalendarDay.planDay.isDone ? '#34d399' : '#60a5fa', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.72rem', 
                          fontWeight: 700 
                        }}>
                          {selectedCalendarDay.planDay.isDone ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                      
                      {(() => {
                        const parsed = parseTrainingText(selectedCalendarDay.planDay!.training);
                        if (!parsed.isParsed) {
                          return (
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                              {selectedCalendarDay.planDay!.training}
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {parsed.title && (
                              <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: 700, textAlign: 'left' }}>
                                {parsed.title}
                              </h4>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              {parsed.warmUp && (
                                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.02)', borderLeft: '3px solid #3b82f6', textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>🧘‍♂️ Aquecimento Ativo</div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{parsed.warmUp}</div>
                                </div>
                              )}
                              {parsed.mainSet && (
                                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.02)', borderLeft: '3px solid #ec4899', textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f472b6', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>⚡ Trabalho Principal</div>
                                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500, lineHeight: '1.5' }}>{parsed.mainSet}</div>
                                </div>
                              )}
                              {parsed.coolDown && (
                                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.02)', borderLeft: '3px solid #10b981', textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>🌀 Volta à Calma</div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{parsed.coolDown}</div>
                                </div>
                              )}
                              {parsed.coachTip && (
                                <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.02)', border: '1px dashed rgba(245, 158, 11, 0.15)', textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.3rem', letterSpacing: '0.8px', textTransform: 'uppercase' }}>💡 Dica do Coach</div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>"{parsed.coachTip}"</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Objetivos Fisiológicos */}
                      {(selectedCalendarDay.planDay.objective || selectedCalendarDay.planDay.successCriteria) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.65rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', fontSize: '0.8rem' }}>
                          {selectedCalendarDay.planDay.objective && (
                            <div>
                              <span style={{ color: '#60a5fa', fontWeight: 700, display: 'block', marginBottom: '0.1rem' }}>🎯 Adaptação Fisiológica:</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{selectedCalendarDay.planDay.objective}</span>
                            </div>
                          )}
                          {selectedCalendarDay.planDay.successCriteria && (
                            <div>
                              <span style={{ color: '#34d399', fontWeight: 700, display: 'block', marginBottom: '0.1rem' }}>✓ Critério de Sucesso:</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{selectedCalendarDay.planDay.successCriteria}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Nenhum treino programado na planilha para este dia.
                  </div>
                )}
              </div>

              {/* Histórico Realizado (Corridas Gravadas) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.9rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <Watch size={15} />
                  Atividade Realizada
                </h4>

                {selectedCalendarDay.runs && selectedCalendarDay.runs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedCalendarDay.runs.map((run) => (
                      <div 
                        key={run.id} 
                        style={{ 
                          background: 'rgba(16, 185, 129, 0.03)', 
                          border: '1px solid rgba(16, 185, 129, 0.15)', 
                          borderRadius: '8px', 
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div className="flex-between">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>🏃‍♂️</span>
                            <div>
                              <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>Corrida de {run.distance} km</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Ritmo de {run.pace} min/km</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.15)', padding: '0.2rem 0.4rem' }}
                            onClick={() => handleDeleteRunFromCalendar(run.id!)}
                          >
                            Excluir
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', textAlign: 'center' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Tempo</span>
                            <strong style={{ color: '#ffffff' }}>{run.time} min</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Frec. Cardíaca</span>
                            <strong style={{ color: '#ffffff' }}>{run.heartRate ? `${run.heartRate} bpm` : '--'}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Calorias</span>
                            <strong style={{ color: '#ffffff' }}>{run.calories ? `${run.calories} kcal` : '--'}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>Nenhuma atividade registrada para esta data.</p>
                    {(!selectedCalendarDay.planDay || !selectedCalendarDay.planDay.isRest) && (
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm" 
                        style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399' }}
                        onClick={() => {
                          // Se houver treino planejado, sugere a distância dele por padrão
                          const defaultDistance = selectedCalendarDay.planDay 
                            ? Number(selectedCalendarDay.planDay.training.match(/\b\d+(?:[\.,]\d+)?\s*(?:km|kms)\b/i)?.[0]?.match(/\d+(?:[\.,]\d+)?/)?.[0] || 5)
                            : 5;
                          
                          setLogFromCalendarData({
                            time: 30,
                            distance: defaultDistance,
                            heartRate: Number(runningPlan?.maxHeartRate ? Math.round(Number(runningPlan.maxHeartRate) * 0.75) : 140),
                            calories: Math.round(defaultDistance * 65),
                            notes: ''
                          });
                          setIsLogFromCalendarOpen(true);
                        }}
                      >
                        Registrar Treino Realizado
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Botão de Conclusão Rápida sem Registrar Logs de Distância */}
              {selectedCalendarDay.planDay && !selectedCalendarDay.planDay.isRest && !selectedCalendarDay.planDay.isDone && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem' }}
                  onClick={() => {
                    handleToggleDayDone(selectedCalendarDay.weekNumber!, selectedCalendarDay.planDay!.dayName, true);
                    setSelectedCalendarDay(prev => {
                      if (!prev || !prev.planDay) return null;
                      return {
                        ...prev,
                        planDay: {
                          ...prev.planDay,
                          isDone: true
                        }
                      };
                    });
                    confetti({ particleCount: 30, spread: 40, colors: ['#10b981'] });
                  }}
                >
                  <CheckCircle size={16} />
                  Apenas marcar dia como concluído
                </button>
              )}
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
              <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setSelectedCalendarDay(null)}>
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Registrar Corrida Realizada a partir do Calendário */}
      {isLogFromCalendarOpen && selectedCalendarDay && (
        <div className="modal-overlay" style={{ zIndex: 1060, background: 'rgba(0, 0, 0, 0.75)' }}>
          <div className="modal-content" style={{ maxWidth: '420px', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 700 }}>
                Registrar Atividade Realizada
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.2rem 0.4rem' }} 
                onClick={() => setIsLogFromCalendarOpen(false)}
              >
                X
              </button>
            </div>
            
            <form onSubmit={handleSaveRunFromCalendar}>
              <div className="modal-body" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', marginBottom: '0.25rem' }}>
                  A atividade será salva no histórico geral de corridas no dia <strong>{new Date(selectedCalendarDay.dateStr + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.
                </div>

                <div className="form-group">
                  <label htmlFor="calDistance">Distância Percorrida (km)</label>
                  <input 
                    id="calDistance"
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={logFromCalendarData.distance}
                    onChange={(e) => {
                      const dist = Number(e.target.value);
                      setLogFromCalendarData({
                        ...logFromCalendarData,
                        distance: dist,
                        calories: Math.round(dist * 65)
                      });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="calTime">Duração Total (minutos)</label>
                  <input 
                    id="calTime"
                    type="number"
                    className="form-control"
                    value={logFromCalendarData.time}
                    onChange={(e) => setLogFromCalendarData({ ...logFromCalendarData, time: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label htmlFor="calHeart">Frec. Cardíaca Média</label>
                    <input 
                      id="calHeart"
                      type="number"
                      className="form-control"
                      value={logFromCalendarData.heartRate}
                      onChange={(e) => setLogFromCalendarData({ ...logFromCalendarData, heartRate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="calCalories">Calorias (kcal)</label>
                    <input 
                      id="calCalories"
                      type="number"
                      className="form-control"
                      value={logFromCalendarData.calories}
                      onChange={(e) => setLogFromCalendarData({ ...logFromCalendarData, calories: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="calNotes">Observações do Treino</label>
                  <textarea 
                    id="calNotes"
                    className="form-control"
                    rows={2}
                    placeholder="Ex: Como se sentiu? Dor, sensação de esforço..."
                    value={logFromCalendarData.notes}
                    onChange={(e) => setLogFromCalendarData({ ...logFromCalendarData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLogFromCalendarOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(90deg, #10b981, #059669)', border: 'none' }}>
                  Salvar Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
