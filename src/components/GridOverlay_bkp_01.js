import React from 'react';
import styles from './GridOverlay.module.css';

const GridOverlay = ({
  gridSize = 20,
  majorGridSize = 100,
  opacity = 0.15,
  color = '#ffffff',
  majorColor = '#ffffff',
  variant // Added the missing variant prop
}) => {
  return (
    <div
      className={styles.gridOverlay}
      style={{
        '--grid-size': `${gridSize}px`,
        '--major-grid-size': `${majorGridSize}px`,
        '--grid-opacity': opacity,
        '--grid-color': color,
        '--major-grid-color': majorColor
      }}
    >
      {/* Optional corner coordinates for reference */}
      <div className={styles.coordinate} style={{ top: 0, left: 0 }}>0,0</div>
      <div className={styles.coordinate} style={{ top: 0, right: 0 }}>100%,0</div>
      <div className={styles.coordinate} style={{ bottom: 0, left: 0 }}>0,100%</div>
      <div className={styles.coordinate} style={{ bottom: 0, right: 0 }}>100%,100%</div>

      {/* Center crosshairs */}
      <div className={styles.centerLine} style={{
        top: '50%',
        left: 0,
        right: 0,
        height: '1px',
        background: `rgba(255, 255, 0, ${opacity * 2})`
      }}></div>
      <div className={styles.centerLine} style={{
        left: '50%',
        top: 0,
        bottom: 0,
        width: '1px',
        background: `rgba(255, 255, 0, ${opacity * 2})`
      }}></div>

      {/* Typography scale reference lines for hero */}
      {variant === 'hero' && (
        <>
          {/* 3.5rem title height reference (~56px) */}
          {/*<div className={styles.typographyMarker} style={{*/}
          {/*  left: '5%',*/}
          {/*  width: '40%',*/}
          {/*  top: '120px',*/}
          {/*  height: '56px',*/}
          {/*  border: '1px solid rgba(255, 192, 203, 0.5)',*/}
          {/*  background: 'rgba(255, 192, 203, 0.1)'*/}
          {/*}}>*/}
          {/*  /!*<span className={styles.typeLabel}>3.5rem TITLE (~56px)</span>*!/*/}
          {/*</div>*/}

          {/* Chart area overlay in right column */}
          {/*<div className={styles.chartReference} style={{*/}
          {/*  right: '5%',*/}
          {/*  width: '300px',*/}
          {/*  top: '50%',*/}
          {/*  height: '300px',*/}
          {/*  transform: 'translateY(-50%)',*/}
          {/*  border: '2px solid rgba(255, 255, 255, 0.8)',*/}
          {/*  background: 'rgba(255, 255, 255, 0.05)'*/}
          {/*}}>*/}
          {/*  /!*<span className={styles.chartLabel}>300×300 CHART AREA</span>*!/*/}
          {/*</div>*/}
        </>
      )}
    </div>
  );
};

export default GridOverlay;