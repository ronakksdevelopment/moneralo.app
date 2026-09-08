/**
 * @file ChatList.js
 * Renders the conversation list (sidebar on desktop, full screen on mobile).
 */

import { StorageService } from '../services/StorageService.js';
import { formatListTime, truncate, debounce } from '../utils/helpers.js';

export class ChatList {
  /**
   * @param {{
   *   listEl: HTMLElement,
   *   searchInputEl: HTMLInputElement,
   *   onSelect: (conversationId: string) => void,
   * }} opts
   */
  constructor({ listEl, searchInputEl, onSelect }) {
    this.listEl = listEl;
    this.searchInputEl = searchInputEl;
    this.onSelect = onSelect;
    this.activeId = null;
    this.searchQuery = '';

    this.searchInputEl.addEventListener(
      'input',
      debounce((e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.render();
      }, 200)
    );
  }

  setActive(id) {
    this.activeId = id;
    this.render();
  }

  render() {
    const conversations = StorageService.getConversations().sort((a, b) => b.updatedAt - a.updatedAt);

    let filtered = conversations;
    let matchingMessageIds = null;

    if (this.searchQuery) {
      // Search conversation titles AND message content across all conversations.
      matchingMessageIds = new Set();
      filtered = conversations.filter((c) => {
        const titleMatch = c.title.toLowerCase().includes(this.searchQuery);
        const messages = StorageService.getMessages(c.id);
        const messageMatch = messages.some((m) => m.content.toLowerCase().includes(this.searchQuery));
        if (messageMatch) matchingMessageIds.add(c.id);
        return titleMatch || messageMatch;
      });
    }

    this.listEl.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <i class="fa-regular fa-comments"></i>
        <h3>${this.searchQuery ? 'No results' : 'No chats yet'}</h3>
        <p>${this.searchQuery ? 'Try a different search term.' : 'Start a new conversation with Mrittika using the button below.'}</p>
      `;
      this.listEl.appendChild(empty);
      return;
    }

    filtered.forEach((convo) => {
      const item = document.createElement('div');
      item.className = 'chat-item' + (convo.id === this.activeId ? ' active' : '');
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');

      const preview = convo.lastMessagePreview
        ? truncate(convo.lastMessagePreview, 46)
        : 'Say hi to start the conversation…';

      item.innerHTML = `
        <img class="chat-item__avatar" src="assets/mrittika.png" alt="" />
        <div class="chat-item__body">
          <div class="chat-item__top">
            <span class="chat-item__name"></span>
            <span class="chat-item__time">${convo.updatedAt ? formatListTime(convo.updatedAt) : ''}</span>
          </div>
          <div class="chat-item__preview"></div>
        </div>
      `;
      item.querySelector('.chat-item__name').textContent = convo.title;
      item.querySelector('.chat-item__preview').textContent = preview;

      const activate = () => this.onSelect(convo.id);
      item.addEventListener('click', activate);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });

      this.listEl.appendChild(item);
    });
  }
}
