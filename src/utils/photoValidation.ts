import { SupportedFormat, PhotoError } from '../types';

/** Maximum file size: 15 MB in bytes */
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

/** Maximum photos per damage report */
export const MAX_PHOTOS = 10;

/** Supported image formats */
export const SUPPORTED_FORMATS: SupportedFormat[] = ['jpg', 'jpeg', 'png', 'heic'];

/**
 * Extracts the file extension from a file name or URI, lowercased.
 */
export function extractExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Checks whether a MIME type or file extension is a supported format.
 * Accepts: image/jpeg, image/jpg, image/png, image/heic
 * or bare extensions: jpg, jpeg, png, heic
 */
export function isSupportedFormat(mimeTypeOrExtension: string): boolean {
  const lower = mimeTypeOrExtension.toLowerCase().trim();

  // Handle MIME types
  const mimeMap: Record<string, SupportedFormat> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heic',
  };
  if (mimeMap[lower]) return true;

  // Handle bare extensions
  return (SUPPORTED_FORMATS as string[]).includes(lower);
}

/**
 * Resolves a MIME type or file extension to a canonical SupportedFormat.
 * Returns null if unsupported.
 */
export function resolveFormat(mimeTypeOrExtension: string): SupportedFormat | null {
  const lower = mimeTypeOrExtension.toLowerCase().trim();

  const mimeMap: Record<string, SupportedFormat> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heic',
  };
  if (mimeMap[lower]) return mimeMap[lower];

  if ((SUPPORTED_FORMATS as string[]).includes(lower)) {
    return lower as SupportedFormat;
  }
  return null;
}

/**
 * Validates file size against the maximum allowed.
 */
export function isFileSizeValid(fileSizeBytes: number, maxSizeBytes: number = MAX_FILE_SIZE_BYTES): boolean {
  return fileSizeBytes > 0 && fileSizeBytes <= maxSizeBytes;
}

/**
 * Validates all aspects of a file for use as a damage photo.
 * Returns null if valid, or a PhotoError if invalid.
 */
export function validatePhotoFile(params: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  currentCount: number;
  maxPhotos?: number;
  maxFileSizeBytes?: number;
}): PhotoError | null {
  const {
    fileName,
    fileSize,
    mimeType,
    currentCount,
    maxPhotos = MAX_PHOTOS,
    maxFileSizeBytes = MAX_FILE_SIZE_BYTES,
  } = params;

  // Check photo limit first
  if (currentCount >= maxPhotos) {
    return {
      code: 'LIMIT_EXCEEDED',
      message: `Maximal ${maxPhotos} Bilder pro Schadensmeldung erlaubt. Bitte entferne ein Bild, bevor du ein neues hinzufügst.`,
    };
  }

  // Check format via MIME type first, then fall back to extension
  const formatFromMime = resolveFormat(mimeType);
  const extension = extractExtension(fileName);
  const formatFromExt = resolveFormat(extension);
  const resolvedFormat = formatFromMime ?? formatFromExt;

  if (!resolvedFormat) {
    const detectedFormat = extension || mimeType;
    return {
      code: 'INVALID_FORMAT',
      message: `Das Dateiformat „${detectedFormat}" wird nicht unterstützt. Bitte verwende .jpg, .png oder .heic.`,
      format: detectedFormat,
    };
  }

  // Check file size
  if (!isFileSizeValid(fileSize, maxFileSizeBytes)) {
    const maxMB = Math.round(maxFileSizeBytes / (1024 * 1024));
    const fileMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      code: 'FILE_TOO_LARGE',
      message: `Das Bild ist ${fileMB} MB groß und überschreitet die maximale Dateigröße von ${maxMB} MB.`,
      fileSizeBytes: fileSize,
      maxSizeBytes: maxFileSizeBytes,
    };
  }

  return null;
}

/**
 * Builds the counter display string, e.g. "3/10".
 */
export function buildCounterDisplay(count: number, maxPhotos: number = MAX_PHOTOS): string {
  return `${count}/${maxPhotos}`;
}

/**
 * Returns a human-readable permission denied message with instructions.
 */
export function buildPermissionDeniedMessage(source: 'camera' | 'gallery'): string {
  const resource = source === 'camera' ? 'Kamera' : 'Fotogalerie';
  return (
    `Der Zugriff auf die ${resource} wurde verweigert. ` +
    `Bitte aktiviere die Berechtigung manuell in den Geräteeinstellungen unter Einstellungen > Datenschutz > ${resource}.`
  );
}

/**
 * Returns the offline pending message.
 */
export function buildOfflineMessage(): string {
  return 'Keine Internetverbindung. Die Bilder werden hochgeladen, sobald Du wieder online bist.';
}
