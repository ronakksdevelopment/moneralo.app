/**
 * @file Settings.js
 * Renders the settings slide-over panel with navigable sections:
 * root menu -> API & Model, Appearance, Sound, Memory, Data & Privacy, About.
 */

import { StorageService } from '../services/StorageService.js';
import { OpenRouterService } from '../services/OpenRouterService.js';
import { ThemeService } from '../services/ThemeService.js';
import { MemoryService } from '../services/MemoryService.js';
import { showToast } from '../utils/toast.js';
import { confirmDialog } from '../utils/modal.js';
import { looksLikeApiKey, downloadTextFile } from '../utils/helpers.js';

const RECOMMENDED_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (fast, affordable)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (higher quality)' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (fast)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (free-tier friendly)' },
  { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B' },
  { id: 'custom', label: 'Custom model ID…' },
];

export class Settings {
  /**
   * @param {{
   *   panelEl: HTMLElement,
   *   overlayEl: HTMLElement,
   *   onDataWiped: () => void,
   *   onAllChatsCleared: () => void,
   * }} opts
   */
  constructor({ panelEl, overlayEl, onDataWiped, onAllChatsCleared }) {
    this.panelEl = panelEl;
    this.overlayEl = overlayEl;
    this.onDataWiped = onDataWiped;
    this.onAllChatsCleared = onAllChatsCleared;
    this.currentSection = 'root';

    this.overlayEl.addEventListener('click', () => this.close());
  }

  open(section = 'root') {
    this.currentSection = section;
    this._render();
    this.panelEl.hidden = false;
    this.overlayEl.hidden = false;
  }

  close() {
    this.panelEl.hidden = true;
    this.overlayEl.hidden = true;
  }

  _navigate(section) {
    this.currentSection = section;
    this._render();
  }

