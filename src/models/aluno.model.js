// src/models/aluno.model.js
const { pool } = require('../config/database');

// Store em memória para suportar testes e desenvolvimento antes de conectar ao MySQL
const memoryStore = new Map();
let nextId = 1;

// Aluno de DEMONSTRAÇÃO: já existe quando o servidor roda sem MySQL (login: matrícula 1001 / senha demo123)
(function criarAlunoDemo() {
  const bcrypt = require('bcryptjs');
  memoryStore.set(nextId, {
    id: nextId,
    matricula: '1001',
    nome: 'Lucas Almeida',
    email: 'lucas.demo@exemplo.com',
    senha_hash: bcrypt.hashSync('demo123', 10),
    data_nascimento: '2002-05-14',
    peso: 78,
    altura: 1.78,
    tempo_treino_meses: 15,
    objetivo: 'Ganho de massa muscular',
    condicoes_saude: null,
    nivel: 'intermediário',
    menor_idade: false,
    autorizado_responsavel: false,
    tentativas_login_falhas: 0,
    bloqueado_ate: null,
    criado_em: new Date(),
    dados_atualizados_em: new Date(),
  });
  nextId++;
})();

class AlunoModel {
  static async buscarPorMatricula(matricula) {
    try {
      const [rows] = await pool.query('SELECT * FROM aluno WHERE matricula = ?', [matricula]);
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ AlunoModel.buscarPorMatricula fallback:', err.message);
      // Fallback em memória
      for (const aluno of memoryStore.values()) {
        if (aluno.matricula === matricula) return aluno;
      }
      return null;
    }
  }

