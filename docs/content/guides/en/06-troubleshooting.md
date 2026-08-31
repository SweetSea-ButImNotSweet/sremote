# 06. Troubleshooting

This guide summarizes common issues encountered during SRemote integration and provides concrete solutions.

---

## 1. Browser Autoplay Policy

### Symptom:
`sremote.play()` triggers `NotAllowedError: play() failed because the user didn't interact with the document first`.

### Root Cause:
Modern browsers prevent automated audio playback unless a user interaction (click/tap) occurred on the page.

### Solution:
1. Verify that the `<iframe>` includes `allow="autoplay"`.
2. Provide an explicit Play/Start button on your UI for the initial user gesture.

---

## 2. `MISSING_MEDIA_SOURCE` Error

### Symptom:
Method returns `{ error: 'MISSING_MEDIA_SOURCE' }`.

### Root Cause:
The embedded player created an empty `<video>` or `<audio>` tag without a `src` attribute, waiting for the first manual interaction.

### Solution:
- Allow the user to click once directly on the iframe.
- Or use `sremote.adapters.set()` if the provider exposes an official JavaScript API.

---

## 3. No `accept` Event After Calling `hello()`

### Checklist:
1. **Userscript Status:** Ensure Tampermonkey / Violentmonkey is active and `sremote.user.js` matches the iframe URL.
2. **Sandbox Restrictions:** If using `sandbox`, verify that `allow-scripts allow-same-origin` are present.
3. **Execution Timing:** Ensure `sremote.hello()` is called after the iframe finishes loading (`DOMContentLoaded` or `iframe.onload`).

---

## 4. Error Codes Reference

| Error Code | Root Cause | Solution |
| :--- | :--- | :--- |
| `NOT_FOUND` | Target instance does not exist | Check `instanceId` or re-run `hello()` |
| `HANDSHAKE_TIMEOUT` | Iframe failed to reply in time | Check userscript execution and network status |
| `SECURITY_RESTRICTED` | Blocked by browser security | Grant permissions via iframe `allow` attribute |
| `ADAPTER_NOT_FOUND` | Custom adapter not registered | Call `sremote.adapters.set()` before interacting |

> [!TIP]
> For deep-dive error diagnostics, refer to the **[Error Codes Reference Guide](./errors.md)**.
