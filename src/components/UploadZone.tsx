import * as React from 'react';
import { useRef, useState } from 'react';
import { Upload, FolderOpen } from 'lucide-react';

interface UploadZoneProps {
  onAddFiles: (newFiles: FileList | File[]) => void;
  compact?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onAddFiles, compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
  };

  return (
    <div className={`upload-zone-wrapper ${compact ? 'compact' : ''}`}>
      <div
        className={`dropzone-container ${isDragOver ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ padding: compact ? '1rem 0.5rem' : '3rem 2rem', borderStyle: 'dashed' }}
      >
        <Upload className="dropzone-icon" size={compact ? 22 : 44} />
        <div className="dropzone-text">
          <h3 style={{ fontSize: compact ? '0.85rem' : '1.2rem', margin: 0 }}>Drag & drop images</h3>
          <p style={{ fontSize: compact ? '0.7rem' : '0.9rem', margin: '4px 0 0 0' }}>PNG, JPG, WebP, BMP or GIF</p>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <div className="upload-options" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn-upload" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
          <Upload size={14} />
          Select Files
        </button>
        <button className="btn-upload" onClick={() => folderInputRef.current?.click()} style={{ flex: 1 }}>
          <FolderOpen size={14} />
          Select Folder
        </button>
        <input
          type="file"
          ref={folderInputRef}
          style={{ display: 'none' }}
          multiple
          accept="image/*"
          {...({
            webkitdirectory: "",
            directory: ""
          } as any)}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
