/**
 * @file MemoryService.js
 * A lightweight, fully local "memory" system. It looks for simple,
 * harmless conversational signals in the user's own messages (their
 * preferred name, stated likes/dislikes, simple preferences) using
 * conservative pattern matching — no data ever leaves the device, and
 * nothing sensitive is inferred or stored automatically.
 *
 * Users can always view, edit, and clear memories from Settings.
 */

import { StorageService } from './StorageService.js';

// Conservative, explicit patterns only — we do not want to "guess" too much.
const NAME_PATTERNS = [
  /\bmy name is ([a-zA-Z][a-zA-Z ]{1,20})\b/i,
  /\bcall me ([a-zA-Z][a-zA-Z ]{1,20})\b/i,
  /\bami ([a-zA-Z][a-zA-Z]{1,20})\b/i, // Benglish: "ami <Name>" is too broad alone; combined with heuristics below
];

const LIKE_PATTERNS = [
  /\bi (?:really )?like ([a-zA-Z0-9 ,'’-]{2,40})/i,
  /\bi love ([a-zA-Z0-9 ,'’-]{2,40})/i,
  /\bamar pochondo ([a-zA-Z0-9 ,'’-]{2,40})/i,
];

const DISLIKE_PATTERNS = [
  /\bi (?:really )?(?:don'?t|do not) like ([a-zA-Z0-9 ,'’-]{2,40})/i,
  /\bi hate ([a-zA-Z0-9 ,'’-]{2,40})/i,
];

function cleanCapture(str) {
  return str.trim().replace(/[.!?,]+$/, '').slice(0, 60);
}

export const MemoryService = {
  getAll() {
    return StorageService.getMemories();
  },

  add(label, value) {
    if (!value || !value.trim()) return this.getAll();
    return StorageService.addMemory(label, cleanCapture(value));
  },

  remove(id) {
    return StorageService.deleteMemory(id);
  },

  clear() {
    StorageService.clearMemories();
  },

  /**
   * Scan a freshly-sent user message for simple, explicit signals worth
   * remembering. Conservative on purpose — false negatives are fine,
   * false positives are annoying and possibly wrong.
   * @param {string} userText
   */
  scanMessage(userText) {
    if (!userText || userText.length > 300) return; // skip very long messages

    for (const re of NAME_PATTERNS) {
      const m = userText.match(re);
      if (m && m[1]) {
        const name = cleanCapture(m[1]);
        // Very short heuristic guard against false positives like "ami thik achi"
        const commonNonNames = ['fine', 'good', 'okay', 'ok', 'thik', 'bhalo', 'sad', 'happy', 'tired', 'busy'];
        if (name.length >= 2 && name.length <= 20 && !commonNonNames.includes(name.toLowerCase())) {
          this.add('Preferred name', name);
        }
        break;
      }
    }

    for (const re of LIKE_PATTERNS) {
      const m = userText.match(re);
      if (m && m[1]) {
        this.add('Likes', cleanCapture(m[1]));
        break;
      }
    }

    for (const re of DISLIKE_PATTERNS) {
      const m = userText.match(re);
      if (m && m[1]) {
        this.add('Dislikes', cleanCapture(m[1]));
        break;
      }
    }
  },

  /** Build a compact summary string for prompt injection. */
  summaryForPrompt(limit = 12) {
    const memories = this.getAll().slice(-limit);
    if (memories.length === 0) return '';
    return memories.map((m) => `${m.label}: ${m.value}`).join('; ');
  },
};
