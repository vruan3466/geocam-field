import React, { useState } from 'react';
import {
  X,
  Share2,
  Download,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
  Mountain,
  Tag,
  User,
  Edit3,
  Check,
  Folder as FolderIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { FieldPhoto, Folder } from '../types';
import { deletePhoto, updatePhoto, triggerFileDownload } from '../utils/storage';
import { headingToCardinal } from '../utils/coordinates';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  photos: FieldPhoto[];
  onRefreshPhotos: () => void;
  activeFolderId: string;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  folders,
  photos,
  onRefreshPhotos,
  activeFolderId,
}) => {
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>(activeFolderId || 'all');
  const [activePhoto, setActivePhoto] = useState<FieldPhoto | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const [editedPointName, setEditedPointName] = useState('');

  if (!isOpen) return null;

  // Filter photos
  const filteredPhotos =
    selectedFolderFilter === 'all'
      ? photos
      : photos.filter((p) => p.folderId === selectedFolderFilter);

  // Active photo folder
  const activePhotoFolder = activePhoto
    ? folders.find((f) => f.id === activePhoto.folderId)
    : null;

  // Active photo index for next/prev
  const currentPhotoIndex = activePhoto
    ? filteredPhotos.findIndex((p) => p.id === activePhoto.id)
    : -1;

  const handleOpenPhoto = (photo: FieldPhoto) => {
    setActivePhoto(photo);
    setEditedNote(photo.notes || '');
    setEditedPointName(photo.pointName || '');
    setIsEditingNote(false);
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      handleOpenPhoto(filteredPhotos[currentPhotoIndex + 1]);
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      handleOpenPhoto(filteredPhotos[currentPhotoIndex - 1]);
    }
  };

  const handleDeleteActivePhoto = async () => {
    if (!activePhoto) return;
    if (confirm('Deseja realmente excluir esta foto de campo?')) {
      await deletePhoto(activePhoto.id);
      setActivePhoto(null);
      onRefreshPhotos();
    }
  };

  const handleSaveNotes = async () => {
    if (!activePhoto) return;
    const updated: FieldPhoto = {
      ...activePhoto,
      notes: editedNote,
      pointName: editedPointName || activePhoto.pointName,
    };
    await updatePhoto(updated);
    setActivePhoto(updated);
    setIsEditingNote(false);
    onRefreshPhotos();
  };

  const handleDownloadSingle = () => {
    if (!activePhoto) return;
    triggerFileDownload(activePhoto.dataUrl, activePhoto.fileName || 'foto_campo.jpg');
  };

  // Web Share API (native share on iOS and Android)
  const handleShare = async () => {
    if (!activePhoto) return;

    try {
      // Convert data URL to Blob for native sharing
      const res = await fetch(activePhoto.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], activePhoto.fileName || 'foto_campo.jpg', {
        type: 'image/jpeg',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${activePhoto.pointName} - GeoCam Campo`,
          text: `Foto de campo com coordenadas UTM: ${activePhoto.coords.utmFormatted}. Data: ${new Date(activePhoto.timestamp).toLocaleString('pt-BR')}`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${activePhoto.pointName} - GeoCam Campo`,
          text: `Coordenadas: ${activePhoto.coords.utmFormatted} (Lat: ${activePhoto.coords.lat}, Lng: ${activePhoto.coords.lng})`,
          url: `https://www.google.com/maps?q=${activePhoto.coords.lat},${activePhoto.coords.lng}`,
        });
      } else {
        handleDownloadSingle();
      }
    } catch {
      handleDownloadSingle();
    }
  };

  const openInGoogleMaps = () => {
    if (!activePhoto) return;
    const url = `https://www.google.com/maps?q=${activePhoto.coords.lat},${activePhoto.coords.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in overflow-hidden">
      <div className="w-full max-w-4xl h-[94vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Galeria de Fotos de Campo
              </h2>
              <span className="text-[11px] text-slate-400">
                {filteredPhotos.length} {filteredPhotos.length === 1 ? 'registro' : 'registros'} salvos no celular
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Filter Pill Bar */}
        <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/50 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            onClick={() => setSelectedFolderFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedFolderFilter === 'all'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            Todas ({photos.length})
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderFilter(folder.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                selectedFolderFilter === folder.id
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              {folder.name} ({folder.photoCount || 0})
            </button>
          ))}
        </div>

        {/* Gallery Grid or Empty State */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredPhotos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 text-slate-500">
                <FolderIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Nenhuma foto encontrada nesta pasta
              </h3>
              <p className="text-xs max-w-xs text-slate-500">
                Toque no disparador na tela da câmera para tirar uma nova foto georreferenciada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {filteredPhotos.map((photo) => {
                const folder = folders.find((f) => f.id === photo.folderId);
                return (
                  <div
                    key={photo.id}
                    onClick={() => handleOpenPhoto(photo)}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-sky-500 transition cursor-pointer shadow-md"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.pointName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />

                    {/* Gradient overlay on bottom */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white truncate">
                          {photo.pointName}
                        </span>
                        {folder && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color }}
                            title={folder.name}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-sky-300 block truncate">
                        {photo.coords.utmFormatted.split(' ')[1] || photo.coords.decimalFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Photo Inspector Modal (Full-screen view with technical data) */}
        {activePhoto && (
          <div className="fixed inset-0 z-60 bg-black/95 flex flex-col overflow-hidden animate-in fade-in">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePhoto(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {activePhoto.pointName}
                    {activePhotoFolder && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${activePhotoFolder.color}25`,
                          color: activePhotoFolder.color,
                        }}
                      >
                        {activePhotoFolder.name}
                      </span>
                    )}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {new Date(activePhoto.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-slate-950 transition"
                  title="Compartilhar / Salvar no Rolo de Fotos"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadSingle}
                  className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
                  title="Baixar imagem no celular"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteActivePhoto}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-950 hover:text-rose-400 transition"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Content Area: Image + Details Panel */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Photo View with Next/Prev Controls */}
              <div className="relative flex-1 bg-black flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={activePhoto.dataUrl}
                  alt={activePhoto.pointName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />

                {/* Left/Right navigation buttons */}
                {currentPhotoIndex > 0 && (
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}
                {currentPhotoIndex < filteredPhotos.length - 1 && (
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Technical Telemetry Sidebar / Bottom Sheet */}
              <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 overflow-y-auto text-xs space-y-4 flex-shrink-0 max-h-[45vh] md:max-h-full">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    Dados Topográficos & GPS
                  </span>
                  <button
                    onClick={openInGoogleMaps}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Coordinates Grid */}
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans">SISTEMA UTM (WGS84):</span>
                    <span className="text-sky-300 font-bold">{activePhoto.coords.utmFormatted}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Easting (E):</span>
                      <span className="text-slate-200">{activePhoto.coords.utmEasting} m</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Northing (N):</span>
                      <span className="text-slate-200">{activePhoto.coords.utmNorthing} m</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-850">
                    <span className="text-slate-400 text-[10px] block font-sans">GMS / DMS:</span>
                    <span className="text-slate-200">{activePhoto.coords.dmsFormatted}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-850">
                    <span className="text-slate-400 text-[10px] block font-sans">GRAUS DECIMAIS:</span>
                    <span className="text-slate-200">{activePhoto.coords.decimalFormatted}</span>
                  </div>
                </div>

                {/* Sensor Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1 text-amber-400 text-[10px] mb-1">
                      <Mountain className="w-3.5 h-3.5" />
                      <span>Altitude</span>
                    </div>
                    <span className="text-white font-bold">
                      {activePhoto.coords.altitude !== null ? `${activePhoto.coords.altitude.toFixed(1)} m` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Precisão GPS</span>
                    </div>
                    <span className="text-white font-bold">
                      {activePhoto.coords.accuracy !== null ? `±${activePhoto.coords.accuracy.toFixed(1)} m` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1 text-rose-400 text-[10px] mb-1">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Azimute / Bússola</span>
                    </div>
                    <span className="text-white font-bold">
                      {headingToCardinal(activePhoto.coords.heading)}
                    </span>
                  </div>

                  <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1 text-cyan-400 text-[10px] mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Inclinômetro</span>
                    </div>
                    <span className="text-white font-bold">
                      P: {activePhoto.coords.pitch ?? 0}° / R: {activePhoto.coords.roll ?? 0}°
                    </span>
                  </div>
                </div>

                {/* Operator info */}
                {activePhoto.operator && (
                  <div className="flex items-center gap-2 p-2.5 bg-slate-850 rounded-xl border border-slate-800">
                    <User className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Responsável / Operador</span>
                      <span className="text-white font-medium">{activePhoto.operator}</span>
                    </div>
                  </div>
                )}

                {/* Point and Notes Editable Block */}
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-sky-400" />
                      Anotações de Campo
                    </span>
                    {!isEditingNote ? (
                      <button
                        onClick={() => setIsEditingNote(true)}
                        className="text-sky-400 hover:text-sky-300 text-[11px] flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveNotes}
                        className="text-emerald-400 hover:text-emerald-300 text-[11px] flex items-center gap-1 font-bold"
                      >
                        <Check className="w-3 h-3" />
                        Salvar
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedPointName}
                        onChange={(e) => setEditedPointName(e.target.value)}
                        placeholder="Identificador do Ponto"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500"
                      />
                      <textarea
                        rows={3}
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                        placeholder="Adicione observações da vistoria ou obra..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-sky-500 resize-none"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-300 text-[11px] italic">
                      {activePhoto.notes || 'Nenhuma anotação adicionada.'}
                    </p>
                  )}
                </div>

                {/* File info */}
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  Arquivo: {activePhoto.fileName}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
