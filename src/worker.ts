import { buildDailyDietEmailHtml } from './utils/emailTemplates';

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
