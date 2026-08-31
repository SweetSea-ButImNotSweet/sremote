# sremote.instances.note
Assigns an identifier note (label/tag) to individual media instances for easier management in multi-iframe setups.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `notesDict` | `Record<string, string>` | **Required** | Dictionary mapping `instanceId` strings to note labels (e.g. `{ "sv_123": "Main Video", "sv_456": "Side Video" }`). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |
