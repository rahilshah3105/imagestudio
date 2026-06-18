import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { EditorCanvas } from './components/EditorCanvas';
import { OperationsPanel } from './components/OperationsPanel';
import type { ImageFile } from './types';
import { Sun, Moon, LayoutGrid, Sliders } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import './App.css';

const FILTER_PRESETS: Record<string, Partial<ImageFile>> = {
  normal: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0 },
  cyberpunk: { brightness: 105, contrast: 115, saturation: 150, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 320 },
  noir: { brightness: 100, contrast: 130, saturation: 0, blur: 0, grayscale: 100, sepia: 0, invert: 0, hueRotate: 0 },
  vintage: { brightness: 95, contrast: 110, saturation: 80, blur: 0, grayscale: 0, sepia: 35, invert: 0, hueRotate: 0 },
  dramatic: { brightness: 100, contrast: 140, saturation: 85, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0 },
  warm: { brightness: 105, contrast: 100, saturation: 115, blur: 0, grayscale: 0, sepia: 15, invert: 0, hueRotate: 0 },
  cold: { brightness: 100, contrast: 100, saturation: 85, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 190 },
  chrome: { brightness: 100, contrast: 120, saturation: 150, blur: 0, grayscale: 0, sepia: 0, invert: 0, hueRotate: 0 },
};

// Helper to calculate original image dimensions
const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
  });
};

// Adaptive Compression Helper (Binary Search)
const compressToTargetSize = async (
  canvas: HTMLCanvasElement,
  targetSizeKB: number,
  mimeType: string
): Promise<{ blob: Blob; quality: number; scale: number }> => {
  const targetBytes = targetSizeKB * 1024;
  let lowQ = 0.05;
  let highQ = 0.95;
  let bestBlob: Blob | null = null;
  let bestQuality = 0.8;
  let currentScale = 1.0;

  // JPEG is the fallback for formats like SVG/BMP which don't support compression
  const exportMime = mimeType === 'image/png' || mimeType === 'image/bmp' ? 'image/jpeg' : mimeType;
  const origWidth = canvas.width;
  const origHeight = canvas.height;

  for (let iteration = 0; iteration < 8; iteration++) {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = Math.round(origWidth * currentScale);
    testCanvas.height = Math.round(origHeight * currentScale);
    const tCtx = testCanvas.getContext('2d');
    tCtx?.drawImage(canvas, 0, 0, testCanvas.width, testCanvas.height);

    const testBlob = await new Promise<Blob | null>((resolve) => {
      testCanvas.toBlob((b) => resolve(b), exportMime, bestQuality);
    });

    if (!testBlob) break;

    if (testBlob.size <= targetBytes) {
      bestBlob = testBlob;
      lowQ = bestQuality;
      bestQuality = (bestQuality + highQ) / 2;
    } else {
      highQ = bestQuality;
      bestQuality = (bestQuality + lowQ) / 2;

      // Scale down if quality factor reduction isn't enough
      if (bestQuality < 0.2) {
        currentScale *= 0.85;
        lowQ = 0.05;
        highQ = 0.95;
        bestQuality = 0.75;
      }
    }
  }

  if (!bestBlob) {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), exportMime, 0.1);
    });
    return { blob, quality: 0.1, scale: currentScale };
  }

  return { blob: bestBlob, quality: bestQuality, scale: currentScale };
};

