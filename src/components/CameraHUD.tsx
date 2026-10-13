import React, { useState } from 'react';
import {
  Zap,
  ZapOff,
  RotateCcw,
  Sliders,
  Folder as FolderIcon,
  Tag,
  Grid,
  Timer,
  Compass,
  Mountain,
  MapPin,
  ChevronDown,
  Edit2,
  Check,
  Smartphone,
  Layers,
} from 'lucide-react';
import { CameraSettings, Folder, PhotoCoordinates, StampSettings } from '../types';
import { headingToCardinal } from '../utils/coordinates';

interface CameraHUDProps {
  settings: CameraSettings;
  onUpdateCameraSettings: (settings: CameraSettings) => void;
  stampSettings: StampSettings;
  onOpenStampModal: () => void;
  onOpenFolderModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenGalleryModal: () => void;
  onOpenTestPhoneModal: () => void;
  activeFolder: Folder;
  coords: PhotoCoordinates;
  hasRealFix: boolean;
  isStreaming: boolean;
  hasTorch: boolean;
  isTorchOn: boolean;
  onToggleTorch: () => void;
  onToggleFacingMode: () => void;
  zoomLevel: number;
  onApplyZoom: (val: number) => void;
  minZoom: number;
  maxZoom: number;
  onCapture: (notes: string, pointName: string) => void;
  isCapturing: boolean;
  lastPhotoThumb?: string;
  totalPhotosCount: number;
  isMockCamera: boolean;
}

