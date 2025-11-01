const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Responsive resize logic
function resizeGameCanvas() {
  const minW = 400, minH = 240;
  let w = window.innerWidth, h = window.innerHeight;
  w = Math.max(w, minW);
  h = Math.max(h, minH);
  // Maintain aspect ratio (16:10 preferred)
  let aspect = 16/10;
  if (w/h > aspect) w = h * aspect;
  else h = w / aspect;
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  if (window.world) {
    world.w = w;
    world.h = h;
  }
}
window.addEventListener('resize', () => {
  resizeGameCanvas();
  if (window.world) {
    world.w = getCanvasWidth();
    world.h = getCanvasHeight();
    // Optionally, clamp player and entities to new bounds
    if (world.player) {
      world.player.x = clamp(world.player.x, 2, world.w - world.player.w - 2);
      world.player.y = clamp(world.player.y, 2, world.h - world.player.h - 2);
    }
    for (const e of world.entities) {
      if (e !== world.player) {
        e.x = clamp(e.x, 0, world.w - e.w);
        e.y = clamp(e.y, 0, world.h - e.h);
      }
    }
  }
});
window.addEventListener('orientationchange', () => {
  resizeGameCanvas();
  if (window.world) {
    world.w = getCanvasWidth();
    world.h = getCanvasHeight();
    if (world.player) {
      world.player.x = clamp(world.player.x, 2, world.w - world.player.w - 2);
      world.player.y = clamp(world.player.y, 2, world.h - world.player.h - 2);
    }
    for (const e of world.entities) {
      if (e !== world.player) {
        e.x = clamp(e.x, 0, world.w - e.w);
        e.y = clamp(e.y, 0, world.h - e.h);
      }
    }
  }
});
window.addEventListener('load', resizeGameCanvas);


const UI = {
  score: document.getElementById('score'),
  lives: document.getElementById('lives'),
  level: document.getElementById('level'),
  modeHint: document.getElementById('mode-hint'),
  btnStart: document.getElementById('btn-start'),
  btnPause: document.getElementById('btn-pause'),
  vol: document.getElementById('vol'),
};

// Always use live canvas size for world dimensions
function getCanvasWidth() { return canvas.width; }
function getCanvasHeight() { return canvas.height; }

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max+1)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax-bx, ay-by); }
function now() { return performance.now(); }
function lerp(a, b, t) { return a + (b - a) * t; }

const Input = {
  keys: new Set(),
  mouse: { x:0, y:0, down:false },
};
window.addEventListener('keydown', e => { Input.keys.add(e.key); });
window.addEventListener('keyup', e => { Input.keys.delete(e.key); });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  Input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  Input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) { // left click for shooting
    Input.mouse.down = true;
  } else if (e.button === 2) { // right click for mode change
    e.preventDefault();
    const idx = Player.shootModes.indexOf(world.player.shootMode);
    world.player.shootMode = Player.shootModes[(idx + 1) % Player.shootModes.length];
    updateShootModeHUD();
  } else if (e.button === 1) { // middle click for ultimate
    e.preventDefault();
    if (world.player.score >= 20) {
      const numBullets = 200;
      const centerX = world.player.x + world.player.w/2;
      const centerY = world.player.y + world.player.h/2;
      for (let i = 0; i < numBullets; i++) {
        const angle = (i / numBullets) * Math.PI * 2;
        const bx = centerX + Math.cos(angle) * (world.player.w/2 + 6);
        const by = centerY + Math.sin(angle) * (world.player.h/2 + 6);
        const b = new Bullet(bx, by, Math.cos(angle) * CONFIG.bulletSpeed, Math.sin(angle) * CONFIG.bulletSpeed, 'player');
        world.spawn(b);
      }
      world.player.score -= 20;
      AudioEngine.beep(1400, 0.12);
      updateShootModeHUD();
    }
  }
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0) {
    Input.mouse.down = false;
  }
});

