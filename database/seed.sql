-- =============================================================================
-- SONIA — Dados Iniciais (Seed)
-- Projeto: Assistente Virtual para Academia
-- Grupo Scriptum — FATEC Zona Sul
-- =============================================================================
-- Execute após o schema.sql:
--   mysql -u root -p sonia_db < database/seed.sql
-- =============================================================================

USE sonia_db;

-- =============================================================================
-- 1. ACADEMIA
-- =============================================================================

INSERT INTO academia (nome, endereco, telefone, email) VALUES
('Academia MoveFIT', 'Rua Exemplo, 100 - São Paulo, SP', '(11) 91234-5678', 'contato@movefit.com.br');

-- =============================================================================
-- 2. HORÁRIOS DE FUNCIONAMENTO
-- =============================================================================

INSERT INTO horario_funcionamento (academia_id, dia_semana, abertura, fechamento) VALUES
(1, 'segunda', '06:00:00', '22:00:00'),
(1, 'terca',   '06:00:00', '22:00:00'),
(1, 'quarta',  '06:00:00', '22:00:00'),
(1, 'quinta',  '06:00:00', '22:00:00'),
(1, 'sexta',   '06:00:00', '22:00:00'),
(1, 'sabado',  '08:00:00', '14:00:00');
-- Domingo: não inserido = fechado

-- =============================================================================
-- 3. MODALIDADES
-- =============================================================================

INSERT INTO modalidade (academia_id, nome, descricao, horarios) VALUES
(1, 'Musculação',     'Treinamento com pesos e aparelhos para desenvolvimento muscular.',          'Seg a Sex: 06h–22h | Sáb: 08h–14h'),
(1, 'Dança',          'Aulas de dança com ritmos variados como zumba, samba e funk.',               'Seg, Qua, Sex: 18h–19h'),
(1, 'Pilates',        'Exercícios de fortalecimento, flexibilidade e consciência corporal.',        'Ter, Qui: 09h–10h e 17h–18h'),
(1, 'Boxe',           'Treinamento de boxe com foco em condicionamento e técnica.',                 'Seg, Qua, Sex: 19h–20h'),
(1, 'Muay Thai',      'Artes marciais tailandesas com foco em defesa pessoal e condicionamento.',   'Ter, Qui: 19h–20h'),
(1, 'Funcional',      'Treino funcional com exercícios que simulam movimentos do dia a dia.',       'Seg a Sex: 07h–08h e 17h–18h'),
(1, 'Alongamento',    'Aulas de alongamento e relaxamento para todos os níveis.',                   'Seg a Sex: 12h–13h');

-- =============================================================================
-- 4. BLOCOS HORÁRIOS PARA AGENDAMENTO (RN02: 1h, máx 3 alunos)
-- =============================================================================

