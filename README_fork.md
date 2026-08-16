# Fork changes

This is a fork of [`ComfyUI-MiniMaxH3-Easy`](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy).

[`README.md`](README.md) and [`README_CN.md`](README_CN.md) are kept identical to
upstream. Everything this fork adds or changes is documented here.

---

## Prompt tabs

The prompt editor holds **two stacked fields** — **Source** and **Optimized** —
and a row of **tabs** above them. Each tab is its own pair of prompts, so several
prompt ideas live in one node and are switched with a click.

```
[ Tab 1 ] [ ◀ Tab 2 ▶ × ] [ Tab 3 × ] [ + ]
Source
┌──────────────────────────────────────────┐
│ original text                            │
└──────────────────────────────────────────┘
Optimized ●
┌──────────────────────────────────────────┐
│ optimized text                           │
└──────────────────────────────────────────┘
```

- **Source** — the prompt you write. This is what prompt optimization reads.
- **Optimized** — the optimizer result, editable by hand like any other prompt.

Every tab keeps both fields, and all of it is saved with the workflow.

### Tabs

- `+` adds a tab and opens it (up to 20).
- Click a tab to switch to it; **double-click** its name to rename it.
- `×` deletes a tab, asking first when it still holds text. The node always
  keeps one tab, so deleting the last one empties it instead.
- `◀` `▶` on the open tab move it left or right.

### Which field is generated

Generation uses the open tab's **Optimized** field whenever it contains text,
and its **Source** field while that is empty:

| Source | Optimized | Prompt sent to MiniMax H3 |
| --- | --- | --- |
| text | empty | Source |
| text | text | Optimized |
| empty | text | Optimized |
| text | whitespace only | Source |

A small dot next to the field name marks the one that will be generated.
Clearing **Optimized** therefore returns generation to **Source**, and a tab
that never ran the optimizer always generates its original text. Only the open
tab is generated; the others are stored, not sent.

### Optimization behavior

This replaces the **Re-optimization** section of the upstream README.

`✦` always reads the open tab's **Source** field and writes the result into its
**Optimized** field. Consequences:

- Clicking `✦` again regenerates from the original text instead of rewriting a
  previous result.
- A hand-edited optimized prompt is never fed back in as the next optimizer
  input.
- If **Source** is empty, the **Optimized** text is optimized instead, so a
  prompt typed straight into that field is still usable.

Upstream instead inferred the source prompt by comparing the editor text with
the previous optimizer result; that heuristic is removed.

### Unloading the model

The prompt editor's toolbar carries an **⏏** button next to **✦** and
**</>**. It hands back whatever VRAM the configured optimizer backend is
holding, without touching the prompt:

- **GGUF** — frees this process's cached `Llama`. The model is kept loaded
  between clicks so a second optimization does not reload it, so with **Unload
  the model after use** off nothing ever frees it. Refused with a message while
  an optimization is running: closing a model llama-cpp is still generating with
  takes the process down with it.
- **OpenAI-compatible / OpenAI Responses** — asks the server to drop the
  configured model. Which request that is, is worked out from the server itself:
  LM Studio answers `/api/v1/models`, Ollama answers `/api/ps`, and neither has
  the other's route, so the probe *is* the detection. LM Studio is then told
  `/api/v1/models/unload`, Ollama is asked for a generation with `keep_alive: 0`.
  A plain OpenAI-compatible server (or a cloud endpoint) has nothing of the kind
  and says so. If the configured model is not resident, the reply names what is.
- **Gemini native / Text encoder** — the button is hidden. Gemini is a cloud
  endpoint with nothing to free, and the text encoder is ComfyUI's own model,
  which is ComfyUI's to unload rather than this pack's.

This matters here more than it would elsewhere: the optimizer's model and H3
itself compete for the same VRAM, and the optimizer runs from the editor, before
the graph is queued. This is the way to hand the card back before pressing Run.

### Stopping a running optimization

While a request is running, `✦` turns into a stop button (`■`). Pressing it ends
the wait immediately and leaves the prompt untouched — no error is reported,
since stopping is a choice rather than a failure. Closing the tab or removing
the node stops it the same way. A stopped **GGUF** run also unloads the model,
so the VRAM comes back rather than staying reserved for a generation nobody is
waiting for.

How much actually stops depends on the format:

