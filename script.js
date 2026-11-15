const $ = s => document.querySelector(s);
const G = window.gsap;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:700px)').matches || 'ontouchstart' in window;

// =========================================
// 0. MOTOR DE SONIDO (Web Audio API, sin archivos)
// =========================================
const Snd = (() => {
  let ctx, master, nbuf, muted = false;
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}
  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
      nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function tone(f, d = .3, type = 'sine', v = .2, t = 0, to) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, n);
    if (to) o.frequency.exponentialRampToValueAtTime(to, n + d);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(v, n + .015); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    o.connect(g).connect(master); o.start(n); o.stop(n + d + .05);
  }
  function noise(d, type, f0, f1, v, t = 0) {
    if (!ctx) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), n = ctx.currentTime + t;
    s.buffer = nbuf; f.type = type; f.frequency.setValueAtTime(f0, n); f.frequency.exponentialRampToValueAtTime(f1, n + d);
    g.gain.setValueAtTime(.0001, n); g.gain.exponentialRampToValueAtTime(v, n + d * .3); g.gain.exponentialRampToValueAtTime(.0001, n + d);
    s.connect(f).connect(g).connect(master); s.start(n); s.stop(n + d + .05);
  }
  const ui = () => { const b = $('#mute-btn'); if (b) b.textContent = muted ? '🔇' : '🔊'; };
  return {
    init,
    toggle() {
      init(); muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : .6, ctx.currentTime, .05);
      try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) {}
      ui(); if (!muted) this.chime();
    },
    ui,
    heart() { tone(70, .35, 'sine', .5, 0, 45); tone(70, .35, 'sine', .45, .22, 45); [880, 1318, 1760, 2093].forEach((f, i) => tone(f, .9, 'sine', .08, .35 + i * .09)); },
    whoosh() { noise(.45, 'bandpass', 300, 2400, .25); },
    paper() { noise(.18, 'highpass', 2500, 5000, .2); noise(.1, 'highpass', 4000, 7000, .12, .12); },
    tick() { tone(1300, .05, 'square', .04); },
    chime() { tone(1175, .25, 'triangle', .1); tone(1568, .35, 'sine', .07, .08); },
    fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .55, 'triangle', .12, i * .12)); tone(2093, 1.2, 'sine', .05, .6); },
    key() { tone(1700 + Math.random() * 500, .03, 'square', .018); }
  };
})();
['pointerdown', 'touchstart', 'keydown'].forEach(e => document.addEventListener(e, Snd.init, { passive: true }));
Snd.ui();
document.addEventListener('click', e => { if (e.target.closest('.polaroid')) Snd.paper(); });

// =========================================
// 1. VÓRTICE DE CORAZÓN (canvas)
// =========================================
const VX = (() => {
  const c = $('#vortex-canvas'), x = c.getContext('2d');
  const N = reduce ? 60 : mobile ? 130 : 260;
  let W, H, cx, cy, ox = 0, oy = 0, mx = null, my = null, P = [], run = false, burst = 0, raf;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
    const b = $('#magic-heart').getBoundingClientRect(), o = c.getBoundingClientRect();
    cx = b.left + b.width / 2 - o.left; cy = b.top + b.height / 2 - o.top;
  }
  const maxR = () => Math.min(Math.max(W, H) * .6, 520);
  const mk = far => ({ a: Math.random() * 6.283, r: far ? maxR() : 20 + Math.random() * maxR(), s: .006 + Math.random() * .014, h: 325 + Math.random() * 45, z: .4 + Math.random() * 1.2, px: null, py: null });
  function frame() {
    if (!run) return;
    x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(18,11,24,.2)'; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';
    if (mx !== null) { ox += ((mx - cx) * .25 - ox) * .06; oy += ((my - cy) * .25 - oy) * .06; }
    const R = maxR();
    for (const p of P) {
      p.a += p.s * (1 + (1 - p.r / R) * 2.5) * (1 + burst * 3);
      p.r -= (.18 + (1 - p.r / R) * .5) * (1 + burst * 5);
      if (p.r < 14) Object.assign(p, mk(true), { px: null });
      const k = p.r / R, X = cx + ox * (1 - k) + Math.cos(p.a) * p.r, Y = cy + oy * (1 - k) + Math.sin(p.a) * p.r * .55;
      if (p.px !== null) {
        x.strokeStyle = `hsla(${p.h},100%,${65 + (1 - k) * 25}%,${.25 + (1 - k) * .6})`;
        x.lineWidth = p.z * (.6 + (1 - k) * 1.8); x.beginPath(); x.moveTo(p.px, p.py); x.lineTo(X, Y); x.stroke();
      }
      p.px = X; p.py = Y;
    }
    burst *= .93;
    raf = requestAnimationFrame(frame);
  }
  const mv = e => { const o = c.getBoundingClientRect(); mx = e.clientX - o.left; my = e.clientY - o.top; };
  return {
    start() {
      size(); P = Array.from({ length: N }, () => mk(false)); run = true; frame();
      addEventListener('resize', size); addEventListener('pointermove', mv);
      addEventListener('pointerdown', e => { mv(e); burst = 1; });
    },
    stop() { run = false; cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', mv); }
  };
})();
VX.start();

