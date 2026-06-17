import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Pipette, Crop, Eye, RefreshCw, Clipboard, Menu, Settings } from 'lucide-react';
import type { ImageFile } from '../types';
import { UploadZone } from './UploadZone';

interface EditorCanvasProps {
  activeFile: ImageFile | null;
  showSplitView: boolean;
  setShowSplitView: (show: boolean) => void;
  isPickingColor: boolean;
  setIsPickingColor: (picking: boolean) => void;
  isCropMode: boolean;
  setIsCropMode: (cropping: boolean) => void;
  cropBox: { x: number; y: number; width: number; height: number } | null;
  setCropBox: (box: { x: number; y: number; width: number; height: number } | null) => void;
  cropAspectRatio: string;
  onApplyCrop: () => void;
  onChromaColorSelected: (r: number, g: number, b: number) => void;
  sidebarWidth: number;
  onExpandSidebar: () => void;
  
  filesCount: number;
  onAddFiles: (newFiles: FileList | File[]) => void;
  rightSidebarWidth: number;
  onExpandRightSidebar: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  activeFile,
  showSplitView,
  setShowSplitView,
  isPickingColor,
  setIsPickingColor,
  isCropMode,
  setIsCropMode,
  cropBox,
  setCropBox,
  cropAspectRatio,
  onApplyCrop,
  onChromaColorSelected,
  sidebarWidth,
  onExpandSidebar,
  filesCount,
  onAddFiles,
  rightSidebarWidth,
  onExpandRightSidebar,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Split view slider position (0 to 100)
  const [splitPos, setSplitPos] = useState(50);
  const isDraggingSplit = useRef(false);

