import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  Plus,
  X,
  Check,
  Trash2,
  Download,
  HardDrive,
  FolderPlus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Folder, FieldPhoto } from '../types';
import {
  saveFolder,
  deleteFolder,
  exportFolderAsZip,
  getPhotos,
  pickDeviceFolder,
} from '../utils/storage';

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onRefreshFolders: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
];

export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  folders,
  activeFolderId,
  onSelectFolder,
  onRefreshFolders,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [boundDirName, setBoundDirName] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      description: newFolderDesc.trim(),
      color: selectedColor,
      createdAt: Date.now(),
    };

    await saveFolder(newFolder);
    onRefreshFolders();
    onSelectFolder(newFolder.id);
    setIsCreating(false);
    setNewFolderName('');
    setNewFolderDesc('');
    setFeedbackMsg(`Pasta "${newFolder.name}" criada e selecionada!`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDeleteFolder = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (folders.length <= 1) {
      alert('Você precisa ter pelo menos uma pasta ativa.');
      return;
    }

    if (
      confirm(
        `Tem certeza que deseja excluir a pasta "${folder.name}" e todas as fotos contidas nela?`
      )
    ) {
      await deleteFolder(folder.id);
      if (activeFolderId === folder.id) {
        const remaining = folders.filter((f) => f.id !== folder.id);
        if (remaining.length > 0) onSelectFolder(remaining[0].id);
      }
      onRefreshFolders();
    }
  };

  const handleExportZip = async (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExporting(folder.id);
    try {
      const photos: FieldPhoto[] = await getPhotos(folder.id);
      if (photos.length === 0) {
        alert('Esta pasta ainda não possui nenhuma foto tirada.');
        return;
      }
      await exportFolderAsZip(folder, photos);
      setFeedbackMsg(`Arquivo ZIP de "${folder.name}" gerado com sucesso!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Erro ao exportar pasta.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleBindDeviceDirectory = async () => {
    try {
      const dirHandle = await pickDeviceFolder();
      if (dirHandle) {
        setBoundDirName(dirHandle.name);
        setFeedbackMsg(`Vinculado à pasta do celular/disco: "${dirHandle.name}"`);
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-sky-400" />
              Pastas & Armazenamento Local
            </h2>
            <p className="text-xs text-slate-400">
              Escolha ou crie pastas para organizar fotos no telefone celular
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className="bg-sky-950/80 border-b border-sky-800/60 px-4 py-2 text-xs text-sky-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Top Actions: Create Folder & Bind device folder */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{isCreating ? 'Cancelar' : 'Nova Pasta'}</span>
            </button>

            {'showDirectoryPicker' in window && (
              <button
                onClick={handleBindDeviceDirectory}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="Vincular diretório do celular ou computador"
              >
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>
                  {boundDirName ? `Pasta: ${boundDirName}` : 'Vincular Pasta do Celular'}
                </span>
              </button>
            )}
          </div>

          {/* Create Folder Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateFolder}
              className="bg-slate-850 border border-slate-750 p-4 rounded-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  Criar Nova Pasta de Campo
                </span>
                <span className="text-[10px] text-slate-400">Armazenamento Local</span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Pasta</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Obra Residencial Alpha, Vistoria BR-101..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Descrição / Local (Opcional)</label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Ex: Trecho Km 42 a 58 - Pistas norte e sul"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              {/* Color Tag Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Cor Identificadora</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 text-xs"
                >
                  Criar e Ativar
                </button>
              </div>
            </form>
          )}

          {/* List of Folders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px] px-1">
              <span>Selecione a pasta ativa para alocar novas fotos:</span>
              <span>{folders.length} {folders.length === 1 ? 'pasta' : 'pastas'}</span>
            </div>

            {folders.map((folder) => {
              const isActive = folder.id === activeFolderId;
              const photoCount = folder.photoCount || 0;

              return (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/50'
                      : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: `${folder.color}25`, color: folder.color }}
                    >
                      <FolderIcon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">
                          {folder.name}
                        </span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-semibold">
                            Ativa
                          </span>
                        )}
                      </div>
                      {folder.description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {folder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {photoCount} {photoCount === 1 ? 'foto' : 'fotos'}
                        </span>
                        <span>•</span>
                        <span>{new Date(folder.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Export ZIP & Delete */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => handleExportZip(folder, e)}
                      disabled={isExporting === folder.id}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition title='Exportar pasta completa (ZIP com Fotos, CSV e KML)'"
                      title="Exportar fotos, CSV e KML"
                    >
                      {isExporting === folder.id ? (
                        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {folders.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteFolder(folder, e)}
                        className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700/80 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition"
                        title="Excluir pasta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation note about offline storage on phones */}
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300 block mb-1">📱 Armazenamento Seguro no Telefone Celular:</strong>
            As fotos são salvas no armazenamento local persistente (IndexedDB) do seu dispositivo, ficando disponíveis 100% offline. Você pode exportar a pasta inteira a qualquer momento como arquivo <strong>.ZIP</strong> contendo todas as imagens com carimbo, relatório <strong>CSV</strong> de coordenadas e camadas <strong>KML/GeoJSON</strong> para Google Earth, AutoCAD e QGIS.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-slate-950 transition text-xs cursor-pointer"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
};
