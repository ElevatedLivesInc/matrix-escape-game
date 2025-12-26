// MatrixXscape – simple playable loop

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// DOM elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const aiStatusEl = document.getElementById('aiStatus');
const gameOverModal = document.getElementById('gameOver');
const winScreenModal = document.getElementById('winScreen');
const finalScoreEl = document.getElementById('finalScore');
const winTimeEl = document.getElementById('winTime');
const aiFeedbackEl = document.getElementById('aiFeedback');
const winFeedbackEl = document.getElementById('winFeedback');
const retryBtn = document.getElementById('retry');
const playAgainBtn = document.getElementById('playAgain');

// Game state
let running = true;
let score = 0;
let lives = 3;
let startTime = Date.now();

const player = {
  x: canvas.width / 4,
  y: canvas.height / 2,
  size: 22,
  vx: 0,
  vy: 0,
  speed: 7
};

let agents = [];
let sigils = [];
let rain = [];

// Matrix rain setup
for (let i = 0; i < 140; i++) {
  rain.push({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    speed: 12 + Math.random() * 10,
    len: 6 + Math.random() * 10
  });
}

// Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// Mobile joystick (optional)
const joystick = document.querySelector('.joystick');
const joystickKnob = document.querySelector('.joystick-knob');
if (joystick && joystickKnob) {
  let active = false;
  joystick.addEventListener('touchstart', e => {
    e.preventDefault();
    active = true;
  });
  joystick.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!active) return;
    const rect = joystick.getBoundingClientRect();
    const touch = e.touches[0];
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const maxDist = rect.width / 2 - 20;
    const dist = Math.min(maxDist, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    joystickKnob.style.transform =
      `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;

    // Map to player velocity
    player.vx = Math.cos(angle) * player.speed * (dist / maxDist);
    player.vy = Math.sin(angle) * player.speed * (dist / maxDist);
  });
  joystick.addEventListener('touchend', () => {
    active = false;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    player.vx = 0;
    player.vy = 0;
  });
}

// Simple AI hint system
function aiHint(msg) {
  aiStatusEl.textContent = msg;
}

// Game over / restart
function showGameOver() {
  running = false;
  finalScoreEl.textContent = Math.floor(score / 60);
  aiFeedbackEl.textContent =
    'Your escape pattern shows 73% Matrix attachment. Escape Pass or Founders can tilt the odds.';
  gameOverModal.style.display = 'flex';
}

function showWin() {
  running = false;
  const timeSec = Math.floor((Date.now() - startTime) / 1000);
  winTimeEl.textContent = timeSec;
  winFeedbackEl.textContent = 'You punched a hole through the code. Most never get this far.';
  winScreenModal.style.display = 'flex';
}

function reset(harder = false) {
  running = true;
  score = 0;
  lives = harder ? 1 : 3;
  startTime = Date.now();
  player.x = canvas.width / 4;
  player.y = canvas.height / 2;
  player.vx = 0;
  player.vy = 0;
  agents = [];
  sigils = [];
  gameOverModal.style.display = 'none';
  winScreenModal.style.display = 'none';
  aiHint('Awake');
}

// Hook buttons
if (retryBtn) retryBtn.addEventListener('click', () => reset(false));
if (playAgainBtn) playAgainBtn.addEventListener('click', () => reset(true));

// Main loop
function loop() {
  if (!running) {
    requestAnimationFrame(loop);
    return;
  }

  // Trail
  ctx.fillStyle = 'rgba(0,0,16,0.16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Matrix rain
  ctx.font = '16px monospace';
  rain.forEach(drop => {
    ctx.fillStyle = 'rgba(0,255,65,0.7)';
    for (let i = 0; i < drop.len; i++) {
      ctx.fillText('1', drop.x, drop.y - i * 18);
    }
    drop.y += drop.speed;
    if (drop.y > canvas.height + drop.len * 18) {
      drop.y = -drop.len * 18;
      drop.x = Math.random() * canvas.width;
    }
  });

  // Score + AI hints
  score++;
  scoreEl.textContent = Math.floor(score / 60);
  livesEl.textContent = lives;

  if (score % 900 === 0) {
    aiHint('Breathe. Strafe sideways. Agents are tracking your last line.');
  }

  // Player movement (keyboard)
  if (!joystick) {
    let ax = 0, ay = 0;
    if (keys['a'] || keys['arrowleft']) ax -= 1;
    if (keys['d'] || keys['arrowright']) ax += 1;
    if (keys['w'] || keys['arrowup']) ay -= 1;
    if (keys['s'] || keys['arrowdown']) ay += 1;
    const mag = Math.hypot(ax, ay) || 1;
    player.vx = (ax / mag) * player.speed;
    player.vy = (ay / mag) * player.speed;
  }

  player.x += player.vx;
  player.y += player.vy;
  // Bounds
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

  // Draw player
  ctx.shadowColor = '#00ff41';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#00ff41';
  ctx.fillRect(
    player.x - player.size / 2,
    player.y - player.size / 2,
    player.size,
    player.size
  );
  ctx.shadowBlur = 0;

  // Spawn agents (enemies)
  if (Math.random() < 0.03 + score * 0.0000007) {
    agents.push({
      x: canvas.width + 40,
      y: Math.random() * canvas.height,
      vx: - (3 + Math.random() * 3),
      vy: (Math.random() - 0.5) * 2,
      size: 18 + Math.random() * 8
    });
  }

  // Spawn sigils (bonuses)
  if (Math.random() < 0.015 && sigils.length < 4) {
    sigils.push({
      x: canvas.width + 40,
      y: Math.random() * canvas.height,
      vx: -2.5,
      size: 14
    });
  }

  // Update agents
  for (let i = agents.length - 1; i >= 0; i--) {
    const a = agents[i];
    a.x += a.vx;
    a.y += a.vy;

    // Draw
    ctx.shadowColor = '#ff0040';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ff0040';
    ctx.fillRect(a.x - a.size / 2, a.y - a.size / 2, a.size, a.size);
    ctx.shadowBlur = 0;

    // Collision with player
    const dx = player.x - a.x;
    const dy = player.y - a.y;
    if (Math.hypot(dx, dy) < player.size + a.size / 2) {
      agents.splice(i, 1);
      lives--;
      aiHint('Hit by agent. System latency spiked.');
      if (lives <= 0) {
        showGameOver();
      }
      continue;
    }

    // Off screen
    if (a.x < -80) agents.splice(i, 1);
  }

  // Update sigils
  for (let i = sigils.length - 1; i >= 0; i--) {
    const s = sigils[i];
    s.x += s.vx;

    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    ctx.shadowBlur = 0;

    // Collision with player
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    if (Math.hypot(dx, dy) < player.size + s.size / 2) {
      score += 900; // big bonus
      sigils.splice(i, 1);
      aiHint('Sigil absorbed. Escape vector strengthened.');
      continue;
    }

    if (s.x < -80) sigils.splice(i, 1);
  }

  // Win condition: ~90s
  if (score > 5400 && running) {
    showWin();
  }

  requestAnimationFrame(loop);
}

loop();
