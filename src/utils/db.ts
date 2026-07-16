import { firestore, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  type Unsubscribe 
} from 'firebase/firestore';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  workoutId: string;
  series: number;
  repetitions: string;
  prWeight: number;
  notes: string;
  executionType?: 'reps' | 'time';
  instructions?: string;
  image?: string;
  videoUrl?: string;
}

export interface Workout {
  id: string;
  name: string;
  isTemplate: boolean;
}

export interface RunningPlanWeekDay {
  dayName: string;
  training: string;
  isRest: boolean;
  isDone?: boolean;
  objective?: string;
  successCriteria?: string;
}

export interface RunningPlanWeek {
  weekNumber: number;
  days: RunningPlanWeekDay[];
}

export interface RunningPlan {
  id: string;
  targetDistance: number;
  weeksCount: number;
  createdAt: string;
  weeks: RunningPlanWeek[];
  hasWearable?: boolean;
  maxHeartRate?: number;
  referencePace?: string;
}

export interface WorkoutLogExercise {
  name: string;
  muscleGroup: string;
  series: number;
  repetitions: string;
  weight: number;
  rpe?: number;
}

export interface WorkoutLog {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  exercises: WorkoutLogExercise[];
}

export interface RunLog {
  id: string;
  date: string;
  time: number;
  distance: number;
  pace: number;
  calories: number;
  heartRate: number;
}

export interface BodyCompLog {
  id: string;
  date: string;
  weight: number;
  idealWeight: number;
  bmi: number;
  bodyFat: number;
  bodyFatGoal: number;
  muscleMass: number;
  muscleMassGoal: number;
  bodyWater: number;
  leanMass: number;
  boneMass: number;
  basalMetabolism: number;
  proteins: number;
  visceralFat: number;
  visceralFatGoal: number;
  metabolicAge: number;
  heartRate: number;
}

export interface RaceRegistration {
  id: string;
  name: string;
  date: string;
  location: string;
  distance: string;
  link: string;
  isRegistered: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  target: number;
  type: 'workout_count' | 'run_count' | 'streak' | 'max_pr' | 'pace';
}

export interface UserSettings {
  userName: string;
  height: number;
  age: number;
  restingHeartRate: number;
  apiKey: string;
  apiProvider: 'gemini' | 'openai' | 'none';
  emailForList?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  carbCyclingMode?: 'none' | 'auto';
  tdeeMode?: 'none' | 'auto';
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  rating: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  lastMade?: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  sourceUrl?: string;
  comments?: {
    id: string;
    user: string;
    text: string;
    date: string;
  }[];
  dietaryCategories?: string[]; // Vegetariana, Vegana, light, fitness, Diet, sem gluten, sem lactose, Detox
  mealTypes?: string[];         // Café da manhã, almoço, lanche, jantar, etc.
  videoUrl?: string;            // Link de vídeo (ex: YouTube)
  isFavorite?: boolean;         // Marcador de favorito
}

export interface MealPlanItem {
  recipeId?: string;
  customName?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Meal {
  id: string;
  name: string;
  items: MealPlanItem[];
}

export interface MealPlan {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  meals: Meal[];
}

export interface FoodLogItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealId?: string;
}

export interface FoodLog {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  items: FoodLogItem[];
}

const KEYS = {
  WORKOUTS: 'vs_workouts',
  EXERCISES: 'vs_exercises',
  WORKOUT_LOGS: 'vs_workout_logs',
  RUN_LOGS: 'vs_run_logs',
  BODY_COMP: 'vs_body_comp',
  RACES: 'vs_races',
  SETTINGS: 'vs_settings',
  RECIPES: 'vs_recipes',
  MEAL_PLANS: 'vs_meal_plans',
  FOOD_LOGS: 'vs_food_logs',
  RUNNING_PLAN: 'vs_running_plan',
  LAST_EMAIL_SENT_WEEK: 'vs_last_email_sent_week',
  ACHIEVEMENTS: 'vs_achievements',
};

// Sementes iniciais
const INITIAL_WORKOUTS: Workout[] = [
  { id: 'treino-a', name: 'Treino A', isTemplate: true },
  { id: 'treino-b', name: 'Treino B', isTemplate: true },
];

