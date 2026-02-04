import { useCallback, useMemo } from 'react';
import { getKeyByRow, getKeyByMidi, getKeyByPitch, TOTAL_KEYS } from '@/lib/utils/keys';
import { Note, TimeMarker } from '@/lib/types/music';
import { TimeMap } from '@/lib/utils/timeMap';

interface CoordinateOptions {
  zoomX: number; // Pixels per Beat
  zoomY: number; // Pixels per Key
  markers?: TimeMarker[];
}

export function useGridCoordinates({ zoomX, zoomY, markers = [] }: CoordinateOptions) {
  
  // Create TimeMap (memoized)
  const timeMap = useMemo(() => new TimeMap(markers), [markers]);

  /**
   * Converts a generic time (in measures) to Canvas X (Absolute)
   * Respects variable time signatures.
   */
  const timeToScreenX = useCallback((startMeasure: number) => {
    const beats = timeMap.measureToBeats(startMeasure);
    return beats * zoomX;
  }, [zoomX, timeMap]);

  // Direct Beat-to-Pixel for Playhead smoothness
  const beatToScreenX = useCallback((beat: number) => {
      return beat * zoomX;
  }, [zoomX]);

  /**
   * Converts Canvas X (Absolute) to generic time (in measures)
   */
  const screenXToTime = useCallback((x: number) => {
    const beats = x / zoomX;
    return timeMap.beatsToMeasure(beats);
  }, [zoomX, timeMap]);

  /**
   * Converts a MIDI pitch node (row index) to Canvas Y (Absolute)
   */
  const rowToScreenY = useCallback((rowIndex: number) => {
    return (rowIndex * zoomY);
  }, [zoomY]);

  /**
   * Converts Canvas Y (Absolute) to Row Index
   */
  const screenYToRow = useCallback((y: number) => {
    // y is already absolute canvas coordinate
    const row = Math.floor(y / zoomY);
    if (row < 0) return 0;
    if (row >= TOTAL_KEYS) return TOTAL_KEYS - 1;
    return row;
  }, [zoomY]);

  /**
   * Get formatting rect for a note
   */
  const getNoteRect = useCallback((note: Note) => {
    let rowIndex = 0;
    const key = getKeyByPitch(note.pitch);
    if (key) {
        rowIndex = key.index;
    }

    // X is absolute based on measure->beat map
    const x = timeToScreenX(note.start);
    const y = rowToScreenY(rowIndex);
    
    // Width is duration (in measures) converted to pixels
    // Note: Duration 'start + duration' might cross time signatures!
    // Correct width = timeToScreenX(start + duration) - timeToScreenX(start)
    const endX = timeToScreenX(note.start + note.duration);
    const w = endX - x;
    const h = zoomY;

    return { x, y, w, h };
  }, [timeToScreenX, rowToScreenY, zoomX, zoomY]);

  // Quantization Helper
  const snapTime = useCallback((timeMeasure: number, snapDiv: number) => {
    if (snapDiv <= 0.001) return timeMeasure;
    return Math.round(timeMeasure / snapDiv) * snapDiv;
  }, []);

  return {
    timeToScreenX,
    beatToScreenX, 
    screenXToTime,
    rowToScreenY,
    screenYToRow,
    getNoteRect,
    snapTime,
    timeMap // Export timeMap for Grid Drawing
  };
}