  _render() {
    this.panelEl.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'settings-panel__header';

    const titleMap = {
      root: 'Settings',
      api: 'API & Model',
      appearance: 'Appearance',
      sound: 'Sound',
      memory: 'Memories',
      data: 'Data & Privacy',
      about: 'About MonerAlo',
    };

    if (this.currentSection === 'root') {
      header.innerHTML = `<h2 class="settings-panel__title"></h2>`;
      header.querySelector('h2').textContent = titleMap.root;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'icon-btn';
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.setAttribute('aria-label', 'Close settings');
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    } else {
      const backBtn = document.createElement('button');
      backBtn.className = 'settings-back';
      backBtn.innerHTML = `<i class="fa-solid fa-arrow-left"></i><span></span>`;
      backBtn.querySelector('span').textContent = titleMap[this.currentSection];
      backBtn.addEventListener('click', () => this._navigate('root'));
      header.appendChild(backBtn);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'icon-btn';
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.setAttribute('aria-label', 'Close settings');
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    const body = document.createElement('div');
    body.className = 'settings-panel__body';

    switch (this.currentSection) {
      case 'api':
        this._renderApiSection(body);
        break;
      case 'appearance':
        this._renderAppearanceSection(body);
        break;
      case 'sound':
        this._renderSoundSection(body);
        break;
      case 'memory':
        this._renderMemorySection(body);
        break;
      case 'data':
        this._renderDataSection(body);
        break;
      case 'about':
        this._renderAboutSection(body);
        break;
      default:
        this._renderRoot(body);
    }

    this.panelEl.appendChild(header);
    this.panelEl.appendChild(body);
  }

  _renderRoot(body) {
    const config = StorageService.getApiConfig();
    const items = [
      { icon: 'fa-key', label: 'API & Model', section: 'api', badge: config.apiKey ? null : 'Not set' },
      { icon: 'fa-palette', label: 'Appearance', section: 'appearance' },
      { icon: 'fa-volume-high', label: 'Sound', section: 'sound' },
      { icon: 'fa-brain', label: 'Memories', section: 'memory' },
      { icon: 'fa-shield-halved', label: 'Data & Privacy', section: 'data' },
      { icon: 'fa-circle-info', label: 'About MonerAlo', section: 'about' },
    ];
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'settings-nav-item';
      btn.innerHTML = `
        <i class="fa-solid ${item.icon}"></i>
        <span></span>
        ${item.badge ? `<span class="key-status key-status--invalid" style="margin-left:auto"></span>` : '<i class="fa-solid fa-chevron-right chevron"></i>'}
      `;
      btn.querySelector('span:not(.key-status)').textContent = item.label;
      if (item.badge) btn.querySelector('.key-status').textContent = item.badge;
      btn.addEventListener('click', () => this._navigate(item.section));
      body.appendChild(btn);
    });
  }

  _renderApiSection(body) {
    const config = StorageService.getApiConfig();

    const section = document.createElement('div');
    section.className = 'settings-section';

    // API key field
    const keyField = document.createElement('div');
    keyField.className = 'form-field';
    keyField.innerHTML = `
      <label for="api-key-input">OpenRouter API key</label>
      <div class="input-with-btn">
        <input type="password" id="api-key-input" placeholder="sk-or-v1-..." autocomplete="off" />
        <button class="icon-btn" id="toggle-key-visibility" type="button" aria-label="Show/hide key"><i class="fa-solid fa-eye"></i></button>
      </div>
      <p class="form-field__hint">
        Stored only in this browser's local storage. Requests go directly from your browser to OpenRouter — never through any MonerAlo server (there isn't one).
        Get a key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>.
      </p>
      <div id="key-status-row" style="margin-top:10px;"></div>
    `;
    const keyInput = keyField.querySelector('#api-key-input');
    keyInput.value = config.apiKey || '';
    keyField.querySelector('#toggle-key-visibility').addEventListener('click', (e) => {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
      e.currentTarget.querySelector('i').className = keyInput.type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    const statusRow = keyField.querySelector('#key-status-row');
    const renderStatus = (status, message) => {
      const map = {
        valid: ['key-status--valid', '✓ Verified'],
        invalid: ['key-status--invalid', '✕ Invalid'],
        testing: ['key-status--testing', 'Testing…'],
        unknown: ['key-status--unknown', 'Not verified yet'],
      };
      const [cls, label] = map[status] || map.unknown;
      statusRow.innerHTML = `<span class="key-status ${cls}"></span>`;
      statusRow.querySelector('span').textContent = message || label;
    };
    renderStatus(config.keyStatus || 'unknown');

    // Model select
    const modelField = document.createElement('div');
    modelField.className = 'form-field';
    modelField.innerHTML = `
      <label for="model-select">Model</label>
      <select id="model-select"></select>
      <div id="custom-model-wrap" style="margin-top:10px; display:none;">
        <input type="text" id="custom-model-input" placeholder="e.g. provider/model-name" />
      </div>
    `;
    const select = modelField.querySelector('#model-select');
    RECOMMENDED_MODELS.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      select.appendChild(opt);
    });
    const isKnownModel = RECOMMENDED_MODELS.some((m) => m.id === config.model);
    select.value = isKnownModel ? config.model : 'custom';
    const customWrap = modelField.querySelector('#custom-model-wrap');
    const customInput = modelField.querySelector('#custom-model-input');
    if (!isKnownModel) {
      customWrap.style.display = 'block';
      customInput.value = config.model || '';
    }
    select.addEventListener('change', () => {
      customWrap.style.display = select.value === 'custom' ? 'block' : 'none';
    });

    // Endpoint field
    const endpointField = document.createElement('div');
    endpointField.className = 'form-field';
    endpointField.innerHTML = `
      <label for="endpoint-input">OpenRouter endpoint</label>
      <input type="text" id="endpoint-input" />
      <p class="form-field__hint">Advanced — only change this if you know what you're doing.</p>
    `;
    endpointField.querySelector('#endpoint-input').value = config.endpoint || 'https://openrouter.ai/api/v1/chat/completions';

    // Temperature + max tokens
    const paramsRow = document.createElement('div');
    paramsRow.className = 'form-field__row';
    paramsRow.innerHTML = `
      <div class="form-field">
        <label for="temp-input">Temperature</label>
        <input type="number" id="temp-input" min="0" max="2" step="0.1" />
      </div>
      <div class="form-field">
        <label for="tokens-input">Max tokens</label>
        <input type="number" id="tokens-input" min="50" max="4000" step="10" />
      </div>
    `;
    paramsRow.querySelector('#temp-input').value = config.temperature;
    paramsRow.querySelector('#tokens-input').value = config.maxTokens;

    // Action buttons
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.marginTop = '20px';
    actions.innerHTML = `
      <button class="btn btn--primary btn--block" id="save-api-btn">Save</button>
      <button class="btn btn--ghost" id="test-api-btn" title="Test key">Test</button>
      <button class="btn btn--danger" id="remove-api-btn" title="Remove key"><i class="fa-solid fa-trash"></i></button>
    `;

    const collectConfig = () => ({
      apiKey: keyInput.value.trim(),
      model: select.value === 'custom' ? customInput.value.trim() : select.value,
      endpoint: endpointField.querySelector('#endpoint-input').value.trim() || 'https://openrouter.ai/api/v1/chat/completions',
      temperature: parseFloat(paramsRow.querySelector('#temp-input').value) || 0.9,
      maxTokens: parseInt(paramsRow.querySelector('#tokens-input').value, 10) || 700,
    });

    actions.querySelector('#save-api-btn').addEventListener('click', () => {
      const next = collectConfig();
      if (!next.model) {
        showToast('Please choose or enter a model.', 'error');
        return;
      }
      const existing = StorageService.getApiConfig();
      StorageService.saveApiConfig({ ...existing, ...next, keyStatus: existing.apiKey === next.apiKey ? existing.keyStatus : 'unknown' });
      showToast('Settings saved.', 'success');
      this._renderApiSection(body._parentRerenderTarget || body); // no-op fallback
      this._navigate('api');
    });

    actions.querySelector('#test-api-btn').addEventListener('click', async () => {
      const next = collectConfig();
      if (!looksLikeApiKey(next.apiKey)) {
        showToast('Enter an API key first.', 'error');
        return;
      }
      renderStatus('testing');
      const btn = actions.querySelector('#test-api-btn');
      btn.disabled = true;
      const result = await OpenRouterService.testApiKey(next);
      btn.disabled = false;
      const existing = StorageService.getApiConfig();
      const updated = { ...existing, ...next, keyStatus: result.ok ? 'valid' : 'invalid' };
      StorageService.saveApiConfig(updated);
      renderStatus(result.ok ? 'valid' : 'invalid', result.message);
      showToast(result.message, result.ok ? 'success' : 'error');
    });

    actions.querySelector('#remove-api-btn').addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Remove API key?',
        body: 'This deletes your saved OpenRouter API key from this browser. You can add it again anytime.',
        confirmLabel: 'Remove',
        danger: true,
      });
      if (confirmed) {
        StorageService.clearApiKey();
        showToast('API key removed.', 'success');
        this._navigate('api');
      }
    });

    section.appendChild(keyField);
    section.appendChild(modelField);
    section.appendChild(endpointField);
    section.appendChild(paramsRow);
    section.appendChild(actions);
    body.appendChild(section);
  }

  _renderAppearanceSection(body) {
    const settings = StorageService.getSettings();
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section__title">Theme</div>
      <div class="theme-picker">
        <button class="theme-picker__opt" data-theme="light"><i class="fa-solid fa-sun"></i>Light</button>
        <button class="theme-picker__opt" data-theme="dark"><i class="fa-solid fa-moon"></i>Dark</button>
        <button class="theme-picker__opt" data-theme="system"><i class="fa-solid fa-circle-half-stroke"></i>System</button>
      </div>
      <div class="settings-section__title">Your display name</div>
      <div class="form-field">
        <input type="text" id="display-name-input" placeholder="What should Mrittika call you?" maxlength="30" />
        <p class="form-field__hint">Optional — used so Mrittika can address you naturally.</p>
      </div>
    `;
    section.querySelectorAll('.theme-picker__opt').forEach((btn) => {
      if (btn.dataset.theme === (settings.theme || 'system')) btn.classList.add('active');
      btn.addEventListener('click', () => {
        ThemeService.setTheme(btn.dataset.theme);
        this._navigate('appearance');
      });
    });
    const nameInput = section.querySelector('#display-name-input');
    nameInput.value = settings.userDisplayName || '';
    nameInput.addEventListener('change', () => {
      const s = StorageService.getSettings();
      s.userDisplayName = nameInput.value.trim().slice(0, 30);
      StorageService.saveSettings(s);
      showToast('Saved.', 'success');
    });
    body.appendChild(section);
  }

  _renderSoundSection(body) {
    const settings = StorageService.getSettings();
    const section = document.createElement('div');
    section.className = 'settings-section';

    const toggleRow = document.createElement('div');
    toggleRow.className = 'toggle-row';
    toggleRow.innerHTML = `
      <div>
        <div class="toggle-row__label">Message sounds</div>
        <div class="toggle-row__desc">Play a subtle sound when sending or receiving messages.</div>
      </div>
      <label class="toggle">
        <input type="checkbox" id="sound-toggle" />
        <span class="toggle-track"></span>
      </label>
    `;
    const checkbox = toggleRow.querySelector('#sound-toggle');
    checkbox.checked = !!settings.sound?.enabled;
    checkbox.addEventListener('change', () => {
      const s = StorageService.getSettings();
      s.sound.enabled = checkbox.checked;
      StorageService.saveSettings(s);
    });

    const volumeRow = document.createElement('div');
    volumeRow.className = 'range-row';
    volumeRow.innerHTML = `
      <label for="volume-range" style="font-size:var(--fs-sm); font-weight:500;">Volume</label>
      <input type="range" id="volume-range" min="0" max="1" step="0.05" />
    `;
    const range = volumeRow.querySelector('#volume-range');
    range.value = settings.sound?.volume ?? 0.5;
    range.addEventListener('input', () => {
      const s = StorageService.getSettings();
      s.sound.volume = parseFloat(range.value);
      StorageService.saveSettings(s);
    });

    section.appendChild(toggleRow);
    section.appendChild(volumeRow);
    body.appendChild(section);
  }

  _renderMemorySection(body) {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const intro = document.createElement('p');
    intro.className = 'form-field__hint';
    intro.style.marginBottom = '12px';
    intro.textContent = 'MonerAlo remembers a few small, harmless details you share (like your preferred name or things you like) to make chats feel more natural. Everything stays on this device.';
    section.appendChild(intro);

    const memories = MemoryService.getAll();
    if (memories.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.padding = '32px 0';
      empty.innerHTML = `<i class="fa-solid fa-brain"></i><h3>No memories yet</h3><p>As you chat, small details Mrittika picks up on will appear here.</p>`;
      section.appendChild(empty);
    } else {
      const card = document.createElement('div');
      card.className = 'settings-section__card';
      [...memories].reverse().forEach((mem) => {
        const item = document.createElement('div');
        item.className = 'memory-item';
        item.innerHTML = `
          <div class="memory-item__text">
            <div class="memory-item__label"></div>
            <div></div>
          </div>
          <button class="icon-btn memory-item__del" aria-label="Delete memory"><i class="fa-solid fa-trash"></i></button>
        `;
        item.querySelector('.memory-item__label').textContent = mem.label;
        item.querySelector('.memory-item__text div:last-child').textContent = mem.value;
        item.querySelector('.memory-item__del').addEventListener('click', async () => {
          MemoryService.remove(mem.id);
          this._navigate('memory');
        });
        card.appendChild(item);
      });
      section.appendChild(card);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn--danger btn--block';
      clearBtn.style.marginTop = '16px';
      clearBtn.textContent = 'Clear all memories';
      clearBtn.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Clear all memories?',
          body: 'This removes everything MonerAlo has remembered about you. This cannot be undone.',
          confirmLabel: 'Clear all',
          danger: true,
        });
        if (confirmed) {
          MemoryService.clear();
          showToast('Memories cleared.', 'success');
          this._navigate('memory');
        }
      });
      section.appendChild(clearBtn);
    }

    body.appendChild(section);
  }

  _renderDataSection(body) {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const usage = (StorageService.estimateUsageBytes() / 1024).toFixed(1);

    const info = document.createElement('div');
    info.className = 'settings-section__card';
    info.style.marginBottom = '20px';
    info.innerHTML = `
      <p style="font-size:var(--fs-sm); color:var(--text-secondary); line-height:1.6;">
        MonerAlo stores everything — chats, memories, settings, and your API key — only in this browser's local storage.
        Nothing is sent to any MonerAlo server (there isn't one). Messages you send are transmitted directly to OpenRouter
        to generate replies, per OpenRouter's own privacy practices.
      </p>
      <p style="font-size:var(--fs-xs); color:var(--text-muted); margin-top:10px;">Approximate local storage used: ${usage} KB</p>
    `;
    section.appendChild(info);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn--ghost btn--block';
    exportBtn.style.marginBottom = '10px';
    exportBtn.innerHTML = '<i class="fa-solid fa-file-export"></i> Export all chats (JSON)';
    exportBtn.addEventListener('click', () => {
      const conversations = StorageService.getConversations();
      const data = conversations.map((c) => ({ conversation: c, messages: StorageService.getMessages(c.id) }));
      downloadTextFile('moneralo-export.json', JSON.stringify(data, null, 2), 'application/json');
      showToast('Exported.', 'success');
    });
    section.appendChild(exportBtn);

    const dangerZone = document.createElement('div');
    dangerZone.className = 'settings-danger-zone';
    dangerZone.style.marginTop = '24px';
    dangerZone.innerHTML = `<div class="settings-section__title" style="margin-top:0;">Danger zone</div>`;

    const clearChatsBtn = document.createElement('button');
    clearChatsBtn.className = 'btn btn--danger btn--block';
    clearChatsBtn.style.marginBottom = '10px';
    clearChatsBtn.textContent = 'Clear all chats';
    clearChatsBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Clear all chats?',
        body: 'This deletes every conversation and message. Your API key and settings will be kept. This cannot be undone.',
        confirmLabel: 'Clear all chats',
        danger: true,
      });
      if (confirmed) {
        StorageService.clearAllConversations();
        showToast('All chats cleared.', 'success');
        this.onAllChatsCleared();
        this._navigate('data');
      }
    });

    const wipeBtn = document.createElement('button');
    wipeBtn.className = 'btn btn--danger btn--block';
    wipeBtn.textContent = 'Erase all MonerAlo data';
    wipeBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Erase everything?',
        body: 'This permanently deletes all chats, memories, settings, and your API key from this browser. This cannot be undone.',
        confirmLabel: 'Erase everything',
        danger: true,
      });
      if (confirmed) {
        StorageService.clearAllData();
        showToast('All data erased.', 'success');
        this.close();
        this.onDataWiped();
      }
    });

    dangerZone.appendChild(clearChatsBtn);
    dangerZone.appendChild(wipeBtn);
    section.appendChild(dangerZone);

    body.appendChild(section);
  }

  _renderAboutSection(body) {
    const section = document.createElement('div');
    section.innerHTML = `
      <div class="about-logo">
        <img src="icons/icon-192.png" alt="MonerAlo" />
        <h3>MonerAlo</h3>
        <p>Version 1.0.0</p>
      </div>
      <div class="settings-section__card" style="font-size:var(--fs-sm); line-height:1.7; color:var(--text-secondary);">
        <p style="margin-bottom:10px;"><strong style="color:var(--text-primary);">MonerAlo</strong> ("light of the heart/mind") is a private, local-first companion chat app. You chat with Mrittika, an AI persona — not a real person.</p>
        <p style="margin-bottom:10px;">All your data lives in this browser only. You bring your own OpenRouter API key, and messages are sent directly from your device to OpenRouter to generate replies.</p>
        <p>MonerAlo has no accounts, no analytics, no ads, and no server of its own.</p>
      </div>
    `;
    body.appendChild(section);
  }
}
