import {
  DamagePhoto,
  PhotoManagerConfig,
  PhotoManagerState,
  AddPhotoResult,
  PhotoError,
  PhotoSource,
  IPermissionService,
  IMediaService,
  INetworkService,
  PermissionStatus,
  RawMediaResult,
} from '../types';
import {
  validatePhotoFile,
  buildCounterDisplay,
  buildPermissionDeniedMessage,
  buildOfflineMessage,
  resolveFormat,
  extractExtension,
  MAX_FILE_SIZE_BYTES,
  MAX_PHOTOS,
  SUPPORTED_FORMATS,
} from '../utils/photoValidation';

/** Generates a simple unique ID */
function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * PhotoManager orchestrates photo capture, gallery selection,
 * validation, state management, and offline queuing.
 */
export class PhotoManager {
  private photos: DamagePhoto[] = [];
  private readonly config: PhotoManagerConfig;
  private readonly permissionService: IPermissionService;
  private readonly mediaService: IMediaService;
  private readonly networkService: INetworkService;

  constructor(
    config: PhotoManagerConfig,
    permissionService: IPermissionService,
    mediaService: IMediaService,
    networkService: INetworkService,
  ) {
    this.config = {
      maxPhotos: config.maxPhotos ?? MAX_PHOTOS,
      maxFileSizeBytes: config.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES,
      supportedFormats: config.supportedFormats ?? SUPPORTED_FORMATS,
      platform: config.platform,
    };
    this.permissionService = permissionService;
    this.mediaService = mediaService;
    this.networkService = networkService;
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  getState(): PhotoManagerState {
    const count = this.photos.length;
    const max = this.config.maxPhotos;
    return {
      photos: [...this.photos],
      count,
      maxPhotos: max,
      counterDisplay: buildCounterDisplay(count, max),
      isAtLimit: count >= max,
    };
  }

  // ─── Permission Handling ──────────────────────────────────────────────────────

  /**
   * Requests camera permission. Returns a PhotoError if denied, or null if granted.
   */
  async requestCameraPermission(): Promise<{ granted: boolean; deniedMessage?: string }> {
    const result = await this.permissionService.requestCameraPermission();
    if (result.status === 'granted') {
      return { granted: true };
    }
    return {
      granted: false,
      deniedMessage: buildPermissionDeniedMessage('camera'),
    };
  }

  /**
   * Requests gallery permission. Returns whether granted and optional denied message.
   */
  async requestGalleryPermission(): Promise<{ granted: boolean; deniedMessage?: string }> {
    const result = await this.permissionService.requestGalleryPermission();
    if (result.status === 'granted') {
      return { granted: true };
    }
    return {
      granted: false,
      deniedMessage: buildPermissionDeniedMessage('gallery'),
    };
  }

  // ─── Add Photos ───────────────────────────────────────────────────────────────

  /**
   * Opens the camera, requests permission if needed, and adds the captured photo.
   */
  async addPhotoFromCamera(): Promise<AddPhotoResult> {
    // Check limit before even opening camera
    if (this.photos.length >= this.config.maxPhotos) {
      return this._limitExceededError();
    }

    // Request permission
    const permResult = await this.permissionService.requestCameraPermission();
    if (permResult.status !== 'granted') {
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: buildPermissionDeniedMessage('camera'),
        },
      };
    }

