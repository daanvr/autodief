// =============================================================
//  SCÈNES: tekent op een canvas van 320x180 (wordt met hele getallen
//  opgeschaald met image-rendering: pixelated -> scherpe pixels).
//  AD.scene.set(naam, params)   kies scène
//  AD.scene.update(params)      pas params aan zonder reset
//  AD.scene.setSpots([...])     klikbare iconen op de kaart
//  AD.scene.overlay('BUSTED')   grote tekst eroverheen
// =============================================================
window.AD = window.AD || {};

(function () {
  const W = 320, H = 180;
  const SC = AD.scene = {};
  const SP = AD.sprites;
  let canvas, ctx, cur = { name: 'blank', p: {} }, st = {}, overlayText = null, spotDefs = [], hover = null, lastT = 0, errored = false;

  SC.W = W; SC.H = H;
  SC.init = function (c) {
    canvas = c; ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    requestAnimationFrame(loop);
  };
  SC.set = function (name, p) {
    p = p || {};
    const key = name + '|' + (p.seed == null ? '' : p.seed) + '|' + (p.district ? p.district.id : '');
    if (key !== st.key) st = { key };
    cur = { name, p };
  };
  SC.update = function (p) { Object.assign(cur.p, p); };
  SC.overlay = function (text) { overlayText = text; };
  SC.setSpots = function (list) { spotDefs = list || []; };
  SC.hover = function (x, y) { hover = SC.hit(x, y); return hover; };
  SC.hit = function (x, y) {
    const s = (st.spots || []).find(s => (x - s.x) ** 2 + (y - s.y) ** 2 <= (s.r + 2) ** 2);
    return s ? s.id : null;
  };

  function loop(now) {
    const t = now / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0.016); lastT = t;
    try {
      ctx.imageSmoothingEnabled = false;
      (SCENES[cur.name] || SCENES.blank)(t, dt, cur.p);
      if (overlayText) drawOverlay(t);
    } catch (e) { if (!errored) { console.error(e); errored = true; } }
    requestAnimationFrame(loop);
  }

  // ---------- Hulpjes ----------
  function off(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x];
  }
  function asphalt(x, X, Y, w, h, r) {
    x.fillStyle = '#46464c'; x.fillRect(X, Y, w, h);
    for (let i = 0; i < w * h / 7; i++) {
      x.fillStyle = r() < 0.5 ? '#3c3c42' : '#525258';
      x.fillRect(X + Math.floor(r() * w), Y + Math.floor(r() * h), 1, 1);
    }
  }
  function tiles(x, X, Y, w, h) {
    x.fillStyle = '#9a958a'; x.fillRect(X, Y, w, h);
    x.fillStyle = '#8a857a';
    for (let i = X; i < X + w; i += 6) x.fillRect(i, Y, 1, h);
    for (let j = Y; j < Y + h; j += 6) x.fillRect(X, j, w, 1);
  }
  function ring(c, cx, cy, r, col) {
    c.fillStyle = col;
    const steps = Math.max(8, Math.floor(r * 6));
    for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
  }
  function line(c, x0, y0, x1, y1, col) {
    c.fillStyle = col;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
  }
  function night(alpha) { ctx.fillStyle = `rgba(10,12,40,${alpha})`; ctx.fillRect(0, 0, W, H); }
  function glow(x, y, r, rgb, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    SP.disc(ctx, x, y, r, `rgba(${rgb},${a})`);
    SP.disc(ctx, x, y, Math.round(r * 0.65), `rgba(${rgb},${a})`);
    SP.disc(ctx, x, y, Math.round(r * 0.35), `rgba(${rgb},${a})`);
    ctx.restore();
  }
  function label(x, y, text, col) {
    const w = SP.textWidth(text, 1);
    ctx.fillStyle = 'rgba(20,14,8,0.8)'; ctx.fillRect(Math.round(x - w / 2) - 2, y - 1, w + 4, 7);
    SP.text(ctx, text, x, y, col || '#f8ecc8', 1, { align: 'center' });
  }
  const pickLook = r => { const d = AD.CARS[Math.floor(r() * AD.CARS.length)]; return { look: d.look, color: d.colors[Math.floor(r() * d.colors.length)] }; };

  // ---------- Stad (bovenaanzicht) ----------
  function subdivide(x, X, Y, w, h, style, r) {
    if ((w > 44 || h > 44) && r() < 0.85) {
      if (w >= h) { const s = Math.floor(w * (0.35 + r() * 0.3)); subdivide(x, X, Y, s - 1, h, style, r); subdivide(x, X + s + 1, Y, w - s - 1, h, style, r); }
      else { const s = Math.floor(h * (0.35 + r() * 0.3)); subdivide(x, X, Y, w, s - 1, style, r); subdivide(x, X, Y + s + 1, w, h - s - 1, style, r); }
      return;
    }
    if (w > 4 && h > 4) SP.building(x, X, Y, w, h, style, r);
  }
  function park(x, X, Y, w, h, r) {
    x.fillStyle = '#3f7a2e'; x.fillRect(X, Y, w, h);
    for (let i = 0; i < w * h / 8; i++) { x.fillStyle = r() < 0.5 ? '#346a26' : '#4a8a36'; x.fillRect(X + Math.floor(r() * w), Y + Math.floor(r() * h), 1, 1); }
    x.fillStyle = '#b8a878'; x.fillRect(X, Y + Math.floor(h / 2), w, 2);
    for (let i = 0; i < w * h / 160; i++) SP.tree(x, X + 4 + Math.floor(r() * (w - 8)), Y + 4 + Math.floor(r() * (h - 8)), 3 + Math.floor(r() * 2));
  }
  function renderCity(seed, style, w, h, o) {
    const r = AD.rng.seeded(seed), [c, x] = off(w, h);
    const rw = o.roadW;
    tiles(x, 0, 0, w, h);
    o.vRoads.forEach(v => asphalt(x, v, 0, rw, h, r));
    o.hRoads.forEach(v => asphalt(x, 0, v, w, rw, r));
    x.fillStyle = '#e8e4c8';
    o.vRoads.forEach(v => { const cx = v + Math.floor(rw / 2); for (let yy = 0; yy < h; yy += 8) if (!o.hRoads.some(hh => yy + 4 > hh - 2 && yy < hh + rw + 2)) x.fillRect(cx, yy, 1, 4); });
    o.hRoads.forEach(hh => { const cy = hh + Math.floor(rw / 2); for (let xx = 0; xx < w; xx += 8) if (!o.vRoads.some(v => xx + 4 > v - 2 && xx < v + rw + 2)) x.fillRect(xx, cy, 4, 1); });
    x.fillStyle = '#d8d4c0';
    o.vRoads.forEach(v => o.hRoads.forEach(hh => {
      for (let i = 2; i < rw - 1; i += 3) { x.fillRect(v + i, hh - 5, 2, 4); x.fillRect(v + i, hh + rw + 1, 2, 4); x.fillRect(v - 5, hh + i, 4, 2); x.fillRect(v + rw + 1, hh + i, 4, 2); }
    }));
    const bx = [], by = []; let prev = 0;
    o.vRoads.forEach(v => { bx.push([prev, v]); prev = v + rw; }); bx.push([prev, w]);
    prev = 0; o.hRoads.forEach(v => { by.push([prev, v]); prev = v + rw; }); by.push([prev, h]);
    bx.forEach(([x0, x1]) => by.forEach(([y0, y1]) => {
      const bw = x1 - x0, bh = y1 - y0;
      if (bw < 10 || bh < 10) return;
      x.fillStyle = '#c8c2b2'; x.fillRect(x0, y0, bw, bh);
      tiles(x, x0 + 1, y0 + 1, bw - 2, bh - 2);
      if (o.skip && o.skip(x0, y0)) return;
      if (r() < (o.park == null ? 0.12 : o.park)) park(x, x0 + 3, y0 + 3, bw - 6, bh - 6, r);
      else subdivide(x, x0 + 3, y0 + 3, bw - 6, bh - 6, style, r);
    }));
    return c;
  }

  function cityTraffic(o, w, h, n) {
    const r = Math.random, list = [];
    const lanes = [];
    o.vRoads.forEach(v => { lanes.push({ ax: 'v', p: v + 5, dir: 'down' }); lanes.push({ ax: 'v', p: v + o.roadW - 5, dir: 'up' }); });
    o.hRoads.forEach(hh => { lanes.push({ ax: 'h', p: hh + 5, dir: 'left' }); lanes.push({ ax: 'h', p: hh + o.roadW - 5, dir: 'right' }); });
    for (let i = 0; i < n; i++) {
      const lane = lanes[i % lanes.length], lk = pickLook(r);
      list.push({ lane, pos: r() * (lane.ax === 'v' ? h : w), speed: 22 + r() * 25, look: lk.look, color: lk.color, police: r() < 0.08 });
    }
    return list;
  }
  function drawTraffic(list, dt, t, w, h) {
    list.forEach(c => {
      const sgn = c.lane.dir === 'down' || c.lane.dir === 'right' ? 1 : -1;
      c.pos += sgn * c.speed * dt;
      const lim = c.lane.ax === 'v' ? h : w;
      if (c.pos > lim + 20) c.pos = -20; if (c.pos < -20) c.pos = lim + 20;
      const x = c.lane.ax === 'v' ? c.lane.p : c.pos, y = c.lane.ax === 'v' ? c.pos : c.lane.p;
      SP.car(ctx, x, y, c.police ? AD.POLICE_LOOK : c.look, c.color, c.lane.dir, t);
    });
  }

  function badge(x, y, iconId, isHover, disabled, t) {
    if (isHover) ring(ctx, x, y, 12 + (Math.floor(t * 6) % 2), '#ffe040');
    SP.disc(ctx, x + 1, y + 2, 10, 'rgba(0,0,0,0.45)');
    SP.disc(ctx, x, y, 10, '#3a2010');
    SP.disc(ctx, x, y, 9, disabled ? '#8a7a68' : '#e09a48');
    SP.disc(ctx, x - 1, y - 1, 7, disabled ? '#9a8a78' : '#f0b868');
    SP.icon(ctx, iconId, x - 6, y - 6, 1);
    if (disabled) SP.disc(ctx, x, y, 9, 'rgba(40,30,20,0.45)');
  }

  // ---------- Scènes ----------
  const SCENES = {};
  SCENES.blank = () => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); };

  const HUB = { vRoads: [92, 212], hRoads: [56, 124], roadW: 18, park: 0.1, skip: (x0, y0) => x0 === 110 && y0 === 74 };
  const HUB_SPOTS = {
    wijk: [46, 99, 'OP PAD'], winkel: [161, 30, 'WINKEL'], garage: [275, 99, 'GARAGE'], kroeg: [46, 30, 'KROEG'],
    baas: [275, 30, 'DE BAAS'], dokter: [275, 158, 'DOKTER'], skill: [46, 158, 'SKILLS'], huis: [161, 158, 'ONDERDUIKEN'],
  };

  SCENES.hub = function (t, dt) {
    if (!st.bg) {
      st.bg = renderCity(1977, 'brick', W, H, HUB);
      const x = st.bg.getContext('2d');
      // schuilplaats in het midden
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(116, 80, 92, 40);
      x.fillStyle = '#2a2420'; x.fillRect(113, 77, 92, 40);
      x.fillStyle = '#4a3a30'; x.fillRect(114, 78, 90, 38);
      x.fillStyle = '#5a4a3a'; x.fillRect(114, 78, 90, 1);
      x.fillStyle = '#6a6a6a'; x.fillRect(180, 82, 18, 14); x.fillStyle = '#4a4a4a'; for (let i = 84; i < 96; i += 2) x.fillRect(181, i, 16, 1);
      x.fillStyle = '#b0b0b0'; x.fillRect(120, 84, 6, 5); x.fillStyle = '#505050'; x.fillRect(121, 85, 4, 3);
      x.fillStyle = '#1a1410'; x.fillRect(128, 104, 66, 9);
      SP.text(x, 'SCHUILPLAATS', 161, 106, '#ffd21f', 1, { align: 'center' });
      st.traffic = cityTraffic(HUB, W, H, 8);
    }
    ctx.drawImage(st.bg, 0, 0);
    drawTraffic(st.traffic, dt, t, W, H);
    SP.person(ctx, 150, 121, SP.LOOKS.player, 'down', t, false);
    st.spots = [];
    spotDefs.forEach(s => {
      const pos = HUB_SPOTS[s.id]; if (!pos) return;
      st.spots.push({ id: s.id, x: pos[0], y: pos[1], r: 10 });
      badge(pos[0], pos[1], s.icon || 'loc_' + s.id, hover === s.id, s.disabled, t);
      label(pos[0], pos[1] + 13, pos[2], hover === s.id ? '#ffe040' : null);
    });
  };

  SCENES.title = function (t, dt) {
    if (!st.bg) { st.bg = renderCity(424242, 'city', W, H, { vRoads: [60, 180, 270], hRoads: [40, 120], roadW: 18, park: 0.15 }); st.traffic = cityTraffic({ vRoads: [60, 180, 270], hRoads: [40, 120], roadW: 18 }, W, H, 14); }
    ctx.drawImage(st.bg, 0, 0);
    drawTraffic(st.traffic, dt, t, W, H);
    night(0.45);
    const bob = Math.round(Math.sin(t * 2) * 2);
    SP.text(ctx, 'AUTODIEF', 160, 52 + bob, '#ffd21f', 6, { align: 'center', shadow: '#5a1a00' });
    SP.text(ctx, 'STEEL. VERKOOP. ONTSNAP.', 160, 96, '#f8ecc8', 1, { align: 'center', shadow: '#000' });
    if (Math.floor(t * 2) % 2) SP.text(ctx, 'KIES HIERONDER', 160, 150, '#e8a040', 1, { align: 'center', shadow: '#000' });
  };

  const MAP_POS = [[80, 45], [240, 45], [80, 135], [240, 135]];
  SCENES.map = function (t) {
    if (!st.bg) {
      const [c, x] = off(W, H);
      AD.DISTRICTS.slice(0, 4).forEach((d, i) => {
        const q = renderCity(100 + i * 17, d.style, 160, 90, { vRoads: [70], hRoads: [36], roadW: 14, park: d.style === 'villa' ? 0.3 : 0.12 });
        x.drawImage(q, (i % 2) * 160, Math.floor(i / 2) * 90);
      });
      x.fillStyle = '#2a5a9a'; x.fillRect(158, 0, 4, H); x.fillRect(0, 88, W, 4);
      x.fillStyle = '#4a7aba'; x.fillRect(159, 0, 1, H); x.fillRect(0, 89, W, 1);
      st.bg = c;
    }
    ctx.drawImage(st.bg, 0, 0);
    st.spots = [];
    AD.DISTRICTS.slice(0, 4).forEach((d, i) => {
      const [x, y] = MAP_POS[i];
      const s = spotDefs.find(s => s.id === d.id);
      if (s && s.disabled) { ctx.fillStyle = 'rgba(20,14,8,0.55)'; ctx.fillRect((i % 2) * 160 + (i % 2 ? 2 : 0), Math.floor(i / 2) * 90 + (i >= 2 ? 2 : 0), 158, 88); }
      st.spots.push({ id: d.id, x, y, r: 10 });
      badge(x, y, 'loc_wijk', hover === d.id, s && s.disabled, t);
      label(x, y + 14, d.name, hover === d.id ? '#ffe040' : null);
      if (s && s.disabled) label(x, y + 23, 'LEVEL ' + d.minLevel, '#e86a5a');
    });
  };

  // ---------- Straat 's nachts ----------
  function renderStreet(seed, style) {
    const r = AD.rng.seeded(seed * 31 + 7), [c, x] = off(W, H);
    tiles(x, 0, 0, W, H);
    let xx = -10; while (xx < W) { const bw = 26 + Math.floor(r() * 40); SP.building(x, xx, 2, bw - 3, 52, style, r); xx += bw; }
    xx = -6; while (xx < W) { const bw = 26 + Math.floor(r() * 40); SP.building(x, xx, 126, bw - 3, 60, style, r); xx += bw; }
    tiles(x, 0, 58, W, 13); tiles(x, 0, 109, W, 13);
    x.fillStyle = '#c8c2b2'; x.fillRect(0, 71, W, 1); x.fillRect(0, 108, W, 1);
    asphalt(x, 0, 72, W, 36, r);
    x.fillStyle = '#e8e4c8'; for (let i = 0; i < W; i += 12) x.fillRect(i, 89, 6, 1);
    for (let i = 4; i < W; i += 26) x.fillRect(i, 104, 1, 4);
    [20, 100, 180, 260].forEach(lx => { x.fillStyle = '#303030'; x.fillRect(lx, 60, 2, 2); x.fillRect(lx + 40, 118, 2, 2); x.fillStyle = '#e8e8c0'; x.fillRect(lx, 62, 2, 2); x.fillRect(lx + 40, 116, 2, 2); });
    return c;
  }
  SCENES.street = function (t, dt, p) {
    const d = p.district || AD.DISTRICTS[0];
    if (!st.bg) {
      st.bg = renderStreet(p.seed || 1, d.style);
      const r = AD.rng.seeded((p.seed || 1) * 7 + 3);
      st.parked = [];
      for (let x = 12; x < W; x += 26) { if (x > 140 && x < 190) continue; if (r() < 0.75) { const lk = pickLook(r); st.parked.push({ x: x + 9, look: lk.look, color: lk.color, dir: r() < 0.5 ? 'left' : 'right' }); } }
      st.peds = [0, 1, 2].map(i => ({ x: r() * W, y: i === 1 ? 64 : 114, dir: r() < 0.5 ? 'left' : 'right', look: SP.LOOKS['ped' + (1 + i)], v: 8 + r() * 8 }));
      st.walk = 110; st.drive = 0; st.trafficX = -40; st.owner = 330; st.patrol = 340;
    }
    ctx.drawImage(st.bg, 0, 0);
    st.parked.forEach(c => SP.car(ctx, c.x, 100, c.look, c.color, c.dir, t));
    st.peds.forEach(pd => { pd.x += (pd.dir === 'right' ? 1 : -1) * pd.v * dt; if (pd.x > W + 10) pd.x = -10; if (pd.x < -10) pd.x = W + 10; SP.person(ctx, pd.x, pd.y, pd.look, pd.dir, t, true); });

    const phase = p.phase || 'idle';
    if (phase !== 'patrol') {
      st.trafficX += 70 * dt; if (st.trafficX > W + 400) st.trafficX = -40;
      SP.car(ctx, W - st.trafficX, 80, { w: 10, h: 18, kind: 'car' }, '#5a6a8a', 'left', t);
    } else {
      st.patrol = Math.max(-30, st.patrol - 30 * dt);
      SP.car(ctx, st.patrol, 80, AD.POLICE_LOOK, '#eee', 'left', t);
    }

    const inst = p.target;
    let px = 0, py = 113, pdir = 'right', moving = false, showPlayer = true;
    if (inst) {
      const def = AD.carDef(inst.id);
      let cx = 164;
      if (phase === 'drive') { st.drive += dt * (40 + st.drive * 2); cx += st.drive; showPlayer = false; }
      if (phase === 'open') showPlayer = false;
      SP.car(ctx, cx, 100, def.look, SP.carColor(inst), 'right', t, { highlight: phase === 'approach', alarm: phase === 'alarm', damage: 1 - inst.condition });
      if (phase === 'approach') {
        if (st.walk < 158) { st.walk += 25 * dt; moving = true; } else pdir = 'up';
        px = st.walk;
      } else { px = 158; pdir = 'up'; }
      if (phase === 'working' && Math.random() < 0.5) { ctx.fillStyle = Math.random() < 0.5 ? '#fff6a0' : '#ffb020'; ctx.fillRect(157 + Math.floor(Math.random() * 6), 104 + Math.floor(Math.random() * 4), 1, 1); }
      if (phase === 'alarm') { ring(ctx, cx, 100, 8 + (t * 30) % 14, '#ffb020'); SP.text(ctx, '!', px, 96, '#ff3030', 2, { shadow: '#000' }); }
      if (phase === 'owner') {
        st.owner = Math.max(190, st.owner - 35 * dt);
        SP.person(ctx, st.owner, 114, SP.LOOKS.ped4, 'left', t, st.owner > 190);
        SP.text(ctx, '!?', st.owner - 3, 100, '#ffe040', 1, { shadow: '#000' });
      }
    } else {
      st.walk += 18 * dt; if (st.walk > W + 10) st.walk = -10;
      px = st.walk; moving = true;
      if (phase === 'patrol') { px = 150; moving = false; pdir = 'up'; }
    }
    if (showPlayer) SP.person(ctx, px, py, SP.LOOKS.player, pdir, t, moving);

    // Omstanders (zie spots.js) met hun status
    const marks = [];
    if (p.spot && inst) {
      const POS = [[124, 114], [206, 114], [136, 64], [192, 64]];
      p.spot.by.forEach((b, i) => {
        if (b.state === 'weg') return;
        const [bx, by] = POS[i % POS.length];
        if (b.id === 'raam' || b.id === 'portier') {
          ctx.fillStyle = '#f0d890'; ctx.fillRect(bx - 4, 46, 9, 7);
          ctx.fillStyle = '#2a1a10'; ctx.fillRect(bx - 1, 48, 3, 4);
          marks.push([bx, 38, b.state]);
        } else {
          const face = b.state === 'rustig' ? (i % 2 ? 'left' : 'right') : (by < 90 ? 'down' : 'up');
          SP.person(ctx, bx, by, SP.LOOKS['ped' + (1 + (i % 4))], face, t, false);
          if (b.state === 'belt') { ctx.fillStyle = '#80ff80'; ctx.fillRect(bx + 3, by - 3, 1, 2); }
          marks.push([bx, by - 13, b.state]);
        }
      });
    }

    const see = p.spot ? p.spot.see : 1;
    night(Math.max(0.2, Math.min(0.58, 0.28 + (1.3 - see) * 0.25)));
    if (p.spot && p.spot.place.id === 'lantaarn') glow(164, 92, 22, '255,220,130', 0.08);
    marks.forEach(([mx, my, st]) => {
      if (st === 'kijkt') SP.text(ctx, '?', mx - 1, my, '#ffd21f', 1, { shadow: '#000' });
      if (st === 'belt' && Math.floor(t * 4) % 2) SP.text(ctx, '!', mx - 1, my, '#ff3030', 1, { shadow: '#000' });
    });
    [20, 100, 180, 260].forEach(lx => { glow(lx + 1, 64, 13, '255,220,130', 0.07); glow(lx + 41, 115, 13, '255,220,130', 0.07); });
    if (phase === 'patrol') { const f = Math.floor(t * 8) % 2; glow(Math.round(st.patrol), 80, 12, f ? '255,40,40' : '40,80,255', 0.12); }
    if (phase === 'alarm' && Math.floor(t * 5) % 2 === 0) glow(164, 100, 16, '255,170,40', 0.1);
  };

  // ---------- Achtervolging (verticaal scrollend) ----------
  function renderStrip(seed, style) {
    const SH = 360, r = AD.rng.seeded(seed), [c, x] = off(W, SH);
    tiles(x, 0, 0, W, SH);
    [[0, 88], [232, 320]].forEach(([x0, x1]) => {
      let y = 0;
      while (y < SH) {
        let h = 30 + Math.floor(r() * 50);
        if (SH - (y + h) < 24) h = SH - y;
        if (r() < 0.22 && h >= 26 && h < 60) {
          asphalt(x, x0, y + 3, x1 - x0, 20, r);
          x.fillStyle = '#e8e4c8'; for (let i = x0; i < x1; i += 8) x.fillRect(i, y + 13, 4, 1);
        } else SP.building(x, x0 + 2, y + 2, x1 - x0 - 4, h - 4, style, r);
        y += h;
      }
    });
    tiles(x, 88, 0, 12, SH); tiles(x, 220, 0, 12, SH);
    x.fillStyle = '#c8c2b2'; x.fillRect(99, 0, 1, SH); x.fillRect(220, 0, 1, SH);
    asphalt(x, 100, 0, 120, SH, r);
    x.fillStyle = '#e8e4c8'; for (let y = 0; y < SH; y += 20) { x.fillRect(130, y, 1, 10); x.fillRect(190, y, 1, 10); }
    x.fillStyle = '#e0c030'; x.fillRect(158, 0, 1, SH); x.fillRect(161, 0, 1, SH);
    for (let y = 30; y < SH; y += 90) { x.fillStyle = '#303030'; x.fillRect(96, y, 2, 2); x.fillRect(222, y + 45, 2, 2); }
    return c;
  }
  SCENES.chase = function (t, dt, p) {
    const district = (AD.engine.run() && AD.engine.run().district) || AD.DISTRICTS[1];
    if (!st.strip || st.stripStyle !== district.style) { st.strip = renderStrip(55, district.style); st.stripStyle = district.style; st.scroll = 0; st.traffic = []; st.tracers = []; }
    const foot = p.mode === 'foot', arrest = !!p.arrest;
    const speed = arrest ? 0 : foot ? 45 : 140;
    st.scroll = (st.scroll + speed * dt) % 360;
    ctx.drawImage(st.strip, 0, Math.floor(st.scroll) - 360);
    ctx.drawImage(st.strip, 0, Math.floor(st.scroll));

    if (!arrest && Math.random() < dt * 0.9) st.traffic.push({ x: Math.random() < 0.5 ? 115 : 145, y: -20, ...pickLook(Math.random) });
    st.traffic = st.traffic.filter(c => c.y < H + 30);
    st.traffic.forEach(c => { c.y += (speed + 50) * dt; SP.car(ctx, c.x, c.y, c.look, c.color, 'down', t); });

    const pl = { x: foot ? 226 : 175 + Math.round(Math.sin(t * 1.3) * 8), y: foot ? 100 : 108 };
    if (arrest) pl.x = foot ? 226 : 175;
    const dist = Math.max(0, Math.min(100, p.distance || 0));
    const target = pl.y + (foot ? 12 : 22) + dist * (foot ? 0.85 : 0.75);
    st.pd = st.pd == null ? target + 30 : st.pd + (target - st.pd) * Math.min(1, dt * 2);
    if (arrest) st.pd = pl.y + (foot ? 10 : 20);
    const units = Math.min(3, p.units || 1);

    if (foot) SP.person(ctx, pl.x, pl.y, SP.LOOKS.player, 'up', t, !arrest);
    else if (p.car) SP.car(ctx, pl.x, pl.y, AD.carDef(p.car.id).look, SP.carColor(p.car), 'up', t, { damage: 1 - p.car.condition });
    if (arrest) { ctx.fillStyle = '#e0a878'; ctx.fillRect(pl.x - 4, pl.y - 6, 1, 2); ctx.fillRect(pl.x + 3, pl.y - 6, 1, 2); }

    const cops = [];
    for (let i = 0; i < units; i++) {
      const ox = [0, -22, 22][i], oy = i * 12;
      if (foot) {
        const cx = (arrest ? pl.x + [-8, 8, 0][i] : pl.x + [-3, 4, -9][i]), cy = arrest ? pl.y + [2, 2, 10][i] : st.pd + oy * 0.6;
        SP.person(ctx, cx, cy, SP.LOOKS.cop, 'up', t, !arrest);
        cops.push([cx, cy]);
        if (i === 0) SP.car(ctx, 205, st.pd + 24, AD.POLICE_LOOK, '#eee', 'up', t);
      } else {
        const cx = arrest ? pl.x + [-16, 16, 0][i] : pl.x + ox, cy = arrest ? pl.y + [6, 4, 22][i] : st.pd + oy;
        SP.car(ctx, cx, cy, AD.POLICE_LOOK, '#eee', 'up', t);
        cops.push([cx, cy]);
      }
    }
    if (arrest && !foot) { SP.person(ctx, pl.x - 8, pl.y - 2, SP.LOOKS.cop, 'right', t, false); SP.person(ctx, pl.x + 8, pl.y - 2, SP.LOOKS.cop, 'left', t, false); }

    if (p.shooting && !arrest && Math.random() < dt * 7 && cops.length) {
      const c = cops[Math.floor(Math.random() * cops.length)];
      st.tracers.push({ x0: c[0], y0: c[1] - 8, x1: pl.x + (Math.random() * 16 - 8), y1: pl.y + (Math.random() * 10 - 5), life: 0.12 });
    }
    st.tracers = st.tracers.filter(tr => (tr.life -= dt) > 0);
    st.tracers.forEach(tr => { line(ctx, tr.x0, tr.y0, tr.x1, tr.y1, '#fff2a0'); ctx.fillStyle = '#ffd040'; ctx.fillRect(tr.x0 - 1, tr.y0 - 1, 3, 3); });

    if (p.heli && !arrest) {
      const hx = pl.x + 18 + Math.round(Math.sin(t) * 6), hy = pl.y - 28;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(hx + 6, hy + 14, 6, 10);
      ctx.fillStyle = '#2a3040'; ctx.fillRect(hx - 3, hy - 6, 6, 12); ctx.fillRect(hx - 1, hy + 6, 2, 8);
      ctx.fillStyle = '#8fc0e0'; ctx.fillRect(hx - 2, hy - 6, 4, 3);
      const a = t * 25;
      line(ctx, hx - Math.cos(a) * 11, hy - Math.sin(a) * 11, hx + Math.cos(a) * 11, hy + Math.sin(a) * 11, '#101010');
      line(ctx, hx - Math.cos(a + 1.57) * 11, hy - Math.sin(a + 1.57) * 11, hx + Math.cos(a + 1.57) * 11, hy + Math.sin(a + 1.57) * 11, '#101010');
    }

    night(0.3);
    const f = Math.floor(t * 8) % 2;
    cops.forEach(([cx, cy]) => glow(cx, cy, 10, f ? '255,40,40' : '40,80,255', 0.12));
    if (p.heli && !arrest) glow(pl.x, pl.y, 18, '255,255,200', 0.09);
    if (!foot && !arrest) glow(pl.x, pl.y - 16, 6, '255,250,200', 0.08);
    if (dist < 25 && !arrest) { ctx.fillStyle = f ? 'rgba(255,40,40,0.25)' : 'rgba(40,80,255,0.25)'; ctx.fillRect(0, H - 4, W, 4); ctx.fillRect(0, 0, W, 2); }
  };

  // ---------- Garage ----------
  SCENES.garage = function (t, dt, p) {
    const maxSlots = AD.SETTINGS.garage.maxSlots, slots = p.slots || 1, cars = p.cars || [];
    if (!st.bg) {
      const r = AD.rng.seeded(77), [c, x] = off(W, H);
      x.fillStyle = '#5c5a56'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? '#54524e' : '#64625e'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      for (let i = 0; i < 8; i++) SP.disc(x, 20 + r() * 280, 50 + r() * 120, 2 + Math.floor(r() * 4), 'rgba(20,18,16,0.5)');
      x.fillStyle = '#2e2a26'; x.fillRect(0, 0, W, 34);
      x.fillStyle = '#4a3420'; x.fillRect(10, 22, 120, 8); x.fillStyle = '#6a4a2c'; x.fillRect(10, 22, 120, 2);
      x.fillStyle = '#8a7a5a'; x.fillRect(12, 6, 116, 14);
      for (let i = 0; i < 14; i++) { x.fillStyle = ['#c83030', '#3060c0', '#c8c8c8', '#f0c020'][i % 4]; x.fillRect(16 + i * 8, 8 + (i % 3) * 3, 2, 6); }
      x.fillStyle = '#3a3a3a'; x.fillRect(180, 4, 60, 26);
      SP.text(x, 'GARAGE', 210, 13, '#ffd21f', 1, { align: 'center' });
      x.fillStyle = '#1a1a1a'; x.fillRect(282, 40, 38, 120);
      x.fillStyle = '#3a3a3a'; for (let y = 40; y < 160; y += 4) x.fillRect(282, y, 38, 1);
      st.bg = c;
    }
    ctx.drawImage(st.bg, 0, 0);
    for (let i = 0; i < maxSlots; i++) {
      const bx = 10 + i * 54, by = 46;
      ctx.fillStyle = '#e0c030'; ctx.fillRect(bx, by, 2, 110); ctx.fillRect(bx + 52, by, 2, 110);
      if (i >= slots) {
        ctx.fillStyle = 'rgba(20,18,16,0.6)'; ctx.fillRect(bx + 2, by, 50, 110);
        ctx.fillStyle = '#7a3020'; for (let k = 0; k < 110; k += 8) ctx.fillRect(bx + 4, by + k, 46, 2);
        SP.text(ctx, 'HUUR', bx + 27, by + 52, '#e8d8a8', 1, { align: 'center', shadow: '#000' });
      }
      const inst = cars[i];
      if (inst) {
        const d = AD.carDef(inst.id);
        SP.car(ctx, bx + 27, by + 58, d.look, SP.carColor(inst), 'up', t, { damage: 1 - inst.condition, highlight: p.focus === inst.uid });
        label(bx + 27, by + 80, d.name.split(' ')[0], inst.hot ? '#ff8a6a' : '#a8e0a0');
      }
    }
    if (p.incoming) {
      st.inX = st.inX == null ? 340 : Math.max(300, st.inX - 60 * dt);
      const d = AD.carDef(p.incoming.id);
      SP.car(ctx, st.inX, 100, d.look, SP.carColor(p.incoming), 'left', t, { highlight: true, damage: 1 - p.incoming.condition });
    }
    st.mech = (st.mech || 0) + dt;
    SP.person(ctx, 30 + ((st.mech * 20) % 240), 166, SP.LOOKS.ped2, 'right', t, true);
    ctx.fillStyle = 'rgba(255,240,200,0.04)'; ctx.fillRect(0, 34, W, H);
  };

  // ---------- Winkel ----------
  SCENES.shop = function (t) {
    if (!st.bg) {
      const [c, x] = off(W, H);
      for (let yy = 40; yy < H; yy += 8) for (let xx = 0; xx < W; xx += 8) { x.fillStyle = ((xx + yy) / 8) % 2 ? '#c8b890' : '#a89870'; x.fillRect(xx, yy, 8, 8); }
      x.fillStyle = '#4a2e20'; x.fillRect(0, 0, W, 40);
      const r = AD.rng.seeded(9);
      [10, 22].forEach(sy => {
        x.fillStyle = '#7a5030'; x.fillRect(8, sy + 8, 304, 2);
        for (let xx = 12; xx < 308; xx += 6 + Math.floor(r() * 5)) {
          const kind = r();
          x.fillStyle = kind < 0.3 ? '#4a4a4a' : kind < 0.55 ? '#c83030' : kind < 0.75 ? '#f0c020' : kind < 0.9 ? '#3060c0' : '#e8e8e8';
          x.fillRect(xx, sy + 2, 3, 6); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(xx, sy + 2, 1, 1);
        }
      });
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(62, 76, 200, 14);
      x.fillStyle = '#7a4a24'; x.fillRect(60, 72, 200, 14); x.fillStyle = '#9a6a3a'; x.fillRect(60, 72, 200, 3);
      x.fillStyle = '#2a2a2a'; x.fillRect(200, 66, 14, 8); x.fillStyle = '#40d040'; x.fillRect(202, 67, 8, 2);
      x.fillStyle = '#5a5a5a'; x.fillRect(90, 68, 20, 5); x.fillStyle = '#3a3a3a'; x.fillRect(110, 69, 6, 2);
      x.fillStyle = '#e8d8a8'; x.fillRect(140, 172, 40, 8);
      st.bg = c;
    }
    ctx.drawImage(st.bg, 0, 0);
    SP.person(ctx, 160, 62, { jacket: '#7a6a5a', hair: '#c8c8c8', skin: '#e8b888', pants: '#3a3a3a' }, 'down', t, false);
    SP.person(ctx, 160, 130, SP.LOOKS.player, 'up', t, false);
    const on = Math.random() > 0.03;
    SP.text(ctx, 'OME GERRIT', 160, 44 - 2, on ? '#ff60c0' : '#7a3060', 1, { align: 'center', shadow: '#2a0a1a' });
    SP.text(ctx, 'GEREEDSCHAP - WAPENS - GADGETS', 160, 100, '#f8ecc8', 1, { align: 'center', shadow: '#3a2a10' });
    if (on) glow(160, 44, 16, '255,90,190', 0.05);
  };

  // ---------- Kroeg ----------
  SCENES.bar = function (t) {
    if (!st.bg) {
      const r = AD.rng.seeded(5), [c, x] = off(W, H);
      x.fillStyle = '#6a4424'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#5a361a'; for (let yy = 0; yy < H; yy += 6) x.fillRect(0, yy, W, 1);
      for (let i = 0; i < 40; i++) x.fillRect(Math.floor(r() * W), Math.floor(r() * 30) * 6, 1, 6);
      x.fillStyle = '#2a1a10'; x.fillRect(0, 0, W, 30);
      for (let xx = 10; xx < 310; xx += 5) { x.fillStyle = ['#3a8a3a', '#8a3a2a', '#c8a040', '#e0e0d0'][Math.floor(r() * 4)]; x.fillRect(xx, 8 + Math.floor(r() * 3), 3, 12); }
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(12, 36, 300, 12);
      x.fillStyle = '#4a2a14'; x.fillRect(10, 32, 300, 12); x.fillStyle = '#7a4a24'; x.fillRect(10, 32, 300, 2);
      [[60, 100], [120, 140], [40, 150]].forEach(([tx, ty]) => { SP.disc(x, tx + 2, ty + 2, 8, 'rgba(0,0,0,0.35)'); SP.disc(x, tx, ty, 8, '#7a5030'); SP.disc(x, tx - 1, ty - 1, 6, '#8a6038'); });
      x.fillStyle = '#4a2a14'; x.fillRect(206, 96, 84, 50); x.fillStyle = '#2a7a3a'; x.fillRect(210, 100, 76, 42);
      ['#f0c020', '#c83030', '#3060c0', '#f4f0e0', '#202020'].forEach((col, i) => { x.fillStyle = col; x.fillRect(225 + i * 9, 115 + (i % 2) * 6, 2, 2); });
      st.bg = c;
    }
    ctx.drawImage(st.bg, 0, 0);
    const people = [[52, 96, 'ped1', 'right'], [68, 104, 'ped3', 'left'], [120, 130, 'ped2', 'down'], [130, 146, 'ped4', 'left'], [40, 140, 'ped3', 'down'], [160, 26, 'ped1', 'down']];
    people.forEach(([px, py, lk, dir]) => SP.person(ctx, px, py, SP.LOOKS[lk], dir, t, false));
    SP.person(ctx, 196 + Math.round(Math.sin(t) * 3), 120, SP.LOOKS.ped2, 'right', t, false);
    SP.person(ctx, 160, 165, SP.LOOKS.player, 'up', t, false);
    const on = Math.floor(t * 3) % 7 !== 0;
    SP.text(ctx, 'DE GOUDEN SLEUTEL', 160, 56, on ? '#ffd21f' : '#7a6010', 1, { align: 'center', shadow: '#2a1a00' });
    if (on) glow(160, 58, 20, '255,210,40', 0.04);
    for (let i = 0; i < 6; i++) { const sx = (i * 53 + t * 6) % W, sy = 80 + Math.sin(t + i) * 20; ctx.fillStyle = 'rgba(200,200,200,0.12)'; ctx.fillRect(sx, sy, 3, 2); }
    night(0.12);
  };

  // ---------- BUSTED / WASTED ----------
  function drawOverlay(t) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
    const s = 1 + Math.min(1, (t % 1000));
    SP.text(ctx, overlayText, 160, 70, overlayText === 'WASTED' ? '#c8c8c8' : '#e83030', 7, { align: 'center', shadow: '#000' });
    if (s && Math.floor(t * 2) % 2) SP.text(ctx, 'GAME OVER', 160, 120, '#ffd21f', 2, { align: 'center', shadow: '#000' });
  }
})();
