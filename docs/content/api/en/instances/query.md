# sremote.instances.query
Scans and reports active media instances through internal cross-domain storage (GM Storage).

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an array `Array<Object>` of discovered instance records, each containing:
- `instanceId` (`string`): Unique instance identifier.
- `location` (`string`): Webpage URL containing the media.
- `origin` (`string`): Frame origin.
- `title` (`string`): Document title (`document.title`).
- `hasMedia` (`boolean`): Whether an active media element exists.
- `mediaType` (`string`): Detected media type.
- `lastActive` (`number`): Timestamp of the most recent activity.
