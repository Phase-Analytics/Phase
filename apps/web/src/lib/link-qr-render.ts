import QRCode from 'qrcode';

const LOGO_SRC = '/web-app-manifest-512x512.png';
const LOGO_SIZE_RATIO = 0.2;
const MARGIN_MODULES = 2;
const MODULE_GAP_RATIO = 0.06;
const MODULE_CORNER_RADIUS_RATIO = 0.24;

type QrRenderOptions = {
  width: number;
  pixelRatio?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawRoundedSquareModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const radius = Math.min(size * MODULE_CORNER_RADIUS_RATIO, size / 2 - 0.5);
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

export async function renderStyledLinkQrDataUrl(
  text: string,
  options: QrRenderOptions
): Promise<string> {
  const { width, errorCorrectionLevel = 'H' } = options;
  const pixelRatio = options.pixelRatio ?? 2;
  const canvasSize = Math.round(width * pixelRatio);

  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { modules } = qr;
  const moduleCount = modules.size;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const cellSize = canvasSize / (moduleCount + MARGIN_MODULES * 2);
  const moduleSize = cellSize * (1 - MODULE_GAP_RATIO);
  const moduleOffset = (cellSize - moduleSize) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = '#0a0a0a';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!modules.get(row, col)) {
        continue;
      }

      const x = (col + MARGIN_MODULES) * cellSize + moduleOffset;
      const y = (row + MARGIN_MODULES) * cellSize + moduleOffset;
      drawRoundedSquareModule(ctx, x, y, moduleSize);
    }
  }

  try {
    const logo = await loadImage(LOGO_SRC);
    const logoSize = canvasSize * LOGO_SIZE_RATIO;
    const pad = logoSize * 0.18;
    const boxSize = logoSize + pad * 2;
    const boxX = (canvasSize - boxSize) / 2;
    const boxY = (canvasSize - boxSize) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, boxSize * 0.14);
    ctx.fill();

    ctx.drawImage(logo, boxX + pad, boxY + pad, logoSize, logoSize);
  } catch {
    // logo optional
  }

  return canvas.toDataURL('image/png');
}
