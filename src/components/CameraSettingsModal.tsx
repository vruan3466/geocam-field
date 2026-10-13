import React, { useState } from 'react';
import {
  X,
  Camera,
  Volume2,
  VolumeX,
  Vibrate,
  Sliders,
  Grid,
  MapPin,
  Save,
  Check,
  Smartphone,
  Navigation,
} from 'lucide-react';
import { CameraSettings, PhotoCoordinates } from '../types';
import { CameraDevice } from '../hooks/useCamera';
import { PWAInstallButton } from './PWAInstallButton';

interface CameraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CameraSettings;
  onUpdateSettings: (newSettings: CameraSettings) => void;
  availableDevices: CameraDevice[];
  currentDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  coords: PhotoCoordinates;
  onManualCoordUpdate: (lat: number, lng: number, alt?: number) => void;
}

export const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableDevices,
  currentDeviceId,
  onSelectDevice,
  coords,
  onManualCoordUpdate,
}) => {
  const [showManualGPS, setShowManualGPS] = useState(false);
  const [customLat, setCustomLat] = useState(coords.lat.toString());
  const [customLng, setCustomLng] = useState(coords.lng.toString());
  const [customAlt, setCustomAlt] = useState(coords.altitude ? coords.altitude.toString() : '760');
  const [gpsSaved, setGpsSaved] = useState(false);

  if (!isOpen) return null;

  const handleChange = <K extends keyof CameraSettings>(
    key: K,
    value: CameraSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleSaveManualGPS = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    const alt = parseFloat(customAlt);
    if (!isNaN(lat) && !isNaN(lng)) {
      onManualCoordUpdate(lat, lng, isNaN(alt) ? undefined : alt);
      setGpsSaved(true);
      setTimeout(() => setGpsSaved(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              Configurações da Câmera
            </h2>
            <p className="text-xs text-slate-400">Preferências do sensor e interface</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Camera Device Selector if multiple cameras exist */}
          {availableDevices.length > 1 && (
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                Lente da Câmera
              </label>
              <select
                value={currentDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
              >
                <option value="">Automático (Padrão do Sistema)</option>
                {availableDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid / Overlay Mode */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-sky-400" />
              Linhas de Grade & Nível
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'Desativado' },
                { id: 'thirds', label: 'Regra dos Terços (3x3)' },
                { id: 'crosshair', label: 'Mira Central (Retículo)' },
                { id: 'level', label: 'Nível de Bolha & Horizonte' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleChange('gridMode', g.id as CameraSettings['gridMode'])}
                  className={`py-2 px-3 rounded-xl border text-center transition font-medium ${
                    settings.gridMode === g.id
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Shutter Click */}
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <div>
                <span className="font-semibold text-white block">Som de Disparo</span>
                <span className="text-[11px] text-slate-400">Efeito mecânico de obturador</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Haptic Vibration */}
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Vibrate className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-semibold text-white block">Vibração Háptica</span>
                <span className="text-[11px] text-slate-400">Feedback tátil ao tirar foto</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.vibrateEnabled}
                onChange={(e) => handleChange('vibrateEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Auto Download on Shot */}
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Save className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white block">Download Automático</span>
                <span className="text-[11px] text-slate-400">Baixar arquivo no celular no disparo</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSaveToDevice}
                onChange={(e) => handleChange('autoSaveToDevice', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Manual GPS Calibrator Toggle */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                Ajuste Manual de Coordenadas (GPS)
              </span>
              <button
                type="button"
                onClick={() => setShowManualGPS(!showManualGPS)}
                className="text-sky-400 text-[11px] font-medium hover:underline"
              >
                {showManualGPS ? 'Ocultar' : 'Ajustar'}
              </button>
            </div>

            {showManualGPS && (
              <form onSubmit={handleSaveManualGPS} className="space-y-2 pt-2 border-t border-slate-850">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (Dec)</label>
                    <input
                      type="number"
                      step="any"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (Dec)</label>
                    <input
                      type="number"
                      step="any"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Altitude (m)</label>
                  <input
                    type="number"
                    step="any"
                    value={customAlt}
                    onChange={(e) => setCustomAlt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                  >
                    {gpsSaved ? <Check className="w-3.5 h-3.5" /> : null}
                    {gpsSaved ? 'Coordenadas Fixadas!' : 'Atualizar Posição'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* PWA App Install Section */}
          <div className="p-3 bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-semibold text-white block">Instalar no Dispositivo</span>
                <span className="text-[10px] text-slate-400">Funciona offline no Android e iOS</span>
              </div>
            </div>
            <PWAInstallButton />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 transition text-xs cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
