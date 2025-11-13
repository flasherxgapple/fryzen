// Triangle enemy: shoots 3 slower chasing triangle bullets that can be shot
// Health: 3 hits
// Damage: ChasingBullet reduces 1 life

// Triangle mesh (pointing up for better spinning visual)
Enemy.meshes.triangle = [
  [0, -13],
  [11, 13],
  [-11, 13],
];

// Triangle behavior
const triangleUpdate = function(dt, world) {
  const player = world.player;
  if (!player) return;
  // Similar to basic, but shoots 3 slower chasing bullets
  const dx = (player.x + player.w/2) - (this.x + this.w/2);
  const dy = (player.y + player.h/2) - (this.y + this.h/2);
  const d = Math.hypot(dx, dy);
  if (d < 300) {
    this.vx = (dx/d) * this.speed;
    this.vy = (dy/d) * this.speed;
    if (d < 420) {
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0) {
        // Shoot 3 chasing triangle bullets from each side
        const baseAngle = Math.atan2(dy, dx);
        for (let i = 0; i < 3; i++) {
          const angle = baseAngle + (i - 1) * (Math.PI / 3); // 120 degrees apart
          const bx = this.x + this.w/2 + Math.cos(angle) * (this.w/2 + 6);
          const by = this.y + this.h/2 + Math.sin(angle) * (this.h/2 + 6);
          const b = new ChasingBullet(bx, by, player, 'enemy');
          world.spawn(b);
        }
        this.fireCooldown = rand(1.5, 2.5);
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
  // bounds
  this.x = clamp(this.x, 8, world.w - this.w - 8);
  this.y = clamp(this.y, 8, world.h - this.h - 8);
};

// ChasingBullet class
class ChasingBullet extends Entity {
  constructor(x, y, target, owner) {
    super(x-8, y-8, 16, 16);
    this.vx = 0; this.vy = 0;
    this.owner = owner;
    this.target = target;
    this.speed = CONFIG.bulletSpeed * 0.4; // much slower
    this.life = 4.0;
    this.color = '#ff4757';
    this.tags.add('bullet');
  }
  update(dt, world) {
    if (this.target && !this.target.dead) {
      const dx = (this.target.x + this.target.w/2) - (this.x + this.w/2);
      const dy = (this.target.y + this.target.h/2) - (this.y + this.h/2);
      const d = Math.hypot(dx, dy);
      if (d > 0) {
        this.vx = (dx/d) * this.speed;
        this.vy = (dy/d) * this.speed;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
    if (this.x < -50 || this.x > world.w + 50 || this.y < -50 || this.y > world.h + 50) this.dead = true;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    // Rotate to face the target
    if (this.target && !this.target.dead) {
      const dx = (this.target.x + this.target.w/2) - (this.x + this.w/2);
      const dy = (this.target.y + this.target.h/2) - (this.y + this.h/2);
      const angle = Math.atan2(dy, dx);
      ctx.rotate(angle + Math.PI/2); // +90deg so front points up
    }
    ctx.fillStyle = this.color;
    const mesh = Enemy.meshes.triangle.map(p => [p[0]*0.5, p[1]*0.5]); // smaller triangle
    ctx.beginPath();
    ctx.moveTo(mesh[0][0], mesh[0][1]);
    for (let i = 1; i < mesh.length; i++) {
      ctx.lineTo(mesh[i][0], mesh[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}