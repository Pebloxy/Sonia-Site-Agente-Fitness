// src/services/gemini.service.js
const { PERSONA } = require('../../persona');
const { geminiFunctionDeclarations, executarFerramenta, montarCartoes } = require('./geminiTools');

class GeminiService {
  /**
   * Envia o histórico de mensagens para a API Gemini com suporte a Function Calling
   * e system instruction baseada na personalidade da Sonia.
   */
  static async gerarResposta(historicoMensagens, contextoAluno = null, cartoes = []) {
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

    const contents = historicoMensagens.map(m => ({
      role: m.role === 'sonia' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Conversa com a IA em rodadas: a IA pode pedir ferramentas (horários, treino...), recebe os dados e então escreve a resposta.
    for (let rodada = 0; rodada < 4; rodada++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: [{ function_declarations: geminiFunctionDeclarations }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(30000), // não deixa o chat travado se a IA não responder
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(`Erro Gemini API (rodada ${rodada + 1}):`, response.status, data);
        throw new Error(response.status === 429 ? 'limite' : 'gemini');
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const chamadas = parts.filter(p => p.functionCall);

      if (!chamadas.length) {
        const text = parts.map(p => p.text || '').join('').trim();
        if (!text) {
          console.error('Gemini respondeu sem texto:', JSON.stringify(data.candidates?.[0]?.finishReason || data));
          throw new Error('vazio');
        }
        return text;
      }

      // Devolve a resposta do modelo INTEIRA (os modelos novos exigem as partes originais, com a assinatura de raciocínio)
      contents.push({ role: 'model', parts });

      const respostas = [];
      for (const part of chamadas) {
        const { name, args } = part.functionCall;
        console.log(`🤖 Gemini solicitou Function Call: ${name}`, args);
        const resultado = await executarFerramenta(name, args || {}, alunoId);
        cartoes.push(...montarCartoes(name, args || {}, resultado)); // cartões que aparecem no chat
        const response = (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) ? resultado : { resultado };
        respostas.push({ functionResponse: { name, response } });
      }
      contents.push({ role: 'user', parts: respostas });
    }

    console.error('Gemini pediu ferramentas demais sem responder.');
    throw new Error('gemini');
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
