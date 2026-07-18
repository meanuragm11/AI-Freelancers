const SOUND_PATH = '/sounds/notification.wav';

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(SOUND_PATH);
    audio.preload = 'auto';
  }
  return audio;
}

/** Call once after user interaction so autoplay policies allow notification sounds. */
export function unlockNotificationSound(): void {
  if (typeof window === 'undefined' || unlocked) return;
  const el = getAudio();
  if (!el) return;

  el.volume = 0;
  void el
    .play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.volume = 1;
      unlocked = true;
    })
    .catch(() => {
      // Fail silently — browser blocked autoplay unlock
    });
}

/** Plays the notification sound once. Fails silently on autoplay block or missing file. */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  const el = getAudio();
  if (!el) return;

  el.currentTime = 0;
  void el.play().catch(() => {
    // Fail silently on autoplay block
  });
}
