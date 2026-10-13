import React from 'react';
import { X, Check, MapPin, Clock, Compass, Mountain, Tag, User, AlignLeft, ShieldCheck, Palette } from 'lucide-react';
import { StampSettings } from '../types';
import { CoordinateFormat } from '../utils/coordinates';

interface StampSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StampSettings;
  onUpdateSettings: (newSettings: StampSettings) => void;
  folderName: string;
}

export const StampSettingsModal: React.FC<StampSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  folderName,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof StampSettings>(key: K, value: StampSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const coordFormats: { id: CoordinateFormat; label: string; desc: string }[] = [
    { id: 'utm', label: 'UTM (Recomendado)', desc: 'Fuso, Hemisfério, Easting e Northing (m)' },
    { id: 'gms', label: 'GMS / DMS', desc: 'Graus, Minutos e Segundos (ex: 23°33\'01"S 46°37\'59"O)' },
    { id: 'decimal', label: 'Graus Decimais', desc: 'Latitude e Longitude (ex: -23.550520°, -46.633308°)' },
    { id: 'all', label: 'Completo (UTM + Decimais)', desc: 'Exibe coordenadas UTM e Decimais completas' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400" />
              Configurar Legenda / Carimbo de Campo
            </h2>
            <p className="text-xs text-slate-400">Personalize os dados impressos na imagem</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between bg-slate-850 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="font-semibold text-white text-sm">Gravar Legenda na Foto</span>
              <p className="text-slate-400 text-[11px]">Estampa metadados técnicos diretamente nos pixels da imagem</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Position Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-2">Posição do Carimbo na Foto</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('position', 'bottom')}
                className={`py-2 px-3 rounded-xl border text-center transition font-medium ${
                  settings.position === 'bottom'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Rodapé (Inferior)
              </button>
              <button
                type="button"
                onClick={() => handleChange('position', 'top')}
                className={`py-2 px-3 rounded-xl border text-center transition font-medium ${
                  settings.position === 'top'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Topo (Superior)
              </button>
            </div>
          </div>

          {/* Coordinate System Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-2">
              Sistema de Coordenadas Principal
            </label>
            <div className="space-y-1.5">
              {coordFormats.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleChange('coordFormat', f.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                    settings.coordFormat === f.id
                      ? 'bg-sky-950/60 border-sky-500 text-white'
                      : 'bg-slate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{f.label}</div>
                    <div className="text-[11px] text-slate-400">{f.desc}</div>
                  </div>
                  {settings.coordFormat === f.id && (
                    <div className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fields to include */}
          <div>
            <label className="block font-semibold text-slate-300 mb-2">Campos Inclusos na Legenda</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ToggleItem
                icon={<MapPin className="w-3.5 h-3.5 text-sky-400" />}
                label="Coordenadas GPS"
                checked={settings.showCoords}
                onChange={(val) => handleChange('showCoords', val)}
              />
              <ToggleItem
                icon={<Clock className="w-3.5 h-3.5 text-sky-400" />}
                label="Data e Hora Completa"
                checked={settings.showDateTime}
                onChange={(val) => handleChange('showDateTime', val)}
              />
              <ToggleItem
                icon={<Mountain className="w-3.5 h-3.5 text-amber-400" />}
                label="Altimetria (Altitude)"
                checked={settings.showAltitude}
                onChange={(val) => handleChange('showAltitude', val)}
              />
              <ToggleItem
                icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                label="Precisão do GPS (±m)"
                checked={settings.showAccuracy}
                onChange={(val) => handleChange('showAccuracy', val)}
              />
              <ToggleItem
                icon={<Compass className="w-3.5 h-3.5 text-rose-400" />}
                label="Bússola / Azimute"
                checked={settings.showHeading}
                onChange={(val) => handleChange('showHeading', val)}
              />
              <ToggleItem
                icon={<Tag className="w-3.5 h-3.5 text-indigo-400" />}
                label="Nome da Pasta / Projeto"
                checked={settings.showFolder}
                onChange={(val) => handleChange('showFolder', val)}
              />
              <ToggleItem
                icon={<User className="w-3.5 h-3.5 text-cyan-400" />}
                label="Responsável / Operador"
                checked={settings.showOperator}
                onChange={(val) => handleChange('showOperator', val)}
              />
              <ToggleItem
                icon={<AlignLeft className="w-3.5 h-3.5 text-slate-400" />}
                label="Observações de Campo"
                checked={settings.showNotes}
                onChange={(val) => handleChange('showNotes', val)}
              />
            </div>
          </div>

          {/* Inputs for defaults */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome do Técnico / Operador Padrão</label>
              <input
                type="text"
                value={settings.operatorName}
                onChange={(e) => handleChange('operatorName', e.target.value)}
                placeholder="Ex: Eng. Lucas Silva / Topógrafo Carlos"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Prefixo do Ponto</label>
                <input
                  type="text"
                  value={settings.pointPrefix}
                  onChange={(e) => handleChange('pointPrefix', e.target.value)}
                  placeholder="Ex: Ponto, Estaca, M"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Próximo Número (#)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.pointCounter}
                  onChange={(e) => handleChange('pointCounter', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            {/* Accent Color Selection */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                Cor de Destaque Técnico
              </label>
              <div className="flex gap-2">
                {[
                  { name: 'Azul Técnico', color: '#38bdf8' },
                  { name: 'Amarelo Topo', color: '#facc15' },
                  { name: 'Verde Campo', color: '#4ade80' },
                  { name: 'Laranja Obra', color: '#fb923c' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => handleChange('accentColor', c.color)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                      settings.accentColor === c.color
                        ? 'border-white bg-slate-800 text-white'
                        : 'border-slate-800 bg-slate-850 text-slate-400'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Sample */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
              Pré-visualização do Carimbo
            </span>
            <div className="bg-slate-900/90 border-l-2 p-2.5 rounded-lg text-[10px] space-y-1 font-mono text-slate-300" style={{ borderColor: settings.accentColor }}>
              {settings.showFolder && (
                <div className="text-white font-bold">
                  [{folderName}] • {settings.pointPrefix} #{settings.pointCounter.toString().padStart(2, '0')}
                </div>
              )}
              {settings.showDateTime && <div>🕒 13/10/2026 14:32:05 (UTC-3)</div>}
              {settings.showCoords && (
                <div className="text-white font-semibold">
                  📍 {settings.coordFormat === 'utm' ? 'UTM 23S E 333420m N 7394821m' : settings.coordFormat === 'gms' ? '23°33\'01.9"S 46°37\'59.9"O' : '-23.550520°, -46.633308°'}
                </div>
              )}
              {settings.showAltitude && <div>⛰️ Alt: 760.0 m | Precisão: ±3.2 m</div>}
              {settings.showHeading && <div>🧭 Azimute: 142° SE | Nível: 0° / 0°</div>}
              {settings.showOperator && <div>👷 {settings.operatorName || 'Técnico de Campo'}</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 transition text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, label, checked, onChange }) => (
  <label
    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
      checked
        ? 'bg-slate-850 border-slate-700 text-slate-100'
        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
    }`}
  >
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-medium text-[11px]">{label}</span>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-sky-500 rounded bg-slate-800 border-slate-700 focus:ring-sky-500 cursor-pointer"
    />
  </label>
);
