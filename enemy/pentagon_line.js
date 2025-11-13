// Pentagon Line enemy (hexagon): moves further from player, shoots 6 regular bullets in a line
// Health: 3 hits
// Damage: Bullets reduce 1 life

// Pentagon mesh (use charger)
Enemy.meshes.pentagon_line = Enemy.meshes.charger;

// Pentagon Line behavior
const pentagonLineUpdate = function(dt, world) {
  const player = world.player;
  if (!player) return;
  const dx = (player.x + player.w/2) - (this.x + this.w/2);
  const dy = (player.y + player.h/2) - (this.y + this.h/2);
  const d = Math.hypot(dx, dy);
  if (d < 350) {
    // Move away
    this.vx = -(dx/d) * this.speed * 0.8;
    this.vy = -(dy/d) * this.speed * 0.8;
    // Shoot 6 bullets in line
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      const angle = Math.atan2(dy, dx);
      for (let i = -2; i <= 2; i++) { // 5 bullets, wait 6?
        const spreadAngle = angle + i * 0.1; // small spread for line
        const bx = this.x + this.w/2 + Math.cos(spreadAngle) * (this.w/2 + 6);
        const by = this.y + this.h/2 + Math.sin(spreadAngle) * (this.h/2 + 6);
        const b = new Bullet(bx, by, Math.cos(spreadAngle) * (CONFIG.bulletSpeed*0.8), Math.sin(spreadAngle) * (CONFIG.bulletSpeed*0.8), 'enemy');
        world.spawn(b);
      }
      // Extra bullet in center?
      const bx = this.x + this.w/2 + Math.cos(angle) * (this.w/2 + 6);
      const by = this.y + this.h/2 + Math.sin(angle) * (this.h/2 + 6);
      const b = new Bullet(bx, by, Math.cos(angle) * (CONFIG.bulletSpeed*0.8), Math.sin(angle) * (CONFIG.bulletSpeed*0.8), 'enemy');
      world.spawn(b);
      this.fireCooldown = rand(1.5, 2.5);
    }
  } else {
    // Patrol
    this.patrolAngle += dt * 0.6;
    this.vx = Math.cos(this.patrolAngle) * (this.speed * 0.5);
    this.vy = Math.sin(this.patrolAngle) * (this.speed * 0.5);
  }
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.spinAngle += dt * 1.5;
  // bounds
  this.x = clamp(this.x, 8, world.w - this.w - 8);
  this.y = clamp(this.y, 8, world.h - this.h - 8);
};