class Rect  {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.width = width;
    this.height = height;
  }

  collidesWith(otherRect) {

      return (this.z == otherRect.z) && (this.x < otherRect.x + otherRect.width &&
        this.x + this.width > otherRect.x &&
        this.y < otherRect.y + otherRect.height &&
        this.height + this.y > otherRect.y);
   }

}

class Circle extends Rect {
    constructor(cx, cy, radius) {
      super(cx - radius, cy - radius, 2 * radius, 2 * radius);
      this.radius = radius;
    }
}

class Vector {
  constructor(x=0, y=0, z=0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }

  static Add(v1, v2) {
    return Vector(v1.x + v2.x, v1.y, v2.y, v1.z + v2.z);
  }
}



class InputStateManager {
  constructor() {
      this.rightPressed = false;
      this.leftPressed = false;
      this.downPressed = false;
      this.upPressed = false;
  }

  reset() {
    this.rightPressed = false;
    this.leftPressed = false;
    this.downPressed = false;
    this.upPressed = false;
  }
}

function keyDownHandler(input) {

  return function keyDownHandlerInternal(e) {
    console.log(e);
    console.log(e.keyCode);

    if(e.keyCode == 39) {
      input.rightPressed = true;
    }
    else if(e.keyCode == 37) {
      input.leftPressed = true;
    } else if (e.keyCode == 38) {
      input.upPressed = true;
    } else if (e.keyCode == 40) {
      input.downPressed = true;
    }

  };

}

function keyUpHandler(input) {
  return function keyUpHandlerInternal(e) {
    console.log(e);
    console.log(e.keyCode);

    if(e.keyCode == 39) {
        input.rightPressed = false;
    }
    else if(e.keyCode == 37) {
        input.leftPressed = false;
    }else if (e.keyCode == 38) {
      input.upPressed = false;
    } else if (e.keyCode == 40) {
      input.downPressed = false;
    }
  };

}



class Session {
  constructor(canvas1, canvas2) {
    this.objects = [];
    this.canvases = [canvas1, canvas2];
    this.frame = 0;
    this.contexts = [canvas1.getContext("2d"), canvas2.getContext("2d")];

    this.inputState = new InputStateManager(document);
    document.addEventListener("keydown", keyDownHandler(this.inputState), false);
    document.addEventListener("keyup", keyUpHandler(this.inputState), false);

    this.zClip = 1;
    this.needsZReorder = false;
  }

  reset() {
    this.frame = 0;
    this.objects.length = 0;
    this.inputState.reset();
  }

  observeEvents() {
    for (var i = 0; i < this.objects.length; i++) {
      var obj1 = this.objects[i];

      for (var j = i + 1; j < this.objects.length; j++) {
        var obj2 = this.objects[j];

        if (obj1.collidesWith(obj2)) {
          var event = new Event("collision", [obj1, obj2]);
          obj1.onEvent(event);
          obj2.onEvent(event);
        }

      }
    }

  }


  preUpdate() {

      for (var obj of this.objects) {
        obj.onPreUpdate();
      }
    }

  update() {
    var curZ = this.objects.length == 0 ? 0 : this.objects[0];

    for (var obj of this.objects) {
      obj.onUpdate(this.canvas, this.inputState);
      if (!this.needsZReorder && curZ >= obj.geometry.z) {
        this.needsZReorder = true;
      }
    }

  }

  postUpdate() {

      for (var obj of this.objects) {
        obj.onPostUpdate();
      }
    }


  preDraw() {

    for (var obj of this.objects) {
      obj.onPreDraw();
    }
  }

  draw() {

    for (var obj of this.objects) {
      // Z Clipping to prevent objects out of
      // scope from being drawn.
      if (obj.geometry.z > this.zClip) {
        continue;
      }

      obj.onDraw(this.ctx);
    }
  }

  postDraw() {

    for (var obj of this.objects) {
      obj.onPostDraw();
    }
  }

  runLoop() {
    this.frame += 1;
    this.ctx = this.contexts[this.frame % 2];
    this.canvas = this.canvases[this.frame % 2];

    this.observeEvents();
    this.preUpdate();
    this.update();
    this.postUpdate();

    if (this.needsZReorder) {
      this.objects.sort((a,b) => a.z - b.z);
      this.needsZReorder = false;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.preDraw();
    this.draw();
    this.postDraw();

    for (var context of this.canvases) {
      // flip buffer for double buffering.
      context.style.visibility = context.style.visibility == 'hidden' ? 'visible' : 'hidden';
    }


  }

}

class Event {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}

class GameObject {
  constructor(geometry=null, velocity=null, fillStyle=null) {
    this.velocity = (velocity == null ? new Vector() : velocity);
    this.geometry = (geometry == null ? new Rect() : geometry);
    this.fillStyle = (fillStyle == null ?  "#000000" : fillStyle);
    this.eventQueue = [];
  }

  onEvent(e) {
    console.log(e);
    this.eventQueue.push(e);
    return;
  }

  onPreUpdate() {}

