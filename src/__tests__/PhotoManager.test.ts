import { PhotoManager } from '../services/PhotoManager';
import {
  IPermissionService,
  IMediaService,
  INetworkService,
  PermissionResult,
  RawMediaResult,
  PhotoManagerConfig,
} from '../types';
import { MAX_FILE_SIZE_BYTES, MAX_PHOTOS } from '../utils/photoValidation';

// ─── Mock factories ───────────────────────────────────────────────────────────

function makePermissionService(status: 'granted' | 'denied' = 'granted'): IPermissionService {
  return {
    requestCameraPermission: jest.fn().mockResolvedValue({ status, canAskAgain: status === 'denied' } as PermissionResult),
    requestGalleryPermission: jest.fn().mockResolvedValue({ status, canAskAgain: status === 'denied' } as PermissionResult),
    getCameraPermissionStatus: jest.fn().mockResolvedValue(status),
    getGalleryPermissionStatus: jest.fn().mockResolvedValue(status),
  };
}

function makeMediaService(result: RawMediaResult): IMediaService {
  return {
    openCamera: jest.fn().mockResolvedValue(result),
    openGallery: jest.fn().mockResolvedValue(result),
  };
}

function makeNetworkService(isConnected: boolean): INetworkService {
  return {
    getNetworkStatus: jest.fn().mockResolvedValue({ isConnected }),
    onConnectivityChange: jest.fn().mockReturnValue(() => {}),
  };
}

const defaultConfig: PhotoManagerConfig = {
  maxPhotos: MAX_PHOTOS,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  supportedFormats: ['jpg', 'jpeg', 'png', 'heic'],
  platform: 'android',
};

function makeValidMedia(overrides?: Partial<Extract<RawMediaResult, { cancelled: false }>>): Extract<RawMediaResult, { cancelled: false }> {
  return {
    cancelled: false,
    uri: 'file:///sdcard/DCIM/damage001.jpg',
    fileName: 'damage001.jpg',
    fileSize: 2 * 1024 * 1024, // 2 MB
    mimeType: 'image/jpeg',
    ...overrides,
  };
}

function makeManager(opts?: {
  permStatus?: 'granted' | 'denied';
  mediaResult?: RawMediaResult;
  connected?: boolean;
  config?: Partial<PhotoManagerConfig>;
}): PhotoManager {
  const permStatus = opts?.permStatus ?? 'granted';
  const mediaResult = opts?.mediaResult ?? makeValidMedia();
  const connected = opts?.connected ?? true;
  return new PhotoManager(
    { ...defaultConfig, ...(opts?.config ?? {}) },
    makePermissionService(permStatus),
    makeMediaService(mediaResult),
    makeNetworkService(connected),
  );
}

// ─── Initial State ────────────────────────────────────────────────────────────

describe('PhotoManager – initial state', () => {
  it('starts with 0 photos', () => {
    const mgr = makeManager();
    expect(mgr.getState().count).toBe(0);
  });

  // AC: Zähleranzeige im Format X/10
  it('displays counter as 0/10 initially', () => {
    const mgr = makeManager();
    expect(mgr.getState().counterDisplay).toBe('0/10');
  });

  it('is not at limit initially', () => {
    expect(makeManager().getState().isAtLimit).toBe(false);
  });

  it('photos array is empty', () => {
    expect(makeManager().getState().photos).toHaveLength(0);
  });
});

// ─── Add from Camera ──────────────────────────────────────────────────────────

