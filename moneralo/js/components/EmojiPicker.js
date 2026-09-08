/**
 * @file EmojiPicker.js
 * Native Unicode emoji picker with category tabs. Works on mobile and
 * desktop via simple tap/click targets (no external emoji font/images).
 */

import { EMOJI_CATEGORIES } from '../utils/emojiData.js';

export class EmojiPicker {
  /**
   * @param {HTMLElement} container
   * @param {(emoji: string) => void} onSelect
   */
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.activeCategory = EMOJI_CATEGORIES[0].id;
    this._render();
  }

  _render() {
    this.container.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'emoji-picker__tabs';
    EMOJI_CATEGORIES.forEach((cat) => {
      const tab = document.createElement('button');
      tab.className = 'emoji-picker__tab' + (cat.id === this.activeCategory ? ' active' : '');
      tab.type = 'button';
      tab.textContent = cat.label;
      tab.setAttribute('aria-label', cat.name);
      tab.addEventListener('click', () => {
        this.activeCategory = cat.id;
        this._render();
      });
      tabs.appendChild(tab);
    });

    const grid = document.createElement('div');
    grid.className = 'emoji-picker__grid';
    const category = EMOJI_CATEGORIES.find((c) => c.id === this.activeCategory) || EMOJI_CATEGORIES[0];
    category.emojis.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = emoji;
      btn.setAttribute('aria-label', `Insert ${emoji}`);
      btn.addEventListener('click', () => this.onSelect(emoji));
      grid.appendChild(btn);
    });

    this.container.appendChild(tabs);
    this.container.appendChild(grid);
  }

  show() {
    this.container.hidden = false;
  }

  hide() {
    this.container.hidden = true;
  }

  toggle() {
    this.container.hidden = !this.container.hidden;
  }

  isVisible() {
    return !this.container.hidden;
  }
}
