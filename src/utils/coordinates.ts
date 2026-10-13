/**
 * Utilities for Geodesy, Coordinate Conversions (UTM, DMS/GMS, Decimal Degrees)
 * and Compass Heading.
 * Based on WGS84 Ellipsoid.
 */

export interface UTMResult {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
  formatted: string;
}

export interface DMSResult {
  latDMS: string;
  lngDMS: string;
  formatted: string;
}

export type CoordinateFormat = 'utm' | 'gms' | 'decimal' | 'all';

/**
 * Converts Decimal Degrees Latitude/Longitude into UTM (WGS84).
 */
export function latLngToUTM(lat: number, lng: number): UTMResult {
  // Constrain longitude to [-180, 180)
  let lon = lng;
  while (lon < -180) lon += 360;
  while (lon >= 180) lon -= 360;

  // WGS84 parameters
  const a = 6378137.0; // semi-major axis
  const f = 1 / 298.257223563; // flattening
  const b = a * (1 - f); // semi-minor axis
  const e2 = (a * a - b * b) / (a * a); // first eccentricity squared
  const ePrime2 = (a * a - b * b) / (b * b); // second eccentricity squared
  const k0 = 0.9996; // scale factor

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  // UTM zone
  const zoneNumber = Math.floor((lon + 180) / 6) + 1;
  const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3; // central meridian
  const lonOriginRad = (lonOrigin * Math.PI) / 180;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  // Meridian distance
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));

  // Easting
  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * A * A * A) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * A * A * A * A * A) /
          120) +
    500000.0;

  // Northing
  let northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ePrime2) *
            A *
            A *
            A *
            A *
            A *
            A) /
            720));

  const hemisphere: 'N' | 'S' = lat >= 0 ? 'N' : 'S';
  if (lat < 0) {
    northing += 10000000.0; // False northing for southern hemisphere
  }

  const roundedEasting = Math.round(easting);
  const roundedNorthing = Math.round(northing);

  return {
    zone: zoneNumber,
    hemisphere,
    easting: roundedEasting,
    northing: roundedNorthing,
    formatted: `UTM ${zoneNumber}${hemisphere} E ${roundedEasting}m N ${roundedNorthing}m`,
  };
}

/**
 * Converts decimal coordinate to DMS (Degrees, Minutes, Seconds / GMS).
 */
export function toDMS(coordinate: number, isLatitude: boolean): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

  let direction = '';
  if (isLatitude) {
    direction = coordinate >= 0 ? 'N' : 'S';
  } else {
    // Em português 'O' (Oeste) ou 'W'
    direction = coordinate >= 0 ? 'L' : 'O';
  }

  const paddedDegrees = degrees.toString().padStart(isLatitude ? 2 : 3, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = Number(seconds) < 10 ? `0${seconds}` : seconds;

  return `${paddedDegrees}°${paddedMinutes}'${paddedSeconds}"${direction}`;
}

/**
 * Formats Lat/Lng to GMS / DMS string.
 */
export function latLngToDMS(lat: number, lng: number): DMSResult {
  const latDMS = toDMS(lat, true);
  const lngDMS = toDMS(lng, false);
  return {
    latDMS,
    lngDMS,
    formatted: `${latDMS}  ${lngDMS}`,
  };
}

/**
 * Formats Lat/Lng into Decimal Degrees.
 */
export function latLngToDecimal(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'L' : 'O';
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

/**
 * Formats according to selected coordinate format preference.
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  format: CoordinateFormat
): { primary: string; secondary?: string } {
  const utm = latLngToUTM(lat, lng);
  const dms = latLngToDMS(lat, lng);
  const dec = latLngToDecimal(lat, lng);

  switch (format) {
    case 'utm':
      return { primary: utm.formatted, secondary: dec };
    case 'gms':
      return { primary: dms.formatted, secondary: `(Dec: ${dec})` };
    case 'decimal':
      return { primary: `Lat ${lat.toFixed(6)}° | Long ${lng.toFixed(6)}°`, secondary: utm.formatted };
    case 'all':
    default:
      return {
        primary: `${utm.formatted}`,
        secondary: `${dms.formatted} (${lat.toFixed(6)}°, ${lng.toFixed(6)}°)`,
      };
  }
}

/**
 * Converts compass angle (0-360) into cardinal abbreviation (N, NE, L/E, SE, S, SO/SW, O/W, NO/NW).
 */
export function headingToCardinal(heading: number | null): string {
  if (heading === null || isNaN(heading)) return '--';
  const normalized = (heading % 360 + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'L', 'ESE', 'SE', 'SSE',
    'S', 'SSO', 'SO', 'OSO',
    'O', 'ONO', 'NO', 'NNO'
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return `${Math.round(normalized)}° ${directions[index]}`;
}