const INITIAL_EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Barra Fixa', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 10, notes: 'Focar na amplitude' },
  { id: 'ex-2', name: 'Remada Curvada com barra', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 40, notes: '' },
  { id: 'ex-3', name: 'Remada Cavalo', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 50, notes: '' },
  { id: 'ex-4', name: 'Levantamento Terra', muscleGroup: 'Dorsal', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 90, notes: 'Cuidado com a postura' },
  { id: 'ex-5', name: 'Rosca Martelo', muscleGroup: 'Bíceps', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 14, notes: 'Halteres' },
  { id: 'ex-6', name: 'Rosca Direta', muscleGroup: 'Bíceps', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 30, notes: 'Barra W' },
  { id: 'ex-7', name: 'Elevação de Panturrilha em pé', muscleGroup: 'Panturrilha', workoutId: 'treino-a', series: 4, repetitions: '10', prWeight: 60, notes: 'Fazer cadência lenta' },
  { id: 'ex-8', name: 'Supino Reto', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 70, notes: 'Barra' },
  { id: 'ex-9', name: 'Supino Inclinado', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 50, notes: 'Halteres' },
  { id: 'ex-10', name: 'Crossover com polia alta', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 25, notes: '' },
  { id: 'ex-11', name: 'Crucifixo reto', muscleGroup: 'Peitoral', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 16, notes: '' },
  { id: 'ex-12', name: 'Tríceps Francês', muscleGroup: 'Tríceps', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 18, notes: 'Halter' },
  { id: 'ex-13', name: 'Triceps Pulley', muscleGroup: 'Tríceps', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 25, notes: 'Barra reta' },
  { id: 'ex-14', name: 'Abdominal Reto', muscleGroup: 'Abdominal', workoutId: 'treino-b', series: 4, repetitions: '10', prWeight: 0, notes: 'Com peso no peito' },
];

const INITIAL_SETTINGS: UserSettings = {
  userName: 'Atleta Saudável',
  height: 175,
  age: 30,
  restingHeartRate: 60,
  apiKey: '',
  apiProvider: 'none',
  emailForList: '',
  resendApiKey: '',
  resendFromEmail: '',
  carbCyclingMode: 'auto',
  tdeeMode: 'auto',
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-first-workout', title: 'Primeiro Treino', description: 'Realize seu primeiro treino de musculação.', icon: 'Dumbbell', progress: 0, target: 1, type: 'workout_count' },
  { id: 'ach-workout-10', title: 'Rato de Academia', description: 'Complete 10 treinos de musculação.', icon: 'Award', progress: 0, target: 10, type: 'workout_count' },
  { id: 'ach-first-run', title: 'Primeiros Passos', description: 'Registre sua primeira corrida.', icon: 'Footprints', progress: 0, target: 1, type: 'run_count' },
  { id: 'ach-run-10', title: 'Velocista Consistente', description: 'Registre 10 corridas no sistema.', icon: 'Trophy', progress: 0, target: 10, type: 'run_count' },
  { id: 'ach-heavy-lift', title: 'Força Bruta', description: 'Registre um peso de 100kg ou mais em qualquer exercício.', icon: 'Zap', progress: 0, target: 100, type: 'max_pr' },
  { id: 'ach-speedy', title: 'Sub-5 Pace', description: 'Corra com um pace abaixo de 05:00 min/km.', icon: 'Flame', progress: 0, target: 5.0, type: 'pace' },
  { id: 'ach-consistency', title: 'Consistência de Aço', description: 'Treine 3 dias seguidos (musculação ou corrida).', icon: 'Activity', progress: 0, target: 3, type: 'streak' },
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Ovos Benedict dos Campeões',
    description: 'Gosta de gema mole? Se sim, essa receita é perfeita para você! Comece o dia com um café da manhã delicioso e nutritivo.',
    rating: 5,
    prepTime: 15,
    cookTime: 15,
    totalTime: 15,
    servings: 1,
    lastMade: 'Nunca',
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      '4 ovos',
      '2 fatias de pão inglês ou muffin inglês, cortadas ao meio',
      '4 fatias de presunto (ou bacon canadense)',
      '1 colher de sopa de vinagre branco'
    ],
    instructions: [
      'Em uma panela grande, coloque água suficiente para cobrir os ovos e adicione o vinagre. Aqueça até começar a ferver.',
      'Quebre um ovo em um recipiente pequeno, criando um pequeno redemoinho na água com uma colher. Deslize o ovo na água, cuidando para não se misturar com outros ovos. Cozinhe por cerca de 3 a 4 minutos para a gema ficar mole. Retire com uma escumadeira e repita com os outros ovos.',
      'Toste as fatias de pão ou muffin inglês em uma torradeira ou frigideira até ficarem crocantes.',
      'Em uma frigideira, doure as fatias de presunto (ou bacon canadense) até ficarem ligeiramente crocantes.',
      'Montagem: Coloque uma fatia de pão ou muffin inglês em cada prato. Coloque uma fatia de presunto sobre o pão. Com cuidado, coloque um ovo pochê sobre o presunto.'
    ],
    tags: ['Fit', 'Café da Manhã'],
    comments: [
      { id: 'c-1', user: 'Atleta Saudável', text: 'Receita incrível! A gema mole no ponto certo faz toda a diferença.', date: '2026-07-08' }
    ],
    dietaryCategories: ['Fitness'],
    mealTypes: ['Café da Manhã'],
    videoUrl: 'https://www.youtube.com/watch?v=Jm21y1H0R9Q',
    isFavorite: false
  },
  {
    id: 'rec-2',
    title: 'Omelete de Claras com Legumes',
    description: 'Opção de jantar leve e nutritivo que ajuda na saciedade e emagrecimento rápido! Rico em proteínas.',
    rating: 4,
    prepTime: 5,
    cookTime: 5,
    totalTime: 10,
    servings: 1,
    lastMade: 'Nunca',
    image: 'https://images.unsplash.com/photo-1510629954389-c1e0da47d414?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      '3 claras de ovo',
      '1/2 tomate picado',
      '1/4 xícara de espinafre fresco',
      '1 colher de sopa de cebola picada',
      'Sal e pimenta a gosto'
    ],
    instructions: [
      'Bata as claras em um prato com uma pitada de sal.',
      'Aqueça uma frigideira antiaderente untada com um fio de azeite.',
      'Adicione a cebola, o tomate e o espinafre e refogue por 2 minutos.',
      'Despeje as claras batidas sobre os legumes, tampe a frigideira e cozinhe em fogo baixo até dourar e firmar dos dois lados.'
    ],
    tags: ['Low Carb', 'Jantar', 'Proteico'],
    comments: [],
    dietaryCategories: ['Fitness', 'Light', 'Sem Glúten', 'Sem Lactose'],
    mealTypes: ['Lanche', 'Jantar'],
    videoUrl: 'https://www.youtube.com/watch?v=q6t8J_NswjA',
    isFavorite: true
  }
];

