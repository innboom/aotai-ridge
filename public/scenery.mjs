// Photographic concept scenery + lightweight Canvas foregrounds.
// Static terrain is cached once; only the character and atmosphere animate.
const images = new Map();
const terrainCache = new Map();
for (const name of ['meadow', 'stone', 'snow', 'rock']) {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => terrainCache.clear();
  image.src = new URL(`./assets/${name}.webp`, import.meta.url).href;
  images.set(name, image);
}
const ready = image => image?.complete && image.naturalWidth > 0;
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const palettes = {
  meadow: { sky: '#91aebc', base: '#686654', top: '#9a8b60', dark: '#302f29', grass: ['#b9aa77', '#7d8053', '#b69761', '#685f40'] },
  stone: { sky: '#88979e', base: '#70746e', top: '#a3a59a', dark: '#313638', grass: ['#787e69', '#a5a18b', '#606756', '#8a816b'] },
  snow: { sky: '#a4bac6', base: '#626d73', top: '#e2e9e8', dark: '#29353c', grass: ['#c3cdd0', '#94a9ad', '#6c7b7e', '#d6ddda'] },
};
function shape(c, points, fill) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
}
function stroke(c, points, color, width = 1) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function ellipse(c, x, y, rx, ry, color) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
}
function gradient(c, x, y, x2, y2, stops) {
  const g = c.createLinearGradient(x, y, x2, y2);
  stops.forEach(([at, color]) => g.addColorStop(at, color)); return g;
}

export function drawBackground(c, theme, time, camera, width, home = false) {
  const image = images.get(theme), height = 810;
  c.fillStyle = palettes[theme].sky; c.fillRect(0, 0, width, height);
  if (ready(image)) {
    // One continuous photograph: bounded panning avoids visible tile seams.
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * 1.09;
    const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
    const progress = home ? .32 : Math.min(1, camera / 4800);
    const offset = (iw - width) * (.2 + progress * .65);
    c.drawImage(image, -offset, -(ih - height) * .38, iw, ih);
  } else {
    c.fillStyle = gradient(c, 0, 0, 0, height, [[0, palettes[theme].sky], [1, '#687569']]);
    c.fillRect(0, 0, width, height);
  }
  // Gentle atmospheric movement, with no tint over the detailed mountain faces.
  if (theme !== 'meadow') {
    c.save();
    for (let i = 0; i < 3; i++) {
      const x = ((i * 637 + time * 7 - camera * .07) % (width + 700)) - 350;
      c.save(); c.translate(x, 435 + i * 95); c.scale(1, .15);
      const mist = c.createRadialGradient(0, 0, 10, 0, 0, 380);
      mist.addColorStop(0, theme === 'stone' ? '#e2e5dc22' : '#e4edf324'); mist.addColorStop(1, '#e4edf300');
      c.fillStyle = mist; c.fillRect(-390, -390, 780, 780); c.restore();
    }
    c.restore();
  }
  // A soft top scrim keeps status text legible against a bright sky.
  c.fillStyle = gradient(c, 0, 0, 0, 210, [[0, '#12202a8c'], [1, '#12202a00']]);
  c.fillRect(0, 0, width, 210);
  if (home) {
    const hx = width * .79, foot = 738;
    drawBoulder(c, hx - 4, foot + 14, 68, 31, 92, theme);
    drawHiker(c, hx, foot - 5, 1, 0, false, 1.55, time);
    for (let i = 0; i < 4; i++) {
      const x = width * .63 + i * 29 + Math.sin(time * .12 + i) * 9;
      const y = 206 + i * 9;
      stroke(c, [[x - 4, y], [x, y + 1.8], [x + 5, y - .3]], '#344653aa', .9);
    }
    c.fillStyle = gradient(c, 0, 710, 0, 810, [[0, '#111e2200'], [1, '#111e2270']]);
    c.fillRect(0, 710, width, 100);
  }
}

function grass(c, x, y, seed, palette, size = 1) {
  for (let i = 0; i < 7; i++) {
    const r = noise(seed + i * 9), h = (5 + r * 15) * size, dx = (noise(seed + i + 52) - .5) * 13 * size;
    c.beginPath(); c.moveTo(x, y + 2);
    c.quadraticCurveTo(x + dx * .35, y - h * .65, x + dx, y - h);
    c.strokeStyle = palette[i % palette.length]; c.lineWidth = .55 + r * .5; c.stroke();
    if (r > .7) stroke(c, [[x + dx, y - h], [x + dx - 1.5, y - h + 4]], '#d5bd8777', 1.6);
  }
}

