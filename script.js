const $ = s => document.querySelector(s);
const G = window.gsap;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:700px)').matches || 'ontouchstart' in window;

// =========================================
// 0. MOTOR DE SONIDO Y MÚSICA DE FONDO
// =========================================
const Snd = (() => {
  let ctx, master, nbuf, muted = false;
  try { muted = localStorage.getItem('muted') === '1'; } catch (e) {}

  const bgm = () => $('#bg-music');

  function syncMusic() {
    const a = bgm();
    if (!a) return;
    a.volume = 0.30;
    a.muted = muted;
  }

  function playMusic() {
    const a = bgm();
    if (!a) return;
    syncMusic();
    if (!muted && a.paused) {
      a.play().catch(() => {});
    }
  }

  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
      nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = nbuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    syncMusic();
  }

  function tone(f, d = .3, type = 'sine', v = .2, t = 0, to) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime + t;
    o.type = type; o.frequency.setValueAtTime(f, n);
    if (to) o.frequency.exponentialRampToValueAtTime(to, n + d);
    g.gain.setValueAtTime(.0001, n);
    g.gain.exponentialRampToValueAtTime(v, n + .015);
    g.gain.exponentialRampToValueAtTime(.0001, n + d);
    o.connect(g).connect(master); o.start(n); o.stop(n + d + .05);
  }

  function noise(d, type, f0, f1, v, t = 0) {
    if (!ctx) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), n = ctx.currentTime + t;
    s.buffer = nbuf; f.type = type; f.frequency.setValueAtTime(f0, n); f.frequency.exponentialRampToValueAtTime(f1, n + d);
    g.gain.setValueAtTime(.0001, n);
    g.gain.exponentialRampToValueAtTime(v, n + d * .3);
    g.gain.exponentialRampToValueAtTime(.0001, n + d);
    s.connect(f).connect(g).connect(master); s.start(n); s.stop(n + d + .05);
  }

  const ui = () => {
    const b = $('#mute-btn');
    if (b) b.textContent = muted ? '🔇' : '🔊';
  };

  return {
    init,
    playMusic,
    toggle() {
      init();
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : .6, ctx.currentTime, .05);
      syncMusic();
      const a = bgm();
      if (a) {
        if (muted) a.pause();
        else a.play().catch(() => {});
      }
      try { localStorage.setItem('muted', muted ? '1' : '0'); } catch (e) {}
      ui();
      if (!muted) this.chime();
    },
    ui,
    heart() {
      tone(70, .35, 'sine', .5, 0, 45);
      tone(70, .35, 'sine', .45, .22, 45);
      [880, 1318, 1760, 2093].forEach((f, i) => tone(f, .9, 'sine', .08, .35 + i * .09));
    },
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

// Pausar música automáticamente si se reproduce algún video local
document.addEventListener('play', e => {
  if (e.target.tagName === 'VIDEO') {
    const a = $('#bg-music');
    if (a && !a.paused) a.pause();
  }
}, true);

['pause', 'ended'].forEach(ev => {
  document.addEventListener(ev, e => {
    if (e.target.tagName === 'VIDEO') Snd.playMusic();
  }, true);
});

