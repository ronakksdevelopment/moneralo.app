/**
 * @file helpers.js
 * Small, dependency-free utility functions shared across MonerAlo.
 */

/** Generate a RFC4122-ish UUID v4, using crypto when available. */
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Debounce a function call. */
export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Clamp a number between min and max. */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Escape HTML special characters to prevent injection.
 * Used before any AI or user text is inserted into innerHTML.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize AI/user output for safe rendering:
 * - Escapes HTML
 * - Preserves line breaks (converted to <br> only at render time by caller)
 * - Strips control characters
 * Never allows raw HTML/JS execution.
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  // Strip null bytes and most control chars except \n and \t
  let cleaned = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Trim excessive blank lines (more than 2 consecutive newlines -> 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Convert sanitized plain text (with \n) into safe HTML with <br> line breaks.
 * Always escapes first — this is the only path allowed to produce innerHTML content
 * from user/AI text.
 */
export function textToSafeHtml(text) {
  const escaped = escapeHtml(sanitizeText(text));
  return escaped.replace(/\n/g, '<br>');
}

/** Format a timestamp as HH:MM (locale, 12-hour if locale prefers). */
export function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Format a timestamp as a date separator label (Today / Yesterday / date). */
export function formatDateSeparator(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

/** Format a relative "last message" time for the chat list (e.g. 2:30 PM, Yesterday, or date). */
export function formatListTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000);
  if (diffDays === 0) return formatTime(ts);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Get time-of-day bucket based on local device hour. */
export function getTimeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'late_night';
}

/** Truncate a string to a max length with ellipsis. */
export function truncate(str, max = 60) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;
}

/** Safe JSON parse returning a fallback on error. */
export function safeParse(str, fallback) {
  try {
    const val = JSON.parse(str);
    return val === null || val === undefined ? fallback : val;
  } catch {
    return fallback;
  }
}

/** Download a string as a file via a temporary anchor element. */
export function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Basic sanity check for an OpenRouter-style API key. */
export function looksLikeApiKey(key) {
  return typeof key === 'string' && key.trim().length >= 12;
}
