# sremote.hello
Sends the initial handshake signal to all child iframes in the page or to a specified target iframe.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `options` | `Object` | `{}` | Connection configuration options:<br>- `treatAlmostEndAsEnd` (`boolean`): If `true`, emits standard `ended` event instead of `almostend` when media is ~0.8s from finish.<br>- `css` (`string`): Custom CSS string to inject immediately at `document-start` into the iframe.<br>- `multiMode` (`boolean \| null`): Enables or disables multi-media mode.<br>- `target` (`Window`): Specific target iframe window to send the handshake to.<br>- `key` (`string`): Passkey authentication if domain lock is enabled. |
| `target` | `Window` | `null` | The `contentWindow` of the target iframe to send the handshake directly to (if not passed via `options.target`). |

## Notes
- When `hello()` is called, the script generates a secret `handshakeId` and `handshakeToken` pair to securely authenticate the handshake session with the iframe.
- If `options.treatAlmostEndAsEnd` is set to `true`, when the media approaches completion (~0.8s remaining), SRemote directly fires `ended` without needing dedicated `almostend` event handlers (ideal for players that auto-destroy upon `ended`).
- If `options.css` is provided, the CSS is cached via GM Storage and injected directly into the iframe's `document.documentElement` at `document-start` before the DOM is parsed, eliminating Flash of Unstyled Content (FOUC).
- If the domain has Lock protection enabled, a valid `key` must be provided in `options.key` for the handshake to proceed.