// Leitores locais síncronos
function getFromStorage<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key);
  if (!value) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispara evento global para re-renderizar componentes
    window.dispatchEvent(new Event('vs_database_update'));
  } catch (error) {
    console.error(`Erro ao salvar no localStorage para a chave [${key}]:`, error);

    // Fallback se o limite do localStorage for atingido (geralmente QuotaExceededError)
    if (key === KEYS.EXERCISES && Array.isArray(data)) {
      console.warn("Falha de gravação local. Removendo imagens demonstrativas dos exercícios locais para salvar apenas dados textuais...");
      const cleanedData = data.map(ex => ({ ...ex, image: '' }));
      try {
        localStorage.setItem(key, JSON.stringify(cleanedData));
        window.dispatchEvent(new Event('vs_database_update'));
        return; // Salvo localmente sem imagens
      } catch (innerError) {
        console.error("Falha ao salvar exercícios mesmo após remover as imagens:", innerError);
      }
    }

    if (key === KEYS.RECIPES && Array.isArray(data)) {
      console.warn("Falha de gravação local. Removendo imagens das receitas locais para salvar apenas dados textuais...");
      const cleanedData = data.map(rec => ({ ...rec, image: '' }));
      try {
        localStorage.setItem(key, JSON.stringify(cleanedData));
        window.dispatchEvent(new Event('vs_database_update'));
        return; // Salvo localmente sem imagens
      } catch (innerError) {
        console.error("Falha ao salvar receitas mesmo após remover as imagens:", innerError);
      }
    }

    throw error;
  }
}

// -------------------------------------------------------------
// CACHE EM MEMÓRIA PARA IMAGENS GRANDES (Fallback de estouro de cota do LocalStorage)
// -------------------------------------------------------------
const memoryImagesCache: Record<string, string> = {};

