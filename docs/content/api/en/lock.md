# sremote.lock
Locks the current SRemote session on the parent page, requiring all subsequent API calls to supply a valid Passkey.

## Parameters
This method takes no parameters.

## Return Value
Returns `boolean` (`true`).

## Notes
- **No programmatic `unlock()` method:** Once `sremote.lock()` is invoked, the session remains locked until the webpage is reloaded. It **cannot** be unlocked via JavaScript code on the page.
- **Mandatory Passkey:** All subsequent API calls (such as `hello()`, `play()`, `status()`, `list()`, etc.) will be rejected and throw an error unless a valid `key` is supplied.
- **How to proceed:**
  1. The user opens the extension menu (Tampermonkey/Violentmonkey) on the current page.
  2. Selects **🔑 Generate & Copy Passkey** to obtain a secret passkey (formatted like `SR-XXXX-XXXX-XXXX-XXXX`).
  3. Supplies this passkey in the `key` parameter of API calls (e.g. `sremote.hello({ key: 'SR-...' })` or `sremote.play(instanceId, 'SR-...')`).
  4. To fully remove the lock state, the user must explicitly reset it via the extension popup menu or reload the page.
