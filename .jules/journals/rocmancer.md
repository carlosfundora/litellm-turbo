# Rocmancer Journal

## Discovery
- Investigated codebase looking for `sglang` and `gfx1030` inference engine logic.
- Found that this is the `litellm` repo (a gateway proxy) and not an inference engine.
- `SGLang` is supported as an OpenAI-compatible provider in docs but lacks an explicit provider route in LiteLLM's internal enum (`LlmProviders`) and mapping logic, which means it falls back to generic `openai` or `custom_openai`.

## Diagnostic
- Because the core inference engine (and its ROCm kernels, KV cache structures, etc.) does not live here, ROCm optimizations are not possible in this repository.
- To leave the codebase better than I found it, I will add explicit support for `sglang` as an `LlmProvider` mapped to OpenAI-compatible handling, similar to `hosted_vllm`. This provides a hook for future sglang-specific extensions.

## Action Plan
1. Add `SGLANG = "sglang"` to `LlmProviders` in `litellm/types/utils.py`.
2. Add routing hooks in `litellm/litellm_core_utils/get_llm_provider_logic.py`, `litellm/main.py`, and `litellm/utils.py` using `OpenAIGPTConfig` or similar.
