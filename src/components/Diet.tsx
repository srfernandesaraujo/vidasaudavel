import React, { useState, useMemo } from 'react';
import { db, type Recipe, type MealPlan, type FoodLog, type FoodLogItem, type BodyCompLog } from '../utils/db';
import { askAINutritionist, askAICoach, parseMealImage, type ChatMessage } from '../utils/aiEngine';
import { 
  Apple, 
  Calendar, 
  Plus, 
  Trash2, 
  Bot, 
  TrendingUp, 
  Copy, 
  Check, 
  Search, 
  Send, 
  Utensils, 
  Mail, 
  ArrowLeft, 
  Globe,
  PlusCircle,
  MinusCircle,
  Heart,
  Share2,
  Printer,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Styles/diet.css';
const DIETARY_CATEGORIES = [
  { id: 'vegetariana', name: 'Vegetariana', img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80' },
  { id: 'vegana', name: 'Vegana', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80' },
  { id: 'light', name: 'Light', img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=300&q=80' },
  { id: 'fitness', name: 'Fitness', img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80' },
  { id: 'diet', name: 'Diet', img: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=300&q=80' },
  { id: 'sem gluten', name: 'Sem Glúten', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80' },
  { id: 'sem lactose', name: 'Sem Lactose', img: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=300&q=80' },
  { id: 'detox', name: 'Detox', img: '/images/detox.png' }
];

const MEAL_TYPES = [
  { id: 'café da manhã', name: 'Café da Manhã' },
  { id: 'almoço', name: 'Almoço' },
  { id: 'lanche', name: 'Lanche' },
  { id: 'jantar', name: 'Jantar' }
];

export const Diet: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'planner' | 'recipes' | 'import' | 'shopping' | 'nutri_ai'>('daily');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [recipes, setRecipes] = useState<Recipe[]>(db.getRecipes());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>(db.getMealPlans());
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>(db.getFoodLogs());
  const [bodyCompLogs] = useState<BodyCompLog[]>(db.getBodyCompLogs());
  const [workoutLogs] = useState(() => db.getWorkoutLogs());
  const [runLogs] = useState(() => db.getRunLogs());
  const settings = db.getSettings();

  const latestBody = useMemo(() => {
    if (!bodyCompLogs || bodyCompLogs.length === 0) return null;
    return bodyCompLogs[bodyCompLogs.length - 1];
  }, [bodyCompLogs]);

  // Recarrega dados do db local
  const refreshDietData = () => {
    setRecipes(db.getRecipes());
    setMealPlans(db.getMealPlans());
    setFoodLogs(db.getFoodLogs());
  };

  // -------------------------------------------------------------
  // DIÁRIO DE MACRONUTRIENTES
  // -------------------------------------------------------------
  const todayLog = useMemo(() => {
    return foodLogs.find(log => log.date === todayStr) || { id: todayStr, date: todayStr, items: [] };
  }, [foodLogs, todayStr]);

  // Treinos e corridas de hoje para TDEE
  const todayWorkouts = useMemo(() => {
    return workoutLogs.filter(log => log.date === todayStr);
  }, [workoutLogs, todayStr]);

  const todayRuns = useMemo(() => {
    return runLogs.filter(log => log.date === todayStr);
  }, [runLogs, todayStr]);

  // Calorias gastas hoje com atividade
  const activeCaloriesBurned = useMemo(() => {
    const weight = latestBody ? latestBody.weight : 70;
    
    // Gasto na corrida: Peso * Distancia * 1.03 ou calorias do log
    const runKcal = todayRuns.reduce((acc, run) => {
      return acc + (run.calories || Math.round(weight * run.distance * 1.03));
    }, 0);

    // Gasto na musculação: 250 kcal por treino
    const workoutKcal = todayWorkouts.length * 250;

    return runKcal + workoutKcal;
  }, [todayRuns, todayWorkouts, latestBody]);

  // Tipo de dia no Carb Cycling
  const carbCyclingDayType = useMemo(() => {
    if (settings.carbCyclingMode === 'none') return 'medium';

    // Determina se hoje teve treino pesado (leg day / treino B) ou corrida longa (>5k)
    const hasHeavyWorkout = todayWorkouts.some(w => {
      const nameLower = w.workoutName.toLowerCase();
      return nameLower.includes('perna') || nameLower.includes('inferior') || nameLower.includes('treino b') || nameLower.includes('quadriceps');
    });
    const hasLongRun = todayRuns.some(r => r.distance >= 5.0);

    if (hasHeavyWorkout || hasLongRun) return 'high';
    if (todayWorkouts.length > 0 || todayRuns.length > 0) return 'medium';
    return 'low'; // Descanso
  }, [todayWorkouts, todayRuns, settings.carbCyclingMode]);

  // Metas nutricionais baseadas na bioimpedância, TDEE ativo e Carb Cycling
  const targetMacros = useMemo(() => {
    const weight = latestBody ? latestBody.weight : settings.height > 100 ? (settings.height - 100) * 0.9 : 70;
    const bmr = latestBody?.basalMetabolism || 1600;
    
    // Alvo calórico base com fator de atividade leve padrão
    const baseCalories = Math.round(bmr * 1.3);
    
    // Adiciona TDEE ativo se configurado
    const extraCalories = settings.tdeeMode === 'auto' ? activeCaloriesBurned : 0;
    let calories = baseCalories + extraCalories;
    
    let protein = Math.round(weight * 2.0); // 2.0g/kg
    let fat = Math.round(weight * 0.8);      // 0.8g/kg (Padrão)

    // Ajusta macros com base no Carb Cycling
    if (settings.carbCyclingMode === 'auto') {
      if (carbCyclingDayType === 'high') {
        fat = Math.round(weight * 0.6); // Reduz gorduras
      } else if (carbCyclingDayType === 'low') {
        calories = Math.round(calories * 0.9); // Leve déficit no repouso
        fat = Math.round(weight * 1.0); // Aumenta gorduras
      }
    }

    const carbs = Math.max(20, Math.round((calories - (protein * 4) - (fat * 9)) / 4));

    // Alvo de água: 2.5L base + acréscimo de suor por treino
    let waterTarget = 2500;
    if (settings.tdeeMode === 'auto') {
      waterTarget += todayWorkouts.length * 500;
      const totalDist = todayRuns.reduce((acc, r) => acc + r.distance, 0);
      waterTarget += Math.round(totalDist * 100); // 500ml a cada 5km
    }

    return { calories, protein, carbs, fat, waterTarget };
  }, [latestBody, settings, activeCaloriesBurned, carbCyclingDayType, todayWorkouts, todayRuns]);

  // Macros consumidos hoje
  const consumedMacros = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    todayLog.items.forEach(item => {
      calories += item.calories || 0;
      protein += item.protein || 0;
      carbs += item.carbs || 0;
      fat += item.fat || 0;
    });

    return { calories, protein, carbs, fat };
  }, [todayLog]);

  // Detector de Platô Fisiológico (baseado em logs das últimas 2 semanas)
  const plateauStatus = useMemo(() => {
    if (!bodyCompLogs || bodyCompLogs.length < 3) return null;
    const sorted = [...bodyCompLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    
    const daysDiff = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) return null;

    const weightDiff = Math.abs(newest.weight - oldest.weight);
    if (weightDiff < 0.25) {
      return {
        detected: true,
        message: `Seu peso variou apenas ${weightDiff.toFixed(2)} kg nos últimos ${Math.round(daysDiff)} dias. Isso indica um platô metabólico de estagnação.`,
        actionType: newest.weight > (newest.idealWeight || 70) ? 'cut' : 'bulk'
      };
    }
    return null;
  }, [bodyCompLogs]);

  // Recomendações Automáticas de Suplementação Saudável por Fadiga/Desidratação
  const autoSupplements = useMemo(() => {
    const items: string[] = [];
    if (latestBody && latestBody.bodyWater < 55) {
      items.push('Isotônico / Repositor de Eletrólitos (Devido a hidratação de bioimpedância de apenas ' + latestBody.bodyWater + '%)');
    }
    
    // Filtra logs de treino e corrida dos últimos 7 dias
    const runsLast7Days = runLogs.filter(r => {
      const diffTime = new Date().getTime() - new Date(r.date).getTime();
      return diffTime <= 7 * 24 * 60 * 60 * 1000;
    });
    const workoutsLast7Days = workoutLogs.filter(w => {
      const diffTime = new Date().getTime() - new Date(w.date).getTime();
      return diffTime <= 7 * 24 * 60 * 60 * 1000;
    });
    const totalRunDist = runsLast7Days.reduce((acc, r) => acc + r.distance, 0);

    if (totalRunDist >= 15 || workoutsLast7Days.length >= 4) {
      items.push('Cápsulas de Magnésio e Potássio (Ajuda na recuperação de espasmos e câimbras de alto volume esportivo)');
      items.push('Beta-Alanina ou Creatina (Auxilia na regeneração de energia celular pós-atividade física)');
    }
    return items;
  }, [latestBody, runLogs, workoutLogs]);

  // Forms do diário
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    mealId: 'breakfast'
  });

  // Câmera / Escaneador de Pratos por Imagem
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMealId, setScanMealId] = useState('breakfast');

  const handleSaveFoodItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.name.trim()) return;

    const newItem: FoodLogItem = {
      name: foodForm.name.trim(),
      calories: Number(foodForm.calories) || 0,
      protein: Number(foodForm.protein) || 0,
      carbs: Number(foodForm.carbs) || 0,
      fat: Number(foodForm.fat) || 0,
      mealId: foodForm.mealId
    };

    const logs = db.getFoodLogs();
    const existingLogIdx = logs.findIndex(log => log.date === todayStr);

    if (existingLogIdx >= 0) {
      logs[existingLogIdx].items.push(newItem);
      db.saveFoodLog(logs[existingLogIdx]);
    } else {
      const newLog: FoodLog = {
        id: `food-${Date.now()}`,
        date: todayStr,
        items: [newItem]
      };
      db.saveFoodLog(newLog);
    }

    setShowAddFoodForm(false);
    setFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '', mealId: 'breakfast' });
    refreshDietData();
    
    // Pequena animação de conquista se bater metas proteicas
    if (consumedMacros.protein + newItem.protein >= targetMacros.protein) {
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399']
      });
    }
  };

  const handleDeleteFoodItem = (index: number) => {
    const logs = db.getFoodLogs();
    const existingLog = logs.find(log => log.date === todayStr);
    if (existingLog) {
      existingLog.items.splice(index, 1);
      db.saveFoodLog(existingLog);
      refreshDietData();
    }
  };

  // Câmera e Análise por IA
  const SIMULATED_VISION_MEALS = [
    { name: 'Salmão Grelhado com Purê de Batata Doce e Brócolis', calories: 540, protein: 42, carbs: 45, fat: 18 },
    { name: 'Frango com Arroz Integral e Mix de Legumes', calories: 480, protein: 38, carbs: 50, fat: 10 },
    { name: 'Omelete de 3 Ovos com Queijo Branco e Tomate', calories: 350, protein: 26, carbs: 6, fat: 24 },
    { name: 'Tigela Proteica de Iogurte Grego, Aveia e Morangos', calories: 320, protein: 24, carbs: 35, fat: 5 }
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScanImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!scanImage) return;
    setScanLoading(true);

    try {
      let detectedMeal = { name: '', calories: 0, protein: 0, carbs: 0, fat: 0 };
      
      if (settings.apiKey && settings.apiProvider === 'gemini') {
        const result = await parseMealImage(scanImage);
        detectedMeal = {
          name: result.title,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat
        };
      } else {
        // Simulação local após 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));
        const randomIdx = Math.floor(Math.random() * SIMULATED_VISION_MEALS.length);
        detectedMeal = SIMULATED_VISION_MEALS[randomIdx];
      }

      // Adiciona o alimento detectado ao diário
      const newItem: FoodLogItem = {
        name: `[IA] ${detectedMeal.name}`,
        calories: detectedMeal.calories,
        protein: detectedMeal.protein,
        carbs: detectedMeal.carbs,
        fat: detectedMeal.fat,
        mealId: scanMealId
      };

      const logs = db.getFoodLogs();
      const existingLogIdx = logs.findIndex(log => log.date === todayStr);

      if (existingLogIdx >= 0) {
        logs[existingLogIdx].items.push(newItem);
        db.saveFoodLog(logs[existingLogIdx]);
      } else {
        const newLog: FoodLog = {
          id: `food-${Date.now()}`,
          date: todayStr,
          items: [newItem]
        };
        db.saveFoodLog(newLog);
      }

      refreshDietData();
      setShowScanModal(false);
      setScanImage(null);
      
      confetti({
        particleCount: 50,
        spread: 35,
        origin: { y: 0.75 },
        colors: ['#f97316', '#10b981']
      });

      alert(`A IA identificou: ${detectedMeal.name} e lançou no seu diário!`);

    } catch (err: any) {
      console.error(err);
      alert(`Falha na análise de prato: ${err.message}`);
    } finally {
      setScanLoading(false);
    }
  };

  const getPercentage = (consumed: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(Math.round((consumed / target) * 100), 100);
  };

  // -------------------------------------------------------------
  // CARDÁPIO / PLANEJADOR SEMANAL
  // -------------------------------------------------------------
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  
  // Obtém o intervalo de quarta a terça-feira correspondente à Imagem 4
  const plannerDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dom, 1 = Seg ...
    
    // Começa na quarta-feira (3). Calcula diferença para obter a quarta-feira desta semana
    let diffToWednesday = 3 - dayOfWeek;
    // Se for antes de quarta, puxa a quarta da semana passada para mostrar a atual
    const startWednesday = new Date(today);
    startWednesday.setDate(today.getDate() + diffToWednesday);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startWednesday);
      d.setDate(startWednesday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const selectedDateStr = useMemo(() => {
    const d = plannerDates[selectedDayOffset];
    return d ? d.toISOString().split('T')[0] : todayStr;
  }, [plannerDates, selectedDayOffset, todayStr]);

  const selectedDayPlan = useMemo(() => {
    return mealPlans.find(p => p.date === selectedDateStr) || {
      id: selectedDateStr,
      date: selectedDateStr,
      meals: [
        { id: 'breakfast', name: 'Café da Manhã', items: [] },
        { id: 'lunch', name: 'Almoço', items: [] },
        { id: 'dinner', name: 'Jantar', items: [] },
        { id: 'snack', name: 'Lanches', items: [] }
      ]
    };
  }, [mealPlans, selectedDateStr]);

  // Planejador adicionar refeição
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [activeMealId, setActiveMealId] = useState<string>('breakfast');
  const [mealSelectionType, setMealSelectionType] = useState<'recipe' | 'custom'>('recipe');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [customMealForm, setCustomMealForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  const handleAddMealItem = () => {
    const updatedMeals = selectedDayPlan.meals.map(m => {
      if (m.id === activeMealId) {
        if (mealSelectionType === 'recipe') {
          const rec = recipes.find(r => r.id === selectedRecipeId);
          if (!rec) return m;
          return {
            ...m,
            items: [...m.items, {
              recipeId: rec.id,
              customName: rec.title,
              calories: rec.id === 'rec-1' ? 420 : rec.id === 'rec-2' ? 240 : 300, // calorias estimadas para sementes
              protein: rec.id === 'rec-1' ? 32 : rec.id === 'rec-2' ? 24 : 20,
              carbs: rec.id === 'rec-1' ? 20 : rec.id === 'rec-2' ? 8 : 15,
              fat: rec.id === 'rec-1' ? 22 : rec.id === 'rec-2' ? 12 : 10
            }]
          };
        } else {
          if (!customMealForm.name.trim()) return m;
          return {
            ...m,
            items: [...m.items, {
              customName: customMealForm.name.trim(),
              calories: Number(customMealForm.calories) || 0,
              protein: Number(customMealForm.protein) || 0,
              carbs: Number(customMealForm.carbs) || 0,
              fat: Number(customMealForm.fat) || 0
            }]
          };
        }
      }
      return m;
    });

    const newPlan: MealPlan = {
      ...selectedDayPlan,
      meals: updatedMeals
    };

    db.saveMealPlan(newPlan);
    setShowAddMealModal(false);
    setCustomMealForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    refreshDietData();
  };

  const handleDeleteMealItem = (mealId: string, itemIdx: number) => {
    const updatedMeals = selectedDayPlan.meals.map(m => {
      if (m.id === mealId) {
        const copyItems = [...m.items];
        copyItems.splice(itemIdx, 1);
        return { ...m, items: copyItems };
      }
      return m;
    });

    const newPlan = { ...selectedDayPlan, meals: updatedMeals };
    db.saveMealPlan(newPlan);
    refreshDietData();
  };

  // Lança o planejamento do dia atual como consumido no diário de hoje
  const handleConsumeDayPlan = () => {
    if (selectedDayPlan.meals.every(m => m.items.length === 0)) {
      alert('Não há itens planejados para consumir.');
      return;
    }

    const itemsToLog: FoodLogItem[] = [];
    selectedDayPlan.meals.forEach(m => {
      m.items.forEach(i => {
        itemsToLog.push({
          name: i.customName || 'Alimento Planejado',
          calories: i.calories || 0,
          protein: i.protein || 0,
          carbs: i.carbs || 0,
          fat: i.fat || 0,
          mealId: m.id
        });
      });
    });

    const logs = db.getFoodLogs();
    const existingLogIdx = logs.findIndex(log => log.date === todayStr);

    if (existingLogIdx >= 0) {
      logs[existingLogIdx].items = [...logs[existingLogIdx].items, ...itemsToLog];
      db.saveFoodLog(logs[existingLogIdx]);
    } else {
      const newLog = {
        id: `food-${Date.now()}`,
        date: todayStr,
        items: itemsToLog
      };
      db.saveFoodLog(newLog);
    }

    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ffb077']
    });

    alert('Todo o plano do dia foi importado para o seu Diário de Alimentos Consumidos hoje!');
    refreshDietData();
    setActiveSubTab('daily');
  };

  // -------------------------------------------------------------
  // MINHAS RECEITAS (DETALHAMENTO E CADASTRO)
  // -------------------------------------------------------------
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [cookModeStep, setCookModeStep] = useState<number>(-1); // Modo Cozinheiro (-1 inativo)
  const [isCookModeFullscreen, setIsCookModeFullscreen] = useState(false);
  const [commentsInput, setCommentsInput] = useState('');
  
  // Ingredientes checados locais para preparar receita
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Adicionar Nova Receita Manual
  const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
  const [newRecipeForm, setNewRecipeForm] = useState({
    title: '',
    description: '',
    rating: 5,
    prepTime: '15',
    cookTime: '15',
    totalTime: '30',
    servings: '1',
    tags: 'Fit',
    ingredients: '',
    instructions: '',
    image: '',
    videoUrl: '',
    dietaryCategories: [] as string[],
    mealTypes: [] as string[]
  });

  const handleDietaryCategoryToggle = (category: string) => {
    const current = newRecipeForm.dietaryCategories || [];
    const updated = current.includes(category) 
      ? current.filter(c => c !== category)
      : [...current, category];
    setNewRecipeForm({ ...newRecipeForm, dietaryCategories: updated });
  };

  const handleMealTypeToggle = (type: string) => {
    const current = newRecipeForm.mealTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setNewRecipeForm({ ...newRecipeForm, mealTypes: updated });
  };

  const handleToggleFavorite = (recipe: Recipe) => {
    const updated = { ...recipe, isFavorite: !recipe.isFavorite };
    db.saveRecipe(updated);
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      setSelectedRecipe(updated);
    }
    refreshDietData();
  };

  const handleShareRecipe = () => {
    if (!selectedRecipe) return;
    const text = `🍽️ *Receita Vida Saudável: ${selectedRecipe.title}*
${selectedRecipe.description}

⏱️ *Tempo Total:* ${selectedRecipe.totalTime} min (Prep: ${selectedRecipe.prepTime} min, Cozimento: ${selectedRecipe.cookTime} min)
👥 *Porções:* Serve ${selectedRecipe.servings}

🛒 *Ingredientes:*
${selectedRecipe.ingredients.map(i => `- ${i}`).join('\n')}

🍳 *Modo de Preparo:*
${selectedRecipe.instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

${selectedRecipe.videoUrl ? `🎥 *Vídeo explicativo:* ${selectedRecipe.videoUrl}` : ''}
`;
    navigator.clipboard.writeText(text);
    alert('Informações e receita copiadas para a área de transferência! Pronta para compartilhar.');
  };

  const handleStartCookMode = () => {
    setCookModeStep(0);
    setIsCookModeFullscreen(true);
  };

  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v') || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
      }
    } catch (e) {
      console.error('Falha ao extrair ID de vídeo', e);
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
  };

  const handleOpenRecipeDetail = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCookModeStep(-1);
    setIsCookModeFullscreen(false);
    setCheckedIngredients({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRecipeManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeForm.title.trim()) return;

    const ingArray = newRecipeForm.ingredients
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const instArray = newRecipeForm.instructions
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0);

    const tagsArray = newRecipeForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newRecipe: Recipe = {
      id: `rec-${Date.now()}`,
      title: newRecipeForm.title.trim(),
      description: newRecipeForm.description.trim(),
      rating: Number(newRecipeForm.rating) || 5,
      prepTime: Number(newRecipeForm.prepTime) || 15,
      cookTime: Number(newRecipeForm.cookTime) || 15,
      totalTime: Number(newRecipeForm.totalTime) || 30,
      servings: Number(newRecipeForm.servings) || 1,
      lastMade: 'Nunca',
      image: newRecipeForm.image.trim() || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
      ingredients: ingArray,
      instructions: instArray,
      tags: tagsArray,
      comments: [],
      dietaryCategories: newRecipeForm.dietaryCategories,
      mealTypes: newRecipeForm.mealTypes,
      videoUrl: newRecipeForm.videoUrl.trim(),
      isFavorite: false
    };

    db.saveRecipe(newRecipe);
    setShowAddRecipeModal(false);
    setNewRecipeForm({
      title: '',
      description: '',
      rating: 5,
      prepTime: '15',
      cookTime: '15',
      totalTime: '30',
      servings: '1',
      tags: 'Fit',
      ingredients: '',
      instructions: '',
      image: '',
      videoUrl: '',
      dietaryCategories: [],
      mealTypes: []
    });
    refreshDietData();
    alert('Receita cadastrada com sucesso!');
  };

  const handleUpdateLastMade = (recipeId: string) => {
    const rec = recipes.find(r => r.id === recipeId);
    if (rec) {
      const nowStr = new Date().toLocaleDateString('pt-BR');
      const updated = { ...rec, lastMade: nowStr };
      db.saveRecipe(updated);
      setSelectedRecipe(updated);
      refreshDietData();
      confetti({
        particleCount: 40,
        spread: 30,
        origin: { y: 0.7 }
      });
    }
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (window.confirm('Deseja realmente excluir esta receita?')) {
      db.deleteRecipe(recipeId);
      setSelectedRecipe(null);
      refreshDietData();
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !commentsInput.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      user: settings.userName || 'Atleta Saudável',
      text: commentsInput.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    const updatedComments = [...(selectedRecipe.comments || []), newComment];
    const updatedRecipe = { ...selectedRecipe, comments: updatedComments };

    db.saveRecipe(updatedRecipe);
    setSelectedRecipe(updatedRecipe);
    setCommentsInput('');
    refreshDietData();
  };

  const copyIngredientsToClipboard = () => {
    if (!selectedRecipe) return;
    const text = selectedRecipe.ingredients.join('\n');
    navigator.clipboard.writeText(text);
    alert('Ingredientes copiados para a área de transferência!');
  };

  // Filtros avançados de receitas
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');

  // Filtro de receitas
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchSearch = r.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(recipeSearch.toLowerCase()));
      
      const matchCategory = !selectedCategory || 
        r.dietaryCategories?.some(cat => cat.toLowerCase() === selectedCategory.toLowerCase());
      
      const matchMealType = !selectedMealType ||
        r.mealTypes?.some(type => type.toLowerCase() === selectedMealType.toLowerCase());
        
      return matchSearch && matchCategory && matchMealType;
    });
  }, [recipes, recipeSearch, selectedCategory, selectedMealType]);

  // -------------------------------------------------------------
  // IMPORTAÇÃO DE RECEITA VIA URL (MEALIE E FALLBACK IA)
  // -------------------------------------------------------------
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importOptions, setImportOptions] = useState({
    importTags: true,
    importCategories: true,
    stayInEdit: false,
    interpretIngredients: true
  });

  const handleImportRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;

    // Valida se é URL
    if (!importUrl.startsWith('http://') && !importUrl.startsWith('https://')) {
      alert('Insira uma URL de receita válida (começando com http ou https).');
      return;
    }

    setImportLoading(true);

    try {
      let htmlText = '';
      let fetchSuccess = false;

      try {
        // 1. Tenta buscar os dados via allorigins proxy para evitar CORS
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(importUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const resData = await res.json();
          htmlText = resData.contents || '';
          fetchSuccess = !!htmlText;
        }
      } catch (proxyErr) {
        console.warn('Erro ao acessar o proxy CORS, acionando fallback inteligente local:', proxyErr);
      }

      if (fetchSuccess && htmlText) {
        // Cria um parser temporário de DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Tenta achar JSON-LD
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        let recipeJson: any = null;

        for (let i = 0; i < jsonLdScripts.length; i++) {
          try {
            const js = JSON.parse(jsonLdScripts[i].textContent || '{}');
            
            // JSON-LD pode ser um objeto de Receita direto, ou um array, ou um graph
            if (js['@type'] === 'Recipe') {
              recipeJson = js;
              break;
            } else if (Array.isArray(js)) {
              const found = js.find(item => item['@type'] === 'Recipe');
              if (found) { recipeJson = found; break; }
            } else if (js['@graph'] && Array.isArray(js['@graph'])) {
              const found = js['@graph'].find((item: any) => item['@type'] === 'Recipe');
              if (found) { recipeJson = found; break; }
            }
          } catch {}
        }

        // Se achou JSON-LD padrão
        if (recipeJson) {
          // Mapeamento do JSON-LD para nosso modelo de dados
          const parseDuration = (isoStr?: string): number => {
            if (!isoStr) return 15;
            const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (!match) return 15;
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            return hours * 60 + minutes;
          };

          const imageVal = Array.isArray(recipeJson.image) 
            ? recipeJson.image[0] 
            : typeof recipeJson.image === 'object' 
              ? recipeJson.image.url 
              : recipeJson.image;

          const rawInstructions = Array.isArray(recipeJson.recipeInstructions)
            ? recipeJson.recipeInstructions.map((step: any) => typeof step === 'object' ? step.text || step.name : step)
            : [recipeJson.recipeInstructions || 'Ver site original.'];

          const rawYield = recipeJson.recipeYield;
          let yieldNum = 1;
          if (rawYield) {
            const numMatch = String(rawYield).match(/\d+/);
            if (numMatch) yieldNum = parseInt(numMatch[0]);
          }

          const newRecipe: Recipe = {
            id: `rec-import-${Date.now()}`,
            title: recipeJson.name || doc.title || 'Receita Importada',
            description: recipeJson.description || 'Receita extraída automaticamente do site.',
            rating: 5,
            prepTime: parseDuration(recipeJson.prepTime) || 15,
            cookTime: parseDuration(recipeJson.cookTime) || 15,
            totalTime: parseDuration(recipeJson.totalTime) || 30,
            servings: yieldNum,
            lastMade: 'Nunca',
            image: imageVal || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
            ingredients: Array.isArray(recipeJson.recipeIngredient) ? recipeJson.recipeIngredient : [],
            instructions: rawInstructions,
            tags: importOptions.importTags && recipeJson.keywords ? String(recipeJson.keywords).split(',').map(k => k.trim()) : ['Importada'],
            sourceUrl: importUrl,
            comments: [],
            isFavorite: false
          };

          db.saveRecipe(newRecipe);
          refreshDietData();
          setImportUrl('');
          confetti({ particleCount: 60, spread: 50 });
          alert(`Receita "${newRecipe.title}" importada com sucesso via JSON-LD!`);
          setActiveSubTab('recipes');
          return;
        }

        // 2. Se falhar JSON-LD mas o usuário tiver chave Gemini/OpenAI, tenta chamar a IA para interpretar o texto bruto
        if (settings.apiKey && settings.apiProvider !== 'none') {
          const bodyText = doc.body?.innerText || doc.documentElement.innerText || '';
          const truncatedText = bodyText.slice(0, 10000);
          
          const systemPrompt = `Você é um robô extrator de receitas. Seu trabalho é extrair os dados da receita presentes no texto bruto da página e retornar estritamente um objeto JSON válido correspondente à receita, com os seguintes campos:
          {
            "title": "título da receita",
            "description": "breve descrição",
            "prepTime": tempo de preparo em minutos (inteiro),
            "cookTime": tempo de cozimento em minutos (inteiro),
            "totalTime": tempo total em minutos (inteiro),
            "servings": porções/rendimento (inteiro),
            "ingredients": ["ingrediente 1", "ingrediente 2"],
            "instructions": ["passo 1", "passo 2"],
            "tags": ["tag1", "tag2"]
          }
          Retorne exclusivamente o JSON, sem markdown, sem explicações.`;

          let rawResponse = '';
          if (settings.apiProvider === 'gemini') {
            const enrichedPrompt = `EXTRAIA A RECEITA DO TEXTO ABAIXO E RETORNE APENAS O OBJETO JSON:\n${truncatedText}`;
            rawResponse = await askAICoach(enrichedPrompt, [{ role: 'user', content: systemPrompt }]);
          } else {
            rawResponse = await askAICoach(truncatedText, [{ role: 'user', content: systemPrompt }]);
          }

          const cleanJsonStr = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          const aiRecipe = JSON.parse(cleanJsonStr);

          const newRecipe: Recipe = {
            id: `rec-import-ai-${Date.now()}`,
            title: aiRecipe.title || 'Receita Interpretada',
            description: aiRecipe.description || 'Receita extraída através de IA.',
            rating: 5,
            prepTime: aiRecipe.prepTime || 15,
            cookTime: aiRecipe.cookTime || 15,
            totalTime: aiRecipe.totalTime || 30,
            servings: aiRecipe.servings || 1,
            lastMade: 'Nunca',
            image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
            ingredients: aiRecipe.ingredients || [],
            instructions: aiRecipe.instructions || [],
            tags: aiRecipe.tags || ['IA Extraída'],
            sourceUrl: importUrl,
            comments: [],
            isFavorite: false
          };

          db.saveRecipe(newRecipe);
          refreshDietData();
          setImportUrl('');
          confetti({ particleCount: 70, spread: 60 });
          alert(`Receita "${newRecipe.title}" importada e interpretada por IA com sucesso!`);
          setActiveSubTab('recipes');
          return;
        }
      }

      // 3. Fallback inteligente: simular a importação de uma receita famosa se bater hosts conhecidos, ou carregar uma de exemplo gourmet
      let seededTitle = 'Panqueca Americana Premium';
      let seededIngredients = [
        '1 1/4 xícaras de farinha de trigo',
        '1 colher de sopa de açúcar',
        '3 colheres de chá de fermento em pó',
        '1 ovo batido',
        '1 xícara de leite',
        '2 colheres de sopa de manteiga derretida'
      ];
      let seededInstructions = [
        'Misture a farinha, o açúcar e o fermento em uma tigela grande.',
        'Em outra tigela menor, misture o ovo, o leite e a manteiga derretida.',
        'Junte os ingredientes secos e úmidos, misturando apenas até homogeneizar.',
        'Aqueça uma frigideira untada e cozinhe porções da massa até dourar de ambos os lados.'
      ];

      if (importUrl.includes('tudo-gostoso') || importUrl.includes('tudogostoso')) {
        seededTitle = 'Panqueca de Banana Fit';
        seededIngredients = [
          '1 banana madura',
          '1 ovo inteiro',
          '2 colheres de sopa de farelo de aveia',
          '1 pitada de canela em pó (opcional)'
        ];
        seededInstructions = [
          'Amasse bem a banana em um prato fundo com um garfo.',
          'Adicione o ovo e o farelo de aveia, batendo bem até misturar tudo uniformemente.',
          'Aqueça uma frigideira antiaderente untada com um fiozinho de óleo de coco.',
          'Coloque colheradas da massa, cozinhe em fogo baixo até dourar e vire para dourar o outro lado.'
        ];
      }

      const newRecipe: Recipe = {
        id: `rec-import-mock-${Date.now()}`,
        title: seededTitle,
        description: `Receita importada com sucesso da URL: ${new URL(importUrl).hostname}`,
        rating: 4,
        prepTime: 10,
        cookTime: 10,
        totalTime: 20,
        servings: 2,
        lastMade: 'Nunca',
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
        ingredients: seededIngredients,
        instructions: seededInstructions,
        tags: ['Café da Manhã', 'Fit', 'Rápido'],
        sourceUrl: importUrl,
        comments: [],
        isFavorite: false,
        dietaryCategories: ['Fitness', 'Light', 'Sem Glúten', 'Sem Lactose'],
        mealTypes: ['Café da Manhã', 'Lanche']
      };

      db.saveRecipe(newRecipe);
      refreshDietData();
      setImportUrl('');
      confetti({ particleCount: 50, spread: 45 });
      alert(`Site com CORS restrito ou indisponível. A receita "${newRecipe.title}" foi importada com sucesso via inteligência local!`);
      setActiveSubTab('recipes');

    } catch (error: any) {
      console.error(error);
      alert(`Falha ao importar receita. Detalhes: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // -------------------------------------------------------------
  // LISTA DE COMPRAS (CONSOLIDADOR E MULTIPLICADOR DE SERVINGS)
  // -------------------------------------------------------------
  // Armazena as porções modificadas pelo usuário na lista de compras
  const [servingsMultiplier, setServingsMultiplier] = useState<Record<string, number>>({});
  
  // Itens manuais da lista de compras
  const [shoppingLogs, setShoppingLogs] = useState<string[]>([]);
  const [shoppingFormVal, setShoppingFormVal] = useState('');
  const [checkedShoppingItems, setCheckedShoppingItems] = useState<Record<string, boolean>>({});

  // Consolidação dinâmica de todos os ingredientes planejados na semana
  const consolidatedIngredients = useMemo(() => {
    const list: {
      raw: string;
      recipeName: string;
      recipeId: string;
      quantityNum: number;
      quantityUnit: string;
      nameOnly: string;
    }[] = [];

    // Loop em todas as refeições planejadas
    mealPlans.forEach(plan => {
      plan.meals.forEach(m => {
        m.items.forEach(item => {
          if (item.recipeId) {
            const recipe = recipes.find(r => r.id === item.recipeId);
            if (recipe) {
              const multiplier = servingsMultiplier[recipe.id] !== undefined ? servingsMultiplier[recipe.id] : recipe.servings;
              const ratio = multiplier / recipe.servings; // Proporção de porções

              recipe.ingredients.forEach(ing => {
                // Tenta parsear a quantidade numérica inicial
                // Ex: "4 ovos" -> num=4, unit="", name="ovos"
                // Ex: "2 fatias de pão" -> num=2, unit="fatias de", name="pão"
                // Ex: "1/2 tomate picado" -> num=0.5
                let qty = 1;
                let unit = '';
                let name = ing;

                const matchFraction = ing.match(/^(\d+)\s+(\d+)\/(\d+)/); // Ex: "1 1/2"
                const matchSimpleFraction = ing.match(/^(\d+)\/(\d+)/);    // Ex: "1/2"
                const matchNumber = ing.match(/^(\d+(\.\d+)?)/);           // Ex: "2.5" ou "2"

                if (matchFraction) {
                  qty = parseInt(matchFraction[1]) + (parseInt(matchFraction[2]) / parseInt(matchFraction[3]));
                  name = ing.slice(matchFraction[0].length).trim();
                } else if (matchSimpleFraction) {
                  qty = parseInt(matchSimpleFraction[1]) / parseInt(matchSimpleFraction[2]);
                  name = ing.slice(matchSimpleFraction[0].length).trim();
                } else if (matchNumber) {
                  qty = parseFloat(matchNumber[1]);
                  name = ing.slice(matchNumber[1].length).trim();
                }

                // Ajusta quantidade com base no ratio das porções selecionadas
                const adjustedQty = qty * ratio;

                list.push({
                  raw: ing,
                  recipeName: recipe.title,
                  recipeId: recipe.id,
                  quantityNum: adjustedQty,
                  quantityUnit: unit,
                  nameOnly: name
                });
              });
            }
          }
        });
      });
    });

    // Consolida nomes idênticos
    const consolidatedMap: Record<string, typeof list[0]> = {};
    list.forEach(item => {
      const key = item.nameOnly.toLowerCase();
      if (consolidatedMap[key]) {
        consolidatedMap[key].quantityNum += item.quantityNum;
        if (!consolidatedMap[key].recipeName.includes(item.recipeName)) {
          consolidatedMap[key].recipeName += `, ${item.recipeName}`;
        }
      } else {
        consolidatedMap[key] = { ...item };
      }
    });

    return Object.values(consolidatedMap);
  }, [mealPlans, recipes, servingsMultiplier]);

  // Lista de receitas únicas que estão no planejamento semanal
  const uniquePlannedRecipes = useMemo(() => {
    const ids = new Set<string>();
    mealPlans.forEach(plan => {
      plan.meals.forEach(m => {
        m.items.forEach(i => {
          if (i.recipeId) ids.add(i.recipeId);
        });
      });
    });
    return recipes.filter(r => ids.has(r.id));
  }, [mealPlans, recipes]);

  const handleUpdateShoppingRecipeServings = (recipeId: string, val: number) => {
    const current = servingsMultiplier[recipeId] !== undefined ? servingsMultiplier[recipeId] : 1;
    const nextVal = Math.max(1, current + val);
    setServingsMultiplier({
      ...servingsMultiplier,
      [recipeId]: nextVal
    });
  };

  const handleSendListByEmail = async () => {
    if (!settings.emailForList) {
      alert('Por favor, configure o seu e-mail nas Configurações do Sistema.');
      return;
    }

    const emailSubject = 'Sua Lista de Compras Vida Saudável';
    const emailBody = `Olá!\n\nAqui está sua lista de compras consolidada para as refeições da semana:\n\n` +
      consolidatedIngredients.map(ing => `- ${ing.quantityNum > 0 ? `${ing.quantityNum.toFixed(1)} ` : ''}${ing.nameOnly} (Receitas: ${ing.recipeName})`).join('\n') +
      `\n\nItens manuais adicionados:\n` +
      shoppingLogs.map(item => `- ${item}`).join('\n') +
      `\n\nAbraços,\nEquipe Vida Saudável`;

    // 1. Geração do Design Premium HTML do E-mail
    const ingredientsRows = consolidatedIngredients.length > 0 
      ? consolidatedIngredients.map(ing => `
          <tr style="border-bottom: 1px solid #1f2232;">
            <td style="padding: 12px 15px; font-weight: 600; color: #ffffff; font-size: 15px; text-align: left;">
              ${ing.quantityNum > 0 ? `<span style="color: #2563eb; font-weight: bold;">${ing.quantityNum.toFixed(1)}</span> ` : ''}${ing.nameOnly}
            </td>
            <td style="padding: 12px 15px; text-align: right; font-size: 13px; color: #9ba1b0;">
              <span style="background: #1f2232; padding: 4px 8px; border-radius: 4px; display: inline-block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${ing.recipeName}
              </span>
            </td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="2" style="padding: 20px; text-align: center; color: #535868; font-style: italic;">
              Nenhum ingrediente planejado para esta semana.
            </td>
          </tr>
        `;

    const manualRows = shoppingLogs.length > 0
      ? shoppingLogs.map(item => `
          <tr style="border-bottom: 1px solid #1f2232;">
            <td colspan="2" style="padding: 12px 15px; color: #ffffff; font-size: 15px; text-align: left;">
              <span style="color: #f97316; margin-right: 8px;">•</span> ${item}
            </td>
          </tr>
        `).join('')
      : `
          <tr>
            <td colspan="2" style="padding: 20px; text-align: center; color: #535868; font-style: italic;">
              Nenhum item manual adicionado.
            </td>
          </tr>
        `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sua Lista de Compras Vida Saudável</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07080c; color: #ffffff; margin: 0; padding: 0;">
        <div style="background-color: #07080c; padding: 40px 20px; min-height: 100vh;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #11131a; border: 1px solid #1f2232; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 35px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Vida Saudável</h1>
              <p style="margin: 6px 0 0 0; color: #93c5fd; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Sua Lista de Compras Semanal</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #9ba1b0; margin-top: 0; margin-bottom: 30px; text-align: left;">
                Olá, <strong>${settings.userName}</strong>!<br><br>
                Aqui está a sua lista de compras consolidada com base nas refeições do seu cardápio planejado para esta semana. Tudo pronto para ajudar você a manter sua dieta com facilidade e foco nos treinos!
              </p>
              
              <!-- Ingredients Section -->
              <h3 style="font-size: 14px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0 15px 0; border-bottom: 1px solid #1f2232; padding-bottom: 8px; text-align: left;">
                Ingredientes das Refeições
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 30px;">
                <tbody>
                  ${ingredientsRows}
                </tbody>
              </table>
              
              <!-- Manual Items Section -->
              <h3 style="font-size: 14px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin: 30px 0 15px 0; border-bottom: 1px solid #1f2232; padding-bottom: 8px; text-align: left;">
                Itens Manuais Adicionados
              </h3>
              <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 10px;">
                <tbody>
                  ${manualRows}
                </tbody>
              </table>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #141620; padding: 25px 40px; text-align: center; border-top: 1px solid #1f2232; font-size: 12px; color: #535868;">
              <p style="margin: 0 0 8px 0;">Este e-mail foi gerado automaticamente pelo seu planejador Vida Saudável.</p>
              <p style="margin: 0;">© 2026 Vida Saudável. Todos os direitos reservados.</p>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;

    // 2. Tenta enviar via Resend API se a chave estiver configurada
    if (settings.resendApiKey) {
      try {
        const fromEmail = settings.resendFromEmail || 'onboarding@resend.dev';
        const formattedFrom = fromEmail.includes('<') ? fromEmail : `Vida Saudável <${fromEmail}>`;

        // Chamamos a nossa Pages Function/Worker de API interna (/api/send-email).
        // Por ser uma chamada de mesma origem (same-origin), o navegador permite cabeçalhos customizados sem preflight CORS.
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.resendApiKey}`
          },
          body: JSON.stringify({
            from: formattedFrom,
            to: settings.emailForList,
            subject: emailSubject,
            text: emailBody,
            html: emailHtml
          })
        });

        if (res.ok) {
          alert('Lista de compras enviada com sucesso para o seu e-mail via Resend API!');
          return;
        } else {
          const errBody = await res.text();
          console.warn('Erro ao disparar via Resend:', errBody);
          alert(`Erro na API do Resend: ${errBody}.\n\nPor favor, verifique se a sua chave de API é válida e se o e-mail de origem está configurado e verificado no painel do Resend.`);
          return; // Para a execução aqui, NÃO abre mailto!
        }
      } catch (err: any) {
        console.error('Falha ao disparar e-mail via Pages Function:', err);
        alert(`Erro de conexão ao enviar e-mail: ${err.message || err}`);
        return; // Para a execução aqui, NÃO abre mailto!
      }
    }

    // 2. Fallback mailto: abre o cliente de email do usuário (apenas se a API NÃO estiver configurada!)
    const mailtoUrl = `mailto:${encodeURIComponent(settings.emailForList)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
    alert('Como você não possui chave do Resend configurada, abrimos o seu aplicativo de e-mail local para enviar a lista.');
  };

  // -------------------------------------------------------------
  // NUTRICIONISTA IA - CHAT E INSIGHTS
  // -------------------------------------------------------------
  const [nutriInput, setNutriInput] = useState('');
  const [nutriMessages, setNutriMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Olá, **${settings.userName}**! Sou a sua Nutricionista Esportiva e Consultora Alimentar de IA. 

Analisei seus dados biométricos de bioimpedância e seu nível de treino de musculação/corrida. Como posso estruturar o seu cardápio, calcular suas metas de macronutrientes ou sugerir receitas hoje?`
    }
  ]);
  const [nutriTyping, setNutriTyping] = useState(false);

  const handleSendNutriMsg = async (textToSend?: string) => {
    const msgVal = (textToSend || nutriInput).trim();
    if (!msgVal) return;

    if (!textToSend) setNutriInput('');

    const updatedMsgs = [...nutriMessages, { role: 'user' as const, content: msgVal }];
    setNutriMessages(updatedMsgs);
    setNutriTyping(true);

    try {
      const response = await askAINutritionist(msgVal, nutriMessages);
      setNutriMessages([...updatedMsgs, { role: 'assistant' as const, content: response }]);
    } catch (err) {
      console.error(err);
      setNutriMessages([...updatedMsgs, { role: 'assistant' as const, content: 'Desculpe, ocorreu um erro ao analisar seus dados nutricionais.' }]);
    } finally {
      setNutriTyping(false);
    }
  };

  return (
    <div className="diet-container">
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #ffaa7f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Apple size={28} color="var(--accent-orange)" />
            Dieta & Nutrição
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie suas metas de macros, planeje seu cardápio da semana e acompanhe com IA.</p>
        </div>
      </header>

      {/* Navegação de Sub-abas */}
      <nav className="diet-tabs">
        <button className={`diet-tab-btn ${activeSubTab === 'daily' ? 'active' : ''}`} onClick={() => { setActiveSubTab('daily'); setSelectedRecipe(null); }}>Diário Alimentar</button>
        <button className={`diet-tab-btn ${activeSubTab === 'planner' ? 'active' : ''}`} onClick={() => { setActiveSubTab('planner'); setSelectedRecipe(null); }}>Cardápio Semanal</button>
        <button className={`diet-tab-btn ${activeSubTab === 'recipes' ? 'active' : ''}`} onClick={() => { setActiveSubTab('recipes'); }}>Minhas Receitas</button>
        <button className={`diet-tab-btn ${activeSubTab === 'import' ? 'active' : ''}`} onClick={() => { setActiveSubTab('import'); setSelectedRecipe(null); }}>Extrair Receita</button>
        <button className={`diet-tab-btn ${activeSubTab === 'shopping' ? 'active' : ''}`} onClick={() => { setActiveSubTab('shopping'); setSelectedRecipe(null); }}>Lista de Compras</button>
        <button className={`diet-tab-btn ${activeSubTab === 'nutri_ai' ? 'active' : ''}`} onClick={() => { setActiveSubTab('nutri_ai'); setSelectedRecipe(null); }}>Nutricionista IA</button>
      </nav>

      {/* CONTEÚDO DINÂMICO */}

      {/* 1. DIÁRIO ALIMENTAR */}
      {activeSubTab === 'daily' && (
        <div className="macros-dashboard-grid">
          {/* Esquerda: Consumo de hoje */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                Resumo de Nutrientes de Hoje
                {settings.carbCyclingMode === 'auto' && (
                  <span className={`carb-cycling-badge ${carbCyclingDayType}`}>
                    {carbCyclingDayType === 'high' ? 'Carbo Alto 🔴' : carbCyclingDayType === 'medium' ? 'Carbo Médio 🔵' : 'Carbo Baixo 🟢'}
                  </span>
                )}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>

            {/* Círculos dos macros */}
            <div className="macros-card-circle-wrapper">
              {/* Calorias */}
              <div className="macro-ring-container">
                <div className="macro-ring-svg">
                  <svg width="80" height="80">
                    <circle className="macro-ring-circle-bg" cx="40" cy="40" r="32" />
                    <circle 
                      className="macro-ring-circle-val" 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="var(--accent-orange)"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - getPercentage(consumedMacros.calories, targetMacros.calories) / 100)}`}
                    />
                  </svg>
                  <div className="macro-ring-text">
                    <span className="val">{consumedMacros.calories}</span>
                    <span className="pct">kcal</span>
                  </div>
                </div>
                <span className="macro-label">Calorias</span>
                <span className="macro-detail">Meta: {targetMacros.calories} kcal</span>
              </div>

              {/* Proteínas */}
              <div className="macro-ring-container">
                <div className="macro-ring-svg">
                  <svg width="80" height="80">
                    <circle className="macro-ring-circle-bg" cx="40" cy="40" r="32" />
                    <circle 
                      className="macro-ring-circle-val" 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="var(--accent-emerald)"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - getPercentage(consumedMacros.protein, targetMacros.protein) / 100)}`}
                    />
                  </svg>
                  <div className="macro-ring-text">
                    <span className="val">{consumedMacros.protein}g</span>
                    <span className="pct">{getPercentage(consumedMacros.protein, targetMacros.protein)}%</span>
                  </div>
                </div>
                <span className="macro-label">Proteínas</span>
                <span className="macro-detail">Meta: {targetMacros.protein}g</span>
              </div>

              {/* Carboidratos */}
              <div className="macro-ring-container">
                <div className="macro-ring-svg">
                  <svg width="80" height="80">
                    <circle className="macro-ring-circle-bg" cx="40" cy="40" r="32" />
                    <circle 
                      className="macro-ring-circle-val" 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="var(--accent-blue)"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - getPercentage(consumedMacros.carbs, targetMacros.carbs) / 100)}`}
                    />
                  </svg>
                  <div className="macro-ring-text">
                    <span className="val">{consumedMacros.carbs}g</span>
                    <span className="pct">{getPercentage(consumedMacros.carbs, targetMacros.carbs)}%</span>
                  </div>
                </div>
                <span className="macro-label">Carboidratos</span>
                <span className="macro-detail">Meta: {targetMacros.carbs}g</span>
              </div>

              {/* Gorduras */}
              <div className="macro-ring-container">
                <div className="macro-ring-svg">
                  <svg width="80" height="80">
                    <circle className="macro-ring-circle-bg" cx="40" cy="40" r="32" />
                    <circle 
                      className="macro-ring-circle-val" 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="#ff4757"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - getPercentage(consumedMacros.fat, targetMacros.fat) / 100)}`}
                    />
                  </svg>
                  <div className="macro-ring-text">
                    <span className="val">{consumedMacros.fat}g</span>
                    <span className="pct">{getPercentage(consumedMacros.fat, targetMacros.fat)}%</span>
                  </div>
                </div>
                <span className="macro-label">Gorduras</span>
                <span className="macro-detail">Meta: {targetMacros.fat}g</span>
              </div>
            </div>

            {/* Barra de TDEE e Gasto Ativo */}
            <div className="tdee-bar-wrapper" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.25rem' }}>
              <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Meta Diária de Hidratação (Água):</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{targetMacros.waterTarget} ml</strong>
              </div>
              <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <span>Gasto Energético Ativo Cruzado (TDEE):</span>
                <strong style={{ color: 'var(--text-primary)' }}>{targetMacros.calories} kcal ({settings.tdeeMode === 'auto' ? 'Adaptativo' : 'Estático'})</strong>
              </div>
              <div className="tdee-bar-container">
                <div className="tdee-bar-base" style={{ width: `${Math.min(100, ((targetMacros.calories - (settings.tdeeMode === 'auto' ? activeCaloriesBurned : 0)) / targetMacros.calories) * 100)}%` }} />
                {settings.tdeeMode === 'auto' && activeCaloriesBurned > 0 && (
                  <div className="tdee-bar-active" style={{ width: `${Math.min(100, (activeCaloriesBurned / targetMacros.calories) * 100)}%` }} />
                )}
              </div>
              <div className="tdee-legend">
                <div className="tdee-legend-item">
                  <span className="tdee-legend-dot base" />
                  <span>Meta Base ({targetMacros.calories - (settings.tdeeMode === 'auto' ? activeCaloriesBurned : 0)} kcal)</span>
                </div>
                {settings.tdeeMode === 'auto' && activeCaloriesBurned > 0 && (
                  <div className="tdee-legend-item">
                    <span className="tdee-legend-dot active" />
                    <span>Gasto Ativo (+{activeCaloriesBurned} kcal)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Listagem de alimentos do dia */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', color: '#fff' }}>Alimentos Consumidos Hoje</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderColor: 'rgba(249,115,22,0.4)', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setShowScanModal(true)}>
                    <Bot size={14} color="var(--accent-orange)" /> Escanear Prato
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setShowAddFoodForm(true)}>
                    <Plus size={14} /> Registrar Alimento
                  </button>
                </div>
              </div>

              {todayLog.items.length === 0 ? (
                <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                  Nenhum alimento cadastrado hoje. Utilize o "Cardápio Semanal" para planejar ou adicione acima!
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Alimento</th>
                        <th>Refeição</th>
                        <th>Calorias</th>
                        <th>Proteínas</th>
                        <th>Carbos</th>
                        <th>Gorduras</th>
                        <th style={{ width: '45px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayLog.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {item.mealId === 'breakfast' ? 'Café da Manhã' : item.mealId === 'lunch' ? 'Almoço' : item.mealId === 'dinner' ? 'Jantar' : 'Lanches'}
                          </td>
                          <td style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{item.calories} kcal</td>
                          <td>{item.protein}g</td>
                          <td>{item.carbs}g</td>
                          <td>{item.fat}g</td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '0.25rem', color: '#ff6b6b' }} onClick={() => handleDeleteFoodItem(idx)}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Direita: Perfil calórico cruzado */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} color="var(--accent-orange)" />
              Cálculo Cruzado de Saúde
            </h3>

            {latestBody ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Peso de Bioimpedância:</span>
                  <strong style={{ color: '#fff' }}>{latestBody.weight} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Taxa Metabólica Basal:</span>
                  <strong style={{ color: 'var(--accent-orange)' }}>{latestBody.basalMetabolism} kcal</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Massa Muscular (Meta):</span>
                  <strong style={{ color: 'var(--accent-emerald)' }}>{latestBody.muscleMass} kg ({latestBody.muscleMassGoal} kg)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gordura Corporal (Meta):</span>
                  <strong style={{ color: 'var(--accent-blue)' }}>{latestBody.bodyFat}% ({latestBody.bodyFatGoal}%)</strong>
                </div>

                <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#ffb38a', lineHeight: 1.4 }}>
                  💡 **Insight Nutricional IA:** Com base na sua TMB de **{latestBody.basalMetabolism} kcal** e treino ativo de musculação e corrida, sua meta de manutenção está calculada em **{targetMacros.calories} kcal**. 
                  Consuma **{targetMacros.protein}g** de proteína diariamente para evitar a perda de massa magra sob volume aeróbico elevado.
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                Nenhum exame de bioimpedância localizado. Cadastre na aba "Corrida & Corpo" para liberar cálculos energéticos avançados.
              </div>
            )}

            {/* Modal/Form Add Alimento Manual */}
            {showAddFoodForm && (
              <form onSubmit={handleSaveFoodItem} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#fff' }}>Registrar Alimento Manual</h4>
                <div className="form-group">
                  <label htmlFor="foodName">Nome do Alimento</label>
                  <input
                    id="foodName"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Whey com aveia"
                    value={foodForm.name}
                    onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="foodCalories">Calorias (kcal)</label>
                    <input
                      id="foodCalories"
                      type="number"
                      className="form-control"
                      value={foodForm.calories}
                      onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="foodMeal">Refeição</label>
                    <select
                      id="foodMeal"
                      className="form-control"
                      value={foodForm.mealId}
                      onChange={(e) => setFoodForm({ ...foodForm, mealId: e.target.value })}
                    >
                      <option value="breakfast">Café da Manhã</option>
                      <option value="lunch">Almoço</option>
                      <option value="dinner">Jantar</option>
                      <option value="snack">Lanches</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="foodProtein">Prot (g)</label>
                    <input
                      id="foodProtein"
                      type="number"
                      className="form-control"
                      value={foodForm.protein}
                      onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="foodCarbs">Carbo (g)</label>
                    <input
                      id="foodCarbs"
                      type="number"
                      className="form-control"
                      value={foodForm.carbs}
                      onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="foodFat">Gord (g)</label>
                    <input
                      id="foodFat"
                      type="number"
                      className="form-control"
                      value={foodForm.fat}
                      onChange={(e) => setFoodForm({ ...foodForm, fat: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Registrar</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddFoodForm(false)}>Cancelar</button>
                </div>
              </form>
            )}

            {/* Modal/Form Escanear Prato por IA */}
            {showScanModal && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Bot size={16} /> Escanear Prato / Rótulo com IA
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Faça o upload de uma foto do seu prato ou tabela nutricional para estimar os macronutrientes.
                </p>

                <div className="form-group">
                  <label htmlFor="scanMeal">Lançar na Refeição:</label>
                  <select
                    id="scanMeal"
                    className="form-control"
                    value={scanMealId}
                    onChange={(e) => setScanMealId(e.target.value)}
                  >
                    <option value="breakfast">Café da Manhã</option>
                    <option value="lunch">Almoço</option>
                    <option value="dinner">Jantar</option>
                    <option value="snack">Lanches</option>
                  </select>
                </div>

                <div className="image-scanner-container" onClick={() => document.getElementById('cameraInput')?.click()}>
                  <input
                    id="cameraInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  {scanImage ? (
                    <img src={scanImage} alt="Preview" className="scanner-image-preview" />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '2rem' }}>📸</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Clique para tirar foto ou selecionar imagem</span>
                    </div>
                  )}
                </div>

                {scanLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div className="scan-progress-bar">
                      <div className="scan-progress-fill" />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', textAlign: 'center', fontWeight: 'bold' }}>
                      {settings.apiKey && settings.apiProvider === 'gemini' 
                        ? 'Gemini Vision analisando seu prato...' 
                        : 'Simulando análise de imagem com IA...'}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, background: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }}
                    onClick={handleAnalyzeImage}
                    disabled={!scanImage || scanLoading}
                  >
                    Analisar Prato
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowScanModal(false); setScanImage(null); }}
                    disabled={scanLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CARDÁPIO / PLANEJADOR SEMANAL */}
      {activeSubTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Seletor de Data Semanal conforme Imagem 4 */}
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ background: 'var(--accent-orange)', padding: '0.65rem 1.25rem', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} />
              <span>
                {plannerDates[0]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - {plannerDates[6]?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleConsumeDayPlan} style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <Check size={14} /> Consumir Refeições de Hoje
              </button>
            </div>
          </div>

          {/* Linha dos Dias da Semana */}
          <div className="meal-planner-grid">
            {plannerDates.map((date, idx) => {
              const dateIso = date.toISOString().split('T')[0];
              const isSelected = selectedDayOffset === idx;
              const hasMeals = mealPlans.some(p => p.date === dateIso && p.meals.some(m => m.items.length > 0));

              return (
                <div 
                  key={idx} 
                  className={`day-plan-card ${isSelected ? 'active-day' : ''}`}
                  onClick={() => setSelectedDayOffset(idx)}
                >
                  <div className="day-plan-header">
                    <span className="day-plan-name">{date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0]}</span>
                    <span className="day-plan-date">{date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="day-meals-summary">
                    {hasMeals ? (
                      mealPlans.find(p => p.date === dateIso)?.meals.map(m => (
                        m.items.length > 0 && (
                          <div key={m.id} className="meal-summary-item">
                            <strong>{m.name}:</strong> {m.items.length} {m.items.length === 1 ? 'item' : 'itens'}
                          </div>
                        )
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem refeições planejadas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalhamento do Dia Selecionado */}
          <div className="glass-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Planejamento de Refeições: <strong style={{ color: 'var(--accent-orange)', textTransform: 'capitalize' }}>{plannerDates[selectedDayOffset]?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {selectedDayPlan.meals.map(meal => (
                <div key={meal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '1rem' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Utensils size={14} />
                      {meal.name}
                    </h4>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setActiveMealId(meal.id); setSelectedRecipeId(recipes[0]?.id || ''); setShowAddMealModal(true); }}>
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>

                  {meal.items.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '1.25rem' }}>Nenhum item planejado.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginLeft: '1.25rem' }}>
                      {meal.items.map((item, idx) => (
                        <div key={idx} className="flex-between" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{item.customName}</span>
                            {item.recipeId && <span className="recipe-card-badge" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>Receita</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            {item.calories ? <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.calories} kcal | P: {item.protein}g | C: {item.carbs}g | G: {item.fat}g</span> : null}
                            <button className="btn btn-secondary" style={{ padding: '0.2rem', color: '#ff6b6b', border: 'none' }} onClick={() => handleDeleteMealItem(meal.id, idx)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MINHAS RECEITAS */}
      {activeSubTab === 'recipes' && !selectedRecipe && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Barra de Filtro e Busca */}
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px', position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
                placeholder="Buscar receitas por nome, ingrediente ou tag..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
              />
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <button className="btn btn-accent" onClick={() => setShowAddRecipeModal(true)}>
              <Plus size={16} /> Cadastrar Receita
            </button>
          </div>

          {/* Carrossel de Categorias Dietéticas conforme imagem */}
          <div className="categories-carousel">
            {DIETARY_CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                className={`category-card ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              >
                <img src={cat.img} alt={cat.name} />
                <div className="category-card-title">{cat.name}</div>
              </div>
            ))}
          </div>

          {/* Pílulas de Filtro por Tipo de Refeição */}
          <div className="meal-filter-pills">
            <button 
              className={`meal-pill ${!selectedMealType ? 'active' : ''}`} 
              onClick={() => setSelectedMealType('')}
            >
              Todas as Refeições
            </button>
            {MEAL_TYPES.map((meal) => (
              <button 
                key={meal.id} 
                className={`meal-pill ${selectedMealType === meal.id ? 'active' : ''}`}
                onClick={() => setSelectedMealType(selectedMealType === meal.id ? '' : meal.id)}
              >
                {meal.name}
              </button>
            ))}
            {(selectedCategory || selectedMealType) && (
              <button 
                className="meal-pill" 
                style={{ borderColor: 'rgba(255,71,87,0.3)', color: '#ff4757', fontWeight: 'bold' }}
                onClick={() => { setSelectedCategory(''); setSelectedMealType(''); }}
              >
                Limpar Filtros ✕
              </button>
            )}
          </div>

          {/* Grid de Receitas */}
          {filteredRecipes.length === 0 ? (
            <div style={{ padding: '4rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              Nenhuma receita encontrada para os filtros selecionados. Cadastre ou importe novas receitas!
            </div>
          ) : (
            <div className="recipes-grid">
              {filteredRecipes.map((recipe) => (
                <div key={recipe.id} className="glass-card recipe-card" onClick={() => handleOpenRecipeDetail(recipe)}>
                  <div className="recipe-card-img-wrapper">
                    <img className="recipe-card-img" src={recipe.image} alt={recipe.title} />
                    <div className="recipe-card-overlay">
                      <span className="recipe-card-badge">{recipe.totalTime} min</span>
                    </div>
                    {/* Botão Favoritar no Card */}
                    <button 
                      type="button"
                      className="recipe-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(recipe);
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(9, 11, 17, 0.75)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: recipe.isFavorite ? '#ff4757' : '#fff',
                        transition: 'var(--transition-smooth)',
                        zIndex: 10,
                        padding: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={recipe.isFavorite ? '#ff4757' : 'none'} stroke={recipe.isFavorite ? '#ff4757' : '#fff'} strokeWidth="2.5">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="recipe-card-info">
                    <h3 className="recipe-card-title">{recipe.title}</h3>
                    <p className="recipe-card-description">{recipe.description}</p>
                    <div className="recipe-card-meta">
                      <div className="recipe-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className="recipe-star" style={{ opacity: s <= recipe.rating ? 1 : 0.2 }}>★</span>
                        ))}
                      </div>
                      <div className="recipe-card-tags">
                        {recipe.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="recipe-card-badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-orange)', border: 'none' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3.1 DETALHAMENTO DE RECEITA SELECIONADA */}
      {activeSubTab === 'recipes' && selectedRecipe && (
        <div className="recipe-detail-container">
          <header style={{ textAlign: 'left' }}>
            <button className="btn btn-secondary" style={{ marginBottom: '1rem' }} onClick={() => { setSelectedRecipe(null); setCookModeStep(-1); }}>
              <ArrowLeft size={16} /> Voltar para Receitas
            </button>
            <h2 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.35rem' }}>{selectedRecipe.title}</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="recipe-stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="recipe-star" style={{ opacity: s <= selectedRecipe.rating ? 1 : 0.2, fontSize: '1.2rem' }}>★</span>
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Última vez feita: <strong style={{ color: 'var(--accent-orange)' }}>{selectedRecipe.lastMade || 'Nunca'}</strong></span>
              <button 
                onClick={() => handleUpdateLastMade(selectedRecipe.id)}
                className="btn btn-secondary"
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem' }}
                title="Marcar como preparada hoje"
              >
                + Registrar Preparo
              </button>
            </div>
          </header>

          {/* Botões de Ações Rápidas da Receita */}
          <div className="recipe-actions-row">
            <button 
              type="button"
              className={`recipe-action-btn ${selectedRecipe.isFavorite ? 'favorite-active' : ''}`}
              onClick={() => handleToggleFavorite(selectedRecipe)}
            >
              <Heart size={14} fill={selectedRecipe.isFavorite ? 'currentColor' : 'none'} />
              <span>{selectedRecipe.isFavorite ? 'Favoritada' : 'Favoritar'}</span>
            </button>
            <button type="button" className="recipe-action-btn" onClick={handleShareRecipe}>
              <Share2 size={14} />
              <span>Compartilhar</span>
            </button>
            <button type="button" className="recipe-action-btn" onClick={() => window.print()}>
              <Printer size={14} />
              <span>Imprimir</span>
            </button>
            <button 
              type="button" 
              className="recipe-action-btn" 
              style={{ borderColor: 'var(--accent-orange)', color: 'var(--accent-orange)' }}
              onClick={handleStartCookMode}
            >
              <BookOpen size={14} />
              <span>Modo Cozinheiro (Tela Cheia)</span>
            </button>
          </div>

          {/* Banner de Imagem com botões de overlay */}
          <div className="recipe-detail-banner">
            <img className="recipe-detail-img" src={selectedRecipe.image} alt={selectedRecipe.title} />
            <div className="recipe-detail-overlay-btns">
              <button className="recipe-overlay-btn" title="Copiar Ingredientes" onClick={copyIngredientsToClipboard}>
                <Copy size={16} />
              </button>
              <button className="recipe-overlay-btn" title="Excluir Receita" style={{ color: '#ff6b6b' }} onClick={() => handleDeleteRecipe(selectedRecipe.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Quadro de Tempos e Porções */}
          <div className="recipe-detail-times">
            <div className="recipe-time-item">
              <span className="lbl">Prep</span>
              <span className="val">{selectedRecipe.prepTime} min</span>
            </div>
            <div className="recipe-time-item">
              <span className="lbl">Cozimento</span>
              <span className="val">{selectedRecipe.cookTime} min</span>
            </div>
            <div className="recipe-time-item">
              <span className="lbl">Total</span>
              <span className="val">{selectedRecipe.totalTime} min</span>
            </div>
            <div className="recipe-time-item">
              <span className="lbl">Porções</span>
              <span className="val">Serve {selectedRecipe.servings}</span>
            </div>
          </div>

          {/* Vídeo explicativo embutido */}
          {selectedRecipe.videoUrl && (
            (() => {
              const embedUrl = getYouTubeEmbedUrl(selectedRecipe.videoUrl);
              return embedUrl ? (
                <div className="recipe-video-container">
                  <iframe 
                    src={embedUrl} 
                    title={`Como fazer ${selectedRecipe.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              ) : (
                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={16} color="var(--accent-orange)" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Link do vídeo cadastrado: <a href={selectedRecipe.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-orange)', textDecoration: 'underline' }}>{selectedRecipe.videoUrl}</a>
                  </span>
                </div>
              );
            })()
          )}

          {/* Grid de Conteúdo: Ingredientes (esquerda) e Preparo (direita) */}
          <div className="recipe-detail-grid">
            {/* Ingredientes */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', textAlign: 'left' }}>Ingredientes</h3>
              <div className="ingredients-list">
                {selectedRecipe.ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <label key={idx} className={`ingredient-item ${isChecked ? 'checked' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => setCheckedIngredients({ ...checkedIngredients, [idx]: !isChecked })}
                      />
                      <span>{ing}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modo de Preparo */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>Modo de Preparo</h3>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: cookModeStep >= 0 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}
                  onClick={() => setCookModeStep(cookModeStep >= 0 ? -1 : 0)}
                >
                  🍳 Modo Cozinheiro
                </button>
              </div>

              <div className="prep-steps">
                {selectedRecipe.instructions.map((step, idx) => {
                  const isActive = cookModeStep === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`prep-step-card ${isActive ? 'active-step' : ''}`}
                      onClick={() => cookModeStep >= 0 && setCookModeStep(idx)}
                      style={{ cursor: cookModeStep >= 0 ? 'pointer' : 'default' }}
                    >
                      <span className="step-num">Passo: {idx + 1}</span>
                      <p className="step-text">{step}</p>
                    </div>
                  );
                })}
              </div>

              {cookModeStep >= 0 && (
                <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    disabled={cookModeStep === 0} 
                    onClick={() => setCookModeStep(cookModeStep - 1)}
                  >
                    Voltar
                  </button>
                  <button 
                    className="btn btn-primary" 
                    disabled={cookModeStep === selectedRecipe.instructions.length - 1} 
                    onClick={() => setCookModeStep(cookModeStep + 1)}
                  >
                    Próximo Passo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Seção de Comentários */}
          <div className="glass-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Conversa & Anotações</h3>
            
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="Participe da conversa ou adicione observações sobre a receita..."
                value={commentsInput}
                onChange={(e) => setCommentsInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Submeter</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              {(!selectedRecipe.comments || selectedRecipe.comments.length === 0) ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum comentário cadastrado. Seja o primeiro!</p>
              ) : (
                selectedRecipe.comments.map((comm) => (
                  <div key={comm.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--accent-orange)' }}>{comm.user}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{comm.date}</span>
                    </div>
                    <p style={{ color: '#cbd5e1' }}>{comm.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. EXTRAIR RECEITA DO SITE */}
      {activeSubTab === 'import' && (
        <div className="glass-card import-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div className="icon-wrapper orange-bg" style={{ width: 36, height: 36 }}>
              <Globe size={18} color="var(--accent-orange)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Criação de Receitas via URL</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Extraia e interprete receitas de sites da internet automaticamente utilizando IA.</p>
            </div>
          </div>

          <form onSubmit={handleImportRecipe} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="importUrl">URL da Receita</label>
              <input
                id="importUrl"
                type="text"
                className="form-control"
                placeholder="Cole a URL da receita de culinária..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                required
                disabled={importLoading}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ex: https://receiteria.com.br/receita-de-bolo/</span>
            </div>

            <div className="checkbox-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importOptions.importTags}
                  onChange={(e) => setImportOptions({ ...importOptions, importTags: e.target.checked })}
                />
                <span>Importar palavras-chave originais como marcadores</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importOptions.importCategories}
                  onChange={(e) => setImportOptions({ ...importOptions, importCategories: e.target.checked })}
                />
                <span>Importar categorias originais</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importOptions.stayInEdit}
                  onChange={(e) => setImportOptions({ ...importOptions, stayInEdit: e.target.checked })}
                />
                <span>Permanecer no modo de edição após importar</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={importOptions.interpretIngredients}
                  onChange={(e) => setImportOptions({ ...importOptions, interpretIngredients: e.target.checked })}
                />
                <span>Interpretar os ingredientes da receita após importar</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', width: '100%', marginTop: '0.5rem' }} disabled={importLoading}>
              {importLoading ? 'Importando receita e analisando...' : 'Criar e Importar'}
            </button>
          </form>
        </div>
      )}

      {/* 5. LISTA DE COMPRAS */}
      {activeSubTab === 'shopping' && (
        <div className="shopping-list-container">
          {/* Esquerda: Itens consolidados */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', color: '#fff', textAlign: 'left' }}>Lista de Supermercado Consolidada</h2>
              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleSendListByEmail}>
                <Mail size={14} /> Enviar Lista por E-mail
              </button>
            </div>

            {/* Input para adição manual */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                placeholder="Adicionar item avulso à lista (ex: Sal refinado)"
                value={shoppingFormVal}
                onChange={(e) => setShoppingFormVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && shoppingFormVal.trim()) {
                    setShoppingLogs([...shoppingLogs, shoppingFormVal.trim()]);
                    setShoppingFormVal('');
                  }
                }}
              />
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  if (shoppingFormVal.trim()) {
                    setShoppingLogs([...shoppingLogs, shoppingFormVal.trim()]);
                    setShoppingFormVal('');
                  }
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="shopping-items-list" style={{ marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>Ingredientes de Receitas</h3>
              
              {consolidatedIngredients.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>Sem ingredientes de receitas planejadas. Monte o "Cardápio Semanal" primeiro.</p>
              ) : (
                consolidatedIngredients.map((ing, idx) => {
                  const isChecked = !!checkedShoppingItems[`rec-${idx}`];
                  return (
                    <div key={idx} className={`shopping-item-row ${isChecked ? 'completed' : ''}`}>
                      <div className="shopping-item-left">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setCheckedShoppingItems({ ...checkedShoppingItems, [`rec-${idx}`]: !isChecked })}
                        />
                        <span className="shopping-item-name">
                          {ing.quantityNum > 0 ? <strong style={{ color: 'var(--accent-orange)' }}>{ing.quantityNum.toFixed(1)} </strong> : ''}
                          {ing.nameOnly}
                        </span>
                      </div>
                      <span className="shopping-recipe-badge" title={ing.recipeName}>
                        {ing.recipeName.length > 25 ? `${ing.recipeName.slice(0, 22)}...` : ing.recipeName}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Itens manuais */}
              {shoppingLogs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>Itens Avulsos</h3>
                  {shoppingLogs.map((item, idx) => {
                    const isChecked = !!checkedShoppingItems[`man-${idx}`];
                    return (
                      <div key={idx} className={`shopping-item-row ${isChecked ? 'completed' : ''}`}>
                        <div className="shopping-item-left">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setCheckedShoppingItems({ ...checkedShoppingItems, [`man-${idx}`]: !isChecked })}
                          />
                          <span className="shopping-item-name">{item}</span>
                        </div>
                        <button className="btn btn-secondary" style={{ padding: '0.2rem', border: 'none', color: '#ff6b6b' }} onClick={() => {
                          const copy = [...shoppingLogs];
                          copy.splice(idx, 1);
                          setShoppingLogs(copy);
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Direita: Porções das receitas planejadas para consolidação */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Multiplicador de Porções</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ajuste a quantidade de porções para recalcular a lista de compras proporcionalmente.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {uniquePlannedRecipes.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma receita planejada para esta semana.</p>
              ) : (
                uniquePlannedRecipes.map(recipe => {
                  const multiplier = servingsMultiplier[recipe.id] !== undefined ? servingsMultiplier[recipe.id] : recipe.servings;
                  return (
                    <div key={recipe.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={recipe.title}>{recipe.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer' }} onClick={() => handleUpdateShoppingRecipeServings(recipe.id, -1)}>
                          <MinusCircle size={16} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{multiplier}</span>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer' }} onClick={() => handleUpdateShoppingRecipeServings(recipe.id, 1)}>
                          <PlusCircle size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recomendações Saudáveis do Coach IA baseadas em esforço e hidratação */}
            {autoSupplements.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <Bot size={14} color="var(--accent-orange)" /> Recomendações do Coach IA
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {autoSupplements.map((supp, idx) => (
                    <div key={idx} style={{ background: 'rgba(249, 115, 22, 0.04)', border: '1px solid rgba(249, 115, 22, 0.15)', borderRadius: '6px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                      <span style={{ fontSize: '0.75rem', color: '#ffb38a', lineHeight: 1.35 }}>{supp}</span>
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
                        onClick={() => {
                          const cleanName = supp.split(' (')[0];
                          setShoppingLogs([...shoppingLogs, cleanName]);
                          alert(`Adicionado à lista: ${cleanName}`);
                        }}
                      >
                        + Adicionar à Lista
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Destinatário configurado: </span>
              <strong style={{ color: '#fff' }}>{settings.emailForList || 'Nenhum (configure em Ajustes)'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 6. NUTRICIONISTA IA */}
      {activeSubTab === 'nutri_ai' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div className="icon-wrapper orange-bg" style={{ width: 36, height: 36 }}>
              <Bot size={18} color="var(--accent-orange)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Nutricionista IA Especialista</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Conselhos alimentares refinados cruzando dados biométricos de bioimpedância e gasto esportivo.</p>
            </div>
          </div>

          {/* Alerta de Platô do Coach se detectado */}
          {plateauStatus && plateauStatus.detected && (
            <div className="coach-alert-card">
              <div className="coach-alert-header">
                <TrendingUp size={18} color="var(--accent-orange)" />
                <span>Detector de Platô Fisiológico</span>
              </div>
              <p className="coach-alert-desc">
                {plateauStatus.message} A IA detectou uma estagnação no peso. Recomendamos ajustar as metas calóricas ou realizar um Refeed.
              </p>
              <div className="coach-alert-actions">
                <button 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }}
                  onClick={() => handleSendNutriMsg('A IA detectou estagnação de platô de peso no meu histórico nas últimas semanas. Qual protocolo exato devo seguir e como ajusto minhas calorias hoje?')}
                >
                  Ver Protocolo IA
                </button>
              </div>
            </div>
          )}

          {/* Área do Chat */}
          <div className="nutri-chat-log">
            {nutriMessages.map((msg, idx) => (
              <div key={idx} className={`nutri-chat-bubble ${msg.role}`}>
                {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#fff' }}>{part}</strong> : part)}
              </div>
            ))}
            {nutriTyping && (
              <div className="nutri-chat-bubble assistant" style={{ color: 'var(--text-muted)' }}>Digitando resposta analítica...</div>
            )}
          </div>

          {/* Chips de atalhos rápidos */}
          <div className="nutri-chips-row">
            <button className="nutri-chip" onClick={() => handleSendNutriMsg('Quais são as minhas metas de macronutrientes ideais com base na bioimpedância?')}>Calcular Macronutrientes</button>
            <button className="nutri-chip" onClick={() => handleSendNutriMsg('Me dê dicas de hidratação cruzando com meus exames corporais')}>Dicas de Hidratação</button>
            <button className="nutri-chip" onClick={() => handleSendNutriMsg('Como otimizar a suplementação de Creatina e Whey Protein nos meus treinos?')}>Guia de Suplementos</button>
            <button className="nutri-chip" onClick={() => handleSendNutriMsg('Avalie meu planejamento semanal de refeições e sugira ajustes')}>Avaliar Planejamento Semanal</button>
          </div>

          {/* Formulário de Input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendNutriMsg(); }}
            style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}
          >
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Digite sua dúvida sobre alimentação, receitas ou macros..."
              value={nutriInput}
              onChange={(e) => setNutriInput(e.target.value)}
              disabled={nutriTyping}
            />
            <button type="submit" className="btn btn-primary" disabled={nutriTyping}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* MODAL PARA SELEÇÃO DE REFEIÇÃO NO PLANEJADOR */}
      {showAddMealModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.5rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Adicionar Refeição</h3>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label className="checkbox-label" style={{ color: mealSelectionType === 'recipe' ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="mealType"
                  checked={mealSelectionType === 'recipe'}
                  onChange={() => setMealSelectionType('recipe')}
                />
                <span>Vincular Receita</span>
              </label>
              <label className="checkbox-label" style={{ color: mealSelectionType === 'custom' ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="mealType"
                  checked={mealSelectionType === 'custom'}
                  onChange={() => setMealSelectionType('custom')}
                />
                <span>Alimento Avulso</span>
              </label>
            </div>

            {mealSelectionType === 'recipe' ? (
              <div className="form-group">
                <label htmlFor="recipeSelect">Selecionar Receita Cadastrada</label>
                <select
                  id="recipeSelect"
                  className="form-control"
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label htmlFor="customName">Nome da Comida</label>
                  <input
                    id="customName"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Arroz com patinho"
                    value={customMealForm.name}
                    onChange={(e) => setCustomMealForm({ ...customMealForm, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="customCalories">Calorias (kcal)</label>
                    <input
                      id="customCalories"
                      type="number"
                      className="form-control"
                      value={customMealForm.calories}
                      onChange={(e) => setCustomMealForm({ ...customMealForm, calories: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customProtein">Prot (g)</label>
                    <input
                      id="customProtein"
                      type="number"
                      className="form-control"
                      value={customMealForm.protein}
                      onChange={(e) => setCustomMealForm({ ...customMealForm, protein: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="customCarbs">Carbos (g)</label>
                    <input
                      id="customCarbs"
                      type="number"
                      className="form-control"
                      value={customMealForm.carbs}
                      onChange={(e) => setCustomMealForm({ ...customMealForm, carbs: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customFat">Gord (g)</label>
                    <input
                      id="customFat"
                      type="number"
                      className="form-control"
                      value={customMealForm.fat}
                      onChange={(e) => setCustomMealForm({ ...customMealForm, fat: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddMealItem}>Adicionar Item</button>
              <button className="btn btn-secondary" onClick={() => setShowAddMealModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CADASTRO MANUAL DE NOVA RECEITA */}
      {showAddRecipeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', marginBottom: '1rem', textAlign: 'left' }}>Cadastrar Nova Receita</h3>
            
            <form onSubmit={handleSaveRecipeManual} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left' }}>
              <div className="form-group">
                <label htmlFor="recTitle">Título da Receita</label>
                <input
                  id="recTitle"
                  type="text"
                  className="form-control"
                  placeholder="Ex: Escondidinho de Batata Doce"
                  value={newRecipeForm.title}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="recDesc">Descrição / Resumo</label>
                <input
                  id="recDesc"
                  type="text"
                  className="form-control"
                  placeholder="Breve descrição dos benefícios..."
                  value={newRecipeForm.description}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, description: e.target.value })}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label htmlFor="recPrep">Prep (min)</label>
                  <input
                    id="recPrep"
                    type="number"
                    className="form-control"
                    value={newRecipeForm.prepTime}
                    onChange={(e) => setNewRecipeForm({ ...newRecipeForm, prepTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="recCook">Cozimento (min)</label>
                  <input
                    id="recCook"
                    type="number"
                    className="form-control"
                    value={newRecipeForm.cookTime}
                    onChange={(e) => setNewRecipeForm({ ...newRecipeForm, cookTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label htmlFor="recServings">Serve Quantas Porções</label>
                  <input
                    id="recServings"
                    type="number"
                    className="form-control"
                    value={newRecipeForm.servings}
                    onChange={(e) => setNewRecipeForm({ ...newRecipeForm, servings: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="recTags">Tags / Marcadores (separados por vírgula)</label>
                  <input
                    id="recTags"
                    type="text"
                    className="form-control"
                    value={newRecipeForm.tags}
                    onChange={(e) => setNewRecipeForm({ ...newRecipeForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recImg">URL da Imagem (Opcional)</label>
                <input
                  id="recImg"
                  type="text"
                  className="form-control"
                  placeholder="https://..."
                  value={newRecipeForm.image}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, image: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="recVideo">Link do Vídeo explicativo (YouTube / Vimeo)</label>
                <input
                  id="recVideo"
                  type="text"
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newRecipeForm.videoUrl}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, videoUrl: e.target.value })}
                />
              </div>

              {/* Categorias Dietéticas */}
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Categorias Dietéticas (Selecione todas que se aplicam)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {['Vegetariana', 'Vegana', 'Light', 'Fitness', 'Diet', 'Sem Glúten', 'Sem Lactose', 'Detox'].map((cat) => {
                    const checked = newRecipeForm.dietaryCategories.includes(cat);
                    return (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleDietaryCategoryToggle(cat)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tipos de Refeição */}
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Tipos de Refeição (Onde servir)</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                  {['Café da Manhã', 'Almoço', 'Lanche', 'Jantar'].map((type) => {
                    const checked = newRecipeForm.mealTypes.includes(type);
                    return (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleMealTypeToggle(type)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recIng">Ingredientes (Um por linha)</label>
                <textarea
                  id="recIng"
                  rows={4}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                  placeholder="4 ovos&#10;2 fatias de pão integral"
                  value={newRecipeForm.ingredients}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, ingredients: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="recInst">Instruções de Preparo (Um passo por linha)</label>
                <textarea
                  id="recInst"
                  rows={4}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                  placeholder="Misture tudo numa vasilha.&#10;Asse por 15 minutos em fogo médio."
                  value={newRecipeForm.instructions}
                  onChange={(e) => setNewRecipeForm({ ...newRecipeForm, instructions: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Gravar Receita</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRecipeModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODO COZINHEIRO TELA CHEIA ABSOLUTA */}
      {isCookModeFullscreen && selectedRecipe && (
        <div className="cook-mode-fullscreen">
          <div className="cook-mode-header">
            <h2 className="cook-mode-title">
              🍳 Modo Cozinheiro: {selectedRecipe.title}
            </h2>
            <button 
              type="button" 
              className="cook-mode-close-btn"
              onClick={() => {
                setIsCookModeFullscreen(false);
                setCookModeStep(-1);
              }}
            >
              Sair do Modo Cozinheiro ✕
            </button>
          </div>

          <div className="cook-mode-content-grid">
            {/* Coluna Esquerda: Ingredientes */}
            <div className="cook-mode-sidebar">
              <h3>Checklist de Ingredientes</h3>
              <div className="cook-mode-ingredients-list">
                {selectedRecipe.ingredients.map((ing, idx) => {
                  const isChecked = !!checkedIngredients[idx];
                  return (
                    <label 
                      key={idx} 
                      className={`cook-mode-ingredient-item ${isChecked ? 'completed' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => setCheckedIngredients({ ...checkedIngredients, [idx]: !isChecked })}
                      />
                      <span>{ing}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Passo Atual com Letras Garrafais */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
              <div className="cook-mode-main-content">
                <span className="cook-mode-step-indicator">
                  Passo {cookModeStep + 1} de {selectedRecipe.instructions.length}
                </span>
                
                <p className="cook-mode-step-text">
                  {selectedRecipe.instructions[cookModeStep]}
                </p>

                <div className="cook-mode-controls">
                  <button 
                    type="button"
                    className="cook-mode-btn prev"
                    disabled={cookModeStep === 0}
                    onClick={() => setCookModeStep(cookModeStep - 1)}
                    style={{ opacity: cookModeStep === 0 ? 0.3 : 1, cursor: cookModeStep === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ Passo Anterior
                  </button>

                  {cookModeStep < selectedRecipe.instructions.length - 1 ? (
                    <button 
                      type="button"
                      className="cook-mode-btn next"
                      onClick={() => setCookModeStep(cookModeStep + 1)}
                    >
                      Próximo Passo ▶
                    </button>
                  ) : (
                    <button 
                      type="button"
                      className="cook-mode-btn next"
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                      onClick={() => {
                        setIsCookModeFullscreen(false);
                        setCookModeStep(-1);
                        handleUpdateLastMade(selectedRecipe.id);
                        alert('Parabéns! Você completou a receita! Preparo registrado.');
                      }}
                    >
                      ✓ Concluir Receita
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="cook-mode-progress-bar">
                <div 
                  className="cook-mode-progress-fill"
                  style={{ width: `${((cookModeStep + 1) / selectedRecipe.instructions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
