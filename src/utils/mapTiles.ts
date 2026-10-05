// Map Tile and Static Map Generator with Google Satellite Support
import { MapType } from '../types';

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom);
}

export function getTileUrl(type: MapType, z: number, x: number, y: number, sub: number = 1): string {
  switch (type) {
    case 'google':
      return `https://mt${sub % 4}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}&hl=en`;
    case 'google-terrain':
      return `https://mt${sub % 4}.google.com/vt/lyrs=p&x=${x}&y=${y}&z=${z}&hl=en`;
    case 'satellite':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    case 'streets':
      return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
    case 'osm':
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    case 'google-satellite':
    default:
      // Google Maps Hybrid (Satellite Imagery + Roads) - Exact match to user screenshot
      return `https://mt${sub % 4}.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}&hl=en`;
  }
}

// Generate a high-DPI rendered map thumbnail canvas
export async function generateMapThumbnail(
  lat: number,
  lon: number,
  zoom: number = 16,
  width: number = 280,
  height: number = 280,
  mapType: MapType = 'google-satellite'
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  let loadedOnline = false;

  try {
    const tileXFloat = lonToTileX(lon, zoom);
    const tileYFloat = latToTileY(lat, zoom);

    const centerTileX = Math.floor(tileXFloat);
    const centerTileY = Math.floor(tileYFloat);

    // Calculate sub-tile pixel offset
    const offsetX = (tileXFloat - centerTileX) * 256;
    const offsetY = (tileYFloat - centerTileY) * 256;

    // Load a 3x3 grid around the center tile
    const tilesToLoad: Array<{ x: number; y: number; dx: number; dy: number; sub: number }> = [];
    const maxTile = Math.pow(2, zoom);

    let idx = 0;
    for (let rx = -1; rx <= 1; rx++) {
      for (let ry = -1; ry <= 1; ry++) {
        const tx = (centerTileX + rx + maxTile) % maxTile;
        const ty = centerTileY + ry;
        if (ty >= 0 && ty < maxTile) {
          const dx = width / 2 - offsetX + rx * 256;
          const dy = height / 2 - offsetY + ry * 256;
          tilesToLoad.push({ x: tx, y: ty, dx, dy, sub: idx % 4 });
          idx++;
        }
      }
    }

    const tilePromises = tilesToLoad.map(
      ({ x, y, dx, dy, sub }) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.referrerPolicy = 'no-referrer';

          const primaryUrl = getTileUrl(mapType, zoom, x, y, sub);
          img.src = primaryUrl;

          img.onload = () => {
            try {
              ctx.drawImage(img, dx, dy, 256, 256);
              loadedOnline = true;
            } catch {
              // Ignore draw error
            }
            resolve();
          };

          img.onerror = () => {
            // Secondary fallback to Esri Satellite
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.referrerPolicy = 'no-referrer';
            fallbackImg.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
            fallbackImg.onload = () => {
              try {
                ctx.drawImage(fallbackImg, dx, dy, 256, 256);
                loadedOnline = true;
              } catch {}
              resolve();
            };
            fallbackImg.onerror = () => resolve();
          };

          // Timeout after 3.5s
          setTimeout(resolve, 3500);
        })
    );

    await Promise.all(tilePromises);
  } catch (err) {
    console.warn('Map tile fetching issue:', err);
  }

  // If online tiles failed completely or offline, draw procedural satellite landscape
  if (!loadedOnline) {
    drawProceduralSatelliteMap(ctx, width, height, lat, lon);
  }

  // Draw Camera Directional Cone (soft blue translucent triangle pointing north)
  drawDirectionalCone(ctx, width / 2, height / 2);

  // Draw authentic bold white Google logo on the bottom-center just like user's screenshot
  drawGoogleLogo(ctx, width, height);

  // Draw the classic Red Google Location Pin centered at (width/2, height/2)
  drawMapPin(ctx, width / 2, height / 2);

  return canvas;
}

// Draw the iconic camera directional cone (blue translucent wedge)
function drawDirectionalCone(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);

  const grad = ctx.createRadialGradient(0, 0, 8, 0, -25, 45);
  grad.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
  grad.addColorStop(1, 'rgba(59, 130, 246, 0.02)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.arc(0, -6, 42, -Math.PI * 0.72, -Math.PI * 0.28, false);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Draw Google logo in bold white with subtle dark drop shadow (exact match to screenshot)
function drawGoogleLogo(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const text = 'Google';
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

  const textWidth = ctx.measureText(text).width;
  const x = (width - textWidth) / 2;
  const y = height - 12;

  // Subtle dark shadow behind text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x, y);

  ctx.restore();
}

// Draw procedural satellite landscape if offline
function drawProceduralSatelliteMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lat: number,
  lon: number
) {
  // Rich earth tones (soil, fields, trees like user screenshot)
  ctx.fillStyle = '#655a45';
  ctx.fillRect(0, 0, width, height);

  // Fields and crops
  ctx.fillStyle = '#4a5335';
  ctx.fillRect(0, 0, width * 0.55, height * 0.6);

  ctx.fillStyle = '#7a6a4f';
  ctx.fillRect(width * 0.55, 0, width * 0.45, height * 0.7);

  // Dirt paths / rural roads
  ctx.strokeStyle = '#b8a68b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  ctx.lineTo(width, height * 0.75);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.45, 0);
  ctx.lineTo(width * 0.48, height * 0.72);
  ctx.stroke();

  // Dark green tree patches
  ctx.fillStyle = '#2d3b20';
  for (let i = 0; i < 8; i++) {
    const tx = ((i * 47) % (width - 40)) + 20;
    const ty = ((i * 73) % (height - 40)) + 20;
    ctx.beginPath();
    ctx.arc(tx, ty, 8 + (i % 3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the classic Red Location Pin matching user's screenshot
export function drawMapPin(ctx: CanvasRenderingContext2D, px: number, py: number, scale: number = 1.0) {
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);

  // Pin drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red Pin Body
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-8, -10, -13, -20, -13, -26);
  ctx.arc(0, -26, 13, Math.PI, 0, false);
  ctx.bezierCurveTo(13, -20, 8, -10, 0, 0);
  ctx.closePath();
  ctx.fill();

  // Inner dark red circle
  ctx.fillStyle = '#5c0000';
  ctx.beginPath();
  ctx.arc(0, -26, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