// Core Canvas Editing Pipeline
const applyCanvasOperations = async (
  imgFile: ImageFile,
  baseImgUrl: string,
  options?: {
    quality?: number;
    scale?: number;
    targetFormat?: string;
    targetSizeKB?: number;
    isCompressing?: boolean;
  }
): Promise<{ blob: Blob; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = baseImgUrl;
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 1. Calculate Crop & Dimensions
        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.naturalWidth;
        let srcHeight = img.naturalHeight;

        if (imgFile.crop) {
          srcX = (imgFile.crop.x / 100) * img.naturalWidth;
          srcY = (imgFile.crop.y / 100) * img.naturalHeight;
          srcWidth = (imgFile.crop.width / 100) * img.naturalWidth;
          srcHeight = (imgFile.crop.height / 100) * img.naturalHeight;
        }

        const isRotated90 = imgFile.rotation === 90 || imgFile.rotation === 270;
        let destWidth = isRotated90 ? srcHeight : srcWidth;
        let destHeight = isRotated90 ? srcWidth : srcHeight;

        // Custom dimensions resize or scale factor adjustment
        const scale = options?.scale !== undefined ? options.scale / 100 : 1.0;
        const targetWidth = (options as any)?.targetWidth;
        const targetHeight = (options as any)?.targetHeight;

        if (targetWidth && targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        } else {
          canvas.width = Math.round(destWidth * scale);
          canvas.height = Math.round(destHeight * scale);
        }

        // 2. Clear canvas & apply transformations
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();

        const finalScaleX = targetWidth ? targetWidth / destWidth : scale;
        const finalScaleY = targetHeight ? targetHeight / destHeight : scale;

        if (finalScaleX !== 1.0 || finalScaleY !== 1.0) {
          ctx.scale(finalScaleX, finalScaleY);
        }

        // Center pivot translation
        ctx.translate(canvas.width / 2 / finalScaleX, canvas.height / 2 / finalScaleY);
        ctx.rotate((imgFile.rotation * Math.PI) / 180);

        // Flip mirror transformations
        const scaleX = imgFile.flipH ? -1 : 1;
        const scaleY = imgFile.flipV ? -1 : 1;
        ctx.scale(scaleX, scaleY);

        // Apply filters
        ctx.filter = `brightness(${imgFile.brightness}%) contrast(${imgFile.contrast}%) saturate(${imgFile.saturation}%) blur(${imgFile.blur}px) grayscale(${imgFile.grayscale}%) sepia(${imgFile.sepia}%) invert(${imgFile.invert}%) hue-rotate(${imgFile.hueRotate}deg)`;

        // Draw centered image
        ctx.drawImage(
          img,
          srcX, srcY, srcWidth, srcHeight,
          -srcWidth / 2, -srcHeight / 2, srcWidth, srcHeight
        );

        ctx.restore();

        // 3. Manual Chroma Key (Color transparency selection)
        if (imgFile.chromaKey) {
          const tempImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = tempImgData.data;
          const { r: kr, g: kg, b: kb, tolerance, fuzziness } = imgFile.chromaKey;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);

            if (dist <= tolerance) {
              data[i+3] = 0;
            } else if (dist <= tolerance + fuzziness) {
              const diff = dist - tolerance;
              const alphaFraction = diff / fuzziness;
              data[i+3] = Math.min(data[i+3], Math.round(alphaFraction * 255));
            }
          }
          ctx.putImageData(tempImgData, 0, 0);
        }

        // 4. Watermark Overlay
        if (imgFile.watermarkText) {
          ctx.save();
          ctx.globalAlpha = imgFile.watermarkOpacity;
          ctx.fillStyle = imgFile.watermarkColor;

          const fontSize = Math.max(12, Math.round(imgFile.watermarkSize * (canvas.width / 800)));
          ctx.font = `bold ${fontSize}px sans-serif`;

          const padding = fontSize;
          let textX = canvas.width / 2;
          let textY = canvas.height / 2;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (imgFile.watermarkPosition === 'top-left') {
            textX = padding;
            textY = padding;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
          } else if (imgFile.watermarkPosition === 'top-right') {
            textX = canvas.width - padding;
            textY = padding;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
          } else if (imgFile.watermarkPosition === 'bottom-left') {
            textX = padding;
            textY = canvas.height - padding;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
          } else if (imgFile.watermarkPosition === 'bottom-right') {
            textX = canvas.width - padding;
            textY = canvas.height - padding;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
          }

          ctx.fillText(imgFile.watermarkText, textX, textY);
          ctx.restore();
        }

        // 5. Exporters
        const format = options?.targetFormat || imgFile.type;
        const quality = options?.quality !== undefined ? options.quality / 100 : 0.92;

        if (options?.isCompressing && options.targetSizeKB !== undefined) {
          const compResult = await compressToTargetSize(canvas, options.targetSizeKB, format);
          resolve({ blob: compResult.blob, width: canvas.width, height: canvas.height });
        } else {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ blob, width: canvas.width, height: canvas.height });
            } else {
              reject(new Error('Canvas export failed'));
            }
          }, format, quality);
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Image failed to load'));
  });
};