// -------------------------------------------------------------
// SINCRONIZADOR FIRESTORE EM SEGUNDO PLANO
// -------------------------------------------------------------
async function writeToFirestore(subpath: string, docId: string, data: any) {
  if (!firestore || !auth || !auth.currentUser) return;
  try {
    const userDocRef = doc(firestore, 'users', auth.currentUser.uid, subpath, docId);
    await setDoc(userDocRef, data);
  } catch (error) {
    console.error(`Erro ao escrever no Firestore [${subpath}/${docId}]:`, error);
  }
}

async function removeFromFirestore(subpath: string, docId: string) {
  if (!firestore || !auth || !auth.currentUser) return;
  try {
    const userDocRef = doc(firestore, 'users', auth.currentUser.uid, subpath, docId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error(`Erro ao deletar no Firestore [${subpath}/${docId}]:`, error);
  }
}

// -------------------------------------------------------------
// ASSINATURA EM TEMPO REAL FIRESTORE -> LOCALSTORAGE
// -------------------------------------------------------------
export function subscribeToUserFirestore(uid: string): Unsubscribe[] {
  if (!firestore) return [];

  const unsubscribes: Unsubscribe[] = [];

  const collectionsToSync = [
    { subpath: 'workouts', key: KEYS.WORKOUTS, defaultVal: INITIAL_WORKOUTS },
    { subpath: 'exercises', key: KEYS.EXERCISES, defaultVal: INITIAL_EXERCISES },
    { subpath: 'workout_logs', key: KEYS.WORKOUT_LOGS, defaultVal: [] },
    { subpath: 'run_logs', key: KEYS.RUN_LOGS, defaultVal: [] },
    { subpath: 'body_comp_logs', key: KEYS.BODY_COMP, defaultVal: [] },
    { subpath: 'races', key: KEYS.RACES, defaultVal: [] },
    { subpath: 'recipes', key: KEYS.RECIPES, defaultVal: INITIAL_RECIPES },
    { subpath: 'meal_plans', key: KEYS.MEAL_PLANS, defaultVal: [] },
    { subpath: 'food_logs', key: KEYS.FOOD_LOGS, defaultVal: [] },
    { subpath: 'running_plans', key: KEYS.RUNNING_PLAN, defaultVal: [] },
    { subpath: 'achievements', key: KEYS.ACHIEVEMENTS, defaultVal: INITIAL_ACHIEVEMENTS },
  ];

  collectionsToSync.forEach(({ subpath, key, defaultVal }) => {
    const colRef = collection(firestore!, 'users', uid, subpath);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data());
      });

      // Retém as imagens no cache em memória antes do salvamento local para evitar perda por estouro de cota
      if (key === KEYS.EXERCISES) {
        data.forEach(ex => {
          if (ex.id && ex.image) {
            memoryImagesCache[ex.id] = ex.image;
          }
        });
      }
      if (key === KEYS.RECIPES) {
        data.forEach(rec => {
          if (rec.id && rec.image) {
            memoryImagesCache[rec.id] = rec.image;
          }
        });
      }

      // Se Firestore estiver vazio para treinos/exercícios/receitas, não sobrescreve com array vazio na primeira carga
      if (data.length > 0) {
        saveToStorage(key, data);
      } else if (snapshot.metadata.fromCache === false && (key === KEYS.WORKOUTS || key === KEYS.EXERCISES || key === KEYS.RECIPES)) {
        // Se explicitamente vazio no servidor e não for cache
        saveToStorage(key, defaultVal);
      } else if (snapshot.metadata.fromCache === false) {
        saveToStorage(key, []);
      }
    });
    unsubscribes.push(unsub);
  });

  // Sync das configurações gerais
  const settingsDocRef = doc(firestore, 'users', uid, 'settings', 'general');
  const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      saveToStorage(KEYS.SETTINGS, docSnap.data());
    } else {
      saveToStorage(KEYS.SETTINGS, INITIAL_SETTINGS);
    }
  });
  unsubscribes.push(unsubSettings);

  return unsubscribes;
}

