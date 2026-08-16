import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_CLASS = "MiniMaxH3Easy";
const LOADER_CLASS = "MiniMaxH3EasyLoader";
const ADAPTER_CLASS = "MiniMaxH3EasyModelAdapter";
const OUTPUT_CLASS = "MiniMaxH3EasyOutput";
const LINKS_PROP = "minimax_h3_virtual_media_links";
const PROMPT_DOC_PROP = "minimax_h3_prompt_reference_doc";
const PROMPT_OPTIMIZED_DOC_PROP = "minimax_h3_prompt_optimized_doc";
const PROMPT_TABS_PROP = "minimax_h3_prompt_tabs";
const PROMPT_TAB_INDEX_PROP = "minimax_h3_prompt_tab_index";
const PROMPT_VIEW_PROP = "minimax_h3_prompt_view_mode";
const PROMPT_AUTO_MARKER_PROP = "minimax_h3_auto_prompt_marker";
const PROMPT_FIELD_SOURCE = "source";
const PROMPT_FIELD_OPTIMIZED = "optimized";
const PROMPT_FIELDS = [PROMPT_FIELD_SOURCE, PROMPT_FIELD_OPTIMIZED];
const PROMPT_TABS_HEIGHT = 21;
const PROMPT_FIELD_LABEL_HEIGHT = 14;
const PROMPT_FIELD_MIN_HEIGHT = 44;
const PROMPT_TAB_LABEL_LIMIT = 24;
const PROMPT_TAB_LIMIT = 20;
const PROMPT_OPTIMIZER_SETTINGS_ENDPOINT = "/minimax_h3_easy/prompt_optimizer_settings";
const PROMPT_OPTIMIZER_EVENT = "minimax_h3_easy/prompt_optimized";
const PROMPT_OPTIMIZER_GGUF_ENDPOINT = "/minimax_h3_easy/gguf_models";
const OPTIMIZER_FORMAT_OPENAI = "openai";
const OPTIMIZER_FORMAT_RESPONSES = "responses";
const OPTIMIZER_FORMAT_GEMINI = "gemini";
const OPTIMIZER_FORMAT_CLIP = "clip";
const OPTIMIZER_FORMAT_GGUF = "gguf";
const OPTIMIZER_FORMATS = [
    OPTIMIZER_FORMAT_OPENAI,
    OPTIMIZER_FORMAT_RESPONSES,
    OPTIMIZER_FORMAT_GEMINI,
    OPTIMIZER_FORMAT_CLIP,
    OPTIMIZER_FORMAT_GGUF,
];
const LOCAL_MAX_LENGTH_DEFAULT = 1024;
const LOCAL_MIN_LENGTH = 16;
const LOCAL_MAX_LENGTH_LIMIT = 32768;
const GGUF_MMPROJ_AUTO = "auto";
const GGUF_MMPROJ_NONE = "none";
const GGUF_CONTEXT_DEFAULT = 16384;
const GGUF_CONTEXT_MIN = 512;
const GGUF_CONTEXT_LIMIT = 1048576;
const PROMPT_OPTIMIZER_SETTINGS_DEFAULTS = Object.freeze({
    api_format: OPTIMIZER_FORMAT_OPENAI,
    api_url: "",
    api_key: "",
    model: "",
    read_media: false,
    optimize_on_run: false,
    local_max_length: LOCAL_MAX_LENGTH_DEFAULT,
    gguf_model: "",
    gguf_mmproj: GGUF_MMPROJ_AUTO,
    gguf_context: GGUF_CONTEXT_DEFAULT,
    gguf_gpu_layers: -1,
    gguf_unload_after: false,
    gguf_describe_media: false,
});
let promptOptimizerSettingsCache = { ...PROMPT_OPTIMIZER_SETTINGS_DEFAULTS };
let promptOptimizerSettingsLoaded = false;
let promptOptimizerSettingsPromise = null;
let promptOptimizerSettingsModal = null;
const RUNTIME_REF_PREFIX = "__MINIMAX_H3_REF_";
const UNRESOLVED_REF_PREFIX = "__MINIMAX_H3_UNRESOLVED_REF_";
const DIALOGUE_CLASS = "h3-dialogue-block";
const PROMPT_VIEW_STRUCTURED = "structured";
const PROMPT_VIEW_RAW = "raw";
const PROMPT_GUIDES = [
    { value: "none", zh: "\u4ec5\u901a\u7528\u65b9\u6848", en: "General only" },
    { value: "3d_animation_short", zh: "3D \u52a8\u753b\u77ed\u7247", en: "3D Animation Short" },
    { value: "brand_promo", zh: "\u54c1\u724c\u5ba3\u4f20\u7247", en: "Brand Promo Video" },
    { value: "coop_game_intro", zh: "\u5408\u4f5c\u6e38\u620f\u5f00\u573a", en: "Co-op Game Intro" },
    { value: "handdrawn_live", zh: "\u624b\u7ed8\u5b9e\u62cd\u878d\u5408", en: "Hand-drawn Live-action" },
    { value: "minimalist_product_ad", zh: "\u6781\u7b80\u4ea7\u54c1\u5e7f\u544a", en: "Minimalist Product Ad" },
    { value: "music_video_subtitle", zh: "\u97f3\u4e50\u89c6\u9891\u5b57\u5e55", en: "Music Video Subtitle" },
    { value: "paper_collage", zh: "\u7eb8\u5f20\u62fc\u8d34\u89e3\u8bf4", en: "Paper Collage Explainer" },
    { value: "papercraft_stop_motion", zh: "\u7eb8\u827a\u5b9a\u683c\u89e3\u8bf4", en: "Papercraft Stop-motion" },
];
const MODE_IMAGE = "image";
const MODE_REFERENCE = "reference";
const KEYFRAME_FIRST = "first";
const RESOLUTION_CUSTOM = "custom";
const REF_IMAGE_MATCH = "match";
const REF_IMAGE_1K = "1k";
const REF_IMAGE_15K = "1.5k";
const REF_IMAGE_2K = "2k";
const REF_IMAGE_ORIGINAL = "original";
const MAX_MEDIA = 15;
const MIN_SECONDS = 0.2;
const MAX_SECONDS = 30;
const PROMPT_HISTORY_LIMIT = 120;
const PROMPT_UNDO_VERSION = "2026-08-05-editor-undo-shield-v1";
const CARET_SENTINEL = "\u200B";
const AUDIO_ICON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='0.5' y='10' width='3' height='4' rx='1.5' fill='%2300e2bb'/%3E%3Crect x='5.5' y='7' width='3' height='10' rx='1.5' fill='%2300e2bb'/%3E%3Crect x='10.5' y='4' width='3' height='16' rx='1.5' fill='%2300e2bb'/%3E%3Crect x='15.5' y='7' width='3' height='10' rx='1.5' fill='%2300e2bb'/%3E%3Crect x='20.5' y='10' width='3' height='4' rx='1.5' fill='%2300e2bb'/%3E%3C/svg%3E";
const PRIMARY_BROWSER_LANGUAGE = String(globalThis.navigator?.language || globalThis.navigator?.languages?.[0] || "");
const ZH_BROWSER = /^(zh)(?:[-_]|$)/i.test(PRIMARY_BROWSER_LANGUAGE);
const TEXT = {
    image: ZH_BROWSER ? "\u56fe\u7247" : "Image",
    video: ZH_BROWSER ? "\u89c6\u9891" : "Video",
    audio: ZH_BROWSER ? "\u97f3\u9891" : "Audio",
    loadImage: ZH_BROWSER ? "\u52a0\u8f7d\u56fe\u7247" : "Load image",
    loadVideo: ZH_BROWSER ? "\u52a0\u8f7d\u89c6\u9891" : "Load video",
    loadAudio: ZH_BROWSER ? "\u52a0\u8f7d\u97f3\u9891" : "Load audio",
    deleteLink: ZH_BROWSER ? "\u5220\u9664" : "Delete",
    promptPlaceholder: "Prompt...",
    rawPromptPlaceholder: ZH_BROWSER ? "\u539f\u59cb\u63d0\u793a\u8bcd..." : "Raw prompt...",
    promptTabPrefix: ZH_BROWSER ? "\u6807\u7b7e" : "Tab",
    promptTabAdd: ZH_BROWSER ? "\u65b0\u5efa\u6807\u7b7e" : "New tab",
    promptTabRemove: ZH_BROWSER ? "\u5220\u9664\u6807\u7b7e" : "Delete tab",
    promptTabRemoveConfirm: ZH_BROWSER ? "\u786e\u5b9a\u5220\u9664\u8be5\u6807\u7b7e\u7684\u63d0\u793a\u8bcd\uff1f" : "Delete this tab and its prompts?",
    promptTabMoveLeft: ZH_BROWSER ? "\u5de6\u79fb" : "Move left",
    promptTabMoveRight: ZH_BROWSER ? "\u53f3\u79fb" : "Move right",
    promptTabRenameHint: ZH_BROWSER ? "\u53cc\u51fb\u91cd\u547d\u540d" : "Double-click to rename",
    promptFieldSource: ZH_BROWSER ? "\u539f\u6587" : "Source",
    promptFieldOptimized: ZH_BROWSER ? "\u4f18\u5316\u540e" : "Optimized",
    promptFieldSourceHint: ZH_BROWSER
        ? "\u539f\u6587\uff1a\u63d0\u793a\u8bcd\u4f18\u5316\u7684\u8f93\u5165\uff0c\u59cb\u7ec8\u4fdd\u7559"
        : "Source prompt: the optimizer input, always kept",
    promptFieldOptimizedHint: ZH_BROWSER
        ? "\u4f18\u5316\u540e\u7684\u63d0\u793a\u8bcd\uff1a\u4e3a\u7a7a\u65f6\u4f7f\u7528\u539f\u6587"
        : "Optimized prompt: the source is used while this is empty",
    promptFieldEffective: ZH_BROWSER ? "\u5f53\u524d\u7528\u4e8e\u751f\u6210" : "Used for generation",
    optimizedPromptPlaceholder: ZH_BROWSER
        ? "\u4f18\u5316\u540e\u7684\u63d0\u793a\u8bcd...\uff08\u7559\u7a7a\u5219\u4f7f\u7528\u539f\u6587\uff09"
        : "Optimized prompt... (empty uses the source)",
    showRawPrompt: ZH_BROWSER ? "\u663e\u793a\u539f\u59cb\u63d0\u793a\u8bcd" : "Show raw prompt",
    showStructuredPrompt: ZH_BROWSER ? "\u8fd4\u56de\u7ed3\u6784\u5316\u7f16\u8f91" : "Back to structured editor",
    optimizePrompt: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u4f18\u5316" : "Prompt optimization",
    regeneratePrompt: ZH_BROWSER ? "\u91cd\u65b0\u751f\u6210" : "Regenerate",
    optimizerSettings: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u4f18\u5316\u8bbe\u7f6e" : "Prompt optimization settings",
    settingsOpen: ZH_BROWSER ? "\u6253\u5f00\u63d0\u793a\u8bcd\u4f18\u5316 API \u8bbe\u7f6e" : "Open prompt optimization API settings",
    settingsSave: ZH_BROWSER ? "\u4fdd\u5b58" : "Save",
    settingsCancel: ZH_BROWSER ? "\u53d6\u6d88" : "Cancel",
    settingsClose: ZH_BROWSER ? "\u5173\u95ed" : "Close",
    settingsSaved: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u4f18\u5316 API \u8bbe\u7f6e\u5df2\u4fdd\u5b58" : "Prompt optimization API settings saved",
    settingsLoadFailed: ZH_BROWSER ? "\u65e0\u6cd5\u8bfb\u53d6\u63d0\u793a\u8bcd\u4f18\u5316 API \u8bbe\u7f6e" : "Unable to load prompt optimization API settings",
    apiFormat: ZH_BROWSER ? "API \u683c\u5f0f" : "API format",
    apiUrl: ZH_BROWSER ? "API \u5730\u5740" : "API URL",
    apiKey: "API Key",
    apiModel: ZH_BROWSER ? "\u6a21\u578b\u540d" : "Model",
    localMaxLength: ZH_BROWSER ? "\u751f\u6210\u4e0a\u9650 (tokens)" : "Max generated tokens",
    ggufModel: ZH_BROWSER ? "GGUF \u6a21\u578b" : "GGUF model",
    ggufMmproj: ZH_BROWSER ? "\u89c6\u89c9\u6295\u5f71 (mmproj)" : "Vision projector (mmproj)",
    ggufContext: ZH_BROWSER ? "\u4e0a\u4e0b\u6587\u957f\u5ea6" : "Context length",
    ggufGpuLayers: ZH_BROWSER ? "GPU \u5c42\u6570 (-1 = \u5168\u90e8)" : "GPU layers (-1 = all)",
    ggufUnload: ZH_BROWSER ? "\u7528\u5b8c\u540e\u5378\u8f7d\u6a21\u578b" : "Unload the model after use",
    ggufDescribe: ZH_BROWSER ? "\u9010\u4e2a\u63cf\u8ff0\u5a92\u4f53" : "Describe media one at a time",
    ggufAuto: ZH_BROWSER ? "\u81ea\u52a8\uff08\u6a21\u578b\u65c1\u7684 mmproj\uff09" : "Auto (mmproj next to the model)",
    ggufNone: ZH_BROWSER ? "\u4e0d\u4f7f\u7528" : "None",
    ggufEmpty: ZH_BROWSER ? "\u672a\u627e\u5230 .gguf \u6587\u4ef6" : "No .gguf file found",
    ggufMissing: ZH_BROWSER ? "\u8bf7\u5148\u5728\u8bbe\u7f6e\u4e2d\u9009\u62e9 GGUF \u6a21\u578b\u3002" : "Select a GGUF model in the settings first.",
    ggufHint: ZH_BROWSER
        ? "\u901a\u8fc7 llama-cpp-python \u52a0\u8f7d models/text_encoders \u6216 models/LLM \u4e0b\u7684 GGUF \u6a21\u578b\uff0c\u4e0d\u9700\u8981 API\u3002\u8bfb\u53d6\u5df2\u8fde\u63a5\u5a92\u4f53\u9700\u8981\u914d\u5957\u7684 mmproj \u89c6\u89c9\u6295\u5f71\u6587\u4ef6\u3002"
        : "Loads a GGUF from models/text_encoders or models/LLM through llama-cpp-python; no API involved. Reading connected media needs a matching mmproj vision projector.",
    optimizerClip: ZH_BROWSER ? "\u4f18\u5316\u5668\u6587\u672c\u7f16\u7801\u5668" : "Optimizer text encoder",
    optimizerClipHint: ZH_BROWSER
        ? "\u4f7f\u7528\u8fde\u63a5\u5230 optimizer_clip \u8f93\u5165\u7684\u6587\u672c\u7f16\u7801\u5668\u3002\u8be5\u7f16\u7801\u5668\u53ea\u5728\u5de5\u4f5c\u6d41\u8fd0\u884c\u65f6\u5b58\u5728\uff0c\u56e0\u6b64\u63d0\u793a\u8bcd\u4f18\u5316\u4f1a\u5728\u961f\u5217\u6267\u884c\u65f6\u8fdb\u884c\uff0c\u800c\u4e0d\u662f\u70b9\u51fb\u65f6\u3002\u5f00\u542f\u4e0b\u65b9\u5f00\u5173\u540e\uff0c\u6bcf\u4e2a\u5df2\u8fde\u63a5\u7d20\u6750\u4f1a\u5148\u7531\u8be5\u7f16\u7801\u5668\u9010\u4e2a\u751f\u6210\u63cf\u8ff0\uff0c\u518d\u4f5c\u4e3a\u6587\u672c\u968f\u63d0\u793a\u8bcd\u4e00\u8d77\u4f7f\u7528\u3002"
        : "Uses the text encoder connected to the optimizer_clip input. That encoder only exists while the workflow runs, so the prompt is optimized when the workflow is queued, not on click. With the switch below on, each connected asset is described by the encoder one at a time and those descriptions are passed along as text.",
    optimizerDeferred: ZH_BROWSER
        ? "\u5df2\u9009\u62e9\u6587\u672c\u7f16\u7801\u5668\u683c\u5f0f\uff1a\u8fd0\u884c\u5de5\u4f5c\u6d41\u65f6\u4f1a\u81ea\u52a8\u4f18\u5316\u63d0\u793a\u8bcd\uff0c\u5e76\u5199\u5165\u5f53\u524d\u6807\u7b7e\u9875\u7684\u201c\u4f18\u5316\u540e\u201d\u3002"
        : "Text encoder format selected: the prompt is optimized when the workflow runs, and the result lands in the open tab's Optimized field.",
    optimizerClipMissing: ZH_BROWSER
        ? "\u8bf7\u5148\u5c06\u6587\u672c\u7f16\u7801\u5668\u8fde\u63a5\u5230 optimizer_clip \u8f93\u5165\u3002"
        : "Connect a text encoder to the optimizer_clip input first.",
    promptGuide: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u65b9\u6848" : "Prompt Guide",
    readMedia: ZH_BROWSER ? "\u8bfb\u53d6\u5df2\u8fde\u63a5\u5a92\u4f53" : "Read connected media",
    optimizeOnRun: ZH_BROWSER ? "\u8fd0\u884c\u5de5\u4f5c\u6d41\u65f6\u81ea\u52a8\u4f18\u5316" : "Optimize when workflow runs",
    optimizerMissing: ZH_BROWSER ? "\u8bf7\u586b\u5199 API \u5730\u5740\u548c\u6a21\u578b\u540d\uff1bGemini \u539f\u751f\u8fd8\u9700\u8981 API Key\u3002" : "Enter the API URL and model; Gemini Native also requires an API key.",
    optimizerFailed: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u4f18\u5316\u5931\u8d25" : "Prompt optimization failed",
    optimizerRunning: ZH_BROWSER ? "\u6b63\u5728\u4f18\u5316" : "Optimizing",
    // Upstream's `optimizerCancel` is deliberately absent: its status-strip stop
    // button only aborts the fetch, while this fork's \u2726 toggle also tells the
    // server, so two stop controls would differ in what they actually stop.
    optimizerStop: ZH_BROWSER ? "\u505c\u6b62\u63d0\u793a\u8bcd\u4f18\u5316" : "Stop prompt optimization",
    optimizerCancelled: ZH_BROWSER ? "\u5df2\u505c\u6b62\u63d0\u793a\u8bcd\u4f18\u5316" : "Prompt optimization stopped",
    optimizerDone: ZH_BROWSER ? "\u4f18\u5316\u5b8c\u6210" : "Optimization complete",
    optimizerError: ZH_BROWSER ? "\u4f18\u5316\u5931\u8d25" : "Optimization failed",
    promptExternalConnected: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u6765\u81ea\u5916\u90e8\u6587\u672c\u8fde\u63a5" : "Prompt supplied by external text input",
    referencePromptPlaceholder: ZH_BROWSER ? "Prompt... \u8f93\u5165 @ \u5f15\u7528\u5df2\u8fde\u63a5\u7d20\u6750" : "Prompt... Type @ to reference connected media",
    mentionTitle: ZH_BROWSER ? "\u5f15\u7528\u7d20\u6750" : "Reference media",
    mentionEmpty: ZH_BROWSER ? "\u5148\u5c06\u7d20\u6750\u8fde\u63a5\u5230\u4e3b\u8282\u70b9" : "Connect media to the main node first",
    mainTitle: "MiniMax H3 Easy",
    loaderTitle: ZH_BROWSER ? "MiniMax H3 Easy \u52a0\u8f7d\u5668" : "MiniMax H3 Easy Loader",
    adapterTitle: ZH_BROWSER ? "MiniMax H3 Easy \u6a21\u578b\u4e2d\u8f6c" : "MiniMax H3 Easy Model Bridge",
    outputTitle: ZH_BROWSER ? "MiniMax H3 Easy \u8f93\u51fa" : "MiniMax H3 Easy Output",
    category: "MiniMax H3 Easy",
    mode: ZH_BROWSER ? "\u6a21\u5f0f" : "Mode",
    prompt: ZH_BROWSER ? "\u63d0\u793a\u8bcd" : "Prompt",
    resolution: ZH_BROWSER ? "\u5206\u8fa8\u7387" : "Resolution",
    aspectRatio: ZH_BROWSER ? "\u5bbd\u9ad8\u6bd4" : "Aspect ratio",
    width: ZH_BROWSER ? "\u5bbd\u5ea6" : "Width",
    height: ZH_BROWSER ? "\u9ad8\u5ea6" : "Height",
    seconds: ZH_BROWSER ? "\u79d2\u6570" : "Seconds",
    advanced: ZH_BROWSER ? "\u9ad8\u7ea7\u9009\u9879" : "Advanced options",
    promptOptimizerSettings: ZH_BROWSER ? "\u6253\u5f00\u63d0\u793a\u8bcd\u4f18\u5316 API \u8bbe\u7f6e" : "Optimizer settings",
    promptOptimizerSceneGuide: ZH_BROWSER ? "\u63d0\u793a\u8bcd\u65b9\u6848" : "Prompt Guide",
    fps: ZH_BROWSER ? "\u5e27\u7387 (FPS)" : "Frame rate (FPS)",
    keyframeRole: ZH_BROWSER ? "\u9996\u5c3e\u5e27\u8bbe\u7f6e" : "First/last frame setup",
    refImageSize: ZH_BROWSER ? "\u53c2\u8003\u56fe\u5c3a\u5bf8" : "Reference size",
    referenceMentionMode: ZH_BROWSER ? "@\u5f15\u7528\u65b9\u5f0f" : "@ reference mode",
    mentionByFilename: ZH_BROWSER ? "\u6309\u6587\u4ef6\u540d" : "By filename",
    mentionByIndex: ZH_BROWSER ? "\u6309\u5e8f\u53f7" : "By index",
    bundle: ZH_BROWSER ? "H3 \u6a21\u578b\u7ec4\u5408" : "H3 model bundle",
    fl2vaModel: ZH_BROWSER ? "FL2VA \u6a21\u578b" : "FL2VA model",
    ref2vaModel: ZH_BROWSER ? "REF2VA \u6a21\u578b" : "REF2VA model",
    textEncoder: ZH_BROWSER ? "\u6587\u672c\u7f16\u7801\u5668" : "Text encoder",
    videoVae: ZH_BROWSER ? "\u89c6\u9891 VAE" : "Video VAE",
    audioVae: ZH_BROWSER ? "\u97f3\u9891 VAE" : "Audio VAE",
    noneModel: ZH_BROWSER ? "\u65e0" : "None",
    outputModel: "Model",
    outputConditioning: "Conditioning",
    outputLatent: "Latent",
    outputVideoVae: "Video VAE",
    outputAudioVae: "Audio VAE",
    outputFps: "FPS",
    outputContext: "H3 Context",
    inputMedia: "Media",
};
const OPTION_DEFS = {
    mode: {
        [MODE_IMAGE]: ZH_BROWSER ? "\u56fe\u751f\u6216\u9996\u5c3e\u5e27" : "I2V or First/Last Frame",
        [MODE_REFERENCE]: ZH_BROWSER ? "\u53c2\u8003\u751f\u89c6\u9891" : "Reference-to-video",
    },
    keyframe_role: {
        first: ZH_BROWSER ? "\u9996\u5e27\u4f18\u5148" : "First frame priority",
        last: ZH_BROWSER ? "\u5c3e\u5e27\u4f18\u5148" : "Last frame priority",
    },
    ref_image_size: {
        [REF_IMAGE_MATCH]: ZH_BROWSER ? "\u5339\u914d\u751f\u6210\u5206\u8fa8\u7387" : "Match generation size",
        [REF_IMAGE_1K]: ZH_BROWSER ? "1K \u9762\u79ef\uff08\u7ea61MP\uff09" : "1K area (~1MP)",
        [REF_IMAGE_15K]: ZH_BROWSER ? "1.5K \u9762\u79ef\uff08\u7ea62.25MP\uff09" : "1.5K area (~2.25MP)",
        [REF_IMAGE_2K]: ZH_BROWSER ? "2K \u9762\u79ef\uff08\u7ea64MP\uff09" : "2K area (~4MP)",
        [REF_IMAGE_ORIGINAL]: ZH_BROWSER ? "\u539f\u56fe\uff08\u4e0d\u7f29\u653e\uff09" : "Original (no scaling)",
    },
    reference_mention_mode: {
        filename: ZH_BROWSER ? "\u6309\u6587\u4ef6\u540d" : "By filename",
        index: ZH_BROWSER ? "\u6309\u5e8f\u53f7" : "By index",
    },
    prompt_optimizer_api_format: {
        openai: ZH_BROWSER ? "OpenAI \u517c\u5bb9" : "OpenAI Compatible",
        responses: "OpenAI Responses",
        gemini: ZH_BROWSER ? "Gemini \u539f\u751f" : "Gemini Native",
        clip: ZH_BROWSER ? "\u6587\u672c\u7f16\u7801\u5668\uff08clip \u8f93\u5165\uff09" : "Text encoder (clip input)",
        gguf: ZH_BROWSER ? "GGUF\uff08llama-cpp-python\uff09" : "GGUF (llama-cpp-python)",
    },
    prompt_optimizer_scene_guide: {
        none: ZH_BROWSER ? "\u4ec5\u901a\u7528\u65b9\u6848" : "General only",
    },
    resolution: {
        "360P": "360P",
        "416P": "416P",
        "480P": "480P",
        "540P": "540P",
        "640P": "640P",
        "720P": "720P",
        "768P": "768P",
        "832P": "832P",
        "928P": "928P",
        "1024P": "1024P",
        "1080P": "1080P",
        [RESOLUTION_CUSTOM]: "Custom",
    },
    aspect_ratio: {
        "1:1": "1:1",
        "2:3": "2:3",
        "3:2": "3:2",
        "3:4": "3:4",
        "4:3": "4:3",
        "9:16": "9:16",
        "16:9": "16:9",
        "21:9": "21:9",
    },
};
const OPTION_ALIASES = {
    mode: {
        [MODE_IMAGE]: MODE_IMAGE,
        "\u56fe\u751f\u6216\u9996\u5c3e\u5e27": MODE_IMAGE,
        "\u56fe\u751f\u6216\u9996\u5c3e\u5e27\u89c6\u9891": MODE_IMAGE,
        "I2V or First/Last Frame": MODE_IMAGE,
        [MODE_REFERENCE]: MODE_REFERENCE,
        "\u53c2\u8003\u751f\u89c6\u9891": MODE_REFERENCE,
        "Reference-to-video": MODE_REFERENCE,
    },
    keyframe_role: {
        first: "first",
        "\u9996\u5e27\u4f18\u5148": "first",
        "First frame priority": "first",
        last: "last",
        "\u5c3e\u5e27\u4f18\u5148": "last",
        "Last frame priority": "last",
    },
    ref_image_size: {
        [REF_IMAGE_MATCH]: REF_IMAGE_MATCH,
        "\u5339\u914d\u751f\u6210\u5206\u8fa8\u7387": REF_IMAGE_MATCH,
        "Match generation size": REF_IMAGE_MATCH,
        [REF_IMAGE_1K]: REF_IMAGE_1K,
        "\u77ed\u8fb9\u6700\u59271K\u50cf\u7d20": REF_IMAGE_1K,
        "Max 1K Short Edge": REF_IMAGE_1K,
        "1K \u9762\u79ef\uff08\u7ea61MP\uff09": REF_IMAGE_1K,
        "1K area (~1MP)": REF_IMAGE_1K,
        [REF_IMAGE_15K]: REF_IMAGE_15K,
        "1.5K \u9762\u79ef\uff08\u7ea62.25MP\uff09": REF_IMAGE_15K,
        "1.5K area (~2.25MP)": REF_IMAGE_15K,
        [REF_IMAGE_2K]: REF_IMAGE_2K,
        "\u77ed\u8fb9\u6700\u59272K\u50cf\u7d20": REF_IMAGE_2K,
        "Max 2K Short Edge": REF_IMAGE_2K,
        "2K \u9762\u79ef\uff08\u7ea64MP\uff09": REF_IMAGE_2K,
        "2K area (~4MP)": REF_IMAGE_2K,
        [REF_IMAGE_ORIGINAL]: REF_IMAGE_ORIGINAL,
        "\u539f\u56fe\uff08\u4e0d\u7f29\u653e\uff09": REF_IMAGE_ORIGINAL,
        "Original (no scaling)": REF_IMAGE_ORIGINAL,
    },
    reference_mention_mode: {
        filename: "filename",
        "\u6309\u6587\u4ef6\u540d": "filename",
        "By filename": "filename",
        index: "index",
        "\u6309\u5e8f\u53f7": "index",
        "By index": "index",
    },
};
const COLOR_IMAGE = "#5aa9f0";
const COLOR_LINK_BORDER = "rgba(0,0,0,0.5)";
const COMFY_NATIVE_LINK_COLOR = "#9A9";
const LABELS = {
    image: TEXT.image,
    video: TEXT.video,
    audio: TEXT.audio,
};
const LOADERS = {
    image: { classType: "LoadImage", label: TEXT.loadImage },
    video: { classType: "LoadVideo", label: TEXT.loadVideo },
    audio: { classType: "LoadAudio", label: TEXT.loadAudio },
};

let installed = false;
let patchedCanvas = false;
let patchedPrompt = false;
let linkMenu = null;
let createMenu = null;
let quickCreateCaptureCanvas = null;
let quickCreateCaptureCleanup = null;
let activePromptNode = null;
let lastCapturedDropAt = 0;
let deferredCreateMenuPending = false;
let deferredCreateMenuToken = 0;
const videoThumbnailCache = new Map();
let mentionPreviewRefreshTimer = null;
let suppressNativeDropUntil = 0;
let nativeSearchSuppressStyle = null;
let releaseCreateMenuLinkHold = null;
let nativeThemeWatcherInstalled = false;
let lastVueNodesMode = null;

function nodeMatchesClass(node, className, displayName, installedMarker) {
    if (!node) return false;
    if (node.constructor?.prototype?.[installedMarker]) return true;
    const candidates = [
        node.comfyClass,
        node.type,
        node.constructor?.comfyClass,
        node.constructor?.type,
        node.constructor?.nodeData?.name,
        node.constructor?.nodeData?.display_name,
        node.title,
    ];
    return candidates.some((value) => value != null && [className, displayName].includes(String(value)));
}

function isTarget(node) {
    return nodeMatchesClass(node, NODE_CLASS, TEXT.mainTitle, "__h3EasyNodeInstalled");
}

function isLoader(node) {
    return nodeMatchesClass(node, LOADER_CLASS, TEXT.loaderTitle, "__h3EasyLoaderInstalled");
}

function isAdapter(node) {
    return nodeMatchesClass(node, ADAPTER_CLASS, TEXT.adapterTitle, "__h3EasyAdapterInstalled");
}

function isOutput(node) {
    return nodeMatchesClass(node, OUTPUT_CLASS, TEXT.outputTitle, "__h3EasyOutputInstalled");
}

function canonicalOption(name, value) {
    const raw = String(value ?? "");
    const alias = OPTION_ALIASES[name]?.[raw];
    if (alias !== undefined) return alias;
    const definition = OPTION_DEFS[name];
    if (definition) {
        for (const [key, label] of Object.entries(definition)) {
            if (raw === key || raw === label) return key;
        }
    }
    return raw;
}

function canonicalPromptGuide(value) {
    const raw = String(value ?? "");
    const found = PROMPT_GUIDES.find((item) => raw === item.value || raw === item.zh || raw === item.en);
    return found?.value || "none";
}

function localizeComboWidget(widget) {
    const name = String(widget?.name || "");
    if (name === "prompt_optimizer_scene_guide") {
        const current = canonicalPromptGuide(widget?.value);
        widget.options ||= {};
        widget.options.values = PROMPT_GUIDES.map((item) => ZH_BROWSER ? item.zh : item.en);
        widget.value = PROMPT_GUIDES.find((item) => item.value === current)?.[ZH_BROWSER ? "zh" : "en"] || widget.value;
        widget.__h3PromptGuideLocalized = true;
        return;
    }
    const definition = OPTION_DEFS[name];
    if (!widget || !definition) return;
    const current = canonicalOption(name, widget.value);
    widget.__h3OptionName = name;
    widget.options ||= {};
    widget.options.values = Object.values(definition);
    widget.value = definition[current] ?? widget.value;
}

function isNoneModelValue(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "none" || normalized === "\u65e0";
}

function localizeOptionalModelWidget(widget) {
    if (!widget) return;
    widget.options ||= {};
    const values = Array.isArray(widget.options.values) ? widget.options.values : [];
    widget.options.values = [...new Set(values.map((value) => isNoneModelValue(value) ? TEXT.noneModel : value))];
    if (isNoneModelValue(widget.value)) widget.value = TEXT.noneModel;
}

function setLocalizedSlotLabel(slot, label) {
    if (!slot || !label) return;
    slot.label = label;
    slot.localized_name = label;
}

