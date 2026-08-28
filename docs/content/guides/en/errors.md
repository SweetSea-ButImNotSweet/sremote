# Error Codes & Troubleshooting

In SRemote, all control methods (`play`, `pause`, `seek`, ...), custom RPC calls (`call`), as well as internal communication mechanisms (MessagePort, Queue) follow the **Safe Result Pattern**.

Business logic or runtime operational errors **do not throw exceptions or reject Promises**. Instead, they resolve to a standardized result object:

```typescript
interface SRemoteResponse<T = any> {
  success: boolean;
  data?: T;             // Return payload if successful (for call/status)
  error?: string;       // Standard error code (SCREAMING_SNAKE_CASE)
  message?: string;     // Detailed explanation of the error
  instanceId?: string;  // Target media instance ID (if applicable)
  action?: string;      // Executed action name
}
```

---

## 📋 Standard Error Codes Summary

| Error Code (`error`) | Trigger Condition | Related Methods |
| :--- | :--- | :--- |
| [`AUTH_FAILED`](#auth_failed) | Locked domain or missing/invalid Passkey. | All API methods (`play`, `pause`, `call`, ...) |
| [`WHERE_IS_INSTANCE_ID`](#where_is_instance_id) | Multi-mode active with multiple media instances, but no `instanceId` provided. | Playback control commands (`play`, `seek`, ...) |
| [`INSTANCE_NOT_FOUND`](#instance_not_found) | Specified `instanceId` does not exist or Port is not connected. | Control commands, `call()`, `status()` |
| [`MISSING_MEDIA_SOURCE`](#missing_media_source) | `<video>` / `<audio>` element has empty `src` (`readyState = 0`). | `play()`, `toggle()` |
| [`NO_MEDIA_FOUND`](#no_media_found) | No video/audio elements found inside the iframe. | `call('debug_*')`, control commands |
| [`TIMEOUT`](#timeout) | RPC response timed out (5000ms) or command queue expired. | `call()`, command queue |
| [`PORT_ERROR` / `PORT_DISCONNECTED`](#port_error--port_disconnected) | MessageChannel port disconnected or postMessage failure. | `call()`, `dispatchCommand` |
| [`ACTION_NOT_FOUND`](#action_not_found) | Calling an unregistered RPC method in the iframe. | `call()` |
| [`EXECUTION_ERROR`](#execution_error) | Unhandled exception occurred in the iframe RPC handler. | `call()` |
| [`NO_SRC_PROVIDED`](#no_src_provided) | Changing media source without providing `src` parameter. | `call('debug_setSource', ...)` |
| [`NO_SAVED_SOURCE`](#no_saved_source) | Restoring original source when no source was previously saved. | `call('debug_restoreOriginal')` |

---

## 🛠️ Error Details & Troubleshooting Guide

---

### `AUTH_FAILED`
> **Sample message:** `Access denied. Valid Passkey is required for command 'play'`

#### Cause:
- The website is session-locked via `sremote.lock()` or requires passkey authentication.
- You called an API without passing a valid `key`.

#### Resolution:
Provide a valid passkey in the `key` parameter:
```javascript
// Example with play
const res = await sremote.play('inst_123', 'MY_SECRET_PASSKEY');

// Or authenticate during handshake
sremote.hello({ key: 'MY_SECRET_PASSKEY' });
```

---

### `WHERE_IS_INSTANCE_ID`
> **Sample message:** `Multiple medias detected; instanceId is required for command 'play'`

#### Cause:
- `multiMode` is enabled and SRemote has connected to 2 or more iframe media instances.
- You called a playback command without specifying an `instanceId`.

#### Resolution:
1. **Pass a specific ID:** Obtain ID from `accept` event or `sremote.list()`:
   ```javascript
   const list = sremote.list();
   if (list.length > 0) {
     await sremote.play(list[0].instanceId);
   }
   ```
2. **Or control all:** Pass `'all'` to target all active media:
   ```javascript
   await sremote.play('all');
   ```

---

### `INSTANCE_NOT_FOUND`
> **Sample message:** `Instance 'video_player_01' not found` or `No active port for instance 'unknown'`

#### Cause:
- The specified `instanceId` does not exist in SRemote's active instances.
- The target iframe was removed from the DOM or has not completed handshake.

#### Resolution:
- Check current available instances:
  ```javascript
  console.log('Connected instances:', sremote.list());
  ```
- If using pre-assigned IDs (`sremote.assignId(iframe, 'custom_id')`), ensure `sremote.hello()` is called afterwards.

---

### `MISSING_MEDIA_SOURCE`
> **Sample message:** `The iframe service has not loaded any media source into the media element (readyState = 0); play() is ineffective.`

#### Cause:
- The third-party iframe rendered a `<video>` or `<audio>` tag but **has not loaded a source yet (`readyState = 0`)**.
- Common with services that require a user click on their custom thumbnail before streaming.

#### Resolution:
- Listen to `canplay` or `loadedmetadata` before invoking `play()`:
  ```javascript
  sremote.on('loadeddata', ({ instanceId }) => {
    sremote.play(instanceId);
  });
  ```
- Or prompt the user to interact once with the iframe.

---

### `NO_MEDIA_FOUND`
> **Sample message:** `No media element found to set source` or `No media element or MediaSession handler found for command 'play'`

#### Cause:
- The iframe contains no `<video>`, `<audio>` or registered MediaSession handlers.

#### Resolution:
- Verify with `sremote.debug.scan()`.
- Ensure iframe DOM loading has completed before sending commands.

---

### `TIMEOUT`
> **Sample message:** `RPC call 'getIframeCSS' timed out after 5000ms` or `Command timed out waiting for iframe handshake`

#### Cause:
- Sent an RPC request but the iframe didn't respond within 5 seconds (frozen, crashed, or navigated away).

#### Resolution:
- Check if the iframe navigated to an unsupported external domain.
- Call `sremote.hello()` again to re-establish communication.

---

### `PORT_ERROR` / `PORT_DISCONNECTED`
> **Sample message:** `Error posting command 'seek' to port for 'inst_123'`

#### Cause:
- The internal MessagePort connection was closed or disconnected.

#### Resolution:
- Call `sremote.hello()` if a new iframe was added.

---

### `ACTION_NOT_FOUND`
> **Sample message:** `Custom action 'custom_filter' not found`

#### Cause:
- You invoked `sremote.call('custom_action_name')` but the iframe hasn't registered a handler for that action.

#### Resolution:
- Ensure the RPC method name is correctly spelled (e.g. `'setIframeCSS'`, `'getIframeCSS'`).

---

### `EXECUTION_ERROR`
> **Sample message:** `Error: Cannot read properties of undefined`

#### Cause:
- An unhandled error occurred within the iframe's RPC execution handler.

#### Resolution:
- Check parameter types passed to `sremote.call(action, params)`.
- Open DevTools Console on the iframe to inspect the stack trace.

---

### `NO_SRC_PROVIDED`
> **Sample message:** `Parameter "src" is required`

#### Cause:
- Called a debug RPC method (like `debug_setSource`) without providing the `src` parameter.

#### Resolution:
- Provide a valid URL:
  ```javascript
  await sremote.call('debug_setSource', { src: 'https://example.com/audio.mp3' });
  ```

---

### `NO_SAVED_SOURCE`
> **Sample message:** `No original source was previously saved to restore`

#### Cause:
- Called `debug_restoreOriginal` before any test source was injected.

#### Resolution:
- Only call restore after injecting a test source.

---

## 💡 Best Practice: Safe Response Handling

Because SRemote uses the Safe Result Pattern, you don't need `try...catch` blocks for control commands:

```javascript
async function safePlayMedia(targetId) {
  const result = await window.sremote.play(targetId);

  if (!result.success) {
    switch (result.error) {
      case 'AUTH_FAILED':
        console.error('Authentication Error: Passkey required!');
        break;
      case 'WHERE_IS_INSTANCE_ID':
        console.warn('Multiple videos active, falling back to play all...');
        await window.sremote.play('all');
        break;
      case 'MISSING_MEDIA_SOURCE':
        console.warn('Video source not loaded yet, please wait...');
        break;
      default:
        console.warn(`Play failed [${result.error}]:`, result.message);
    }
    return false;
  }

  console.log('Playing successfully on instance:', result.instanceId);
  return true;
}
```
