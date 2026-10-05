import { GeotagSettings, LocationData } from '../types';
import { generateMapThumbnail } from './mapTiles';

export async function renderGeotaggedImage(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  location: LocationData,
  settings: GeotagSettings
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = sourceImage.width;
  const height = sourceImage.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Draw original photo
  ctx.drawImage(sourceImage, 0, 0, width, height);

  // Responsive scale factor based on minimum dimension of the photo
  const minDim = Math.min(width, height);
  const isPortrait = height >= width;

  // Multiplier from settings (default large for high readability on phone cameras)
  const sizeMultiplier =
    settings.stampSize === 'extra-large' ? 1.45 : settings.stampSize === 'normal' ? 1.0 : 1.25;

  // Sizing metrics
  const marginX = Math.round(minDim * 0.035);
  const bottomMargin = Math.round(minDim * 0.035);
  const cardGap = Math.round(minDim * 0.022);
  const textPadding = Math.round(minDim * 0.028 * sizeMultiplier);

  // In portrait: overlay spans across width; In landscape: sized proportionally
  const totalAvailableWidth = isPortrait
    ? width - marginX * 2
    : Math.min(width - marginX * 2, Math.round(minDim * 1.15 * sizeMultiplier));

  // Left Map Card is ~30% of available width
  const mapSize = settings.showMap ? Math.round(totalAvailableWidth * 0.30) : 0;
  const rightAreaWidth = totalAvailableWidth - (mapSize > 0 ? mapSize + cardGap : 0);
  const contentWidth = rightAreaWidth - textPadding * 2;

  // Typography scale factors
  const titleFontSize = Math.round(minDim * 0.038 * sizeMultiplier);
  const subFontSize = Math.round(minDim * 0.026 * sizeMultiplier);
  const coordFontSize = Math.round(minDim * 0.025 * sizeMultiplier);
  const timeFontSize = Math.round(minDim * 0.023 * sizeMultiplier);
  const lineSpacing = Math.round(minDim * 0.012 * sizeMultiplier);

  // 2. Render Google Satellite map thumbnail at high DPI
  let mapCanvas: HTMLCanvasElement | null = null;
  if (settings.showMap) {
    try {
      mapCanvas = await generateMapThumbnail(
        location.latitude,
        location.longitude,
        settings.mapZoom || 16,
        mapSize * 2, // 2x DPI for crispness
        mapSize * 2,
        settings.mapType || 'google-satellite'
      );
    } catch (e) {
      console.warn('Map thumbnail generation failed in renderer:', e);
    }
  }

  // 3. Measure Text Lines & Calculate Heights
  ctx.font = `700 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const titleLines = wrapText(ctx, location.title || 'Makrandpur Bantha, Uttar Pradesh, भारत 🇮🇳', contentWidth);

  let textBlockHeight = titleLines.length * (titleFontSize + lineSpacing * 0.4);

  let subLines: string[] = [];
  if (location.subtitle) {
    ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    subLines = wrapText(ctx, location.subtitle, contentWidth);
    textBlockHeight += lineSpacing + subLines.length * (subFontSize + lineSpacing * 0.3);
  }

  if (settings.showCoordinates) {
    textBlockHeight += lineSpacing + coordFontSize;
  }

  if (settings.showTimestamp) {
    textBlockHeight += lineSpacing + timeFontSize;
  }

  // Align heights: text card height is naturally balanced with map
  const naturalTextHeight = textBlockHeight + textPadding * 2;
  const textCardHeight = Math.max(naturalTextHeight, mapSize);
  const cardRadius = Math.round(minDim * 0.028);

  // Position calculations
  const mapX = marginX;
  const mapY = height - mapSize - bottomMargin;

  const rightX = marginX + (mapSize > 0 ? mapSize + cardGap : 0);
  const rightY = height - textCardHeight - bottomMargin;

  // 4. Draw Badge above the text card on the right
  if (settings.showWatermark) {
    drawBadgeOnRightCard(ctx, rightX + rightAreaWidth, rightY, minDim, sizeMultiplier, settings.watermarkText || 'GPS Map Camera');
  }

  // 5. Draw Left Card: Google Satellite Map
  if (mapCanvas && settings.showMap) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, mapX, mapY, mapSize, mapSize, cardRadius);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.clip();

    ctx.drawImage(mapCanvas, mapX, mapY, mapSize, mapSize);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(1.5, Math.round(minDim * 0.002));
    ctx.stroke();
    ctx.restore();
  }

  // 6. Draw Right Card: Frosted Text Card
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, rightX, rightY, rightAreaWidth, textCardHeight, cardRadius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = Math.max(1.5, Math.round(minDim * 0.002));
  ctx.stroke();

  // Render Text Lines inside Right Card
  let currentY = rightY + textPadding + titleFontSize * 0.85;

  // Line 1: Title lines (Bold white)
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  for (const line of titleLines) {
    ctx.fillText(line, rightX + textPadding, currentY);
    currentY += titleFontSize + lineSpacing * 0.5;
  }

  // Line 2: Subtitle / Address lines
  if (subLines.length > 0) {
    currentY += lineSpacing * 0.4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    for (const line of subLines) {
      ctx.fillText(line, rightX + textPadding, currentY);
      currentY += subFontSize + lineSpacing * 0.4;
    }
  }

  // Line 3: Coordinates line with degree symbols: Lat 26.553478° Long 80.030596°
  if (settings.showCoordinates) {
    currentY += lineSpacing * 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 ${coordFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const coordText = `Lat ${location.latitude.toFixed(6)}° Long ${location.longitude.toFixed(6)}°`;
    ctx.fillText(coordText, rightX + textPadding, currentY);
    currentY += coordFontSize;
  }

  // Line 4: Timestamp line: e.g. "सोमवार, 05/10/2026 10:34 PM GMT +05:30"
  if (settings.showTimestamp) {
    currentY += lineSpacing * 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.font = `500 ${timeFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(location.timestamp, rightX + textPadding, currentY);
  }

  ctx.restore();

  return canvas.toDataURL('image/jpeg', settings.photoQuality || 0.92);
}

