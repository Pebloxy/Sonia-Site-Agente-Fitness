// tests/api.test.js
// Testes automatizados das rotas do backend
const assert = require('assert');
const app = require('../src/app');

async function runTests() {
  const PORT = 3098;
  const server = app.listen(PORT);

  try {
    console.log('Iniciando bateria de testes do backend Sonia...');

    // 1. Health check
    const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'Health endpoint deve responder 200');
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');
    console.log('✔ Teste 1: Health check OK');

    // 2. Academia Info
    const acadRes = await fetch(`http://localhost:${PORT}/api/academia`);
    assert.strictEqual(acadRes.status, 200, 'Academia endpoint deve responder 200');
    const acadJson = await acadRes.json();
    assert.strictEqual(acadJson.status, 'success');
    assert.ok(acadJson.data.nome, 'Deve conter nome da academia');
    console.log('✔ Teste 2: Informações da academia OK');

    // 3. Chat normal (modo teste / fallback seguro)
    const chatRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Como funciona o agendamento de aulas?' }),
    });
    assert.strictEqual(chatRes.status, 200, 'Chat endpoint deve responder 200');
    const chatJson = await chatRes.json();
    assert.ok(chatJson.reply, 'Chat deve retornar resposta da Sonia');
    console.log('✔ Teste 3: Chat com a Sonia OK');

    // 4. Regra de Negócio RN11: Sinais de alerta (dor no peito / tontura)
    const alertaRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Estou sentindo uma forte dor no peito e falta de ar' }),
    });
    const alertaJson = await alertaRes.json();
    assert.strictEqual(alertaJson.categoria, 'alerta_medico', 'Deve acionar regra determinística RN11');
    assert.ok(alertaJson.reply.includes('pare o treino imediatamente'), 'Deve orientar parar o treino imediatamente');
    console.log('✔ Teste 4: Regra de segurança médica RN11 OK');

    // 5. Regra de Negócio RN10: Relato de dor / lesão
    const dorRes = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Estou sentindo dor no joelho ao agachar' }),
    });
    const dorJson = await dorRes.json();
    assert.strictEqual(dorJson.categoria, 'orientacao_dor', 'Deve acionar regra determinística RN10');
    console.log('✔ Teste 5: Orientação sobre dor/lesão RN10 OK');

    // 6. Regra RN01: Tentativa de login sem credenciais
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matricula: '', senha: '' }),
    });
    assert.strictEqual(loginRes.status, 400, 'Login vazio deve retornar 400 Bad Request');
    console.log('✔ Teste 6: Validação de login OK');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});

