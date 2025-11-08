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

  const { message, clientData } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem não fornecida' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API Key não configurada'
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
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
            content: `Aqui estão os dados dos clientes:\n\n${JSON.stringify(clientData, null, 2)}\n\nPergunta do usuário: ${message}\n\nPor favor, analise os dados e responda de forma clara e profissional.`
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error('Erro da API Anthropic:', data);
      return res.status(anthropicResponse.status).json({ 
        error: data.error?.message || 'Erro ao chamar API do Claude',
        details: data
      });
    }

    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      return res.status(500).json({ 
        error: 'Resposta inválida da API'
      });
    }

    const textContent = data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    return res.status(200).json({ 
      success: true,
      content: textContent
    });

  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ 
      error: error.message
    });
  }
}