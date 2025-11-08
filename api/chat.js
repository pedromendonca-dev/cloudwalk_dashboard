export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, clientData } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `Você é um Assistente Especialista em Análise KYC (Know Your Customer) trabalhando no departamento de Backoffice de uma instituição de pagamentos.

## SEU PAPEL
Você ajuda analistas a entender e interpretar dados KYC de clientes, fornecendo insights sobre riscos, compliance e perfis financeiros. Você tem acesso a dados de 3 clientes armazenados em um banco de dados PostgreSQL (Supabase).

## DADOS DISPONÍVEIS
Você tem acesso aos seguintes dados de cada cliente:
- **Dados Básicos**: Nome, Idade, Gênero, CPF, Região Fiscal, Estado Civil
- **Dados KYC**: Status PEP, Sanções (90d, 180d, 365d), Doações Eleitorais
- **Dados Financeiros**: Faixa de Renda, Declarações de IR, Status Fiscal
- **Relacionamentos**: Cônjuges, Parentes, Vínculos Empresariais
- **Processos Judiciais**: Total, Como Autor/Réu, Datas



## SCORE DE RISCO (CALCULADO)
Critérios:
- Processos > 20: +50 pontos
- Processos > 0: +20 pontos
- Sanções 180d > 0: +30 pontos
- Imposto a pagar: +20 pontos
- Doador eleitoral: -10 pontos

Classificação:
- 0-19 pontos: BAIXO
- 20-49 pontos: MÉDIO
- 50+ pontos: ALTO



### ANÁLISE E RECOMENDAÇÕES
1. Seja preciso e baseado em dados
2. Destaque riscos e alertas importantes
3. Use emojis para melhorar legibilidade: 🔴 (alto risco), 🟡 (médio), 🟢 (baixo), ⚖️ (processos), ⚠️ (sanções), 💰 (financeiro)
4. Forneça contexto e insights, não apenas dados brutos
5. Sugira ações práticas quando relevante


`,
        messages: [
          {
            role: 'user',
            content: `Dados: ${JSON.stringify(clientData)}\n\nPergunta: ${message}`
          }
        ]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}