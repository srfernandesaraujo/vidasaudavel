export interface MockRace {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  location: string; // ex: 'São Paulo - SP'
  state: string; // ex: 'SP', 'RJ', etc.
  distances: string[]; // ex: ['5km', '10km']
  link: string;
  isRecommended?: boolean;
}

const CITY_TO_STATE: Record<string, string> = {
  'natal': 'RN',
  'mossoro': 'RN',
  'recife': 'PE',
  'fortaleza': 'CE',
  'salvador': 'BA',
  'joao pessoa': 'PB',
  'maceio': 'AL',
  'aracaju': 'SE',
  'sao luis': 'MA',
  'teresina': 'PI',
  'sao paulo': 'SP',
  'campinas': 'SP',
  'santos': 'SP',
  'sao jose dos campos': 'SP',
  'ribeirao preto': 'SP',
  'rio de janeiro': 'RJ',
  'niteroi': 'RJ',
  'belo horizonte': 'MG',
  'uberlandia': 'MG',
  'vitoria': 'ES',
  'curitiba': 'PR',
  'londrina': 'PR',
  'florianopolis': 'SC',
  'joinville': 'SC',
  'porto alegre': 'RS',
  'caxias do sul': 'RS',
  'brasilia': 'DF',
  'goiania': 'GO',
  'cuiaba': 'MT',
  'campo grande': 'MS',
  'manaus': 'AM',
  'belem': 'PA',
};

export const mockRaces: MockRace[] = [
  // --- RACES IN NATAL - RN ---
  {
    id: 'mr-natal-1',
    name: 'Meia Maratona do Sol 2026',
    date: '2026-09-19',
    location: 'Natal - RN',
    state: 'RN',
    distances: ['5km', '10km', '21km'],
    link: 'https://www.meiamaratonadosol.com.br',
    isRecommended: true
  },
  {
    id: 'mr-natal-2',
    name: 'Corrida de Ponta Negra 2026',
    date: '2026-11-14',
    location: 'Natal - RN',
    state: 'RN',
    distances: ['5km', '10km'],
    link: 'https://www.corridapontanegra.com.br',
    isRecommended: true
  },
  {
    id: 'mr-natal-3',
    name: 'Circuito das Estações Natal - Primavera',
    date: '2026-10-25',
    location: 'Natal - RN',
    state: 'RN',
    distances: ['5km', '10km'],
    link: 'https://www.circuitodasestacoes.com.br',
    isRecommended: true
  },
  {
    id: 'mr-natal-4',
    name: 'Meia Maratona de Natal 2026',
    date: '2026-12-06',
    location: 'Natal - RN',
    state: 'RN',
    distances: ['5km', '10km', '21km'],
    link: 'https://www.meiamaratonadenatal.com.br',
    isRecommended: false
  },
  {
    id: 'mr-natal-5',
    name: 'Corrida dos Bombeiros RN 2026',
    date: '2026-07-26',
    location: 'Natal - RN',
    state: 'RN',
    distances: ['5km', '10km'],
    link: 'https://www.corridadosbombeirosrn.com.br',
    isRecommended: false
  },

  // --- OTHERS NATIONWIDE ---
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
    id: 'mr-11',
    name: 'Meia Maratona de Salvador',
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

// Função inteligente que filtra e gera corridas simuladas dinamicamente
export function searchRaces(query: string, state: string = ''): MockRace[] {
  // 1. Filtragem estática inicial
  const filtered = mockRaces.filter(race => {
    const matchesQuery = query === '' || 
      race.name.toLowerCase().includes(query.toLowerCase()) || 
      race.location.toLowerCase().includes(query.toLowerCase());
    
    const matchesState = state === '' || race.state === state;
    
    return matchesQuery && matchesState;
  });

  // Se for busca vazia e sem estado, retorna a lista padrão ordenada (recomendadas primeiro)
  if (query === '' && state === '') {
    return [...filtered].sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
  }

  // 2. Se a busca tiver um termo (cidade) e tiver poucos resultados, geramos dinamicamente para essa cidade
  if (query.trim().length >= 3 && filtered.length < 4) {
    const cleanQuery = query.trim();
    const cityCapitalized = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1).toLowerCase();
    
    // Tenta encontrar a UF correspondente no dicionário ou usa o estado selecionado ou 'SP' por padrão
    const normalizedQuery = cleanQuery.toLowerCase();
    let detectedState = state;
    if (!detectedState) {
      detectedState = CITY_TO_STATE[normalizedQuery] || 'SP';
    }

    const simulatedRaces: MockRace[] = [
      {
        id: `sim-${cleanQuery}-1`,
        name: `Meia Maratona de ${cityCapitalized} 2026`,
        date: '2026-10-18',
        location: `${cityCapitalized} - ${detectedState}`,
        state: detectedState,
        distances: ['5km', '10km', '21km'],
        link: 'https://www.ativo.com/calendario'
      },
      {
        id: `sim-${cleanQuery}-2`,
        name: `Circuito das Estações ${cityCapitalized} - Primavera`,
        date: '2026-09-27',
        location: `${cityCapitalized} - ${detectedState}`,
        state: detectedState,
        distances: ['5km', '10km'],
        link: 'https://www.circuitodasestacoes.com.br'
      },
      {
        id: `sim-${cleanQuery}-3`,
        name: `Night Run ${cityCapitalized} 2026`,
        date: '2026-11-21',
        location: `${cityCapitalized} - ${detectedState}`,
        state: detectedState,
        distances: ['5km', '10km'],
        link: 'https://www.nightrun.com.br'
      },
      {
        id: `sim-${cleanQuery}-4`,
        name: `Desafio de Corrida de Rua de ${cityCapitalized}`,
        date: '2026-08-09',
        location: `${cityCapitalized} - ${detectedState}`,
        state: detectedState,
        distances: ['5km', '10km', '15km'],
        link: 'https://www.ticketesportes.com.br'
      }
    ];

    // Junta as estáticas encontradas com as geradas
    // Evita duplicados comparando nomes
    const combined = [...filtered];
    simulatedRaces.forEach(sim => {
      if (!combined.some(r => r.name.toLowerCase() === sim.name.toLowerCase())) {
        combined.push(sim);
      }
    });

    return combined;
  }

  return filtered;
}