- **GGUF** — generation stops mid-run, so the model releases the GPU right away.
  Loading the model and reading the prompt still run to completion first;
  llama-cpp offers no way to interrupt either, so a stop pressed during those
  phases takes effect once the first token is produced. **Describe media one at
  a time** shortens each of those phases considerably.
- **OpenAI-compatible / OpenAI Responses / Gemini** — an HTTP request already in
  flight cannot be interrupted, so the remote call finishes and may still be
  billed. Its answer is discarded.
- **Text encoder (clip input)** — no stop button, because it runs inside the
  workflow; use ComfyUI's own cancel instead.

Reading the connected references — whole files base64'd, every video decoded and
re-encoded frame by frame — happens on a worker thread rather than on ComfyUI's
event loop, so the stop button is answered immediately even during that phase
and the run ends as soon as it is done. Before, that work blocked the server and
a stop pressed while it ran did nothing until it finished.

This supersedes the stop button upstream places in the status strip. That one
only aborts the browser's fetch; it never tells the server, so a local GGUF run
would keep generating on a released-looking GPU. There is deliberately just the
one control, on `✦`.

### Editor details

- `@` media references, `#` dialogue blocks, and the `</>` raw prompt view work
  in both fields.
- Undo/redo is per field and restarts when you switch tabs, because one history
  stack cannot span two documents.
- An external `STRING` link on the `prompt` input still overrides both fields.
  No field is marked as generated while that link is connected.
- Tabs are disabled while an optimization request is running.
- Labels follow the existing localization: English, or Chinese in a Chinese
  browser.

### Compatibility

- Workflows saved before this change load their prompt into the first tab's
  **Source** field, so their generated prompt is unchanged. Prompts stored by
  the earlier two-tab version of this fork migrate into the first tab as well.
- The node's `prompt` widget value is kept equal to the prompt that would
  actually be generated, so the workflow still executes correctly if the web
  extension is disabled.
- Stored in the node properties:
  - `minimax_h3_prompt_tabs` — the tabs, each with a label and both documents.
  - `minimax_h3_prompt_tab_index` — the open tab.
  - The upstream `minimax_h3_prompt_reference_doc` property is read once for
    migration and then removed.
- The editor needs noticeably more height than upstream's single box (a tab row
  plus two labelled fields), so existing nodes grow to that minimum on load.

### Scope

Frontend only — `web/minimax_h3_easy_ui.js`. No Python node, input, or output
changed, so a browser refresh is enough to pick this up; no ComfyUI restart is
required.

---

## Prompt optimization with a local text encoder

**Prompt optimization settings → API format** gains a choice next to the HTTP
ones upstream provides (OpenAI Compatible, OpenAI Responses, Gemini Native):

> **Text encoder (clip input)**

It rewrites the prompt with a text encoder connected to the node instead of an
HTTP API, so no API URL, API key, model name, or network access is involved.

### The `optimizer_clip` input

The main node gains an optional **`optimizer_clip`** (`CLIP`) input, kept
separate from the H3 model bundle on purpose: it is the LLM that rewrites the
prompt, not one of the H3 generation models.

Connect an LLM-backed text encoder — the same kind ComfyUI's built-in
**Generate Text** node takes, e.g. a Gemma encoder from `CLIPLoader`. Generation
uses the standard ComfyUI pipeline (`clip.tokenize` → `clip.generate` →
`clip.decode`), so any encoder that node accepts works here. A plain CLIP that
cannot generate text raises a clear error instead of failing silently.

### Connected media

**Read connected media** works here as it does for the HTTP formats: with the
switch on the media wired to the node reaches the encoder, with it off only the
prompt text is sent.

It gets there as text. With the switch on, each connected asset is described by
the same encoder in **its own pass**, and the descriptions are then handed to the
prompt-writing pass as text:

```
=== CONNECTED MEDIA ===
<Picture 1>: a woman in a red coat standing under a shop awning, overcast daylight...
<Video 1>: a dog running left to right across wet asphalt, handheld camera following...
<Audio 1>: heavy rain with distant thunder, no speech
```

A text encoder exposes a single slot per modality, which makes sending a whole
H3 reference set at once lossy: images have to share one batch (so mismatched
sizes get stretched), a video channel can shadow the reference images entirely,
and only one audio clip fits. Describing one asset at a time removes all three
limits, and the final prompt-writing pass runs on text alone.

