"""A compact MiniMax H3 entry point for ComfyUI.

The node intentionally keeps the graph contract small: one loader bundle, one
mode-aware conditioning node, and standard ComfyUI outputs for the sampler
chain. The browser extension supplies the ordered virtual media inputs.
"""

from __future__ import annotations

import logging
import math
import os
import re
import sys
import threading
import time
import base64
import asyncio
import io
import inspect
import json
import mimetypes
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import torch
import torchaudio

import comfy.model_management
import folder_paths
import node_helpers
import nodes
from comfy_extras import nodes_minimax_h3 as h3


MODE_IMAGE = "image"
MODE_REFERENCE = "reference"
KEYFRAME_FIRST = "first"
KEYFRAME_LAST = "last"
REF_IMAGE_1K = "1k"
REF_IMAGE_15K = "1.5k"
REF_IMAGE_2K = "2k"
REF_IMAGE_MATCH = "match"
REF_IMAGE_ORIGINAL = "original"
REFERENCE_MENTION_FILENAME = "filename"
REFERENCE_MENTION_INDEX = "index"
NONE_MODEL = "none"
NONE_MODEL_DISPLAY_VALUES = (NONE_MODEL, "None", "无")
NONE_MODEL_ALIASES = {value.lower() for value in NONE_MODEL_DISPLAY_VALUES}
RESOLUTION_360 = "360P"
RESOLUTION_416 = "416P"
RESOLUTION_480 = "480P"
RESOLUTION_540 = "540P"
RESOLUTION_640 = "640P"
RESOLUTION_720 = "720P"
RESOLUTION_768 = "768P"
RESOLUTION_832 = "832P"
RESOLUTION_928 = "928P"
RESOLUTION_1024 = "1024P"
RESOLUTION_1080 = "1080P"
RESOLUTION_CUSTOM = "custom"
ASPECT_SQUARE = "1:1"
ASPECT_PHOTO_PORTRAIT = "2:3"
ASPECT_PHOTO = "3:2"
ASPECT_STANDARD_PORTRAIT = "3:4"
ASPECT_STANDARD = "4:3"
ASPECT_WIDESCREEN_PORTRAIT = "9:16"
ASPECT_WIDESCREEN = "16:9"
ASPECT_ULTRAWIDE = "21:9"
RESOLUTION_MEGAPIXELS = {
    RESOLUTION_360: 0.2,
    RESOLUTION_416: 0.3,
    RESOLUTION_480: 0.4,
    RESOLUTION_540: 0.5,
    RESOLUTION_640: 0.7,
    RESOLUTION_720: 0.9,
    RESOLUTION_768: 1.0,
    RESOLUTION_832: 1.2,
    RESOLUTION_928: 1.5,
    RESOLUTION_1024: 1.8,
    RESOLUTION_1080: 2.0,
}
RESOLUTIONS = (*RESOLUTION_MEGAPIXELS, RESOLUTION_CUSTOM)
REFERENCE_IMAGE_AREAS = {
    REF_IMAGE_1K: 1024 * 1024,
    REF_IMAGE_15K: 1536 * 1536,
    REF_IMAGE_2K: 2048 * 2048,
}
REFERENCE_SIZE_SEARCH_RADIUS = 16
ASPECT_RATIOS = {
    ASPECT_SQUARE: (1, 1),
    ASPECT_PHOTO_PORTRAIT: (2, 3),
    ASPECT_PHOTO: (3, 2),
    ASPECT_STANDARD_PORTRAIT: (3, 4),
    ASPECT_STANDARD: (4, 3),
    ASPECT_WIDESCREEN_PORTRAIT: (9, 16),
    ASPECT_WIDESCREEN: (16, 9),
    ASPECT_ULTRAWIDE: (21, 9),
}
MAX_MEDIA = 15
MAX_IMAGES = 9
MAX_VIDEOS = 3
MAX_AUDIOS = 3
MIN_SECONDS = 0.2
MAX_SECONDS = 30.0
PROMPT_GUIDES_DIR = os.path.join(os.path.dirname(__file__), "prompt_guides")
PROMPT_GUIDE_MANIFEST = os.path.join(PROMPT_GUIDES_DIR, "manifest.json")
PROMPT_OPTIMIZER_TIMEOUT_SECONDS = 600
PROMPT_OPTIMIZER_MAX_OUTPUT_TOKENS = 50000
PROMPT_OPTIMIZER_CONFIG_VERSION = 1
OPTIMIZER_FORMAT_OPENAI = "openai"
OPTIMIZER_FORMAT_GEMINI = "gemini"
# Local text generation through the CLIP input instead of an HTTP API.
OPTIMIZER_FORMAT_CLIP = "clip"
# Local text generation through a GGUF model loaded by llama-cpp-python.
OPTIMIZER_FORMAT_GGUF = "gguf"
OPTIMIZER_FORMATS = (OPTIMIZER_FORMAT_OPENAI, OPTIMIZER_FORMAT_GEMINI, OPTIMIZER_FORMAT_CLIP, OPTIMIZER_FORMAT_GGUF)
OPTIMIZER_LOCAL_FORMATS = (OPTIMIZER_FORMAT_CLIP, OPTIMIZER_FORMAT_GGUF)
PROMPT_OPTIMIZER_CLIP_MAX_LENGTH = 1024
PROMPT_OPTIMIZER_CLIP_MIN_LENGTH = 16
PROMPT_OPTIMIZER_CLIP_LENGTH_LIMIT = 32768
# Same directories ComfyUI-QwenVL-F scans, so a GGUF installed for one is found
# by the other.
OPTIMIZER_GGUF_DIRS = ("text_encoders", "LLM")
OPTIMIZER_GGUF_MMPROJ_AUTO = "auto"
OPTIMIZER_GGUF_MMPROJ_NONE = "none"
OPTIMIZER_GGUF_CONTEXT = 16384
OPTIMIZER_GGUF_CONTEXT_MIN = 512
OPTIMIZER_GGUF_CONTEXT_LIMIT = 1048576
OPTIMIZER_GGUF_GPU_LAYERS = -1
# Caps for the media handed to a local text encoder. Every still costs the
# encoder a block of soft tokens, so reference sets are trimmed rather than
# sent whole.
OPTIMIZER_CLIP_MAX_STILLS = 12
OPTIMIZER_CLIP_FRAMES_PER_VIDEO = 4
OPTIMIZER_CLIP_MAX_VIDEO_FRAMES = 8
OPTIMIZER_CLIP_DESCRIBE_LENGTH = 256
OPTIMIZER_CLIP_DESCRIBE_SYSTEM = (
    "You describe one reference asset for a video generation prompt.\n"
    "Report only what is actually present in the attached media: subject, appearance, clothing, pose, "
    "setting, lighting, colour and visual style; for video also motion, action and camera movement; "
    "for audio the sounds, voices, spoken language and music.\n"
    "Never guess, never invent, and never describe media you cannot perceive.\n"
    "Answer with one dense factual paragraph of at most 80 words. No headings, no lists, no commentary."
)
OPTIMIZER_CLIP_DESCRIBE_REQUESTS = {
    "image": "Describe this reference image.",
    "video": "Describe this reference video.",
    "audio": "Describe this reference audio clip.",
}
# A chat API has no video channel, so a reference video is described from
# evenly spaced stills instead.
OPTIMIZER_VIDEO_STILLS = 4
OPTIMIZER_VIDEO_STILL_MAX_SIDE = 768
OPTIMIZER_VIDEO_STILLS_REQUEST = (
    "Describe this reference video. The {count} attached images are frames sampled from it in "
    "chronological order, not separate references: describe the clip as a whole, including the "
    "action and camera movement the frames show."
)
OPTIMIZER_MEDIA_MAX_BYTES = 32 * 1024 * 1024
PROMPT_OPTIMIZER_EVENT = "minimax_h3_easy/prompt_optimized"
PROMPT_OPTIMIZER_CANCEL_LIMIT = 64
PROMPT_OPTIMIZER_CONFIG_DEFAULTS = {
    "version": PROMPT_OPTIMIZER_CONFIG_VERSION,
    "api_format": OPTIMIZER_FORMAT_OPENAI,
    "api_url": "",
    "api_key": "",
    "model": "",
    "read_media": False,
    "local_max_length": PROMPT_OPTIMIZER_CLIP_MAX_LENGTH,
    "gguf_model": "",
    "gguf_mmproj": OPTIMIZER_GGUF_MMPROJ_AUTO,
    "gguf_context": OPTIMIZER_GGUF_CONTEXT,
    "gguf_gpu_layers": OPTIMIZER_GGUF_GPU_LAYERS,
    "gguf_unload_after": False,
    "gguf_describe_media": False,
}


def _reference_aligned_size(image_w: int, image_h: int, scale: float) -> tuple[int, int]:
    """Choose H3-aligned dimensions near the scaled area without stretching refs."""
    multiple = h3.CANVAS_MULTIPLE
    scaled_w = max(float(multiple), image_w * scale)
    scaled_h = max(float(multiple), image_h * scale)
    target_area = scaled_w * scaled_h
    aspect = image_w / max(1, image_h)
    center_h_units = max(1, round(scaled_h / multiple))
    best = None

    for h_units in range(
        max(1, center_h_units - REFERENCE_SIZE_SEARCH_RADIUS),
        center_h_units + REFERENCE_SIZE_SEARCH_RADIUS + 1,
    ):
        ideal_w_units = h_units * aspect
        min_w_units = max(1, math.floor(ideal_w_units) - 2)
        max_w_units = max(min_w_units, math.ceil(ideal_w_units) + 2)
        for w_units in range(min_w_units, max_w_units + 1):
            target_w = w_units * multiple
            target_h = h_units * multiple
            ratio_error = abs((target_w / target_h) / aspect - 1.0)
            area_error = abs((target_w * target_h) / target_area - 1.0)
            score = ratio_error * 20.0 + area_error
            candidate = (score, ratio_error, area_error, target_w, target_h)
            if best is None or candidate < best:
                best = candidate

    return best[3], best[4]
_PROMPT_OPTIMIZER_CONFIG_LOCK = threading.RLock()
REFERENCE_PLACEHOLDER_RE = re.compile(r"__MINIMAX_H3_REF_(\d+)__")
UNRESOLVED_REFERENCE_RE = re.compile(r"__MINIMAX_H3_UNRESOLVED_REF_[^_]+__")
MODEL_FILE_EXTENSIONS = {".safetensors", ".gguf"}


