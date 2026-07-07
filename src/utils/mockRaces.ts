export interface MockRace {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  location: string; // ex: 'São Paulo - SP'
  state: string; // ex: 'SP', 'RJ', etc.
  distances: string[]; // ex: ['5km', '10km']
  link: string;
}

export const mockRaces: MockRace[] = [
  {
    id: 'mr-1',
    name: 'Maratona Internacional de São Paulo 2026',
    date: '2026-10-12',
    location: 'São Paulo - SP',
    state: 'SP',
    distances: ['5km', '10km', '21km', '42km'],
    link: 'https://www.yescom.com.br/maratonasp'
  },
  {
    id: 'mr-2',
    name: 'Meia Maratona de Belo Horizonte',
    date: '2026-09-06',
    location: 'Belo Horizonte - MG',
    state: 'MG',
    distances: ['5km', '10km', '21km'],
    link: 'https://www.tbhesportes.com.br'
  },
  {
    id: 'mr-3',
    name: 'Corrida de Reis 2027',
    date: '2027-01-10',
    location: 'Cuiabá - MT',
    state: 'MT',
    distances: ['10km'],
    link: 'https://www.corridadereis.com.br'
  },
  {
    id: 'mr-4',
    name: 'Maratona Internacional de Floripa 2026',
    date: '2026-08-23',
    location: 'Florianópolis - SC',
    state: 'SC',
    distances: ['5km', '10km', '21km', '42km'],
    link: 'https://www.maratonadeflorianopolis.com.br'
  },
  {
    id: 'mr-5',
    name: 'Night Run - Etapa Rio de Janeiro',
    date: '2026-11-07',
    location: 'Rio de Janeiro - RJ',
    state: 'RJ',
    distances: ['5km', '10km'],
    link: 'https://www.nightrun.com.br'
  },
  {
    id: 'mr-6',
    name: 'Circuito das Estações - Primavera SP',
    date: '2026-09-20',
    location: 'São Paulo - SP',
    state: 'SP',
    distances: ['5km', '10km', '13km'],
    link: 'https://www.circuitodasestacoes.com.br'
  },
  {
    id: 'mr-7',
    name: 'Meia Maratona Internacional de Curitiba',
    date: '2026-11-15',
    location: 'Curitiba - PR',
    state: 'PR',
    distances: ['5km', '10km', '21km'],
    link: 'https://www.meiamaratonadecuritiba.com.br'
  },
  {
    id: 'mr-8',
    name: 'Corrida Internacional de São Silvestre 2026',
    date: '2026-12-31',
    location: 'São Paulo - SP',
    state: 'SP',
    distances: ['15km'],
    link: 'https://www.saosilvestre.com.br'
  },
  {
    id: 'mr-9',
    name: 'Maratona de Porto Alegre 2026',
    date: '2026-09-27',
    location: 'Porto Alegre - RS',
    state: 'RS',
    distances: ['7km', '21km', '42km'],
    link: 'https://www.maratonadeportoalegre.com.br'
  },
  {
    id: 'mr-10',
    name: 'Circuito Athenas - Etapa III SP',
    date: '2026-11-29',
    location: 'São Paulo - SP',
    state: 'SP',
    distances: ['5km', '10km', '15km', '21km'],
    link: 'https://www.circuitoathenas.com.br'
  },
  {
    id: 'mr-11',
    name: 'Meia Maratona do Salvador',
    date: '2026-10-18',
    location: 'Salvador - BA',
    state: 'BA',
    distances: ['5km', '10km', '21km'],
    link: 'https://www.meiamaratonadesalvador.com.br'
  },
  {
    id: 'mr-12',
    name: 'Corrida do Círio 2026',
    date: '2026-10-25',
    location: 'Belém - PA',
    state: 'PA',
    distances: ['5km', '10km'],
    link: 'https://www.corridadocirio.com.br'
  }
];

export function searchRaces(query: string, state: string = ''): MockRace[] {
  return mockRaces.filter(race => {
    const matchesQuery = query === '' || 
      race.name.toLowerCase().includes(query.toLowerCase()) || 
      race.location.toLowerCase().includes(query.toLowerCase());
    
    const matchesState = state === '' || race.state === state;
    
    return matchesQuery && matchesState;
  });
}
