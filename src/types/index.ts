export interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  originalSize: number;
  originalUrl: string;
  currentUrl: string;
  width: number;
  height: number;
  type: string;
  originalType: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress?: number;
  ocrText?: string;
  
  // Visual options applied
  brightness: number;  // 0 to 200 (default 100)
  contrast: number;    // 0 to 200 (default 100)
  saturation: number;  // 0 to 200 (default 100)
  blur: number;        // 0 to 20 (default 0)
  grayscale: number;   // 0 to 100 (default 0)
  sepia: number;       // 0 to 100 (default 0)
  invert: number;      // 0 to 100 (default 0)
  hueRotate: number;   // 0 to 360 (default 0)
  
  rotation: number;    // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  
  watermarkText?: string;
  watermarkColor: string;
  watermarkSize: number;
  watermarkOpacity: number;
  watermarkPosition: string; // 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  
  // Transparent keying background color
  chromaKey?: {
    r: number;
    g: number;
    b: number;
    tolerance: number;
    fuzziness: number;
  };
  
  // Cropped area
  crop?: {
    x: number;      // percentage 0 to 100
    y: number;      // percentage 0 to 100
    width: number;  // percentage 0 to 100
    height: number; // percentage 0 to 100
  };

  // Resize options
  resizeWidth?: number;
  resizeHeight?: number;
  lockAspectRatio?: boolean;
}