    // Open camera
    let mediaResult: RawMediaResult;
    try {
      mediaResult = await this.mediaService.openCamera();
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'CAMERA_UNAVAILABLE',
          message: 'Die Kamera konnte nicht geöffnet werden. Bitte versuche es erneut.',
        },
      };
    }

    if (mediaResult.cancelled) {
      return {
        success: false,
        error: { code: 'USER_CANCELLED', message: 'Aufnahme abgebrochen.' },
      };
    }

    return this._processMediaResult(mediaResult, 'camera');
  }

  /**
   * Opens the gallery, requests permission if needed, and adds the selected photo.
   */
  async addPhotoFromGallery(): Promise<AddPhotoResult> {
    // Check limit before opening gallery
    if (this.photos.length >= this.config.maxPhotos) {
      return this._limitExceededError();
    }

    // Request permission
    const permResult = await this.permissionService.requestGalleryPermission();
    if (permResult.status !== 'granted') {
      return {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: buildPermissionDeniedMessage('gallery'),
        },
      };
    }

    // Open gallery
    let mediaResult: RawMediaResult;
    try {
      mediaResult = await this.mediaService.openGallery();
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Die Galerie konnte nicht geöffnet werden. Bitte versuche es erneut.',
        },
      };
    }

    if (mediaResult.cancelled) {
      return {
        success: false,
        error: { code: 'USER_CANCELLED', message: 'Auswahl abgebrochen.' },
      };
    }

    return this._processMediaResult(mediaResult, 'gallery');
  }

  /**
   * Directly adds a photo from raw media data (used internally and for testing).
   */
  async addPhotoFromRawMedia(
    raw: Extract<RawMediaResult, { cancelled: false }>,
    source: PhotoSource,
  ): Promise<AddPhotoResult> {
    return this._processMediaResult(raw, source);
  }

  // ─── Remove Photos ────────────────────────────────────────────────────────────

  /**
   * Removes a photo by ID. Returns true if removed, false if not found.
   */
  removePhoto(photoId: string): boolean {
    const before = this.photos.length;
    this.photos = this.photos.filter((p) => p.id !== photoId);
    return this.photos.length < before;
  }

  /**
   * Removes all photos.
   */
  clearPhotos(): void {
    this.photos = [];
  }

  // ─── Offline Support ──────────────────────────────────────────────────────────

  /**
   * Returns the offline pending message string.
   */
  getOfflineMessage(): string {
    return buildOfflineMessage();
  }

  /**
   * Returns photos that are pending upload.
   */
  getPendingPhotos(): DamagePhoto[] {
    return this.photos.filter((p) => p.pendingUpload && !p.uploaded);
  }

  /**
   * Checks network status. If offline, marks all non-uploaded photos as pending.
   * Returns whether the device is currently connected.
   */
  async checkConnectivityAndQueueIfOffline(): Promise<{ isConnected: boolean; offlineMessage?: string }> {
    const status = await this.networkService.getNetworkStatus();
    if (!status.isConnected) {
      // Mark all non-uploaded photos as pending upload
      this.photos = this.photos.map((p) =>
        !p.uploaded ? { ...p, pendingUpload: true } : p,
      );
      return { isConnected: false, offlineMessage: buildOfflineMessage() };
    }
    return { isConnected: true };
  }

  /**
   * Marks a photo as successfully uploaded.
   */
  markAsUploaded(photoId: string): boolean {
    const idx = this.photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return false;
    this.photos[idx] = { ...this.photos[idx], uploaded: true, pendingUpload: false };
    return true;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private _limitExceededError(): AddPhotoResult {
    return {
      success: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        message: `Maximal ${this.config.maxPhotos} Bilder pro Schadensmeldung erlaubt. Bitte entferne ein Bild, bevor du ein neues hinzufügst.`,
      },
    };
  }

  private _processMediaResult(
    raw: Extract<RawMediaResult, { cancelled: false }>,
    source: PhotoSource,
  ): AddPhotoResult {
    const validationError = validatePhotoFile({
      fileName: raw.fileName,
      fileSize: raw.fileSize,
      mimeType: raw.mimeType,
      currentCount: this.photos.length,
      maxPhotos: this.config.maxPhotos,
      maxFileSizeBytes: this.config.maxFileSizeBytes,
    });

    if (validationError) {
      return { success: false, error: validationError };
    }

    // Resolve format
    const formatFromMime = resolveFormat(raw.mimeType);
    const extension = extractExtension(raw.fileName);
    const formatFromExt = resolveFormat(extension);
    const format = (formatFromMime ?? formatFromExt)!;

    const photo: DamagePhoto = {
      id: generateId(),
      uri: raw.uri,
      fileName: raw.fileName,
      fileSize: raw.fileSize,
      mimeType: raw.mimeType,
      format,
      source,
      addedAt: new Date(),
      pendingUpload: false,
      uploaded: false,
    };

    this.photos.push(photo);
    return { success: true, photo };
  }
}
