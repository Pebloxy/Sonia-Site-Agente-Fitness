// public/js/app.js
// Lógica da aplicação frontend da Sonia

const App = {
  token: localStorage.getItem('sonia_token') || null,
  user: JSON.parse(localStorage.getItem('sonia_user') || 'null'),
  fontSizeDelta: 0,
  voiceEnabled: true,
  isListening: false,
  recognition: null,
  ptVoice: null,

  init() {
    this.setupNavigation();
    this.setupAccessibility();
    this.setupVoice();
    this.setupChat();
    this.setupAuthUI();
    this.setupTreinoModal();
    this.setupOfflineListener();
    this.atualizarStatusUsuario();
  },

  // 1. Navegação entre abas (Chat, Rotina, Agendamentos, Dashboard)
  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-view');
        this.switchView(targetView);
      });
    });
  },

  switchView(viewId) {
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById(viewId);
    if (activePanel) {
      activePanel.classList.add('active');
      if (viewId === 'rotina-view') this.carregarRotina();
      if (viewId === 'agendamentos-view') this.carregarAgendamentos();
      if (viewId === 'dashboard-view') this.carregarDashboard();
    }
  },

  // 2. Acessibilidade: Ajuste de tamanho de fonte (RF28)
  setupAccessibility() {
    const btnDecrease = document.getElementById('btn-font-dec');
    const btnIncrease = document.getElementById('btn-font-inc');

    btnDecrease?.addEventListener('click', () => {
      if (this.fontSizeDelta > -3) {
        this.fontSizeDelta--;
        this.applyFontSize();
      }
    });

    btnIncrease?.addEventListener('click', () => {
      if (this.fontSizeDelta < 5) {
        this.fontSizeDelta++;
        this.applyFontSize();
      }
    });
  },

  applyFontSize() {
    const base = 15 + this.fontSizeDelta;
    document.documentElement.style.setProperty('--font-base', `${base}px`);
  },

  // 3. Voz: Speech-to-Text (RF27) e Text-to-Speech com sincronização 3D
  setupVoice() {
    const synth = window.speechSynthesis;
    const btnVoice = document.getElementById('btn-voice');
    const btnMic = document.getElementById('btn-mic');

    // TTS: Escolha de voz em português
    const pickVoice = () => {
      if (!synth) return;
      const voices = synth.getVoices();
      this.ptVoice =
        voices.find(v => /pt[-_]BR/i.test(v.lang) && /female|feminina|maria|francisca|luciana|google/i.test(v.name)) ||
        voices.find(v => /pt[-_]BR/i.test(v.lang)) ||
        voices.find(v => /^pt/i.test(v.lang)) ||
        null;
    };

    if (synth) {
      pickVoice();
      synth.onvoiceschanged = pickVoice;
    }

    // Voz neural do servidor (edge-tts / Gemini TTS), se estiver disponível
    fetch('/api/tts/status').then(r => r.json()).then(d => { this.aiVoice = !!d.available; }).catch(() => {});

    btnVoice?.addEventListener('click', () => {
      this.voiceEnabled = !this.voiceEnabled;
      btnVoice.classList.toggle('active', this.voiceEnabled);
      btnVoice.textContent = this.voiceEnabled ? '🔊 Voz' : '🔇 Mudo';
      if (!this.voiceEnabled) this.pararFala();
    });

    // STT: Reconhecimento de Fala pelo microfone (Web Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        btnMic?.classList.add('active');
      };

      this.recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        const inputField = document.getElementById('chat-input');
        if (inputField) {
          inputField.value = transcript;
          this.enviarMensagem(transcript);
          inputField.value = '';
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        btnMic?.classList.remove('active');
      };

      btnMic?.addEventListener('click', () => {
        if (!this.isListening) {
          this.recognition.start();
        } else {
          this.recognition.stop();
        }
      });
    } else {
      if (btnMic) btnMic.title = 'Reconhecimento de voz não suportado neste navegador';
    }
  },

  // ---- fala da Sonia: voz neural do servidor (frase por frase) com a voz do navegador como reserva ----
  aiVoice: false,
  speakId: 0,
  curAudio: null,
  curDone: null,

  estadoFalando(on) {
    if (window.sonia?.setSpeaking) window.sonia.setSpeaking(on);
    const statusEl = document.getElementById('stage-status');
    if (statusEl) {
      if (on) statusEl.innerHTML = '<b>Sonia está falando…</b>';
      else statusEl.textContent = 'Arraste para girar · clique duas vezes para mudar o zoom';
    }
  },

  pararFala() {
    this.speakId++;
    if (this.curAudio) { this.curAudio.pause(); this.curAudio = null; }
    if (this.curDone) { this.curDone(); this.curDone = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this.estadoFalando(false);
  },

  // divide em frases (juntando as muito curtas) para tocar a 1ª logo e gerar as outras enquanto ela fala
  dividirFrases(t) {
    const partes = t.split(/(?<=[.!?…])\s+|\n+/).map(x => x.trim()).filter(Boolean);
    const out = [];
    for (const p of partes) {
      if (out.length && out[out.length - 1].length < 20) out[out.length - 1] += ' ' + p; else out.push(p);
    }
    if (out.length > 1 && out[out.length - 1].length < 15) out[out.length - 2] += ' ' + out.pop();
    return out.slice(0, 6);
  },

  buscarAudio(t) {
    return fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) })
      .then(r => { if (!r.ok) throw new Error('sem voz'); return r.blob(); })
      .then(b => URL.createObjectURL(b));
  },

  falarNavegador(limpo) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(limpo);
    utterance.lang = 'pt-BR';
    if (this.ptVoice) utterance.voice = this.ptVoice;
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.onstart = () => this.estadoFalando(true);
    utterance.onend = utterance.onerror = () => this.estadoFalando(false);
    synth.speak(utterance);
  },

  async falar(texto) {
    if (!this.voiceEnabled) return;
    const limpo = texto.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/[*_#`]/g, '').trim();
    if (!limpo) return;

    const id = ++this.speakId;
    if (this.aiVoice) {
      const frases = this.dividirFrases(limpo);
      let proxima = this.buscarAudio(frases[0]);
      let i = 0;
      try {
        for (; i < frases.length; i++) {
          const url = await proxima;
          if (id !== this.speakId) { URL.revokeObjectURL(url); return; } // chegou outra fala enquanto gerava
          if (i + 1 < frases.length) { proxima = this.buscarAudio(frases[i + 1]); proxima.catch(() => {}); } // já gera a próxima
          const audio = new Audio(url);
          this.curAudio = audio;
          await new Promise((resolve, reject) => {
            this.curDone = resolve;
            audio.onplay = () => this.estadoFalando(true);
            audio.onended = resolve;
            audio.onerror = () => reject(new Error('áudio'));
            audio.play().catch(reject);
          });
          URL.revokeObjectURL(url);
          this.curDone = null;
          if (id !== this.speakId) return;
        }
        this.estadoFalando(false);
        this.curAudio = null;
        return;
      } catch (e) {
        this.aiVoice = false; // voz neural falhou: o resto sai na voz do navegador
        this.curAudio = null;
        this.curDone = null;
        if (id !== this.speakId) return;
        this.falarNavegador(frases.slice(i).join(' '));
        return;
      }
    }
    this.falarNavegador(limpo);
  },

  // 4. Chat
  setupChat() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const chipsContainer = document.getElementById('chat-chips');

    form?.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.enviarMensagem(text);
    });

    chipsContainer?.addEventListener('click', e => {
      if (e.target.classList.contains('chip-btn')) {
        const text = e.target.textContent;
        this.enviarMensagem(text);
      }
    });

    // Mensagem de boas-vindas inicial da Sonia
    this.adicionarMensagemNaTela('sonia', 'Oi! Eu sou a Sonia, sua assistente aqui da academia! 💪 Bora treinar hoje? Você pode me perguntar sobre seus treinos, agendar aulas ou tirar dúvidas!');
  },

  adicionarMensagemNaTela(role, text, isTyping = false) {
    const container = document.getElementById('chat-messages');
    if (!container) return null;

    const div = document.createElement('div');
    div.className = `msg ${role}${isTyping ? ' typing' : ''}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  },

  async enviarMensagem(texto) {
    this.adicionarMensagemNaTela('user', texto);
    const typingIndicator = this.adicionarMensagemNaTela('sonia', 'Sonia está digitando...', true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: texto }),
      });

      const data = await res.json();
      typingIndicator.remove();

      const reply = data.reply || 'Ops, tive um imprevisto na conexão. Tente de novo!';
      this.adicionarMensagemNaTela('sonia', reply);
      this.falar(reply);
    } catch (err) {
      typingIndicator.remove();
      this.adicionarMensagemNaTela('sonia', 'Parece que perdi a conexão temporariamente. Vamos tentar de novo?');
    }
  },

  // 5. Interface de Autenticação (Login / Cadastro / LGPD)
  setupAuthUI() {
    const btnAuth = document.getElementById('btn-auth');
    const modalAuth = document.getElementById('modal-auth');
    const modalClose = document.getElementById('modal-auth-close');
    const authForm = document.getElementById('auth-form');
    const tabLogin = document.getElementById('tab-auth-login');
    const tabCadastro = document.getElementById('tab-auth-cadastro');
    const cadastroFields = document.getElementById('cadastro-fields');

    let mode = 'login';

    btnAuth?.addEventListener('click', () => {
      if (this.token) {
        // Logout
        if (confirm('Deseja realmente sair da sua conta?')) {
          localStorage.removeItem('sonia_token');
          localStorage.removeItem('sonia_user');
          this.token = null;
          this.user = null;
          this.atualizarStatusUsuario();
          alert('Você saiu da sua conta.');
        }
      } else {
        modalAuth?.removeAttribute('hidden');
      }
    });

    modalClose?.addEventListener('click', () => modalAuth?.setAttribute('hidden', 'true'));

    tabLogin?.addEventListener('click', () => {
      mode = 'login';
      tabLogin.classList.add('active');
      tabCadastro.classList.remove('active');
      cadastroFields.style.display = 'none';
      document.getElementById('auth-submit-btn').textContent = 'Entrar';
    });

    tabCadastro?.addEventListener('click', () => {
      mode = 'cadastro';
      tabCadastro.classList.add('active');
      tabLogin.classList.remove('active');
      cadastroFields.style.display = 'flex';
      document.getElementById('auth-submit-btn').textContent = 'Cadastrar';
    });

    authForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const matricula = document.getElementById('auth-matricula').value.trim();
      const senha = document.getElementById('auth-senha').value;

      try {
        if (mode === 'login') {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, senha }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || 'Falha no login');

          this.token = json.data.token;
          this.user = json.data.aluno;
          localStorage.setItem('sonia_token', this.token);
          localStorage.setItem('sonia_user', JSON.stringify(this.user));

          modalAuth?.setAttribute('hidden', 'true');
          this.atualizarStatusUsuario();

          // Verifica se precisa de consentimento LGPD (RF02)
          if (this.user.precisaConsentimento) {
            this.abrirModalConsentimento();
          }
        } else {
          // Cadastro
          const nome = document.getElementById('auth-nome').value.trim();
          const email = document.getElementById('auth-email').value.trim();
          const peso = document.getElementById('auth-peso').value;
          const altura = document.getElementById('auth-altura').value;
          const objetivo = document.getElementById('auth-objetivo').value;

          const res = await fetch('/api/auth/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula, senha, nome, email, peso, altura, objetivo }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || 'Falha no cadastro');

          alert('Cadastro realizado com sucesso! Agora faça login.');
          tabLogin.click();
        }
      } catch (err) {
        alert(err.message);
      }
    });

    // Consentimento LGPD
    const btnAceitarTermo = document.getElementById('btn-aceitar-lgpd');
    btnAceitarTermo?.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/consentimento', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
        });
        document.getElementById('modal-lgpd')?.setAttribute('hidden', 'true');
        alert('Termo de consentimento registrado com sucesso!');
      } catch (_) {
        document.getElementById('modal-lgpd')?.setAttribute('hidden', 'true');
      }
    });
  },

  abrirModalConsentimento() {
    document.getElementById('modal-lgpd')?.removeAttribute('hidden');
  },

  setupTreinoModal() {
    const modal = document.getElementById('modal-treino');
    const closeBtn = document.getElementById('modal-treino-close');
    const form = document.getElementById('treino-registro-form');

    closeBtn?.addEventListener('click', () => modal?.setAttribute('hidden', 'true'));

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const obs = document.getElementById('treino-obs').value.trim();
      const nota = parseInt(document.getElementById('treino-nota').value, 10);
      const comentario = document.getElementById('treino-comentario').value.trim();

      const dadosTreino = {
        data_treino: new Date().toISOString().slice(0, 10),
        observacoes: obs,
        avaliacao: {
          nota,
          comentario,
        },
      };

      if (!navigator.onLine) {
        // Modo Offline (RF26, RNF12)
        if (window.OfflineSync) {
          OfflineSync.enfileirarTreino(dadosTreino);
          modal?.setAttribute('hidden', 'true');
          alert('📡 Modo Offline: Seu treino e avaliação foram salvos no dispositivo! A sincronização ocorrerá automaticamente quando você se reconectar.');
          return;
        }
      }

      // Modo Online
      try {
        const res = await fetch('/api/treinos/registro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(dadosTreino),
        });

        const json = await res.json();
        modal?.setAttribute('hidden', 'true');
        alert(json.data?.mensagem || 'Treino e avaliação registrados com sucesso! Foco total! 💪');
      } catch (err) {
        // Fallback para fila offline se a requisição falhar por instabilidade
        if (window.OfflineSync) {
          OfflineSync.enfileirarTreino(dadosTreino);
          modal?.setAttribute('hidden', 'true');
          alert('Instabilidade na rede detectada. Treino salvo com segurança no seu dispositivo para sincronização automática!');
        } else {
          alert('Erro ao registrar treino.');
        }
      }
    });
  },

  atualizarStatusUsuario() {
    const btnAuth = document.getElementById('btn-auth');
    if (this.token && this.user) {
      if (btnAuth) btnAuth.textContent = `Olá, ${this.user.nome.split(' ')[0]} (Sair)`;
    } else {
      if (btnAuth) btnAuth.textContent = 'Entrar / Cadastrar';
    }
  },

  // 6. Carregamento de Rotinas de Treino (RF06, RF07)
  async carregarRotina() {
    const container = document.getElementById('rotina-content');
    if (!container) return;

    if (!this.token) {
      container.innerHTML = `<div class="card"><h3>Acesso restrito</h3><p>Faça login para consultar sua rotina de treinos personalizada prescrita pelo seu instrutor.</p></div>`;
      return;
    }

    container.innerHTML = `<p>Carregando seus treinos...</p>`;
    try {
      const res = await fetch('/api/treinos/hoje', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = await res.json();

      if (!data.data.possuiRotina) {
        container.innerHTML = `<div class="card"><h3>Sem rotina ativa</h3><p>${data.data.mensagem}</p></div>`;
        return;
      }

      const exercicios = data.data.exercicios || [];
      if (!exercicios.length) {
        container.innerHTML = `<div class="card"><h3>Dia de Descanso! 😴</h3><p>Não há exercícios programados para hoje na sua rotina (${data.data.diaSemana}). Aproveite para recuperar a musculatura!</p></div>`;
        return;
      }

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h2 style="color:var(--primary-orange);">Treino de Hoje (${data.data.diaSemana.toUpperCase()})</h2>
          <button id="btn-abrir-concluir-treino" class="card-action-btn" style="background:var(--primary-orange); color:#fff; border:none; padding:8px 16px;">Concluir Treino & Avaliar</button>
        </div>
        <div class="card" style="margin-bottom:16px; border-left: 4px solid var(--primary-orange);">
          <p><strong>Lembrete de Segurança da Sonia (RN23):</strong> Ao terminar cada exercício, lembre-se de guardar os halteres e anilhas nos suportes e travar as máquinas para segurança de todos! 💪</p>
        </div>
        <div class="card-grid">`;
      exercicios.forEach(ex => {
        html += `
          <div class="card">
            <h3>${ex.nome}</h3>
            <p><strong>Etapa:</strong> ${ex.etapa} | <strong>Grupo:</strong> ${ex.grupo_muscular || '-'}</p>
            <p><strong>Séries:</strong> ${ex.series} x ${ex.repeticoes} reps | <strong>Carga sugerida:</strong> ${ex.carga_sugerida ? `${ex.carga_sugerida}kg` : 'Livre'}</p>
            <p>${ex.descricao || ''}</p>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;

      document.getElementById('btn-abrir-concluir-treino')?.addEventListener('click', () => {
        document.getElementById('modal-treino')?.removeAttribute('hidden');
      });
    } catch (_) {
      container.innerHTML = `<p>Não foi possível carregar sua rotina no momento.</p>`;
    }
  },

  // 7. Carregamento de Agendamentos e Check-in (RF12, RF15)
  async carregarAgendamentos() {
    const container = document.getElementById('agendamentos-content');
    if (!container) return;

    if (!this.token) {
      container.innerHTML = `<div class="card"><h3>Acesso restrito</h3><p>Faça login para agendar aulas e registrar check-in.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <h3>Registrar Presença (Check-in)</h3>
        <p>Está na academia agora? Registre seu check-in e mantenha sua frequência em dia!</p>
        <button id="btn-fazer-checkin" class="card-action-btn" style="background:var(--primary-orange); color:#fff; border:none; padding:8px 16px; margin-top:8px;">Fazer Check-in Agora</button>
      </div>
      <div class="card">
        <h3>Regras de Agendamento</h3>
        <p>• Aulas de 1 hora com no máximo 3 alunos por bloco (RN02).<br>
        • Cancelamentos e reagendamentos devem ser feitos com no mínimo 2 horas de antecedência (RN04).</p>
      </div>
    `;

    document.getElementById('btn-fazer-checkin')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/agendamentos/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        alert(json.data.mensagem || 'Check-in realizado com sucesso!');
      } catch (err) {
        alert('Erro ao realizar check-in.');
      }
    });
  },

  // 8. Carregamento do Dashboard & Exportação CSV (RF24, RF25)
  async carregarDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (!this.token) {
      container.innerHTML = `<div class="card"><h3>Acesso restrito</h3><p>Faça login para visualizar sua evolução, metas e conquistas.</p></div>`;
      return;
    }

    container.innerHTML = `<p>Carregando dados de evolução...</p>`;
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const json = await res.json();
      const d = json.data;

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="color:var(--primary-orange);">Painel de Evolução</h2>
          <button id="btn-export-csv" class="card-action-btn">Exportar CSV</button>
        </div>
        <div class="card-grid">
          <div class="card">
            <h3>Seu Nível</h3>
            <p style="font-size:1.3rem; font-weight:bold; color:#fff; text-transform:capitalize;">${d.aluno?.nivel || 'Iniciante'}</p>
            <p>Calculado automaticamente a partir do seu tempo de treino.</p>
          </div>
          <div class="card">
            <h3>Presenças Registradas</h3>
            <p style="font-size:1.3rem; font-weight:bold; color:#fff;">${d.totalCheckinsRecentes} check-in(s)</p>
            <p>Mantenha a consistência para destravar novas conquistas!</p>
          </div>
          <div class="card">
            <h3>Metas e Conquistas</h3>
            <p>${d.conquistas?.length || 0} conquista(s) alcançada(s).</p>
          </div>
        </div>
      `;

      container.innerHTML = html;

      document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        window.open(`/api/dashboard/exportar-csv?token=${this.token}`, '_blank');
      });
    } catch (_) {
      container.innerHTML = `<p>Erro ao carregar dashboard.</p>`;
    }
  },

  // 9. Modo Offline Listener (RF26)
  setupOfflineListener() {
    const offlineBadge = document.getElementById('offline-badge');
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        offlineBadge?.setAttribute('hidden', 'true');
      } else {
        offlineBadge?.removeAttribute('hidden');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  },
};

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());