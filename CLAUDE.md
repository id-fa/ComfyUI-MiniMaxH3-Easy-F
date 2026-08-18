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
`isTransportInputName` in the JS decides what gets pruned; anything added to it must also be re-emitted in
the `graphToPrompt` patch, or the server silently falls back to the input's default.

### Prompt editor and `@` reference resolution

The native `prompt` textarea is hidden and replaced by a composite DOM widget: a tab strip over **two**
contenteditable fields (`source` and `optimized`, `PROMPT_FIELDS`). Each field's structured document is
a `parts` array of `text` / `mention` / `dialogue` entries, and each *tab* owns a full pair:

```
node.properties["minimax_h3_prompt_tabs"]      = [{ label, source: doc, optimized: doc }, …]
node.properties["minimax_h3_prompt_tab_index"] = open tab
```

`promptTabs()` is the only accessor and migrates on first touch: upstream's single
`minimax_h3_prompt_reference_doc`, this fork's earlier `…_optimized_doc`, or a bare `widget.value` all
become the first tab, and the legacy properties are deleted so there is one source of truth.

`effectivePromptField()` picks the open tab's optimized doc when it holds text and its source doc
otherwise; that choice drives `buildRuntimePrompt` **and** the `prompt` widget value
(`syncPromptWidgetFromDocs`), so the widget always carries the prompt that would actually be generated
even if the extension is disabled. Only the open tab is ever sent.

Per-field state lives on the editor element rather than the node — `editor.__h3PromptField`,
`editor.__h3History`, `editor.__h3RawNeedsSync` — so history, raw-view sync, and serialization need no
field plumbing. `node.__h3Editor` means *the focused field* (updated on focus/pointerdown) and is what
the mention picker, caret helpers, and undo act on; `node.__h3Editors` is the map of both. Undo resets
on tab switch because one stack cannot span two documents. `syncPromptTabStrip` rebuilds only when its
signature (labels + count + index) changes, since typing syncs on every keystroke.

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

A reference video's soundtrack comes out of the `VIDEO` (upstream takes it as a separate `AUDIO`
input), so `_encode_reference_audio` gets `max_seconds` and trims it to the frames that survived the
`5 + 17n` snap — otherwise the pair desynchronises and the audio VAE asks for ~0.12 GB of VRAM per
second. Standalone audio references are never trimmed. That VAE has `latent_dim == 2` with a 3D
waveform, so ComfyUI's OOM fallback to `encode_tiled_` raises `IndexError` instead of reporting the
memory; the encode translates it back.

## Cross-file invariants

Constants are duplicated between `nodes.py` and `web/minimax_h3_easy_ui.js` and must be edited in both:
`MAX_MEDIA`, `MIN_SECONDS` / `MAX_SECONDS`, mode ids, `KEYFRAME_*`, `REF_IMAGE_*`,
`REFERENCE_MENTION_*`, `RESOLUTION_CUSTOM`, the resolution/aspect lists, `OPTIMIZER_VIDEO_SAMPLES`,
the prompt-guide id list (`PROMPT_GUIDES` in JS vs `prompt_guides/manifest.json` on the server), and the
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
- There are **three** places a prompt can be optimized, and each one checks the configured `api_format`
  itself so only one of them ever fires:
  - the editor route, for the HTTP formats and `gguf` (the `✦` button);
  - `_clip_prompt_transform` inside `MiniMaxH3Easy.generate`, for `clip` only;
  - `_optimize_prompt_on_run`, upstream's `optimize_on_run` setting, **restricted in this fork to
    `OPTIMIZER_HTTP_FORMATS`**. It calls `_optimizer_http_json` directly, so handing it `clip` or
    `gguf` would POST the request to whatever URL was last left in the shared settings. The
    `optimizeOnRunLabel` switch is hidden in the settings modal for the local formats to match.
  `_optimize_prompt_on_run` skips its own work when the marker transported in
  `prompt_optimizer_marker` still matches the prompt and the context hash, which is why the node's
  `IS_CHANGED` may return `NaN` without re-optimizing on every queue.
- Five `api_format`s (`OPTIMIZER_FORMATS`, duplicated in the JS): OpenAI-compatible chat completions,
  OpenAI `responses`, Gemini native `generateContent`, `clip`, and `gguf`. URL handling for the three
  HTTP ones is forgiving (`_normalize_optimizer_url` appends/strips endpoints, injects the Gemini model
  path and `key=`). `responses` differs from `openai` in endpoint, payload and reply shape only — it is
  otherwise the same servers, which is why `_optimizer_image_part` centralises the one thing all three
  spell differently. It is also the one format that sends **no** thinking switch: the Responses API
  rejects `chat_template_kwargs`, and it keeps reasoning in its own output items that
  `_optimizer_responses_text` never reads.
