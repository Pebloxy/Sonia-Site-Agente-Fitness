// Visualizador 3D da Sonia: WebGL puro, sem bibliotecas externas.
// Carrega um arquivo .glb simples (1 malha + 1 textura) e anima o modelo por código.
(function () {
  const MODEL_URL = '/models/sonia.glb';
  const canvas = document.getElementById('avatar');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false });
  // zoom: 0 = busto, 1 = corpo inteiro; começa no meio-corpo e alterna entre 3 enquadramentos
  const LEVELS = [0.45, 0, 1];
  let level = 0;
  const state = { speaking: 0, speakTarget: 0, zoom: LEVELS[0], zoomTarget: LEVELS[0], drag: 0, dragTarget: 0 };
  const cycleZoom = () => { level = (level + 1) % LEVELS.length; state.zoomTarget = LEVELS[level]; };

  if (!gl) {
    document.getElementById('avatar-fallback').hidden = false;
    window.sonia = { setSpeaking() {}, toggleZoom() {} };
    return;
  }

  // ---------- matrizes (column-major) ----------
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
  };

  // ---------- shaders ----------
  const VS = `#version 300 es
  in vec3 aPos; in vec3 aNor; in vec2 aUv;
  uniform mat4 uMVP; uniform mat4 uModel;
  out vec3 vN; out vec2 vUv; out vec3 vW;
  void main(){
    vec4 w = uModel * vec4(aPos,1.0);
    vW = w.xyz; vN = mat3(uModel) * aNor; vUv = aUv;
    gl_Position = uMVP * vec4(aPos,1.0);
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec3 vN; in vec2 vUv; in vec3 vW;
  uniform sampler2D uTex; uniform vec3 uCam;
  out vec4 outColor;
  void main(){
    vec3 n = normalize(vN);
    vec3 v = normalize(uCam - vW);
    vec3 key  = normalize(vec3(-0.45, 0.65, 0.85));
    vec3 fill = normalize(vec3( 0.70, 0.10, 0.55));
    float d = max(dot(n,key),0.0) * 0.80 + max(dot(n,fill),0.0) * 0.28;
    float rim = pow(1.0 - max(dot(n,v),0.0), 3.0) * 0.22;
    vec3 tex = texture(uTex, vUv).rgb;
    vec3 col = tex * (0.46 + d) + vec3(0.30,0.80,0.78) * rim;
    outColor = vec4(col, 1.0);
  }`;
  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const loc = {
    pos: gl.getAttribLocation(prog, 'aPos'), nor: gl.getAttribLocation(prog, 'aNor'), uv: gl.getAttribLocation(prog, 'aUv'),
    mvp: gl.getUniformLocation(prog, 'uMVP'), model: gl.getUniformLocation(prog, 'uModel'),
    tex: gl.getUniformLocation(prog, 'uTex'), cam: gl.getUniformLocation(prog, 'uCam'),
  };

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
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.bmp);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const ext = gl.getExtension('EXT_texture_filter_anisotropic');
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
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
    state.drag = lerp(state.drag, state.dragTarget, 1 - Math.exp(-dt * 8));

    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

    // movimento: balanço suave parada; mais "animada" quando fala
    const s = state.speaking;
    const rotY = state.drag + Math.sin(t * 0.55) * 0.09 + Math.sin(t * 4.6) * 0.035 * s;
    const bob = Math.sin(t * 1.7) * 0.0025 + Math.abs(Math.sin(t * 8.5)) * 0.007 * s;
    const model = M.mul(M.trans(0, bob, 0), M.rotY(rotY));

    // câmera: busto (zoom=0) ou corpo inteiro (zoom=1)
    const targetY = lerp(0.20, 0.0, state.zoom), dist = lerp(1.25, 2.55, state.zoom);
    const asp = canvas.width / canvas.height;
    const proj = M.persp(28 * Math.PI / 180, asp, 0.1, 10);
    const camPos = [0, targetY + 0.02, dist];
    const view = M.trans(-camPos[0], -camPos[1], -camPos[2]);
    const mvp = M.mul(proj, M.mul(view, model));

    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.mvp, false, mvp);
    gl.uniformMatrix4fv(loc.model, false, model);
    gl.uniform3fv(loc.cam, camPos);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(loc.tex, 0);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
  }

  // arrastar para girar (mouse ou toque)
  let dragging = false, lastX = 0, base = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (dragging) { base += (e.clientX - lastX) * 0.01; lastX = e.clientX; state.dragTarget = base; } });
  const end = () => { dragging = false; base = 0; state.dragTarget = 0; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', cycleZoom);

  window.sonia = {
    setSpeaking(on) { state.speakTarget = on ? 1 : 0; },
    toggleZoom: cycleZoom,
    ready: false,
  };

  loadGLB(MODEL_URL).then((m) => {
    upload(m); window.sonia.ready = true;
    document.getElementById('avatar-loading').hidden = true;
    requestAnimationFrame(frame);
  }).catch((e) => {
    console.error('Falha ao carregar o modelo 3D:', e);
    document.getElementById('avatar-loading').hidden = true;
    document.getElementById('avatar-fallback').hidden = false;
  });
})();
