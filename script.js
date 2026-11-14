// =========================================
// 1. CORAZONES FLOTANTES DE FONDO
// =========================================
function createBgHeart() {
  const container = document.getElementById('floating-hearts');
  const heart = document.createElement('div');
  heart.className = 'bg-heart';
  heart.innerHTML = Math.random() > 0.3 ? '💖' : '✨';
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.fontSize = (Math.random() * 14 + 12) + 'px';
  heart.style.animationDuration = (Math.random() * 5 + 6) + 's';
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 11000);
}
setInterval(createBgHeart, 700);

// =========================================
// 2. ENTRADA AL REGALO Y CONFETI
// =========================================
function launchConfetti() {
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors: ['#ff6b9d', '#ffb8d1', '#ffd166', '#ffffff']
  });
}

function enterGift() {
  launchConfetti();
  const welcome = document.getElementById('welcome-screen');
  welcome.style.opacity = '0';
  welcome.style.transform = 'scale(1.05)';
  setTimeout(() => {
    welcome.classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
  }, 500);
}

// =========================================
// 3. NAVEGACIÓN DEL MENÚ
// =========================================
function openSection(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('sec-' + id).classList.add('active-view');
  document.getElementById('back-btn').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'ruleta') drawWheel();
  if (id === 'carta') startTypewriter();
}

function showMenu() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('menu-view').classList.add('active-view');
  document.getElementById('back-btn').classList.add('hidden');
}

// =========================================
// 4. MODAL DE SOBRES "ABRE CUANDO..."
// =========================================
function openLetterModal(title, text) {
  document.getElementById('modal-title').innerText = title;
  document.getElementById('modal-body').innerText = text;
  document.getElementById('letter-modal').classList.remove('hidden');
}

function closeLetterModal(e) {
  if (e.target.id === 'letter-modal') {
    document.getElementById('letter-modal').classList.add('hidden');
  }
}

// =========================================
// 5. RULETA DE CITAS
// =========================================
const options = [
  "Ir por cafecitoo",
  "Noche de pelisss o cine",
  "Cenar taquitosss ",
  "Ir por nievecita ",
  "Hamburguesas ",
  "Armar un picnic",
 "Ir a un parqueo o plaza",
 "Ir por Chetosss",
];
const colors = ["#ff5e94", "#9b5de5", "#f15bb5", "#ff8fab", "#7b2cbf", "#ff758c"];
let currentAngle = 0;
let isSpinning = false;

function drawWheel() {
  const canvas = document.getElementById("wheel-canvas");
  const ctx = canvas.getContext("2d");
  const arc = (2 * Math.PI) / options.length;
  ctx.clearRect(0, 0, 300, 300);

  options.forEach((opt, i) => {
    const angle = currentAngle + i * arc;
    ctx.beginPath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 145, angle, angle + arc);
    ctx.fill();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(angle + arc / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Plus Jakarta Sans, sans-serif";
    ctx.fillText(opt, 45, 5);
    ctx.restore();
  });
}

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true;
  document.getElementById('wheel-result').classList.add('hidden');

  const spinTime = 3200;
  const startAngle = currentAngle;
  const extraSpins = (Math.random() * 4 + 5) * 2 * Math.PI;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / spinTime, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    currentAngle = startAngle + extraSpins * easeOut;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      const arc = (2 * Math.PI) / options.length;
      const normalized = (1.5 * Math.PI - (currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const index = Math.floor(normalized / arc);
      const resBox = document.getElementById('wheel-result');
      resBox.innerHTML = `✨ ¡Tocó: <strong>${options[index]}</strong>! Tómale captura para hacerlo realidad.`;
      resBox.classList.remove('hidden');
      launchConfetti();
    }
  }
  requestAnimationFrame(animate);
}

// =========================================
// 6. MINIJUEGO: ATRAPA CORAZONES
// =========================================
let gameLoopId;
let score = 0;
let basketX = 130;
let hearts = [];

function startHeartGame() {
  cancelAnimationFrame(gameLoopId);
  score = 0;
  hearts = [];
  document.getElementById('game-score').innerText = score;
  document.getElementById('game-win').classList.add('hidden');

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Control táctil y mouse
  const moveBasket = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    basketX = Math.max(0, Math.min(canvas.width - 60, clientX - rect.left - 30));
  };
  canvas.ontouchmove = (e) => { e.preventDefault(); moveBasket(e.touches[0].clientX); };
  canvas.onmousemove = (e) => moveBasket(e.clientX);

  let frame = 0;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    if (frame % 32 === 0) {
      hearts.push({ x: Math.random() * (canvas.width - 24), y: -20, speed: 2.5 + Math.random() * 2 });
    }

    // Dibujar canasta
    ctx.fillStyle = "#ff6b9d";
    ctx.beginPath();
    ctx.roundRect(basketX, canvas.height - 35, 60, 18, 9);
    ctx.fill();

    // Dibujar corazones
    ctx.font = "22px serif";
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.y += h.speed;
      ctx.fillText("💖", h.x, h.y);

      if (h.y > canvas.height - 45 && h.x > basketX - 15 && h.x < basketX + 55) {
        hearts.splice(i, 1);
        score++;
        document.getElementById('game-score').innerText = score;
        if (score >= 15) {
          document.getElementById('game-win').classList.remove('hidden');
          launchConfetti();
          return;
        }
      } else if (h.y > canvas.height + 20) {
        hearts.splice(i, 1);
      }
    }
    gameLoopId = requestAnimationFrame(update);
  }
  update();
}

// =========================================
// 7. CARTA FINAL CON EFECTO MÁQUINA DE ESCRIBIR
// =========================================
const birthdayLetter = `Hoy quería hacer algo diferente para recordarte lo especial que eres para mí dianitaaa ademas porque soy de sistemas jsjs.

Queria decirte que cada momento contigo —desde las pláticas largas hasta nuestras salidas a comer muy improvisadas— se ha vuelto de mis partes favoritas de la semana y sobre todo, del semestre. Admiro muchísimo tu forma de ser, tu alegría y lo linda persona que eres, Dianita.

Espero que hoy la pases increíble, que te consientan mucho y que este nuevo año esté lleno de cosas bonitas para ti, tambien para nosotros.

¡Feliz cumpleaños, Dianita! 💖`;

let typedStarted = false;
function startTypewriter() {
  if (typedStarted) return;
  typedStarted = true;
  const target = document.getElementById('typewriter-text');
  let i = 0;
  function type() {
    if (i < birthdayLetter.length) {
      target.innerHTML += birthdayLetter.charAt(i);
      i++;
      setTimeout(type, 28);
    }
  }
  type();
}