-- =============================================================================
-- SONIA — Schema do Banco de Dados MySQL
-- Projeto: Assistente Virtual para Academia
-- Grupo Scriptum — FATEC Zona Sul
-- Versão: 1.0
-- =============================================================================
-- Instruções:
--   1. Certifique-se de que o MySQL está rodando.
--   2. Execute este script: mysql -u root -p < database/schema.sql
--   3. Em seguida, execute o seed: mysql -u root -p sonia_db < database/seed.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sonia_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sonia_db;

-- =============================================================================
-- TABELAS DE REFERÊNCIA — ACADEMIA
-- =============================================================================

-- Dados cadastrais da academia (RF18)
CREATE TABLE academia (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(150)  NOT NULL,
  endereco      VARCHAR(300),
  telefone      VARCHAR(20),
  email         VARCHAR(150),
  criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Horários de funcionamento por dia da semana (RF18)
CREATE TABLE horario_funcionamento (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  academia_id   INT NOT NULL,
  dia_semana    ENUM('segunda','terca','quarta','quinta','sexta','sabado','domingo') NOT NULL,
  abertura      TIME NOT NULL,
  fechamento    TIME NOT NULL,

  CONSTRAINT fk_horario_academia
    FOREIGN KEY (academia_id) REFERENCES academia(id) ON DELETE CASCADE,
  CONSTRAINT uk_horario_academia_dia
    UNIQUE (academia_id, dia_semana)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modalidades oferecidas: dança, pilates, lutas, etc. (RF19)
CREATE TABLE modalidade (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  academia_id   INT NOT NULL,
  nome          VARCHAR(100) NOT NULL,
  descricao     TEXT,
  horarios      VARCHAR(500),
  ativa         BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_modalidade_academia
    FOREIGN KEY (academia_id) REFERENCES academia(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocos horários disponíveis para agendamento (RF12, RN02)
-- Cada bloco = 1 hora, capacidade máxima padrão = 3 alunos
CREATE TABLE bloco_horario (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  academia_id        INT NOT NULL,
  dia_semana         ENUM('segunda','terca','quarta','quinta','sexta','sabado','domingo') NOT NULL,
  hora_inicio        TIME NOT NULL,
  hora_fim           TIME NOT NULL,
  capacidade_maxima  INT NOT NULL DEFAULT 3,
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_bloco_academia
    FOREIGN KEY (academia_id) REFERENCES academia(id) ON DELETE CASCADE,

  INDEX idx_bloco_dia_hora (dia_semana, hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABELA DE ALUNOS
-- =============================================================================

-- Perfil do aluno (RF01, RF04, RF05, RN01, RN19, RN22, RN25, RN26)
CREATE TABLE aluno (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  matricula                VARCHAR(20)   NOT NULL,
  nome                     VARCHAR(150)  NOT NULL,
  email                    VARCHAR(150),
  senha_hash               VARCHAR(255)  NOT NULL,
  data_nascimento          DATE,
  peso                     DECIMAL(5,2),          -- kg (ex.: 75.50)
  altura                   DECIMAL(3,2),          -- metros (ex.: 1.75)
  tempo_treino_meses       INT           NOT NULL DEFAULT 0,
  objetivo                 VARCHAR(100),          -- emagrecimento, hipertrofia, etc.
  condicoes_saude          TEXT,
  nivel                    ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  ativo                    BOOLEAN       NOT NULL DEFAULT TRUE,
  menor_idade              BOOLEAN       NOT NULL DEFAULT FALSE,
  autorizado_responsavel   BOOLEAN       NOT NULL DEFAULT FALSE,
  ultimo_acesso            DATETIME,
  dados_atualizados_em     DATETIME,              -- RN22: atualizar a cada 30 dias
  criado_em                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  tentativas_login_falhas  INT           NOT NULL DEFAULT 0,  -- RN01
  bloqueado_ate            DATETIME,                           -- RN01

  CONSTRAINT uk_aluno_matricula UNIQUE (matricula),

  INDEX idx_aluno_ativo (ativo),
  INDEX idx_aluno_ultimo_acesso (ultimo_acesso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CONSENTIMENTO LGPD
-- =============================================================================

-- Registro do aceite do termo de consentimento (RF02, RN14)
CREATE TABLE consentimento (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id      INT          NOT NULL,
  termo_versao  VARCHAR(20)  NOT NULL DEFAULT '1.0',
  aceito        BOOLEAN      NOT NULL DEFAULT FALSE,
  aceito_em     DATETIME,
  ip_aceite     VARCHAR(45),          -- IPv4 ou IPv6

  CONSTRAINT fk_consentimento_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_consentimento_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CONVERSAS E MENSAGENS
-- =============================================================================

-- Cada aluno tem conversas separadas (RF03, RN20)
CREATE TABLE conversa (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id            INT      NOT NULL,
  criada_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_mensagem_em  DATETIME,

  CONSTRAINT fk_conversa_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_conversa_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mensagens individuais de cada conversa
CREATE TABLE mensagem (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversa_id   INT                    NOT NULL,
  remetente     ENUM('user','sonia')   NOT NULL,
  conteudo      TEXT                   NOT NULL,
  criada_em     DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_mensagem_conversa
    FOREIGN KEY (conversa_id) REFERENCES conversa(id) ON DELETE CASCADE,

  INDEX idx_mensagem_conversa_data (conversa_id, criada_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- EXERCÍCIOS E ROTINAS DE TREINO
-- =============================================================================

-- Catálogo de exercícios disponíveis (RF09)
CREATE TABLE exercicio (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  nome                 VARCHAR(150)  NOT NULL,
  grupo_muscular       VARCHAR(100),
  descricao            TEXT,
  instrucoes_execucao  TEXT,
  criado_em            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_exercicio_grupo (grupo_muscular)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vídeos demonstrativos vinculados a exercícios (RF10, RN17)
-- Somente vídeos previamente cadastrados e autorizados
CREATE TABLE video_demonstracao (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  exercicio_id   INT          NOT NULL,
  titulo         VARCHAR(200) NOT NULL,
  url            VARCHAR(500) NOT NULL,
  fonte          VARCHAR(100),
  autorizado     BOOLEAN      NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_video_exercicio
    FOREIGN KEY (exercicio_id) REFERENCES exercicio(id) ON DELETE CASCADE,

  INDEX idx_video_exercicio (exercicio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rotina de treino de um aluno, criada pelo instrutor (RF06, RN08)
CREATE TABLE rotina (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id       INT          NOT NULL,
  nome           VARCHAR(100) NOT NULL,
  criada_por     VARCHAR(150),          -- nome do instrutor responsável
  criada_em      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizada_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ativa          BOOLEAN      NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_rotina_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_rotina_aluno_ativa (aluno_id, ativa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exercícios dentro de uma rotina, organizados por dia e etapa (RF07, RF08)
CREATE TABLE rotina_exercicio (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  rotina_id        INT NOT NULL,
  exercicio_id     INT NOT NULL,
  series           INT NOT NULL DEFAULT 3,
  repeticoes       INT NOT NULL DEFAULT 12,
  carga_sugerida   DECIMAL(6,2),                   -- kg
  ordem            INT NOT NULL DEFAULT 0,          -- posição na sequência do dia
  dia_semana       ENUM('segunda','terca','quarta','quinta','sexta','sabado','domingo') NOT NULL,
  etapa            ENUM('aquecimento','principal','secundario','alongamento') NOT NULL DEFAULT 'principal',

  CONSTRAINT fk_rotexerc_rotina
    FOREIGN KEY (rotina_id) REFERENCES rotina(id) ON DELETE CASCADE,
  CONSTRAINT fk_rotexerc_exercicio
    FOREIGN KEY (exercicio_id) REFERENCES exercicio(id) ON DELETE RESTRICT,

  INDEX idx_rotexerc_dia_ordem (rotina_id, dia_semana, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- AGENDAMENTOS
-- =============================================================================

-- Agendamentos de aulas em blocos horários (RF12, RF13, RN02, RN03, RN04)
CREATE TABLE agendamento (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id         INT  NOT NULL,
  bloco_horario_id INT  NOT NULL,
  data_aula        DATE NOT NULL,
  status           ENUM('agendado','cancelado','falta','realizado') NOT NULL DEFAULT 'agendado',
  criado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelado_em     DATETIME,

  CONSTRAINT fk_agend_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
  CONSTRAINT fk_agend_bloco
    FOREIGN KEY (bloco_horario_id) REFERENCES bloco_horario(id) ON DELETE RESTRICT,

  INDEX idx_agend_aluno_data (aluno_id, data_aula),
  INDEX idx_agend_bloco_data_status (bloco_horario_id, data_aula, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CHECK-IN
-- =============================================================================

-- Registro de presença do aluno na academia (RF15, RN06, RN07)
CREATE TABLE checkin (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id        INT NOT NULL,
  agendamento_id  INT,                             -- pode ser NULL se check-in sem agendamento
  horario         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_checkin_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
  CONSTRAINT fk_checkin_agendamento
    FOREIGN KEY (agendamento_id) REFERENCES agendamento(id) ON DELETE SET NULL,

  INDEX idx_checkin_aluno_horario (aluno_id, horario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- REGISTRO DE TREINOS REALIZADOS
-- =============================================================================

-- Sessão de treino completa do aluno (RF23)
CREATE TABLE registro_treino (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id        INT  NOT NULL,
  rotina_id       INT,                              -- rotina seguida (pode ser NULL)
  data_treino     DATE NOT NULL,
  inicio          DATETIME,
  fim             DATETIME,
  observacoes     TEXT,
  sincronizado    BOOLEAN NOT NULL DEFAULT TRUE,    -- FALSE = registrado offline (RF26)
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_regtreino_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
  CONSTRAINT fk_regtreino_rotina
    FOREIGN KEY (rotina_id) REFERENCES rotina(id) ON DELETE SET NULL,

  INDEX idx_regtreino_aluno_data (aluno_id, data_treino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalhe de cada exercício realizado dentro de um treino (RF23, RF24)
CREATE TABLE registro_exercicio (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  registro_treino_id     INT NOT NULL,
  exercicio_id           INT NOT NULL,
  serie_numero           INT NOT NULL,
  repeticoes_realizadas  INT,
  carga_utilizada        DECIMAL(6,2),               -- kg
  registrado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_regexerc_treino
    FOREIGN KEY (registro_treino_id) REFERENCES registro_treino(id) ON DELETE CASCADE,
  CONSTRAINT fk_regexerc_exercicio
    FOREIGN KEY (exercicio_id) REFERENCES exercicio(id) ON DELETE RESTRICT,

  INDEX idx_regexerc_treino (registro_treino_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- METAS E CONQUISTAS
-- =============================================================================

-- Metas definidas pelo aluno (RF22)
CREATE TABLE meta (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id        INT          NOT NULL,
  descricao       VARCHAR(255) NOT NULL,
  tipo            VARCHAR(50),                       -- ex.: frequencia, carga, peso_corporal
  criterio_json   JSON,                              -- critérios para atingir a meta
  alcancada       BOOLEAN      NOT NULL DEFAULT FALSE,
  alcancada_em    DATETIME,
  criada_em       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_meta_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_meta_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conquistas alcançadas automaticamente (RF22, RN15)
CREATE TABLE conquista (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id         INT          NOT NULL,
  meta_id          INT,                              -- meta que gerou a conquista (pode ser NULL)
  titulo           VARCHAR(150) NOT NULL,
  descricao        VARCHAR(300),
  conquistada_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_conquista_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
  CONSTRAINT fk_conquista_meta
    FOREIGN KEY (meta_id) REFERENCES meta(id) ON DELETE SET NULL,

  INDEX idx_conquista_aluno (aluno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- AVALIAÇÃO PÓS-TREINO
-- =============================================================================

-- Avaliação que o aluno faz ao final do treino (RF29)
CREATE TABLE avaliacao_treino (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id            INT  NOT NULL,
  registro_treino_id  INT  NOT NULL,
  nota                INT  NOT NULL,                 -- 1 a 5
  comentario          TEXT,
  criada_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_avaliacao_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,
  CONSTRAINT fk_avaliacao_treino
    FOREIGN KEY (registro_treino_id) REFERENCES registro_treino(id) ON DELETE CASCADE,
  CONSTRAINT chk_avaliacao_nota
    CHECK (nota BETWEEN 1 AND 5),
  CONSTRAINT uk_avaliacao_treino
    UNIQUE (registro_treino_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- HISTÓRICO DE PERFIL (EVOLUÇÃO)
-- =============================================================================

-- Snapshots do perfil do aluno ao longo do tempo (RF24, RN22)
-- Registrado quando peso, altura ou nível mudam
CREATE TABLE perfil_historico (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id       INT NOT NULL,
  peso           DECIMAL(5,2),
  altura         DECIMAL(3,2),
  nivel          ENUM('iniciante','intermediario','avancado'),
  registrado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_perfhist_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_perfhist_aluno_data (aluno_id, registrado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ALERTA DE USO PERIGOSO
-- =============================================================================

-- Registro de perguntas estranhas ou perigosas (RF31, RN27)
CREATE TABLE alerta_uso (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id           INT  NOT NULL,
  trecho_pergunta    TEXT NOT NULL,
  categoria          VARCHAR(50),
  horario            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_enviado      BOOLEAN  NOT NULL DEFAULT FALSE,

  CONSTRAINT fk_alerta_aluno
    FOREIGN KEY (aluno_id) REFERENCES aluno(id) ON DELETE CASCADE,

  INDEX idx_alerta_horario (horario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- LOG DE AUDITORIA
-- =============================================================================

-- Registro de ações importantes do sistema (RNF16)
-- Exemplos: login, check-in, agendamento, alerta, exportação
CREATE TABLE log_auditoria (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT,                                 -- pode ser NULL para ações do sistema
  acao         VARCHAR(50)  NOT NULL,                -- ex.: LOGIN, CHECKIN, AGENDAMENTO
  entidade     VARCHAR(50),                          -- ex.: aluno, agendamento, rotina
  entidade_id  INT,
  detalhes     TEXT,
  ip           VARCHAR(45),
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_log_usuario (usuario_id),
  INDEX idx_log_criado (criado_em),
  INDEX idx_log_acao (acao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

