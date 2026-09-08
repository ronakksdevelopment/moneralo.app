/**
 * @file SoundManager.js
 * Simple message sound effects generated with the Web Audio API
 * (no external audio files needed). Respects browser autoplay
 * restrictions by lazily creating/resuming the AudioContext on first
 * user interaction, and respects the user's enable/disable + volume
 * settings from StorageService.
 */

import { StorageService } from './StorageService.js';

let audioCtx = null;

function getContext() {
  if (audioCtx) return audioCtx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Must be called from within a user gesture handler at least once. */
function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function tone({ freq = 880, duration = 0.09, type = 'sine', volume = 0.5, glideTo = null }) {
  const settings = StorageService.getSettings();
  if (!settings.sound?.enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const effectiveVolume = Math.min(1, Math.max(0, (settings.sound.volume ?? 0.5))) * volume;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {
    /* ignore audio errors silently — sound is non-critical */
  }
}

export const SoundManager = {
  unlockAudio,

  playOutgoing() {
    tone({ freq: 720, glideTo: 920, duration: 0.08, type: 'sine', volume: 0.35 });
  },

  playIncoming() {
    tone({ freq: 560, glideTo: 440, duration: 0.12, type: 'sine', volume: 0.4 });
  },

  playError() {
    tone({ freq: 220, duration: 0.18, type: 'square', volume: 0.25 });
  },
};
