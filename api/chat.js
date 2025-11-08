export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔍 [DEBUG] Requisição recebida');
  console.log('🔍 [DEBUG] Body:', JSON.stringify(req.body).substring(0, 100));

  const { message, clientData } = req.body;

  // Validar dados de entrada
  if (!message) {
    console.log('❌ [ERROR] Mensagem não fornecida');
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }

  // Verificar se a API Key está configurada
  const apiKey = process.env.CLAUDE_API_KEY;
  console.log('🔍 [DEBUG] API Key presente?', !!apiKey);
  console.log('🔍 [DEBUG] API Key prefix:', apiKey ? apiKey.substring(0, 15) + '...' : 'UNDEFINED');

  if (!apiKey) {
    console.log('❌ [ERROR] API Key não configurada');
    return res.status(500).json({ 
      error: 'API Key do Claude não configurada',
      details: 'Configure CLAUDE_API_KEY nas Environment Variables do Vercel'
    });
  }

  const SYSTEM_PROMPT = `Você é um Assistente Especialista em Análise KYC (Know Your Customer) trabalhando no departamento de Backoffice de uma instituição de pagamentos.

Você ajuda analistas a entender e interpretar dados KYC de clientes, fornecendo insights sobre riscos, compliance e perfis financeiros.

SCORE DE RISCO:
- Processos > 20: +50 pontos | Processos > 0: +20 pontos
- Sanções 180d > 0: +30 pontos | Imposto a pagar: +20 pontos | Doador eleitoral: -10 pontos
Classificação: 0-19 (BAIXO 🟢), 20-49 (MÉDIO 🟡), 50+ (ALTO 🔴)

DIRETRIZES:
- Seja preciso e baseado nos dados
- Use emojis: 🔴 alto risco, 🟡 médio, 🟢 baixo, ⚖️ processos, ⚠️ sanções, 💰 financeiro
- Use markdown para formatação
- Forneça insights, não apenas dados
- Sugira ações práticas
- Seja profissional mas acessível`;

  try {
    console.log('📤 [DEBUG] Enviando para Claude API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Aqui estão os dados dos clientes:\n\n${JSON.stringify(clientData, null, 2).substring(0, 500)}...\n\nPergunta: ${message}`
          }
        ]
      })
    });

    console.log('📥 [DEBUG] Status da resposta:', response.status);

    const data = await response.json();
    console.log('📥 [DEBUG] Resposta recebida:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error('❌ [ERROR] Erro da API Claude:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Erro ao chamar API do Claude',
        details: data,
        statusCode: response.status
      });
    }

    // Verificar estrutura da resposta
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('❌ [ERROR] Resposta sem content:', data);
      return res.status(500).json({ 
        error: 'Resposta inválida da API',
        details: 'Content não encontrado',
        receivedData: data
      });
    }

    // Extrair texto
    const textContent = data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    console.log('✅ [SUCCESS] Texto extraído:', textContent.substring(0, 100));

    return res.status(200).json({ 
      success: true,
      content: textContent || 'Resposta vazia'
    });

  } catch (error) {
    console.error('❌ [ERROR] Exception:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Erro ao processar requisição',
      stack: error.stack
    });
  }
}