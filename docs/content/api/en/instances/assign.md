# sremote.instances.assign

Proactively associates a custom `instanceId` to an `<iframe>` element before or during the handshake.

---

## Syntax

```javascript
// New namespaced syntax:
sremote.instances.assign(iframeOrSelector, customId);

// Or convenient alias:
sremote.instances.assign(iframeOrSelector, customId);
```

---

## Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `iframeOrSelector` | `HTMLIFrameElement` \| `string` | **Required** | DOM reference to the iframe or a CSS selector string (e.g. `'#player-frame'`). |
| `customId` | `string` | **Required** | Custom identifier string to bind to this iframe. |

---

## Return Value
- `boolean`: Returns `true` if successfully pre-assigned, otherwise `false`.

---

## Examples

```javascript
// 1. Pre-assign custom ID 'main-player' to the iframe element
sremote.instances.assign('#my-iframe', 'main-player');

// 2. Trigger handshake and control the player directly
sremote.hello();
sremote.play('main-player');
```
