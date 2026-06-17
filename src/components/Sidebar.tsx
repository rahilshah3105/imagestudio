import * as React from 'react';
import { Trash2, FileImage, HelpCircle, ChevronLeft } from 'lucide-react';
import type { ImageFile } from '../types';
import { UploadZone } from './UploadZone';

interface SidebarProps {
  files: ImageFile[];
  activeFileIndex: number | null;
  selectedFileIds: string[];
  onSelectFile: (index: number) => void;
  onRemoveFile: (id: string) => void;
  onAddFiles: (newFiles: FileList | File[]) => void;
  onToggleSelectAll: () => void;
  onToggleSelectFile: (id: string, event: React.MouseEvent) => void;
  sidebarWidth: number;
  mobileOpen: boolean;
  onCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileIndex,
  selectedFileIds,
  onSelectFile,
  onRemoveFile,
  onAddFiles,
  onToggleSelectAll,
  onToggleSelectFile,
  sidebarWidth,
  mobileOpen,
  onCollapse,
}) => {
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className={`workspace-panel sidebar-drawer ${mobileOpen ? 'open' : ''}`}
      style={{
        width: `${sidebarWidth}px`,
        display: sidebarWidth === 0 ? 'none' : 'flex'
      }}
    >
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className="btn-remove-file" 
            onClick={onCollapse}
            title="Collapse Sidebar"
            style={{ padding: '0.2rem', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={13} />
          </button>
          <h2>
            <FileImage className="text-primary" size={18} />
            Workspace
          </h2>
        </div>
        {files.length > 0 && (
          <button 
            className="btn-upload" 
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
            onClick={onToggleSelectAll}
          >
            {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Upload Zone - Only shown in sidebar when there is at least one image */}
        {files.length > 0 && (
          <UploadZone onAddFiles={onAddFiles} compact={true} />
        )}

        {/* File Gallery */}
        {files.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={36} className="text-muted" style={{ opacity: 0.5 }} />
            <h3>Workspace empty</h3>
            <p>Select or drag-and-drop images in the central editor workspace to start.</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map((img, idx) => {
              const isSelected = selectedFileIds.includes(img.id);
              const isActive = activeFileIndex === idx;

              return (
                <div
                  key={img.id}
                  className={`file-item ${isActive ? 'active' : ''} ${img.status === 'processing' ? 'processing' : ''}`}
                  onClick={() => onSelectFile(idx)}
                >
                  {/* Wave Background for processing state */}
                  {img.status === 'processing' && (
                    <div 
                      className="file-item-wave-bg" 
                      style={{ height: `${img.progress || 35}%` }}
                    />
                  )}

                  <div className="file-item-content">
                    {/* Left Column: Checkbox and Thumbnail */}
                    <div className="file-item-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => onToggleSelectFile(img.id, e)}
                        className="file-item-checkbox"
                      />
                      <img
                        src={img.currentUrl}
                        alt={img.name}
                        className="file-thumbnail"
                      />
                    </div>

                    {/* Right Column: Info & Actions */}
                    <div className="file-item-right">
                      {/* Row 1: Filename & Delete */}
                      <div className="file-item-row-top">
                        <span className="file-name-text" title={img.name}>{img.name}</span>
                        <button
                          className="btn-remove-file"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFile(img.id);
                          }}
                          title="Remove file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Row 2: Dimensions */}
                      <div className="file-item-meta-row">
                        <span>{img.width}x{img.height}</span>
                      </div>

                      {/* Row 3: Size */}
                      <div className="file-item-meta-row">
                        <span>
                          {formatSize(img.size)}
                          {img.size < img.originalSize && (
                            <span className="text-success-pct">
                              (-{Math.round((1 - img.size / img.originalSize) * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Row 4: Status Badge */}
                      <div className="file-item-status-row">
                        <span className={`file-status-badge ${img.status}`}>
                          {img.status}
                          {img.status === 'processing' && img.progress !== undefined && ` (${Math.round(img.progress)}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
