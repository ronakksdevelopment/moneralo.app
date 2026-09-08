/**
 * @file OpenRouterService.js
 * The single isolated module responsible for talking to OpenRouter.
 * - No API key is ever hardcoded here or anywhere in the app.
 * - Requests are sent directly from the user's browser to OpenRouter
 *   using the key they provide, which is stored only in localStorage.
 * - Provides: sendChat (with streaming-free simple completion),
 *   testApiKey, and cancelActive (AbortController-based).
 */

import { StorageService } from './StorageService.js';

const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 30000;

/** Friendly, non-technical error messages mapped from failure conditions. */
const FRIENDLY_ERRORS = {
  NO_KEY: "Mrittika can't reply yet — add your OpenRouter API key in Settings first.",
  INVALID_KEY: 'That API key looks invalid or was rejected. Please check it in Settings.',
  RATE_LIMIT: "Mrittika's a little overwhelmed right now (rate limit reached). Try again in a moment.",
  TIMEOUT: 'That took too long to respond. Please check your connection and try again.',
  NETWORK: "Couldn't reach OpenRouter — check your internet connection and try again.",
  SERVER: 'OpenRouter had a hiccup on their end. Please try again shortly.',
  EMPTY: 'Mrittika didn\'t send anything back that time. Try sending your message again.',
  MALFORMED: 'Got an unexpected response shape back. Please try again.',
  CANCELLED: 'Message sending was cancelled.',
  UNKNOWN: 'Something went wrong sending that message. Please try again.',
};

let activeController = null;

export const OpenRouterService = {
  FRIENDLY_ERRORS,

  /** True if a request is currently in flight. */
  isBusy() {
    return activeController !== null;
  },

  /** Cancel any in-flight request. */
  cancelActive() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  },

  /**
   * Send a chat completion request to OpenRouter.
   * @param {{messages: Array<{role:string, content:string}>}} payload
   * @returns {Promise<{ok: true, text: string} | {ok: false, code: string, message: string}>}
   */
  async sendChat({ messages }) {
    const config = StorageService.getApiConfig();

    if (!config.apiKey || !config.apiKey.trim()) {
      return { ok: false, code: 'NO_KEY', message: FRIENDLY_ERRORS.NO_KEY };
    }
    if (this.isBusy()) {
      return { ok: false, code: 'BUSY', message: 'Please wait for the previous message to finish.' };
    }

    const controller = new AbortController();
    activeController = controller;
    const timeoutId = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(config.endpoint || DEFAULT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
          'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://moneralo.app',
          'X-Title': 'MonerAlo',
        },
        body: JSON.stringify({
          model: config.model || 'openrouter/free',
          messages,
          temperature: typeof config.temperature === 'number' ? config.temperature : 0.9,
          max_tokens: typeof config.maxTokens === 'number' ? config.maxTokens : 700,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return await this._mapHttpError(response);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        return { ok: false, code: 'MALFORMED', message: FRIENDLY_ERRORS.MALFORMED };
      }

      const text = this._extractText(data);
      if (!text || !text.trim()) {
        return { ok: false, code: 'EMPTY', message: FRIENDLY_ERRORS.EMPTY };
      }

      return { ok: true, text: text.trim() };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason === 'timeout') {
          return { ok: false, code: 'TIMEOUT', message: FRIENDLY_ERRORS.TIMEOUT };
        }
        return { ok: false, code: 'CANCELLED', message: FRIENDLY_ERRORS.CANCELLED };
      }
      // Network-level failure (offline, DNS, CORS, etc.)
      return { ok: false, code: 'NETWORK', message: FRIENDLY_ERRORS.NETWORK };
    } finally {
      clearTimeout(timeoutId);
      activeController = null;
    }
  },

  /**
   * Quick validation call to test whether an API key works.
   * Uses a minimal, cheap request.
   * @param {{apiKey: string, model: string, endpoint: string}} cfg
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async testApiKey({ apiKey, model, endpoint }) {
    if (!apiKey || !apiKey.trim()) {
      return { ok: false, message: 'Please enter an API key first.' };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), 15000);

    try {
      const response = await fetch(endpoint || DEFAULT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://moneralo.app',
          'X-Title': 'MonerAlo',
        },
        body: JSON.stringify({
          model: model || 'openrouter/free',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: 'Key rejected — please double-check it was copied correctly.' };
      }
      if (response.status === 429) {
        return { ok: false, message: 'Key looks valid, but you are currently rate-limited. Try again shortly.' };
      }
      if (!response.ok) {
        return { ok: false, message: `OpenRouter returned an error (status ${response.status}). Please check the key and model.` };
      }
      return { ok: true, message: 'API key works! You are all set.' };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        return { ok: false, message: 'Test timed out. Check your connection and try again.' };
      }
      return { ok: false, message: "Couldn't reach OpenRouter. Check your internet connection." };
    }
  },

  /** @private */
  async _mapHttpError(response) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      /* ignore */
    }

    if (response.status === 401 || response.status === 403) {
      const cfg = StorageService.getApiConfig();
      cfg.keyStatus = 'invalid';
      StorageService.saveApiConfig(cfg);
      return { ok: false, code: 'INVALID_KEY', message: FRIENDLY_ERRORS.INVALID_KEY };
    }
    if (response.status === 429) {
      return { ok: false, code: 'RATE_LIMIT', message: FRIENDLY_ERRORS.RATE_LIMIT };
    }
    if (response.status >= 500) {
      return { ok: false, code: 'SERVER', message: FRIENDLY_ERRORS.SERVER };
    }
    // Log technical detail to console only — never shown to the user directly.
    console.warn('[OpenRouterService] HTTP error', response.status, bodyText.slice(0, 300));
    return { ok: false, code: 'UNKNOWN', message: FRIENDLY_ERRORS.UNKNOWN };
  },

  /** @private Extract assistant text defensively from various possible shapes. */
  _extractText(data) {
    try {
      if (!data) return '';
      const choice = data.choices && data.choices[0];
      if (!choice) return '';
      if (choice.message && typeof choice.message.content === 'string') {
        return choice.message.content;
      }
      // Some providers return content as an array of parts
      if (choice.message && Array.isArray(choice.message.content)) {
        return choice.message.content
          .map((part) => (typeof part === 'string' ? part : part?.text || ''))
          .join('');
      }
      if (typeof choice.text === 'string') return choice.text;
      return '';
    } catch {
      return '';
    }
  },
};
