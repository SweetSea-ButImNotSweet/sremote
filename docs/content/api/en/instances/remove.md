# sremote.instances.remove

Removes and cleans up an instance from SRemote management (unregisters adapter, invalidates cache, and drops tracked state).

---

## Signature

```javascript
sremote.instances.remove(instanceId, key?);
```

---

## Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | **Required** | The unique identifier of the instance to remove. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

---

## Return Value
- `boolean`: Returns `true` if the instance was successfully removed, `false` otherwise.

---

## Example

```javascript
// Clean up and release instance 'youtube-player'
sremote.instances.remove('youtube-player');
```
