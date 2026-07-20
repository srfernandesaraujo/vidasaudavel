import React, { useState } from 'react';
import { type UserSettings } from '../utils/db';
import { type RunningPlanRequest } from '../utils/aiEngine';
import { X, ChevronLeft } from 'lucide-react';

export interface RunOnboardingForm {
  goalType: string;
  skillLevel: 'iniciante' | 'intermediario' | 'avancado' | '';
  injuryHistory: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: string;
  availableDays: string[];
  referencePace: string;
  daysPerWeek: string;
  targetDistance: string;
  weeksCount: string;
  longRunDay: string;
  startDateOption: 'hoje' | 'amanha' | 'segunda' | 'personalizado';
  customStartDate: string;
  hasWearable: boolean;
  maxHeartRate: string;
  replaceExisting: boolean;
}

interface Props {
  initialForm: RunOnboardingForm;
  activeDistances: number[];
  onComplete: (request: RunningPlanRequest, profileUpdates: Partial<UserSettings>) => void;
  onCancel: () => void;
}

const WEEKDAYS = [
  { key: 'segunda', label: 'Segunda-feira', short: 'Seg' },
  { key: 'terca', label: 'Terça-feira', short: 'Ter' },
  { key: 'quarta', label: 'Quarta-feira', short: 'Qua' },
  { key: 'quinta', label: 'Quinta-feira', short: 'Qui' },
  { key: 'sexta', label: 'Sexta-feira', short: 'Sex' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
  { key: 'domingo', label: 'Domingo', short: 'Dom' }
];

const cardStyle = (isSelected: boolean, accent: string): React.CSSProperties => ({
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  background: isSelected ? `${accent}1f` : 'rgba(255,255,255,0.01)',
  border: isSelected ? `2px solid ${accent}` : '1px solid var(--border-subtle)',
  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
  textAlign: 'left',
  cursor: 'pointer',
  width: '100%',
  transition: 'all 0.2s ease'
});

export const RunPlanOnboarding: React.FC<Props> = ({ initialForm, activeDistances, onComplete, onCancel }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RunOnboardingForm>(initialForm);

  const update = (patch: Partial<RunOnboardingForm>) => setForm(prev => ({ ...prev, ...patch }));

  const distanceConflict = activeDistances.includes(Number(form.targetDistance));
  const maxDaysPerWeek = Math.max(form.availableDays.length, 1);

  const steps: { title: string; isValid: boolean }[] = [
    { title: 'Qual é a sua meta?', isValid: !!form.goalType },
    { title: 'Nível de corrida', isValid: !!form.skillLevel },
    { title: 'Histórico de lesões', isValid: !!form.injuryHistory },
    { title: 'Data de nascimento', isValid: !!(form.birthDay && form.birthMonth && form.birthYear) },
    { title: 'Gênero', isValid: !!form.gender },
    { title: 'Dias disponíveis', isValid: form.availableDays.length >= 3 },
    { title: 'Pace atual', isValid: /^\d{2}:\d{2}$/.test(form.referencePace) },
    { title: 'Dias por semana', isValid: !!form.daysPerWeek },
    { title: 'Distância alvo', isValid: !!form.targetDistance && (!distanceConflict || form.replaceExisting) },
    { title: 'Duração do plano', isValid: !!form.weeksCount },
    { title: 'Dia do treino longo', isValid: !!form.longRunDay },
    { title: 'Data de início', isValid: form.startDateOption !== 'personalizado' || !!form.customStartDate },
    { title: 'Smartwatch', isValid: !form.hasWearable || !!form.maxHeartRate },
    { title: 'Resumo', isValid: true }
  ];

  const current = steps[step];
  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  const goNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const toggleAvailableDay = (key: string) => {
    const isSelected = form.availableDays.includes(key);
    const updated = isSelected ? form.availableDays.filter(d => d !== key) : [...form.availableDays, key];
    const patch: Partial<RunOnboardingForm> = { availableDays: updated };
    // Se o dia do longão deixou de estar disponível, limpa a seleção
    if (isSelected && form.longRunDay === key) patch.longRunDay = '';
    // Garante que dias por semana nunca ultrapasse a nova quantidade disponível
    if (Number(form.daysPerWeek) > Math.max(updated.length, 1)) patch.daysPerWeek = String(Math.max(updated.length, 1));
    update(patch);
  };

  const computeStartDate = (): string => {
    const today = new Date();
    if (form.startDateOption === 'personalizado' && form.customStartDate) return form.customStartDate;
    const d = new Date(today);
    if (form.startDateOption === 'amanha') d.setDate(d.getDate() + 1);
    if (form.startDateOption === 'segunda') {
      const diff = (8 - d.getDay()) % 7 || 7;
      d.setDate(d.getDate() + diff);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleFinish = () => {
    const birthDate = form.birthDay && form.birthMonth && form.birthYear
      ? `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`
      : undefined;
    const age = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined;

    const request: RunningPlanRequest = {
      targetDistance: Number(form.targetDistance),
      weeksCount: Number(form.weeksCount),
      hasWearable: form.hasWearable,
      maxHeartRate: Number(form.maxHeartRate) || 0,
      referencePace: form.referencePace,
      availableDays: form.availableDays,
      daysPerWeek: Number(form.daysPerWeek),
      longRunDay: form.longRunDay,
      skillLevel: (form.skillLevel || 'intermediario') as any,
      injuryHistory: form.injuryHistory,
      age,
      gender: form.gender,
      goalType: form.goalType,
      startDate: computeStartDate()
    };

    const profileUpdates: Partial<UserSettings> = {
      birthDate,
      gender: form.gender as any,
      runningSkillLevel: (form.skillLevel || undefined) as any,
      injuryHistory: form.injuryHistory as any,
      availableRunDays: form.availableDays
    };

    onComplete(request, profileUpdates);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { value: 'prova', label: 'Prova', desc: 'Receba um plano personalizado com base em uma prova futura' },
              { value: 'distancia', label: 'Correr uma distância específica', desc: 'Escolha sua distância, de 5 km a uma ultramaratona' },
              { value: 'comecar', label: 'Começar a correr', desc: 'Plano introdutório para quem está começando agora' },
              { value: 'retornar', label: 'Retornar à corrida', desc: 'Volte a treinar com segurança após uma pausa' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.goalType === opt.value, '#3b82f6')} onClick={() => update({ goalType: opt.value })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.15rem' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        );
      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { value: 'iniciante', label: 'Iniciante', desc: 'Você pode completar uma corrida de 5 km sem parar, em menos de 60 minutos' },
              { value: 'intermediario', label: 'Intermediário', desc: 'Você corre regularmente pelo menos 5 km, mas não estrutura o treinamento' },
              { value: 'avancado', label: 'Avançado', desc: 'Você corre regularmente mais de 10 km e faz treinamento estruturado' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.skillLevel === opt.value, '#8b5cf6')} onClick={() => update({ skillLevel: opt.value as any })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.15rem' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        );
      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.25rem 0' }}>
              Isso não substitui aconselhamento médico. Se sentir dor, consulte um profissional de saúde.
            </p>
            {[
              { value: 'raramente', label: 'Raramente ou nunca se lesiona' },
              { value: 'leves-anteriores', label: 'Ferimentos leves ou significativos anteriores' },
              { value: 'frequentes-recentes', label: 'Lesões frequentes ou recentes' },
              { value: 'prefiro-nao-responder', label: 'Prefiro não responder' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.injuryHistory === opt.value, '#ec4899')} onClick={() => update({ injuryHistory: opt.value })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
              </button>
            ))}
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Dia</label>
              <select className="form-control" value={form.birthDay} onChange={e => update({ birthDay: e.target.value })}>
                <option value="">--</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Mês</label>
              <select className="form-control" value={form.birthMonth} onChange={e => update({ birthMonth: e.target.value })}>
                <option value="">--</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={String(m)}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label>Ano</label>
              <select className="form-control" value={form.birthYear} onChange={e => update({ birthYear: e.target.value })}>
                <option value="">----</option>
                {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { value: 'feminino', label: 'Feminino' },
              { value: 'masculino', label: 'Masculino' },
              { value: 'nao-binario', label: 'Não binário' },
              { value: 'prefiro-nao-responder', label: 'Prefiro não responder' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.gender === opt.value, '#10b981')} onClick={() => update({ gender: opt.value })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
              </button>
            ))}
          </div>
        );
      case 5:
        return (
          <div>
            <p style={{ color: form.availableDays.length >= 3 ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.75rem 0', fontWeight: 600 }}>
              Selecione pelo menos 3 dias para continuar
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {WEEKDAYS.map(d => {
                const isSelected = form.availableDays.includes(d.key);
                return (
                  <button key={d.key} type="button" style={cardStyle(isSelected, '#3b82f6')} onClick={() => toggleAvailableDay(d.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{d.label}</span>
                      {isSelected && <span style={{ color: '#60a5fa' }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="form-group">
            <label htmlFor="obPace">Pace de referência (min/km para 5km — MM:SS)</label>
            <input id="obPace" type="text" className="form-control" placeholder="Ex: 06:00" value={form.referencePace}
              onChange={e => update({ referencePace: e.target.value })} pattern="^[0-9]{2}:[0-9]{2}$" />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Pré-preenchido com base no seu histórico de corridas reais. Ajuste se souber um valor mais preciso.
            </p>
          </div>
        );
      case 7: {
        const options = Array.from({ length: maxDaysPerWeek }, (_, i) => i + 1);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.25rem 0' }}>
              Limitado aos {maxDaysPerWeek} dias que você marcou como disponíveis.
            </p>
            {options.map(n => (
              <button key={n} type="button" style={cardStyle(form.daysPerWeek === String(n), '#3b82f6')} onClick={() => update({ daysPerWeek: String(n) })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{n} {n === 1 ? 'dia' : 'dias'} por semana</div>
              </button>
            ))}
          </div>
        );
      }
      case 8:
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
              {[
                { value: '5', label: '5 km', desc: 'Iniciante / Sprint' },
                { value: '10', label: '10 km', desc: 'Intermediário' },
                { value: '15', label: '15 km', desc: 'Avançado' },
                { value: '21.1', label: '21.1 km', desc: 'Meia Maratona' },
                { value: '42.2', label: '42.2 km', desc: 'Maratona' }
              ].map(opt => (
                <button key={opt.value} type="button" style={cardStyle(form.targetDistance === opt.value, '#3b82f6')} onClick={() => update({ targetDistance: opt.value, replaceExisting: false })}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '0.1rem' }}>{opt.desc}</div>
                </button>
              ))}
            </div>
            {distanceConflict && (
              <div style={{ marginTop: '0.85rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: '#fbbf24' }}>
                  Você já tem uma planilha ativa de {form.targetDistance} km.
                </p>
                <label className="checkbox-label" style={{ fontSize: '0.82rem' }}>
                  <input type="checkbox" checked={form.replaceExisting} onChange={e => update({ replaceExisting: e.target.checked })} />
                  <span>Substituir a planilha existente dessa distância</span>
                </label>
              </div>
            )}
          </div>
        );
      case 9:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            {[
              { value: '4', label: '4 Semanas', desc: 'Preparo Rápido' },
              { value: '8', label: '8 Semanas', desc: 'Tempo Ideal' },
              { value: '12', label: '12 Semanas', desc: 'Recomendado' },
              { value: '16', label: '16 Semanas', desc: 'Preparo Completo' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.weeksCount === opt.value, '#8b5cf6')} onClick={() => update({ weeksCount: opt.value })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '0.1rem' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        );
      case 10:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {WEEKDAYS.filter(d => form.availableDays.includes(d.key)).map(d => (
              <button key={d.key} type="button" style={cardStyle(form.longRunDay === d.key, '#10b981')} onClick={() => update({ longRunDay: d.key })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{d.label}</div>
              </button>
            ))}
          </div>
        );
      case 11:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { value: 'hoje', label: 'Hoje' },
              { value: 'amanha', label: 'Amanhã' },
              { value: 'segunda', label: 'Próxima segunda-feira' },
              { value: 'personalizado', label: 'Personalizado' }
            ].map(opt => (
              <button key={opt.value} type="button" style={cardStyle(form.startDateOption === opt.value, '#3b82f6')} onClick={() => update({ startDateOption: opt.value as any })}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{opt.label}</div>
              </button>
            ))}
            {form.startDateOption === 'personalizado' && (
              <input type="date" className="form-control" value={form.customStartDate} onChange={e => update({ customStartDate: e.target.value })} />
            )}
          </div>
        );
      case 12:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '0.85rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', display: 'block' }}>Smartwatch / Wearable</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Possui monitor cardíaco?</span>
              </div>
              <button type="button" onClick={() => update({ hasWearable: !form.hasWearable })}
                style={{ width: '42px', height: '22px', borderRadius: '99px', background: form.hasWearable ? '#3b82f6' : 'rgba(255,255,255,0.1)', border: 'none', position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ffffff', position: 'absolute', top: '3px', left: form.hasWearable ? '23px' : '3px', transition: 'left 0.3s ease' }} />
              </button>
            </div>
            {form.hasWearable && (
              <div className="form-group">
                <label htmlFor="obFc">Frequência Cardíaca Máxima (FCM em bpm)</label>
                <input id="obFc" type="number" className="form-control" placeholder="Ex: 190" value={form.maxHeartRate} onChange={e => update({ maxHeartRate: e.target.value })} />
              </div>
            )}
          </div>
        );
      case 13: {
        const longRunLabel = WEEKDAYS.find(d => d.key === form.longRunDay)?.label || '--';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', textAlign: 'left' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Confira os principais parâmetros antes de gerar:</p>
            <div><strong style={{ color: '#60a5fa' }}>Distância alvo:</strong> {form.targetDistance} km</div>
            <div><strong style={{ color: '#60a5fa' }}>Duração:</strong> {form.weeksCount} semanas</div>
            <div><strong style={{ color: '#60a5fa' }}>Dias de treino:</strong> {form.daysPerWeek}x por semana</div>
            <div><strong style={{ color: '#60a5fa' }}>Treino longo:</strong> {longRunLabel}</div>
            <div><strong style={{ color: '#60a5fa' }}>Início:</strong> {computeStartDate()}</div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem', visibility: step > 0 ? 'visible' : 'hidden' }} onClick={goBack}>
              <ChevronLeft size={15} />
            </button>
            <h3 className="modal-title" style={{ fontSize: '1.05rem', margin: 0 }}>{current.title}</h3>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.3rem 0.5rem' }} onClick={onCancel}>
              <X size={15} />
            </button>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.25s ease' }} />
          </div>
        </div>

        <div className="modal-body" style={{ textAlign: 'left', maxHeight: '55vh', overflowY: 'auto' }}>
          {renderStep()}
        </div>

        <div className="modal-footer">
          {step < steps.length - 1 ? (
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} disabled={!current.isValid} onClick={goNext}>
              Continuar
            </button>
          ) : (
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleFinish}>
              Gerar Minha Planilha
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
