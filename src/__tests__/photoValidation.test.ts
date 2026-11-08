import {
  extractExtension,
  isSupportedFormat,
  resolveFormat,
  isFileSizeValid,
  validatePhotoFile,
  buildCounterDisplay,
  buildPermissionDeniedMessage,
  buildOfflineMessage,
  MAX_FILE_SIZE_BYTES,
  MAX_PHOTOS,
} from '../utils/photoValidation';

// ─── extractExtension ─────────────────────────────────────────────────────────

describe('extractExtension', () => {
  it('extracts jpg from filename', () => {
    expect(extractExtension('damage.jpg')).toBe('jpg');
  });
  it('extracts png from filename', () => {
    expect(extractExtension('photo.PNG')).toBe('png');
  });
  it('extracts heic from filename', () => {
    expect(extractExtension('IMG_001.HEIC')).toBe('heic');
  });
  it('extracts from multi-dot filename', () => {
    expect(extractExtension('my.damage.photo.jpeg')).toBe('jpeg');
  });
  it('returns empty string for no extension', () => {
    expect(extractExtension('nodotfile')).toBe('');
  });
});

// ─── isSupportedFormat ───────────────────────────────────────────────────────

describe('isSupportedFormat', () => {
  it('accepts image/jpeg mime type', () => {
    expect(isSupportedFormat('image/jpeg')).toBe(true);
  });
  it('accepts image/jpg mime type', () => {
    expect(isSupportedFormat('image/jpg')).toBe(true);
  });
  it('accepts image/png mime type', () => {
    expect(isSupportedFormat('image/png')).toBe(true);
  });
  it('accepts image/heic mime type', () => {
    expect(isSupportedFormat('image/heic')).toBe(true);
  });
  it('accepts image/heif mime type', () => {
    expect(isSupportedFormat('image/heif')).toBe(true);
  });
  it('accepts bare jpg extension', () => {
    expect(isSupportedFormat('jpg')).toBe(true);
  });
  it('accepts bare jpeg extension', () => {
    expect(isSupportedFormat('jpeg')).toBe(true);
  });
  it('accepts bare png extension', () => {
    expect(isSupportedFormat('png')).toBe(true);
  });
  it('accepts bare heic extension', () => {
    expect(isSupportedFormat('heic')).toBe(true);
  });
  it('rejects gif', () => {
    expect(isSupportedFormat('image/gif')).toBe(false);
  });
  it('rejects bmp', () => {
    expect(isSupportedFormat('bmp')).toBe(false);
  });
  it('rejects pdf', () => {
    expect(isSupportedFormat('application/pdf')).toBe(false);
  });
  it('rejects webp', () => {
    expect(isSupportedFormat('image/webp')).toBe(false);
  });
  it('rejects tiff', () => {
    expect(isSupportedFormat('image/tiff')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isSupportedFormat('')).toBe(false);
  });
});

// ─── resolveFormat ───────────────────────────────────────────────────────────

