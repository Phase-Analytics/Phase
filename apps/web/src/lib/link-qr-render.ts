import type { QRCode as QRCodeType } from 'qrcode';
import QRCode from 'qrcode';

const LOGO_SRC = '/web-app-manifest-512x512.png';
const LOGO_SIZE_RATIO = 0.22;
const MARGIN_MODULES = 2;
const MODULE_RADIUS_RATIO = 0.45;

type QrRenderOptions = {
  width: number;
  pixelRatio?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
};

type Neighbors = {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function isDark(
  modules: QRCodeType['modules'],
  row: number,
  col: number
): boolean {
  if (row < 0 || col < 0 || row >= modules.size || col >= modules.size) {
    return false;
  }
  return Boolean(modules.get(row, col));
}

function isInLogoClearZone(
  row: number,
  col: number,
  moduleCount: number,
  clearRadius: number
): boolean {
  const center = (moduleCount - 1) / 2;
  return (
    Math.abs(row - center) <= clearRadius &&
    Math.abs(col - center) <= clearRadius
  );
}

type RoundRectCornersOptions = {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  radii: { tl: number; tr: number; br: number; bl: number };
};

function drawRoundRectCorners(options: RoundRectCornersOptions) {
  const { ctx, x, y, width, height, radii } = options;
  const maxR = Math.min(width, height) / 2;
  const tl = Math.min(radii.tl, maxR);
  const tr = Math.min(radii.tr, maxR);
  const br = Math.min(radii.br, maxR);
  const bl = Math.min(radii.bl, maxR);

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
  ctx.fill();
}

type LiquidModuleOptions = {
  ctx: CanvasRenderingContext2D;
  modules: QRCodeType['modules'];
  row: number;
  col: number;
  cellSize: number;
  margin: number;
};

function drawLiquidModule(options: LiquidModuleOptions) {
  const { ctx, modules, row, col, cellSize, margin } = options;
  const neighbors: Neighbors = {
    top: isDark(modules, row - 1, col),
    bottom: isDark(modules, row + 1, col),
    left: isDark(modules, row, col - 1),
    right: isDark(modules, row, col + 1),
  };

  const radius = cellSize * MODULE_RADIUS_RATIO;
  const x = (col + margin) * cellSize;
  const y = (row + margin) * cellSize;

  drawRoundRectCorners({
    ctx,
    x,
    y,
    width: cellSize,
    height: cellSize,
    radii: {
      tl: neighbors.top || neighbors.left ? 0 : radius,
      tr: neighbors.top || neighbors.right ? 0 : radius,
      br: neighbors.bottom || neighbors.right ? 0 : radius,
      bl: neighbors.bottom || neighbors.left ? 0 : radius,
    },
  });
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
  const logoClearRadius = Math.ceil((moduleCount * LOGO_SIZE_RATIO) / 2) + 1;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }

  const cellSize = canvasSize / (moduleCount + MARGIN_MODULES * 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = '#0a0a0a';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!modules.get(row, col)) {
        continue;
      }
      if (isInLogoClearZone(row, col, moduleCount, logoClearRadius)) {
        continue;
      }

      drawLiquidModule({
        ctx,
        modules,
        row,
        col,
        cellSize,
        margin: MARGIN_MODULES,
      });
    }
  }

  try {
    const logo = await loadImage(LOGO_SRC);
    const logoSize = canvasSize * LOGO_SIZE_RATIO;
    const logoX = (canvasSize - logoSize) / 2;
    const logoY = (canvasSize - logoSize) / 2;
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  } catch {
    // logo optional
  }

  return canvas.toDataURL('image/png');
}