- Every description is labelled with the name the prompt itself uses — the
  resolved `<Picture N>` / `<Video N>` / `<Audio N>` tag in Reference Video mode,
  or `the first frame` / `the last frame` in I2V and first/last-frame mode — so
  the prompt writer can tie a detail to the right reference.
- A modality the encoder has no channel for is skipped rather than guessed at,
  and the guide's media evidence rule is told how many descriptions exist, so
  unlisted references are never invented.
- Video is sampled before it reaches the encoder, with the same rule as the
  chat formats (see *Video reference frames* below), capped at 8 frames through
  a native video channel and 12 stills in total otherwise.
- Each description is capped at 256 tokens, or `clip_max_length` when that is
  lower.

### When it runs

The encoder only exists while the graph is running, so `✦` cannot use it at edit
time. Clicking `✦` in this mode reports when optimization will happen instead of
sending a request.

Optimization runs **while the workflow executes**, and follows the same rule as
the prompt fields:

- It runs only while the open tab's **Optimized** field is empty.
- The result is used for that run and written back into that field, so the next
  queue reuses the stored text instead of regenerating it.
- To optimize again, clear the **Optimized** field and queue the workflow.

In **Reference Video** mode the optimization happens after `@` references are
resolved, so the encoder sees the official `<Picture N>` / `<Video N>` /
`<Audio N>` tags and its output goes straight to the H3 tokenizer.

Sampling is disabled, so the same prompt and encoder produce the same result on
every run.

### Settings

In this mode the settings popup hides the API URL, API key, and model rows and
shows instead:

- **Max generated tokens** (`clip_max_length`, default `1024`, range
  `16`–`32768`).

**Read connected media** stays visible and applies to every format, as does
**Video reference frames** (see *Reference videos over a chat API* below) once
it is on. All of these are stored in the same shared `prompt_optimizer.json`.

### Notes and limits

- The system prompt is the full H3 Prompt Guide bundle (roughly 18–45 KB of
  text depending on mode and selected scene guide). Local generation is
  therefore noticeably slower than an API call, and small encoders may follow
  the guide loosely. Selecting the **General only** Prompt Guide keeps it
  shortest.
- If this format is selected but nothing is connected to `optimizer_clip`, the
  prompt is used as typed and a warning is logged; the run is not failed.
