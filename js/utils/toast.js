/**
 * @file toast.js
 * Lightweight toast notification system.
 */

const ICONS = {
  info: 'fa-circle-info',
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
};

/**
 * Show a toast message.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type]
 * @param {number} [duration] ms
 */
export function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fa-solid ${ICONS[type] || ICONS.info}"></i><span></span>`;
  toast.querySelector('span').textContent = message; // textContent = safe, no HTML injection

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 220);
  }, duration);
}
