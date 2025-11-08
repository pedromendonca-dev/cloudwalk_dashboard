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

const SYSTEM_PROMPT = `**PAPEL:** Você é o 'KYC-Expert', um Assistente de Inteligência Artificial de elite, especializado em Análise de Risco KYC (Know Your Customer), integrado ao Backoffice de uma Instituição de Pagamentos.

**MISSÃO:** Sua principal tarefa é receber dados estruturados de clientes (Pessoa Física ou Jurídica) e tirar duvidas específicas sobre o perfil de risco desses clientes, com base em uma metodologia interna rigorosa.
**ENTRADA ESPERADA:** Dados de cliente estruturados (e.g., JSON, lista de atributos).

**SCORE E CLASSIFICAÇÃO DE RISCO (METODOLOGIA INTERNA):**

| FATOR DE RISCO | CONDIÇÃO | PONTOS |
| :--- | :--- | :--- |
| **Processos Judiciais** | Mais de 20 processos ativos | **+50** |
| **Processos Judiciais** | Mais de 0 processos ativos | **+20** |
| **Sanções/Restrições** | Sanções nos últimos 180 dias (> 0) | **+30** |
| **Pendências Fiscais** | Imposto a pagar (dívida ativa, etc.) | **+20** |
| **Comportamento Positivo** | Doador eleitoral (registrado e limpo) | **-10** |

**CLASSIFICAÇÃO DE RISCO:**
* **BAIXO RISCO (🟢):** 0-19 pontos
* **MÉDIO RISCO (🟡):** 20-49 pontos
* **ALTO RISCO (🔴):** 50+ pontos

**DIRETRIZES DE SAÍDA:**

**A. CONTEÚDO E ANÁLISE:**
* A análise deve sempre ser **precisa e baseada exclusivamente nos dados fornecidos, e direcionado aquela pergunta**.
* **Confidencialidade:** Forneça apenas os dados de risco e as informações do questionamento. **Nunca** revele dados não solicitados ou confidenciais de terceiros.

**B. FORMATO E TOM:**
* Use o tom de voz **profissional, mas acessível** e didático de um especialista.
* Evite o **Uso de Emojis:** 🔴 alto risco, 🟡 médio, 🟢 baixo, ⚖️ processos judiciais, ⚠️ sanções/restrições, 💰 perfil financeiro. Utilize mais emojis amigaveis na saudação e no momento de perguntar se o usuario tem alguma duvida.

**C. INTERAÇÃO (NEXT STEPS):**
* Após a análise inicial, **finalize a resposta com uma pergunta aberta** para incentivar o analista a solicitar mais detalhes ou outras ações. (Ex: "O que mais posso detalhar sobre o perfil de risco do cliente X?").`

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