function localizeNodeInstance(node) {
    if (!node) return;
    if (isLoader(node)) {
        node.title = TEXT.loaderTitle;
        const labels = { fl2va_model: TEXT.fl2vaModel, ref2va_model: TEXT.ref2vaModel, text_encoder: TEXT.textEncoder, video_vae: TEXT.videoVae, audio_vae: TEXT.audioVae };
        for (const widget of node.widgets || []) {
            if (labels[widget.name]) widget.label = labels[widget.name];
            if (widget.name === "fl2va_model" || widget.name === "ref2va_model") localizeOptionalModelWidget(widget);
        }
        for (const input of node.inputs || []) if (labels[input.name]) setLocalizedSlotLabel(input, labels[input.name]);
        return;
    }
    if (isAdapter(node)) {
        node.title = TEXT.adapterTitle;
        const labels = { fl2va_model: TEXT.fl2vaModel, ref2va_model: TEXT.ref2vaModel, text_encoder: TEXT.textEncoder, video_vae: TEXT.videoVae, audio_vae: TEXT.audioVae };
        for (const input of node.inputs || []) if (labels[input.name]) setLocalizedSlotLabel(input, labels[input.name]);
        for (const output of node.outputs || []) if (String(output.name || "").toLowerCase() === "h3_bundle") setLocalizedSlotLabel(output, TEXT.bundle);
        return;
    }
    if (isOutput(node)) {
        node.title = TEXT.outputTitle;
        for (const input of node.inputs || []) {
            if (input.name === "h3_context") setLocalizedSlotLabel(input, TEXT.outputContext);
        }
        const outputLabels = { positive: TEXT.outputConditioning, latent: TEXT.outputLatent, video_vae: TEXT.outputVideoVae, audio_vae: TEXT.outputAudioVae, fps: TEXT.outputFps };
        for (const output of node.outputs || []) {
            const key = String(output.name || "").toLowerCase();
            if (outputLabels[key]) setLocalizedSlotLabel(output, outputLabels[key]);
        }
        return;
    }
    if (!isTarget(node)) return;
    node.title = TEXT.mainTitle;
    const labels = { mode: TEXT.mode, prompt: TEXT.prompt, resolution: TEXT.resolution, aspect_ratio: TEXT.aspectRatio, width: TEXT.width, height: TEXT.height, seconds: TEXT.seconds, advanced: TEXT.advanced, prompt_optimizer_settings: TEXT.promptOptimizerSettings, prompt_optimizer_scene_guide: TEXT.promptOptimizerSceneGuide, fps: TEXT.fps, keyframe_role: TEXT.keyframeRole, ref_image_size: TEXT.refImageSize, reference_mention_mode: TEXT.referenceMentionMode };
    for (const widget of node.widgets || []) {
        if (labels[widget.name]) widget.label = labels[widget.name];
        localizeComboWidget(widget);
    }
    for (const input of node.inputs || []) {
        if (input.name === "h3_bundle") setLocalizedSlotLabel(input, TEXT.bundle);
        if (input.name === "media") setLocalizedSlotLabel(input, TEXT.inputMedia);
        if (input.name === "optimizer_clip") setLocalizedSlotLabel(input, TEXT.optimizerClip);
    }
    const outputLabels = { model: TEXT.outputModel, h3_context: TEXT.outputContext };
    for (const output of node.outputs || []) {
        const key = String(output.name || "").toLowerCase();
        if (outputLabels[key]) setLocalizedSlotLabel(output, outputLabels[key]);
    }
}

function localizeNodeDefinition(nodeData) {
    if (!nodeData || ![NODE_CLASS, LOADER_CLASS, ADAPTER_CLASS, OUTPUT_CLASS].includes(nodeData.name)) return;
    nodeData.display_name = nodeData.name === LOADER_CLASS
        ? TEXT.loaderTitle
        : nodeData.name === ADAPTER_CLASS
            ? TEXT.adapterTitle
            : nodeData.name === OUTPUT_CLASS
            ? TEXT.outputTitle
            : TEXT.mainTitle;
    nodeData.category = TEXT.category;
}

function getWidget(node, name) {
    return node?.widgets?.find((widget) => widget?.name === name) || null;
}

function getWidgetValue(node, name, fallback = "") {
    const widget = getWidget(node, name);
    return widget?.value ?? fallback;
}

function asBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["", "0", "false", "off", "no"].includes(normalized)) return false;
        if (["1", "true", "on", "yes"].includes(normalized)) return true;
    }
    return value == null ? fallback : Boolean(value);
}

function isReferenceMode(node) {
    return canonicalOption("mode", getWidgetValue(node, "mode", MODE_IMAGE)) === MODE_REFERENCE;
}

function isCustomResolution(node) {
    return canonicalOption("resolution", getWidgetValue(node, "resolution", "480P")) === RESOLUTION_CUSTOM;
}

function isAdvancedEnabled(node) {
    return asBoolean(getWidgetValue(node, "advanced", false));
}

function referenceMentionMode(node) {
    const value = canonicalOption("reference_mention_mode", getWidgetValue(node, "reference_mention_mode", "index"));
    return value === "index" ? "index" : "filename";
}

function ensureLinks(node) {
    node.properties ||= {};
    if (!Array.isArray(node.properties[LINKS_PROP])) {
        node.properties[LINKS_PROP] = [];
    }
    return node.properties[LINKS_PROP];
}

function isSameNode(left, right) {
    if (!left || !right) return false;
    if (left === right) return true;
    const leftId = Number(left.id);
    const rightId = Number(right.id);
    return Number.isFinite(leftId) && Number.isFinite(rightId) && leftId === rightId;
}

function resequence(node) {
    const counts = { image: 0, video: 0, audio: 0 };
    ensureLinks(node).forEach((link) => {
        const mediaType = String(link.media_type || "image").toLowerCase();
        const sequenceType = Object.hasOwn(counts, mediaType) ? mediaType : "image";
        counts[sequenceType] += 1;
        link.order = counts[sequenceType];
    });
}

function normalizeLinks(node, removeMissing = true) {
    const links = ensureLinks(node);
    const normalized = [];
    const seen = new Set();
    for (const link of links) {
        const sourceId = Number(link?.source_id);
        const sourceSlot = Number(link?.source_slot) || 0;
        const mediaType = String(link?.media_type || "image").toLowerCase();
        if (!Number.isFinite(sourceId) || !["image", "video", "audio"].includes(mediaType)) continue;
        if (Number.isFinite(Number(node?.id)) && sourceId === Number(node.id)) continue;
        const key = `${sourceId}:${sourceSlot}:${mediaType}`;
        if (seen.has(key)) continue;
        const canResolveSource = typeof app.graph?.getNodeById === "function";
        const source = canResolveSource ? app.graph.getNodeById(sourceId) : null;
        if (removeMissing && canResolveSource && !source) continue;
        seen.add(key);
        normalized.push({ ...link, source_id: sourceId, source_slot: sourceSlot, media_type: mediaType });
    }
    const changed = normalized.length !== links.length || normalized.some((link, index) => {
        const previous = links[index];
        return !previous
            || Number(previous.source_id) !== link.source_id
            || Number(previous.source_slot) !== link.source_slot
            || String(previous.media_type || "image").toLowerCase() !== link.media_type;
    });
    if (changed) node.properties[LINKS_PROP] = normalized;
    else if (links.some((link) => !Number.isFinite(Number(link?.order)))) node.properties[LINKS_PROP] = normalized;
    resequence(node);
    return ensureLinks(node);
}

function getSlotType(slot) {
    return String(slot?.type || slot?.datatype || slot?.label || "").toUpperCase();
}

function getMediaType(sourceType, sourceNode = null) {
    const type = String(sourceType || "").toUpperCase();
    if (type.includes("AUDIO")) return "audio";
    if (type.includes("VIDEO")) return "video";
    if (type.includes("IMAGE")) return "image";
    const name = String(sourceNode?.comfyClass || sourceNode?.type || "").toLowerCase();
    if (name.includes("audio")) return "audio";
    if (name.includes("video")) return "video";
    return "image";
}

function mediaLimits(node) {
    if (!isReferenceMode(node)) {
        return { image: 2, video: 0, audio: 0, total: 2 };
    }
    return { image: 9, video: 3, audio: 3, total: MAX_MEDIA };
}

function canAccept(node, mediaType) {
    const limits = mediaLimits(node);
    if (!limits[mediaType]) return false;
    const links = ensureLinks(node);
    if (links.length >= limits.total) return false;
    const count = links.filter((link) => String(link.media_type || "image") === mediaType).length;
    return count < limits[mediaType];
}

function pruneLinksForMode(node) {
    const limits = mediaLimits(node);
    const counts = { image: 0, video: 0, audio: 0 };
    const kept = [];
    for (const link of ensureLinks(node)) {
        const type = String(link.media_type || "image");
        if (!limits[type] || counts[type] >= limits[type] || kept.length >= limits.total) continue;
        counts[type] += 1;
        kept.push(link);
    }
    node.properties[LINKS_PROP] = kept;
    resequence(node);
}

function getMediaInputIndex(node) {
    return node?.inputs?.findIndex((input) => String(input?.name || "") === "media") ?? -1;
}

function getConnectionPosition(node, isInput, slotIndex) {
    const normalize = (point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
        ? [point[0], point[1]]
        : null;
    const modern = isInput
        ? normalize(node?.getInputPos?.(slotIndex))
        : normalize(node?.getOutputPos?.(slotIndex));
    if (modern) return modern;
    const out = [0, 0];
    try {
        if (typeof node?.getConnectionPos === "function") {
            const legacy = normalize(node.getConnectionPos(isInput, slotIndex, out)) || normalize(out);
            if (legacy) return legacy;
        }
    } catch {
        // Fall through to stable LiteGraph geometry.
    }
    const slot = 40 + Math.max(0, slotIndex) * 20;
    return isInput
        ? [Number(node?.pos?.[0] || 0), Number(node?.pos?.[1] || 0) + slot]
        : [Number(node?.pos?.[0] || 0) + Number(node?.size?.[0] || 160), Number(node?.pos?.[1] || 0) + slot];
}

function getMediaDot(node) {
    const index = getMediaInputIndex(node);
    if (index < 0) return null;
    const point = getConnectionPosition(node, true, index);
    return { x: point[0], y: point[1] };
}

function graphPosition(canvas, event) {
    try {
        canvas.adjustMouseEvent?.(event);
    } catch {
        // Older LiteGraph builds do not expose adjustMouseEvent.
    }
    if (Array.isArray(canvas?.graph_mouse)) return [canvas.graph_mouse[0], canvas.graph_mouse[1]];
    if (Number.isFinite(event?.canvasX) && Number.isFinite(event?.canvasY)) return [event.canvasX, event.canvasY];
    const rect = canvas?.canvas?.getBoundingClientRect?.();
    const scale = canvas?.ds?.scale || 1;
    const offset = canvas?.ds?.offset || [0, 0];
    if (rect && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
        return [(event.clientX - rect.left) / scale - offset[0], (event.clientY - rect.top) / scale - offset[1]];
    }
    return [0, 0];
}

function pointerGraphPosition(canvas, event) {
    if (Number.isFinite(event?.canvasX) && Number.isFinite(event?.canvasY)) return [event.canvasX, event.canvasY];
    const rect = canvas?.canvas?.getBoundingClientRect?.();
    if (rect && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
        const scale = canvas?.ds?.scale || 1;
        const offset = canvas?.ds?.offset || [0, 0];
        return [(event.clientX - rect.left) / scale - offset[0], (event.clientY - rect.top) / scale - offset[1]];
    }
    return graphPosition(canvas, event);
}

function clientPosition(canvas, point) {
    const rect = canvas?.canvas?.getBoundingClientRect?.();
    if (!rect) return null;
    const scale = canvas?.ds?.scale || 1;
    const offset = canvas?.ds?.offset || [0, 0];
    return { x: rect.left + (point[0] + offset[0]) * scale, y: rect.top + (point[1] + offset[1]) * scale };
}

function connectingOutput(canvas) {
    const node = canvas?.connecting_node || canvas?.connectingNode;
    if (!node) return null;
    const raw = canvas.connecting_output ?? canvas.connecting_slot ?? canvas.connecting_output_slot;
    if (raw == null && canvas.connecting_input) return null;
    const index = typeof raw === "number" ? raw : Number(raw?.slot_index ?? raw?.slot ?? 0);
    const output = node.outputs?.[Number.isFinite(index) ? index : 0] || raw || {};
    return {
        sourceNode: node,
        sourceSlot: Number.isFinite(index) ? index : 0,
        sourceType: getSlotType(output),
    };
}

function connectingInput(canvas) {
    const node = canvas?.connecting_node || canvas?.connectingNode;
    const input = canvas?.connecting_input || canvas?.connectingInput;
    if (!node || !input || !isTarget(node)) return null;
    const index = typeof input === "number" ? input : node.inputs?.indexOf(input);
    const slot = node.inputs?.[Number.isFinite(index) ? index : -1];
    if (String(slot?.name || input?.name || "") !== "media") return null;
    return { targetNode: node };
}

function clearConnecting(canvas) {
    canvas.connecting_node = null;
    canvas.connecting_output = null;
    canvas.connecting_slot = null;
    canvas.connecting_pos = null;
    canvas.connecting_input = null;
}

function addVirtualLink(targetNode, sourceNode, sourceSlot, sourceType, mediaType = null) {
    if (!targetNode || !sourceNode || isSameNode(targetNode, sourceNode)) return false;
    const sourceId = Number(sourceNode.id);
    if (!Number.isFinite(sourceId)) return false;
    mediaType ||= getMediaType(sourceType, sourceNode);
    if (!canAccept(targetNode, mediaType)) return false;
    const links = ensureLinks(targetNode);
    const exists = links.some((link) => Number(link.source_id) === sourceId && Number(link.source_slot) === Number(sourceSlot));
    if (exists) return false;
    links.push({
        source_id: sourceId,
        source_slot: Number(sourceSlot) || 0,
        source_type: sourceType || "*",
        media_type: mediaType,
        order: links.length + 1,
    });
    resequence(targetNode);
    targetNode.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    app.graph?.change?.();
    requestMentionPreviewRefresh();
    return true;
}

function removeVirtualLink(node, index) {
    const links = ensureLinks(node);
    if (index < 0 || index >= links.length) return false;
    links.splice(index, 1);
    resequence(node);
    node.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    app.graph?.change?.();
    requestMentionPreviewRefresh();
    return true;
}

function getNativeGraphLink(graph, linkId) {
    if (!graph || linkId == null) return null;
    for (const links of [graph.links, graph._links]) {
        if (!links) continue;
        if (typeof links.get === "function") {
            const link = links.get(linkId) ?? links.get(String(linkId));
            if (link) return link;
        }
        const link = links[linkId] ?? links[String(linkId)];
        if (link) return link;
    }
    return null;
}

function convertNativeMediaConnection(targetNode, inputIndex, linkInfo = null) {
    if (!isTarget(targetNode) || targetNode.__h3VirtualWireClearing) return false;
    const input = targetNode.inputs?.[inputIndex];
    if (!input || !/^media(?:_\d+)?$/i.test(String(input.name || ""))) return false;

    const graph = targetNode.graph || app.graph;
    const linkId = input.link ?? linkInfo?.id ?? linkInfo?.link_id ?? linkInfo?.linkId;
    const nativeLink = getNativeGraphLink(graph, linkId) || linkInfo;
    if (!nativeLink) return false;

    const directSourceCandidate = nativeLink.origin_node || nativeLink.originNode
        || nativeLink.fromNode || nativeLink.sourceNode;
    const directSource = directSourceCandidate && typeof directSourceCandidate === "object"
        ? directSourceCandidate
        : null;
    const sourceId = nativeLink.origin_id ?? nativeLink.originId
        ?? nativeLink.from_id ?? nativeLink.fromId
        ?? (directSourceCandidate && typeof directSourceCandidate !== "object" ? directSourceCandidate : directSource?.id);
    const sourceNode = directSource || graph?.getNodeById?.(Number(sourceId));
    if (!sourceNode || isSameNode(targetNode, sourceNode)) return false;

    const rawSourceSlot = nativeLink.origin_slot ?? nativeLink.originSlot
        ?? nativeLink.from_slot ?? nativeLink.fromSlot ?? nativeLink.from?.slot ?? 0;
    const parsedSourceSlot = Number(rawSourceSlot);
    const sourceSlot = Number.isFinite(parsedSourceSlot) ? parsedSourceSlot : 0;
    const output = sourceNode.outputs?.[sourceSlot] || {};
    const sourceType = getSlotType(output)
        || String(nativeLink.type || nativeLink.origin_type || nativeLink.originType || "*").toUpperCase();

    const added = addVirtualLink(targetNode, sourceNode, sourceSlot, sourceType);
    targetNode.__h3VirtualWireClearing = true;
    try {
        if (targetNode.inputs?.[inputIndex]?.link != null && typeof targetNode.disconnectInput === "function") {
            targetNode.disconnectInput(inputIndex);
        } else if (linkId != null && typeof graph?.removeLink === "function") {
            graph.removeLink(linkId);
        }
        if (targetNode.inputs?.[inputIndex]) targetNode.inputs[inputIndex].link = null;
    } finally {
        targetNode.__h3VirtualWireClearing = false;
    }

    targetNode.setDirtyCanvas?.(true, true);
    graph?.setDirtyCanvas?.(true, true);
    requestMentionPreviewRefresh();
    return added;
}

function scheduleNativeMediaConnectionConversion(targetNode, inputIndex, linkInfo = null) {
    setTimeout(() => convertNativeMediaConnection(targetNode, inputIndex, linkInfo), 0);
    if (!linkInfo) setTimeout(() => convertNativeMediaConnection(targetNode, inputIndex), 50);
}

function cubicPoint(start, end, t) {
    const cp1 = [start[0] + 80, start[1]];
    const cp2 = [end[0] - 80, end[1]];
    const mt = 1 - t;
    return [
        mt * mt * mt * start[0] + 3 * mt * mt * t * cp1[0] + 3 * mt * t * t * cp2[0] + t * t * t * end[0],
        mt * mt * mt * start[1] + 3 * mt * mt * t * cp1[1] + 3 * mt * t * t * cp2[1] + t * t * t * end[1],
    ];
}

function linkGeometry(targetNode, link) {
    const sourceNode = targetNode.graph?.getNodeById?.(Number(link.source_id));
    const dot = getMediaDot(targetNode);
    if (!sourceNode || !dot) return null;
    const source = getConnectionPosition(sourceNode, false, Number(link.source_slot) || 0);
    const target = [dot.x, dot.y];
    return { sourceNode, source, target, mid: cubicPoint(source, target, 0.5) };
}

function getComfyLinkTypeColor(type) {
    const colors = globalThis.LGraphCanvas?.link_type_colors || {};
    const raw = String(type || "");
    const candidates = [raw, raw.toUpperCase(), raw.toLowerCase()].filter(Boolean);
    for (const candidate of candidates) {
        if (colors[candidate]) return colors[candidate];
    }
    return "";
}

function getComfyDefaultLinkColor(canvas) {
    return canvas?.default_link_color || globalThis.LiteGraph?.LINK_COLOR || COMFY_NATIVE_LINK_COLOR;
}

function linkColor(canvas, targetNode, sourceNode, link) {
    if (linkHighlighted(canvas, targetNode, sourceNode)) return "#FFF";
    const typedColor = getComfyLinkTypeColor(link?.source_type);
    if (typedColor) return typedColor;
    return String(link?.media_type || "image") === "image" ? COLOR_IMAGE : getComfyDefaultLinkColor(canvas);
}

function linkHighlighted(canvas, targetNode, sourceNode) {
    return Boolean(
        targetNode?.selected || sourceNode?.selected ||
        canvas?.selectedItems?.has?.(targetNode) || canvas?.selectedItems?.has?.(sourceNode) ||
        canvas?.selected_nodes?.[targetNode?.id] || canvas?.selected_nodes?.[sourceNode?.id]
    );
}

function hitTestLinks(graph, x, y) {
    let best = null;
    for (const targetNode of graph?._nodes || []) {
        if (!isTarget(targetNode)) continue;
        const links = ensureLinks(targetNode);
        links.forEach((link, index) => {
            const geometry = linkGeometry(targetNode, link);
            if (!geometry) return;
            const distance = Math.hypot(x - geometry.mid[0], y - geometry.mid[1]);
            if (distance <= 18 && (!best || distance < best.distance)) best = { targetNode, index, point: geometry.mid, distance };
        });
    }
    return best;
}

function closeContextMenuCompat(menu) {
    menu?.close?.();
    menu?.remove?.();
    globalThis.LiteGraph?.ContextMenu?.closeAllContextMenus?.(globalThis.window);
    if (typeof document !== "undefined") {
        document.querySelectorAll(".litecontextmenu").forEach((element) => element.remove());
    }
}

function closeLinkMenu() {
    linkMenu?.close?.();
    linkMenu?.remove?.();
    linkMenu = null;
}

function openLinkMenu(canvas, hit, event) {
    closeLinkMenu();
    const anchor = clientPosition(canvas, hit.point) || { x: event?.clientX || 0, y: event?.clientY || 0 };
    const menuEvent = typeof PointerEvent === "function"
        ? new PointerEvent("pointerdown", { clientX: anchor.x + 8, clientY: anchor.y + 8, bubbles: true, cancelable: true })
        : new MouseEvent("mousedown", { clientX: anchor.x + 8, clientY: anchor.y + 8, bubbles: true, cancelable: true });
    let menuInstance = null;
    const remove = () => {
        removeVirtualLink(hit.targetNode, hit.index);
        closeContextMenuCompat(menuInstance);
        if (linkMenu === menuInstance) linkMenu = null;
    };
    if (globalThis.LiteGraph?.ContextMenu) {
        menuInstance = new globalThis.LiteGraph.ContextMenu([
            { content: TEXT.deleteLink, callback: remove },
        ], { event: menuEvent });
        linkMenu = menuInstance;
    }
}

function openCreateMenu(canvas, targetNode, event, allowedTypes) {
    if (!targetNode) return;
    closeContextMenuCompat(createMenu);
    createMenu = null;
    releaseCreateMenuLinkHold?.();
    releaseCreateMenuLinkHold = null;
    const [x, y] = Number.isFinite(event?.canvasX) && Number.isFinite(event?.canvasY)
        ? [event.canvasX, event.canvasY]
        : graphPosition(canvas, event);
    const anchor = clientPosition(canvas, [x, y]) || { x: event?.clientX || 0, y: event?.clientY || 0 };
    const menuEvent = typeof PointerEvent === "function"
        ? new PointerEvent("pointerdown", { clientX: anchor.x, clientY: anchor.y, bubbles: true, cancelable: true })
        : new MouseEvent("mousedown", { clientX: anchor.x, clientY: anchor.y, bubbles: true, cancelable: true });
    let menuInstance = null;
    const finish = () => {
        closeContextMenuCompat(menuInstance);
        if (createMenu === menuInstance) createMenu = null;
        releaseCreateMenuLinkHold?.();
        releaseCreateMenuLinkHold = null;
        deferredCreateMenuPending = false;
        setNativeSearchVisualSuppression(false);
        clearTemporaryRenderLink(canvas);
    };
    const items = allowedTypes.filter((type) => canAccept(targetNode, type)).map((type) => ({
        content: LOADERS[type].label,
        callback: () => {
            createResourceNode(canvas, targetNode, type, [x, y]);
            finish();
        },
    }));
    if (!globalThis.LiteGraph?.ContextMenu || !items.length) {
        deferredCreateMenuPending = false;
        setNativeSearchVisualSuppression(false);
        clearTemporaryRenderLink(canvas);
        return;
    }
    releaseCreateMenuLinkHold = holdDroppedLinkForMenu(canvas, { canvasX: x, canvasY: y });
    setNativeSearchVisualSuppression(true);
    menuInstance = new globalThis.LiteGraph.ContextMenu(items, { event: menuEvent });
    createMenu = menuInstance;
    menuInstance.controller?.signal?.addEventListener?.("abort", () => {
        if (createMenu === menuInstance) createMenu = null;
        releaseCreateMenuLinkHold?.();
        releaseCreateMenuLinkHold = null;
        deferredCreateMenuPending = false;
        setNativeSearchVisualSuppression(false);
        clearTemporaryRenderLink(canvas);
    }, { once: true });
}

function alignNodeOutputToDrop(node, slot, position) {
    if (!node || slot < 0 || !Number.isFinite(position?.[0]) || !Number.isFinite(position?.[1])) return false;
    const current = node.pos || [0, 0];
    const connection = getConnectionPosition(node, false, slot);
    if (!Number.isFinite(connection?.[0]) || !Number.isFinite(connection?.[1])) return false;
    node.pos = [current[0] + position[0] - connection[0], current[1] + position[1] - connection[1]];
    node.setDirtyCanvas?.(true, true);
    return true;
}

function createResourceNode(canvas, targetNode, mediaType, position) {
    const spec = LOADERS[mediaType];
    const graph = canvas?.graph || app.graph;
    const LiteGraph = globalThis.LiteGraph;
    if (!spec || !graph || !LiteGraph?.createNode) return false;
    const node = LiteGraph.createNode(spec.classType);
    if (!node) return false;
    node.pos = [position[0], position[1]];
    graph.add(node);
    const slot = node.outputs?.findIndex((output) => getMediaType(getSlotType(output), node) === mediaType) ?? 0;
    alignNodeOutputToDrop(node, slot, position);
    if (isVueNodesMode() && typeof requestAnimationFrame === "function") {
        const placedPosition = [Number(node.pos?.[0]) || 0, Number(node.pos?.[1]) || 0];
        requestAnimationFrame(() => {
            const stillAtPlacedPosition = Math.abs((Number(node.pos?.[0]) || 0) - placedPosition[0]) < 0.5
                && Math.abs((Number(node.pos?.[1]) || 0) - placedPosition[1]) < 0.5;
            if (stillAtPlacedPosition) alignNodeOutputToDrop(node, slot, position);
        });
    }
    const output = node.outputs?.[slot] || {};
    addVirtualLink(targetNode, node, slot, getSlotType(output) || mediaType.toUpperCase(), mediaType);
    graph.setDirtyCanvas?.(true, true);
    return true;
}

function getSlotIndex(slots, rawSlot) {
    if (typeof rawSlot === "number") return slots?.[rawSlot] ? rawSlot : -1;
    for (const key of ["slot_index", "slot", "index"]) {
        const value = rawSlot?.[key];
        if (typeof value === "number" && slots?.[value]) return value;
    }
    if (Array.isArray(slots) && rawSlot) {
        const direct = slots.indexOf(rawSlot);
        if (direct >= 0) return direct;
        const name = typeof rawSlot === "string" ? rawSlot : rawSlot?.name;
        if (name) return slots.findIndex((slot) => slot?.name === name);
    }
    return -1;
}

function getPendingConnectorLink(canvas) {
    const link = canvas?.linkConnector?.renderLinks?.at?.(0);
    if (!link) return null;
    const endpointNode = link.node || link.fromNode || link.originNode || link.sourceNode || link.toNode || link.targetNode
        || link.inputNode || link.outputNode;
    const endpointSlot = link.fromSlot ?? link.slot ?? link.output ?? link.input ?? link.toSlot ?? {};
    const toType = String(link.toType || link.targetType || link.targetSlotType || "").toLowerCase();
    let direction = toType.includes("output") ? "from_input" : "from_output";
    const inputIndex = getSlotIndex(endpointNode?.inputs, endpointSlot);
    const outputIndex = getSlotIndex(endpointNode?.outputs, endpointSlot);
    if (inputIndex >= 0 && outputIndex < 0) direction = "from_input";
    if (outputIndex >= 0 && inputIndex < 0) direction = "from_output";
    if (direction === "from_input") {
        const input = endpointNode?.inputs?.[inputIndex] || endpointSlot;
        if (!isTarget(endpointNode) || String(input?.name || "") !== "media") return null;
        return { direction, targetNode: endpointNode, targetSlot: inputIndex };
    }
    const output = endpointNode?.outputs?.[outputIndex] || endpointSlot || {};
    return {
        direction,
        sourceNode: endpointNode,
        sourceSlot: Math.max(0, outputIndex),
        sourceType: getSlotType(output),
    };
}

function nodeAtGraphPoint(canvas, x, y, ignoredNode = null) {
    const nodes = canvas?.graph?._nodes || app.graph?._nodes || [];
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (!node || node === ignoredNode) continue;
        const pos = node.pos || [0, 0];
        const size = node.size || node.computeSize?.() || [0, 0];
        if (x >= pos[0] && y >= pos[1] && x <= pos[0] + Number(size[0] || 0) && y <= pos[1] + Number(size[1] || 0)) return node;
    }
    return null;
}

function findNativeSearchContainer() {
    const active = document.activeElement;
    const activeRoot = active?.closest?.("[role='search'], .node-search-box-dialog-mask, .invisible-dialog-root, .p-dialog, [data-pc-name='dialog']");
    return document.querySelector(".node-search-box-dialog-mask .comfy-vue-node-search-container")
        || document.querySelector(".invisible-dialog-root .comfy-vue-node-search-container")
        || document.querySelector(".comfy-vue-node-search-container")
        || activeRoot
        || document.querySelector("[role='search']");
}

function findNativeSearchInput(container) {
    const active = document.activeElement;
    if (active?.tagName === "INPUT" && (!container || container.contains(active))) return active;
    return container?.querySelector?.('input[id^="comfy-vue-node-search-box-input-"]')
        || container?.querySelector?.(".comfy-vue-node-search-box input")
        || container?.querySelector?.("input")
        || document.querySelector('input[id^="comfy-vue-node-search-box-input-"]');
}

function setNativeSearchVisualSuppression(enabled) {
    const className = "minimax-h3-easy-hide-native-search";
    if (enabled) {
        if (!nativeSearchSuppressStyle) {
            nativeSearchSuppressStyle = document.createElement("style");
            nativeSearchSuppressStyle.textContent = `
body.${className} .node-search-box-dialog-mask,
body.${className} .p-dialog-mask:has(.comfy-vue-node-search-container),
body.${className} .invisible-dialog-root:has(.comfy-vue-node-search-container),
body.${className} .comfy-vue-node-search-container {
    opacity: 0 !important;
    pointer-events: none !important;
}`;
            document.head?.appendChild(nativeSearchSuppressStyle);
        }
        document.body?.classList?.add(className);
    } else {
        document.body?.classList?.remove(className);
    }
}

function closeNativeNodeSearchSoon() {
    const close = () => {
        const container = findNativeSearchContainer();
        const input = findNativeSearchInput(container);
        if (!container && !input) return;
        const init = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
        input?.dispatchEvent?.(new KeyboardEvent("keydown", init));
        container?.dispatchEvent?.(new KeyboardEvent("keydown", init));
        document.dispatchEvent(new KeyboardEvent("keydown", init));
    };
    for (const delay of [0, 16, 50, 120]) setTimeout(close, delay);
}

function holdDroppedLinkForMenu(canvas, detail) {
    const events = canvas?.linkConnector?.events;
    if (!events) return null;
    const preventReset = (event) => event.preventDefault?.();
    canvas.linkConnector.state ||= {};
    if (Number.isFinite(detail?.canvasX) && Number.isFinite(detail?.canvasY)) {
        canvas.linkConnector.state.snapLinksPos = [detail.canvasX, detail.canvasY];
    }
    events.addEventListener("reset", preventReset, { once: true });
    return () => events.removeEventListener("reset", preventReset);
}

function clearTemporaryRenderLink(canvas) {
    const connector = canvas?.linkConnector;
    connector?.reset?.();
    if (Array.isArray(connector?.renderLinks)) connector.renderLinks.length = 0;
    canvas?.setDirty?.(true, true);
    (canvas?.graph || app.graph)?.setDirtyCanvas?.(true, true);
}

function shouldSuppressNativeDrop(type) {
    return type === "dropped-on-canvas"
        && (Boolean(createMenu) || deferredCreateMenuPending)
        && performance.now() < suppressNativeDropUntil;
}

function suppressNativeDrop(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    closeNativeNodeSearchSoon();
}

function primeInputDropSuppression(canvas) {
    const pending = getPendingConnectorLink(canvas);
    if (pending?.direction !== "from_input") return false;
    deferredCreateMenuPending = true;
    suppressNativeDropUntil = performance.now() + 1000;
    setNativeSearchVisualSuppression(true);
    closeNativeNodeSearchSoon();
    return true;
}

function getTargetInputLinkId(pending) {
    if (!pending?.targetNode) return null;
    const inputIndex = getSlotIndex(pending.targetNode.inputs, pending.targetSlot);
    return inputIndex >= 0 ? pending.targetNode.inputs?.[inputIndex]?.link ?? null : null;
}

function getVirtualLinkCount(node) {
    return isTarget(node) ? ensureLinks(node).length : 0;
}

function hasDeferredInputDropConnected(canvas, pending, before, nativeLinkCreated = false) {
    if (nativeLinkCreated) return true;
    const inputLinkId = getTargetInputLinkId(pending);
    if (inputLinkId != null && inputLinkId !== before.inputLinkId) return true;
    if (getVirtualLinkCount(pending?.targetNode) > before.virtualLinkCount) return true;
    const graphVersion = Number((canvas?.graph || app.graph)?._version) || 0;
    return graphVersion > before.graphVersion;
}

function buildInputDropDetail(canvas, event) {
    const [canvasX, canvasY] = pointerGraphPosition(canvas, event);
    return {
        clientX: event?.clientX,
        clientY: event?.clientY,
        canvasX,
        canvasY,
        shiftKey: Boolean(event?.shiftKey),
        ctrlKey: Boolean(event?.ctrlKey),
        metaKey: Boolean(event?.metaKey),
        altKey: Boolean(event?.altKey),
        pointerType: event?.pointerType,
        originalEvent: event,
        target: event?.target,
    };
}

function scheduleDeferredInputCreateMenu(canvas, event, pending, allowed) {
    if (pending?.direction !== "from_input") return false;
    const token = ++deferredCreateMenuToken;
    const detail = buildInputDropDetail(canvas, event);
    const linkSnapshot = { ...pending };
    const before = {
        inputLinkId: getTargetInputLinkId(linkSnapshot),
        virtualLinkCount: getVirtualLinkCount(linkSnapshot.targetNode),
        graphVersion: Number((canvas?.graph || app.graph)?._version) || 0,
    };

    deferredCreateMenuPending = true;
    suppressNativeDropUntil = performance.now() + 1000;
    setNativeSearchVisualSuppression(true);
    closeNativeNodeSearchSoon();
    const releaseDeferredHold = holdDroppedLinkForMenu(canvas, detail);
    const events = canvas?.linkConnector?.events;
    let settled = false;
    let nativeLinkCreated = false;

    const cleanupNativeListeners = () => {
        events?.removeEventListener?.("link-created", onNativeLinkCreated);
        events?.removeEventListener?.("after-drop-links", onAfterDropLinks);
    };
    const releaseHold = () => releaseDeferredHold?.();
    const finishConnected = () => {
        if (settled || token !== deferredCreateMenuToken) return false;
        if (!hasDeferredInputDropConnected(canvas, linkSnapshot, before, nativeLinkCreated)) return false;
        settled = true;
        deferredCreateMenuPending = false;
        cleanupNativeListeners();
        releaseHold();
        setNativeSearchVisualSuppression(false);
        clearTemporaryRenderLink(canvas);
        return true;
    };
    const onNativeLinkCreated = () => {
        nativeLinkCreated = true;
        setTimeout(() => finishConnected(), 0);
    };
    const onAfterDropLinks = () => setTimeout(() => finishConnected(), 0);
    const checkConnectedSoon = () => {
        if (settled || token !== deferredCreateMenuToken || finishConnected()) return;
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => finishConnected());
    };

    events?.addEventListener?.("link-created", onNativeLinkCreated);
    events?.addEventListener?.("after-drop-links", onAfterDropLinks);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(checkConnectedSoon);
    setTimeout(checkConnectedSoon, 16);
    setTimeout(checkConnectedSoon, 32);

    setTimeout(() => {
        if (settled) return;
        if (token !== deferredCreateMenuToken) {
            settled = true;
            cleanupNativeListeners();
            releaseHold();
            setNativeSearchVisualSuppression(false);
            return;
        }
        deferredCreateMenuPending = false;
        if (createMenu) {
            settled = true;
            cleanupNativeListeners();
            releaseHold();
            return;
        }
        if (finishConnected()) return;

        settled = true;
        cleanupNativeListeners();
        releaseHold();
        suppressNativeDropUntil = performance.now() + 800;
        openCreateMenu(canvas, linkSnapshot.targetNode, detail, allowed);
        closeNativeNodeSearchSoon();
    }, 70);
    return true;
}

