import { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoCoordinates } from '../types';
import { latLngToDMS, latLngToUTM } from '../utils/coordinates';

// Default initial location (Praça da Sé, Marco Zero de SP / Brasil) for initial state
const DEFAULT_LAT = -23.55052;
const DEFAULT_LNG = -46.633308;

export function useGeolocation() {
  const [coords, setCoords] = useState<PhotoCoordinates>(() => {
    const utm = latLngToUTM(DEFAULT_LAT, DEFAULT_LNG);
    const dms = latLngToDMS(DEFAULT_LAT, DEFAULT_LNG);
    return {
      lat: DEFAULT_LAT,
      lng: DEFAULT_LNG,
      altitude: 760,
      accuracy: 3.5,
      heading: 45,
      pitch: 0,
      roll: 0,
      utmFormatted: utm.formatted,
      utmZone: utm.zone,
      utmHemisphere: utm.hemisphere,
      utmEasting: utm.easting,
      utmNorthing: utm.northing,
      dmsFormatted: dms.formatted,
      decimalFormatted: `${DEFAULT_LAT.toFixed(6)}°, ${DEFAULT_LNG.toFixed(6)}°`,
    };
  });

  const [hasRealFix, setHasRealFix] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Update full coordinate package
  const updateFromPosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, altitude, accuracy } = position.coords;
    const utm = latLngToUTM(latitude, longitude);
    const dms = latLngToDMS(latitude, longitude);

    setCoords((prev) => ({
      ...prev,
      lat: latitude,
      lng: longitude,
      altitude: altitude !== null ? altitude : prev.altitude,
      accuracy: accuracy !== null ? accuracy : prev.accuracy,
      utmFormatted: utm.formatted,
      utmZone: utm.zone,
      utmHemisphere: utm.hemisphere,
      utmEasting: utm.easting,
      utmNorthing: utm.northing,
      dmsFormatted: dms.formatted,
      decimalFormatted: `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`,
    }));

    setHasRealFix(true);
    setPermissionError(null);
    setIsCalibrating(false);
  }, []);

  // Initialize Geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionError('Geolocalização não suportada neste navegador.');
      setIsCalibrating(false);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    };

    // Immediate fix request
    navigator.geolocation.getCurrentPosition(
      (pos) => updateFromPosition(pos),
      (err) => {
        // Fallback gracefully without breaking
        console.warn('Geolocation initial error:', err.message);
        setPermissionError(err.code === 1 ? 'Permissão de GPS negada. Usando coordenadas simuladas.' : 'Procurando sinal de GPS...');
        setIsCalibrating(false);
      },
      options
    );

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => updateFromPosition(pos),
      (err) => {
        console.warn('Geolocation watch error:', err.message);
      },
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateFromPosition]);

  // Orientation & Compass Listener
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // iOS Safari provides webkitCompassHeading directly
      let heading: number | null = null;
      const anyEvent = event as unknown as { webkitCompassHeading?: number };

      if (typeof anyEvent.webkitCompassHeading === 'number') {
        heading = anyEvent.webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Standard Android/Chrome compass approximation
        heading = 360 - event.alpha;
      }

      // Pitch: tilt front/back (beta: [-180, 180])
      // Roll: tilt left/right (gamma: [-90, 90])
      const pitch = event.beta !== null ? event.beta : 0;
      const roll = event.gamma !== null ? event.gamma : 0;

      setCoords((prev) => ({
        ...prev,
        heading: heading !== null ? Math.round(heading) : prev.heading,
        pitch: Math.round(pitch),
        roll: Math.round(roll),
      }));
    };

    orientationListenerRef.current = handleOrientation;

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (orientationListenerRef.current) {
        window.removeEventListener('deviceorientation', orientationListenerRef.current, true);
      }
    };
  }, []);

  // Request iOS 13+ sensor permissions if needed
  const requestCompassPermission = async () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        if (response === 'granted' && orientationListenerRef.current) {
          window.addEventListener('deviceorientation', orientationListenerRef.current, true);
        }
      } catch (err) {
        console.warn('Orientation permission denied:', err);
      }
    }
  };

  // Manual coordinate nudge/override for testing or manual correction in field
  const updateManualCoords = (newLat: number, newLng: number, newAlt?: number) => {
    const utm = latLngToUTM(newLat, newLng);
    const dms = latLngToDMS(newLat, newLng);
    setCoords((prev) => ({
      ...prev,
      lat: newLat,
      lng: newLng,
      altitude: newAlt !== undefined ? newAlt : prev.altitude,
      utmFormatted: utm.formatted,
      utmZone: utm.zone,
      utmHemisphere: utm.hemisphere,
      utmEasting: utm.easting,
      utmNorthing: utm.northing,
      dmsFormatted: dms.formatted,
      decimalFormatted: `${newLat.toFixed(6)}°, ${newLng.toFixed(6)}°`,
    }));
  };

  return {
    coords,
    hasRealFix,
    permissionError,
    isCalibrating,
    requestCompassPermission,
    updateManualCoords,
  };
}