- `gguf` loads a local model with llama-cpp-python and therefore runs from the **editor route**, like the
  HTTP formats — only `clip` has to wait for execution. `_optimizer_gguf_catalog` scans `text_encoders`
  and `LLM` (the folders ComfyUI-QwenVL-F uses) and `GET /minimax_h3_easy/gguf_models` feeds the dropdown.
  The loaded `Llama` is cached in `_OPTIMIZER_GGUF_STATE` keyed by (model, mmproj, ctx, gpu layers) and
  released when that changes or when `gguf_unload_after` is set. Vision needs an mmproj plus a chat
  handler class, whose name varies per llama-cpp build/fork, so `_optimizer_gguf_chat_handler` probes
  candidates by model-name family and degrades to text-only. llama-cpp takes the same OpenAI-shaped
  `image_url` parts, so `_optimizer_media_items(..., "openai")` is reused verbatim.
- `gguf_describe_media` switches the GGUF format to the clip format's two-stage shape:
  `_optimizer_gguf_describe` runs one small vision pass per image, then `_optimizer_gguf_json` gets the
  descriptions as `context` and no images. It exists because a guide-sized multimodal prompt makes one
  uninterruptible prompt-evaluation phase — the reason the editor appears to freeze. Because that pass
  loads the projector, the final text-only pass takes `keep_vision=True`; without it the signature would
  change and the model would be reloaded between the two. `_optimizer_media_items` keeps unsendable
  media with empty `parts` (and its `path`) so skips can be logged rather than silently dropped.
  Three things that mode gets wrong if you are not careful, found with Gemma 4 and Qwen3.8:
  - **The describe pass has its own token budget, and a model that cannot be told to stop reasoning
    spends it on the thought.** `OPTIMIZER_CLIP_DESCRIBE_LENGTH` alone left Gemma stopping
    mid-thought, so `_strip_optimizer_output` correctly returned nothing and *every* description came
    back empty. `OPTIMIZER_DESCRIBE_THINKING_HEADROOM` is added for the families with no working
    switch (gemma), and is deliberately not tied to the answer length: it buys room for text that is
    discarded either way.
  - **A vision chat handler renders no chat template**, so neither switch reaches the model on the
    describe path and the budget is the only lever left. `_optimizer_gguf_chat` raises
    `_OptimizerThinkingOverflow` for exactly that failure, and `_optimizer_gguf_describe_each` retries
    the asset with `OPTIMIZER_DESCRIBE_THINKING_HEADROOM` and keeps the raised budget for the rest of
    the run — one wasted pass, not one lost description per asset.
  - **A describe pass that produced nothing must not be treated as "no media was connected".** The
    route falls back to the single-request path (`describe = False`) and logs it. Without that the
    final pass got no parts *and* no media rule, and the model wrote — reasonably — a prompt about
    nothing. Same principle as the empty-`parts` item in `_optimizer_media_items`: never write about
    media as if it had not been there.
- A thinking block that never closes means the model ran out of tokens while thinking, and
  `_strip_optimizer_output` returns `""` because there genuinely is no prompt in it. `finish()` inside
  `_optimizer_gguf_chat` turns that specific case into an error that says so (`_opens_with_thinking`)
  instead of an unexplained empty prompt: the user can act on "raise the answer length", not on "empty".
- The editor-driven formats can be stopped: `✦` becomes a stop button while pending, aborting the fetch
  and calling `POST /minimax_h3_easy/prompt_optimize_cancel` with the request id it generated. The id
  registry (`_optimizer_cancel` / `_optimizer_is_cancelled`, capped) is polled by `_optimizer_gguf_stream`
  between tokens. **`create_chat_completion` has no `stopping_criteria`** (only `create_completion` does),
  so streaming and closing the generator is the only way to interrupt a chat turn; model loading and
  prompt evaluation still cannot be interrupted at all. The blocking `requests.post` cannot be
  interrupted either, so an HTTP answer that arrives after a cancel is discarded instead. A client
  disconnect raises `asyncio.CancelledError` in the route and is treated as a cancel. **Everything the route does that
  blocks goes through `asyncio.to_thread`, `_optimizer_media_items` included** — reading the
  references base64s whole files and decodes every video frame by frame, and a cancel that cannot be
  served until that finishes is not a cancel. Do not call it inline again; it is the window the stop
  button is pressed in most often, because it is the one before anything appears to happen.