// Draw the [📷 GPS Map Camera] badge aligned to the top-right of the text card
function drawBadgeOnRightCard(
  ctx: CanvasRenderingContext2D,
  rightEdgeX: number,
  cardTopY: number,
  minDim: number,
  multiplier: number,
  badgeText: string
) {
  ctx.save();

  const fontSize = Math.round(minDim * 0.024 * multiplier);
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const textWidth = ctx.measureText(badgeText).width;

  const iconBoxSize = Math.round(minDim * 0.032 * multiplier);
  const paddingX = Math.round(minDim * 0.018 * multiplier);
  const paddingY = Math.round(minDim * 0.009 * multiplier);
  const badgeHeight = fontSize + paddingY * 2;
  const badgeWidth = textWidth + iconBoxSize + paddingX * 2 + Math.round(minDim * 0.01);

  const badgeX = rightEdgeX - badgeWidth;
  const badgeY = cardTopY - badgeHeight - Math.round(minDim * 0.012);
  const radius = badgeHeight / 2;

  // Background pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, radius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Camera icon (cyan border, dark background, yellow rim, blue lens)
  const iconX = badgeX + paddingX;
  const iconY = badgeY + (badgeHeight - iconBoxSize) / 2;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#22d3ee'; // Cyan
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  roundRect(ctx, iconX, iconY, iconBoxSize, iconBoxSize, iconBoxSize * 0.25);
  ctx.fill();
  ctx.stroke();

  // Yellow circle rim
  const lensCenterX = iconX + iconBoxSize / 2;
  const lensCenterY = iconY + iconBoxSize / 2;
  ctx.strokeStyle = '#f59e0b'; // Gold / amber
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(lensCenterX, lensCenterY, iconBoxSize * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  // Blue lens core
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(lensCenterX, lensCenterY, iconBoxSize * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // White specular glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(lensCenterX - iconBoxSize * 0.07, lensCenterY - iconBoxSize * 0.07, iconBoxSize * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Badge Text
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, iconX + iconBoxSize + Math.round(minDim * 0.01), badgeY + badgeHeight / 2);

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
