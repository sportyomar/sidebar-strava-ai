import { useState, useCallback, useMemo } from 'react';

// useParametricScale - Manages scaling via multiplier parameters
export const useParametricScale = (initialScale = 1) => {
  const [scale, setScale] = useState(initialScale);
  const [scaleHistory, setScaleHistory] = useState([initialScale]);

  // Common scale presets
  const presets = useMemo(() => ({
    quarter: 0.25,
    half: 0.5,
    threeQuarters: 0.75,
    normal: 1,
    oneTwentyFive: 1.25,
    oneAndHalf: 1.5,
    double: 2,
    triple: 3,
    quadruple: 4
  }), []);

  const setScaleValue = useCallback((newScale) => {
    const clampedScale = Math.max(0.1, Math.min(10, newScale)); // Limit between 0.1x and 10x
    setScale(clampedScale);
    setScaleHistory(prev => [...prev.slice(-9), clampedScale]); // Keep last 10 values
  }, []);

  const setScalePreset = useCallback((presetName) => {
    if (presets[presetName]) {
      setScaleValue(presets[presetName]);
    }
  }, [presets, setScaleValue]);

  const incrementScale = useCallback((step = 0.1) => {
    setScaleValue(scale + step);
  }, [scale, setScaleValue]);

  const decrementScale = useCallback((step = 0.1) => {
    setScaleValue(scale - step);
  }, [scale, setScaleValue]);

  const resetScale = useCallback(() => {
    setScaleValue(1);
  }, [setScaleValue]);

  const scaleValue = useCallback((value) => {
    return value * scale;
  }, [scale]);

  const scaleCoordinates = useCallback((x, y) => {
    return { x: x * scale, y: y * scale };
  }, [scale]);

  const scaleDimensions = useCallback((width, height) => {
    return { width: width * scale, height: height * scale };
  }, [scale]);

  return {
    scale,
    scaleHistory,
    presets,
    setScaleValue,
    setScalePreset,
    incrementScale,
    decrementScale,
    resetScale,
    scaleValue,
    scaleCoordinates,
    scaleDimensions,
    getScalePercentage: () => Math.round(scale * 100)
  };
};