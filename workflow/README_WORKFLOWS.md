# MiniMax H3 Easy 工作流下载说明

## 中文

本目录包含：

- [`MiniMax_H3_Easy.json`](MiniMax_H3_Easy.json)：标准单阶段工作流。
- [`MiniMax_H3_Easy_Pass2.json`](MiniMax_H3_Easy_Pass2.json)：二采工作流。

### 环境与插件

二采工作流建议使用 **ComfyUI 0.32 或更高版本**。

需要安装：

- [ComfyUI-MiniMaxH3-Easy](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy)
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes)
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use)

安装或更新 Python 节点后请重启 ComfyUI。

### Pass 2 模型下载

| 用途                   | 文件名                                                         | 放置目录                               | Hugging Face                                                                                   |
| -------------------- | ----------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| 一采 FL2VA INT8 模型     | `minimax_h3_fl2va_int8_convrot.safetensors`                 | `ComfyUI/models/diffusion_models/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/diffusion_models) |
| Pass 2 剪枝 W4A8 模型    | `minimax_h3_fl2va_pruned_w4a8_mixed.safetensors`            | `ComfyUI/models/diffusion_models/` | [Kijai/MiniMax-H3-experimental](https://huggingface.co/Kijai/MiniMax-H3-experimental)          |
| Qwen3-VL 文本编码器       | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`              | `ComfyUI/models/text_encoders/`    | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/text_encoders)    |
| H3 Video VAE         | `minimax_h3_video_vae_fp16.safetensors`                     | `ComfyUI/models/vae/`              | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/vae)              |
| H3 Audio VAE         | `minimax_h3_audio_vae_fp32.safetensors`                     | `ComfyUI/models/vae/`              | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/vae)              |
| LightX2V 8-step LoRA | `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` | `ComfyUI/models/loras/`            | [lightx2v/Minimax-h3-Turbo](https://huggingface.co/lightx2v/Minimax-h3-Turbo)                  |

包含部分所需模型和节点的网盘链接：

<https://pan.quark.cn/s/8be70c7581e6?pwd=6LmC>

下载后请在工作流加载器中选择对应文件。找不到模型时，请检查放置目录并刷新模型列表或重启 ComfyUI。Turbo LoRA 默认启用；没有该文件时可以绕过 LoRA 节点。

---

# MiniMax H3 Easy Workflow Downloads

## English

This folder contains:

- [`MiniMax_H3_Easy.json`](MiniMax_H3_Easy.json): standard single-stage workflow.
- [`MiniMax_H3_Easy_Pass2.json`](MiniMax_H3_Easy_Pass2.json): two-model Pass 2 workflow.

### Requirements

The Pass 2 workflow is intended for **ComfyUI 0.32 or newer**.

Install:

- [ComfyUI-MiniMaxH3-Easy](https://github.com/nkxx188/ComfyUI-MiniMaxH3-Easy)
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes)
- [ComfyUI-Easy-Use](https://github.com/yolain/ComfyUI-Easy-Use)

Restart ComfyUI after installing or updating Python nodes.

### Pass 2 model downloads

| Role                           | Filename                                                    | ComfyUI directory                  | Hugging Face                                                                                   |
| ------------------------------ | ----------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pass 1 FL2VA INT8 transformer  | `minimax_h3_fl2va_int8_convrot.safetensors`                 | `ComfyUI/models/diffusion_models/` | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/diffusion_models) |
| Pass 2 pruned W4A8 transformer | `minimax_h3_fl2va_pruned_w4a8_mixed.safetensors`            | `ComfyUI/models/diffusion_models/` | [Kijai/MiniMax-H3-experimental](https://huggingface.co/Kijai/MiniMax-H3-experimental)          |
| Qwen3-VL text encoder          | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`              | `ComfyUI/models/text_encoders/`    | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/text_encoders)    |
| H3 Video VAE                   | `minimax_h3_video_vae_fp16.safetensors`                     | `ComfyUI/models/vae/`              | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/vae)              |
| H3 Audio VAE                   | `minimax_h3_audio_vae_fp32.safetensors`                     | `ComfyUI/models/vae/`              | [Comfy-Org/MiniMax-H3](https://huggingface.co/Comfy-Org/MiniMax-H3/tree/main/vae)              |
| LightX2V 8-step LoRA           | `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` | `ComfyUI/models/loras/`            | [lightx2v/Minimax-h3-Turbo](https://huggingface.co/lightx2v/Minimax-h3-Turbo)                  |

<https://pan.quark.cn/s/8be70c7581e6?pwd=6LmC>

Select the downloaded files in the workflow loader nodes. If a model is missing, verify its directory and refresh the model list or restart ComfyUI. The Turbo LoRA is enabled by default and may be bypassed when unavailable.
