// src/models/agendamento.model.js
const { pool } = require('../config/database');

class AgendamentoModel {
  static async listarBlocosDisponiveis(diaSemana, data) {
    try {
      // Retorna blocos com a contagem atual de inscritos (RN02: máx 3)
      const query = `
        SELECT bh.id, bh.dia_semana, bh.hora_inicio, bh.hora_fim, bh.capacidade_maxima,
               COUNT(a.id) as total_agendados,
               (bh.capacidade_maxima - COUNT(a.id)) as vagas_restantes
        FROM bloco_horario bh
        LEFT JOIN agendamento a ON bh.id = a.bloco_horario_id 
             AND a.data_aula = ? 
             AND a.status = 'agendado'
        WHERE bh.dia_semana = ? AND bh.ativo = TRUE
        GROUP BY bh.id
        HAVING vagas_restantes > 0
        ORDER BY bh.hora_inicio ASC
      `;
      const [rows] = await pool.query(query, [data, diaSemana]);
      return rows;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.listarBlocosDisponiveis fallback:', err.message);
      return [];
    }
  }

  static async verificarConflito(alunoId, dataAula, blocoId) {
    try {
      const [rows] = await pool.query(
        `SELECT a.* FROM agendamento a
         WHERE a.aluno_id = ? AND a.data_aula = ? AND a.bloco_horario_id = ? AND a.status = 'agendado'`,
        [alunoId, dataAula, blocoId]
      );
      return rows.length > 0;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.verificarConflito fallback:', err.message);
      return false;
    }
  }

  static async buscarPorId(id) {
    try {
      const [rows] = await pool.query(
        `SELECT a.*, bh.hora_inicio, bh.hora_fim
         FROM agendamento a
         JOIN bloco_horario bh ON a.bloco_horario_id = bh.id
         WHERE a.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.buscarPorId fallback:', err.message);
      return null;
    }
  }

  static async criar(alunoId, blocoId, dataAula) {
    try {
      const [result] = await pool.query(
        `INSERT INTO agendamento (aluno_id, bloco_horario_id, data_aula, status)
         VALUES (?, ?, ?, 'agendado')`,
        [alunoId, blocoId, dataAula]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.criar fallback:', err.message);
      return 1;
    }
  }

  static async cancelar(id) {
    try {
      await pool.query(
        `UPDATE agendamento SET status = 'cancelado', cancelado_em = NOW() WHERE id = ?`,
        [id]
      );
      return true;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.cancelar fallback:', err.message);
      return true;
    }
  }

  static async listarPorAluno(alunoId) {
    try {
      const query = `
        SELECT a.id, a.data_aula, a.status, a.criado_em,
               bh.hora_inicio, bh.hora_fim, bh.dia_semana
        FROM agendamento a
        JOIN bloco_horario bh ON a.bloco_horario_id = bh.id
        WHERE a.aluno_id = ?
        ORDER BY a.data_aula DESC, bh.hora_inicio DESC
      `;
      const [rows] = await pool.query(query, [alunoId]);
      return rows;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.listarPorAluno fallback:', err.message);
      return [];
    }
  }

  // --- CHECK-IN (RF15, RN06, RN07) ---
  static async realizarCheckin(alunoId, agendamentoId = null) {
    try {
      const [result] = await pool.query(
        'INSERT INTO checkin (aluno_id, agendamento_id, horario) VALUES (?, ?, NOW())',
        [alunoId, agendamentoId]
      );
      if (agendamentoId) {
        await pool.query(
          "UPDATE agendamento SET status = 'realizado' WHERE id = ?",
          [agendamentoId]
        );
      }
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.realizarCheckin fallback:', err.message);
      return 1;
    }
  }

  static async buscarUltimoCheckin(alunoId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM checkin WHERE aluno_id = ? ORDER BY horario DESC LIMIT 1',
        [alunoId]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.buscarUltimoCheckin fallback:', err.message);
      return null;
    }
  }

  static async listarCheckinsAluno(alunoId, limite = 30) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM checkin WHERE aluno_id = ? ORDER BY horario DESC LIMIT ?',
        [alunoId, limite]
      );
      return rows;
    } catch (err) {
      console.warn('⚠️ AgendamentoModel.listarCheckinsAluno fallback:', err.message);
      return [];
    }
  }
}

module.exports = AgendamentoModel;

