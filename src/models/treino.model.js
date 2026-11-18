// src/models/treino.model.js
const { pool } = require('../config/database');
const Demo = require('../demo/treinos.demo'); // rotina de demonstração (usada quando não há banco de dados)

class TreinoModel {
  static async buscarRotinaAtiva(alunoId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM rotina WHERE aluno_id = ? AND ativa = TRUE ORDER BY criada_em DESC LIMIT 1',
        [alunoId]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ TreinoModel.buscarRotinaAtiva fallback:', err.message);
      return Demo.rotinaAtiva();
    }
  }

  static async buscarExerciciosRotina(rotinaId, diaSemana = null) {
    try {
      let query = `
        SELECT re.id, re.rotina_id, re.series, re.repeticoes, re.carga_sugerida, re.ordem,
               re.dia_semana, re.etapa, e.id as exercicio_id, e.nome, e.grupo_muscular,
               e.descricao, e.instrucoes_execucao
        FROM rotina_exercicio re
        JOIN exercicio e ON re.exercicio_id = e.id
        WHERE re.rotina_id = ?
      `;
      const params = [rotinaId];
      if (diaSemana) {
        query += ' AND re.dia_semana = ?';
        params.push(diaSemana);
      }
      query += ' ORDER BY re.ordem ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (err) {
      console.warn('⚠️ TreinoModel.buscarExerciciosRotina fallback:', err.message);
      return Demo.exerciciosDoDia(diaSemana);
    }
  }

  static async buscarExercicioPorId(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM exercicio WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ TreinoModel.buscarExercicioPorId fallback:', err.message);
      return Demo.exercicioPorId(id);
    }
  }

  static async listarExercicios(grupoMuscular = null) {
    try {
      let query = 'SELECT * FROM exercicio';
      const params = [];
      if (grupoMuscular) {
        query += ' WHERE grupo_muscular = ?';
        params.push(grupoMuscular);
      }
      query += ' ORDER BY nome ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (err) {
      console.warn('⚠️ TreinoModel.listarExercicios fallback:', err.message);
      return [];
    }
  }

  static async buscarVideoExercicio(exercicioId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM video_demonstracao WHERE exercicio_id = ? AND autorizado = TRUE LIMIT 1',
        [exercicioId]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ TreinoModel.buscarVideoExercicio fallback:', err.message);
      return Demo.videoDoExercicio(exercicioId);
    }
  }

  static async criarRegistroTreino(dados) {
    try {
      const [result] = await pool.query(
        `INSERT INTO registro_treino (aluno_id, rotina_id, data_treino, inicio, fim, observacoes, sincronizado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dados.aluno_id,
          dados.rotina_id || null,
          dados.data_treino || new Date().toISOString().slice(0, 10),
          dados.inicio || new Date(),
          dados.fim || new Date(),
          dados.observacoes || null,
          dados.sincronizado !== undefined ? dados.sincronizado : 1,
        ]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ TreinoModel.criarRegistroTreino fallback:', err.message);
      return 1;
    }
  }

  static async registrarExerciciosExecutados(exercicios) {
    if (!exercicios || !exercicios.length) return;
    try {
      const values = exercicios.map(e => [
        e.registro_treino_id,
        e.exercicio_id,
        e.serie_numero,
        e.repeticoes_realizadas,
        e.carga_utilizada,
      ]);
      await pool.query(
        `INSERT INTO registro_exercicio (registro_treino_id, exercicio_id, serie_numero, repeticoes_realizadas, carga_utilizada)
         VALUES ?`,
        [values]
      );
    } catch (err) {
      console.warn('⚠️ TreinoModel.registrarExerciciosExecutados fallback:', err.message);
    }
  }

  static async salvarAvaliacao(alunoId, registroTreinoId, nota, comentario) {
    try {
      const [result] = await pool.query(
        `INSERT INTO avaliacao_treino (aluno_id, registro_treino_id, nota, comentario)
         VALUES (?, ?, ?, ?)`,
        [alunoId, registroTreinoId, nota, comentario || null]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ TreinoModel.salvarAvaliacao fallback:', err.message);
      return 1;
    }
  }
}

module.exports = TreinoModel;

