// src/services/chat.service.js
const ChatModel = require('../models/chat.model');
const AlunoModel = require('../models/aluno.model');
const GeminiService = require('./gemini.service');
const { auditLog } = require('../middlewares/logger');

class ChatService {
  /**
   * Processa a mensagem do aluno, aplicando regras de segurança determinísticas
   * antes e depois da chamada da IA.
   */
  static async processarMensagem(alunoId, mensagemTexto, ip = null) {
    const textoLimpo = (mensagemTexto || '').trim();
    const textoLower = textoLimpo.toLowerCase();

    // 1. Obtém contexto do aluno se disponível (para personalização RN19, RN21)
    let aluno = null;
    let conversaId = 1;
    if (alunoId) {
      aluno = await AlunoModel.buscarPorId(alunoId);
      conversaId = await ChatModel.obterOuCriarConversa(alunoId);
      await ChatModel.salvarMensagem(conversaId, 'user', textoLimpo);
    }

    // 2. REGRA DE SEGURANÇA DETERMINÍSTICA: SINAIS DE ALERTA MÉDICO (RN11, RN18)
    const sinaisAlerta = ['dor no peito', 'falta de ar', 'tontura severa', 'desmaio', 'desmaiar', 'visao escura', 'visão escura'];
    for (const sinal of sinaisAlerta) {
      if (textoLower.includes(sinal)) {
        const respostaSegura =
          'Atenção: Por favor, pare o treino imediatamente. Sente-se em local ventilado e procure ajuda da equipe da academia ou atendimento médico urgente. Sua saúde e segurança estão em primeiro lugar.';
        if (alunoId) await ChatModel.salvarMensagem(conversaId, 'sonia', respostaSegura);
        return { reply: respostaSegura, categoria: 'alerta_medico' };
      }
    }

    // 3. REGRA DETERMINÍSTICA: RELATO DE DOR OU LESÃO (RN10, RN18)
    const relatosDor = ['estou com dor', 'sinto dor', 'me lesionei', 'machuquei', 'lesão', 'inflamado', 'dor na coluna', 'dor no joelho'];
    for (const dor of relatosDor) {
      if (textoLower.includes(dor)) {
        const respostaDor =
          'Compreendo seu desconforto. Como assistente virtual, não posso realizar diagnósticos nem prescrever tratamentos. Peço que não treine a região dolorida e converse diretamente com seu treinador antes de prosseguir. Se a dor persistir, consulte um médico especialista.';
        if (alunoId) await ChatModel.salvarMensagem(conversaId, 'sonia', respostaDor);
        return { reply: respostaDor, categoria: 'orientacao_dor' };
      }
    }

    // 4. REGRA DETERMINÍSTICA: CANCELAMENTO DE MATRÍCULA / FINANCEIRO (RN13)
    if (textoLower.includes('cancelar matrícula') || textoLower.includes('cancelamento de plano') || textoLower.includes('reembolso') || textoLower.includes('mensalidade atrasada')) {
      const respostaRecepcao =
        'Questões financeiras e cancelamento de matrícula são tratadas diretamente pela nossa recepção. Você pode procurá-los no balcão da academia ou pelo telefone oficial!';
      if (alunoId) await ChatModel.salvarMensagem(conversaId, 'sonia', respostaRecepcao);
      return { reply: respostaRecepcao, categoria: 'encaminhamento_recepcao' };
    }

    // 5. REGRA DE SEGURANÇA: PERGUNTA PERIGOSA OU PROMPT INJECTION (RF31, RN27)
    const termosPerigosos = ['esteroide', 'anabolizante', 'veneno', 'suicidio', 'suicídio', 'esqueca as regras', 'ignore suas instrucoes'];
    for (const perigo of termosPerigosos) {
      if (textoLower.includes(perigo)) {
        if (alunoId) {
          await ChatModel.salvarAlertaUso(alunoId, textoLimpo.slice(0, 300), 'uso_perigoso');
          await auditLog(alunoId, 'ALERTA_USO_PERIGOSO', 'chat', conversaId, { trecho: textoLimpo.slice(0, 100) }, ip);
        }
        const respostaBloqueio =
          'Eu sou programada para ajudar você exclusivamente com rotinas saudáveis e orientações da academia. Vamos focar no seu treino de hoje?';
        if (alunoId) await ChatModel.salvarMensagem(conversaId, 'sonia', respostaBloqueio);
        return { reply: respostaBloqueio, categoria: 'perigoso' };
      }
    }

    // 6. Chamada à IA generativa (Gemini)
    try {
      const historicoRecente = alunoId
        ? (await ChatModel.obterHistorico(conversaId, 10)).map(m => ({
            role: m.remetente === 'user' ? 'user' : 'sonia',
            text: m.conteudo,
          }))
        : [{ role: 'user', text: textoLimpo }];

      const respostaIa = await GeminiService.gerarResposta(historicoRecente, aluno);

      if (alunoId) {
        await ChatModel.salvarMensagem(conversaId, 'sonia', respostaIa);
      }

      return { reply: respostaIa };
    } catch (err) {
      const msgErroAmigavel =
        err.message === 'limite'
          ? 'Recebi muitas mensagens simultâneas agora! Respira fundo, descansa uns segundos e tenta de novo comigo, combinado?'
          : 'Tive um pequeno probleminha de conexão, mas já estou me alongando para tentar de novo!';
      return { reply: msgErroAmigavel, error: true };
    }
  }

  static async obterHistoricoChat(alunoId) {
    const conversaId = await ChatModel.obterOuCriarConversa(alunoId);
    return await ChatModel.obterHistorico(conversaId, 30);
  }
}

module.exports = ChatService;

