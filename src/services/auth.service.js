// src/services/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AlunoModel = require('../models/aluno.model');
const { BadRequestError, UnauthorizedError, ConflictError, TooManyRequestsError } = require('../utils/errors');
const { isMenorIdade, calcularNivelAluno } = require('../utils/helpers');
const { auditLog } = require('../middlewares/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'troque_por_um_segredo_forte_aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  static async cadastrar(dados, ip) {
    const { matricula, nome, email, senha, data_nascimento, peso, altura, tempo_treino_meses, objetivo, condicoes_saude, autorizacao_responsavel } = dados;

    if (!matricula || !nome || !senha) {
      throw new BadRequestError('Matrícula, nome e senha são campos obrigatórios');
    }

    const alunoExistente = await AlunoModel.buscarPorMatricula(matricula);
    if (alunoExistente) {
      throw new ConflictError('Já existe um aluno cadastrado com esta matrícula');
    }

    // Regra RN25: Menores de 18 anos precisam de autorização do responsável legal
    const menor = isMenorIdade(data_nascimento);
    if (menor && !autorizacao_responsavel) {
      throw new BadRequestError('Alunos menores de 18 anos necessitam da autorização do responsável legal conforme a LGPD (RN25).');
    }

    const senha_hash = await bcrypt.hash(senha, 12);
    const nivel = calcularNivelAluno(tempo_treino_meses || 0);

    const novoId = await AlunoModel.criar({
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
      nivel,
      menor_idade: menor,
      autorizado_responsavel: menor ? !!autorizacao_responsavel : true,
    });

    await auditLog(novoId, 'CADASTRO', 'aluno', novoId, { matricula, nome }, ip);

    return { id: novoId, matricula, nome, nivel };
  }

  static async login(matricula, senha, ip) {
    if (!matricula || !senha) {
      throw new BadRequestError('Matrícula e senha são obrigatórios');
    }

    const aluno = await AlunoModel.buscarPorMatricula(matricula);

    if (!aluno) {
      throw new UnauthorizedError('Matrícula ou senha incorretos');
    }

    // Regra RN01: Bloqueio temporário de 10 minutos após 3 erros consecutivos
    if (aluno.bloqueado_ate && new Date(aluno.bloqueado_ate) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(aluno.bloqueado_ate) - new Date()) / 60000);
      throw new TooManyRequestsError(`Conta bloqueada por excesso de tentativas. Tente novamente em ${minutosRestantes} minuto(s).`);
    }

    const senhaValida = await bcrypt.compare(senha, aluno.senha_hash);

    if (!senhaValida) {
      const falhas = (aluno.tentativas_login_falhas || 0) + 1;
      let bloqueio = null;

      if (falhas >= 3) {
        bloqueio = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
      }

      await AlunoModel.registrarFalhaLogin(aluno.id, falhas, bloqueio);
      await auditLog(aluno.id, 'FALHA_LOGIN', 'aluno', aluno.id, { tentativas: falhas }, ip);

      if (falhas >= 3) {
        throw new TooManyRequestsError('Conta bloqueada por 10 minutos devido a 3 tentativas incorretas (RN01).');
      }

      throw new UnauthorizedError(`Matrícula ou senha incorretos. Tentativa ${falhas} de 3.`);
    }

    // Sucesso: reseta tentativas
    await AlunoModel.zerarFalhasLogin(aluno.id);
    await auditLog(aluno.id, 'LOGIN', 'aluno', aluno.id, null, ip);

    const consentimento = await AlunoModel.verificarConsentimento(aluno.id);

    const token = jwt.sign(
      {
        id: aluno.id,
        matricula: aluno.matricula,
        nome: aluno.nome,
        nivel: aluno.nivel,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      aluno: {
        id: aluno.id,
        matricula: aluno.matricula,
        nome: aluno.nome,
        nivel: aluno.nivel,
        objetivo: aluno.objetivo,
        precisaConsentimento: !consentimento,
      },
    };
  }

  static async registrarConsentimento(alunoId, ip) {
    const consentimentoId = await AlunoModel.registrarConsentimento(alunoId, ip, '1.0');
    await auditLog(alunoId, 'CONSENTIMENTO_LGPD', 'consentimento', consentimentoId, { aceito: true }, ip);
    return { sucesso: true, consentimentoId };
  }
}

module.exports = AuthService;

