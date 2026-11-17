// src/services/gemini.service.js
const { PERSONA } = require('../../persona');
const { geminiFunctionDeclarations, executarFerramenta } = require('./geminiTools');

class GeminiService {
  /**
   * Envia o histórico de mensagens para a API Gemini com suporte a Function Calling
   * e system instruction baseada na personalidade da Sonia.
   */
  static async gerarResposta(historicoMensagens, contextoAluno = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const alunoId = contextoAluno?.id || null;

    // Se a chave não for válida ou estiver em modo exemplo, aciona o simulador inteligente
    if (!apiKey || apiKey === 'chave_exemplo') {
      return await this.simularRespostaModoTeste(historicoMensagens, contextoAluno);
    }

    // 1. Monta o System Instruction contextualizado
    let systemInstruction = PERSONA;
    if (contextoAluno) {
      systemInstruction += `\n\nINFORMAÇÕES DO ALUNO AUTENTICADO:
- Nome: ${contextoAluno.nome || 'Aluno'}
- Nível: ${contextoAluno.nivel || 'iniciante'}
- Objetivo: ${contextoAluno.objetivo || 'Não informado'}
- Peso: ${contextoAluno.peso ? `${contextoAluno.peso}kg` : 'Não informado'}
- Altura: ${contextoAluno.altura ? `${contextoAluno.altura}m` : 'Não informada'}
- Condições de saúde: ${contextoAluno.condicoes_saude || 'Nenhuma informada'}
Lembre-se: Você NÃO pode alterar treinos nem fazer diagnósticos. Utilize as ferramentas disponíveis para obter dados determinísticos.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let contents = historicoMensagens.map(m => ({
      role: m.role === 'sonia' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: [{ function_declarations: geminiFunctionDeclarations }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    };

    // Primeira chamada ao Gemini
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // não deixa o chat travado se a IA não responder
    });

    let data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Erro Gemini API:', response.status, data);
      throw new Error(response.status === 429 ? 'limite' : 'gemini');
    }

    const candidate = data.candidates?.[0];
    const candidateParts = candidate?.content?.parts || [];

    // 2. Verifica se o Gemini solicitou execução de ferramenta (Function Call)
    const functionCallPart = candidateParts.find(p => p.functionCall);
    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      console.log(`🤖 Gemini solicitou Function Call: ${name}`, args);

      // Executa a função determinística no backend com validações seguras
      const resultadoFerramenta = await executarFerramenta(name, args, alunoId);

      // Adiciona a resposta do assistente (com o functionCall) e a resposta da função (functionResponse)
      contents.push({
        role: 'model',
        parts: [{ functionCall: { name, args } }],
      });

      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name,
              response: resultadoFerramenta,
            },
          },
        ],
      });

      // Segunda chamada ao Gemini para formatar a resposta final em linguagem natural
      const secondResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      });

      const secondData = await secondResponse.json().catch(() => ({}));
      const secondParts = secondData.candidates?.[0]?.content?.parts;
      const finalText = secondParts?.map(p => p.text || '').join('').trim();
      return finalText || 'Aqui estão as informações solicitadas! Qualquer dúvida me chama! 💪';
    }

    const text = candidateParts.map(p => p.text || '').join('').trim();
    if (!text) throw new Error('vazio');
    return text;
  }

  /**
   * Simulador com regras determinísticas para quando a chave não estiver no ambiente
   */
  static async simularRespostaModoTeste(historicoMensagens, contextoAluno) {
    const ultima = historicoMensagens[historicoMensagens.length - 1]?.text?.toLowerCase() || '';

    if (ultima.includes('treino') || ultima.includes('rotina') || ultima.includes('exercício') || ultima.includes('exercicio')) {
      if (!contextoAluno) {
        return 'Para ver sua ficha de treinos personalizada, você precisa entrar na sua conta pelo botão "Entrar / Cadastrar" ali em cima! Depois que logar, é só me pedir ou clicar na aba "Meus Treinos"! 💪';
      }
      return `Bora focar no treino, ${contextoAluno.nome.split(' ')[0]}! Você pode conferir os exercícios de hoje na aba "Meus Treinos". Lembre-se sempre de aquecer antes e de guardar os halteres após o uso! 🔥`;
    }

    if (ultima.includes('horário') || ultima.includes('horario') || ultima.includes('funciona') || ultima.includes('aberto')) {
      return 'Nossa academia funciona de segunda a sexta das 06h às 22h e aos sábados das 08h às 14h! Os horários mais tranquilos são entre 10h e 16h se você gosta de treinar com mais calma. 💪';
    }

    if (ultima.includes('modalidade') || ultima.includes('aula') || ultima.includes('dança') || ultima.includes('pilates')) {
      return 'Além da musculação completa, temos aulas incríveis de Dança, Pilates, Boxe, Muay Thai e Funcional! Dá para conferir todas elas nos blocos de horários na recepção!';
    }

    if (ultima.includes('alimentação') || ultima.includes('dieta') || ultima.includes('nutri') || ultima.includes('comer')) {
      return 'Para manter a energia nos treinos, prefira alimentos naturais, beba bastante água durante o dia e consuma boas fontes de proteína! Mas lembre-se: essas são apenas dicas básicas e não substituem o acompanhamento de um nutricionista profissional, tá bem? 🥗';
    }

    if (ultima.includes('agendar') || ultima.includes('agendamento')) {
      return 'Para agendar sua aula, basta ir na aba "Agendamentos" ou me informar o dia desejado! Nossos blocos são de 1 hora com no máximo 3 alunos por horário para você ter toda a atenção. 😉';
    }

    return 'Oi! Eu sou a Sonia, assistente virtual da academia! [Modo Teste: Gemini configurado e pronto para produção]. Posso te orientar sobre treinos cadastrados, horários de pico, agendamento de aulas e dicas de bem-estar. Bora treinar juntos? 💪';
  }
}

module.exports = GeminiService;
