// Esqueleto + animações da Sonia (sem WebGL, roda no navegador e no Node para teste).
// Lê o sonia_anim.glb (malha com pele, 65 ossos Mixamo e clipes: Idle, Talking, Excited, StandingGreeting, BreakdanceReady),
// amostra os clipes (com transição suave entre eles) e calcula as matrizes de pele de cada osso.
(function (root) {
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const TY = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };

  function parseGLB(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('arquivo não é GLB');
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    const binStart = 20 + jsonLen + 8;
    const bin = buf.slice(binStart, binStart + dv.getUint32(20 + jsonLen, true));
    const acc = (i) => {
      const a = json.accessors[i], v = json.bufferViews[a.bufferView], T = TY[a.componentType];
      const off = (v.byteOffset || 0) + (a.byteOffset || 0);
      return new T(bin.slice(off, off + a.count * NC[a.type] * T.BYTES_PER_ELEMENT));
    };
    return { json, bin, acc };
  }

  // Lê malha com pele + esqueleto + clipes.
  function loadSkinned(buf) {
    const { json, bin, acc } = parseGLB(buf);
    if (!json.skins || !json.skins.length) throw new Error('GLB sem esqueleto');
    const prim = json.meshes[0].primitives[0], at = prim.attributes;
    const mesh = {
      pos: acc(at.POSITION), nor: acc(at.NORMAL), uv: acc(at.TEXCOORD_0),
      joints: acc(at.JOINTS_0), weights: acc(at.WEIGHTS_0), idx: acc(prim.indices),
    };
    const img = json.images[0], v = json.bufferViews[img.bufferView];
    mesh.imageBlobParts = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    mesh.imageMime = img.mimeType || 'image/jpeg';

    const skin = json.skins[0], jointNodes = skin.joints, n = jointNodes.length;
    const nodeToJoint = new Map(jointNodes.map((nd, j) => [nd, j]));
    const parent = new Int16Array(n).fill(-1);
    jointNodes.forEach((nd, j) => (json.nodes[nd].children || []).forEach((c) => { if (nodeToJoint.has(c)) parent[nodeToJoint.get(c)] = j; }));
    // ordem em que o pai sempre vem antes do filho
    const order = [], seen = new Uint8Array(n);
    const visit = (j) => { if (seen[j]) return; if (parent[j] >= 0) visit(parent[j]); seen[j] = 1; order.push(j); };
    for (let j = 0; j < n; j++) visit(j);
    const restR = new Float32Array(n * 4), restT = new Float32Array(n * 3);
    jointNodes.forEach((nd, j) => {
      restR.set(json.nodes[nd].rotation || [0, 0, 0, 1], j * 4);
      restT.set(json.nodes[nd].translation || [0, 0, 0], j * 3);
    });
    const names = jointNodes.map((nd) => json.nodes[nd].name);
    const ibm = acc(skin.inverseBindMatrices);

    const clips = {};
    for (const a of json.animations || []) {
      const rot = new Array(n).fill(null), trans = new Array(n).fill(null);
      let frames = 0, dur = 0;
      for (const ch of a.channels) {
        const j = nodeToJoint.get(ch.target.node); if (j === undefined) continue;
        const s = a.samplers[ch.sampler], times = acc(s.input), out = acc(s.output);
        frames = times.length; dur = times[times.length - 1];
        if (ch.target.path === 'rotation') rot[j] = out; else if (ch.target.path === 'translation') trans[j] = out;
      }
      clips[a.name] = { name: a.name, rot, trans, frames, dur, fps: (frames - 1) / dur };
    }
    return { mesh, skeleton: { n, parent, order, restR, restT, ibm, names }, clips };
  }

  // ---------- matrizes 4x4 column-major, sem alocar ----------
  function trsToMat(o, off, t, to, q, qo) {
    const x = q[qo], y = q[qo + 1], z = q[qo + 2], w = q[qo + 3];
    o[off] = 1 - 2 * (y * y + z * z); o[off + 1] = 2 * (x * y + z * w); o[off + 2] = 2 * (x * z - y * w); o[off + 3] = 0;
    o[off + 4] = 2 * (x * y - z * w); o[off + 5] = 1 - 2 * (x * x + z * z); o[off + 6] = 2 * (y * z + x * w); o[off + 7] = 0;
    o[off + 8] = 2 * (x * z + y * w); o[off + 9] = 2 * (y * z - x * w); o[off + 10] = 1 - 2 * (x * x + y * y); o[off + 11] = 0;
    o[off + 12] = t[to]; o[off + 13] = t[to + 1]; o[off + 14] = t[to + 2]; o[off + 15] = 1;
  }
  function mulMat(o, oo, a, ao, b, bo) {
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[oo + c * 4 + r] = a[ao + r] * b[bo + c * 4] + a[ao + 4 + r] * b[bo + c * 4 + 1] + a[ao + 8 + r] * b[bo + c * 4 + 2] + a[ao + 12 + r] * b[bo + c * 4 + 3];
    }
  }

  // Amostra um clipe no tempo t (em segundos) e escreve rotações/translações dos ossos em R e T.
  function samplePose(sk, clip, t, loop, R, T) {
    R.set(sk.restR); T.set(sk.restT);
    let ph = loop ? (t % clip.dur) * clip.fps : Math.min(t, clip.dur) * clip.fps;
    const i0 = Math.min(Math.floor(ph), clip.frames - 1), i1 = Math.min(i0 + 1, clip.frames - 1), a = ph - i0;
    for (let j = 0; j < sk.n; j++) {
      const r = clip.rot[j];
      if (r) {
        const p = i0 * 4, q = i1 * 4, o = j * 4;
        const dot = r[p] * r[q] + r[p + 1] * r[q + 1] + r[p + 2] * r[q + 2] + r[p + 3] * r[q + 3], s = dot < 0 ? -1 : 1;
        let x = r[p] + (s * r[q] - r[p]) * a, y = r[p + 1] + (s * r[q + 1] - r[p + 1]) * a;
        let z = r[p + 2] + (s * r[q + 2] - r[p + 2]) * a, w = r[p + 3] + (s * r[q + 3] - r[p + 3]) * a;
        const l = Math.hypot(x, y, z, w) || 1; R[o] = x / l; R[o + 1] = y / l; R[o + 2] = z / l; R[o + 3] = w / l;
      }
      const tr = clip.trans[j];
      if (tr) for (let k = 0; k < 3; k++) T[j * 3 + k] = tr[i0 * 3 + k] + (tr[i1 * 3 + k] - tr[i0 * 3 + k]) * a;
    }
  }

  // Toca clipes com transição suave. update(dt) devolve as matrizes de pele (n*16 floats) prontas pra GPU.
  function createPlayer(data) {
    const sk = data.skeleton, clips = data.clips, n = sk.n;
    const bufA = { R: new Float32Array(n * 4), T: new Float32Array(n * 3) };
    const bufB = { R: new Float32Array(n * 4), T: new Float32Array(n * 3) };
    const world = new Float32Array(n * 16), local = new Float32Array(16), bones = new Float32Array(n * 16);
    const st = { cur: null, t: 0, once: false, back: 'Idle', prev: null, pt: 0, fade: 1, fadeDur: 0.35 };

    function play(name, opts) {
      const o = opts || {};
      const clip = clips[name]; if (!clip) return false;
      if (st.cur === clip && !o.restart && !st.once) return true;
      st.prev = st.cur; st.pt = st.t; st.fade = st.prev ? 0 : 1; st.fadeDur = o.fade === undefined ? 0.35 : o.fade;
      st.cur = clip; st.t = 0; st.once = !!o.once; st.back = o.back || 'Idle';
      return true;
    }
    function update(dt) {
      if (!st.cur) return bones;
      st.t += dt;
      if (st.once && st.t >= st.cur.dur) { play(st.back); }
      if (st.prev) { st.pt += dt; st.fade += dt / Math.max(st.fadeDur, 1e-3); if (st.fade >= 1) { st.prev = null; st.fade = 1; } }
      samplePose(sk, st.cur, st.t, !st.once, bufA.R, bufA.T);
      let R = bufA.R, T = bufA.T;
      if (st.prev) {
        samplePose(sk, st.prev, st.pt, true, bufB.R, bufB.T);
        const w = st.fade * st.fade * (3 - 2 * st.fade);   // suaviza a transição
        for (let j = 0; j < n; j++) {
          const o = j * 4, d = bufB.R[o] * bufA.R[o] + bufB.R[o + 1] * bufA.R[o + 1] + bufB.R[o + 2] * bufA.R[o + 2] + bufB.R[o + 3] * bufA.R[o + 3], s = d < 0 ? -1 : 1;
          let x = bufB.R[o] + (s * bufA.R[o] - bufB.R[o]) * w, y = bufB.R[o + 1] + (s * bufA.R[o + 1] - bufB.R[o + 1]) * w;
          let z = bufB.R[o + 2] + (s * bufA.R[o + 2] - bufB.R[o + 2]) * w, q = bufB.R[o + 3] + (s * bufA.R[o + 3] - bufB.R[o + 3]) * w;
          const l = Math.hypot(x, y, z, q) || 1; bufB.R[o] = x / l; bufB.R[o + 1] = y / l; bufB.R[o + 2] = z / l; bufB.R[o + 3] = q / l;
          for (let k = 0; k < 3; k++) bufB.T[j * 3 + k] += (bufA.T[j * 3 + k] - bufB.T[j * 3 + k]) * w;
        }
        R = bufB.R; T = bufB.T;
      }
      for (const j of sk.order) {
        trsToMat(local, 0, T, j * 3, R, j * 4);
        const p = sk.parent[j];
        if (p < 0) world.set(local, j * 16); else mulMat(world, j * 16, world, p * 16, local, 0);
        mulMat(bones, j * 16, world, j * 16, sk.ibm, j * 16);
      }
      return bones;
    }
    return { play, update, bones, clips: Object.keys(clips), get current() { return st.cur && st.cur.name; } };
  }

  const api = { loadSkinned, createPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SoniaSkeleton = api;
})(typeof window !== 'undefined' ? window : globalThis);
