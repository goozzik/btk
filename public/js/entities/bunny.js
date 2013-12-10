// Generated by CoffeeScript 1.6.3
(function() {
  game.BunnyEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
      this.parent(x, y, settings);
      this.setVelocity(3, 15);
      this.updateColRect(8, 32, -1, 0);
      return me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);
    },
    update: function() {
      this.checkMovement();
      if (game.mouseTarget) {
        this.checkDirection();
      }
      this.checkShoot();
      this.updateMovement();
      if (this.vel.x !== 0 || this.vel.y !== 0) {
        this.parent();
      }
      me.debug.renderHitBox = window.debug;
      return true;
    },
    checkMovement: function() {
      if (me.input.isKeyPressed("left")) {
        this.vel.x -= this.accel.x * me.timer.tick;
      } else if (me.input.isKeyPressed("right")) {
        this.vel.x += this.accel.x * me.timer.tick;
      } else {
        this.vel.x = 0;
      }
      if (me.input.isKeyPressed("jump")) {
        if (!this.jumping && !this.falling) {
          this.vel.y = -this.maxVel.y * me.timer.tick;
          return this.jumping = true;
        }
      }
    },
    checkDirection: function() {
      if (game.mouseTarget.x > this.pos.x) {
        this.flipX(false);
        return this.direction = true;
      } else {
        this.flipX(true);
        return this.direction = false;
      }
    },
    checkShoot: function() {
      if (me.input.isKeyPressed('shoot')) {
        return this.shoot();
      }
    },
    shoot: function() {
      var pos, toast;
      pos = this.shootPosition();
      toast = new me.entityPool.newInstanceOf('toast', pos.x, pos.y, {
        target: game.mouseTarget
      });
      me.game.add(toast, this.z);
      return me.game.sort();
    },
    shootPosition: function() {
      return {
        x: (this.direction ? this.pos.x + 45 : this.pos.x + 5),
        y: this.pos.y + 30
      };
    }
  });

}).call(this);