def _normalise_model_name(name: str) -> str:
    """Turn community naming variants into comparable tokens.

    MiniMax H3 files appear with underscores, dashes, camel case and sometimes
    only a role folder (for example ``FL2VA/model.safetensors``). Matching the
    normalised path rather than one exact filename keeps the loader useful for
    community quantisations without admitting every unrelated model.
    """
    value = str(name or "").replace("\\", "/").lower()
    value = re.sub(r"([a-z])([0-9])", r"\1 \2", value)
    value = re.sub(r"([0-9])([a-z])", r"\1 \2", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _model_tokens(name: str) -> set[str]:
    return set(_normalise_model_name(name).split())


def _is_minimax_h3_name(normalised: str, compact: str, tokens: set[str]) -> bool:
    """Require an explicit MiniMax H3 identity before matching shared roles."""
    return "minimaxh3" in compact or ("minimax" in tokens and "h3" in compact)


def _is_weight_file(name: str) -> bool:
    return os.path.splitext(str(name or ""))[1].lower() in MODEL_FILE_EXTENSIONS


def _is_gguf_file(name: str) -> bool:
    return str(name or "").lower().endswith(".gguf")


def _category_names(category: str) -> list[str]:
    """Read a ComfyUI filename category without assuming it exists."""
    try:
        return [str(name) for name in folder_paths.get_filename_list(category)]
    except Exception:
        return []


def _category_paths(category: str) -> list[str]:
    try:
        entry = folder_paths.folder_names_and_paths.get(category)
        if not entry:
            return []
        paths = entry[0]
        if isinstance(paths, (str, os.PathLike)):
            paths = [paths]
        return [os.fspath(path) for path in paths]
    except Exception:
        return []


def _filesystem_weight_names(categories: tuple[str, ...]) -> list[str]:
    """Find GGUF files even when ComfyUI has no GGUF extension category yet."""
    names: list[str] = []
    for category in categories:
        for base in _category_paths(category):
            if not os.path.isdir(base):
                continue
            try:
                for root, _dirs, files in os.walk(base):
                    for filename in files:
                        if os.path.splitext(filename)[1].lower() not in MODEL_FILE_EXTENSIONS:
                            continue
                        full_path = os.path.join(root, filename)
                        relative = os.path.relpath(full_path, base).replace(os.sep, "/")
                        names.append(relative)
            except OSError:
                continue
    return names


@lru_cache(maxsize=16)
def _collect_weight_names(categories: tuple[str, ...]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for category in categories:
        for name in _category_names(category):
            if not _is_weight_file(name):
                continue
            key = name.replace("\\", "/")
            if key not in seen:
                seen.add(key)
                names.append(key)
    # The normal ComfyUI categories may not advertise .gguf until the optional
    # GGUF node is loaded, so supplement them from the actual model folders.
    for name in _filesystem_weight_names(categories):
        key = name.replace("\\", "/")
        if key not in seen:
            seen.add(key)
            names.append(key)
    return names


def _has_role(name: str, role: str) -> bool:
    normalised = _normalise_model_name(name)
    compact = normalised.replace(" ", "")
    tokens = set(normalised.split())
    if role == "fl2va":
        if "minimax" not in tokens and "h3" not in compact:
            return False
        if "ref2va" in compact or "ref2v" in compact:
            return False
        return "fl2va" in compact or "fl2v" in compact
    if role == "ref2va":
        if "minimax" not in tokens and "h3" not in compact:
            return False
        return "ref2va" in compact or "ref2v" in compact
    if role == "text_encoder":
        if ("qwen3vl" in compact or ("qwen3" in tokens and "vl" in tokens)) and (
            "32b" in tokens or "32" in tokens
        ):
            return True
        # Some community H3 exports omit "minimax_h3" from the encoder
        # filename but retain the characteristic INT8/ConvRot or NVFP4/AWQ
        # variant naming.
        if (
            "qwen3" in tokens
            and "vl" in tokens
            and ("32b" in tokens or "32" in tokens)
            and (("int8" in tokens and "convrot" in tokens) or ("nvfp4" in tokens and "awq" in tokens))
        ):
            return True
        # A few community exports use only text_encoder.safetensors, but keep
        # the match scoped to an H3-named path to avoid generic CLIP files.
        return "text encoder" in normalised and ("minimax" in tokens or "h3" in compact)
    if role == "video_vae":
        is_minimax_h3 = _is_minimax_h3_name(normalised, compact, tokens)
        is_video_vae = (
            ("video" in tokens and "vae" in tokens)
            or "videovae" in compact
            # Diffusers-style exports may use MiniMax-H3/vae/... without the
            # word "video". In H3, an unqualified VAE is the visual VAE.
            or ("vae" in tokens and "audio" not in tokens and "audiovae" not in compact)
        )
        return is_minimax_h3 and is_video_vae and "tae" not in tokens and "approx" not in tokens
    if role == "audio_vae":
        is_minimax_h3 = _is_minimax_h3_name(normalised, compact, tokens)
        is_audio_vae = (
            ("audio" in tokens and "vae" in tokens)
            or "audiovae" in compact
        )
        return is_minimax_h3 and is_audio_vae and "tae" not in tokens and "approx" not in tokens
    return False


def _sort_model_names(names: list[str]) -> list[str]:
    def sort_key(name: str) -> tuple[int, int, str]:
        normalised = _normalise_model_name(name)
        # Keep safetensors first for the native path, followed by GGUF. Within
        # each group use a deterministic name order for stable workflows.
        extension_rank = 1 if _is_gguf_file(name) else 0
        official_rank = 0 if "minimax" in normalised and "h3" in normalised else 1
        return extension_rank, official_rank, normalised

    return sorted(names, key=sort_key)


def _is_none_model(value: Any) -> bool:
    return str(value or "").strip().lower() in NONE_MODEL_ALIASES


def _read_prompt_guide_text(relative_path: str) -> str:
    path = os.path.realpath(os.path.join(PROMPT_GUIDES_DIR, str(relative_path or "")))
    root = os.path.realpath(PROMPT_GUIDES_DIR)
    if not path.startswith(root + os.sep) or not os.path.isfile(path):
        raise ValueError(f"Prompt guide file not found: {relative_path}")
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


@lru_cache(maxsize=1)
def _prompt_guide_manifest() -> dict[str, Any]:
    try:
        with open(PROMPT_GUIDE_MANIFEST, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _prompt_guide_bundle(scene_guide: str, mode: str, seconds: float, media_counts: Mapping[str, int]) -> str:
    manifest = _prompt_guide_manifest()
    general = manifest.get("general") if isinstance(manifest.get("general"), dict) else {}
    blocks = [
        "You are the MiniMax H3 Prompt Optimizer inside a ComfyUI node.",
        "Return only the final prompt text. Do not add explanations, markdown fences, titles, or commentary.",
        "Use the complete prompt guide text below. Preserve all official field names, section order, labels, timing notation, dialogue language, and reference tags.",
        f"Node context: mode={mode}; duration_seconds={float(seconds):.2f}; media_counts={dict(media_counts)}.",
    ]
    if general.get("path"):
        blocks.append("=== H3 GENERAL PROMPT GUIDE ===\n" + _read_prompt_guide_text(str(general["path"])))
    if general.get("base_reference") and mode != MODE_REFERENCE:
        blocks.append("=== H3 BASE REFERENCE GUIDE ===\n" + _read_prompt_guide_text(str(general["base_reference"])))
    if general.get("ref_reference") and mode == MODE_REFERENCE:
        blocks.append("=== H3 FULL-REFERENCE GUIDE ===\n" + _read_prompt_guide_text(str(general["ref_reference"])))
    if scene_guide and scene_guide != "none":
        for item in manifest.get("scene_guides") or []:
            if isinstance(item, dict) and str(item.get("id")) == scene_guide and item.get("path"):
                scene_path = str(item["path"])
                blocks.append("=== SELECTED SCENE PROMPT GUIDE ===\n" + _read_prompt_guide_text(scene_path))
                reference_dir = os.path.join(PROMPT_GUIDES_DIR, os.path.dirname(scene_path), "references")
                if os.path.isdir(reference_dir):
                    for root, _dirs, filenames in os.walk(reference_dir):
                        for filename in sorted(filenames):
                            if os.path.splitext(filename)[1].lower() not in {".md", ".txt"}:
                                continue
                            relative = os.path.relpath(os.path.join(root, filename), PROMPT_GUIDES_DIR).replace(os.sep, "/")
                            blocks.append(f"=== SELECTED SCENE REFERENCE: {relative} ===\n" + _read_prompt_guide_text(relative))
                break
    return "\n\n".join(blocks)


def _prompt_optimizer_config_path() -> str:
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), "prompt_optimizer.json")


def _normalize_prompt_optimizer_config(value: Mapping[str, Any] | None) -> dict[str, Any]:
    source = value if isinstance(value, Mapping) else {}
    api_format = str(source.get("api_format") or OPTIMIZER_FORMAT_OPENAI).strip().lower()
    if api_format not in OPTIMIZER_FORMATS:
        api_format = OPTIMIZER_FORMAT_OPENAI
    read_media = source.get("read_media", False)
    if isinstance(read_media, str):
        read_media = read_media.strip().lower() in {"1", "true", "yes", "on"}
    def integer(key: str, fallback: int, low: int, high: int, *legacy: str) -> int:
        raw = source.get(key)
        for name in legacy:
            if raw is None:
                raw = source.get(name)
        try:
            value = int(float(fallback if raw is None else raw))
        except (TypeError, ValueError):
            value = fallback
        return min(high, max(low, value))

    # "clip_max_length" is the name this setting shipped under before the GGUF
    # format shared it.
    local_max_length = integer(
        "local_max_length", PROMPT_OPTIMIZER_CLIP_MAX_LENGTH,
        PROMPT_OPTIMIZER_CLIP_MIN_LENGTH, PROMPT_OPTIMIZER_CLIP_LENGTH_LIMIT, "clip_max_length",
    )
    mmproj = str(source.get("gguf_mmproj") or OPTIMIZER_GGUF_MMPROJ_AUTO).strip() or OPTIMIZER_GGUF_MMPROJ_AUTO
    unload = source.get("gguf_unload_after", False)
    if isinstance(unload, str):
        unload = unload.strip().lower() in {"1", "true", "yes", "on"}
    describe = source.get("gguf_describe_media", False)
    if isinstance(describe, str):
        describe = describe.strip().lower() in {"1", "true", "yes", "on"}
    return {
        "version": PROMPT_OPTIMIZER_CONFIG_VERSION,
        "api_format": api_format,
        "api_url": str(source.get("api_url") or "").strip(),
        "api_key": str(source.get("api_key") or ""),
        "model": str(source.get("model") or "").strip(),
        "read_media": bool(read_media),
        "local_max_length": local_max_length,
        "gguf_model": str(source.get("gguf_model") or "").strip(),
        "gguf_mmproj": mmproj,
        "gguf_context": integer("gguf_context", OPTIMIZER_GGUF_CONTEXT, OPTIMIZER_GGUF_CONTEXT_MIN, OPTIMIZER_GGUF_CONTEXT_LIMIT),
        "gguf_gpu_layers": integer("gguf_gpu_layers", OPTIMIZER_GGUF_GPU_LAYERS, -1, 1024),
        "gguf_unload_after": bool(unload),
        "gguf_describe_media": bool(describe),
    }


def _read_prompt_optimizer_config() -> dict[str, Any]:
    path = _prompt_optimizer_config_path()
    with _PROMPT_OPTIMIZER_CONFIG_LOCK:
        try:
            with open(path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (FileNotFoundError, json.JSONDecodeError, OSError, TypeError, ValueError):
            return dict(PROMPT_OPTIMIZER_CONFIG_DEFAULTS)
    return _normalize_prompt_optimizer_config(payload)


def _write_prompt_optimizer_config(value: Mapping[str, Any] | None) -> dict[str, Any]:
    normalized = _normalize_prompt_optimizer_config(value)
    path = _prompt_optimizer_config_path()
    directory = os.path.dirname(path)
    temporary_path = ""
    with _PROMPT_OPTIMIZER_CONFIG_LOCK:
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=directory,
                prefix=".prompt_optimizer.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temporary_path = handle.name
                json.dump(normalized, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            os.replace(temporary_path, path)
        finally:
            if temporary_path and os.path.exists(temporary_path):
                try:
                    os.remove(temporary_path)
                except OSError:
                    pass
    return normalized


_OPTIMIZER_KNOWN_ENDPOINT_SUFFIXES = (
    "/v1/chat/completions",
    "/chat/completions",
)
_OPTIMIZER_GEMINI_ENDPOINT_RE = re.compile(
    r"/(v1beta|v1)/models/[^/?:#]+?:(generateContent|streamGenerateContent)$",
    flags=re.I,
)


def _normalize_optimizer_base_url(api_url: str) -> str:
    base = str(api_url or "").strip().rstrip("/")
    if not base:
        raise ValueError("Prompt optimization API URL is required")
    if not re.match(r"^https?://", base, flags=re.I):
        base = "https://" + base
    return base.rstrip("/")


def _optimizer_endpoint_kind(value: str) -> str:
    lower = str(value or "").lower()
    if lower.endswith("/chat/completions"):
        return "chat"
    if _OPTIMIZER_GEMINI_ENDPOINT_RE.search(lower):
        return "gemini"
    return ""


def _normalize_gemini_model_id(model: str) -> str:
    """Accept a bare model ID, ``models/<id>``, or a full Gemini model URL."""
    raw = urllib.parse.unquote(str(model or "").strip())
    if not raw:
        raise ValueError("Prompt optimization model is required")
    if "://" in raw:
        raw = urllib.parse.urlsplit(raw).path
    raw = raw.split("?", 1)[0].split("#", 1)[0].strip().strip("/")
    match = re.search(r"(?:^|/)models/([^/:]+)(?::[A-Za-z]+)?$", raw, flags=re.I)
    if match:
        raw = match.group(1)
    else:
        if raw.lower().startswith("models/"):
            raw = raw[7:]
        raw = raw.rsplit("/", 1)[-1]
        raw = re.sub(r":(?:generateContent|streamGenerateContent)$", "", raw, flags=re.I)
    raw = raw.strip()
    if not raw:
        raise ValueError("Prompt optimization model is required")
    return raw


def _gemini_url_with_query(url: str, query: str) -> str:
    # ``alt=sse`` belongs to streamGenerateContent and would corrupt the JSON
    # response expected from generateContent. Preserve other proxy parameters.
    pairs = [(key, value) for key, value in urllib.parse.parse_qsl(query, keep_blank_values=True) if key.lower() != "alt"]
    encoded = urllib.parse.urlencode(pairs)
    return url + (f"?{encoded}" if encoded else "")


def _normalize_gemini_optimizer_url(api_url: str, model: str) -> str:
    base = _normalize_optimizer_base_url(api_url)
    parsed = urllib.parse.urlsplit(base)
    clean = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))
    lower = clean.lower()
    model_id = urllib.parse.quote(_normalize_gemini_model_id(model), safe=".-_")

    endpoint_match = _OPTIMIZER_GEMINI_ENDPOINT_RE.search(lower)
    if endpoint_match and lower.endswith(endpoint_match.group(0)):
        version = endpoint_match.group(1)
        clean = clean[: endpoint_match.start()].rstrip("/")
        url = f"{clean}/{version}/models/{model_id}:generateContent"
        return _gemini_url_with_query(url, parsed.query)

    if lower.endswith("/v1beta/models") or lower.endswith("/v1/models"):
        url = f"{clean}/{model_id}:generateContent"
    elif lower.endswith("/v1beta") or lower.endswith("/v1"):
        url = f"{clean}/models/{model_id}:generateContent"
    elif lower.endswith("/models"):
        url = f"{clean}/{model_id}:generateContent"
    else:
        url = f"{clean}/v1beta/models/{model_id}:generateContent"
    return _gemini_url_with_query(url, parsed.query)


def _strip_optimizer_endpoint(base: str) -> str:
    lower = base.lower()
    for suffix in _OPTIMIZER_KNOWN_ENDPOINT_SUFFIXES:
        if lower.endswith(suffix):
            return base[: len(base) - len(suffix)].rstrip("/")
    match = _OPTIMIZER_GEMINI_ENDPOINT_RE.search(lower)
    if match and lower.endswith(match.group(0)):
        return base[: match.start()].rstrip("/")
    return base


def _normalize_optimizer_url(api_url: str, api_format: str, model: str) -> str:
    if api_format == "gemini":
        return _normalize_gemini_optimizer_url(api_url, model)
    base = _normalize_optimizer_base_url(api_url)
    endpoint = "/v1/chat/completions"
    base_kind = _optimizer_endpoint_kind(base)
    endpoint_kind = _optimizer_endpoint_kind(endpoint)
    if base_kind == endpoint_kind == "chat":
        return base
    if base_kind == endpoint_kind == "gemini":
        base_match = _OPTIMIZER_GEMINI_ENDPOINT_RE.search(base.lower())
        if base_match and base.lower().endswith(base_match.group(0)) and base_match.group(0) == endpoint.lower():
            return base
    base = _strip_optimizer_endpoint(base)
    if base.lower().endswith("/v1") and endpoint.lower().startswith("/v1/"):
        endpoint = endpoint[3:]
    if base.lower().endswith("/v1beta") and endpoint.lower().startswith("/v1beta/"):
        endpoint = endpoint[7:]
    return base + endpoint


def _optimizer_log(message: str, *args: Any) -> None:
    """Progress lines for a step that can take minutes and shows no UI."""
    logging.info("MiniMax H3 Easy: " + message, *args)


class _OptimizerCancelled(Exception):
    """The editor asked for this optimization to stop."""


_OPTIMIZER_CANCEL_LOCK = threading.RLock()
_OPTIMIZER_CANCELLED: list[str] = []


def _optimizer_cancel(request_id: str) -> bool:
    """Mark an in-flight optimization as cancelled.

    The id list is capped because a cancel that arrives after its request has
    already finished has nothing left to clear it.
    """
    request_id = str(request_id or "").strip()
    if not request_id:
        return False
    with _OPTIMIZER_CANCEL_LOCK:
        if request_id not in _OPTIMIZER_CANCELLED:
            _OPTIMIZER_CANCELLED.append(request_id)
        del _OPTIMIZER_CANCELLED[:-PROMPT_OPTIMIZER_CANCEL_LIMIT]
    return True


def _optimizer_is_cancelled(request_id: str) -> bool:
    request_id = str(request_id or "").strip()
    if not request_id:
        return False
    with _OPTIMIZER_CANCEL_LOCK:
        return request_id in _OPTIMIZER_CANCELLED


def _optimizer_forget_cancel(request_id: str) -> None:
    request_id = str(request_id or "").strip()
    with _OPTIMIZER_CANCEL_LOCK:
        while request_id in _OPTIMIZER_CANCELLED:
            _OPTIMIZER_CANCELLED.remove(request_id)


def _optimizer_raise_if_cancelled(request_id: str) -> None:
    if _optimizer_is_cancelled(request_id):
        raise _OptimizerCancelled("Prompt optimization was cancelled")


def _optimizer_thinking_off_payload(api_format: str) -> dict[str, Any]:
    """The extra request fields that switch a reasoning model's thinking off.

    There is no standard field for this. `chat_template_kwargs.enable_thinking`
    is what llama.cpp's server, vLLM, SGLang, LM Studio and Ollama all read for
    the Qwen family, and Gemini uses a zero thinking budget. Both are kept in a
    *separate* dict so the request can be retried without them: an endpoint that
    rejects unknown fields (OpenAI itself does) must still answer.
    """
    if api_format == "gemini":
        return {"generationConfig": {"thinkingConfig": {"thinkingBudget": 0}}}
    return {"chat_template_kwargs": {"enable_thinking": False}}


def _optimizer_merge_payload(base: Mapping[str, Any], extra: Mapping[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in extra.items():
        if isinstance(value, Mapping) and isinstance(merged.get(key), Mapping):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def _optimizer_http_post(url: str, headers: Mapping[str, str], payload: Mapping[str, Any], extra: Mapping[str, Any]) -> Any:
    """POST the payload, retrying without `extra` if the endpoint rejects it.

    The thinking switches are the only optional fields, and a server that has
    never heard of them answers 400 rather than ignoring them. Dropping them and
    trying again is better than failing outright — `_strip_optimizer_output` is
    still there to catch a tagged reasoning block.
    """
    attempts: list[Mapping[str, Any]] = [_optimizer_merge_payload(payload, extra)] if extra else []
    attempts.append(payload)
    last: Exception | None = None
    for index, body in enumerate(attempts):
        request = urllib.request.Request(
            url, data=json.dumps(body, ensure_ascii=False).encode("utf-8"), headers=dict(headers), method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=PROMPT_OPTIMIZER_TIMEOUT_SECONDS) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            last = RuntimeError(f"Prompt optimization API error ({exc.code}): {detail[:1000]}")
            if index + 1 < len(attempts) and exc.code in {400, 404, 422}:
                _optimizer_log("the endpoint rejected the thinking-off fields (%d); retrying without them", exc.code)
                continue
            raise last from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Prompt optimization request failed: {exc.reason}") from exc
    raise last or RuntimeError("Prompt optimization request failed")


def _optimizer_http_json(api_url: str, api_key: str, model: str, api_format: str, system_prompt: str, user_prompt: str, media_parts: list[dict[str, Any]] | None = None) -> str:
    url = _normalize_optimizer_url(api_url, api_format, model)
    media_parts = list(media_parts or [])
    started = time.perf_counter()
    _optimizer_log(
        "optimizing the prompt via %s (model=%s, guide=%d chars, prompt=%d chars, media parts=%d)",
        api_format, model or "?", len(system_prompt), len(user_prompt), len(media_parts),
    )
    if api_format == "gemini":
        headers = {"Content-Type": "application/json", "Accept": "application/json", "x-goog-api-key": api_key}
        # Some Gemini-compatible channels accept the native payload and return
        # candidates but silently ignore systemInstruction. Keep the complete
        # Prompt Guide and the user's source prompt in the same user text part,
        # matching the node's previously verified working Gemini request.
        instruction_and_prompt = (
            system_prompt
            + "\n\n=== USER PROMPT TO OPTIMIZE ===\n"
            + user_prompt
            + "\n\nFollow the Prompt Guide above and return only the final rewritten MiniMax H3 prompt."
        )
        parts = [{"text": instruction_and_prompt}] + media_parts
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"temperature": 0.35, "maxOutputTokens": PROMPT_OPTIMIZER_MAX_OUTPUT_TOKENS},
        }
    else:
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        content: str | list[dict[str, Any]]
        if media_parts:
            content = [{"type": "text", "text": user_prompt}, *media_parts]
        else:
            content = user_prompt
        payload = {"model": model, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": content}], "stream": False, "temperature": 0.35, "max_tokens": PROMPT_OPTIMIZER_MAX_OUTPUT_TOKENS}
    data = _optimizer_http_post(url, headers, payload, _optimizer_thinking_off_payload(api_format))
    if api_format == "gemini":
        candidates = data.get("candidates") if isinstance(data, dict) else None
        if not isinstance(candidates, list) or not candidates:
            feedback = data.get("promptFeedback") if isinstance(data, dict) else None
            reason = feedback.get("blockReason") if isinstance(feedback, dict) else None
            detail = f": {reason}" if reason else ""
            raise RuntimeError(f"Gemini API returned no candidates{detail}")
        candidate = candidates[0] if isinstance(candidates[0], dict) else {}
        parts = candidate.get("content", {}).get("parts", []) if isinstance(candidate.get("content"), dict) else []
        text = "".join(str(part.get("text", "")) for part in parts if isinstance(part, dict) and part.get("text") is not None)
        if not text.strip():
            finish_reason = candidate.get("finishReason") or candidate.get("finish_reason") or "unknown"
            raise RuntimeError(f"Gemini API returned no text (finish reason: {finish_reason})")
    else:
        content = ((data.get("choices") or [{}])[0].get("message", {}) or {}).get("content", "")
        text = content if isinstance(content, str) else "".join(str(item.get("text", "")) for item in content if isinstance(item, dict))
    # The HTTP formats used to skip this entirely, so a reasoning block reached
    # the H3 prompt verbatim even though the switches above ask for none.
    text = _strip_optimizer_output(text)
    if not text:
        raise RuntimeError("Prompt optimization API returned an empty response")
    _optimizer_log("prompt optimization finished in %.1fs (%d chars)", time.perf_counter() - started, len(text))
    return text


def _optimizer_asset_path(asset: Mapping[str, Any]) -> str | None:
    filename = str(asset.get("filename") or "").strip()
    if not filename or os.path.isabs(filename):
        return None
    storage = str(asset.get("storage") or "input").lower()
    roots = {
        "input": folder_paths.get_input_directory(),
        "output": folder_paths.get_output_directory(),
        "temp": folder_paths.get_temp_directory(),
    }
    root = os.path.realpath(roots.get(storage, roots["input"]))
    subfolder = str(asset.get("subfolder") or "").replace("\\", "/").strip("/")
    candidate = os.path.realpath(os.path.join(root, subfolder, filename))
    if candidate != root and not candidate.startswith(root + os.sep):
        return None
    return candidate if os.path.isfile(candidate) else None


def _optimizer_media_items(resources: list[Mapping[str, Any]], api_format: str) -> list[dict[str, Any]]:
    """Resolve the editor's media list into taggable request parts.

    Every readable asset is kept, including the ones this format cannot carry:
    their `parts` is empty so a caller can say what it skipped instead of
    quietly dropping the reference. `tag` is the same `<Picture N>` the prompt
    uses. A video that cannot be sent whole becomes `sampled` stills, which is
    the only way it reaches a chat-completions API at all.
    """
    items: list[dict[str, Any]] = []
    ordinals: dict[str, int] = {}
    for resource in resources[:MAX_MEDIA]:
        asset = resource.get("asset") if isinstance(resource.get("asset"), Mapping) else {}
        path = _optimizer_asset_path(asset)
        media_type = str(resource.get("type") or "").lower()
        if not path or media_type not in {"image", "video", "audio"}:
            continue
        ordinals[media_type] = ordinals.get(media_type, 0) + 1
        tag = str(resource.get("tag") or "").strip() or f"{media_type} {ordinals[media_type]}"
        parts: list[dict[str, Any]] = []
        try:
            # Only whole-file embedding is size-capped. The item survives either
            # way, so an oversized video can still be sampled into stills.
            if os.path.getsize(path) <= OPTIMIZER_MEDIA_MAX_BYTES:
                mime = mimetypes.guess_type(path)[0] or {"image": "image/jpeg", "video": "video/mp4", "audio": "audio/wav"}[media_type]
                if api_format == "gemini" or media_type == "image":
                    with open(path, "rb") as handle:
                        encoded = base64.b64encode(handle.read()).decode("ascii")
                    if api_format == "gemini":
                        parts = [{"inlineData": {"mimeType": mime, "data": encoded}}]
                    else:
                        parts = [{"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded}"}}]
        except (OSError, ValueError):
            parts = []
        sampled = not parts and media_type == "video"
        if sampled:
            parts = _optimizer_video_still_parts(path)
            sampled = bool(parts)
        items.append({"tag": tag, "type": media_type, "path": path, "parts": parts, "sampled": sampled})
    return items


def _optimizer_media_manifest(items: Sequence[Mapping[str, Any]]) -> str:
    """Name what each attached part actually is.

    Without this the model receives an unlabelled pile of images and has to
    guess which reference each one belongs to — and a sampled video looks like
    several unrelated pictures rather than one clip.
    """
    lines = []
    for item in items:
        parts = item.get("parts") or []
        if not parts:
            continue
        if item.get("sampled"):
            lines.append(
                f"- {item['tag']}: {len(parts)} still frames sampled in chronological order from one video "
                "clip. They are that single video reference, not separate images."
            )
        else:
            lines.append(f"- {item['tag']}: 1 {item['type']}")
    if not lines:
        return ""
    return "Attached media parts, in order:\n" + "\n".join(lines)


def _optimizer_video_still_parts(
    path: str,
    count: int = OPTIMIZER_VIDEO_STILLS,
    max_side: int = OPTIMIZER_VIDEO_STILL_MAX_SIDE,
) -> list[dict[str, Any]]:
    """Sample evenly spaced frames from a video file as OpenAI image parts.

    A chat completion has no video channel, so this is the only way a reference
    video reaches the optimizer. Frames are seeked rather than decoded in full,
    since a reference clip can be long and only a handful of stills are wanted;
    files whose duration is unknown (or that refuse to seek) fall back to a
    strided sequential decode.
    """
    if not path:
        return []
    try:
        import av
    except ImportError:
        logging.warning("MiniMax H3 Easy: PyAV is unavailable, so reference videos cannot be sampled.")
        return []
    frames: list[Any] = []
    try:
        with av.open(path) as container:
            streams = container.streams.video
            if not streams:
                return []
            stream = streams[0]
            stream.thread_type = "AUTO"
            duration = 0.0
            if stream.duration and stream.time_base:
                duration = float(stream.duration * stream.time_base)
            elif container.duration:
                duration = float(container.duration) / float(av.time_base)
            if duration > 0 and stream.time_base:
                for index in range(count):
                    # Aim at the middle of each slice so the first and last
                    # frames (often black) are not what gets described.
                    seconds = duration * (index + 0.5) / count
                    try:
                        container.seek(int(seconds / stream.time_base), stream=stream)
                        frame = next(container.decode(stream), None)
                    except Exception:
                        frame = None
                    if frame is not None:
                        frames.append(frame)
            if not frames:
                container.seek(0)
                total = int(stream.frames or 0)
                stride = max(1, total // count) if total else 1
                for index, frame in enumerate(container.decode(stream)):
                    if index % stride == 0:
                        frames.append(frame)
                    if len(frames) >= count:
                        break
    except Exception as exc:
        logging.warning("MiniMax H3 Easy: could not sample %s for the prompt optimizer (%s).", os.path.basename(path), exc)
        return []
    parts: list[dict[str, Any]] = []
    for frame in frames:
        try:
            image = frame.to_image()
            longest = max(image.width, image.height)
            if longest > max_side:
                scale = max_side / longest
                image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))))
            buffer = io.BytesIO()
            image.convert("RGB").save(buffer, format="JPEG", quality=85)
        except Exception as exc:
            logging.warning("MiniMax H3 Easy: could not encode a sampled frame (%s).", exc)
            continue
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        parts.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}})
    if parts:
        _optimizer_log("sampled %d frames from %s", len(parts), os.path.basename(path))
    return parts


