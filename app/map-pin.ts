export function locationPin(color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo dibujar el pin del avalúo.');

  ctx.save();
  ctx.translate(56, 68);
  ctx.scale(1, 0.34);
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
  shadow.addColorStop(0, `${color}78`);
  shadow.addColorStop(1, `${color}00`);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = `${color}80`;
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 7;
  ctx.beginPath();
  ctx.moveTo(56, 122);
  ctx.bezierCurveTo(49, 105, 27, 79, 27, 51);
  ctx.arc(56, 51, 29, Math.PI, 0);
  ctx.bezierCurveTo(85, 79, 63, 105, 56, 122);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  const face = ctx.createRadialGradient(45, 35, 2, 56, 52, 30);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(0.2, '#ffffffed');
  face.addColorStop(1, '#eef7f5');
  ctx.beginPath();
  ctx.arc(56, 51, 18, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = `${color}cc`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(49, 43, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
