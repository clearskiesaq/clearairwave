import { useRef, useCallback, useState } from 'react';

export const useSoundscape = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    gainMain: GainNode;
    oscLow: OscillatorNode;
    oscMid: OscillatorNode;
    oscHigh: OscillatorNode;
    gainLow: GainNode;
    gainMid: GainNode;
    gainHigh: GainNode;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const start = useCallback((aqi: number) => {
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const gainMain = ctx.createGain();
    gainMain.gain.value = volume;
    gainMain.connect(ctx.destination);

    // Low drone — always present, pitch drops with worse air
    const oscLow = ctx.createOscillator();
    const gainLow = ctx.createGain();
    oscLow.type = 'sine';
    oscLow.frequency.value = aqi <= 50 ? 80 : aqi <= 100 ? 65 : aqi <= 200 ? 50 : 40;
    gainLow.gain.value = 0.15;
    oscLow.connect(gainLow).connect(gainMain);
    oscLow.start();

    // Mid tone — warmth increases with AQI
    const oscMid = ctx.createOscillator();
    const gainMid = ctx.createGain();
    oscMid.type = 'triangle';
    oscMid.frequency.value = aqi <= 50 ? 220 : aqi <= 100 ? 185 : aqi <= 200 ? 150 : 120;
    gainMid.gain.value = aqi <= 50 ? 0.03 : aqi <= 100 ? 0.06 : 0.1;
    oscMid.connect(gainMid).connect(gainMain);
    oscMid.start();

    // High shimmer — pleasant for good air, dissonant for bad
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = aqi <= 100 ? 'sine' : 'sawtooth';
    oscHigh.frequency.value = aqi <= 50 ? 440 : aqi <= 100 ? 380 : aqi <= 200 ? 310 : 270;
    gainHigh.gain.value = aqi <= 50 ? 0.02 : 0.04;
    oscHigh.connect(gainHigh).connect(gainMain);
    oscHigh.start();

    // Gentle LFO modulation on the high tone
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = aqi <= 50 ? 0.3 : 0.8;
    lfoGain.gain.value = aqi <= 50 ? 5 : 15;
    lfo.connect(lfoGain).connect(oscHigh.frequency);
    lfo.start();

    nodesRef.current = { gainMain, oscLow, oscMid, oscHigh, gainLow, gainMid, gainHigh };
    setIsPlaying(true);
  }, [volume]);

  const stop = useCallback(() => {
    if (!audioCtxRef.current || !nodesRef.current) return;

    const { gainMain } = nodesRef.current;
    // Fade out
    gainMain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.5);

    setTimeout(() => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      nodesRef.current = null;
      setIsPlaying(false);
    }, 600);
  }, []);

  const updateVolume = useCallback((v: number) => {
    setVolume(v);
    if (nodesRef.current) {
      nodesRef.current.gainMain.gain.value = v;
    }
  }, []);

  return { isPlaying, start, stop, volume, updateVolume };
};
