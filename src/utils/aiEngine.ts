import { db, type Exercise, type WorkoutLog, type RunLog, type BodyCompLog } from './db';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalysisReport {
  progression: string[];
  risks: string[];
  labExams: string[];
}

// Prompt do Sistema que carrega o contexto do Usuário para as APIs reais
function generateSystemPrompt(contextData: {
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  runLogs: RunLog[];
  bodyCompLogs: BodyCompLog[];
}) {
  const { exercises, workoutLogs, runLogs, bodyCompLogs } = contextData;
  const settings = db.getSettings();

  const formattedExercises = exercises.map(e => `- ${e.name} (${e.muscleGroup}) - Treino: ${e.workoutId}, Séries: ${e.series}, Repetições: ${e.repetitions}, PR Peso: ${e.prWeight}kg`).join('\n');
  const formattedWorkouts = workoutLogs.slice(0, 5).map(l => `- ${l.date}: ${l.workoutName} (${l.exercises.map(e => `${e.name} ${e.weight}kg`).join(', ')})`).join('\n');
  const formattedRuns = runLogs.slice(0, 5).map(r => `- ${r.date}: Distância ${r.distance}km, Tempo ${r.time}min, Pace ${r.pace} min/km, FC ${r.heartRate} bpm`).join('\n');
  const latestBody = bodyCompLogs[bodyCompLogs.length - 1];
  const formattedBody = latestBody 
    ? `Peso: ${latestBody.weight}kg (Meta: ${latestBody.idealWeight}kg), Gordura: ${latestBody.bodyFat}% (Meta: ${latestBody.bodyFatGoal}%), Massa Muscular: ${latestBody.muscleMass}kg (Meta: ${latestBody.muscleMassGoal}kg), Água: ${latestBody.bodyWater}%, Gordura Visceral: ${latestBody.visceralFat} (Meta: ${latestBody.visceralFatGoal}), Idade Metabólica: ${latestBody.metabolicAge} anos, FC Repouso: ${latestBody.heartRate} bpm`
    : 'Nenhum registro de composição corporal ainda.';

  return `Você é o Treinador Pessoal e Consultor de Saúde de IA do sistema "Vida Saudável". Seu papel é orientar o usuário em seus treinos de musculação e corrida, dar conselhos práticos e fazer análises de progresso e riscos de saúde.

Aqui estão os dados atuais do usuário:
Nome: ${settings.userName}
Altura: ${settings.height} cm

EXERCÍCIOS CADASTRADOS:
${formattedExercises || 'Nenhum exercício cadastrado.'}

ÚLTIMOS TREINOS REALIZADOS:
${formattedWorkouts || 'Nenhum treino realizado ainda.'}

ÚLTIMAS CORRIDAS REGISTRADAS:
${formattedRuns || 'Nenhuma corrida registrada ainda.'}

ÚLTIMA COMPOSIÇÃO CORPORAL (BIOIMPEDÂNCIA):
${formattedBody}

Diretrizes de resposta:
1. Seja motivador, técnico, científico e amigável.
2. Dê respostas formatadas em Markdown com títulos, listas e negritos.
3. Ao responder sobre dores ou fadiga extrema, lembre-se de orientar a procurar um médico e sugira exames laboratoriais se for o caso (ex: CPK para lesão muscular, cortisol para estresse/overtraining, hemograma para fadiga/anemia, etc.).
4. Responda em português brasileiro (pt-BR).`;
}