// =========================================
// 2. CORAZONES FLOTANTES Y CONFETI
// =========================================
function createBgHeart() {
  if (document.hidden) return;
  const container = $('#floating-hearts'), heart = document.createElement('div');
  heart.className = 'bg-heart';
  heart.innerHTML = Math.random() > 0.3 ? '💖' : '✨';
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.fontSize = (Math.random() * 14 + 12) + 'px';
  heart.style.animationDuration = (Math.random() * 5 + 6) + 's';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 11000);
}
setInterval(createBgHeart, mobile ? 1100 : 700);

function launchConfetti() {
  confetti({ particleCount: mobile ? 60 : 90, spread: 75, origin: { y: 0.6 }, disableForReducedMotion: true, colors: ['#ff6b9d', '#ffb8d1', '#ffd166', '#ffffff'] });
}

let entered = false;
function enterGift() {
  if (entered) return; entered = true;
  Snd.init(); Snd.heart(); launchConfetti();
  const welcome = $('#welcome-screen'), app = $('#main-app');
  const done = () => {
    welcome.classList.add('hidden'); VX.stop(); app.classList.remove('hidden');
    if (G && !reduce) {
      G.from('.top-bar', { y: -40, opacity: 0, duration: .6, ease: 'power3.out' });
      G.from('.hero-banner > *', { y: 20, opacity: 0, stagger: .1, duration: .6, ease: 'power3.out' });
      G.from('.menu-card', { y: 40, opacity: 0, scale: .9, stagger: .08, duration: .6, ease: 'back.out(1.6)', delay: .15, clearProps: 'all' });
    }
  };
  if (G && !reduce) G.to(welcome, { opacity: 0, scale: 1.08, filter: 'blur(10px)', duration: .7, ease: 'power2.in', onComplete: done });
  else done();
}

// =========================================
// 3. NAVEGACIÓN
// =========================================
function swap(to) {
  const cur = document.querySelector('.view.active-view');
  Snd.whoosh();
  const go = () => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    to.classList.add('active-view'); scrollTo({ top: 0 });
    if (G && !reduce) {
      G.fromTo(to, { opacity: 0, y: 30, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .55, ease: 'power3.out', clearProps: 'transform' });
      G.from(to.querySelectorAll('.menu-card,.envelope,.food-card,.polaroid,.video-card'), { opacity: 0, y: 26, rotate: -2, stagger: .07, duration: .55, ease: 'back.out(1.6)', delay: .1, clearProps: 'all' });
    }
  };
  if (G && cur && !reduce) G.to(cur, { opacity: 0, y: -14, duration: .18, onComplete: go }); else go();
}
function openSection(id) {
  swap($('#sec-' + id));
  $('#back-btn').classList.remove('hidden');
  if (id === 'ruleta') drawWheel();
  if (id === 'carta') startTypewriter();
}
function showMenu() { swap($('#menu-view')); $('#back-btn').classList.add('hidden'); }

// Inclinación 3D en tarjetas (solo con mouse)
if (G && !mobile && !reduce) {
  document.querySelectorAll('.menu-card').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      G.to(el, { rotateY: ((e.clientX - r.left) / r.width - .5) * 14, rotateX: -((e.clientY - r.top) / r.height - .5) * 14, transformPerspective: 700, duration: .3 });
    });
    el.addEventListener('pointerleave', () => G.to(el, { rotateX: 0, rotateY: 0, duration: .5 }));
  });
}

