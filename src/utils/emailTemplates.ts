// Templates de e-mail transacional. Módulo puro (sem dependências de browser/DOM) para
// poder ser importado tanto pelo app React (envio manual) quanto pelo Cloudflare Worker
// (cron diário às 06:00) sem duplicar o HTML em dois lugares.

export interface EmailMealItem {
  recipeId?: string;
  customName?: string;
  calories?: number;
  [key: string]: any;
}

export interface EmailMeal {
  id: string;
  name: string;
  items: EmailMealItem[];
}

export interface EmailMealPlan {
  meals: EmailMeal[];
  [key: string]: any;
}

export interface EmailRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  calories?: number;
  [key: string]: any;
}

const FONT = `'Helvetica Neue', Helvetica, Arial, sans-serif`;

const MEAL_ACCENTS: Record<string, { emoji: string; color: string; chipBg: string }> = {
  breakfast: { emoji: '🌅', color: '#fbbf24', chipBg: '#2b220f' },
  lunch: { emoji: '☀️', color: '#34d399', chipBg: '#122a20' },
  snack: { emoji: '🍇', color: '#c084fc', chipBg: '#22192e' },
  dinner: { emoji: '🌙', color: '#818cf8', chipBg: '#191d30' },
};
const DEFAULT_ACCENT = { emoji: '🍽️', color: '#f97316', chipBg: '#2a1c10' };