-- Segunda a sexta: blocos de 06h até 21h (último bloco: 21h–22h)
INSERT INTO bloco_horario (academia_id, dia_semana, hora_inicio, hora_fim, capacidade_maxima) VALUES
-- Segunda
(1, 'segunda', '06:00:00', '07:00:00', 3), (1, 'segunda', '07:00:00', '08:00:00', 3),
(1, 'segunda', '08:00:00', '09:00:00', 3), (1, 'segunda', '09:00:00', '10:00:00', 3),
(1, 'segunda', '10:00:00', '11:00:00', 3), (1, 'segunda', '11:00:00', '12:00:00', 3),
(1, 'segunda', '12:00:00', '13:00:00', 3), (1, 'segunda', '13:00:00', '14:00:00', 3),
(1, 'segunda', '14:00:00', '15:00:00', 3), (1, 'segunda', '15:00:00', '16:00:00', 3),
(1, 'segunda', '16:00:00', '17:00:00', 3), (1, 'segunda', '17:00:00', '18:00:00', 3),
(1, 'segunda', '18:00:00', '19:00:00', 3), (1, 'segunda', '19:00:00', '20:00:00', 3),
(1, 'segunda', '20:00:00', '21:00:00', 3), (1, 'segunda', '21:00:00', '22:00:00', 3),
-- Terça
(1, 'terca', '06:00:00', '07:00:00', 3), (1, 'terca', '07:00:00', '08:00:00', 3),
(1, 'terca', '08:00:00', '09:00:00', 3), (1, 'terca', '09:00:00', '10:00:00', 3),
(1, 'terca', '10:00:00', '11:00:00', 3), (1, 'terca', '11:00:00', '12:00:00', 3),
(1, 'terca', '12:00:00', '13:00:00', 3), (1, 'terca', '13:00:00', '14:00:00', 3),
(1, 'terca', '14:00:00', '15:00:00', 3), (1, 'terca', '15:00:00', '16:00:00', 3),
(1, 'terca', '16:00:00', '17:00:00', 3), (1, 'terca', '17:00:00', '18:00:00', 3),
(1, 'terca', '18:00:00', '19:00:00', 3), (1, 'terca', '19:00:00', '20:00:00', 3),
(1, 'terca', '20:00:00', '21:00:00', 3), (1, 'terca', '21:00:00', '22:00:00', 3),
-- Quarta
(1, 'quarta', '06:00:00', '07:00:00', 3), (1, 'quarta', '07:00:00', '08:00:00', 3),
(1, 'quarta', '08:00:00', '09:00:00', 3), (1, 'quarta', '09:00:00', '10:00:00', 3),
(1, 'quarta', '10:00:00', '11:00:00', 3), (1, 'quarta', '11:00:00', '12:00:00', 3),
(1, 'quarta', '12:00:00', '13:00:00', 3), (1, 'quarta', '13:00:00', '14:00:00', 3),
(1, 'quarta', '14:00:00', '15:00:00', 3), (1, 'quarta', '15:00:00', '16:00:00', 3),
(1, 'quarta', '16:00:00', '17:00:00', 3), (1, 'quarta', '17:00:00', '18:00:00', 3),
(1, 'quarta', '18:00:00', '19:00:00', 3), (1, 'quarta', '19:00:00', '20:00:00', 3),
(1, 'quarta', '20:00:00', '21:00:00', 3), (1, 'quarta', '21:00:00', '22:00:00', 3),
-- Quinta
(1, 'quinta', '06:00:00', '07:00:00', 3), (1, 'quinta', '07:00:00', '08:00:00', 3),
(1, 'quinta', '08:00:00', '09:00:00', 3), (1, 'quinta', '09:00:00', '10:00:00', 3),
(1, 'quinta', '10:00:00', '11:00:00', 3), (1, 'quinta', '11:00:00', '12:00:00', 3),
(1, 'quinta', '12:00:00', '13:00:00', 3), (1, 'quinta', '13:00:00', '14:00:00', 3),
(1, 'quinta', '14:00:00', '15:00:00', 3), (1, 'quinta', '15:00:00', '16:00:00', 3),
(1, 'quinta', '16:00:00', '17:00:00', 3), (1, 'quinta', '17:00:00', '18:00:00', 3),
(1, 'quinta', '18:00:00', '19:00:00', 3), (1, 'quinta', '19:00:00', '20:00:00', 3),
(1, 'quinta', '20:00:00', '21:00:00', 3), (1, 'quinta', '21:00:00', '22:00:00', 3),
-- Sexta
(1, 'sexta', '06:00:00', '07:00:00', 3), (1, 'sexta', '07:00:00', '08:00:00', 3),
(1, 'sexta', '08:00:00', '09:00:00', 3), (1, 'sexta', '09:00:00', '10:00:00', 3),
(1, 'sexta', '10:00:00', '11:00:00', 3), (1, 'sexta', '11:00:00', '12:00:00', 3),
(1, 'sexta', '12:00:00', '13:00:00', 3), (1, 'sexta', '13:00:00', '14:00:00', 3),
(1, 'sexta', '14:00:00', '15:00:00', 3), (1, 'sexta', '15:00:00', '16:00:00', 3),
(1, 'sexta', '16:00:00', '17:00:00', 3), (1, 'sexta', '17:00:00', '18:00:00', 3),
(1, 'sexta', '18:00:00', '19:00:00', 3), (1, 'sexta', '19:00:00', '20:00:00', 3),
(1, 'sexta', '20:00:00', '21:00:00', 3), (1, 'sexta', '21:00:00', '22:00:00', 3),
-- Sábado: 08h–14h
(1, 'sabado', '08:00:00', '09:00:00', 3), (1, 'sabado', '09:00:00', '10:00:00', 3),
(1, 'sabado', '10:00:00', '11:00:00', 3), (1, 'sabado', '11:00:00', '12:00:00', 3),
(1, 'sabado', '12:00:00', '13:00:00', 3), (1, 'sabado', '13:00:00', '14:00:00', 3);

