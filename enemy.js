// Base entities
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
    if (this.x < -50 || this.x > world.w + 50 || this.y < -50 || this.y > world.h + 50) this.dead = true;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2, 0, Math.PI*2);
    ctx.fill();
  }
}

// Enemy system

class Enemy extends Entity {
   constructor(x,y,type='basic') {
     super(x,y,26,26);
     this.type = type;
     this.color = (type==='charger')? '#ff9f43' : (type==='triangle')? '#e17055' : (type==='square')? '#fdcb6e' : '#ff6b6b';
     this.speed = CONFIG.enemySpeed * ((type==='charger')?1.4 : (type==='square')?0.5 : 1);
     this.health = (type==='triangle' || type==='square' || type==='pentagon_line') ? 3 : 5;
     this.fireCooldown = rand(0.5, 1.6);
     this.patrolAngle = rand(0, Math.PI*2);
     this.tags.add('enemy');
     this.target = null;
     this.spinAngle = rand(0, Math.PI*2); // for spinning effect
   }
   update(dt, world) {
     // Delegate to specific update based on type
     if (this.type === 'triangle') {
       triangleUpdate.call(this, dt, world);
     } else if (this.type === 'square') {
       squareUpdate.call(this, dt, world);
     } else if (this.type === 'pentagon_line') {
       pentagonLineUpdate.call(this, dt, world);
     } else {
       // Default basic/charger behavior
       const player = world.player;
       if(!player) return;
       const dx = (player.x + player.w/2) - (this.x + this.w/2);
       const dy = (player.y + player.h/2) - (this.y + this.h/2);
       const d = Math.hypot(dx, dy);
       if (d < 300) {
         this.vx = (dx/d) * this.speed;
         this.vy = (dy/d) * this.speed;
         if (d < 420 && this.type === 'charger') {
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
         this.patrolAngle += dt * 0.8;
         this.vx = Math.cos(this.patrolAngle) * (this.speed * 0.6);
         this.vy = Math.sin(this.patrolAngle) * (this.speed * 0.6);
       }
       this.x += this.vx * dt;
       this.y += this.vy * dt;
       this.spinAngle += dt * 2.2;
       this.x = clamp(this.x, 8, world.w - this.w - 8);
       this.y = clamp(this.y, 8, world.h - this.h - 8);
     }
   }
   // Meshes for enemies (regular polygons for even sides)
   static meshes = {
     basic: [ // Regular Hexagon
       [0, -13],
       [11.258, -6.5],
       [11.258, 6.5],
       [0, 13],
       [-11.258, 6.5],
       [-11.258, -6.5],
     ],
     charger: [ // Regular Pentagon
       [0, -13],
       [12.36, -3.98],
       [7.61, 12.36],
       [-7.61, 12.36],
       [-12.36, -3.98],
     ],
     triangle: [ // Equilateral Triangle
       [0, -13],
       [11.258, 6.5],
       [-11.258, 6.5],
     ],
     square: [ // Square
       [-12, -12],
       [12, -12],
       [12, 12],
       [-12, 12],
     ],
     pentagon_line: [ // Distinct Hexagon shape
       [0, -13],
       [13, -6.5],
       [13, 6.5],
       [0, 13],
       [-13, 6.5],
       [-13, -6.5],
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
     const mesh = Enemy.meshes[this.type] || Enemy.meshes.basic;
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