- Reasoning is always off — the answer *is* the prompt. Each backend suppresses it its own way (`clip`:
  `thinking=False`; `gguf` and the HTTP pair: `chat_template_kwargs.enable_thinking=false` plus
  `reasoning_effort=OPTIMIZER_REASONING_EFFORT`, and `/no_think` and `force_reasoning=False` for Qwen
  and family-specific `stop` markers; Gemini: `thinkingConfig.thinkingBudget=0`), and
  `_strip_optimizer_output` is the shared backstop. Qwen3.8 reads the *depth* rather than the switch and
  defaults to `xhigh`, hence `low`; both fields go in the same dict because older templates read only
  `enable_thinking`, and `none` is not a value that template accepts.
  Don't add a "reasoning" toggle without deciding what the leftover block should do to the H3 prompt.
  Three mistakes were made here already — do not reintroduce any of them:
  1. **The HTTP formats sent no switch and never called `_strip_optimizer_output`**, so a reasoning
     model behind an OpenAI-compatible endpoint wrote its thoughts straight into the H3 prompt while
     this file claimed otherwise. The switches now go through `_optimizer_thinking_off_payload`, and
     `_optimizer_http_post` retries once **without** them on 400/404/422 because an endpoint that has
     never heard of `chat_template_kwargs` errors rather than ignoring it. `_optimizer_gguf_call` does
     the same for llama-cpp builds too old to accept the argument.
  2. **`_strip_optimizer_output` required an opening `<think>`.** Most Qwen chat templates *pre-open*
     the tag in the assistant turn, so the response begins with bare reasoning prose and the only tag
     in it is the closing one — the whole block leaked. `_OPTIMIZER_THINK_CLOSE_RE` therefore makes the
     opening tag optional and is greedy to the **last** closing tag.
  3. **Only Harmony's exact `<|channel|>final<|message|>` was recognised.** Gemma 4 marks its
     reasoning with the same idea but different pipes — `<|channel>thought` … `<channel|>`, the
     closing marker carrying no role and no `<|message|>` — so the whole thought leaked into the H3
     prompt, and `/no_think` is not sent to Gemma in the first place (`_optimizer_gguf_chat`).
     `_OPTIMIZER_CHANNEL_MARK` therefore accepts every spelling, and `_OPTIMIZER_THOUGHT_CHANNEL_RE`
     cuts to the last marker when the block opens on a thinking role. Note that `<|channel>` is
     *also* in the gemma `stop` list in `_optimizer_gguf_chat`; it evidently does not fire through
     the vision chat handler, but do not add the closing marker there — the prompt is what follows it.
  Untagged reasoning cannot be removed: nothing marks where it ends. Don't add heuristics that guess at
  prose preambles — they will eat real prompts. The switches are what has to work.
