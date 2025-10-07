// AttachmentItem.js
import React from 'react';
import { Code2, Image, FileText, FileIcon, Paperclip } from 'lucide-react';
import styles from './AttachmentItem.module.css';

const getFileIcon = (type, language) => {
  switch (type) {
    case 'code':
      return {
        IconComponent: Code2,
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        borderColor: '#3b82f6'
      };
    case 'image':
      return {
        IconComponent: Image,
        bgColor: '#fef3c7',
        textColor: '#92400e',
        borderColor: '#f59e0b'
      };
    case 'document':
      return {
        IconComponent: FileText,
        bgColor: '#dcfce7',
        textColor: '#166534',
        borderColor: '#10b981'
      };
    case 'pdf':
      return {
        IconComponent: FileIcon,
        bgColor: '#fecaca',
        textColor: '#991b1b',
        borderColor: '#dc2626'
      };
    default:
      return {
        IconComponent: Paperclip,
        bgColor: '#f1f5f9',
        textColor: '#64748b',
        borderColor: '#94a3b8'
      };
  }
};

const formatFileInfo = (item) => {
  if (item.type === 'code') {
    const language = item.language ? item.language.toUpperCase() : 'CODE';
    const lines = item.preview ? `${item.preview.split('\n').length} lines` : '';
    return `${language}${lines ? ' • ' + lines : ''}`;
  }

  if (item.type === 'image') {
    return item.analysis?.dimensions
      ? `${item.analysis.dimensions.width}×${item.analysis.dimensions.height}`
      : 'IMAGE';
  }

  if (item.size) {
    return item.size;
  }

  return item.type.toUpperCase();
};

const AttachmentItem = ({ item, onRemove }) => {
  const fileInfo = getFileIcon(item.type, item.language);
  const subtitle = formatFileInfo(item);
  const { IconComponent } = fileInfo;

  return (
    <div
      className={styles.attachmentCard}
      style={{ borderLeftColor: fileInfo.borderColor }}
    >
      <button
        onClick={() => onRemove(item.id)}
        className={styles.removeButton}
        title="Remove attachment"
      >
        ×
      </button>

      <div
        className={styles.fileIcon}
        style={{
          backgroundColor: fileInfo.bgColor,
          color: fileInfo.textColor
        }}
      >
        <IconComponent size={18} />
      </div>

      <div className={styles.fileInfo}>
        <div className={styles.fileName}>{item.title}</div>
        <div className={styles.fileDetails}>{subtitle}</div>
      </div>
    </div>
  );
};

export default AttachmentItem;