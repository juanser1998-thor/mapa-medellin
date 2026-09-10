// One reusable sprite per value band: shaded sphere with luminous wireframe.
export function neonSphere(color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo dibujar el marcador del avalúo.');
  const halo = ctx.createRadialGradient(64, 64, 27, 64, 64, 62);
  halo.addColorStop(0, `${color}a0`);
  halo.addColorStop(0.55, `${color}40`);
  halo.addColorStop(1, `${color}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);
  ctx.save();
  ctx.beginPath();
  ctx.arc(64, 64, 33, 0, Math.PI * 2);
  ctx.clip();
  const surface = ctx.createRadialGradient(49, 44, 2, 67, 70, 43);
  surface.addColorStop(0, '#e8fffa');
  surface.addColorStop(0.2, color);
  surface.addColorStop(0.64, '#133645');
  surface.addColorStop(1, '#030c1b');
  ctx.fillStyle = surface;
  ctx.fillRect(25, 25, 78, 78);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  for (const width of [12, 25, 33]) {
    ctx.beginPath();
    ctx.ellipse(64, 64, width, 33, -0.28, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const offset of [-17, 0, 17]) {
    ctx.beginPath();
    ctx.ellipse(64, 64 + offset, Math.sqrt(33 ** 2 - offset ** 2), 7, -0.28, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(64, 64, 33, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(51, 44, 5, 2.8, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return ctx.getImageData(0, 0, 128, 128);
}