// =========================================
// 4. MODAL "ABRE CUANDO..."
// =========================================
function openLetterModal(title, text) {
  Snd.paper();
  $('#modal-title').innerText = title; $('#modal-body').innerText = text;
  $('#letter-modal').classList.remove('hidden');
  if (G && !reduce) {
    G.fromTo('#letter-modal', { opacity: 0 }, { opacity: 1, duration: .25 });
    G.fromTo('.modal-content', { scale: .7, rotateX: -50, y: 40 }, { scale: 1, rotateX: 0, y: 0, duration: .55, ease: 'back.out(1.7)' });
  }
}
function closeLetterModal(e) {
  if (e.target.id === 'letter-modal') { Snd.paper(); $('#letter-modal').classList.add('hidden'); }
}

// =========================================
// 5. RULETA
// =========================================
const options = ["Ir por cafecitoo", "Noche de pelisss o cine", "Cenar taquitosss ", "Ir por nievecita ", "Hamburguesas ", "Armar un picnic", "Ir a un parqueo o plaza", "Ir por Chetosss"];
const colors = ["#ff5e94", "#9b5de5", "#f15bb5", "#ff8fab", "#7b2cbf", "#ff758c"];
let currentAngle = 0, isSpinning = false;

function drawWheel() {
  const canvas = $('#wheel-canvas'), ctx = canvas.getContext('2d'), arc = (2 * Math.PI) / options.length;
  ctx.clearRect(0, 0, 300, 300);
  options.forEach((opt, i) => {
    const angle = currentAngle + i * arc;
    ctx.beginPath(); ctx.fillStyle = colors[i % colors.length];
    ctx.moveTo(150, 150); ctx.arc(150, 150, 145, angle, angle + arc); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(150, 150); ctx.rotate(angle + arc / 2);
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Plus Jakarta Sans, sans-serif";
    ctx.fillText(opt, 45, 5); ctx.restore();
  });
  ctx.beginPath(); ctx.arc(150, 150, 16, 0, 7); ctx.fillStyle = '#fff5f8'; ctx.fill();
}
const pickIndex = () => {
  const arc = (2 * Math.PI) / options.length;
  return Math.floor(((1.5 * Math.PI - (currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / arc);
};

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true; Snd.init(); Snd.whoosh();
  $('#wheel-result').classList.add('hidden');
  const spinTime = 3600, startAngle = currentAngle, extra = (Math.random() * 4 + 5) * 2 * Math.PI, start = performance.now();
  let last = pickIndex();
  function animate(now) {
    const progress = Math.min((now - start) / spinTime, 1);
    currentAngle = startAngle + extra * (1 - Math.pow(1 - progress, 4));
    drawWheel();
    const idx = pickIndex();
    if (idx !== last) { last = idx; Snd.tick(); }
    if (progress < 1) requestAnimationFrame(animate);
    else {
      isSpinning = false;
      const box = $('#wheel-result');
      box.innerHTML = `✨ ¡Tocó: <strong>${options[idx]}</strong>! Tómale captura para hacerlo realidad.`;
      box.classList.remove('hidden');
      if (G && !reduce) G.from(box, { scale: .6, opacity: 0, duration: .6, ease: 'elastic.out(1,.5)' });
      Snd.fanfare(); launchConfetti();
    }
  }
  requestAnimationFrame(animate);
}

// =========================================
// 6. CARTA CON MÁQUINA DE ESCRIBIR
// =========================================
const birthdayLetter = `Hoy quería hacer algo diferente para recordarte lo especial que eres para mí dianitaaa ademas porque soy de sistemas jsjs.

Queria decirte que cada momento contigo —desde las pláticas largas hasta nuestras salidas a comer muy improvisadas— se ha vuelto de mis partes favoritas de la semana y sobre todo, del semestre. Admiro muchísimo tu forma de ser, tu alegría y lo linda persona que eres, Dianita.

Espero que hoy la pases increíble, que te consientan mucho y que este nuevo año esté lleno de cosas bonitas para ti, tambien para nosotros.

¡Feliz cumpleaños, Dianita! 💖`;

let typedStarted = false;
function startTypewriter() {
  if (typedStarted) return; typedStarted = true;
  const target = $('#typewriter-text'), chars = Array.from(birthdayLetter);
  let i = 0;
  (function type() {
    if (i < chars.length) {
      target.textContent += chars[i];
      if (i % 2 === 0 && chars[i].trim()) Snd.key();
      i++;
      setTimeout(type, /[.,!?\n]/.test(chars[i - 1]) ? 140 : 28);
    } else { Snd.chime(); }
  })();
}