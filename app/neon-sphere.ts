// One reusable sprite per value band: translucent bubble with a luminous rim.
export function neonSphere(color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo dibujar el marcador del avalúo.');
  const halo = ctx.createRadialGradient(64, 64, 29, 64, 64, 61);
  halo.addColorStop(0, `${color}78`);
  halo.addColorStop(0.58, `${color}28`);
  halo.addColorStop(1, `${color}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 128, 128);

  ctx.save();
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.clip();

  const surface = ctx.createRadialGradient(48, 41, 1, 65, 66, 39);
  surface.addColorStop(0, '#ffffffa8');
  surface.addColorStop(0.14, `${color}42`);
  surface.addColorStop(0.52, `${color}12`);
  surface.addColorStop(0.78, `${color}24`);
  surface.addColorStop(1, `${color}a8`);
  ctx.fillStyle = surface;
  ctx.fillRect(28, 28, 72, 72);

  const refraction = ctx.createLinearGradient(41, 38, 88, 91);
  refraction.addColorStop(0, '#ffffff90');
  refraction.addColorStop(0.45, `${color}10`);
  refraction.addColorStop(1, `${color}70`);
  ctx.strokeStyle = refraction;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(64, 64, 29, 0.45, 2.55);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.strokeStyle = `${color}f0`;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#ffffffa8';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(64, 64, 27, 3.55, 4.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(49, 44, 6.5, 3.2, -0.65, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffffd9';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(43, 54, 2.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffffa0';
  ctx.fill();

  return ctx.getImageData(0, 0, 128, 128);
}