export function drawBoulder(c, x, y, rx, ry, seed, theme) {
  const p = palettes[theme], points = [];
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * Math.PI * 2;
    const r = .82 + noise(seed + i * 3) * .18;
    points.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
  }
  c.save(); shape(c, points, p.base); c.clip();
  const texture = images.get('rock');
  if (ready(texture)) {
    const crop = Math.min(texture.naturalWidth, texture.naturalHeight) * .37;
    const sx = noise(seed + 12) * (texture.naturalWidth - crop), sy = noise(seed + 77) * (texture.naturalHeight - crop);
    c.drawImage(texture, sx, sy, crop, crop, x - rx, y - ry, rx * 2, ry * 2);
  }
  c.fillStyle = gradient(c, x + rx, y - ry, x - rx * .5, y + ry, [[0, '#ebe7ce30'], [.43, '#17222b05'], [1, '#15212bcc']]);
  c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  if (theme === 'snow') {
    shape(c, [[x - rx, y - ry * .5], [x - rx * .3, y - ry], [x + rx * .5, y - ry], [x + rx, y - ry * .45], [x + rx * .4, y - ry * .35], [x, y - ry * .5], [x - rx * .6, y - ry * .2]], '#d7e0df');
  }
  c.restore();
}

function terrain(plat, theme) {
  const p = palettes[theme], { w, y, id } = plat, pad = 26, height = 850 - y;
  const buffer = document.createElement('canvas'); buffer.width = Math.ceil(w + pad * 2); buffer.height = height + pad;
  const c = buffer.getContext('2d'); c.translate(pad, pad);
  const edge = [[0, 2]];
  for (let x = 7; x < w; x += 7) edge.push([x, noise(x * .7 + id * 23) * 3]);
  edge.push([w, 1], [w - 1, 12]);
  for (let dy = 24; dy < height; dy += 25) edge.push([w - 2 - noise(dy + id) * 18, dy]);
  edge.push([w - 12, height], [12, height]);
  for (let dy = height - 20; dy > 12; dy -= 23) edge.push([2 + noise(dy + id * 19) * 16, dy]);
  c.save(); shape(c, edge, p.base); c.clip();
  const texture = images.get('rock');
  if (ready(texture)) {
    // Sample different portions for each ledge; never repeat a tile within a ledge.
    const sw = texture.naturalWidth * (.56 + noise(id * 2) * .35);
    const sh = Math.min(texture.naturalHeight, sw * height / w);
    const sx = noise(id * 18) * (texture.naturalWidth - sw), sy = noise(id * 31) * (texture.naturalHeight - sh);
    c.drawImage(texture, sx, sy, sw, sh, 0, 0, w, height);
  }
  c.fillStyle = gradient(c, 0, 0, 0, height, [[0, '#1e262714'], [.18, '#20272540'], [1, '#111c24c7']]);
  c.fillRect(0, 0, w, height);
  // Local fissures and occlusion put depth behind the walking surface.
  for (let i = 0; i < w / 65; i++) {
    const x = noise(i * 3 + id * 41) * w, dy = 14 + noise(i + id) * height * .65;
    stroke(c, [[x, dy], [x + 7, dy + 24], [x - 3, dy + 51], [x + 12, dy + 78]], '#17212438', 1.1);
  }
  c.fillStyle = gradient(c, 0, 0, 0, 22, [[0, p.dark + 'aa'], [1, p.dark + '00']]); c.fillRect(0, 0, w, 22);
  c.fillStyle = gradient(c, 0, 0, w, 0, [[0, '#09151b55'], [.13, '#09151b00'], [.88, '#09151b00'], [1, '#09151b70']]); c.fillRect(0, 0, w, height);
  c.restore();

  // Small fragments soften the cut face while preserving the exact collision edge.
  for (let x = 7; x < w - 8; x += 13) {
    const seed = x + id * 77, r = noise(seed);
    drawBoulder(c, x, 6 + r * 5, 8 + r * 12, 4 + r * 6, seed, theme);
  }
  if (theme === 'snow') {
    c.beginPath(); c.moveTo(1, 1);
    for (let x = 1; x < w; x += 6) c.lineTo(x, -2 - noise(x + id) * 2);
    c.lineTo(w - 1, 2);
    for (let x = w - 1; x > 0; x -= 7) c.lineTo(x, 4 + noise(x * 2 + id) * 8);
    c.closePath(); c.fillStyle = gradient(c, 0, -5, 0, 15, [[0, '#fafbf5'], [.4, '#e0e9e7'], [1, '#849fa9']]); c.fill();
    for (let x = 10; x < w - 10; x += 6) {
      c.fillStyle = noise(x) > .5 ? '#fffdf981' : '#80979c3a'; c.fillRect(x, noise(x + id) * 4, 1, .7);
    }
  } else {
    stroke(c, [[1, 1], [w - 1, 1]], p.top, 1.4);
    for (let x = 6; x < w - 6; x += theme === 'meadow' ? 4 : 23) {
      grass(c, x, 2, x * 2 + id * 32, p.grass, theme === 'meadow' ? .65 + noise(x) * .4 : .4);
    }
    if (theme === 'meadow') {
      for (let x = 29; x < w - 30; x += 108) {
        grass(c, x, 2, x + id * 67, p.grass, 1.3);
        drawBoulder(c, x + 23, 0, 14, 6, x, theme);
      }
    }
  }
  return buffer;
}

