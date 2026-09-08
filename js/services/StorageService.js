/**
 * @file StorageService.js
 * Single source of truth for all local persistence (localStorage).
 * Everything MonerAlo stores lives here: conversations, messages, memories,
 * settings, and API configuration. Nothing here ever leaves the device.
 *
 * Defensive by design: every read is safely parsed, malformed or missing
 * data falls back to sane defaults instead of throwing, and writes are
 * wrapped in try/catch (e.g. to handle quota exceeded).
 */

import { safeParse, uuid } from '../utils/helpers.js';

const NS = 'moneralo:v1:';

const KEYS = {
  CONVERSATIONS: NS + 'conversations',
  MESSAGES_PREFIX: NS + 'messages:', // + conversationId
  MEMORIES: NS + 'memories',
  SETTINGS: NS + 'settings',
  API_CONFIG: NS + 'apiConfig',
  SCHEMA_VERSION: NS + 'schemaVersion',
};

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = () => ({
  theme: 'system',
  sound: { enabled: true, volume: 0.5 },
  onboardingComplete: false,
  sampleChatDismissed: false,
  userDisplayName: '',
});

const DEFAULT_API_CONFIG = () => ({
  apiKey: '',
  model: 'openai/gpt-4o-mini',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  temperature: 0.9,
  maxTokens: 700,
  keyStatus: 'unknown',
});

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('[StorageService] read failed for', key, e);
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn('[StorageService] write failed for', key, e);
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[StorageService] remove failed for', key, e);
  }
}

export const StorageService = {
  /** Run once at startup: verify schema, migrate if needed. */
  init() {
    const version = parseInt(safeGet(KEYS.SCHEMA_VERSION) || '0', 10);
    if (version < CURRENT_SCHEMA_VERSION) {
      // No migrations needed yet for v1; just stamp the version.
      safeSet(KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
    }
  },

  // ---------------- Settings ----------------
  /** @returns {import('../types.js').AppSettings} */
  getSettings() {
    const raw = safeGet(KEYS.SETTINGS);
    const parsed = safeParse(raw, null);
    const defaults = DEFAULT_SETTINGS();
    if (!parsed || typeof parsed !== 'object') return defaults;
    return {
      ...defaults,
      ...parsed,
      sound: { ...defaults.sound, ...(parsed.sound || {}) },
    };
  },
  saveSettings(settings) {
    return safeSet(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // ---------------- API Config ----------------
  /** @returns {import('../types.js').ApiConfig} */
  getApiConfig() {
    const raw = safeGet(KEYS.API_CONFIG);
    const parsed = safeParse(raw, null);
    const defaults = DEFAULT_API_CONFIG();
    if (!parsed || typeof parsed !== 'object') return defaults;
    return { ...defaults, ...parsed };
  },
  saveApiConfig(config) {
    return safeSet(KEYS.API_CONFIG, JSON.stringify(config));
  },
  clearApiKey() {
    const cfg = this.getApiConfig();
    cfg.apiKey = '';
    cfg.keyStatus = 'unknown';
    this.saveApiConfig(cfg);
  },

  // ---------------- Conversations ----------------
  /** @returns {import('../types.js').Conversation[]} */
  getConversations() {
    const raw = safeGet(KEYS.CONVERSATIONS);
    const parsed = safeParse(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.id === 'string');
  },
  saveConversations(list) {
    return safeSet(KEYS.CONVERSATIONS, JSON.stringify(list));
  },
  /** @returns {import('../types.js').Conversation} */
  createConversation(title = 'New chat', isSample = false) {
    const convo = {
      id: uuid(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessagePreview: '',
      isSample,
    };
    const list = this.getConversations();
    list.unshift(convo);
    this.saveConversations(list);
    this.saveMessages(convo.id, []);
    return convo;
  },
  updateConversation(id, patch) {
    const list = this.getConversations();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: Date.now() };
    this.saveConversations(list);
    return list[idx];
  },
  deleteConversation(id) {
    const list = this.getConversations().filter((c) => c.id !== id);
    this.saveConversations(list);
    safeRemove(KEYS.MESSAGES_PREFIX + id);
  },
  clearAllConversations() {
    const list = this.getConversations();
    list.forEach((c) => safeRemove(KEYS.MESSAGES_PREFIX + c.id));
    this.saveConversations([]);
  },

  // ---------------- Messages ----------------
  /** @returns {import('../types.js').ChatMessage[]} */
  getMessages(conversationId) {
    const raw = safeGet(KEYS.MESSAGES_PREFIX + conversationId);
    const parsed = safeParse(raw, []);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && typeof m.id === 'string');
  },
  saveMessages(conversationId, messages) {
    return safeSet(KEYS.MESSAGES_PREFIX + conversationId, JSON.stringify(messages));
  },
  addMessage(conversationId, message) {
    const messages = this.getMessages(conversationId);
    messages.push(message);
    this.saveMessages(conversationId, messages);
    const preview = message.role === 'user' ? message.content : message.content;
    this.updateConversation(conversationId, {
      lastMessagePreview: preview.slice(0, 120),
    });
    return message;
  },
  updateMessage(conversationId, messageId, patch) {
    const messages = this.getMessages(conversationId);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return null;
    messages[idx] = { ...messages[idx], ...patch };
    this.saveMessages(conversationId, messages);
    return messages[idx];
  },
  deleteMessage(conversationId, messageId) {
    const messages = this.getMessages(conversationId).filter((m) => m.id !== messageId);
    this.saveMessages(conversationId, messages);
  },

  // ---------------- Memories ----------------
  /** @returns {import('../types.js').MemoryEntry[]} */
  getMemories() {
    const raw = safeGet(KEYS.MEMORIES);
    const parsed = safeParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  },
  saveMemories(list) {
    return safeSet(KEYS.MEMORIES, JSON.stringify(list));
  },
  addMemory(label, value) {
    const list = this.getMemories();
    // Avoid exact duplicate label+value pairs
    if (list.some((m) => m.label === label && m.value === value)) return list;
    list.push({ id: uuid(), label, value, createdAt: Date.now() });
    // Cap memories to a reasonable number to avoid unbounded growth
    const capped = list.slice(-100);
    this.saveMemories(capped);
    return capped;
  },
  deleteMemory(id) {
    const list = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(list);
    return list;
  },
  clearMemories() {
    this.saveMemories([]);
  },

  // ---------------- Danger zone ----------------
  /** Wipe everything MonerAlo has stored. */
  clearAllData() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(NS)) toRemove.push(k);
      }
      toRemove.forEach((k) => safeRemove(k));
    } catch (e) {
      console.warn('[StorageService] clearAllData failed', e);
    }
  },

  /** Rough estimate of bytes used by MonerAlo's keys (for diagnostics). */
  estimateUsageBytes() {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(NS)) {
          total += (k.length + (localStorage.getItem(k) || '').length) * 2;
        }
      }
    } catch {
      /* ignore */
    }
    return total;
  },
};
