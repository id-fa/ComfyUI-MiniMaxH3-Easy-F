# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A ComfyUI custom-node pack (`ComfyUI/custom_nodes/ComfyUI-MiniMaxH3-Easy`) that wraps MiniMax H3
text/image/reference-to-video generation into four nodes plus a large browser extension.

There is no build system, no test suite, no linter, and `dependencies = []` in `pyproject.toml`.
The whole project is two source files:

- `nodes.py` — all Python nodes, the model-filename matcher, reference conditioning, and the
  prompt-optimizer HTTP routes.
- `web/minimax_h3_easy_ui.js` (~5300 lines) — the entire frontend: virtual media links, the
  contenteditable prompt editor, `@` mentions, localization, and the optimizer settings modal.

## Development loop

- Python changes require a **full ComfyUI restart**.
- `web/*.js` changes require only a **browser hard refresh** (the file is served via `WEB_DIRECTORY = "./web"`).
- There is nothing to run locally without a ComfyUI installation; verification is manual in the ComfyUI canvas.
- `prompt_optimizer.json` (repo root, gitignored) holds a **plaintext API key**. Never read it into
  output, commit it, or include it in packaging.

## Architecture

### Node graph contract

```
MiniMaxH3EasyLoader ─┐
                     ├─→ MINIMAX_H3_BUNDLE → MiniMaxH3Easy ─→ MODEL ─→ (LoRA / patches / sampler)
MiniMaxH3EasyModelAdapter ─┘                              └─→ MINIMAX_H3_CONTEXT → MiniMaxH3EasyOutput
                                                                 → CONDITIONING, LATENT, VAE, VAE, FLOAT
```

`MiniMaxH3Bundle` is a mutable dataclass that lazily loads one transformer at a time
(`model_for("fl2va"|"ref2va")`), falling back to the other role when only one is configured, and
calls `comfy.model_management.soft_empty_cache()` when swapping files. `MiniMaxH3EasyModelAdapter`
bypasses that by carrying already-loaded `MODEL` objects (`*_model_obj`), which disables the swap logic.

`MiniMaxH3PromptOptimizer` exists in `nodes.py` but is deliberately **not** in `NODE_CLASS_MAPPINGS`;
the optimizer is reached through HTTP routes instead.

### Dependency on ComfyUI core internals

`from comfy_extras import nodes_minimax_h3 as h3` and the private helpers `h3._empty_av_latent`,
`h3._resize`, `h3.CANVAS_MULTIPLE`, `h3.FPS`, `h3.adapt_canvas` are used directly. Upstream ComfyUI
changes to that module can break this pack. GGUF support is optional and resolved at call time via
`_registered_node_class` looking up ComfyUI-GGUF's node classes.

### Virtual media links (the key mechanism)

The main node shows **one** `Media` input but accepts up to 15 ordered links. This is split across
both files and cannot be understood from either alone:

- `nodes.py` `MiniMaxH3Easy.INPUT_TYPES` declares the visible `media` plus 15 hidden
  `media_{i}` / `media_type_{i}` transport pairs. They stay in `INPUT_TYPES` so ComfyUI's executor can
  resolve the objects, but are marked hidden so a failed frontend never exposes 30 sockets.
- The frontend stores the ordered links in `node.properties["minimax_h3_virtual_media_links"]`
  (`LINKS_PROP`), removes the real transport input slots (`pruneTransportInputs`), and **draws the
  wires itself** (`drawLinks`, `patchCanvas`, `hitTestLinks`).
- `patchGraphToPrompt()` wraps `app.graphToPrompt`, deletes every `media*` input, then re-emits
  `media_N` / `media_type_N` in link order. It also re-canonicalizes every combo widget value
  (see localization below).

Consequence: if you add a media-related widget or change `MAX_MEDIA`, you must touch both files.

### Prompt editor and `@` reference resolution

The native `prompt` textarea is hidden and replaced by a contenteditable editor. Its structured
document is a `parts` array of `text` / `mention` / `dialogue` entries, and the editor holds **two**
of them behind a tab strip:

- `node.properties["minimax_h3_prompt_reference_doc"]` — the source tab (also the legacy property).
- `node.properties["minimax_h3_prompt_optimized_doc"]` — the optimizer result tab.
- `node.properties["minimax_h3_prompt_active_tab"]` — which tab the editor is showing.

`effectivePromptTab()` picks the optimized doc when it holds text and the source doc otherwise; that
choice drives `buildRuntimePrompt` **and** the `prompt` widget value (`syncPromptWidgetFromDocs`), so
the widget always carries the prompt that would actually be generated even if the extension is
disabled. Editing writes to the *active* tab only (`syncPromptFromEditor`, `applyPromptHistoryEntry`),
and undo history is reset on tab switch because a single stack cannot span two documents. The
optimizer reads the source tab and writes the optimized tab, so re-running it never rewrites its own
output. Only the source tab may fall back to `widget.value` when its doc is missing — that fallback is
what loads workflows saved before the tabs existed.

The frontend→backend prompt protocol:

1. `buildRuntimePrompt` serializes parts: dialogue → `<d>…</d>`, resolved mentions →
   `__MINIMAX_H3_REF_{n}__` (1-based index into the emitted `media_N` order), unresolvable mentions in
   reference mode → `__MINIMAX_H3_UNRESOLVED_REF_{type}__`.
2. `_resolve_reference_prompt` in `nodes.py` substitutes `REFERENCE_PLACEHOLDER_RE` with the official
   tags `<Picture N>` / `<Video N>` / `<Audio N>`, which are assigned in `_reference_conditioning`
   *by media type ordinal*, not by link index.