def _optimizer_media_parts(resources: list[Mapping[str, Any]], api_format: str) -> list[dict[str, Any]]:
    return [part for item in _optimizer_media_items(resources, api_format) for part in item["parts"]]


def _media_counts_from_kwargs(kwargs: Mapping[str, Any]) -> dict[str, int]:
    counts = {"image": 0, "video": 0, "audio": 0}
    for index in range(1, MAX_MEDIA + 1):
        kind = str(kwargs.get(f"media_type_{index}") or "").lower()
        if kind in counts and kwargs.get(f"media_{index}") is not None:
            counts[kind] += 1
    direct = kwargs.get("media")
    if direct is not None:
        counts[_infer_media_type(direct)] += 1
    return counts


def _optimizer_system_prompt(
    scene_guide: str,
    mode: str,
    seconds: float,
    media_counts: Mapping[str, int],
    attached_media_count: int = 0,
    described_media_count: int = 0,
    attached_manifest: str = "",
) -> str:
    prompt = _prompt_guide_bundle(scene_guide, mode, seconds, media_counts)
    actual_count = max(0, int(attached_media_count or 0))
    described_count = max(0, int(described_media_count or 0))
    if described_count:
        # The media itself was perceived in a separate pass; this request only
        # carries the resulting descriptions.
        return prompt + (
            "\n\n=== MEDIA EVIDENCE RULE ===\n"
            f"Descriptions of {described_count} connected media are listed under CONNECTED MEDIA below. "
            "You produced them yourself from the actual connected media, so treat them as observed evidence for the tags they name. "
            "Do not invent any detail beyond those descriptions and the user's prompt. "
            "For a media tag with no description, preserve the tag and infer only from the user's text and explicit instructions, never from an imagined asset."
        )
    if actual_count:
        manifest = f"{attached_manifest.strip()}\n" if attached_manifest.strip() else ""
        prompt += (
            "\n\n=== MEDIA EVIDENCE RULE ===\n"
            f"Actual media references attached to this request: {actual_count}.\n"
            f"{manifest}"
            "The presence of a media part in the request does not prove that you can perceive it. "
            "Use visual, video, or audio details only when they are directly observable to your model in the attached media parts. "
            "If your model or API does not support the media modality, treat that media as unavailable. "
            "Do not invent or confidently describe details for any referenced media that is not actually attached. "
            "For a media tag without corresponding attached evidence, preserve the tag and infer only from the original user prompt and explicit instructions, never from an imagined asset."
        )
    else:
        prompt += (
            "\n\n=== MEDIA EVIDENCE RULE ===\n"
            "No actual media file was attached to this request. Do not invent, hallucinate, or confidently describe the content of any image, video, or audio reference. "
            "Preserve media reference tags when needed, but infer only from the original user prompt and explicit instructions. Never fabricate a subject, appearance, action, setting, sound, or other media detail."
        )
    return prompt


