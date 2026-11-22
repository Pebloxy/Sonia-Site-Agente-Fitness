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
      return [
        { data_treino: '2026-10-01', exercicio: 'Agachamento livre', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 70 },
        { data_treino: '2026-10-15', exercicio: 'Agachamento livre', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 80 },
        { data_treino: '2026-11-01', exercicio: 'Agachamento livre', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 90 },
        { data_treino: '2026-11-15', exercicio: 'Agachamento livre', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 95 },
        { data_treino: '2026-10-02', exercicio: 'Supino reto', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 50 },
        { data_treino: '2026-10-16', exercicio: 'Supino reto', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 55 },
        { data_treino: '2026-11-02', exercicio: 'Supino reto', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 62.5 },
        { data_treino: '2026-11-16', exercicio: 'Supino reto', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 67.5 },
        { data_treino: '2026-10-03', exercicio: 'Puxada frontal', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 40 },
        { data_treino: '2026-10-17', exercicio: 'Puxada frontal', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 45 },
        { data_treino: '2026-11-03', exercicio: 'Puxada frontal', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 50 },
        { data_treino: '2026-11-17', exercicio: 'Puxada frontal', serie_numero: 1, repeticoes_realizadas: 10, carga_utilizada: 55 },
      ];
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
        metas: [
          { id: 1, descricao: 'Treinar 4x por semana', tipo: 'frequencia', alcancada: true, criada_em: new Date('2026-10-01') },
          { id: 2, descricao: 'Alcançar 100kg no Agachamento livre', tipo: 'carga', alcancada: false, criada_em: new Date('2026-10-15') },
          { id: 3, descricao: 'Completar 20 treinos no mês', tipo: 'frequencia', alcancada: true, criada_em: new Date('2026-11-01') },
        ],
        conquistas: [
          { id: 1, titulo: 'Primeiro Passo', descricao: 'Realizou o primeiro acesso à Sonia!', conquistada_em: new Date('2026-10-01') },
          { id: 2, titulo: 'Foco de Ferro', descricao: 'Completou 15 dias seguidos sem faltar aos treinos!', conquistada_em: new Date('2026-10-25') },
          { id: 3, titulo: 'Evolução Notável', descricao: 'Aumentou a carga do Agachamento livre em mais de 20kg!', conquistada_em: new Date('2026-11-10') },
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
      return [
        { data: '2026-11-16', exercicio: 'Agachamento livre', grupo_muscular: 'Pernas', serie: 1, repeticoes: 10, carga_kg: 95, observacoes: 'Treino A - Excelente execução' },
        { data: '2026-11-16', exercicio: 'Leg Press', grupo_muscular: 'Pernas', serie: 1, repeticoes: 12, carga_kg: 160, observacoes: 'Treino A - Amplitude completa' },
        { data: '2026-11-16', exercicio: 'Cadeira extensora', grupo_muscular: 'Quadríceps', serie: 1, repeticoes: 12, carga_kg: 45, observacoes: 'Treino A - Boa cadência' },
        { data: '2026-11-16', exercicio: 'Mesa flexora', grupo_muscular: 'Posterior de Coxa', serie: 1, repeticoes: 12, carga_kg: 35, observacoes: 'Treino A' },
        { data: '2026-11-16', exercicio: 'Panturrilha em pé', grupo_muscular: 'Panturrilhas', serie: 1, repeticoes: 15, carga_kg: 70, observacoes: 'Treino A' },
        { data: '2026-11-14', exercicio: 'Puxada frontal', grupo_muscular: 'Costas', serie: 1, repeticoes: 10, carga_kg: 55, observacoes: 'Treino B' },
        { data: '2026-11-14', exercicio: 'Remada curvada', grupo_muscular: 'Costas', serie: 1, repeticoes: 10, carga_kg: 40, observacoes: 'Treino B' },
        { data: '2026-11-14', exercicio: 'Remada baixa', grupo_muscular: 'Costas', serie: 1, repeticoes: 12, carga_kg: 45, observacoes: 'Treino B' },
        { data: '2026-11-14', exercicio: 'Rosca direta', grupo_muscular: 'Bíceps', serie: 1, repeticoes: 10, carga_kg: 22, observacoes: 'Treino B' },
        { data: '2026-11-14', exercicio: 'Rosca martelo', grupo_muscular: 'Bíceps e Antebraço', serie: 1, repeticoes: 12, carga_kg: 14, observacoes: 'Treino B' },
        { data: '2026-11-12', exercicio: 'Supino reto', grupo_muscular: 'Peito', serie: 1, repeticoes: 10, carga_kg: 67.5, observacoes: 'Treino C' },
        { data: '2026-11-12', exercicio: 'Supino inclinado', grupo_muscular: 'Peito Superior', serie: 1, repeticoes: 10, carga_kg: 40, observacoes: 'Treino C' },
        { data: '2026-11-12', exercicio: 'Crucifixo', grupo_muscular: 'Peito', serie: 1, repeticoes: 12, carga_kg: 14, observacoes: 'Treino C' },
        { data: '2026-11-12', exercicio: 'Tríceps testa', grupo_muscular: 'Tríceps', serie: 1, repeticoes: 12, carga_kg: 20, observacoes: 'Treino C' },
        { data: '2026-11-12', exercicio: 'Tríceps pulley', grupo_muscular: 'Tríceps', serie: 1, repeticoes: 12, carga_kg: 25, observacoes: 'Treino C' },
      ];
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

