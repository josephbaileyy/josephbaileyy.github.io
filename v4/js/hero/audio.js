export function createMachineAudio(onPreference = () => {}) {
  let context = null;
  let enabled = false;

  async function setEnabled(nextEnabled) {
    enabled = nextEnabled;
    if (enabled && !context) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextConstructor) {
        context = new AudioContextConstructor();
      }
    }
    if (enabled && context?.state === 'suspended') await context.resume();
    onPreference(enabled);
    return enabled;
  }

  function impact(strength) {
    if (!enabled || !context) return;
    const now = context.currentTime;
    const normalized = Math.min(1, strength / 20);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = normalized > 0.58 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(165 - normalized * 95, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    filter.type = 'lowpass';
    filter.frequency.value = 580 + normalized * 900;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025 + normalized * 0.075, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  function destroy() {
    if (context) void context.close();
    context = null;
  }

  return {
    setEnabled,
    impact,
    destroy,
    get enabled() {
      return enabled;
    },
  };
}
