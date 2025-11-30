import React, { useCallback, useEffect, useRef } from 'react';

// Simple beep sound using Web Audio API to avoid external file dependencies
const playBeep = (ctx: AudioContext) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
  
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

interface AlarmManagerProps {
  trigger: boolean;
  onStop: () => void;
}

const AlarmManager: React.FC<AlarmManagerProps> = ({ trigger, onStop }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize AudioContext on user interaction if possible, 
    // but here we init when component mounts to be ready.
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    if (trigger) {
      // Start Vibration
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 1000]);
      }

      // Start Sound Loop
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        playBeep(ctx);
        
        intervalRef.current = window.setInterval(() => {
          playBeep(ctx);
          if (navigator.vibrate) navigator.vibrate([500, 200]);
        }, 1500);
      }
    } else {
      // Stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trigger]);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-pulse">
      <div className="bg-red-600 w-full max-w-sm p-8 rounded-2xl shadow-2xl text-center border-4 border-white">
        <h1 className="text-4xl font-black text-white mb-4">도착 알림!</h1>
        <p className="text-xl text-white mb-8">목적지(또는 전역)에 도착했습니다.</p>
        <button 
          onClick={onStop}
          className="w-full bg-white text-red-600 text-xl font-bold py-4 rounded-xl hover:bg-gray-100 transition-colors"
        >
          알람 끄기
        </button>
      </div>
    </div>
  );
};

export default AlarmManager;