describe('PhotoManager – addPhotoFromCamera', () => {
  // AC: Die App bietet zwei Optionen: In-App-Kamera und Galerie-Auswahl
  it('successfully adds a photo from camera', async () => {
    const mgr = makeManager();
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo.source).toBe('camera');
      expect(result.photo.format).toBe('jpg');
    }
  });

  it('increments counter after camera capture', async () => {
    const mgr = makeManager();
    await mgr.addPhotoFromCamera();
    const state = mgr.getState();
    expect(state.count).toBe(1);
    expect(state.counterDisplay).toBe('1/10');
  });

  // AC: Beim ersten Zugriff zeigt die App einen Berechtigungs-Dialog an
  it('requests camera permission before opening camera', async () => {
    const permService = makePermissionService('granted');
    const mgr = new PhotoManager(
      defaultConfig,
      permService,
      makeMediaService(makeValidMedia()),
      makeNetworkService(true),
    );
    await mgr.addPhotoFromCamera();
    expect(permService.requestCameraPermission).toHaveBeenCalledTimes(1);
  });

  // AC: Verweigert der Nutzer, zeigt die App eine erklärende Meldung
  it('returns PERMISSION_DENIED when camera permission denied', async () => {
    const mgr = makeManager({ permStatus: 'denied' });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
      expect(result.error.message).toContain('Kamera');
      expect(result.error.message).toContain('Einstellungen');
    }
  });

  it('returns USER_CANCELLED when user cancels camera', async () => {
    const mgr = makeManager({ mediaResult: { cancelled: true } });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('USER_CANCELLED');
    }
  });

  it('returns CAMERA_UNAVAILABLE when camera throws', async () => {
    const permService = makePermissionService('granted');
    const failingMedia: IMediaService = {
      openCamera: jest.fn().mockRejectedValue(new Error('no camera')),
      openGallery: jest.fn(),
    };
    const mgr = new PhotoManager(defaultConfig, permService, failingMedia, makeNetworkService(true));
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('CAMERA_UNAVAILABLE');
    }
  });

  // AC: unterstützte Formate .jpg, .png, .heic
  it('rejects unsupported format from camera', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileName: 'anim.gif', mimeType: 'image/gif' }),
    });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_FORMAT');
      expect(result.error.message).toContain('.jpg');
    }
  });

  // AC: maximale Dateigröße 15 MB
  it('rejects file exceeding 15 MB from camera', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileSize: MAX_FILE_SIZE_BYTES + 1 }),
    });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FILE_TOO_LARGE');
    }
  });

  it('accepts file at exactly 15 MB', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileSize: MAX_FILE_SIZE_BYTES }),
    });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(true);
  });
});

// ─── Add from Gallery ─────────────────────────────────────────────────────────

describe('PhotoManager – addPhotoFromGallery', () => {
  // AC: Die App bietet zwei Optionen: In-App-Kamera und Galerie-Auswahl
  it('successfully adds a photo from gallery', async () => {
    const mgr = makeManager();
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo.source).toBe('gallery');
    }
  });

  it('increments counter after gallery selection', async () => {
    const mgr = makeManager();
    await mgr.addPhotoFromGallery();
    const state = mgr.getState();
    expect(state.count).toBe(1);
    expect(state.counterDisplay).toBe('1/10');
  });

  // AC: Beim ersten Zugriff zeigt die App einen Berechtigungs-Dialog an
  it('requests gallery permission before opening gallery', async () => {
    const permService = makePermissionService('granted');
    const mgr = new PhotoManager(
      defaultConfig,
      permService,
      makeMediaService(makeValidMedia()),
      makeNetworkService(true),
    );
    await mgr.addPhotoFromGallery();
    expect(permService.requestGalleryPermission).toHaveBeenCalledTimes(1);
  });

  // AC: Verweigert der Nutzer, zeigt die App eine erklärende Meldung
  it('returns PERMISSION_DENIED with gallery message when denied', async () => {
    const mgr = makeManager({ permStatus: 'denied' });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERMISSION_DENIED');
      expect(result.error.message.toLowerCase()).toContain('galerie');
      expect(result.error.message).toContain('Einstellungen');
    }
  });

  it('returns USER_CANCELLED when user cancels gallery', async () => {
    const mgr = makeManager({ mediaResult: { cancelled: true } });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('USER_CANCELLED');
    }
  });

  it('accepts heic format from gallery', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileName: 'IMG_1234.heic', mimeType: 'image/heic' }),
    });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.photo.format).toBe('heic');
    }
  });

  it('accepts png format from gallery', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileName: 'screenshot.png', mimeType: 'image/png' }),
    });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(true);
  });

  // AC: Dateien, die das Format überschreiten, werden abgelehnt
  it('rejects bmp format from gallery', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileName: 'old.bmp', mimeType: 'image/bmp' }),
    });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_FORMAT');
    }
  });

  it('falls back to extension when mime is generic', async () => {
    const mgr = makeManager({
      mediaResult: makeValidMedia({ fileName: 'photo.jpg', mimeType: 'application/octet-stream' }),
    });
    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(true);
  });
});

// ─── Photo Limit ──────────────────────────────────────────────────────────────