// =========================================
// 1. CORAZÓN ASCII 3D DE NUBE DENSA + ESPIRALES DE LUZ
// =========================================
const ASCIIHeart = (() => {
  const canvas = $('#ascii-canvas');
  const ctx = canvas.getContext('2d');
  const hudRot = $('#hud-rot');

  const BODY_CHARS = ['.', ':', '+', '*', 'v', 'x', '%', '&', '#', 'W'];
  const LIGHT_CHARS = ['@', '#', '*', '+'];
  const BASE_SPEED = 0.0055;

  let W, H, rotY = 0, velY = BASE_SPEED, dragX = null, run = false, raf;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Nube densa volumétrica de corazón 3D
  const particles = [];
  const TARGET_COUNT = reduce ? 650 : mobile ? 1500 : 2600;

  let attempts = 0;
  while (particles.length < TARGET_COUNT && attempts < 120000) {
    attempts++;
    const x = (Math.random() * 2.6) - 1.3;
    const y = (Math.random() * 2.6) - 1.2;
    const z = (Math.random() * 1.8) - 0.9;

    const a = x * x + 2.25 * z * z + y * y - 1;
    const val = a * a * a - (x * x * y * y * y) - (0.1125 * z * z * y * y * y);

    if (val <= 0 && val > -0.22) {
      const len = Math.hypot(x, y, z * 1.5) || 1;
      particles.push({
        x: x,
        y: -y,
        z: z,
        nx: x / len,
        ny: -y / len,
        nz: (z * 1.5) / len,
        ch: BODY_CHARS[Math.floor(Math.random() * BODY_CHARS.length)],
        isRibbon: false,
        phase: Math.random() * 6.28
      });
    }
  }

  // Espirales luminosas alrededor del corazón
  const RIBBON_COUNT = reduce ? 100 : mobile ? 220 : 380;
  for (let i = 0; i < RIBBON_COUNT; i++) {
    const t = i / RIBBON_COUNT;
    const y = -1.05 + t * 2.15;
    const angle = t * Math.PI * 7;

    const profile = Math.sin(Math.min(1, Math.max(0, (y + 1.05) / 2.1)) * Math.PI);
    const rx = (0.35 + profile * 0.88) * 1.04;
    const rz = (0.22 + profile * 0.48) * 1.04;

    const jitter = () => (Math.random() - 0.5) * 0.05;
    const x = Math.cos(angle) * rx + jitter();
    const z = Math.sin(angle) * rz + jitter();

    particles.push({
      x: x,
      y: -y,
      z: z,
      nx: Math.cos(angle),
      ny: 0,
      nz: Math.sin(angle),
      ch: LIGHT_CHARS[i % LIGHT_CHARS.length],
      isRibbon: true,
      phase: t * 18
    });
  }

  // Partículas y estrellas en el fondo
  const stars = Array.from({ length: reduce ? 45 : mobile ? 110 : 200 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.00035 + Math.random() * 0.0009,
    drift: (Math.random() - 0.5) * 0.0003,
    ch: Math.random() > 0.7 ? '✦' : (Math.random() > 0.4 ? '+' : '·'),
    alpha: 0.2 + Math.random() * 0.55,
    phase: Math.random() * 6.28,
    tint: Math.random() > 0.5 ? '255, 195, 225' : '225, 195, 255'
  }));

  function render(time) {
    if (!run) return;
    ctx.clearRect(0, 0, W, H);

    const cx = W * 0.5;
    const cy = H * (mobile ? 0.43 : 0.45);
    const beat = 1 + Math.sin(time * 0.0032) * 0.028;
    const baseSize = Math.min(W, H) * (mobile ? 0.32 : 0.30) * beat;

    // Resplandor radial suave detrás del corazón
    const glow = ctx.createRadialGradient(cx, cy, baseSize * 0.1, cx, cy, baseSize * 1.45);
    glow.addColorStop(0, 'rgba(255, 77, 148, 0.24)');
    glow.addColorStop(0.55, 'rgba(168, 85, 247, 0.10)');
    glow.addColorStop(1, 'rgba(10, 3, 16, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, baseSize * 1.45, 0, Math.PI * 2);
    ctx.fill();

    const fontSize = mobile ? 9.5 : 11.5;
    ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Estrellas y destellos flotando en el fondo
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.y += s.speed;
      s.x += s.drift;
      if (s.y > 1) { s.y = -0.02; s.x = Math.random(); }
      if (s.x < 0) s.x = 1;
      if (s.x > 1) s.x = 0;

      const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0025 + s.phase);
      ctx.fillStyle = `rgba(${s.tint}, ${s.alpha * twinkle})`;
      ctx.fillText(s.ch, s.x * W, s.y * H);
    }

    // Rotación lenta y fluida
    rotY += velY;
    velY += (BASE_SPEED - velY) * 0.035;
    if (hudRot) {
      const deg = Math.round(((rotY * 180) / Math.PI) % 360);
      hudRot.textContent = `rot: ${(deg + 360) % 360}°`;
    }

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    // Proyectar todos los puntos 3D
    const projected = new Array(particles.length);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const rx = p.x * cosY - p.z * sinY;
      const rz = p.x * sinY + p.z * cosY;

      const rnx = p.nx * cosY - p.nz * sinY;
      const rnz = p.nx * sinY + p.nz * cosY;

      const fov = 3.2;
      const persp = fov / (fov - rz);

      projected[i] = {
        sx: cx + rx * baseSize * persp,
        sy: cy + p.y * baseSize * persp,
        z: rz,
        light: rnx * 0.25 - p.ny * 0.25 + rnz * 0.9,
        ch: p.ch,
        isRibbon: p.isRibbon,
        phase: p.phase
      };
    }

    projected.sort((a, b) => a.z - b.z);

    // Dibujar caracteres del corazón
    for (let i = 0; i < projected.length; i++) {
      const pt = projected[i];
      const depth = Math.max(0.18, Math.min(1, (pt.z + 1.1) / 2.2));

      if (pt.isRibbon) {
        const twinkle = 0.6 + 0.4 * Math.sin(time * 0.005 + pt.phase);
        ctx.fillStyle = `rgba(255, 224, 130, ${depth * twinkle})`;
        ctx.fillText(pt.ch, pt.sx, pt.sy);
      } else {
        if (pt.light > 0.58) {
          ctx.fillStyle = `rgba(255, 218, 235, ${0.5 + depth * 0.5})`;
        } else if (pt.light > 0.1) {
          ctx.fillStyle = `rgba(255, 82, 152, ${0.4 + depth * 0.58})`;
        } else {
          ctx.fillStyle = `rgba(155, 36, 98, ${0.28 + depth * 0.45})`;
        }
        ctx.fillText(pt.ch, pt.sx, pt.sy);
      }
    }

    raf = requestAnimationFrame(render);
  }

  const onDown = e => {
    dragX = e.clientX;
    velY = 0.022;
    Snd.init();
    Snd.chime();
  };
  const onMove = e => {
    if (dragX !== null) {
      const dx = e.clientX - dragX;
      rotY += dx * 0.007;
      velY = dx * 0.002;
      dragX = e.clientX;
    }
  };
  const onUp = () => { dragX = null; };

  return {
    start() {
      resize();
      run = true;
      raf = requestAnimationFrame(render);
      window.addEventListener('resize', resize);
      canvas.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    stop() {
      run = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
  };
})();
ASCIIHeart.start();

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
  Snd.init();
  Snd.heart();
  Snd.playMusic();
  launchConfetti();
  const welcome = $('#welcome-screen'), app = $('#main-app');
  const done = () => {
    welcome.classList.add('hidden');
    ASCIIHeart.stop();
    app.classList.remove('hidden');
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
// =======================================
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
// 6. CARTA CON MÁQUINA DE ESCRIBIR para mi amor bello
// =========================================
const birthdayLetter = `Hoy quería hacer algo diferente para recordarte lo especial que eres para mí dianitaaa, ademas porque soy de sistemas pense en estoo.

Queria decirte que cada momento contigo desde las pláticas largas hasta nuestras salidas a comer muy improvisadas, se ha vuelto de mis partes favoritas de la semana y sobre todo, del semestre. Admiro muchísimo tu forma de ser de vdd, tu alegría y lo linda persona que eres, Dianita, me encanta como eres muy empatica con los animales
, eso me hace mucho ver como eres tu, y me encanta, yo se que eres una persona muy especial y que vas a lograr todo lo que te propongas, porque eres muy inteligente y capaz, y sobre todo, porque eres una persona muy linda por dentro y por fuera.
Se que este año ha sido un poco dificil para nosotros, pero quiero que sepas que siempre voy a estar para apoyarte en todo lo que necesites y que siempre voy a estar para hacerte sonreir y hacerte sentir especial.
y si algun dia te sientes triste o desanimada, quiero que sepas que siempre voy a estar para escucharte y para hacerte sentir mejor.
Grabate que siempre voy a estar para ti, y que siempre voy a hacer todo lo posible para hacerte feliz.

Te quiero mucho Dianita, y espero que este nuevo año de vida que comienzas hoy, este lleno de cosas bonitas para ti y para nosotros ojala siempre me sigas eligiendome
y perdoname por tantas faltas que he tenido contigo, pero vdd que me esfuerzo por ser mejor para ti y para nosotros.
Espero que todo lo que ha pasado no te haga olvidar lo mucho que te amo y lo mucho que te valoro, y que siempre voy a estar para ti en las buenas y en las malas.



Espero que hoy la pases increíble, que te consientan mucho y que este nuevo año esté lleno de cosas bonitas para ti, y tambien para nosotros.

¡Feliz cumpleaños, Dianita! 💖 TE AMO

Att : Tu amorcito bello <3 samy`;

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