describe('resolveFormat', () => {
  it('resolves image/jpeg to jpg', () => {
    expect(resolveFormat('image/jpeg')).toBe('jpg');
  });
  it('resolves image/heif to heic', () => {
    expect(resolveFormat('image/heif')).toBe('heic');
  });
  it('resolves bare png to png', () => {
    expect(resolveFormat('png')).toBe('png');
  });
  it('returns null for unsupported', () => {
    expect(resolveFormat('image/gif')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(resolveFormat('')).toBeNull();
  });
});

// ─── isFileSizeValid ──────────────────────────────────────────────────────────

describe('isFileSizeValid', () => {
  it('accepts file at exactly 15 MB', () => {
    expect(isFileSizeValid(MAX_FILE_SIZE_BYTES)).toBe(true);
  });
  it('accepts file below 15 MB', () => {
    expect(isFileSizeValid(1024 * 1024)).toBe(true); // 1 MB
  });
  it('rejects file above 15 MB', () => {
    expect(isFileSizeValid(MAX_FILE_SIZE_BYTES + 1)).toBe(false);
  });
  it('rejects zero byte file', () => {
    expect(isFileSizeValid(0)).toBe(false);
  });
  it('rejects negative size', () => {
    expect(isFileSizeValid(-1)).toBe(false);
  });
  it('accepts file at custom max', () => {
    expect(isFileSizeValid(5000, 5000)).toBe(true);
  });
  it('rejects file exceeding custom max', () => {
    expect(isFileSizeValid(5001, 5000)).toBe(false);
  });
});

// ─── validatePhotoFile ───────────────────────────────────────────────────────

describe('validatePhotoFile', () => {
  const validParams = {
    fileName: 'damage.jpg',
    fileSize: 1024 * 1024, // 1 MB
    mimeType: 'image/jpeg',
    currentCount: 0,
  };

  it('returns null for a valid jpg file', () => {
    expect(validatePhotoFile(validParams)).toBeNull();
  });

  it('returns null for a valid png file', () => {
    expect(validatePhotoFile({ ...validParams, fileName: 'photo.png', mimeType: 'image/png' })).toBeNull();
  });

  it('returns null for a valid heic file', () => {
    expect(validatePhotoFile({ ...validParams, fileName: 'img.heic', mimeType: 'image/heic' })).toBeNull();
  });

  // AC: Dateien, die das Format oder die Größe überschreiten, werden abgelehnt
  it('returns INVALID_FORMAT error for gif', () => {
    const result = validatePhotoFile({ ...validParams, fileName: 'anim.gif', mimeType: 'image/gif' });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('INVALID_FORMAT');
    expect(result!.message).toContain('.jpg');
  });

  it('returns INVALID_FORMAT error for pdf', () => {
    const result = validatePhotoFile({
      ...validParams,
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
    });
    expect(result!.code).toBe('INVALID_FORMAT');
  });

  it('returns INVALID_FORMAT error for webp', () => {
    const result = validatePhotoFile({
      ...validParams,
      fileName: 'photo.webp',
      mimeType: 'image/webp',
    });
    expect(result!.code).toBe('INVALID_FORMAT');
  });

  // AC: maximale Dateigröße 15 MB
  it('returns FILE_TOO_LARGE error for file exceeding 15 MB', () => {
    const result = validatePhotoFile({
      ...validParams,
      fileSize: MAX_FILE_SIZE_BYTES + 1,
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FILE_TOO_LARGE');
    expect(result!.message).toContain('15');
  });

  it('returns FILE_TOO_LARGE with size info', () => {
    const bigSize = MAX_FILE_SIZE_BYTES + 1024 * 1024;
    const result = validatePhotoFile({ ...validParams, fileSize: bigSize });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('FILE_TOO_LARGE');
    if (result !== null && result.code === 'FILE_TOO_LARGE') {
      expect(result.fileSizeBytes).toBe(bigSize);
      expect(result.maxSizeBytes).toBe(MAX_FILE_SIZE_BYTES);
    }
  });

  // AC: Pro Schadensmeldung maximal 10 Bilder
  it('returns LIMIT_EXCEEDED when count equals maxPhotos', () => {
    const result = validatePhotoFile({ ...validParams, currentCount: MAX_PHOTOS });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('LIMIT_EXCEEDED');
    expect(result!.message).toContain('10');
  });

  it('returns LIMIT_EXCEEDED when count exceeds maxPhotos', () => {
    const result = validatePhotoFile({ ...validParams, currentCount: MAX_PHOTOS + 1 });
    expect(result!.code).toBe('LIMIT_EXCEEDED');
  });

  it('returns null when count is exactly one below limit', () => {
    const result = validatePhotoFile({ ...validParams, currentCount: MAX_PHOTOS - 1 });
    expect(result).toBeNull();
  });

  // LIMIT_EXCEEDED takes priority over format error
  it('LIMIT_EXCEEDED takes priority over INVALID_FORMAT', () => {
    const result = validatePhotoFile({
      fileName: 'anim.gif',
      fileSize: 1024,
      mimeType: 'image/gif',
      currentCount: MAX_PHOTOS,
    });
    expect(result!.code).toBe('LIMIT_EXCEEDED');
  });

  // Extension fallback when MIME type is generic
  it('falls back to extension when mimeType is application/octet-stream', () => {
    const result = validatePhotoFile({
      fileName: 'photo.jpg',
      fileSize: 1024,
      mimeType: 'application/octet-stream',
      currentCount: 0,
    });
    expect(result).toBeNull(); // extension jpg is valid
  });

  it('rejects if both mimeType and extension are invalid', () => {
    const result = validatePhotoFile({
      fileName: 'photo.bmp',
      fileSize: 1024,
      mimeType: 'image/bmp',
      currentCount: 0,
    });
    expect(result!.code).toBe('INVALID_FORMAT');
  });
});

// ─── buildCounterDisplay ──────────────────────────────────────────────────────

describe('buildCounterDisplay', () => {
  // AC: Zähleranzeige im Format X/10
  it('displays 0/10 initially', () => {
    expect(buildCounterDisplay(0)).toBe('0/10');
  });
  it('displays 1/10 after first photo', () => {
    expect(buildCounterDisplay(1)).toBe('1/10');
  });
  it('displays 10/10 at limit', () => {
    expect(buildCounterDisplay(10)).toBe('10/10');
  });
  it('uses custom max', () => {
    expect(buildCounterDisplay(3, 5)).toBe('3/5');
  });
});

// ─── buildPermissionDeniedMessage ────────────────────────────────────────────

describe('buildPermissionDeniedMessage', () => {
  // AC: erklärende Meldung mit Hinweis zur manuellen Aktivierung
  it('mentions Kamera for camera source', () => {
    const msg = buildPermissionDeniedMessage('camera');
    expect(msg).toContain('Kamera');
    expect(msg).toContain('Einstellungen');
  });
  it('mentions Galerie for gallery source', () => {
    const msg = buildPermissionDeniedMessage('gallery');
    expect(msg.toLowerCase()).toContain('galerie');
    expect(msg).toContain('Einstellungen');
  });
  it('is a non-empty string', () => {
    expect(buildPermissionDeniedMessage('camera').length).toBeGreaterThan(20);
  });
});

// ─── buildOfflineMessage ─────────────────────────────────────────────────────

describe('buildOfflineMessage', () => {
  it('returns exact prescribed offline message', () => {
    const msg = buildOfflineMessage();
    expect(msg).toBe(
      'Keine Internetverbindung. Die Bilder werden hochgeladen, sobald Du wieder online bist.',
    );
  });
});
