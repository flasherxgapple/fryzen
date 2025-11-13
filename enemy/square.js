// Square enemy: spinning with blade around it, slowly moves to player, crowds if multiple, spreads bullets on death based on player lives
// Health: 3 hits
// Damage: 2 lives on contact

// Square mesh (already in tank, but rename to square)
Enemy.meshes.square = [
  [-12, -12],
  [12, -12],
  [12, 12],
  [-12, 12],
];

// Square behavior
const squareUpdate = function(dt, world) {
  const player = world.player;
  if (!player) return;
  const dx = (player.x + player.w/2) - (this.x + this.w/2);
  const dy = (player.y + player.h/2) - (this.y + this.h/2);
  const d = Math.hypot(dx, dy);
  // Slower speed
  const baseSpeed = CONFIG.enemySpeed * 0.5;
  let speed = baseSpeed;
  // Check for crowding: count nearby squares
  const nearbySquares = world.entities.filter(e => e.type === 'square' && e !== this && dist(this.x + this.w/2, this.y + this.h/2, e.x + e.w/2, e.y + e.h/2) < 60);
  if (nearbySquares.length > 0) {
    // Crowd: move towards center of group
    const centerX = nearbySquares.reduce((sum, e) => sum + e.x + e.w/2, this.x + this.w/2) / (nearbySquares.length + 1);
    const centerY = nearbySquares.reduce((sum, e) => sum + e.y + e.h/2, this.y + this.h/2) / (nearbySquares.length + 1);
    const cdx = centerX - (this.x + this.w/2);
    const cdy = centerY - (this.y + this.h/2);
    const cd = Math.hypot(cdx, cdy);
    if (cd > 0) {
      this.vx = (cdx/cd) * speed * 0.8;
      this.vy = (cdy/cd) * speed * 0.8;
    }
  } else {
    // Normal pursue
  if (d < 400) {
    this.vx = (dx/d) * speed;
    this.vy = (dy/d) * speed;
  } else {
    this.patrolAngle += dt * 0.5;
    this.vx = Math.cos(this.patrolAngle) * speed * 0.4;
    this.vy = Math.sin(this.patrolAngle) * speed * 0.4;
  }
  }
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  // Very fast spin for blade effect
  this.spinAngle += dt * 10.0;
  // bounds
  this.x = clamp(this.x, 8, world.w - this.w - 8);
  this.y = clamp(this.y, 8, world.h - this.h - 8);
};