_OPTIMIZER_THINK_TAGS = "think|thinking|reasoning|thought|analysis"
# Greedy on purpose: everything up to and including the LAST closing tag goes.
# The opening tag is optional because most Qwen-family chat templates *pre-open*
# `<think>` in the assistant turn, so what the model actually returns starts with
# bare reasoning prose and the only tag in the string is the closing one.
# Requiring the opening tag let that whole reasoning block into the H3 prompt.
_OPTIMIZER_THINK_CLOSE_RE = re.compile(rf"\A.*</(?:{_OPTIMIZER_THINK_TAGS})>", flags=re.I | re.S)
_OPTIMIZER_OPEN_THINK_RE = re.compile(rf"\A\s*<(?:{_OPTIMIZER_THINK_TAGS})>", flags=re.I)
# Channel markers instead of tags. gpt-oss writes Harmony's `<|channel|>`, but the
# pipes move: Gemma 4 opens with `<|channel>thought` and closes with `<channel|>`,
# so every spelling of the same marker has to be accepted.
_OPTIMIZER_CHANNEL_MARK = r"<\|?channel\|?>"
_OPTIMIZER_MESSAGE_MARK = r"<\|?message\|?>"
# Both are greedy: the prompt is whatever follows the LAST marker.
_OPTIMIZER_FINAL_CHANNEL_RE = re.compile(
    rf"\A.*{_OPTIMIZER_CHANNEL_MARK}\s*final\s*{_OPTIMIZER_MESSAGE_MARK}", flags=re.I | re.S
)
# A thinking channel that is closed by a bare marker, with no `final` role and no
# `<|message|>` after it — the prompt simply starts there.
_OPTIMIZER_THOUGHT_CHANNEL_RE = re.compile(
    rf"\A.*{_OPTIMIZER_CHANNEL_MARK}\s*(?:{_OPTIMIZER_THINK_TAGS})\b.*"
    rf"{_OPTIMIZER_CHANNEL_MARK}\s*(?:{_OPTIMIZER_MESSAGE_MARK})?",
    flags=re.I | re.S,
)
_OPTIMIZER_OPEN_CHANNEL_RE = re.compile(
    rf"\A\s*{_OPTIMIZER_CHANNEL_MARK}\s*(?:{_OPTIMIZER_THINK_TAGS})\b", flags=re.I
)
_OPTIMIZER_TRAILING_TOKEN_RE = re.compile(r"<\|(?:return|end|endoftext|im_end)\|>\s*\Z", flags=re.I)


def _strip_optimizer_output(text: Any) -> str:
    """Reduce a model's answer to the prompt text itself.

    Reasoning models emit a thinking block before the answer, and it must never
    reach the H3 prompt. Thinking is switched off per format where the backend
    allows it; this is the backstop for models that ignore that, or whose chat
    template opens the block for them so only its closing tag is ever emitted.

    Untagged reasoning cannot be removed here — nothing marks where it ends — so
    the switches in the request are what actually has to work.
    """
    value = str(text or "").strip()
    value = _OPTIMIZER_FINAL_CHANNEL_RE.sub("", value).strip()
    value = _OPTIMIZER_THOUGHT_CHANNEL_RE.sub("", value).strip()
    value = _OPTIMIZER_TRAILING_TOKEN_RE.sub("", value).strip()
    value = _OPTIMIZER_THINK_CLOSE_RE.sub("", value).strip()
    if _OPTIMIZER_OPEN_THINK_RE.match(value) or _OPTIMIZER_OPEN_CHANNEL_RE.match(value):
        # An unterminated block means the answer was cut off mid-thought, so
        # there is no prompt in here at all.
        return ""
    value = re.sub(r"^```(?:[a-zA-Z]*)\s*", "", value)
    value = re.sub(r"\s*```$", "", value)
    return value.strip()


def _tokenizer_accepts(clip, name: str) -> bool:
    """True when the tokenizer declares `name` as a real parameter.

    Every tokenizer also takes **kwargs, so an unsupported media argument is
    silently dropped instead of raising. Checking the signature is what keeps
    `video=` away from an encoder that would ignore it.
    """
    try:
        return name in inspect.signature(clip.tokenizer.tokenize_with_weights).parameters
    except (AttributeError, TypeError, ValueError):
        return False


def _sample_frames(frames, limit: int):
    """Evenly thin a frame batch down to at most `limit` frames."""
    try:
        count = int(frames.shape[0])
    except (AttributeError, IndexError, TypeError):
        return frames
    if count <= limit:
        return frames
    step = count / float(limit)
    return frames[[min(count - 1, int(index * step)) for index in range(limit)]]


def _stack_stills(stills: list) -> Any:
    """Pack per-image tensors into the single batch an `image=` tokenizer wants.

    Such a tokenizer derives one resize target from the batch shape, so images
    that do not already match the first one are stretched to it. Tokenizers
    that accept an `images=` list keep their original sizes instead.
    """
    first = stills[0][..., :3]
    if len(stills) == 1:
        return first
    height, width = int(first.shape[1]), int(first.shape[2])
    normalized = [first]
    for image in stills[1:]:
        image = image[..., :3]
        if int(image.shape[1]) != height or int(image.shape[2]) != width:
            image = h3._resize(image, width, height, "disabled")
        normalized.append(image)
    return torch.cat(normalized, dim=0)


def _optimizer_clip_media(clip, items: list[_MediaInput]) -> tuple[dict[str, Any], int]:
    """Map connected media onto the tokenizer arguments the encoder supports.

    Returns the tokenizer kwargs plus how many media parts were actually
    attached, so the system prompt's evidence rule can state the truth.
    """
    stills = [
        item.value[:1]
        for item in items
        if item.media_type == "image" and isinstance(item.value, torch.Tensor) and item.value.ndim == 4
    ]
    videos = []
    soundtracks = []
    for item in items:
        if item.media_type != "video":
            continue
        try:
            frames, soundtrack, _fps = _video_parts(item.value)
        except ValueError:
            continue
        videos.append(frames)
        if soundtrack is not None:
            soundtracks.append(soundtrack)

    media: dict[str, Any] = {}
    attached = 0
    # The dedicated video channel replaces the image channel on the encoders
    # that have one, so it is only used when no reference image would be lost.
    if not stills and len(videos) == 1 and _tokenizer_accepts(clip, "video"):
        media["video"] = _sample_frames(videos[0], OPTIMIZER_CLIP_MAX_VIDEO_FRAMES)[..., :3]
        # The frames are already thinned, so keep every one of them.
        media["fps"] = 1.0
        attached += 1
    else:
        for frames in videos:
            sampled = _sample_frames(frames, OPTIMIZER_CLIP_FRAMES_PER_VIDEO)
            stills.extend(sampled[index:index + 1] for index in range(int(sampled.shape[0])))
        if stills:
            dropped = max(0, len(stills) - OPTIMIZER_CLIP_MAX_STILLS)
            if dropped:
                logging.warning(
                    "MiniMax H3 Easy: sending %d of %d stills to the optimizer text encoder.",
                    OPTIMIZER_CLIP_MAX_STILLS, len(stills),
                )
            stills = stills[:OPTIMIZER_CLIP_MAX_STILLS]
            if _tokenizer_accepts(clip, "images"):
                media["images"] = [image[..., :3] for image in stills]
            elif _tokenizer_accepts(clip, "image"):
                media["image"] = _stack_stills(stills)
            else:
                stills = []
            attached += len(stills)

    if _tokenizer_accepts(clip, "audio"):
        clips = [item.value for item in items if item.media_type == "audio" and isinstance(item.value, Mapping) and "waveform" in item.value]
        clips.extend(track for track in soundtracks if isinstance(track, Mapping) and "waveform" in track)
        if clips:
            # Every encoder with an audio channel takes a single clip.
            media["audio"] = clips[0]
            attached += 1
    return media, attached


def _optimizer_clip_tokens(clip, text: str, media: Mapping[str, Any] | None = None):
    extra = dict(media or {})
    try:
        return clip.tokenize(text, skip_template=False, min_length=1, thinking=False, **extra)
    except TypeError:
        # Older ComfyUI builds expose a narrower tokenize signature.
        try:
            return clip.tokenize(text, **extra)
        except TypeError:
            if extra:
                logging.warning("MiniMax H3 Easy: this text encoder rejected the attached media; optimizing from text only.")
            return clip.tokenize(text)


def _optimizer_clip_generate(
    clip,
    system_prompt: str,
    user_prompt: str,
    max_length: int,
    media: Mapping[str, Any] | None = None,
    context: str = "",
) -> str:
    """Rewrite a prompt with the text encoder connected to `optimizer_clip`.

    This mirrors ComfyUI's built-in Generate Text node: tokenize, generate,
    decode. Only encoders whose model implements text generation (Gemma and
    similar LLM-backed encoders) support this; a plain CLIP raises instead of
    silently returning nothing. Sampling is disabled so re-running a workflow
    with an unchanged prompt returns the same text.
    """
    if clip is None:
        raise ValueError("Connect a text encoder to the optimizer CLIP input")
    if not hasattr(clip, "generate") or not hasattr(clip, "decode"):
        raise ValueError(
            "This ComfyUI build cannot generate text from a CLIP input. "
            "Update ComfyUI, or select an HTTP API format in the prompt optimization settings."
        )
    sections = [system_prompt]
    if context.strip():
        sections.append(f"=== CONNECTED MEDIA ===\n{context.strip()}")
    sections.append(f"=== USER PROMPT ===\n{user_prompt}")
    tokens = _optimizer_clip_tokens(clip, "\n\n".join(sections), media)
    length = min(PROMPT_OPTIMIZER_CLIP_LENGTH_LIMIT, max(PROMPT_OPTIMIZER_CLIP_MIN_LENGTH, int(max_length)))
    try:
        generated = clip.generate(
            tokens,
            do_sample=False,
            max_length=length,
            temperature=1.0,
            top_k=50,
            top_p=0.95,
            min_p=0.0,
            repetition_penalty=1.0,
            presence_penalty=0.0,
            seed=0,
        )
    except TypeError:
        generated = clip.generate(tokens, max_length=length)
    except (AttributeError, NotImplementedError) as exc:
        raise ValueError(
            "The connected text encoder cannot generate text. Use an LLM-backed encoder "
            f"such as Gemma, or select an HTTP API format instead ({type(exc).__name__}: {exc})."
        ) from exc
    result = _strip_optimizer_output(clip.decode(generated))
    if not result:
        raise ValueError("The connected text encoder returned an empty prompt")
    return result


def _optimizer_media_label(item: _MediaInput, labels: Mapping[int, str] | None, ordinals: dict[str, int]) -> str:
    """Name a reference the way the prompt itself names it.

    Reference mode passes the resolved H3 tags, so a description can be tied to
    the exact `<Picture N>` the prompt mentions. Image mode has no tags, so the
    keyframe role is used instead, and anything unlabelled falls back to a
    per-type ordinal.
    """
    label = str((labels or {}).get(item.input_index) or "").strip()
    if label:
        return label
    ordinals[item.media_type] = ordinals.get(item.media_type, 0) + 1
    return f"{item.media_type} {ordinals[item.media_type]}"


def _optimizer_clip_descriptions(clip, items: list[_MediaInput], labels: Mapping[int, str] | None, max_length: int) -> tuple[str, int]:
    """Describe every connected media on its own, then return one text block.

    One pass per asset avoids each encoder's single-slot media limits: no
    stretching unrelated images into a shared batch, no video channel that
    shadows the reference images, and no audio clip lost because only one fits.
    The final optimization then runs on text alone.
    """
    lines = []
    ordinals: dict[str, int] = {}
    length = min(int(max_length), OPTIMIZER_CLIP_DESCRIBE_LENGTH)
    describable = [item for item in items if item.media_type in OPTIMIZER_CLIP_DESCRIBE_REQUESTS]
    if not describable:
        return "", 0
    started = time.perf_counter()
    _optimizer_log("describing %d connected media with the text encoder", len(describable))
    for index, item in enumerate(describable, start=1):
        request = OPTIMIZER_CLIP_DESCRIBE_REQUESTS[item.media_type]
        label = _optimizer_media_label(item, labels, ordinals)
        media, attached = _optimizer_clip_media(clip, [item])
        if not attached:
            # The encoder has no channel for this modality; saying nothing is
            # better than letting the prompt writer imagine the content.
            _optimizer_log("  %s (%d/%d): skipped, this encoder has no %s channel", label, index, len(describable), item.media_type)
            continue
        _optimizer_log("  %s (%d/%d): describing the %s...", label, index, len(describable), item.media_type)
        step = time.perf_counter()
        try:
            description = _optimizer_clip_generate(clip, OPTIMIZER_CLIP_DESCRIBE_SYSTEM, request, length, media)
        except ValueError as exc:
            logging.warning("MiniMax H3 Easy: could not describe %s for the prompt optimizer (%s).", label, exc)
            continue
        _optimizer_log("  %s (%d/%d): %.1fs, %d chars", label, index, len(describable), time.perf_counter() - step, len(description))
        lines.append(f"{label}: {description}")
    _optimizer_log("described %d of %d connected media in %.1fs", len(lines), len(describable), time.perf_counter() - started)
    return "\n".join(lines), len(lines)


def _optimizer_gguf_roots() -> list[str]:
    roots = []
    for name in OPTIMIZER_GGUF_DIRS:
        for path in _category_paths(name):
            if path and path not in roots:
                roots.append(path)
    return roots


def _is_mmproj_name(name: str) -> bool:
    return "mmproj" in os.path.basename(str(name or "")).lower()


def _optimizer_gguf_catalog() -> tuple[dict[str, str], dict[str, str]]:
    """Every .gguf under the text encoder / LLM folders, keyed by relative path.

    Deliberately the same folders ComfyUI-QwenVL-F scans, so a model installed
    for one is offered by the other. Vision projectors are split out by name.
    """
    models: dict[str, str] = {}
    projectors: dict[str, str] = {}
    for root in _optimizer_gguf_roots():
        for directory, _dirs, filenames in os.walk(root):
            for filename in filenames:
                if not filename.lower().endswith(".gguf"):
                    continue
                full = os.path.join(directory, filename)
                key = os.path.relpath(full, root).replace(os.sep, "/")
                target = projectors if _is_mmproj_name(filename) else models
                target.setdefault(key, full)
    return models, projectors


def _optimizer_gguf_lookup(catalog: Mapping[str, str], name: str) -> str:
    wanted = str(name or "").strip().replace("\\", "/")
    if not wanted:
        return ""
    if wanted in catalog:
        return catalog[wanted]
    lowered = wanted.lower()
    for key, path in catalog.items():
        if key.lower() == lowered or os.path.basename(key).lower() == lowered:
            return path
    return ""


