export class TouchController {
  constructor({ target, faceAt, onTap, onDoubleTap, onDragStart, onDragMove, onDragEnd, onLongPress, onBackgroundTap, longMs = 520, dragPx = 16, doubleMs = 340, doubleDist = 30 }) {
    this.target = target;
    this.faceAt = faceAt;
    this.onTap = onTap;
    this.onDoubleTap = onDoubleTap;
    this.onDragStart = onDragStart;
    this.onDragMove = onDragMove;
    this.onDragEnd = onDragEnd;
    this.onLongPress = onLongPress;
    this.onBackgroundTap = onBackgroundTap;
    this.longMs = longMs;
    this.dragPx = dragPx;
    this.doubleMs = doubleMs;
    this.doubleDist = doubleDist;
    this.gesture = null;
    this.lastTap = { t: 0, x: 0, y: 0, face: -1 };
    this.bind();
  }

  bind() {
    this.target.onpointerdown = e => this.pointerDown(e);
    this.target.onpointermove = e => this.pointerMove(e);
    this.target.onpointerup = e => this.pointerUp(e);
    this.target.onpointercancel = () => this.pointerCancel();
    this.target.oncontextmenu = e => e.preventDefault();
  }

  pointerDown(e) {
    const face = this.faceAt(e.clientX, e.clientY);
    this.gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      face,
      state: 'pending',
      timer: null
    };
    this.target.setPointerCapture(e.pointerId);
    if (face >= 0) {
      this.gesture.timer = setTimeout(() => {
        if (this.gesture?.state === 'pending') {
          this.gesture.state = 'long';
          this.onLongPress?.(face, this.gesture.x, this.gesture.y);
        }
      }, this.longMs);
    }
  }

  distance(e) {
    return Math.hypot(e.clientX - this.gesture.x, e.clientY - this.gesture.y);
  }

  clearTimer() {
    if (this.gesture?.timer) {
      clearTimeout(this.gesture.timer);
      this.gesture.timer = null;
    }
  }

  pointerMove(e) {
    const g = this.gesture;
    if (!g || e.pointerId !== g.id || g.state === 'long') return;
    if (g.state === 'pending' && this.distance(e) >= this.dragPx) {
      g.state = 'drag';
      this.clearTimer();
      this.onDragStart?.(g.face, g.x, g.y);
    }
    if (g.state === 'drag') {
      const face = this.faceAt(e.clientX, e.clientY);
      const dx = e.clientX - g.lx;
      const dy = e.clientY - g.ly;
      this.onDragMove?.(face, dx, dy, e.clientX, e.clientY);
      g.lx = e.clientX;
      g.ly = e.clientY;
    }
  }

  pointerUp(e) {
    const g = this.gesture;
    if (!g || e.pointerId !== g.id) return;
    this.clearTimer();

    if (g.state === 'pending') {
      const face = this.faceAt(e.clientX, e.clientY);
      if (face >= 0) {
        const now = performance.now();
        const dbl = this.lastTap.face === face &&
          now - this.lastTap.t <= this.doubleMs &&
          Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) <= this.doubleDist;
        this.onTap?.(face, e.clientX, e.clientY);
        if (dbl) {
          this.onDoubleTap?.(face, e.clientX, e.clientY);
          this.lastTap = { t: 0, x: 0, y: 0, face: -1 };
        } else {
          this.lastTap = { t: now, x: e.clientX, y: e.clientY, face };
        }
      } else {
        this.onBackgroundTap?.(e.clientX, e.clientY);
        this.lastTap = { t: 0, x: 0, y: 0, face: -1 };
      }
    } else if (g.state === 'drag') {
      this.onDragEnd?.();
    }

    this.gesture = null;
  }

  pointerCancel() {
    this.clearTimer();
    if (this.gesture?.state === 'drag') this.onDragEnd?.();
    this.gesture = null;
  }
}