function App() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // Interactive tools states
  const [showSplitView, setShowSplitView] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('free');

  // Sidebars drag width states
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(360);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const [isDraggingRightResizer, setIsDraggingRightResizer] = useState(false);

  // Mobile drawer visibility states
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileOperationsOpen, setMobileOperationsOpen] = useState(false);

  // Light/Dark Theme Switcher state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  // Bulk Operations State
  const [bulkProgress, setBulkProgress] = useState<{ total: number; current: number; status: string } | null>(null);

  // Privacy Policy Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const activeFile = activeFileIndex !== null ? files[activeFileIndex] : null;
  const isBulkMode = selectedFileIds.length > 1;

  // Sync theme with Document root
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sidebar drag resizer mouse listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingResizer) {
        const newWidth = Math.max(150, Math.min(320, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isDraggingRightResizer) {
        const newWidth = Math.max(280, Math.min(450, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingResizer(false);
      setIsDraggingRightResizer(false);
    };

    if (isDraggingResizer || isDraggingRightResizer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingResizer, isDraggingRightResizer]);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach(f => {
        URL.revokeObjectURL(f.originalUrl);
        URL.revokeObjectURL(f.currentUrl);
      });
    };
  }, []);

  const handleAddFiles = async (newFiles: FileList | File[]) => {
    const fileList = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    const loadedFiles: ImageFile[] = [];

    for (const file of fileList) {
      const originalUrl = URL.createObjectURL(file);
      const { width, height } = await getImageDimensions(originalUrl);

      loadedFiles.push({
        id: Math.random().toString(36).substring(2, 11),
        file,
        name: file.name,
        size: file.size,
        originalSize: file.size,
        originalUrl,
        currentUrl: originalUrl,
        width,
        height,
        type: file.type,
        originalType: file.type,
        status: 'idle',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0,
        hueRotate: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        watermarkColor: '#ffffff',
        watermarkSize: 30,
        watermarkOpacity: 0.5,
        watermarkPosition: 'bottom-right',
      });
    }

    if (loadedFiles.length > 0) {
      setFiles(prev => {
        const next = [...prev, ...loadedFiles];
        if (activeFileIndex === null) {
          setActiveFileIndex(prev.length);
        }
        return next;
      });
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx !== -1) {
        URL.revokeObjectURL(prev[idx].originalUrl);
        URL.revokeObjectURL(prev[idx].currentUrl);
      }
      const next = prev.filter(f => f.id !== id);
      
      // Reset index
      if (next.length === 0) {
        setActiveFileIndex(null);
      } else if (activeFileIndex !== null && activeFileIndex >= next.length) {
        setActiveFileIndex(next.length - 1);
      }
      
      return next;
    });

    setSelectedFileIds(prev => prev.filter(fid => fid !== id));
  };

  const handleSelectFile = (index: number) => {
    setActiveFileIndex(index);
    // Auto sync selection state when selecting an item
    const file = files[index];
    if (file && !selectedFileIds.includes(file.id)) {
      setSelectedFileIds([file.id]);
    }
  };

  const handleToggleSelectFile = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedFileIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(fid => fid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  // Run Canvas Pipeline on property change
  const runWorkspacePipeline = async (updatedFile: ImageFile) => {
    try {
      const { blob, width, height } = await applyCanvasOperations(updatedFile, updatedFile.originalUrl);
      
      // Revoke old URL if it was edited
      if (updatedFile.currentUrl !== updatedFile.originalUrl) {
        URL.revokeObjectURL(updatedFile.currentUrl);
      }

      const currentUrl = URL.createObjectURL(blob);
      
      setFiles(prev => prev.map(f => {
        if (f.id === updatedFile.id) {
          return {
            ...updatedFile,
            currentUrl,
            size: blob.size,
            width,
            height,
            status: 'done'
          };
        }
        return f;
      }));
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map(f => f.id === updatedFile.id ? { ...f, status: 'error' } : f));
    }
  };

  // Rotations & Flips
  const handleRotate = (direction: 'left' | 'right') => {
    if (!activeFile) return;
    let nextRotation = activeFile.rotation + (direction === 'right' ? 90 : -90);
    if (nextRotation < 0) nextRotation += 360;
    nextRotation = nextRotation % 360;

    const next = { ...activeFile, rotation: nextRotation, status: 'processing' as const };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (!activeFile) return;
    const isH = direction === 'horizontal';
    const next = {
      ...activeFile,
      flipH: isH ? !activeFile.flipH : activeFile.flipH,
      flipV: !isH ? !activeFile.flipV : activeFile.flipV,
      status: 'processing' as const
    };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  // Generic adjustments / filters / chroma-key variables
  const handleApplyAdjustment = (adjustments: Partial<ImageFile>) => {
    if (!activeFile) return;
    const next = { ...activeFile, ...adjustments, status: 'processing' as const };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  // Crop image handler
  const handleApplyCrop = () => {
    if (!activeFile || !cropBox) return;
    const next = {
      ...activeFile,
      crop: {
        x: cropBox.x,
        y: cropBox.y,
        width: cropBox.width,
        height: cropBox.height
      },
      status: 'processing' as const
    };
    setIsCropMode(false);
    setCropBox(null);
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  // Color picker background chroma color selected
  const handleChromaColorSelected = (r: number, g: number, b: number) => {
    if (!activeFile) return;
    const next = {
      ...activeFile,
      chromaKey: {
        r, g, b,
        tolerance: 30,
        fuzziness: 10
      }
    };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
  };

  const handleApplyChromaKey = () => {
    if (!activeFile || !activeFile.chromaKey) return;
    const next = { ...activeFile, status: 'processing' as const };
    runWorkspacePipeline(next);
  };

  const handleResetChromaKey = () => {
    if (!activeFile) return;
    const next = { ...activeFile, chromaKey: undefined, status: 'processing' as const };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  // Watermark Apply
  const handleApplyWatermark = (text: string, color: string, size: number, opacity: number, position: string) => {
    if (!activeFile) return;
    const next = {
      ...activeFile,
      watermarkText: text,
      watermarkColor: color,
      watermarkSize: size,
      watermarkOpacity: opacity,
      watermarkPosition: position,
      status: 'processing' as const
    };
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? next : f));
    runWorkspacePipeline(next);
  };

  // Dimension Resizing Apply
  const handleApplyResize = async (width: number, height: number, _lockAspect: boolean) => {
    if (!activeFile) return;

    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'processing' } : f));

    try {
      const { blob } = await applyCanvasOperations(activeFile, activeFile.originalUrl, {
        targetWidth: width,
        targetHeight: height
      } as any);

      if (activeFile.currentUrl !== activeFile.originalUrl) {
        URL.revokeObjectURL(activeFile.currentUrl);
      }

      const currentUrl = URL.createObjectURL(blob);

      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? {
        ...f,
        currentUrl,
        size: blob.size,
        width,
        height,
        status: 'done'
      } : f));
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'error' } : f));
    }
  };

  // Filter Preset Apply
  const handleApplyFilterPreset = (presetName: string) => {
    const presetValues = FILTER_PRESETS[presetName] || FILTER_PRESETS.normal;
    handleApplyAdjustment(presetValues);
  };

  // Size Compression execution
  const handleCompressImage = async (
    mode: 'manual' | 'target',
    quality: number,
    scale: number,
    targetSizeKB: number
  ) => {
    if (!activeFile) return;
    
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'processing' } : f));

    try {
      const mime = activeFile.type === 'image/png' || activeFile.type === 'image/webp' ? activeFile.type : 'image/jpeg';
      const { blob, width, height } = await applyCanvasOperations(activeFile, activeFile.originalUrl, {
        quality,
        scale,
        targetFormat: mime,
        targetSizeKB,
        isCompressing: mode === 'target'
      });

      if (activeFile.currentUrl !== activeFile.originalUrl) {
        URL.revokeObjectURL(activeFile.currentUrl);
      }

      const currentUrl = URL.createObjectURL(blob);

      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? {
        ...f,
        currentUrl,
        size: blob.size,
        width,
        height,
        type: mime,
        status: 'done'
      } : f));
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'error' } : f));
    }
  };

  // Format Conversion execution
  const handleConvertImage = async (format: string) => {
    if (!activeFile) return;

    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'processing' } : f));

    try {
      const { blob } = await applyCanvasOperations(activeFile, activeFile.originalUrl, {
        targetFormat: format
      });

      // Download the converted image immediately
      const ext = format.split('/')[1] || 'png';
      const name = activeFile.name.replace(/\.[^/.]+$/, "") + `_converted.${ext}`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();

      // Revoke the temporary url after download triggers
      setTimeout(() => URL.revokeObjectURL(link.href), 100);

      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'done' } : f));
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'error' } : f));
    }
  };

  // OCR Text scan extraction
  const handleRunOCR = async () => {
    if (!activeFile) return;

    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'processing', progress: 0 } : f));

    try {
      const { data: { text } } = await Tesseract.recognize(
        activeFile.currentUrl,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, progress: m.progress * 100 } : f));
            }
          }
        }
      );

      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? {
        ...f,
        ocrText: text,
        status: 'done',
        progress: undefined
      } : f));
    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'error', progress: undefined } : f));
    }
  };

  // AI Background removal
  const handleRemoveBackgroundAI = async () => {
    if (!activeFile) return;

    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'processing', progress: 0 } : f));

    try {
      const responseBlob = await removeBackground(activeFile.file, {
        progress: (_, progress) => {
          setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, progress: progress * 100 } : f));
        }
      });

      const originalUrl = URL.createObjectURL(responseBlob);
      const { width, height } = await getImageDimensions(originalUrl);

      // Create new clean file version from AI output blob
      const newFile = new File([responseBlob], activeFile.name.replace(/\.[^/.]+$/, "") + '_nobg.png', { type: 'image/png' });

      // We replace originalUrl and base configuration to work with the transparent cutout
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? {
        ...f,
        file: newFile,
        originalUrl,
        currentUrl: originalUrl,
        width,
        height,
        size: responseBlob.size,
        originalSize: responseBlob.size,
        type: 'image/png',
        status: 'done',
        progress: undefined,
        chromaKey: undefined // reset manual key
      } : f));

    } catch (err) {
      console.error(err);
      setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, status: 'error', progress: undefined } : f));
    }
  };

  // Bulk Operations execution
  const handleRunBulkOperation = async (operation: string, options: any) => {
    if (selectedFileIds.length === 0) return;

    setBulkProgress({ total: selectedFileIds.length, current: 0, status: 'Initializing...' });

    const processedBlobs: { name: string; blob: Blob }[] = [];

    for (let index = 0; index < selectedFileIds.length; index++) {
      const fileId = selectedFileIds[index];
      const targetFile = files.find(f => f.id === fileId);
      if (!targetFile) continue;

      setBulkProgress({ 
        total: selectedFileIds.length, 
        current: index, 
        status: `Processing image "${targetFile.name}"...` 
      });

      try {
        let resultBlob: Blob;
        let ext = targetFile.type.split('/')[1] || 'png';

        if (operation === 'convert') {
          ext = options.format.split('/')[1];
          const res = await applyCanvasOperations(targetFile, targetFile.originalUrl, {
            targetFormat: options.format
          });
          resultBlob = res.blob;
        } else if (operation === 'compress_manual') {
          const res = await applyCanvasOperations(targetFile, targetFile.originalUrl, {
            quality: options.quality,
            scale: 100
          });
          resultBlob = res.blob;
        } else if (operation === 'compress_target') {
          const res = await applyCanvasOperations(targetFile, targetFile.originalUrl, {
            targetSizeKB: options.targetSizeKB,
            isCompressing: true
          });
          resultBlob = res.blob;
        } else if (operation === 'resize') {
          const res = await applyCanvasOperations(targetFile, targetFile.originalUrl, {
            scale: options.scale
          });
          resultBlob = res.blob;
        } else if (operation === 'bg_remove') {
          resultBlob = await removeBackground(targetFile.file);
          ext = 'png';
        } else {
          throw new Error('Unsupported operation');
        }

        const baseName = targetFile.name.replace(/\.[^/.]+$/, "");
        processedBlobs.push({
          name: `${baseName}_processed.${ext}`,
          blob: resultBlob
        });

        // Update individual file states
        setFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            return {
              ...f,
              status: 'done'
            };
          }
          return f;
        }));

      } catch (err) {
        console.error(`Error processing bulk file ${targetFile.name}:`, err);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f));
      }
    }

    setBulkProgress({ total: selectedFileIds.length, current: selectedFileIds.length, status: 'Zipping downloads...' });

    // Package results in a ZIP archive
    if (processedBlobs.length > 0) {
      const zip = new JSZip();
      processedBlobs.forEach(item => {
        zip.file(item.name, item.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `image_operations_bulk_${Date.now()}.zip`;
      link.click();

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }

    setBulkProgress({ total: selectedFileIds.length, current: selectedFileIds.length, status: 'finished' });
    setTimeout(() => setBulkProgress(null), 3000);
  };

  // Generate grid layout widths dynamically
  const leftCol = sidebarWidth === 0 ? '0px' : `${sidebarWidth}px 4px`;
  const rightCol = rightSidebarWidth === 0 ? '0px' : `4px ${rightSidebarWidth}px`;
  const gridColumns = `${leftCol} 1fr ${rightCol}`;

  return (
    <div className="app-container">
      {/* Universal Header */}
      <header className="app-header">
        <div className="app-title-section">
          <div className="app-logo" style={{ background: 'none', boxShadow: 'none', padding: 0, width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--primary)" />
                  <stop offset="50%" stop-color="#ec4899" />
                  <stop offset="100%" stop-color="var(--secondary)" />
                </linearGradient>
                <linearGradient id="headerWandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="100%" stop-color="#fbcfe8" />
                </linearGradient>
                <filter id="headerNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="50" cy="50" r="44" fill="none" stroke="url(#headerLogoGrad)" stroke-width="4" stroke-dasharray="6 4" opacity="0.3" />
              <path d="M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z" fill="none" stroke="url(#headerLogoGrad)" stroke-width="4.5" stroke-linejoin="round" filter="url(#headerNeonGlow)" />
              <circle cx="50" cy="50" r="22" fill="#0d1117" stroke="url(#headerLogoGrad)" stroke-width="3" />
              <path d="M50 28 L50 38 M69 39 L60 44 M69 61 L60 56 M50 72 L50 62 M31 61 L40 56 M31 39 L40 44" stroke="url(#headerLogoGrad)" stroke-width="2" stroke-linecap="round" opacity="0.8" />
              <circle cx="50" cy="50" r="14" fill="url(#headerLogoGrad)" opacity="0.6" />
              <circle cx="46" cy="46" r="6" fill="#ffffff" opacity="0.45" />
              <path d="M22 78 L72 28 C74 26 77 26 79 28 L82 31 C84 33 84 36 82 38 L32 88 Z" fill="url(#headerWandGrad)" opacity="0.95" />
              <path d="M75 25 L85 15 C87 13 90 16 88 18 L78 28 Z" fill="#ec4899" />
              <path d="M85 38 L87 42 L91 43 L87 44 L85 48 L83 44 L79 43 L83 42 Z" fill="var(--secondary)" />
              <path d="M15 62 L17 66 L21 67 L17 68 L15 72 L13 68 L9 67 L13 66 Z" fill="var(--primary)" />
              <path d="M50 14 L51 17 L54 18 L51 19 L50 22 L49 19 L46 18 L49 17 Z" fill="#ffffff" />
            </svg>
          </div>
          <h1>Centralized Image Studio</h1>
          <span>ALL-IN-ONE</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          {/* Smartlink Pro Features */}
          <a 
            href="https://www.effectivecpmnetwork.com/fkwr1d6jt?key=016d048bc11f59589fd9852063a40abf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ 
              padding: '0.4rem 0.8rem', 
              fontSize: '0.8rem', 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              boxShadow: '0 0 10px var(--primary-glow)' 
            }}
          >
            💎 Premium Tools
          </a>

          {/* Light / Dark Mode Toggle */}
          <button
            className="btn-secondary"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0.45rem', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              minWidth: 'auto',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)'
            }}
            title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-primary" />}
          </button>

          {files.length > 0 && (
            <button 
              className="btn-secondary" 
              onClick={() => {
                files.forEach(f => {
                  URL.revokeObjectURL(f.originalUrl);
                  URL.revokeObjectURL(f.currentUrl);
                });
                setFiles([]);
                setActiveFileIndex(null);
                setSelectedFileIds([]);
              }}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Clear Workspace
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace split in resizable columns */}
      <div 
        className="app-workspace"
        style={{ gridTemplateColumns: gridColumns }}
      >
        <Sidebar
          files={files}
          activeFileIndex={activeFileIndex}
          selectedFileIds={selectedFileIds}
          onSelectFile={handleSelectFile}
          onRemoveFile={handleRemoveFile}
          onAddFiles={handleAddFiles}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelectFile={handleToggleSelectFile}
          sidebarWidth={sidebarWidth}
          mobileOpen={mobileSidebarOpen}
          onCollapse={() => setSidebarWidth(0)}
        />

        {/* Sidebar Resizer handles bar (Only shown if not collapsed) */}
        {sidebarWidth > 0 && (
          <div 
            className={`sidebar-resizer ${isDraggingResizer ? 'dragging' : ''}`}
            onMouseDown={() => setIsDraggingResizer(true)}
          >
            <div className="sidebar-resizer-line" />
          </div>
        )}

        <EditorCanvas
          activeFile={activeFile}
          showSplitView={showSplitView}
          setShowSplitView={setShowSplitView}
          isPickingColor={isPickingColor}
          setIsPickingColor={setIsPickingColor}
          isCropMode={isCropMode}
          setIsCropMode={setIsCropMode}
          cropBox={cropBox}
          setCropBox={setCropBox}
          cropAspectRatio={cropAspectRatio}
          onApplyCrop={handleApplyCrop}
          onChromaColorSelected={handleChromaColorSelected}
          sidebarWidth={sidebarWidth}
          onExpandSidebar={() => setSidebarWidth(280)}
          filesCount={files.length}
          onAddFiles={handleAddFiles}
          rightSidebarWidth={rightSidebarWidth}
          onExpandRightSidebar={() => setRightSidebarWidth(360)}
        />

        {/* Right Sidebar Resizer handles bar (Only shown if not collapsed) */}
        {rightSidebarWidth > 0 && (
          <div 
            className={`sidebar-resizer ${isDraggingRightResizer ? 'dragging' : ''}`}
            onMouseDown={() => setIsDraggingRightResizer(true)}
          >
            <div className="sidebar-resizer-line" />
          </div>
        )}

        <OperationsPanel
          activeFile={activeFile}
          selectedFileIds={selectedFileIds}
          isBulkMode={isBulkMode}
          cropAspectRatio={cropAspectRatio}
          setCropAspectRatio={setCropAspectRatio}
          onRotate={handleRotate}
          onFlip={handleFlip}
          onApplyAdjustment={handleApplyAdjustment}
          onRemoveBackgroundAI={handleRemoveBackgroundAI}
          onApplyChromaKey={handleApplyChromaKey}
          onResetChromaKey={handleResetChromaKey}
          onRunOCR={handleRunOCR}
          onCompressImage={handleCompressImage}
          onConvertImage={handleConvertImage}
          onApplyWatermark={handleApplyWatermark}
          onRunBulkOperation={handleRunBulkOperation}
          bulkProgress={bulkProgress}
          mobileOpen={mobileOperationsOpen}
          onApplyResize={handleApplyResize}
          onApplyFilterPreset={handleApplyFilterPreset}
          sidebarWidth={rightSidebarWidth}
          onCollapse={() => setRightSidebarWidth(0)}
        />
      </div>

      {/* Backdrop overlay for mobile screen drawers */}
      {(mobileSidebarOpen || mobileOperationsOpen) && (
        <div 
          className="drawer-backdrop" 
          onClick={() => {
            setMobileSidebarOpen(false);
            setMobileOperationsOpen(false);
          }}
        />
      )}

      {/* Universal Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          &copy; {new Date().getFullYear()} Centralized Image Studio. All rights reserved.
        </div>
        <div className="footer-center">
          Made with &hearts; in India
        </div>
        <div className="footer-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a 
            href="https://www.effectivecpmnetwork.com/fkwr1d6jt?key=016d048bc11f59589fd9852063a40abf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link-btn"
            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}
          >
            💎 Premium Upgrades
          </a>
          <span style={{ opacity: 0.3 }}>|</span>
          <button className="footer-link-btn" onClick={() => setShowPrivacyModal(true)}>
            Privacy Policy
          </button>
        </div>
      </footer>

      {/* Privacy Notice Modal Overlay */}
      {showPrivacyModal && (
        <div className="privacy-modal-backdrop" onClick={() => setShowPrivacyModal(false)}>
          <div className="privacy-modal-content glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2>Privacy Policy</h2>
            <div className="privacy-modal-body">
              <p style={{ margin: 0 }}><strong>100% Client-Side Processing</strong></p>
              <p style={{ margin: 0 }}>Your privacy is our utmost priority. All image editing operations, including AI background removal, OCR text scanning, format conversion, and adjustments, are executed entirely client-side inside your browser.</p>
              <p style={{ margin: 0 }}><strong>Zero Data Transfers</strong></p>
              <p style={{ margin: 0 }}>No image files, cropped bounds, watermarks, or text extractions are ever uploaded to any external servers. All operations happen in-memory locally on your device.</p>
              <p style={{ margin: 0 }}><strong>Completely Free & Secure</strong></p>
              <p style={{ margin: 0 }}>By using native browser features, WebAssembly, and local models, this application is completely free, secure, and preserves your full copyright with zero server leaks.</p>
            </div>
            <button className="btn-primary" onClick={() => setShowPrivacyModal(false)} style={{ marginTop: '1.5rem', width: '100%' }}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky command options at bottom */}
      <div className="mobile-nav-bar">
        <button 
          className={`mobile-nav-btn ${mobileSidebarOpen ? 'active' : ''}`}
          onClick={() => {
            setMobileSidebarOpen(!mobileSidebarOpen);
            setMobileOperationsOpen(false);
          }}
        >
          <LayoutGrid size={15} />
          Workspace
        </button>
        <button 
          className={`mobile-nav-btn ${mobileOperationsOpen ? 'active' : ''}`}
          onClick={() => {
            setMobileOperationsOpen(!mobileOperationsOpen);
            setMobileSidebarOpen(false);
          }}
        >
          <Sliders size={15} />
          Image Tools
        </button>
      </div>
    </div>
  );
}

export default App;
