// Visualizador 3D da Sonia: WebGL puro, sem bibliotecas externas.
// Carrega um .glb simples (1 malha + 1 textura). O cenário da academia é uma "parede" 3D atrás da Sonia,
// vista pela MESMA câmera: ao aproximar, afastar ou arrastar, a perspectiva do fundo muda junto (paralaxe real).
(function () {
  const MODEL_URL = '/models/sonia.glb';
  const BG_URL = '/img/academia.jpg';
  const BG_DISTANCE = 2.2;   // distância da parede de fundo atrás da Sonia (m)
  const BG_Y = 0.0;          // ajuste vertical do cenário
  const FOV = 28 * Math.PI / 180;
  const DIST_MAX = 2.55;     // câmera mais afastada (corpo inteiro)
  const MAX_YAW = 0.5;       // giro máximo da câmera ao arrastar (~28°)
  const canvas = document.getElementById('avatar');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });

  // zoom: 0 = busto, 1 = corpo inteiro; começa no meio-corpo e alterna entre 3 enquadramentos
  const LEVELS = [0.45, 0, 1];
  let level = 0;
  const state = { speaking: 0, speakTarget: 0, zoom: LEVELS[0], zoomTarget: LEVELS[0], yaw: 0, yawTarget: 0 };
  const cycleZoom = () => { level = (level + 1) % LEVELS.length; state.zoomTarget = LEVELS[level]; };

  if (!gl) {
    document.getElementById('avatar-fallback').hidden = false;
    window.sonia = { setSpeaking() {}, toggleZoom() {} };
    return;
  }

  // ---------- matrizes (column-major) ----------
  const V = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  const M = {
    ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
      return o;
    },
    persp(fov, asp, n, f) {
      const t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
      o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
      return o;
    },
    rotY(a) { const c = Math.cos(a), s = Math.sin(a), o = M.ident(); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; },
    trans(x, y, z) { const o = M.ident(); o[12] = x; o[13] = y; o[14] = z; return o; },
    lookAt(e, t, up) {
      const z = V.norm(V.sub(e, t)), x = V.norm(V.cross(up, z)), y = V.cross(z, x), o = M.ident();
      o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[12] = -V.dot(x, e);
      o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[13] = -V.dot(y, e);
      o[2] = z[0]; o[6] = z[1]; o[10] = z[2]; o[14] = -V.dot(z, e);
      return o;
    },
  };

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // ---------- programa da Sonia ----------
  const prog = program(`#version 300 es
  in vec3 aPos; in vec3 aNor; in vec2 aUv;
  uniform mat4 uMVP; uniform mat4 uModel;
  out vec3 vN; out vec2 vUv; out vec3 vW;
  void main(){
    vec4 w = uModel * vec4(aPos,1.0);
    vW = w.xyz; vN = mat3(uModel) * aNor; vUv = aUv;
    gl_Position = uMVP * vec4(aPos,1.0);
  }`, `#version 300 es
  precision highp float;
  in vec3 vN; in vec2 vUv; in vec3 vW;
  uniform sampler2D uTex; uniform vec3 uCam;
  out vec4 outColor;
  void main(){
    vec3 n = normalize(vN);
    vec3 v = normalize(uCam - vW);
    vec3 key  = normalize(vec3(-0.45, 0.65, 0.85));
    vec3 fill = normalize(vec3( 0.70, 0.10, 0.55));
    float dk = max(dot(n,key),0.0) * 0.85;
    float df = max(dot(n,fill),0.0) * 0.30;
    float rim = pow(1.0 - max(dot(n,v),0.0), 3.0) * 0.30;
    vec3 tex = texture(uTex, vUv).rgb;
    // luz quente de fim de tarde (janelas) + preenchimento azulado, combinando com o cenário
    vec3 light = vec3(0.50,0.48,0.52) + vec3(1.0,0.93,0.82) * dk + vec3(0.62,0.74,1.0) * df;
    vec3 col = tex * light + vec3(1.0,0.62,0.30) * rim;
    outColor = vec4(col, 1.0);
  }`);
  const loc = {
    pos: gl.getAttribLocation(prog, 'aPos'), nor: gl.getAttribLocation(prog, 'aNor'), uv: gl.getAttribLocation(prog, 'aUv'),
    mvp: gl.getUniformLocation(prog, 'uMVP'), model: gl.getUniformLocation(prog, 'uModel'),
    tex: gl.getUniformLocation(prog, 'uTex'), cam: gl.getUniformLocation(prog, 'uCam'),
  };

  // ---------- programa do cenário (um plano grande atrás da Sonia) ----------
  const bgProg = program(`#version 300 es
  in vec2 aP;
  uniform mat4 uVP; uniform vec3 uCenter; uniform vec2 uSize;
  out vec2 vUv;
  void main(){
    vUv = vec2(aP.x + 0.5, 0.5 - aP.y);
    gl_Position = uVP * vec4(uCenter + vec3(aP * uSize, 0.0), 1.0);
  }`, `#version 300 es
  precision highp float;
  in vec2 vUv; uniform sampler2D uBg; out vec4 outColor;
  void main(){ outColor = vec4(texture(uBg, vUv).rgb * 0.92, 1.0); }`);
  const bgLoc = {
    p: gl.getAttribLocation(bgProg, 'aP'), vp: gl.getUniformLocation(bgProg, 'uVP'),
    center: gl.getUniformLocation(bgProg, 'uCenter'), size: gl.getUniformLocation(bgProg, 'uSize'), tex: gl.getUniformLocation(bgProg, 'uBg'),
  };
  const bgVao = gl.createVertexArray(); gl.bindVertexArray(bgVao);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5, -.5, .5, -.5, -.5, .5, .5, .5]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(bgLoc.p); gl.vertexAttribPointer(bgLoc.p, 2, gl.FLOAT, false, 0, 0);
  let bgTex = null, bgAspect = 941 / 1672;

  function makeTexture(bmp) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    return t;
  }

  // ---------- leitura do GLB ----------
  async function loadGLB(url) {
    const buf = await (await fetch(url)).arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('arquivo não é GLB');
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    const binStart = 20 + jsonLen + 8;
    const bin = buf.slice(binStart, binStart + dv.getUint32(20 + jsonLen, true));
    const view = (i) => { const v = json.bufferViews[i]; return bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };
    const acc = (i) => {
      const a = json.accessors[i], v = json.bufferViews[a.bufferView];
      const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
      const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
      const off = (v.byteOffset || 0) + (a.byteOffset || 0);
      return new T(bin.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT));
    };
    const prim = json.meshes[0].primitives[0];
    const pos = acc(prim.attributes.POSITION), uv = acc(prim.attributes.TEXCOORD_0);
    const idx = prim.indices !== undefined ? acc(prim.indices) : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
    const img = json.images[0];
    const blob = new Blob([view(img.bufferView)], { type: img.mimeType || 'image/png' });
    const bmp = await createImageBitmap(blob, { imageOrientation: 'none' });
    return { pos, uv, idx, bmp };
  }

  function normals(pos, idx) {
    const n = new Float32Array(pos.length);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
    }
    return n;
  }

  let mesh = null, count = 0, vao = null, texture = null;
  function upload(m) {
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const bind = (data, l, size) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    };
    bind(m.pos, loc.pos, 3); bind(normals(m.pos, m.idx), loc.nor, 3); bind(m.uv, loc.uv, 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    count = m.idx.length;
    texture = makeTexture(m.bmp);
    mesh = m;
  }

  // ---------- desenho ----------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  let last = performance.now(), t0 = last;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!mesh) return;
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const t = (now - t0) / 1000;
    state.speaking = lerp(state.speaking, state.speakTarget, 1 - Math.exp(-dt * 6));
    state.zoom = lerp(state.zoom, state.zoomTarget, 1 - Math.exp(-dt * 4));
    state.yaw = lerp(state.yaw, state.yawTarget, 1 - Math.exp(-dt * 8));

    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.04, 0.04, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // movimento da Sonia: balanço suave parada; mais "animada" quando fala
    const s = state.speaking;
    const rotY = Math.sin(t * 0.55) * 0.05 + Math.sin(t * 4.6) * 0.03 * s;
    const bob = Math.sin(t * 1.7) * 0.0025 + Math.abs(Math.sin(t * 8.5)) * 0.007 * s;
    const model = M.mul(M.trans(0, bob, 0), M.rotY(rotY));

    // câmera: busto (zoom=0) ou corpo inteiro (zoom=1); arrastar orbita a câmera em volta da Sonia
    const targetY = lerp(0.20, 0.0, state.zoom), dist = lerp(1.25, DIST_MAX, state.zoom);
    const asp = canvas.width / canvas.height;
    const proj = M.persp(FOV, asp, 0.1, 20);
    const a = Math.max(-MAX_YAW, Math.min(MAX_YAW, state.yaw));
    const eye = [dist * Math.sin(a), targetY + 0.02, dist * Math.cos(a)];
    const view = M.lookAt(eye, [0, targetY, 0], [0, 1, 0]);
    const vp = M.mul(proj, view);

    // ---- cenário: plano grande atrás da Sonia, dimensionado para cobrir qualquer enquadramento ----
    if (bgTex) {
      const farD = DIST_MAX + BG_DISTANCE;
      const visH = 2 * farD * Math.tan(FOV / 2);
      const needH = visH * 1.25;
      const needW = visH * asp * 1.25 + 2 * farD * Math.tan(MAX_YAW) * 1.15;
      const ph = Math.max(needH, needW / bgAspect), pw = ph * bgAspect;
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.useProgram(bgProg);
      gl.uniformMatrix4fv(bgLoc.vp, false, vp);
      gl.uniform3f(bgLoc.center, 0, BG_Y, -BG_DISTANCE);
      gl.uniform2f(bgLoc.size, pw, ph);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgTex); gl.uniform1i(bgLoc.tex, 0);
      gl.bindVertexArray(bgVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ---- Sonia ----
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.mvp, false, M.mul(vp, model));
    gl.uniformMatrix4fv(loc.model, false, model);
    gl.uniform3fv(loc.cam, eye);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(loc.tex, 0);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
  }

  // arrastar para olhar de outro ângulo (mouse ou toque); ao soltar, a câmera volta ao centro
  let dragging = false, lastX = 0, base = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    base = Math.max(-MAX_YAW, Math.min(MAX_YAW, base - (e.clientX - lastX) * 0.006)); lastX = e.clientX; state.yawTarget = base;
  });
  const end = () => { dragging = false; base = 0; state.yawTarget = 0; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', cycleZoom);

  window.sonia = {
    setSpeaking(on) { state.speakTarget = on ? 1 : 0; },
    toggleZoom: cycleZoom,
    setLevel(i) { level = i; state.zoomTarget = LEVELS[i]; state.zoom = LEVELS[i]; },   // usado em testes
    setYaw(a) { state.yaw = a; state.yawTarget = a; },                                  // usado em testes
    ready: false,
  };

  const loadBg = fetch(BG_URL).then((r) => r.blob()).then((b) => createImageBitmap(b, { imageOrientation: 'none' }))
    .then((bmp) => { bgTex = makeTexture(bmp); bgAspect = bmp.width / bmp.height; })
    .catch((e) => console.warn('Cenário não carregou:', e));
  Promise.all([loadGLB(MODEL_URL), loadBg]).then(([m]) => {
    upload(m); window.sonia.ready = true;
    document.getElementById('avatar-loading').hidden = true;
    requestAnimationFrame(frame);
  }).catch((e) => {
    console.error('Falha ao carregar o modelo 3D:', e);
    document.getElementById('avatar-loading').hidden = true;
    document.getElementById('avatar-fallback').hidden = false;
  });
})();