export const CameraHUD: React.FC<CameraHUDProps> = ({
  settings,
  onUpdateCameraSettings,
  stampSettings,
  onOpenStampModal,
  onOpenFolderModal,
  onOpenSettingsModal,
  onOpenGalleryModal,
  onOpenTestPhoneModal,
  activeFolder,
  coords,
  hasRealFix,
  hasTorch,
  isTorchOn,
  onToggleTorch,
  onToggleFacingMode,
  zoomLevel,
  onApplyZoom,
  minZoom,
  maxZoom,
  onCapture,
  isCapturing,
  lastPhotoThumb,
  totalPhotosCount,
  isMockCamera,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [isEditingQuickNote, setIsEditingQuickNote] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Cycle aspect ratio
  const cycleAspectRatio = () => {
    const next: CameraSettings['aspectRatio'] =
      settings.aspectRatio === '4:3'
        ? '16:9'
        : settings.aspectRatio === '16:9'
        ? '1:1'
        : '4:3';
    onUpdateCameraSettings({ ...settings, aspectRatio: next });
  };

  // Cycle timer
  const cycleTimer = () => {
    const next: CameraSettings['timerSeconds'] =
      settings.timerSeconds === 0
        ? 3
        : settings.timerSeconds === 3
        ? 5
        : settings.timerSeconds === 5
        ? 10
        : 0;
    onUpdateCameraSettings({ ...settings, timerSeconds: next });
  };

  // Trigger capture with optional countdown
  const handleShutterPress = () => {
    if (isCapturing || countdown !== null) return;

    if (settings.timerSeconds > 0) {
      let count = settings.timerSeconds;
      setCountdown(count);

      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          setCountdown(null);
          const currentPointName = `${stampSettings.pointPrefix} #${stampSettings.pointCounter.toString().padStart(2, '0')}`;
          onCapture(quickNote, currentPointName);
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      const currentPointName = `${stampSettings.pointPrefix} #${stampSettings.pointCounter.toString().padStart(2, '0')}`;
      onCapture(quickNote, currentPointName);
    }
  };

  const pointLabel = `${stampSettings.pointPrefix} #${stampSettings.pointCounter.toString().padStart(2, '0')}`;

  // Compass cardinal string
  const compassHeadingStr = headingToCardinal(coords.heading);

  // Artificial horizon level check (pitch and roll close to zero)
  const isLevel =
    Math.abs(coords.pitch || 0) <= 2 && Math.abs(coords.roll || 0) <= 2;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between select-none">
      {/* ================= TOP CONTROLS BAR ================= */}
      <div className="w-full bg-gradient-to-b from-black/85 via-black/50 to-transparent p-3 pt-safe pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Active Folder Selector Pill */}
          <button
            onClick={onOpenFolderModal}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg transition active:scale-95 max-w-[200px] cursor-pointer"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: activeFolder.color }}
            />
            <span className="truncate">{activeFolder.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Flash / Torch Toggle */}
            <button
              onClick={onToggleTorch}
              className={`p-2 rounded-full backdrop-blur-md border transition active:scale-95 cursor-pointer ${
                isTorchOn
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:text-white'
              }`}
              title="Lanterna / Flash"
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-amber-300" /> : <ZapOff className="w-4 h-4" />}
            </button>

            {/* Aspect Ratio Button */}
            <button
              onClick={cycleAspectRatio}
              className="px-2.5 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-700/70 backdrop-blur-md text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
              title="Proporção da foto"
            >
              {settings.aspectRatio}
            </button>

            {/* Timer Toggle */}
            <button
              onClick={cycleTimer}
              className={`p-2 rounded-full backdrop-blur-md border transition active:scale-95 cursor-pointer ${
                settings.timerSeconds > 0
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                  : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:text-white'
              }`}
              title="Temporizador"
            >
              <div className="flex items-center gap-0.5 text-xs">
                <Timer className="w-4 h-4" />
                {settings.timerSeconds > 0 && <span>{settings.timerSeconds}s</span>}
              </div>
            </button>

            {/* Stamp Customizer Button */}
            <button
              onClick={onOpenStampModal}
              className={`p-2 rounded-full backdrop-blur-md border transition active:scale-95 cursor-pointer ${
                stampSettings.enabled
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-900/70 border-slate-700/70 text-slate-400'
              }`}
              title="Configurar Legenda / Carimbo"
            >
              <Tag className="w-4 h-4" />
            </button>

            {/* Test on Phone (QR Code) Button */}
            <button
              onClick={onOpenTestPhoneModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/80 backdrop-blur-md text-emerald-300 transition active:scale-95 cursor-pointer text-xs font-semibold"
              title="Como testar no celular (QR Code)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">No Celular</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              className="p-2 rounded-full bg-slate-900/70 hover:bg-slate-800 border border-slate-700/70 backdrop-blur-md text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
              title="Configurações gerais"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GPS Live Telemetry Pill */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono bg-black/60 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 shadow-sm">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${hasRealFix ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="truncate">
              {stampSettings.coordFormat === 'utm'
                ? coords.utmFormatted
                : stampSettings.coordFormat === 'gms'
                ? coords.dmsFormatted
                : coords.decimalFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
            {coords.altitude !== null && (
              <span className="flex items-center gap-0.5 text-amber-300">
                <Mountain className="w-3 h-3" />
                {coords.altitude.toFixed(0)}m
              </span>
            )}
            <span className="flex items-center gap-0.5 text-sky-300">
              <Compass className="w-3 h-3" />
              {compassHeadingStr}
            </span>
          </div>
        </div>
      </div>

      {/* ================= VIEWFINDER OVERLAYS & HUD ================= */}
      <div className="relative flex-1 flex flex-col justify-between p-4 pointer-events-none">
        {/* Mock camera alert pill if running in simulated mode */}
        {isMockCamera && (
          <div className="self-center bg-amber-500/90 text-slate-950 font-bold px-3 py-1 rounded-full text-[11px] shadow-lg flex items-center gap-1.5 pointer-events-auto">
            <span>Simulador de Campo Ativo (Sem Câmera Física)</span>
          </div>
        )}

        {/* Artificial Horizon / Level Indicator */}
        {settings.gridMode === 'level' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition duration-150 ${
                isLevel
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                  : 'border-white/40 bg-black/10'
              }`}
            >
              {/* Pitch/Roll horizon cross lines */}
              <div
                className="w-full h-0.5 bg-current transition-transform duration-100"
                style={{
                  transform: `rotate(${-coords.roll!}deg)`,
                  backgroundColor: isLevel ? '#34d399' : 'rgba(255,255,255,0.6)',
                }}
              />
              <div
                className="w-3 h-3 rounded-full absolute transition-all duration-100 shadow-md"
                style={{
                  transform: `translate(${Math.min(50, Math.max(-50, (coords.roll || 0) * 1.5))}px, ${Math.min(50, Math.max(-50, (coords.pitch || 0) * 1.5))}px)`,
                  backgroundColor: isLevel ? '#34d399' : '#f87171',
                }}
              />
            </div>
            <div className="absolute mt-36 font-mono text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
              Nível: {Math.round(coords.pitch || 0)}° / {Math.round(coords.roll || 0)}°
            </div>
          </div>
        )}

        {/* Rule of Thirds Grid */}
        {settings.gridMode === 'thirds' && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>
        )}

        {/* Crosshair / Reticle */}
        {settings.gridMode === 'crosshair' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border border-sky-400/60 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <div className="absolute w-20 h-[1px] bg-sky-400/40" />
              <div className="absolute h-20 w-[1px] bg-sky-400/40" />
            </div>
          </div>
        )}

        {/* Countdown Large Display */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-8xl font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-ping">
              {countdown}
            </div>
          </div>
        )}

        {/* Quick Note Bar above stamp */}
        <div className="self-center w-full max-w-sm pointer-events-auto mt-auto mb-2">
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 text-xs text-slate-200 shadow-xl">
            <span className="font-bold text-sky-400 px-1.5 py-0.5 bg-sky-950/60 rounded text-[11px] truncate">
              {pointLabel}
            </span>
            {isEditingQuickNote ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Nota (ex: Fissura viga, Ponto 3)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => setIsEditingQuickNote(false)}
                  className="p-1 rounded bg-sky-500 text-slate-950 hover:bg-sky-400"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingQuickNote(true)}
                className="flex-1 flex items-center justify-between text-slate-400 hover:text-slate-200 cursor-pointer px-1 truncate"
              >
                <span className="truncate italic text-[11px]">
                  {quickNote ? `"${quickNote}"` : 'Toque para adicionar observação...'}
                </span>
                <Edit2 className="w-3 h-3 flex-shrink-0 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* LIVE STAMP PREVIEW ON VIEWFINDER */}
        {stampSettings.enabled && (
          <div
            className={`w-full max-w-md self-center p-2 rounded-lg bg-black/80 backdrop-blur-sm border-l-2 text-[10px] font-mono text-slate-200 space-y-0.5 shadow-2xl pointer-events-auto ${
              stampSettings.position === 'top' ? 'order-first mb-auto mt-2' : ''
            }`}
            style={{ borderColor: stampSettings.accentColor }}
            onClick={onOpenStampModal}
          >
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span className="truncate">
                [{activeFolder.name}] • {pointLabel}
              </span>
              <span className="text-[9px] text-slate-400 font-sans">CARIMBO ATIVO</span>
            </div>
            {stampSettings.showDateTime && (
              <div className="text-slate-300">
                🕒 {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}
              </div>
            )}
            {stampSettings.showCoords && (
              <div className="text-sky-300 font-semibold truncate">
                📍 {stampSettings.coordFormat === 'utm' ? coords.utmFormatted : stampSettings.coordFormat === 'gms' ? coords.dmsFormatted : coords.decimalFormatted}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400 text-[9px]">
              {stampSettings.showAltitude && <span>Alt: {coords.altitude?.toFixed(0) || '--'}m</span>}
              {stampSettings.showAccuracy && <span>Acc: ±{coords.accuracy?.toFixed(1) || '--'}m</span>}
              {stampSettings.showHeading && <span>Az: {compassHeadingStr}</span>}
              {quickNote && <span className="text-amber-300 truncate">Obs: {quickNote}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ================= BOTTOM CONTROLS & SHUTTER ================= */}
      <div className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pb-safe pointer-events-auto flex flex-col gap-3">
        {/* Zoom Quick Selector Pills */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 5].map((level) => (
            <button
              key={level}
              onClick={() => onApplyZoom(level)}
              className={`w-9 h-7 rounded-full text-xs font-bold transition active:scale-90 cursor-pointer ${
                zoomLevel === level
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              {level}x
            </button>
          ))}
        </div>

        {/* Shutter Bar */}
        <div className="flex items-center justify-around max-w-sm mx-auto w-full">
          {/* Gallery Thumbnail Shortcut */}
          <button
            onClick={onOpenGalleryModal}
            className="group relative w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700/80 overflow-hidden shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
            title="Galeria de fotos de campo"
          >
            {lastPhotoThumb ? (
              <img
                src={lastPhotoThumb}
                alt="Última foto"
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
            ) : (
              <Layers className="w-5 h-5 text-slate-400" />
            )}
            {totalPhotosCount > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[16px] h-4 rounded-full bg-sky-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {totalPhotosCount}
              </span>
            )}
          </button>

          {/* MAIN TACTILE SHUTTER BUTTON */}
          <button
            onClick={handleShutterPress}
            disabled={isCapturing}
            className="relative w-20 h-20 rounded-full border-4 border-white/90 bg-transparent flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.3)] transition active:scale-90 cursor-pointer group"
            title="Disparar foto com carimbo"
          >
            {/* Inner Shutter Core */}
            <div
              className={`w-16 h-16 rounded-full transition duration-150 ${
                isCapturing
                  ? 'bg-sky-400 scale-75 animate-pulse'
                  : 'bg-white group-active:scale-90 group-hover:bg-slate-100'
              }`}
            />
          </button>

          {/* Camera Flip (Rear / Front) */}
          <button
            onClick={onToggleFacingMode}
            className="w-13 h-13 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
            title="Inverter câmera (Traseira / Frontal)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
