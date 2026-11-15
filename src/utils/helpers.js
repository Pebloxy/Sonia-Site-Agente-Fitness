// src/utils/helpers.js

/**
 * Calcula o nível do aluno baseado no tempo total de treino em meses (RN26)
 * @param {number} mesesTotais
 * @returns {'iniciante' | 'intermediario' | 'avancado'}
 */
function calcularNivelAluno(mesesTotais = 0) {
  if (mesesTotais < 6) return 'iniciante';
  if (mesesTotais <= 24) return 'intermediario';
  return 'avancado';
}

/**
 * Calcula a idade a partir da data de nascimento
 * @param {string|Date} dataNasc
 * @returns {number}
 */
function calcularIdade(dataNasc) {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

/**
 * Verifica se o aluno é menor de 18 anos (RN25)
 * @param {string|Date} dataNasc
 * @returns {boolean}
 */
function isMenorIdade(dataNasc) {
  const idade = calcularIdade(dataNasc);
  if (idade === null) return false;
  return idade < 18;
}

/**
 * Converte um array de objetos para string CSV (RF25, RN16)
 * @param {Array<Object>} rows
 * @returns {string}
 */
function jsonParaCsv(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const linhas = [
    headers.join(';'),
    ...rows.map(row =>
      headers
        .map(h => {
          let val = row[h];
          if (val === null || val === undefined) return '';
          if (val instanceof Date) return val.toISOString();
          let str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    ),
  ];
  return linhas.join('\r\n');
}

module.exports = {
  calcularNivelAluno,
  calcularIdade,
  isMenorIdade,
  jsonParaCsv,
};

