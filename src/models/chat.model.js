// src/models/chat.model.js
const { pool } = require('../config/database');

class ChatModel {
  static async obterOuCriarConversa(alunoId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM conversa WHERE aluno_id = ? ORDER BY criada_em DESC LIMIT 1',
        [alunoId]
      );
      if (rows.length) return rows[0].id;

      const [result] = await pool.query(
        'INSERT INTO conversa (aluno_id, criada_em, ultima_mensagem_em) VALUES (?, NOW(), NOW())',
        [alunoId]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ ChatModel.obterOuCriarConversa fallback:', err.message);
      return 1;
    }
  }

  static async salvarMensagem(conversaId, remetente, conteudo) {
    try {
      await pool.query(
        'INSERT INTO mensagem (conversa_id, remetente, conteudo, criada_em) VALUES (?, ?, ?, NOW())',
        [conversaId, remetente, conteudo]
      );
      await pool.query(
        'UPDATE conversa SET ultima_mensagem_em = NOW() WHERE id = ?',
        [conversaId]
      );
    } catch (err) {
      console.warn('⚠️ ChatModel.salvarMensagem fallback:', err.message);
    }
  }

  static async obterHistorico(conversaId, limite = 20) {
    try {
      const [rows] = await pool.query(
        `SELECT id, remetente, conteudo, criada_em
         FROM mensagem
         WHERE conversa_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [conversaId, limite]
      );
      return rows.reverse(); // Ordem cronológica
    } catch (err) {
      console.warn('⚠️ ChatModel.obterHistorico fallback:', err.message);
      return [];
    }
  }

  static async salvarAlertaUso(alunoId, trechoPergunta, categoria = 'seguranca') {
    try {
      const [result] = await pool.query(
        `INSERT INTO alerta_uso (aluno_id, trecho_pergunta, categoria, horario, email_enviado)
         VALUES (?, ?, ?, NOW(), FALSE)`,
        [alunoId, trechoPergunta, categoria]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ ChatModel.salvarAlertaUso fallback:', err.message);
      return 1;
    }
  }
}

module.exports = ChatModel;