function installQuickCreateCapture(canvas) {
    if (!canvas?.canvas || !canvas?.linkConnector?.events) return false;
    if (canvas === quickCreateCaptureCanvas && canvas.__h3EasyQuickCreateCaptureInstalled) return true;

    // Nodes 2.0 can replace app.canvas while the page is starting. A module-global
    // "installed" flag leaves the handlers attached to the discarded canvas and
    // makes the live canvas rely on the less reliable mouse-up fallback. Remove the
    // old global listeners and install against the current canvas instance instead.
    quickCreateCaptureCleanup?.();
    quickCreateCaptureCleanup = null;
    quickCreateCaptureCanvas = canvas;
    canvas.__h3EasyQuickCreateCaptureInstalled = true;
    const handler = (event) => {
        // A ContextMenu item click also bubbles through the global pointer-up
        // listeners while the temporary connector is still being held. Without
        // this guard, the first menu click is mistaken for another canvas drop:
        // the temporary line is reset and the menu is reopened before its item
        // callback can create the resource node.
        if (createMenu || deferredCreateMenuPending || event?.target?.closest?.(".litecontextmenu")) return;
        if (event?.button > 0 || performance.now() - lastCapturedDropAt < 80) return;
        const pending = getPendingConnectorLink(canvas);
        if (!pending) return;
        const [x, y] = pointerGraphPosition(canvas, event);
        if (pending.direction === "from_output") {
            const target = (canvas.graph?._nodes || []).find((node) => {
                if (!isTarget(node)) return false;
                const dot = getMediaDot(node);
                return dot && Math.hypot(x - dot.x, y - dot.y) <= 18;
            });
            if (!target) return;
            if (isSameNode(target, pending.sourceNode)) return;
            const added = addVirtualLink(target, pending.sourceNode, pending.sourceSlot, pending.sourceType);
            if (!added) return;
            lastCapturedDropAt = performance.now();
            event.preventDefault?.();
            event.stopPropagation?.();
            event.stopImmediatePropagation?.();
            canvas.linkConnector.reset?.();
            closeNativeNodeSearchSoon();
            return;
        }
        const allowed = isReferenceMode(pending.targetNode) ? ["image", "video", "audio"] : ["image"];
        if (scheduleDeferredInputCreateMenu(canvas, event, pending, allowed)) {
            lastCapturedDropAt = performance.now();
        }
    };
    const pointerTargets = [window, document, canvas.canvas];
    for (const target of pointerTargets) {
        target.addEventListener?.("pointerup", handler, true);
        target.addEventListener?.("mouseup", handler, true);
    }

    const events = canvas.linkConnector.events;
    const originalDispatch = typeof events.dispatch === "function" ? events.dispatch : null;
    const originalDispatchEvent = events.dispatchEvent;
    let wrappedDispatch = null;
    let wrappedDispatchEvent = null;
    if (originalDispatch) {
        wrappedDispatch = function dispatchWithMediaDropGuard(type, detail) {
            if (type === "before-drop-links") primeInputDropSuppression(canvas);
            if (shouldSuppressNativeDrop(type)) {
                closeNativeNodeSearchSoon();
                return false;
            }
            return originalDispatch.call(events, type, detail);
        };
        events.dispatch = wrappedDispatch;
    }
    wrappedDispatchEvent = function dispatchEventWithMediaDropGuard(event) {
        if (event?.type === "before-drop-links") primeInputDropSuppression(canvas);
        if (shouldSuppressNativeDrop(event?.type)) {
            suppressNativeDrop(event);
            return false;
        }
        return originalDispatchEvent.call(events, event);
    };
    events.dispatchEvent = wrappedDispatchEvent;
    const beforeDropLinksHandler = () => primeInputDropSuppression(canvas);
    const droppedOnCanvasHandler = (event) => {
        if (shouldSuppressNativeDrop(event?.type)) suppressNativeDrop(event);
    };
    events.addEventListener("before-drop-links", beforeDropLinksHandler, { capture: true });
    events.addEventListener("dropped-on-canvas", droppedOnCanvasHandler, { capture: true });

    quickCreateCaptureCleanup = () => {
        for (const target of pointerTargets) {
            target.removeEventListener?.("pointerup", handler, true);
            target.removeEventListener?.("mouseup", handler, true);
        }
        events.removeEventListener?.("before-drop-links", beforeDropLinksHandler, { capture: true });
        events.removeEventListener?.("dropped-on-canvas", droppedOnCanvasHandler, { capture: true });
        if (wrappedDispatch && events.dispatch === wrappedDispatch) events.dispatch = originalDispatch;
        if (events.dispatchEvent === wrappedDispatchEvent) events.dispatchEvent = originalDispatchEvent;
        canvas.__h3EasyQuickCreateCaptureInstalled = false;
        if (quickCreateCaptureCanvas === canvas) quickCreateCaptureCanvas = null;
    };
    return true;
}

function drawLinks(canvas, ctx) {
    const graph = canvas?.graph || app.graph;
    if (!graph?._nodes || canvas.links_render_mode === globalThis.LiteGraph?.HIDDEN_LINK) return;
    let missingLinkFound = false;
    for (const targetNode of graph._nodes) {
        if (!isTarget(targetNode)) continue;
        const links = ensureLinks(targetNode);
        for (const link of links) {
            const geometry = linkGeometry(targetNode, link);
            if (!geometry) {
                missingLinkFound = true;
                continue;
            }
            const highlighted = linkHighlighted(canvas, targetNode, geometry.sourceNode);
            const color = linkColor(canvas, targetNode, geometry.sourceNode, link);
            const width = canvas.connections_width || 3;
            ctx.save();
            ctx.lineJoin = "round";
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.beginPath();
            ctx.moveTo(geometry.source[0], geometry.source[1]);
            ctx.bezierCurveTo(geometry.source[0] + 80, geometry.source[1], geometry.target[0] - 80, geometry.target[1], geometry.target[0], geometry.target[1]);
            ctx.lineWidth = width + 4;
            ctx.strokeStyle = canvas.render_connections_border !== false && !canvas.low_quality ? COLOR_LINK_BORDER : "transparent";
            if (ctx.strokeStyle !== "transparent") ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(geometry.source[0], geometry.source[1]);
            ctx.bezierCurveTo(geometry.source[0] + 80, geometry.source[1], geometry.target[0] - 80, geometry.target[1], geometry.target[0], geometry.target[1]);
            ctx.lineWidth = width;
            ctx.strokeStyle = color;
            ctx.stroke();
            if (canvas.linkMarkerShape !== 0 && (canvas.ds?.scale ?? 1) >= 0.6 && canvas.highquality_render !== false) {
                ctx.beginPath();
                ctx.arc(geometry.mid[0], geometry.mid[1], 5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.fillStyle = highlighted ? "#222" : "#fff";
                ctx.font = "bold 7px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(String(link.order || 1), geometry.mid[0], geometry.mid[1] + 0.3);
            }
            ctx.restore();
        }
    }
    if (missingLinkFound) requestMentionPreviewRefresh();
}

function patchCanvas() {
    const canvas = app.canvas;
    if (!canvas || canvas.__h3EasyCanvasPatched || typeof canvas.drawConnections !== "function") return;
    canvas.__h3EasyCanvasPatched = true;
    patchedCanvas = true;
    const originalDraw = canvas.drawConnections;
    canvas.drawConnections = function drawConnectionsWithH3Links(ctx) {
        const result = originalDraw?.apply(this, arguments);
        const connectionContext = ctx || this.bgctx || this.ctx;
        const onConnectionLayer = connectionContext?.canvas === this?.bgcanvas || connectionContext === this?.bgctx || !this?.bgcanvas;
        if (connectionContext && onConnectionLayer) drawLinks(this, connectionContext);
        return result;
    };

    const originalDown = canvas.processMouseDown;
    canvas.processMouseDown = function processMouseDownWithH3Links(event) {
        if (!getInputConnection(this)) {
            const [x, y] = graphPosition(this, event);
            const hit = hitTestLinks(this.graph || app.graph, x, y);
            if (hit) {
                openLinkMenu(this, hit, event);
                event?.preventDefault?.();
                event?.stopImmediatePropagation?.();
                return true;
            }
        }
        const result = originalDown?.apply(this, arguments);
        return result;
    };

    const linkPointerHandler = (event) => {
        if (getPendingConnectorLink(canvas) || connectingOutput(canvas) || connectingInput(canvas)) return;
        const [x, y] = graphPosition(canvas, event);
        const hit = hitTestLinks(canvas.graph || app.graph, x, y);
        if (!hit) return;
        openLinkMenu(canvas, hit, event);
        event.preventDefault?.();
        event.stopPropagation?.();
        event.stopImmediatePropagation?.();
    };
    canvas.canvas?.addEventListener?.("pointerdown", linkPointerHandler, true);
    installQuickCreateCapture(canvas);
}

function getInputConnection(canvas) {
    const node = canvas?.connecting_node || canvas?.connectingNode;
    const input = canvas?.connecting_input || canvas?.connectingInput;
    if (!node || !isTarget(node) || !input) return null;
    const slot = typeof input === "number" ? node.inputs?.[input] : input;
    if (String(slot?.name || "") !== "media") return null;
    return { targetNode: node };
}

function promptInputSlot(node) {
    return (node?.inputs || []).find((input) => String(input?.name || "") === "prompt") || null;
}

function promptInputIsConnected(node) {
    return promptInputSlot(node)?.link != null;
}

function buildRuntimePrompt(node, runtimeLinks) {
    const promptWidget = getWidget(node, "prompt");
    const fallback = String(promptWidget?.value || "");
    // Generation always uses the optimized tab when it holds text, and falls
    // back to the source tab while the optimizer has not been run.
    const doc = effectivePromptDoc(node);
    if (!Array.isArray(doc?.parts)) return fallback;
    return doc.parts.map((part) => {
        if (part?.type === "dialogue") return `<d>${String(part.text || "")}</d>`;
        if (part?.type !== "mention") return String(part?.text || "");
        const mediaType = String(part.mediaType || "image").toLowerCase();
        const partSourceId = part.sourceId != null && Number.isFinite(Number(part.sourceId)) ? Number(part.sourceId) : null;
        const partOrdinal = Number(part.ordinal);
        let index = -1;
        if ((referenceMentionMode(node) === "index" || partSourceId == null) && Number.isFinite(partOrdinal) && partOrdinal > 0) {
            let ordinal = 0;
            for (let runtimeIndex = 0; runtimeIndex < runtimeLinks.length; runtimeIndex += 1) {
                const link = runtimeLinks[runtimeIndex];
                if (String(link.media_type || "image").toLowerCase() !== mediaType) continue;
                ordinal += 1;
                if (ordinal === partOrdinal) {
                    index = runtimeIndex;
                    break;
                }
            }
        }
        if (index < 0 && partSourceId != null) {
            index = runtimeLinks.findIndex((link) =>
                Number(link.source_id) === partSourceId
                && Number(link.source_slot) === Number(part.sourceSlot || 0)
                && String(link.media_type || "image").toLowerCase() === mediaType
            );
        }
        if (index >= 0) return `${RUNTIME_REF_PREFIX}${index + 1}__`;
        if (!isReferenceMode(node)) return String(part.tag || part.token || "");
        return `${UNRESOLVED_REF_PREFIX}${mediaType}__`;
    }).join("");
}

function preserveLinkedPromptInput(promptNode, node, name, fallbackValue) {
    const input = node?.inputs?.find((slot) => String(slot?.name || "") === name);
    if (input?.link != null) {
        const link = getNativeGraphLink(node.graph || app.graph, input.link);
        const originId = link?.origin_id ?? link?.originId;
        const originSlot = link?.origin_slot ?? link?.originSlot ?? 0;
        if (originId != null) {
            promptNode.inputs[name] = [String(originId), Number(originSlot) || 0];
            return;
        }
    }

    const existing = promptNode?.inputs?.[name];
    if (Array.isArray(existing) && existing.length >= 2) return;
    promptNode.inputs[name] = fallbackValue;
}

function patchGraphToPrompt() {
    if (patchedPrompt || typeof app.graphToPrompt !== "function") return;
    patchedPrompt = true;
    const original = app.graphToPrompt;
    app.graphToPrompt = async function graphToPromptWithOrderedMedia() {
        const promptData = await original.apply(this, arguments);
        const output = promptData?.output || {};
        for (const node of app.graph?._nodes || []) {
            if (!isTarget(node)) continue;
            const promptNode = output[String(node.id)];
            if (!promptNode) continue;
            promptNode.inputs ||= {};
            delete promptNode.inputs.media;
            for (let index = 1; index <= MAX_MEDIA; index += 1) {
                delete promptNode.inputs[`media_${index}`];
                delete promptNode.inputs[`media_type_${index}`];
            }
            if (node.__h3Editor) syncPromptFromEditor(node, false);
            const runtimeLinks = normalizeLinks(node).filter((link) => Boolean(output[String(link.source_id)]));
            runtimeLinks.forEach((link, index) => {
                const source = output[String(link.source_id)];
                const slot = Number(link.source_slot) || 0;
                promptNode.inputs[`media_${index + 1}`] = [String(link.source_id), slot];
                promptNode.inputs[`media_type_${index + 1}`] = String(link.media_type || "image");
            });
            const promptInput = promptInputSlot(node);
            const promptLinkId = promptInput?.link;
            const existingPromptLink = promptNode.inputs.prompt;
            const hasPromptConnection = promptLinkId != null || Array.isArray(existingPromptLink);
            if (!hasPromptConnection) {
                promptNode.inputs.prompt = buildRuntimePrompt(node, runtimeLinks);
            } else if (promptLinkId != null && (!Array.isArray(existingPromptLink) || existingPromptLink.length < 2)) {
                // ComfyUI normally preserves connected widget inputs in graphToPrompt.
                // Reconstruct the link as a fallback for frontends that omit it after
                // the custom DOM editor replaces the native prompt widget.
                const promptLink = getNativeGraphLink(node.graph || app.graph, promptLinkId);
                const originId = promptLink?.origin_id ?? promptLink?.originId;
                const originSlot = promptLink?.origin_slot ?? promptLink?.originSlot ?? 0;
                if (originId != null) promptNode.inputs.prompt = [String(originId), Number(originSlot) || 0];
            }
            promptNode.inputs.mode = canonicalOption("mode", getWidgetValue(node, "mode", MODE_IMAGE));
            promptNode.inputs.resolution = canonicalOption("resolution", getWidgetValue(node, "resolution", "480P"));
            promptNode.inputs.aspect_ratio = canonicalOption("aspect_ratio", getWidgetValue(node, "aspect_ratio", "16:9"));
            preserveLinkedPromptInput(promptNode, node, "width", Number(getWidgetValue(node, "width", 1344)));
            preserveLinkedPromptInput(promptNode, node, "height", Number(getWidgetValue(node, "height", 768)));
            promptNode.inputs.seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Number(getWidgetValue(node, "seconds", 5)) || 5));
            promptNode.inputs.advanced = asBoolean(getWidgetValue(node, "advanced", false));
            promptNode.inputs.prompt_optimizer_settings = false;
            // Tells the execution-time (clip) optimizer whether the Optimized
            // tab is still empty, so a stored result is reused instead of
            // being regenerated on every queue.
            promptNode.inputs.prompt_needs_optimization = effectivePromptField(node) === PROMPT_FIELD_SOURCE;
            promptNode.inputs.prompt_optimizer_scene_guide = canonicalPromptGuide(getWidgetValue(node, "prompt_optimizer_scene_guide", "none"));
            promptNode.inputs.prompt_optimizer_resources = JSON.stringify(promptOptimizerResources(node));
            promptNode.inputs.prompt_optimizer_marker = JSON.stringify(node.properties?.[PROMPT_AUTO_MARKER_PROP] || {});
            promptNode.inputs.prompt_optimizer_prompt_connected = hasPromptConnection;
            promptNode.inputs.fps = Number(getWidgetValue(node, "fps", 24));
            promptNode.inputs.keyframe_role = canonicalOption("keyframe_role", getWidgetValue(node, "keyframe_role", KEYFRAME_FIRST));
            promptNode.inputs.ref_image_size = canonicalOption("ref_image_size", getWidgetValue(node, "ref_image_size", REF_IMAGE_1K));
            promptNode.inputs.reference_mention_mode = canonicalOption("reference_mention_mode", getWidgetValue(node, "reference_mention_mode", "index"));
        }
        return promptData;
    };
}

function editorText(editor) {
    let result = "";
    const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += String(node.textContent || "").replaceAll("\u200B", "");
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.classList?.contains("h3-mention-chip")) {
            result += node.dataset.token || "";
            return;
        }
        if (node.tagName === "BR") {
            result += "\n";
            return;
        }
        const block = ["DIV", "P"].includes(node.tagName);
        if (block && result && !result.endsWith("\n")) result += "\n";
        for (const child of node.childNodes || []) visit(child);
    };
    for (const child of editor.childNodes || []) visit(child);
    return result;
}

function sourceLabel(node) {
    return String(node?.title || node?.comfyClass || node?.type || "Media");
}

function widgetFilename(value) {
    const candidate = typeof value === "object" ? (value?.filename || value?.name || "") : value;
    const text = String(candidate || "").trim();
    if (!text || /^data:|^blob:|^https?:/i.test(text)) return "";
    return text.split(/[\\/]/).pop() || text;
}

function sourceFilename(node, mediaType) {
    if (!node) return "";
    const preferred = {
        image: ["image", "filename", "file"],
        video: ["video", "file", "filename", "video_file", "videofile"],
        audio: ["audio", "file", "filename", "audio_file", "audiofile"],
    }[mediaType] || ["file", "filename"];
    const preferredSet = new Set(preferred);
    const widgets = Array.isArray(node.widgets) ? node.widgets : [];
    const ordered = [
        ...widgets.filter((widget) => preferredSet.has(String(widget?.name || "").toLowerCase())),
        ...widgets,
    ];
    for (const widget of ordered) {
        const name = String(widget?.name || "").toLowerCase();
        const filename = widgetFilename(widget?.value);
        if (!filename) continue;
        if (preferredSet.has(name) || /\.(png|jpe?g|webp|gif|bmp|mp4|webm|mov|mkv|avi|m4v|mp3|wav|flac|ogg|m4a)$/i.test(filename)) return filename;
    }
    return widgetFilename(node?.properties?.filename || node?.properties?.file || "");
}

