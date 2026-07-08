export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // Intercepta chamadas de e-mail e encaminha para a API do Resend de forma transparente
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
        // Copia a requisição e envia diretamente para o Resend de servidor para servidor (sem restrição de CORS)
        const resendRequest = new Request('https://api.resend.com/emails', {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        const response = await fetch(resendRequest);
        
        // Retorna a resposta com cabeçalhos de CORS habilitados
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

    // Caso contrário, serve os assets estáticos do aplicativo (SPA)
    return env.ASSETS.fetch(request);
  }
};