-- =============================================================================
-- 5. CATÁLOGO DE EXERCÍCIOS
-- =============================================================================

-- ---- PEITO ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Supino reto com barra', 'Peito',
 'Exercício fundamental para desenvolvimento do peitoral maior.',
 'Deite no banco reto, segure a barra com as mãos um pouco mais abertas que a largura dos ombros. Desça a barra controladamente até tocar levemente o peito e empurre de volta até estender os braços. Mantenha os pés firmes no chão e as escápulas retraídas.'),

('Supino inclinado com halteres', 'Peito',
 'Trabalha a parte superior do peitoral com maior amplitude de movimento.',
 'Ajuste o banco a 30-45 graus. Segure um halter em cada mão na altura do peito. Empurre os halteres para cima até estender os braços, depois desça controladamente. Mantenha os cotovelos ligeiramente abaixo dos ombros.'),

('Crucifixo com halteres', 'Peito',
 'Exercício de isolamento que trabalha a abertura e o alongamento do peitoral.',
 'Deite no banco reto com um halter em cada mão, braços estendidos acima do peito. Abra os braços para os lados com os cotovelos levemente flexionados, até sentir o alongamento. Retorne controladamente à posição inicial.'),

('Crossover no cabo', 'Peito',
 'Exercício no cabo que permite trabalhar o peitoral em diferentes ângulos.',
 'Posicione-se entre as polias altas. Segure as alças e dê um passo à frente. Com os cotovelos levemente flexionados, traga as mãos para a frente do corpo em arco. Retorne controladamente.');

-- ---- COSTAS ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Puxada frontal', 'Costas',
 'Exercício que trabalha o latíssimo do dorso e bíceps.',
 'Sente-se na máquina de puxada, segure a barra com as mãos mais abertas que os ombros. Puxe a barra até a altura do queixo, aproximando as escápulas. Retorne controladamente sem soltar o peso de uma vez.'),

('Remada curvada com barra', 'Costas',
 'Exercício composto que trabalha as costas em profundidade.',
 'Em pé, incline o tronco para a frente em 45 graus com os joelhos levemente flexionados. Segure a barra e puxe em direção ao abdômen, apertando as escápulas. Desça controladamente. Mantenha as costas retas durante todo o movimento.'),

('Remada unilateral com halter', 'Costas',
 'Permite foco em cada lado das costas separadamente.',
 'Apoie uma mão e um joelho no banco. Com a outra mão, segure o halter e puxe em direção ao quadril, mantendo o cotovelo próximo ao corpo. Desça controladamente.'),

('Pulley frente', 'Costas',
 'Exercício no cabo para trabalhar a largura das costas.',
 'Sente-se na máquina, segure a barra com pegada fechada. Puxe até o peito mantendo o tronco levemente inclinado para trás. Retorne controladamente.');

-- ---- OMBROS ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Desenvolvimento com halteres', 'Ombros',
 'Exercício composto para o deltóide que desenvolve força e volume nos ombros.',
 'Sentado ou em pé, segure os halteres na altura dos ombros com as palmas para a frente. Empurre para cima até estender os braços. Desça controladamente até os ombros.'),

('Elevação lateral', 'Ombros',
 'Isolamento do deltóide lateral para dar largura aos ombros.',
 'Em pé, segure os halteres ao lado do corpo. Eleve os braços para os lados até a altura dos ombros, com os cotovelos levemente flexionados. Desça controladamente. Evite usar impulso.'),

('Elevação frontal', 'Ombros',
 'Trabalha a parte frontal dos ombros.',
 'Em pé, segure os halteres à frente das coxas. Eleve um braço de cada vez (ou ambos) até a altura dos ombros. Desça controladamente.');

