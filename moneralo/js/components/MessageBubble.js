/**
 * @file MessageBubble.js
 * Builds a single message bubble DOM node. Uses textContent/safe HTML
 * conversion only — never raw innerHTML from message content.
 */

import { formatTime, textToSafeHtml } from '../utils/helpers.js';

/**
 * @param {import('../types.js').ChatMessage} message
 * @param {{ onRetry?: (id: string) => void }} [handlers]
 * @returns {HTMLElement}
 */
export function renderMessageBubble(message, handlers = {}) {
  const row = document.createElement('div');
  row.className = `msg-row msg-row--${message.role === 'user' ? 'out' : 'in'}`;
  if (message.failed) row.classList.add('msg-row--failed');
  row.dataset.messageId = message.id;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.alignItems = message.role === 'user' ? 'flex-end' : 'flex-start';
  wrapper.style.maxWidth = '100%';

  const bubble = document.createElement('div');
  bubble.className = `bubble bubble--${message.role === 'user' ? 'out' : 'in'}`;

  // Safe HTML: escape content, preserve line breaks only.
  bubble.innerHTML = textToSafeHtml(message.content);

  const meta = document.createElement('div');
  meta.className = 'bubble__meta';

  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTime(message.timestamp);
  meta.appendChild(timeSpan);

  if (message.role === 'user') {
    const statusIcon = document.createElement('i');
    if (message.status === 'sending') {
      statusIcon.className = 'fa-regular fa-clock';
    } else if (message.status === 'sent') {
      statusIcon.className = 'fa-solid fa-check';
    } else if (message.status === 'delivered') {
      statusIcon.className = 'fa-solid fa-check-double';
    } else if (message.status === 'read') {
      statusIcon.className = 'fa-solid fa-check-double read';
    } else if (message.status === 'failed') {
      statusIcon.className = 'fa-solid fa-triangle-exclamation';
    }
    if (statusIcon.className) meta.appendChild(statusIcon);
  }

  bubble.appendChild(meta);
  wrapper.appendChild(bubble);

  if (message.failed && handlers.onRetry) {
    const errorRow = document.createElement('div');
    errorRow.className = 'msg-row__error';
    errorRow.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span></span>`;
    errorRow.querySelector('span').textContent = message.errorMessage
      ? `${message.errorMessage} Tap to retry.`
      : 'Failed to send. Tap to retry.';
    errorRow.addEventListener('click', () => handlers.onRetry(message.id));
    wrapper.appendChild(errorRow);
  }

  row.appendChild(wrapper);
  return row;
}