const AudioEngine = {
  volume: 0.5,
  beep(freq=440, dur=0.06) {
    try {
      if(!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      g.gain.value = this.volume * 0.06;
      o.connect(g); g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch(e) {}
  }
};
UI.vol.addEventListener('input', e => { AudioEngine.volume = parseFloat(e.target.value); });

const CONFIG = {
  playerSpeed: 280,
  bulletSpeed: 620,
  enemySpeed: 110,
  spawnMargin: 36,
  tileSize: 32,
  maxParticles: 600,
  DEBUG: false,
};

class Entity {
  constructor(x=0,y=0,w=16,h=16) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.tags = new Set();
  }
  update(dt) {}
  draw(ctx) {}
  intersects(other) {
    return !(this.x+this.w < other.x || this.x > other.x+other.w || this.y+this.h < other.y || this.y > other.y+other.h);
  }
}

class Player extends Entity {

  static shootModes = ['rapid', 'blast', 'barrage'];

   constructor(x,y) {
     super(x,y,28,28);
     this.speed = CONFIG.playerSpeed;
     this.color = '#7ef2b8';
     this.shootCooldown = 0;
     this.lives = 10;
     this.score = 30;
     this.invuln = 0;
     this.shootMode = 'rapid';
     this.blastCooldown = 3;
     this.lastAngle = 0;
     this.currentAngle = 0;
     this.shootDirX = 0;
     this.shootDirY = 0;

   }
  update(dt, world) {
    // movement
    let ax = 0, ay = 0;
    let useTouch = typeof Joystick !== 'undefined' && isTouchDevice && Joystick.left;
    if (useTouch && (Joystick.left.active || Math.hypot(Joystick.left.value.x, Joystick.left.value.y) > 0.1)) {
      ax = Joystick.left.value.x;
      ay = Joystick.left.value.y;
    } else {
      if (Input.keys.has('w')) ay -= 1;
      if (Input.keys.has('s')) ay += 1;
      if (Input.keys.has('a')) ax -= 1;
      if (Input.keys.has('d')) ax += 1;
    }
    // normalize
    const len = Math.hypot(ax, ay) || 1;
    this.vx = (ax/len) * this.speed;
    this.vy = (ay/len) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // clamp to world bounds
    this.x = clamp(this.x, 2, world.w - this.w - 2);
    this.y = clamp(this.y, 2, world.h - this.h - 2);
     // shooting with arrow keys or right joystick
     this.shootCooldown -= dt;
     // Diagonal shooting support
     let shootDir = {x: 0, y: 0};
     if (useTouch && (Joystick.right.active || Math.hypot(Joystick.right.value.x, Joystick.right.value.y) > 0.1)) {
       shootDir.x = Joystick.right.value.x;
       shootDir.y = Joystick.right.value.y;
       // For touch, update shootDir directly
       this.shootDirX = shootDir.x;
       this.shootDirY = shootDir.y;
     } else {
       // For keyboard, smooth the direction
       let targetX = 0, targetY = 0;
       if (Input.keys.has('ArrowUp')) targetY -= 1;
       if (Input.keys.has('ArrowDown')) targetY += 1;
       if (Input.keys.has('ArrowLeft')) targetX -= 1;
       if (Input.keys.has('ArrowRight')) targetX += 1;
       if (targetX !== 0 || targetY !== 0) {
         const len = Math.hypot(targetX, targetY);
         targetX /= len;
         targetY /= len;
         this.shootDirX = lerp(this.shootDirX, targetX, 0.3);
         this.shootDirY = lerp(this.shootDirY, targetY, 0.3);
       }
       shootDir.x = this.shootDirX;
       shootDir.y = this.shootDirY;
     }
     // Mouse shooting
     if (Input.mouse.down) {
       const dx = Input.mouse.x - (this.x + this.w/2);
       const dy = Input.mouse.y - (this.y + this.h/2);
       const dist = Math.hypot(dx, dy);
       if (dist > 0) {
         shootDir.x = dx / dist;
         shootDir.y = dy / dist;
       }
     }
     // Only shoot if a direction is pressed
     if ((shootDir.x !== 0 || shootDir.y !== 0) && this.shootCooldown <= 0) {
      // Normalize
      const len = Math.hypot(shootDir.x, shootDir.y) || 1;
      shootDir.x /= len;
      shootDir.y /= len;
switch (this.shootMode) {
  case 'rapid':
    if (this.score >= 2 || this.timeAttackActive) {
      const angle = Math.atan2(shootDir.y, shootDir.x);
      const bx = this.x + this.w/2 + Math.cos(angle) * (this.w/2 + 6);
      const by = this.y + this.h/2 + Math.sin(angle) * (this.h/2 + 6);
      const b = new Bullet(bx, by, Math.cos(angle) * CONFIG.bulletSpeed, Math.sin(angle) * CONFIG.bulletSpeed, 'player');
      world.spawn(b);
      this.shootCooldown = 0.12;
      if (!this.timeAttackActive) this.score -= 2;
      AudioEngine.beep(900, 0.03);
    }
    break;
  case 'blast':
    if (this.score >= 6 || this.timeAttackActive) {
      const angle = Math.atan2(shootDir.y, shootDir.x);
      for (let i = -1; i <= 1; i++) {
        const spread = angle + i * 0.18; // wider spread for 3 bullets
        const bx = this.x + this.w/2 + Math.cos(spread) * (this.w/2 + 6);
        const by = this.y + this.h/2 + Math.sin(spread) * (this.h/2 + 6);
        const b = new Bullet(bx, by, Math.cos(spread) * CONFIG.bulletSpeed, Math.sin(spread) * CONFIG.bulletSpeed, 'player');
        world.spawn(b);
      }
      this.shootCooldown = 0.48;
      if (!this.timeAttackActive) this.score -= 6;
      AudioEngine.beep(700, 0.06);
    }
    break;
  case 'barrage':
    if (this.score >= 1 || this.timeAttackActive) {
      const angle = Math.atan2(shootDir.y, shootDir.x);
      const spread = angle + (Math.random() - 0.5) * 0.4; // single bullet, random accuracy
      const bx = this.x + this.w/2 + Math.cos(spread) * (this.w/2 + 6);
      const by = this.y + this.h/2 + Math.sin(spread) * (this.h/2 + 6);
      const b = new Bullet(bx, by, Math.cos(spread) * CONFIG.bulletSpeed, Math.sin(spread) * CONFIG.bulletSpeed, 'player');
      world.spawn(b);
      this.shootCooldown = 0.06;
      if (!this.timeAttackActive) this.score -= 1;
      AudioEngine.beep(1000, 0.02);
    }
    break;
}
    }
    // Remove mouse-based shooting
    // if (Input.mouse.down && this.shootCooldown <= 0) { ... }
    if (this.invuln > 0) this.invuln -= dt;
  }
   // Mesh for player: kite/diamond shape (relative to center)
   // Edit these points to change the player shape
   // Mesh for player: sharp kite/diamond shape (edit points to change shape)
   static mesh = [
     [0, -18],   // sharp front (top)
     [11, 4],    // right
     [0, 12],    // back (bottom)
     [-11, 4],   // left
   ];
   draw(ctx) {
     ctx.save();
     ctx.translate(this.x + this.w/2, this.y + this.h/2);
      // Calculate movement angle for rotation
      let targetAngle = this.lastAngle;
      if (this.vx !== 0 || this.vy !== 0) {
        targetAngle = Math.atan2(this.vy, this.vx) + Math.PI/2; // +90deg so front points up
        this.lastAngle = targetAngle;
      }
      // Normalize angles to [-pi, pi] for smooth interpolation
      targetAngle = ((targetAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
      this.currentAngle = ((this.currentAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
      // Compute shortest angle difference
      let diff = targetAngle - this.currentAngle;
      diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
      this.currentAngle += diff * 0.3;
      ctx.rotate(this.currentAngle);
     // pulsate when invulnerable
     const pulse = (this.invuln > 0) ? 1 + Math.sin(now()/60)/6 : 1;
     ctx.scale(pulse, pulse);
     ctx.fillStyle = this.color;
     // Draw mesh shape
     ctx.beginPath();
     const mesh = Player.mesh;
     ctx.moveTo(mesh[0][0], mesh[0][1]);
     for (let i = 1; i < mesh.length; i++) {
       ctx.lineTo(mesh[i][0], mesh[i][1]);
     }
     ctx.closePath();
     ctx.fill();
     ctx.restore();
     if (CONFIG.DEBUG) {
       ctx.fillStyle = 'rgba(255,255,255,0.1)';
       ctx.fillRect(this.x-1, this.y-1, this.w+2, this.h+2);
     }
   }
}

class Bullet extends Entity {
  constructor(x,y,vx,vy,owner='enemy') {
    super(x-6,y-6,12,12);
    this.vx = vx; this.vy = vy;
    this.owner = owner;
    this.life = 2.2;
    this.color = owner === 'player' ? '#ffd95a' : '#ff6b6b';
    this.tags.add('bullet');
  }
  update(dt, world) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    // if out of bounds -> die
    if (this.x < -50 || this.x > world.w + 50 || this.y < -50 || this.y > world.h + 50) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2, 0, Math.PI*2);
    ctx.fill();
  }
}

class Enemy extends Entity {
   constructor(x,y,type='basic') {
     super(x,y,26,26);
     this.type = type;
     this.color = (type==='charger')? '#ff9f43' : '#ff6b6b';
     this.speed = CONFIG.enemySpeed * (type==='charger'?1.4:1);
     this.health = 5;
     this.fireCooldown = rand(0.5, 1.6);
     this.patrolAngle = rand(0, Math.PI*2);
     this.tags.add('enemy');
     this.target = null;
     this.spinAngle = rand(0, Math.PI*2); // for spinning effect
   }
   update(dt, world) {
     const player = world.player;
     if(!player) return;
     // Simple AI: if near, move towards player; else patrol
     const dx = (player.x + player.w/2) - (this.x + this.w/2);
     const dy = (player.y + player.h/2) - (this.y + this.h/2);
     const d = Math.hypot(dx, dy);
     if (d < 300) {
       // pursue
       this.vx = (dx/d) * this.speed;
       this.vy = (dy/d) * this.speed;
       // shoot occasionally if in range
       if (d < 420) {
         this.fireCooldown -= dt;
         if (this.fireCooldown <= 0) {
           const angle = Math.atan2(dy, dx);
           const bx = this.x + this.w/2 + Math.cos(angle) * (this.w/2 + 6);
           const by = this.y + this.h/2 + Math.sin(angle) * (this.h/2 + 6);
           const b = new Bullet(bx, by, Math.cos(angle) * (CONFIG.bulletSpeed*0.72), Math.sin(angle) * (CONFIG.bulletSpeed*0.72), 'enemy');
           world.spawn(b);
           this.fireCooldown = rand(0.6, 1.6);
         }
       }
     } else {
       // patrol
       this.patrolAngle += dt * 0.8;
       this.vx = Math.cos(this.patrolAngle) * (this.speed * 0.6);
       this.vy = Math.sin(this.patrolAngle) * (this.speed * 0.6);
     }
     // apply movement
     this.x += this.vx * dt;
     this.y += this.vy * dt;
     // spin the enemy
     this.spinAngle += dt * 2.2; // adjust speed as desired
     // keep within bounds
     if (this.x < 8) this.x = 8;
     if (this.y < 8) this.y = 8;
     if (this.x > world.w - this.w - 8) this.x = world.w - this.w - 8;
     if (this.y > world.h - this.h - 8) this.y = world.h - this.h - 8;
   }
   // Meshes for enemies:
   // Hexagon (basic/red), Pentagon (charger/orange)
   static meshes = {
     basic: [ // Hexagon
       [0, -13],
       [11, -6],
       [11, 6],
       [0, 13],
       [-11, 6],
       [-11, -6],
     ],
     charger: [ // Pentagon
       [0, -13],
       [12, -4],
       [7, 12],
       [-7, 12],
       [-12, -4],
     ],
     tank: [ // Square (default fallback)
       [-12, -12],
       [12, -12],
       [12, 12],
       [-12, 12],
     ],
   };
   draw(ctx) {
     ctx.save();
     ctx.translate(this.x + this.w/2, this.y + this.h/2);
     ctx.rotate(this.spinAngle || 0); // spin the mesh
     const scale = 1 + Math.sin(now()/150 + (this.x+this.y)/50)*0.03;
     ctx.scale(scale, scale);
     ctx.fillStyle = this.color;
     // Choose mesh by type
     const mesh = Enemy.meshes[this.type] || Enemy.meshes.tank;
     ctx.beginPath();
     ctx.moveTo(mesh[0][0], mesh[0][1]);
     for (let i = 1; i < mesh.length; i++) {
       ctx.lineTo(mesh[i][0], mesh[i][1]);
     }
     ctx.closePath();
     ctx.fill();
     ctx.restore();
     if (CONFIG.DEBUG) {
       ctx.strokeStyle = 'rgba(255,255,255,0.06)';
       ctx.strokeRect(this.x, this.y, this.w, this.h);
     }
   }
}

class Pickup extends Entity {
  constructor(x,y) {
    super(x,y,18,18);
    this.color = '#66d9ff';
    this.tags.add('pickup');
    this.angle = rand(0,Math.PI*2);
    this.ttl = 30;
  }
  update(dt) {
    this.angle += dt * 3.2;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0,0,this.w/2, this.h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

class Particle extends Entity {
  constructor(x,y,vx,vy,life=0.6,color='#fff',size=4) {
    super(x-size/2,y-size/2,size,size);
    this.vx = vx; this.vy = vy;
    this.life = life;
    this.color = color;
    this.age = 0;
  }
  update(dt) {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.age >= this.life) this.dead = true;
  }
  draw(ctx) {
    const t = clamp(1 - (this.age / this.life), 0, 1);
    ctx.globalAlpha = t;
    roundRect(ctx, this.x, this.y, this.w, this.h, 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class World {
  constructor(w,h) {
    this.w = w; this.h = h;
    this.entities = [];
    this.toSpawn = [];
    this.player = null;
    this.level = 1;
    this.time = 0;
    this.paused = false;
    this.spawnTimer = 0;
    this.particles = [];
    this.maxEnemies = 6;
  }
  spawn(e) { this.toSpawn.push(e); }
  init() {
    // clear and spawn player
    this.entities = [];
    this.player = new Player(this.w/2 - 14, this.h/2 - 14);
    this.entities.push(this.player);
    // spawn initial pickups and enemies
    for (let i=0;i<4;i++) this.spawnRandomPickup();
    for (let i=0;i<Math.min(3, this.level+1); i++) this.spawnRandomEnemy();
    this.time = 0;
    this.spawnTimer = 0;
    this.maxEnemies = 4 + Math.floor(this.level * 1.2);
  }
  spawnRandomEnemy() {
    const edge = randInt(0,3);
    let x,y;
    if (edge===0) { x = rand(20, this.w-20); y = -40; }
    if (edge===1) { x = rand(20, this.w-20); y = this.h+40; }
    if (edge===2) { x = -40; y = rand(20, this.h-20); }
    if (edge===3) { x = this.w+40; y = rand(20, this.h-20); }
    const types = ['basic','charger','tank'];
    const t = types[randInt(0, types.length-1)];
    const e = new Enemy(x,y,t);
    this.spawn(e);
  }
  spawnRandomPickup() {
    const x = rand(64, this.w-64);
    const y = rand(64, this.h-64);
    const p = new Pickup(x,y);
    this.spawn(p);
  }
  spawnParticles(x,y,count=12,color='#fff') {
    for (let i=0;i<count;i++) {
      const ang = rand(0, Math.PI*2);
      const sp = rand(40, 260);
      const vx = Math.cos(ang) * sp;
      const vy = Math.sin(ang) * sp;
      const pt = new Particle(x, y, vx, vy, rand(0.3,1.0), color, randInt(2,8));
      this.particles.push(pt);
    }
    // trim
    if (this.particles.length > CONFIG.maxParticles) {
      this.particles.splice(0, this.particles.length - CONFIG.maxParticles);
    }
  }
  update(dt) {
    if (this.paused) return;
    this.time += dt;
    // spawn queued entities
    if (this.toSpawn.length) {
      for (const e of this.toSpawn) this.entities.push(e);
      this.toSpawn.length = 0;
    }
    // dynamic spawning of enemies and pickups
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      // spawn enemy if fewer than max
      const enemyCount = this.entities.filter(e => e.tags.has('enemy')).length;
      if (enemyCount < this.maxEnemies) {
        this.spawnRandomEnemy();
      }
      // occasionally spawn pickups
      if (Math.random() < 0.4) this.spawnRandomPickup();
      this.spawnTimer = rand(1.0, 2.0);
    }
    // update entities
    for (const e of this.entities) {
      if (!e.dead) {
        e.update(dt, this);
      }
    }
    // update particles
    for (const p of this.particles) {
      if (!p.dead) p.update(dt);
    }
    // collisions:
    this.checkCollisions();
    // sweep dead
    this.entities = this.entities.filter(e => !e.dead);
    this.particles = this.particles.filter(p => !p.dead);
    // level progression
    if (this.player.score >= 40 + (this.level*30)) {
      this.levelUp();
    }
  }
  levelUp() {
    this.level += 1;
    this.player.score = 0;
    this.maxEnemies += 2;
    this.spawnTimer = 0.25;
    // reward pickups
    for (let i=0;i<4;i++) this.spawnRandomPickup();
    AudioEngine.beep(1400, 0.08);
  }
  checkCollisions() {
    const ents = this.entities;
    const len = ents.length;
    for (let i=0;i<len;i++) {
      const a = ents[i];
      if (a.dead) continue;
      // bullets vs others
      if (a.tags.has('bullet')) {
        for (let j=0;j<len;j++) {
          const b = ents[j];
          if (b === a || b.dead) continue;
          // bullet owned by player hits enemy
          if (a.owner === 'player' && b.tags.has('enemy') && a.intersects(b)) {
            b.health -= 1;
            a.dead = true;
            this.spawnParticles(a.x + a.w/2, a.y + a.h/2, 8, '#ffd95a');
if (b.health <= 0) {
              b.dead = true;
              this.player.score += 12;
              this.spawnParticles(b.x + b.w/2, b.y + b.h/2, 18, '#ff6b6b');
              // possible pickup drop
              if (Math.random() < 0.3) this.spawnRandomPickup();
            }
          }
          // bullet owned by enemy hits player
          if (a.owner === 'enemy' && b === this.player && a.intersects(b)) {
            a.dead = true;
            if (this.player.invuln <= 0) {
              this.player.lives -= 1;
              this.player.invuln = 1.4;
              this.spawnParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 20, '#66d9ff');
              AudioEngine.beep(220, 0.08);
              if (this.player.lives <= 0) {
                this.player.dead = true;
                this.onPlayerDeath();
              }
            }
          }
        }
      }
      // player vs pickups
      if (a === this.player) {
        for (let j=0;j<len;j++) {
          const b = ents[j];
          if (b === a || b.dead) continue;
          if (b.tags.has('pickup') && a.intersects(b)) {
            b.dead = true;
            this.player.score += 4;
            this.player.lives = clamp(this.player.lives + 0, 0, 5); // pickups give score but not direct life
            this.spawnParticles(b.x + b.w/2, b.y + b.h/2, 14, '#66d9ff');
            AudioEngine.beep(1200, 0.06);
          }
          // player touches enemy
          if (b.tags.has('enemy') && a.intersects(b)) {
            if (this.player.invuln <= 0) {
              this.player.lives -= 1;
              this.player.invuln = 1.2;
              this.spawnParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 24, '#ff9f43');
              if (this.player.lives <= 0) {
                this.player.dead = true;
                this.onPlayerDeath();
              }
            }
          }
        }
      }
    }
  }
  onPlayerDeath() {
    // simple game over: pause and show restart hint
    this.paused = true;
    // spawn explosion
    this.spawnParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, 80, '#ff7b7b');
    UI.btnStart.textContent = 'Restart';
  }
  draw(ctx) {
    // background grid
    drawGrid(ctx, this.w, this.h);
    // Entities sorted by y for simple layering
    const arr = this.entities.slice().sort((a,b) => (a.y + a.h) - (b.y + b.h));
    for (const e of arr) e.draw(ctx);
    // draw particles
    for (const p of this.particles) p.draw(ctx);
    // debug
    if (CONFIG.DEBUG) {
      ctx.fillStyle = '#fff';
      ctx.fillText(`Entities: ${this.entities.length}`, 10, 18);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGrid(ctx, w, h) {
  const ts = CONFIG.tileSize;
  ctx.fillStyle = '#07212a';
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x=0;x<w;x+=ts) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
  }
  for (let y=0;y<h;y+=ts) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
}

const world = new World(getCanvasWidth(), getCanvasHeight());
let lastT = now();
let accumulator = 0;

function gameTick() {
  const t = now();
  let dt = (t - lastT) / 1000;
  lastT = t;
  dt = clamp(dt, 0, 0.05);
  if (!world.paused) {
    world.update(dt);
  }
  // render
ctx.clearRect(0,0,getCanvasWidth(),getCanvasHeight());
   world.draw(ctx);
    // UI sync
    UI.score.textContent = `Score: ${Math.floor(world.player?.score || 0)}`;
    UI.lives.textContent = `Lives: ${world.player?.lives ?? 0}`;
    UI.level.textContent = `Level: ${world.level}`;
    if (isTouchDevice()) {
      document.getElementById('touch-score').textContent = `Score: ${Math.floor(world.player?.score || 0)}`;
      document.getElementById('touch-lives').textContent = `Lives: ${world.player?.lives ?? 0}`;
      document.getElementById('touch-level').textContent = `Level: ${world.level}`;
    }
   updateShootModeHUD();
   requestAnimationFrame(gameTick);
}

UI.btnStart.addEventListener('click', () => {
  world.init();
  world.paused = false;
  UI.btnStart.textContent = 'Restart';
});
UI.btnPause.addEventListener('click', () => {
  world.paused = !world.paused;
  UI.btnPause.textContent = world.paused ? 'Unpause' : 'Pause';
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// auto-start on load
function updateShootModeHUD() {
  let mode = world.player?.shootMode || 'rapid';
  let capitalized = mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
  if (UI.btnMode) UI.btnMode.textContent = capitalized;
  if (UI.modeHint) UI.modeHint.textContent = `Mode: ${capitalized} | Press "Tab" to Change`;
}

window.addEventListener('load', () => {
    world.w = getCanvasWidth();
    world.h = getCanvasHeight();
    world.init();
    lastT = now();
    UI.shootMode = document.getElementById('shoot-mode');
    UI.btnMode = document.getElementById('btn-mode');
    if (isTouchDevice()) {
      document.getElementById('hud').style.display = 'none';
    }
    requestAnimationFrame(gameTick);
    updateShootModeHUD();
 });

window.addEventListener('keydown', e => {
  // Ultimate circular burst
  if ((e.key === 'q' || e.key === 'Q') && world.player.score >= 20) {
    const numBullets = 200;
    const centerX = world.player.x + world.player.w/2;
    const centerY = world.player.y + world.player.h/2;
    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2;
      const bx = centerX + Math.cos(angle) * (world.player.w/2 + 6);
      const by = centerY + Math.sin(angle) * (world.player.h/2 + 6);
      const b = new Bullet(bx, by, Math.cos(angle) * CONFIG.bulletSpeed, Math.sin(angle) * CONFIG.bulletSpeed, 'player');
      world.spawn(b);
    }
    world.player.score -= 20;
    AudioEngine.beep(1400, 0.12);
    updateShootModeHUD();
    return;
  }
  // Shoot mode switching
  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      // Shift+Tab: previous mode
      const idx = Player.shootModes.indexOf(world.player.shootMode);
      world.player.shootMode = Player.shootModes[(idx - 1 + Player.shootModes.length) % Player.shootModes.length];
    } else {
      // Tab: next mode
      const idx = Player.shootModes.indexOf(world.player.shootMode);
      world.player.shootMode = Player.shootModes[(idx + 1) % Player.shootModes.length];
    }
    updateShootModeHUD();
    return;
  }
  if (e.key === 'F1') {
    CONFIG.DEBUG = !CONFIG.DEBUG;
  } else if (e.key === 'F2') {
    saveState();
  } else if (e.key === 'F3') {
    loadState();
  }
});



function saveState() {
  const state = {
    player: { x: world.player.x, y: world.player.y, lives: world.player.lives },
    level: world.level,
    score: world.player.score
  };
  localStorage.setItem('fryzen-save', JSON.stringify(state));
  console.log('Saved state', state);
}
function loadState() {
  const s = localStorage.getItem('fryzen-save');
  if (!s) return;
  try {
    const state = JSON.parse(s);
    world.init();
    world.player.x = state.player.x;
    world.player.y = state.player.y;
    world.player.lives = state.player.lives;
    world.level = state.level;
    world.player.score = state.score;
    console.log('Loaded state', state);
  } catch(e) {
    console.warn('Failed to load state', e);
  }
}

// --- Virtual Joystick Support ---

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const joystickLeft = document.getElementById('joystick-left');
const joystickRight = document.getElementById('joystick-right');

// Joystick state
const Joystick = {
  left: { active: false, x: 0, y: 0, dx: 0, dy: 0, value: {x:0, y:0}, touchId: null },
  right: { active: false, x: 0, y: 0, dx: 0, dy: 0, value: {x:0, y:0}, touchId: null },
  radius: 60, // px
  deadzone: 0.18, // normalized
};

function showJoysticks(show) {
  joystickLeft.style.display = show ? 'block' : 'none';
  joystickRight.style.display = show ? 'block' : 'none';
}

function setupVirtualJoysticks() {
  console.log('setupVirtualJoysticks called');
  if (joystickLeft) console.log('joystickLeft present');
  if (joystickRight) console.log('joystickRight present');
  if (!isTouchDevice()) {
    showJoysticks(false);
    return;
  }
  showJoysticks(true);
  // Position overlays
  joystickLeft.style.position = 'fixed';
  joystickLeft.style.left = '24px';
  joystickLeft.style.bottom = '24px';
  joystickLeft.style.width = joystickLeft.style.height = (Joystick.radius*2)+'px';
  joystickLeft.style.zIndex = 99;
  joystickRight.style.position = 'fixed';
  joystickRight.style.right = '24px';
  joystickRight.style.bottom = '24px';
  joystickRight.style.width = joystickRight.style.height = (Joystick.radius*2)+'px';
  joystickRight.style.zIndex = 99;

  // Multi-touch for left joystick
  joystickLeft.addEventListener('touchstart', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (!Joystick.left.active) {
        Joystick.left.active = true;
        Joystick.left.touchId = t.identifier;
        const rect = joystickLeft.getBoundingClientRect();
        Joystick.left.x = rect.left + rect.width/2;
        Joystick.left.y = rect.top + rect.height/2;
        updateJoystickTouch(t, 'left');
        drawJoystick('left');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickLeft.addEventListener('touchmove', function(e) {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (Joystick.left.active && Joystick.left.touchId === t.identifier) {
        updateJoystickTouch(t, 'left');
        drawJoystick('left');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickLeft.addEventListener('touchend', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (Joystick.left.active && Joystick.left.touchId === t.identifier) {
        Joystick.left.active = false;
        Joystick.left.touchId = null;
        Joystick.left.value = {x:0, y:0};
        drawJoystick('left');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickLeft.addEventListener('touchcancel', function(e) {
    Joystick.left.active = false;
    Joystick.left.touchId = null;
    Joystick.left.value = {x:0, y:0};
    drawJoystick('left');
    e.preventDefault();
  }, {passive:false});

  // Multi-touch for right joystick
  joystickRight.addEventListener('touchstart', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (!Joystick.right.active) {
        Joystick.right.active = true;
        Joystick.right.touchId = t.identifier;
        const rect = joystickRight.getBoundingClientRect();
        Joystick.right.x = rect.left + rect.width/2;
        Joystick.right.y = rect.top + rect.height/2;
        updateJoystickTouch(t, 'right');
        drawJoystick('right');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickRight.addEventListener('touchmove', function(e) {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (Joystick.right.active && Joystick.right.touchId === t.identifier) {
        updateJoystickTouch(t, 'right');
        drawJoystick('right');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickRight.addEventListener('touchend', function(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (Joystick.right.active && Joystick.right.touchId === t.identifier) {
        Joystick.right.active = false;
        Joystick.right.touchId = null;
        Joystick.right.value = {x:0, y:0};
        drawJoystick('right');
        break;
      }
    }
    e.preventDefault();
  }, {passive:false});
  joystickRight.addEventListener('touchcancel', function(e) {
    Joystick.right.active = false;
    Joystick.right.touchId = null;
    Joystick.right.value = {x:0, y:0};
    drawJoystick('right');
    e.preventDefault();
  }, {passive:false});

  // Initial draw
  drawJoystick('left');
  drawJoystick('right');
}

function updateJoystickTouch(t, side) {
  const joy = (side === 'left') ? joystickLeft : joystickRight;
  const state = Joystick[side];
  const rect = joy.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const dx = t.clientX - cx;
  const dy = t.clientY - cy;
  const dist = Math.hypot(dx, dy);
  let nx = dx / Joystick.radius;
  let ny = dy / Joystick.radius;
  // Clamp to circle
  if (dist > Joystick.radius) {
    nx = nx / dist * Joystick.radius;
    ny = ny / dist * Joystick.radius;
  }
  // Deadzone
  const mag = Math.hypot(nx, ny);
  if (mag < Joystick.deadzone) {
    state.value = {x:0, y:0};
  } else {
    state.value = {x: nx, y: ny};
  }
}

function drawJoystick(side) {
  const joy = (side === 'left') ? joystickLeft : joystickRight;
  // Use canvas for drawing
  let cvs = joy.querySelector('canvas');
  if (!cvs) {
    cvs = document.createElement('canvas');
    cvs.width = cvs.height = Joystick.radius*2;
    joy.appendChild(cvs);
  }
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0,0,cvs.width,cvs.height);
  // Outer circle
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(Joystick.radius, Joystick.radius, Joystick.radius-2, 0, Math.PI*2);
  ctx.fillStyle = side==='left' ? '#7ef2b8' : '#ffd95a';
  ctx.fill();
  ctx.globalAlpha = 1;
  // Inner stick
  const v = Joystick[side].value;
  ctx.beginPath();
  ctx.arc(Joystick.radius + v.x*Joystick.radius*0.7, Joystick.radius + v.y*Joystick.radius*0.7, 22, 0, Math.PI*2);
  ctx.fillStyle = side==='left' ? '#00ff9f' : '#ffb800';
  ctx.fill();
}

// On load, setup joysticks
window.addEventListener('load', setupVirtualJoysticks);

// --- Touch Change Mode Button ---
window.addEventListener('load', function() {
  const btnMode = document.getElementById('btn-mode');
  const btnUlt = document.getElementById('btn-ult');

  // Show/hide only on touch devices
  function updateTouchButtonVisibility() {
    if (isTouchDevice()) {
      if (btnMode) btnMode.style.display = 'inline-flex';
      if (btnUlt) btnUlt.style.display = 'inline-flex';
    } else {
      if (btnMode) btnMode.style.display = 'none';
      if (btnUlt) btnUlt.style.display = 'none';
    }
  }
  updateTouchButtonVisibility();

// Mode button logic
   function handleModeButton(e) {
     e.preventDefault();
     // Directly switch mode
     const idx = Player.shootModes.indexOf(world.player.shootMode);
     world.player.shootMode = Player.shootModes[(idx + 1) % Player.shootModes.length];
     updateShootModeHUD();
   }

  function handleModeButtonTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    handleModeButton(e);
  }
  if (btnMode) {
    btnMode.addEventListener('click', handleModeButton);
    btnMode.addEventListener('touchstart', function(e) {
      btnMode.classList.add('pressed');
      handleModeButtonTouch(e);
    }, {passive: false});
    btnMode.addEventListener('touchend', function() {
      btnMode.classList.remove('pressed');
    });
    btnMode.addEventListener('touchcancel', function() {
      btnMode.classList.remove('pressed');
    });
  }

  // ULT button logic
  function handleUltButton(e) {
    e.preventDefault();
    // Simulate Q keydown event
    const evt = new KeyboardEvent('keydown', { key: 'q', bubbles: true });
    window.dispatchEvent(evt);
  }

  function handleUltButtonTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    handleUltButton(e);
  }
  if (btnUlt) {
    btnUlt.addEventListener('click', handleUltButton);
    btnUlt.addEventListener('touchstart', function(e) {
      btnUlt.classList.add('pressed');
      handleUltButtonTouch(e);
    }, {passive: false});
    btnUlt.addEventListener('touchend', function() {
      btnUlt.classList.remove('pressed');
    });
    btnUlt.addEventListener('touchcancel', function() {
      btnUlt.classList.remove('pressed');
    });
  }
});


(function polyRAF() {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(cb) { return setTimeout(() => cb(performance.now()), 1000/60); };
  }
})();
