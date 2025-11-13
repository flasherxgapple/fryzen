
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class Pickup extends Entity {
   constructor(x,y,type='score') {
     super(x,y,18,18);
     this.type = type;
     this.color = (type === 'life') ? '#a8e6cf' : (type === 'invuln') ? '#f5f5f5' : '#66d9ff'; // pale green, pale white, blue
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
     if (this.type === 'score') {
       ctx.beginPath();
       ctx.ellipse(0,0,this.w/2, this.h/2, 0, 0, Math.PI*2);
       ctx.fill();
     } else {
       roundRect(ctx, -this.w/2, -this.h/2, this.w, this.h, 4);
       ctx.fill();
     }
     ctx.restore();
   }
}

const Buffs = {
  createPickup: (x, y, type = 'score') => new Pickup(x, y, type),
  spawnRandom: (world) => {
    const x = rand(64, world.w-64);
    const y = rand(64, world.h-64);
    let type = 'score';
    const r = rand();
    if (r < 0.35) type = 'life';
    else if (r < 0.7) type = 'invuln';
    const p = Buffs.createPickup(x, y, type);
    world.spawn(p);
  }
};
