/**
 * Supported image file formats for damage report photos.
 */
export type SupportedFormat = 'jpg' | 'jpeg' | 'png' | 'heic';

/**
 * Platform identifiers.
 */
export type Platform = 'ios' | 'android';

/**
 * Permission status for camera or gallery access.
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

/**
 * Source of the photo.
 */
export type PhotoSource = 'camera' | 'gallery';

/**
 * Represents a single photo attached to a damage report.
 */
export interface DamagePhoto {
  /** Unique identifier for the photo */
  id: string;
  /** URI/path to the photo file */
  uri: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Detected file format */
  format: SupportedFormat;
  /** Source of the photo */
  source: PhotoSource;
  /** Timestamp when the photo was added */
  addedAt: Date;
  /** Whether the photo is pending upload (offline mode) */
  pendingUpload: boolean;
  /** Whether the photo has been successfully uploaded */
  uploaded: boolean;
}

/**
 * Result of a permission request.
 */
export interface PermissionResult {
  status: PermissionStatus;
  /** Whether the app can still ask again */
  canAskAgain: boolean;
}

/**
 * Result of adding a photo.
 */
export type AddPhotoResult =
  | { success: true; photo: DamagePhoto }
  | { success: false; error: PhotoError };

/**
 * Possible errors when adding a photo.
 */
export type PhotoError =
  | { code: 'PERMISSION_DENIED'; message: string }
  | { code: 'LIMIT_EXCEEDED'; message: string }
  | { code: 'INVALID_FORMAT'; message: string; format: string }
  | { code: 'FILE_TOO_LARGE'; message: string; fileSizeBytes: number; maxSizeBytes: number }
  | { code: 'CAMERA_UNAVAILABLE'; message: string }
  | { code: 'USER_CANCELLED'; message: string }
  | { code: 'UNKNOWN'; message: string };

/**
 * Configuration for the photo manager.
 */
export interface PhotoManagerConfig {
  maxPhotos: number;
  maxFileSizeBytes: number;
  supportedFormats: SupportedFormat[];
  platform: Platform;
}

/**
 * State of the photo manager.
 */
export interface PhotoManagerState {
  photos: DamagePhoto[];
  count: number;
  maxPhotos: number;
  /** Display string e.g. "3/10" */
  counterDisplay: string;
  isAtLimit: boolean;
}

/**
 * Interface for platform-specific permission handling.
 */
export interface IPermissionService {
  requestCameraPermission(): Promise<PermissionResult>;
  requestGalleryPermission(): Promise<PermissionResult>;
  getCameraPermissionStatus(): Promise<PermissionStatus>;
  getGalleryPermissionStatus(): Promise<PermissionStatus>;
}

/**
 * Interface for platform-specific camera/gallery access.
 */
export interface IMediaService {
  openCamera(): Promise<RawMediaResult>;
  openGallery(): Promise<RawMediaResult>;
}

/**
 * Raw result from camera or gallery picker.
 */
export type RawMediaResult =
  | { cancelled: true }
  | { cancelled: false; uri: string; fileName: string; fileSize: number; mimeType: string };

/**
 * Network connectivity status.
 */
export interface NetworkStatus {
  isConnected: boolean;
}

/**
 * Interface for checking network connectivity.
 */
export interface INetworkService {
  getNetworkStatus(): Promise<NetworkStatus>;
  onConnectivityChange(callback: (status: NetworkStatus) => void): () => void;
}