function truncateMentionLabel(value, maxLength = 22) {
    const text = String(value || "");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(4, maxLength - 1))}\u2026`;
}

function mentionOptions(node) {
    if (!isReferenceMode(node)) return [];
    const links = normalizeLinks(node);
    const mediaOrder = { image: 0, video: 1, audio: 2 };
    const orderedLinks = links
        .map((link, index) => ({ link, index }))
        .sort((left, right) => {
            const leftType = String(left.link.media_type || "image").toLowerCase();
            const rightType = String(right.link.media_type || "image").toLowerCase();
            return (mediaOrder[leftType] ?? 0) - (mediaOrder[rightType] ?? 0) || left.index - right.index;
        })
        .map((entry) => entry.link);
    const counts = { image: 0, video: 0, audio: 0 };
    const mode = referenceMentionMode(node);
    return orderedLinks.map((link) => {
        const type = String(link.media_type || "image");
        counts[type] = (counts[type] || 0) + 1;
        const ordinal = counts[type];
        const tag = type === "image" ? `<Picture ${ordinal}>` : type === "video" ? `<Video ${ordinal}>` : `<Audio ${ordinal}>`;
        const source = app.graph?.getNodeById?.(Number(link.source_id));
        watchMediaSourceNode(source);
        const filename = sourceFilename(source, type);
        const fullLabel = filename || sourceLabel(source);
        const label = mode === "index" ? `${LABELS[type] || type}${ordinal}` : truncateMentionLabel(fullLabel);
        return {
            type,
            tag,
            token: `@${mode === "index" ? label : fullLabel}`,
            label,
            fullLabel,
            ordinal,
            referenceMode: mode,
            source: sourceLabel(source),
            sourceId: Number(link.source_id),
            sourceSlot: Number(link.source_slot) || 0,
            previewUrl: sourcePreviewUrl(source, type),
        };
    });
}

function findMentionOption(options, reference, mode) {
    const type = String(reference?.mediaType || reference?.type || "image").toLowerCase();
    const ordinal = Number(reference?.ordinal);
    const rawSourceId = reference?.sourceId;
    const sourceId = rawSourceId == null || rawSourceId === "" ? Number.NaN : Number(rawSourceId);
    const sourceSlot = Number(reference?.sourceSlot) || 0;
    const findByOrdinal = () => Number.isFinite(ordinal) && ordinal > 0
        ? options.find((item) => item.type === type && Number(item.ordinal) === ordinal)
        : null;
    if (mode === "index") return findByOrdinal();
    if (Number.isFinite(sourceId)) {
        return options.find((item) => Number(item.sourceId) === sourceId
            && Number(item.sourceSlot) === sourceSlot
            && item.type === type) || null;
    }
    // Official tags pasted before their media exists only carry a type and an
    // ordinal. In filename mode, use that ordinal once to claim the future
    // source; after resolution updateMentionChip stores sourceId/sourceSlot and
    // the reference becomes source-bound like any other filename-mode chip.
    return findByOrdinal();
}

function isLikelyVideoUrl(url) {
    const value = String(url || "").toLowerCase();
    return /\.(mp4|webm|mov|mkv|avi|m4v)(?:[?#].*)?$/.test(value)
        || /[?&]filename=[^&]*\.(mp4|webm|mov|mkv|avi|m4v)(?:[&#]|$)/.test(value);
}

function mediaViewUrlFromWidgets(node, preferredNames) {
    const widgets = Array.isArray(node?.widgets) ? node.widgets : [];
    const preferred = new Set(preferredNames);
    const candidates = [
        ...widgets.filter((widget) => preferred.has(String(widget?.name || "").toLowerCase())),
        ...widgets,
    ];
    for (const widget of candidates) {
        const value = widget?.value;
        if (!value) continue;
        const filename = typeof value === "object" ? value?.filename : value;
        if (!filename) continue;
        const name = String(widget?.name || "").toLowerCase();
        if (!preferred.has(name) && !/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(String(filename))) continue;
        const params = new URLSearchParams({
            filename: String(filename),
            type: typeof value === "object" ? String(value.type || "input") : "input",
        });
        if (typeof value === "object" && value.subfolder) params.set("subfolder", String(value.subfolder));
        return `/view?${params.toString()}`;
    }
    return "";
}

function getNodeVideoSrc(node) {
    for (const widget of node?.widgets || []) {
        const element = widget?.element;
        const video = element?.matches?.("video") ? element : element?.querySelector?.("video");
        if (video?.currentSrc || video?.src) return video.currentSrc || video.src;
    }
    return mediaViewUrlFromWidgets(node, ["video", "file", "filename", "video_file", "videofile"]);
}

function refreshMentionPreviews() {
    for (const node of app.graph?._nodes || []) {
        if (!isTarget(node)) continue;
        normalizeLinks(node);
        if (!isReferenceMode(node)) {
            closeMentionMenu(node);
            continue;
        }
        const options = mentionOptions(node);
        const currentMode = referenceMentionMode(node);
        for (const chip of promptEditors(node).flatMap((editor) => [...editor.querySelectorAll(".h3-mention-chip")])) {
            const sourceId = chip.dataset.sourceId ? Number(chip.dataset.sourceId) : null;
            const ordinal = Number(chip.dataset.ordinal) || null;
            const option = findMentionOption(options, {
                mediaType: chip.dataset.mediaType || "image",
                ordinal,
                sourceId,
                sourceSlot: Number(chip.dataset.sourceSlot) || 0,
            }, currentMode);
            updateMentionChip(chip, option || {
                type: chip.dataset.mediaType || "image",
                token: chip.dataset.token || "",
                label: chip.dataset.label || chip.dataset.fullLabel || "",
                fullLabel: chip.dataset.fullLabel || chip.dataset.label || "",
                referenceMode: currentMode,
                ordinal,
                sourceId,
                sourceSlot: Number(chip.dataset.sourceSlot) || 0,
                previewUrl: "",
                unresolved: true,
                pending: sourceId == null && ordinal != null,
            });
        }
        if (node.__h3Editor) syncPromptFromEditor(node, false);
        const menu = node.__h3MentionMenu;
        if (menu) {
            const query = String(menu.mention?.query || "").toLowerCase();
            menu.options = options.filter((option) => !query || `${option.label} ${option.fullLabel || ""} ${option.source}`.toLowerCase().includes(query));
            menu.activeIndex = Math.min(menu.activeIndex, Math.max(0, menu.options.length - 1));
            renderMentionMenu(node);
        }
        node.setDirtyCanvas?.(true, true);
    }
    app.graph?.setDirtyCanvas?.(true, true);
}

function updateMentionChip(chip, option) {
    if (!chip || !option) return;
    const nextToken = option.token || option.tag || chip.dataset.token || "";
    const nextTag = option.tag || chip.dataset.tag || nextToken;
    const nextLabel = option.label || chip.dataset.label || nextToken;
    const nextFullLabel = option.fullLabel || nextLabel;
    const nextPreviewUrl = option.previewUrl || "";
    chip.classList.toggle("is-pending", Boolean(option.pending));
    chip.classList.toggle("is-unresolved", Boolean(option.unresolved) && !option.pending);
    chip.dataset.token = nextToken;
    chip.dataset.tag = nextTag;
    chip.dataset.label = nextLabel;
    chip.dataset.fullLabel = nextFullLabel;
    chip.dataset.mediaType = option.type || chip.dataset.mediaType || "image";
    chip.dataset.referenceMode = option.referenceMode || chip.dataset.referenceMode || "index";
    chip.dataset.ordinal = Number(option.ordinal) || chip.dataset.ordinal || "";
    chip.dataset.pendingReference = option.pending ? "true" : "";
    if (option.sourceId != null) chip.dataset.sourceId = String(option.sourceId);
    if (option.sourceSlot != null) chip.dataset.sourceSlot = String(Number(option.sourceSlot) || 0);
    chip.dataset.previewUrl = nextPreviewUrl;
    chip.title = option.pending
        ? (ZH_BROWSER ? "\u7b49\u5f85\u8fde\u63a5\u5bf9\u5e94\u5e8f\u53f7\u7684\u5a92\u4f53\u7d20\u6750" : "Waiting for media with the matching index")
        : option.unresolved
            ? (ZH_BROWSER ? "\u5df2\u65ad\u5f00\uff1a\u8bf7\u91cd\u65b0\u8fde\u63a5\u6216\u5220\u9664\u8be5\u5f15\u7528" : "Disconnected: reconnect or remove this reference")
        : nextFullLabel;
    const label = chip.querySelector?.(".h3-mention-chip-label");
    if (label) label.textContent = `@${nextLabel}`;
    const thumb = chip.querySelector?.(".h3-mention-chip-thumb");
    if (thumb && (thumb.dataset?.previewUrl !== nextPreviewUrl || thumb.dataset?.mediaType !== (option.type || "image"))) {
        const replacement = makeMentionThumb(option);
        replacement.dataset.previewUrl = nextPreviewUrl;
        thumb.replaceWith(replacement);
    } else if (!thumb) {
        const replacement = makeMentionThumb(option);
        replacement.dataset.previewUrl = nextPreviewUrl;
        chip.prepend(replacement);
    }
}

function requestMentionPreviewRefresh() {
    if (mentionPreviewRefreshTimer) return;
    mentionPreviewRefreshTimer = setTimeout(() => {
        mentionPreviewRefreshTimer = null;
        refreshMentionPreviews();
    }, 0);
}

function watchMediaSourceNode(node) {
    if (!node) return;
    node.__h3MediaSourceWatchInstalled = true;
    for (const widget of node.widgets || []) {
        if (!widget || widget.__h3MediaSourceWatchInstalled) continue;
        widget.__h3MediaSourceWatchInstalled = true;
        const originalCallback = widget.callback;
        widget.callback = function onMediaSourceWidgetChange(value) {
            const result = originalCallback?.apply(this, arguments);
            requestMentionPreviewRefresh();
            return result;
        };
        const element = widget.inputEl || widget.element;
        element?.addEventListener?.("change", requestMentionPreviewRefresh, true);
        element?.addEventListener?.("input", requestMentionPreviewRefresh, true);
    }
}

function installMediaSourceNode(nodeType, nodeData) {
    const name = String(nodeData?.name || "").toLowerCase();
    if (!name.includes("loadimage") && !name.includes("loadvideo") && !name.includes("loadaudio")) return;
    if (nodeType.prototype.__h3MediaSourceInstalled) return;
    nodeType.prototype.__h3MediaSourceInstalled = true;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedH3MediaSource() {
        const result = originalCreated?.apply(this, arguments);
        watchMediaSourceNode(this);
        return result;
    };
    const originalConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function onConfigureH3MediaSource(info) {
        const result = originalConfigure?.apply(this, arguments);
        watchMediaSourceNode(this);
        requestMentionPreviewRefresh();
        return result;
    };
}

function getVideoFrameThumbnail(videoUrl) {
    if (!videoUrl) return "";
    const cached = videoThumbnailCache.get(videoUrl);
    if (cached?.dataUrl) return cached.dataUrl;
    if (cached?.loading) return "";
    if (cached?.failed) {
        if (Date.now() - Number(cached.failedAt || 0) < 1800) return "";
        videoThumbnailCache.delete(videoUrl);
    }
    if (!isLikelyVideoUrl(videoUrl) && !/^blob:|^data:video\//i.test(videoUrl)) return "";

    const entry = { loading: true, dataUrl: "" };
    videoThumbnailCache.set(videoUrl, entry);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    let finished = false;
    let sampleTimes = [];
    let sampleIndex = 0;
    let bestFrame = null;

    const cleanup = () => {
        video.removeAttribute("src");
        video.load?.();
    };
    const succeed = (dataUrl) => {
        if (finished || !dataUrl) return;
        finished = true;
        entry.loading = false;
        entry.dataUrl = dataUrl;
        cleanup();
        requestMentionPreviewRefresh();
    };
    const fail = () => {
        if (finished) return;
        finished = true;
        entry.loading = false;
        entry.failed = true;
        entry.failedAt = Date.now();
        cleanup();
    };
    const measureFrame = (context, width, height) => {
        try {
            const data = context.getImageData(0, 0, width, height).data;
            let total = 0;
            let bright = 0;
            let count = 0;
            const stride = 4 * Math.max(1, Math.floor((width * height) / 1600));
            for (let index = 0; index < data.length; index += stride) {
                const luminance = (data[index] * 0.2126) + (data[index + 1] * 0.7152) + (data[index + 2] * 0.0722);
                total += luminance;
                if (luminance > 24) bright += 1;
                count += 1;
            }
            const average = count ? total / count : 0;
            const brightRatio = count ? bright / count : 0;
            return { score: average + brightRatio * 90, usable: average > 18 || brightRatio > 0.035 };
        } catch {
            return { score: 255, usable: true };
        }
    };
    const capture = () => {
        if (finished || !video.videoWidth || !video.videoHeight) return;
        try {
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 96 / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            const context = canvas.getContext("2d");
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const quality = measureFrame(context, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            if (!bestFrame || quality.score > bestFrame.score) bestFrame = { dataUrl, score: quality.score };
            if (quality.usable) succeed(dataUrl);
            else seekNextSample();
        } catch {
            fail();
        }
    };
    const captureDecodedFrame = () => {
        if (finished) return;
        if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback(capture);
        else setTimeout(capture, 80);
    };
    const seekNextSample = () => {
        if (finished) return;
        if (sampleIndex >= sampleTimes.length) {
            if (bestFrame?.dataUrl && bestFrame.score > 18) succeed(bestFrame.dataUrl);
            else fail();
            return;
        }
        const nextTime = sampleTimes[sampleIndex++];
        try {
            if (Math.abs(Number(video.currentTime || 0) - nextTime) < 0.015) captureDecodedFrame();
            else video.currentTime = nextTime;
        } catch {
            captureDecodedFrame();
        }
    };

    setTimeout(fail, 4500);
    video.addEventListener("loadedmetadata", () => {
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) sampleTimes = [0];
        else {
            const end = Math.max(0, duration - 0.06);
            sampleTimes = Array.from(new Set([
                duration * 0.12,
                0.5,
                duration * 0.3,
                duration * 0.55,
                duration * 0.8,
            ].map((time) => Number(Math.min(end, Math.max(0, time)).toFixed(3)))));
        }
        seekNextSample();
    }, { once: true });
    video.addEventListener("seeked", captureDecodedFrame);
    video.addEventListener("error", fail, { once: true });
    video.src = videoUrl;
    video.load?.();
    return "";
}

function sourcePreviewUrl(node, mediaType) {
    if (!node) return "";
    if (mediaType === "audio") return "";
    if (mediaType === "image") {
        const currentImageUrl = mediaViewUrlFromWidgets(node, ["image", "file", "filename"]);
        if (currentImageUrl) return currentImageUrl;
    }
    const image = (node.imgs || []).find((item) => item?.src && !isLikelyVideoUrl(item.src));
    if (image?.src) return image.src;
    for (const widget of node.widgets || []) {
        const element = widget?.element;
        const img = element?.matches?.("img") ? element : element?.querySelector?.("img");
        if (img?.src) return img.src;
        const video = element?.matches?.("video") ? element : element?.querySelector?.("video");
        if (mediaType === "video" && video?.poster) return video.poster;
    }
    if (mediaType === "video") return getVideoFrameThumbnail(getNodeVideoSrc(node));
    const value = getWidget(node, "image")?.value;
    const filename = typeof value === "object" ? value?.filename : value;
    if (!filename) return "";
    const params = new URLSearchParams({ filename: String(filename), type: typeof value === "object" ? String(value.type || "input") : "input" });
    if (typeof value === "object" && value.subfolder) params.set("subfolder", String(value.subfolder));
    return `/view?${params.toString()}`;
}

function makeAudioIcon(className) {
    const image = document.createElement("img");
    image.className = className;
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    image.src = AUDIO_ICON_SVG;
    image.style.background = "transparent";
    return image;
}

function makeMentionThumb(option, menu = false) {
    const className = menu ? "h3-mention-menu-thumb" : "h3-mention-chip-thumb";
    if (option.type === "audio") {
        const audio = makeAudioIcon(className);
        audio.dataset.previewUrl = "";
        audio.dataset.mediaType = "audio";
        return audio;
    }
    if (option.previewUrl) {
        const image = document.createElement("img");
        image.className = className;
        image.alt = "";
        image.draggable = false;
        image.src = option.previewUrl;
        image.dataset.previewUrl = option.previewUrl;
        image.dataset.mediaType = option.type || "image";
        image.addEventListener("error", () => image.replaceWith(makeMentionThumb({ ...option, previewUrl: "" }, menu)), { once: true });
        return image;
    }
    const icon = document.createElement("span");
    icon.className = `${className} is-${option.type || "image"}`;
    icon.setAttribute("aria-hidden", "true");
    icon.dataset.previewUrl = "";
    icon.dataset.mediaType = option.type || "image";
    return icon;
}

function makeMentionChip(option) {
    const chip = document.createElement("span");
    chip.className = `h3-mention-chip${option.pending ? " is-pending" : option.unresolved ? " is-unresolved" : ""}`;
    chip.contentEditable = "false";
    chip.dataset.token = option.token || option.tag || "";
    chip.dataset.tag = option.tag || option.token || "";
    chip.dataset.label = option.label || "";
    chip.dataset.fullLabel = option.fullLabel || option.label || "";
    chip.dataset.mediaType = option.type || "image";
    chip.dataset.referenceMode = option.referenceMode || "index";
    chip.dataset.ordinal = Number(option.ordinal) || "";
    chip.dataset.sourceId = option.sourceId != null ? String(option.sourceId) : "";
    chip.dataset.sourceSlot = String(option.sourceSlot || 0);
    chip.dataset.previewUrl = option.previewUrl || "";
    chip.dataset.pendingReference = option.pending ? "true" : "";
    chip.title = option.pending
        ? (ZH_BROWSER ? "\u7b49\u5f85\u8fde\u63a5\u5bf9\u5e94\u5e8f\u53f7\u7684\u5a92\u4f53\u7d20\u6750" : "Waiting for media with the matching index")
        : option.unresolved
            ? (ZH_BROWSER ? "\u5df2\u65ad\u5f00\uff1a\u8bf7\u91cd\u65b0\u8fde\u63a5\u6216\u5220\u9664\u8be5\u5f15\u7528" : "Disconnected: reconnect or remove this reference")
        : (option.fullLabel || option.label || "");
    const label = document.createElement("span");
    label.className = "h3-mention-chip-label";
    label.textContent = `@${option.label || ""}`;
    chip.append(makeMentionThumb(option), label);
    chip.addEventListener("pointerdown", (event) => {
        if (event.target?.closest?.(".h3-mention-chip-label")) return;
        event.preventDefault();
        event.stopPropagation();
        const selection = window.getSelection?.();
        if (!selection) return;
        const range = document.createRange();
        const before = event.clientX < chip.getBoundingClientRect().left + chip.getBoundingClientRect().width / 2;
        before ? range.setStartBefore(chip) : range.setStartAfter(chip);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    });
    return chip;
}

function isDialogueBlock(node) {
    return node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains(DIALOGUE_CLASS);
}

function dialogueBlockText(block) {
    return editorText(block);
}

function makeDialogueBlock(value = "") {
    const block = document.createElement("span");
    block.className = DIALOGUE_CLASS;
    block.spellcheck = false;
    block.dataset.dialogue = "true";
    appendTextWithBreaks(block, value);
    if (!String(value || "")) block.append(makeCaretSentinel());
    return block;
}

function ensureDialogueInnerCaret(block) {
    if (!block || dialogueBlockText(block)) return;
    if (![...(block.childNodes || [])].some((node) => isCaretSentinelText(node))) {
        block.append(makeCaretSentinel());
    }
}

function appendDialogueBlock(container, value = "") {
    container.append(makeCaretSentinel(), makeDialogueBlock(value), makeCaretSentinel());
}

function appendPromptTextWithDialogueBlocks(container, value) {
    const source = String(value || "");
    const pattern = /<d>([\s\S]*?)<\/d>/gi;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source))) {
        appendTextWithBreaks(container, source.slice(cursor, match.index));
        appendDialogueBlock(container, match[1]);
        cursor = match.index + match[0].length;
    }
    appendTextWithBreaks(container, source.slice(cursor));
}

function promptViewMode(node) {
    return String(node?.properties?.[PROMPT_VIEW_PROP] || PROMPT_VIEW_STRUCTURED) === PROMPT_VIEW_RAW
        ? PROMPT_VIEW_RAW
        : PROMPT_VIEW_STRUCTURED;
}

function isRawPromptMode(node) {
    return promptViewMode(node) === PROMPT_VIEW_RAW;
}

function setPromptViewMode(node, mode) {
    if (!node) return;
    node.properties ||= {};
    node.properties[PROMPT_VIEW_PROP] = mode === PROMPT_VIEW_RAW ? PROMPT_VIEW_RAW : PROMPT_VIEW_STRUCTURED;
}

function normalizePromptField(value) {
    return String(value || "").toLowerCase() === PROMPT_FIELD_OPTIMIZED ? PROMPT_FIELD_OPTIMIZED : PROMPT_FIELD_SOURCE;
}

function promptDocText(doc) {
    if (!doc || typeof doc !== "object") return "";
    return Array.isArray(doc.parts) ? promptDocTextFromParts(doc.parts) : String(doc.text || "");
}

function promptDocIsEmpty(doc) {
    return !promptDocText(doc).trim();
}

function emptyPromptDoc() {
    return { version: 1, text: "", parts: [] };
}

function defaultPromptTabLabel(index) {
    return `${TEXT.promptTabPrefix} ${Math.max(1, Number(index) + 1)}`;
}

function normalizePromptTabEntry(entry, index) {
    const source = entry && typeof entry === "object" ? entry : {};
    const label = String(source.label || "").trim().slice(0, PROMPT_TAB_LABEL_LIMIT);
    return {
        label: label || defaultPromptTabLabel(index),
        [PROMPT_FIELD_SOURCE]: clonePromptDoc(source[PROMPT_FIELD_SOURCE]),
        [PROMPT_FIELD_OPTIMIZED]: clonePromptDoc(source[PROMPT_FIELD_OPTIMIZED]),
    };
}

/**
 * The node's tab sets, migrating older shapes on first touch.
 *
 * Upstream stored one prompt document; the first version of this fork stored a
 * source and an optimized document. Both become the first tab, so no saved
 * prompt is lost when a workflow is opened with a newer build.
 */
function promptTabs(node) {
    if (!node) return [];
    node.properties ||= {};
    let tabs = node.properties[PROMPT_TABS_PROP];
    if (!Array.isArray(tabs) || !tabs.length) {
        const legacySource = node.properties[PROMPT_DOC_PROP];
        const legacyOptimized = node.properties[PROMPT_OPTIMIZED_DOC_PROP];
        const first = normalizePromptTabEntry({ source: legacySource, optimized: legacyOptimized }, 0);
        if (!legacySource) {
            const text = String(getWidget(node, "prompt")?.value || "");
            if (text) first[PROMPT_FIELD_SOURCE] = { version: 1, text, parts: promptPartsFromText(node, text) };
        }
        tabs = [first];
        node.properties[PROMPT_TABS_PROP] = tabs;
        delete node.properties[PROMPT_DOC_PROP];
        delete node.properties[PROMPT_OPTIMIZED_DOC_PROP];
        return tabs;
    }
    return tabs;
}

function activePromptTabIndex(node) {
    const tabs = promptTabs(node);
    const index = Number(node?.properties?.[PROMPT_TAB_INDEX_PROP]);
    if (!Number.isFinite(index)) return 0;
    return Math.min(tabs.length - 1, Math.max(0, Math.floor(index)));
}

function setActivePromptTabIndex(node, index) {
    if (!node) return;
    const tabs = promptTabs(node);
    node.properties ||= {};
    node.properties[PROMPT_TAB_INDEX_PROP] = Math.min(tabs.length - 1, Math.max(0, Math.floor(Number(index) || 0)));
}

function activePromptTab(node) {
    const tabs = promptTabs(node);
    return tabs[activePromptTabIndex(node)] || null;
}

function promptDocForField(node, field) {
    return activePromptTab(node)?.[normalizePromptField(field)] || null;
}

function setPromptDocForField(node, field, doc) {
    const tab = activePromptTab(node);
    if (!tab) return;
    tab[normalizePromptField(field)] = doc;
}

/**
 * The field of the active tab that is actually sent to MiniMax H3. The
 * optimized text only takes over once it holds something, so a tab that never
 * ran the optimizer keeps generating from its source prompt.
 */
function effectivePromptField(node) {
    return promptDocIsEmpty(promptDocForField(node, PROMPT_FIELD_OPTIMIZED)) ? PROMPT_FIELD_SOURCE : PROMPT_FIELD_OPTIMIZED;
}

function effectivePromptDoc(node) {
    return promptDocForField(node, effectivePromptField(node));
}

function effectivePromptText(node) {
    return promptDocText(effectivePromptDoc(node));
}

function syncPromptWidgetFromDocs(node) {
    const widget = getWidget(node, "prompt");
    if (!widget) return;
    const text = effectivePromptText(node);
    widget.value = text;
    if (widget._state) widget._state.value = text;
}

function promptEditorPlaceholder(node, field) {
    if (normalizePromptField(field) === PROMPT_FIELD_OPTIMIZED) return TEXT.optimizedPromptPlaceholder;
    if (isRawPromptMode(node)) return TEXT.rawPromptPlaceholder;
    return isReferenceMode(node) ? TEXT.referencePromptPlaceholder : TEXT.promptPlaceholder;
}

function promptEditors(node) {
    const editors = node?.__h3Editors;
    return editors ? PROMPT_FIELDS.map((field) => editors[field]).filter(Boolean) : [];
}

function promptEditorFor(node, field) {
    return node?.__h3Editors?.[normalizePromptField(field)] || null;
}

function editorPromptField(editor) {
    return normalizePromptField(editor?.__h3PromptField);
}

function promptMentionTag(type, ordinal) {
    const mediaType = String(type || "image").toLowerCase();
    const index = Number(ordinal);
    if (!Number.isFinite(index) || index <= 0) return "";
    if (mediaType === "image") return "<Picture " + index + ">";
    if (mediaType === "video") return "<Video " + index + ">";
    if (mediaType === "audio") return "<Audio " + index + ">";
    return "";
}

function promptTextFromPart(part) {
    if (part?.type === "dialogue") return "<d>" + String(part.text || "") + "</d>";
    if (part?.type !== "mention") return String(part?.text || "");
    return String(part.tag || part.token || promptMentionTag(part.mediaType, part.ordinal) || "");
}

function promptDocTextFromParts(parts) {
    return (Array.isArray(parts) ? parts : []).map((part) => promptTextFromPart(part)).join("");
}

function promptPartsFromText(node, value) {
    const text = String(value || "");
    const parts = [];
    const pushText = (chunk) => {
        const next = String(chunk || "");
        if (!next) return;
        if (parts.at(-1)?.type === "text") parts[parts.length - 1].text += next;
        else parts.push({ type: "text", text: next });
    };
    let plainStart = 0;
    let cursor = 0;
    const candidates = pastedMentionCandidates(node);
    while (cursor < text.length) {
        const dialogueMatch = text.slice(cursor).match(/^<d>([\s\S]*?)<\/d>/i);
        const match = dialogueMatch ? {
            raw: dialogueMatch[0],
            kind: "dialogue",
            text: dialogueMatch[1] || "",
        } : pastedOfficialMediaTagMatch(node, text, cursor)
            || candidates.find((candidate) => text.slice(cursor, cursor + candidate.raw.length).toLocaleLowerCase() === candidate.raw.toLocaleLowerCase());
        if (!match) {
            cursor += 1;
            continue;
        }
        if (plainStart < cursor) pushText(text.slice(plainStart, cursor));
        if (match.kind === "dialogue") {
            parts.push({ type: "dialogue", text: match.text });
            cursor += match.raw.length;
            plainStart = cursor;
            continue;
        }
        const option = match.option || {};
        parts.push({
            type: "mention",
            token: match.raw || option.token || "",
            tag: option.tag || match.raw || option.token || "",
            label: option.label || "",
            fullLabel: option.fullLabel || option.label || "",
            mediaType: option.type || "image",
            referenceMode: option.referenceMode || referenceMentionMode(node),
            ordinal: Number(option.ordinal) || null,
            sourceId: option.sourceId != null ? Number(option.sourceId) : null,
            sourceSlot: Number(option.sourceSlot) || 0,
            previewUrl: option.previewUrl || "",
            unresolved: Boolean(option.unresolved),
            pending: Boolean(option.pending),
        });
        cursor += match.raw.length;
        plainStart = cursor;
    }
    if (plainStart < text.length) pushText(text.slice(plainStart));
    return parts;
}

function serializeRawPromptDoc(node, editor) {
    let text = "";
    const parts = [];
    const pushText = (value) => {
        const next = String(value || "").replaceAll(CARET_SENTINEL, "");
        if (!next) return;
        text += next;
    };
    const visit = (item) => {
        if (item.nodeType === Node.TEXT_NODE) {
            pushText(item.textContent);
            return;
        }
        if (item.nodeType !== Node.ELEMENT_NODE) return;
        if (isDialogueBlock(item)) {
            const dialogue = dialogueBlockText(item);
            text += `<d>${dialogue}</d>`;
            return;
        }
        if (isMentionChip(item)) {
            text += String(item.dataset.tag || item.dataset.token || "");
            return;
        }
        if (item.tagName === "BR") {
            text += "\n";
            return;
        }
        for (const child of item.childNodes || []) visit(child);
    };
    for (const child of editor.childNodes || []) visit(child);
    return {
        version: 1,
        text,
        parts: promptPartsFromText(node, text),
    };
}

function appendRawPromptText(container, value) {
    appendTextWithBreaks(container, String(value || ""));
}

function serializeEditorDoc(editor) {
    const node = editorPromptNode(editor);
    if (isRawPromptMode(node)) {
        const current = promptDocForField(node, editorPromptField(editor));
        if (!editor?.__h3RawNeedsSync && current) return clonePromptDoc(current);
        return serializeRawPromptDoc(node, editor);
    }
    const parts = [];
    const pushText = (text) => {
        const value = String(text || "").replaceAll("\u200B", "");
        if (!value) return;
        if (parts.at(-1)?.type === "text") parts[parts.length - 1].text += value;
        else parts.push({ type: "text", text: value });
    };
    const visit = (item) => {
        if (item.nodeType === Node.TEXT_NODE) {
            pushText(item.textContent);
            return;
        }
        if (item.nodeType !== Node.ELEMENT_NODE) return;
        if (isDialogueBlock(item)) {
            const text = dialogueBlockText(item);
            parts.push({ type: "dialogue", text });
            return;
        }
        if (item.classList?.contains("h3-mention-chip")) {
            parts.push({
                type: "mention",
                token: item.dataset.token || "",
                tag: item.dataset.tag || item.dataset.token || "",
                label: item.dataset.label || "",
                fullLabel: item.dataset.fullLabel || item.dataset.label || "",
                mediaType: item.dataset.mediaType || "image",
                referenceMode: item.dataset.referenceMode || "index",
                ordinal: Number(item.dataset.ordinal) || null,
                sourceId: item.dataset.sourceId ? Number(item.dataset.sourceId) : null,
                sourceSlot: Number(item.dataset.sourceSlot) || 0,
                previewUrl: item.dataset.previewUrl || "",
            });
            return;
        }
        if (item.tagName === "BR") {
            pushText("\n");
            return;
        }
        const block = ["DIV", "P"].includes(item.tagName);
        if (block && parts.length && !(parts.at(-1)?.type === "text" && parts.at(-1).text.endsWith("\n"))) pushText("\n");
        for (const child of item.childNodes || []) visit(child);
    };
    for (const child of editor.childNodes || []) visit(child);
    return {
        version: 1,
        text: promptDocTextFromParts(parts),
        parts,
    };
}

function appendTextWithBreaks(container, value) {
    String(value || "").split("\n").forEach((part, index) => {
        if (index) container.append(document.createElement("br"));
        if (part) container.append(document.createTextNode(part));
    });
}

function renderEditorFromNode(node, force = false, field = null) {
    if (field === null) {
        for (const name of PROMPT_FIELDS) renderEditorFromNode(node, force, name);
        return;
    }
    const editor = promptEditorFor(node, field);
    if (!editor || (document.activeElement === editor && !force)) return;
    const doc = promptDocForField(node, field);
    editor.textContent = "";
    const raw = isRawPromptMode(node);
    editor.classList.toggle("is-raw", raw);
    node.__h3EditorWrap?.classList?.toggle("is-raw", raw);
    if (raw) {
        closeMentionMenu(node);
        appendRawPromptText(editor, promptDocText(doc));
        return;
    }
    if (!Array.isArray(doc?.parts)) {
        appendPromptTextWithDialogueBlocks(editor, String(doc?.text || ""));
        return;
    }
    const live = mentionOptions(node);
    for (const part of doc.parts) {
        if (part?.type === "dialogue") {
            appendDialogueBlock(editor, String(part.text || ""));
            continue;
        }
        if (part?.type !== "mention") {
            appendTextWithBreaks(editor, part?.text || "");
            continue;
        }
        const currentMode = referenceMentionMode(node);
        const partSourceId = part.sourceId != null && Number.isFinite(Number(part.sourceId)) ? Number(part.sourceId) : null;
        const partOrdinal = Number(part.ordinal) || null;
        const option = findMentionOption(live, {
            mediaType: part.mediaType || "image",
            ordinal: partOrdinal,
            sourceId: partSourceId,
            sourceSlot: Number(part.sourceSlot) || 0,
        }, currentMode);
        editor.append(makeMentionChip({
            type: part.mediaType || option?.type || "image",
            token: option?.token || part.token || option?.tag || "",
            tag: option?.tag || part.tag || part.token || "",
            label: option?.label || part.label || part.token || "",
            fullLabel: option?.fullLabel || part.fullLabel || part.label || part.token || "",
            referenceMode: currentMode,
            ordinal: option?.ordinal ?? part.ordinal,
            sourceId: option?.sourceId ?? part.sourceId,
            sourceSlot: option?.sourceSlot ?? part.sourceSlot ?? 0,
            previewUrl: option?.previewUrl || "",
            unresolved: !option,
            pending: !option && partSourceId == null && partOrdinal != null,
        }));
    }
}

function syncPromptFromEditor(node, markDirty = true) {
    const widget = getWidget(node, "prompt");
    const editors = promptEditors(node);
    if (!editors.length || !widget || node.__h3EditorSyncing) return;
    node.__h3EditorSyncing = true;
    try {
        node.properties ||= {};
        for (const editor of editors) {
            setPromptDocForField(node, editorPromptField(editor), serializeEditorDoc(editor));
            if (isRawPromptMode(node)) editor.__h3RawNeedsSync = false;
        }
        // The widget value stays the prompt that will actually be generated,
        // so a disabled frontend or a legacy reader still sees the right text.
        syncPromptWidgetFromDocs(node);
        syncPromptTabStrip(node);
        if (markDirty) {
            node.setDirtyCanvas?.(true, true);
            app.graph?.setDirtyCanvas?.(true, true);
            app.graph?.change?.();
        }
    } finally {
        node.__h3EditorSyncing = false;
    }
}

function clonePromptDoc(doc) {
    const source = doc && typeof doc === "object" ? doc : {};
    return {
        version: 1,
        text: String(source.text || ""),
        parts: Array.isArray(source.parts) ? source.parts.map((part) => ({ ...part })) : [],
    };
}

function promptDocKey(doc) {
    return JSON.stringify(clonePromptDoc(doc));
}

function editorPromptNode(editor) {
    return editor?.__h3PromptNode || null;
}

function editorFromEvent(event) {
    const target = event?.target;
    if (target?.closest) {
        const editor = target.closest(".h3-prompt-editor");
        if (editor) return editor;
    }
    const active = typeof document !== "undefined" ? document.activeElement : null;
    return active?.closest?.(".h3-prompt-editor") || activePromptNode?.__h3Editor || null;
}

function isPromptUndoRedoEvent(event) {
    if (!(event?.ctrlKey || event?.metaKey)) return false;
    const key = String(event.key || "").toLowerCase();
    const code = String(event.code || "");
    return key === "z" || key === "y" || code === "KeyZ" || code === "KeyY";
}

// Undo state lives on the editor element, so every prompt field keeps its own
// stack without the callers having to name a field.
function ensurePromptHistory(node, editor = node?.__h3Editor) {
    if (!editor) return null;
    if (editor.__h3History) return editor.__h3History;
    const doc = clonePromptDoc(serializeEditorDoc(editor));
    editor.__h3History = {
        undo: [{ doc }],
        redo: [],
        lastKey: promptDocKey(doc),
        applying: false,
    };
    return editor.__h3History;
}

function resetPromptHistory(node) {
    for (const editor of promptEditors(node)) {
        editor.__h3History = null;
        ensurePromptHistory(node, editor);
    }
}

function pushPromptHistory(node, editor = node?.__h3Editor) {
    const history = ensurePromptHistory(node, editor);
    if (!history || !editor || history.applying) return;
    const doc = clonePromptDoc(serializeEditorDoc(editor));
    const key = promptDocKey(doc);
    if (key === history.lastKey) return;
    history.undo.push({ doc });
    if (history.undo.length > PROMPT_HISTORY_LIMIT) history.undo.shift();
    history.redo = [];
    history.lastKey = key;
}

function setEditorCaretAtEnd(editor) {
    if (!editor) return;
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

function applyPromptHistoryEntry(node, entry, editor = node?.__h3Editor) {
    const history = editor?.__h3History;
    const widget = getWidget(node, "prompt");
    if (!history || !editor || !entry?.doc || !widget) return false;
    const field = editorPromptField(editor);
    history.applying = true;
    try {
        const doc = clonePromptDoc(entry.doc);
        node.properties ||= {};
        setPromptDocForField(node, field, doc);
        syncPromptWidgetFromDocs(node);
        renderEditorFromNode(node, true, field);
        syncPromptFromEditor(node, false);
        history.lastKey = promptDocKey(doc);
    } finally {
        history.applying = false;
    }
    closeMentionMenu(node);
    editor.focus();
    setEditorCaretAtEnd(editor);
    return true;
}

function handlePromptHistoryKeydown(node, event) {
    if (!isPromptUndoRedoEvent(event)) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    const editor = node?.__h3Editor;
    const history = ensurePromptHistory(node, editor);
    if (!history) return true;
    const key = String(event.key || "").toLowerCase();
    const isRedo = key === "y" || String(event.code || "") === "KeyY" || (key === "z" && event.shiftKey);
    if (isRedo) {
        const entry = history.redo.pop();
        if (!entry) return true;
        history.undo.push(entry);
        applyPromptHistoryEntry(node, entry);
        return true;
    }
    if (history.undo.length <= 1) return true;
    const current = history.undo.pop();
    if (current) history.redo.push(current);
    applyPromptHistoryEntry(node, history.undo[history.undo.length - 1]);
    return true;
}

function handlePromptUndoRedoCapture(event) {
    if (!isPromptUndoRedoEvent(event)) return;
    const node = editorPromptNode(editorFromEvent(event));
    if (node && !node.__h3PromptComposing) {
        pushPromptHistory(node);
        handlePromptHistoryKeydown(node, event);
    }
}

function handlePromptHistoryBeforeInputCapture(event) {
    if (event?.inputType !== "historyUndo" && event?.inputType !== "historyRedo") return;
    const node = editorPromptNode(editorFromEvent(event));
    if (!node || node.__h3PromptComposing) return;
    const isRedo = event.inputType === "historyRedo";
    pushPromptHistory(node);
    handlePromptHistoryKeydown(node, {
        ctrlKey: true,
        metaKey: false,
        shiftKey: isRedo,
        key: isRedo ? "y" : "z",
        code: isRedo ? "KeyY" : "KeyZ",
        preventDefault: () => event.preventDefault?.(),
        stopPropagation: () => event.stopPropagation?.(),
        stopImmediatePropagation: () => event.stopImmediatePropagation?.(),
    });
}

function ensurePromptUndoRedoShield() {
    if (globalThis.__H3_PROMPT_UNDO_SHIELD_INSTALLED || typeof window === "undefined") return;
    globalThis.__H3_PROMPT_UNDO_SHIELD_INSTALLED = true;
    globalThis.__H3_PROMPT_UNDO_VERSION = PROMPT_UNDO_VERSION;
    window.addEventListener("keydown", handlePromptUndoRedoCapture, true);
    window.addEventListener("pointerdown", (event) => {
        const editor = event?.target?.closest?.(".h3-prompt-editor");
        activePromptNode = editorPromptNode(editor);
    }, true);
    document.addEventListener("focusin", (event) => {
        const editor = event?.target?.closest?.(".h3-prompt-editor");
        activePromptNode = editorPromptNode(editor);
    }, true);
    document.addEventListener("beforeinput", handlePromptHistoryBeforeInputCapture, true);
}

function patchLiteGraphPromptProcessKey() {
    if (globalThis.__H3_PROMPT_PROCESS_KEY_PATCHED || !globalThis.LGraphCanvas?.prototype) return;
    const proto = globalThis.LGraphCanvas.prototype;
    const originalProcessKey = proto.processKey;
    if (typeof originalProcessKey !== "function") return;
    globalThis.__H3_PROMPT_PROCESS_KEY_PATCHED = true;
    proto.processKey = function processKeyH3PromptEditorShield(event) {
        const node = editorPromptNode(editorFromEvent(event));
        if (node && isPromptUndoRedoEvent(event)) {
            pushPromptHistory(node);
            handlePromptHistoryKeydown(node, event);
            return;
        }
        return originalProcessKey.apply(this, arguments);
    };
}

function preparePromptEditorForUndo(editor) {
    if (!editor) return;
    if (editor.__h3UndoPrepared && editor.dataset?.h3UndoVersion === PROMPT_UNDO_VERSION) return;
    editor.setAttribute("data-h3-undo-version", PROMPT_UNDO_VERSION);
    try {
        Object.defineProperty(editor, "type", {
            value: "textarea",
            configurable: true,
        });
    } catch {
        editor.type = "textarea";
    }
    editor.__h3UndoPrepared = true;
}

function getMentionRange(editor) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
    const caret = selection.getRangeAt(0);
    if (!editor.contains(caret.startContainer)) return null;
    if (caret.startContainer.parentElement?.closest?.(`.${DIALOGUE_CLASS}`)) return null;
    // Mention chips are contentEditable=false elements whose visible text also
    // contains an "@". Reading cloneContents().textContent therefore made a
    // normal character typed after an existing chip look like an active @ query.
    // Build a small editable-text stream instead, treating chips and line breaks
    // as hard boundaries.
    const units = [];
    const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (!node.parentElement?.closest?.(".h3-mention-chip")) units.push({ kind: "text", node });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (isDialogueBlock(node)) {
            units.push({ kind: "dialogue", node });
            return;
        }
        if (node.classList?.contains("h3-mention-chip")) {
            units.push({ kind: "chip", node });
            return;
        }
        if (node.tagName === "BR") {
            units.push({ kind: "break", node });
            return;
        }
        for (const child of node.childNodes || []) visit(child);
    };
    visit(editor);

    if (caret.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const currentIndex = units.findIndex((unit) => unit.kind === "text" && unit.node === caret.startContainer);
    if (currentIndex < 0) return null;

    const selected = [];
    for (let index = currentIndex; index >= 0; index -= 1) {
        const unit = units[index];
        if (unit.kind !== "text") break;
        const end = index === currentIndex ? caret.startOffset : (unit.node.textContent || "").length;
        selected.unshift({ unit, text: (unit.node.textContent || "").slice(0, end) });
    }
    const before = selected.map((entry) => entry.text).join("");
    const match = before.match(/@[^@\n]*$/);
    if (!match) return null;

    const targetStart = before.length - match[0].length;
    let offset = 0;
    const range = document.createRange();
    for (const entry of selected) {
        const next = offset + entry.text.length;
        if (targetStart <= next) {
            range.setStart(entry.unit.node, Math.max(0, targetStart - offset));
            break;
        }
        offset = next;
    }
    range.setEnd(caret.startContainer, caret.startOffset);
    return { range, query: match[0].slice(1) };
}

function closeMentionMenu(node) {
    const menu = node?.__h3MentionMenu;
    menu?.element?.remove?.();
    if (node) node.__h3MentionMenu = null;
}

function dialogueBlockAtSelection(editor) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return null;
    const container = selection.getRangeAt(0).startContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    const block = element?.closest?.(`.${DIALOGUE_CLASS}`);
    return block && editor.contains(block) ? block : null;
}

function dialogueBoundary(block, side) {
    if (!block?.parentNode) return null;
    const sibling = side === "before" ? block.previousSibling : block.nextSibling;
    if (isCaretSentinelText(sibling)) return sibling;
    const marker = makeCaretSentinel();
    block.parentNode.insertBefore(marker, side === "before" ? block : block.nextSibling);
    return marker;
}

function setCaretAtEndOfNode(node) {
    if (!node) return;
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    let target = node;
    while (target?.lastChild) target = target.lastChild;
    if (target?.nodeType === Node.TEXT_NODE) {
        range.setStart(target, target.textContent.length);
    } else if (target?.parentNode && target !== node) {
        range.setStartAfter(target);
    } else {
        range.setStart(node, node.childNodes.length);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function exitDialogueBlock(node, editor, block) {
    const marker = dialogueBoundary(block, "after");
    if (!marker) return false;
    const text = String(marker.textContent || "");
    const index = text.indexOf(CARET_SENTINEL);
    editor.focus({ preventScroll: true });
    setCaretAtNode(marker, index >= 0 ? index + CARET_SENTINEL.length : text.length);
    closeMentionMenu(node);
    return true;
}

function insertDialogueBlockAtSelection(node, editor) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !editor) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;
    if (dialogueBlockAtSelection(editor)) return false;
    range.deleteContents();
    const before = makeCaretSentinel();
    const block = makeDialogueBlock("");
    const after = makeCaretSentinel();
    const fragment = document.createDocumentFragment();
    fragment.append(before, block, after);
    range.insertNode(fragment);
    editor.focus({ preventScroll: true });
    setCaretAtEndOfNode(block);
    closeMentionMenu(node);
    return true;
}

function findDialogueAcrossWhitespace(start, root, direction) {
    let current = start;
    const skipped = [];
    while (current) {
        if (isDialogueBlock(current)) return { block: current, skipped };
        if (isIgnorableTextNode(current)) {
            skipped.push(current);
            current = adjacentLeaf(current, root, direction);
            continue;
        }
        return null;
    }
    return null;
}

function deleteLastDialogueContent(block) {
    const leaves = [];
    const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            leaves.push(node);
            return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
            leaves.push(node);
            return;
        }
        for (const child of node.childNodes || []) visit(child);
    };
    for (const child of block.childNodes || []) visit(child);
    for (let index = leaves.length - 1; index >= 0; index -= 1) {
        const leaf = leaves[index];
        if (leaf.nodeType === Node.TEXT_NODE) {
            if (deleteLastVisibleChar(leaf)) {
                setCaretAtEndOfNode(block);
                return true;
            }
            if (!leaf.textContent) leaf.remove();
            continue;
        }
        if (leaf.nodeType === Node.ELEMENT_NODE && leaf.tagName === "BR") {
            const next = leaf.nextSibling;
            leaf.remove();
            if (isOnlyCaretSentinelText(next)) next.remove();
            setCaretAtEndOfNode(block);
            return true;
        }
    }
    ensureDialogueInnerCaret(block);
    setCaretAtEndOfNode(block);
    return false;
}

function removeDialogueBlock(block) {
    if (!block?.parentNode) return false;
    const parent = block.parentNode;
    const before = block.previousSibling;
    const after = block.nextSibling;
    let marker = isCaretSentinelText(before) ? before : null;
    if (!marker) {
        marker = makeCaretSentinel();
        parent.insertBefore(marker, block);
    }
    block.remove();
    if (after !== marker && isOnlyCaretSentinelText(after)) after.remove();
    setCaretAtNode(marker, marker.textContent.length);
    return true;
}

function backspaceDialogueBoundary(editor, node) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const activeBlock = dialogueBlockAtSelection(editor);
    if (activeBlock) {
        if (!dialogueBlockText(activeBlock)) {
            const removed = removeDialogueBlock(activeBlock);
            if (removed) closeMentionMenu(node);
            return removed;
        }
        return false;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return false;
    const scan = getDeletionScanStart(range, editor, "backward");
    if (!scan) return false;
    const found = findDialogueAcrossWhitespace(scan.start, editor, "backward");
    if (!found?.block) return false;
    for (const skipped of found.skipped) skipped.remove?.();
    const block = found.block;
    if (dialogueBlockText(block)) {
        if (!deleteLastDialogueContent(block)) return false;
        closeMentionMenu(node);
        return true;
    }
    const removed = removeDialogueBlock(block);
    if (removed) closeMentionMenu(node);
    return removed;
}

function positionMentionMenu(element, editor) {
    const selection = window.getSelection?.();
    const caret = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    const editorRect = editor.getBoundingClientRect();
    const rect = caret && (caret.width || caret.height) ? caret : editorRect;
    const width = Math.min(280, Math.max(198, element.offsetWidth || 198));
    const height = Math.min(360, element.offsetHeight || 120);
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    element.style.left = `${Math.max(8, Math.round(left))}px`;
    element.style.top = `${Math.max(8, Math.round(top))}px`;
}

function chooseMention(node, option) {
    const state = node?.__h3MentionMenu;
    const range = state?.mention?.range;
    // The chip belongs to the field the picker was opened from, not to
    // whatever happens to hold focus when the menu item is clicked.
    const editor = state?.editor || node?.__h3Editor;
    if (!range || !editor) return;
    range.deleteContents();
    const before = document.createTextNode("\u200B");
    const chip = makeMentionChip(option);
    const after = document.createTextNode("\u200B");
    const fragment = document.createDocumentFragment();
    fragment.append(before, chip, after);
    range.insertNode(fragment);
    const selection = window.getSelection?.();
    if (selection) {
        const caret = document.createRange();
        caret.setStart(after, after.textContent.length);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
    }
    closeMentionMenu(node);
    syncPromptFromEditor(node);
    pushPromptHistory(node);
    editor.focus();
}

function renderMentionMenu(node) {
    const state = node?.__h3MentionMenu;
    if (!state) return;
    const { element, options, activeIndex } = state;
    element.textContent = "";
    const title = document.createElement("div");
    title.className = "h3-mention-menu-title";
    title.textContent = TEXT.mentionTitle;
    element.append(title);
    if (!options.length) {
        const empty = document.createElement("div");
        empty.className = "h3-mention-menu-empty";
        empty.textContent = TEXT.mentionEmpty;
        element.append(empty);
        return;
    }
    options.forEach((option, index) => {
        const item = document.createElement("div");
        item.className = `h3-mention-menu-item${index === activeIndex ? " is-active" : ""}`;
        const main = document.createElement("div");
        main.className = "h3-mention-menu-main";
        main.textContent = option.label;
        main.title = option.fullLabel || option.label || "";
        const detail = document.createElement("div");
        detail.className = "h3-mention-menu-detail";
        detail.textContent = option.source;
        const text = document.createElement("div");
        text.append(main, detail);
        item.append(makeMentionThumb(option, true), text);
        item.addEventListener("pointermove", () => {
            if (!node.__h3MentionMenu || node.__h3MentionMenu.activeIndex === index) return;
            node.__h3MentionMenu.activeIndex = index;
            renderMentionMenu(node);
        });
        item.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            chooseMention(node, option);
        });
        element.append(item);
    });
}

function openMentionMenu(node, editor) {
    if (!isReferenceMode(node)) {
        closeMentionMenu(node);
        return false;
    }
    const mention = getMentionRange(editor);
    if (!mention) {
        closeMentionMenu(node);
        return false;
    }
    const query = mention.query.toLowerCase();
    const options = mentionOptions(node).filter((option) => !query || `${option.label} ${option.fullLabel || ""} ${option.source}`.toLowerCase().includes(query));
    const existing = node.__h3MentionMenu;
    if (existing) {
        existing.mention = mention;
        existing.editor = editor;
        existing.options = options;
        existing.activeIndex = Math.min(existing.activeIndex, Math.max(0, options.length - 1));
        renderMentionMenu(node);
        positionMentionMenu(existing.element, editor);
        return true;
    }
    const element = document.createElement("div");
    element.className = "h3-mention-menu";
    applyNativeEditorTheme(element);
    document.body.append(element);
    node.__h3MentionMenu = { element, mention, options, activeIndex: 0 };
    renderMentionMenu(node);
    positionMentionMenu(element, editor);
    return true;
}

function syncMentionMenuToCaret(node, editor) {
    if (!isReferenceMode(node) || !getMentionRange(editor)) {
        closeMentionMenu(node);
        return false;
    }
    return openMentionMenu(node, editor);
}

function setWidgetOption(widget, key, value) {
    if (!widget) return;
    widget.options ||= {};
    if (value === undefined) delete widget.options[key];
    else widget.options[key] = value;
    if (widget._state?.options) {
        if (value === undefined) delete widget._state.options[key];
        else widget._state.options[key] = value;
    }
}

function isVueNodesMode() {
    return Boolean(globalThis.LiteGraph?.vueNodesMode);
}

function applyNativeEditorTheme(element) {
    if (!element?.style) return;
    const LiteGraph = globalThis.LiteGraph || {};
    const modern = isVueNodesMode();
    const widgetBg = LiteGraph.WIDGET_BGCOLOR || "#222";
    const widgetText = LiteGraph.WIDGET_TEXT_COLOR || "#ddd";
    const outline = LiteGraph.WIDGET_OUTLINE_COLOR || "rgba(255, 255, 255, 0.18)";
    const menuBg = LiteGraph.NODE_DEFAULT_BGCOLOR || "#1f1f1f";
    const signature = `${modern ? 1 : 0}|${widgetBg}|${widgetText}|${outline}|${menuBg}`;
    if (element.__h3NativeThemeSignature === signature) return;
    element.__h3NativeThemeSignature = signature;
    element.classList?.toggle("h3-native-vue-nodes", modern);
    element.classList?.toggle("h3-native-legacy-nodes", !modern);
    if (modern) {
        element.style.setProperty("--h3-native-widget-bg", "var(--component-node-widget-background, var(--secondary-background, #222))");
        element.style.setProperty("--h3-native-widget-text", "var(--component-node-foreground, var(--base-foreground, #ddd))");
        element.style.setProperty("--h3-native-widget-outline", "var(--component-node-widget-background-highlighted, var(--border-default, rgba(255, 255, 255, 0.18)))");
        element.style.setProperty("--h3-native-widget-focus", "var(--component-node-widget-background-highlighted, var(--border-default, rgba(255, 255, 255, 0.28)))");
        element.style.setProperty("--h3-native-widget-muted", "var(--component-node-foreground-secondary, var(--muted-foreground, rgba(255, 255, 255, 0.42)))");
        element.style.setProperty("--h3-native-menu-bg", "var(--component-node-widget-background, var(--comfy-menu-bg, #1f1f1f))");
        element.style.setProperty("--h3-native-widget-radius", "var(--radius-lg, 8px)");
        element.style.setProperty("--h3-native-widget-padding", "8px 12px");
        element.style.setProperty("--h3-native-widget-line-height", "var(--text-xs--line-height, 1.3333333)");
        element.style.setProperty("--h3-native-widget-text-size", "var(--text-xs, var(--comfy-textarea-font-size, 12px))");
        return;
    }
    element.style.setProperty("--h3-native-widget-bg", `var(--comfy-input-bg, ${widgetBg})`);
    element.style.setProperty("--h3-native-widget-text", `var(--input-text, ${widgetText})`);
    element.style.setProperty("--h3-native-widget-outline", `var(--border-color, ${outline})`);
    element.style.setProperty("--h3-native-widget-focus", `var(--border-color, ${outline})`);
    element.style.setProperty("--h3-native-widget-muted", "rgba(255, 255, 255, 0.42)");
    element.style.setProperty("--h3-native-menu-bg", `var(--comfy-menu-bg, ${menuBg})`);
    element.style.setProperty("--h3-native-widget-radius", "0px");
    element.style.setProperty("--h3-native-widget-padding", "2px");
    element.style.setProperty("--h3-native-widget-line-height", "normal");
    element.style.setProperty("--h3-native-widget-text-size", "var(--comfy-textarea-font-size, 12px)");
}

function syncEditorThemes(force = false) {
    const modern = isVueNodesMode();
    if (!force && lastVueNodesMode === modern) return;
    lastVueNodesMode = modern;
    for (const node of app.graph?._nodes || []) {
        if (!isTarget(node)) continue;
        applyNativeEditorTheme(node.__h3EditorWrap);
        applyNativeEditorTheme(node.__h3MentionMenu?.element);
    }
    app.graph?.setDirtyCanvas?.(true, true);
}

function installNativeThemeWatcher() {
    if (nativeThemeWatcherInstalled) return;
    nativeThemeWatcherInstalled = true;
    lastVueNodesMode = null;
    setInterval(() => syncEditorThemes(), 1000);
    for (const delay of [0, 60, 180]) setTimeout(() => syncEditorThemes(true), delay);
}

function patchEditorKeyHandling() {
    const proto = globalThis.LGraphCanvas?.prototype;
    if (!proto || proto.__h3PromptKeyHandlingPatched || typeof proto.processKey !== "function") return;
    proto.__h3PromptKeyHandlingPatched = true;
    const original = proto.processKey;
    proto.processKey = function processKeyWithH3PromptEditor(event) {
        const editor = event?.target?.closest?.(".h3-prompt-editor")
            || document.activeElement?.closest?.(".h3-prompt-editor")
            || activePromptNode?.__h3Editor;
        if (editor) {
            const node = editorPromptNode(editor);
            if (node && isPromptUndoRedoEvent(event)) handlePromptHistoryKeydown(node, event);
            return;
        }
        return original.apply(this, arguments);
    };
}

function hideOriginalPromptWidget(widget) {
    if (!widget) return;
    if (!widget.__h3PromptHidden) {
        widget.__h3PromptHidden = true;
        widget.__h3OriginalType = widget.type;
        widget.__h3OriginalComputeSize = widget.computeSize;
        widget.__h3OriginalHidden = widget.hidden;
        widget.__h3OriginalOptionsHidden = widget.options?.hidden;
        widget.__h3OriginalOptionsCanvasOnly = widget.options?.canvasOnly;
    }
    widget.hidden = true;
    setWidgetOption(widget, "hidden", true);
    setWidgetOption(widget, "canvasOnly", true);
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
}

function restoreOriginalPromptWidget(widget) {
    if (!widget?.__h3PromptHidden) return;
    widget.type = widget.__h3OriginalType || "customtext";
    widget.computeSize = widget.__h3OriginalComputeSize || (() => [220, 120]);
    widget.hidden = widget.__h3OriginalHidden ?? false;
    setWidgetOption(widget, "hidden", widget.__h3OriginalOptionsHidden);
    setWidgetOption(widget, "canvasOnly", widget.__h3OriginalOptionsCanvasOnly);
    widget.__h3PromptHidden = false;
}

function hideDomEditorWidget(widget) {
    if (!widget) return;
    if (!widget.__h3EditorHidden) {
        widget.__h3EditorHidden = true;
        widget.__h3EditorType = widget.type;
        widget.__h3EditorComputeSize = widget.computeSize;
    }
    widget.hidden = true;
    setWidgetOption(widget, "hidden", true);
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
}

function showDomEditorWidget(widget) {
    if (!widget?.__h3EditorHidden) return;
    widget.type = widget.__h3EditorType || "h3_prompt_mentions";
    widget.computeSize = widget.__h3EditorComputeSize || (() => [220, 96]);
    widget.hidden = false;
    setWidgetOption(widget, "hidden", false);
    widget.__h3EditorHidden = false;
}

function refreshVueNodeWidgets(node) {
    if (!Array.isArray(node?.widgets)) return;
    const widgets = [...node.widgets];
    try {
        if (isVueNodesMode()) node.widgets = [];
        node.widgets = widgets;
    } catch { /* Some frontends expose widgets as a read-only field. */ }
}

function getConditionalWidgetHeight(node, widget) {
    if (!widget) return Number(globalThis.LiteGraph?.NODE_WIDGET_HEIGHT) || 20;
    const storedHeight = Number(widget.__h3ConditionalRowHeight);
    if (Number.isFinite(storedHeight) && storedHeight > 0) return storedHeight;
    const measure = widget.__h3ConditionalOrigComputeSize || widget.computeSize;
    try {
        const measured = measure?.call(widget, Math.max(80, Number(node?.size?.[0]) || 220));
        const height = Number(measured?.[1]);
        if (Number.isFinite(height) && height > 0) {
            widget.__h3ConditionalRowHeight = height;
            return height;
        }
    } catch { /* Use the standard row height when a widget cannot be measured. */ }
    const height = Number(widget.computedHeight) > 0
        ? Number(widget.computedHeight)
        : Number(globalThis.LiteGraph?.NODE_WIDGET_HEIGHT) || 20;
    widget.__h3ConditionalRowHeight = height;
    return height;
}

function adjustNodeHeight(node, delta) {
    if (!node?.size || !Number.isFinite(delta) || !delta) return;
    const width = Number(node.size[0]) || 0;
    const beforeHeight = Number(node.size[1]) || 0;
    const nextHeight = Math.max(0, beforeHeight + delta);
    const nextSize = [width, nextHeight];
    node.setSize?.(nextSize);
    if (node.size) {
        node.size[0] = width;
        node.size[1] = nextHeight;
    } else {
        node.size = nextSize;
    }
    node._widgetSlotsDirty = true;
    node.setDirtyCanvas?.(true, true);
    node.graph?.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
}

function setNodeSizeExact(node, size) {
    if (!node || !Array.isArray(size) || size.length < 2) return false;
    const width = Number(size[0]);
    const height = Number(size[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    const nextSize = [width, height];
    node.setSize?.(nextSize);
    if (Array.isArray(node.size)) {
        node.size[0] = width;
        node.size[1] = height;
    } else {
        node.size = nextSize;
    }
    node._widgetSlotsDirty = true;
    node.setDirtyCanvas?.(true, true);
    node.graph?.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    return true;
}

function restorePromptEditorStableSize(node) {
    const stableSize = Array.isArray(node?.__h3EditorStableSize) ? [...node.__h3EditorStableSize] : null;
    if (!stableSize || stableSize.length < 2) return false;
    const restored = setNodeSizeExact(node, stableSize);
    if (restored) node.__h3EditorStableSize = null;
    return restored;
}

function hideConditionalWidget(widget) {
    if (!widget) return false;
    let compactSize = false;
    try {
        const measured = widget.computeSize?.();
        compactSize = Number(measured?.[0]) === 0 && Number(measured?.[1]) === -4;
    } catch { /* The widget may not expose a measurable size yet. */ }
    const wasVisible = widget.hidden !== true
        || widget.options?.hidden !== true
        || widget.type !== "hidden"
        || !compactSize;
    const originalType = widget.type;
    const originalComputeSize = widget.computeSize;
    const originalHidden = widget.hidden;
    if (widget.type !== "hidden") widget.__h3ConditionalOrigType = widget.type;
    if (!Object.prototype.hasOwnProperty.call(widget, "__h3ConditionalOrigComputeSize")) {
        widget.__h3ConditionalOrigComputeSize = originalComputeSize;
        widget.__h3ConditionalHadComputeSize = Object.prototype.hasOwnProperty.call(widget, "computeSize");
        widget.__h3ConditionalOrigHidden = originalHidden;
        widget.__h3ConditionalOrigOptionsHidden = widget.options?.hidden;
        widget.__h3ConditionalOrigOptionsCanvasOnly = widget.options?.canvasOnly;
        widget.__h3ConditionalOrigComputedHeight = widget.computedHeight;
        widget.__h3ConditionalHadComputedHeight = Object.prototype.hasOwnProperty.call(widget, "computedHeight");
    }
    widget.hidden = true;
    if (widget.inputEl) widget.inputEl.style.display = "none";
    if (widget.element) widget.element.style.display = "none";
    widget.type = "hidden";
    widget.computeSize = () => [0, -4];
    widget.computedHeight = 0;
    setWidgetOption(widget, "hidden", true);
    setWidgetOption(widget, "canvasOnly", true);
    if (widget._state) {
        widget._state.hidden = true;
        widget._state.type = "hidden";
        widget._state.computedHeight = 0;
    }
    return wasVisible;
}

function showConditionalWidget(widget) {
    if (!widget) return false;
    const wasHidden = widget.type === "hidden"
        || widget.hidden === true
        || widget.options?.hidden === true
        || widget._state?.type === "hidden"
        || widget._state?.hidden === true
        || widget._state?.options?.hidden === true;
    if (!wasHidden) return false;
    widget.hidden = widget.__h3ConditionalOrigHidden ?? false;
    if (widget.inputEl) widget.inputEl.style.display = "";
    if (widget.element) widget.element.style.display = "";
    if (widget.type === "hidden") widget.type = widget.__h3ConditionalOrigType || "combo";
    if (widget.__h3ConditionalHadComputeSize) widget.computeSize = widget.__h3ConditionalOrigComputeSize;
    else delete widget.computeSize;
    if (widget.__h3ConditionalHadComputedHeight) widget.computedHeight = widget.__h3ConditionalOrigComputedHeight;
    else delete widget.computedHeight;
    setWidgetOption(widget, "hidden", false);
    setWidgetOption(widget, "canvasOnly", false);
    if (widget._state) {
        widget._state.hidden = widget.hidden;
        widget._state.type = widget.type;
        if (widget.__h3ConditionalHadComputedHeight) widget._state.computedHeight = widget.computedHeight;
        else delete widget._state.computedHeight;
        widget._state.options ||= {};
        if (widget.options?.hidden === undefined) delete widget._state.options.hidden;
        else widget._state.options.hidden = widget.options.hidden;
        if (widget.options?.canvasOnly === undefined) delete widget._state.options.canvasOnly;
        else widget._state.options.canvasOnly = widget.options.canvasOnly;
    }
    localizeComboWidget(widget);
    return wasHidden;
}

function setConditionalWidgetVisible(node, widget, visible, { adjustHeight = true } = {}) {
    if (!widget) return false;
    node.__h3ConditionalVisibility ||= new Map();
    const key = String(widget.name || widget.label || node.widgets?.indexOf(widget) || "widget");
    const previousTarget = node.__h3ConditionalVisibility.get(key);
    const rowHeight = getConditionalWidgetHeight(node, widget);
    // A hidden ComfyUI widget still contributes -4 px through computeSize().
    // Showing a row therefore needs rowHeight + 4 px, not just rowHeight;
    // otherwise the flexible prompt editor is compressed a little for every
    // expanded setting row instead of the node extending downward.
    const layoutDelta = rowHeight + 4;
    const changed = visible ? showConditionalWidget(widget) : hideConditionalWidget(widget);
    node.__h3ConditionalVisibility.set(key, Boolean(visible));
    if (!changed) return false;
    // Change height only when the desired state actually changed. ComfyUI may
    // reconstruct widget visibility while switching workflow tabs; that is a
    // visual reset, not a user-requested row insertion/removal, and must not
    // grow the node again.
    if (adjustHeight && (previousTarget === undefined || previousTarget !== Boolean(visible))) {
        adjustNodeHeight(node, visible ? layoutDelta : -layoutDelta);
    }
    refreshVueNodeWidgets(node);
    node._widgetSlotsDirty = true;
    return true;
}

function syncModeWidgets(node, { adjustHeight = true } = {}) {
    const advanced = isAdvancedEnabled(node);
    const changed = [
        setConditionalWidgetVisible(node, getWidget(node, "fps"), advanced, { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "keyframe_role"), advanced && !isReferenceMode(node), { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "ref_image_size"), advanced, { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "reference_mention_mode"), advanced && isReferenceMode(node), { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "aspect_ratio"), !isCustomResolution(node), { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "width"), isCustomResolution(node), { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "height"), isCustomResolution(node), { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "prompt_optimizer_settings"), advanced, { adjustHeight }),
        setConditionalWidgetVisible(node, getWidget(node, "prompt_optimizer_scene_guide"), advanced, { adjustHeight }),
    ].some(Boolean);
    if (changed) {
        refreshVueNodeWidgets(node);
        node._widgetSlotsDirty = true;
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    }
    return changed;
}

function repairNodeLayout(node) {
    if (!node) return;
    const run = () => {
        refreshVueNodeWidgets(node);
        node._widgetSlotsDirty = true;
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 0);
}

function makePromptTabStrip(node) {
    const strip = document.createElement("div");
    strip.className = "h3-prompt-tabs";
    strip.setAttribute("role", "tablist");
    strip.addEventListener("pointerdown", (event) => event.stopPropagation());
    strip.addEventListener("wheel", (event) => {
        // A tab row that overflows scrolls sideways instead of zooming the canvas.
        if (strip.scrollWidth <= strip.clientWidth) return;
        strip.scrollLeft += event.deltaY || event.deltaX;
        event.preventDefault();
        event.stopPropagation();
    }, { passive: false });
    return strip;
}

function makePromptTabAction(className, label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
    });
    return button;
}

function beginPromptTabRename(node, index, labelElement) {
    const tabs = promptTabs(node);
    const tab = tabs[index];
    if (!tab || labelElement.querySelector("input")) return;
    const input = document.createElement("input");
    input.className = "h3-prompt-tab-rename";
    input.value = tab.label;
    input.maxLength = PROMPT_TAB_LABEL_LIMIT;
    input.spellcheck = false;
    const commit = (save) => {
        input.remove();
        if (save) {
            const next = input.value.trim().slice(0, PROMPT_TAB_LABEL_LIMIT);
            tab.label = next || defaultPromptTabLabel(index);
            app.graph?.change?.();
        }
        syncPromptTabStrip(node);
    };
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter") commit(true);
        else if (event.key === "Escape") commit(false);
    });
    input.addEventListener("blur", () => commit(true));
    labelElement.append(input);
    input.focus();
    input.select();
}

function syncPromptTabStrip(node) {
    const strip = node?.__h3PromptTabStrip;
    if (!strip) return;
    const tabs = promptTabs(node);
    const active = activePromptTabIndex(node);
    // Typing runs a sync on every keystroke, so the strip is only rebuilt when
    // something it actually shows changed. That also keeps an in-progress
    // rename and the horizontal scroll position alive.
    const signature = `${active}/${tabs.length}/${tabs.map((tab) => tab.label).join("\u0000")}`;
    if (strip.__h3TabSignature === signature) return;
    strip.__h3TabSignature = signature;
    strip.textContent = "";
    tabs.forEach((tab, index) => {
        const isActive = index === active;
        const item = document.createElement("div");
        item.className = `h3-prompt-tab${isActive ? " is-active" : ""}`;
        item.setAttribute("role", "tab");
        item.setAttribute("aria-selected", isActive ? "true" : "false");
        item.title = isActive ? TEXT.promptTabRenameHint : tab.label;
        if (isActive && index > 0) {
            const left = makePromptTabAction("h3-prompt-tab-move", TEXT.promptTabMoveLeft, () => movePromptTab(node, index, -1));
            left.textContent = "\u25c0";
            item.append(left);
        }
        const label = document.createElement("span");
        label.className = "h3-prompt-tab-label";
        label.textContent = tab.label;
        label.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
        label.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            switchPromptTab(node, index);
        });
        label.addEventListener("dblclick", (event) => {
            event.preventDefault();
            event.stopPropagation();
            switchPromptTab(node, index);
            beginPromptTabRename(node, index, label);
        });
        item.append(label);
        if (isActive && index < tabs.length - 1) {
            const right = makePromptTabAction("h3-prompt-tab-move", TEXT.promptTabMoveRight, () => movePromptTab(node, index, 1));
            right.textContent = "\u25b6";
            item.append(right);
        }
        const close = makePromptTabAction("h3-prompt-tab-close", TEXT.promptTabRemove, () => removePromptTab(node, index));
        close.textContent = "\u00d7";
        item.append(close);
        strip.append(item);
    });
    const add = makePromptTabAction("h3-prompt-tab-add", TEXT.promptTabAdd, () => addPromptTab(node));
    add.textContent = "+";
    add.disabled = tabs.length >= PROMPT_TAB_LIMIT;
    strip.append(add);
}

function switchPromptTab(node, index) {
    const next = Math.min(promptTabs(node).length - 1, Math.max(0, Number(index) || 0));
    if (next === activePromptTabIndex(node)) return;
    // Persist what is on screen before the editors are repopulated, so the tab
    // being left keeps its text.
    syncPromptFromEditor(node, false);
    setActivePromptTabIndex(node, next);
    reloadPromptTab(node);
}

function reloadPromptTab(node) {
    for (const editor of promptEditors(node)) editor.__h3RawNeedsSync = false;
    renderEditorFromNode(node, true);
    syncPromptFromEditor(node, false);
    resetPromptHistory(node);
    closeMentionMenu(node);
    syncEditorMode(node);
    syncPromptTabStrip(node);
    node.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    app.graph?.change?.();
}

function addPromptTab(node) {
    const tabs = promptTabs(node);
    if (tabs.length >= PROMPT_TAB_LIMIT) return;
    syncPromptFromEditor(node, false);
    tabs.push(normalizePromptTabEntry({}, tabs.length));
    setActivePromptTabIndex(node, tabs.length - 1);
    reloadPromptTab(node);
    const editor = promptEditorFor(node, PROMPT_FIELD_SOURCE);
    if (editor && !promptInputIsConnected(node)) editor.focus({ preventScroll: true });
}

function removePromptTab(node, index) {
    const tabs = promptTabs(node);
    const tab = tabs[index];
    if (!tab) return;
    const used = PROMPT_FIELDS.some((field) => !promptDocIsEmpty(tab[field]));
    if (used && !globalThis.confirm?.(`${TEXT.promptTabRemoveConfirm}\n\n${tab.label}`)) return;
    if (tabs.length === 1) {
        // The node always keeps one tab; emptying it is the closest thing to
        // deleting the last one.
        tabs[0] = normalizePromptTabEntry({}, 0);
    } else {
        const previous = activePromptTabIndex(node);
        tabs.splice(index, 1);
        setActivePromptTabIndex(node, previous > index ? previous - 1 : Math.min(previous, tabs.length - 1));
    }
    reloadPromptTab(node);
}

function movePromptTab(node, index, offset) {
    const tabs = promptTabs(node);
    const target = index + offset;
    if (!tabs[index] || target < 0 || target >= tabs.length) return;
    syncPromptFromEditor(node, false);
    const [tab] = tabs.splice(index, 1);
    tabs.splice(target, 0, tab);
    setActivePromptTabIndex(node, target);
    syncPromptTabStrip(node);
    node.setDirtyCanvas?.(true, true);
    app.graph?.change?.();
}

function syncPromptViewButton(node) {
    const button = node?.__h3PromptViewButton;
    if (!button) return;
    const raw = isRawPromptMode(node);
    const label = raw ? TEXT.showStructuredPrompt : TEXT.showRawPrompt;
    button.textContent = raw ? "@" : "</>";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", raw ? "true" : "false");
    // The icon already communicates the current view. Keep the button's
    // visual treatment identical in both modes instead of adding a colored
    // active border in raw-prompt mode.
    button.classList.remove("is-active");
}

function togglePromptView(node) {
    const editors = promptEditors(node);
    if (!editors.length) return;
    const raw = isRawPromptMode(node);
    syncPromptFromEditor(node, false);
    setPromptViewMode(node, raw ? PROMPT_VIEW_STRUCTURED : PROMPT_VIEW_RAW);
    for (const editor of editors) editor.__h3RawNeedsSync = false;
    renderEditorFromNode(node, true);
    syncEditorMode(node);
    const focused = node.__h3Editor || editors[0];
    focused.focus({ preventScroll: true });
    setEditorCaretAtEnd(focused);
    node.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
}

function normalizePromptOptimizerSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const requested = String(source.api_format || OPTIMIZER_FORMAT_OPENAI).toLowerCase();
    const apiFormat = OPTIMIZER_FORMATS.includes(requested) ? requested : OPTIMIZER_FORMAT_OPENAI;
    const clamp = (raw, fallback, low, high) => {
        const number = Number(raw);
        return Number.isFinite(number) ? Math.min(high, Math.max(low, Math.round(number))) : fallback;
    };
    return {
        api_format: apiFormat,
        api_url: String(source.api_url || "").trim(),
        api_key: String(source.api_key || ""),
        model: String(source.model || "").trim(),
        read_media: asBoolean(source.read_media, false),
        optimize_on_run: asBoolean(source.optimize_on_run, false),
        // Named clip_max_length before the GGUF format shared the setting.
        local_max_length: clamp(
            source.local_max_length ?? source.clip_max_length,
            LOCAL_MAX_LENGTH_DEFAULT, LOCAL_MIN_LENGTH, LOCAL_MAX_LENGTH_LIMIT,
        ),
        gguf_model: String(source.gguf_model || "").trim(),
        gguf_mmproj: String(source.gguf_mmproj || GGUF_MMPROJ_AUTO).trim() || GGUF_MMPROJ_AUTO,
        gguf_context: clamp(source.gguf_context, GGUF_CONTEXT_DEFAULT, GGUF_CONTEXT_MIN, GGUF_CONTEXT_LIMIT),
        gguf_gpu_layers: clamp(source.gguf_gpu_layers, -1, -1, 1024),
        gguf_unload_after: asBoolean(source.gguf_unload_after, false),
        gguf_describe_media: asBoolean(source.gguf_describe_media, false),
    };
}

function isClipOptimizerFormat(value) {
    return String(value || "").toLowerCase() === OPTIMIZER_FORMAT_CLIP;
}

function isGgufOptimizerFormat(value) {
    return String(value || "").toLowerCase() === OPTIMIZER_FORMAT_GGUF;
}

async function loadGgufModelCatalog() {
    const response = await api.fetchApi(PROMPT_OPTIMIZER_GGUF_ENDPOINT);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return {
        models: Array.isArray(data.models) ? data.models : [],
        mmproj: Array.isArray(data.mmproj) ? data.mmproj : [],
        roots: Array.isArray(data.roots) ? data.roots : [],
    };
}

function optimizerClipInputSlot(node) {
    return (node?.inputs || []).find((input) => String(input?.name || "") === "optimizer_clip") || null;
}

function optimizerClipIsConnected(node) {
    return optimizerClipInputSlot(node)?.link != null;
}

function promptOptimizerNodes() {
    return (app.graph?._nodes || []).filter((node) => isTarget(node));
}

function syncPromptOptimizerNodes() {
    for (const node of promptOptimizerNodes()) syncPromptOptimizerButton(node);
}

async function loadPromptOptimizerSettings({ force = false } = {}) {
    if (promptOptimizerSettingsPromise && !force) return promptOptimizerSettingsPromise;
    if (promptOptimizerSettingsLoaded && !force) return promptOptimizerSettingsCache;
    promptOptimizerSettingsPromise = (async () => {
        const response = await api.fetchApi(PROMPT_OPTIMIZER_SETTINGS_ENDPOINT);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        promptOptimizerSettingsCache = normalizePromptOptimizerSettings(data.settings);
        promptOptimizerSettingsLoaded = true;
        syncPromptOptimizerNodes();
        return promptOptimizerSettingsCache;
    })().finally(() => {
        promptOptimizerSettingsPromise = null;
    });
    return promptOptimizerSettingsPromise;
}

async function savePromptOptimizerSettings(value) {
    const settings = normalizePromptOptimizerSettings(value);
    const response = await api.fetchApi(PROMPT_OPTIMIZER_SETTINGS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    promptOptimizerSettingsCache = normalizePromptOptimizerSettings(data.settings || settings);
    promptOptimizerSettingsLoaded = true;
    syncPromptOptimizerNodes();
    return promptOptimizerSettingsCache;
}

function resetPromptOptimizerSettingsToggle(node) {
    const widget = getWidget(node, "prompt_optimizer_settings");
    if (!widget) return;
    widget.value = false;
    if (widget._state) widget._state.value = false;
    node.setDirtyCanvas?.(true, true);
}

function makePromptOptimizerSettingsRow(labelText, control) {
    const row = document.createElement("div");
    row.className = "h3-optimizer-settings-row";
    const label = document.createElement("span");
    label.className = "h3-optimizer-settings-label";
    label.textContent = labelText;
    control.setAttribute?.("aria-label", labelText);
    row.append(label, control);
    return row;
}

/** The two fixed projector choices, plus `selected` when it is a real filename. */
function mmprojOptionList(selected, catalog = []) {
    const options = [
        { value: GGUF_MMPROJ_AUTO, label: TEXT.ggufAuto },
        { value: GGUF_MMPROJ_NONE, label: TEXT.ggufNone },
        ...catalog.map((value) => ({ value, label: value })),
    ];
    const wanted = String(selected || "").trim();
    // A configured file the scan no longer finds stays listed rather than
    // silently becoming a different projector; the server reports it clearly.
    if (wanted && !options.some((item) => item.value === wanted)) {
        options.push({ value: wanted, label: wanted });
    }
    return options;
}

function makePromptOptimizerSelect(initialValue, onChange = null, optionList = null) {
    const root = document.createElement("div");
    root.className = "h3-optimizer-settings-select-wrap";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "h3-optimizer-settings-control h3-optimizer-settings-select";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const valueLabel = document.createElement("span");
    valueLabel.className = "h3-optimizer-settings-select-value";
    const chevron = document.createElement("span");
    chevron.className = "h3-optimizer-settings-select-chevron";
    const menu = document.createElement("div");
    menu.className = "h3-optimizer-settings-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    const options = optionList
        || Object.entries(OPTION_DEFS.prompt_optimizer_api_format).map(([value, label]) => ({ value, label }));
    trigger.value = options.some((item) => item.value === initialValue) ? initialValue : options[0]?.value || "";
    let activeIndex = Math.max(0, options.findIndex((item) => item.value === trigger.value));

    const close = () => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.classList.remove("is-open");
    };
    const render = () => {
        const current = options.find((item) => item.value === trigger.value) || options[0];
        valueLabel.textContent = current?.label || "";
        for (const option of menu.querySelectorAll(".h3-optimizer-settings-select-option")) {
            const selected = option.dataset.value === trigger.value;
            option.classList.toggle("is-selected", selected);
            option.setAttribute("aria-selected", selected ? "true" : "false");
        }
    };
    const choose = (value) => {
        const nextIndex = options.findIndex((item) => item.value === value);
        if (nextIndex < 0) return;
        trigger.value = value;
        activeIndex = nextIndex;
        render();
        close();
        trigger.focus();
        onChange?.(value);
    };
    options.forEach((item, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "h3-optimizer-settings-select-option";
        option.dataset.value = item.value;
        option.setAttribute("role", "option");
        option.textContent = item.label;
        option.addEventListener("click", () => choose(item.value));
        option.addEventListener("pointerenter", () => { activeIndex = index; });
        menu.append(option);
    });
    trigger.append(valueLabel, chevron);
    root.append(trigger, menu);
    trigger.addEventListener("click", () => {
        const opening = menu.hidden;
        if (opening) {
            menu.hidden = false;
            trigger.setAttribute("aria-expanded", "true");
            trigger.classList.add("is-open");
        } else close();
    });
    trigger.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            close();
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (menu.hidden) {
                menu.hidden = false;
                trigger.setAttribute("aria-expanded", "true");
                trigger.classList.add("is-open");
            }
            activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
            choose(options[activeIndex].value);
        }
        if ((event.key === "Enter" || event.key === " ") && !menu.hidden) {
            event.preventDefault();
            choose(options[activeIndex].value);
        }
    });
    Object.defineProperty(root, "value", {
        configurable: true,
        get: () => trigger.value,
        set: (value) => {
            if (options.some((item) => item.value === value)) {
                trigger.value = value;
                activeIndex = options.findIndex((item) => item.value === value);
                render();
            }
        },
    });
    root.focus = () => trigger.focus();
    root.__h3CloseMenu = close;
    // Lets a caller swap in options that are only known after a fetch.
    root.setOptions = (next) => {
        options.length = 0;
        options.push(...next);
        menu.textContent = "";
        options.forEach((item, index) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "h3-optimizer-settings-select-option";
            option.dataset.value = item.value;
            option.setAttribute("role", "option");
            option.textContent = item.label;
            option.addEventListener("click", () => choose(item.value));
            option.addEventListener("pointerenter", () => { activeIndex = index; });
            menu.append(option);
        });
        if (!options.some((item) => item.value === trigger.value)) trigger.value = options[0]?.value || "";
        activeIndex = Math.max(0, options.findIndex((item) => item.value === trigger.value));
        render();
    };
    render();
    return root;
}

function makePromptOptimizerSwitch(initialValue) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "h3-optimizer-settings-switch";
    toggle.role = "switch";
    toggle.checked = Boolean(initialValue);
    const track = document.createElement("span");
    track.className = "h3-optimizer-settings-switch-track";
    const thumb = document.createElement("span");
    thumb.className = "h3-optimizer-settings-switch-thumb";
    track.append(thumb);
    toggle.append(track);
    const render = () => {
        toggle.setAttribute("aria-checked", toggle.checked ? "true" : "false");
        toggle.classList.toggle("is-on", toggle.checked);
    };
    toggle.addEventListener("click", () => {
        toggle.checked = !toggle.checked;
        render();
    });
    render();
    return toggle;
}

async function openPromptOptimizerSettings(node) {
    if (promptOptimizerSettingsModal) {
        promptOptimizerSettingsModal.dialog?.querySelector?.("input, button")?.focus?.();
        return;
    }
    try {
        await loadPromptOptimizerSettings();
    } catch (error) {
        notifyPromptOptimizer(error?.message || TEXT.settingsLoadFailed);
    }

    const overlay = document.createElement("div");
    overlay.className = "h3-optimizer-settings-overlay";
    const dialog = document.createElement("section");
    dialog.className = "h3-optimizer-settings-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", TEXT.optimizerSettings);
    const header = document.createElement("div");
    header.className = "h3-optimizer-settings-header";
    const title = document.createElement("div");
    title.className = "h3-optimizer-settings-title";
    title.textContent = TEXT.optimizerSettings;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "h3-optimizer-settings-close";
    closeButton.textContent = "\u00d7";
    closeButton.title = TEXT.settingsClose;
    closeButton.setAttribute("aria-label", TEXT.settingsClose);
    const headerActions = document.createElement("div");
    headerActions.className = "h3-optimizer-settings-header-actions";
    header.append(title, headerActions);

    const form = document.createElement("form");
    form.id = "h3-optimizer-settings-form";
    form.className = "h3-optimizer-settings-form";
    const apiFormat = makePromptOptimizerSelect(promptOptimizerSettingsCache.api_format, () => syncFormatRows());
    const apiUrl = document.createElement("input");
    apiUrl.className = "h3-optimizer-settings-control";
    apiUrl.type = "text";
    apiUrl.autocomplete = "url";
    apiUrl.placeholder = "https://...";
    apiUrl.value = promptOptimizerSettingsCache.api_url;
    const apiKey = document.createElement("input");
    apiKey.className = "h3-optimizer-settings-control";
    apiKey.type = "password";
    apiKey.autocomplete = "off";
    apiKey.spellcheck = false;
    apiKey.value = promptOptimizerSettingsCache.api_key;
    const model = document.createElement("input");
    model.className = "h3-optimizer-settings-control";
    model.type = "text";
    model.autocomplete = "off";
    model.value = promptOptimizerSettingsCache.model;
    const makeNumberInput = (value, min, max, step) => {
        const input = document.createElement("input");
        input.className = "h3-optimizer-settings-control";
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        return input;
    };
    const localMaxLength = makeNumberInput(promptOptimizerSettingsCache.local_max_length, LOCAL_MIN_LENGTH, LOCAL_MAX_LENGTH_LIMIT, 16);
    const ggufContext = makeNumberInput(promptOptimizerSettingsCache.gguf_context, GGUF_CONTEXT_MIN, GGUF_CONTEXT_LIMIT, 512);
    const ggufGpuLayers = makeNumberInput(promptOptimizerSettingsCache.gguf_gpu_layers, -1, 1024, 1);
    const ggufModel = makePromptOptimizerSelect(promptOptimizerSettingsCache.gguf_model, null, [
        { value: promptOptimizerSettingsCache.gguf_model, label: promptOptimizerSettingsCache.gguf_model || TEXT.ggufEmpty },
    ]);
    // The saved projector has to be in the list from the start. The select drops
    // an initial value it cannot find and falls back to the first option, so
    // seeding only auto/none silently reset a configured projector to auto — and
    // the catalog fetch below then "restored" that reset value.
    const ggufMmproj = makePromptOptimizerSelect(
        promptOptimizerSettingsCache.gguf_mmproj,
        null,
        mmprojOptionList(promptOptimizerSettingsCache.gguf_mmproj),
    );
    const ggufUnloadLabel = document.createElement("div");
    ggufUnloadLabel.className = "h3-optimizer-settings-check";
    const ggufUnload = makePromptOptimizerSwitch(promptOptimizerSettingsCache.gguf_unload_after);
    ggufUnload.setAttribute("aria-label", TEXT.ggufUnload);
    const ggufUnloadText = document.createElement("span");
    ggufUnloadText.textContent = TEXT.ggufUnload;
    ggufUnloadLabel.append(ggufUnloadText, ggufUnload);
    const ggufDescribeLabel = document.createElement("div");
    ggufDescribeLabel.className = "h3-optimizer-settings-check";
    const ggufDescribe = makePromptOptimizerSwitch(promptOptimizerSettingsCache.gguf_describe_media);
    ggufDescribe.setAttribute("aria-label", TEXT.ggufDescribe);
    const ggufDescribeText = document.createElement("span");
    ggufDescribeText.textContent = TEXT.ggufDescribe;
    ggufDescribeLabel.append(ggufDescribeText, ggufDescribe);
    const readMediaLabel = document.createElement("div");
    readMediaLabel.className = "h3-optimizer-settings-check";
    const readMedia = makePromptOptimizerSwitch(promptOptimizerSettingsCache.read_media);
    readMedia.setAttribute("aria-label", TEXT.readMedia);
    readMedia.addEventListener("click", () => syncFormatRows());
    const readMediaText = document.createElement("span");
    readMediaText.textContent = TEXT.readMedia;
    readMediaLabel.append(readMediaText, readMedia);
    const optimizeOnRunLabel = document.createElement("div");
    optimizeOnRunLabel.className = "h3-optimizer-settings-check";
    const optimizeOnRun = makePromptOptimizerSwitch(promptOptimizerSettingsCache.optimize_on_run);
    optimizeOnRun.setAttribute("aria-label", TEXT.optimizeOnRun);
    const optimizeOnRunText = document.createElement("span");
    optimizeOnRunText.textContent = TEXT.optimizeOnRun;
    optimizeOnRunLabel.append(optimizeOnRunText, optimizeOnRun);
    const hint = document.createElement("p");
    hint.className = "h3-optimizer-settings-hint";
    const apiUrlRow = makePromptOptimizerSettingsRow(TEXT.apiUrl, apiUrl);
    const apiKeyRow = makePromptOptimizerSettingsRow(TEXT.apiKey, apiKey);
    const modelRow = makePromptOptimizerSettingsRow(TEXT.apiModel, model);
    const localMaxLengthRow = makePromptOptimizerSettingsRow(TEXT.localMaxLength, localMaxLength);
    const ggufModelRow = makePromptOptimizerSettingsRow(TEXT.ggufModel, ggufModel);
    const ggufMmprojRow = makePromptOptimizerSettingsRow(TEXT.ggufMmproj, ggufMmproj);
    const ggufContextRow = makePromptOptimizerSettingsRow(TEXT.ggufContext, ggufContext);
    const ggufGpuLayersRow = makePromptOptimizerSettingsRow(TEXT.ggufGpuLayers, ggufGpuLayers);
    form.append(
        makePromptOptimizerSettingsRow(TEXT.apiFormat, apiFormat),
        hint,
        apiUrlRow,
        apiKeyRow,
        modelRow,
        ggufModelRow,
        ggufMmprojRow,
        ggufContextRow,
        ggufGpuLayersRow,
        localMaxLengthRow,
        ggufUnloadLabel,
        readMediaLabel,
        ggufDescribeLabel,
        optimizeOnRunLabel,
    );
    // Each format uses a different half of this form, so only its own rows stay
    // visible. Read connected media applies to all of them.
    const syncFormatRows = () => {
        const clip = isClipOptimizerFormat(apiFormat.value);
        const gguf = isGgufOptimizerFormat(apiFormat.value);
        const local = clip || gguf;
        for (const row of [apiUrlRow, apiKeyRow, modelRow]) row.hidden = local;
        for (const row of [ggufModelRow, ggufMmprojRow, ggufContextRow, ggufGpuLayersRow, ggufUnloadLabel]) row.hidden = !gguf;
        // Describing media one at a time only means something once media is read.
        ggufDescribeLabel.hidden = !gguf || !readMedia.checked;
        // Optimizing on run is an HTTP-only path server-side: `clip` optimizes
        // from inside the node and `gguf` from this editor, so neither reads it.
        optimizeOnRunLabel.hidden = local;
        localMaxLengthRow.hidden = !local;
        hint.hidden = !local;
        hint.textContent = gguf ? TEXT.ggufHint : TEXT.optimizerClipHint;
        if (gguf) refreshGgufOptions();
    };
    // The catalog is only worth fetching once the GGUF format is selected.
    let ggufCatalogLoaded = false;
    const refreshGgufOptions = () => {
        if (ggufCatalogLoaded) return;
        ggufCatalogLoaded = true;
        loadGgufModelCatalog().then((catalog) => {
            // Read the current choices first: setOptions drops a value the new
            // list does not contain, so both lists are built to include it.
            const selectedModel = ggufModel.value;
            const models = catalog.models.map((value) => ({ value, label: value }));
            if (selectedModel && !catalog.models.includes(selectedModel)) {
                models.push({ value: selectedModel, label: selectedModel });
            }
            ggufModel.setOptions(models.length ? models : [{ value: "", label: TEXT.ggufEmpty }]);
            ggufModel.value = selectedModel;
            const selectedMmproj = ggufMmproj.value;
            ggufMmproj.setOptions(mmprojOptionList(selectedMmproj, catalog.mmproj));
            ggufMmproj.value = selectedMmproj;
        }).catch((catalogError) => {
            ggufCatalogLoaded = false;
            error.textContent = String(catalogError?.message || catalogError);
            error.hidden = false;
        });
    };
    syncFormatRows();

    const error = document.createElement("div");
    error.className = "h3-optimizer-settings-error";
    error.hidden = true;
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "h3-optimizer-settings-button is-header";
    saveButton.setAttribute("form", form.id);
    saveButton.textContent = TEXT.settingsSave;
    headerActions.append(saveButton, closeButton);
    dialog.append(header, form, error);
    overlay.append(dialog);
    document.body.append(overlay);

    const close = () => {
        document.removeEventListener("keydown", onKeyDown, true);
        overlay.remove();
        promptOptimizerSettingsModal = null;
        resetPromptOptimizerSettingsToggle(node);
    };
    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        }
    };
    promptOptimizerSettingsModal = { dialog, close };
    document.addEventListener("keydown", onKeyDown, true);
    overlay.addEventListener("pointerdown", (event) => {
        if (!apiFormat.contains?.(event.target)) apiFormat.__h3CloseMenu?.();
        if (event.target === overlay) close();
    });
    closeButton.addEventListener("click", close);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (saveButton.disabled) return;
        saveButton.disabled = true;
        error.hidden = true;
        try {
            await savePromptOptimizerSettings({
                api_format: apiFormat.value,
                api_url: apiUrl.value,
                api_key: apiKey.value,
                model: model.value,
                read_media: readMedia.checked,
                local_max_length: localMaxLength.value,
                gguf_model: ggufModel.value,
                gguf_mmproj: ggufMmproj.value,
                gguf_context: ggufContext.value,
                gguf_gpu_layers: ggufGpuLayers.value,
                gguf_unload_after: ggufUnload.checked,
                gguf_describe_media: ggufDescribe.checked,
                optimize_on_run: optimizeOnRun.checked,
            });
            notifyPromptOptimizer(TEXT.settingsSaved, "success");
            close();
        } catch (saveError) {
            error.textContent = String(saveError?.message || saveError || TEXT.optimizerFailed);
            error.hidden = false;
            saveButton.disabled = false;
        }
    });
    apiFormat.focus();
}

function promptOptimizerState(node) {
    return {
        ...promptOptimizerSettingsCache,
        scene_guide: canonicalPromptGuide(getWidgetValue(node, "prompt_optimizer_scene_guide", "none")),
    };
}

function promptOptimizerApiKeyRequired(apiFormat) {
    return String(apiFormat || "openai").trim().toLowerCase() === "gemini";
}

function promptOptimizerConfigured(state) {
    return Boolean(
        state?.api_url?.trim()
        && state?.model?.trim()
        && (state?.api_key?.trim() || !promptOptimizerApiKeyRequired(state?.api_format))
    );
}

function notifyPromptOptimizer(message, severity = "error") {
    const detail = String(message || "");
    const toast = app.extensionManager?.toast;
    if (toast?.add) {
        toast.add({ severity, summary: severity === "error" ? TEXT.optimizerFailed : TEXT.optimizerSettings, detail, life: 6000 });
        return;
    }
    globalThis.alert?.(detail);
}

function syncPromptExternalConnectionState(node) {
    const connected = promptInputIsConnected(node);
    node.__h3PromptExternalConnected = connected;
    const wrap = node?.__h3EditorWrap;
    for (const editor of promptEditors(node)) {
        editor.contentEditable = connected ? "false" : "true";
        editor.setAttribute("aria-readonly", connected ? "true" : "false");
        editor.title = connected ? TEXT.promptExternalConnected : "";
        editor.classList.toggle("is-external", connected);
        editor.tabIndex = connected ? -1 : 0;
        if (connected) {
            closeMentionMenu(node);
            if (document.activeElement === editor) editor.blur();
        }
    }
    wrap?.classList?.toggle("is-external", connected);
    syncPromptOptimizerButton(node);
}

function clearPromptOptimizerStatusTimers(node) {
    if (!node) return;
    if (node.__h3OptimizerStatusTimer) clearInterval(node.__h3OptimizerStatusTimer);
    if (node.__h3OptimizerStatusHideTimer) clearTimeout(node.__h3OptimizerStatusHideTimer);
    node.__h3OptimizerStatusTimer = null;
    node.__h3OptimizerStatusHideTimer = null;
}

function setPromptOptimizerStatus(node, state = "idle") {
    if (!node) return;
    clearPromptOptimizerStatusTimers(node);
    node.__h3OptimizerStatus = state;
    const status = node.__h3PromptOptimizerStatus;
    const label = node.__h3PromptOptimizerStatusText;
    if (!status || !label) return;
    const loading = state === "loading";
    status.hidden = !loading;
    status.className = `h3-prompt-editor-status${loading ? " is-loading" : ""}`;
    if (!loading) {
        label.textContent = "";
        return;
    }
    const startedAt = Number(node.__h3OptimizerStartedAt) || (globalThis.performance?.now?.() || Date.now());
    node.__h3OptimizerStartedAt = startedAt;
    const update = () => {
        const elapsed = Math.max(0, Math.floor(((globalThis.performance?.now?.() || Date.now()) - startedAt) / 1000));
        label.textContent = elapsed > 1 ? `${TEXT.optimizerRunning} \u00b7 ${elapsed}s` : `${TEXT.optimizerRunning}...`;
    };
    update();
    node.__h3OptimizerStatusTimer = setInterval(update, 1000);
}

function syncPromptOptimizerButton(node) {
    const button = node?.__h3PromptOptimizeButton;
    if (!button) return;
    const state = promptOptimizerState(node);
    const clip = isClipOptimizerFormat(state.api_format);
    // The local formats need no credentials: the CLIP one is configured as soon
    // as an encoder is wired to the input, the GGUF one as soon as a model file
    // is picked.
    const configured = clip
        ? optimizerClipIsConnected(node)
        : isGgufOptimizerFormat(state.api_format)
            ? Boolean(state.gguf_model.trim())
            : promptOptimizerConfigured(state);
    const external = promptInputIsConnected(node);
    const pending = Boolean(node.__h3OptimizerPending);
    const locked = external || pending;
    // While a request is running the same button stops it, so a slow API call
    // or a local generation is never something the user has to sit through.
    button.textContent = pending ? "\u25a0" : "\u2726";
    button.title = external
        ? TEXT.promptExternalConnected
        : pending
            ? TEXT.optimizerStop
            : clip ? TEXT.optimizerDeferred : TEXT.optimizePrompt;
    button.setAttribute("aria-label", button.title);
    button.classList.toggle("is-configured", configured);
    button.classList.toggle("is-loading", pending);
    button.classList.toggle("is-stop", pending);
    button.classList.toggle("is-external", external);
    button.setAttribute("aria-disabled", external ? "true" : "false");
    button.disabled = external;
    const wrap = node?.__h3EditorWrap;
    for (const editor of promptEditors(node)) {
        editor.contentEditable = locked ? "false" : "true";
        editor.setAttribute("aria-readonly", locked ? "true" : "false");
        editor.setAttribute("aria-busy", pending ? "true" : "false");
        editor.tabIndex = locked ? -1 : 0;
        editor.title = external ? TEXT.promptExternalConnected : pending ? TEXT.optimizerRunning : "";
        editor.classList.toggle("is-loading", pending);
    }
    wrap?.classList?.toggle("is-loading", pending);
    syncPromptFieldLabels(node);
    if (pending) closeMentionMenu(node);
}

function sourceAssetDescriptor(node, mediaType) {
    if (!node) return null;
    const preferred = {
        image: ["image", "filename", "file"],
        video: ["video", "file", "filename", "video_file", "videofile"],
        audio: ["audio", "file", "filename", "audio_file", "audiofile"],
    }[mediaType] || ["file", "filename"];
    const preferredSet = new Set(preferred);
    const widgets = Array.isArray(node.widgets) ? node.widgets : [];
    const ordered = [...widgets.filter((widget) => preferredSet.has(String(widget?.name || "").toLowerCase())), ...widgets];
    for (const widget of ordered) {
        const value = widget?.value;
        const filename = typeof value === "object" ? String(value?.filename || value?.name || "") : String(value || "");
        if (!filename || /^data:|^blob:|^https?:/i.test(filename)) continue;
        if (!preferredSet.has(String(widget?.name || "").toLowerCase()) && !/\.(png|jpe?g|webp|gif|bmp|mp4|webm|mov|mkv|avi|m4v|mp3|wav|flac|ogg|m4a|aac)$/i.test(filename)) continue;
        return {
            filename,
            subfolder: typeof value === "object" ? String(value?.subfolder || "") : "",
            storage: typeof value === "object" ? String(value?.type || "input") : "input",
        };
    }
    return null;
}

function promptOptimizerResources(node) {
    const counts = { image: 0, video: 0, audio: 0 };
    return normalizeLinks(node).map((link) => {
        const type = String(link.media_type || "image").toLowerCase();
        counts[type] = (counts[type] || 0) + 1;
        const ordinal = counts[type];
        const source = app.graph?.getNodeById?.(Number(link.source_id));
        return {
            type,
            tag: promptMentionTag(type, ordinal),
            name: sourceFilename(source, type) || sourceLabel(source),
            asset: sourceAssetDescriptor(source, type),
        };
    });
}

function clearAutomaticPromptMarker(node) {
    if (!node?.properties || !Object.prototype.hasOwnProperty.call(node.properties, PROMPT_AUTO_MARKER_PROP)) return false;
    delete node.properties[PROMPT_AUTO_MARKER_PROP];
    return true;
}

function setPromptFromOptimizedText(node, value, { preserveAutoMarker = false, notifyGraphChange = true } = {}) {
    const text = String(value || "").replace(/^```(?:text)?\s*/i, "").replace(/\s*```$/, "").trim();
    const doc = { version: 1, text, parts: promptPartsFromText(node, text) };
    node.properties ||= {};
    if (!preserveAutoMarker) clearAutomaticPromptMarker(node);
    // The result lands in the active tab's optimized field, so the source
    // prompt stays available for another run or for manual reuse.
    setPromptDocForField(node, PROMPT_FIELD_OPTIMIZED, doc);
    syncPromptWidgetFromDocs(node);
    const editor = promptEditorFor(node, PROMPT_FIELD_OPTIMIZED);
    if (editor) editor.__h3RawNeedsSync = false;
    renderEditorFromNode(node, true, PROMPT_FIELD_OPTIMIZED);
    syncPromptFromEditor(node, false);
    resetPromptHistory(node);
    syncEditorMode(node);
    node.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
    if (notifyGraphChange) app.graph?.change?.();
}

function promptOptimizerUiValue(message, name) {
    const output = message?.output && typeof message.output === "object" ? message.output : message;
    const value = output?.[name];
    return Array.isArray(value) ? value[0] : value;
}

function applyRuntimePromptOptimization(node, message) {
    if (!node || promptInputIsConnected(node)) return;
    const prompt = String(promptOptimizerUiValue(message, "auto_optimized_prompt") || "").trim();
    const markerValue = promptOptimizerUiValue(message, "auto_optimization_marker");
    if (!prompt || markerValue == null) return;

    let marker;
    try {
        marker = typeof markerValue === "string" ? JSON.parse(markerValue) : markerValue;
    } catch {
        return;
    }
    if (!marker || typeof marker !== "object") return;

    const currentPrompt = String(getWidget(node, "prompt")?.value || "");
    const currentMarker = node.properties?.[PROMPT_AUTO_MARKER_PROP];
    if (currentPrompt === prompt && JSON.stringify(currentMarker || {}) === JSON.stringify(marker)) return;

    if (node.__h3Editor) syncPromptFromEditor(node, false);
    pushPromptHistory(node);
    setPromptFromOptimizedText(node, prompt, { preserveAutoMarker: true, notifyGraphChange: false });
    node.properties ||= {};
    node.properties[PROMPT_AUTO_MARKER_PROP] = marker;
    node.__h3OptimizerSourcePrompt = null;
    node.__h3OptimizerLastResult = null;
    node.setDirtyCanvas?.(true, true);
    app.graph?.setDirtyCanvas?.(true, true);
}

async function optimizePromptFromEditor(node) {
    if (!node || node.__h3OptimizerPending || promptInputIsConnected(node)) return;
    syncPromptFromEditor(node, false);
    pushPromptHistory(node);
    try {
        await loadPromptOptimizerSettings();
    } catch (error) {
        notifyPromptOptimizer(error?.message || TEXT.settingsLoadFailed);
        return;
    }
    const state = promptOptimizerState(node);
    if (isClipOptimizerFormat(state.api_format)) {
        // The optimizer CLIP is only alive during execution, so this format
        // cannot run from the editor. Say when it will run instead.
        notifyPromptOptimizer(
            optimizerClipIsConnected(node) ? TEXT.optimizerDeferred : TEXT.optimizerClipMissing,
            optimizerClipIsConnected(node) ? "info" : "warn",
        );
        return;
    }
    if (isGgufOptimizerFormat(state.api_format)) {
        if (!state.gguf_model.trim()) {
            notifyPromptOptimizer(TEXT.ggufMissing);
            return;
        }
    } else if (!promptOptimizerConfigured(state)) {
        notifyPromptOptimizer(TEXT.optimizerMissing);
        return;
    }
    // Optimization always reads the active tab's source field, so clicking
    // again regenerates from the original text instead of rewriting a previous
    // result. A prompt typed straight into the optimized field still works as
    // its own source.
    const sourceText = promptDocText(promptDocForField(node, PROMPT_FIELD_SOURCE));
    const sourcePrompt = sourceText.trim() ? sourceText : promptDocText(promptDocForField(node, PROMPT_FIELD_OPTIMIZED));
    if (!sourcePrompt.trim()) return;
    const resources = promptOptimizerResources(node);
    const mediaCounts = { image: 0, video: 0, audio: 0 };
    resources.forEach((item) => { mediaCounts[item.type] = (mediaCounts[item.type] || 0) + 1; });
    // Read once, up front: the widget can be changed while the request is in
    // flight, and the answer has to match the mode that was actually asked for.
    const requestMode = canonicalOption("mode", getWidgetValue(node, "mode", MODE_IMAGE));
    // A string rather than upstream's Symbol, because the server needs it too:
    // this id is what `prompt_optimize_cancel` stops.
    const requestId = `${node.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    node.__h3OptimizerPending = true;
    node.__h3OptimizerRequestId = requestId;
    node.__h3OptimizerAbort = controller;
    node.__h3OptimizerStartedAt = globalThis.performance?.now?.() || Date.now();
    setPromptOptimizerStatus(node, "loading");
    syncPromptOptimizerButton(node);
    try {
        const response = await api.fetchApi("/minimax_h3_easy/prompt_optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller?.signal,
            body: JSON.stringify({
                request_id: requestId,
                prompt: sourcePrompt,
                scene_guide: state.scene_guide,
                mode: requestMode,
                seconds: Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Number(getWidgetValue(node, "seconds", 5)) || 5)),
                media_counts: mediaCounts,
                resources,
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (data?.cancelled) throw new DOMException("cancelled", "AbortError");
        if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        // Every branch below is guarded by the id: a stopped request whose answer
        // arrives late, or one the user superseded by starting another, must not
        // write into the editor or reset the state of the run that replaced it.
        // `cancelPromptOptimization` has already cleared the id and the status.
        if (node.__h3OptimizerRequestId !== requestId) return;
        setPromptFromOptimizedText(node, String(data.prompt || ""));
        setPromptOptimizerStatus(node, "success");
    } catch (error) {
        if (node.__h3OptimizerRequestId !== requestId) return;
        if (error?.name === "AbortError") {
            // Stopping is something the user asked for, not a failure.
            setPromptOptimizerStatus(node, "idle");
        } else {
            setPromptOptimizerStatus(node, "error");
            notifyPromptOptimizer(error?.message || error);
        }
    } finally {
        if (node.__h3OptimizerRequestId === requestId) {
            node.__h3OptimizerPending = false;
            node.__h3OptimizerRequestId = "";
            node.__h3OptimizerAbort = null;
            syncPromptOptimizerButton(node);
        }
    }
}

function cancelPromptOptimization(node) {
    if (!node?.__h3OptimizerPending) return;
    const requestId = node.__h3OptimizerRequestId;
    // Tell the server first: it stops a local GGUF mid-generation, and the
    // abort below only stops this browser from waiting.
    if (requestId) {
        api.fetchApi("/minimax_h3_easy/prompt_optimize_cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request_id: requestId }),
        }).catch(() => {});
    }
    node.__h3OptimizerAbort?.abort?.();
    node.__h3OptimizerPending = false;
    node.__h3OptimizerAbort = null;
    node.__h3OptimizerRequestId = "";
    setPromptOptimizerStatus(node, "idle");
    syncPromptOptimizerButton(node);
    notifyPromptOptimizer(TEXT.optimizerCancelled, "info");
}

function syncPromptFieldLabels(node) {
    const labels = node?.__h3PromptFieldLabels;
    if (!labels) return;
    // The dot marks the field that will actually be generated. An external
    // text link replaces both fields, so nothing is marked while it is wired.
    const effective = promptInputIsConnected(node) ? "" : effectivePromptField(node);
    for (const field of PROMPT_FIELDS) {
        const label = labels[field];
        if (!label) continue;
        const hint = field === PROMPT_FIELD_OPTIMIZED ? TEXT.promptFieldOptimizedHint : TEXT.promptFieldSourceHint;
        const isEffective = field === effective;
        label.classList.toggle("is-effective", isEffective);
        label.title = isEffective ? `${hint} \u00b7 ${TEXT.promptFieldEffective}` : hint;
    }
}

function syncEditorMode(node) {
    syncModeWidgets(node, { adjustHeight: false });
    const widget = getWidget(node, "prompt");
    const wrap = node.__h3EditorWrap;
    const domWidget = node.__h3DomWidget;
    if (!widget || !promptEditors(node).length || !wrap || !domWidget) return;
    syncPromptExternalConnectionState(node);
    const reference = isReferenceMode(node);
    const raw = isRawPromptMode(node);
    hideOriginalPromptWidget(widget);
    setWidgetOption(domWidget, "canvasOnly", false);
    showDomEditorWidget(domWidget);
    wrap.style.display = "flex";
    for (const field of PROMPT_FIELDS) {
        const editor = promptEditorFor(node, field);
        if (!editor) continue;
        editor.style.display = "block";
        editor.dataset.placeholder = promptEditorPlaceholder(node, field);
        editor.classList.toggle("is-raw", raw);
    }
    wrap.classList.toggle("is-raw", raw);
    syncPromptViewButton(node);
    syncPromptTabStrip(node);
    syncPromptFieldLabels(node);
    applyNativeEditorTheme(wrap);
    if (!reference || raw) closeMentionMenu(node);
}

function handleMentionMenuKeydown(node, event) {
    const state = node?.__h3MentionMenu;
    if (!state) return false;
    if (event.key === "Escape") {
        closeMentionMenu(node);
        return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (state.options.length) {
            const delta = event.key === "ArrowDown" ? 1 : -1;
            state.activeIndex = (state.activeIndex + delta + state.options.length) % state.options.length;
            renderMentionMenu(node);
            state.element.querySelector(".is-active")?.scrollIntoView?.({ block: "nearest" });
        }
        return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
        const option = state.options[state.activeIndex];
        if (option) chooseMention(node, option);
        return Boolean(option);
    }
    return false;
}

function stripCaretSentinels(value) {
    return String(value ?? "").replaceAll(CARET_SENTINEL, "");
}

function makeCaretSentinel() {
    return document.createTextNode(CARET_SENTINEL);
}

function isCaretSentinelText(node) {
    return node?.nodeType === Node.TEXT_NODE && String(node.textContent || "").includes(CARET_SENTINEL);
}

function isOnlyCaretSentinelText(node) {
    return node?.nodeType === Node.TEXT_NODE && stripCaretSentinels(node.textContent) === "";
}

function isIgnorableTextNode(node) {
    return node?.nodeType === Node.TEXT_NODE && stripCaretSentinels(node.textContent).trim() === "";
}

function isMentionChip(node) {
    return node?.nodeType === Node.ELEMENT_NODE && node.classList?.contains("h3-mention-chip");
}

function deepestLeaf(node, direction) {
    let current = node;
    if (isMentionChip(current) || isDialogueBlock(current)) return current;
    while (current?.childNodes?.length) {
        if (isMentionChip(current) || isDialogueBlock(current) || current.contentEditable === "false") return current;
        current = direction === "backward"
            ? current.childNodes[current.childNodes.length - 1]
            : current.childNodes[0];
    }
    return current;
}

function adjacentLeaf(node, root, direction) {
    if (!node || node === root) return null;
    let current = node;
    while (current && current !== root) {
        const sibling = direction === "backward" ? current.previousSibling : current.nextSibling;
        if (sibling) return deepestLeaf(sibling, direction);
        current = current.parentNode;
    }
    return null;
}

function getAdjacentLeafFromCaret(range, root, direction) {
    const container = range.startContainer;
    const offset = range.startOffset;
    if (container.nodeType === Node.TEXT_NODE) {
        if (direction === "backward" && offset > 0) return null;
        if (direction === "forward" && offset < container.textContent.length) return null;
        return adjacentLeaf(container, root, direction);
    }
    if (container.nodeType === Node.ELEMENT_NODE) {
        if (direction === "backward") {
            if (offset > 0) return deepestLeaf(container.childNodes[offset - 1], "backward");
            return adjacentLeaf(container, root, "backward");
        }
        if (offset < container.childNodes.length) return deepestLeaf(container.childNodes[offset], "forward");
        return adjacentLeaf(container, root, "forward");
    }
    return null;
}

function findChipAcrossWhitespace(start, root, direction) {
    let current = start;
    const skipped = [];
    while (current) {
        if (isMentionChip(current)) return { chip: current, skipped };
        if (isIgnorableTextNode(current)) {
            skipped.push(current);
            current = adjacentLeaf(current, root, direction);
            continue;
        }
        if (current.nodeType === Node.ELEMENT_NODE && current.tagName === "BR") return null;
        return null;
    }
    return null;
}

function findLineBreakAcrossWhitespace(start, root, direction) {
    let current = start;
    const skipped = [];
    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE && current.tagName === "BR") {
            return { breakNode: current, skipped };
        }
        if (isIgnorableTextNode(current)) {
            skipped.push(current);
            current = adjacentLeaf(current, root, direction);
            continue;
        }
        return null;
    }
    return null;
}

