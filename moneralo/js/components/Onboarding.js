/**
 * @file Onboarding.js
 * First-launch onboarding flow. Explains local-first design, that the
 * user brings their own OpenRouter API key, and that messages sent to
 * the AI necessarily leave the device to reach the model provider.
 */

import { StorageService } from '../services/StorageService.js';
import { OpenRouterService } from '../services/OpenRouterService.js';
import { showToast } from '../utils/toast.js';
import { looksLikeApiKey } from '../utils/helpers.js';

const STEPS = ['welcome', 'howItWorks', 'apiKey', 'name', 'ready'];

export class Onboarding {
  /**
   * @param {HTMLElement} rootEl
   * @param {() => void} onComplete
   */
  constructor(rootEl, onComplete) {
    this.rootEl = rootEl;
    this.onComplete = onComplete;
    this.stepIndex = 0;
    this.collectedApiKey = '';
    this.collectedName = '';
  }

  start() {
    this.rootEl.hidden = false;
    this._render();
  }

  _finish(skippedKey) {
    const config = StorageService.getApiConfig();
    if (this.collectedApiKey) {
      config.apiKey = this.collectedApiKey;
      config.keyStatus = 'unknown';
      StorageService.saveApiConfig(config);
    }
    const settings = StorageService.getSettings();
    settings.onboardingComplete = true;
    if (this.collectedName) settings.userDisplayName = this.collectedName;
    StorageService.saveSettings(settings);

    this.rootEl.hidden = true;
    this.onComplete();

    if (skippedKey) {
      showToast('You can add your OpenRouter API key anytime in Settings.', 'info', 4000);
    }
  }

  _progressHtml() {
    return `<div class="onboarding__progress">${STEPS.map((_, i) => `<span class="${i <= this.stepIndex ? 'done' : ''}"></span>`).join('')}</div>`;
  }

  _render() {
    const step = STEPS[this.stepIndex];
    this.rootEl.innerHTML = this._progressHtml();

    const stepEl = document.createElement('div');
    stepEl.className = 'onboarding__step';

    if (step === 'welcome') {
      stepEl.innerHTML = `
        <div class="onboarding__hero"><img src="assets/mrittika.png" alt="Mrittika" /></div>
        <h1 class="onboarding__title">Welcome to MonerAlo</h1>
        <p class="onboarding__text">Meet <strong>Mrittika</strong> — your private AI chat companion. Talk naturally in Bengali, Benglish, English, or a mix of all three.</p>
        <div class="onboarding__spacer"></div>
        <div class="onboarding__actions">
          <button class="btn btn--primary btn--block" id="next-btn">Get started</button>
        </div>
      `;
    } else if (step === 'howItWorks') {
      stepEl.innerHTML = `
        <img src="icons/icon-192.png" class="onboarding__icon" alt="" />
        <h1 class="onboarding__title">Local-first, always</h1>
        <ul class="onboarding__list">
          <li><i class="fa-solid fa-hard-drive"></i><span>All your conversations, memories, and settings stay on this device — in your browser's local storage.</span></li>
          <li><i class="fa-solid fa-key"></i><span>You bring your own OpenRouter API key. MonerAlo has no server and never sees your key or your messages.</span></li>
          <li><i class="fa-solid fa-user-shield"></i><span>No accounts, no analytics, no ads, no tracking.</span></li>
        </ul>
        <div class="onboarding__notice">
          <i class="fa-solid fa-circle-info"></i> To generate replies, your message text is sent directly from your browser to OpenRouter and the AI model you choose — that part necessarily leaves your device.
        </div>
        <div class="onboarding__spacer"></div>
        <div class="onboarding__actions">
          <button class="btn btn--primary btn--block" id="next-btn">Continue</button>
        </div>
      `;
    } else if (step === 'apiKey') {
      stepEl.innerHTML = `
        <h1 class="onboarding__title">Add your OpenRouter key</h1>
        <p class="onboarding__text">Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>, then paste it below. You can also skip this and add it later in Settings.</p>
        <div class="form-field">
          <label for="onboarding-key-input">API key</label>
          <input type="password" id="onboarding-key-input" placeholder="sk-or-v1-..." autocomplete="off" />
        </div>
        <div id="onboarding-key-feedback" style="font-size:var(--fs-xs); color:var(--text-muted); min-height:18px;"></div>
        <div class="onboarding__spacer"></div>
        <div class="onboarding__actions">
          <button class="btn btn--primary btn--block" id="next-btn">Save and continue</button>
          <button class="onboarding__skip" id="skip-btn">Skip for now</button>
        </div>
      `;
    } else if (step === 'name') {
      stepEl.innerHTML = `
        <h1 class="onboarding__title">What should Mrittika call you?</h1>
        <p class="onboarding__text">Totally optional — helps conversations feel a bit more natural.</p>
        <div class="form-field">
          <label for="onboarding-name-input">Your name</label>
          <input type="text" id="onboarding-name-input" placeholder="e.g. Rafi, Priya…" maxlength="30" />
        </div>
        <div class="onboarding__spacer"></div>
        <div class="onboarding__actions">
          <button class="btn btn--primary btn--block" id="next-btn">Continue</button>
          <button class="onboarding__skip" id="skip-btn">Skip</button>
        </div>
      `;
    } else if (step === 'ready') {
      stepEl.innerHTML = `
        <div class="onboarding__hero"><img src="assets/mrittika.png" alt="Mrittika" /></div>
        <h1 class="onboarding__title">All set!</h1>
        <p class="onboarding__text">Mrittika's ready to chat whenever you are. You can change your API key, model, theme, and sound anytime in Settings.</p>
        <div class="onboarding__spacer"></div>
        <div class="onboarding__actions">
          <button class="btn btn--primary btn--block" id="next-btn">Start chatting</button>
        </div>
      `;
    }

    this.rootEl.appendChild(stepEl);
    this._bindStepEvents(step);
  }

