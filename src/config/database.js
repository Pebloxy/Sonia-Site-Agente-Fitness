// Configuração da conexão com o banco de dados MySQL.
// Usa pool de conexões para melhor desempenho e escalabilidade (RNF15).
//
// Dependência: mysql2 (instalar na ETAPA 4 com npm install mysql2)

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:        parseInt(process.env.DB_PORT, 10) || 3306,
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'sonia_db',
  charset:           'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Converte DATETIME/DATE para objetos Date do JS
  dateStrings:        false,
  // Timezone do servidor
  timezone:           '-03:00',
});

// Teste de conexão (executar ao iniciar o servidor)
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Banco de dados conectado com sucesso.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Falha ao conectar ao banco de dados:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };

