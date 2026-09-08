# Anti-Redundancy & Reading Guardrails

## 1. Core Tooling Hierarchy
For any inspection, reading, or code navigation, you MUST prioritize the custom MCP tools provided in `.antigravity/` over built-in tools:
* **Step 1: Check Metadata with `file_info`**:
  - Always call `file_info` on a file or folder BEFORE deciding whether and how to read its content.
  - Assess file size and line counts first. Never attempt to read a file without knowing its scale.
* **Step 2: Read with `controlled_read`**:
  - NEVER call built-in `view_file` or `read_file` when inspecting code.
  - Hard limit: Responses are strictly capped at 800 lines and 50 KB per call.
  - Use `controlled_read` with a precise and meaningful `justification` detailing the symbol, function, or logic being analyzed. Generic justifications like "read code" or "need context" are strictly prohibited and will be rejected.
* **Step 3: Search with `ripgrep_search`**:
  - Prefer `ripgrep_search` over built-in `grep_search`.
  - Always provide a specific `searchPath` or `fileGlob` to prevent dumping large uncontained outputs.

## 2. Large File Safety (> 5,000 Lines)
* If `totalLines > 5000`:
  - You MUST check `file_info` first.
  - You are FORBIDDEN from requesting whole-file or wide-span reads (>800 lines).
  - Use `ripgrep_search` to pinpoint the exact definition, method, or line scope before reading.
  - Repeated attempts to read large portions of a >5k line file will result in an immediate **SECURITY LOCK** on the file.

## 3. Logical Block Reading & Circuit Breaker
* **Read Enclosing Scopes**: When investigating a symbol or function, read the entire contiguous logical block (class, function, switch case) in one call instead of slicing into tiny 10-20 line fragments (micro-peeking).
* **No Redundant Reads**: Do NOT attempt to re-read line ranges that have already been retrieved. The information exists in your context history.
* **Respect the Circuit Breaker**: If `controlled_read` blocks your request (`[CONTROLLED_READ CIRCUIT BREAKER TRIGGERED]`), you are strictly forbidden from attempting to bypass it using `view_file`. Stop and utilize your existing conversation context.
* **Locked Files**: If a file is locked (`[SECURITY CIRCUIT BREAKER: FILE LOCKED]`), you cannot read it. Notify the user to provide their 6-digit Google Authenticator code via `unblock_file`.
