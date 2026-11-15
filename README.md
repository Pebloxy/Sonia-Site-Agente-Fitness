# Sonia — Assistente Virtual para Academia 🏋️‍♀️🤖
> **Scriptum Orientadora e Navegadora da Inteligência Aplicada**  
> Projeto desenvolvido pelo **Grupo Scriptum** (FATEC Zona Sul - Dom Paulo Evaristo Arns).

---

## 📌 1. Visão Geral
A **Sonia** é uma assistente virtual inteligente com representação 3D interativa voltada a alunos de academia. O sistema foi concebido para transformar a rotina dos alunos, oferecendo suporte em linguagem natural via **Google Gemini API**, acompanhamento de treinos prescritos por instrutores, agendamento de aulas, check-ins, acompanhamento de metas e evolução física, com suporte completo a **acessibilidade** e **modo offline**.

> ⚠️ **Nota de Responsabilidade:** A Sonia atua exclusivamente como assistente de apoio e orientação geral. Ela **não** prescreve rotinas de treino, não cria fichas e não substitui personal trainers, médicos ou nutricionistas.

---

## 🛠️ 2. Tecnologias Utilizadas

- **Linguagem & Runtime:** JavaScript (Node.js 18+)
- **Backend API:** Express 5.x com arquitetura MVC em camadas
- **Banco de Dados:** MySQL 8+ com pool assíncrono (`mysql2/promise`)
- **Inteligência Artificial:** Google Gemini API com *Function Calling* e *System Instructions* personalizadas
- **Segurança & Autenticação:** JWT (`jsonwebtoken`), hash seguro de senhas com `bcryptjs`, proteção de cabeçalhos (`helmet`), limitadores de taxa (`express-rate-limit`) e `cors`
- **Frontend:** HTML5, CSS3 moderno com tema **Preto e Laranja**, JavaScript modular vanilla
- **Gráficos 3D:** Renderizador WebGL2 nativo (sem bibliotecas externas) para o avatar glTF da Sonia
- **Acessibilidade:** Síntese de Voz (TTS) e Reconhecimento de Fala (STT) via Web Speech API nativa, ajuste dinâmico de tamanho de fonte
- **Modo Offline & PWA:** Service Worker (`sw.js`), Web App Manifest (`manifest.json`) e fila de sincronização automática

---

## 🏛️ 3. Estrutura do Projeto

```
Sonia-Site-Agente-Fitness/
├── database/
│   ├── schema.sql           # Modelagem completa do MySQL (22 tabelas com índices)
│   └── seed.sql             # Carga inicial (academia, horários, modalidades, exercícios)
├── src/
│   ├── app.js               # Configuração do Express, middlewares de segurança e rotas
│   ├── config/
│   │   └── database.js      # Pool de conexões MySQL com fallback resiliente
│   ├── utils/
│   │   ├── errors.js        # Classes de erro HTTP padronizadas
│   │   └── helpers.js       # Regras de menor de idade, cálculo de nível e CSV
│   ├── middlewares/
│   │   ├── auth.js          # Validação de JWT obrigatória e opcional
│   │   ├── rateLimiter.js   # Limitadores contra brute-force e abusos
│   │   ├── logger.js        # Logging de requisições e persistência em log_auditoria
│   │   └── errorHandler.js  # Tratamento centralizado de exceções
│   ├── models/              # Camada de acesso a dados (MySQL e In-Memory Fallback)
│   ├── services/            # Camada de regras de negócio determinísticas
│   ├── controllers/         # Controladores REST da API
│   └── routes/              # Endpoints organizados sob /api/
├── public/                  # Frontend servido estaticamente
│   ├── css/
│   │   └── style.css        # Identidade visual Preto e Laranja, responsiva
│   ├── js/
│   │   ├── app.js           # Gerenciador de estado, abas, chat, voz e modais
│   │   └── offline.js       # Enfileiramento offline e sincronização automática
│   ├── models/
│   │   └── sonia.glb        # Modelo 3D da Sonia
│   ├── avatar.js            # Visualizador WebGL2 puro
│   ├── manifest.json        # Configuração PWA
│   ├── sw.js                # Service Worker para cache offline
│   └── index.html           # Interface da aplicação
├── tests/
│   ├── api.test.js          # Testes de rotas básicas e segurança
│   ├── gemini.test.js       # Testes do catálogo de ferramentas do Gemini
│   └── full_system.test.js  # Bateria completa de integração e regras de negócio
├── .env.example             # Modelo de variáveis de ambiente
├── persona.js               # Definição oficial da personalidade da Sonia
├── server.js                # Ponto de entrada da aplicação
└── package.json             # Dependências e scripts de execução
```

---

## 🚀 4. Como Rodar o Projeto

### Pré-requisitos
- **Node.js** (versão 18 ou superior): [nodejs.org](https://nodejs.org)
- *(Opcional)* **MySQL Server** (versão 8 ou superior)

### Passo a Passo

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   *Edite o arquivo `.env` para informar as credenciais do seu banco MySQL e sua chave gratuita da API do Google Gemini (obtida em [aistudio.google.com](https://aistudio.google.com)). Se não configurar a chave ou o banco de imediato, o sistema entra automaticamente em **Modo Teste Resiliente**.*

3. *(Opcional)* **Inicialize o Banco de Dados MySQL:**
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p sonia_db < database/seed.sql
   ```

4. **Inicie o servidor:**
   ```bash
   npm start
   ```

5. **Abra no navegador:**
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🧪 5. Executando os Testes Automatizados

Para rodar toda a bateria de testes de integração, segurança, regras de negócio e inteligência artificial:

```bash
npm test
```

---

## 🔒 6. Regras de Negócio e Segurança Implementadas

- **RN01:** Bloqueio temporário de 10 minutos após 3 erros consecutivos de senha.
- **RN02:** Agendamento em blocos de 1 hora com no máximo 3 alunos por horário.
- **RN03:** Prevenção de conflito de horários no mesmo dia.
- **RN04:** Cancelamento ou reagendamento permitido apenas com antecedência mínima de 2 horas.
- **RN05 & RF14:** Notificação 10 minutos antes do início do treino via Notification API.
- **RN06:** Tolerância de check-in de 10 minutos.
- **RN07 & RF16:** Identificação de alunos inativos (7 dias = incentivo da Sonia; 14 dias = aviso ao instrutor).
- **RN08:** Rotinas de treino elaboradas exclusivamente por instrutores humanos; a Sonia apenas consulta e explica.
- **RN10:** Orientação acolhedora para dor/lesão sem realizar diagnóstico, recomendando não treinar o local dolorido e falar com o instrutor.
- **RN11:** Interrupção imediata do treino e alerta médico urgente diante de sintomas graves (dor no peito, falta de ar, tontura severa).
- **RN13:** Encaminhamento de dúvidas administrativas, cancelamentos ou mensalidades diretamente à recepção.
- **RN16 & RF25:** Exportação de histórico de treinos em formato CSV restrita aos dados do próprio aluno autenticado.
- **RN25:** Bloqueio de cadastro de menores de 18 anos sem autorização do responsável legal (LGPD).
- **RN26 & RF05:** Cálculo automático do nível do aluno (iniciante, intermediário ou avançado) com base no tempo de treino.
- **RN27 & RF31:** Detecção de perguntas perigosas ou tentativas de prompt injection com registro imediato no banco e resposta segura.

