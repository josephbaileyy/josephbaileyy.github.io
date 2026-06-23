export interface DeviceProfile {
  isIOS: boolean;
  isWebKit: boolean;
  isMobile: boolean;
  isCoarsePointer: boolean;
  lowPowerGpu: boolean;
  disablePostFx: boolean;
  softenPostFx: boolean;
  maxDpr: {
    high: number;
    med: number;
    low: number;
  };
}

export function detectDeviceProfile(): DeviceProfile {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const touchPoints = navigator.maxTouchPoints || 0;
  const isIPadOSDesktopMode = platform === 'MacIntel' && touchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOSDesktopMode;
  const isChromiumFamily = /Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|Firefox|FxiOS/.test(ua);
  const isWebKit = isIOS || (/AppleWebKit/.test(ua) && !isChromiumFamily);
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? touchPoints > 0;
  const isMobile = isIOS || isCoarsePointer || window.matchMedia?.('(max-width: 760px)').matches === true;
  const lowPowerGpu = isIOS || (isWebKit && isMobile);

  return {
    isIOS,
    isWebKit,
    isMobile,
    isCoarsePointer,
    lowPowerGpu,
    // iOS Safari is much happier without bloom render targets and fullscreen
    // post passes. Desktop Safari keeps the pass, but softened.
    disablePostFx: lowPowerGpu,
    softenPostFx: isWebKit || isMobile,
    maxDpr: lowPowerGpu
      ? { high: 1, med: 1, low: 1 }
      : isWebKit
        ? { high: 1.25, med: 1.1, low: 1 }
        : isMobile
          ? { high: 1.5, med: 1.25, low: 1 }
          : { high: 2, med: 1.5, low: 1 },
  };
}

export function viewportSize(): { w: number; h: number } {
  const vv = window.visualViewport;
  return {
    w: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    h: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}