def _optimizer_gguf_mmproj_path(model_path: str, requested: str, projectors: Mapping[str, str]) -> str:
    choice = str(requested or OPTIMIZER_GGUF_MMPROJ_AUTO).strip()
    if choice.lower() == OPTIMIZER_GGUF_MMPROJ_NONE:
        return ""
    if choice and choice.lower() != OPTIMIZER_GGUF_MMPROJ_AUTO:
        path = _optimizer_gguf_lookup(projectors, choice)
        if not path:
            raise ValueError(f"Vision projector not found: {choice}")
        return path
    # Auto: the first mmproj sitting next to the model.
    directory = os.path.dirname(model_path)
    for filename in sorted(os.listdir(directory) if os.path.isdir(directory) else []):
        if filename.lower().endswith(".gguf") and _is_mmproj_name(filename):
            return os.path.join(directory, filename)
    return ""


def _is_gemma_gguf_name(model_name: str) -> bool:
    return "gemma" in os.path.basename(str(model_name or "")).lower()


def _optimizer_gguf_chat_handler(model_name: str, mmproj_path: str):
    """Pick the llama_cpp vision handler that matches the model family.

    Handler classes differ between llama-cpp-python builds and forks, so the
    candidates are tried in order and a missing one is simply skipped.
    """
    lowered = os.path.basename(model_name).lower().replace("_", "-")
    if "gemma" in lowered:
        candidates = ("Gemma4ChatHandler", "Gemma3ChatHandler")
    elif "qwen3" in lowered:
        candidates = ("Qwen3VLChatHandler", "Qwen25VLChatHandler")
    elif "qwen2" in lowered or "qwen" in lowered:
        candidates = ("Qwen25VLChatHandler", "Qwen3VLChatHandler")
    elif "minicpm" in lowered:
        candidates = ("MiniCPMv26ChatHandler", "Llava15ChatHandler")
    else:
        candidates = ("Llava16ChatHandler", "Llava15ChatHandler")
    from llama_cpp import llama_chat_format

    for name in (*candidates, "Llava15ChatHandler"):
        handler = getattr(llama_chat_format, name, None)
        if handler is None:
            continue
        kwargs: dict[str, Any] = {"clip_model_path": mmproj_path, "verbose": False}
        # Qwen-style handlers reason by default; the optimizer only wants the
        # prompt text. Gemma's handler rejects the flag, and older builds of the
        # others do not know it either, hence the retry without it.
        if not _is_gemma_gguf_name(model_name):
            kwargs["force_reasoning"] = False
        try:
            return handler(**kwargs)
        except TypeError:
            kwargs.pop("force_reasoning", None)
            try:
                return handler(**kwargs)
            except Exception as exc:
                logging.warning("MiniMax H3 Easy: %s could not load the vision projector (%s).", name, exc)
        except Exception as exc:
            logging.warning("MiniMax H3 Easy: %s could not load the vision projector (%s).", name, exc)
    return None


_OPTIMIZER_GGUF_LOCK = threading.RLock()
_OPTIMIZER_GGUF_STATE: dict[str, Any] = {"signature": None, "llm": None, "vision": False}


def _optimizer_gguf_release() -> None:
    with _OPTIMIZER_GGUF_LOCK:
        llm = _OPTIMIZER_GGUF_STATE.get("llm")
        _OPTIMIZER_GGUF_STATE["llm"] = None
        _OPTIMIZER_GGUF_STATE["signature"] = None
        _OPTIMIZER_GGUF_STATE["vision"] = False
    if llm is not None:
        try:
            llm.close()
        except Exception:
            pass
        del llm
        try:
            comfy.model_management.soft_empty_cache()
        except Exception:
            pass


def _optimizer_gguf_model(settings: Mapping[str, Any], want_vision: bool):
    """Load (or reuse) the configured GGUF through llama-cpp-python."""
    try:
        from llama_cpp import Llama
    except ImportError as exc:
        raise ValueError(
            "llama-cpp-python is not installed. Install it in ComfyUI's Python environment "
            "to use the GGUF prompt optimizer."
        ) from exc

    models, projectors = _optimizer_gguf_catalog()
    requested = str(settings.get("gguf_model") or "").strip()
    if not requested:
        raise ValueError("Select a GGUF model in the prompt optimization settings")
    model_path = _optimizer_gguf_lookup(models, requested)
    if not model_path:
        roots = "\n".join(f"  - {path}" for path in _optimizer_gguf_roots()) or "  - (no model folder found)"
        raise ValueError(f"GGUF model not found: {requested}\nSearched:\n{roots}")
    mmproj_path = _optimizer_gguf_mmproj_path(model_path, settings.get("gguf_mmproj"), projectors) if want_vision else ""
    context = int(settings.get("gguf_context") or OPTIMIZER_GGUF_CONTEXT)
    gpu_layers = int(settings.get("gguf_gpu_layers", OPTIMIZER_GGUF_GPU_LAYERS))
    signature = (model_path, mmproj_path, context, gpu_layers)

    with _OPTIMIZER_GGUF_LOCK:
        if _OPTIMIZER_GGUF_STATE.get("llm") is not None and _OPTIMIZER_GGUF_STATE.get("signature") == signature:
            # The cached flag matters: a projector that failed to load leaves a
            # text-only model behind even though one was requested.
            return _OPTIMIZER_GGUF_STATE["llm"], bool(_OPTIMIZER_GGUF_STATE.get("vision"))
    _optimizer_gguf_release()

    handler = _optimizer_gguf_chat_handler(requested, mmproj_path) if mmproj_path else None
    kwargs: dict[str, Any] = {
        "model_path": model_path,
        "n_ctx": context,
        "n_gpu_layers": gpu_layers,
        "verbose": False,
    }
    if handler is not None:
        kwargs["chat_handler"] = handler
    _optimizer_log(
        "loading GGUF prompt optimizer %s (ctx=%d, gpu_layers=%d, vision=%s)...",
        os.path.basename(model_path), context, gpu_layers, bool(handler),
    )
    started = time.perf_counter()
    llm = Llama(**kwargs)
    _optimizer_log("GGUF loaded in %.1fs", time.perf_counter() - started)
    with _OPTIMIZER_GGUF_LOCK:
        _OPTIMIZER_GGUF_STATE["llm"] = llm
        _OPTIMIZER_GGUF_STATE["signature"] = signature
        _OPTIMIZER_GGUF_STATE["vision"] = handler is not None
    return llm, handler is not None


def _optimizer_gguf_call(llm, request: Mapping[str, Any], **extra):
    """Call llama-cpp, dropping the template kwargs an old build cannot take.

    `chat_template_kwargs` only reaches the Jinja renderer on recent builds;
    older ones raise `TypeError` for the unknown argument instead of ignoring
    it. Losing the thinking switch is better than losing the prompt.
    """
    try:
        return llm.create_chat_completion(**request, **extra)
    except TypeError:
        if "chat_template_kwargs" not in request:
            raise
        _optimizer_log("this llama-cpp build does not accept chat_template_kwargs; retrying without it")
        fallback = {key: value for key, value in request.items() if key != "chat_template_kwargs"}
        return llm.create_chat_completion(**fallback, **extra)


def _optimizer_gguf_stream(llm, request: dict[str, Any], should_stop) -> str:
    """Generate token by token so a cancel lands within one token.

    llama-cpp's `stopping_criteria` exists on `create_completion` but not on
    `create_chat_completion`, so the chat API can only be interrupted by walking
    its stream and closing it. Prompt evaluation still runs to completion before
    the first token arrives; nothing in llama-cpp interrupts that.
    """
    pieces: list[str] = []
    tokens = 0
    started = time.perf_counter()
    stream = _optimizer_gguf_call(llm, request, stream=True)
    try:
        for chunk in stream:
            choice = ((chunk.get("choices") or [{}])[0]) if isinstance(chunk, Mapping) else {}
            delta = choice.get("delta") if isinstance(choice.get("delta"), Mapping) else choice.get("message")
            piece = (delta or {}).get("content") if isinstance(delta, Mapping) else None
            if piece:
                pieces.append(str(piece))
                tokens += 1
            if should_stop():
                raise _OptimizerCancelled("Prompt optimization was cancelled")
    finally:
        # Closing the generator unwinds llama-cpp's own sampling loop, which is
        # what actually frees the GPU when the user stops early.
        try:
            stream.close()
        except Exception:
            pass
    elapsed = time.perf_counter() - started
    _optimizer_log("generated %d tokens in %.1fs (%.1f tok/s)", tokens, elapsed, tokens / max(elapsed, 1e-6))
    return "".join(pieces)


def _optimizer_gguf_chat(
    llm,
    system_prompt: str,
    user_text: str,
    parts: list[dict[str, Any]],
    max_tokens: int,
    gemma: bool,
    should_stop=None,
) -> str:
    """One llama-cpp turn with reasoning off and cancellation wired in."""
    # Qwen switches reasoning off with an inline token; Gemma has no equivalent
    # and relies on the handler flag plus the output cleanup. The optimizer's
    # answer is used as the prompt verbatim, so a thinking block is never wanted.
    text = user_text if gemma else f"/no_think\n{user_text}"
    stop = ["<|turn>", "<|channel>", "<end_of_turn>", "<start_of_turn>"] if gemma else ["<|im_end|>", "<|im_start|>"]
    content: Any = [{"type": "text", "text": text}, *parts] if parts else text
    request = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        "max_tokens": int(max_tokens),
        "temperature": 0.7,
        "top_p": 0.95,
        "seed": 0,
        "stop": stop,
        # Newer Qwen templates dropped the `/no_think` token for a template
        # variable. llama-cpp only forwards this when it renders a Jinja
        # template, and ignores it otherwise, so sending both is the only way to
        # cover the whole family.
        "chat_template_kwargs": {"enable_thinking": False},
    }
    if should_stop is not None:
        return _strip_optimizer_output(_optimizer_gguf_stream(llm, request, should_stop))
    step = time.perf_counter()
    result = _optimizer_gguf_call(llm, request)
    generated = time.perf_counter() - step
    usage = result.get("usage") if isinstance(result, Mapping) else None
    tokens = (usage or {}).get("completion_tokens") if isinstance(usage, Mapping) else None
    if isinstance(tokens, int) and tokens > 0:
        _optimizer_log("generated %d tokens in %.1fs (%.1f tok/s)", tokens, generated, tokens / max(generated, 1e-6))
    else:
        _optimizer_log("generation finished in %.1fs", generated)
    choices = result.get("choices") if isinstance(result, Mapping) else None
    message = (choices or [{}])[0].get("message") if choices else None
    return _strip_optimizer_output((message or {}).get("content"))


def _optimizer_gguf_describe(
    settings: Mapping[str, Any],
    media_items: Sequence[Mapping[str, Any]],
    should_stop=None,
) -> tuple[str, int]:
    """Describe every attachable media on its own, then return one text block.

    Same reasoning as the text-encoder path, plus two benefits that matter for a
    local model: each pass carries one image and a two-line system prompt instead
    of the whole reference set behind the entire prompt guide, and cancellation
    is honoured between assets as well as during generation.
    """
    describable = [item for item in media_items if str(item.get("type")) in OPTIMIZER_CLIP_DESCRIBE_REQUESTS]
    if not describable:
        return "", 0
    llm, vision = _optimizer_gguf_model(settings, True)
    if not vision:
        logging.warning("MiniMax H3 Easy: no vision projector for this GGUF; optimizing from text only.")
        return "", 0
    gemma = _is_gemma_gguf_name(str(settings.get("gguf_model") or ""))
    length = min(int(settings.get("local_max_length") or PROMPT_OPTIMIZER_CLIP_MAX_LENGTH), OPTIMIZER_CLIP_DESCRIBE_LENGTH)
    started = time.perf_counter()
    _optimizer_log("describing %d connected media with the GGUF, one at a time", len(describable))
    try:
        lines = _optimizer_gguf_describe_each(llm, describable, gemma, length, should_stop)
    except _OptimizerCancelled:
        _optimizer_gguf_release()
        raise
    _optimizer_log("described %d of %d connected media in %.1fs", len(lines), len(describable), time.perf_counter() - started)
    return "\n".join(lines), len(lines)


def _optimizer_gguf_describe_each(llm, describable, gemma: bool, length: int, should_stop) -> list[str]:
    lines: list[str] = []
    for index, item in enumerate(describable, start=1):
        if should_stop is not None and should_stop():
            raise _OptimizerCancelled("Prompt optimization was cancelled")
        media_type = str(item.get("type"))
        label = str(item.get("tag") or f"{media_type} {index}")
        parts = list(item.get("parts") or [])
        # llama-cpp has no video channel, so a clip arrives as ordered stills.
        request = (
            OPTIMIZER_VIDEO_STILLS_REQUEST.format(count=len(parts))
            if item.get("sampled") else OPTIMIZER_CLIP_DESCRIBE_REQUESTS[media_type]
        )
        if not parts:
            # Saying nothing is better than letting the prompt writer imagine
            # the content.
            _optimizer_log("  %s (%d/%d): skipped, llama-cpp takes no %s", label, index, len(describable), media_type)
            continue
        _optimizer_log(
            "  %s (%d/%d): describing the %s from %d image%s...",
            label, index, len(describable), media_type, len(parts), "" if len(parts) == 1 else "s",
        )
        step = time.perf_counter()
        try:
            description = _optimizer_gguf_chat(
                llm, OPTIMIZER_CLIP_DESCRIBE_SYSTEM, request, parts, length, gemma, should_stop,
            )
        except _OptimizerCancelled:
            raise
        except Exception as exc:
            logging.warning("MiniMax H3 Easy: could not describe %s for the prompt optimizer (%s).", label, exc)
            continue
        if not description:
            _optimizer_log("  %s (%d/%d): skipped, the model returned nothing", label, index, len(describable))
            continue
        _optimizer_log("  %s (%d/%d): %.1fs, %d chars", label, index, len(describable), time.perf_counter() - step, len(description))
        lines.append(f"{label}: {description}")
    return lines