describe('PhotoManager – photo limit (max 10)', () => {
  async function fillToLimit(mgr: PhotoManager, count: number = MAX_PHOTOS) {
    for (let i = 0; i < count; i++) {
      await mgr.addPhotoFromGallery();
    }
  }

  // AC: maximal 10 Bilder; bei Erreichen des Limits sind weitere Aktionen blockiert
  it('blocks camera when limit reached', async () => {
    const mgr = makeManager();
    await fillToLimit(mgr);
    const state = mgr.getState();
    expect(state.isAtLimit).toBe(true);
    expect(state.count).toBe(MAX_PHOTOS);

    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('LIMIT_EXCEEDED');
    }
  });

  it('blocks gallery when limit reached', async () => {
    const mgr = makeManager();
    await fillToLimit(mgr);

    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('LIMIT_EXCEEDED');
    }
  });

  it('shows 10/10 counter at limit', async () => {
    const mgr = makeManager();
    await fillToLimit(mgr);
    expect(mgr.getState().counterDisplay).toBe('10/10');
  });

  it('allows adding after removing below limit', async () => {
    const mgr = makeManager();
    await fillToLimit(mgr);

    // Remove one
    const photoId = mgr.getState().photos[0].id;
    mgr.removePhoto(photoId);

    expect(mgr.getState().count).toBe(MAX_PHOTOS - 1);
    expect(mgr.getState().isAtLimit).toBe(false);

    const result = await mgr.addPhotoFromGallery();
    expect(result.success).toBe(true);
  });

  it('does not exceed limit even with rapid adds', async () => {
    const mgr = makeManager();
    // Add 12 photos (should stop at 10)
    for (let i = 0; i < 12; i++) {
      await mgr.addPhotoFromGallery();
    }
    expect(mgr.getState().count).toBe(MAX_PHOTOS);
  });
});

// ─── Remove Photos ────────────────────────────────────────────────────────────

describe('PhotoManager – removePhoto', () => {
  it('removes an existing photo by id', async () => {
    const mgr = makeManager();
    const addResult = await mgr.addPhotoFromGallery();
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    const removed = mgr.removePhoto(addResult.photo.id);
    expect(removed).toBe(true);
    expect(mgr.getState().count).toBe(0);
  });

  // AC: Zähleranzeige wird nach Entfernen aktualisiert
  it('updates counter after removal', async () => {
    const mgr = makeManager();
    await mgr.addPhotoFromGallery();
    await mgr.addPhotoFromGallery();
    const photoId = mgr.getState().photos[0].id;
    mgr.removePhoto(photoId);
    expect(mgr.getState().counterDisplay).toBe('1/10');
  });

  it('returns false when photo not found', () => {
    const mgr = makeManager();
    expect(mgr.removePhoto('nonexistent_id')).toBe(false);
  });

  it('clearPhotos removes all photos', async () => {
    const mgr = makeManager();
    await mgr.addPhotoFromGallery();
    await mgr.addPhotoFromGallery();
    mgr.clearPhotos();
    expect(mgr.getState().count).toBe(0);
    expect(mgr.getState().counterDisplay).toBe('0/10');
  });
});

// ─── Counter Display ──────────────────────────────────────────────────────────

describe('PhotoManager – counter display accuracy', () => {
  it('updates counter on each add', async () => {
    const mgr = makeManager();
    for (let i = 1; i <= 5; i++) {
      await mgr.addPhotoFromGallery();
      expect(mgr.getState().counterDisplay).toBe(`${i}/10`);
    }
  });

  it('counter reflects state correctly after mixed adds and removes', async () => {
    const mgr = makeManager();
    await mgr.addPhotoFromGallery(); // 1
    await mgr.addPhotoFromGallery(); // 2
    await mgr.addPhotoFromGallery(); // 3
    const id = mgr.getState().photos[1].id;
    mgr.removePhoto(id);             // 2
    expect(mgr.getState().counterDisplay).toBe('2/10');
  });
});

// ─── Offline Support ──────────────────────────────────────────────────────────

