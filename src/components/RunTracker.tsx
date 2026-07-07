import React, { useState, useMemo } from 'react';
import { db, type RunLog, type BodyCompLog } from '../utils/db';
import { 
  Footprints, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Heart, 
  Flame, 
  Clock, 
  Activity,
  Award
} from 'lucide-react';
import { Chart as ChartJS, registerables, type ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import confetti from 'canvas-confetti';
import './Styles/runtracker.css';

// Registra módulos do Chart.js
ChartJS.register(...registerables);

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

    db.addBodyCompLog({
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
    });

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
            <button className="btn btn-primary" onClick={() => setIsBodyModalOpen(true)}>
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
                      <th style={{ width: '50px' }}>Ações</th>
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
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.4rem', color: '#ff6b6b' }}
                            onClick={() => handleDeleteBody(log.id)}
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
                Lançar Dados de Bioimpedância
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
    </div>
  );
};