def _optimizer_gguf_json(
    settings: Mapping[str, Any],
    system_prompt: str,
    user_prompt: str,
    media_parts: list[dict[str, Any]] | None = None,
    should_stop=None,
    context: str = "",
    keep_vision: bool = False,
) -> str:
    """Run the prompt through a local GGUF and return the rewritten text."""
    images = [part for part in (media_parts or []) if part.get("type") == "image_url"]
    started = time.perf_counter()
    # Announced once the model resolves, so a misconfigured run reports the
    # problem instead of claiming to start. Loading has its own progress line.
    # keep_vision holds the projector in the signature after a describe pass, so
    # the text-only final pass reuses that model instead of reloading it.
    llm, vision = _optimizer_gguf_model(settings, bool(images) or keep_vision)
    _optimizer_log(
        "optimizing the prompt with GGUF %s (guide=%d chars, prompt=%d chars, images=%d, descriptions=%d chars)",
        str(settings.get("gguf_model") or ""), len(system_prompt), len(user_prompt), len(images), len(context),
    )
    if images and not vision:
        logging.warning("MiniMax H3 Easy: no vision projector for this GGUF; optimizing from text only.")
        images = []
    gemma = _is_gemma_gguf_name(str(settings.get("gguf_model") or ""))
    user_text = f"=== CONNECTED MEDIA ===\n{context.strip()}\n\n=== USER PROMPT ===\n{user_prompt}" if context.strip() else user_prompt
    max_tokens = int(settings.get("local_max_length") or PROMPT_OPTIMIZER_CLIP_MAX_LENGTH)
    _optimizer_log("generating (max_tokens=%d, images=%d)...", max_tokens, len(images))
    try:
        text = _optimizer_gguf_chat(llm, system_prompt, user_text, images, max_tokens, gemma, should_stop)
    except _OptimizerCancelled:
        # Stopping hands the VRAM back. Keeping a model resident for a
        # generation the user abandoned is the opposite of what they asked for.
        _optimizer_gguf_release()
        raise
    finally:
        if bool(settings.get("gguf_unload_after")):
            _optimizer_gguf_release()
    if not text:
        raise ValueError("The GGUF model returned an empty prompt")
    _optimizer_log("prompt optimization finished in %.1fs (%d chars)", time.perf_counter() - started, len(text))
    return text


def _notify_prompt_optimized(node_id: Any, prompt: str) -> None:
    """Mirror an execution-time optimization back into the node's editor.

    Best effort only: a headless or API run has no listener, and the prompt
    that was actually generated is already in the conditioning either way.
    """
    if node_id is None:
        return
    try:
        from server import PromptServer

        instance = getattr(PromptServer, "instance", None)
        if instance is None:
            return
        instance.send_sync(PROMPT_OPTIMIZER_EVENT, {"node_id": str(node_id), "prompt": str(prompt)})
    except Exception:
        pass


class MiniMaxH3PromptOptimizer:
    CATEGORY = "MiniMax H3 Easy"
    FUNCTION = "optimize"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("optimized_prompt",)
    OUTPUT_NODE = True
    DESCRIPTION = "Optimize a MiniMax H3 prompt with the complete node-adapted Prompt Guide."

    @classmethod
    def INPUT_TYPES(cls):
        manifest = _prompt_guide_manifest()
        scene_items = manifest.get("scene_guides") if isinstance(manifest.get("scene_guides"), list) else []
        choices = [str(item.get("id")) for item in scene_items if isinstance(item, dict) and item.get("id")] or ["none"]
        return {
            "required": {
                "prompt": ("STRING", {"multiline": True, "default": ""}),
                "mode": ([MODE_IMAGE, MODE_REFERENCE], {"default": MODE_IMAGE}),
                "seconds": ("FLOAT", {"default": 5.0, "min": MIN_SECONDS, "max": MAX_SECONDS, "step": 0.1}),
                "scene_guide": (choices, {"default": "none"}),
                "api_format": (["openai", "gemini"], {"default": "openai"}),
                "api_url": ("STRING", {"default": ""}),
                "api_key": ("STRING", {"default": "", "multiline": False, "password": True}),
                "model": ("STRING", {"default": ""}),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def optimize(self, prompt, mode, seconds, scene_guide, api_format, api_url, api_key, model):
        if not str(api_key or "").strip():
            raise ValueError("Prompt optimization API key is required")
        if not str(model or "").strip():
            raise ValueError("Prompt optimization model is required")
        counts = {"image": 0, "video": 0, "audio": 0}
        system = _optimizer_system_prompt(str(scene_guide or "none"), str(mode or MODE_IMAGE), float(seconds), counts)
        return (_optimizer_http_json(str(api_url), str(api_key), str(model), str(api_format or "openai"), system, str(prompt or "")),)


def _register_prompt_optimizer_route() -> bool:
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception:
        return False
    routes = getattr(getattr(PromptServer, "instance", None), "routes", None)
    if routes is None or getattr(_register_prompt_optimizer_route, "_registered", False):
        return bool(getattr(_register_prompt_optimizer_route, "_registered", False))

    @routes.get("/minimax_h3_easy/prompt_optimizer_settings")
    async def _prompt_optimizer_settings_get(request):
        return web.json_response({"ok": True, "settings": _read_prompt_optimizer_config()})

    @routes.get("/minimax_h3_easy/gguf_models")
    async def _gguf_models_get(request):
        try:
            models, projectors = await asyncio.to_thread(_optimizer_gguf_catalog)
            return web.json_response({
                "ok": True,
                "models": sorted(models),
                "mmproj": sorted(projectors),
                "roots": _optimizer_gguf_roots(),
            })
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=500)

    @routes.post("/minimax_h3_easy/prompt_optimizer_settings")
    async def _prompt_optimizer_settings_post(request):
        try:
            payload = await request.json()
            settings = _write_prompt_optimizer_config(payload if isinstance(payload, dict) else {})
            return web.json_response({"ok": True, "settings": settings})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=500)

    @routes.post("/minimax_h3_easy/prompt_optimize_cancel")
    async def _prompt_optimize_cancel(request):
        try:
            payload = await request.json()
            request_id = str((payload or {}).get("request_id") or "")
            if not _optimizer_cancel(request_id):
                return web.json_response({"ok": False, "error": "A request id is required"}, status=400)
            _optimizer_log("cancel requested for prompt optimization %s", request_id)
            return web.json_response({"ok": True})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=500)

    @routes.post("/minimax_h3_easy/prompt_optimize")
    async def _prompt_optimize(request):
        request_id = ""
        try:
            payload = await request.json()
            request_id = str(payload.get("request_id") or "")
            prompt = str(payload.get("prompt") or "")
            settings = _read_prompt_optimizer_config()
            api_key = str(settings.get("api_key") or "")
            api_url = str(settings.get("api_url") or "")
            model = str(settings.get("model") or "")
            api_format = str(settings.get("api_format") or "openai").lower()
            mode = str(payload.get("mode") or MODE_IMAGE)
            scene_guide = str(payload.get("scene_guide") or "none")
            seconds = min(MAX_SECONDS, max(MIN_SECONDS, float(payload.get("seconds") or 5.0)))
            if api_format == OPTIMIZER_FORMAT_CLIP:
                # The optimizer CLIP only exists while the graph runs, so this
                # format cannot be served from an editor-time request.
                return web.json_response({
                    "ok": False,
                    "error": "The text encoder format optimizes the prompt when the workflow runs.",
                    "deferred": True,
                }, status=400)
            if api_format not in {OPTIMIZER_FORMAT_OPENAI, OPTIMIZER_FORMAT_GEMINI, OPTIMIZER_FORMAT_GGUF}:
                return web.json_response({"ok": False, "error": "Unsupported API format"}, status=400)
            local = api_format == OPTIMIZER_FORMAT_GGUF
            if not prompt.strip():
                return web.json_response({"ok": False, "error": "Prompt optimization settings are incomplete"}, status=400)
            if local and not str(settings.get("gguf_model") or "").strip():
                return web.json_response({"ok": False, "error": "Select a GGUF model in the prompt optimization settings"}, status=400)
            if not local and (not api_key.strip() or not api_url.strip() or not model.strip()):
                return web.json_response({"ok": False, "error": "Prompt optimization settings are incomplete"}, status=400)
            raw_counts = payload.get("media_counts") if isinstance(payload.get("media_counts"), dict) else {}
            counts = {kind: max(0, min(MAX_MEDIA, int(raw_counts.get(kind, 0) or 0))) for kind in ("image", "video", "audio")}
            resources = payload.get("resources") if isinstance(payload.get("resources"), list) else []
            # llama-cpp takes the same OpenAI-shaped image parts as the HTTP
            # chat-completions format, so the media builder is shared.
            parts_format = OPTIMIZER_FORMAT_OPENAI if local else api_format
            media_items = _optimizer_media_items(resources, parts_format) if bool(settings.get("read_media")) else []
            # The GGUF loop polls this, so cancelling actually stops the
            # generation instead of only freeing the editor.
            should_stop = (lambda: _optimizer_is_cancelled(request_id)) if request_id else None
            describe = local and bool(settings.get("gguf_describe_media")) and bool(media_items)
            described, described_count = "", 0
            _optimizer_raise_if_cancelled(request_id)
            if describe:
                described, described_count = await asyncio.to_thread(
                    _optimizer_gguf_describe, settings, media_items, should_stop,
                )
                _optimizer_raise_if_cancelled(request_id)
            attached = [] if describe else [item for item in media_items if item["parts"]]
            media_parts = [part for item in attached for part in item["parts"]]
            # Counted by reference, not by part: a sampled video is one
            # reference even though it arrives as several frames.
            system = _optimizer_system_prompt(
                scene_guide, mode, seconds, counts, len(attached), described_count,
                _optimizer_media_manifest(attached),
            )
            if local:
                result = await asyncio.to_thread(
                    _optimizer_gguf_json, settings, system, prompt, media_parts,
                    should_stop, described, describe,
                )
            else:
                result = await asyncio.to_thread(_optimizer_http_json, api_url, api_key, model, api_format, system, prompt, media_parts)
            # An HTTP request cannot be interrupted mid-flight, so a late cancel
            # is honoured by throwing the answer away.
            _optimizer_raise_if_cancelled(request_id)
            return web.json_response({"ok": True, "prompt": result})
        except _OptimizerCancelled as exc:
            # Nothing is running in a worker thread at this point, so freeing a
            # model the cancelled run had loaded is safe here.
            _optimizer_gguf_release()
            _optimizer_log("prompt optimization cancelled")
            return web.json_response({"ok": False, "cancelled": True, "error": str(exc)}, status=409)
        except asyncio.CancelledError:
            # The editor went away (tab closed, page reloaded). Stop the work
            # the same way an explicit cancel would. The model is *not* freed
            # from here: the worker thread outlives this handler and does it
            # itself once it sees the cancel.
            _optimizer_cancel(request_id)
            raise
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)}, status=500)
        finally:
            _optimizer_forget_cancel(request_id)

    _register_prompt_optimizer_route._registered = True
    return True


def _register_prompt_optimizer_route_when_ready() -> None:
    if _register_prompt_optimizer_route():
        return

    def wait_for_server() -> None:
        # ComfyUI creates PromptServer shortly after custom-node imports. Retry
        # for a bounded period without delaying node import.
        for _ in range(2400):
            if _register_prompt_optimizer_route():
                return
            threading.Event().wait(0.05)

    threading.Thread(target=wait_for_server, daemon=True, name="MiniMaxH3PromptOptimizerRoute").start()


def _role_choices(role: str, categories: tuple[str, ...], fallback: str) -> list[str]:
    names = _collect_weight_names(categories)
    selected = [name for name in names if _has_role(name, role)]
    return _sort_model_names(selected) or [fallback]


def _optional_role_choices(role: str, categories: tuple[str, ...]) -> list[str]:
    names = _collect_weight_names(categories)
    selected = _sort_model_names([name for name in names if _has_role(name, role)])
    # ComfyUI validates combo values before invoking the node. The frontend
    # localizes the sentinel to either "None" or "无", so all display values
    # must also be accepted by the server-side combo definition.
    return [*selected, *NONE_MODEL_DISPLAY_VALUES]


def _filtered_choices(category: str, needles: tuple[str, ...], fallback: str) -> list[str]:
    names = _collect_weight_names((category,))
    selected = [name for name in names if any(needle.lower() in _normalise_model_name(name).replace(" ", "") for needle in needles)]
    return _sort_model_names(selected) or [fallback]


def _model_choices() -> list[str]:
    return _optional_role_choices("fl2va", ("diffusion_models", "unet", "unet_gguf"))


def _ref_model_choices() -> list[str]:
    return _optional_role_choices("ref2va", ("diffusion_models", "unet", "unet_gguf"))


def _clip_choices() -> list[str]:
    return _role_choices("text_encoder", ("text_encoders", "clip", "clip_gguf"), "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors")


def _vae_choices(needles: tuple[str, ...], fallback: str) -> list[str]:
    role = "video_vae" if any("video" in needle.lower() for needle in needles) else "audio_vae"
    return _role_choices(role, ("vae",), fallback)


@lru_cache(maxsize=16)
def _registered_node_class(*names: str):
    """Find an optional custom-node class without importing it unconditionally."""
    mappings = getattr(nodes, "NODE_CLASS_MAPPINGS", {})
    for name in names:
        node_class = mappings.get(name) if hasattr(mappings, "get") else None
        if node_class is not None:
            return node_class
        node_class = getattr(nodes, name, None)
        if node_class is not None:
            return node_class
    for module in tuple(sys.modules.values()):
        if module is None:
            continue
        for name in names:
            node_class = getattr(module, name, None)
            if node_class is not None:
                return node_class
    return None


def _load_gguf_unet(model_name: str):
    loader_class = _registered_node_class("UnetLoaderGGUF", "UNETLoaderGGUF", "UnetLoaderGGUFAdvanced")
    if loader_class is None:
        raise RuntimeError(
            "检测到 GGUF MiniMax H3 主模型，但当前 ComfyUI 未安装 GGUF 加载节点。"
            "请安装 ComfyUI-GGUF 后重启 ComfyUI。"
        )
    loader = loader_class()
    return loader.load_unet(model_name)[0]


def _load_text_encoder(text_encoder: str):
    if not _is_gguf_file(text_encoder):
        return nodes.CLIPLoader().load_clip(text_encoder, "minimax", "default")[0]

    loader_class = _registered_node_class("CLIPLoaderGGUF", "CLIPLoaderGGUFAdvanced")
    if loader_class is None:
        raise RuntimeError(
            "检测到 GGUF MiniMax H3 文本编码器，但当前 ComfyUI 未安装 GGUF 加载节点。"
            "请安装 ComfyUI-GGUF 后重启 ComfyUI。"
        )
    loader = loader_class()
    try:
        return loader.load_clip(text_encoder, "minimax")[0]
    except TypeError:
        return loader.load_clip(text_encoder, type="minimax")[0]