export function buildDailyDietEmailHtml(dateStr: string, plan: EmailMealPlan, recipes: EmailRecipe[], userName: string): string {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDateLong = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedDatePill = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase();

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  const orderedMeals = [...(plan.meals || [])].sort((a, b) => mealOrder.indexOf(a.id) - mealOrder.indexOf(b.id));

  let totalCalories = 0;
  const previewParts: string[] = [];
  let mealsHtml = '';

  orderedMeals.forEach(meal => {
    if (!meal.items || meal.items.length === 0) return;
    const accent = MEAL_ACCENTS[meal.id] || DEFAULT_ACCENT;

    let itemsHtml = '';
    meal.items.forEach(item => {
      const recipe = item.recipeId ? recipes.find(r => r.id === item.recipeId) : null;
      const itemCalories = item.calories || recipe?.calories || 0;
      totalCalories += itemCalories;

      if (recipe) {
        previewParts.push(recipe.title);
        const ingredientsList = (recipe.ingredients || [])
          .map(ing => `<li style="margin-bottom:6px; color:#9ca3af; font-size:13px; line-height:1.5; font-family:${FONT};">${ing}</li>`)
          .join('');
        const instructionsList = (recipe.instructions || [])
          .map(inst => `<li style="margin-bottom:8px; color:#9ca3af; font-size:13px; line-height:1.6; font-family:${FONT};">${inst}</li>`)
          .join('');

        itemsHtml += `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181a26" style="background-color:#181a26; border:1px solid #282a3c; border-radius:12px; margin-bottom:14px;">
          <tr>
            <td style="padding:20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:1px solid #282a3c; padding-bottom:12px; margin-bottom:12px;">
                <tr>
                  <td style="color:#ffffff; font-size:15px; font-weight:700; text-align:left; vertical-align:middle; font-family:${FONT};">🍳&nbsp; ${recipe.title}</td>
                  <td style="text-align:right; width:90px; vertical-align:middle;">
                    <span style="background-color:rgba(249,115,22,0.15); color:#f97316; font-size:11px; font-weight:700; padding:4px 10px; border-radius:9999px; border:1px solid rgba(249,115,22,0.3); font-family:${FONT}; white-space:nowrap;">${itemCalories} kcal</span>
                  </td>
                </tr>
              </table>
              ${recipe.description ? `<p style="margin:0 0 16px 0; color:#9ca3af; font-size:13px; font-style:italic; line-height:1.5; font-family:${FONT};">${recipe.description}</p>` : ''}
              ${ingredientsList ? `
              <div style="margin-bottom:14px;">
                <p style="margin:0 0 8px 0; color:#ffffff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; font-family:${FONT};">Ingredientes</p>
                <ul style="margin:0; padding-left:18px;">${ingredientsList}</ul>
              </div>` : ''}
              ${instructionsList ? `
              <div>
                <p style="margin:0 0 8px 0; color:#ffffff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; font-family:${FONT};">Modo de Preparo</p>
                <ol style="margin:0; padding-left:18px;">${instructionsList}</ol>
              </div>` : ''}
            </td>
          </tr>
        </table>`;
      } else {
        const label = item.customName || 'Alimento Avulso';
        previewParts.push(label);
        itemsHtml += `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#131520" style="background-color:#131520; border:1px dashed #282a3c; border-radius:10px; margin-bottom:10px;">
          <tr>
            <td style="padding:14px 18px; color:#ffffff; font-size:13px; font-weight:600; text-align:left; font-family:${FONT};">🍎&nbsp; ${label}</td>
            <td style="padding:14px 18px; text-align:right; width:90px;">
              <span style="background-color:#181a26; color:#9ca3af; font-size:11px; font-weight:700; padding:4px 10px; border-radius:9999px; border:1px solid #282a3c; font-family:${FONT}; white-space:nowrap;">${itemCalories} kcal</span>
            </td>
          </tr>
        </table>`;
      }
    });

    mealsHtml += `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-bottom:1px solid #1f2232; padding-bottom:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
            <tr>
              <td width="32" height="32" bgcolor="${accent.chipBg}" style="background-color:${accent.chipBg}; border-radius:8px; text-align:center; vertical-align:middle; font-size:15px; line-height:32px; mso-line-height-rule:exactly;">${accent.emoji}</td>
              <td style="padding-left:10px; color:#ffffff; font-size:15px; font-weight:700; letter-spacing:0.3px; vertical-align:middle; font-family:${FONT};">${meal.name}</td>
            </tr>
          </table>
          ${itemsHtml}
        </td>
      </tr>
    </table>`;
  });

  if (!mealsHtml) {
    mealsHtml = `<p style="color:#535868; font-style:italic; text-align:center; padding:20px 0; font-family:${FONT};">Nenhuma refeição planejada para hoje.</p>`;
  }

  const preheaderText = previewParts.length > 0
    ? `${previewParts.slice(0, 3).join(' • ')}${totalCalories > 0 ? ` — ${totalCalories} kcal planejadas` : ''}`
    : 'Seu cardápio de hoje está pronto para consulta.';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Cardápio de Hoje - Vida Saudável</title>
<!--[if mso]>
<style type="text/css">
  table, td { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#090b11; -webkit-font-smoothing:antialiased;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:#090b11;">
    ${preheaderText}${'&nbsp;&zwnj;'.repeat(40)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#090b11" style="background-color:#090b11;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#131520" style="background-color:#131520; border-radius:16px; overflow:hidden; max-width:600px; width:100%; border:1px solid #1f2232;">

          <tr>
            <td bgcolor="#ea580c" style="background:linear-gradient(135deg,#f97316,#ea580c); background-color:#ea580c; padding:36px 40px; text-align:center;">
              <p style="margin:0 0 10px 0; color:#ffedd5; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; font-family:${FONT};">Painel Diário</p>
              <h1 style="margin:0 0 6px 0; color:#ffffff; font-size:26px; font-weight:800; letter-spacing:0.5px; font-family:${FONT};">Vida Saudável</h1>
              <p style="margin:0 0 20px 0; color:#ffedd5; font-size:13px; font-weight:500; font-family:${FONT};">${formattedDatePill}</p>
              ${totalCalories > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td bgcolor="#c2410c" style="background-color:rgba(0,0,0,0.18); border:1px solid rgba(255,255,255,0.3); border-radius:9999px; padding:8px 18px;">
                    <span style="color:#ffffff; font-size:13px; font-weight:700; font-family:${FONT}; white-space:nowrap;">🔥 ${totalCalories} kcal planejadas para hoje</span>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <p style="margin:0 0 6px 0; color:#ffffff; font-size:17px; font-weight:700; font-family:${FONT};">Bom dia, ${userName} 👋</p>
              <p style="margin:0 0 28px 0; color:#9ca3af; font-size:14px; line-height:1.6; font-family:${FONT};">
                Aqui está o seu planejamento alimentar para <strong style="color:#e5e7eb;">${formattedDateLong}</strong>, com ingredientes e modo de preparo prontos para consulta.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              ${mealsHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:12px 40px 40px 40px; text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td bgcolor="#ea580c" style="background:linear-gradient(135deg,#f97316,#ea580c); background-color:#ea580c; border-radius:10px;">
                    <a href="https://vidasaudavel.posologia.app" target="_blank" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.6px; font-family:${FONT};">Acessar Painel Vida Saudável</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#0e0f17" style="background-color:#0e0f17; padding:24px 40px; text-align:center; border-top:1px solid #1f2232;">
              <p style="margin:0 0 6px 0; color:#535868; font-size:11px; font-family:${FONT};">Você recebeu este e-mail porque ativou o envio diário do cardápio em Ajustes.</p>
              <p style="margin:0; color:#3f4351; font-size:11px; font-family:${FONT};">Vida Saudável © ${dateObj.getFullYear()}. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