- `clip` runs locally through the node's optional `optimizer_clip` CLIP input using ComfyUI's
  `clip.tokenize` → `clip.generate` → `clip.decode` (same as the built-in `TextGenerate` node). That object
  only exists during execution, so the HTTP route rejects this format and `MiniMaxH3Easy.generate` does the
  work instead, via a `prompt_transform` callback threaded into `_reference_conditioning` — placed after
  `_resolve_reference_prompt` so the encoder sees real `<Picture N>` tags, not internal placeholders. The
  result is pushed to the editor with `PromptServer.send_sync(PROMPT_OPTIMIZER_EVENT)`. It only fires while
  the hidden `prompt_needs_optimization` transport input is true (frontend: "the open tab's Optimized
  field is empty"; default true so headless runs still optimize).
- A chat-completions message has no video part, so `_optimizer_media_items` gives a reference video
  `_optimizer_video_still_parts` instead: PyAV *seeks* one candidate per second, then decodes forward
  to the target — a seek only reaches the keyframe before it, and a candidate set that collapses onto
  one keyframe per GOP has no changes left to score (this is the editor route, where media are file
  paths, not the tensors `clip` gets). One item can therefore hold several
  parts, which is why `_optimizer_media_manifest` exists — several frames of one clip are otherwise
  indistinguishable from several unrelated images, and the attached count is by reference, not by part.
  Gemini keeps sending video whole.
- How many of those candidates survive is the shared `video_sample` setting (`OPTIMIZER_VIDEO_SAMPLES`,
  2–12 frames, duplicated in the JS), resolved by `_optimizer_video_sample_count`. The selection is
  `_select_change_frames`: the **first and last** candidates are always kept, and the remaining budget
  goes to the candidates whose mean absolute difference from the previous one is largest
  (`_optimizer_still_change_scores` on Pillow thumbnails for the file path, `_tensor_change_scores` for
  the decoded path). Even spacing was the earlier rule and it kept spending the whole budget on a held
  shot; do not restore it without deciding what happens to the cut in the middle. Sampling at
  `OPTIMIZER_VIDEO_SAMPLE_RATE` fps means the candidate set grows with the clip, so
  `OPTIMIZER_VIDEO_SAMPLE_MAX_CANDIDATES` caps it and spreads it evenly beyond that — each candidate
  costs a decode and a JPEG encode, and the stills are held as encoded bytes rather than as images for
  the same reason. A file that reports no duration (or refuses to seek) falls back to a strided
  sequential decode, never to zero frames. `_optimizer_clip_media` honours the same setting — it
  already has the decoded frames and the fps, so `_sample_frames` addresses candidates by index instead
  of seeking — but keeps `OPTIMIZER_CLIP_MAX_VIDEO_FRAMES` /
  `OPTIMIZER_CLIP_MAX_STILLS` on top of it: that path shares VRAM with the H3 model.
- **Because that selection is uneven, every path that sends it also states the timestamps**
  (`_optimizer_video_sample_detail`). `_optimizer_video_still_parts` returns `(parts, times, duration)`
  and `_sample_frames` returns `(frames, times)` for exactly this reason; the times ride on the media
  item (`times` / `duration`) into `_optimizer_media_manifest`, `OPTIMIZER_VIDEO_STILLS_REQUEST` and —
  through the third return value of `_optimizer_clip_media` — `OPTIMIZER_CLIP_VIDEO_FRAMES_NOTE`.
  Dropping them is not cosmetic: `0.0s / 5.0s / 6.0s / 10.0s` read as four equal steps turns a held
  shot and a cut into a slow continuous move. When the times are unknown the wording falls back to
  `OPTIMIZER_VIDEO_SAMPLE_ORDER` rather than inventing any. The `media["fps"] = 1.0` the text
  encoder's video channel gets is a positional hint for the encoder, not a claim about the spacing —
  the words are what carry that.
- The editor toolbar's `⏏` (`POST /minimax_h3_easy/prompt_optimizer_unload`) frees whatever the
  configured backend holds: for `gguf` this process's cached `Llama` via `_optimizer_gguf_unload_now`,
  for the two OpenAI-shaped formats the model on the server via `_optimizer_remote_unload`. Which
  server that is, is answered by probing (`/api/v1/models` is LM Studio's, `/api/ps` is Ollama's,
  neither has the other's) rather than by a setting — they are the same endpoint for every other
  purpose. `gemini` and `clip` have nothing this route may free and the button is hidden for them.
  **`_OPTIMIZER_GGUF_BUSY` / `_optimizer_gguf_hold` exist because that button can arrive mid-run**:
  closing a `Llama` a worker thread is still generating with takes llama-cpp down with the process, so
  the route is refused (`busy`) instead, and the whole decision including `llm.close()` happens under
  `_OPTIMIZER_GGUF_LOCK`. The optimize route holds it across the describe pass and the final pass
  together, not per call.
- Cancelling a GGUF run releases the model (`_optimizer_gguf_release`) regardless of
  `gguf_unload_after`, from inside the worker thread — never from the `asyncio.CancelledError` handler,
  which returns while `asyncio.to_thread` is still generating.
- `read_media` applies to all three formats. For `clip` it runs `_optimizer_clip_descriptions`: **one
  describe generation per connected asset**, then the final prompt pass gets those descriptions as text and
  no media at all. A text encoder has a single slot per modality, so sending a whole H3 reference set at
  once is lossy — one shared image batch (mismatched sizes get stretched), Gemma's tokenizer ignoring
  `image` whenever `video` is set, one audio clip max. Per-asset passes sidestep all of it. Descriptions are
  labelled with the same tag the prompt uses, which is why `prompt_transform` takes the `tag_by_input` map
  from `_reference_conditioning` (and `_keyframe_labels` in image mode).
- `_optimizer_clip_media` still routes a *single* asset onto whatever argument the encoder has, probing with
  `_tokenizer_accepts`: every tokenizer takes `**kwargs`, so an unsupported media argument is *silently
  dropped* rather than raising, and the signature is the only reliable capability check. Qwen3-VL exposes
  `images=`, Gemma exposes `image=`/`video=`/`audio=`.
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
- `IS_CHANGED` returns `NaN` on `MiniMaxH3EasyModelAdapter` and `MiniMaxH3PromptOptimizer`; the loader
  returns its filename tuple so model choices cache correctly. `MiniMaxH3Easy` returns a **constant**
  `False` unless `optimize_on_run` is set, in which case it returns `NaN` — upstream reintroduced it for
  exactly that reason, and only that reason. The default path is therefore still "no `IS_CHANGED`": an
  unchanged graph reuses its conditioning instead of re-encoding every reference. Everything the node
  reads is a real input — the prompt widget is kept in sync by `syncPromptWidgetFromDocs` — so edits
  still invalidate the cache. Do not widen the `NaN` branch to make a UI change take effect; make that
  change reach an input instead.
- This repo is a fork. `README.md` and `README_CN.md` are kept byte-identical to upstream — do **not**
  edit them. Document every fork-only change in `README_fork.md` instead, and say there which upstream
  section it supersedes.
- Commit messages are short imperative one-liners ("Improve reference image sizing options").
