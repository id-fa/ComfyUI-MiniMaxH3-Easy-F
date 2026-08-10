# Fork changes

This is a fork of [`ComfyUI-MiniMaxH3-Easy`](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy).

[`README.md`](README.md) and [`README_CN.md`](README_CN.md) are kept identical to
upstream. Everything this fork adds or changes is documented here.

---

## Source / Optimized prompt tabs

The prompt editor is split into two tabs, so the prompt you wrote and the prompt
the optimizer produced are stored separately and both stay reusable.

- **Source** — the prompt you write. This is what prompt optimization reads.
- **Optimized** — the optimizer result. It can be edited by hand like any other
  prompt.

Both tabs belong to the node and are saved with the workflow.

### Which tab is generated

Generation uses the **Optimized** tab whenever it contains text, and the
**Source** tab while it is empty:

| Source | Optimized | Prompt sent to MiniMax H3 |
| --- | --- | --- |
| text | empty | Source |
| text | text | Optimized |
| empty | text | Optimized |
| text | whitespace only | Source |

A small dot on the tab marks the one that will be generated. Clearing the
**Optimized** tab therefore returns generation to the **Source** tab, and a
workflow that never ran the optimizer always generates its original text.

### Optimization behavior

This replaces the **Re-optimization** section of the upstream README.

`✦` always reads the **Source** tab, writes the result into the **Optimized**
tab, and switches to it. Consequences:

- Clicking `✦` again regenerates from the original text instead of rewriting a
  previous result.
- A hand-edited optimized prompt is never fed back in as the next optimizer
  input.
- If the **Source** tab is empty, the currently open tab is optimized instead,
  so a prompt typed straight into the **Optimized** tab is still usable.

Upstream instead inferred the source prompt by comparing the editor text with
the previous optimizer result; that heuristic is removed.

### Editor details

- `@` media references, `#` dialogue blocks, and the `</>` raw prompt view work
  in both tabs.
- Undo/redo applies to the tab you are editing and restarts when you switch
  tabs, because one history stack cannot span two documents.
- An external `STRING` link on the `prompt` input still overrides both tabs. No
  tab is marked as generated while that link is connected.
- Tabs are disabled while an optimization request is running.
- Tab labels follow the existing localization: English, or Chinese in a Chinese
  browser.

### Compatibility

- Workflows saved before this change load their prompt into the **Source** tab.
  The **Optimized** tab starts empty, so their generated prompt is unchanged.
- The node's `prompt` widget value is kept equal to the prompt that would
  actually be generated, so the workflow still executes correctly if the web
  extension is disabled.
- Stored in the node properties, alongside the existing prompt document:
  - `minimax_h3_prompt_reference_doc` — Source tab (the upstream property).
  - `minimax_h3_prompt_optimized_doc` — Optimized tab.
  - `minimax_h3_prompt_active_tab` — the tab currently shown.
- The prompt editor reserves about 19 px for the tab strip, so an existing node
  shows slightly less prompt text at the same node height.

### Scope

Frontend only — `web/minimax_h3_easy_ui.js`. No Python node, input, or output
changed, so a browser refresh is enough to pick this up; no ComfyUI restart is
required.
