// src/routes/tts.routes.js
const { Router } = require('express');
const { sintetizarVoz, obterStatusTts } = require('../services/tts.service');

const router = Router();

router.get('/status', async (req, res) => {
  const status = await obterStatusTts();
  res.json(status);
});

router.post('/', async (req, res) => {
  try {
    const text = String(req.body.text || '').slice(0, 700).trim();
    if (!text) return res.status(400).json({ error: 'Texto vazio.' });
    const { buffer, type } = await sintetizarVoz(text);
    res.setHeader('Content-Type', type);
    res.send(buffer);
  } catch (err) {
    res.status(503).json({ error: 'Voz indisponível. Usando síntese local do navegador.' });
  }
});

module.exports = router;

