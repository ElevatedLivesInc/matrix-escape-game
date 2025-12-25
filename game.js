class MatrixXscapeGame {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    // Game State
    this.gameRunning = true;
    this.score = 0;
    this.lives = 3;
    this.startTime = Date.now();
    this.player = { x: 100, y: 100, vx: 0, vy: 0, speed: 8, size: 20 };
    this.agents = [];
    this.sigils = [];
    this.rain = [];
    this.highScore = localStorage.getItem('matrixHighScore') || 0;
    
    // AI Agent
    this.aiActive = false;
    this.aiHints = ['Breathe. Move left. Agent at 3 o\'clock.', 'Sigil incoming - northeast.', 'Faster strafe pattern needed.', 'You\'re 73% awake. Keep moving.'];
    
    this.initRain();
    this.setupControls();
    this.stripe = Stripe('pk_live_YOUR_STRIPE_KEY_HERE'); // REPLACE
    this.setupEventListeners();
    this.gameLoop();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  initRain() {
    for(let i = 0; i < 150; i++) {
      this.rain.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * -500,
        speed: 12 + Math.random() * 8,
        len: 8 + Math.random() * 12,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
  }
  
  setupControls() {
    this.keys = {};
    window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
    
    // Mobile joystick
    this.joystick = document.querySelector('.joystick');
    this.joystickKnob = document.querySelector('.joystick-knob');
    let joystickActive = false, joystickCenter = {x: 50, y: 50};
    
    this.joystick.addEventListener('touchstart', e => {
      e.preventDefault();
      joystickActive = true;
    });
    
    this.joystick.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!joystickActive) return;
      
      const rect = this.joystick.getBoundingClientRect();
      const touch = e.touches[0];
      const dx = (touch.clientX - rect.left - joystickCenter.x) / 2;
      const dy = (touch.clientY - rect.top - joystickCenter.y) / 2;
      const dist = Math.min(25, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      
      this.joystickKnob.style.transform = `translate(${Math.cos(angle) * dist - 20}px, ${Math.sin(angle) * dist - 20}px)`;
      this.player.vx = Math.cos(angle) * this.player.speed * (dist / 25);
      this.player.vy = Math.sin(angle) * this.player.speed * (dist / 25);
    });
    
    this.joystick.addEventListener('touchend', () => {
      joystickActive = false;
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
      this.player.vx = 0;
      this.player.vy = 0;
    });
  }
  
  setupEventListeners() {
    // Stripe
    document.getElementById('escapePass').onclick = () => {
      this.stripe.redirectToCheckout({
        sessionId: 'cs_live_ESCAPE_PASS_ID_HERE' // REPLACE WITH STRIPE
      });
    };
    
    document.getElementById('foundersPass').onclick = () => {
      this.stripe.redirectToCheckout({
        sessionId: 'cs_live_FOUNDERS_ID_HERE' // REPLACE WITH STRIPE
      });
    };
    
    document.getElementById('bookCoach').onclick = () => {
      window.open('YOUR_GO_HIGH_LEVEL_CALENDAR_URL', '_blank'); // REPLACE
    };
    
    document.getElementById('retry').onclick = () => this.restart();
    document.getElementById('playAgain').onclick = () => this.restart(true);
    
    window.addEventListener('resize', () => this.resize());
  }
  
  update() {
    if (!this.gameRunning) return;
    
    this.score += 1;
    document.getElementById('score').textContent = Math.floor(this.score / 60);
    document.getElementById('lives').textContent = this.lives;
    
    // Player movement (keyboard)
    this.player.vx *= 0.85; // Friction
    this.player.vy *= 0.85;
    
    if (this.keys['a'] || this.keys['arrowleft']) this.player.vx -= this.player.speed;
    if (this.keys['d'] || this.keys['arrowright']) this.player.vx += this.player.speed;
    if (this.keys['w'] || this.keys['arrowup']) this.player.vy -= this.player.speed;
    if (this.keys['s'] || this.keys['arrowdown']) this.player.vy += this.player.speed;
    
    // Update position
    this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x + this.player.vx));
    this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y + this.player.vy));
    
    // Spawn enemies
    if (Math.random() < 0.04 + this.score * 0.000001) {
      this.agents.push({
        x: this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: -4 - Math.random() * 3,
        vy: (Math.random() - 0.5) * 2,
        size: 16 + Math.random() * 8
      });
    }
    
    // Spawn sigils
    if (Math.random() < 0.02 && this.sigils.length < 5) {
      this.sigils.push({
        x: this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: -3,
        size: 14
      });
    }
    
    // Update agents
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const agent = this.agents[i];
      agent.x += agent.vx;
      agent.y += agent.vy;
      agent.vy += Math.sin(this.score * 0.01 + i) * 0.1; // Wave motion
      
      // Player collision
      const dx = this.player.x - agent.x;
      const dy = this.player.y - agent.y;
      if (Math.hypot(dx, dy) < this.player.size + agent.size / 2) {
        this.lives--;
        this.agents.splice(i, 1);
        if (this.lives <= 0) this.gameOver();
      }
      
      if (agent.x < -50) this.agents.splice(i, 1);
    }
    
    // Update sigils
    for (let i = this.sigils.length - 1; i >= 0; i--) {
      const sigil = this.sigils[i];
      sigil.x += sigil.vx;
      
      // Player collection
      const dx = this.player.x - sigil.x;
      const dy = this.player.y - sigil.y;
      if (Math.hypot(dx, dy) < this.player.size + sigil.size / 2) {
        this.score += 1000;
        this.sigils.splice(i, 1);
        this.aiHint('Sigil collected! +1000 points');
      }
      
      if (sigil.x < -50) this.sigils.splice(i, 1);
    }
    
    // AI Hints
    if (this.score % 1200 === 0) this.aiHint();
    
    // Win condition
    if (this.score > 6000) this.victory();
  }
  
  render() {
    // Trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 20, 0.12)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Matrix rain
    this.ctx.font = 'bold 16px monospace';
    this.rain.forEach(drop => {
      this.ctx.fillStyle = `rgba(0, 255, 65, ${drop.opacity})`;
      for (let i = 0; i < drop.len; i++) {
        this.ctx.fillText('1', drop.x, drop.y - i * 18);
      }
      drop.y += drop.speed;
      if (drop.y > this.canvas.height + 100) {
        drop.y = -drop.len * 18;
        drop.x = Math.random() * this.canvas.width;
      }
    });
    
    // Player (neon green)
    this.ctx.shadowColor = '#00ff41';
    this.ctx.shadowBlur = 30;
    this.ctx.fillStyle = '#00ff41';
    this.ctx.fillRect(this.player.x - this.player.size/2, this.player.y - this.player.size/2, this.player.size, this.player.size);
    this.ctx.shadowBlur = 0;
    
    // Agents (red)
    this.agents.forEach(agent => {
      this.ctx.shadowColor = '#ff0040';
      this.ctx.shadowBlur = 25;
      this.ctx.fillStyle = '#ff0040';
      this.ctx.fillRect(agent.x - agent.size/2, agent.y - agent.size/2, agent.size, agent.size);
      this.ctx.shadowBlur = 0;
    });
    
    // Sigils (gold)
    this.sigils.forEach(sigil => {
      this.ctx.shadowColor = '#ffaa00';
      this.ctx.shadowBlur = 35;
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.fillRect(sigil.x - sigil.size/2, sigil.y - sigil.size/2, sigil.size, sigil.size);
      this.ctx.shadowBlur = 0;
    });
  }
  
  aiHint(message = null) {
    if (!message) {
      const hints = [
        'Agent cluster at 2 o\'clock - strafe left!',
        'Sigil spawning northeast - collect it!',
        'Your pattern shows 68% Matrix attachment',
        'Breathe deeply. Move unpredictably.',
        'Faster lateral movement needed NOW'
      ];
      message = hints[Math.floor(Math.random() * hints.length)];
    }
    document.getElementById('aiStatus').textContent = message;
  }
  
  gameOver() {
    this.gameRunning = false;
    document.getElementById('finalScore').textContent = Math.floor(this.score / 60);
    this.aiHint('Escape failed. 73% Matrix attachment detected.');
    document.getElementById('gameOver').style.display = 'flex';
    
    if (this.score / 60 > this.highScore) {
      this.highScore = Math.floor(this.score / 60);
      localStorage.setItem('matrixHighScore', this.highScore);
    }
  }
  
  victory() {
    this.gameRunning = false;
    document.getElementById('winTime').textContent = Math.floor((Date.now() - this.startTime) / 1000);
    document.getElementById('winFeedback').textContent = 'You are 94% awakened. Reality bending detected.';
    document.getElementById('winScreen').style.display = 'flex';
  }
  
  restart(harder = false) {
    this.gameRunning = true;
    this.score = 0;
    this.lives = harder ? 1 : 3;
    this.player.x = 100;
    this.player.y = 100;
    this.agents = [];
    this.sigils = [];
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('winScreen').style.display = 'none';
  }
  
  gameLoop() {
    if (this.gameRunning) {
      this.update();
      this.render();
    }
    requestAnimationFrame(() => this.gameLoop());
  }
}

// START GAME
window.addEventListener('load', () => new MatrixXscapeGame());

// SOCIAL SHARE
function shareScore() {
  const time = Math.floor((Date.now() - game.startTime) / 1000);
  const text = `I ESCAPED THE MATRIX in ${time}s! Beat me: [YOUR_GAME_URL] 🕹️🚀`;
  if (navigator.share) {
    navigator.share({ title: 'MatrixXscape', text });
  } else {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`);
  }
}
