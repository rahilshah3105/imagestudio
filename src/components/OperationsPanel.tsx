import * as React from 'react';
import { useState } from 'react';
import { 
  Sparkles, Type, Minimize, ArrowLeftRight, RotateCw, Sliders, Stamp, 
  Copy, Download, RotateCcw, FlipHorizontal, FlipVertical, 
  ChevronDown, ChevronUp, Image, Sparkle, Settings, ChevronRight
} from 'lucide-react';
import type { ImageFile } from '../types';
import { CustomDropdown } from './CustomDropdown';
import { AdBanner } from './AdBanner';

interface OperationsPanelProps {
  activeFile: ImageFile | null;
  selectedFileIds: string[];
  isBulkMode: boolean;
  cropAspectRatio: string;
  setCropAspectRatio: (ratio: string) => void;
  onRotate: (direction: 'left' | 'right') => void;
  onFlip: (direction: 'horizontal' | 'vertical') => void;
  onApplyAdjustment: (adjustments: Partial<ImageFile>) => void;
  onRemoveBackgroundAI: () => void;
  onApplyChromaKey: () => void;
  onResetChromaKey: () => void;
  onRunOCR: () => void;
  onCompressImage: (mode: 'manual' | 'target', quality: number, scale: number, targetSizeKB: number) => void;
  onConvertImage: (format: string) => void;
  onApplyWatermark: (text: string, color: string, size: number, opacity: number, position: string) => void;
  onRunBulkOperation: (operation: string, options: any) => void;
  bulkProgress: { total: number; current: number; status: string } | null;
  mobileOpen: boolean;
  onApplyResize: (width: number, height: number, lockAspect: boolean) => void;
  onApplyFilterPreset: (presetName: string) => void;
  