-- ---- BÍCEPS ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Rosca direta com barra', 'Bíceps',
 'Exercício clássico para desenvolvimento dos bíceps.',
 'Em pé, segure a barra com as palmas para cima na largura dos ombros. Flexione os cotovelos trazendo a barra até os ombros. Desça controladamente. Mantenha os cotovelos fixos ao lado do corpo.'),

('Rosca alternada com halteres', 'Bíceps',
 'Permite trabalhar cada bíceps separadamente com rotação do punho.',
 'Em pé, segure os halteres com as palmas viradas para o corpo. Alterne a flexão dos braços, girando o punho para cima durante o movimento. Desça controladamente.'),

('Rosca martelo', 'Bíceps',
 'Trabalha o bíceps e o braquiorradial com pegada neutra.',
 'Em pé, segure os halteres com as palmas viradas uma para a outra (pegada neutra). Flexione os cotovelos sem girar o punho. Desça controladamente.');

-- ---- TRÍCEPS ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Tríceps no cabo com corda', 'Tríceps',
 'Exercício de isolamento do tríceps com corda na polia alta.',
 'Em pé, de frente para a polia alta, segure a corda. Estenda os cotovelos empurrando a corda para baixo, abrindo as pontas no final. Retorne controladamente. Mantenha os cotovelos fixos ao lado do corpo.'),

('Tríceps testa com barra', 'Tríceps',
 'Trabalha o tríceps na posição deitada.',
 'Deite no banco reto, segure a barra com as mãos próximas. Estenda os braços acima do peito. Flexione os cotovelos descendo a barra em direção à testa. Estenda novamente. Controle o movimento.'),

('Mergulho no banco', 'Tríceps',
 'Exercício com peso corporal para tríceps.',
 'Apoie as mãos na borda do banco atrás de você, pernas estendidas. Flexione os cotovelos descendo o corpo. Empurre de volta até estender os braços. Mantenha as costas próximas ao banco.');

-- ---- PERNAS ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Agachamento livre', 'Pernas',
 'Exercício composto fundamental que trabalha quadríceps, glúteos e posterior.',
 'Com a barra apoiada nos trapézios, pés na largura dos ombros. Flexione os joelhos e quadris descendo como se fosse sentar. Desça até as coxas ficarem paralelas ao chão. Empurre o chão e retorne. Mantenha o peito aberto e as costas retas.'),

('Leg press 45°', 'Pernas',
 'Exercício para quadríceps e glúteos na máquina.',
 'Sente-se na máquina com os pés na plataforma na largura dos ombros. Solte a trava e desça a plataforma flexionando os joelhos até 90 graus. Empurre de volta sem travar os joelhos. Não retire os glúteos do assento.'),

('Cadeira extensora', 'Pernas',
 'Isolamento do quadríceps na máquina.',
 'Sente-se na máquina com as canelas apoiadas no rolo. Estenda os joelhos elevando o peso. Desça controladamente. Ajuste o encosto para que os joelhos fiquem alinhados com o eixo da máquina.'),

('Mesa flexora', 'Pernas',
 'Isolamento dos isquiotibiais (posterior da coxa).',
 'Deite de bruços na mesa flexora com os calcanhares sob o rolo. Flexione os joelhos trazendo os calcanhares em direção aos glúteos. Desça controladamente.'),

('Stiff', 'Pernas',
 'Trabalha isquiotibiais e glúteos com ênfase no alongamento.',
 'Em pé, segure a barra ou halteres. Com os joelhos levemente flexionados, incline o tronco para a frente mantendo as costas retas. Desça até sentir o alongamento na parte posterior. Retorne à posição ereta.'),

('Panturrilha em pé', 'Pernas',
 'Fortalecimento das panturrilhas (gastrocnêmio e sóleo).',
 'Na máquina de panturrilha em pé, apoie os ombros nas almofadas. Fique na ponta dos pés e suba o máximo possível. Desça controladamente abaixo do nível do degrau para alongar.');

-- ---- CORE / ABDÔMEN ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Abdominal supra', 'Abdômen',
 'Exercício clássico para a parte superior do reto abdominal.',
 'Deite de costas com os joelhos flexionados e os pés no chão. Com as mãos atrás da cabeça, eleve o tronco contraindo o abdômen. Desça controladamente. Não puxe o pescoço.'),

