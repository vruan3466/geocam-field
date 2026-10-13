/**
 * Renders technical georeferenced stamps/watermarks onto captured field photos.
 * Ensures razor-sharp vector typography, high contrast, and dynamic scaling
 * regardless of photo resolution.
 */

import { PhotoCoordinates, StampSettings } from '../types';
import { headingToCardinal } from './coordinates';

export interface StampRenderOptions {
  sourceImage: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement;
  coords: PhotoCoordinates;
  settings: StampSettings;
  folderName: string;
  pointName: string;
  operator: string;
  notes: string;
  timestamp: number;
}

/**
 * Draws the stamp onto an offscreen canvas and returns the final stamped image data URL.
 */
export function renderStampedPhoto(options: StampRenderOptions): string {
  const {
    sourceImage,
    coords,
    settings,
    folderName,
    pointName,
    operator,
    notes,
    timestamp,
  } = options;

  let width = 0;
  let height = 0;

  if (sourceImage instanceof HTMLVideoElement) {
    width = sourceImage.videoWidth || 1920;
    height = sourceImage.videoHeight || 1080;
  } else if (sourceImage instanceof HTMLImageElement) {
    width = sourceImage.naturalWidth || sourceImage.width;
    height = sourceImage.naturalHeight || sourceImage.height;
  } else {
    width = sourceImage.width;
    height = sourceImage.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Draw original photo
  ctx.drawImage(sourceImage, 0, 0, width, height);

  // If stamping is disabled, return untouched photo
  if (!settings.enabled) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  // 2. Compute dynamic scale factor based on width (reference base 1280px)
  const scale = Math.max(0.65, Math.min(2.5, width / 1280));
  const padX = Math.round(24 * scale);
  const padY = Math.round(18 * scale);
  const fontSizeHeader = Math.round(20 * scale);
  const fontSizeBody = Math.round(16 * scale);
  const fontSizeMeta = Math.round(14 * scale);
  const iconSize = Math.round(18 * scale);
  const lineHeight = Math.round(24 * scale);

  // Build the lines of metadata
  const lines: { icon: string; title: string; value: string; accent?: boolean }[] = [];

  // Project & Point
  if (settings.showFolder || settings.showPointName) {
    const parts: string[] = [];
    if (settings.showFolder && folderName) parts.push(`[${folderName}]`);
    if (settings.showPointName && pointName) parts.push(pointName);
    lines.push({
      icon: '📁',
      title: 'LOCAL',
      value: parts.join('  •  '),
      accent: true,
    });
  }

  // Date & Time
  if (settings.showDateTime) {
    const d = new Date(timestamp);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const secs = d.getSeconds().toString().padStart(2, '0');
    lines.push({
      icon: '🕒',
      title: 'DATA/HORA',
      value: `${day}/${month}/${year}  ${hours}:${mins}:${secs} (UTC${d.getTimezoneOffset() <= 0 ? '+' : ''}${-d.getTimezoneOffset() / 60})`,
    });
  }

  // Coordinates
  if (settings.showCoords) {
    let coordStr = '';
    if (settings.coordFormat === 'utm') {
      coordStr = coords.utmFormatted;
    } else if (settings.coordFormat === 'gms') {
      coordStr = coords.dmsFormatted;
    } else if (settings.coordFormat === 'decimal') {
      coordStr = coords.decimalFormatted;
    } else {
      // 'all'
      coordStr = `${coords.utmFormatted}  |  ${coords.decimalFormatted}`;
    }

    lines.push({
      icon: '📍',
      title: 'COORDENADAS',
      value: coordStr,
      accent: true,
    });
  }

  // Altitude & GPS Accuracy
  if (settings.showAltitude || settings.showAccuracy) {
    const parts: string[] = [];
    if (settings.showAltitude) {
      parts.push(coords.altitude !== null ? `Alt: ${coords.altitude.toFixed(1)} m` : 'Alt: --');
    }
    if (settings.showAccuracy) {
      parts.push(coords.accuracy !== null ? `Precisão GPS: ±${coords.accuracy.toFixed(1)} m` : 'Precisão: --');
    }
    lines.push({
      icon: '⛰️',
      title: 'ALTIMETRIA',
      value: parts.join('  |  '),
    });
  }

  // Compass Heading & Pitch/Roll
  if (settings.showHeading) {
    const parts: string[] = [];
    if (coords.heading !== null) {
      parts.push(`Azimute: ${headingToCardinal(coords.heading)}`);
    } else {
      parts.push('Azimute: --');
    }
    if (coords.pitch !== null || coords.roll !== null) {
      parts.push(`Nível: P ${Math.round(coords.pitch || 0)}° / R ${Math.round(coords.roll || 0)}°`);
    }
    lines.push({
      icon: '🧭',
      title: 'ORIENTAÇÃO',
      value: parts.join('  |  '),
    });
  }

  // Operator
  if (settings.showOperator && (operator || settings.operatorName)) {
    lines.push({
      icon: '👷',
      title: 'RESPONSÁVEL',
      value: operator || settings.operatorName,
    });
  }

  // Notes
  if (settings.showNotes && notes && notes.trim().length > 0) {
    lines.push({
      icon: '📝',
      title: 'OBSERVAÇÃO',
      value: notes.trim(),
    });
  }

  if (lines.length === 0) {
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  // Calculate box dimensions
  const totalContentHeight = padY * 2 + lines.length * lineHeight + Math.round(12 * scale);
  const isBottom = settings.position === 'bottom';
  const boxY = isBottom ? height - totalContentHeight : 0;

  // 3. Draw Background Overlay
  ctx.save();
  ctx.fillStyle = settings.bgColor || 'rgba(9, 13, 22, 0.88)';
  ctx.fillRect(0, boxY, width, totalContentHeight);

  // Decorative technical border line
  ctx.fillStyle = settings.accentColor || '#38bdf8';
  if (isBottom) {
    ctx.fillRect(0, boxY, width, Math.max(3, Math.round(4 * scale)));
  } else {
    ctx.fillRect(0, boxY + totalContentHeight - Math.max(3, Math.round(4 * scale)), width, Math.max(3, Math.round(4 * scale)));
  }

  // Mini Branding Watermark on corner
  ctx.font = `600 ${fontSizeMeta}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('GEOCAM PRO • CAMPO', width - padX, isBottom ? boxY + padY : boxY + padY);

  // 4. Render lines
  let currentY = boxY + padY;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  lines.forEach((line) => {
    const centerY = currentY + lineHeight / 2;

    // Draw icon
    ctx.font = `${iconSize}px sans-serif`;
    ctx.fillText(line.icon, padX, centerY);

    // Draw category tag
    ctx.font = `700 ${Math.round(fontSizeMeta * 0.9)}px "Courier New", Courier, monospace`;
    ctx.fillStyle = line.accent ? (settings.accentColor || '#38bdf8') : 'rgba(148, 163, 184, 0.9)';
    const tagX = padX + iconSize + Math.round(10 * scale);
    ctx.fillText(`[${line.title}]`, tagX, centerY);

    const tagWidth = ctx.measureText(`[${line.title}]`).width;

    // Draw value
    ctx.font = line.accent
      ? `700 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`
      : `500 ${fontSizeBody}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;
    ctx.fillStyle = line.accent ? '#f8fafc' : (settings.textColor || '#e2e8f0');

    const valueX = tagX + tagWidth + Math.round(12 * scale);
    const maxValWidth = width - valueX - padX - Math.round(120 * scale);

    // Truncate if necessary
    let displayVal = line.value;
    if (ctx.measureText(displayVal).width > maxValWidth) {
      while (displayVal.length > 5 && ctx.measureText(displayVal + '...').width > maxValWidth) {
        displayVal = displayVal.slice(0, -1);
      }
      displayVal += '...';
    }

    ctx.fillText(displayVal, valueX, centerY);

    currentY += lineHeight;
  });

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}
