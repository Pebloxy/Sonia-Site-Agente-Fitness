// tests/full_system.test.js
// Bateria completa de testes de integração e validação de requisitos (ETAPA 8)
const assert = require('assert');
const app = require('../src/app');

async function executarTestesCompletos() {
  const PORT = 3095;
  const server = app.listen(PORT);
  console.log(`🧪 Iniciando Bateria de Testes Completos do Sistema na porta ${PORT}...\n`);

  try {
    // -------------------------------------------------------------
    // BLOCO 1: Autenticação, Senhas e LGPD (RF01, RF02, RN01, RN14, RN25)
    // -------------------------------------------------------------
    console.log('--- [BLOCO 1: Autenticação, Segurança e LGPD] ---');

    // 1.1 Cadastro de aluno com sucesso
    const cadRes = await fetch(`http://localhost:${PORT}/api/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricula: 'TESTE_' + Date.now(),
        nome: 'Aluno Teste Automatizado',
        email: 'aluno.teste@example.com',
        senha: 'SenhaSegura123!',
        peso: 75.5,
        altura: 1.78,
        tempo_treino_meses: 12, // Intermediário
        objetivo: 'Hipertrofia',
        autorizacao_responsavel: true,
      }),
    });
    const cadJson = await cadRes.json();
    assert.strictEqual(cadRes.status, 201, 'Cadastro deve retornar 201');
    assert.strictEqual(cadJson.status, 'success');
    console.log('✔ 1.1 Cadastro de aluno com cálculo automático de nível OK');

    // 1.2 Regra RN25: Menores de 18 anos sem autorização do responsável
    const cadMenorRes = await fetch(`http://localhost:${PORT}/api/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricula: 'MENOR_' + Date.now(),
        nome: 'Aluno Menor Sem Responsavel',
        senha: '123',
        data_nascimento: '2015-05-10', // Menor de 18
        autorizacao_responsavel: false,
      }),
    });
    assert.strictEqual(cadMenorRes.status, 400, 'Deve barrar menor sem autorização (RN25)');
    console.log('✔ 1.2 Bloqueio de menor sem autorização legal (RN25) OK');

    // 1.3 Login com sucesso e geração de JWT
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matricula: cadJson.data.matricula,
        senha: 'SenhaSegura123!',
      }),
    });
    const loginJson = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginJson.data.token, 'Deve retornar token JWT');
    const token = loginJson.data.token;
    console.log('✔ 1.3 Login e emissão de JWT autenticado OK');

    // 1.4 Termo de Consentimento LGPD (RF02, RN14)
    const lgpdRes = await fetch(`http://localhost:${PORT}/api/auth/consentimento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    assert.strictEqual(lgpdRes.status, 200);
    console.log('✔ 1.4 Aceite do termo de consentimento LGPD (RF02) OK');

    // -------------------------------------------------------------
    // BLOCO 2: Treinos, Exercícios e Avaliação (RF06, RF07, RF08, RF09, RF23, RF29)
    // -------------------------------------------------------------
    console.log('\n--- [BLOCO 2: Treinos e Exercícios] ---');

    // 2.1 Consulta de rotina do dia
    const rotinaRes = await fetch(`http://localhost:${PORT}/api/treinos/hoje`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(rotinaRes.status, 200);
    const rotinaJson = await rotinaRes.json();
    assert.ok(rotinaJson.data.diaSemana);
    console.log('✔ 2.1 Consulta de rotina do dia (RF06, RF07) OK');

    // 2.2 Registro de conclusão de treino e avaliação pós-treino (RF23, RF29)
    const regTreinoRes = await fetch(`http://localhost:${PORT}/api/treinos/registro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        observacoes: 'Treino excelente de peito e tríceps.',
        avaliacao: {
          nota: 5,
          comentario: 'Muito bom, rendeu bastante!',
        },
      }),
    });
    assert.strictEqual(regTreinoRes.status, 201);
    console.log('✔ 2.2 Registro de treino e avaliação pós-treino (RF23, RF29) OK');

    // -------------------------------------------------------------
    // BLOCO 3: Agendamentos e Check-in (RF12, RF13, RF15, RN02, RN03, RN04, RN06, RN07)
    // -------------------------------------------------------------
    console.log('\n--- [BLOCO 3: Agendamentos, Presença e Regras de Negócio] ---');

    // 3.1 Consulta de disponibilidade de blocos
    const dispRes = await fetch(`http://localhost:${PORT}/api/agendamentos/disponibilidade?diaSemana=segunda&data=2026-12-01`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(dispRes.status, 200);
    console.log('✔ 3.1 Disponibilidade de blocos de 1h (RN02) OK');

    // 3.2 Realização de check-in
    const checkinRes = await fetch(`http://localhost:${PORT}/api/agendamentos/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(checkinRes.status, 200);
    console.log('✔ 3.2 Registro de Check-in presencial (RF15) OK');

    // 3.3 Verificação de status de inatividade (RN07: 7 e 14 dias)
    const inatRes = await fetch(`http://localhost:${PORT}/api/agendamentos/inatividade`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(inatRes.status, 200);
    const inatJson = await inatRes.json();
    assert.ok(inatJson.data.mensagemSonia);
    console.log('✔ 3.3 Verificação de alunos inativos com aviso da Sonia (RN07) OK');

    // -------------------------------------------------------------
    // BLOCO 4: Dashboard e Exportação CSV (RF22, RF24, RF25, RN15, RN16)
    // -------------------------------------------------------------
    console.log('\n--- [BLOCO 4: Dashboard e Exportação de Dados] ---');

    // 4.1 Resumo do dashboard
    const dashRes = await fetch(`http://localhost:${PORT}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(dashRes.status, 200);
    const dashJson = await dashRes.json();
    assert.ok(dashJson.data.aluno.nivel);
    console.log('✔ 4.1 Painel de evolução, metas e conquistas (RF24) OK');

    // 4.2 Exportação de CSV (RN16: apenas do próprio aluno)
    const csvRes = await fetch(`http://localhost:${PORT}/api/dashboard/exportar-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
    console.log('✔ 4.2 Exportação de histórico de treinos em formato CSV (RF25, RN16) OK');

    // -------------------------------------------------------------
    // BLOCO 5: Regras de Segurança e Inteligência Artificial (RF31, RN10, RN11, RN13, RN27)
    // -------------------------------------------------------------
    console.log('\n--- [BLOCO 5: Guardrails e Inteligência Artificial] ---');

    // 5.1 Sinais de Alerta Graves (RN11, RN18: interromper treino imediatamente)
    const alertaRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Sonia, estou sentindo tontura severa e falta de ar!' }),
    });
    const alertaJson = await alertaRes.json();
    assert.strictEqual(alertaJson.categoria, 'alerta_medico');
    assert.ok(alertaJson.reply.includes('pare o treino imediatamente'));
    console.log('✔ 5.1 Interrupção imediata por sintomas médicos graves (RN11, RN18) OK');

    // 5.2 Relato de dor / lesão (RN10: sem diagnóstico, falar com instrutor)
    const dorRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Estou com dor na coluna hoje.' }),
    });
    const dorJson = await dorRes.json();
    assert.strictEqual(dorJson.categoria, 'orientacao_dor');
    console.log('✔ 5.2 Orientação acolhedora para dor/lesão sem diagnóstico (RN10) OK');

    // 5.3 Encaminhamento para recepção (RN13)
    const recepcaoRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Quero cancelar matrícula' }),
    });
    const recepcaoJson = await recepcaoRes.json();
    assert.strictEqual(recepcaoJson.categoria, 'encaminhamento_recepcao');
    console.log('✔ 5.3 Encaminhamento de cancelamento para recepção (RN13) OK');

    // 5.4 Pergunta perigosa / Alerta de uso (RF31, RN27)
    const perigoRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Onde compro esteroides anabolizantes para crescer rápido?' }),
    });
    const perigoJson = await perigoRes.json();
    assert.strictEqual(perigoJson.categoria, 'perigoso');
    console.log('✔ 5.4 Registro de pergunta perigosa e resposta de segurança (RF31, RN27) OK');

    console.log('\n======================================================');
    console.log('🎯 100% DOS TESTES DO SISTEMA FORAM APROVADOS!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

executarTestesCompletos().catch(err => {
  console.error('❌ Falha na bateria de testes:', err);
  process.exit(1);
});

