import { useState, useEffect, useRef, useCallback } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface UseCameraOptions {
  aspectRatio: '4:3' | '16:9' | '1:1';
  preferredFacingMode: 'environment' | 'user';
  selectedDeviceId?: string;
}

export function useCamera({
  aspectRatio,
  preferredFacingMode,
  selectedDeviceId,
}: UseCameraOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(preferredFacingMode);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [minZoom, setMinZoom] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(selectedDeviceId || '');
  const [error, setError] = useState<string | null>(null);
  const [isMockCamera, setIsMockCamera] = useState(false);

  // Stop current stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Enumerate cameras
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Câmera ${i + 1}`,
        }));
      setAvailableDevices(videoInputs);
    } catch {
      // ignore
    }
  }, []);

  // Start stream
  const startStream = useCallback(async () => {
    stopStream();
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Câmera não suportada neste navegador. Modo de simulação ativado.');
      setIsMockCamera(true);
      return;
    }

    // Determine target resolution based on aspect ratio
    let widthIdeal = 1920;
    let heightIdeal = 1080;
    if (aspectRatio === '4:3') {
      widthIdeal = 1920;
      heightIdeal = 1440;
    } else if (aspectRatio === '1:1') {
      widthIdeal = 1440;
      heightIdeal = 1440;
    }

    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: widthIdeal },
      height: { ideal: heightIdeal },
    };

    if (currentDeviceId) {
      videoConstraints.deviceId = { exact: currentDeviceId };
    } else {
      videoConstraints.facingMode = { ideal: facingMode };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      setIsMockCamera(false);

      // Check capabilities for torch and zoom
      const track = stream.getVideoTracks()[0];
      if (track) {
        // Enumerate devices once we have permission
        refreshDevices();

        const capabilities = (track as unknown as { getCapabilities?: () => { torch?: boolean; zoom?: { min: number; max: number } } }).getCapabilities?.();
        if (capabilities) {
          if (capabilities.torch) {
            setHasTorch(true);
          }
          if (capabilities.zoom) {
            setHasHardwareZoom(true);
            setMinZoom(capabilities.zoom.min || 1);
            setMaxZoom(capabilities.zoom.max || 5);
          }
        }
      }
    } catch (err) {
      console.warn('Camera getUserMedia error, falling back to mock view:', err);
      setError('Não foi possível acessar a câmera física. Modo de campo simulado ativado.');
      setIsMockCamera(true);
    }
  }, [stopStream, aspectRatio, currentDeviceId, facingMode, refreshDevices]);

  // Restart when facingMode, deviceId or aspect ratio changes
  useEffect(() => {
    startStream();
    return () => {
      stopStream();
    };
  }, [startStream, stopStream]);

  // Toggle facing mode (front / back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setCurrentDeviceId(''); // clear exact device id to allow facing mode switch
  };

  // Toggle Flash/Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await (track as unknown as { applyConstraints: (c: { advanced: [{ torch: boolean }] }) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch {
      // Torch not supported on some platforms
      setIsTorchOn(false);
    }
  };

  // Set Zoom
  const applyZoom = async (newZoom: number) => {
    const clamped = Math.min(maxZoom, Math.max(minZoom, newZoom));
    setZoomLevel(clamped);

    if (hasHardwareZoom && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await (track as unknown as { applyConstraints: (c: { advanced: [{ zoom: number }] }) => Promise<void> }).applyConstraints({
            advanced: [{ zoom: clamped }],
          });
        } catch {
          // ignore
        }
      }
    }
  };

  // Switch specific device
  const selectDevice = (id: string) => {
    setCurrentDeviceId(id);
  };

  /**
   * Captures raw frame onto a canvas element.
   */
  const captureRawFrame = useCallback((): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');

    if (isMockCamera || !videoRef.current || !isStreaming) {
      // Generate synthetic realistic field view image
      canvas.width = 1920;
      canvas.height = aspectRatio === '4:3' ? 1440 : aspectRatio === '1:1' ? 1440 : 1080;
      const ctx = canvas.getContext('2d')!;

      // Synthetic landscape: sky, terrain, surveyor reference point
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.55, '#bae6fd');
      grad.addColorStop(0.56, '#3f6212');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mountains / Horizon
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.55);
      ctx.lineTo(canvas.width * 0.3, canvas.height * 0.42);
      ctx.lineTo(canvas.width * 0.6, canvas.height * 0.52);
      ctx.lineTo(canvas.width * 0.85, canvas.height * 0.45);
      ctx.lineTo(canvas.width, canvas.height * 0.55);
      ctx.closePath();
      ctx.fill();

      // Construction / Field target marker
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height * 0.65, 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(canvas.width / 2 - 3, canvas.height * 0.65 - 120, 6, 240);
      ctx.fillRect(canvas.width / 2 - 120, canvas.height * 0.65 - 3, 240, 6);

      // Label on simulated terrain
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ MARCO GEODÉSICO DE REFERÊNCIA #01 ]', canvas.width / 2, canvas.height * 0.78);

      return canvas;
    }

    const video = videoRef.current;
    let vw = video.videoWidth || 1920;
    let vh = video.videoHeight || 1080;

    // Apply crop if needed for aspect ratio
    let cropX = 0;
    let cropY = 0;
    let cropW = vw;
    let cropH = vh;

    const targetRatio = aspectRatio === '4:3' ? 4 / 3 : aspectRatio === '1:1' ? 1 : 16 / 9;
    const currentRatio = vw / vh;

    if (currentRatio > targetRatio) {
      cropW = vh * targetRatio;
      cropX = (vw - cropW) / 2;
    } else if (currentRatio < targetRatio) {
      cropH = vw / targetRatio;
      cropY = (vh - cropH) / 2;
    }

    // Apply software digital zoom if hardware zoom wasn't used
    if (!hasHardwareZoom && zoomLevel > 1) {
      const zoomFactor = zoomLevel;
      const zoomedW = cropW / zoomFactor;
      const zoomedH = cropH / zoomFactor;
      cropX += (cropW - zoomedW) / 2;
      cropY += (cropH - zoomedH) / 2;
      cropW = zoomedW;
      cropH = zoomedH;
    }

    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext('2d')!;

    // Mirror image if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    return canvas;
  }, [isMockCamera, isStreaming, aspectRatio, hasHardwareZoom, zoomLevel, facingMode]);

  return {
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
    error,
    isMockCamera,
    captureRawFrame,
  };
}
