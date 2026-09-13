# Troubleshooting & Debugging Guide

This guide outlines diagnostic techniques, built-in self-testing tools, and solutions for the most common issues encountered when integrating SRemote.

---

## 1. Built-in Self-Diagnostic Suite (`sremote.debug`)

SRemote bundles a dedicated **`sremote.debug`** namespace that allows developers to audit connection health directly from DevTools Console:

```javascript
import { sremote } from '@sremote/sdk';

// 1. Run the comprehensive test suite across all active connections:
const testResults = await sremote.debug.runAllTests();
console.table(testResults);

// 2. Dump complete internal states of handshakes, adapters, and instances:
console.log(sremote.debug.dumpState());
```

---

## 2. Common Issues & Solutions

### Issue 1: Autoplay Policy Restriction (`NotAllowedError`)
- **Symptom**: Calling `sremote.play()` rejects with: `NotAllowedError: play() failed because the user didn't interact with the document first`.
- **Cause**: Modern web browsers strictly restrict unmuted automatic playback until the user performs at least one physical gesture (click or tap) on the document.
- **Remedy**:
  1. Ensure your `<iframe>` includes `allow="autoplay"`.
  2. Avoid invoking `sremote.play()` immediately on page load. Instead, bind playback triggers to an interactive UI button clicked by the user.

### Issue 2: Iframe Does Not Respond to `hello()`
- **Symptom**: The `accept` event is never triggered.
- **Cause**:
  1. For cross-origin iframes: The end user has not installed the companion Userscript, or the userscript is disabled for that domain.
  2. The `<iframe>` contains a restrictive `sandbox` attribute missing `allow-scripts` or `allow-same-origin`.
  3. `hello()` was called prematurely before the iframe finished loading its HTML markup.
- **Remedy**: Trigger `sremote.hello()` inside `iframe.onload` or after `DOMContentLoaded`.

### Issue 3: `MISSING_MEDIA_SOURCE` Error
- **Symptom**: The console displays error code `{ error: 'MISSING_MEDIA_SOURCE' }`.
- **Cause**: Some player embeds mount an empty `<video>` tag and defer loading the actual media `src` until the user first interacts with the player skin.
- **Remedy**: Prompt the user to click the iframe once to start the stream, or utilize `@sremote/ready2use` which leverages vendor SDKs to initialize media sources eagerly.

---

## 3. Error Codes Reference

| Error Code | Meaning | Recommended Action |
| :--- | :--- | :--- |
| `NOT_FOUND` / `INSTANCE_NOT_FOUND` | No matching media instance found for the specified ID | Verify `instanceId` or call `hello()` again to rescan active frames |
| `HANDSHAKE_TIMEOUT` / `TIMEOUT` | Target iframe did not respond within the handshake window | Check userscript installation status and iframe load state |
| `SECURITY_RESTRICTED` | Blocked by browser security policies or CORS restrictions | Ensure permissions like `autoplay; encrypted-media` are present in `allow` |
| `ADAPTER_NOT_FOUND` | The requested adapter name is not registered | Register the adapter via `sremote.adapters.register()` |

---

## ⏭️ Next Steps
- Verify supported features in the [Compatibility Matrix](./compatibility-matrix.md).