@dataclass
class MiniMaxH3Bundle:
    fl2va_model_name: str
    ref2va_model_name: str
    clip_name: str
    video_vae_name: str
    audio_vae_name: str
    clip: Any
    video_vae: Any
    audio_vae: Any
    fl2va_model_obj: Any = None
    ref2va_model_obj: Any = None

    def __post_init__(self) -> None:
        self._model = None
        self._model_kind = ""
        self._model_name = ""
        self._lock = threading.RLock()

    def _model_name_for(self, kind: str) -> str:
        """Return the preferred model, falling back to the other H3 model.

        FL2VA and REF2VA are exposed as separate choices when both are
        installed, but a user may intentionally install only one of them for
        testing. In that case, let the remaining transformer serve either
        generation path instead of rejecting the mode before execution.
        """
        requested_kind = "ref2va" if kind == "ref2va" else "fl2va"
        preferred = self.ref2va_model_name if requested_kind == "ref2va" else self.fl2va_model_name
        if not _is_none_model(preferred):
            return preferred

        fallback = self.fl2va_model_name if requested_kind == "ref2va" else self.ref2va_model_name
        if not _is_none_model(fallback):
            return fallback

        if requested_kind == "ref2va":
            raise ValueError("Reference Video mode requires at least one MiniMax H3 transformer model.")
        raise ValueError("Text-to-video and I2V or First/Last Frame mode require at least one MiniMax H3 transformer model.")

    def _model_object_for(self, kind: str):
        """Return an already-loaded transformer, falling back to the other role."""
        requested_kind = "ref2va" if kind == "ref2va" else "fl2va"
        preferred = self.ref2va_model_obj if requested_kind == "ref2va" else self.fl2va_model_obj
        if preferred is not None:
            return preferred
        fallback = self.fl2va_model_obj if requested_kind == "ref2va" else self.ref2va_model_obj
        return fallback

    def model_for(self, kind: str):
        kind = "ref2va" if kind == "ref2va" else "fl2va"
        with self._lock:
            supplied_model = self._model_object_for(kind)
            if supplied_model is not None:
                return supplied_model
            model_name = self._model_name_for(kind)
            if self._model is not None and self._model_name == model_name:
                return self._model

            if self._model is not None:
                self._model = None
                self._model_kind = ""
                self._model_name = ""
                comfy.model_management.soft_empty_cache()

            if _is_gguf_file(model_name):
                self._model = _load_gguf_unet(model_name)
            else:
                self._model, = nodes.UNETLoader().load_unet(model_name, "default")
            self._model_kind = kind
            self._model_name = model_name
            return self._model


@dataclass(frozen=True)
class MiniMaxH3Context:
    conditioning: Any
    latent: Any
    video_vae: Any
    audio_vae: Any
    fps: float


@dataclass(frozen=True)
class _MediaInput:
    input_index: int
    media_type: str
    value: Any


class MiniMaxH3EasyLoader:
    CATEGORY = "MiniMax H3 Easy"
    FUNCTION = "load"
    RETURN_TYPES = ("MINIMAX_H3_BUNDLE",)
    RETURN_NAMES = ("h3_bundle",)
    DESCRIPTION = "Load either or both MiniMax H3 transformers, plus the text encoder and both AV VAEs."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "fl2va_model": (_model_choices(),),
                "ref2va_model": (_ref_model_choices(),),
                "text_encoder": (_clip_choices(),),
                "video_vae": (_vae_choices(("minimax_h3_video_vae",), "minimax_h3_video_vae_fp16.safetensors"),),
                "audio_vae": (_vae_choices(("minimax_h3_audio_vae",), "minimax_h3_audio_vae_fp32.safetensors"),),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return "|".join(str(kwargs.get(key, "")) for key in ("fl2va_model", "ref2va_model", "text_encoder", "video_vae", "audio_vae"))

    def load(self, fl2va_model, ref2va_model, text_encoder, video_vae, audio_vae):
        if _is_none_model(fl2va_model) and _is_none_model(ref2va_model):
            raise ValueError("Select at least one MiniMax H3 transformer: FL2VA or REF2VA.")
        clip = _load_text_encoder(text_encoder)
        video_vae_obj, = nodes.VAELoader().load_vae(video_vae)
        audio_vae_obj, = nodes.VAELoader().load_vae(audio_vae)
        return (MiniMaxH3Bundle(
            fl2va_model_name=fl2va_model,
            ref2va_model_name=ref2va_model,
            clip_name=text_encoder,
            video_vae_name=video_vae,
            audio_vae_name=audio_vae,
            clip=clip,
            video_vae=video_vae_obj,
            audio_vae=audio_vae_obj,
        ),)


class MiniMaxH3EasyModelAdapter:
    CATEGORY = "MiniMax H3 Easy"
    FUNCTION = "assemble"
    RETURN_TYPES = ("MINIMAX_H3_BUNDLE",)
    RETURN_NAMES = ("h3_bundle",)
    DESCRIPTION = "Assemble standard ComfyUI MODEL, CLIP and VAE outputs into a MiniMax H3 bundle."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text_encoder": ("CLIP",),
                "video_vae": ("VAE",),
                "audio_vae": ("VAE",),
            },
            "optional": {
                "fl2va_model": ("MODEL",),
                "ref2va_model": ("MODEL",),
            },
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    @staticmethod
    def assemble(text_encoder, video_vae, audio_vae, fl2va_model=None, ref2va_model=None):
        if fl2va_model is None and ref2va_model is None:
            raise ValueError("Connect at least one transformer MODEL: FL2VA or REF2VA.")
        return (MiniMaxH3Bundle(
            fl2va_model_name=NONE_MODEL,
            ref2va_model_name=NONE_MODEL,
            clip_name="connected",
            video_vae_name="connected",
            audio_vae_name="connected",
            clip=text_encoder,
            video_vae=video_vae,
            audio_vae=audio_vae,
            fl2va_model_obj=fl2va_model,
            ref2va_model_obj=ref2va_model,
        ),)


def _infer_media_type(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, torch.Tensor):
        return "image"
    if isinstance(value, Mapping) and "waveform" in value:
        return "audio"
    if hasattr(value, "get_components"):
        return "video"
    return "video"


def _audio_sample_rate(audio: Mapping) -> int:
    return int(audio.get("sample_rate") or audio.get("samplerate") or audio.get("sampler_rate") or 32000)


def _video_parts(value: Any) -> tuple[torch.Tensor, dict | None, float]:
    if hasattr(value, "get_components"):
        components = value.get_components()
        return components.images, components.audio, float(components.frame_rate or 24.0)
    if isinstance(value, Mapping):
        frames = value.get("images")
        if frames is None:
            frames = value.get("frames")
        if isinstance(frames, torch.Tensor):
            return frames, value.get("audio"), float(value.get("fps") or value.get("frame_rate") or 24.0)
    if isinstance(value, torch.Tensor) and value.ndim == 4:
        return value, None, 24.0
    raise ValueError("Unsupported reference video payload")


def _resample_video_frames(frames: torch.Tensor, source_fps: float) -> torch.Tensor:
    if not source_fps or abs(source_fps - h3.FPS) < 0.01:
        return frames
    count = max(1, round(frames.shape[0] * h3.FPS / source_fps))
    indexes = torch.linspace(0, frames.shape[0] - 1, count, device=frames.device).round().long()
    return frames[indexes]


def _encode_reference_audio(audio_vae, audio: Mapping, max_seconds: float | None = None):
    waveform = audio["waveform"]
    sample_rate = _audio_sample_rate(audio)
    if max_seconds and max_seconds > 0:
        # A reference video is truncated to the generated length, so its
        # soundtrack has to follow: an untrimmed track both desynchronises the
        # pair and costs VRAM linear in its duration.
        limit = int(round(max_seconds * sample_rate))
        if 0 < limit < waveform.shape[-1]:
            waveform = waveform[..., :limit]
    vae_sample_rate = int(getattr(audio_vae, "audio_sample_rate", 32000))
    if sample_rate != vae_sample_rate:
        waveform = torchaudio.functional.resample(waveform, sample_rate, vae_sample_rate)
    seconds = waveform.shape[-1] / max(1, vae_sample_rate)
    logging.info("MiniMax H3 Easy: encoding %.2fs of reference audio", seconds)
    try:
        latent = audio_vae.encode(waveform[:1].movedim(1, -1))
    except IndexError as exc:
        # ComfyUI retries a failed VAE encode with 2D image tiling, which cannot
        # take this VAE's 3D waveform and dies with "tuple index out of range"
        # instead of reporting the out-of-memory that triggered the retry.
        raise RuntimeError(
            f"Ran out of memory encoding {seconds:.1f}s of reference audio. The MiniMax H3 audio "
            "VAE needs roughly 0.12 GB of VRAM per second of audio, plus 0.4 GB. Shorten the "
            "reference audio or free VRAM."
        ) from exc
    return latent, latent.shape[-1]


def _resolve_reference_prompt(
    prompt: str,
    tag_by_input: dict[int, str],
    soundtrack_pairs: list[tuple[int, int]],
    video_count: int,
    standalone_audio_count: int,
) -> str:
    # A workflow may intentionally contain fewer/more @ references than the
    # currently connected media. Resolve valid placeholders, but preserve
    # stale internal placeholders so the user's original reference is not
    # silently discarded; the downstream model decides how to handle it.
    source_prompt = str(prompt or "")
    resolved = REFERENCE_PLACEHOLDER_RE.sub(
        lambda match: tag_by_input.get(int(match.group(1)), ""),
        source_prompt,
    )
    if soundtrack_pairs and (video_count > 1 or standalone_audio_count > 0):
        provenance = [
            f"<Audio {audio_index}> is the synchronized audio track of <Video {video_index}>."
            for audio_index, video_index in soundtrack_pairs
        ]
        return "\n".join((*provenance, resolved))
    return resolved


def _align_canvas_dimension(value: float) -> int:
    return max(h3.CANVAS_MULTIPLE, round(float(value) / h3.CANVAS_MULTIPLE) * h3.CANVAS_MULTIPLE)


def _canvas_dimensions(resolution: str, aspect_ratio: str, custom_width: int, custom_height: int) -> tuple[int, int]:
    if str(resolution) == RESOLUTION_CUSTOM:
        return _align_canvas_dimension(custom_width), _align_canvas_dimension(custom_height)

    megapixels = RESOLUTION_MEGAPIXELS.get(str(resolution), RESOLUTION_MEGAPIXELS[RESOLUTION_480])
    ratio_w, ratio_h = ASPECT_RATIOS.get(str(aspect_ratio), ASPECT_RATIOS[ASPECT_WIDESCREEN])
    total_pixels = megapixels * 1024 * 1024
    scale = math.sqrt(total_pixels / (ratio_w * ratio_h))
    return _align_canvas_dimension(ratio_w * scale), _align_canvas_dimension(ratio_h * scale)


def _frame_length(seconds: float, fps: float) -> int:
    target_frames = max(5.0, float(seconds) * float(fps))
    block_count = max(0, round((target_frames - 5) / 17))
    return block_count * 17 + 5


def _empty_image_conditioning(bundle, prompt, width, height, length, first_frame=None, last_frame=None):
    latent, frame_count = h3._empty_av_latent(width, height, length)
    images = []
    keyframes = []
    if first_frame is not None:
        image = h3._resize(first_frame[:1], width, height, "disabled")
        images.append(image)
        keyframes.append({"resolved_frame_index": 0, "image": image})
    if last_frame is not None:
        image = h3._resize(last_frame[:1], width, height, "center")
        images.append(image)
        keyframes.append({"resolved_frame_index": frame_count - 1, "image": image})

    tokens = bundle.clip.tokenize(prompt, images=images)
    conditioning = bundle.clip.encode_from_tokens_scheduled(tokens)
    if keyframes:
        for keyframe in keyframes:
            keyframe["latent"] = bundle.video_vae.encode(keyframe.pop("image"))
        conditioning = node_helpers.conditioning_set_values(conditioning, {
            "minimax_keyframes": keyframes,
            "minimax_frame_count": frame_count,
        })
    return conditioning, latent


