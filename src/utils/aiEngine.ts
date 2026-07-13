import { db, type Exercise, type WorkoutLog, type RunLog, type BodyCompLog, type RunningPlan } from './db';

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

// -------------------------------------------------------------
// NUTRICIONISTA IA - SISTEMA E PROMPTS
// -------------------------------------------------------------

function generateNutritionSystemPrompt(contextData: {
  bodyCompLogs: BodyCompLog[];
  runLogs: RunLog[];
  workoutLogs: WorkoutLog[];
  mealPlans: any[];
}) {
  const { bodyCompLogs, runLogs, workoutLogs, mealPlans } = contextData;
  const settings = db.getSettings();

  const latestBody = bodyCompLogs[bodyCompLogs.length - 1];

  let weightTrendText = 'Sem histórico de peso suficiente.';
  if (bodyCompLogs.length >= 2) {
    const sorted = [...bodyCompLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstWeight = sorted[0].weight;
    const lastWeight = sorted[sorted.length - 1].weight;
    const diff = lastWeight - firstWeight;
    weightTrendText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg (Inicial: ${firstWeight} kg -> Atual: ${lastWeight} kg).`;
  }

  const formattedBody = latestBody 
    ? `Peso: ${latestBody.weight}kg (Meta: ${latestBody.idealWeight}kg), Gordura: ${latestBody.bodyFat}% (Meta: ${latestBody.bodyFatGoal}%), Massa Muscular: ${latestBody.muscleMass}kg (Meta: ${latestBody.muscleMassGoal}%), Água: ${latestBody.bodyWater}%, TMB (Taxa Metabólica Basal): ${latestBody.basalMetabolism} kcal, Gordura Visceral: ${latestBody.visceralFat} (Meta: ${latestBody.visceralFatGoal}), Idade Metabólica: ${latestBody.metabolicAge} anos. Tendência de peso recente: ${weightTrendText}`
    : 'Nenhum registro de composição corporal (bioimpedância) cadastrado.';

  // Gasto recente
  const workoutCount = workoutLogs.slice(0, 7).length;
  const runCount = runLogs.slice(0, 7).length;
  const runDistance = runLogs.slice(0, 7).reduce((acc, r) => acc + r.distance, 0);

  // Planejamento de refeições da semana atual
  const formattedPlans = mealPlans.slice(0, 7).map(p => {
    const mealsStr = p.meals.map((m: any) => {
      const itemsStr = m.items.map((i: any) => i.recipeId ? `Receita id ${i.recipeId}` : i.customName).join(', ');
      return `- ${m.name}: ${itemsStr || 'Nenhum planejado'}`;
    }).join('\n  ');
    return `Data: ${p.date}\n  ${mealsStr}`;
  }).join('\n');

  return `Você é a Nutricionista Especialista de IA e Consultora Alimentar do sistema "Vida Saudável". Seu papel é orientar o usuário em sua alimentação, planejamento de refeições (cardápio semanal), suplementação e hábitos saudáveis, focando no cruzamento com a composição corporal (bioimpedância) e atividade física (musculação e corrida).

Aqui estão os dados de saúde e treino atuais do usuário:
Nome: ${settings.userName}
Altura: ${settings.height} cm
Idade: ${settings.age} anos

ÚLTIMA COMPOSIÇÃO CORPORAL (BIOIMPEDÂNCIA):
${formattedBody}

ATIVIDADE FÍSICA NOS ÚLTIMOS 7 DIAS:
- Musculação: ${workoutCount} treinos concluídos.
- Corrida de Rua: ${runCount} sessões concluídas (Volume total: ${runDistance.toFixed(1)} km).

CARDÁPIO SEMANAL PLANEJADO:
${formattedPlans || 'Nenhum planejamento registrado para esta semana.'}

Diretrizes de resposta:
1. Seja acolhedora, científica, prática e altamente personalizada nos cálculos de macronutrientes.
2. Sempre relacione a ingestão calórica e de proteínas com o peso corporal, massa muscular e o volume de corrida/musculação registrado. Se o usuário estiver treinando pesado, garanta que ele receba proteínas suficientes (ex: ~2.0g/kg) e carboidratos adequados para performance.
3. Se houver baixa hidratação (<55% de água) ou gordura visceral alta na bioimpedância, sugira estratégias alimentares específicas (chás, alimentos antioxidantes, aumento de fibras, controle de sódio/ultraprocessados).
4. Forneça receitas fáceis ou substituições quando solicitado.
5. Responda em português brasileiro (pt-BR).`;
}

function generateLocalNutritionResponse(userMessage: string): string {
  const query = userMessage.toLowerCase();
  const settings = db.getSettings();
  const bodyCompLogs = db.getBodyCompLogs();
  const latestBody = bodyCompLogs[bodyCompLogs.length - 1];

  if (query.includes('olá') || query.includes('oi') || query.includes('bom dia') || query.includes('boa tarde')) {
    return `Olá, **${settings.userName}**! Sou a sua Nutricionista de IA. 

Como posso te ajudar hoje? Posso:
- Avaliar seu planejamento de refeições semanal.
- Cruzar seus dados de bioimpedância para calcular suas metas de macronutrientes.
- Dar receitas saudáveis e dicas de substituição de alimentos.
- Ajudar a otimizar sua suplementação para ganho de massa ou queima de gordura.`;
  }

  if (query.includes('proteina') || query.includes('macro') || query.includes('caloria') || query.includes('carboidrato') || query.includes('gordura')) {
    if (!latestBody) {
      return `Para calcular seus macronutrientes ideais, eu preciso de um registro de peso ou bioimpedância na aba "Corrida & Corpo". 
      
Como diretriz geral para praticantes de atividade física:
- **Proteínas:** 1.6g a 2.2g por kg de peso corporal (reconstrução muscular).
- **Gorduras:** 0.8g a 1.0g por kg (equilíbrio hormonal).
- **Carboidratos:** Ajustar conforme o gasto diário (combustível principal).`;
    }

    const weight = latestBody.weight;
    const protein = Math.round(weight * 2.0);
    const fat = Math.round(weight * 0.8);
    const bmr = latestBody.basalMetabolism || 1600;
    const calories = Math.round(bmr * 1.3); // estimativa de TDEE ativo leve

    return `🍎 **Cálculo de Macronutrientes Personalizado**
Com base na sua bioimpedância recente e perfil ativo:

- **Calorias Diárias:** ~**${calories} kcal** (Meta para manutenção/ganho de massa magra leve).
- **Proteínas:** **${protein}g** (calculado com 2.0g/kg de peso).
- **Gorduras:** **${fat}g** (calculado com 0.8g/kg de peso).
- **Carboidratos:** ~**${Math.round((calories - (protein * 4) - (fat * 9)) / 4)}g** (restante em energia limpa).

*Dica:* Tente bater a meta proteica dividindo-a em 4 refeições de ~30-40g de proteína cada (ex: ovos no café, frango/carne no almoço, whey no lanche e peixe no jantar).`;
  }

  if (query.includes('suplement') || query.includes('creatina' ) || query.includes('whey') || query.includes('pre treino') || query.includes('termogenico')) {
    return `💊 **Guia Prático de Suplementação Esportiva**

Para potencializar seus treinos de musculação e corrida, os suplementos com maior comprovação científica são:
1. **Creatina (3g a 5g diárias):** Melhora a força e ressíntese de ATP na musculação. Deve ser tomada todos os dias, inclusive nos dias de descanso.
2. **Whey Protein:** Excelente fonte de proteína de rápida absorção para te ajudar a atingir a meta diária (1.6g a 2.0g/kg).
3. **Cafeína (100mg a 200mg pré-treino):** Aumenta o foco na musculação e reduz a percepção de esforço em corridas longas. Use com moderação para não afetar o sono.
4. **Beta-Alanina:** Excelente para atividades de alta intensidade que geram queimação muscular (tamponamento de ácido lático).`;
  }

  if (query.includes('receita') || query.includes('ovo') || query.includes('almoço') || query.includes('jantar') || query.includes('cafe')) {
    return `🍳 **Sugestão de Refeição Saudável**

Aqui está uma receita rápida e proteica para complementar sua dieta:
**Crepioca Fit de Frango (Lanche/Jantar)**
- **Ingredientes:** 2 ovos inteiros, 2 colheres de sopa de goma de tapioca, 60g de frango desfiado temperado, temperos a gosto (sal, pimenta, orégano).
- **Preparo:** Bata os ovos com a tapioca. Despeje em frigideira quente untada. Quando firmar, adicione o frango no recheio, dobre ao meio e doure ambos os lados.
- **Macros estimados:** Calorias: 280 kcal | Proteína: 25g | Carbo: 12g | Gordura: 14g.`;
  }

  if (query.includes('agua') || query.includes('hidrat') || query.includes('caibra') || query.includes('liquido')) {
    if (latestBody && latestBody.bodyWater < 55) {
      return `💧 **Alerta de Hidratação:** Na sua última bioimpedância, sua água corporal estava em **${latestBody.bodyWater}%** (o ideal é acima de 55%). Isso prejudica o transporte de nutrientes, a hipertrofia e pode gerar cãibras nos treinos de corrida.
      
**Plano de Ação:**
1. Aumente seu consumo para pelo menos **35ml por kg** de peso, o que equivale a aproximadamente **${Math.round(latestBody.weight * 0.035 * 10) / 10} Litros** de água por dia.
2. Consuma mais vegetais ricos em água (como pepino, abobrinha, alface e melancia).
3. Monitore a coloração da urina: ela deve estar sempre amarelo-clara (cor de palha).`;
    }
    return `💧 **Importância da Hidratação na Performance**
Para atletas ativos, a hidratação correta é a chave:
- Beba pelo menos **35ml a 45ml por kg** de peso diariamente.
- Evite desidratação severa (perda de >2% do peso corporal em suor), pois ela reduz a força e a capacidade aeróbica na corrida em até 20%.
- Em corridas longas acima de 1 hora, reponha eletrólitos (sódio, potássio) junto com água.`;
  }

  return `Entendi o seu ponto nutricional! Para te dar uma resposta focada, você pode me perguntar sobre:
- **Metas de Macros:** Como calcular suas calorias e proteínas ideais.
- **Suplementação:** O que tomar para melhorar força ou queima de gordura.
- **Dicas de Receitas:** Ideias saudáveis de café da manhã, almoço ou jantar.
- **Análise de Bioimpedância:** Como ajustar a alimentação com base na gordura visceral e água.

Qual desses pontos você quer detalhar hoje?`;
}

export async function askAINutritionist(userMessage: string, history: ChatMessage[]): Promise<string> {
  const settings = db.getSettings();
  const bodyCompLogs = db.getBodyCompLogs();
  const runLogs = db.getRunLogs();
  const workoutLogs = db.getWorkoutLogs();
  const mealPlans = db.getMealPlans();

  const systemPrompt = generateNutritionSystemPrompt({ bodyCompLogs, runLogs, workoutLogs, mealPlans });

  // Se houver chave de API e provedor válido configurado, chama a API correspondente
  if (settings.apiKey && settings.apiProvider !== 'none') {
    try {
      if (settings.apiProvider === 'gemini') {
        const enrichedPrompt = `INSTRUÇÕES DO SISTEMA E CONTEXTO DE NUTRIÇÃO:\n${systemPrompt}\n\nPergunta do Usuário: ${userMessage}`;
        return await callGeminiAPI(settings.apiKey, enrichedPrompt, history);
      } else if (settings.apiProvider === 'openai') {
        return await callOpenAIAPI(settings.apiKey, userMessage, history, systemPrompt);
      }
    } catch (error: any) {
      console.error('Erro na chamada da API real de Nutrição:', error);
      return `⚠️ **Erro ao conectar à API da IA (${settings.apiProvider}):** ${error.message}\n\n*Exibindo resposta simulada local como alternativa:*\n\n${generateLocalNutritionResponse(userMessage)}`;
    }
  }

  // Fallback para simulador local caso não haja chave cadastrada
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateLocalNutritionResponse(userMessage));
    }, 800); // delay leve para simular processamento
  });
}

export async function parseMealImage(base64Image: string): Promise<{
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}> {
  const settings = db.getSettings();
  if (!settings.apiKey || settings.apiProvider !== 'gemini') {
    throw new Error('A análise visual de pratos requer o provedor Gemini e uma chave de API válida cadastrada.');
  }

  // Remove o prefixo data:image/...;base64, se houver
  const base64Data = base64Image.includes(';base64,') 
    ? base64Image.split(';base64,')[1] 
    : base64Image;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        {
          text: `Você é um robô nutricionista com visão computacional avançada. Identifique o alimento ou prato nesta imagem e estime seu peso e macronutrientes.
Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown ou qualquer texto adicional:
{
  "title": "Nome do Prato/Alimento Estimado",
  "calories": 450,
  "protein": 30,
  "carbs": 40,
  "fat": 15
}`
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        }
      ]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Erro Gemini Vision API: ${response.statusText}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Não foi possível obter resposta da visão computacional.');

  // Limpa blocos de código markdown se o modelo retornar
  const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJsonStr);
}

// -------------------------------------------------------------
// PLANILHA DE CORRIDA PERSONALIZADA COM IA
// -------------------------------------------------------------

function generateLocalRunningPlan(targetDistance: number, weeksCount: number): RunningPlan {
  const planId = `plan-${Date.now()}`;
  const weeks: any[] = [];
  
  const daysOfWeek = [
    { name: 'Segunda-feira', isWorkout: true },
    { name: 'Terça-feira', isWorkout: false },
    { name: 'Quarta-feira', isWorkout: true },
    { name: 'Quinta-feira', isWorkout: false },
    { name: 'Sexta-feira', isWorkout: false },
    { name: 'Sábado', isWorkout: true },
    { name: 'Domingo', isWorkout: false },
  ];

  // Paces estimados com base na distância alvo
  let targetPace = '6:00';
  let recoveryPace = '7:00';
  let speedPace = '5:00';
  
  if (targetDistance <= 5) {
    targetPace = '5:45 min/km';
    recoveryPace = '6:45 min/km';
    speedPace = '4:50 min/km';
  } else if (targetDistance <= 10) {
    targetPace = '6:00 min/km';
    recoveryPace = '7:00 min/km';
    speedPace = '5:10 min/km';
  } else if (targetDistance <= 21.1) {
    targetPace = '6:15 min/km';
    recoveryPace = '7:15 min/km';
    speedPace = '5:30 min/km';
  } else {
    targetPace = '6:30 min/km';
    recoveryPace = '7:30 min/km';
    speedPace = '5:50 min/km';
  }

  for (let w = 1; w <= weeksCount; w++) {
    const weekDays: any[] = [];
    
    // Calcula progressão da distância
    const progressRatio = w / weeksCount;
    // O longão cresce de 50% até 100% da distância alvo
    const longDistance = Number((targetDistance * (0.5 + 0.5 * progressRatio)).toFixed(1));
    const midDistance = Number((longDistance * 0.6).toFixed(1));

    daysOfWeek.forEach(day => {
      let training = 'Descanso Total ou Regenerativo Ativo (Alongamento leve, liberação miofascial e caminhada de no máximo 20 min).';
      let isRest = true;

      if (day.isWorkout) {
        isRest = false;
        if (day.name === 'Segunda-feira') {
          // Treino de tiros ou técnico
          if (targetDistance <= 5) {
            const numTuros = 4 + w;
            training = `⚡ [TREINO INTERVALADO DE VELOCIDADE]\n` +
                       `- Aquecimento: 10 min de corrida muito leve (Zona 1 cardíaca) + mobilidade dinâmica (elevação de joelhos, chutes frontais) + 3 acelerações progressivas de 50 metros.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 200 metros em ritmo de velocidade (Pace alvo: ${speedPace}, RPE 8-9) com recuperação de 1:30 min caminhando entre cada tiro.\n` +
                       `- Desaquecimento: 5 min de trote super leve para normalizar a frequência cardíaca.\n` +
                       `- Dica do Treinador: Mantenha os ombros relaxados e a amplitude de braços coordenada nos tiros rápidos. O foco é a eficiência neuromuscular!`;
          } else if (targetDistance <= 10) {
            const numTuros = 3 + w;
            training = `⚡ [INTERVALADO / TIROS DE VELOCIDADE]\n` +
                       `- Aquecimento: 12 min trote regenerativo (Zona 1) + 4x exercícios educativos de corrida (Skipping, Anfersen) + mobilidade articular.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 400 metros em ritmo forte (Pace alvo: ${speedPace}, RPE 8) com recuperação de 2:00 min de caminhada lenta para reduzir o lactato.\n` +
                       `- Desaquecimento: 5 min trote regenerativo final.\n` +
                       `- Dica do Treinador: Concentre-se em expirar todo o ar dos pulmões de forma controlada nos tiros de 400m para evitar a dor lateral desnecessária (dor de desviado).`;
          } else {
            const numTuros = 2 + Math.floor(w / 2);
            training = `⚡ [INTERVALADO DE LIMIAR DE LACTATO]\n` +
                       `- Aquecimento: 15 min de corrida leve (Zona 2) + mobilidade ativa de quadril e ativação de glúteos com mini-band se disponível.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 800 metros no seu ritmo de limiar aeróbico (Pace alvo: ${speedPace}, RPE 8) com 2:30 min de caminhada lenta de repouso.\n` +
                       `- Desaquecimento: 6 min trote leve de volta à calma.\n` +
                       `- Dica do Treinador: A cadência deve ser o foco. Tente manter entre 170-180 passos por minuto. A passos rápidos e curtos reduzem a frenagem e economizam energia.`;
          }
        } else if (day.name === 'Quarta-feira') {
          // Treino de ritmo contínuo
          training = `📈 [CORRIDA DE RITMO / TEMPO RUN]\n` +
                     `- Aquecimento: 8 min de caminhada rápida evoluindo para trote leve + rotações circulares de tornozelo.\n` +
                     `- Parte Principal: Corrida contínua de ${midDistance} km em ritmo firme de prova (Zona 3 cardíaca, Pace alvo: ${targetPace}, RPE 6-7). Mantenha a consistência sem oscilar a velocidade.\n` +
                     `- Desaquecimento: 5 min de trote super leve.\n` +
                     `- Dica do Treinador: Este é um treino mental. Encontre seu ritmo confortável-desconfortável e controle a respiração em uma proporção de 3 passos inspirando e 3 passos expirando.`;
        } else if (day.name === 'Sábado') {
          // Longão progressivo
          if (w === weeksCount) {
            training = `🏆 [DESAFIO FINAL: CONQUISTA DO OBJETIVO]\n` +
                       `- Aquecimento: 10 min de corrida muito leve + mobilidade leve. Nada de fadiga antes de começar!\n` +
                       `- Parte Principal: CORRA OS ${targetDistance} km no seu Pace de prova/alvo (Pace ideal: ${targetPace}, RPE 7-8). Divida mentalmente a prova em 3 partes iguais e controle a ansiedade no início.\n` +
                       `- Desaquecimento: Caminhada lenta e alongamento estático leve.\n` +
                       `- Dica do Treinador: Você completou toda a planilha e seu corpo está 100% pronto. Hidrate-se a cada 2 km e celebre cada quilômetro completado. O dia é seu!`;
          } else {
            training = `🏃‍♂️ [TREINO LONGO / LONGÃO PROGRESSIVO]\n` +
                       `- Aquecimento: 10 min trote muito leve + ativação de abdômen/core (prancha por 1 min).\n` +
                       `- Parte Principal: Corrida contínua de ${longDistance} km em ritmo aeróbico base (Zona 2 cardíaca, Pace alvo: ${recoveryPace}, RPE 5-6). Aumente levemente o ritmo nos últimos 1 km se estiver confortável.\n` +
                       `- Desaquecimento: 5 min caminhada lenta final.\n` +
                       `- Dica do Treinador: O longão serve para construir sua base mitocondrial e resistência de tendões. Não corra rápido demais; você deve ser capaz de manter uma conversa sem perder o fôlego.`;
          }
        }
      }

      weekDays.push({
        dayName: day.name,
        training,
        isRest,
        isDone: false
      });
    });

    weeks.push({
      weekNumber: w,
      days: weekDays
    });
  }

  return {
    id: planId,
    targetDistance,
    weeksCount,
    createdAt: new Date().toISOString(),
    weeks
  };
}

export async function generateRunningPlan(targetDistance: number, weeksCount: number): Promise<RunningPlan> {
  const settings = db.getSettings();

  const prompt = `Você é um Treinador de Elite de Corrida de Rua, mentor de atletas olímpicos e amadores de alta performance em assessorias renomadas internacionalmente.
  
  Gere uma planilha de treinos de corrida personalizada e profissional em formato JSON para um atleta que tem como objetivo correr a distância de ${targetDistance} km no prazo de ${weeksCount} semanas.
  
  Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown (como \`\`\`json) ou qualquer texto de introdução/conclusão:
  {
    "id": "plan-${Date.now()}",
    "targetDistance": ${targetDistance},
    "weeksCount": ${weeksCount},
    "createdAt": "${new Date().toISOString()}",
    "weeks": [
      {
        "weekNumber": 1,
        "days": [
          { "dayName": "Segunda-feira", "training": "Descrição detalhada", "isRest": false, "isDone": false },
          { "dayName": "Terça-feira", "training": "Descanso", "isRest": true, "isDone": false },
          { "dayName": "Quarta-feira", "training": "Descrição detalhada", "isRest": false, "isDone": false },
          { "dayName": "Quinta-feira", "training": "Descanso", "isRest": true, "isDone": false },
          { "dayName": "Sexta-feira", "training": "Descanso", "isRest": true, "isDone": false },
          { "dayName": "Sábado", "training": "Descrição detalhada", "isRest": false, "isDone": false },
          { "dayName": "Domingo", "training": "Descanso", "isRest": true, "isDone": false }
        ]
      }
    ]
  }
  
  Diretrizes de Sofisticação dos Treinos (Apenas para dias ativos, onde "isRest" é false):
  Para cada treino, você DEVE estruturar o texto do campo "training" exatamente com este padrão profissional:
  
  ⚡ [NOME DO TIPO DE TREINO: ex: INTERVALADO DE VELOCIDADE / FARTLEK / TEMPO RUN / LONGÃO PROGRESSIVO]
  - Aquecimento: Instrução detalhada de preparação, ex: corrida muito leve, mobilidade articular, exercícios educativos de corrida (Skipping, Anfersen).
  - Parte Principal: Instrução exata de distâncias, paces sugeridos baseados na meta do atleta, zonas de esforço cardíaco (ex: Zona 2, Zona 3, Zona 4), percepção de esforço (RPE 1-10) e número exato de repetições e tempo de descanso.
  - Desaquecimento: Trote regenerativo ou caminhada lenta de volta à calma.
  - Dica do Treinador: Um conselho especializado de postura (ex: cadência de passadas, relaxamento de braços), hidratação, estratégia de ritmo ou preparação mental.
  
  Diretrizes de Estrutura Semanal:
  1. Crie um planejamento de 3 dias de treino ativos por semana (Segunda-feira, Quarta-feira e Sábado) e os outros dias marcados como descanso ("isRest": true, "training": "Descanso Total ou Regenerativo Ativo").
  2. A cada semana, a distância e a intensidade do longão de sábado devem progredir de forma linear e segura, atingindo o ápice na última semana com o "Desafio Final" de correr a distância alvo de ${targetDistance} km no sábado.
  3. Formate todo o conteúdo em português brasileiro (pt-BR).`;

  // Se houver chave e provedor válido, faz a chamada
  if (settings.apiKey && settings.apiProvider !== 'none') {
    try {
      let rawText = '';
      if (settings.apiProvider === 'gemini') {
        const enrichedPrompt = `INSTRUÇÕES DO SISTEMA:\nVocê é um gerador de planilhas de treino de corrida em formato JSON. Siga as instruções do usuário estritamente.\n\nPrompt do Usuário: ${prompt}`;
        rawText = await callGeminiAPI(settings.apiKey, enrichedPrompt, []);
      } else if (settings.apiProvider === 'openai') {
        rawText = await callOpenAIAPI(settings.apiKey, prompt, [], 'Você é um gerador de planilhas de treino de corrida em formato JSON.');
      }

      // Limpa blocos de código markdown se houver
      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const plan = JSON.parse(cleanJsonStr) as RunningPlan;
      
      // Valida se o JSON possui a estrutura mínima
      if (plan && Array.isArray(plan.weeks) && plan.weeks.length > 0) {
        return plan;
      }
    } catch (err) {
      console.error('Erro ao chamar a IA para planilha de corridas:', err);
      // Fallback automático para o gerador local em caso de erro na chamada à API
    }
  }

  // Fallback offline local
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateLocalRunningPlan(targetDistance, weeksCount));
    }, 1000);
  });
}


