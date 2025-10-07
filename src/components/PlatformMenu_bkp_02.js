import React, { useState, useRef, useEffect } from 'react';
import styles from './PlatformMenu.module.css';

const PlatformMenu = ({ onExport, onShare }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderDropdown = (menu) => {
    if (menu === 'File') {
      return (
        <div className={styles.dropdown}>
          <button onClick={onExport}>
            Export <span className={styles.shortcut}>⌘E</span>
          </button>
          <button onClick={onShare}>
            Share <span className={styles.shortcut}>⇧⌘S</span>
          </button>
        </div>
      );
    } else if (menu === 'Edit') {
      return (
        <div className={styles.dropdown}>
          <button>Undo <span className={styles.shortcut}>⌘Z</span></button>
          <button>Redo <span className={styles.shortcut}>⇧⌘Z</span></button>
          <button>Cut <span className={styles.shortcut}>⌘X</span></button>
          <button>Copy <span className={styles.shortcut}>⌘C</span></button>
          <button>Paste <span className={styles.shortcut}>⌘V</span></button>
        </div>
      );
    } else if (menu === 'View') {
      return (
        <div className={styles.dropdown}>
          <button>Sidebar</button>
          <button>Zoom In <span className={styles.shortcut}>⌘+</span></button>
          <button>Zoom Out <span className={styles.shortcut}>⌘−</span></button>
        </div>
      );
    }
  };

  return (
    <div className={styles.menuBar} ref={menuRef}>
      {['File', 'Edit', 'View'].map((label) => (
        <div
          key={label}
          className={styles.menuItem}
          onClick={() => setOpenMenu(openMenu === label ? null : label)}
        >
          {label}
          {openMenu === label && renderDropdown(label)}
        </div>
      ))}
    </div>
  );
};

export default PlatformMenu;