  sidebarWidth: number;
  onCollapse: () => void;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({
  activeFile,
  selectedFileIds,
  isBulkMode,
  cropAspectRatio,
  setCropAspectRatio,
  onRotate,
  onFlip,
  onApplyAdjustment,
  onRemoveBackgroundAI,
  onApplyChromaKey,
  onResetChromaKey,
  onRunOCR,
  onCompressImage,
  onConvertImage,
  onApplyWatermark,
  onRunBulkOperation,
  bulkProgress,
  mobileOpen,
  onApplyResize,
  onApplyFilterPreset,
  sidebarWidth,
  onCollapse,
}) => {
  // Accordion active item state
  const [activeTab, setActiveTab] = useState<string>('transform');

  // OCR state
  const [copiedText, setCopiedText] = useState(false);

  // Resize State
  const [localWidth, setLocalWidth] = useState(0);
  const [localHeight, setLocalHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);

  // Sync resize dimensions when active file changes
  React.useEffect(() => {
    if (activeFile) {
      setLocalWidth(activeFile.width);
      setLocalHeight(activeFile.height);
    }
  }, [activeFile?.id, activeFile?.width, activeFile?.height]);

  const handleWidthChange = (val: number) => {
    setLocalWidth(val);
    if (lockAspect && activeFile && activeFile.height > 0) {
      const ratio = activeFile.width / activeFile.height;
      setLocalHeight(Math.round(val / ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setLocalHeight(val);
    if (lockAspect && activeFile && activeFile.width > 0) {
      const ratio = activeFile.width / activeFile.height;
      setLocalWidth(Math.round(val * ratio));
    }
  };

  // Compression state
  const [compressMode, setCompressMode] = useState<'manual' | 'target'>('manual');
  const [compressQuality, setCompressQuality] = useState(80);
  const [compressScale, setCompressScale] = useState(100);
  const [targetSizeKB, setTargetSizeKB] = useState(200);

  // Conversion state
  const [targetFormat, setTargetFormat] = useState('image/png');

  // Watermark state
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [watermarkSize, setWatermarkSize] = useState(30);
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');

  // Bulk actions state
  const [bulkAction, setBulkAction] = useState('convert');
  const [bulkTargetFormat, setBulkTargetFormat] = useState('image/png');
  const [bulkQuality, setBulkQuality] = useState(80);
  const [bulkTargetKB, setBulkTargetKB] = useState(250);
  const [bulkResizeScale, setBulkResizeScale] = useState(100);

  const toggleTab = (tab: string) => {
    setActiveTab(activeTab === tab ? '' : tab);
  };

  const handleCopyOCRText = () => {
    if (activeFile?.ocrText) {
      navigator.clipboard.writeText(activeFile.ocrText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownloadOCRText = () => {
    if (activeFile?.ocrText) {
      const blob = new Blob([activeFile.ocrText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeFile.name.replace(/\.[^/.]+$/, "")}_extracted_text.txt`;
      link.click();
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAccordionItem = (id: string, label: string, icon: React.ReactNode, content: React.ReactNode) => {
    const isOpen = activeTab === id;
    return (
      <div className={`accordion-item ${isOpen ? 'active' : ''}`}>
        <div className="accordion-header" onClick={() => toggleTab(id)}>
          <div className="accordion-icon-group">
            {icon}
            <span>{label}</span>
          </div>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {isOpen && <div className="accordion-content">{content}</div>}
      </div>
    );
  };

  return (
    <div 
      className={`workspace-panel right panel-drawer ${mobileOpen ? 'open' : ''}`}
      style={{
        width: `${sidebarWidth}px`,
        display: sidebarWidth === 0 ? 'none' : 'flex'
      }}
    >
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          <Settings className="text-secondary" size={18} />
          {isBulkMode ? 'Bulk Actions Panel' : 'Image Tools Panel'}
        </h2>
        <button 
          className="btn-remove-file" 
          onClick={onCollapse}
          title="Collapse Panel"
          style={{ padding: '0.2rem', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="panel-content">
        {isBulkMode ? (
          /* Bulk Operations View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
              fontSize: '0.85rem'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.25rem' }}>Bulk Mode Active</p>
              <p style={{ color: 'var(--text-secondary)' }}>
                You have selected <strong>{selectedFileIds.length}</strong> image(s). Any operations configured below will process the selected batch.
              </p>
            </div>

            <div className="control-group">
              <label className="control-label">Select Bulk Operation</label>
              <CustomDropdown
                options={[
                  { value: 'convert', label: 'Convert File Format' },
                  { value: 'compress_manual', label: 'Bulk Compression (Quality)' },
                  { value: 'compress_target', label: 'Bulk Compression (Target File Size)' },
                  { value: 'bg_remove', label: 'AI Background Removal' },
                  { value: 'resize', label: 'Bulk Resize Scale' }
                ]}
                value={bulkAction}
                onChange={setBulkAction}
              />
            </div>

            {/* Bulk Action Subsections */}
            {bulkAction === 'convert' && (
              <div className="control-group">
                <label className="control-label">Target Format</label>
                <div className="format-group">
                  {['image/png', 'image/jpeg', 'image/webp', 'image/bmp'].map(fmt => (
                    <div
                      key={fmt}
                      className={`format-card ${bulkTargetFormat === fmt ? 'active' : ''}`}
                      onClick={() => setBulkTargetFormat(fmt)}
                    >
                      {fmt.split('/')[1].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkAction === 'compress_manual' && (
              <div className="control-group">
                <div className="control-label">
                  <span>Compression Quality</span>
                  <span>{bulkQuality}%</span>
                </div>
                <div className="control-slider-container">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={bulkQuality}
                    onChange={(e) => setBulkQuality(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {bulkAction === 'compress_target' && (
              <div className="control-group">
                <label className="control-label">Target File Size (per image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="input-text"
                    style={{ flex: 1 }}
                    value={bulkTargetKB}
                    min="10"
                    onChange={(e) => setBulkTargetKB(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>KB</span>
                </div>
              </div>
            )}

            {bulkAction === 'resize' && (
              <div className="control-group">
                <div className="control-label">
                  <span>Resize Scale Ratio</span>
                  <span>{bulkResizeScale}%</span>
                </div>
                <div className="control-slider-container">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={bulkResizeScale}
                    onChange={(e) => setBulkResizeScale(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {bulkAction === 'bg_remove' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                💡 Note: Running AI Background Removal on multiple images concurrently can take a few minutes as the neural network processes each file locally.
              </div>
            )}

            {/* Run Button */}
            <button
              className="btn-primary glow-primary"
              disabled={selectedFileIds.length === 0 || (bulkProgress !== null && bulkProgress.status !== 'finished')}
              onClick={() => {
                const options: any = {};
                if (bulkAction === 'convert') options.format = bulkTargetFormat;
                if (bulkAction === 'compress_manual') options.quality = bulkQuality;
                if (bulkAction === 'compress_target') options.targetSizeKB = bulkTargetKB;
                if (bulkAction === 'resize') options.scale = bulkResizeScale;
                onRunBulkOperation(bulkAction, options);
              }}
            >
              <Sparkles size={16} />
              Run Bulk Actions
            </button>

            {/* Bulk Queue Progress */}
            {bulkProgress && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                  <span style={{ fontWeight: 'bold' }}>{bulkProgress.current} / {bulkProgress.total}</span>
                </div>
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Status: {bulkProgress.status}
                </div>
              </div>
            )}
          </div>
        ) : !activeFile ? (
          /* Idle View when no active file */
          <div className="empty-state">
            <Image size={36} className="text-muted" style={{ opacity: 0.5 }} />
            <h3>No Active Image</h3>
            <p>Load an image to access background removal, text scan OCR, format converter, watermark tools, and filters.</p>
          </div>
        ) : (
          /* Normal Single Image Editing View */
          <div className="accordion">
            
            {/* 1. Crop, Rotate & Flip */}
            {renderAccordionItem(
              'transform',
              'Crop, Rotate & Transform',
              <RotateCw size={16} className="text-secondary" />,
              <>
                <div className="control-group">
                  <label className="control-label">Aspect Ratio Preset (Crop)</label>
                  <CustomDropdown
                    options={[
                      { value: 'free', label: 'Free aspect ratio' },
                      { value: '1:1', label: '1:1 Square' },
                      { value: '16:9', label: '16:9 widescreen' },
                      { value: '4:3', label: '4:3 TV standard' },
                      { value: '3:2', label: '3:2 DSLR Photo' }
                    ]}
                    value={cropAspectRatio}
                    onChange={setCropAspectRatio}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Rotate Image (90° steps)</label>
                  <div className="btn-group-row">
                    <button className="btn-secondary" onClick={() => onRotate('left')}>
                      <RotateCcw size={14} />
                      90° Left
                    </button>
                    <button className="btn-secondary" onClick={() => onRotate('right')}>
                      <RotateCw size={14} />
                      90° Right
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <label className="control-label">Mirror Flip</label>
                  <div className="btn-group-row">
                    <button className="btn-secondary" onClick={() => onFlip('horizontal')}>
                      <FlipHorizontal size={14} />
                      Horizontal
                    </button>
                    <button className="btn-secondary" onClick={() => onFlip('vertical')}>
                      <FlipVertical size={14} />
                      Vertical
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 1b. Dimension Resizing */}
            {renderAccordionItem(
              'resize',
              'Image Resize (Scale)',
              <Minimize size={16} className="text-secondary" />,
              <>
                <div className="control-group">
                  <label className="control-label">Custom Width (px)</label>
                  <input
                    type="number"
                    className="input-text"
                    value={localWidth || ''}
                    onChange={(e) => handleWidthChange(Math.max(1, Number(e.target.value)))}
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">Custom Height (px)</label>
                  <input
                    type="number"
                    className="input-text"
                    value={localHeight || ''}
                    onChange={(e) => handleHeightChange(Math.max(1, Number(e.target.value)))}
                  />
                </div>

                <div className="control-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="lock-aspect-checkbox"
                    checked={lockAspect}
                    onChange={(e) => setLockAspect(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="lock-aspect-checkbox" style={{ fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none' }}>
                    Lock Aspect Ratio ({activeFile ? (activeFile.width / activeFile.height).toFixed(2) : '1.00'})
                  </label>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => onApplyResize(localWidth, localHeight, lockAspect)}
                >
                  Apply Custom Dimensions
                </button>
              </>
            )}

            {/* 2. Remove Background */}
            {renderAccordionItem(
              'bgremove',
              'Remove Background',
              <Sparkles size={16} className="text-primary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* AI Removal Button */}
                  <button
                    className="btn-primary glow-primary"
                    disabled={activeFile.status === 'processing'}
                    onClick={onRemoveBackgroundAI}
                  >
                    <Sparkle size={14} />
                    AI Auto Remove BG
                  </button>

                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>— OR MANUAL CHROMACUT —</div>

                  {/* Chroma Keying */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Color Cutout</span>
                      {activeFile.chromaKey ? (
                        <span 
                          className="color-inspector-swatch" 
                          style={{ 
                            backgroundColor: `rgb(${activeFile.chromaKey.r}, ${activeFile.chromaKey.g}, ${activeFile.chromaKey.b})`,
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px'
                          }} 
                        />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>None Chosen</span>
                      )}
                    </div>

                    {!activeFile.chromaKey ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Activate the <strong>Color Picker</strong> toolbar button and click on the image background color to automatically transparent key it.
                      </p>
                    ) : (
                      <>
                        <div className="control-group">
                          <div className="control-label">
                            <span>Tolerance / Fuzz</span>
                            <span>{activeFile.chromaKey.tolerance}</span>
                          </div>
                          <div className="control-slider-container">
                            <input
                              type="range"
                              min="1"
                              max="150"
                              value={activeFile.chromaKey.tolerance}
                              onChange={(e) => {
                                onApplyAdjustment({
                                  chromaKey: {
                                    ...activeFile.chromaKey!,
                                    tolerance: Number(e.target.value)
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="control-group">
                          <div className="control-label">
                            <span>Fuzziness Feather</span>
                            <span>{activeFile.chromaKey.fuzziness}</span>
                          </div>
                          <div className="control-slider-container">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={activeFile.chromaKey.fuzziness}
                              onChange={(e) => {
                                onApplyAdjustment({
                                  chromaKey: {
                                    ...activeFile.chromaKey!,
                                    fuzziness: Number(e.target.value)
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="btn-group-row">
                          <button className="btn-primary" onClick={onApplyChromaKey} style={{ padding: '0.4rem' }}>
                            Apply Key
                          </button>
                          <button className="btn-secondary" onClick={onResetChromaKey} style={{ padding: '0.4rem' }}>
                            Reset Key
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {activeFile.progress !== undefined && activeFile.progress > 0 && activeFile.progress < 100 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>AI Neural Network</span>
                        <span>{Math.round(activeFile.progress)}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${activeFile.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 3. Text Extraction (OCR) */}
            {renderAccordionItem(
              'ocr',
              'Text Extraction (OCR)',
              <Type size={16} className="text-secondary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    className="btn-primary"
                    disabled={activeFile.status === 'processing'}
                    onClick={onRunOCR}
                  >
                    Scan Image for Text
                  </button>

                  {activeFile.progress !== undefined && activeFile.progress > 0 && activeFile.progress < 100 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>Scanning text...</span>
                        <span>{Math.round(activeFile.progress)}%</span>
                      </div>
                      <div className="progress-container">
                        <div className="progress-bar" style={{ width: `${activeFile.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {activeFile.ocrText && (
                    <>
                      <textarea
                        className="ocr-textarea"
                        value={activeFile.ocrText}
                        readOnly
                        placeholder="Scanning text..."
                      />
                      <div className="btn-group-row">
                        <button className="btn-secondary" onClick={handleCopyOCRText}>
                          <Copy size={13} />
                          {copiedText ? 'Copied!' : 'Copy Text'}
                        </button>
                        <button className="btn-secondary" onClick={handleDownloadOCRText}>
                          <Download size={13} />
                          Save File
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* 4. Size Compression */}
            {renderAccordionItem(
              'compress',
              'Size Compression',
              <Minimize size={16} className="text-secondary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Mode Selector */}
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                    <button
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        background: compressMode === 'manual' ? 'var(--primary)' : 'transparent',
                        borderColor: 'transparent',
                        color: compressMode === 'manual' ? 'white' : 'var(--text-secondary)'
                      }}
                      onClick={() => setCompressMode('manual')}
                    >
                      Sliders
                    </button>
                    <button
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        padding: '0.35rem',
                        background: compressMode === 'target' ? 'var(--primary)' : 'transparent',
                        borderColor: 'transparent',
                        color: compressMode === 'target' ? 'white' : 'var(--text-secondary)'
                      }}
                      onClick={() => setCompressMode('target')}
                    >
                      Target KB
                    </button>
                  </div>

                  {compressMode === 'manual' ? (
                    <>
                      <div className="control-group">
                        <div className="control-label">
                          <span>Quality Compression</span>
                          <span>{compressQuality}%</span>
                        </div>
                        <div className="control-slider-container">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={compressQuality}
                            onChange={(e) => setCompressQuality(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="control-group">
                        <div className="control-label">
                          <span>Resolution Scale</span>
                          <span>{compressScale}%</span>
                        </div>
                        <div className="control-slider-container">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={compressScale}
                            onChange={(e) => setCompressScale(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="control-group">
                      <label className="control-label">Compress to Target File Size</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          className="input-text"
                          style={{ flex: 1 }}
                          value={targetSizeKB}
                          min="10"
                          max="20000"
                          onChange={(e) => setTargetSizeKB(Number(e.target.value))}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>KB</span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                        The compressor runs a smart adaptive search to find the optimal balance of resolution and JPEG/WebP quality values.
                      </p>
                    </div>
                  )}

                  <button
                    className="btn-primary"
                    disabled={activeFile.status === 'processing'}
                    onClick={() => onCompressImage(compressMode, compressQuality, compressScale, targetSizeKB)}
                  >
                    Run Compression
                  </button>

                  {activeFile.size < activeFile.originalSize && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Original:</span>
                        <strong>{formatSize(activeFile.originalSize)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Compressed:</span>
                        <strong>{formatSize(activeFile.size)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Reduction Ratio:</span>
                        <strong className="text-success">-{Math.round((1 - activeFile.size / activeFile.originalSize) * 100)}%</strong>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 5. Convert Image Type */}
            {renderAccordionItem(
              'convert',
              'Convert Format',
              <ArrowLeftRight size={16} className="text-secondary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <label className="control-label">Export Format Type</label>
                  <div className="format-group">
                    {[
                      { mime: 'image/png', label: 'PNG' },
                      { mime: 'image/jpeg', label: 'JPG' },
                      { mime: 'image/webp', label: 'WEBP' },
                      { mime: 'image/bmp', label: 'BMP' }
                    ].map(fmt => (
                      <div
                        key={fmt.mime}
                        className={`format-card ${targetFormat === fmt.mime ? 'active' : ''}`}
                        onClick={() => setTargetFormat(fmt.mime)}
                      >
                        {fmt.label}
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => onConvertImage(targetFormat)}
                  >
                    Convert & Download
                  </button>
                </div>
              </>
            )}

            {/* 6. Adjustments & Filters */}
            {renderAccordionItem(
              'adjust',
              'Filters & Adjustments',
              <Sliders size={16} className="text-secondary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {/* Filter Presets Grid */}
                  <label className="control-label">Instagram Filter Presets</label>
                  <div className="preset-grid">
                    {[
                      { name: 'Normal', id: 'normal' },
                      { name: 'Cyberpunk', id: 'cyberpunk' },
                      { name: 'Noir', id: 'noir' },
                      { name: 'Vintage', id: 'vintage' },
                      { name: 'Dramatic', id: 'dramatic' },
                      { name: 'Warm', id: 'warm' },
                      { name: 'Cold', id: 'cold' },
                      { name: 'Chrome', id: 'chrome' },
                    ].map(preset => (
                      <div
                        key={preset.id}
                        className="preset-card"
                        onClick={() => onApplyFilterPreset(preset.id)}
                      >
                        {preset.name}
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>— OR FINE-TUNE ADJUSTMENTS —</div>

                  {[
                    { label: 'Brightness', key: 'brightness', min: 0, max: 200, unit: '%' },
                    { label: 'Contrast', key: 'contrast', min: 0, max: 200, unit: '%' },
                    { label: 'Saturation', key: 'saturation', min: 0, max: 200, unit: '%' },
                    { label: 'Blur Radius', key: 'blur', min: 0, max: 20, unit: 'px' },
                    { label: 'Grayscale Color', key: 'grayscale', min: 0, max: 100, unit: '%' },
                    { label: 'Sepia Effect', key: 'sepia', min: 0, max: 100, unit: '%' },
                    { label: 'Invert Colors', key: 'invert', min: 0, max: 100, unit: '%' },
                    { label: 'Hue Rotate Angle', key: 'hueRotate', min: 0, max: 360, unit: '°' },
                  ].map(adj => (
                    <div key={adj.key} className="control-group">
                      <div className="control-label">
                        <span>{adj.label}</span>
                        <span>{(activeFile as any)[adj.key]}{adj.unit}</span>
                      </div>
                      <div className="control-slider-container">
                        <input
                          type="range"
                          min={adj.min}
                          max={adj.max}
                          value={(activeFile as any)[adj.key]}
                          onChange={(e) => {
                            onApplyAdjustment({
                              [adj.key]: Number(e.target.value)
                            });
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    className="btn-secondary"
                    onClick={() => onApplyAdjustment({
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                      blur: 0,
                      grayscale: 0,
                      sepia: 0,
                      invert: 0,
                      hueRotate: 0,
                    })}
                  >
                    Reset Visual Filters
                  </button>
                </div>
              </>
            )}

            {/* 7. Watermark Overlay */}
            {renderAccordionItem(
              'watermark',
              'Custom Watermark',
              <Stamp size={16} className="text-secondary" />,
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="control-group">
                    <label className="control-label">Watermark Text</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Copyright © MyStudio"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                    />
                  </div>

                  <div className="control-group">
                    <label className="control-label">Text Color</label>
                    <input
                      type="color"
                      className="input-text"
                      style={{ padding: '0.1rem', height: '32px', cursor: 'pointer' }}
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                    />
                  </div>

                  <div className="control-group">
                    <div className="control-label">
                      <span>Font Size Scale</span>
                      <span>{watermarkSize}px</span>
                    </div>
                    <div className="control-slider-container">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={watermarkSize}
                        onChange={(e) => setWatermarkSize(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="control-group">
                    <div className="control-label">
                      <span>Opacity</span>
                      <span>{watermarkOpacity}%</span>
                    </div>
                    <div className="control-slider-container">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="control-group">
                    <label className="control-label">Position Anchor</label>
                    <CustomDropdown
                      options={[
                        { value: 'center', label: 'Center' },
                        { value: 'top-left', label: 'Top Left' },
                        { value: 'top-right', label: 'Top Right' },
                        { value: 'bottom-left', label: 'Bottom Left' },
                        { value: 'bottom-right', label: 'Bottom Right' }
                      ]}
                      value={watermarkPosition}
                      onChange={setWatermarkPosition}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    disabled={!watermarkText}
                    onClick={() => onApplyWatermark(
                      watermarkText,
                      watermarkColor,
                      watermarkSize,
                      watermarkOpacity / 100,
                      watermarkPosition
                    )}
                  >
                    Apply Watermark
                  </button>
                </div>
              </>
            )}

            {/* 8. Metadata Inspector */}
            {renderAccordionItem(
              'metadata',
              'Metadata Inspector',
              <Image size={16} className="text-secondary" />,
              <div className="meta-inspector-list">
                <div className="meta-inspector-item">
                  <span>Filename:</span>
                  <strong>{activeFile.name}</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>MIME Type:</span>
                  <strong>{activeFile.type}</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>Original Size:</span>
                  <strong>{formatSize(activeFile.originalSize)}</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>Current Size:</span>
                  <strong>{formatSize(activeFile.size)}</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>Resolution:</span>
                  <strong>{activeFile.width} x {activeFile.height} pixels</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>Aspect Ratio:</span>
                  <strong>{(activeFile.width / activeFile.height).toFixed(2)}:1</strong>
                </div>
                <div className="meta-inspector-item">
                  <span>Date Modified:</span>
                  <strong>{new Date(activeFile.file.lastModified).toLocaleDateString()}</strong>
                </div>
              </div>
            )}

          </div>
        )}
        <AdBanner type="banner300" />
      </div>
    </div>
  );
};
