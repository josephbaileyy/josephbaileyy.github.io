function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smootherStep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function parseHexColor(value) {
  const hex = String(value || '#05060a').replace('#', '').trim();
  const full = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
  const number = Number.parseInt(full, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function mixColor(a, b, t) {
  const amount = clamp01(t);

  return {
    r: Math.round(a.r + (b.r - a.r) * amount),
    g: Math.round(a.g + (b.g - a.g) * amount),
    b: Math.round(a.b + (b.b - a.b) * amount),
  };
}

function toCssColor(color) {
  return `rgb(${color.r} ${color.g} ${color.b})`;
}

function chapterColorAt(chapter, localProgress) {
  const start = chapter.ground;
  const end = chapter.groundEnd || chapter.ground;
  return mixColor(start, end, smootherStep(localProgress));
}

export function createGroundController({ element = document.querySelector('#ground-underlay') } = {}) {
  const chapters = [...document.querySelectorAll('[data-ground]')].map((element) => ({
    element,
    ground: parseHexColor(element.dataset.ground),
    groundEnd: element.dataset.groundEnd ? parseHexColor(element.dataset.groundEnd) : null,
  }));

  let currentCss = '';

  function getCurrentChapter(centerY) {
    return chapters.find((chapter) => {
      const rect = chapter.element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + chapter.element.offsetHeight;
      return centerY >= top && centerY < bottom;
    }) || chapters[chapters.length - 1];
  }

  function update() {
    if (!element || !chapters.length) {
      return;
    }

    const centerY = window.scrollY + window.innerHeight * 0.5;
    const chapter = getCurrentChapter(centerY);
    const index = chapters.indexOf(chapter);
    const top = chapter.element.getBoundingClientRect().top + window.scrollY;
    const height = Math.max(1, chapter.element.offsetHeight);
    const localProgress = clamp01((centerY - top) / height);
    let color = chapterColorAt(chapter, localProgress);

    if (localProgress > 0.75 && chapters[index + 1]) {
      const nextColor = chapterColorAt(chapters[index + 1], 0);
      color = mixColor(color, nextColor, smootherStep((localProgress - 0.75) / 0.25));
    } else if (localProgress < 0.25 && chapters[index - 1]) {
      const previousColor = chapterColorAt(chapters[index - 1], 1);
      color = mixColor(previousColor, color, smootherStep(localProgress / 0.25));
    }

    const css = toCssColor(color);

    if (css !== currentCss) {
      element.style.backgroundColor = css;
      document.documentElement.style.backgroundColor = css;
      document.body.style.backgroundColor = css;
      currentCss = css;
    }
  }

  update();

  return {
    update,
  };
}
