// server.js
// Ponto de entrada do servidor da Sonia utilizando Express e Node.js
require('dotenv').config();

const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const API_KEY = process.env.GEMINI_API_KEY || '';

async function iniciarServidor() {
  console.log('----------------------------------------------------');
  console.log('🤖 Inicializando Assistente Virtual Sonia...');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🧠 Modelo Gemini: ${MODEL}`);
  console.log(`🔑 Chave Gemini: ${API_KEY && API_KEY !== 'chave_exemplo' ? 'CONFIGURADA' : 'MODO TESTE (Sem chave configurada)'}`);

  // Testa conexão com o MySQL (não bloqueia caso MySQL não esteja rodando ainda)
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Sonia online em: http://localhost:${PORT}`);
    console.log('----------------------------------------------------');
  });
}

iniciarServidor();
