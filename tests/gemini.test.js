// tests/gemini.test.js
// Testes da camada de integração com Inteligência Artificial e Function Calling
const assert = require('assert');
const { geminiFunctionDeclarations, executarFerramenta } = require('../src/services/geminiTools');
const GeminiService = require('../src/services/gemini.service');

async function testGeminiIntegration() {
  console.log('Iniciando testes da ETAPA 6 (Integração Gemini & Function Calling)...');

  // 1. Validar catálogo de ferramentas (Function Declarations)
  assert.ok(geminiFunctionDeclarations.length >= 6, 'Deve haver pelo menos 6 ferramentas declaradas');
  const nomesFerramentas = geminiFunctionDeclarations.map(f => f.name);
  assert.ok(nomesFerramentas.includes('consultar_rotina_do_dia'));
  assert.ok(nomesFerramentas.includes('consultar_horarios_academia'));
  assert.ok(nomesFerramentas.includes('consultar_modalidades'));
  assert.ok(nomesFerramentas.includes('realizar_checkin'));
  console.log('✔ Teste 1: Catálogo de Function Declarations validado');

  // 2. Execução determinística de ferramenta (horários)
  const resHorarios = await executarFerramenta('consultar_horarios_academia', {}, null);
  assert.ok(resHorarios.horarios, 'Deve retornar horários');
  assert.ok(resHorarios.ocupacao, 'Deve retornar dados de ocupação');
  console.log('✔ Teste 2: Execução de ferramenta de horários OK');

  // 3. Execução determinística de ferramenta (modalidades)
  const resModalidades = await executarFerramenta('consultar_modalidades', {}, null);
  assert.ok(Array.isArray(resModalidades.modalidades), 'Deve retornar array de modalidades');
  console.log('✔ Teste 3: Execução de ferramenta de modalidades OK');

  // 4. Teste de geração de resposta (modo resiliente com persona)
  const resposta = await GeminiService.gerarResposta([
    { role: 'user', text: 'Quais modalidades vocês oferecem na academia?' },
  ]);
  assert.ok(resposta.length > 20, 'Resposta deve conter conteúdo relevante');
  assert.ok(resposta.toLowerCase().includes('dança') || resposta.toLowerCase().includes('musculação') || resposta.toLowerCase().includes('pilates'));
  console.log('✔ Teste 4: Geração de resposta contextualizada OK');

  console.log('\n🎉 TESTES DA INTEGRAÇÃO DE IA CONCLUÍDOS COM SUCESSO!');
}

testGeminiIntegration().catch(err => {
  console.error('❌ Falha nos testes de IA:', err);
  process.exit(1);
});

