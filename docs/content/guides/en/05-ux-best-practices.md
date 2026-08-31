# 05. UX Best Practices & End-User Guidance

To ensure a seamless user experience without deterring end-users from installing the required userscript extension, follow these UX/UI best practices.

---

## 1. Clear & Trustworthy Communication

Average users may be hesitant when prompted to install a browser extension or userscript. The phrasing on your website makes all the difference:

### ❌ AVOID:
> *"You must install this third-party script or our website won't work."* → Triggers security concerns or makes the site look broken.

### ✅ RECOMMENDED:
> *"To enjoy seamless volume control, seeking, and background playback directly from our custom player toolbar, your browser uses the `SRemote` media bridge."*

---

## 2. Designing an Intuitive Fallback Banner

If `sremote.hello()` does not receive an `accept` event within a reasonable grace period (e.g., 3 seconds), display a subtle, non-intrusive banner:

```javascript
let isConnected = false;

window.sremote.on('accept', () => {
  isConnected = true;
  hideInstallBanner();
});

window.sremote.hello();

setTimeout(() => {
  if (!isConnected) {
    showInstallBanner();
  }
}, 3000);
```

### Keep onboarding to 3 concise steps:
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click **Install SRemote Userscript** (direct link to `.user.js`).
3. Reload the page and click **Allow** if prompted.

---

## 3. Preventing UI Flickering with Dynamic CSS (Anti-FOUC)

To hide native controls, watermarks, or intrusive headers inside the iframe:

```javascript
window.sremote.hello({
  css: `
    .native-controls, .watermark-logo, .ad-banner {
      display: none !important;
    }
  `
});
```

> [!TIP]
> CSS passed via `hello({ css: '...' })` is injected into `document.documentElement` at `document-start` before the DOM renders, preventing any Flash of Unstyled Content (FOUC).

---

## ⏭️ Next Step
Proceed to **[06. Troubleshooting](./06-troubleshooting.md)**.