def _reference_conditioning(bundle, prompt, width, height, length, ref_image_size, items: list[_MediaInput], prompt_transform=None):
    latent, frame_count = h3._empty_av_latent(width, height, length)
    ref_items = []
    ref_blocks = []
    tag_by_input: dict[int, str] = {}
    soundtrack_pairs: list[tuple[int, int]] = []
    images = [item for item in items if item.media_type == "image"]
    videos = [item for item in items if item.media_type == "video"]
    audios = [item for item in items if item.media_type == "audio"]
    audio_ordinal = 0

    # Match the official H3 presentation order: images, videos (with each
    # synchronized soundtrack immediately before its video), standalone audio.
    for picture_ordinal, item in enumerate(images, start=1):
        image = item.value
        if not isinstance(image, torch.Tensor) or image.ndim != 4:
            raise ValueError("Image references must be IMAGE tensors")
        image_h, image_w = image.shape[1], image.shape[2]
        size_mode = str(ref_image_size or REF_IMAGE_1K)
        if size_mode == REF_IMAGE_ORIGINAL:
            # The explicit original mode keeps the incoming pixels untouched.
            # The VAE reports the latent grid actually produced for arbitrary
            # source dimensions, so no image-side 32-pixel resampling is needed.
            resized = image[:1]
            z = bundle.video_vae.encode(resized)
            ref_items.append({"type": "image", "data": resized})
            ref_blocks.append({
                "kind": "image",
                "latent_h": int(z.shape[-2]),
                "latent_w": int(z.shape[-1]),
                "latent": z,
            })
            tag_by_input[item.input_index] = f"<Picture {picture_ordinal}>"
            continue
        if size_mode == REF_IMAGE_MATCH:
            target_area = width * height
        else:
            target_area = REFERENCE_IMAGE_AREAS.get(size_mode, REFERENCE_IMAGE_AREAS[REF_IMAGE_1K])
        # Use one uniform scale factor for both axes so no non-uniform
        # stretching is introduced before H3's internal size alignment.
        scale = min(1.0, math.sqrt(target_area / max(1, image_w * image_h)))
        target_w, target_h = _reference_aligned_size(image_w, image_h, scale)
        resized = h3._resize(image[:1], target_w, target_h, "disabled")
        ref_items.append({"type": "image", "data": resized})
        ref_blocks.append({"kind": "image", "latent_h": target_h // 16, "latent_w": target_w // 16, "latent": bundle.video_vae.encode(resized)})
        tag_by_input[item.input_index] = f"<Picture {picture_ordinal}>"

    for video_ordinal, item in enumerate(videos, start=1):
        frames, soundtrack, source_fps = _video_parts(item.value)
        frames = _resample_video_frames(frames, source_fps)
        video_h, video_w = frames.shape[1], frames.shape[2]
        canvas_w, canvas_h = h3.adapt_canvas(video_w, video_h)
        if video_w * video_h < canvas_w * canvas_h:
            canvas_w = max(h3.CANVAS_MULTIPLE, round(video_w / h3.CANVAS_MULTIPLE) * h3.CANVAS_MULTIPLE)
            canvas_h = max(h3.CANVAS_MULTIPLE, round(video_h / h3.CANVAS_MULTIPLE) * h3.CANVAS_MULTIPLE)
        frames = h3._resize(frames, canvas_w, canvas_h, "disabled")
        if frames.shape[0] > frame_count:
            frames = frames[:frame_count]
        count = frames.shape[0]
        if count < 5:
            raise ValueError("Reference videos need at least 5 frames")
        while count % 17 != 5:
            count -= 1
        frames = frames[:count]
        video_latent = bundle.video_vae.encode(frames)
        audio_latent = None
        audio_t = 0
        if soundtrack is not None:
            audio_latent, audio_t = _encode_reference_audio(
                bundle.audio_vae, soundtrack, max_seconds=count / h3.FPS
            )
            audio_ordinal += 1
            soundtrack_pairs.append((audio_ordinal, video_ordinal))
            ref_items.append({"type": "audio"})
        sample_indexes = list(range(0, frames.shape[0], h3.FPS // 2))
        ref_items.append({
            "type": "video",
            "data": frames[sample_indexes],
            "timestamps": [i / 2.0 for i in range(len(sample_indexes))],
        })
        ref_blocks.append({
            "kind": "video_audio" if audio_t else "video",
            "latent_t": video_latent.shape[2],
            "latent_h": canvas_h // 16,
            "latent_w": canvas_w // 16,
            "ref_audio_t": audio_t,
            "latent": video_latent,
            "audio_latent": audio_latent,
        })
        tag_by_input[item.input_index] = f"<Video {video_ordinal}>"

    for item in audios:
        if not isinstance(item.value, Mapping) or "waveform" not in item.value:
            raise ValueError("Audio references must be AUDIO payloads")
        audio_latent, audio_t = _encode_reference_audio(bundle.audio_vae, item.value)
        audio_ordinal += 1
        ref_items.append({"type": "audio"})
        ref_blocks.append({"kind": "audio", "ref_audio_t": audio_t, "audio_latent": audio_latent})
        tag_by_input[item.input_index] = f"<Audio {audio_ordinal}>"

    if not ref_items or all(item.get("type") == "audio" for item in ref_items):
        raise ValueError("Reference mode needs at least one image or video")

    resolved_prompt = _resolve_reference_prompt(
        prompt,
        tag_by_input,
        soundtrack_pairs,
        len(videos),
        len(audios),
    )
    if prompt_transform is not None:
        # Optimize after resolution so the optimizer sees the official
        # <Picture N> / <Video N> / <Audio N> tags rather than the internal
        # placeholders, and its output goes straight to the tokenizer. The tag
        # map goes with it so each media description names the same reference
        # the prompt does.
        resolved_prompt = prompt_transform(resolved_prompt, tag_by_input)

    tokens = bundle.clip.tokenize(resolved_prompt, minimax_ref_items=ref_items)
    conditioning = bundle.clip.encode_from_tokens_scheduled(tokens)
    conditioning = node_helpers.conditioning_set_values(conditioning, {"minimax_refs": ref_blocks})
    return conditioning, latent


class MiniMaxH3Easy:
    CATEGORY = "MiniMax H3 Easy"
    FUNCTION = "generate"
    RETURN_TYPES = ("MODEL", "MINIMAX_H3_CONTEXT")
    RETURN_NAMES = ("model", "h3_context")
    DESCRIPTION = "One MiniMax H3 node for text, image and reference video workflows."

    @classmethod
    def INPUT_TYPES(cls):
        optional: dict[str, Any] = {
            "media": ("*",),
            # Kept out of the H3 bundle on purpose: this is the LLM that
            # rewrites the prompt, not one of the H3 generation models.
            "optimizer_clip": ("CLIP",),
            # Transport-only: the editor reports whether its Optimized tab is
            # still empty. Defaults to True so an API/headless run with the
            # text encoder format configured still optimizes.
            "prompt_needs_optimization": ("BOOLEAN", {"default": True, "hidden": True}),
        }
        for index in range(1, MAX_MEDIA + 1):
            # Transport-only inputs used by the virtual multi-wire frontend.
            # Keep them in INPUT_TYPES so ComfyUI execution can resolve the
            # linked media objects, but mark them hidden as a server-side
            # fallback: even if the web extension fails to initialize, users
            # must never see thirty internal sockets/widgets on the node.
            optional[f"media_{index}"] = ("*", {"hidden": True})
            optional[f"media_type_{index}"] = ("STRING", {"default": "", "hidden": True})
        return {
            "required": {
                "h3_bundle": ("MINIMAX_H3_BUNDLE",),
                "mode": ([MODE_IMAGE, MODE_REFERENCE], {"default": MODE_IMAGE}),
                "prompt": ("STRING", {"multiline": True, "dynamicPrompts": True, "default": ""}),
                "resolution": (list(RESOLUTIONS), {"default": RESOLUTION_480}),
                "aspect_ratio": (list(ASPECT_RATIOS), {"default": ASPECT_WIDESCREEN}),
                "width": ("INT", {"default": 1344, "min": 32, "max": nodes.MAX_RESOLUTION, "step": 32}),
                "height": ("INT", {"default": 768, "min": 32, "max": nodes.MAX_RESOLUTION, "step": 32}),
                "seconds": ("FLOAT", {"default": 5.0, "min": MIN_SECONDS, "max": MAX_SECONDS, "step": 0.1}),
                "advanced": ("BOOLEAN", {"default": False}),
                "fps": ("FLOAT", {"default": 24.0, "min": 1.0, "max": 120.0, "step": 1.0}),
                "keyframe_role": ([KEYFRAME_FIRST, KEYFRAME_LAST], {"default": KEYFRAME_FIRST}),
                "ref_image_size": ([REF_IMAGE_MATCH, REF_IMAGE_1K, REF_IMAGE_15K, REF_IMAGE_2K, REF_IMAGE_ORIGINAL], {"default": REF_IMAGE_1K}),
                "reference_mention_mode": ([REFERENCE_MENTION_FILENAME, REFERENCE_MENTION_INDEX], {"default": REFERENCE_MENTION_INDEX}),
                "prompt_optimizer_settings": ("BOOLEAN", {"default": False}),
                "prompt_optimizer_scene_guide": (
                    [str(item.get("id")) for item in (_prompt_guide_manifest().get("scene_guides") or []) if isinstance(item, dict) and item.get("id")] or ["none"],
                    {"default": "none"},
                ),
            },
            "optional": optional,
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    @staticmethod
    def _collect_media(kwargs: dict) -> list[_MediaInput]:
        items = []
        direct = kwargs.get("media")
        if direct is not None:
            items.append(_MediaInput(0, _infer_media_type(direct), direct))
        for index in range(1, MAX_MEDIA + 1):
            value = kwargs.get(f"media_{index}")
            if value is None:
                continue
            media_type = str(kwargs.get(f"media_type_{index}") or "").strip().lower()
            resolved_type = media_type if media_type in {"image", "video", "audio"} else _infer_media_type(value)
            items.append(_MediaInput(index, resolved_type, value))
        return items

    @staticmethod
    def _keyframe_labels(items, role) -> dict[int, str]:
        """Name the keyframe images the way the H3 guides talk about them."""
        images = [item for item in items if item.media_type == "image"]
        if not images:
            return {}
        if len(images) == 1:
            return {images[0].input_index: "the last frame" if role == KEYFRAME_LAST else "the first frame"}
        first, last = (images[1], images[0]) if role == KEYFRAME_LAST else (images[0], images[1])
        return {first.input_index: "the first frame", last.input_index: "the last frame"}

    @staticmethod
    def _keyframes(items, role):
        images = [item.value for item in items if item.media_type == "image"]
        if any(item.media_type != "image" for item in items):
            raise ValueError("Image mode accepts image resources only")
        if len(images) > 2:
            raise ValueError("Image mode accepts at most two images")
        if not images:
            return None, None
        if len(images) == 1:
            if role == KEYFRAME_LAST:
                return None, images[0]
            return images[0], None
        if role == KEYFRAME_LAST:
            return images[1], images[0]
        return images[0], images[1]

    @staticmethod
    def _clip_prompt_transform(mode: str, seconds: float, items: list[_MediaInput], kwargs: Mapping[str, Any]):
        """Build the execution-time prompt optimizer, or None when it is off.

        The optimizer CLIP only exists while the graph runs, so this format
        cannot be served by the editor's optimize button. It rewrites the
        prompt once, right before it is tokenized, and only while the editor's
        Optimized tab is still empty - the same rule the HTTP formats follow.
        """
        settings = _read_prompt_optimizer_config()
        if str(settings.get("api_format") or "") != OPTIMIZER_FORMAT_CLIP:
            return None, None
        clip = kwargs.get("optimizer_clip")
        if clip is None:
            # Generating without the encoder the user asked for would be worse
            # than generating the prompt as typed, so only say what happened.
            logging.warning(
                "MiniMax H3 Easy: prompt optimization is set to the text encoder format, "
                "but no encoder is connected to the optimizer_clip input. Using the prompt as typed."
            )
            return None, None
        pending = kwargs.get("prompt_needs_optimization", True)
        if isinstance(pending, str):
            pending = pending.strip().lower() in {"1", "true", "yes", "on"}
        if not bool(pending):
            # Says why the encoder stayed idle on a run the user expected it to
            # work: the tab already holds an optimized prompt.
            _optimizer_log("the Optimized field already holds a prompt; keeping it instead of optimizing again")
            return None, None

        counts = {"image": 0, "video": 0, "audio": 0}
        for item in items:
            if item.media_type in counts:
                counts[item.media_type] += 1
        scene_guide = str(kwargs.get("prompt_optimizer_scene_guide") or "none")
        max_length = int(settings.get("local_max_length") or PROMPT_OPTIMIZER_CLIP_MAX_LENGTH)
        read_media = bool(settings.get("read_media"))
        result: list[str] = []

        def transform(text: str, labels: Mapping[int, str] | None = None) -> str:
            source = str(text or "")
            if not source.strip():
                return source
            started = time.perf_counter()
            _optimizer_log(
                "optimizing the prompt with the connected text encoder (mode=%s, guide=%s, media=%d, read media=%s)",
                mode, scene_guide, len(items), "on" if read_media else "off",
            )
            # Reference videos are decoded again here; that is the price of
            # showing them to the encoder, so it only happens when asked.
            described, count = _optimizer_clip_descriptions(clip, items, labels, max_length) if read_media else ("", 0)
            system = _optimizer_system_prompt(scene_guide, mode, float(seconds), counts, 0, count)
            _optimizer_log("writing the final prompt (guide=%d chars, descriptions=%d)...", len(system), count)
            step = time.perf_counter()
            optimized = _optimizer_clip_generate(clip, system, source, max_length, None, described)
            _optimizer_log(
                "prompt optimization finished in %.1fs (final pass %.1fs, %d chars)",
                time.perf_counter() - started, time.perf_counter() - step, len(optimized),
            )
            result.append(optimized)
            return optimized

        return transform, result

    @classmethod
    def generate(cls, h3_bundle, mode, prompt, resolution, aspect_ratio, width, height, seconds, advanced, fps, keyframe_role, ref_image_size, reference_mention_mode, **kwargs):
        if not isinstance(h3_bundle, MiniMaxH3Bundle):
            raise ValueError("Connect a MiniMax H3 Easy Loader bundle")
        mode = str(mode)
        keyframe_role = KEYFRAME_LAST if str(keyframe_role) == KEYFRAME_LAST else KEYFRAME_FIRST
        width, height = _canvas_dimensions(resolution, aspect_ratio, width, height)
        seconds = min(MAX_SECONDS, max(MIN_SECONDS, float(seconds)))
        length = _frame_length(seconds, fps)
        items = cls._collect_media(kwargs)
        prompt_transform, optimized_prompt = cls._clip_prompt_transform(mode, seconds, items, kwargs)
        if mode == MODE_REFERENCE and items:
            if len(items) > MAX_MEDIA:
                raise ValueError("Reference mode accepts at most fifteen media resources")
            counts = {"image": 0, "video": 0, "audio": 0}
            for item in items:
                if item.media_type not in counts:
                    raise ValueError("Unsupported media resource")
                counts[item.media_type] += 1
            if counts["image"] > MAX_IMAGES or counts["video"] > MAX_VIDEOS or counts["audio"] > MAX_AUDIOS:
                raise ValueError("Reference mode media limits are 9 images, 3 videos and 3 audio clips")
            if counts["image"] == 0 and counts["video"] == 0:
                raise ValueError("Reference mode needs an image or video in addition to audio")
            model = h3_bundle.model_for("ref2va")
            conditioning, latent = _reference_conditioning(h3_bundle, prompt, width, height, length, ref_image_size, items, prompt_transform)
        else:
            first_frame, last_frame = cls._keyframes(items, keyframe_role)
            model = h3_bundle.model_for("fl2va")
            if prompt_transform is not None:
                prompt = prompt_transform(prompt, cls._keyframe_labels(items, keyframe_role))
            conditioning, latent = _empty_image_conditioning(h3_bundle, prompt, width, height, length, first_frame, last_frame)
        if optimized_prompt:
            _notify_prompt_optimized(kwargs.get("unique_id"), optimized_prompt[0])
        context = MiniMaxH3Context(
            conditioning=conditioning,
            latent=latent,
            video_vae=h3_bundle.video_vae,
            audio_vae=h3_bundle.audio_vae,
            fps=float(fps),
        )
        return model, context


class MiniMaxH3EasyOutput:
    CATEGORY = "MiniMax H3 Easy"
    FUNCTION = "unpack"
    RETURN_TYPES = ("CONDITIONING", "LATENT", "VAE", "VAE", "FLOAT")
    RETURN_NAMES = ("positive", "latent", "video_vae", "audio_vae", "fps")
    DESCRIPTION = "Unpack the non-model outputs from a MiniMax H3 Easy context."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "h3_context": ("MINIMAX_H3_CONTEXT",),
            },
        }

    @staticmethod
    def unpack(h3_context):
        if not isinstance(h3_context, MiniMaxH3Context):
            raise ValueError("Connect the H3 Context output from a MiniMax H3 Easy node")
        return (
            h3_context.conditioning,
            h3_context.latent,
            h3_context.video_vae,
            h3_context.audio_vae,
            h3_context.fps,
        )


_register_prompt_optimizer_route_when_ready()


NODE_CLASS_MAPPINGS = {
    "MiniMaxH3EasyLoader": MiniMaxH3EasyLoader,
    "MiniMaxH3EasyModelAdapter": MiniMaxH3EasyModelAdapter,
    "MiniMaxH3Easy": MiniMaxH3Easy,
    "MiniMaxH3EasyOutput": MiniMaxH3EasyOutput,
}