export function drawPlatform(c, plat, theme) {
  const key = `${theme}:${plat.id}:${plat.w}:${plat.y}`;
  if (!terrainCache.has(key)) terrainCache.set(key, terrain(plat, theme));
  c.drawImage(terrainCache.get(key), plat.x - 26, plat.y - 26);
}

export function drawHiker(c, x, feet, facing = 1, speed = 0, air = false, scale = 1, time = 0, alpha = 1) {
  c.save(); c.translate(x, feet); c.scale(facing * scale, scale); c.globalAlpha = alpha;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const stride = air ? -.55 : Math.sin(time * 13) * Math.min(1, Math.abs(speed) / 220);
  const bob = air ? 0 : Math.abs(stride) * 1.4;
  c.translate(Math.abs(speed) > 80 ? 1 : 0, -bob);
  const leg = (side, near) => {
    const step = stride * side, hip = near ? 3 : -3;
    const knee = hip + step * 7 + (air ? 5 : 0), ankle = hip + step * 12 - 1;
    const points = [[hip, -27], [knee, -14 + Math.max(0, step) * 2], [ankle, -3 - Math.max(0, -step) * 3]];
    stroke(c, points, near ? '#3e4749' : '#242d30', 6);
    stroke(c, points.map(([px, py]) => [px + 1.1, py]), near ? '#697174' : '#475155', 1.4);
    ellipse(c, knee + 1, points[1][1], 2.3, 3.2, near ? '#4d5657' : '#303a3c');
    const fy = points[2][1];
    shape(c, [[ankle - 3, fy - 2], [ankle + 2, fy - 2], [ankle + 3, fy], [ankle + 8, fy + 1], [ankle + 8, fy + 3], [ankle - 3, fy + 3]], '#3d3730');
    stroke(c, [[ankle - 3, fy + 3], [ankle + 8, fy + 3]], '#a39b82', 1.2);
    stroke(c, [[ankle + 1, fy], [ankle + 4, fy + 1]], '#b2a68b', .7);
  };
  leg(-1, false);
  // Far sleeve and pole.
  stroke(c, [[1, -43], [-4 - stride * 4, -33], [2 - stride * 6, -28]], '#86472d', 4);
  leg(1, true);
  // Shaped waterproof jacket, lit from upper right.
  c.beginPath(); c.moveTo(-5, -46); c.quadraticCurveTo(4, -49, 8, -42); c.lineTo(9, -28);
  c.quadraticCurveTo(0, -24, -8, -27); c.lineTo(-9, -39); c.quadraticCurveTo(-8, -44, -5, -46);
  c.fillStyle = gradient(c, -10, -35, 10, -40, [[0, '#803d25'], [.45, '#b86136'], [.85, '#df9c61'], [1, '#b96b3e']]); c.fill();
  stroke(c, [[5, -44], [6, -29]], '#f3c18a99', .8);
  stroke(c, [[-5, -32], [0, -34], [4, -32]], '#6a392f88', .8);
  stroke(c, [[-7, -27], [8, -28]], '#654431', 1.7);
  // Padded expedition pack with top flap, straps, seams and a rolled mat.
  c.fillStyle = gradient(c, -19, -40, -4, -40, [[0, '#3f483c'], [.55, '#7b805b'], [1, '#a9aa78']]);
  c.beginPath(); c.roundRect(-17, -47, 12, 25, [5, 4, 3, 4]); c.fill();
  c.fillStyle = '#acaf85'; c.beginPath(); c.roundRect(-18, -48, 13, 5, 2); c.fill();
  stroke(c, [[-15, -42], [-14, -25]], '#383f32', 1.7);
  stroke(c, [[-7, -44], [-1, -41], [-2, -29], [-8, -28]], '#b8ae83', 1.8);
  stroke(c, [[-17, -33], [-6, -33]], '#303e33', 1.2);
  c.fillStyle = '#888d7e'; c.beginPath(); c.roundRect(-19, -25, 13, 4, 1.7); c.fill();
  // Neck, realistic small profile and brimmed hiking cap.
  stroke(c, [[2, -45], [2, -50]], '#ba8663', 3.5);
  c.fillStyle = gradient(c, 0, -54, 7, -51, [[0, '#b17d5e'], [1, '#e3b78c']]);
  c.beginPath(); c.moveTo(-1, -57); c.quadraticCurveTo(6, -59, 7, -54); c.lineTo(9, -52); c.lineTo(7, -51);
  c.lineTo(7, -48); c.quadraticCurveTo(2, -46, 0, -51); c.closePath(); c.fill();
  c.fillStyle = '#666f61'; c.beginPath(); c.roundRect(-3, -60, 10, 5, [4, 4, 1, 1]); c.fill();
  stroke(c, [[-4, -55], [11, -55]], '#858b77', 1.8);
  stroke(c, [[6, -53.5], [7.2, -53.5]], '#313737', .8);
  ellipse(c, .5, -52, 1.3, 1.8, '#d5a27c');
  // Near sleeve, gloved hand and trekking pole.
  const elbow = 11 - stride * 3, hand = 15 - stride * 5;
  stroke(c, [[5, -42], [elbow, -34], [hand, -29]], '#b56c40', 5.5);
  stroke(c, [[7, -42], [elbow + 1, -35], [hand, -30]], '#e5ab72', 1.3);
  ellipse(c, hand, -28, 2.3, 2.7, '#5a5547');
  stroke(c, [[hand, -29], [hand + 8 + stride * 4, -1]], '#c4c7b7', 1.1);
  stroke(c, [[hand, -30], [hand + 1, -25]], '#333b37', 2);
  c.restore();
}

