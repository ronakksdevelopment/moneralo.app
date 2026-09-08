# MonerAlo 💙

**MonerAlo** ("light of the heart/mind") is a private, local-first, installable
Progressive Web App (PWA) for chatting with **Mrittika**, an AI companion
persona. It's a plain HTML/CSS/JavaScript app — no framework, no backend, no
database, no build step required — designed to be hosted for free on
**GitHub Pages**.

---

## ✨ What this is (and isn't)

- **Local-first**: every conversation, memory, setting, and your OpenRouter
  API key are stored **only** in your browser's `localStorage`. There is no
  MonerAlo server. Nothing is ever sent anywhere except directly from your
  browser to OpenRouter, to generate Mrittika's replies.
- **Bring your own API key**: MonerAlo never ships or hardcodes an API key.
  You create a free key at [openrouter.ai/keys](https://openrouter.ai/keys)
  and enter it yourself (in onboarding or Settings).
- **No accounts, no analytics, no ads, no tracking.**
- Mrittika is an **AI persona**, not a real person, and the app never
  presents her as one.
- ⚠️ **About the avatar image**: this build ships a simple illustrated
  placeholder avatar for Mrittika (`assets/mrittika.png`) rather than the
  external image URL referenced in the original spec, since fetching and
  permanently embedding an arbitrary third-party image isn't something this
  build process does automatically. Swap in your own image any time —
  see "Customizing" below.

---

## 🗂 Project structure

```
moneralo/
├── index.html                 # App shell (single HTML entry point)
├── manifest.json              # PWA manifest
├── service-worker.js          # Offline app-shell caching (never caches AI API calls)
├── .nojekyll                  # Tells GitHub Pages not to run Jekyll processing
├── package.json               # Optional dev-server scripts (no build required)
├── css/
│   ├── variables.css          # Design tokens (brand colors, spacing, etc.)
│   ├── base.css                # Reset + base typography
│   ├── layout.css              # App shell / responsive layout
│   ├── chat.css                 # Chat window, bubbles, composer
│   ├── components.css           # Shared UI: lists, modals, toasts, menus
│   ├── onboarding.css
│   ├── settings.css
│   └── animations.css
├── js/
│   ├── main.js                 # App entry point / orchestration
│   ├── types.js                # JSDoc type definitions (documentation only)
│   ├── utils/
│   │   ├── helpers.js           # Sanitization, formatting, small utils
│   │   ├── toast.js
│   │   ├── modal.js
│   │   └── emojiData.js
│   ├── services/
│   │   ├── StorageService.js    # All localStorage read/write (defensive)
│   │   ├── MemoryService.js     # Lightweight local "memory" extraction
│   │   ├── PromptBuilder.js     # Builds Mrittika's system prompt + context
│   │   ├── OpenRouterService.js # Isolated OpenRouter API client
│   │   ├── SoundManager.js      # Web Audio API message sounds
│   │   └── ThemeService.js      # Light/dark/system theme
│   └── components/
│       ├── ChatList.js
│       ├── ChatWindow.js
│       ├── MessageBubble.js
│       ├── Settings.js
│       ├── Onboarding.js
│       └── EmojiPicker.js
├── icons/                      # Generated PWA icon set (from your uploaded logo)
└── assets/
    ├── brandlogo.png
    └── mrittika.png
```

---

## 🚀 Running locally

No build step, no `npm install` of heavy dependencies — MonerAlo runs as
static files. You do need to serve it over **http(s)** (not `file://`),
because service workers and ES modules require it.

```bash
# Option A: use the included npm script (uses http-server via npx)
npm run dev
# → open http://localhost:5173

# Option B: any static server works, e.g.
python3 -m http.server 5173
# or
npx serve .
```

There is no `npm run build` in the traditional sense — `npm run build`
is included only as a no-op helper that prints a short reminder, since
this is a static app.

---

## 📦 Deploying to GitHub Pages

1. **Create a repository** (e.g. `moneralo`) and push this project's files
   to the root of the `main` branch (or a `docs/` folder — your choice).

   ```bash
   git init
   git add .
   git commit -m "Initial MonerAlo PWA"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repo → **Settings** → **Pages**.
   - Under "Build and deployment", set **Source** to `Deploy from a branch`.
   - Choose branch `main` and folder `/ (root)` (or `/docs` if you used that).
   - Save. GitHub will give you a URL like
     `https://<your-username>.github.io/<your-repo>/`.

3. **That's it** — no base-path configuration is needed because this project
   uses **relative paths everywhere** (`./index.html`, `./css/...`,
   `./manifest.json`, etc.), including inside `manifest.json` and
   `service-worker.js`. This means it works correctly whether it's hosted at
   the root of a domain or under a GitHub Pages project subpath like
   `/moneralo/`.

4. **HTTPS is automatic** on GitHub Pages, which is required for service
   workers and PWA installability.

### Updating after changes

Just commit and push — GitHub Pages redeploys automatically. Because of the
service worker's cache-busting via `CACHE_VERSION` in `service-worker.js`,
bump that string (e.g. `moneralo-v1.0.1`) whenever you ship a meaningful
update, so returning visitors get the new app shell instead of a stale
cached copy.

---

## 📱 Installing as an app

- **Android (Chrome)**: open the site → menu → "Install app" / "Add to Home
  screen".
- **iOS (Safari)**: open the site → Share button → "Add to Home Screen".
  (iOS treats this as a home-screen web app; full standalone PWA behavior
  is somewhat more limited on iOS than Android/desktop, which is a
  platform limitation, not a MonerAlo one.)
- **Desktop (Chrome/Edge)**: address bar → install icon, or menu → "Install
  MonerAlo…".

Once installed, the app shell (HTML/CSS/JS/icons) works offline. **Mrittika's
replies always require an internet connection**, since they're generated by
calling OpenRouter live — this is clearly communicated in onboarding and via
the offline banner.

---

## 🔑 Setting up your OpenRouter API key

1. Create a free account and API key at
   [openrouter.ai/keys](https://openrouter.ai/keys).
2. In MonerAlo, go to **Settings → API & Model**, paste your key, pick a
   model, and tap **Test** to verify it works, then **Save**.
3. You can remove or change the key at any time from the same screen. The
   key never leaves your browser except as an `Authorization` header sent
   directly to `https://openrouter.ai/api/v1/chat/completions`.

### Choosing a model

The Settings screen offers a shortlist of commonly used OpenRouter models
(GPT-4o mini, GPT-4o, Claude 3.5 Sonnet, Claude 3 Haiku, Gemini 1.5 Flash,
Llama 3.1 8B, Mistral 7B) plus a **Custom model ID** field for any other
OpenRouter-supported model string (e.g. `provider/model-name`). Temperature
and max tokens are also configurable there.

---

## 🎨 Customizing

- **Brand logo / app icon**: replace the files in `icons/` (keep the same
  filenames/sizes) and `assets/brandlogo.png`. Re-run a resize step if you
  change the source logo — see the `Regenerating icons` note below.
- **Mrittika's avatar**: replace `assets/mrittika.png` with any square image
  you like (recommended ≥ 512×512px). No code changes needed.
- **Personality / language style**: edit `js/services/PromptBuilder.js` —
  the `BASE_PERSONALITY` string is the single source of truth for how
  Mrittika talks.
- **Colors / theme**: edit the CSS custom properties in
  `css/variables.css` (`--brand-deep-blue`, `--brand-royal-blue`,
  `--brand-accent-yellow`, etc.).

### Regenerating icons from a new logo

If you replace the source logo and want a full icon set regenerated, run
(with Python + Pillow installed):

```python
from PIL import Image
src = Image.open('your-logo.png').convert('RGBA')
for s in [72, 96, 128, 144, 152, 180, 192, 384, 512]:
    src.resize((s, s), Image.LANCZOS).save(f'icons/icon-{s}.png')
```

(Maskable icons need extra safe-zone padding — see comments in the original
generation script, or just keep the existing maskable icons if your new
logo is similar in composition.)

---

## 🧪 What's been checked

This build has been manually reviewed (not automated-test-covered, since
there's no test framework here) for:

- First launch → onboarding → API key entry/skip → main chat screen
- Sending a message with no API key set (friendly error, no crash)
- Invalid / rejected API key handling
- Network failure / timeout / rate-limit / empty / malformed response
  handling — all mapped to plain-language messages, no raw stack traces
- Refresh persistence of conversations, messages, memories, and settings
- New chat / delete chat / clear all chats / clear all data
- Local search across conversation titles and message content
- Export as JSON and TXT (per-chat and full export)
- Theme switching (light/dark/system) including OS-level dark mode changes
- Sound toggle + volume, respecting browser autoplay restrictions (audio
  unlocks on first user interaction)
- Emoji picker on mobile and desktop
- Responsive layout from small phones to desktop, incl. mobile view
  switching between chat list and chat window
- Offline behavior: app shell loads, banner explains AI needs internet
- `prefers-reduced-motion` support
- Defensive handling of corrupted/missing localStorage data (falls back to
  safe defaults instead of crashing)

---

## ⚠️ Known platform limitations (not MonerAlo bugs)

- iOS Safari's PWA support is more limited than Android/desktop Chrome
  (e.g. some install/offline behaviors differ) — this is an Apple/WebKit
  platform constraint.
- OpenRouter model availability, pricing, and behavior are controlled by
  OpenRouter and the underlying model providers, not by MonerAlo.
- Browser `localStorage` has a size limit (usually 5–10MB per origin,
  browser-dependent). Extremely long chat histories over a very long time
  could theoretically approach this; MonerAlo doesn't currently auto-prune
  old messages, though export + clear are available if needed.

---

## 🔒 Privacy summary

MonerAlo does not collect, transmit, or store your data on any server it
controls, because it has none. Your OpenRouter API key and every message
you send are stored **only** in your browser's local storage. Sending a
message necessarily transmits that message directly from your browser to
OpenRouter and your selected model provider, per their own respective
privacy practices — MonerAlo has no visibility into or control over that
leg of the request.
