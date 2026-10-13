/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCamera } from './hooks/useCamera';
import { useGeolocation } from './hooks/useGeolocation';
import { CameraHUD } from './components/CameraHUD';
import { StampSettingsModal } from './components/StampSettingsModal';
import { FolderManagerModal } from './components/FolderManagerModal';
import { GalleryModal } from './components/GalleryModal';
import { CameraSettingsModal } from './components/CameraSettingsModal';
import { TestOnPhoneModal } from './components/TestOnPhoneModal';
import {
  Folder,
  FieldPhoto,
  StampSettings,
  CameraSettings,
} from './types';
import {
  DEFAULT_CAMERA_SETTINGS,
  DEFAULT_FOLDER,
  DEFAULT_STAMP_SETTINGS,
  getFolders,
  getPhotos,
  getStoredSetting,
  savePhoto,
  saveStoredSetting,
  triggerFileDownload,
} from './utils/storage';
import { playShutterSound } from './utils/audio';
import { renderStampedPhoto } from './utils/stampRenderer';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function App() {
  // Persistence state
  const [folders, setFolders] = useState<Folder[]>([DEFAULT_FOLDER]);
  const [activeFolderId, setActiveFolderId] = useState<string>(DEFAULT_FOLDER.id);
  const [photos, setPhotos] = useState<FieldPhoto[]>([]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(DEFAULT_CAMERA_SETTINGS);
  const [stampSettings, setStampSettings] = useState<StampSettings>(DEFAULT_STAMP_SETTINGS);

  // Modals state
  const [isStampModalOpen, setIsStampModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isTestPhoneModalOpen, setIsTestPhoneModalOpen] = useState(false);

  // Capture feedback states
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Geolocation & orientation hook
  const { coords, hasRealFix, permissionError, updateManualCoords } = useGeolocation();

  // Camera hook
  const {
    videoRef,
    isStreaming,
    facingMode,
    toggleFacingMode,
    hasTorch,
    isTorchOn,
    toggleTorch,
    zoomLevel,
    applyZoom,
    minZoom,
    maxZoom,
    availableDevices,
    currentDeviceId,
    selectDevice,
    isMockCamera,
    captureRawFrame,
  } = useCamera({
    aspectRatio: cameraSettings.aspectRatio,
    preferredFacingMode: cameraSettings.preferredFacingMode,
    selectedDeviceId: cameraSettings.selectedDeviceId,
  });

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial settings and folders from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const storedFolders = await getFolders();
      if (storedFolders.length > 0) {
        setFolders(storedFolders);
      }

      const storedPhotos = await getPhotos();
      setPhotos(storedPhotos);

      const savedCamSettings = await getStoredSetting<CameraSettings>(
        'camera_settings',
        DEFAULT_CAMERA_SETTINGS
      );
      setCameraSettings(savedCamSettings);

      const savedStampSettings = await getStoredSetting<StampSettings>(
        'stamp_settings',
        DEFAULT_STAMP_SETTINGS
      );
      setStampSettings(savedStampSettings);

      const savedActiveFolderId = await getStoredSetting<string>(
        'active_folder_id',
        storedFolders[0]?.id || DEFAULT_FOLDER.id
      );
      setActiveFolderId(savedActiveFolderId);
    } catch (err) {
      console.warn('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle active folder update
  const handleSelectFolder = async (folderId: string) => {
    setActiveFolderId(folderId);
    await saveStoredSetting('active_folder_id', folderId);
  };

  // Handle camera settings update
  const handleUpdateCameraSettings = async (newSettings: CameraSettings) => {
    setCameraSettings(newSettings);
    await saveStoredSetting('camera_settings', newSettings);
  };

  // Handle stamp settings update
  const handleUpdateStampSettings = async (newSettings: StampSettings) => {
    setStampSettings(newSettings);
    await saveStoredSetting('stamp_settings', newSettings);
  };

  // Active folder object
  const activeFolder =
    folders.find((f) => f.id === activeFolderId) || folders[0] || DEFAULT_FOLDER;

  // Touch to focus ring animation on viewfinder
  const handleViewfinderTouch = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setFocusRing({ x: clientX, y: clientY });
    setTimeout(() => setFocusRing(null), 1200);
  };

  // Capture Photo Handler
  const handleCapture = async (quickNote: string, pointName: string) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      // 1. Audio and Haptic feedback
      if (cameraSettings.soundEnabled) {
        playShutterSound();
      }
      if (cameraSettings.vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([40, 20, 40]);
      }

      // 2. Visual flash
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 200);

      // 3. Grab frame
      const frameCanvas = captureRawFrame();

      // 4. Render technical stamp onto canvas
      const now = Date.now();
      const stampedDataUrl = renderStampedPhoto({
        sourceImage: frameCanvas,
        coords,
        settings: stampSettings,
        folderName: activeFolder.name,
        pointName,
        operator: stampSettings.operatorName,
        notes: quickNote,
        timestamp: now,
      });

      // 5. Generate descriptive filename: [Pasta]_[Ponto]_[Data]_[Hora].jpg
      const cleanFolder = activeFolder.name.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanPoint = pointName.replace(/[^a-zA-Z0-9]/g, '_');
      const timeStr = new Date(now).toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `${cleanFolder}_${cleanPoint}_${timeStr}.jpg`;

      // 6. Save into IndexedDB
      const newPhoto: FieldPhoto = {
        id: `photo-${now}-${Math.random().toString(36).substring(2, 7)}`,
        folderId: activeFolder.id,
        dataUrl: stampedDataUrl,
        timestamp: now,
        pointName,
        operator: stampSettings.operatorName,
        notes: quickNote,
        coords,
        stampSettings,
        fileName,
      };

      await savePhoto(newPhoto);

      // 7. Auto-increment point counter
      const nextStampSettings: StampSettings = {
        ...stampSettings,
        pointCounter: stampSettings.pointCounter + 1,
      };
      setStampSettings(nextStampSettings);
      await saveStoredSetting('stamp_settings', nextStampSettings);

      // 8. Auto download to phone storage if enabled
      if (cameraSettings.autoSaveToDevice) {
        triggerFileDownload(stampedDataUrl, fileName);
      }

      // 9. Refresh photo list
      const updatedPhotos = await getPhotos();
      setPhotos(updatedPhotos);

      // Update folder counts
      const updatedFolders = await getFolders();
      setFolders(updatedFolders);
    } catch (err) {
      console.error('Error during photo capture:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const lastPhoto = photos[0];

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col select-none">
      {/* Visual Flash Screen Effect on Shutter */}
      {showFlash && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none transition-opacity duration-150 animate-out fade-out" />
      )}

      {/* Focus Ring Indicator on Touch */}
      {focusRing && (
        <div
          className="absolute z-30 pointer-events-none w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 animate-ping opacity-75"
          style={{ left: focusRing.x, top: focusRing.y }}
        />
      )}

      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-amber-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline — Dados salvos localmente</span>
        </div>
      )}

      {/* GPS Warning Toast if permission blocked */}
      {permissionError && (
        <div className="absolute top-22 left-1/2 -translate-x-1/2 z-40 bg-rose-900/90 text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm max-w-[90%] truncate">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
          <span className="truncate">{permissionError}</span>
        </div>
      )}

      {/* Camera Live Video Feed & Viewfinder Area */}
      <div
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center cursor-crosshair bg-slate-950"
        onClick={handleViewfinderTouch}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition duration-300 ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
          style={{
            transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'center center',
          }}
        />

        {/* Fallback Mock Viewfinder if Camera is blocked or unavailable */}
        {isMockCamera && (
          <div className="absolute inset-0 bg-gradient-to-b from-sky-700 via-sky-300 to-emerald-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-48 h-48 rounded-full border-4 border-dashed border-white/60 flex items-center justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-red-500/80 border-2 border-white flex items-center justify-center text-white font-black text-xs">
                MARCO P-01
              </div>
            </div>
            <span className="text-white font-bold text-sm drop-shadow-md">
              Visor de Campo Simulado Ativo
            </span>
            <span className="text-white/80 text-xs max-w-xs mt-1 drop-shadow">
              Permita o acesso à câmera para usar o sensor físico do dispositivo.
            </span>
          </div>
        )}
      </div>

      {/* Camera HUD (Overlays, Telemetry, Controls, Shutter) */}
      <CameraHUD
        settings={cameraSettings}
        onUpdateCameraSettings={handleUpdateCameraSettings}
        stampSettings={stampSettings}
        onOpenStampModal={() => setIsStampModalOpen(true)}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenGalleryModal={() => setIsGalleryModalOpen(true)}
        onOpenTestPhoneModal={() => setIsTestPhoneModalOpen(true)}
        activeFolder={activeFolder}
        coords={coords}
        hasRealFix={hasRealFix}
        isStreaming={isStreaming}
        hasTorch={hasTorch}
        isTorchOn={isTorchOn}
        onToggleTorch={toggleTorch}
        onToggleFacingMode={toggleFacingMode}
        zoomLevel={zoomLevel}
        onApplyZoom={applyZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        onCapture={handleCapture}
        isCapturing={isCapturing}
        lastPhotoThumb={lastPhoto?.dataUrl}
        totalPhotosCount={photos.length}
        isMockCamera={isMockCamera}
      />

      {/* Modal: Legenda / Stamp Customizer */}
      <StampSettingsModal
        isOpen={isStampModalOpen}
        onClose={() => setIsStampModalOpen(false)}
        settings={stampSettings}
        onUpdateSettings={handleUpdateStampSettings}
        folderName={activeFolder.name}
      />

      {/* Modal: Gerenciador de Pastas & Armazenamento */}
      <FolderManagerModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folders={folders}
        activeFolderId={activeFolderId}
        onSelectFolder={handleSelectFolder}
        onRefreshFolders={refreshAllData}
      />

      {/* Modal: Galeria de Fotos & Exportação */}
      <GalleryModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        folders={folders}
        photos={photos}
        onRefreshPhotos={refreshAllData}
        activeFolderId={activeFolderId}
      />

      {/* Modal: Configurações da Câmera & Dispositivo */}
      <CameraSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={cameraSettings}
        onUpdateSettings={handleUpdateCameraSettings}
        availableDevices={availableDevices}
        currentDeviceId={currentDeviceId}
        onSelectDevice={selectDevice}
        coords={coords}
        onManualCoordUpdate={updateManualCoords}
      />

      {/* Modal: Testar no Celular (QR Code & Instruções) */}
      <TestOnPhoneModal
        isOpen={isTestPhoneModalOpen}
        onClose={() => setIsTestPhoneModalOpen(false)}
      />
    </div>
  );
}
