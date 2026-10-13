// ASR Arena — two tiny ASR models on the same audio, WASM-only for a fair fight.
// WER + scoring live in pure functions in wer.js so selfcheck.js can test them.

import { pickWinner, wer } from './wer.js';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels = false;

const MODELS = [
  { key: 'moonshine', id: 'onnx-community/moonshine-tiny-ONNX', label: 'Moonshine Tiny', size: '~27M params' },
  { key: 'whisper', id: 'onnx-community/whisper-base.en', label: 'Whisper Base.en', size: '~74M params' },
];
const LS_KEY = 'asr-arena-wins';

const $ = (sel) => document.querySelector(sel);
const btn = $('#record-btn'), truthBtn = $('#score-btn');
const timers = {};
let mediaStream = null, audioCtx = null, mediaRecorder = null, chunks = [], recStart = 0;
let ready = false, recording = false, lastResults = null;

// ---- wins ledger ----
function loadWins() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || { moonshine: 0, whisper: 0 }; } catch { return { moonshine: 0, whisper: 0 }; } }
function saveWins(w) { localStorage.setItem(LS_KEY, JSON.stringify(w)); }
function renderWins() {
  const w = loadWins();
  $('#wins-moonshine').textContent = w.moonshine;
  $('#wins-whisper').textContent = w.whisper;
}
$('#reset-btn').addEventListener('click', () => { localStorage.removeItem(LS_KEY); renderWins(); });
renderWins();

// ---- model loading (lazy, both, with progress) ----
const progs = Object.fromEntries(MODELS.map((m) => [m.key, { name: document.querySelectorAll('.load-row .load-name')[MODELS.indexOf(m)], bar: document.querySelectorAll('.load-row progress')[MODELS.indexOf(m)], pct: document.querySelectorAll('.load-row .load-pct')[MODELS.indexOf(m)] }]));
for (const m of MODELS) { progs[m.key].name.textContent = m.label; }

async function loadAll() {
  $('#load-status').hidden = false;
  const pipes = await Promise.all(MODELS.map(async (m) => {
    const p = await pipeline('automatic-speech-recognition', m.id, {
      dtype: 'q8', device: 'wasm',
      progress_callback: (x) => {
        if (x.status === 'progress' && x.total) {
          progs[m.key].bar.value = x.progress / 100;
          progs[m.key].pct.textContent = Math.round(x.progress) + '%';
        }
      },
    });
    progs[m.key].pct.textContent = '✓';
    return p;
  }));
  $('#load-status').hidden = true;
  return Object.fromEntries(MODELS.map((m, i) => [m.key, pipes[i]]));
}

// ---- recording ----
async function startRec() {
  btn.disabled = true;
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  mediaRecorder = new MediaRecorder(mediaStream);
  chunks = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = onStop;
  mediaRecorder.start();
  recStart = performance.now();
  recording = true;
  btn.textContent = '⏹ Stop';
  btn.classList.add('recording');
  btn.disabled = false;
  $('#timer').hidden = false;
  timers.ui = setInterval(() => { $('#timer-val').textContent = ((performance.now() - recStart) / 1000).toFixed(1) + 's'; }, 100);
}

function stopRec() {
  recording = false;
  clearInterval(timers.ui);
  btn.disabled = true;
  btn.textContent = '⏳ Transcribing…';
  mediaRecorder.stop();
  mediaStream.getTracks().forEach((t) => t.stop());
  audioCtx.close();
}

async function onStop() {
  const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
  const dur = (performance.now() - recStart) / 1000;
  $('#timer').hidden = true;
  if (dur < 0.4) { resetBtn('🎤 Start'); return alert('Too short — hold a sentence.'); }
  const arr = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(arr);
  ctx.close();
  const pcm = audio.getChannelData(0);

  const results = await Promise.all(MODELS.map(async (m) => {
    const t0 = performance.now();
    const out = await lastPipes[m.key](pcm);
    const ms = Math.round(performance.now() - t0);
    const text = (out.text || '').trim();
    return { key: m.key, label: m.label, text, ms, wps: dur > 0 ? (normalizeWords(text).length / dur) : 0 };
  }));
  lastResults = Object.fromEntries(results.map((r) => [r.key, r]));
  renderResults(results, dur);
  resetBtn('🎤 Start');
  truthBtn.disabled = false;
}

function resetBtn(label) { btn.textContent = label; btn.classList.remove('recording'); btn.disabled = !ready; }

// ---- rendering ----
function renderResults(results, audioDur) {
  for (const r of results) {
    $(`#tr-${r.key}`).textContent = r.text || '(empty)';
    $(`#m-${r.key} li:nth-child(1) span`).textContent = `${r.ms} ms`;
    $(`#m-${r.key} li:nth-child(2) span`).textContent = r.wps.toFixed(1);
    $(`#m-${r.key} li:nth-child(3) span`).textContent = '—';
  }
  document.querySelectorAll('.card').forEach((c) => c.classList.remove('winner'));
}

function scoreWer() {
  if (!lastResults) return;
  const truth = $('#ground-truth').value.trim();
  if (!truth) return alert('Type what you said first.');
  const entries = Object.values(lastResults).map((r) => ({ ...r, werVal: wer(truth, r.text) }));
  for (const r of entries) {
    $(`#m-${r.key} li:nth-child(3) span`).textContent = (r.werVal * 100).toFixed(0) + '%';
  }
  const best = pickWinner(entries);
  $(`#card-${best.key}`).classList.add('winner');
  const w = loadWins();
  w[best.key] += 1;
  saveWins(w);
  renderWins();
  truthBtn.disabled = true;
}
truthBtn.addEventListener('click', scoreWer);

// ---- boot ----
let lastPipes = null;
btn.addEventListener('click', async () => {
  if (recording) return stopRec();
  if (!ready) {
    btn.disabled = true; btn.textContent = '⏳ Loading models…';
    lastPipes = await loadAll();
    ready = true;
    resetBtn('🎤 Start');
    $('#rec-hint').textContent = 'models cached — speak, then stop';
    return;
  }
  if (recording) return; else startRec().catch((e) => { resetBtn('🎤 Start'); alert('Mic error: ' + e.message); });
});