function setCaretAtNode(node, offset = 0) {
    const selection = window.getSelection?.();
    if (!selection || !node) return;
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function getDeletionScanStart(range, editor, direction) {
    let spacer = null;
    let start = null;
    const container = range.startContainer;
    const offset = range.startOffset;
    if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || "";
        if (direction === "backward") {
            const before = text.slice(0, offset);
            if (before && stripCaretSentinels(before).trim() !== "") return null;
            spacer = before ? container : null;
            start = before ? adjacentLeaf(container, editor, "backward") : getAdjacentLeafFromCaret(range, editor, "backward");
        } else {
            const after = text.slice(offset);
            if (after && stripCaretSentinels(after).trim() !== "") return null;
            spacer = after ? container : null;
            start = after ? adjacentLeaf(container, editor, "forward") : getAdjacentLeafFromCaret(range, editor, "forward");
        }
    } else {
        start = getAdjacentLeafFromCaret(range, editor, direction);
    }
    return { start, spacer, container, offset };
}

function removeSpacerText(spacer, offset, direction) {
    if (spacer?.nodeType !== Node.TEXT_NODE) return;
    if (direction === "backward") spacer.deleteData(0, offset);
    else spacer.deleteData(offset, spacer.textContent.length - offset);
    if (!spacer.textContent) spacer.remove();
}

