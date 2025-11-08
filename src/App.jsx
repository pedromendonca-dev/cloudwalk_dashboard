import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, FileText, DollarSign, Award, Send, Bot, User, Sparkles, Database, LayoutDashboard, MessageSquare, Menu, X } from 'lucide-react';

const SUPABASE_URL = 'https://jhiybwxegogdqjyljvoy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaXlid3hlZ29nZHFqeWxqdm95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzIxMzcsImV4cCI6MjA3ODEwODEzN30.7GLtLbwx4vLIXMC5DjfDVqrqC9-_x0PPiRSCqZhUk4Y';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

const SUGGESTED_QUESTIONS = [
  "Quais clientes apresentam maior risco?",
  "Mostre o perfil completo da Sarah Johnson Silva",
  "Quem tem processos judiciais?",
  "Análise as sanções dos clientes",
  "Quem tem imposto a pagar em 2024?",
  "Compare os perfis familiares dos clientes"
];

// Dashboard Component
function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/kyc_data?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!response.ok) throw new Error('Erro ao carregar dados');

      const data = await response.json();
      const processedClients = data.map(item => {
        const clientData = item.client_data.Result[0];
        return {
          id: item.id,
          nome: clientData.BasicData.Name,
          idade: clientData.BasicData.Age,
          genero: clientData.BasicData.Gender,
          cpf: clientData.BasicData.TaxIdNumber,
          regiao: clientData.BasicData.TaxIdFiscalRegion,
          processos: clientData.Processes?.TotalLawsuits || 0,
          sancoes90d: clientData.KycData.Last90DaysSanctions,
          sancoes180d: clientData.KycData.Last180DaysSanctions,
          sancionadoAtual: clientData.KycData.IsCurrentlySanctioned,
          doadorEleitoral: clientData.KycData.IsCurrentlyElectoralDonor,
          conjuges: clientData.RelatedPeople.TotalSpouses,
          parentes: clientData.RelatedPeople.TotalRelatives,
          rendaEstimada: clientData.FinancialData.IncomeEstimates?.BIGDATA_V2 || 'N/A',
          estadoCivil: clientData.BasicData.MaritalStatusData?.MaritalStatus || 'Não informado',
          impostoAPagar: clientData.FinancialData.TaxReturns?.some(t => 
            t.Year === '2024' && t.Status.includes('IMPOSTO A PAGAR')
          ) || false
        };
      });

      setClients(processedClients);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    const totalClients = clients.length;
    const clientsWithLawsuits = clients.filter(c => c.processos > 0).length;
    const clientsWithSanctions = clients.filter(c => c.sancoes180d > 0).length;
    const electoralDonors = clients.filter(c => c.doadorEleitoral).length;
    const highRisk = clients.filter(c => getRiskScore(c) >= 50).length;
    const taxPending = clients.filter(c => c.impostoAPagar).length;

    return { totalClients, clientsWithLawsuits, clientsWithSanctions, electoralDonors, highRisk, taxPending };
  };

  const getRegionData = () => {
    const regionCount = {};
    clients.forEach(c => {
      regionCount[c.regiao] = (regionCount[c.regiao] || 0) + 1;
    });
    return Object.entries(regionCount).map(([name, value]) => ({ name, value }));
  };

  const getAgeDistribution = () => {
    const ranges = { '20-30': 0, '31-40': 0, '41-50': 0, '51-60': 0, '60+': 0 };
    clients.forEach(c => {
      if (c.idade <= 30) ranges['20-30']++;
      else if (c.idade <= 40) ranges['31-40']++;
      else if (c.idade <= 50) ranges['41-50']++;
      else if (c.idade <= 60) ranges['51-60']++;
      else ranges['60+']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  };

  const getRiskScore = (client) => {
    let score = 0;
    if (client.processos > 20) score += 50;
    else if (client.processos > 0) score += 20;
    if (client.sancoes180d > 0) score += 30;
    if (client.impostoAPagar) score += 20;
    if (client.doadorEleitoral) score -= 10;
    return Math.max(0, score);
  };

  const getRiskLevel = (score) => {
    if (score >= 50) return { label: 'ALTO', color: 'text-red-600 bg-red-100' };
    if (score >= 20) return { label: 'MÉDIO', color: 'text-yellow-600 bg-yellow-100' };
    return { label: 'BAIXO', color: 'text-green-600 bg-green-100' };
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.cpf.includes(searchTerm);
    const matchesFilter = filter === 'all' ||
                         (filter === 'risk' && getRiskScore(client) >= 50) ||
                         (filter === 'lawsuits' && client.processos > 0) ||
                         (filter === 'sanctions' && client.sancoes180d > 0);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Carregando dados KYC...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
          <h3 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar dados</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Dashboard KYC</h1>
          <p className="text-slate-600">Análise Completa de Clientes - Backoffice</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <MetricCard icon={Users} label="Total Clientes" value={metrics.totalClients} color="blue" />
          <MetricCard icon={AlertTriangle} label="Alto Risco" value={metrics.highRisk} color="red" />
          <MetricCard icon={FileText} label="Com Processos" value={metrics.clientsWithLawsuits} color="orange" />
          <MetricCard icon={AlertTriangle} label="Sanções 180d" value={metrics.clientsWithSanctions} color="yellow" />
          <MetricCard icon={Award} label="Doadores" value={metrics.electoralDonors} color="purple" />
          <MetricCard icon={DollarSign} label="Imposto 2024" value={metrics.taxPending} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Região</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getRegionData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getRegionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuição por Faixa Etária</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getAgeDistribution()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 flex-wrap">
              {['all', 'risk', 'lawsuits', 'sanctions'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'risk' ? 'Alto Risco' : f === 'lawsuits' ? 'Com Processos' : 'Com Sanções'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Idade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Região</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Processos</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Sanções 180d</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Renda</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Score Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredClients.map((client) => {
                  const riskScore = getRiskScore(client);
                  const riskLevel = getRiskLevel(riskScore);
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{client.nome}</p>
                          <p className="text-sm text-slate-500">{client.cpf}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{client.idade}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {client.regiao}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {client.processos > 0 ? (
                          <span className="text-red-600 font-bold">{client.processos}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.sancoes180d > 0 ? (
                          <span className="text-yellow-600 font-bold">{client.sancoes180d}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{client.rendaEstimada}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskLevel.color}`}>
                            {riskLevel.label}
                          </span>
                          <span className="text-slate-500 text-sm">{riskScore}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: 'border-blue-500 text-blue-500',
    red: 'border-red-500 text-red-500',
    orange: 'border-orange-500 text-orange-500',
    yellow: 'border-yellow-500 text-yellow-500',
    purple: 'border-purple-500 text-purple-500',
    green: 'border-green-500 text-green-500'
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${colorMap[color]} hover:shadow-lg transition-shadow`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-8 h-8 ${colorMap[color].split(' ')[1]}`} />
        </div>
        <p className="text-slate-600 text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// Chatbot Component
function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Olá! Sou seu assistente KYC. Posso ajudá-lo a analisar os dados dos clientes, identificar riscos e fornecer recomendações de compliance.\n\n**Experimente perguntas como:**\n- Quais clientes têm maior risco?\n- Análise o perfil da Sarah\n- Quem tem sanções recentes?\n\nO que gostaria de saber?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSupabaseData = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/kyc_data?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do Supabase');
      }

      return await response.json();
    } catch (err) {
      throw new Error(`Erro ao conectar ao banco de dados: ${err.message}`);
    }
  };

  // Função auxiliar para calcular risco
  const calcularRisco = (clientData) => {
    let score = 0;
    const processos = clientData.Processes?.TotalLawsuits || 0;
    const sancoes180d = clientData.KycData.Last180DaysSanctions;
    const impostoAPagar = clientData.FinancialData.TaxReturns?.some(t => 
      t.Year === '2024' && t.Status.includes('IMPOSTO A PAGAR')
    );
    const doadorEleitoral = clientData.KycData.IsCurrentlyElectoralDonor;
    
    if (processos > 20) score += 50;
    else if (processos > 0) score += 20;
    if (sancoes180d > 0) score += 30;
    if (impostoAPagar) score += 20;
    if (doadorEleitoral) score -= 10;
    
    return Math.max(0, score);
  };

  const sendToClaudeAPI = async (userMessage, clientData) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          clientData: clientData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao chamar API');
      }

      return data.content;
      
    } catch (err) {
      throw new Error(`Erro: ${err.message}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Buscar dados brutos do Supabase
      const rawData = await fetchSupabaseData();
      
      // 🎯 PROCESSAR os dados antes de enviar ao Claude
      const processedClients = rawData.map(item => {
        const clientData = item.client_data.Result[0];
        return {
          nome: clientData.BasicData.Name,
          idade: clientData.BasicData.Age,
          genero: clientData.BasicData.Gender, // 👈 AGORA TEM GÊNERO!
          cpf: clientData.BasicData.TaxIdNumber,
          regiao: clientData.BasicData.TaxIdFiscalRegion,
          statusCPF: clientData.BasicData.TaxIdStatus,
          estadoCivil: clientData.BasicData.MaritalStatusData?.MaritalStatus || 'Não informado',
          
          // KYC
          processos: clientData.Processes?.TotalLawsuits || 0,
          sancoes90d: clientData.KycData.Last90DaysSanctions,
          sancoes180d: clientData.KycData.Last180DaysSanctions,
          sancoes365d: clientData.KycData.Last365DaysSanctions,
          sancionadoAtual: clientData.KycData.IsCurrentlySanctioned,
          isPEP: clientData.KycData.IsCurrentlyPEP,
          doadorEleitoral: clientData.KycData.IsCurrentlyElectoralDonor,
          totalDoacoes: clientData.KycData.TotalElectoralDonations,
          
          // Financeiro
          rendaEstimada: clientData.FinancialData.IncomeEstimates?.BIGDATA_V2 || 'N/A',
          totalAtivos: clientData.FinancialData.TotalAssets || 'N/A',
          declaracoesIR: clientData.FinancialData.TaxReturns?.map(t => ({
            ano: t.Year,
            status: t.Status,
            banco: t.Bank || 'N/A'
          })) || [],
          impostoAPagar: clientData.FinancialData.TaxReturns?.some(t => 
            t.Year === '2024' && t.Status.includes('IMPOSTO A PAGAR')
          ) || false,
          
          // Relacionamentos
          conjuges: clientData.RelatedPeople.TotalSpouses,
          parentes: clientData.RelatedPeople.TotalRelatives,
          familiares: clientData.RelatedPeople.PersonalRelationships?.map(r => ({
            tipo: r.RelationshipType,
            nome: r.RelatedEntityName
          })) || [],
          
          // Profissional
          empregos: clientData.BusinessRelationships?.TotalEmployments || 0,
          
          // Score de Risco (calculado)
          scoreRisco: calcularRisco(clientData)
        };
      });

      // Enviar dados PROCESSADOS ao Claude
      const assistantResponse = await sendToClaudeAPI(userMessage, processedClients);
      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **Erro**: ${err.message}\n\n**Nota**: Certifique-se de que sua API Key do Claude está configurada corretamente.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Assistente KYC</h1>
              <p className="text-blue-100 text-sm flex items-center gap-2">
                <Database className="w-3 h-3" />
                Conectado ao Supabase
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg h-10 w-10 flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 p-2 rounded-lg h-10 w-10 flex-shrink-0 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-lg h-10 w-10 flex-shrink-0 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm text-slate-400">Analisando dados...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
            <p className="text-slate-400 text-sm mb-3 font-medium">💡 Perguntas sugeridas:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 transition-all hover:border-blue-500"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 bg-slate-900 border-t border-slate-700">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta sobre os clientes KYC..."
              disabled={loading}
              className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2 text-center">
            Powered by Claude AI - Análise KYC Inteligente
          </p>
        </div>
      </div>
    </div>
  );
}

// Main App Component with Navigation
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">KYC Analysis Platform</h1>
                <p className="text-slate-400 text-xs">Backoffice - Instituição de Pagamentos</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveView('chatbot')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeView === 'chatbot'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Assistente IA
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <button
                onClick={() => {
                  setActiveView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveView('chatbot');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeView === 'chatbot'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Assistente IA
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      {activeView === 'dashboard' ? <Dashboard /> : <Chatbot />}
    </div>
  );
}