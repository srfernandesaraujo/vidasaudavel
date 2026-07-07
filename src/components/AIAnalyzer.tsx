import React, { useState, useEffect } from 'react';
import { generateHealthAnalysis, type AnalysisReport } from '../utils/aiEngine';
import { 
  TrendingUp, 
  AlertTriangle, 
  FileSpreadsheet, 
  HeartPulse, 
  RefreshCw, 
  Sparkles,
  Info
} from 'lucide-react';
import './Styles/aianalyzer.css';

export const AIAnalyzer: React.FC = () => {
  const [report, setReport] = useState<AnalysisReport>({ progression: [], risks: [], labExams: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simula uma análise rápida lendo os dados
    setTimeout(() => {
      const data = generateHealthAnalysis();
      setReport(data);
      setIsAnalyzing(false);
    }, 600);
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={28} color="var(--accent-orange)" />
            Análise e Saúde IA
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Laudo automatizado sobre desenvolvimento muscular, fadiga cardíaca e sugestões de exames laboratoriais.</p>
        </div>

        <button className="btn btn-primary" onClick={runAnalysis} disabled={isAnalyzing}>
          <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
          {isAnalyzing ? 'Analisando...' : 'Reavaliar Dados'}
        </button>
      </header>

      {/* Caixa de Geração */}
      <div className="report-generation-box">
        <div className="report-generation-text">
          <div className="report-generation-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent-purple)" />
            Como funciona o laudo?
          </div>
          <div>O motor de IA local analisa o histórico de cargas registradas nos treinos, as variações de pace de corrida e a evolução dos marcadores de bioimpedância de forma automatizada para extrair alertas.</div>
        </div>
      </div>

      {/* Alerta de Destaque se houver riscos reais */}
      {report.risks.some(r => r.includes('⚠️')) && (
        <div className="alert-warning-glass">
          <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} color="var(--accent-orange)" />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.95rem' }}>Atenção: Marcadores de Risco Detectados</strong>
            Sua planilha de exercícios ou composição corporal recente acendeu marcadores de atenção. Considere os períodos de descanso e as sugestões de exames abaixo para resguardar as articulações e o sistema metabólico.
          </div>
        </div>
      )}

      {/* Grid de Colunas */}
      <div className="analyzer-grid">
        {/* Coluna 1: Desenvolvimento & Progresso */}
        <div className="glass-card analyzer-card progress-col">
          <h3 className="analyzer-card-title">
            <TrendingUp size={18} color="var(--accent-emerald)" />
            Desenvolvimento
          </h3>
          {report.progression.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Sem dados suficientes de progresso.
            </div>
          ) : (
            <ul className="analyzer-list">
              {report.progression.map((item, idx) => (
                <li key={idx} className="analyzer-list-item">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Coluna 2: Riscos & Cuidados */}
        <div className="glass-card analyzer-card risk-col">
          <h3 className="analyzer-card-title">
            <AlertTriangle size={18} color="var(--accent-orange)" />
            Riscos e Cuidados
          </h3>
          {report.risks.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum risco detectado.
            </div>
          ) : (
            <ul className="analyzer-list">
              {report.risks.map((item, idx) => (
                <li key={idx} className="analyzer-list-item">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Coluna 3: Acompanhamento Laboratorial */}
        <div className="glass-card analyzer-card exam-col">
          <h3 className="analyzer-card-title">
            <FileSpreadsheet size={18} color="var(--accent-blue)" />
            Painel de Exames
          </h3>
          {report.labExams.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum exame específico sugerido no momento.
            </div>
          ) : (
            <ul className="analyzer-list">
              {report.labExams.map((item, idx) => (
                <li key={idx} className="analyzer-list-item">
                  {item}
                </li>
              ))}
            </ul>
          )}
          
          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ textAlign: 'left' }}>As indicações acima são apenas sugestões educativas com base nas atividades físicas e bioimpedância. Sempre consulte um médico.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
