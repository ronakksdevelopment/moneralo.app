/**
 * @file types.js
 * Central JSDoc type definitions used across MonerAlo.
 * No runtime code — documentation only, for editor intellisense and clarity.
 */

/**
 * @typedef {'user'|'assistant'|'system'} MessageRole
 */

/**
 * @typedef {'sending'|'sent'|'delivered'|'read'|'failed'} MessageStatus
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - UUID
 * @property {string} conversationId
 * @property {MessageRole} role
 * @property {string} content - Sanitized plain text (line breaks preserved as \n)
 * @property {number} timestamp - epoch ms
 * @property {MessageStatus} status
 * @property {boolean} [failed]
 * @property {string} [errorMessage] - user-friendly error description if failed
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - UUID
 * @property {string} title
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {string} [lastMessagePreview]
 * @property {boolean} [isSample] - true for the dismissible first-launch sample chat
 */

/**
 * @typedef {Object} MemoryEntry
 * @property {string} id
 * @property {string} label - short category e.g. "Preferred name", "Likes"
 * @property {string} value
 * @property {number} createdAt
 */

/**
 * @typedef {Object} ApiConfig
 * @property {string} apiKey - OpenRouter API key (stored locally only)
 * @property {string} model - OpenRouter model id
 * @property {string} endpoint - OpenRouter chat completions endpoint
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {'unknown'|'valid'|'invalid'|'testing'} keyStatus
 */

/**
 * @typedef {'light'|'dark'|'system'} ThemePref
 */

/**
 * @typedef {Object} SoundSettings
 * @property {boolean} enabled
 * @property {number} volume - 0 to 1
 */

/**
 * @typedef {Object} AppSettings
 * @property {ThemePref} theme
 * @property {SoundSettings} sound
 * @property {boolean} onboardingComplete
 * @property {boolean} sampleChatDismissed
 * @property {string} userDisplayName
 */

export {}; // keep this a module
