import { CoordinateFormat } from './utils/coordinates';

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: number;
  photoCount?: number;
}

export interface PhotoCoordinates {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  pitch: number | null;
  roll: number | null;
  utmFormatted: string;
  utmZone: number;
  utmHemisphere: 'N' | 'S';
  utmEasting: number;
  utmNorthing: number;
  dmsFormatted: string;
  decimalFormatted: string;
}

export interface StampSettings {
  enabled: boolean;
  position: 'bottom' | 'top';
  coordFormat: CoordinateFormat;
  showDateTime: boolean;
  showCoords: boolean;
  showAltitude: boolean;
  showAccuracy: boolean;
  showHeading: boolean;
  showFolder: boolean;
  showPointName: boolean;
  showOperator: boolean;
  showNotes: boolean;
  operatorName: string;
  pointPrefix: string;
  pointCounter: number;
  textColor: string;
  bgColor: string; // e.g. 'rgba(0, 0, 0, 0.75)'
  accentColor: string; // e.g. '#38bdf8'
}

export interface CameraSettings {
  aspectRatio: '4:3' | '16:9' | '1:1';
  gridMode: 'none' | 'thirds' | 'crosshair' | 'level';
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  autoSaveToDevice: boolean;
  timerSeconds: 0 | 3 | 5 | 10;
  preferredFacingMode: 'environment' | 'user';
  selectedDeviceId: string;
}

export interface FieldPhoto {
  id: string;
  folderId: string;
  dataUrl: string; // Full stamped image data
  rawThumbUrl?: string;
  timestamp: number;
  pointName: string;
  operator: string;
  notes: string;
  coords: PhotoCoordinates;
  stampSettings: StampSettings;
  fileName: string;
}