3. Stale/unresolved placeholders are intentionally preserved rather than dropped — a workflow whose
   media was disconnected must still be executable and must not silently lose the user's reference.

`<Picture N>` numbering follows the official H3 presentation order (images → videos, with a video's
synchronized soundtrack registered immediately before it → standalone audio). When a video's
soundtrack could be confused with standalone audio, a provenance line is prepended to the prompt.

### Mode behaviour

- `mode = image` (`MODE_IMAGE`): 0–2 images → text-to-video / first-frame / last-frame / first+last;
  uses `fl2va`, `_empty_image_conditioning`, `minimax_keyframes`. Video/audio inputs raise.
- `mode = reference` (`MODE_REFERENCE`): ≤9 images, ≤3 videos, ≤3 audio, ≤15 total, at least one
  image or video; uses `ref2va`, `_reference_conditioning`, `minimax_refs`.

Sizing rules that must stay consistent: canvas dimensions align to `h3.CANVAS_MULTIPLE`; frame count is
snapped to `5 + 17n` (`_frame_length`); reference images use a single uniform scale factor and
`_reference_aligned_size` (never non-uniform stretching, never cropping); `original` mode skips
image-side resizing and reads the latent grid back from the VAE.

## Cross-file invariants

Constants are duplicated between `nodes.py` and `web/minimax_h3_easy_ui.js` and must be edited in both:
`MAX_MEDIA`, `MIN_SECONDS` / `MAX_SECONDS`, mode ids, `KEYFRAME_*`, `REF_IMAGE_*`,
`REFERENCE_MENTION_*`, `RESOLUTION_CUSTOM`, the resolution/aspect lists, the prompt-guide id list
(`PROMPT_GUIDES` in JS vs `prompt_guides/manifest.json` on the server), and the
`__MINIMAX_H3_REF_` / `__MINIMAX_H3_UNRESOLVED_REF_` prefixes.

**Localization is homemade, not ComfyUI i18n.** `ZH_BROWSER` (browser language) picks between English
and Chinese strings in `TEXT` / `OPTION_DEFS`, and combo widgets are *rewritten in place* to display
localized values. The server only ever accepts canonical lowercase ids, so `OPTION_ALIASES` must map
every historical and localized display string back to its canonical value; `canonicalOption()` runs on
every widget in `graphToPrompt` and in `repairConfiguredWidgetValues` when loading old workflows.
Adding or renaming a combo option without updating `OPTION_ALIASES` silently breaks saved workflows.

The `none` transformer sentinel has the same problem: `NONE_MODEL_DISPLAY_VALUES` / `NONE_MODEL_ALIASES`
in Python must cover whatever `localizeOptionalModelWidget` shows (`none` / `None` / `无`), because
ComfyUI validates combo values before the node runs.

## Model discovery

Loader dropdowns are not plain `folder_paths` lists. `_collect_weight_names` merges ComfyUI's registry
with a filesystem scan, and `_has_role(name, role)` classifies files by normalized filename tokens
(`_normalise_model_name` splits camelCase/underscores/dashes). It deliberately tolerates community and
quantized naming (`fl2v`, `ref2v`, GGUF, Qwen3-VL-32B INT8/ConvRot, NVFP4/AWQ, diffusers-style
`vae/`). When users report "my model doesn't appear", the fix belongs in `_has_role`, and safetensors
must keep sorting before GGUF (`_sort_model_names`) so existing workflows keep resolving.

## Prompt optimizer

- Routes are registered on ComfyUI's `PromptServer` by `_register_prompt_optimizer_route_when_ready()`,
  which retries on a daemon thread because `PromptServer.instance` does not exist yet at import time:
  `GET/POST /minimax_h3_easy/prompt_optimizer_settings`, `POST /minimax_h3_easy/prompt_optimize`.
- Settings are **installation-global** (`prompt_optimizer.json`), not per-node; only
  `prompt_optimizer_scene_guide` is a saved node widget. The `prompt_optimizer_settings` boolean is a
  momentary trigger that the frontend resets to `false` and `graphToPrompt` always forces to `false`.
- Two API shapes: OpenAI-compatible chat completions and Gemini native `generateContent`. URL handling is
  forgiving (`_normalize_optimizer_url` appends/strips endpoints, injects the Gemini model path and `key=`).
- The system prompt is assembled by `_prompt_guide_bundle`: general guide + base *or* full-reference
  guide (by mode) + the selected scene guide + every `.md`/`.txt` under that guide's `references/`.
  `_read_prompt_guide_text` enforces a realpath prefix check — keep that when touching guide loading.
- Adding a scene guide = new `prompt_guides/<id>/guide.md` (+ optional `references/`), an entry in
  `prompt_guides/manifest.json`, and a matching entry in the JS `PROMPT_GUIDES` array. The server combo
  choices are derived from the manifest at `INPUT_TYPES` time and `_prompt_guide_manifest` is
  `lru_cache`d, so manifest edits need a restart.
- Guides under `prompt_guides/` are near-verbatim adaptations of the official MiniMax H3 material and
  are intentionally *not* summarized (see `prompt_guides/README.md`, `ADAPTATION_NOTES.md`).

## Conventions

- All user-visible node/UI text is bilingual EN/ZH via the JS tables; Python error messages are English.
- `IS_CHANGED` returns `NaN` on the executing nodes so media/prompt edits always re-run; the loader
  returns its filename tuple so model choices cache correctly.
- This repo is a fork. `README.md` and `README_CN.md` are kept byte-identical to upstream — do **not**
  edit them. Document every fork-only change in `README_fork.md` instead, and say there which upstream
  section it supersedes.
- Commit messages are short imperative one-liners ("Improve reference image sizing options").