  _bindStepEvents(step) {
    const nextBtn = this.rootEl.querySelector('#next-btn');
    const skipBtn = this.rootEl.querySelector('#skip-btn');

    if (step === 'apiKey') {
      const input = this.rootEl.querySelector('#onboarding-key-input');
      const feedback = this.rootEl.querySelector('#onboarding-key-feedback');
      nextBtn.addEventListener('click', async () => {
        const value = input.value.trim();
        if (!value) {
          this._advance();
          return;
        }
        if (!looksLikeApiKey(value)) {
          feedback.textContent = "That doesn't look like a valid key, but you can continue and fix it later in Settings.";
          feedback.style.color = 'var(--status-danger)';
          this.collectedApiKey = value;
          this._advance();
          return;
        }
        nextBtn.disabled = true;
        feedback.textContent = 'Checking key…';
        feedback.style.color = 'var(--text-muted)';
        const result = await OpenRouterService.testApiKey({ apiKey: value, model: 'openai/gpt-4o-mini', endpoint: 'https://openrouter.ai/api/v1/chat/completions' });
        nextBtn.disabled = false;
        this.collectedApiKey = value;
        if (!result.ok) {
          feedback.textContent = result.message + ' You can continue anyway and fix it later.';
          feedback.style.color = 'var(--status-danger)';
        }
        this._advance();
      });
      if (skipBtn) skipBtn.addEventListener('click', () => this._advance(true));
      return;
    }

    if (step === 'name') {
      const input = this.rootEl.querySelector('#onboarding-name-input');
      nextBtn.addEventListener('click', () => {
        this.collectedName = input.value.trim().slice(0, 30);
        this._advance();
      });
      if (skipBtn) skipBtn.addEventListener('click', () => this._advance());
      return;
    }

    if (step === 'ready') {
      nextBtn.addEventListener('click', () => this._finish(!this.collectedApiKey));
      return;
    }

    nextBtn.addEventListener('click', () => this._advance());
  }

  _advance(skippedKey = false) {
    if (this.stepIndex < STEPS.length - 1) {
      this.stepIndex += 1;
      this._render();
    } else {
      this._finish(skippedKey);
    }
  }
}
