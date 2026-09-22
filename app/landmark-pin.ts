import type { LandmarkIcon } from './landmarks';

function drawLandmarkSymbol(
  ctx: CanvasRenderingContext2D,
  icon: LandmarkIcon,
  color: string,
) {
  ctx.save();
  ctx.translate(56, 51);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (icon === 'art') {
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(3.8, -3.8);
    ctx.lineTo(13, 0);
    ctx.lineTo(3.8, 3.8);
    ctx.lineTo(0, 13);
    ctx.lineTo(-3.8, 3.8);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-3.8, -3.8);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'heritage') {
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(0, -12);
    ctx.lineTo(13, -2);
    ctx.stroke();
    ctx.strokeRect(-10, -2, 20, 14);
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.lineTo(4, 12);
    ctx.stroke();
  } else if (icon === 'river') {
    for (const offset of [-7, 1, 9]) {
      ctx.beginPath();
      ctx.moveTo(-14, offset);
      ctx.bezierCurveTo(-8, offset - 5, -4, offset + 5, 2, offset);
      ctx.bezierCurveTo(8, offset - 5, 10, offset + 2, 14, offset);
      ctx.stroke();
    }
  } else if (icon === 'nature') {
    ctx.beginPath();
    ctx.moveTo(-11, 8);
    ctx.bezierCurveTo(-12, -7, -2, -14, 12, -11);
    ctx.bezierCurveTo(13, 3, 6, 13, -7, 12);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 11);
    ctx.lineTo(8, -7);
    ctx.stroke();
  } else if (icon === 'community') {
    ctx.beginPath();
    ctx.arc(0, -7, 4.5, 0, Math.PI * 2);
    ctx.arc(-10, -3, 3.5, 0, Math.PI * 2);
    ctx.arc(10, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 12, 10, Math.PI, Math.PI * 2);
    ctx.arc(-10, 11, 7, Math.PI, Math.PI * 1.78);
    ctx.moveTo(3, 7);
    ctx.arc(10, 11, 7, Math.PI * 1.22, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-12, 9);
    ctx.lineTo(9, -12);
    ctx.moveTo(-2, -12);
    ctx.lineTo(9, -12);
    ctx.lineTo(9, -1);
    ctx.stroke();
  }

  ctx.restore();
}

// Pin de hito con símbolo propio por categoría territorial.
export function landmarkPin(color: string, icon: LandmarkIcon): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo dibujar el pin del punto de interés.');

  ctx.save();
  ctx.translate(56, 126);
  ctx.scale(1, 0.3);
  const shadow = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  shadow.addColorStop(0, `${color}70`);
  shadow.addColorStop(1, `${color}00`);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = `${color}70`;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 7;
  ctx.beginPath();
  ctx.moveTo(56, 126);
  ctx.bezierCurveTo(48, 108, 24, 80, 24, 49);
  ctx.arc(56, 49, 32, Math.PI, 0);
  ctx.bezierCurveTo(88, 80, 64, 108, 56, 126);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  const face = ctx.createRadialGradient(45, 36, 2, 56, 51, 28);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(1, '#f5fbf9');
  ctx.beginPath();
  ctx.arc(56, 49, 22, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = '#ffffffcc';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawLandmarkSymbol(ctx, icon, color);

  ctx.beginPath();
  ctx.arc(46, 35, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffffb8';
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