function deleteLastVisibleChar(textNode) {
    const text = String(textNode?.textContent || "");
    let cursor = 0;
    let last = null;
    for (const char of Array.from(text)) {
        const length = char.length;
        if (char !== CARET_SENTINEL) last = { index: cursor, length };
        cursor += length;
    }
    if (!last) return false;
    textNode.deleteData(last.index, last.length);
    if (!textNode.textContent) textNode.remove();
    return true;
}

function deletePreviousVisibleCharBeforeOffset(textNode, offset) {
    if (textNode?.nodeType !== Node.TEXT_NODE) return false;
    const text = String(textNode.textContent || "");
    const limit = Math.max(0, Math.min(Number(offset) || 0, text.length));
    let cursor = 0;
    let target = null;
    for (const char of Array.from(text)) {
        const length = char.length;
        const next = cursor + length;
        if (next > limit) break;
        if (char !== CARET_SENTINEL) target = { index: cursor, length };
        cursor = next;
    }
    if (!target) return false;
    textNode.deleteData(target.index, target.length);
    setCaretAtNode(textNode, target.index);
    return true;
}

function getOrInsertCaretSentinel(chip, side) {
    if (!chip?.parentNode) return null;
    const sibling = side === "before" ? chip.previousSibling : chip.nextSibling;
    if (isCaretSentinelText(sibling)) return sibling;
    const marker = makeCaretSentinel();
    chip.parentNode.insertBefore(marker, side === "before" ? chip : chip.nextSibling);
    return marker;
}

