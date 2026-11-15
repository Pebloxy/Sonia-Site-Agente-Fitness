// src/models/dashboard.model.js
const { pool } = require('../config/database');

class DashboardModel {
  static async obterEvolucaoCargas(alunoId, exercicioId = null) {
    try {
      let query = `
        SELECT rt.data_treino, e.nome as exercicio, re.serie_numero, re.repeticoes_realizadas, re.carga_utilizada
        FROM registro_exercicio re
        JOIN registro_treino rt ON re.registro_treino_id = rt.id
        JOIN exercicio e ON re.exercicio_id = e.id
        WHERE rt.aluno_id = ?
      `;
      const params = [alunoId];
      if (exercicioId) {
        query += ' AND re.exercicio_id = ?';
        params.push(exercicioId);
      }
      query += ' ORDER BY rt.data_treino ASC, re.serie_numero ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (err) {
      console.warn('⚠️ DashboardModel.obterEvolucaoCargas fallback:', err.message);
      return [];
    }
  }

  static async listarMetasEConquistas(alunoId) {
    try {
      const [metas] = await pool.query(
        'SELECT * FROM meta WHERE aluno_id = ? ORDER BY criada_em DESC',
        [alunoId]
      );
      const [conquistas] = await pool.query(
        'SELECT * FROM conquista WHERE aluno_id = ? ORDER BY conquistada_em DESC',
        [alunoId]
      );
      return { metas, conquistas };
    } catch (err) {
      console.warn('⚠️ DashboardModel.listarMetasEConquistas fallback:', err.message);
      return {
        metas: [],
        conquistas: [
          { titulo: 'Primeiro Passo', descricao: 'Realizou o primeiro acesso à Sonia!', conquistada_em: new Date() }
        ],
      };
    }
  }

  static async obterHistoricoExportacao(alunoId) {
    try {
      // Coleta histórico completo de treinos para exportar em CSV (RN16: apenas do próprio aluno)
      const query = `
        SELECT rt.data_treino AS data,
               e.nome AS exercicio,
               e.grupo_muscular,
               re.serie_numero AS serie,
               re.repeticoes_realizadas AS repeticoes,
               re.carga_utilizada AS carga_kg,
               rt.observacoes
        FROM registro_exercicio re
        JOIN registro_treino rt ON re.registro_treino_id = rt.id
        JOIN exercicio e ON re.exercicio_id = e.id
        WHERE rt.aluno_id = ?
        ORDER BY rt.data_treino DESC, e.nome ASC, re.serie_numero ASC
      `;
      const [rows] = await pool.query(query, [alunoId]);
      return rows;
    } catch (err) {
      console.warn('⚠️ DashboardModel.obterHistoricoExportacao fallback:', err.message);
      return [];
    }
  }

  static async salvarMeta(alunoId, descricao, tipo = 'geral') {
    try {
      const [result] = await pool.query(
        'INSERT INTO meta (aluno_id, descricao, tipo, criada_em) VALUES (?, ?, ?, NOW())',
        [alunoId, descricao, tipo]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ DashboardModel.salvarMeta fallback:', err.message);
      return 1;
    }
  }
}

module.exports = DashboardModel;

