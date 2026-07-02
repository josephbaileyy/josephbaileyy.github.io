/**
 * GoatCounter analytics: privacy-friendly, cookieless pageview and event
 * counts (https://www.goatcounter.com). No consent banner needed — no
 * cookies, no fingerprinting, no cross-site tracking.
 *
 * The universe is a hash-routed SPA, so automatic pageview counting is
 * disabled (`no_onload`) and we count one pageview on boot plus named events
 * for the moments that matter: how deep visitors travel, whether they take
 * the tour, and which panels they open. Events are queued until count.js
 * loads, and everything is a no-op on localhost and in automated browsers
 * (Playwright E2E).
 */

const ENDPOINT = 'https://josephbaileyy.goatcounter.com/count';

interface GoatCounterVars {
  path?: string;
  title?: string;
  event?: boolean;
}

interface GoatCounter {
  no_onload?: boolean;
  count?: (vars?: GoatCounterVars) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

const seen = new Set<string>();
const pending: GoatCounterVars[] = [];
let enabled = false;
let loaded = false;

function send(vars: GoatCounterVars): void {
  if (!enabled) return;
  if (loaded && window.goatcounter?.count) {
    window.goatcounter.count(vars);
  } else {
    pending.push(vars);
  }
}

export function initAnalytics(): void {
  const host = location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (isLocal || navigator.webdriver || enabled) return;
  enabled = true;

  window.goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = ENDPOINT;
  script.addEventListener('load', () => {
    loaded = true;
    while (pending.length) window.goatcounter?.count?.(pending.shift()!);
  });
  document.head.appendChild(script);

  send({ path: location.pathname || '/' });
}

/**
 * Count a named event. By default each name counts once per page load so
 * scene milestones measure unique reach, not re-visits within a session;
 * pass `once = false` for events where every occurrence is interesting.
 */
export function trackEvent(name: string, once = true): void {
  if (once) {
    if (seen.has(name)) return;
    seen.add(name);
  }
  send({ path: name, title: name, event: true });
}