function removeMentionChip(chip, direction = "backward") {
    if (!chip?.parentNode) return null;
    const marker = makeCaretSentinel();
    chip.parentNode.insertBefore(marker, direction === "backward" ? chip : chip.nextSibling);
    chip.remove();
    return marker;
}

function findPreviousContentFromSentinel(marker, editor) {
    let current = adjacentLeaf(marker, editor, "backward");
    const skipped = [];
    while (current) {
        if (isOnlyCaretSentinelText(current)) {
            skipped.push(current);
            current = adjacentLeaf(current, editor, "backward");
            continue;
        }
        return { node: current, skipped };
    }
    return { node: null, skipped };
}

function removeEmptyCaretMarker(marker) {
    if (isOnlyCaretSentinelText(marker)) marker.remove?.();
}

function placeCaretAfterPreviousContent(marker, editor) {
    const previous = findPreviousContentFromSentinel(marker, editor);
    if (previous.node?.nodeType === Node.TEXT_NODE) {
        setCaretAtNode(previous.node, previous.node.textContent.length);
        removeEmptyCaretMarker(marker);
        return true;
    }
    if (isMentionChip(previous.node)) {
        const afterMarker = getOrInsertCaretSentinel(previous.node, "after");
        setCaretAtNode(afterMarker, afterMarker.textContent.length);
        if (afterMarker !== marker) removeEmptyCaretMarker(marker);
        return true;
    }
    setCaretAtNode(marker, marker.textContent.length);
    return false;
}

function isSentinelBeforeChip(marker, editor) {
    const next = adjacentLeaf(marker, editor, "forward");
    return Boolean(findChipAcrossWhitespace(next, editor, "forward")?.chip);
}

function backspaceBeforeChip(editor, node) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const marker = range.startContainer;
    if (!editor.contains(marker) || !isCaretSentinelText(marker) || !isSentinelBeforeChip(marker, editor)) return false;
    if (deletePreviousVisibleCharBeforeOffset(marker, range.startOffset)) return true;
    const previous = findPreviousContentFromSentinel(marker, editor);
    if (!previous.node) {
        if (isSentinelBeforeChip(marker, editor)) setCaretAtNode(marker, marker.textContent.length);
        else if (marker.textContent === CARET_SENTINEL) marker.remove();
        closeMentionMenu(node);
        return true;
    }
    if (previous.node.nodeType === Node.TEXT_NODE) deleteLastVisibleChar(previous.node);
    else if (isMentionChip(previous.node)) previous.node.remove();
    else if (previous.node.nodeType === Node.ELEMENT_NODE && previous.node.tagName === "BR") previous.node.remove();
    else return false;
    for (const item of previous.skipped) item.remove?.();
    setCaretAtNode(marker, marker.textContent.length);
    closeMentionMenu(node);
    return true;
}

function backspaceAtLooseSentinel(editor, node) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const marker = range.startContainer;
    if (!editor.contains(marker) || !isCaretSentinelText(marker) || isSentinelBeforeChip(marker, editor)) return false;
    if (deletePreviousVisibleCharBeforeOffset(marker, range.startOffset)) return true;
    const previous = findPreviousContentFromSentinel(marker, editor);
    if (!previous.node || (previous.node.nodeType === Node.ELEMENT_NODE && previous.node.tagName === "BR")) return false;
    if (previous.node.nodeType === Node.TEXT_NODE) deleteLastVisibleChar(previous.node);
    else if (isMentionChip(previous.node)) previous.node.remove();
    else return false;
    for (const item of previous.skipped) item.remove?.();
    setCaretAtNode(marker, marker.textContent.length);
    closeMentionMenu(node);
    return true;
}

function deleteLineBreakNearCaret(editor, node, direction) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return false;
    const scan = getDeletionScanStart(range, editor, direction);
    if (!scan) return false;
    const found = findLineBreakAcrossWhitespace(scan.start, editor, direction);
    if (!found?.breakNode) return false;
    const marker = makeCaretSentinel();
    found.breakNode.parentNode?.insertBefore(marker, found.breakNode);
    found.breakNode.remove();
    for (const item of found.skipped) item.remove?.();
    removeSpacerText(scan.spacer, scan.offset, direction);
    placeCaretAfterPreviousContent(marker, editor);
    closeMentionMenu(node);
    return true;
}

function blockNativeSentinelDeletion(editor) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const marker = range.startContainer;
    if (!editor.contains(marker) || !isCaretSentinelText(marker)) return false;
    if (stripCaretSentinels(marker.textContent || "") !== "") return false;
    const previous = adjacentLeaf(marker, editor, "backward");
    const next = adjacentLeaf(marker, editor, "forward");
    return Boolean(
        findChipAcrossWhitespace(previous, editor, "backward")?.chip
        || findChipAcrossWhitespace(next, editor, "forward")?.chip
    );
}

function deleteChipNearCaret(editor, node, direction) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const editorNode = range.startContainer;
    if (!editor.contains(editorNode)) return false;
    const directChip = editorNode.nodeType === Node.ELEMENT_NODE
        ? editorNode.closest?.(".h3-mention-chip")
        : editorNode.parentElement?.closest?.(".h3-mention-chip");
    if (directChip && editor.contains(directChip)) {
        const marker = removeMentionChip(directChip, direction);
        setCaretAtNode(marker, marker.textContent.length);
        closeMentionMenu(node);
        return true;
    }
    const scan = getDeletionScanStart(range, editor, direction);
    if (!scan) return false;
    const found = findChipAcrossWhitespace(scan.start, editor, direction);
    if (!found?.chip) return false;
    const marker = removeMentionChip(found.chip, direction);
    for (const item of found.skipped) item.remove?.();
    removeSpacerText(scan.spacer, scan.offset, direction);
    setCaretAtNode(marker, marker.textContent.length);
    closeMentionMenu(node);
    return true;
}

function insertEditorLineBreak(editor) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;
    range.deleteContents();
    const br = document.createElement("br");
    const marker = document.createTextNode("\u200B");
    const fragment = document.createDocumentFragment();
    fragment.append(br, marker);
    range.insertNode(fragment);
    const caret = document.createRange();
    caret.setStart(marker, marker.textContent.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    return true;
}

function insertPlainText(editor, text) {
    if (document.execCommand?.("insertText", false, text)) return;
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function pastedMentionCandidates(node) {
    if (!isReferenceMode(node)) return [];
    const labels = {
        image: ["\u56fe\u7247", "Image", "image", "Picture", "picture"],
        video: ["\u89c6\u9891", "Video", "video"],
        audio: ["\u97f3\u9891", "Audio", "audio"],
    };
    const candidates = [];
    const seen = new Set();
    for (const option of mentionOptions(node)) {
        const aliases = new Set();
        if (option.fullLabel) aliases.add(`@${option.fullLabel}`);
        if (option.token) aliases.add(option.token);
        for (const prefix of labels[option.type] || []) {
            aliases.add(`@${prefix}${option.ordinal}`);
            aliases.add(`@${prefix} ${option.ordinal}`);
        }
        for (const raw of aliases) {
            const value = String(raw || "");
            const key = value.toLocaleLowerCase();
            if (!value || seen.has(key)) continue;
            seen.add(key);
            candidates.push({ raw: value, option });
        }
    }
    return candidates.sort((left, right) => right.raw.length - left.raw.length);
}

function pastedOfficialMediaTagMatch(node, value, cursor) {
    if (!isReferenceMode(node)) return null;
    const match = String(value || "").slice(cursor).match(/^<\s*(picture|video|audio)\s*(\d+)\s*>/i);
    if (!match) return null;
    const type = match[1].toLowerCase() === "picture" ? "image" : match[1].toLowerCase();
    const ordinal = Number(match[2]);
    if (!Number.isFinite(ordinal) || ordinal <= 0) return null;
    const live = mentionOptions(node);
    const resolved = live.find((option) => option.type === type && Number(option.ordinal) === ordinal);
    const tag = type === "image" ? `<Picture ${ordinal}>` : type === "video" ? `<Video ${ordinal}>` : `<Audio ${ordinal}>`;
    const fallbackLabel = `${LABELS[type] || type}${ordinal}`;
    return {
        raw: match[0],
        option: resolved || {
            type,
            tag,
            token: `@${fallbackLabel}`,
            label: fallbackLabel,
            fullLabel: fallbackLabel,
            ordinal,
            referenceMode: referenceMentionMode(node),
            sourceId: null,
            sourceSlot: 0,
            previewUrl: "",
            unresolved: true,
            pending: true,
        },
    };
}

function appendPastedText(fragment, text) {
    let last = null;
    String(text || "").split("\n").forEach((part, index) => {
        if (index) {
            last = document.createElement("br");
            fragment.append(last);
        }
        if (part) {
            last = document.createTextNode(part);
            fragment.append(last);
        }
    });
    return last;
}

function insertTextWithMentionChips(node, editor, text) {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !editor.contains(selection.anchorNode)) return false;
    const range = selection.getRangeAt(0);
    const value = String(text || "");
    if (!value) return false;
    const candidates = pastedMentionCandidates(node);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    let plainStart = 0;
    let cursor = 0;
    while (cursor < value.length) {
        const match = pastedOfficialMediaTagMatch(node, value, cursor)
            || candidates.find((candidate) => value.slice(cursor, cursor + candidate.raw.length).toLocaleLowerCase() === candidate.raw.toLocaleLowerCase());
        if (!match) {
            cursor += 1;
            continue;
        }
        if (plainStart < cursor) appendPastedText(fragment, value.slice(plainStart, cursor));
        fragment.append(document.createTextNode(CARET_SENTINEL));
        fragment.append(makeMentionChip(match.option));
        fragment.append(document.createTextNode(CARET_SENTINEL));
        cursor += match.raw.length;
        plainStart = cursor;
    }
    if (plainStart < value.length) appendPastedText(fragment, value.slice(plainStart));
    const caretMarker = document.createTextNode(CARET_SENTINEL);
    fragment.append(caretMarker);
    range.insertNode(fragment);
    const caret = document.createRange();
    caret.setStart(caretMarker, caretMarker.textContent.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    return true;
}

function createPromptFieldEditor(node, field, wrap) {
    const editor = document.createElement("div");
    editor.className = "comfy-multiline-input h3-prompt-editor";
    editor.contentEditable = "true";
    preparePromptEditorForUndo(editor);
    editor.__h3PromptNode = node;
    editor.__h3PromptField = field;
    editor.tabIndex = 0;
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-label", field === PROMPT_FIELD_OPTIMIZED ? "optimized prompt" : "prompt");
    editor.dataset.placeholder = promptEditorPlaceholder(node, field);
    editor.spellcheck = false;
    editor.addEventListener("beforeinput", (event) => {
        if (isRawPromptMode(node)) {
            node.__h3DialogueHashHandled = false;
            return;
        }
        if (node.__h3DialogueHashHandled) {
            node.__h3DialogueHashHandled = false;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            return;
        }
        if (event.inputType === "insertText" && event.data === "#" && insertDialogueBlockAtSelection(node, editor)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
            return;
        }
        if (isReferenceMode(node) && event.data === "@") setTimeout(() => syncMentionMenuToCaret(node, editor), 0);
    });
    editor.addEventListener("input", (event) => {
        const raw = isRawPromptMode(node);
        if (raw) editor.__h3RawNeedsSync = true;
        syncPromptFromEditor(node);
        if (event?.isComposing || event?.inputType === "insertCompositionText" || node.__h3PromptComposing) {
            if (!raw) syncMentionMenuToCaret(node, editor);
            return;
        }
        pushPromptHistory(node, editor);
        if (raw) {
            closeMentionMenu(node);
            return;
        }
        syncMentionMenuToCaret(node, editor);
    });
    editor.addEventListener("compositionstart", () => {
        node.__h3PromptComposing = true;
    });
    editor.addEventListener("compositionend", () => {
        node.__h3PromptComposing = false;
        if (isRawPromptMode(node)) editor.__h3RawNeedsSync = true;
        syncPromptFromEditor(node);
        pushPromptHistory(node, editor);
    });
    editor.addEventListener("focus", () => {
        activePromptNode = node;
        // Everything that acts on "the prompt the user is editing" - the
        // mention picker, undo, caret helpers - follows the focused field.
        node.__h3Editor = editor;
        applyNativeEditorTheme(wrap);
        // Focusing the editor must not open the picker by itself. It should only
        // appear when the caret is actually inside a freshly typed @ query.
        if (isRawPromptMode(node)) closeMentionMenu(node);
        else syncMentionMenuToCaret(node, editor);
    });
    editor.addEventListener("pointerdown", () => {
        activePromptNode = node;
        node.__h3Editor = editor;
    }, true);
    editor.addEventListener("keyup", (event) => {
        if (isRawPromptMode(node) || !isReferenceMode(node) || ["ArrowUp", "ArrowDown", "Enter", "Escape", "Tab"].includes(event.key)) return;
        syncMentionMenuToCaret(node, editor);
        event.stopPropagation();
    });
    editor.addEventListener("keydown", (event) => {
        if (isPromptUndoRedoEvent(event)) {
            node.__h3Editor = editor;
            handlePromptHistoryKeydown(node, event);
        }
    }, true);
    editor.addEventListener("keydown", (event) => {
        const key = String(event.key || "").toLowerCase();
        if ((event.ctrlKey || event.metaKey) && key === "s") {
            syncPromptFromEditor(node);
            event.preventDefault();
            return;
        }
        const raw = isRawPromptMode(node);
        if (raw) closeMentionMenu(node);
        if (!raw && handleMentionMenuKeydown(node, event)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!raw && event.key === "#" && !event.ctrlKey && !event.metaKey && !event.altKey && insertDialogueBlockAtSelection(node, editor)) {
            event.preventDefault();
            event.stopPropagation();
            node.__h3DialogueHashHandled = true;
            setTimeout(() => { node.__h3DialogueHashHandled = false; }, 0);
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
            return;
        }
        const dialogue = dialogueBlockAtSelection(editor);
        if (event.key === "Enter" && dialogue && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            exitDialogueBlock(node, editor, dialogue);
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
            return;
        }
        if (event.key === "Enter" && dialogue && event.shiftKey && insertEditorLineBreak(editor)) {
            event.preventDefault();
            event.stopPropagation();
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
            return;
        }
        if (event.key === "Backspace" && (
            backspaceDialogueBoundary(editor, node)
            || deleteLineBreakNearCaret(editor, node, "backward")
            || deleteChipNearCaret(editor, node, "backward")
            || backspaceBeforeChip(editor, node)
            || backspaceAtLooseSentinel(editor, node)
            || blockNativeSentinelDeletion(editor)
        )) {
            event.preventDefault();
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
        } else if (event.key === "Delete" && deleteChipNearCaret(editor, node, "forward")) {
            event.preventDefault();
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
        } else if (event.key === "Enter" && insertEditorLineBreak(editor)) {
            event.preventDefault();
            closeMentionMenu(node);
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
        } else if (event.key === "Escape") {
            closeMentionMenu(node);
        }
        event.stopPropagation();
    });
    editor.addEventListener("paste", (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        const text = event.clipboardData?.getData("text/plain") || "";
        if (isRawPromptMode(node)) {
            insertPlainText(editor, text);
            editor.__h3RawNeedsSync = true;
            syncPromptFromEditor(node);
            pushPromptHistory(node, editor);
            return;
        }
        insertTextWithMentionChips(node, editor, text);
        syncPromptFromEditor(node);
        pushPromptHistory(node, editor);
        syncMentionMenuToCaret(node, editor);
    });
    editor.addEventListener("blur", () => {
        syncPromptFromEditor(node);
        setTimeout(() => {
            if (!node.__h3MentionMenu?.element?.matches?.(":hover")) closeMentionMenu(node);
        }, 160);
    });
    editor.addEventListener("wheel", (event) => {
        const editorFocused = document.activeElement === editor;
        const horizontal = Math.abs(event.deltaX || 0) > Math.abs(event.deltaY || 0);
        const maxScrollTop = Math.max(0, editor.scrollHeight - editor.clientHeight);
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 16;
        const deltaY = event.deltaMode === 1
            ? event.deltaY * lineHeight
            : event.deltaMode === 2
                ? event.deltaY * editor.clientHeight
                : event.deltaY;
        if (!editorFocused) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            app.canvas?.processMouseWheel?.(event);
            return;
        }
        if (!event.ctrlKey && !horizontal && maxScrollTop > 0 && deltaY) {
            const next = Math.max(0, Math.min(maxScrollTop, editor.scrollTop + deltaY));
            if (next !== editor.scrollTop) {
                editor.scrollTop = next;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                return;
            }
        }
        if (!event.ctrlKey && !horizontal && maxScrollTop > 0) {
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        app.canvas?.processMouseWheel?.(event);
    }, { passive: false, capture: true });
    return editor;
}

function createPromptField(node, field, wrap) {
    const container = document.createElement("div");
    container.className = `h3-prompt-field is-${field}`;
    const label = document.createElement("div");
    label.className = "h3-prompt-field-label";
    const name = document.createElement("span");
    name.textContent = field === PROMPT_FIELD_OPTIMIZED ? TEXT.promptFieldOptimized : TEXT.promptFieldSource;
    const dot = document.createElement("span");
    dot.className = "h3-prompt-field-dot";
    label.append(name, dot);
    const editor = createPromptFieldEditor(node, field, wrap);
    container.append(label, editor);
    return { container, label, editor };
}

function ensurePromptEditor(node) {
    if (node.__h3Editors) {
        for (const editor of promptEditors(node)) preparePromptEditorForUndo(editor);
        return;
    }
    if (typeof document === "undefined" || typeof node.addDOMWidget !== "function") return;
    // A workflow tab can deactivate and reactivate the same node instance.
    // `onRemoved` clears the DOM editor, but older builds left its DOM widget
    // in `node.widgets`. Adding another one on every activation makes ComfyUI
    // allocate the editor row repeatedly and the node grows on each tab switch.
    removePromptEditorWidgets(node);
    ensurePromptUndoRedoShield();
    patchLiteGraphPromptProcessKey();
    const widget = getWidget(node, "prompt");
    if (!widget) return;
    hideOriginalPromptWidget(widget);
    const wrap = document.createElement("div");
    wrap.className = "h3-prompt-editor-wrap";
    wrap.style.minHeight = "0px";
    applyNativeEditorTheme(wrap);
    const tabStrip = makePromptTabStrip(node);
    const fields = {};
    const editors = {};
    const labels = {};
    for (const field of PROMPT_FIELDS) {
        const built = createPromptField(node, field, wrap);
        fields[field] = built.container;
        editors[field] = built.editor;
        labels[field] = built.label;
    }
    const editorTools = document.createElement("div");
    editorTools.className = "h3-prompt-editor-tools";
    const optimizerStatus = document.createElement("div");
    optimizerStatus.className = "h3-prompt-editor-status";
    optimizerStatus.hidden = true;
    optimizerStatus.setAttribute("role", "status");
    optimizerStatus.setAttribute("aria-live", "polite");
    const optimizerStatusSpinner = document.createElement("span");
    optimizerStatusSpinner.className = "h3-prompt-editor-status-spinner";
    const optimizerStatusText = document.createElement("span");
    // Upstream moved the dimming off the container and onto the two children so
    // its stop button could sit at full strength. That button is not built here,
    // but the class still has to be set or the label renders undimmed.
    optimizerStatusText.className = "h3-prompt-editor-status-text";
    optimizerStatus.append(optimizerStatusSpinner, optimizerStatusText);
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "h3-prompt-editor-tool h3-prompt-editor-view-toggle";
    viewButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    viewButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePromptView(node);
    });
    const optimizeButton = document.createElement("button");
    optimizeButton.type = "button";
    optimizeButton.className = "h3-prompt-editor-tool h3-prompt-editor-optimize";
    optimizeButton.textContent = "\u2726";
    optimizeButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    optimizeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (node.__h3OptimizerPending) cancelPromptOptimization(node);
        else optimizePromptFromEditor(node);
    });
    editorTools.append(optimizeButton, viewButton);
    wrap.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        if (!event.target?.closest?.(".h3-mention-chip")) closeMentionMenu(node);
    });
    wrap.addEventListener("wheel", (event) => {
        // Anything outside an editor (tab strip, labels, padding) keeps the
        // canvas zoom behaviour.
        if (event.target?.closest?.(".h3-prompt-editor, .h3-prompt-tabs")) return;
        event.preventDefault();
        event.stopPropagation();
        app.canvas?.processMouseWheel?.(event);
    }, { passive: false });
    wrap.append(tabStrip, fields[PROMPT_FIELD_SOURCE], fields[PROMPT_FIELD_OPTIMIZED], optimizerStatus, editorTools);
    node.__h3Editors = editors;
    node.__h3Editor = editors[PROMPT_FIELD_SOURCE];
    node.__h3EditorWrap = wrap;
    node.__h3PromptTabStrip = tabStrip;
    node.__h3PromptFieldLabels = labels;
    node.__h3PromptEditorTools = editorTools;
    node.__h3PromptViewButton = viewButton;
    node.__h3PromptOptimizeButton = optimizeButton;
    node.__h3PromptOptimizerStatus = optimizerStatus;
    node.__h3PromptOptimizerStatusText = optimizerStatusText;
    syncPromptExternalConnectionState(node);
    renderEditorFromNode(node);
    syncPromptTabStrip(node);
    syncPromptOptimizerButton(node);
    resetPromptHistory(node);
    const domWidget = node.addDOMWidget("h3_prompt_mentions", "h3_prompt_mentions", wrap, {
        getValue: () => String(getWidget(node, "prompt")?.value || ""),
        setValue: (value) => {
            const promptWidget = getWidget(node, "prompt");
            if (promptWidget) promptWidget.value = String(value || "");
            renderEditorFromNode(node);
        },
        margin: 10,
        serialize: false,
        getMinHeight: () => PROMPT_TABS_HEIGHT + 2 * (PROMPT_FIELD_LABEL_HEIGHT + PROMPT_FIELD_MIN_HEIGHT),
        afterResize: () => {
            applyNativeEditorTheme(wrap);
            node._widgetSlotsDirty = true;
            node.setDirtyCanvas?.(true, true);
        },
        onDraw: () => applyNativeEditorTheme(wrap),
    });
    if (!domWidget) {
        restoreOriginalPromptWidget(widget);
        wrap.remove();
        node.__h3Editors = null;
        node.__h3Editor = null;
        node.__h3EditorWrap = null;
        node.__h3PromptTabStrip = null;
        node.__h3PromptFieldLabels = null;
        node.__h3PromptEditorTools = null;
        node.__h3PromptViewButton = null;
        node.__h3PromptOptimizeButton = null;
        return;
    }
    node.__h3DomWidget = domWidget;
    domWidget.serialize = false;
    setWidgetOption(domWidget, "serialize", false);
    setWidgetOption(domWidget, "canvasOnly", false);
    domWidget.__h3EditorType = domWidget.type;
    domWidget.__h3EditorComputeSize = domWidget.computeSize;
    const domIndex = node.widgets?.indexOf(domWidget) ?? -1;
    const promptIndex = node.widgets?.indexOf(widget) ?? -1;
    if (domIndex >= 0 && promptIndex >= 0 && domIndex !== promptIndex + 1) {
        node.widgets.splice(domIndex, 1);
        const nextPromptIndex = node.widgets.indexOf(widget);
        node.widgets.splice(nextPromptIndex + 1, 0, domWidget);
    }
    syncEditorMode(node);
    repairNodeLayout(node);
}

function installPromptEditorSoon(node) {
    if (!node || node.__h3PromptInstallPending || node.__h3PromptInstallRetry || node.__h3Editor) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now < (Number(node.__h3PromptInstallNextAt) || 0)) return;
    node.__h3PromptInstallPending = true;
    const run = () => {
        node.__h3PromptInstallPending = false;
        ensurePromptEditor(node);
        if (node.__h3Editor) {
            if (restorePromptEditorStableSize(node)) repairNodeLayout(node);
            node.__h3PromptInstallAttempts = 0;
            node.__h3PromptInstallNextAt = 0;
            return;
        }
        const attempts = Math.min(8, (Number(node.__h3PromptInstallAttempts) || 0) + 1);
        const delay = Math.min(2000, 120 * (2 ** Math.min(attempts - 1, 4)));
        node.__h3PromptInstallAttempts = attempts;
        node.__h3PromptInstallNextAt = (typeof performance !== "undefined" ? performance.now() : Date.now()) + delay;
        node.__h3PromptInstallRetry = setTimeout(() => {
            node.__h3PromptInstallRetry = null;
            installPromptEditorSoon(node);
        }, delay);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 0);
}

function removePromptEditorWidgets(node) {
    if (!Array.isArray(node?.widgets)) return false;
    const stale = node.widgets.filter((widget) =>
        widget === node.__h3DomWidget || String(widget?.name || "") === "h3_prompt_mentions"
    );
    if (!stale.length) return false;
    for (const widget of stale) {
        try { widget.element?.remove?.(); } catch { /* Already detached. */ }
    }
    const next = node.widgets.filter((widget) => !stale.includes(widget));
    node.widgets = next;
    if (Array.isArray(node._widgets)) node._widgets = next;
    node.__h3DomWidget = null;
    node._widgetSlotsDirty = true;
    refreshVueNodeWidgets(node);
    return true;
}

function updatePromptEditor(node) {
    const editors = promptEditors(node);
    if (!editors.length) {
        installPromptEditorSoon(node);
        return;
    }
    for (const editor of editors) preparePromptEditorForUndo(editor);
    syncEditorMode(node);
}

function isTransportInputName(name) {
    const value = String(name || "");
    return /^media_[0-9]+$/i.test(value)
        || /^media_type_[0-9]+$/i.test(value)
        || value === "prompt_needs_optimization"
        || value === "prompt_optimizer_resources"
        || value === "prompt_optimizer_marker"
        || value === "prompt_optimizer_prompt_connected";
}

function removeInputSlot(node, index) {
    const input = node?.inputs?.[index];
    if (!input) return false;
    if (input.link != null) {
        try {
            node.disconnectInput?.(index);
        } catch {
            // Ignore and fall through to hard removal.
        }
        if (input.link != null) {
            try {
                node.graph?.removeLink?.(input.link);
            } catch {
                // Ignore - the slot is going away either way.
            }
            input.link = null;
        }
    }
    if (typeof node.removeInput === "function") node.removeInput(index);
    else node.inputs.splice(index, 1);
    return true;
}

function pruneTransportInputs(nodeData) {
    const sections = [nodeData?.input?.required, nodeData?.input?.optional];
    let changed = false;
    for (const section of sections) {
        if (!section || typeof section !== "object") continue;
        for (const name of Object.keys(section)) {
            if (!isTransportInputName(name)) continue;
            delete section[name];
            changed = true;
        }
    }
    if (Array.isArray(nodeData?.inputs)) {
        nodeData.inputs = nodeData.inputs.filter((input) => !isTransportInputName(input?.name));
        changed = true;
    }
    return changed;
}

function pruneTransportInputsFromNode(node, { requestLayout = true, force = false } = {}) {
    if (!node || (!force && !isTarget(node))) return false;
    let changed = false;
    if (Array.isArray(node.inputs)) {
        for (let index = node.inputs.length - 1; index >= 0; index -= 1) {
            const input = node.inputs[index];
            const name = String(input?.name || "");
            if (!isTransportInputName(name)) continue;
            if (/^media_\d+$/i.test(name) && input.link != null) {
                convertNativeMediaConnection(node, index);
            }
            removeInputSlot(node, index);
            changed = true;
        }
    }
    if (Array.isArray(node.widgets)) {
        const stale = node.widgets.filter((widget) => /^media_type_\d+$/i.test(String(widget?.name || "")));
        if (stale.length) {
            for (const widget of stale) {
                try { widget.element?.remove?.(); } catch { /* Already detached. */ }
            }
            node.widgets = node.widgets.filter((widget) => !stale.includes(widget));
            if (Array.isArray(node._widgets)) {
                node._widgets = node._widgets.filter((widget) => !stale.includes(widget));
            }
            refreshVueNodeWidgets(node);
            changed = true;
        }
    }
    if (changed) {
        node._widgetSlotsDirty = true;
        app.graph?.change?.();
        node.setDirtyCanvas?.(true, true);
        app.graph?.setDirtyCanvas?.(true, true);
        if (requestLayout) repairNodeLayout(node);
    }
    return changed;
}

function setConfiguredWidgetValue(node, name, value) {
    const widget = getWidget(node, name);
    if (!widget || value === undefined) return;
    widget.value = value;
    if (widget._state) widget._state.value = value;
}

function bindPromptOptimizerWidgetCallbacks(node) {
    const names = ["prompt_optimizer_settings", "prompt_optimizer_scene_guide"];
    for (const name of names) {
        const widget = getWidget(node, name);
        if (!widget || widget.__h3PromptOptimizerCallbackBound) continue;
        widget.__h3PromptOptimizerCallbackBound = true;
        const original = widget.callback;
        widget.callback = (value) => {
            if (name === "prompt_optimizer_settings") {
                resetPromptOptimizerSettingsToggle(node);
                if (asBoolean(value, false)) openPromptOptimizerSettings(node);
                node.setDirtyCanvas?.(true, true);
                return;
            }
            original?.call(widget, value);
            if (name === "prompt_optimizer_scene_guide") widget.value = ZH_BROWSER
                ? (PROMPT_GUIDES.find((item) => item.value === canonicalPromptGuide(value))?.zh || value)
                : (PROMPT_GUIDES.find((item) => item.value === canonicalPromptGuide(value))?.en || value);
            syncPromptOptimizerButton(node);
            node.setDirtyCanvas?.(true, true);
            app.graph?.change?.();
        };
    }
}

function repairConfiguredWidgetValues(node, info) {
    const raw = Array.isArray(info?.widgets_values) ? [...info.widgets_values] : [];
    if (!raw.length) return;

    const defaults = {
        mode: MODE_IMAGE,
        prompt: "",
        resolution: "480P",
        aspect_ratio: "16:9",
        width: 1344,
        height: 768,
        seconds: 5,
        advanced: false,
        fps: 24,
        keyframe_role: KEYFRAME_FIRST,
        ref_image_size: REF_IMAGE_1K,
        reference_mention_mode: "index",
        prompt_optimizer_settings: false,
        prompt_optimizer_scene_guide: "none",
    };
    const names = Object.keys(defaults);
    const values = raw;
    // Some ComfyUI workflow versions serialize an extra null placeholder
    // after the prompt widget. Remove it before restoring the named rows so
    // resolution, dimensions, duration, and the advanced values stay aligned.
    const resolutionAt = canonicalOption("resolution", values[2]);
    const nextResolution = canonicalOption("resolution", values[3]);
    const hasResolution = Object.prototype.hasOwnProperty.call(OPTION_DEFS.resolution, resolutionAt);
    const hasShiftedResolution = Object.prototype.hasOwnProperty.call(OPTION_DEFS.resolution, nextResolution);
    if (!hasResolution && hasShiftedResolution) values.splice(2, 1);

    const normalized = {
        mode: Object.prototype.hasOwnProperty.call(OPTION_DEFS.mode, canonicalOption("mode", values[0]))
            ? canonicalOption("mode", values[0]) : defaults.mode,
        prompt: typeof values[1] === "string" ? values[1] : defaults.prompt,
        resolution: Object.prototype.hasOwnProperty.call(OPTION_DEFS.resolution, canonicalOption("resolution", values[2]))
            ? canonicalOption("resolution", values[2]) : defaults.resolution,
        aspect_ratio: Object.prototype.hasOwnProperty.call(OPTION_DEFS.aspect_ratio, canonicalOption("aspect_ratio", values[3]))
            ? canonicalOption("aspect_ratio", values[3]) : defaults.aspect_ratio,
        width: Number.isFinite(Number(values[4])) ? Number(values[4]) : defaults.width,
        height: Number.isFinite(Number(values[5])) ? Number(values[5]) : defaults.height,
        seconds: Number.isFinite(Number(values[6]))
            ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Number(values[6])))
            : defaults.seconds,
        advanced: asBoolean(values[7], defaults.advanced),
        fps: Number.isFinite(Number(values[8])) ? Number(values[8]) : defaults.fps,
        keyframe_role: Object.prototype.hasOwnProperty.call(OPTION_DEFS.keyframe_role, canonicalOption("keyframe_role", values[9]))
            ? canonicalOption("keyframe_role", values[9]) : defaults.keyframe_role,
        ref_image_size: Object.prototype.hasOwnProperty.call(OPTION_DEFS.ref_image_size, canonicalOption("ref_image_size", values[10]))
            ? canonicalOption("ref_image_size", values[10]) : defaults.ref_image_size,
        reference_mention_mode: Object.prototype.hasOwnProperty.call(OPTION_DEFS.reference_mention_mode, canonicalOption("reference_mention_mode", values[11]))
            ? canonicalOption("reference_mention_mode", values[11]) : defaults.reference_mention_mode,
        prompt_optimizer_settings: false,
        prompt_optimizer_scene_guide: canonicalPromptGuide(values[13] || defaults.prompt_optimizer_scene_guide),
    };
    for (const name of names) setConfiguredWidgetValue(node, name, normalized[name]);
    info.widgets_values = names.map((name) => normalized[name]);
}