// -------------------------------------------------------------
// MOTOR DE IA LOCAL (SIMULADO)
// -------------------------------------------------------------
function generateLocalResponse(userMessage: string): string {
  const query = userMessage.toLowerCase();
  const settings = db.getSettings();
  const runLogs = db.getRunLogs();
  const bodyCompLogs = db.getBodyCompLogs();
  const exercises = db.getExercises();

  if (query.includes('olá') || query.includes('oi') || query.includes('bom dia') || query.includes('boa tarde')) {
    return `Olá, **${settings.userName}**! Sou o seu Treinador Particular de IA. 

Como posso te ajudar hoje? Posso:
- Sugerir ajustes na sua planilha de treinos.
- Dar dicas para melhorar o seu **pace** na corrida.
- Analisar a sua composição corporal recente.
- Sugerir formas de evitar lesões e exames para acompanhar sua recuperação.`;
  }

  if (query.includes('pace') || query.includes('correr') || query.includes('corrida') || query.includes('maratona')) {
    if (runLogs.length === 0) {
      return `Para que eu possa te dar dicas específicas de corrida, que tal registrar alguns treinos de corrida no painel?
      
**Dica Geral:** Para melhorar seu pace (velocidade por km), tente incluir treinos de **tiro** (treino intervalado de alta intensidade) uma vez por semana, treinos de ritmo (tempo run) e um treino longo mais lento (longão) no final de semana para construir resistência aeróbica.`;
    }
    const lastRun = runLogs[0];
    return `Analisando seu último treino de corrida em **${lastRun.date}** (distância de **${lastRun.distance} km** com pace médio de **${lastRun.pace} min/km**):

Para evoluir seu pace:
1. **Treino Intervalado (Tiros):** Faça aquecimento de 10 min e repita 6x tiros de 800m no ritmo mais rápido que conseguir, descansando 2 min caminhando entre eles.
2. **Fortalecimento:** Lembre-se que exercícios de perna (como Agachamento e Avanço) e panturrilha aumentam a potência da passada.
3. **Frequência Cardíaca:** Sua FC média foi de **${lastRun.heartRate} bpm**. Mantenha os treinos longos em uma zona confortável (zona 2, cerca de 130-145 bpm) para otimizar o metabolismo de gordura e aumentar a base mitocondrial.`;
  }

  if (query.includes('dor') || query.includes('machuc') || query.includes('les') || query.includes('ombro') || query.includes('joelho') || query.includes('articulacao')) {
    return `⚠️ **Alerta Importante sobre Dor:** 
Dores articulares ou pontadas agudas diferem da dor muscular tardia clássica do treino.

**O que fazer imediatamente:**
1. **Repouso:** Suspenda os treinos que recrutam a área afetada.
2. **Gelo:** Aplique gelo por 15-20 minutos no local, 3 vezes ao dia.
3. **Exames e Médico:** Recomendo consultar um ortopedista ou fisioterapeuta. Se a dor for no ombro ou joelho por esforço repetitivo, exames de imagem (como Ultrassom ou Ressonância Magnética) e exames de sangue para marcadores inflamatórios (Proteína C Reativa - PCR e VHS) podem ser solicitados pelo médico para avaliar o grau da inflamação.`;
  }

  if (query.includes('exame') || query.includes('laborat') || query.includes('sangue')) {
    return `Como seu treinador de IA, recomendo fazer um acompanhamento laboratorial semestral. Aqui estão os principais exames recomendados para atletas e praticantes de musculação:

1. **Recuperação e Dano Muscular:**
   - **CPK (Creatina Fosfoquinase):** Indica o nível de microlesão e estresse das fibras musculares. Valores excessivamente altos fora do período de repouso indicam risco de overtraining.
2. **Equilíbrio Hormonal:**
   - **Testosterona Total e Livre / Estradiol:** Essenciais para a síntese proteica, força e recuperação muscular.
   - **Cortisol (coleta matinal):** Hormônio do estresse. Relação Cortisol/Testosterona desequilibrada aponta overtraining e catabolismo.
3. **Mapeamento Metabólico e Nutricional:**
   - **Hemograma Completo:** Avaliação de glóbulos vermelhos (oxigenação dos músculos) para descartar anemias.
   - **Ferritina e Ferro Sérico:** Níveis baixos afetam diretamente a performance aeróbica (energia na corrida).
   - **Vitamina D3 e B12:** Importantes para a saúde óssea, imunidade e condução neuromuscular.
4. **Função Renal e Hepática:**
   - **Ureia e Creatinina:** Avaliação dos rins, especialmente se você consome suplementação de creatina e alta ingestão de proteínas.`;
  }

  if (query.includes('treino') || query.includes('musculacao') || query.includes('exercicio')) {
    if (exercises.length === 0) {
      return `Você ainda não tem exercícios cadastrados nos seus treinos. Vá para a aba **Musculação** e cadastre seus treinos e rotinas para que eu possa montar um plano de ação personalizado!`;
    }
    return `Vi que você possui **${exercises.length} exercícios** cadastrados na sua rotina atual.

**Estratégias de Treinamento recomendadas:**
- **Progressão de Carga (Sobrecarga Progressiva):** Tente aumentar a carga (ou o número de repetições com a mesma carga) a cada 2 semanas nos exercícios multiarticulares como Supino Reto e Levantamento Terra.
- **Cadência e Amplitude:** Controle a fase excêntrica do movimento (a descida do peso, levando cerca de 3 segundos) para maximizar o recrutamento de fibras e evitar o uso de momentum/impulso.
- **Tempo de Descanso:** Descanse entre **1:30 min e 2:00 min** em exercícios pesados para permitir a regeneração dos estoques de ATP-CP, garantindo que a próxima série seja feita com máxima performance.`;
  }

  if (query.includes('dieta') || query.includes('aliment') || query.includes('comer') || query.includes('suplement')) {
    const latestComp = bodyCompLogs[bodyCompLogs.length - 1];
    let compText = '';
    if (latestComp) {
      compText = ` Com seu peso atual de **${latestComp.weight} kg** e percentual de gordura de **${latestComp.bodyFat}%**, seu gasto energético é estimado e precisamos ajustar os macros.`;
    }
    return `Embora estejamos detalhando o módulo de Exercício e Corrida, aqui vai uma orientação nutricional rápida para complementar seus treinos:${compText}

1. **Proteínas:** Consuma cerca de **1.6g a 2.0g de proteína por kg** de peso corporal para regeneração muscular. Boas fontes: ovos, frango, peixe, carne magra, queijo cottage e Whey Protein.
2. **Carboidratos:** São a gasolina do corredor! Consuma carboidratos complexos (aveia, batata-doce, arroz integral) 2h antes do treino de corrida para evitar a hipoglicemia e garantir energia.
3. **Hidratação:** Beba pelo menos **35ml a 45ml de água por kg** diariamente. A água corporal é crítica para manter a elasticidade das fibras e evitar cãibras.`;
  }

  // Resposta padrão caso nenhuma palavra-chave bata
  return `Entendi a sua dúvida! Para te dar uma resposta focada, você pode me perguntar sobre:
- **Corridas:** Como treinar para bater metas ou melhorar o pace.
- **Musculação:** Divisão de treinos, cargas, séries e hipertrofia.
- **Exames:** Recomendações de marcadores inflamatórios ou hormonais.
- **Composição Corporal:** Como reduzir gordura ou ganhar massa magra.

Qual desses pontos você quer detalhar agora?`;
}