- **Read connected media** costs one extra generation pass per connected asset,
  and decodes reference videos a second time (once for the encoder, once for
  H3's own conditioning). Leave it off if the workflow has many references and
  the prompt does not need them.
- A run started through the API without the web extension has no prompt-field
  state, so it optimizes on every run (the hidden `prompt_needs_optimization`
  input defaults to `true`).
- Requires a ComfyUI build whose `CLIP` object exposes `generate` / `decode`
  (the same requirement as the built-in **Generate Text** node).

### Scope

`nodes.py` and `web/minimax_h3_easy_ui.js`. This one adds a node input, so
**ComfyUI must be restarted**, not just refreshed.

---

## Prompt optimization with a GGUF model

**Prompt optimization settings → API format** gains a second local choice:

> **GGUF (llama-cpp-python)**

It rewrites the prompt with a GGUF model loaded through
[llama-cpp-python](https://github.com/abetlen/llama-cpp-python), so no API URL,
API key, or network access is involved. Unlike the text encoder format, the
model is loaded by the node itself, so `✦` works immediately in the editor —
nothing has to be queued.

### Models

Any `.gguf` under **`models/text_encoders`** or **`models/LLM`** is offered,
including subfolders and any extra roots `extra_model_paths.yaml` maps to those
keys. These are the same folders
[ComfyUI-QwenVL-F](https://github.com/id-fa/ComfyUI-QwenVL-F) scans, so a model
installed for one is found by the other.

`llama-cpp-python` is **not** installed by this node. If it is missing, the
optimizer says so instead of failing obscurely.

### Settings

Selecting this format replaces the API rows with:

- **GGUF model** — the file to load, from the scan above.
- **Vision projector (mmproj)** — `Auto` picks the first `*mmproj*.gguf` sitting
  next to the model; `None` disables vision; or name a file explicitly. Only
  used when **Read connected media** is on.
- **Context length** — `n_ctx`, default `16384`. The H3 Prompt Guide bundle is
  large (roughly 18–45 KB depending on mode and scene guide), so a small context
  will truncate it.
- **GPU layers** — `n_gpu_layers`, default `-1` (all layers on the GPU).
- **Max generated tokens** — shared with the text encoder format.
- **Unload the model after use** — frees it as soon as the prompt comes back,
  instead of keeping it resident for the next click. A **stopped** run unloads
  the model regardless of this setting.
- **Describe media one at a time** — see below. Only shown while **Read
  connected media** is on.

The model stays loaded between optimizations and is released automatically when
any of these settings change, or on demand with the **⏏** button described
below.

### Reasoning models

The optimizer's answer becomes the H3 prompt verbatim, so thinking is always
switched off — there is no toggle for it:

- Qwen-family models get the inline `/no_think` switch, and Qwen chat handlers
  are constructed with `force_reasoning=False`.
- Every chat request also carries `chat_template_kwargs.enable_thinking=false`,
  which newer Qwen templates read instead of `/no_think`. OpenAI-compatible
  servers (llama.cpp, vLLM, SGLang, LM Studio, Ollama) read the same field;
  Gemini gets `thinkingConfig.thinkingBudget=0` instead.
- The same `chat_template_kwargs` also carries `reasoning_effort=low`. Qwen3.8
  replaced the on/off switch with a depth and defaults it to `xhigh`, which is
  enough to spend an entire answer on the thought; `low` is the shallowest value
  its template accepts (`none` is not one of them). It is sent *in addition to*
  `enable_thinking`, since older templates only read that one, and a template
  that does not know the variable ignores it.
- An endpoint that rejects that unknown field (400/404/422) — or a llama-cpp
  build too old to accept the argument — gets the request again without it, so a
  stricter API still answers.
- Gemma takes none of them (its handler rejects the flag), so it relies on the
  cleanup below.
- Turn markers (`<|im_end|>`, `<end_of_turn>`, …) are passed as stop strings.
- Whatever a model emits anyway is cleaned up: everything up to and including
  the **last** closing `</think>` / `</thinking>` / `</reasoning>` is removed.
  The closing tag alone is enough on purpose — most Qwen chat templates
  *pre-open* `<think>` in the assistant turn, so the response starts with bare
  reasoning prose and the opening tag never appears in it. Harmony-style
  `<|channel|>final<|message|>` markers are handled the same way. An answer that
  is *only* an unterminated thought counts as empty and reports an error rather
  than feeding half a thought into the prompt. For the GGUF format that error
  now says what happened — the model spent the whole budget reasoning and never
  reached an answer — because "raise the answer length" is something the user
  can act on, and "empty" is not.

The same cleanup applies to the HTTP and text-encoder formats, so a reasoning
model behind an OpenAI-compatible endpoint cannot leak its thoughts either. The
text-encoder format additionally passes `thinking=False` to the tokenizer.

Reasoning that carries **no marker at all** ("Here's a thinking process: 1.
Analyze user input…" as plain text) cannot be separated from the prompt —
nothing says where it stops. If a model leaks like that despite the switches,
use its non-thinking variant.

### Connected media

**Read connected media** attaches the connected media exactly as the
OpenAI-compatible format does, since llama-cpp takes the same message shape:
images as-is, reference videos as sampled frames (see *Reference videos over a
chat API* below). This needs a multimodal GGUF **and** its mmproj projector; the
handler is chosen from the model's filename (Qwen, Gemma, MiniCPM, LLaVA)
against whatever `llama_cpp.llama_chat_format` provides in the installed build.
With no projector resolved, the prompt is optimized from text alone and a
warning is logged.

Audio references are not sent — llama-cpp has no channel for them.

### Describe media one at a time

**Describe media one at a time** switches the GGUF format to the same two-stage
shape the text encoder uses: each connected asset is described in its own pass,
and the prompt-writing pass then receives those descriptions as text with no
image attached.

```
=== CONNECTED MEDIA ===
<Picture 1>: a woman in a red coat standing under a shop awning, overcast daylight...
<Video 1>: a dog running left to right across wet asphalt, handheld camera following...
```

Each description is labelled with the tag the prompt itself uses, capped at 256
tokens, and produced with a two-line system prompt rather than the whole H3
Prompt Guide.

A reference video is described from its sampled frames as **one** asset. Audio
is skipped: llama-cpp has no channel for it at all. Every skip is named in the
log rather than passing silently.

Why this helps a local model in particular:

- **It responds to the stop button.** Attaching the whole reference set behind
  the full guide makes one very long prompt-evaluation phase, and nothing in
  llama-cpp can interrupt that — the editor looks frozen. Split up, every phase
  is short, and cancelling lands between assets as well as inside generation.
- **It fits in the context.** Media and the guide compete for `n_ctx` in a
  single request; separately, neither pass is close to the limit.
- **Attention is not divided.** The describing pass sees one asset and one
  instruction; the writing pass sees text only.

The cost is one extra generation per asset. With one image and a fast model the
combined format is often quicker anyway, because nothing has to evaluate a
guide-sized multimodal prompt.

It is **off by default**, so an existing setup keeps sending media with the
prompt.

The describing pass has a token budget of its own. A model whose reasoning
**cannot be switched off** — Gemma has no `/no_think` and its chat handler
rejects the flag — spends that budget on the thought, and an output cut off
mid-thought contains no description at all, since the closing marker never
arrives. Gemma-family models therefore get extra headroom on top of the 256
tokens (separate from the answer length, because it pays for text that is
discarded anyway).

Any other model that keeps thinking anyway gets the same headroom the moment it
costs a description: a vision chat handler renders no chat template, so neither
`enable_thinking` nor `reasoning_effort` reaches the model on that path and the
budget is the only thing left. The first asset lost to an unterminated thought
is retried with the headroom, and the rest of the run keeps the raised budget,
so only one pass is paid for the discovery.

If every description fails regardless, the run does **not** pretend no media was
connected: it logs a warning and falls back to attaching the media to the
prompt request, the way the format does when this switch is off.

### Scope

`nodes.py` and `web/minimax_h3_easy_ui.js`. Adds
`GET /minimax_h3_easy/gguf_models` for the model dropdown. Python changed, so
**restart ComfyUI**.

---

## Reference videos over a chat API

This applies to the **OpenAI-compatible** and **GGUF** formats, which speak the
chat-completions message shape. That shape has no video part, so upstream simply
dropped every reference video: with **Read connected media** on, a workflow
built around a video reference optimized its prompt as if nothing were attached.

A reference video is now sampled into stills and sent as those:

- **Candidates at 1 fps**, from which the **first frame**, the **last frame**
  and the frames that changed most are kept. How many in total is the **Video
  reference frames** setting below; the default is 4.
- **Long side capped at 768 px**, re-encoded as JPEG.
- Frames are **seeked, not decoded in sequence**, so a long reference video
  costs one seek per second rather than a full pass. Each seek then decodes
  forward to the frame actually asked for, because a seek only lands on the
  keyframe before it — without that, whole seconds collapse onto the same
  picture and there is no change left to measure. Files that report no duration
  or refuse to seek fall back to a strided sequential decode.
- Uses PyAV, which ComfyUI already requires. Without it, videos are skipped and
  a warning is logged, as before. Change is measured with Pillow, which ComfyUI
  already requires too, so there is still no new dependency.

Gemini is unaffected: it takes video natively, so the file is sent whole. (An
oversized video that cannot be inlined falls back to frames there too.)

### Video reference frames

**Video reference frames** (`video_sample`, **2**–**12**, default **4 frames**)
is how many stills one reference clip becomes. It appears in the settings popup
whenever **Read connected media** is on, and applies to every format.

Which frames those are is not an even split:

1. The clip is sampled at **1 fps** to get the candidates.
2. The **first** and the **last** candidate are always kept — where a reference
   clip starts and where it ends is what it is judged by.
3. The remaining budget (the setting minus those two) goes to the candidates
   that differ most from the frame before them, measured as the mean absolute
   difference of a small grayscale thumbnail.
4. The kept frames are sent in chronological order, **with their timestamps**
   (see *Telling the model what it received* below) — unevenly spaced frames
   presented as an even sequence would misstate the pacing of everything
   between them.

That last step is the point of the change. Evenly spaced frames spend the whole
budget on a shot that holds still and then walk straight past the cut, the
gesture or the camera move in the middle; scoring the change puts the frames
where something actually happens.

The candidate set itself is capped at **180 frames** (and spread evenly beyond
that), because every candidate costs a decode and a JPEG encode. A file whose
duration cannot be read falls back to a strided sequential decode rather than to
no frames at all.

The **local text encoder** format uses the same rule — it already has the
decoded frames, so it counts by frame index instead of seeking — but its own
limits still apply on top of it: that path runs in the same VRAM as the H3
model, so a video sent on a dedicated video channel keeps its 8-frame ceiling
and the stills of all references together keep their 12-frame one.

### Telling the model what it received

Several frames of one clip look exactly like several unrelated images. The
system prompt now ends with a manifest naming every attached part:

```
Actual media references attached to this request: 2.
Attached media parts, in order:
- <Picture 1>: 1 image
- <Video 1>: 4 still frames from one video clip, sampled at 0.0s / 5.0s / 6.0s /
  10.0s of a 10.0s clip. The spacing is uneven, so read the timestamps rather
  than assuming a constant interval. They are that single video reference, not
  separate images.
```

The timestamps are there because the selection above is deliberately uneven.
"In chronological order" was enough while the frames were evenly spaced; it is
not any more. `0.0s / 5.0s / 6.0s / 10.0s` is a shot that holds for five seconds
and then cuts — read as four equal steps, that becomes a slow continuous move
that never happened. The same line is given to the per-asset describe passes
(GGUF and text encoder), which see one clip at a time. A file whose duration
cannot be read falls back to the old wording rather than inventing times.

This also fixes a smaller problem that predates the video change: the model used
to receive an unlabelled pile of images with no way to tell which `<Picture N>`
each one was. The count is now **references**, not parts, so a sampled video
counts once.

### Scope

`nodes.py` and `web/minimax_h3_easy_ui.js`. Python changed, so **restart
ComfyUI.**

---

## Reference video soundtracks

Upstream's node takes a reference video's soundtrack as its own `AUDIO` input,
so its length is the user's choice. This fork reads the soundtrack out of the
connected `VIDEO` instead, which made it the one part of a reference video that
was **not** truncated to the generated length.

A reference video is now trimmed as a whole: its soundtrack is cut to the same
duration as the frames that survive the `5 + 17n` snap. Two consequences:

- Picture and sound stay aligned. A 60-second clip used for a 5-second
  generation no longer contributes 60 seconds of audio against 5 seconds of
  video.
- It no longer runs out of VRAM. The H3 audio VAE needs roughly **0.12 GB per
  second** of audio at 32 kHz (plus about 0.4 GB fixed), so a full-length
  soundtrack could ask for more memory than the whole generation.

Standalone `AUDIO` references are left untouched — their length is deliberate.

### The confusing error this replaces

When the audio VAE ran out of memory, ComfyUI retried the encode with its 2D
image tiler, which cannot take a 3D waveform, and the run died with:

```
IndexError: tuple index out of range
  File "comfy/sd.py", line 1105, in encode_tiled_
```

That names neither audio nor memory. The encode now reports the real cause and
the audio length instead, and logs the length of every reference soundtrack it
encodes.

### Scope

`nodes.py` only. **Restart ComfyUI.**

---

## "Optimize when workflow runs" and the local formats

Upstream 1.0.11 added an `optimize_on_run` switch to the prompt optimization
settings: when it is on, `MiniMaxH3Easy` rewrites the prompt over HTTP as part
of executing the node, and reports the result back to the editor.

This fork adds two local `api_format`s that upstream does not have — `clip` and
`gguf` — and neither of them has an API URL. Upstream's run-time path calls
`_optimizer_http_json` unconditionally, so with a local format selected it would
POST the request to whatever URL happened to be left in the shared settings.

In this fork `_optimize_prompt_on_run` therefore returns the prompt untouched
unless `api_format` is one of `OPTIMIZER_HTTP_FORMATS`, and the settings modal
hides the switch while a local format is selected. The local formats keep the
paths they already had:

| `api_format` | Where the prompt is optimized |
| --- | --- |
| `openai`, `responses`, `gemini` | The `✦` button, and `optimize_on_run` if it is on |
| `gguf` | The `✦` button (llama-cpp runs in the editor route) |
| `clip` | While the workflow runs, from `MiniMaxH3Easy.generate` |

This supersedes upstream's description of "Optimize when workflow runs" as
applying to every configured format.

### Scope

`nodes.py` and `web/minimax_h3_easy_ui.js`. **Restart ComfyUI and hard refresh.**