function installNode(nodeType, nodeData) {
    if (nodeData?.name !== NODE_CLASS) return;
    // Strip the virtual-wire transport fields from every frontend definition
    // before a node instance can be constructed. Execution still receives
    // them through the prompt patch and the Python INPUT_TYPES declaration.
    pruneTransportInputs(nodeData);
    if (nodeType?.nodeData && nodeType.nodeData !== nodeData) pruneTransportInputs(nodeType.nodeData);
    if (nodeType?.prototype?.constructor?.nodeData && nodeType.prototype.constructor.nodeData !== nodeData) {
        pruneTransportInputs(nodeType.prototype.constructor.nodeData);
    }
    if (nodeType.prototype.__h3EasyNodeInstalled) return;
    nodeType.prototype.__h3EasyNodeInstalled = true;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedH3Easy() {
        const result = originalCreated?.apply(this, arguments);
        this.properties ||= {};
        ensureLinks(this);
        normalizeLinks(this);
        pruneTransportInputsFromNode(this, { force: true });
        normalizeLinks(this);
        localizeNodeInstance(this);
        bindPromptOptimizerWidgetCallbacks(this);
        syncModeWidgets(this);
        patchCanvas();
        installQuickCreateCapture(app.canvas);
        installPromptEditorSoon(this);
        const modeWidget = getWidget(this, "mode");
        if (modeWidget) {
            const originalCallback = modeWidget.callback;
            modeWidget.callback = (value) => {
                originalCallback?.call(modeWidget, value);
                pruneLinksForMode(this);
                syncModeWidgets(this);
                syncEditorMode(this);
                renderEditorFromNode(this);
                requestMentionPreviewRefresh();
                repairNodeLayout(this);
                this.setDirtyCanvas?.(true, true);
            };
        }
        const resolutionWidget = getWidget(this, "resolution");
        if (resolutionWidget && !resolutionWidget.__h3ConditionalCallbackBound) {
            resolutionWidget.__h3ConditionalCallbackBound = true;
            const originalCallback = resolutionWidget.callback;
            resolutionWidget.callback = (value) => {
                originalCallback?.call(resolutionWidget, value);
                syncModeWidgets(this);
                repairNodeLayout(this);
                this.setDirtyCanvas?.(true, true);
            };
        }
        const advancedWidget = getWidget(this, "advanced");
        if (advancedWidget && !advancedWidget.__h3ConditionalCallbackBound) {
            advancedWidget.__h3ConditionalCallbackBound = true;
            const originalCallback = advancedWidget.callback;
            advancedWidget.callback = (value) => {
                originalCallback?.call(advancedWidget, value);
                syncModeWidgets(this);
                repairNodeLayout(this);
                this.setDirtyCanvas?.(true, true);
            };
        }
        const referenceMentionWidget = getWidget(this, "reference_mention_mode");
        if (referenceMentionWidget && !referenceMentionWidget.__h3ConditionalCallbackBound) {
            referenceMentionWidget.__h3ConditionalCallbackBound = true;
            const originalCallback = referenceMentionWidget.callback;
            referenceMentionWidget.callback = (value) => {
                originalCallback?.call(referenceMentionWidget, value);
                syncModeWidgets(this);
                renderEditorFromNode(this);
                requestMentionPreviewRefresh();
                repairNodeLayout(this);
                this.setDirtyCanvas?.(true, true);
            };
        }
        return result;
    };

    const originalExecuted = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function onExecutedH3Easy(message) {
        const result = originalExecuted?.apply(this, arguments);
        applyRuntimePromptOptimization(this, message);
        return result;
    };

    const originalAdded = nodeType.prototype.onAdded;
    nodeType.prototype.onAdded = function onAddedH3Easy(graph) {
        const result = originalAdded?.apply(this, arguments);
        this.properties ||= {};
        ensureLinks(this);
        normalizeLinks(this);
        pruneTransportInputsFromNode(this, { force: true });
        normalizeLinks(this);
        localizeNodeInstance(this);
        bindPromptOptimizerWidgetCallbacks(this);
        // A workflow-tab activation is a restore operation. Its serialized or
        // previously stable size is already authoritative, so reapplying the
        // same widget visibility must not add/subtract rows again.
        syncModeWidgets(this, { adjustHeight: false });
        repairNodeLayout(this);
        return result;
    };

    const originalConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function onConfigureH3Easy(info) {
        const configuredSize = Array.isArray(info?.size) && info.size.length >= 2
            ? [Number(info.size[0]), Number(info.size[1])]
            : null;
        const result = originalConfigure?.apply(this, arguments);
        if (configuredSize && configuredSize.every(Number.isFinite)) {
            // Adding/replacing the DOM prompt editor may make ComfyUI expand
            // the node to its calculated minimum. Restore the exact workflow
            // size after the editor is mounted instead of accumulating that
            // minimum every time the workflow tab is activated.
            this.__h3EditorStableSize = configuredSize;
        }
        for (const prop of [PROMPT_TABS_PROP, PROMPT_TAB_INDEX_PROP, PROMPT_DOC_PROP, PROMPT_OPTIMIZED_DOC_PROP, PROMPT_VIEW_PROP]) {
            if (!info?.properties?.[prop]) continue;
            this.properties ||= {};
            this.properties[prop] = info.properties[prop];
        }
        if (info?.properties?.[PROMPT_AUTO_MARKER_PROP]) {
            this.properties ||= {};
            this.properties[PROMPT_AUTO_MARKER_PROP] = info.properties[PROMPT_AUTO_MARKER_PROP];
        }
        repairConfiguredWidgetValues(this, info);
        normalizeLinks(this);
        pruneTransportInputsFromNode(this, { force: true });
        normalizeLinks(this);
        localizeNodeInstance(this);
        bindPromptOptimizerWidgetCallbacks(this);
        syncModeWidgets(this, { adjustHeight: false });
        renderEditorFromNode(this);
        resetPromptHistory(this);
        syncEditorMode(this);
        requestMentionPreviewRefresh();
        installPromptEditorSoon(this);
        if (this.__h3Editor && restorePromptEditorStableSize(this)) repairNodeLayout(this);
        repairNodeLayout(this);
        const mediaInputIndex = getMediaInputIndex(this);
        if (mediaInputIndex >= 0 && this.inputs?.[mediaInputIndex]?.link != null) {
            scheduleNativeMediaConnectionConversion(this, mediaInputIndex);
        }
        return result;
    };

    const originalConnectionsChange = nodeType.prototype.onConnectionsChange;
    nodeType.prototype.onConnectionsChange = function onConnectionsChangeH3Easy(type, index, connected, linkInfo) {
        const result = originalConnectionsChange?.apply(this, arguments);
        const inputIndex = Number(index);
        const input = this.inputs?.[Number.isFinite(inputIndex) ? inputIndex : -1];
        if (String(input?.name || "") === "prompt") {
            syncPromptExternalConnectionState(this);
            globalThis.requestAnimationFrame?.(() => syncPromptExternalConnectionState(this));
        }
        if (String(input?.name || "") === "optimizer_clip") syncPromptOptimizerButton(this);
        if (connected && !this.__h3VirtualWireClearing && /^media(?:_\d+)?$/i.test(String(input?.name || ""))) {
            scheduleNativeMediaConnectionConversion(this, inputIndex, linkInfo);
        }
        return result;
    };

    const originalSerialize = nodeType.prototype.onSerialize;
    nodeType.prototype.onSerialize = function onSerializeH3Easy(info) {
        if (this.__h3Editor) syncPromptFromEditor(this, false);
        const result = originalSerialize?.apply(this, arguments);
        for (const prop of [PROMPT_TABS_PROP, PROMPT_TAB_INDEX_PROP, PROMPT_DOC_PROP, PROMPT_OPTIMIZED_DOC_PROP, PROMPT_VIEW_PROP]) {
            if (!info || !this.properties?.[prop]) continue;
            info.properties ||= {};
            info.properties[prop] = this.properties[prop];
        }
        if (info && this.properties?.[PROMPT_AUTO_MARKER_PROP]) {
            info.properties ||= {};
            info.properties[PROMPT_AUTO_MARKER_PROP] = this.properties[PROMPT_AUTO_MARKER_PROP];
        }
        return result;
    };

    const originalDraw = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function onDrawForegroundH3Easy(ctx) {
        const result = originalDraw?.apply(this, arguments);
        if (!this.__h3Editor && !this.__h3PromptInstallPending && !this.__h3PromptInstallRetry) installPromptEditorSoon(this);
        return result;
    };

    const originalRemoved = nodeType.prototype.onRemoved;
    nodeType.prototype.onRemoved = function onRemovedH3Easy() {
        if (Array.isArray(this.size) && this.size.length >= 2) this.__h3EditorStableSize = [...this.size];
        // A request still in flight has nowhere to put its answer now.
        if (this.__h3OptimizerPending) cancelPromptOptimization(this);
        clearPromptOptimizerStatusTimers(this);
        closeMentionMenu(this);
        if (this.__h3PromptInstallRetry) clearTimeout(this.__h3PromptInstallRetry);
        this.__h3PromptInstallRetry = null;
        this.__h3PromptInstallPending = false;
        this.__h3PromptInstallAttempts = 0;
        this.__h3PromptInstallNextAt = 0;
        this.__h3EditorWrap?.remove?.();
        this.__h3Editors = null;
        this.__h3Editor = null;
        this.__h3EditorWrap = null;
        this.__h3PromptTabStrip = null;
        this.__h3PromptFieldLabels = null;
        this.__h3PromptEditorTools = null;
        this.__h3PromptViewButton = null;
        this.__h3PromptOptimizerStatus = null;
        this.__h3PromptOptimizerStatusText = null;
        removePromptEditorWidgets(this);
        this.__h3DomWidget = null;
        return originalRemoved?.apply(this, arguments);
    };
}

function installLoaderNode(nodeType, nodeData) {
    if (nodeData?.name !== LOADER_CLASS) return;
    if (nodeType.prototype.__h3EasyLoaderInstalled) return;
    nodeType.prototype.__h3EasyLoaderInstalled = true;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedH3Loader() {
        const result = originalCreated?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
    const originalConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function onConfigureH3Loader(info) {
        const result = originalConfigure?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
}

function installAdapterNode(nodeType, nodeData) {
    if (nodeData?.name !== ADAPTER_CLASS) return;
    if (nodeType.prototype.__h3EasyAdapterInstalled) return;
    nodeType.prototype.__h3EasyAdapterInstalled = true;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedH3Adapter() {
        const result = originalCreated?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
    const originalConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function onConfigureH3Adapter(info) {
        const result = originalConfigure?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
}

function installOutputNode(nodeType, nodeData) {
    if (nodeData?.name !== OUTPUT_CLASS) return;
    if (nodeType.prototype.__h3EasyOutputInstalled) return;
    nodeType.prototype.__h3EasyOutputInstalled = true;
    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function onNodeCreatedH3Output() {
        const result = originalCreated?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
    const originalConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function onConfigureH3Output(info) {
        const result = originalConfigure?.apply(this, arguments);
        localizeNodeInstance(this);
        return result;
    };
}

function install() {
    if (installed) return;
    installed = true;
    patchCanvas();
    patchGraphToPrompt();
    patchEditorKeyHandling();
    installNativeThemeWatcher();
    for (const delay of [0, 100, 500, 1200]) setTimeout(() => patchCanvas(), delay);
    setTimeout(() => installQuickCreateCapture(app.canvas), 0);
    setTimeout(() => installQuickCreateCapture(app.canvas), 250);
    document.addEventListener("pointerdown", (event) => {
        for (const node of app.graph?._nodes || []) {
            const state = node?.__h3MentionMenu;
            if (!state) continue;
            if (state.element?.contains?.(event.target) || node.__h3EditorWrap?.contains?.(event.target)) continue;
            closeMentionMenu(node);
        }
    }, true);
    setTimeout(() => loadPromptOptimizerSettings().catch(() => {}), 0);
    // The clip optimizer runs inside the graph, so the result comes back as a
    // server event instead of a fetch response.
    api.addEventListener?.(PROMPT_OPTIMIZER_EVENT, (event) => {
        const detail = event?.detail || {};
        const node = app.graph?.getNodeById?.(Number(detail.node_id));
        const prompt = String(detail.prompt || "");
        if (!node || !isTarget(node) || !prompt.trim()) return;
        installPromptEditorSoon(node);
        setPromptFromOptimizedText(node, prompt);
    });
    const style = document.createElement("style");
    style.textContent = `
      .h3-prompt-editor-wrap {
        position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; min-width: 0; min-height: 0; max-height: 100%;
        box-sizing: border-box; padding: 0; border-radius: var(--h3-native-widget-radius, 0); overflow: hidden; contain: size layout paint;
      }
      .h3-prompt-tabs {
        display: flex; align-items: stretch; gap: 3px; flex: 0 0 auto; height: ${PROMPT_TABS_HEIGHT}px;
        box-sizing: border-box; padding: 0 0 3px; overflow-x: auto; overflow-y: hidden; user-select: none;
        scrollbar-width: none;
      }
      .h3-prompt-tabs::-webkit-scrollbar { display: none; }
      .h3-prompt-tab, .h3-prompt-tab-add {
        display: inline-flex; align-items: center; gap: 2px; flex: 0 0 auto; max-width: 160px; padding: 0 3px 0 6px;
        border: 1px solid var(--h3-native-widget-outline, rgba(255,255,255,.12)); border-radius: 4px; outline: none;
        background: transparent; color: var(--h3-native-widget-text, rgba(255,255,255,.78)); opacity: .38; cursor: pointer;
        font: 600 9px/1 Consolas, "Courier New", monospace; letter-spacing: 0; white-space: nowrap;
        transition: opacity .12s ease, background-color .12s ease, border-color .12s ease;
      }
      .h3-prompt-tab:hover { opacity: .66; background: rgba(255,255,255,.045); }
      .h3-prompt-tab.is-active {
        opacity: .92; background: rgba(0,226,187,.07); border-color: rgba(0,226,187,.28); color: rgba(190,255,244,.96);
      }
      .h3-prompt-tab-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
      .h3-prompt-tab-rename {
        width: 88px; height: 13px; margin: 0; padding: 0 3px; border: 1px solid rgba(0,226,187,.4); border-radius: 3px;
        outline: none; background: var(--h3-native-widget-bg, #222); color: var(--h3-native-widget-text, #ddd);
        font: 600 9px/1 Consolas, "Courier New", monospace;
      }
      .h3-prompt-tab-move, .h3-prompt-tab-close, .h3-prompt-tab-add {
        appearance: none; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
        width: 11px; height: 12px; padding: 0; border: 0; border-radius: 3px; background: transparent; color: inherit;
        cursor: pointer; font: 600 9px/1 Consolas, "Courier New", monospace; opacity: .72;
      }
      .h3-prompt-tab-move:hover, .h3-prompt-tab-close:hover { opacity: 1; background: rgba(255,255,255,.12); }
      .h3-prompt-tab-close { font-size: 11px; }
      .h3-prompt-tab-add {
        width: 16px; padding: 0; justify-content: center; opacity: .42; color: rgba(160,255,178,.9);
        border-color: var(--h3-native-widget-outline, rgba(255,255,255,.12));
      }
      .h3-prompt-tab-add:hover:not(:disabled) { opacity: .85; background: rgba(160,255,178,.1); }
      .h3-prompt-tab-add:disabled { opacity: .16; cursor: not-allowed; }
      .h3-prompt-editor-wrap.is-loading .h3-prompt-tabs { pointer-events: none; opacity: .3; }
      .h3-prompt-field {
        display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; min-width: 0; box-sizing: border-box;
      }
      .h3-prompt-field-label {
        display: flex; align-items: center; gap: 4px; flex: 0 0 ${PROMPT_FIELD_LABEL_HEIGHT}px; height: ${PROMPT_FIELD_LABEL_HEIGHT}px;
        color: var(--h3-native-widget-text, rgba(255,255,255,.78)); opacity: .44; user-select: none;
        font: 600 9px/1 Consolas, "Courier New", monospace; letter-spacing: 0; white-space: nowrap;
      }
      .h3-prompt-field-dot {
        width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%;
        background: rgba(0,226,187,.92); opacity: 0; transition: opacity .12s ease;
      }
      .h3-prompt-field-label.is-effective { opacity: .72; }
      .h3-prompt-field-label.is-effective .h3-prompt-field-dot { opacity: .9; }
      .h3-prompt-field.is-source { padding-bottom: 3px; }
      .h3-prompt-field.is-optimized .h3-prompt-editor {
        padding-bottom: calc(var(--h3-native-widget-padding, 2px) + 22px);
      }
      .h3-prompt-editor {
        --h3-prompt-text-size: var(--h3-native-widget-text-size, var(--comfy-textarea-font-size, 12px));
        display: block; width: 100%; flex: 1 1 auto; height: auto; min-width: 0; min-height: 0; max-height: 100%; box-sizing: border-box;
        padding: var(--h3-native-widget-padding, 2px); overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
        white-space: pre-wrap; overflow-wrap: anywhere; border: 0; border-radius: var(--h3-native-widget-radius, 0); outline: none;
        resize: none; background-color: var(--h3-native-widget-bg, var(--comfy-input-bg, #222));
        color: var(--h3-native-widget-text, var(--input-text, #ddd)); caret-color: var(--h3-native-widget-text, var(--input-text, #ddd));
        font-family: Consolas, "Courier New", monospace; font-size: var(--h3-prompt-text-size); font-weight: 400;
        font-style: normal; line-height: var(--h3-native-widget-line-height, normal); letter-spacing: 0;
      }
      .h3-prompt-editor :not(.h3-mention-chip):not(.h3-mention-chip *):not(.h3-dialogue-block):not(.h3-dialogue-block *) {
        font-family: Consolas, "Courier New", monospace !important; font-size: var(--h3-prompt-text-size) !important;
        font-weight: 400 !important; font-style: normal !important; line-height: var(--h3-native-widget-line-height, normal) !important; letter-spacing: 0 !important;
      }
      .h3-prompt-editor-wrap.h3-native-vue-nodes .h3-prompt-editor:focus {
        box-shadow: 0 0 0 1px var(--h3-native-widget-focus, var(--h3-native-widget-outline, rgba(255,255,255,.18)));
      }
      .h3-prompt-editor-wrap.is-external .h3-prompt-editor {
        color: var(--h3-native-widget-muted, rgba(255,255,255,.42)); caret-color: transparent; cursor: not-allowed; opacity: .72;
      }
      .h3-prompt-editor-wrap.is-external .h3-prompt-editor:focus { box-shadow: none; }
      .h3-prompt-editor-wrap.is-loading .h3-prompt-editor { cursor: wait; opacity: .72; }
      .h3-prompt-editor:empty::before { content: attr(data-placeholder); color: var(--h3-native-widget-muted, rgba(255,255,255,.38)); pointer-events: none; }
      .h3-prompt-editor-status {
        position: absolute; left: 12px; bottom: 4px; z-index: 3; display: inline-flex; align-items: center; gap: 5px; max-width: calc(100% - 92px);
        overflow: hidden; color: var(--h3-native-widget-text, rgba(255,255,255,.78)); pointer-events: none; user-select: none;
        font: 600 9px/18px Consolas, "Courier New", monospace; letter-spacing: 0; white-space: nowrap; text-overflow: ellipsis;
      }
      .h3-prompt-editor-status[hidden] { display: none !important; }
      .h3-prompt-editor-status-spinner {
        display: inline-block; width: 8px; height: 8px; flex: 0 0 8px; box-sizing: border-box; border: 1px solid currentColor; border-radius: 50%; opacity: .56;
      }
      .h3-prompt-editor-status-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; opacity: .56; }
      .h3-prompt-editor-status.is-loading .h3-prompt-editor-status-spinner { border-right-color: transparent; animation: h3-prompt-status-spin .72s linear infinite; }
      @keyframes h3-prompt-status-spin { to { transform: rotate(360deg); } }
      .h3-prompt-editor-tools {
        position: absolute; right: 14px; bottom: 4px; z-index: 3; display: flex; align-items: center; gap: 3px; pointer-events: auto;
      }
      .h3-prompt-editor-tool {
        appearance: none; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 18px; padding: 0;
        border: 1px solid transparent; border-radius: 4px; outline: none; background: transparent; box-shadow: none;
        color: var(--h3-native-widget-text, rgba(255,255,255,.78)); opacity: .34; cursor: pointer; user-select: none;
        font: 600 9px/1 Consolas, "Courier New", monospace; letter-spacing: -.4px; transition: opacity .12s ease, background-color .12s ease, border-color .12s ease, color .12s ease;
      }
      .h3-prompt-editor-tool:hover, .h3-prompt-editor-tool:focus-visible {
        opacity: .62; background: rgba(255,255,255,.045); border-color: rgba(255,255,255,.1);
      }
      .h3-prompt-editor-tool.is-active {
        opacity: .5; color: rgba(190,255,244,.88); background: rgba(0,226,187,.04); border-color: rgba(0,226,187,.12);
      }
      .h3-prompt-editor-tool.is-configured { opacity: .46; }
      .h3-prompt-editor-tool.is-loading { opacity: .64; animation: h3-prompt-tool-pulse .8s ease-in-out infinite alternate; }
      .h3-prompt-editor-tool.is-stop {
        opacity: .82; color: rgba(255,155,155,.95); background: rgba(255,110,110,.08); border-color: rgba(255,110,110,.22);
        animation: none;
      }
      .h3-prompt-editor-tool.is-stop:hover, .h3-prompt-editor-tool.is-stop:focus-visible {
        opacity: 1; background: rgba(255,110,110,.16); border-color: rgba(255,110,110,.4);
      }
      .h3-prompt-editor-tool:disabled, .h3-prompt-editor-tool.is-external { opacity: .16; cursor: not-allowed; pointer-events: none; }
      @keyframes h3-prompt-tool-pulse { from { transform: scale(.88); } to { transform: scale(1.06); } }
      .h3-mention-chip {
        display: inline; max-width: 150px; margin: 0 1px; padding: 0; vertical-align: baseline; border: 0; border-radius: 0;
        background: transparent; color: rgba(0,226,187,.98); font-family: inherit; font-size: var(--h3-prompt-text-size, 12px);
        font-weight: 400; line-height: inherit; letter-spacing: 0; user-select: text; cursor: text;
      }
      .h3-mention-chip.is-unresolved { color: #ff9b9b; text-decoration: underline wavy rgba(255,110,110,.86); text-decoration-thickness: 1px; }
      .h3-mention-chip-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: baseline; }
      .h3-dialogue-block {
        display: inline; margin: 0 1px; padding: 2px 4px; vertical-align: 1px; border: 0; border-radius: 4px;
        background: rgba(0,226,187,.14); color: rgba(190,255,244,.98); font-family: Consolas, "Courier New", monospace; font-size: var(--h3-prompt-text-size, 12px);
        box-shadow: inset 0 0 0 1px rgba(0,226,187,.16); font-weight: 400; line-height: calc(1em + 6px); letter-spacing: 0; white-space: pre-wrap;
        -webkit-box-decoration-break: clone; box-decoration-break: clone; user-select: text; cursor: text; outline: none;
      }
      .h3-dialogue-block:focus { background: rgba(0,226,187,.19); box-shadow: inset 0 0 0 1px rgba(0,226,187,.26); }
      .h3-mention-chip-thumb { display: inline-block; width: 16px; height: 16px; margin-right: 2px; object-fit: cover; border-radius: 3px; vertical-align: -2px; background: rgba(255,255,255,.12); user-select: none; }
      .h3-mention-chip-thumb.is-image, .h3-mention-menu-thumb.is-image { background: #5aa9f0; }
      .h3-mention-chip-thumb.is-video, .h3-mention-menu-thumb.is-video { position: relative; background: linear-gradient(135deg, #1557b8, #49b6ff); }
      .h3-mention-chip-thumb.is-video::after {
        content: ""; position: absolute; left: 6px; top: 4px; border-left: 6px solid rgba(255,255,255,.9); border-top: 4px solid transparent; border-bottom: 4px solid transparent;
      }
      .h3-mention-menu-thumb.is-video::after {
        content: ""; position: absolute; left: 13px; top: 10px; border-left: 10px solid rgba(255,255,255,.9); border-top: 7px solid transparent; border-bottom: 7px solid transparent;
      }
      .h3-mention-menu {
        position: fixed; z-index: 10080; width: 198px; min-width: 198px; max-width: 198px; max-height: 360px; overflow: auto; padding: 5px;
        border: 1px solid var(--h3-native-widget-outline, rgba(255,255,255,.16)); border-radius: 8px;
        background: var(--h3-native-menu-bg, rgba(28,28,28,.98)); box-shadow: 0 16px 38px rgba(0,0,0,.42);
        color: var(--h3-native-widget-text, rgba(255,255,255,.94)); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .h3-mention-menu-title { padding: 6px 8px 7px; color: var(--h3-native-widget-muted, rgba(255,255,255,.62)); font-size: 12px; }
      .h3-mention-menu-empty { padding: 9px 10px; color: var(--h3-native-widget-muted, rgba(255,255,255,.62)); font-size: 12px; }
      .h3-mention-menu-item { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 8px; align-items: center; min-height: 42px; padding: 4px 7px; border-radius: 6px; cursor: pointer; }
      .h3-mention-menu-item.is-active, .h3-mention-menu-item:hover { background: rgba(160,255,178,.15); }
      .h3-mention-menu-thumb { display: block; width: 36px; height: 36px; object-fit: cover; border-radius: 5px; background: rgba(255,255,255,.1); }
      .h3-mention-menu-main { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 700; }
      .h3-mention-menu-detail { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; color: var(--h3-native-widget-muted, rgba(255,255,255,.55)); font-size: 11px; }
      .h3-optimizer-settings-overlay {
        --h3-settings-bg-base: #1c1e23; --h3-settings-bg-surface: #26282e; --h3-settings-bg-hover: #31343c; --h3-settings-text: #e3e3e3;
        --h3-settings-muted: #a8adb8; --h3-settings-border: rgba(255,255,255,.12); --h3-settings-border-light: rgba(255,255,255,.18);
        --h3-settings-accent: #a8c7fa; --h3-settings-accent-dark: #041e49;
        position: fixed; inset: 0; z-index: 10090; display: flex; align-items: center; justify-content: center; padding: 16px;
        box-sizing: border-box; background: rgba(0,0,0,.58); color: var(--h3-settings-text);
        font-family: "Google Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
      }
      .h3-optimizer-settings-dialog {
        width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px); box-sizing: border-box;
        overflow-x: hidden; overflow-y: auto; border: 1px solid rgba(255,255,255,.15); border-radius: 16px;
        background: var(--h3-settings-bg-base); color: var(--h3-settings-text); box-shadow: 0 24px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
      }
      .h3-optimizer-settings-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 20px 12px; border-bottom: 1px solid var(--h3-settings-border); }
      .h3-optimizer-settings-title { min-width: 0; color: var(--h3-settings-text); font-size: 17px; font-weight: 600; letter-spacing: 0; }
      .h3-optimizer-settings-header-actions { display: flex; align-items: center; gap: 2px; flex: 0 0 auto; }
      .h3-optimizer-settings-close {
        appearance: none; width: 28px; height: 28px; flex: 0 0 28px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent;
        color: rgba(227,227,227,.56); cursor: pointer; font: inherit; font-size: 17px; font-weight: 500; line-height: 1; transition: background .2s, border-color .2s, color .2s;
      }
      .h3-optimizer-settings-close:hover, .h3-optimizer-settings-close:focus-visible { border-color: rgba(168,199,250,.32); background: rgba(168,199,250,.1); color: #dce7fa; outline: none; }
      /* minmax(0, 1fr) rather than the default: a grid item refuses to shrink
         below its content's min-content width, and a number input or a long
         model path is enough to push the dialog into a horizontal scrollbar. */
      .h3-optimizer-settings-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; padding: 14px 20px 12px; }
      .h3-optimizer-settings-row { display: flex; flex-direction: column; align-items: stretch; gap: 5px; min-width: 0; min-height: 0; }
      .h3-optimizer-settings-label { color: var(--h3-settings-muted); font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
      .h3-optimizer-settings-hint { min-width: 0; margin: -2px 0 2px; color: var(--h3-settings-muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
      .h3-optimizer-settings-hint[hidden] { display: none !important; }
      .h3-optimizer-settings-row[hidden] { display: none !important; }
      .h3-optimizer-settings-check[hidden] { display: none !important; }
      .h3-optimizer-settings-control {
        width: 100%; min-width: 0; box-sizing: border-box; height: 34px; padding: 7px 12px; border: 1px solid var(--h3-settings-border); border-radius: 8px;
        background: var(--h3-settings-bg-base); color: var(--h3-settings-text); outline: none; font: inherit; font-size: 14px; transition: border-color .2s, background .2s, box-shadow .2s;
      }
      .h3-optimizer-settings-control:hover { border-color: var(--h3-settings-border-light); }
      .h3-optimizer-settings-control:focus, .h3-optimizer-settings-control.is-open { border-color: var(--h3-settings-accent); background: #1a1b1e; box-shadow: none; }
      .h3-optimizer-settings-select-wrap { position: relative; min-width: 0; width: 100%; user-select: none; }
      .h3-optimizer-settings-select { display: flex; align-items: center; justify-content: space-between; gap: 10px; text-align: left; cursor: pointer; }
      .h3-optimizer-settings-select-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .h3-optimizer-settings-select-chevron { width: 8px; height: 8px; flex: 0 0 8px; margin: -4px 3px 0 0; border-right: 1.5px solid var(--h3-settings-muted); border-bottom: 1.5px solid var(--h3-settings-muted); transform: rotate(45deg); transition: transform .15s ease-out, border-color .15s ease-out; }
      .h3-optimizer-settings-select:hover .h3-optimizer-settings-select-chevron, .h3-optimizer-settings-select.is-open .h3-optimizer-settings-select-chevron { border-color: var(--h3-settings-text); }
      .h3-optimizer-settings-select.is-open .h3-optimizer-settings-select-chevron { transform: rotate(225deg) translate(-1px, -1px); }
      .h3-optimizer-settings-select-menu {
        position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 100; overflow: hidden; padding: 6px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
        background: rgba(38,40,46,.96); backdrop-filter: blur(12px); box-shadow: 0 12px 32px rgba(0,0,0,.6); opacity: 1; transform: translateY(0);
      }
      .h3-optimizer-settings-select-option {
        display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 38px; padding: 10px 12px; border: 0; border-radius: 8px; background: transparent;
        color: var(--h3-settings-text); cursor: pointer; font: inherit; font-size: 14px; text-align: left; transition: background .12s, color .12s;
      }
      .h3-optimizer-settings-select-option:hover { background: rgba(255,255,255,.06); }
      .h3-optimizer-settings-select-option.is-selected { background: rgba(168,199,250,.1); color: var(--h3-settings-accent); font-weight: 500; }
      .h3-optimizer-settings-select-option.is-selected::after { content: "\\2713"; margin-left: auto; color: currentColor; font-size: 14px; }
      .h3-optimizer-settings-check { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; min-height: 26px; color: var(--h3-settings-muted); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
      .h3-optimizer-settings-check > span { min-width: 0; overflow-wrap: anywhere; }
      .h3-optimizer-settings-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex: 0 0 40px; padding: 0; border: 0; background: transparent; cursor: pointer; }
      .h3-optimizer-settings-switch-track { position: absolute; inset: 0; display: block; border: 1px solid rgba(255,255,255,.1); border-radius: 22px; background: #22252a; transition: background-color .2s, border-color .2s; }
      .h3-optimizer-settings-switch-thumb { position: absolute; left: 3px; bottom: 3px; width: 16px; height: 16px; border-radius: 50%; background: #747a83; box-shadow: 0 1px 3px rgba(0,0,0,.32); transition: transform .2s, background-color .2s; }
      .h3-optimizer-settings-switch.is-on .h3-optimizer-settings-switch-track { border-color: rgba(255,255,255,.17); background: #30343a; }
      .h3-optimizer-settings-switch.is-on .h3-optimizer-settings-switch-thumb { background: #969ca5; }
      .h3-optimizer-settings-switch.is-on .h3-optimizer-settings-switch-thumb { transform: translateX(18px); }
      .h3-optimizer-settings-switch:focus-visible { outline: 2px solid var(--h3-settings-accent); outline-offset: 3px; border-radius: 12px; }
      .h3-optimizer-settings-error { margin: -3px 20px 2px; color: #f28b82; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
      .h3-optimizer-settings-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 14px; }
      .h3-optimizer-settings-button {
        appearance: none; min-width: 76px; height: 34px; padding: 0 14px; border: 1px solid rgba(255,255,255,.1); border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 500; transition: all .2s cubic-bezier(.2,0,0,1);
      }
      .h3-optimizer-settings-button.is-secondary { background: rgba(255,255,255,.05); color: var(--h3-settings-text); }
      .h3-optimizer-settings-button.is-secondary:hover, .h3-optimizer-settings-button.is-secondary:focus-visible { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); color: var(--h3-settings-text); outline: none; transform: translateY(-1px); }
      .h3-optimizer-settings-button.is-primary { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.07); color: var(--h3-settings-text); font-weight: 600; box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
      .h3-optimizer-settings-button.is-primary:hover, .h3-optimizer-settings-button.is-primary:focus-visible { border-color: rgba(168,199,250,.5); background: rgba(168,199,250,.16); color: #dce7fa; outline: none; transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 4px 12px rgba(168,199,250,.08); }
      .h3-optimizer-settings-button.is-header { min-width: 0; width: auto; height: 28px; padding: 0 9px; border-color: transparent; border-radius: 8px; background: transparent; color: rgba(227,227,227,.56); font-size: 12px; font-weight: 500; box-shadow: none; }
      .h3-optimizer-settings-button.is-header:hover, .h3-optimizer-settings-button.is-header:focus-visible { border-color: rgba(168,199,250,.32); background: rgba(168,199,250,.1); color: #dce7fa; outline: none; transform: none; box-shadow: none; }
      .h3-optimizer-settings-button:disabled { cursor: wait; opacity: .52; filter: none; }
    `;
    document.head.append(style);
}

app.registerExtension({
    name: "MiniMaxH3Easy",
    setup() {
        install();
    },
    beforeRegisterNodeDef(nodeType, nodeData) {
        localizeNodeDefinition(nodeData);
        installMediaSourceNode(nodeType, nodeData);
        installLoaderNode(nodeType, nodeData);
        installAdapterNode(nodeType, nodeData);
        installOutputNode(nodeType, nodeData);
        installNode(nodeType, nodeData);
    },
});
