/**
 * Storage and Database utilities using browser IndexedDB.
 * Handles Projects/Folders, Stamped Photos, and Exporting to ZIP / CSV / KML / GeoJSON.
 */

import JSZip from 'jszip';
import { FieldPhoto, Folder, StampSettings, CameraSettings } from '../types';

const DB_NAME = 'GeoCamFieldDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('name', 'name', { unique: false });
        folderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('folderId', 'folderId', { unique: false });
        photoStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// Default initial folder
export const DEFAULT_FOLDER: Folder = {
  id: 'folder-default',
  name: 'Campo Geral',
  description: 'Pasta padrão de registros fotográficos',
  color: '#3b82f6',
  createdAt: Date.now(),
};

export const DEFAULT_STAMP_SETTINGS: StampSettings = {
  enabled: true,
  position: 'bottom',
  coordFormat: 'utm',
  showDateTime: true,
  showCoords: true,
  showAltitude: true,
  showAccuracy: true,
  showHeading: true,
  showFolder: true,
  showPointName: true,
  showOperator: true,
  showNotes: true,
  operatorName: 'Técnico de Campo',
  pointPrefix: 'Ponto',
  pointCounter: 1,
  textColor: '#ffffff',
  bgColor: 'rgba(9, 13, 22, 0.85)',
  accentColor: '#38bdf8',
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  aspectRatio: '4:3',
  gridMode: 'thirds',
  soundEnabled: true,
  vibrateEnabled: true,
  autoSaveToDevice: false,
  timerSeconds: 0,
  preferredFacingMode: 'environment',
  selectedDeviceId: '',
};

/* ==================== FOLDERS ==================== */

