import styles from './FileUploader.module.css';
import React, { useRef, useState } from 'react';
import { Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const FileUploader = ({ onFilesUploaded, uploadedFiles = [], onRemoveFile }) => {
  const fileInputRef = useRef(null);
  const [showFiles, setShowFiles] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name)
    }));

    onFilesUploaded(newFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'css', 'html'].includes(ext)) return 'code';
    if (['txt', 'md', 'json', 'csv', 'xml'].includes(ext)) return 'document';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'unknown';
  };

  return (
    <div className={styles.fileUploader}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.json,.csv,.js,.ts,.jsx,.tsx,.html,.css,.py,.java,.cpp,.c,.xml"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
        id="file-upload-input"
      />

      <label htmlFor="file-upload-input" className={styles.uploadButton}>
        <Upload size={16} />
        Upload Files
      </label>

      {uploadedFiles.length > 0 && (
        <div className={styles.uploadedFiles}>
          <div
            className={styles.filesHeader}
            onClick={() => setShowFiles(prev => !prev)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>Uploaded Files ({uploadedFiles.length})</span>
            {showFiles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showFiles && uploadedFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{file.size}</span>
              </div>
              <button
                onClick={() => onRemoveFile(file.id)}
                className={styles.removeButton}
                title="Remove file"
              >
                <Trash2 size={32} color="red" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
