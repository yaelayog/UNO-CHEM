import { describe, it, expect } from 'vitest';
import { sfx, isMuted, setMuted, toggleMuted } from './audio';

describe('audio (Web Audio API)', () => {
  it('semua sfx aman dipanggil tanpa AudioContext (lingkungan node)', () => {
    for (const bunyi of Object.values(sfx)) {
      expect(() => bunyi()).not.toThrow();
    }
  });

  it('mute bisa di-set & di-toggle', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });
});
