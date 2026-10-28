/* Independent of course content and annotations. Apply before first paint. */
(() => {
  const key = 'probability-notebook-appearance-v1';
  const choices = {
    theme: ['original', 'minimal', 'paper', 'studio'],
    font: ['default', 'georgia', 'palatino', 'sans'],
    buttons: ['default', 'outlined', 'soft']
  };
  const defaults = { theme: 'original', font: 'default', buttons: 'default' };
  let settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    for (const name of Object.keys(choices)) {
      if (choices[name].includes(saved?.[name])) settings[name] = saved[name];
    }
  } catch { /* Appearance still works when storage is unavailable. */ }
  // Explicit links preview a complete scheme, independently of saved preferences.
  const params = new URLSearchParams(location.search);
  if (choices.theme.includes(params.get('theme'))) {
    settings = { ...defaults, theme: params.get('theme') };
    for (const name of ['font', 'buttons']) {
      if (choices[name].includes(params.get(name))) settings[name] = params.get(name);
    }
  }
  function apply() {
    for (const name of Object.keys(choices)) {
      document.documentElement.dataset[name] = params.has('print') ? defaults[name] : settings[name];
    }
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('appearance-menu');
    if (!menu) return; // Reading-only surfaces still inherit the saved appearance.
    const status = document.getElementById('appearance-status');
    function sync() {
      menu.querySelectorAll('[name="theme"]').forEach(input => input.checked = input.value === settings.theme);
      for (const name of ['font', 'buttons']) document.getElementById(`appearance-${name}`).value = settings[name];
    }
    function update() {
      apply();
      sync();
      // Retain the current entry, view, history state, and all other URL parameters.
      const url = new URL(location.href);
      for (const name of Object.keys(choices)) url.searchParams.delete(name);
      if (settings.theme !== 'original' || settings.font !== 'default' || settings.buttons !== 'default') {
        url.searchParams.set('theme', settings.theme);
      }
      for (const name of ['font', 'buttons']) {
        if (settings[name] !== 'default') url.searchParams.set(name, settings[name]);
      }
      history.replaceState(history.state, '', url);
      try {
        localStorage.setItem(key, JSON.stringify(settings));
        status.textContent = 'Saved for this browser.';
      } catch {
        status.textContent = 'Applied for this visit; browser storage is unavailable.';
      }
    }
    menu.addEventListener('change', event => {
      const { name, value } = event.target;
      if (!choices[name]?.includes(value)) return;
      // A preset starts with its intended font and controls; then fine-tune below.
      if (name === 'theme') settings = { ...defaults, theme: value };
      else settings[name] = value;
      update();
    });
    document.getElementById('appearance-reset').addEventListener('click', () => {
      settings = { ...defaults };
      update();
    });
    function close(returnFocus = false) {
      menu.open = false;
      if (returnFocus) menu.querySelector('summary').focus();
    }
    document.getElementById('appearance-done').addEventListener('click', () => close(true));
    for (const id of ['view-toggle', 'fullscreen']) {
      document.getElementById(id).addEventListener('click', () => close(true));
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { close(true); event.preventDefault(); }
    });
    document.addEventListener('pointerdown', event => {
      if (menu.open && !menu.contains(event.target)) close();
    });
    menu.addEventListener('focusout', event => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) close();
    });
    document.getElementById('open-about').addEventListener('click', () => {
      menu.open = true;
      const about = document.getElementById('reader-about');
      about.open = true;
      about.querySelector('summary').focus();
    });
    sync();
  });
})();
