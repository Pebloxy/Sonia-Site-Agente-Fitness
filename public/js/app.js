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

    // STT: Reconhecimento de Fala pelo microfone (Web Speech API; funciona no Chrome e no Edge, com internet)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const aviso = texto => this.adicionarAviso(texto);

    if (!SpeechRecognition) {
      if (btnMic) btnMic.title = 'Reconhecimento de voz não suportado neste navegador';
      btnMic?.addEventListener('click', () => aviso('🎤 Este navegador não tem reconhecimento de voz. Use o Google Chrome ou o Microsoft Edge.'));
      return;
    }

    const inputField = () => document.getElementById('chat-input');
    let erroMic = false;
    let textoFinal = '';

    const criar = () => {
      const r = new SpeechRecognition();
      r.lang = 'pt-BR';
      r.continuous = false;
      r.interimResults = true; // mostra o que está sendo dito enquanto a pessoa fala

      r.onstart = () => {
        this.isListening = true;
        erroMic = false;
        textoFinal = '';
        btnMic?.classList.add('active');
      };

      r.onresult = event => {
        let parcial = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) textoFinal += t; else parcial += t;
        }
        const campo = inputField();
        if (campo) { campo.value = (textoFinal + parcial).trim(); this.ajustarAlturaInput?.(); }
      };

      r.onerror = event => {
        erroMic = true;
        const msgs = {
          'not-allowed': '🎤 O microfone está bloqueado. Clique no cadeado ao lado do endereço do site, ative "Microfone" e tente de novo.',
          'service-not-allowed': '🎤 O microfone está bloqueado. Clique no cadeado ao lado do endereço do site, ative "Microfone" e tente de novo.',
          'no-speech': '🎤 Não ouvi nada. Clique no microfone e fale logo em seguida.',
          'audio-capture': '🎤 Não encontrei um microfone neste computador. Confira se ele está conectado.',
          'network': '🎤 O reconhecimento de voz precisa de internet (e não funciona em alguns navegadores, como o Brave). Tente no Chrome ou no Edge.',
          'language-not-supported': '🎤 O navegador não oferece reconhecimento de voz em português.',
        };
        if (event.error !== 'aborted') aviso(msgs[event.error] || `🎤 Não consegui usar o microfone (${event.error}).`);
      };

      r.onend = () => {
        this.isListening = false;
        btnMic?.classList.remove('active');
        const campo = inputField();
        const texto = (campo?.value || '').trim();
        if (!erroMic && texto) {
          campo.value = '';
          this.ajustarAlturaInput?.();
          this.enviarMensagem(texto); // envia o que foi falado
        }
      };
      return r;
    };

    btnMic?.addEventListener('click', () => {
      if (this.isListening) { this.recognition?.stop(); return; }
      this.pararFala?.(); // a Sonia para de falar para não "ouvir" a si mesma
      try {
        this.recognition = criar();
        this.recognition.start();
      } catch (err) {
        aviso('🎤 Não consegui iniciar o microfone. Atualize a página e tente de novo.');
      }
    });
  },

  adicionarAviso(texto) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'msg aviso';
    div.textContent = texto;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
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

    // a caixa de texto cresce conforme o aluno escreve (até 5 linhas)
    this.ajustarAlturaInput = () => {
      if (!input) return;
      const MAX = 140;
      const bordas = input.offsetHeight - input.clientHeight; // altura das bordas (a caixa usa border-box)
      input.style.height = 'auto';
      const alvo = input.scrollHeight + bordas;
      input.style.height = Math.min(alvo, MAX) + 'px';
      input.style.overflowY = alvo > MAX ? 'auto' : 'hidden'; // a barra só aparece quando passa do limite
    };
    input?.addEventListener('input', this.ajustarAlturaInput);

    // Enter envia; Shift+Enter quebra a linha
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form?.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.ajustarAlturaInput();
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

  // Cartões que acompanham a resposta da Sonia (vídeo do exercício, horários, modalidades, treino do dia...)
  esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  adicionarCartoes(cards) {
    const container = document.getElementById('chat-messages');
    if (!container || !Array.isArray(cards) || !cards.length) return;

    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'chat-card';

      if (c.tipo === 'video' && /^[\w-]{11}$/.test(c.videoId || '')) {
        el.innerHTML = `
          <div class="chat-card-head"><span class="chat-card-ico">▶️</span><div><b>${this.esc(c.titulo)}</b><small>${this.esc(c.detalhe || '')}</small></div></div>
          <div class="video-box" data-id="${c.videoId}">
            <img src="https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg" alt="Vídeo: ${this.esc(c.titulo)}" loading="lazy">
            <button type="button" class="video-play" aria-label="Assistir vídeo">▶</button>
          </div>
          <a class="chat-card-link" href="${this.esc(c.url)}" target="_blank" rel="noopener">Abrir no YouTube ↗</a>`;
        el.querySelector('.video-play').addEventListener('click', () => {
          const box = el.querySelector('.video-box');
          box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&rel=0" title="${this.esc(c.titulo)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        });
      } else if (c.tipo === 'lista') {
        const itens = (c.itens || []).map(i => `
          <li><div><b>${this.esc(i.titulo)}</b>${i.extra ? `<small>${this.esc(i.extra)}</small>` : ''}</div><span>${this.esc(i.detalhe || '')}</span></li>`).join('');
        el.innerHTML = `
          <div class="chat-card-head"><span class="chat-card-ico">${c.icone || '📋'}</span><div><b>${this.esc(c.titulo)}</b>${c.subtitulo ? `<small>${this.esc(c.subtitulo)}</small>` : ''}</div></div>
          <ul class="chat-card-list">${itens}</ul>`;
      } else {
        return;
      }
      container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
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
      this.adicionarCartoes(data.cards);
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
      container.innerHTML = `<div class="card"><h3>Acesso restrito</h3><p>Faça login para consultar sua rotina de treinos personalizada prescrita pelo seu instrutor.<br>Para demonstração: matrícula <b>12345678912</b> e senha <b>PedroGabrielPedro</b>.</p></div>`;
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
      const fichas = data.data.fichas || [];

      if (!exercicios.length && !fichas.length) {
        container.innerHTML = `<div class="card"><h3>Dia de Descanso! 😴</h3><p>Não há exercícios programados para hoje na sua rotina (${data.data.diaSemana}). Aproveite para recuperar a musculatura!</p></div>`;
        return;
      }

      const renderCard = (ex) => `
        <div class="card">
          <h3>${ex.nome}</h3>
          <p><strong>Etapa:</strong> ${ex.etapa || 'Principal'} | <strong>Grupo:</strong> ${ex.grupo_muscular || '-'}</p>
          <p><strong>Séries:</strong> ${ex.series} x ${ex.repeticoes} reps | <strong>Carga sugerida:</strong> ${ex.carga_sugerida ? `${ex.carga_sugerida}kg` : 'Livre'}</p>
          <p>${ex.descricao || ''}</p>
        </div>
      `;

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <h2 style="color:var(--primary-orange); margin:0;">Meus Treinos & Rotinas</h2>
          <button id="btn-abrir-concluir-treino" class="card-action-btn" style="background:var(--primary-orange); color:#fff; border:none; padding:8px 16px;">Concluir Treino & Avaliar</button>
        </div>
        <div class="card" style="margin-bottom:16px; border-left: 4px solid var(--primary-orange);">
          <p><strong>Lembrete de Segurança da Sonia (RN23):</strong> Ao terminar cada exercício, lembre-se de guardar os halteres e anilhas nos suportes e travar as máquinas para segurança de todos! 💪</p>
        </div>
      `;

      if (fichas && fichas.length) {
        html += `
          <div class="treinos-fichas-nav" style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            ${fichas.map((f, idx) => `
              <button type="button" class="ficha-tab-btn" data-idx="${idx}" style="padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; border:1px solid #333; background:#1a1b20; color:var(--text-muted); transition:0.2s;">
                ${f.titulo}
              </button>
            `).join('')}
            <button type="button" class="ficha-tab-btn" data-idx="todos" style="padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; border:1px solid #333; background:#1a1b20; color:var(--text-muted); transition:0.2s;">
              📋 Todas as Fichas
            </button>
          </div>
          <div id="ficha-detalhe-container"></div>
        `;
      } else {
        html += `
          <h3 style="color:var(--primary-orange); margin-bottom:8px;">Treino de Hoje (${data.data.diaSemana.toUpperCase()})</h3>
          <div class="card-grid">${exercicios.map(renderCard).join('')}</div>
        `;
      }

      container.innerHTML = html;

      if (fichas && fichas.length) {
        const renderFichaView = (target) => {
          const detail = document.getElementById('ficha-detalhe-container');
          if (!detail) return;
          const btns = container.querySelectorAll('.ficha-tab-btn');
          btns.forEach(b => {
            const isMatch = b.getAttribute('data-idx') === String(target);
            b.style.background = isMatch ? 'var(--primary-orange)' : '#1a1b20';
            b.style.borderColor = isMatch ? 'var(--primary-orange)' : '#333';
            b.style.color = isMatch ? '#fff' : 'var(--text-muted)';
          });

          if (target === 'todos') {
            detail.innerHTML = fichas.map(f => `
              <div style="margin-bottom:24px;">
                <h3 style="color:var(--primary-orange); margin-bottom:4px; border-bottom:1px solid #282a30; padding-bottom:6px;">${f.titulo} <small style="color:var(--text-muted); font-size:0.85rem; font-weight:normal;">(${f.descricao || ''})</small></h3>
                <div class="card-grid" style="margin-top:10px;">${f.exercicios.map(renderCard).join('')}</div>
              </div>
            `).join('');
          } else {
            const idx = Number(target) || 0;
            const f = fichas[idx] || fichas[0];
            detail.innerHTML = `
              <div style="margin-bottom:12px;">
                <h3 style="color:var(--primary-orange); margin-bottom:4px;">${f.titulo}</h3>
                <p style="color:var(--text-muted); margin:0;">${f.descricao || ''}</p>
              </div>
              <div class="card-grid">${f.exercicios.map(renderCard).join('')}</div>
            `;
          }
        };

        container.querySelectorAll('.ficha-tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            renderFichaView(btn.getAttribute('data-idx'));
          });
        });

        renderFichaView(0);
      }

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

  // 8. Painel de Evolução (dados fictícios de demonstração) + Exportação CSV (RF24, RF25)
  svgLinha(valores, cor = 'var(--primary-orange)', w = 120, h = 34) {
    const max = Math.max(...valores), min = Math.min(...valores), f = max === min ? 1 : max - min;
    const pts = valores.map((v, i) => [(i / (valores.length - 1)) * w, h - 3 - ((v - min) / f) * (h - 8)]);
    const linha = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="ev-spark" preserveAspectRatio="none"><path d="${linha} L${w} ${h} L0 ${h} Z" fill="${cor}" opacity=".14"/><path d="${linha}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },

  svgAnel(feitos, meta, rotulo) {
    const p = Math.min(feitos / meta, 1), r = 42, c = 2 * Math.PI * r;
    return `<div class="ev-anel"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="ev-anel-fundo"/><circle cx="50" cy="50" r="${r}" class="ev-anel-valor" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/></svg><div class="ev-anel-texto"><b>${feitos}<small>/${meta}</small></b><span>${rotulo}</span></div></div>`;
  },

  async carregarDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (!this.token) {
      container.innerHTML = `<div class="card"><h3>Acesso restrito</h3><p>Faça login para visualizar sua evolução, metas e conquistas.<br>Para demonstração: matrícula <b>12345678912</b> e senha <b>PedroGabrielPedro</b>.</p></div>`;
      return;
    }

    container.innerHTML = `<p style="color:var(--text-muted)">Carregando dados de evolução...</p>`;
    try {
      const res = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${this.token}` } });
      const json = await res.json();
      const e = json.data?.estatisticas;
      if (!e) throw new Error('sem dados');
      const fmt = (n) => Number(n).toLocaleString('pt-BR');
      const seta = (v) => `<span class="ev-vs ${v >= 0 ? 'sobe' : 'desce'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}%</span>`;

      const kpi = (titulo, valor, sufixo, serie, extra = '') =>
        `<div class="ev-card ev-kpi"><div class="ev-kpi-topo"><span>${titulo}</span>${extra}</div><div class="ev-kpi-valor">${valor}<small>${sufixo}</small></div>${this.svgLinha(serie)}</div>`;

      // barras dos 12 meses
      const maxM = Math.max(...e.meses.map(m => m.total), 1);
      const barras = e.meses.map(m => `<div class="ev-barra-col"><div class="ev-barra-area"><div class="ev-barra ${m.atual ? 'atual' : ''}" style="height:${Math.max(4, (m.total / maxM) * 100)}%"><em>${m.total}</em></div></div><span>${m.rotulo}</span></div>`).join('');
      const linhaMedia = `<div class="ev-media" style="bottom:calc(${(e.media / maxM) * 100}% * .78 + 22px)"><span>média ${String(e.media).replace('.', ',')}</span></div>`;

      // horários
      const maxH = Math.max(...e.porHorario.map(x => x.total), 1);
      const horas = e.porHorario.map(x => `<div class="ev-barra-col"><div class="ev-barra-area"><div class="ev-barra ${x.hora === e.pico ? 'atual' : ''}" style="height:${Math.max(3, (x.total / maxH) * 100)}%"></div></div><span>${x.hora}</span></div>`).join('');

      // calendário de frequência
      const cal = e.calendario.map(col => `<div class="ev-cal-col">${col.map(d => `<i class="n${d.nivel}" title="${d.date.split('-').reverse().join('/')}${d.min ? ' · ' + d.modalidade + ' · ' + d.min + ' min' : ''}"></i>`).join('')}</div>`).join('');

      // modalidades (donut)
      const cores = ['#ff7a00', '#ffb15c', '#c24d00', '#ffd9a8'];
      let acc = 0;
      const R = 40, C = 2 * Math.PI * R;
      const fatias = e.modalidades.map((m, i) => { const len = (m.pct / 100) * C, s = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${cores[i % 4]}" stroke-width="14" stroke-dasharray="${Math.max(len - 1.5, 0).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 50 50)"/>`; acc += len; return s; }).join('');
      const legenda = e.modalidades.map((m, i) => `<li><i style="background:${cores[i % 4]}"></i>${m.nome}<b>${m.pct}%</b></li>`).join('');

      const cargas = e.cargas.map(c => `<div class="ev-carga"><div class="ev-carga-topo"><span>${c.nome}</span><b>${String(c.valores[7]).replace('.', ',')} kg <em>+${String(c.valores[7] - c.valores[0]).replace('.', ',')} kg</em></b></div>${this.svgLinha(c.valores, 'var(--primary-orange)', 160, 44)}</div>`).join('');

      const conquistas = e.conquistas.map(c => `<div class="ev-conq ${c.feito ? 'feito' : ''}"><div class="ev-conq-ico">${c.feito ? '🏆' : '🎯'}</div><div class="ev-conq-info"><b>${c.titulo}</b><span>${c.desc}</span><div class="ev-prog"><i style="width:${(c.atual / c.meta) * 100}%"></i></div></div><small>${c.atual}/${c.meta}</small></div>`).join('');

      container.innerHTML = `
        <div class="ev">
          <div class="ev-topo">
            <div><h2>Olá, ${e.primeiroNome}!</h2><p>${e.insight}</p></div>
            <button id="btn-export-csv" class="card-action-btn">Exportar CSV</button>
          </div>

          <div class="ev-kpis">
            ${kpi('Treinos no mês', e.kpis.treinosMes.valor, '', e.kpis.treinosMes.serie, seta(e.kpis.treinosMes.vs))}
            ${kpi('Sequência', e.kpis.sequencia.valor, ' dias 🔥', e.kpis.sequencia.serie)}
            ${kpi('Horas treinadas', String(e.kpis.horasMes.valor).replace('.', ','), ' h', e.kpis.horasMes.serie)}
            ${kpi('Calorias', fmt(e.kpis.caloriasMes.valor), ' kcal', e.kpis.caloriasMes.serie)}
          </div>

          <div class="ev-linha">
            <div class="ev-card ev-metas"><h4>Suas metas</h4><div class="ev-aneis">${this.svgAnel(e.metas.semana.feitos, e.metas.semana.meta, 'últimos 7 dias')}${this.svgAnel(e.metas.mes.feitos, e.metas.mes.meta, 'no mês')}</div><p class="ev-nota">${seta(e.metas.semana.vs)} em relação aos 7 dias anteriores</p></div>
            <div class="ev-card ev-grande"><h4>Treinos por mês</h4><div class="ev-grafico">${linhaMedia}<div class="ev-barras">${barras}</div></div></div>
          </div>

          <div class="ev-card"><h4>Frequência nas últimas 12 semanas</h4><div class="ev-cal-wrap"><div class="ev-cal-dias"><span>seg</span><span></span><span>qua</span><span></span><span>sex</span><span></span><span></span></div><div class="ev-cal">${cal}</div></div><div class="ev-cal-leg">menos <i class="n0"></i><i class="n1"></i><i class="n2"></i><i class="n3"></i><i class="n4"></i> mais</div></div>

          <div class="ev-linha tres">
            <div class="ev-card"><h4>Horário preferido <small>pico às ${e.pico}h</small></h4><div class="ev-grafico baixo"><div class="ev-barras fina">${horas}</div></div></div>
            <div class="ev-card"><h4>Modalidades</h4><div class="ev-donut"><svg viewBox="0 0 100 100">${fatias}</svg><ul>${legenda}</ul></div></div>
            <div class="ev-card"><h4>Evolução de carga</h4>${cargas}</div>
          </div>

          <div class="ev-card"><h4>Conquistas</h4><div class="ev-conqs">${conquistas}</div></div>
          <p class="ev-rodape">Dados fictícios de demonstração.</p>
        </div>`;

      document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        window.open(`/api/dashboard/exportar-csv?token=${this.token}`, '_blank');
      });
    } catch (_) {
      container.innerHTML = `<p style="color:var(--text-muted)">Erro ao carregar o painel.</p>`;
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