  onUpdate(canvas, input)  {

    if (this.velocity.x === 0 && this.velocity.y === 0) {
      return;
    }

    this.geometry.x += this.velocity.x;
    this.geometry.y += this.velocity.y;

    if ((this.geometry.x + this.geometry.width >= canvas.width && this.velocity.x > 0) ||
          (this.geometry.x <= 0 && this.velocity.x < 0) ) {
      this.velocity.x *= -1;
    }
    if ((this.geometry.y + this.geometry.height >= canvas.height && this.velocity.y > 0) ||
          (this.geometry.y <= 0 && this.velocity.y < 0) ) {
      this.velocity.y *= -1;
    }
  }

  onPostUpdate() {
    this.eventQueue.length = 0;
  }

  onPreDraw() {}

  onDraw(ctx) {
    ctx.beginPath();
    ctx.rect(this.geometry.x, this.geometry.y, this.geometry.width, this.geometry.height);
    ctx.fillStyle = this.fillStyle;
    ctx.fill();
    ctx.closePath();
  }

  onPostDraw() {}

  collidesWith(otherObject) {
    return this.geometry.collidesWith(otherObject.geometry);
  }
}

class Ball extends GameObject {
  constructor(geometry=null, velocity=null) {
    super(geometry, velocity);
    this.collidedPrev = false;
    this.collidedCurr = false;
  }

  onEvent(e) {
    if (e.type != "collision") {
      return; // drop event
    }

    this.collidedCurr = true;
  }

  onUpdate(canvas, input) {
    if (this.collidedCurr && !this.collidedPrev) {
      this.velocity.y *= -1;
    }

    super.onUpdate(canvas, input);
  }

  onPostUpdate() {
    this.collidedPrev = this.collidedCurr;
    this.collidedCurr = false;
  }

  onDraw(ctx) {
    ctx.beginPath();
    ctx.arc(this.geometry.x + this.geometry.radius,
      this.geometry.y + this.geometry.radius,
      this.geometry.radius, 0, Math.PI * 2);

    ctx.fillStyle = this.fillStyle;
    ctx.fill();
    ctx.closePath();
  }

}

class Brick extends GameObject {

  constructor(geometry) {
    super(geometry, null);
  }

  onEvent(e) {
    if (e.type != "collision") {
      return; // drop event
    }

    this.geometry.z = 2;
  }

  static PADDING() {
      return 5;
  }

  static WIDTH() {
      return 50;
  }

  static HEIGHT() {
      return 15;
  }

  static create(x, y) {
    var brick =  new Brick(new Rect(x, y, Brick.WIDTH(), Brick.HEIGHT()));
    brick.fillStyle = "#004499";
    return brick;
  }

  static createRowReversed(xOffset, y, maxWidth) {
    var currentX = maxWidth - xOffset - Brick.WIDTH();
    var bricks = [];

    do {
        bricks.push(Brick.create(currentX, y));
        currentX -= Brick.WIDTH() + Brick.PADDING();

    } while(currentX >= 0);

    return bricks;
  }

  static createRow(xOffset, y, maxWidth, reverse=false) {
    if (reverse) {
      return Brick.createRowReversed(xOffset, y, maxWidth);
    }

    var currentX = xOffset;
    var bricks = [];

    do {
        bricks.push(Brick.create(currentX, y));
        currentX += Brick.WIDTH() + Brick.PADDING();

    } while(currentX + Brick.WIDTH() < maxWidth);

    return bricks;
  }

  static createWall(rows, maxWidth) {
    var bricks = [];

    for (var i = 0; i < rows; i++) {

      var y = (i * (Brick.HEIGHT() + Brick.PADDING()))
      var reverse = i % 2 == 0;

      bricks.push(...Brick.createRow(Brick.PADDING(), y, maxWidth, reverse));
    }

    return bricks;
  }


}



class Paddle extends GameObject {
    constructor(geometry=null, velocity=null, fillStyle=null) {
      super(geometry, velocity, fillStyle);
    }

    onUpdate(canvas, input)  {

//      console.log(UserInput);

      if (input.rightPressed && (this.geometry.x + this.geometry.width + this.velocity.x <= canvas.width)) {
          this.geometry.x += this.velocity.x;

      } else if (input.leftPressed && (this.geometry.x - this.velocity.x >= 0)) {
          this.geometry.x -= this.velocity.x;
      } else if (input.upPressed && this.geometry.z == 0) {
        this.geometry.z = 1;
      } else if (input.downPressed) {
        this.geometry.z = 0;
      }

    }
}

// TODO: Make the game object class better this is hacky shit.
class Manager extends GameObject {
    constructor(game) {
      super(new Rect(0,0,0,0), new Vector(0,0,0));
      this.z = 10000; //never drawn
      this.game = game;
    }
}

class LevelManager extends Manager {
  constructor(game) {
    super(game);
  }

  userHasWon() {
    return !this.game.objects.filter(o => o instanceof Brick).some(b => b.geometry.z == 0);
  }

  onUpdate() {
    if (this.userHasWon()) {
      alert("You Win!");
      this.loadLevel();
    }
  }

  loadLevel() {
    this.game.objects.length = 0;

    var canvas = this.game.canvases[0];
    var user = new Paddle(new Rect(canvas.width / 2.0, canvas.height - 40, 60, 20), new Vector(4, 0, 0));
    var ball = new Ball(new Circle(200, 200, 15), new Vector(2, -2));

    this.game.objects.push(this);
    this.game.objects.push(user);
    this.game.objects.push(ball);
    this.game.objects.push(...Brick.createWall(5, canvas.width));
  }

}
