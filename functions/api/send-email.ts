export async function onRequestPost(context: any) {
  const { request } = context;
  try {
    const body: any = await request.json();
    const { from, to, subject, text, apiKey } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave de API do Resend não configurada nas configurações do sistema.' }), 
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Dispara a requisição server-side diretamente para a API oficial do Resend (sem problemas de CORS)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text
      })
    });

    const resText = await res.text();
    
    // Retorna a resposta do Resend de volta para o cliente
    return new Response(resText, {
      status: res.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
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

// Suporte para requisições de preflight OPTIONS se necessário
export async function onRequestOptions() {
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
