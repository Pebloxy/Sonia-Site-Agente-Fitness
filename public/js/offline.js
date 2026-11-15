// public/js/offline.js
// Gerenciador de sincronização offline e notificações (RF14, RF26, RNF12, RN05)

const OfflineSync = {
  QUEUE_KEY: 'sonia_offline_treinos_queue',

  init() {
    this.registrarServiceWorker();
    this.configurarSincronizacaoAutomatica();
    this.solicitarPermissaoNotificacoes();
  },

  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(reg => console.log('✔ Service Worker registrado:', reg.scope))
          .catch(err => console.warn('Falha ao registrar Service Worker:', err));
      });
    }
  },

  configurarSincronizacaoAutomatica() {
    window.addEventListener('online', () => {
      console.log('🌐 Conexão restabelecida. Iniciando sincronização de dados offline...');
      this.sincronizarTreinosPendentes();
    });
  },

  obterFila() {
    return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
  },

  salvarFila(fila) {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(fila));
  },

  /**
   * Salva um registro de treino localmente (seja por estar offline ou falha de rede)
   */
  enfileirarTreino(dadosTreino) {
    const fila = this.obterFila();
    const item = {
      localId: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      criadoEmLocal: new Date().toISOString(),
      dados: {
        ...dadosTreino,
        sincronizado: false, // Marca como offline (RF26)
      },
    };
    fila.push(item);
    this.salvarFila(fila);
    return item.localId;
  },

  /**
   * Envia os treinos enfileirados para o backend
   */
  async sincronizarTreinosPendentes() {
    const token = localStorage.getItem('sonia_token');
    if (!token || !navigator.onLine) return;

    const fila = this.obterFila();
    if (!fila.length) return;

    console.log(`⏳ Sincronizando ${fila.length} treino(s) pendente(s)...`);
    const itensNaoSincronizados = [];

    for (const item of fila) {
      try {
        const res = await fetch('/api/treinos/registro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.dados),
        });

        if (!res.ok) {
          itensNaoSincronizados.push(item);
        } else {
          console.log(`✔ Treino offline ${item.localId} sincronizado com sucesso!`);
        }
      } catch (err) {
        itensNaoSincronizados.push(item);
      }
    }

    this.salvarFila(itensNaoSincronizados);

    if (fila.length > itensNaoSincronizados.length) {
      const sincCont = fila.length - itensNaoSincronizados.length;
      alert(`🎉 Sincronização concluída! ${sincCont} treino(s) registrado(s) offline foram sincronizados.`);
    }
  },

  // Notificações: Aviso 10 min antes do treino (RF14, RN05)
  solicitarPermissaoNotificacoes() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  agendarAlertaTreino(horarioTreinoStr, nomeTreino = 'Treino') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const horarioTreino = new Date(horarioTreinoStr);
    const dezMinutosAntes = new Date(horarioTreino.getTime() - 10 * 60 * 1000);
    const msAteAlerta = dezMinutosAntes.getTime() - Date.now();

    if (msAteAlerta > 0) {
      setTimeout(() => {
        new Notification('Sonia – Hora do Treino!', {
          body: `Faltam 10 minutos para o seu ${nomeTreino}! Beba água e comece seu aquecimento! 💪`,
          icon: '/favicon.ico',
        });
      }, msAteAlerta);
    }
  },
};

// Inicializa o módulo offline
OfflineSync.init();

