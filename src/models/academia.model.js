// src/models/academia.model.js
const { pool } = require('../config/database');

class AcademiaModel {
  static async obterDadosAcademia() {
    try {
      const [rows] = await pool.query('SELECT * FROM academia LIMIT 1');
      return rows[0] || {
        nome: 'Academia MoveFIT',
        endereco: 'Rua Exemplo, 100 - São Paulo, SP',
        telefone: '(11) 91234-5678',
        email: 'contato@movefit.com.br',
      };
    } catch (err) {
      console.warn('⚠️ AcademiaModel.obterDadosAcademia fallback:', err.message);
      return {
        nome: 'Academia MoveFIT',
        endereco: 'Rua Exemplo, 100 - São Paulo, SP',
        telefone: '(11) 91234-5678',
        email: 'contato@movefit.com.br',
      };
    }
  }

  static async listarHorariosFuncionamento() {
    try {
      const [rows] = await pool.query('SELECT * FROM horario_funcionamento ORDER BY id ASC');
      return rows;
    } catch (err) {
      console.warn('⚠️ AcademiaModel.listarHorariosFuncionamento fallback:', err.message);
      return [
        { dia_semana: 'segunda', abertura: '06:00:00', fechamento: '22:00:00' },
        { dia_semana: 'terca', abertura: '06:00:00', fechamento: '22:00:00' },
        { dia_semana: 'quarta', abertura: '06:00:00', fechamento: '22:00:00' },
        { dia_semana: 'quinta', abertura: '06:00:00', fechamento: '22:00:00' },
        { dia_semana: 'sexta', abertura: '06:00:00', fechamento: '22:00:00' },
        { dia_semana: 'sabado', abertura: '08:00:00', fechamento: '14:00:00' },
      ];
    }
  }

  static async listarModalidades() {
    try {
      const [rows] = await pool.query('SELECT * FROM modalidade WHERE ativa = TRUE ORDER BY nome ASC');
      return rows;
    } catch (err) {
      console.warn('⚠️ AcademiaModel.listarModalidades fallback:', err.message);
      return [
        { nome: 'Musculação', descricao: 'Treino de força com pesos livres e máquinas.', horarios: 'Seg a Sex: 06h–22h | Sáb: 08h–14h' },
        { nome: 'Dança', descricao: 'Aulas de ritmo e aeróbico.', horarios: 'Seg, Qua, Sex: 18h–19h' },
        { nome: 'Pilates', descricao: 'Flexibilidade e fortalecimento do core.', horarios: 'Ter, Qui: 09h–10h e 17h–18h' },
        { nome: 'Boxe', descricao: 'Condicionamento físico e noções de boxe.', horarios: 'Seg, Qua, Sex: 19h–20h' },
      ];
    }
  }

  static async obterOcupacao() {
    // Retorna horários de pico e períodos mais tranquilos (RF18)
    return {
      pico: ['18:00 às 21:00 (Segunda a Sexta)', '07:00 às 09:00 (Segunda a Sexta)'],
      tranquilo: ['10:00 às 16:00 (Segunda a Sexta)', '12:00 às 14:00 (Sábados)'],
    };
  }
}

module.exports = AcademiaModel;

