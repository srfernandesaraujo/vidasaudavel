import React, { useState, useMemo } from 'react';
import { db, type RaceRegistration } from '../utils/db';
import { searchRaces, type MockRace } from '../utils/mockRaces';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar as CalendarIcon, 
  MapPin, 
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';
import './Styles/calendar.css';

export const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Iniciando em Julho de 2026 (conforme o local time do sistema)
  
  // Buscar dados
  const [races, setRaces] = useState<RaceRegistration[]>(db.getRaces());
  const workoutLogs = db.getWorkoutLogs();
  const runLogs = db.getRunLogs();

  // Estados de busca de corrida
  const [searchQuery, setSearchQuery] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<MockRace[]>(searchRaces('', ''));

  const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
    'SP', 'SE', 'TO'
  ];

  const refreshData = () => {
    setRaces(db.getRaces());
  };

  // -------------------------------------------------------------
  // LÓGICA DO CALENDÁRIO
  // -------------------------------------------------------------
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Dias a exibir no grid (incluindo preenchimento de meses adjacentes)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const numDaysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo, 6 = Sábado

    const cells = [];

    // Dias do mês anterior para preenchimento
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthLastDay - i,
        dateString: new Date(year, month - 1, prevMonthLastDay - i).toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= numDaysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      // Ajusta timezone offset para evitar mudança de dia no ISO string
      const tzOffset = dayDate.getTimezoneOffset() * 60000;
      const localDate = new Date(dayDate.getTime() - tzOffset);
      
      cells.push({
        day: i,
        dateString: localDate.toISOString().split('T')[0],
        isCurrentMonth: true
      });
    }

    // Dias do próximo mês para completar o grid (múltiplo de 7, totalizando 35 ou 42 células)
    const totalCells = cells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        day: i,
        dateString: new Date(year, month + 1, i).toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }

    return cells;
  }, [year, month]);

  // Indexação de eventos por data (para acesso O(1) no grid)
  const eventsByDate = useMemo(() => {
    const index: Record<string, Array<{ type: 'workout' | 'run' | 'race'; label: string; details?: string }>> = {};

    // 1. Logs de Musculação
    workoutLogs.forEach(log => {
      if (!index[log.date]) index[log.date] = [];
      index[log.date].push({
        type: 'workout',
        label: log.workoutName,
        details: `${log.exercises.length} ex.`
      });
    });

    // 2. Logs de Corrida
    runLogs.forEach(run => {
      if (!index[run.date]) index[run.date] = [];
      index[run.date].push({
        type: 'run',
        label: `Corrida ${run.distance}km`,
        details: `${run.time}min @ ${run.pace}`
      });
    });

    // 3. Corridas Inscritas
    races.forEach(race => {
      if (!index[race.date]) index[race.date] = [];
      index[race.date].push({
        type: 'race',
        label: race.name,
        details: race.distance
      });
    });

    return index;
  }, [workoutLogs, runLogs, races]);

  // -------------------------------------------------------------
  // LÓGICA DE BUSCA DE CORRIDAS
  // -------------------------------------------------------------
  const handleSearchRaces = (e: React.FormEvent) => {
    e.preventDefault();
    const results = searchRaces(searchQuery, searchState);
    setSearchResults(results);
  };

  const handleToggleRaceSubscription = (mockRace: MockRace) => {
    const isAlreadyRegistered = races.some(r => r.name === mockRace.name && r.date === mockRace.date);

    if (isAlreadyRegistered) {
      // Remove do banco
      const existing = races.find(r => r.name === mockRace.name && r.date === mockRace.date);
      if (existing) {
        db.deleteRace(existing.id);
      }
    } else {
      // Adiciona ao banco
      db.saveRace({
        id: `race-${Date.now()}`,
        name: mockRace.name,
        date: mockRace.date,
        location: mockRace.location,
        distance: mockRace.distances.join(' / '),
        link: mockRace.link,
        isRegistered: true
      });
    }

    refreshData();
  };

  const isUserRegisteredForMockRace = (mockRace: MockRace) => {
    return races.some(r => r.name === mockRace.name && r.date === mockRace.date && r.isRegistered);
  };

  return (
    <div className="calendar-layout">
      {/* Esquerda: O Calendário */}
      <section className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="calendar-header-nav">
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} color="var(--accent-purple)" />
            Cronograma Integrado
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-month-title">{months[month]} {year}</span>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Grade do Calendário */}
        <div className="calendar-grid">
          {/* Cabeçalho dias da semana */}
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}

          {/* Células de dias */}
          {calendarCells.map((cell, idx) => {
            const dayEvents = eventsByDate[cell.dateString] || [];
            const isToday = cell.dateString === new Date().toISOString().split('T')[0];
            
            return (
              <div 
                key={idx} 
                className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`}
              >
                <span className="calendar-day-number">{cell.day}</span>
                
                <div className="calendar-events-container">
                  {dayEvents.slice(0, 3).map((ev, evIdx) => (
                    <div 
                      key={evIdx} 
                      className={`calendar-event-pill event-${ev.type}`}
                      title={`${ev.label} ${ev.details ? `(${ev.details})` : ''}`}
                    >
                      {ev.label}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '4px' }}>
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(16, 185, 129, 0.2)', borderLeft: '2px solid var(--accent-emerald)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Musculação Concluída</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0, 229, 255, 0.2)', borderLeft: '2px solid var(--accent-blue)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Corrida de Treino</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255, 107, 74, 0.2)', borderLeft: '2px solid var(--accent-orange)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Provas Inscritas</span>
          </div>
        </div>
      </section>

      {/* Direita: Buscador de Corridas no Brasil */}
      <section className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
          <Search size={20} color="var(--accent-blue)" />
          Calendário de Corridas BR
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'left' }}>
          Pesquise provas de corrida oficiais no Brasil e marque presença para exibi-las em sua agenda.
        </p>

        <form onSubmit={handleSearchRaces} className="race-search-box">
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, padding: '0.5rem 0.85rem' }}
            placeholder="Buscar por nome ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-control"
            style={{ width: '90px', padding: '0.5rem 0.5rem' }}
            value={searchState}
            onChange={(e) => setSearchState(e.target.value)}
          >
            <option value="">Todos</option>
            {ufs.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-accent" style={{ padding: '0.5rem 1rem' }}>
            Buscar
          </button>
        </form>

        {/* Lista de Resultados */}
        <div className="race-results-list">
          {searchResults.length === 0 ? (
            <div style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhuma corrida encontrada para os filtros selecionados.
            </div>
          ) : (
            searchResults.map((race) => {
              const isRegistered = isUserRegisteredForMockRace(race);
              const [rYear, rMonth, rDay] = race.date.split('-');

              return (
                <div key={race.id} className="race-card">
                  <div className="race-card-top">
                    <span className="race-card-title">{race.name}</span>
                    <button 
                      onClick={() => handleToggleRaceSubscription(race)}
                      className="btn" 
                      style={{ 
                        padding: '0.35rem 0.6rem', 
                        fontSize: '0.75rem',
                        background: isRegistered ? 'rgba(255, 107, 74, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                        border: isRegistered ? '1px solid var(--accent-orange)' : '1px solid var(--accent-blue)',
                        color: isRegistered ? '#ffa38f' : '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {isRegistered ? (
                        <>
                          <Trash2 size={12} />
                          Remover
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          Inscrever
                        </>
                      )}
                    </button>
                  </div>

                  <div className="race-card-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CalendarIcon size={12} color="var(--text-muted)" />
                      {`${rDay}/${rMonth}/${rYear}`}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin size={12} color="var(--text-muted)" />
                      {race.location}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <div className="race-card-distances">
                      {race.distances.map((dist, dIdx) => (
                        <span key={dIdx} className="distance-badge">{dist}</span>
                      ))}
                    </div>
                    
                    <a 
                      href={race.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--accent-blue)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.2rem',
                        textDecoration: 'none'
                      }}
                    >
                      Inscrição
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
