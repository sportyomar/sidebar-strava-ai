import React, { useState, useRef, useEffect, forwardRef } from 'react';
import styles from './PlatformMenu.module.css';
import ViewPanel from './ViewPanel';

const PlatformMenu = forwardRef(({
  onExport,
  onShare,
  selectedWidgetId,
  onToggleSettingsPanel,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleGuides,
  onToggleGrid,
  onToggleDevTools,
  activeViewMode,
  setActiveViewMode
}, ref) => {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef();
  const viewPanelRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(e.target);
      const clickedOutsidePanel = viewPanelRef.current && !viewPanelRef.current.contains(e.target);

      if (clickedOutsideMenu && clickedOutsidePanel) {
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
          <button onClick={onExport}>Export <span className={styles.shortcut}>⌘E</span></button>
          <button onClick={onShare}>Share <span className={styles.shortcut}>⇧⌘S</span></button>
        </div>
      );
    }
    if (menu === 'Edit') {
      return (
        <div className={styles.dropdown}>
          <button>Undo <span className={styles.shortcut}>⌘Z</span></button>
          <button>Redo <span className={styles.shortcut}>⇧⌘Z</span></button>
          <button>Cut <span className={styles.shortcut}>⌘X</span></button>
          <button>Copy <span className={styles.shortcut}>⌘C</span></button>
          <button>Paste <span className={styles.shortcut}>⌘V</span></button>
        </div>
      );
    }
  };

  return (
    <>
      <div className={styles.menuBar} ref={ref || menuRef}>
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

      {openMenu === 'View' && (
        <ViewPanel
          ref={viewPanelRef}
          activeViewMode={activeViewMode}
          onSetViewMode={setActiveViewMode}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onToggleGrid={onToggleGrid}
          onToggleGuides={onToggleGuides}
          onToggleDevTools={onToggleDevTools}
        />
      )}
    </>
  );
});

export default PlatformMenu;
