# sremote.css.set
Injects or dynamically updates CSS rules inside the currently connected child iframe document.

## Syntax
```javascript
sremote.css.set(css, instanceId?, key?);
```

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `css` | `string` | `""` | Custom CSS stylesheet string to inject into the iframe. |
| `instanceId` | `string` | `null` | Target iframe instance identifier (if omitted, applies to the most recently active iframe). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a `Promise<{ success: boolean, css: string }>` confirming that the CSS was successfully loaded.

## Notes
- Dynamic CSS is managed through a `<style id="sremote-dynamic-css">` element and is continuously monitored by a `MutationObserver` to automatically restore itself if the iframe's SPA or video player resets or mutates the DOM tree.
- To inject CSS even earlier to prevent Flash of Unstyled Content (FOUC), pass `css` through `sremote.hello({ css: '...' })`.