describe('PhotoManager – offline support', () => {
  // AC: exact offline message
  it('returns the prescribed offline message', () => {
    const mgr = makeManager({ connected: false });
    expect(mgr.getOfflineMessage()).toBe(
      'Keine Internetverbindung. Die Bilder werden hochgeladen, sobald Du wieder online bist.',
    );
  });

  it('marks photos as pending upload when offline', async () => {
    const mgr = makeManager({ connected: false });
    await mgr.addPhotoFromGallery();

    const { isConnected, offlineMessage } = await mgr.checkConnectivityAndQueueIfOffline();
    expect(isConnected).toBe(false);
    expect(offlineMessage).toContain('Keine Internetverbindung');

    const pending = mgr.getPendingPhotos();
    expect(pending).toHaveLength(1);
    expect(pending[0].pendingUpload).toBe(true);
  });

  it('no pending photos when online', async () => {
    const mgr = makeManager({ connected: true });
    await mgr.addPhotoFromGallery();

    const { isConnected } = await mgr.checkConnectivityAndQueueIfOffline();
    expect(isConnected).toBe(true);
    expect(mgr.getPendingPhotos()).toHaveLength(0);
  });

  it('marks photo as uploaded', async () => {
    const mgr = makeManager({ connected: false });
    const result = await mgr.addPhotoFromGallery();
    if (!result.success) return;

    await mgr.checkConnectivityAndQueueIfOffline();
    expect(mgr.getPendingPhotos()).toHaveLength(1);

    mgr.markAsUploaded(result.photo.id);
    expect(mgr.getPendingPhotos()).toHaveLength(0);
    expect(mgr.getState().photos[0].uploaded).toBe(true);
  });

  it('markAsUploaded returns false for unknown id', () => {
    const mgr = makeManager();
    expect(mgr.markAsUploaded('no_such_id')).toBe(false);
  });
});

// ─── Permission helpers ───────────────────────────────────────────────────────

describe('PhotoManager – permission helpers', () => {
  it('requestCameraPermission returns granted=true when granted', async () => {
    const mgr = makeManager({ permStatus: 'granted' });
    const result = await mgr.requestCameraPermission();
    expect(result.granted).toBe(true);
    expect(result.deniedMessage).toBeUndefined();
  });

  it('requestCameraPermission returns denied message when denied', async () => {
    const mgr = makeManager({ permStatus: 'denied' });
    const result = await mgr.requestCameraPermission();
    expect(result.granted).toBe(false);
    expect(result.deniedMessage).toContain('Kamera');
    expect(result.deniedMessage).toContain('Einstellungen');
  });

  it('requestGalleryPermission returns granted=true when granted', async () => {
    const mgr = makeManager({ permStatus: 'granted' });
    const result = await mgr.requestGalleryPermission();
    expect(result.granted).toBe(true);
  });

  it('requestGalleryPermission returns denied message when denied', async () => {
    const mgr = makeManager({ permStatus: 'denied' });
    const result = await mgr.requestGalleryPermission();
    expect(result.granted).toBe(false);
    expect(result.deniedMessage).toBeDefined();
    expect(result.deniedMessage!.toLowerCase()).toContain('galerie');
  });
});

// ─── Platform configuration ───────────────────────────────────────────────────

describe('PhotoManager – platform support', () => {
  // AC: lauffähig auf iOS und Android
  it('works with ios platform config', async () => {
    const mgr = makeManager({ config: { platform: 'ios' } });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(true);
  });

  it('works with android platform config', async () => {
    const mgr = makeManager({ config: { platform: 'android' } });
    const result = await mgr.addPhotoFromCamera();
    expect(result.success).toBe(true);
  });
});

// ─── DamagePhoto metadata ─────────────────────────────────────────────────────

describe('PhotoManager – photo metadata', () => {
  it('stores correct uri, fileName, fileSize, mimeType', async () => {
    const mgr = makeManager();
    const result = await mgr.addPhotoFromGallery();
    if (!result.success) return;
    const photo = result.photo;
    expect(photo.uri).toBe('file:///sdcard/DCIM/damage001.jpg');
    expect(photo.fileName).toBe('damage001.jpg');
    expect(photo.fileSize).toBe(2 * 1024 * 1024);
    expect(photo.mimeType).toBe('image/jpeg');
  });

  it('assigns unique ids to each photo', async () => {
    const mgr = makeManager();
    const r1 = await mgr.addPhotoFromGallery();
    const r2 = await mgr.addPhotoFromGallery();
    if (!r1.success || !r2.success) return;
    expect(r1.photo.id).not.toBe(r2.photo.id);
  });

  it('sets addedAt as a Date', async () => {
    const mgr = makeManager();
    const before = new Date();
    const result = await mgr.addPhotoFromGallery();
    const after = new Date();
    if (!result.success) return;
    expect(result.photo.addedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.photo.addedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('newly added photo is not uploaded and not pendingUpload', async () => {
    const mgr = makeManager();
    const result = await mgr.addPhotoFromGallery();
    if (!result.success) return;
    expect(result.photo.uploaded).toBe(false);
    expect(result.photo.pendingUpload).toBe(false);
  });
});