// -------------------------------------------------------------
// CONTROLE DO BANCO DE DADOS
// -------------------------------------------------------------
export const db = {
  // Ajustes
  getSettings: (): UserSettings => getFromStorage(KEYS.SETTINGS, INITIAL_SETTINGS),
  saveSettings: (settings: UserSettings): void => {
    saveToStorage(KEYS.SETTINGS, settings);
    writeToFirestore('settings', 'general', settings);
  },

  // Treinos
  getWorkouts: (): Workout[] => getFromStorage(KEYS.WORKOUTS, INITIAL_WORKOUTS),
  saveWorkout: (workout: Workout): void => {
    const workouts = db.getWorkouts();
    const index = workouts.findIndex(w => w.id === workout.id);
    if (index >= 0) {
      workouts[index] = workout;
    } else {
      workouts.push(workout);
    }
    saveToStorage(KEYS.WORKOUTS, workouts);
    writeToFirestore('workouts', workout.id, workout);
  },
  deleteWorkout: (id: string): void => {
    const workouts = db.getWorkouts().filter(w => w.id !== id);
    saveToStorage(KEYS.WORKOUTS, workouts);
    removeFromFirestore('workouts', id);

    // Remove exercícios associados
    const exercises = db.getExercises();
    const orphans = exercises.filter(e => e.workoutId === id);
    orphans.forEach(ex => removeFromFirestore('exercises', ex.id));
    
    const remainingExs = exercises.filter(e => e.workoutId !== id);
    saveToStorage(KEYS.EXERCISES, remainingExs);
  },

  // Exercícios
  getExercises: (): Exercise[] => {
    const exercises = getFromStorage<Exercise[]>(KEYS.EXERCISES, INITIAL_EXERCISES);
    return exercises.map(ex => ({
      ...ex,
      image: ex.image || memoryImagesCache[ex.id] || ''
    }));
  },
  saveExercise: (exercise: Exercise): void => {
    const exercises = db.getExercises();
    
    // Preserva a imagem se o formulário enviou vazio por limitação local, mas temos na memória
    const imageToSave = exercise.image || memoryImagesCache[exercise.id] || '';
    const fullExercise = { ...exercise, image: imageToSave };

    if (imageToSave) {
      memoryImagesCache[exercise.id] = imageToSave;
    }

    const index = exercises.findIndex(e => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = fullExercise;
    } else {
      exercises.push(fullExercise);
    }
    
    // 1. Sempre tenta salvar no banco de dados remoto (Firestore) com todos os dados, incluindo a imagem
    writeToFirestore('exercises', exercise.id, fullExercise);

    try {
      // 2. Tenta salvar localmente no localStorage (com imagem)
      saveToStorage(KEYS.EXERCISES, exercises);
    } catch (error) {
      // 3. Fallback: Se falhar localmente (geralmente por tamanho/limite de cota),
      // salvamos na base local sem a imagem para o app continuar funcionando,
      // mas mantemos o registro do Firestore intacto com a imagem.
      console.warn("Estouro de cota local ao salvar exercício. Removendo imagem da persistência local...", error);
      
      const cleanExercise = { ...exercise, image: '' };
      const exercisesWithoutImages = exercises.map(ex => ({
        ...ex,
        image: ex.id === exercise.id ? '' : (ex.image || '')
      }));

      if (index >= 0) {
        exercisesWithoutImages[index] = cleanExercise;
      } else {
        exercisesWithoutImages[exercisesWithoutImages.length - 1] = cleanExercise;
      }

      try {
        saveToStorage(KEYS.EXERCISES, exercisesWithoutImages);
      } catch (retryError) {
        console.error("Erro ao salvar exercício localmente mesmo sem imagem:", retryError);
      }
    }
  },
  deleteExercise: (id: string): void => {
    const exercises = db.getExercises().filter(e => e.id !== id);
    saveToStorage(KEYS.EXERCISES, exercises);
    removeFromFirestore('exercises', id);
  },

  // Histórico de Treinos
  getWorkoutLogs: (): WorkoutLog[] => getFromStorage(KEYS.WORKOUT_LOGS, []),
  addWorkoutLog: (log: Omit<WorkoutLog, 'id'>): void => {
    const logs = db.getWorkoutLogs();
    const newLog: WorkoutLog = {
      ...log,
      id: `log-${Date.now()}`
    };
    logs.push(newLog);
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveToStorage(KEYS.WORKOUT_LOGS, logs);
    writeToFirestore('workout_logs', newLog.id, newLog);

    // Atualiza PRs e aplica Autopiloto de Sobrecarga Progressiva
    const exercises = db.getExercises();
    let updated = false;
    log.exercises.forEach(loggedEx => {
      const ex = exercises.find(e => e.name === loggedEx.name && e.workoutId === log.workoutId);
      if (ex) {
        let updatedEx = false;
        if (loggedEx.weight > ex.prWeight) {
          ex.prWeight = loggedEx.weight;
          updatedEx = true;
        }

        // Se RPE for fornecido e for menor ou igual a 7, aumenta a carga automaticamente
        if (loggedEx.rpe && loggedEx.rpe <= 7) {
          const increase = loggedEx.weight >= 60 ? 5 : 2; // +5kg se >= 60kg, senão +2kg
          const oldW = ex.prWeight || loggedEx.weight;
          ex.prWeight = oldW + increase;
          updatedEx = true;

          // Notifica a aplicação sobre o incremento automático
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('vs_progressive_overload_applied', {
              detail: { exerciseName: ex.name, oldWeight: oldW, newWeight: ex.prWeight }
            }));
          }, 150);
        }

        if (updatedEx) {
          updated = true;
          writeToFirestore('exercises', ex.id, ex);
        }
      }
    });

    if (updated) {
      saveToStorage(KEYS.EXERCISES, exercises);
    }

    // Recalcula conquistas
    db.checkAchievements();
  },
  deleteWorkoutLog: (id: string): void => {
    const logs = db.getWorkoutLogs().filter(l => l.id !== id);
    saveToStorage(KEYS.WORKOUT_LOGS, logs);
    removeFromFirestore('workout_logs', id);
  },

  // Corridas
  getRunLogs: (): RunLog[] => getFromStorage(KEYS.RUN_LOGS, []),
  addRunLog: (log: Omit<RunLog, 'id'>): void => {
    const logs = db.getRunLogs();
    const newLog: RunLog = {
      ...log,
      id: `run-${Date.now()}`
    };
    logs.push(newLog);
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    saveToStorage(KEYS.RUN_LOGS, logs);
    writeToFirestore('run_logs', newLog.id, newLog);

    // Recalcula conquistas
    db.checkAchievements();
  },
  deleteRunLog: (id: string): void => {
    const logs = db.getRunLogs().filter(l => l.id !== id);
    saveToStorage(KEYS.RUN_LOGS, logs);
    removeFromFirestore('run_logs', id);
  },

  // Composição Corporal
  getBodyCompLogs: (): BodyCompLog[] => getFromStorage(KEYS.BODY_COMP, []),
  addBodyCompLog: (log: Omit<BodyCompLog, 'id' | 'bmi' | 'leanMass'>): void => {
    const logs = db.getBodyCompLogs();
    const settings = db.getSettings();
    const heightInMeters = settings.height / 100;
    const bmi = heightInMeters > 0 ? Number((log.weight / (heightInMeters * heightInMeters)).toFixed(1)) : 0;
    const leanMass = Number((log.weight * (1 - log.bodyFat / 100)).toFixed(1));

    const newLog: BodyCompLog = {
      ...log,
      id: `bc-${Date.now()}`,
      bmi,
      leanMass,
    };
    logs.push(newLog);
    logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveToStorage(KEYS.BODY_COMP, logs);
    writeToFirestore('body_comp_logs', newLog.id, newLog);
  },
  deleteBodyCompLog: (id: string): void => {
    const logs = db.getBodyCompLogs().filter(l => l.id !== id);
    saveToStorage(KEYS.BODY_COMP, logs);
    removeFromFirestore('body_comp_logs', id);
  },
  updateBodyCompLog: (id: string, log: Omit<BodyCompLog, 'id' | 'bmi' | 'leanMass'>): void => {
    const logs = db.getBodyCompLogs();
    const index = logs.findIndex(l => l.id === id);
    if (index >= 0) {
      const settings = db.getSettings();
      const heightInMeters = settings.height / 100;
      const bmi = heightInMeters > 0 ? Number((log.weight / (heightInMeters * heightInMeters)).toFixed(1)) : 0;
      const leanMass = Number((log.weight * (1 - log.bodyFat / 100)).toFixed(1));

      const updatedLog: BodyCompLog = {
        ...log,
        id,
        bmi,
        leanMass
      };
      logs[index] = updatedLog;
      logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      saveToStorage(KEYS.BODY_COMP, logs);
      writeToFirestore('body_comp_logs', id, updatedLog);
    }
  },

  // Calendário de Corridas Inscritas
  getRaces: (): RaceRegistration[] => getFromStorage(KEYS.RACES, []),
  saveRace: (race: RaceRegistration): void => {
    const races = db.getRaces();
    const index = races.findIndex(r => r.id === race.id);
    if (index >= 0) {
      races[index] = race;
    } else {
      races.push(race);
    }
    saveToStorage(KEYS.RACES, races);
    writeToFirestore('races', race.id, race);
  },
  toggleRaceRegistration: (id: string): void => {
    const races = db.getRaces();
    const race = races.find(r => r.id === id);
    if (race) {
      race.isRegistered = !race.isRegistered;
      saveToStorage(KEYS.RACES, races);
      writeToFirestore('races', race.id, race);
    }
  },
  deleteRace: (id: string): void => {
    const races = db.getRaces().filter(r => r.id !== id);
    saveToStorage(KEYS.RACES, races);
    removeFromFirestore('races', id);
  },

  // Receitas
  getRecipes: (): Recipe[] => {
    const recipes = getFromStorage<Recipe[]>(KEYS.RECIPES, INITIAL_RECIPES);
    return recipes.map(rec => ({
      ...rec,
      image: rec.image || memoryImagesCache[rec.id] || ''
    }));
  },
  saveRecipe: (recipe: Recipe): void => {
    const recipes = db.getRecipes();

    // Preserva a imagem se o formulário enviou vazio por limitação local, mas temos na memória
    const imageToSave = recipe.image || memoryImagesCache[recipe.id] || '';
    const fullRecipe = { ...recipe, image: imageToSave };

    if (imageToSave) {
      memoryImagesCache[recipe.id] = imageToSave;
    }

    const index = recipes.findIndex(r => r.id === recipe.id);
    if (index >= 0) {
      recipes[index] = fullRecipe;
    } else {
      recipes.push(fullRecipe);
    }

    // 1. Sempre tenta salvar no banco de dados remoto (Firestore) com todos os dados, incluindo a imagem
    writeToFirestore('recipes', recipe.id, fullRecipe);

    try {
      // 2. Tenta salvar localmente no localStorage (com imagem)
      saveToStorage(KEYS.RECIPES, recipes);
    } catch (error) {
      // 3. Fallback: Se falhar localmente (geralmente por tamanho/limite de cota),
      // salvamos na base local sem a imagem para o app continuar funcionando,
      // mas mantemos o registro do Firestore intacto com a imagem.
      console.warn("Estouro de cota local ao salvar receita. Removendo imagem da persistência local...", error);

      const cleanRecipe = { ...recipe, image: '' };
      const recipesWithoutImages = recipes.map(r => ({
        ...r,
        image: r.id === recipe.id ? '' : (r.image || '')
      }));

      if (index >= 0) {
        recipesWithoutImages[index] = cleanRecipe;
      } else {
        recipesWithoutImages[recipesWithoutImages.length - 1] = cleanRecipe;
      }

      try {
        saveToStorage(KEYS.RECIPES, recipesWithoutImages);
      } catch (retryError) {
        console.error("Erro ao salvar receita localmente mesmo sem imagem:", retryError);
      }
    }
  },
  deleteRecipe: (id: string): void => {
    const recipes = db.getRecipes().filter(r => r.id !== id);
    saveToStorage(KEYS.RECIPES, recipes);
    removeFromFirestore('recipes', id);
  },

  // Planejador de Refeições
  getMealPlans: (): MealPlan[] => getFromStorage(KEYS.MEAL_PLANS, []),
  saveMealPlan: (plan: MealPlan): void => {
    const plans = db.getMealPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    saveToStorage(KEYS.MEAL_PLANS, plans);
    writeToFirestore('meal_plans', plan.id, plan);
  },
  deleteMealPlan: (id: string): void => {
    const plans = db.getMealPlans().filter(p => p.id !== id);
    saveToStorage(KEYS.MEAL_PLANS, plans);
    removeFromFirestore('meal_plans', id);
  },

  // Diário de Alimentos Consumidos
  getFoodLogs: (): FoodLog[] => getFromStorage(KEYS.FOOD_LOGS, []),
  saveFoodLog: (log: FoodLog): void => {
    const logs = db.getFoodLogs();
    const index = logs.findIndex(l => l.id === log.id);
    if (index >= 0) {
      logs[index] = log;
    } else {
      logs.push(log);
    }
    saveToStorage(KEYS.FOOD_LOGS, logs);
    writeToFirestore('food_logs', log.id, log);
  },
  deleteFoodLog: (id: string): void => {
    const logs = db.getFoodLogs().filter(l => l.id !== id);
    saveToStorage(KEYS.FOOD_LOGS, logs);
    removeFromFirestore('food_logs', id);
  },

  // Planilha de Corrida IA
  getRunningPlan: (): RunningPlan | null => {
    const plans = getFromStorage<RunningPlan[]>(KEYS.RUNNING_PLAN, []);
    if (plans.length === 0) return null;
    // Ordena decrescente pelo createdAt para garantir que o mais recente seja sempre retornado
    const sorted = [...plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted[0];
  },
  saveRunningPlan: (plan: RunningPlan): void => {
    saveToStorage(KEYS.RUNNING_PLAN, [plan]);
    // Salva com ID fixo 'active' no Firestore para sobrescrever o plano anterior e evitar acumular lixo
    writeToFirestore('running_plans', 'active', plan);
  },
  deleteRunningPlan: (): void => {
    saveToStorage(KEYS.RUNNING_PLAN, []);
    removeFromFirestore('running_plans', 'active');
  },

  // Conquistas (Achievements)
  getAchievements: (): Achievement[] => getFromStorage(KEYS.ACHIEVEMENTS, INITIAL_ACHIEVEMENTS),
  saveAchievement: (ach: Achievement): void => {
    const achs = db.getAchievements();
    const index = achs.findIndex(a => a.id === ach.id);
    if (index >= 0) {
      achs[index] = ach;
    } else {
      achs.push(ach);
    }
    saveToStorage(KEYS.ACHIEVEMENTS, achs);
    writeToFirestore('achievements', ach.id, ach);
  },
  checkAchievements: (): void => {
    const workouts = db.getWorkoutLogs();
    const runs = db.getRunLogs();
    const exercises = db.getExercises();

    // Calcular sequência atual (streak) de dias ativos
    const dates = new Set<string>();
    workouts.forEach(l => dates.add(l.date));
    runs.forEach(l => dates.add(l.date));

    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hasActivityRecently = dates.has(todayStr) || dates.has(yesterdayStr);
    if (hasActivityRecently) {
      let checkDate = new Date();
      if (!dates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dates.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calcular maior peso (PR)
    const maxPR = exercises.length > 0 ? Math.max(...exercises.map(e => e.prWeight || 0)) : 0;

    // Calcular melhor pace (menor valor numérico)
    let bestPace = 999999;
    runs.forEach(r => {
      if (r.pace > 0 && r.pace < bestPace) {
        bestPace = r.pace;
      }
    });

    const achs = db.getAchievements();
    let updatedAny = false;

    const newAchs = achs.map(ach => {
      let progress = ach.progress;
      let unlockedAt = ach.unlockedAt;

      if (ach.type === 'workout_count') {
        progress = workouts.length;
      } else if (ach.type === 'run_count') {
        progress = runs.length;
      } else if (ach.type === 'streak') {
        progress = currentStreak;
      } else if (ach.type === 'max_pr') {
        progress = maxPR;
      } else if (ach.type === 'pace') {
        progress = bestPace === 999999 ? 0 : Number(bestPace.toFixed(2));
      }

      // Verifica se completou
      const isCompleted = ach.type === 'pace'
        ? (progress > 0 && progress < ach.target)
        : progress >= ach.target;

      if (isCompleted && !unlockedAt) {
        unlockedAt = new Date().toISOString().split('T')[0];
        updatedAny = true;

        // Dispara evento customizado
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('vs_achievement_unlocked', { detail: { ...ach, unlockedAt } }));
        }, 150);
      }

      return {
        ...ach,
        progress,
        unlockedAt
      };
    });

    if (updatedAny || JSON.stringify(achs) !== JSON.stringify(newAchs)) {
      saveToStorage(KEYS.ACHIEVEMENTS, newAchs);
      newAchs.forEach(ach => {
        writeToFirestore('achievements', ach.id, ach);
      });
    }
  }
};
