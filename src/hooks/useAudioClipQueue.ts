import { useCallback, useRef, useState } from 'react';
import { pcm16Base64ToWavUrl } from '@/lib/audio/pcmToWav';

export type PcmClip = {
  key: string;
  text?: string;
  audioBase64: string;
  sampleRate?: number;
};

export function useAudioClipQueue({ muted }: { muted: boolean }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentClipKey, setCurrentClipKey] = useState<string | null>(null);
  const [failedClips, setFailedClips] = useState<string[]>([]);
  const playSessionRef = useRef(0);

  const stop = useCallback(() => {
    playSessionRef.current += 1;
    setIsSpeaking(false);
    setCurrentClipKey(null);
  }, []);

  const playClips = useCallback(
    async (clips: PcmClip[], retryCount = 1) => {
      if (!clips.length) return;

      const sessionId = ++playSessionRef.current;
      setIsSpeaking(true);
      setFailedClips([]);

      for (const clip of clips) {
        if (playSessionRef.current !== sessionId) break;

        setCurrentClipKey(clip.key);

        let attempts = 0;
        let success = false;

        while (attempts <= retryCount && !success) {
          const url = pcm16Base64ToWavUrl(clip.audioBase64, clip.sampleRate ?? 24000);

          try {
            await new Promise<void>((resolve, reject) => {
              const audio = new Audio(url);
              audio.volume = muted ? 0 : 1;
              audio.onended = () => resolve();
              audio.onerror = () => reject(new Error('Audio playback failed'));
              audio.play().catch(reject);
            });
            success = true;
          } catch (err) {
            attempts++;
            console.warn(`Clip ${clip.key} playback failed (attempt ${attempts})`);
          } finally {
            URL.revokeObjectURL(url);
          }
        }

        if (!success) {
          console.error(`Skipping clip ${clip.key} after ${retryCount + 1} attempts`);
          setFailedClips((prev) => [...prev, clip.key]);
        }
      }

      if (playSessionRef.current === sessionId) {
        setIsSpeaking(false);
        setCurrentClipKey(null);
      }
    },
    [muted]
  );

  return { isSpeaking, currentClipKey, failedClips, playClips, stop };
}
