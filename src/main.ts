const MOBILE_MAX_WIDTH = 767;
const UNIVERSE_PREFERENCE_KEY = 'jb-universe-opt-in';
const MOBILE_ROUTE_PREFIX = '#/mobile';

function prefersMobileHome(): boolean {
  return window.innerWidth <= MOBILE_MAX_WIDTH && window.matchMedia('(pointer: coarse)').matches;
}

function hasUniversePreference(): boolean {
  try {
    return localStorage.getItem(UNIVERSE_PREFERENCE_KEY) === '1';
  } catch {
    return false;
  }
}

function isExplicitUniverseRoute(): boolean {
  return /^#\/(galaxy|solar|earth|stanford|room|screen)(?:\/|$)/.test(location.hash);
}

function mountUniverseHomeLink(): void {
  if (!prefersMobileHome()) return;
  const link = document.createElement('a');
  link.className = 'simple-home-link';
  link.href = '/';
  link.textContent = '← Simple home';
  link.addEventListener('click', (event) => {
    event.preventDefault();
    try {
      localStorage.removeItem(UNIVERSE_PREFERENCE_KEY);
    } catch {
      /* Persistence can be unavailable in private browsing. */
    }
    location.replace('/');
  });
  document.body.appendChild(link);
}

const useMobileHome =
  prefersMobileHome() &&
  (location.hash.startsWith(MOBILE_ROUTE_PREFIX) ||
    (!isExplicitUniverseRoute() && !hasUniversePreference()));

if (useMobileHome) {
  void import('./mobile/home').then(({ mountMobileHome }) => mountMobileHome());
} else {
  mountUniverseHomeLink();
  void import('./universe').then(() => document.body.classList.remove('booting'));
}
