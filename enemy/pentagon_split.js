// Splitting Pentagon enemy: large spawns, splits into 2 medium then 3 small on hit
// Health: 1 hit per piece (large/medium/small)
// Damage: Contact reduces 1 life

class SplittingPentagon extends Entity {
  constructor(x, y, sizeLevel = 0) { // 0: large, 1: medium, 2: small
    const sizes = [52, 34, 22];
    const w = sizes[sizeLevel], h = sizes[sizeLevel];
    super(x - w/2, y - h/2, w, h);
    this.sizeLevel = sizeLevel;
    this.color = '#ff9f43';
    this.speed = CONFIG.enemySpeed * (0.6 - sizeLevel * 0.1);
    this.health = 1;
    this.patrolAngle = rand(0, Math.PI*2);
    this.tags.add('enemy');
    this.spinAngle = rand(0, Math.PI*2);
  }
  update(dt, world) {
    const player = world.player;
    if (!player) return;
    const dx = (player.x + player.w/2) - (this.x + this.w/2);
    const dy = (player.y + player.h/2) - (this.y + this.h/2);
    const d = Math.hypot(dx, dy);
    if (d < 300) {
      this.vx = (dx/d) * this.speed;
      this.vy = (dy/d) * this.speed;
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
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.w/2, this.y + this.h/2);
    ctx.rotate(this.spinAngle);
    const scale = 1 + Math.sin(now()/150 + (this.x+this.y)/50)*0.03;
    ctx.scale(scale, scale);
    ctx.fillStyle = this.color;
    const mesh = Enemy.meshes.charger.map(p => [p[0] * (this.w/26), p[1] * (this.h/26)]); // scale mesh
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
  onDeath(world) {
    if (this.sizeLevel < 2) {
      const numSplits = this.sizeLevel === 0 ? 2 : 3;
      for (let i = 0; i < numSplits; i++) {
        const angle = (i / numSplits) * Math.PI * 2;
        const dist = 20;
        const sx = this.x + this.w/2 + Math.cos(angle) * dist;
        const sy = this.y + this.h/2 + Math.sin(angle) * dist;
        const split = new SplittingPentagon(sx, sy, this.sizeLevel + 1);
        world.spawn(split);
      }
    }
  }
}