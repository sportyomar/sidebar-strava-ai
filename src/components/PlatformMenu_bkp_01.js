import React, { useState, useRef, useEffect } from 'react';
import { Download, Share2 } from 'lucide-react';
import styles from './PlatformMenu.module.css';

const PlatformMenu = ({ onExport, onShare }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.menuBar} ref={menuRef}>
      <div className={styles.menuItem} onClick={() => setOpen(!open)}>
        File
        {open && (
          <div className={styles.dropdown}>
            <button onClick={onExport}>
              <Download size={14} />
              Export
            </button>
            <button onClick={onShare}>
              <Share2 size={14} />
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformMenu;