export async function getFolders(): Promise<Folder[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders', 'photos'], 'readonly');
    const folderStore = tx.objectStore('folders');
    const photoStore = tx.objectStore('photos');

    const folderReq = folderStore.getAll();
    const photoReq = photoStore.getAll();

    tx.oncomplete = () => {
      const folders: Folder[] = folderReq.result || [];
      const photos: FieldPhoto[] = photoReq.result || [];

      if (folders.length === 0) {
        // Seed default folder
        saveFolder(DEFAULT_FOLDER).then(() => {
          resolve([{ ...DEFAULT_FOLDER, photoCount: 0 }]);
        });
        return;
      }

      // Calculate photo counts
      const counts: Record<string, number> = {};
      photos.forEach((p) => {
        counts[p.folderId] = (counts[p.folderId] || 0) + 1;
      });

      const enriched = folders.map((f) => ({
        ...f,
        photoCount: counts[f.id] || 0,
      }));

      // Sort by creation date desc
      enriched.sort((a, b) => b.createdAt - a.createdAt);
      resolve(enriched);
    };

    tx.onerror = () => reject(tx.error);
  });
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    tx.objectStore('folders').put(folder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folders', 'photos'], 'readwrite');
    tx.objectStore('folders').delete(folderId);

    // Also delete or reassign photos
    const photoStore = tx.objectStore('photos');
    const index = photoStore.index('folderId');
    const req = index.getAllKeys(folderId);

    req.onsuccess = () => {
      const keys = req.result;
      keys.forEach((key) => photoStore.delete(key));
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ==================== PHOTOS ==================== */

export async function getPhotos(folderId?: string): Promise<FieldPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');

    let req: IDBRequest<FieldPhoto[]>;
    if (folderId && folderId !== 'all') {
      const index = store.index('folderId');
      req = index.getAll(folderId);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => {
      const list = req.result || [];
      // Sort newest first
      list.sort((a, b) => b.timestamp - a.timestamp);
      resolve(list);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function savePhoto(photo: FieldPhoto): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePhoto(photoId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(photoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updatePhoto(photo: FieldPhoto): Promise<void> {
  return savePhoto(photo);
}

/* ==================== SETTINGS ==================== */

export async function getStoredSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function saveStoredSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore setting persist errors
  }
}

/* ==================== EXPORT TO ZIP / CSV / KML ==================== */

/**
 * Downloads a data URL / Blob as a file in the browser.
 */
export function triggerFileDownload(blob: Blob | string, filename: string) {
  const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof blob !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

/**
 * Generates and downloads a ZIP package containing:
 * - All stamped photos in JPEG
 * - pontos.csv (tabulated coordinates, UTM, notes)
 * - pontos.kml (Google Earth 3D marks)
 * - pontos.geojson (QGIS / ArcGIS spatial layers)
 */
export async function exportFolderAsZip(folder: Folder, photos: FieldPhoto[]) {
  if (photos.length === 0) {
    throw new Error('Nenhuma foto encontrada nesta pasta para exportar.');
  }

  const zip = new JSZip();
  const folderNameClean = folder.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const photosSubFolder = zip.folder(`Fotos_${folderNameClean}`);

  // 1. Add photos
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const base64Data = p.dataUrl.split(',')[1];
    if (base64Data && photosSubFolder) {
      const cleanName = (p.fileName || `foto_${i + 1}.jpg`).replace(/[^a-zA-Z0-9_.\-]/g, '_');
      photosSubFolder.file(cleanName, base64Data, { base64: true });
    }
  }

  // 2. Generate CSV
  const csvHeaders = [
    'Nome_Arquivo',
    'Ponto',
    'Data_Hora',
    'Latitude',
    'Longitude',
    'UTM_Zona',
    'UTM_Hemisferio',
    'UTM_Este_m',
    'UTM_Norte_m',
    'Coordenadas_GMS',
    'Altitude_m',
    'Precisao_GPS_m',
    'Azimute_Graus',
    'Inclinacao_Pitch',
    'Inclinacao_Roll',
    'Operador',
    'Notas',
  ];

  const csvRows = photos.map((p) => {
    const d = new Date(p.timestamp);
    const dateStr = d.toISOString().replace('T', ' ').substring(0, 19);
    return [
      `"${p.fileName}"`,
      `"${p.pointName}"`,
      `"${dateStr}"`,
      p.coords.lat.toFixed(7),
      p.coords.lng.toFixed(7),
      p.coords.utmZone,
      `"${p.coords.utmHemisphere}"`,
      p.coords.utmEasting,
      p.coords.utmNorthing,
      `"${p.coords.dmsFormatted}"`,
      p.coords.altitude !== null ? p.coords.altitude.toFixed(1) : '',
      p.coords.accuracy !== null ? p.coords.accuracy.toFixed(1) : '',
      p.coords.heading !== null ? Math.round(p.coords.heading) : '',
      p.coords.pitch !== null ? Math.round(p.coords.pitch) : '',
      p.coords.roll !== null ? Math.round(p.coords.roll) : '',
      `"${p.operator.replace(/"/g, '""')}"`,
      `"${p.notes.replace(/"/g, '""')}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [csvHeaders.join(';'), ...csvRows].join('\r\n');
  zip.file(`coordenadas_${folderNameClean}.csv`, csvContent);

  // 3. Generate KML for Google Earth
  const kmlPlacemarks = photos
    .map((p) => {
      const d = new Date(p.timestamp).toLocaleString('pt-BR');
      return `
    <Placemark>
      <name>${escapeXml(p.pointName)} - ${escapeXml(p.fileName)}</name>
      <description><![CDATA[
        <b>Pasta:</b> ${escapeXml(folder.name)}<br/>
        <b>Data/Hora:</b> ${d}<br/>
        <b>UTM:</b> ${escapeXml(p.coords.utmFormatted)}<br/>
        <b>GMS:</b> ${escapeXml(p.coords.dmsFormatted)}<br/>
        <b>Altitude:</b> ${p.coords.altitude ? p.coords.altitude.toFixed(1) + ' m' : 'N/A'}<br/>
        <b>Precisão:</b> ${p.coords.accuracy ? '±' + p.coords.accuracy.toFixed(1) + ' m' : 'N/A'}<br/>
        <b>Azimute:</b> ${p.coords.heading ? Math.round(p.coords.heading) + '°' : 'N/A'}<br/>
        <b>Operador:</b> ${escapeXml(p.operator)}<br/>
        <b>Notas:</b> ${escapeXml(p.notes)}
      ]]></description>
      <Point>
        <coordinates>${p.coords.lng},${p.coords.lat},${p.coords.altitude || 0}</coordinates>
      </Point>
    </Placemark>`;
    })
    .join('');

  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(folder.name)}</name>
    <description>Fotos de campo georreferenciadas via GeoCam Pro</description>
    ${kmlPlacemarks}
  </Document>
</kml>`;
  zip.file(`pontos_${folderNameClean}.kml`, kmlContent);

  // 4. Generate GeoJSON for QGIS / ArcGIS
  const geoJson = {
    type: 'FeatureCollection',
    features: photos.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.coords.lng, p.coords.lat, p.coords.altitude || 0],
      },
      properties: {
        id: p.id,
        fileName: p.fileName,
        pointName: p.pointName,
        folderName: folder.name,
        timestamp: p.timestamp,
        dateFormatted: new Date(p.timestamp).toISOString(),
        utmFormatted: p.coords.utmFormatted,
        utmZone: p.coords.utmZone,
        utmHemisphere: p.coords.utmHemisphere,
        utmEasting: p.coords.utmEasting,
        utmNorthing: p.coords.utmNorthing,
        dms: p.coords.dmsFormatted,
        altitude_m: p.coords.altitude,
        accuracy_m: p.coords.accuracy,
        heading_deg: p.coords.heading,
        operator: p.operator,
        notes: p.notes,
      },
    })),
  };
  zip.file(`pontos_${folderNameClean}.geojson`, JSON.stringify(geoJson, null, 2));

  // 5. Generate ZIP Blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const dateSuffix = new Date().toISOString().substring(0, 10);
  triggerFileDownload(zipBlob, `GeoCam_${folderNameClean}_${dateSuffix}.zip`);
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * File System Access API - allow users on desktop/Android Chrome to bind a physical folder
 */
export async function pickDeviceFolder(): Promise<FileSystemDirectoryHandle | null> {
  if ('showDirectoryPicker' in window) {
    try {
      const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      return handle;
    } catch {
      // User cancelled or not supported
      return null;
    }
  }
  return null;
}
