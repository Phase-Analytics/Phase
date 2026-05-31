import QRCode from 'qrcode';

const LOGO_SRC = '/logo.svg';
const LOGO_SIZE_RATIO = 0.2;
const MARGIN_MODULES = 2;

type QrRenderOptions = {
  width: number;
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

function drawRoundedModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const radius = size * 0.42;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

export async function renderStyledLinkQrDataUrl(
  text: string,
  options: QrRenderOptions
): Promise<string> {
  const { width, errorCorrectionLevel = 'H' } = options;
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { modules } = qr;
  const moduleCount = modules.size;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  const cellSize = width / (moduleCount + MARGIN_MODULES * 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, width);

  ctx.fillStyle = '#0a0a0a';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!modules.get(row, col)) {
        continue;
      }

      const x = (col + MARGIN_MODULES) * cellSize;
      const y = (row + MARGIN_MODULES) * cellSize;
      const inset = cellSize * 0.08;
      drawRoundedModule(ctx, x + inset, y + inset, cellSize - inset * 2);
    }
  }

  try {
    const logo = await loadImage(LOGO_SRC);
    const logoSize = width * LOGO_SIZE_RATIO;
    const pad = logoSize * 0.22;
    const boxSize = logoSize + pad * 2;
    const boxX = (width - boxSize) / 2;
    const boxY = (width - boxSize) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxSize, boxSize, boxSize * 0.18);
    ctx.fill();

    ctx.drawImage(
      logo,
      boxX + pad,
      boxY + pad,
      logoSize,
      logoSize
    );
  } catch {
    // logo optional
  }

  return canvas.toDataURL('image/png');
}