export function drawTent(c, camp, active) {
  const { x, y } = camp;
  c.save(); c.translate(x, y);
  ellipse(c, 0, 2, 57, 6, '#1a252653');
  // Curved poles, tensioned fabric panels and stitched entrance.
  c.beginPath(); c.moveTo(-48, 0); c.bezierCurveTo(-39, -28, -25, -58, -5, -57);
  c.bezierCurveTo(23, -60, 40, -24, 49, 0); c.closePath();
  c.fillStyle = gradient(c, -45, -20, 42, -40, [[0, '#72562c'], [.3, '#b89544'], [.7, '#e0c174'], [1, '#b29145']]); c.fill();
  c.beginPath(); c.moveTo(-45, -1); c.quadraticCurveTo(-28, -43, -5, -57); c.quadraticCurveTo(3, -25, 17, 0); c.closePath();
  c.fillStyle = gradient(c, -30, -15, 15, -15, [[0, '#bb9644'], [.55, '#cfad63'], [1, '#8e7036']]); c.fill();
  c.beginPath(); c.moveTo(-31, 0); c.quadraticCurveTo(-19, -38, -7, -45); c.quadraticCurveTo(-3, -21, 7, 0); c.closePath(); c.fillStyle = '#29332d'; c.fill();
  c.beginPath(); c.moveTo(-28, -2); c.quadraticCurveTo(-17, -32, -7, -42); c.lineTo(-11, -1); c.closePath(); c.fillStyle = '#b99b59'; c.fill();
  stroke(c, [[-7, -42], [-11, -1]], '#e9d39a', .8);
  c.beginPath(); c.moveTo(-47, 0); c.bezierCurveTo(-32, -34, -25, -58, -5, -57); c.bezierCurveTo(22, -58, 36, -31, 48, 0); c.strokeStyle = '#efe0b5'; c.lineWidth = 1.3; c.stroke();
  stroke(c, [[-5, -56], [17, -1]], '#e1ce92', .9);
  stroke(c, [[-42, -17], [-63, 2]], '#d9d8bca8', .7); stroke(c, [[38, -19], [64, 3]], '#d9d8bca8', .7);
  stroke(c, [[-48, 0], [49, 0]], '#575c44', 3);
  for (let i = 0; i < 5; i++) stroke(c, [[14 + i * 6, -23 + i * 3], [16 + i * 6, -4]], '#735b3038', .7);
  const lamp = c.createRadialGradient(56, -20, 1, 56, -20, active ? 54 : 28);
  lamp.addColorStop(0, '#ffe8a491'); lamp.addColorStop(1, '#ffe8a400'); c.fillStyle = lamp; c.fillRect(0, -75, 112, 110);
  stroke(c, [[56, 0], [56, -27]], '#6a715f', 1.6);
  c.fillStyle = '#3f4a42'; c.fillRect(52, -26, 8, 13); c.fillStyle = '#f3cf7a'; c.fillRect(53, -23, 6, 8);
  c.font = '10px "Segoe UI","Microsoft YaHei",sans-serif'; c.textAlign = 'center'; c.shadowColor = '#152226'; c.shadowBlur = 5;
  c.fillStyle = active ? '#ffe2a4' : '#f0e9ce'; c.fillText(active ? '已记录' : '避风点', 0, -74);
  c.restore();
}
