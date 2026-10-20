// =============================================================
//  SPRITES: alles pixel voor pixel getekend in code (geen plaatjes nodig).
//  - bitmap-font 3x5
//  - auto's (bovenaanzicht, 4 richtingen zonder rotatie-blur)
//  - poppetjes, gebouwen, bomen
//  - 12x12 iconen (als tekst-tekeningen, makkelijk aan te passen)
//  - portretjes voor crew/politie
// =============================================================
window.AD = window.AD || {};

(function () {
  const SP = AD.sprites = {};

  // ---------- Kleuren ----------
  SP.shade = function (hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    const f = v => amt < 0 ? Math.round(v * (1 + amt)) : Math.round(v + (255 - v) * amt);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, f(v))).toString(16).padStart(2, '0')).join('');
  };

  SP.disc = function (ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
    }
  };

  // ---------- Bitmap font 3x5 ----------
  const G = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '111101101101111', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', '-': '000000111000000',
    ':': '000010000010000', "'": '010010000000000', '€': '011100111100011', '&': '010101010101011',
    '/': '001001010100100', ' ': '000000000000000', ',': '000000000010100', '+': '000010111010000',
    'É': '111100110100111', 'Ë': '111100110100111',
  };
  SP.textWidth = (str, scale) => (String(str).length * 4 - 1) * (scale || 1);
  SP.text = function (ctx, str, x, y, color, scale, opts) {
    scale = scale || 1; opts = opts || {};
    str = String(str).toUpperCase();
    if (opts.align === 'center') x -= Math.round(SP.textWidth(str, scale) / 2);
    const draw = (ox, oy, col) => {
      ctx.fillStyle = col;
      for (let i = 0; i < str.length; i++) {
        const g = G[str[i]] || G['?'];
        for (let b = 0; b < 15; b++) {
          if (g[b] === '1') ctx.fillRect(Math.round(x + ox + (i * 4 + (b % 3)) * scale), Math.round(y + oy + Math.floor(b / 3) * scale), scale, scale);
        }
      }
    };
    if (opts.shadow) draw(scale, scale, opts.shadow);
    draw(0, 0, color);
  };

  // ---------- Auto's ----------
  // look = {w,h,kind}, x/y = midden, dir = up|down|left|right
  SP.car = function (ctx, x, y, look, body, dir, t, o) {
    o = o || {};
    const w = look.w, h = look.h, kind = look.kind;
    const horiz = dir === 'left' || dir === 'right';
    const W = horiz ? h : w, H = horiz ? w : h;
    const X = Math.round(x - W / 2), Y = Math.round(y - H / 2);
    if (!o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + 2, Y + 2, W, H); }
    const rect = (lx, ly, lw, lh, col) => {
      let rx, ry, rw, rh;
      switch (dir) {
        case 'down': rx = w - lx - lw; ry = h - ly - lh; rw = lw; rh = lh; break;
        case 'right': rx = h - ly - lh; ry = lx; rw = lh; rh = lw; break;
        case 'left': rx = ly; ry = w - lx - lw; rw = lh; rh = lw; break;
        default: rx = lx; ry = ly; rw = lw; rh = lh;
      }
      ctx.fillStyle = col; ctx.fillRect(X + rx, Y + ry, rw, rh);
    };
    if (kind === 'police') body = '#eeeeee';
    const dark = SP.shade(body, -0.45), light = SP.shade(body, 0.3);
    const roofC = SP.shade(body, kind === 'van' ? 0.15 : 0.1);
    const glass = '#8fc0e0', glassD = '#3a6080';
    rect(1, 0, w - 2, h, dark); rect(0, 1, w, h - 2, dark);
    rect(1, 1, w - 2, h - 2, body);
    rect(2, 1, w - 4, 1, light);
    let ws = Math.round(h * 0.28);
    if (kind === 'van') ws = 3;
    if (kind === 'sport') ws = Math.round(h * 0.36);
    rect(1, ws, w - 2, 3, glass); rect(1, ws, w - 2, 1, glassD);
    const roofStart = ws + 3;
    const roofLen = kind === 'van' ? h - roofStart - 2 : Math.round(h * (kind === 'sport' ? 0.2 : 0.3));
    rect(2, roofStart, w - 4, roofLen, roofC);
    if (kind !== 'van') rect(1, roofStart + roofLen, w - 2, 2, glassD);
    rect(1, 0, 2, 1, '#fff4b0'); rect(w - 3, 0, 2, 1, '#fff4b0');
    rect(1, h - 1, 2, 1, '#e02828'); rect(w - 3, h - 1, 2, 1, '#e02828');
    const mid = Math.floor(w / 2);
    if (kind === 'taxi') { rect(mid - 1, roofStart + 1, 2, 2, '#ffe060'); rect(mid - 1, roofStart + 1, 1, 1, '#202020'); }
    if (kind === 'sport') { rect(mid - 1, 1, 1, ws - 1, light); rect(mid, 1, 1, ws - 1, light); }
    if (kind === 'suv') { rect(2, roofStart, 1, roofLen, dark); rect(w - 3, roofStart, 1, roofLen, dark); }
    if (kind === 'police') {
      rect(0, roofStart, w, roofLen, '#1a1a24');
      rect(2, roofStart, w - 4, roofLen, '#eeeeee');
      const f = Math.floor(t * 8) % 2, hw = (w - 4) / 2;
      rect(2, roofStart + 1, hw, 2, f ? '#ff3030' : '#701010');
      rect(2 + hw, roofStart + 1, hw, 2, f ? '#203080' : '#4070ff');
    }
    if (o.damage) {
      if (o.damage > 0.3) { rect(2, 2, 2, 1, '#202020'); rect(w - 4, h - 4, 2, 1, '#202020'); }
      if (o.damage > 0.6) { rect(1, Math.floor(h / 2), 1, 3, '#202020'); rect(w - 3, 3, 2, 2, '#303030'); }
    }
    if (o.alarm && Math.floor(t * 5) % 2 === 0) {
      rect(0, 0, 3, 2, '#ffb020'); rect(w - 3, 0, 3, 2, '#ffb020');
      rect(0, h - 2, 3, 2, '#ffb020'); rect(w - 3, h - 2, 3, 2, '#ffb020');
    }
    if (o.highlight && Math.floor(t * 3) % 2 === 0) {
      ctx.fillStyle = '#ffe040';
      ctx.fillRect(X - 2, Y - 2, W + 4, 1); ctx.fillRect(X - 2, Y + H + 1, W + 4, 1);
      ctx.fillRect(X - 2, Y - 2, 1, H + 4); ctx.fillRect(X + W + 1, Y - 2, 1, H + 4);
    }
  };

  SP.carColor = inst => { const d = AD.carDef(inst.id); return d.colors[(inst.color || 0) % d.colors.length]; };

  // ---------- Poppetjes ----------
  SP.LOOKS = {
    player: { jacket: '#3a3a42', hair: '#2a1a10', skin: '#e0a878', pants: '#2a3a6a' },
    cop: { jacket: '#1c2c6c', hair: '#101830', skin: '#e0b088', pants: '#1c2c6c', cap: true },
    ped1: { jacket: '#a03030', hair: '#5a3a1a', skin: '#e8b888', pants: '#303030' },
    ped2: { jacket: '#3a7a3a', hair: '#d8c070', skin: '#c08860', pants: '#4a3a2a' },
    ped3: { jacket: '#c8a040', hair: '#101010', skin: '#8a5a3a', pants: '#2a2a4a' },
    ped4: { jacket: '#7a4aa0', hair: '#a04a1a', skin: '#f0c8a0', pants: '#3a3a3a' },
  };
  SP.person = function (ctx, x, y, look, dir, t, moving) {
    x = Math.round(x); y = Math.round(y);
    const P = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, w, h); };
    P(-2, -1, 6, 5, 'rgba(0,0,0,0.3)');
    const f = moving ? Math.floor(t * 10) % 2 : 0;
    const vert = dir === 'up' || dir === 'down';
    if (moving) {
      if (vert) { const s = dir === 'up' ? 1 : -1; P(-2, s > 0 ? 2 : -4, 2, 1 + f, look.pants); P(0, s > 0 ? 2 : -4 + f, 2, 2 - f, look.pants); }
      else { const s = dir === 'left' ? 1 : -1; P(s > 0 ? 2 : -4, -1, 1 + f, 2, look.pants); P(s > 0 ? 2 : -4 + f, 1, 2 - f, 2, look.pants); }
    }
    if (vert) {
      P(-3, -1, 6, 3, look.jacket); P(-3, -1, 6, 1, SP.shade(look.jacket, 0.2));
      const a = moving ? (f ? -1 : 1) : 0;
      P(-4, -1 + a, 1, 2, SP.shade(look.jacket, -0.2)); P(3, -1 - a, 1, 2, SP.shade(look.jacket, -0.2));
    } else {
      P(-1, -3, 3, 6, look.jacket); P(-1, -3, 1, 6, SP.shade(look.jacket, 0.2));
    }
    P(-2, -2, 4, 3, look.hair);
    const face = { up: [-1, -3, 2, 1], down: [-1, 1, 2, 1], left: [-3, -1, 1, 2], right: [2, -1, 1, 2] }[dir] || [-1, 1, 2, 1];
    P(face[0], face[1], face[2], face[3], look.skin);
    if (look.cap) P(-2, -2, 4, 1, '#d0b040');
  };

  // ---------- Bomen & gebouwen ----------
  SP.tree = function (ctx, x, y, r) {
    SP.disc(ctx, x + 2, y + 2, r, 'rgba(0,0,0,0.3)');
    SP.disc(ctx, x, y, r, '#2c5a22');
    SP.disc(ctx, x - 1, y - 1, r - 1, '#3c7a2c');
    SP.disc(ctx, x - 2, y - 2, Math.max(1, r - 3), '#5a9a3a');
  };

  const ROOFS = {
    brick: ['#8a3b2a', '#7a4a32', '#9a5a3a', '#6b3a2e', '#8a6a4a'],
    city: ['#8a8a8a', '#9c9484', '#7e848c', '#a29a88', '#6e6e74'],
    villa: ['#a0402a', '#5a5a6a', '#7a3020', '#8a6040'],
    glass: ['#2a3a5a', '#34485e', '#1e2e44', '#40506a'],
  };
  SP.building = function (ctx, x, y, w, h, style, r) {
    const pal = ROOFS[style] || ROOFS.city;
    const roof = pal[Math.floor(r() * pal.length)];
    if (style === 'villa') {
      ctx.fillStyle = '#3f7a2e'; ctx.fillRect(x, y, w, h);
      for (let i = 0; i < w * h / 12; i++) { ctx.fillStyle = r() < 0.5 ? '#346a26' : '#4a8a36'; ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1); }
      const hw = Math.max(8, Math.floor(w * 0.6)), hh = Math.max(8, Math.floor(h * 0.55));
      const hx = x + Math.floor((w - hw) / 2), hy = y + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(hx + 2, hy + 2, hw, hh);
      ctx.fillStyle = SP.shade(roof, 0.15); ctx.fillRect(hx, hy, hw, Math.floor(hh / 2));
      ctx.fillStyle = SP.shade(roof, -0.15); ctx.fillRect(hx, hy + Math.floor(hh / 2), hw, hh - Math.floor(hh / 2));
      ctx.fillStyle = SP.shade(roof, -0.4); ctx.fillRect(hx, hy + Math.floor(hh / 2), hw, 1);
      if (r() < 0.6 && h > 20) {
        const pw = Math.floor(hw * 0.6), py = hy + hh + 3;
        if (py + 6 < y + h) { ctx.fillStyle = '#d8d8c8'; ctx.fillRect(hx, py, pw + 2, 7); ctx.fillStyle = '#3a90d0'; ctx.fillRect(hx + 1, py + 1, pw, 5); ctx.fillStyle = '#8ad0f0'; ctx.fillRect(hx + 2, py + 2, 3, 1); }
      }
      if (w > 14) SP.tree(ctx, x + w - 4, y + h - 4, 3);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = SP.shade(roof, -0.4); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = roof; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = SP.shade(roof, 0.18); ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
    for (let i = 0; i < w * h / 10; i++) { ctx.fillStyle = r() < 0.5 ? SP.shade(roof, -0.08) : SP.shade(roof, 0.06); ctx.fillRect(x + 2 + Math.floor(r() * (w - 4)), y + 2 + Math.floor(r() * (h - 4)), 1, 1); }
    if (style === 'glass') {
      ctx.fillStyle = SP.shade(roof, 0.12);
      for (let yy = y + 3; yy < y + h - 2; yy += 4) ctx.fillRect(x + 2, yy, w - 4, 1);
      if (w > 26 && h > 26 && r() < 0.5) {
        const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
        SP.disc(ctx, cx, cy, 8, '#505a6a'); SP.disc(ctx, cx, cy, 7, '#3a4250');
        SP.text(ctx, 'H', cx - 1, cy - 2, '#e8e070', 1);
      }
    }
    if (style === 'brick') {
      ctx.fillStyle = SP.shade(roof, -0.15); ctx.fillRect(x + 1, y + Math.floor(h / 2), w - 2, 1);
      const n = 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) { const cx = x + 2 + Math.floor(r() * (w - 6)), cy = y + 2 + Math.floor(r() * (h - 6)); ctx.fillStyle = '#5a2a1a'; ctx.fillRect(cx, cy, 3, 3); ctx.fillStyle = '#1a1010'; ctx.fillRect(cx + 1, cy + 1, 1, 1); }
    }
    const vents = Math.floor(w * h / 250);
    for (let i = 0; i < vents; i++) {
      const vx = x + 3 + Math.floor(r() * Math.max(1, w - 9)), vy = y + 3 + Math.floor(r() * Math.max(1, h - 9));
      if (r() < 0.5) { ctx.fillStyle = '#5a5a5a'; ctx.fillRect(vx, vy, 4, 4); ctx.fillStyle = '#8a8a8a'; ctx.fillRect(vx, vy, 4, 1); }
      else { ctx.fillStyle = '#b0b0b0'; ctx.fillRect(vx, vy, 5, 4); ctx.fillStyle = '#505050'; ctx.fillRect(vx + 1, vy + 1, 3, 2); }
    }
  };

  // ---------- Iconen 12x12 ----------
  const PAL = {
    k: '#1a1410', w: '#f4f0e0', l: '#c8c8c8', g: '#8a8a8a', d: '#4a4a4a', y: '#f0c020', o: '#e08020',
    r: '#c83030', R: '#801818', b: '#3060c0', B: '#1c2c6c', c: '#70c8e8', G: '#40a040', D: '#206020',
    n: '#8a5a2a', N: '#5a3a18', s: '#e8b888', p: '#a040c0', e: '#e8d8a8',
  };
  const ICONS = {
    schroevendraaier: ['..........l.', '.........ll.', '........ll..', '.......ll...', '......ll....', '.....gl.....', '....rr......', '...rrrr.....', '..rrrrR.....', '.rrrrR......', '.rrRR.......', '..R.........'],
    breekijzer: ['......rrrr..', '.....rrRRrr.', '.....rr..Rr.', '....rr......', '....rr......', '...rr.......', '...rr.......', '..rr........', '..rr........', '.rr.........', '.rR.........', '............'],
    slimjim: ['..........ll', '.........lg.', '........lg..', '.......lg...', '......lg....', '.....lg.....', '....lg......', '...lg.......', '..lg........', '.lg.........', '.lgg........', '..gg........'],
    lockpick: ['..l..l..l...', '..l..l..l...', '..l.ll..l...', '..l.l..ll...', '.nnnnnnnnnn.', '.nNNNNNNNNn.', '.nnnnnnnnnn.', '.nnnnnnnnnn.', '.nnnyynnnnn.', '.nnnnnnnnnn.', '.NNNNNNNNNN.', '............'],
    relaybox: ['........l...', '........l...', '........l...', '.kkkkkkkkkk.', '.kddddddddk.', '.kdGddddrdk.', '.kddddddddk.', '.kdccccccdk.', '.kdccccccdk.', '.kddddddddk.', '.kkkkkkkkkk.', '............'],
    hotwirekit: ['............', '.r...y....b.', '..r..y...b..', '...r.y..b...', '....ryyb....', '.....rb.....', '.....br.....', '....b..r....', '...b....r...', '.ll......ll.', '.ll......ll.', '............'],
    obdprog: ['...dddddd...', '...dccccd...', '...dccccd...', '...dddddd...', '...dGdrdd...', '...dddddd...', '...dldldd...', '...dddddd...', '.....kk.....', '.....kk.....', '....kkkk....', '............'],
    scanner: ['...k........', '...k........', '...k........', '..kkkkkk....', '..kddddk....', '..kdGddk....', '..kllllk....', '..klkllk....', '..kllllk....', '..klklkk....', '..kkkkkk....', '............'],
    radar: ['...kkkkkk...', '..kDDDDDDk..', '.kDDDGDDDDk.', '.kDDDGDDDDk.', '.kDDDGDDrDk.', '.kDDDGGGGDk.', '.kDDDDDDDDk.', '.kDrDDDDDDk.', '..kDDDDDDk..', '...kkkkkk...', '.....dd.....', '....dddd....'],
    satnav: ['............', '.bbb....bbb.', '.bbb....bbb.', '.bbbkllkbbb.', '.bbbkllkbbb.', '.bbb.kk.bbb.', '......l.....', '.....l......', '....l..l....', '...l....l...', '..l......l..', '............'],
    sneakers: ['............', '............', '....rrr.....', '....rwr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrrr.', '.rwwrrrrrrr.', '.wwwwwwwwww.', '.dddddddddd.', '............', '............'],
    bivak: ['....kkkk....', '...kkkkkk...', '..kkkkkkkk..', '..kkkkkkkk..', '..ksskkssk..', '..kwskkswk..', '..kkkkkkkk..', '..kkkssskk..', '..kkkkkkkk..', '...kkkkkk...', '............', '............'],
    platen: ['............', '............', '............', '.kkkkkkkkkk.', '.kbyyyyyyyk.', '.kbykykykyk.', '.kbyyyyyyyk.', '.kkkkkkkkkk.', '............', '............', '............', '............'],
    knuppel: ['..........nn', '.........nnn', '........nnn.', '.......nnn..', '......nnn...', '.....nnn....', '....nnn.....', '...nn.......', '..nn........', '.Nn.........', 'NN..........', '............'],
    pistool: ['............', '............', '..dddddddd..', '..dllllllld.', '..dddddddd..', '..dddNN.....', '..ddNN......', '..dNNN......', '..NNN.......', '............', '............', '............'],
    shotgun: ['............', '............', '............', '............', '.nnnndddddd.', '.NNnnllllll.', '..NNnd......', '...NN.......', '............', '............', '............', '............'],
    uzi: ['............', '............', '...dddddd...', '..dddddddd..', '..dddlld....', '...dd.dd....', '...dd.dd....', '...dd.......', '...dd.......', '............', '............', '............'],
    ehbo: ['............', '....kkkk....', '...k....k...', '.kkkkkkkkkk.', '.kwwwrrwwwk.', '.kwwwrrwwwk.', '.kwrrrrrrwk.', '.kwrrrrrrwk.', '.kwwwrrwwwk.', '.kwwwrrwwwk.', '.kkkkkkkkkk.', '............'],
    advocaat: ['............', '....kkkk....', '....k..k....', '.kkkkkkkkkk.', '.knnnnnnnnk.', '.knnnnnnnnk.', '.kNNNyyNNNk.', '.knnnnnnnnk.', '.knnnnnnnnk.', '.kkkkkkkkkk.', '............', '............'],
    loc_winkel: ['............', 'rwrwrwrwrwrw', 'rwrwrwrwrwrw', '.eeeeeeeeee.', '.ecccenncce.', '.ecccenncce.', '.ecccenncce.', '.eeeeenneee.', '.eeeeenneee.', '.NNNNNNNNNN.', '............', '............'],
    loc_garage: ['............', '.....kk.....', '...kkkkkk...', '.kkkkkkkkkk.', '.kllllllllk.', '.kddddddddk.', '.kllllllllk.', '.kddddddddk.', '.kllllllllk.', '.kddddddddk.', '.kkkkkkkkkk.', '............'],
    loc_kroeg: ['............', '..wwwwww....', '.wwwwwwww...', '.kyyyyyyk...', '.kyyyyyykkk.', '.kyoyyyyk.k.', '.kyyyoyyk.k.', '.kyyyyyykkk.', '.kyyyyyyk...', '.kkkkkkkk...', '............', '............'],
    loc_baas: ['....kkkk....', '.....kk.....', '....kNNk....', '...knnnnk...', '..knnnnnnk..', '.knnnyynnnk.', '.knnyynnnnk.', '.knnnyynnnk.', '.knnyynnnnk.', '..knnnnnnk..', '...kkkkkk...', '............'],
    loc_dokter: ['............', '....rrrr....', '....rrrr....', '....rrrr....', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '....rrrr....', '....rrrr....', '....rrrr....', '............'],
    loc_skill: ['.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '...yyyyyy...', '..yyy..yyy..', '..yy....yy..', '.yy......yy.', '............'],
    loc_huis: ['.....rr.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..', '.rrrrrrrrrr.', '..eeeeeeee..', '..ecceecce..', '..ecceecce..', '..eeeennee..', '..eeeennee..', '..eeeennee..', '............'],
    svc_repair: ['..ll....ll..', '..lll..lll..', '...llllll...', '....llll....', '.....ll.....', '.....ll.....', '.....ll.....', '.....ll.....', '....llll....', '...ll..ll...', '...l....l...', '............'],
    svc_spray: ['.....kk.....', '....kddk..c.', '....kddk.c.c', '...kkkkkk.c.', '...krrrrk...', '...krwwrk...', '...krwwrk...', '...krrrrk...', '...krrrrk...', '...krrrrk...', '...kkkkkk...', '............'],
    buyer_sloper: ['............', '.dddddd.....', '.dddddd.....', '.dddddd.....', '...nn.......', '...nn.......', '...nn.......', '...nn.......', '...nn.......', '...nn.......', '...NN.......', '............'],
    buyer_heler: ['....yyyy....', '..yyyyyyyy..', '.yyyykkkyyy.', '.yyykyyyyyy.', 'yykkkkkyyyyy', 'yyykyyyyyyyy', 'yykkkkkyyyyy', '.yyykyyyyyy.', '.yyyykkkyyy.', '..yyyyyyyy..', '....yyyy....', '............'],
    buyer_export: ['.....bb.....', '....b..b....', '.....bb.....', '.....bb.....', '..bbbbbbbb..', '.....bb.....', '.....bb.....', '.b...bb...b.', '.bb..bb..bb.', '..bbbbbbbb..', '....bbbb....', '............'],
    act_hide: ['............', '............', '.DDDDDDDDDD.', '.GGGGGGGGGG.', '.GDGDGDGDGG.', '.GDGDGDGDGG.', '.GDGDGDGDGG.', '.GDGDGDGDGG.', '.GGGGGGGGGG.', '.DDDDDDDDDD.', '.k........k.', '............'],
    act_talk: ['............', '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwkwkwkwwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', '.kkkkwkkkkk.', '....kwk.....', '....kk......', '............', '............', '............'],
    act_drive: ['...kkkkkk...', '..k......k..', '.k........k.', 'k..........k', 'k...kkkk...k', 'kkkkkddkkkkk', 'k...kddk...k', 'k....kk....k', '.k...kk...k.', '..k..kk..k..', '...kkkkkk...', '............'],
    act_crew: ['............', '..nn....NN..', '.nssn..NssN.', '.nssn..NssN.', '..ss....ss..', '.bbbb..rrrr.', 'bbbbbbrrrrrr', 'bbbbbbrrrrrr', 'bbbbbbrrrrrr', '............', '............', '............'],
    act_walk: ['.....nn.....', '.....nn.....', '....bbbb....', '...b.bb.b...', '...b.bb.b...', '.....bb.....', '....kk.k....', '....k...k...', '...k.....k..', '...k.....k..', '..kk....kk..', '............'],
    act_surrender: ['.n..........', '.nwwwwwww...', '.nwwwwwwww..', '.nwwwwwwww..', '.nwwwwwww...', '.n..........', '.n..........', '.n..........', '.n..........', '.n..........', '.N..........', '............'],
  };
  const ALIAS = {
    cat_tool: 'breekijzer', cat_starter: 'hotwirekit', cat_gadget: 'radar', cat_weapon: 'pistool', cat_service: 'ehbo',
    role_chauffeur: 'act_drive', role_kraker: 'lockpick', role_uitkijk: 'radar', role_spierbundel: 'knuppel', role_schutter: 'pistool',
  };
  SP.hasIcon = id => !!(ICONS[id] || ALIAS[id] || /^car_|^loc_wijk$/.test(id || ''));
  SP.icon = function (ctx, id, x, y, scale) {
    scale = scale || 1;
    id = ALIAS[id] || id;
    if (id === 'loc_wijk') id = 'car_familia';
    if (/^car_/.test(id)) {
      const d = AD.carDef(id.slice(4)) || AD.CARS[0];
      const c = document.createElement('canvas'); c.width = 12; c.height = 12;
      SP.car(c.getContext('2d'), 6, 6, { w: Math.min(d.look.w, 8), h: Math.min(d.look.h, 11), kind: d.look.kind }, d.colors[0], 'up', 0, { noShadow: true });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(c, x, y, 12 * scale, 12 * scale); return;
    }
    const rows = ICONS[id]; if (!rows) return;
    for (let yy = 0; yy < 12; yy++) {
      const row = rows[yy] || '';
      for (let xx = 0; xx < 12; xx++) {
        const col = PAL[row[xx]];
        if (col) { ctx.fillStyle = col; ctx.fillRect(x + xx * scale, y + yy * scale, scale, scale); }
      }
    }
  };
  const iconCache = {};
  SP.iconURL = function (id, scale) {
    const key = id + '@' + (scale || 1);
    if (iconCache[key]) return iconCache[key];
    const s = scale || 1, c = document.createElement('canvas');
    c.width = 12 * s; c.height = 12 * s;
    SP.icon(c.getContext('2d'), id, 0, 0, s);
    return (iconCache[key] = c.toDataURL());
  };

  // ---------- Portretjes 16x18 ----------
  const HAIR = ['#2a1a10', '#5a3a1a', '#d8c070', '#101010', '#a04a1a', '#8a8a8a'];
  const SKIN = ['#f0c8a0', '#e0a878', '#c08860', '#8a5a3a', '#5a3a28'];
  const SHIRT = ['#a03030', '#3a7a3a', '#3a3a42', '#c8a040', '#7a4aa0', '#2a5a9a', '#e0e0d0'];
  const BG = ['#c9905a', '#b07a48', '#a8885a', '#9a7050'];
  SP.portrait = function (ctx, seed, kind, x, y, scale) {
    const r = AD.rng.seeded(seed * 9973 + 7);
    const s = scale || 1, ox = x || 0, oy = y || 0;
    const P = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + px * s, oy + py * s, w * s, h * s); };
    const cop = kind === 'cop', player = kind === 'player';
    const skin = player ? '#e0a878' : SKIN[Math.floor(r() * SKIN.length)];
    const hair = player ? '#2a1a10' : HAIR[Math.floor(r() * HAIR.length)];
    const shirt = cop ? '#1c2c6c' : player ? '#3a3a42' : SHIRT[Math.floor(r() * SHIRT.length)];
    P(0, 0, 16, 18, cop ? '#7a8aa8' : BG[Math.floor(r() * BG.length)]);
    P(2, 13, 12, 5, shirt); P(1, 15, 14, 3, shirt);
    P(6, 11, 4, 3, SP.shade(skin, -0.15));
    if (cop) { P(7, 14, 2, 4, '#e8e8f0'); P(10, 15, 2, 1, '#d0b040'); }
    if (player) { P(6, 14, 4, 4, '#c83030'); P(5, 13, 1, 5, '#202020'); P(10, 13, 1, 5, '#202020'); }
    P(4, 3, 8, 9, skin); P(5, 12, 6, 1, skin);
    P(4, 3, 8, 1, SP.shade(skin, 0.15));
    const eyeY = 7;
    P(5, eyeY, 2, 1, '#1a1410'); P(9, eyeY, 2, 1, '#1a1410');
    P(7, 8, 2, 2, SP.shade(skin, -0.2));
    P(6, 10, 4, 1, SP.shade(skin, -0.35));
    if (cop) {
      P(3, 1, 10, 4, '#1c2c6c'); P(3, 5, 10, 1, '#101830'); P(7, 2, 2, 2, '#d0b040');
    } else if (player) {
      P(3, 2, 10, 3, '#3a3a42'); P(3, 5, 11, 1, '#2a2a30'); P(4, 5, 1, 2, hair); P(11, 5, 1, 2, hair);
    } else {
      const style = Math.floor(r() * 4);
      if (style === 0) { P(4, 1, 8, 3, hair); P(3, 2, 1, 5, hair); P(12, 2, 1, 5, hair); }
      else if (style === 1) { P(4, 2, 8, 2, hair); }
      else if (style === 2) { P(3, 1, 10, 3, hair); P(3, 3, 2, 9, hair); P(11, 3, 2, 9, hair); }
      else { P(4, 2, 8, 1, SP.shade(skin, -0.1)); }
      if (r() < 0.3) P(5, 10, 6, 2, SP.shade(hair, 0.1));
      if (r() < 0.2) { P(4, 6, 8, 2, '#1a1a1a'); }
    }
  };
  const portraitCache = {};
  SP.portraitURL = function (seed, kind, scale) {
    const key = seed + kind + scale;
    if (portraitCache[key]) return portraitCache[key];
    const s = scale || 1, c = document.createElement('canvas');
    c.width = 16 * s; c.height = 18 * s;
    SP.portrait(c.getContext('2d'), seed, kind, 0, 0, s);
    return (portraitCache[key] = c.toDataURL());
  };

  SP.carURL = function (inst, scale) {
    const d = AD.carDef(inst.id), s = scale || 1;
    const c = document.createElement('canvas');
    const W = d.look.h + 4, H = d.look.w + 4;
    c.width = W * s; c.height = H * s;
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    SP.car(tmp.getContext('2d'), W / 2 - 1, H / 2 - 1, d.look, SP.carColor(inst), 'right', 0, { damage: 1 - inst.condition });
    const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(tmp, 0, 0, W * s, H * s);
    return c.toDataURL();
  };
})();
