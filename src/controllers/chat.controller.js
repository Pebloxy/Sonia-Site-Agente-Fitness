// src/controllers/chat.controller.js
const ChatService = require('../services/chat.service');

class ChatController {
  static async enviarMensagem(req, res, next) {
    try {
      const alunoId = req.user?.id || null;
      const ip = req.ip || req.connection.remoteAddress;

      let texto = '';
      // Suporta tanto { message: "texto" } quanto o formato antigo { messages: [{ role, text }] }
      if (req.body.message) {
        texto = req.body.message;
      } else if (Array.isArray(req.body.messages) && req.body.messages.length) {
        const lastMsg = req.body.messages[req.body.messages.length - 1];
        texto = lastMsg.text || '';
      }

      if (!texto.trim()) {
        return res.status(400).json({ error: 'Mensagem vazia' });
      }

      const resposta = await ChatService.processarMensagem(alunoId, texto, ip);
      res.status(200).json(resposta);
    } catch (err) {
      next(err);
    }
  }

  static async obterHistorico(req, res, next) {
    try {
      const alunoId = req.user.id;
      const historico = await ChatService.obterHistoricoChat(alunoId);
      res.status(200).json({ status: 'success', data: historico });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ChatController;

