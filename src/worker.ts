function deserializeFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return {};
  const res: any = {};
  
  function parseValue(val: any): any {
    if (!val) return null;
    if ('stringValue' in val) return val.stringValue;
    if ('integerValue' in val) return parseInt(val.integerValue, 10);
    if ('doubleValue' in val) return parseFloat(val.doubleValue);
    if ('booleanValue' in val) return val.booleanValue;
    if ('arrayValue' in val) {
      return (val.arrayValue.values || []).map(parseValue);
    }
    if ('mapValue' in val) {
      const mapRes: any = {};
      const fields = val.mapValue.fields || {};
      for (const k in fields) {
        mapRes[k] = parseValue(fields[k]);
      }
      return mapRes;
    }
    return null;
  }

  for (const k in doc.fields) {
    res[k] = parseValue(doc.fields[k]);
  }
  
  return res;
}

function buildDailyDietEmailHtml(dateStr: string, plan: any, recipes: any[], userName: string): string {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  let mealsHtml = '';
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  const orderedMeals = [...(plan.meals || [])].sort((a, b) => mealOrder.indexOf(a.id) - mealOrder.indexOf(b.id));

  orderedMeals.forEach(meal => {
    if (!meal.items || meal.items.length === 0) return;

    let itemsHtml = '';
    meal.items.forEach((item: any) => {
      const recipe = item.recipeId ? recipes.find((r: any) => r.id === item.recipeId) : null;

      if (recipe) {
        const ingredientsList = (recipe.ingredients || []).map((ing: string) => `<li style="margin-bottom: 4px; color: #4b5563;">${ing}</li>`).join('');
        const instructionsList = (recipe.instructions || []).map((inst: string) => `<li style="margin-bottom: 6px; color: #4b5563; line-height: 1.5;">${inst}</li>`).join('');

        itemsHtml += `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 8px;">
              <h4 style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 700;">🍳 ${recipe.title}</h4>
              <span style="background-color: #ffedd5; color: #ea580c; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">${item.calories || recipe.calories || 0} Kcal</span>
            </div>
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; font-style: italic;">${recipe.description || ''}</p>
            
            <div style="margin-bottom: 12px;">
              <h5 style="margin: 0 0 6px 0; color: #374151; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Ingredientes</h5>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                ${ingredientsList}
              </ul>
            </div>

            <div>
              <h5 style="margin: 0 0 6px 0; color: #374151; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Modo de Preparo</h5>
              <ol style="margin: 0; padding-left: 20px; font-size: 13px;">
                ${instructionsList}
              </ol>
            </div>
          </div>
        `;
      } else {
        itemsHtml += `
          <div style="background-color: #fcfcfc; border: 1px dashed #e5e7eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #374151; font-size: 13px; font-weight: 600;">🍎 ${item.customName || 'Alimento Avulso'}</span>
            <span style="background-color: #f3f4f6; color: #4b5563; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">${item.calories || 0} Kcal</span>
          </div>
        `;
      }
    });

    mealsHtml += `
      <div style="margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #ea580c; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">🍽️ ${meal.name}</h3>
        ${itemsHtml}
      </div>
    `;
  });

  if (!mealsHtml) {
    mealsHtml = `<p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px 0;">Nenhuma refeição planejada para hoje.</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cardápio de Hoje - Vida Saudável</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px 40px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VIDA SAUDÁVEL</h1>
          <h2 style="margin: 0; color: #ffedd5; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Seu Cardápio Diário</h2>
        </div>
        <div style="padding: 40px;">
          <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.5; font-weight: 500;">
            Olá, <strong>${userName}</strong>!
          </p>
          <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
            Aqui está o seu planejamento alimentar completo para hoje, <strong>${formattedDate}</strong>:
          </p>
          ${mealsHtml}
          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="margin: 0; color: #f97316; font-size: 14px; font-weight: 700;">💪 Foco na dieta e bons treinos hoje!</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af;">
          <p style="margin: 0 0 4px 0;">Vida Saudável © 2026. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function handleDailyEmailsCron(_env: any) {
  const projectId = 'vidasaudavel-3ee67';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/registered_daily_emails`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Erro ao carregar registros de email diário do Firestore:', await res.text());
      return;
    }
    
    const data: any = await res.json();
    if (!data.documents || data.documents.length === 0) return;

    for (const doc of data.documents) {
      const fields = deserializeFirestoreDoc(doc);
      if (!fields.dailyEmailEnabled || !fields.email || !fields.resendApiKey) {
        continue;
      }

      const { uid, email, resendApiKey, resendFromEmail, dailyEmailTime, timezone, lastSentDate } = fields;
      const emailTime = dailyEmailTime || '06:00';
      const userTz = timezone || 'America/Sao_Paulo';

      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(new Date());
      const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
      const todayDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`; // YYYY-MM-DD
      
      if (lastSentDate === todayDateStr) {
        continue;
      }

      const [schedHour, schedMin] = emailTime.split(':').map(Number);
      const curHour = Number(partMap.hour);
      const curMin = Number(partMap.minute);

      if (curHour < schedHour || (curHour === schedHour && curMin < schedMin)) {
        continue;
      }

      let userName = 'Atleta';
      try {
        const settingsRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/settings/general`);
        if (settingsRes.ok) {
          const settingsDoc = await settingsRes.json();
          const sFields = deserializeFirestoreDoc(settingsDoc);
          userName = sFields.userName || 'Atleta';
        }
      } catch (e) {
        console.warn('Erro ao obter settings do usuario:', e);
      }

      let mealPlan = null;
      try {
        const planRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/meal_plans/${todayDateStr}`);
        if (planRes.ok) {
          const planDoc = await planRes.json();
          mealPlan = deserializeFirestoreDoc(planDoc);
        }
      } catch (e) {
        console.warn(`Erro ao carregar cardápio de hoje (${todayDateStr}):`, e);
      }

      if (!mealPlan || !mealPlan.meals || mealPlan.meals.every((m: any) => !m.items || m.items.length === 0)) {
        continue;
      }

      let recipes = [] as any[];
      try {
        const recipesRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/recipes`);
        if (recipesRes.ok) {
          const recipesData = await recipesRes.json();
          if (recipesData.documents) {
            recipes = recipesData.documents.map((d: any) => deserializeFirestoreDoc(d));
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar receitas:', e);
      }

      const emailSubject = `Vida Saudável 🍽️ - Cardápio de Hoje: ${partMap.day}/${partMap.month}/${partMap.year}`;
      const fromEmail = resendFromEmail || 'onboarding@resend.dev';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `Vida Saudável <${fromEmail}>`;
      const emailHtml = buildDailyDietEmailHtml(todayDateStr, mealPlan, recipes, userName);

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: formattedFrom,
          to: email,
          subject: emailSubject,
          text: `Olá ${userName}! Aqui está seu cardápio de hoje.`,
          html: emailHtml
        })
      });

      if (resendRes.ok) {
        console.log(`E-mail enviado com sucesso para ${email} (UID: ${uid})`);
        
        const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/registered_daily_emails/${uid}?updateMask.fieldPaths=lastSentDate`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              lastSentDate: { stringValue: todayDateStr }
            }
          })
        });
      } else {
        console.warn(`Falha ao enviar e-mail via Resend para ${email}:`, await resendRes.text());
      }
    }
  } catch (err) {
    console.error('Erro na execução do Cron de e-mail diário:', err);
  }
}

export default {
  async fetch(request: Request, env: any, _ctx: any) {
    const url = new URL(request.url);

    if (url.pathname === '/api/send-email') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      try {
        const resendRequest = new Request('https://api.resend.com/emails', {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        const response = await fetch(resendRequest);
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || String(err) }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: any, env: any, ctx: any) {
    ctx.waitUntil(handleDailyEmailsCron(env));
  }
};