  // Inspector states
  const [hoverColor, setHoverColor] = useState<{ r: number; g: number; b: number; hex: string } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset zoom & pan when active file changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHoverColor(null);
    setHoverCoord(null);
    setShowSplitView(false);
    setIsPickingColor(false);
    setIsCropMode(false);
    setCropBox(null);
    canvasRef.current = null;
  }, [activeFile?.id]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Initialize offscreen canvas for color picking
  const getOffscreenContext = (): CanvasRenderingContext2D | null => {
    if (!activeFile || !imageRef.current) return null;
    if (canvasRef.current) return canvasRef.current.getContext('2d');

    const canvas = document.createElement('canvas');
    canvas.width = activeFile.width;
    canvas.height = activeFile.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // We draw the current processed URL version
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeFile.currentUrl;
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };

    canvasRef.current = canvas;
    return ctx;
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.15, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.15, 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse Handlers for zoom & pan and color picking
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropMode) return; // crop handles logic handles itself
    if (isDraggingSplit.current) return;

    if (isPickingColor) {
      handleColorPick(e);
      return;
    }

    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && !isPickingColor && !isCropMode) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }

    if (isPickingColor && imageRef.current && activeFile) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        // Calculate original pixels coordinates
        const origX = Math.floor((x / rect.width) * activeFile.width);
        const origY = Math.floor((y / rect.height) * activeFile.height);
        
        setHoverCoord({ x: origX, y: origY });

        // Get pixel color
        const ctx = getOffscreenContext();
        if (ctx) {
          try {
            const pixel = ctx.getImageData(origX, origY, 1, 1).data;
            const r = pixel[0];
            const g = pixel[1];
            const b = pixel[2];
            const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            setHoverColor({ r, g, b, hex });
          } catch (err) {
            console.error('Failed to get pixel data:', err);
          }
        }
      } else {
        setHoverColor(null);
        setHoverCoord(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    isDraggingSplit.current = false;
  };

  const handleColorPick = (e: React.MouseEvent) => {
    if (!imageRef.current || !activeFile) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const origX = Math.floor((x / rect.width) * activeFile.width);
      const origY = Math.floor((y / rect.height) * activeFile.height);

      const ctx = getOffscreenContext();
      if (ctx) {
        try {
          const pixel = ctx.getImageData(origX, origY, 1, 1).data;
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
          
          onChromaColorSelected(r, g, b);
          
          const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          navigator.clipboard.writeText(hex);
          setToastMessage(`Color selected: ${hex} (Copied to Clipboard)`);
          setIsPickingColor(false);
          setHoverColor(null);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Split-View mouse tracking
  const handleSplitDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingSplit.current = true;
  };

  const handleSplitMove = (e: React.MouseEvent) => {
    if (!isDraggingSplit.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPos(percentage);
  };

  // Crop overlay actions
  useEffect(() => {
    if (isCropMode && activeFile && !cropBox) {
      // Initialize crop box to 80% size centered
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isCropMode]);

  const handleCropBoxDrag = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imageRef.current || !cropBox) return;

    const rect = imageRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialBox = { ...cropBox };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;

      let nextBox = { ...initialBox };

      if (type === 'move') {
        nextBox.x = Math.max(0, Math.min(100 - nextBox.width, initialBox.x + dx));
        nextBox.y = Math.max(0, Math.min(100 - nextBox.height, initialBox.y + dy));
      } else {
        // Handle resizing
        const isN = type.includes('n');
        const isS = type.includes('s');
        const isW = type.includes('w');
        const isE = type.includes('e');

        let left = initialBox.x;
        let top = initialBox.y;
        let right = initialBox.x + initialBox.width;
        let bottom = initialBox.y + initialBox.height;

        if (isW) left = Math.max(0, Math.min(right - 5, initialBox.x + dx));
        if (isE) right = Math.max(left + 5, Math.min(100, initialBox.x + initialBox.width + dx));
        if (isN) top = Math.max(0, Math.min(bottom - 5, initialBox.y + dy));
        if (isS) bottom = Math.max(top + 5, Math.min(100, initialBox.y + initialBox.height + dy));

        // Aspect ratio lock constraints
        if (cropAspectRatio && cropAspectRatio !== 'free') {
          const ratioParts = cropAspectRatio.split(':').map(Number);
          const ratio = ratioParts[0] / ratioParts[1];
          const imgRatio = rect.width / rect.height;
          // Apply aspect constraints
          const desiredRatio = ratio / imgRatio; // adjustment for css coords vs actual pixel ratio

          let newWidth = right - left;
          let newHeight = bottom - top;

          if (isE || isW) {
            newHeight = newWidth / desiredRatio;
            if (isN) top = bottom - newHeight;
            else bottom = top + newHeight;
          } else if (isN || isS) {
            newWidth = newHeight * desiredRatio;
            if (isW) left = right - newWidth;
            else right = left + newWidth;
          } else {
            // Corners NW, NE, SW, SE
            newHeight = newWidth / desiredRatio;
            if (type.includes('w')) left = right - newWidth;
            else right = left + newWidth;
            if (type.includes('n')) top = bottom - newHeight;
            else bottom = top + newHeight;
          }

          // Bounds enforcement
          if (left < 0) {
            right -= left;
            left = 0;
          }
          if (right > 100) {
            left -= (right - 100);
            right = 100;
          }
          if (top < 0) {
            bottom -= top;
            top = 0;
          }
          if (bottom > 100) {
            top -= (bottom - 100);
            bottom = 100;
          }
        }

        nextBox = {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top
        };
      }

      setCropBox(nextBox);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const rgbToHsl = (r: number, g: number, b: number): string => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  return (
    <div className="editor-viewport" onMouseMove={handleSplitMove} onMouseUp={handleMouseUp}>
      {/* Top Toolbar */}
      <div className="canvas-toolbar">
        <div className="toolbar-group">
          <button
            className={`toolbar-btn ${showSplitView ? 'active' : ''}`}
            onClick={() => setShowSplitView(!showSplitView)}
            disabled={!activeFile}
            title="Toggle Split Before/After Preview"
          >
            <Eye size={14} />
            {showSplitView ? 'Hide Compare' : 'Compare'}
          </button>

          <button
            className={`toolbar-btn ${isPickingColor ? 'active' : ''}`}
            onClick={() => {
              setIsPickingColor(!isPickingColor);
              setIsCropMode(false);
            }}
            disabled={!activeFile}
            title="Inspect & Select Color from Image"
          >
            <Pipette size={14} />
            Color Picker
          </button>

          <button
            className={`toolbar-btn ${isCropMode ? 'active' : ''}`}
            onClick={() => {
              setIsCropMode(!isCropMode);
              setIsPickingColor(false);
            }}
            disabled={!activeFile}
            title="Interactive Crop Bounding Box"
          >
            <Crop size={14} />
            Crop Box
          </button>
        </div>

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleZoomOut} disabled={!activeFile} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="toolbar-btn" onClick={handleZoomIn} disabled={!activeFile} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button className="toolbar-btn" onClick={handleResetZoom} disabled={!activeFile} title="Reset Zoom">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      {/* Main Canvas view area */}
      <div
        ref={containerRef}
        className={`canvas-container ${isPickingColor ? 'picking-color' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {sidebarWidth === 0 && (
          <button 
            className="floating-sidebar-trigger" 
            onClick={onExpandSidebar}
            title="Expand Sidebar"
            style={{ left: '15px' }}
          >
            <Menu size={16} />
          </button>
        )}
        {rightSidebarWidth === 0 && (
          <button 
            className="floating-sidebar-trigger" 
            onClick={onExpandRightSidebar}
            title="Expand Image Tools"
            style={{ right: '15px', left: 'auto' }}
          >
            <Settings size={16} />
          </button>
        )}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            top: '20px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--primary)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '50px',
            fontSize: '0.8rem',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 5px 15px rgba(0,0,0,0.4)'
          }}>
            <Clipboard size={12} className="text-primary" />
            {toastMessage}
          </div>
        )}

        {filesCount === 0 || !activeFile ? (
          <div className="empty-state" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            <div className="app-logo glow-primary" style={{ padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem', display: 'inline-flex', alignSelf: 'center' }}>
              <RefreshCw size={36} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>Central Image Operations</h3>
            <UploadZone onAddFiles={onAddFiles} compact={false} />
          </div>
        ) : (
          <div
            className="canvas-wrapper checkerboard"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {showSplitView ? (
              /* Before/After Split view mode */
              <div className="split-viewer-container" style={{ width: `${imageRef.current?.clientWidth || 300}px`, height: `${imageRef.current?.clientHeight || 300}px` }}>
                {/* Left layer (Original) */}
                <div className="split-image-layer">
                  <img src={activeFile.originalUrl} alt="Original Preview" />
                </div>

                {/* Right layer (Processed) with clip path */}
                <div
                  className="split-image-layer"
                  style={{
                    clipPath: `inset(0 0 0 ${splitPos}%)`,
                  }}
                >
                  <img src={activeFile.currentUrl} alt="Processed Preview" />
                </div>

                {/* Vertical handle line */}
                <div
                  className="split-handle"
                  style={{ left: `${splitPos}%` }}
                  onMouseDown={handleSplitDown}
                >
                  <div className="split-handle-button">
                    <span style={{ fontSize: '10px', fontWeight: 'bold' }}>↔</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard render preview */
              <img
                ref={imageRef}
                src={activeFile.currentUrl}
                alt={activeFile.name}
                className="workspace-image"
                onLoad={() => {
                  // Reset offscreen context when image changes
                  canvasRef.current = null;
                }}
              />
            )}

            {/* Custom SVG/HTML Crop Box Overlay */}
            {isCropMode && cropBox && imageRef.current && (
              <div
                className="crop-overlay-container"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${imageRef.current.clientWidth}px`,
                  height: `${imageRef.current.clientHeight}px`,
                }}
              >
                <div
                  className="crop-box"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                  onMouseDown={(e) => handleCropBoxDrag(e, 'move')}
                >
                  {/* Aspect Grid Lines */}
                  <div className="crop-grid-line-h" style={{ top: '33.33%' }}></div>
                  <div className="crop-grid-line-h" style={{ top: '66.66%' }}></div>
                  <div className="crop-grid-line-v" style={{ left: '33.33%' }}></div>
                  <div className="crop-grid-line-v" style={{ left: '66.66%' }}></div>

                  {/* Corner Resizing Handles */}
                  <div className="crop-handle nw" onMouseDown={(e) => handleCropBoxDrag(e, 'nw')}></div>
                  <div className="crop-handle ne" onMouseDown={(e) => handleCropBoxDrag(e, 'ne')}></div>
                  <div className="crop-handle sw" onMouseDown={(e) => handleCropBoxDrag(e, 'sw')}></div>
                  <div className="crop-handle se" onMouseDown={(e) => handleCropBoxDrag(e, 'se')}></div>

                  {/* Edge Resizing Handles (only if free aspect or explicit axis) */}
                  {(!cropAspectRatio || cropAspectRatio === 'free') && (
                    <>
                      <div className="crop-handle n" onMouseDown={(e) => handleCropBoxDrag(e, 'n')}></div>
                      <div className="crop-handle s" onMouseDown={(e) => handleCropBoxDrag(e, 's')}></div>
                      <div className="crop-handle w" onMouseDown={(e) => handleCropBoxDrag(e, 'w')}></div>
                      <div className="crop-handle e" onMouseDown={(e) => handleCropBoxDrag(e, 'e')}></div>
                    </>
                  )}

                  {/* Apply Crop Floating Button */}
                  <button
                    className="btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyCrop();
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '-45px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      zIndex: 20
                    }}
                  >
                    Apply Crop
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info / Pixel Inspection details */}
      <div className="canvas-status-bar">
        {activeFile ? (
          <>
            <div>
              <span>Original Size: {activeFile.width} x {activeFile.height} pixels</span>
              <span style={{ margin: '0 0.5rem' }}>|</span>
              <span>Format: {activeFile.type.split('/')[1]?.toUpperCase()}</span>
            </div>

            {/* Live Color Picker Details */}
            {isPickingColor && hoverCoord && hoverColor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Pixel: X:{hoverCoord.x}, Y:{hoverCoord.y}</span>
                <span style={{ margin: '0 0.25rem' }}>|</span>
                <span className="color-inspector-swatch" style={{ backgroundColor: hoverColor.hex }} />
                <span style={{ fontFamily: 'monospace' }}>
                  Hex: {hoverColor.hex.toUpperCase()} | RGB:({hoverColor.r},{hoverColor.g},{hoverColor.b}) | {rgbToHsl(hoverColor.r, hoverColor.g, hoverColor.b)}
                </span>
              </div>
            )}

            {!isPickingColor && (
              <div>
                <span>Press Ctrl + Scroll to Zoom. Drag to Pan.</span>
              </div>
            )}
          </>
        ) : (
          <div>No active image workspace.</div>
        )}
      </div>
    </div>
  );
};
