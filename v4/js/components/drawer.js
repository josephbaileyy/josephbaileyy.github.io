const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container) {
  return [...container.querySelectorAll(focusableSelector)].filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  );
}

function removeDuplicateIds(element) {
  if (element.hasAttribute('id')) element.removeAttribute('id');
  element.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
}

export default function mountDrawer(dialog, { sourceRoot = document } = {}) {
  if (!dialog) {
    return {
      open() {
        return false;
      },
      close() {},
      destroy() {},
    };
  }

  const content = dialog.querySelector('[data-drawer-content]');
  const closeButton = dialog.querySelector('[data-drawer-close]');
  let returnTarget = null;
  let inertRecords = [];

  function setBackgroundInert(inert) {
    if (inert) {
      inertRecords = [...document.body.children]
        .filter((element) => element !== dialog)
        .map((element) => ({ element, inert: element.inert }));
      inertRecords.forEach(({ element }) => {
        element.inert = true;
      });
      return;
    }

    inertRecords.forEach(({ element, inert: previous }) => {
      element.inert = previous;
    });
    inertRecords = [];
  }

  function isOpen() {
    return dialog.open || dialog.hasAttribute('open');
  }

  function close() {
    if (!isOpen()) return;
    if (typeof dialog.close === 'function') dialog.close();
    else {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    }
    handleClose();
  }

  function findSource(id) {
    return [...sourceRoot.querySelectorAll('[data-item-id]')].find(
      (element) => element.dataset.itemId === id,
    );
  }

  function open(id, trigger = document.activeElement) {
    const source = findSource(id);
    if (!source || !content) return false;

    const clone = source.cloneNode(true);
    removeDuplicateIds(clone);
    content.replaceChildren(clone);
    returnTarget = trigger instanceof HTMLElement ? trigger : null;

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    setBackgroundInert(true);
    closeButton?.focus();
    return true;
  }

  function handleKeydown(event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusable(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleCancel(event) {
    event.preventDefault();
    close();
  }

  function handleDocumentKeydown(event) {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    close();
  }

  function handleClose() {
    setBackgroundInert(false);
    const target = returnTarget?.isConnected ? returnTarget : null;
    if (target) {
      target.focus({ preventScroll: true });
      queueMicrotask(() => {
        if (target.isConnected) target.focus({ preventScroll: true });
      });
      setTimeout(() => {
        if (target.isConnected) target.focus({ preventScroll: true });
      }, 0);
    }
    returnTarget = null;
  }

  closeButton?.addEventListener('click', close);
  dialog.addEventListener('keydown', handleKeydown);
  dialog.addEventListener('cancel', handleCancel);
  dialog.addEventListener('close', handleClose);
  document.addEventListener('keydown', handleDocumentKeydown, true);

  return {
    open,
    close,
    destroy() {
      closeButton?.removeEventListener('click', close);
      dialog.removeEventListener('keydown', handleKeydown);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      document.removeEventListener('keydown', handleDocumentKeydown, true);
      if (isOpen()) close();
      else setBackgroundInert(false);
    },
  };
}
