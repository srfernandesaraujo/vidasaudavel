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
}

export interface Workout {
  id: string;
  name: string;
  isTemplate: boolean;
}

export interface WorkoutLogExercise {
  name: string;
  muscleGroup: string;
  series: number;
  repetitions: string;
  weight: number;
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

export interface UserSettings {
  userName: string;
  height: number;
  age: number;
  restingHeartRate: number;
  apiKey: string;
  apiProvider: 'gemini' | 'openai' | 'none';
}

const KEYS = {
  WORKOUTS: 'vs_workouts',
  EXERCISES: 'vs_exercises',
  WORKOUT_LOGS: 'vs_workout_logs',
  RUN_LOGS: 'vs_run_logs',
  BODY_COMP: 'vs_body_comp',
  RACES: 'vs_races',
  SETTINGS: 'vs_settings',
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
};

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
  localStorage.setItem(key, JSON.stringify(data));
  // Dispara evento global para re-renderizar componentes
  window.dispatchEvent(new Event('vs_database_update'));
}

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
  ];

  collectionsToSync.forEach(({ subpath, key, defaultVal }) => {
    const colRef = collection(firestore!, 'users', uid, subpath);
    const unsub = onSnapshot(colRef, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data());
      });
      // Se Firestore estiver vazio para treinos/exercícios, não sobrescreve com array vazio na primeira carga
      if (data.length > 0) {
        saveToStorage(key, data);
      } else if (snapshot.metadata.fromCache === false && (key === KEYS.WORKOUTS || key === KEYS.EXERCISES)) {
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
  getExercises: (): Exercise[] => getFromStorage(KEYS.EXERCISES, INITIAL_EXERCISES),
  saveExercise: (exercise: Exercise): void => {
    const exercises = db.getExercises();
    const index = exercises.findIndex(e => e.id === exercise.id);
    if (index >= 0) {
      exercises[index] = exercise;
    } else {
      exercises.push(exercise);
    }
    saveToStorage(KEYS.EXERCISES, exercises);
    writeToFirestore('exercises', exercise.id, exercise);
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

    // Atualiza PRs
    const exercises = db.getExercises();
    let updated = false;
    log.exercises.forEach(loggedEx => {
      const ex = exercises.find(e => e.name === loggedEx.name && e.workoutId === log.workoutId);
      if (ex && loggedEx.weight > ex.prWeight) {
        ex.prWeight = loggedEx.weight;
        updated = true;
        writeToFirestore('exercises', ex.id, ex);
      }
    });
    if (updated) {
      saveToStorage(KEYS.EXERCISES, exercises);
    }
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
  }
};
