/* ═══════════════════════════════════════
   ひなたカレンダー — ひまわり花びらアニメーション
   sakura.js （日向坂46版）
═══════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('petals-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#f5b800','#fde87a','#72bce8','#b3dcf5','#ffffff','#f5d400'];
  const COUNT  = 22;

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.op;
    const w = p.r * 0.38, h = p.r;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.3, w, h, 0, 0, Math.PI * 2);
    ctx.fillStyle   = p.col;
    ctx.shadowColor = p.col;
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(0, -h * 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.op;
    ctx.fillStyle   = p.col;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ao = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const ai = ao + Math.PI / 5;
      const ox = Math.cos(ao) * p.r,       oy = Math.sin(ao) * p.r;
      const ix = Math.cos(ai) * p.r * 0.4, iy = Math.sin(ai) * p.r * 0.4;
      i === 0 ? ctx.moveTo(ox, oy) : ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const items = Array.from({ length: COUNT }, (_, i) => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height,
    r:    6 + Math.random() * 11,
    rot:  Math.random() * Math.PI * 2,
    rs:   (Math.random() - 0.5) * 0.025,
    sp:   0.4 + Math.random() * 0.7,
    dr:   (Math.random() - 0.5) * 0.5,
    wb:   Math.random() * Math.PI * 2,
    wbs:  0.008 + Math.random() * 0.014,
    col:  COLORS[Math.floor(Math.random() * COLORS.length)],
    op:   0.18 + Math.random() * 0.38,
    star: i < 7,
  }));

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    items.forEach(p => {
      p.wb += p.wbs; p.x += p.dr + Math.sin(p.wb) * 0.6; p.y += p.sp; p.rot += p.rs;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      p.star ? drawStar(p) : drawPetal(p);
    });
    requestAnimationFrame(tick);
  }
  tick();
})();
