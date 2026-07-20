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
// ESTIMATIVA DE MACROS DE ALIMENTO AVULSO (AUTOFILL)
// -------------------------------------------------------------

const COMMON_FOOD_MACROS: { keywords: string[]; calories: number; protein: number; carbs: number; fat: number }[] = [
  { keywords: ['ovo'], calories: 78, protein: 6, carbs: 1, fat: 5 },
  { keywords: ['clara de ovo', 'claras'], calories: 17, protein: 4, carbs: 0, fat: 0 },
  { keywords: ['arroz'], calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { keywords: ['feijão', 'feijao'], calories: 127, protein: 8.7, carbs: 23, fat: 0.5 },
  { keywords: ['frango', 'peito de frango'], calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { keywords: ['carne', 'patinho', 'alcatra'], calories: 217, protein: 26, carbs: 0, fat: 12 },
  { keywords: ['peixe', 'tilápia', 'tilapia', 'salmão', 'salmao'], calories: 180, protein: 22, carbs: 0, fat: 9 },
  { keywords: ['aveia'], calories: 389, protein: 17, carbs: 66, fat: 7 },
  { keywords: ['banana'], calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { keywords: ['maçã', 'maca'], calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { keywords: ['pão', 'pao'], calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { keywords: ['batata doce'], calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { keywords: ['batata'], calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  { keywords: ['queijo'], calories: 350, protein: 25, carbs: 1.3, fat: 27 },
  { keywords: ['leite'], calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { keywords: ['iogurte'], calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { keywords: ['whey', 'proteína em pó', 'proteina em po'], calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { keywords: ['tapioca'], calories: 240, protein: 0.2, carbs: 60, fat: 0 },
  { keywords: ['macarrão', 'macarrao', 'massa'], calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { keywords: ['abacate'], calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { keywords: ['azeite', 'óleo', 'oleo'], calories: 884, protein: 0, carbs: 0, fat: 100 },
  { keywords: ['amendoim', 'castanha', 'nozes'], calories: 567, protein: 25, carbs: 16, fat: 49 },
  { keywords: ['brócolis', 'brocolis', 'legume', 'vegetal'], calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { keywords: ['alface', 'salada'], calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
];

function estimateFoodMacrosLocal(foodName: string): { calories: number; protein: number; carbs: number; fat: number } {
  const query = foodName.toLowerCase();
  const match = COMMON_FOOD_MACROS.find(entry => entry.keywords.some(k => query.includes(k)));
  if (match) {
    return { calories: match.calories, protein: match.protein, carbs: match.carbs, fat: match.fat };
  }
  // Estimativa genérica quando o alimento não é reconhecido na tabela local
  return { calories: 150, protein: 8, carbs: 15, fat: 6 };
}

export async function estimateFoodMacros(foodName: string): Promise<{ calories: number; protein: number; carbs: number; fat: number }> {
  const settings = db.getSettings();

  if (settings.apiKey && settings.apiProvider !== 'none') {
    const prompt = `Estime os valores nutricionais aproximados (para uma porção usual/individual) do seguinte alimento ou prato: "${foodName}".
Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown ou qualquer texto adicional:
{
  "calories": 300,
  "protein": 20,
  "carbs": 15,
  "fat": 10
}`;
    try {
      let rawText = '';
      if (settings.apiProvider === 'gemini') {
        rawText = await callGeminiAPI(settings.apiKey, prompt, []);
      } else if (settings.apiProvider === 'openai') {
        rawText = await callOpenAIAPI(settings.apiKey, prompt, [], 'Você é um nutricionista que estima macronutrientes de alimentos em formato JSON.');
      }
      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      if (parsed && typeof parsed.calories === 'number') {
        return {
          calories: Math.round(parsed.calories) || 0,
          protein: Math.round(parsed.protein) || 0,
          carbs: Math.round(parsed.carbs) || 0,
          fat: Math.round(parsed.fat) || 0
        };
      }
    } catch (err) {
      console.error('Erro ao estimar macros via IA, usando tabela local:', err);
    }
  }

  return estimateFoodMacrosLocal(foodName);
}

// -------------------------------------------------------------
// EXTRAÇÃO DE RECEITAS ESTRUTURADAS A PARTIR DE SUGESTÕES DO CHAT
// -------------------------------------------------------------

export interface RecipeDraft {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  dietaryCategories: string[];
  mealTypes: string[];
}

export async function extractRecipesFromSuggestion(assistantMessage: string): Promise<RecipeDraft[]> {
  const settings = db.getSettings();
  if (!settings.apiKey || settings.apiProvider === 'none') {
    throw new Error('Este recurso requer uma chave de API de IA (Gemini ou OpenAI) configurada em Ajustes.');
  }

  const prompt = `A seguir está uma resposta de uma Nutricionista de IA para um usuário. Identifique todas as receitas ou pratos concretos mencionados nela (ex: café da manhã, almoço, jantar, lanches sugeridos) e estruture cada uma como uma receita completa.

RESPOSTA DA NUTRICIONISTA:
"""
${assistantMessage}
"""

Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown ou qualquer texto adicional. Se a mensagem não tiver nenhuma receita ou prato específico, retorne { "recipes": [] }:
{
  "recipes": [
    {
      "title": "Nome do prato",
      "description": "Breve descrição do prato",
      "ingredients": ["4 ovos", "1 colher de sopa de azeite"],
      "instructions": ["Passo 1 detalhado", "Passo 2 detalhado"],
      "prepTime": 10,
      "cookTime": 15,
      "servings": 1,
      "tags": ["Fit"],
      "dietaryCategories": [],
      "mealTypes": []
    }
  ]
}`;

  let rawText = '';
  if (settings.apiProvider === 'gemini') {
    rawText = await callGeminiAPI(settings.apiKey, prompt, []);
  } else if (settings.apiProvider === 'openai') {
    rawText = await callOpenAIAPI(settings.apiKey, prompt, [], 'Você é um extrator de receitas estruturadas em formato JSON.');
  }

  const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJsonStr);
  if (!parsed || !Array.isArray(parsed.recipes)) return [];

  return parsed.recipes.map((r: any) => ({
    title: r.title || 'Receita sem título',
    description: r.description || '',
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    instructions: Array.isArray(r.instructions) ? r.instructions : [],
    prepTime: Number(r.prepTime) || 10,
    cookTime: Number(r.cookTime) || 10,
    servings: Number(r.servings) || 1,
    tags: Array.isArray(r.tags) ? r.tags : [],
    dietaryCategories: Array.isArray(r.dietaryCategories) ? r.dietaryCategories : [],
    mealTypes: Array.isArray(r.mealTypes) ? r.mealTypes : []
  }));
}

// -------------------------------------------------------------
// PLANILHA DE CORRIDA PERSONALIZADA COM IA
// -------------------------------------------------------------

export interface RunningPlanRequest {
  targetDistance: number;
  weeksCount: number;
  hasWearable: boolean;
  maxHeartRate: number;
  referencePace: string;
  availableDays: string[]; // chaves: segunda, terca, quarta, quinta, sexta, sabado, domingo
  daysPerWeek: number;
  longRunDay: string; // uma das chaves acima
  skillLevel: 'iniciante' | 'intermediario' | 'avancado';
  injuryHistory: string;
  age?: number;
  gender?: string;
  goalType?: string;
  startDate: string; // YYYY-MM-DD
}

const WEEKDAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
const WEEKDAY_NAMES: Record<string, string> = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

// Escolhe quais dias da semana recebem treino, respeitando os dias disponíveis informados,
// a quantidade de dias por semana desejada e garantindo que o dia do treino longo esteja incluído.
function pickWorkoutDayKeys(availableDays: string[], daysPerWeek: number, longRunDay: string): string[] {
  const normalizedAvailable = (availableDays && availableDays.length > 0) ? availableDays : ['segunda', 'quarta', 'sabado'];
  const orderedAvailable = WEEKDAY_KEYS.filter(k => normalizedAvailable.includes(k));
  const effectiveDaysPerWeek = Math.min(Math.max(daysPerWeek || 3, 1), Math.max(orderedAvailable.length, 1));

  const selected: string[] = [];
  if (longRunDay && orderedAvailable.includes(longRunDay)) {
    selected.push(longRunDay);
  }

  const remaining = orderedAvailable.filter(k => k !== longRunDay);
  const slotsLeft = Math.max(effectiveDaysPerWeek - selected.length, 0);
  const step = Math.max(1, Math.floor(remaining.length / Math.max(slotsLeft, 1)));
  for (let i = 0; i < remaining.length && selected.length < effectiveDaysPerWeek; i += step) {
    selected.push(remaining[i]);
  }

  if (selected.length === 0) {
    selected.push(orderedAvailable[0] || 'segunda');
  }

  // Reordena cronologicamente (semana começa na segunda-feira)
  return WEEKDAY_KEYS.filter(k => selected.includes(k));
}

function generateLocalRunningPlan(request: RunningPlanRequest): RunningPlan {
  const { targetDistance, weeksCount, hasWearable, maxHeartRate, referencePace: referencePaceStr, availableDays, daysPerWeek, longRunDay, startDate } = request;
  const planId = `plan-${Date.now()}`;
  const weeks: any[] = [];

  const workoutKeys = pickWorkoutDayKeys(availableDays, daysPerWeek, longRunDay);
  const longRunKey = workoutKeys.includes(longRunDay) ? longRunDay : workoutKeys[workoutKeys.length - 1];
  const speedKey = workoutKeys.find(k => k !== longRunKey) || workoutKeys[0];
  const tempoKey = workoutKeys.find(k => k !== longRunKey && k !== speedKey);

  const daysOfWeek = WEEKDAY_KEYS.map(key => ({ key, name: WEEKDAY_NAMES[key], isWorkout: workoutKeys.includes(key) }));

  // Converte o pace de referência ("MM:SS") para segundos para fazer cálculos matemáticos precisos
  let refSecs = 360; // 06:00 padrão
  if (referencePaceStr && referencePaceStr.includes(':')) {
    const parts = referencePaceStr.split(':');
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!isNaN(mins) && !isNaN(secs)) {
      refSecs = (mins * 60) + secs;
    }
  }

  const formatSecondsToPace = (totalSecs: number): string => {
    const m = Math.floor(totalSecs / 60);
    const s = Math.round(totalSecs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s} min/km`;
  };

  // Paces calculados de forma científica
  const speedPace = formatSecondsToPace(refSecs - 45); // Ritmo de tiro (ex: Pace de 5k - 45s)
  const targetPace = formatSecondsToPace(refSecs);      // Ritmo de prova (Pace de referência)
  const tempoPace = formatSecondsToPace(refSecs + 20);   // Ritmo de tempo run (Pace de referência + 20s)
  const recoveryPace = formatSecondsToPace(refSecs + 60); // Ritmo de rodagem leve (Pace de referência + 60s)

  // Zonas Cardíacas calculadas de forma científica
  let z1Range = '';
  let z2Range = '';
  let z3Range = '';
  let z4Range = '';

  if (hasWearable && maxHeartRate > 0) {
    z1Range = `${Math.round(maxHeartRate * 0.50)} a ${Math.round(maxHeartRate * 0.60)} bpm`;
    z2Range = `${Math.round(maxHeartRate * 0.60)} a ${Math.round(maxHeartRate * 0.70)} bpm`;
    z3Range = `${Math.round(maxHeartRate * 0.70)} a ${Math.round(maxHeartRate * 0.80)} bpm`;
    z4Range = `${Math.round(maxHeartRate * 0.80)} a ${Math.round(maxHeartRate * 0.90)} bpm`;
  } else {
    z1Range = 'Zona 1 (Esforço muito leve, teste da fala pleno - você consegue cantar)';
    z2Range = 'Zona 2 (Esforço leve, consegue conversar facilmente em frases completas)';
    z3Range = 'Zona 3 (Esforço moderado, consegue falar frases curtas sem perder o fôlego)';
    z4Range = 'Zona 4 (Esforço forte, respiração rápida e profunda, fala limitada a poucas palavras)';
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
      let objective = 'Permitir a recuperação das fibras musculares e reestabelecimento dos estoques de glicogênio.';
      let successCriteria = 'Manter repouso absoluto ou realizar atividade passiva sem elevação da frequência cardíaca.';
      let isRest = true;

      if (day.isWorkout) {
        isRest = false;
        if (day.key === speedKey) {
          // Treino de tiros ou técnico
          if (targetDistance <= 5) {
            const numTuros = 4 + w;
            training = `⚡ [TREINO INTERVALADO DE VELOCIDADE]\n` +
                       `- Aquecimento: 10 min de corrida muito leve (Zona 1: ${z1Range}) + mobilidade dinâmica (elevação de joelhos, chutes frontais) + 3 acelerações progressivas de 50 metros.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 200 metros em ritmo de velocidade (Pace alvo: ${speedPace}, FC alvo: ${z4Range}) com recuperação de 1:30 min caminhando entre cada tiro.\n` +
                       `- Desaquecimento: 5 min de trote super leve para normalizar a frequência cardíaca.\n` +
                       `- Dica do Treinador: Mantenha os ombros relaxados e a amplitude de braços coordenada nos tiros rápidos. O foco é a eficiência neuromuscular!`;
            objective = `Desenvolver potência neuromuscular e tolerância ao lactato em velocidades acima da média de prova.`;
            successCriteria = `Completar todos os ${numTuros} tiros mantendo a variação de pace dentro de +/- 10 segundos do alvo de ${speedPace}.`;
          } else if (targetDistance <= 10) {
            const numTuros = 3 + w;
            training = `⚡ [INTERVALADO / TIROS DE VELOCIDADE]\n` +
                       `- Aquecimento: 12 min trote regenerativo (Zona 1: ${z1Range}) + 4x exercícios educativos de corrida (Skipping, Anfersen) + mobilidade articular.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 400 metros em ritmo forte (Pace alvo: ${speedPace}, FC alvo: ${z4Range}) com recuperação de 2:00 min de caminhada lenta para reduzir o lactato.\n` +
                       `- Desaquecimento: 5 min trote regenerativo final.\n` +
                       `- Dica do Treinador: Concentre-se em expirar todo o ar dos pulmões de forma controlada nos tiros de 400m para evitar a dor lateral desnecessária (dor de desviado).`;
            objective = `Melhorar a capacidade cardiovascular máxima (VO2 Máx) e eficiência de passada rápida.`;
            successCriteria = `Completar as ${numTuros} repetições sem caminhar durante os tiros e mantendo o ritmo de pace alvo de ${speedPace}.`;
          } else {
            const numTuros = 2 + Math.floor(w / 2);
            training = `⚡ [INTERVALADO DE LIMIAR DE LACTATO]\n` +
                       `- Aquecimento: 15 min de corrida leve (Zona 2: ${z2Range}) + mobilidade ativa de quadril e ativação de glúteos com mini-band se disponível.\n` +
                       `- Parte Principal: ${numTuros}x Tiros de 800 metros no seu ritmo de limiar aeróbico (Pace alvo: ${speedPace}, FC alvo: ${z4Range}) com 2:30 min de caminhada lenta de repouso.\n` +
                       `- Desaquecimento: 6 min trote leve de volta à calma.\n` +
                       `- Dica do Treinador: A cadência deve ser o foco. Tente manter entre 170-180 passos por minuto. A passos rápidos e curtos reduzem a frenagem e economizam energia.`;
            objective = `Retardar o acúmulo de ácido lático no organismo, permitindo correr em velocidades maiores por mais tempo.`;
            successCriteria = `Manter os ritmos dos tiros de 800m constantes e dentro da frequência cardíaca de Zona 4 (${z4Range}).`;
          }
        } else if (day.key === tempoKey) {
          // Treino de ritmo contínuo
          training = `📈 [CORRIDA DE RITMO / TEMPO RUN]\n` +
                     `- Aquecimento: 8 min de caminhada rápida evoluindo para trote leve (${z1Range}) + rotações circulares de tornozelo.\n` +
                     `- Parte Principal: Corrida contínua de ${midDistance} km em ritmo firme de prova (Zona 3 cardíaca, Pace alvo: ${tempoPace}, FC alvo: ${z3Range}, RPE 6-7). Mantenha a consistência sem oscilar a velocidade.\n` +
                     `- Desaquecimento: 5 min de trote super leve.\n` +
                     `- Dica do Treinador: Este é um treino mental. Encontre seu ritmo confortável-desconfortável e controle a respiração em uma proporção de 3 passos inspirando e 3 passos expirando.`;
          objective = `Trabalhar a estabilidade de ritmo de prova e desenvolver resiliência física e mental ao esforço contínuo.`;
          successCriteria = `Completar a distância total de ${midDistance} km em ritmo estável de ${tempoPace} (tolerância de +/- 15s) e sem paradas.`;
        } else if (day.key === longRunKey) {
          // Longão progressivo
          if (w === weeksCount) {
            training = `🏆 [DESAFIO FINAL: CONQUISTA DO OBJETIVO]\n` +
                       `- Aquecimento: 10 min de corrida muito leve (${z1Range}) + mobilidade leve. Nada de fadiga antes de começar!\n` +
                       `- Parte Principal: CORRA OS ${targetDistance} km no seu Pace de prova/alvo (Pace ideal: ${targetPace}, FC alvo: ${z3Range} a ${z4Range}). Divida mentalmente a prova em 3 partes iguais e controle a ansiedade no início.\n` +
                       `- Desaquecimento: Caminhada lenta e alongamento estático leve.\n` +
                       `- Dica do Treinador: Você completou toda a planilha e seu corpo está 100% pronto. Hidrate-se a cada 2 km e celebre cada quilômetro completado. O dia é seu!`;
            objective = `Concluir o desafio final de ${targetDistance} km simulando a intensidade e foco mental de uma prova de corrida real.`;
            successCriteria = `Completar os ${targetDistance} km correndo de forma contínua e atingindo a distância estipulada.`;
          } else {
            training = `🏃‍♂️ [TREINO LONGO / LONGÃO PROGRESSIVO]\n` +
                       `- Aquecimento: 10 min trote muito leve (${z1Range}) + ativação de abdômen/core (prancha por 1 min).\n` +
                       `- Parte Principal: Corrida contínua de ${longDistance} km em ritmo aeróbico base (Zona 2 cardíaca, Pace alvo: ${recoveryPace}, FC alvo: ${z2Range}, RPE 5-6). Aumente levemente o ritmo nos últimos 1 km se estiver confortável.\n` +
                       `- Desaquecimento: 5 min caminhada lenta final.\n` +
                       `- Dica do Treinador: O longão serve para construir sua base mitocondrial e resistência de tendões. Não corra rápido demais; você deve ser capaz de manter uma conversa sem perder o fôlego.`;
            objective = `Construir resistência aeróbica de base, fortalecimento de articulações e adaptação do corpo ao tempo prolongado de corrida.`;
            successCriteria = `Correr os ${longDistance} km de forma contínua mantendo a frequência cardíaca dentro da Zona 2 (${z2Range}).`;
          }
        } else {
          // Dia extra de treino quando o atleta escolheu mais dias por semana do que os 3 papéis fixos (tiros/tempo/longão)
          const easyDistance = Number((midDistance * 0.7).toFixed(1));
          training = `🌤️ [CORRIDA LEVE REGENERATIVA]\n` +
                     `- Aquecimento: 5 min de caminhada rápida evoluindo para trote muito leve (${z1Range}).\n` +
                     `- Parte Principal: Corrida contínua de ${easyDistance} km em ritmo confortável (Zona 1-2 cardíaca, Pace alvo: ${recoveryPace}, FC alvo: ${z1Range}, RPE 3-4), sem se preocupar com velocidade.\n` +
                     `- Desaquecimento: 5 min de caminhada leve.\n` +
                     `- Dica do Treinador: Este treino existe para acumular volume sem gerar fadiga. Se sentir cansaço, reduza o ritmo ainda mais.`;
          objective = `Aumentar o volume semanal de forma segura, favorecendo a recuperação ativa entre os treinos de maior intensidade.`;
          successCriteria = `Completar os ${easyDistance} km em ritmo confortável, sem elevar a frequência cardíaca acima da Zona 2 (${z2Range}).`;
        }
      }

      weekDays.push({
        dayName: day.name,
        training,
        isRest,
        isDone: false,
        objective,
        successCriteria
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
    startDate,
    isActive: true,
    goalType: request.goalType,
    weeks,
    hasWearable,
    maxHeartRate,
    referencePace: referencePaceStr
  };
}

export async function generateRunningPlan(request: RunningPlanRequest): Promise<RunningPlan> {
  const { targetDistance, weeksCount, hasWearable, maxHeartRate, referencePace, availableDays, daysPerWeek, longRunDay, skillLevel, injuryHistory, age, gender, startDate } = request;
  const settings = db.getSettings();

  const wearableInstructions = hasWearable && maxHeartRate > 0
    ? `O corredor possui Smartwatch/Wearable. Use parâmetros cardíacos objetivos nas descrições de treinos com base na Frequência Cardíaca Máxima (FCM) de ${maxHeartRate} bpm:
       - Zona 1 (Recuperação): 50-60% da FCM (${Math.round(maxHeartRate * 0.5)} a ${Math.round(maxHeartRate * 0.6)} bpm).
       - Zona 2 (Aeróbica/Base): 60-70% da FCM (${Math.round(maxHeartRate * 0.6)} a ${Math.round(maxHeartRate * 0.7)} bpm).
       - Zona 3 (Tempo/Ritmo): 70-80% da FCM (${Math.round(maxHeartRate * 0.7)} a ${Math.round(maxHeartRate * 0.8)} bpm).
       - Zona 4 (Limiar/Intervalado): 80-90% da FCM (${Math.round(maxHeartRate * 0.8)} a ${Math.round(maxHeartRate * 0.9)} bpm).
       Sugira a medição contínua através do visor do wearable e monitore a cadência de corrida (alvo de 170 a 180 passadas por minuto).`
    : `O corredor NÃO possui smartwatch/wearable. Sugira medições alternativas de controle de esforço como:
       - Teste da Fala (ex: na Z2 conseguir conversar confortavelmente em frases longas; na Z3 falar apenas frases curtas; na Z4 falar apenas monossílabas).
       - Percepção Subjetiva de Esforço (RPE na escala Borg de 1 a 10).
       - Medição manual de pulso por 15 segundos se houver parada rápida.`;

  const paceInstructions = referencePace
    ? `Use o Pace de Referência do atleta de ${referencePace} min/km para calcular e sugerir faixas de Pace específicas e milimétricas para os treinos:
       - Pace de Velocidade (tiros): Cerca de 40 a 50 segundos mais rápido que o pace de referência.
       - Pace de Tempo Run: Cerca de 15 a 20 segundos mais lento que o pace de referência.
       - Pace de Rodagem leve/Longão: Cerca de 1 min a 1:15 min mais lento que o pace de referência.`
    : `Sugira paces estimados típicos para um corredor buscando completar a distância de ${targetDistance} km no prazo estipulado.`;

  const availableDayNames = (availableDays && availableDays.length > 0 ? availableDays : ['segunda', 'quarta', 'sabado']).map(k => WEEKDAY_NAMES[k] || k);
  const longRunDayName = WEEKDAY_NAMES[longRunDay] || longRunDay;

  const profileInstructions = `Perfil do atleta:
  - Nível de corrida: ${skillLevel || 'não informado'}.
  - Histórico de lesões: ${injuryHistory || 'não informado'}${injuryHistory === 'frequentes-recentes' ? ' — REDUZA a intensidade/volume de progressão e priorize técnica e fortalecimento preventivo, com progressão mais conservadora entre as semanas' : ''}.
  ${age ? `- Idade: ${age} anos.` : ''}
  ${gender ? `- Gênero: ${gender}.` : ''}`;

  const prompt = `Você é um Treinador de Elite de Corrida de Rua, mentor de atletas olímpicos e amadores de alta performance em assessorias renomadas internacionalmente.

  Gere uma planilha de treinos de corrida altamente técnica, científica e 100% objetiva (sem termos vagos/subjetivos) em formato JSON para um atleta que tem como objetivo correr a distância de ${targetDistance} km no prazo de ${weeksCount} semanas.

  ${profileInstructions}

  Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown (como \`\`\`json) ou qualquer texto de introdução/conclusão:
  {
    "id": "plan-${Date.now()}",
    "targetDistance": ${targetDistance},
    "weeksCount": ${weeksCount},
    "createdAt": "${new Date().toISOString()}",
    "startDate": "${startDate}",
    "hasWearable": ${hasWearable},
    "maxHeartRate": ${maxHeartRate},
    "referencePace": "${referencePace}",
    "weeks": [
      {
        "weekNumber": 1,
        "days": [
          { 
            "dayName": "Segunda-feira", 
            "training": "Descrição detalhada", 
            "isRest": false, 
            "isDone": false,
            "objective": "Objetivo técnico e específico da sessão",
            "successCriteria": "Critério de sucesso claro, quantitativo e mensurável para saber se atingiu a meta"
          },
          { 
            "dayName": "Terça-feira", 
            "training": "Descanso Total ou Regenerativo Ativo", 
            "isRest": true, 
            "isDone": false,
            "objective": "Permitir recuperação celular e supercompensação",
            "successCriteria": "Repouso absoluto ou atividade passiva sem elevação da FC"
          },
          { 
            "dayName": "Quarta-feira", 
            "training": "Descrição detalhada", 
            "isRest": false, 
            "isDone": false,
            "objective": "Objetivo técnico e específico da sessão",
            "successCriteria": "Critério de sucesso claro, quantitativo e mensurável"
          },
          { 
            "dayName": "Quinta-feira", 
            "training": "Descanso Total ou Regenerativo Ativo", 
            "isRest": true, 
            "isDone": false,
            "objective": "Permitir recuperação celular",
            "successCriteria": "Repouso absoluto"
          },
          { 
            "dayName": "Sexta-feira", 
            "training": "Descanso Total ou Regenerativo Ativo", 
            "isRest": true, 
            "isDone": false,
            "objective": "Permitir recuperação celular",
            "successCriteria": "Repouso absoluto"
          },
          { 
            "dayName": "Sábado", 
            "training": "Descrição detalhada", 
            "isRest": false, 
            "isDone": false,
            "objective": "Objetivo técnico e específico da sessão",
            "successCriteria": "Critério de sucesso claro, quantitativo e mensurável"
          },
          { 
            "dayName": "Domingo", 
            "training": "Descanso Total ou Regenerativo Ativo", 
            "isRest": true, 
            "isDone": false,
            "objective": "Permitir recuperação celular",
            "successCriteria": "Repouso absoluto"
          }
        ]
      }
    ]
  }
  
  Instruções de Métricas e Equipamento do Corredor:
  ${wearableInstructions}
  
  Instruções de Cálculo de Paces:
  ${paceInstructions}
  
  Diretrizes de Sofisticação dos Treinos (Apenas para dias ativos, onde "isRest" é false):
  Para cada treino, você DEVE estruturar o texto do campo "training" exatamente com este padrão profissional:
  
  ⚡ [NOME DO TIPO DE TREINO: ex: INTERVALADO DE VELOCIDADE / FARTLEK / TEMPO RUN / LONGÃO PROGRESSIVO]
  - Aquecimento: Instrução detalhada de preparação física (tempo exato, zona cardíaca, exercícios educativos específicos de corrida e mobilidade ativa).
  - Parte Principal: Instrução exata de repetições, distâncias (ex: metros ou km), paces alvo calculados (min/km), frequências cardíacas exatas (bpm ou zona de esforço), e tempo exato de descanso/recuperação ativo ou passivo.
  - Desaquecimento: Trote regenerativo ou caminhada lenta de volta à calma (tempo exato, ritmo).
  - Dica do Treinador: Conselhos técnicos focados na biomecânica (postura, inclinação do tronco, cadência de passadas em ppm), hidratação ou estratégia mental.
  
  No campo "objective", defina a adaptação fisiológica buscada na sessão (ex: aumento de VO2 máx, tolerância ao lactato, endurance de base).
  No campo "successCriteria", defina o que significa ter cumprido a sessão de forma mensurável (ex: "Concluir os 6 tiros de 400m mantendo o pace médio entre 5:15 e 5:25 min/km e a variação cardíaca não ultrapassar 170 bpm").
  
  Diretrizes de Estrutura Semanal:
  1. O atleta está disponível para treinar apenas nos seguintes dias: ${availableDayNames.join(', ')}. Escolha exatamente ${daysPerWeek} desses dias para serem dias de treino ativo ("isRest": false) por semana, distribuídos de forma espaçada quando possível, e marque todos os demais dias (incluindo os disponíveis não escolhidos) como descanso ("isRest": true).
  2. O treino longo/longão semanal DEVE cair sempre em ${longRunDayName}.
  3. A cada semana, a distância e a intensidade do longão devem progredir de forma linear e segura, atingindo o desafio final na última semana.
  4. Formate todo o conteúdo em português brasileiro (pt-BR).`;

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
        plan.startDate = plan.startDate || startDate;
        plan.isActive = true;
        plan.goalType = request.goalType;
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
      resolve(generateLocalRunningPlan(request));
    }, 1000);
  });
}

// Extrai quantidade, unidade e nome de uma linha de ingrediente em texto livre
// (ex: "4 ovos", "200g de peito de frango", "1/2 xícara de aveia", "2 colheres de sopa de azeite")
function parseIngredientLine(line: string): { qty: number | null; unit: string; name: string } {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^([\d]+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(colheres?\s+de\s+(?:sopa|ch[áa])|x[íi]caras?|gramas?|quilos?|kg|g|ml|litros?|l|fatias?|unidades?|dentes?|pitadas?|punhados?)?\s*(?:de\s+)?(.+)$/i
  );

  if (!match) {
    return { qty: null, unit: '', name: trimmed };
  }

  const [, qtyRaw, unitRaw, nameRaw] = match;
  let qty: number | null = null;
  if (qtyRaw.includes('/')) {
    const [num, den] = qtyRaw.split('/').map(s => parseFloat(s.replace(',', '.').trim()));
    qty = den ? num / den : null;
  } else {
    qty = parseFloat(qtyRaw.replace(',', '.'));
  }

  return {
    qty: qty !== null && !isNaN(qty) ? qty : null,
    unit: (unitRaw || '').toLowerCase().replace(/\s+/g, ' ').trim(),
    name: (nameRaw || trimmed).trim()
  };
}

// Normaliza o nome do ingrediente (minúsculas, sem acento, singular simples) só como chave de agrupamento
function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (n.endsWith('s') && n.length > 3) n = n.slice(0, -1);
  return n;
}

// Agrega uma lista de linhas de ingredientes (podendo ter repetições de receitas usadas
// várias vezes na semana), somando quantidades de itens equivalentes em vez de duplicá-los
// ou perdê-los numa deduplicação ingênua por string inteira.
function aggregateIngredientLines(lines: string[]): string[] {
  const map = new Map<string, { qtySum: number | null; unit: string; displayName: string; occurrences: number }>();

  lines.forEach(line => {
    const { qty, unit, name } = parseIngredientLine(line);
    const key = `${unit}|${normalizeIngredientName(name)}`;
    const existing = map.get(key);
    if (existing) {
      existing.occurrences += 1;
      existing.qtySum = (qty !== null && existing.qtySum !== null) ? existing.qtySum + qty : null;
    } else {
      map.set(key, { qtySum: qty, unit, displayName: name, occurrences: 1 });
    }
  });

  return Array.from(map.values()).map(entry => {
    if (entry.qtySum !== null && entry.qtySum > 0) {
      const qtyStr = Number.isInteger(entry.qtySum) ? String(entry.qtySum) : entry.qtySum.toFixed(1).replace('.', ',');
      if (!entry.unit) return `${qtyStr} ${entry.displayName}`;
      const glue = ['g', 'kg', 'ml', 'l'].includes(entry.unit) ? '' : ' ';
      return `${qtyStr}${glue}${entry.unit} de ${entry.displayName}`;
    }
    return entry.occurrences > 1 ? `${entry.displayName} (usado ${entry.occurrences}x)` : entry.displayName;
  });
}

export async function generateShoppingListWithAI(
  mealPlans: any[],
  recipes: any[]
): Promise<{
  categories: { name: string; items: string[] }[];
}> {
  const settings = db.getSettings();
  const plannedItemLines: string[] = [];
  const recipeIngredientLines: string[] = [];

  mealPlans.forEach(plan => {
    plan.meals.forEach((meal: any) => {
      meal.items.forEach((item: any) => {
        if (item.recipeId) {
          const rec = recipes.find(r => r.id === item.recipeId);
          if (rec && Array.isArray(rec.ingredients)) {
            // Não deduplicamos aqui: cada vez que a receita aparece no cardápio da semana,
            // seus ingredientes entram de novo para que a soma de quantidade seja correta.
            recipeIngredientLines.push(...rec.ingredients);
          }
        } else if (item.customName) {
          plannedItemLines.push(item.customName);
        }
      });
    });
  });

  const aggregatedRecipeItems = aggregateIngredientLines(recipeIngredientLines);
  const aggregatedCustomItems = aggregateIngredientLines(plannedItemLines);

  const prompt = `Você é um Assistente Nutricional de IA altamente especializado.
As quantidades abaixo já foram somadas e consolidadas para a semana inteira — sua única tarefa é organizá-las em categorias de supermercado, SEM somar, duplicar, remover ou alterar as quantidades informadas.

INGREDIENTES DE RECEITAS (quantidades já somadas para a semana toda):
${aggregatedRecipeItems.join('\n') || 'Nenhum ingrediente de receita cadastrado.'}

ITENS PLANEJADOS AVULSOS (quantidades já somadas para a semana toda):
${aggregatedCustomItems.join('\n') || 'Nenhum item avulso planejado.'}

Agrupe esses itens estritamente em categorias de supermercado: "Hortifruti" (frutas e vegetais), "Açougue & Peixaria" (carnes, ovos, frango, peixe), "Laticínios & Frios", "Mercearia & Secos" (arroz, aveia, massas, grãos, etc.), "Suplementos & Outros".

Retorne estritamente um objeto JSON com esta estrutura exata, sem blocos de código Markdown (como \`\`\`json) ou qualquer texto de introdução/conclusão:
{
  "categories": [
    {
      "name": "Nome da Categoria",
      "items": [
        "100g de Espinafre fresco"
      ]
    }
  ]
}`;

  if (settings.apiKey && settings.apiProvider !== 'none') {
    try {
      let rawText = '';
      if (settings.apiProvider === 'gemini') {
        const enrichedPrompt = `INSTRUÇÕES DO SISTEMA:\nVocê é um gerador de listas de compras em formato JSON. Siga as instruções do usuário estritamente.\n\nPrompt do Usuário: ${prompt}`;
        rawText = await callGeminiAPI(settings.apiKey, enrichedPrompt, []);
      } else if (settings.apiProvider === 'openai') {
        rawText = await callOpenAIAPI(settings.apiKey, prompt, [], 'Você é um gerador de listas de compras em formato JSON.');
      }

      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      if (parsed && Array.isArray(parsed.categories)) {
        return parsed;
      }
    } catch (err) {
      console.error('Erro na IA real ao gerar lista de compras:', err);
    }
  }

  // Fallback offline
  const hortifruti: string[] = [];
  const acougue: string[] = [];
  const laticinios: string[] = [];
  const mercearia: string[] = [];
  const suplementos: string[] = [];

  const categorize = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes('banana') || lower.includes('morango') || lower.includes('maçã') || lower.includes('uva') || lower.includes('limão') || lower.includes('tomate') || lower.includes('brócolis') || lower.includes('alface') || lower.includes('espinafre') || lower.includes('cebola') || lower.includes('alho') || lower.includes('legume') || lower.includes('batata') || lower.includes('abóbora')) {
      hortifruti.push(item);
    } else if (lower.includes('frango') || lower.includes('carne') || lower.includes('bacon') || lower.includes('presunto') || lower.includes('salmão') || lower.includes('peixe') || lower.includes('ovo') || lower.includes('clara')) {
      acougue.push(item);
    } else if (lower.includes('queijo') || lower.includes('leite') || lower.includes('iogurte') || lower.includes('cottage') || lower.includes('manteiga') || lower.includes('creme')) {
      laticinios.push(item);
    } else if (lower.includes('aveia') || lower.includes('arroz') || lower.includes('pão') || lower.includes('tapioca') || lower.includes('sal') || lower.includes('pimenta') || lower.includes('azeite') || lower.includes('vinagre') || lower.includes('muffin') || lower.includes('grão') || lower.includes('pasta de amendoim')) {
      mercearia.push(item);
    } else {
      suplementos.push(item);
    }
  };

  aggregatedRecipeItems.forEach(categorize);
  aggregatedCustomItems.forEach(categorize);

  if (hortifruti.length === 0 && acougue.length === 0 && laticinios.length === 0 && mercearia.length === 0 && suplementos.length === 0) {
    acougue.push('4 Ovos inteiros', '60g de Frango desfiado');
    mercearia.push('2 colheres de sopa de goma de Tapioca', '2 fatias de Pão integral');
    hortifruti.push('1/2 Tomate picado', '1/4 xícara de Espinafre fresco');
  }

  const categories = [
    { name: 'Hortifruti 🥦', items: Array.from(new Set(hortifruti)) },
    { name: 'Açougue, Peixaria & Ovos 🍗', items: Array.from(new Set(acougue)) },
    { name: 'Laticínios & Frios 🧀', items: Array.from(new Set(laticinios)) },
    { name: 'Mercearia & Secos 🌾', items: Array.from(new Set(mercearia)) },
    { name: 'Suplementos & Outros 💊', items: Array.from(new Set(suplementos)) },
  ].filter(cat => cat.items.length > 0);

  return { categories };
}