('Prancha abdominal', 'Abdômen',
 'Exercício isométrico que fortalece todo o core.',
 'Apoie os antebraços e as pontas dos pés no chão. Mantenha o corpo reto como uma tábua, contraindo abdômen e glúteos. Não deixe o quadril subir nem descer. Mantenha a posição pelo tempo indicado.');

-- ---- CARDIO ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Esteira', 'Cardio',
 'Exercício aeróbico para condicionamento cardiovascular.',
 'Inicie com uma caminhada leve para aquecer. Aumente a velocidade gradualmente. Mantenha a postura ereta e o olhar à frente. Finalize com uma desaceleração gradual.'),

('Bicicleta ergométrica', 'Cardio',
 'Exercício aeróbico de baixo impacto para as articulações.',
 'Ajuste a altura do banco para que o joelho fique levemente flexionado na pedalada mais baixa. Comece com resistência leve e aumente gradualmente.'),

('Elíptico', 'Cardio',
 'Exercício aeróbico que trabalha membros superiores e inferiores simultaneamente.',
 'Suba no aparelho, segure as barras móveis e mantenha um ritmo constante. Aumente a resistência conforme o condicionamento.');

-- ---- ALONGAMENTO ----
INSERT INTO exercicio (nome, grupo_muscular, descricao, instrucoes_execucao) VALUES
('Alongamento de quadríceps', 'Alongamento',
 'Alonga a parte frontal da coxa.',
 'Em pé, flexione um joelho e segure o pé atrás do corpo. Puxe levemente o calcanhar em direção ao glúteo. Mantenha 20-30 segundos e troque de lado.'),

('Alongamento de isquiotibiais', 'Alongamento',
 'Alonga a parte posterior da coxa.',
 'Sentado, estenda uma perna à frente e flexione a outra com o pé encostado na coxa. Incline o tronco para a frente em direção ao pé da perna estendida. Mantenha 20-30 segundos e troque de lado.'),

('Alongamento de peito e ombros', 'Alongamento',
 'Abre o peito e alivia tensão nos ombros.',
 'Em pé, entrelace as mãos atrás das costas. Estenda os braços e empurre as mãos para trás elevando levemente o peito. Mantenha 20-30 segundos.');

-- =============================================================================
-- 6. VÍDEOS DE DEMONSTRAÇÃO (exemplos com links genéricos)
-- =============================================================================
-- NOTA: Substituir as URLs por links reais de vídeos autorizados (RN17).
-- Os links abaixo são placeholders para demonstração.

INSERT INTO video_demonstracao (exercicio_id, titulo, url, fonte, autorizado) VALUES
(1,  'Como fazer supino reto corretamente',                 'https://www.youtube.com/watch?v=exemplo_supino',       'Canal Exemplo', TRUE),
(5,  'Puxada frontal: execução e erros comuns',             'https://www.youtube.com/watch?v=exemplo_puxada',       'Canal Exemplo', TRUE),
(6,  'Remada curvada com barra - tutorial completo',        'https://www.youtube.com/watch?v=exemplo_remada',       'Canal Exemplo', TRUE),
(18, 'Agachamento livre: guia para iniciantes',             'https://www.youtube.com/watch?v=exemplo_agachamento',  'Canal Exemplo', TRUE),
(19, 'Leg press 45° - execução correta e variações',       'https://www.youtube.com/watch?v=exemplo_legpress',     'Canal Exemplo', TRUE),
(25, 'Prancha abdominal: como fazer e progressões',         'https://www.youtube.com/watch?v=exemplo_prancha',      'Canal Exemplo', TRUE);

-- =============================================================================
-- 7. ALUNO DE DEMONSTRAÇÃO
-- =============================================================================

INSERT INTO aluno (matricula, nome, email, senha_hash, data_nascimento, peso, altura, tempo_treino_meses, objetivo, nivel) VALUES
('12345678912', 'Pedro Gabriel', 'pedro.gabriel@exemplo.com', '$2b$10$waKzCzxvtkLWZwvAAlRyeuvgu6zlASIrzSgQ9FgWZpBa3mCZHjX6u', '2001-08-20', 77.50, 1.78, 18, 'Hipertrofia e Ganho de Massa', 'intermediario');