// -------------------------------------------------------------
// INTEGRAÇÃO COM AS APIS DO GEMINI E OPENAI
// -------------------------------------------------------------
async function callGeminiAPI(apiKey: string, prompt: string, history: ChatMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  // Formatando o histórico de conversas para a API do Gemini
  // O Gemini espera um formato contents: [{role: "user" | "model", parts: [{text: "..."}]}]
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  // Adiciona a última pergunta
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro Gemini API: ${response.statusText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Formato de resposta inesperado do Gemini.');
  }

  return text;
}

async function callOpenAIAPI(apiKey: string, prompt: string, history: ChatMessage[], systemPrompt: string): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: prompt }
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro OpenAI API: ${response.statusText}`);
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Formato de resposta inesperado do OpenAI.');
  }

  return text;
}

// -------------------------------------------------------------
// FUNÇÕES EXPORTADAS
// -------------------------------------------------------------

export async function askAICoach(userMessage: string, history: ChatMessage[]): Promise<string> {
  const settings = db.getSettings();
  const exercises = db.getExercises();
  const workoutLogs = db.getWorkoutLogs();
  const runLogs = db.getRunLogs();
  const bodyCompLogs = db.getBodyCompLogs();

  const systemPrompt = generateSystemPrompt({ exercises, workoutLogs, runLogs, bodyCompLogs });

  // Se houver chave de API e provedor válido configurado, chama a API correspondente
  if (settings.apiKey && settings.apiProvider !== 'none') {
    try {
      if (settings.apiProvider === 'gemini') {
        // Para o Gemini, injetamos as instruções do sistema no início do chat ou na mensagem
        const enrichedPrompt = `INSTRUÇÕES DO SISTEMA E CONTEXTO:\n${systemPrompt}\n\nPergunta do Usuário: ${userMessage}`;
        return await callGeminiAPI(settings.apiKey, enrichedPrompt, history);
      } else if (settings.apiProvider === 'openai') {
        return await callOpenAIAPI(settings.apiKey, userMessage, history, systemPrompt);
      }
    } catch (error: any) {
      console.error('Erro na chamada da API real:', error);
      return `⚠️ **Erro ao conectar à API da IA (${settings.apiProvider}):** ${error.message}\n\n*Exibindo resposta simulada local como alternativa:*\n\n${generateLocalResponse(userMessage)}`;
    }
  }

  // Fallback para simulador local caso não haja chave cadastrada
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateLocalResponse(userMessage));
    }, 800); // delay leve para simular processamento
  });
}

export function generateHealthAnalysis(): AnalysisReport {
  const exercises = db.getExercises();
  const workoutLogs = db.getWorkoutLogs();
  const runLogs = db.getRunLogs();
  const bodyCompLogs = db.getBodyCompLogs();
  
  const progression: string[] = [];
  const risks: string[] = [];
  const labExams: string[] = [];

  // 1. Análise de Progresso de Musculação
  if (exercises.length > 0) {
    const exercisesWithPR = exercises.filter(e => e.prWeight > 0);
    if (exercisesWithPR.length > 0) {
      progression.push(`Você possui registros de carga máxima (PR) em **${exercisesWithPR.length}** exercícios. Seu principal recorde cadastrado é **${Math.max(...exercisesWithPR.map(e => e.prWeight))} kg**.`);
    }
    
    // Compara peso de treinos antigos para novos se houver histórico
    if (workoutLogs.length >= 2) {
      const latestLog = workoutLogs[0];
      const olderLogs = workoutLogs.slice(1);
      
      let prIncreases = 0;
      latestLog.exercises.forEach(logged => {
        // Acha o mesmo exercício em logs antigos
        for (const oldLog of olderLogs) {
          const oldEx = oldLog.exercises.find(e => e.name === logged.name);
          if (oldEx && logged.weight > oldEx.weight) {
            prIncreases++;
            progression.push(`Aumento de carga detectado no exercício **${logged.name}**: evoluiu de **${oldEx.weight} kg** para **${logged.weight} kg** (Ganho de força).`);
            break;
          }
        }
      });
      if (prIncreases === 0) {
        progression.push("As cargas dos últimos treinos se mantiveram estáveis. Mantenha o foco na sobrecarga progressiva estruturada.");
      }
    } else {
      progression.push("Histórico de musculação inicial gerado. Continue registrando seus treinos para analisarmos a progressão de cargas.");
    }
  } else {
    progression.push("Cadastre exercícios e registre a execução dos treinos para acompanhar a progressão de força.");
  }

  // 2. Análise de Progresso de Corrida
  if (runLogs.length > 0) {
    const sortedRuns = [...runLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sortedRuns.length >= 2) {
      const firstRun = sortedRuns[0];
      const lastRun = sortedRuns[sortedRuns.length - 1];
      const paceDiff = firstRun.pace - lastRun.pace;

      if (paceDiff > 0) {
        progression.push(`Melhoria de Pace detectada! Seu ritmo de corrida evoluiu de **${firstRun.pace.toFixed(1)} min/km** para **${lastRun.pace.toFixed(1)} min/km** (redução de **${paceDiff.toFixed(1)} min/km** na velocidade de corrida).`);
      }
      
      const maxDistance = Math.max(...runLogs.map(r => r.distance));
      progression.push(`Seu maior volume de corrida em um único treino foi de **${maxDistance.toFixed(1)} km**.`);
    } else {
      progression.push(`Primeira corrida registrada em **${runLogs[0].date}** com distância de **${runLogs[0].distance} km** e pace de **${runLogs[0].pace} min/km**.`);
    }
  } else {
    progression.push("Nenhuma corrida realizada recentemente. Registre suas corridas para liberar insights de performance cardiorrespiratória.");
  }

  // 3. Análise de Riscos de Lesão/Overtraining
  if (workoutLogs.length >= 2) {
    // Checa se o intervalo entre treinos idênticos é muito curto
    const recentLogs = workoutLogs.slice(0, 3);
    for (let i = 0; i < recentLogs.length - 1; i++) {
      const current = recentLogs[i];
      const prev = recentLogs[i + 1];
      if (current.workoutId === prev.workoutId) {
        const dateDiff = (new Date(current.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24);
        if (dateDiff < 2) {
          risks.push(`⚠️ **Frequência Excessiva:** Você realizou o **${current.workoutName}** com apenas **${dateDiff} dia(s)** de intervalo entre as sessões. Músculos precisam de 48h a 72h para regeneração completa.`);
          labExams.push("🧬 **Exame de CPK (Creatina Fosfoquinase):** Recomendado para avaliar se há microlesões excessivas decorrentes de descanso insuficiente.");
        }
      }
    }
  }

  // Checa volume de corrida excessivo
  if (runLogs.length >= 3) {
    const recentRuns = runLogs.slice(0, 3);
    const weeklyDistance = recentRuns.reduce((acc, r) => acc + r.distance, 0);
    if (weeklyDistance > 30) {
      risks.push(`🏃‍♂️ **Alto Volume de Corrida:** Você correu mais de **30 km** nas últimas sessões. O impacto repetido nos joelhos e calcanhares exige fortalecimento constante de panturrilha e quadríceps.`);
      labExams.push("🧬 **Cortisol Salivar ou Plasmático:** Para avaliar estresse adrenal provocado por carga cardiovascular volumosa.");
    }
  }

  // Composição Corporal Riscos
  if (bodyCompLogs.length > 0) {
    const latestComp = bodyCompLogs[bodyCompLogs.length - 1];
    
    // Checa hidratação
    if (latestComp.bodyWater < 50) {
      risks.push(`💧 **Baixa Hidratação:** Sua água corporal está em **${latestComp.bodyWater}%** (ideal é acima de 55% para homens e 50% para mulheres). Isso aumenta o risco de cãibras, fadiga e prejudica a hipertrofia.`);
    }

    // Checa gordura visceral
    if (latestComp.visceralFat > 10) {
      risks.push(`⚠️ **Gordura Visceral Elevada:** Seu nível de gordura visceral está em **${latestComp.visceralFat}** (considerado alto/alerta acima de 9). A gordura visceral envolve órgãos e está associada a riscos cardiovasculares.`);
      labExams.push("🧬 **Perfil Lipídico Completo (Colesterol Total, LDL, HDL, Triglicerídeos):** Fundamental para mapear a saúde cardiovascular e aterogênica.");
      labExams.push("🧬 **Glicemia de Jejum e Hemoglobina Glicada (HbA1c):** Para verificar a sensibilidade à insulina diante de acúmulo de gordura central.");
    }
  }

  // Adiciona exames de rotina preventiva gerais se a lista estiver pequena
  if (labExams.length === 0) {
    labExams.push("🧬 **Hemograma Completo:** Avaliação básica de hemácias para transporte de oxigênio muscular.");
    labExams.push("🧬 **Vitamina D3 e B12:** Importantes para a contração muscular, imunidade celular e regeneração nervosa.");
    labExams.push("🧬 **Ureia e Creatinina:** Para monitorar a função renal sob dieta hiperproteica ou uso de Creatina.");
  }

  if (risks.length === 0) {
    risks.push("✅ **Nenhum risco crítico de sobrecarga ou lesão detectado no momento.** Seu cronograma de descanso parece adequado.");
  }

  return {
    progression,
    risks,
    labExams: Array.from(new Set(labExams)) // Remove duplicados
  };
}
