---
title: ASR Arena
emoji: 🥊
colorFrom: red
colorTo: purple
sdk: static
app_file: index.html
short_description: Two tiny ASR models fight on your mic — speed vs accuracy
tags:
- asr
- whisper
- transformers-js
- benchmark
---

# 🥊 ASR Arena

**▶ Try it live:** <https://iamdgarcia-asr-arena.static.hf.space> · **Code on GitHub:** <https://github.com/iamdgarcia/asr-arena>

Two tiny speech-recognition models transcribe **the same recording, side by side, in your browser** —
and you judge them on speed *and* accuracy against ground truth you type.

## The matchup

| | Moonshine Tiny | Whisper Base.en |
|---|---|---|
| Parameters | ~27M | ~74M |
| Made by | Useful Sensors | OpenAI |
| Designed for | short clips, edge/latency-critical | general-purpose |

Both run on **the same WASM runtime** (transformers.js, q8 quantized) — no WebGPU advantage for either,
so the comparison is fair: same bytes of compute, different architectures. That isolates what you actually
care about when picking a tiny ASR for a voice agent: **latency per utterance vs word error rate.**

## How to use

1. Hit **Start** (first run downloads both models — watch the progress bars, then they're cached).
2. Speak; hit **Stop**. Both transcripts appear with wall-clock latency and words/sec.
3. Type what you actually said → each model gets a **WER** (word-level Levenshtein).
4. The scoreboard at the bottom counts wins (lower WER wins; tie → lower latency), persisted in your browser.

## Why this matters for voice agents

Tiny ASR is the frontier tradeoff: a 27M model that responds in ~200 ms feels *alive* in a phone call;
a 74M model that's 40% more accurate but 2× slower can wreck turn-taking. You can't feel that tradeoff
from a leaderboard — you feel it here.

Built by [iamdgarcia](https://huggingface.co/iamdgarcia) — realtime voice agent engineering.
Models: [moonshine-tiny-ONNX](https://huggingface.co/onnx-community/moonshine-tiny-ONNX) ·
[whisper-base.en](https://huggingface.co/onnx-community/whisper-base.en). No audio leaves your machine.
