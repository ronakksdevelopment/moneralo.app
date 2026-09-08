/**
 * @file ChatWindow.js
 * Owns rendering of the active conversation's messages, the composer,
 * typing indicator, and orchestrates sending messages through
 * PromptBuilder + OpenRouterService, with defensive error handling.
 */

import { StorageService } from '../services/StorageService.js';
import { OpenRouterService } from '../services/OpenRouterService.js';
import { PromptBuilder } from '../services/PromptBuilder.js';
import { MemoryService } from '../services/MemoryService.js';
import { SoundManager } from '../services/SoundManager.js';
import { renderMessageBubble } from './MessageBubble.js';
import { uuid, formatDateSeparator, sanitizeText } from '../utils/helpers.js';
import { showToast } from '../utils/toast.js';

export class ChatWindow {
  /**
   * @param {{
   *   messagesListEl: HTMLElement,
   *   messagesContainerEl: HTMLElement,
   *   typingRowEl: HTMLElement,
   *   scrollBtnEl: HTMLElement,
   *   nameEl: HTMLElement,
   *   statusEl: HTMLElement,
   *   onConversationUpdated: () => void,
   * }} opts
   */
  constructor({ messagesListEl, messagesContainerEl, typingRowEl, scrollBtnEl, nameEl, statusEl, onConversationUpdated }) {
    this.messagesListEl = messagesListEl;
    this.messagesContainerEl = messagesContainerEl;
    this.typingRowEl = typingRowEl;
    this.scrollBtnEl = scrollBtnEl;
    this.nameEl = nameEl;
    this.statusEl = statusEl;
    this.onConversationUpdated = onConversationUpdated;

    this.conversationId = null;
    this.isSending = false;

    this.messagesContainerEl.addEventListener('scroll', () => this._handleScroll());
    this.scrollBtnEl.addEventListener('click', () => this._scrollToBottom(true));
  }

  loadConversation(conversationId) {
    this.conversationId = conversationId;
    this.render();
    this._scrollToBottom(false);
  }

  getConversationId() {
    return this.conversationId;
  }

  render() {
    if (!this.conversationId) return;
    const messages = StorageService.getMessages(this.conversationId);
    this.messagesListEl.innerHTML = '';

    let lastDateLabel = null;
    messages.forEach((msg) => {
      const dateLabel = formatDateSeparator(msg.timestamp);
      if (dateLabel !== lastDateLabel) {
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = '<span></span>';
        sep.querySelector('span').textContent = dateLabel;
        this.messagesListEl.appendChild(sep);
        lastDateLabel = dateLabel;
      }
      const bubble = renderMessageBubble(msg, { onRetry: (id) => this._retryMessage(id) });
      this.messagesListEl.appendChild(bubble);
    });

    if (messages.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.padding = '48px 24px';
      empty.innerHTML = `
        <i class="fa-regular fa-heart"></i>
        <h3>Say hi to Mrittika</h3>
        <p>Send your first message below to start chatting.</p>
      `;
      this.messagesListEl.appendChild(empty);
    }
  }

  _handleScroll() {
    const el = this.messagesContainerEl;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.scrollBtnEl.hidden = distanceFromBottom < 200;
  }

  _scrollToBottom(smooth) {
    this.messagesContainerEl.scrollTo({
      top: this.messagesContainerEl.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    this.scrollBtnEl.hidden = true;
  }

  _setTyping(visible) {
    this.typingRowEl.hidden = !visible;
    if (visible) this._scrollToBottom(true);
  }

  _setOnlineStatus(sending) {
    this.statusEl.textContent = sending ? 'typing…' : 'online';
  }

  /**
   * Send a user message: persist it, build prompt, call OpenRouter,
   * persist assistant reply (or error state).
   * @param {string} rawText
   */
  async sendMessage(rawText) {
    if (!this.conversationId || this.isSending) return;
    const text = sanitizeText(rawText);
    if (!text) return;

    this.isSending = true;

    const userMessage = {
      id: uuid(),
      conversationId: this.conversationId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sent',
    };
    StorageService.addMessage(this.conversationId, userMessage);
    MemoryService.scanMessage(text);
    this._maybeAutoTitle(text);
    this.render();
    this._scrollToBottom(true);
    SoundManager.playOutgoing();
    this.onConversationUpdated();

    await this._requestAssistantReply();

    this.isSending = false;
  }

  async _requestAssistantReply() {
    this._setTyping(true);
    this._setOnlineStatus(true);

    const history = StorageService.getMessages(this.conversationId);
    const settings = StorageService.getSettings();
    const messages = PromptBuilder.build({ conversationHistory: history, settings });

    const result = await OpenRouterService.sendChat({ messages });

    this._setTyping(false);
    this._setOnlineStatus(false);

    if (result.ok) {
      const assistantMessage = {
        id: uuid(),
        conversationId: this.conversationId,
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        status: 'delivered',
      };
      StorageService.addMessage(this.conversationId, assistantMessage);
      SoundManager.playIncoming();
    } else {
      if (result.code !== 'CANCELLED') {
        SoundManager.playError();
        showToast(result.message, 'error');
      }
      // Mark the most recent user message as failed so the user can retry,
      // unless it was simply a manual cancellation.
      if (result.code !== 'CANCELLED') {
        const msgs = StorageService.getMessages(this.conversationId);
        const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
        if (lastUser) {
          StorageService.updateMessage(this.conversationId, lastUser.id, {
            status: 'failed',
            failed: true,
            errorMessage: result.message,
          });
        }
      }
    }

    this.render();
    this._scrollToBottom(true);
    this.onConversationUpdated();
  }

  /** Retry sending after a failure: clears the failed flag and re-requests. */
  async _retryMessage(messageId) {
    if (this.isSending) return;
    const msgs = StorageService.getMessages(this.conversationId);
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return;

    this.isSending = true;
    StorageService.updateMessage(this.conversationId, messageId, {
      status: 'sent',
      failed: false,
      errorMessage: '',
    });
    this.render();
    await this._requestAssistantReply();
    this.isSending = false;
  }

  /** Auto-title a "New chat" conversation based on the first user message. */
  _maybeAutoTitle(firstText) {
    const convo = StorageService.getConversations().find((c) => c.id === this.conversationId);
    if (!convo) return;
    const messages = StorageService.getMessages(this.conversationId);
    const userMessageCount = messages.filter((m) => m.role === 'user').length;
    if ((convo.title === 'New chat' || !convo.title) && userMessageCount <= 1) {
      const title = firstText.length > 30 ? firstText.slice(0, 30).trim() + '…' : firstText;
      StorageService.updateConversation(this.conversationId, { title: title || 'Chat with Mrittika' });
    }
  }

  cancelActive() {
    OpenRouterService.cancelActive();
  }
}