  static async buscarPorId(id) {
    try {
      const [rows] = await pool.query(
        `SELECT id, matricula, nome, email, data_nascimento, peso, altura,
                tempo_treino_meses, objetivo, condicoes_saude, nivel, ativo,
                menor_idade, autorizado_responsavel, ultimo_acesso, dados_atualizados_em, criado_em
         FROM aluno WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ AlunoModel.buscarPorId fallback:', err.message);
      return memoryStore.get(Number(id)) || null;
    }
  }

  static async criar(alunoData) {
    const {
      matricula,
      nome,
      email,
      senha_hash,
      data_nascimento,
      peso,
      altura,
      tempo_treino_meses,
      objetivo,
      condicoes_saude,
      nivel,
      menor_idade,
      autorizado_responsavel,
    } = alunoData;

    try {
      const [result] = await pool.query(
        `INSERT INTO aluno (
          matricula, nome, email, senha_hash, data_nascimento, peso, altura,
          tempo_treino_meses, objetivo, condicoes_saude, nivel, menor_idade, autorizado_responsavel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          matricula,
          nome,
          email || null,
          senha_hash,
          data_nascimento || null,
          peso || null,
          altura || null,
          tempo_treino_meses || 0,
          objetivo || null,
          condicoes_saude || null,
          nivel || 'iniciante',
          menor_idade ? 1 : 0,
          autorizado_responsavel ? 1 : 0,
        ]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ AlunoModel.criar fallback:', err.message);
      const id = nextId++;
      const novo = {
        id,
        matricula,
        nome,
        email,
        senha_hash,
        data_nascimento,
        peso,
        altura,
        tempo_treino_meses: tempo_treino_meses || 0,
        objetivo,
        condicoes_saude,
        nivel: nivel || 'iniciante',
        menor_idade: !!menor_idade,
        autorizado_responsavel: !!autorizado_responsavel,
        tentativas_login_falhas: 0,
        bloqueado_ate: null,
        criado_em: new Date(),
        dados_atualizados_em: new Date(),
      };
      memoryStore.set(id, novo);
      return id;
    }
  }

  static async registrarFalhaLogin(id, tentativas, bloqueadoAte = null) {
    try {
      await pool.query(
        'UPDATE aluno SET tentativas_login_falhas = ?, bloqueado_ate = ? WHERE id = ?',
        [tentativas, bloqueadoAte, id]
      );
    } catch (err) {
      console.warn('⚠️ AlunoModel.registrarFalhaLogin fallback:', err.message);
      const aluno = memoryStore.get(Number(id));
      if (aluno) {
        aluno.tentativas_login_falhas = tentativas;
        aluno.bloqueado_ate = bloqueadoAte;
      }
    }
  }

  static async zerarFalhasLogin(id) {
    try {
      await pool.query(
        'UPDATE aluno SET tentativas_login_falhas = 0, bloqueado_ate = NULL, ultimo_acesso = NOW() WHERE id = ?',
        [id]
      );
    } catch (err) {
      console.warn('⚠️ AlunoModel.zerarFalhasLogin fallback:', err.message);
      const aluno = memoryStore.get(Number(id));
      if (aluno) {
        aluno.tentativas_login_falhas = 0;
        aluno.bloqueado_ate = null;
        aluno.ultimo_acesso = new Date();
      }
    }
  }

  static async atualizarPerfil(id, dados) {
    const campos = [];
    const valores = [];

    if (dados.peso !== undefined) { campos.push('peso = ?'); valores.push(dados.peso); }
    if (dados.altura !== undefined) { campos.push('altura = ?'); valores.push(dados.altura); }
    if (dados.objetivo !== undefined) { campos.push('objetivo = ?'); valores.push(dados.objetivo); }
    if (dados.condicoes_saude !== undefined) { campos.push('condicoes_saude = ?'); valores.push(dados.condicoes_saude); }
    if (dados.tempo_treino_meses !== undefined) { campos.push('tempo_treino_meses = ?'); valores.push(dados.tempo_treino_meses); }
    if (dados.nivel !== undefined) { campos.push('nivel = ?'); valores.push(dados.nivel); }

    campos.push('dados_atualizados_em = NOW()');
    valores.push(id);

    try {
      await pool.query(`UPDATE aluno SET ${campos.join(', ')} WHERE id = ?`, valores);
      return true;
    } catch (err) {
      console.warn('⚠️ AlunoModel.atualizarPerfil fallback:', err.message);
      const aluno = memoryStore.get(Number(id));
      if (aluno) {
        Object.assign(aluno, dados);
        aluno.dados_atualizados_em = new Date();
      }
      return true;
    }
  }

  static async registrarConsentimento(alunoId, ip, termoVersao = '1.0') {
    try {
      const [result] = await pool.query(
        `INSERT INTO consentimento (aluno_id, termo_versao, aceito, aceito_em, ip_aceite)
         VALUES (?, ?, TRUE, NOW(), ?)`,
        [alunoId, termoVersao, ip]
      );
      return result.insertId;
    } catch (err) {
      console.warn('⚠️ AlunoModel.registrarConsentimento fallback:', err.message);
      const aluno = memoryStore.get(Number(alunoId));
      if (aluno) aluno.consentimentoAceito = true;
      return 1;
    }
  }

  static async verificarConsentimento(alunoId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM consentimento WHERE aluno_id = ? AND aceito = TRUE ORDER BY aceito_em DESC LIMIT 1',
        [alunoId]
      );
      return rows[0] || null;
    } catch (err) {
      console.warn('⚠️ AlunoModel.verificarConsentimento fallback:', err.message);
      const aluno = memoryStore.get(Number(alunoId));
      return aluno?.consentimentoAceito ? { aceito: true } : null;
    }
  }

  static async registrarHistorico(alunoId, peso, altura, nivel) {
    try {
      await pool.query(
        'INSERT INTO perfil_historico (aluno_id, peso, altura, nivel) VALUES (?, ?, ?, ?)',
        [alunoId, peso, altura, nivel]
      );
    } catch (err) {
      console.warn('⚠️ AlunoModel.registrarHistorico fallback:', err.message);
    }
  }
}

module.exports = AlunoModel;
