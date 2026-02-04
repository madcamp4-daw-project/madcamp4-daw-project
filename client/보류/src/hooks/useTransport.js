import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import useProjectStore from '../store/useProjectStore';

const useTransport = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const bpm = useProjectStore((state) => state.bpm);
  const setIsPlaying = useProjectStore((state) => state.setIsPlaying);

  // Sync BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Sync Play/Pause
  useEffect(() => {
    if (isPlaying) {
      if (Tone.context.state !== 'running') {
        Tone.start();
      }
      Tone.Transport.start();
    } else {
      Tone.Transport.stop();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const stop = () => {
    setIsPlaying(false);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  };

  return { togglePlay, stop };
};

export default useTransport;
