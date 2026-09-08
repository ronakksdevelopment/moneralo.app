/**
 * @file modal.js
 * Generic modal dialog utility. Content is built with safe DOM APIs
 * (textContent) — never raw innerHTML from user/AI input.
 */

const overlay = () => document.getElementById('modal-overlay');
const modalEl = () => document.getElementById('modal');

let activeResolver = null;

function closeModal() {
  const o = overlay();
  const m = modalEl();
  if (o) o.hidden = true;
  if (m) {
    m.hidden = true;
    m.innerHTML = '';
  }
  document.removeEventListener('keydown', onKeydown);
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
    if (activeResolver) {
      activeResolver(false);
      activeResolver = null;
    }
  }
}

/**
 * Show a confirmation dialog.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.confirmLabel]
 * @param {string} [opts.cancelLabel]
 * @param {boolean} [opts.danger]
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const o = overlay();
    const m = modalEl();
    if (!o || !m) { resolve(false); return; }

    m.innerHTML = '';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal__title';
    titleEl.textContent = title;

    const bodyEl = document.createElement('p');
    bodyEl.className = 'modal__body';
    bodyEl.textContent = body;

    const actions = document.createElement('div');
    actions.className = 'modal__actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn--ghost';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener('click', () => {
      closeModal();
      resolve(false);
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = danger ? 'btn btn--danger' : 'btn btn--primary';
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', () => {
      closeModal();
      resolve(true);
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    m.appendChild(titleEl);
    m.appendChild(bodyEl);
    m.appendChild(actions);

    o.hidden = false;
    m.hidden = false;

    o.onclick = () => {
      closeModal();
      resolve(false);
    };

    activeResolver = resolve;
    document.addEventListener('keydown', onKeydown);

    confirmBtn.focus();
  });
}

/**
 * Show a custom modal with a caller-supplied builder function that receives
 * the content container to append safe DOM nodes into.
 * @param {(container: HTMLElement, close: () => void) => void} builder
 */
export function openCustomModal(builder) {
  const o = overlay();
  const m = modalEl();
  if (!o || !m) return;
  m.innerHTML = '';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal__close icon-btn';
  closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', closeModal);
  m.style.position = 'fixed';
  m.appendChild(closeBtn);

  builder(m, closeModal);

  o.hidden = false;
  m.hidden = false;
  o.onclick = closeModal;
  document.addEventListener('keydown', onKeydown);
}

export { closeModal };
