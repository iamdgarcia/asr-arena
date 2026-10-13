// Self-check: WER implementation + scoring semantics. node selfcheck.js
import { wer, normalizeWords, levenshtein, pickWinner } from './wer.js';

let failed = 0;
function eq(name, got, want) {
  const ok = typeof want === 'number' ? Math.abs(got - want) < 1e-9 : got === want;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  if (!ok) failed++;
}

eq('identical -> 0', wer('the cat sat', 'the cat sat'), 0);
eq('one sub of three -> 1/3', wer('the cat sat', 'the bat sat'), 1 / 3);
eq('one insertion -> 1/3', wer('the cat sat', 'the cat quickly sat'), 1 / 3);
eq('one deletion -> 1/3', wer('the cat sat', 'the sat'), 1 / 3);
eq('all wrong -> 1', wer('the cat sat', 'dogs run fast'), 1);
eq('empty ref + empty hyp -> 0', wer('', ''), 0);
eq('empty ref + words -> 1', wer('', 'some words'), 1);
eq('empty hyp -> 1', wer('some words', ''), 1);
eq('case+strip punctuation', wer('The CAT, sat!', 'the cat sat'), 0);
eq('levenshtein kitten/sitting = 3', levenshtein(['k','i','t','t','e','n'], ['s','i','t','t','i','n','g']), 3);
eq('normalizeWords strips numbers-punct mix', normalizeWords('Hello, WORLD! 42?').join('|'), 'hello|world|42');

// pickWinner: lower WER wins; tie -> lower latency
const w1 = pickWinner([{ key: 'a', werVal: 0.2, ms: 900 }, { key: 'b', werVal: 0.1, ms: 1500 }]);
console.log(`${w1.key === 'b' ? 'PASS' : 'FAIL'} pickWinner: lower WER wins (got ${w1.key})`);
if (w1.key !== 'b') failed++;
const w2 = pickWinner([{ key: 'a', werVal: 0.1, ms: 900 }, { key: 'b', werVal: 0.1, ms: 1500 }]);
console.log(`${w2.key === 'a' ? 'PASS' : 'FAIL'} pickWinner: tie -> lower latency (got ${w2.key})`);
if (w2.key !== 'a') failed++;

if (failed) { console.log(`\n${failed} CHECKS FAILED`); process.exit(1); }
console.log('\nALL CHECKS PASSED');
