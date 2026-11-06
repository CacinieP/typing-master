// 词库去重（issue #5）：删除 words/*.js 中重复的词条，保留首次出现。
// 按 {word}（ja 按 word+reading）判重。用括号配对定位条目 span，两种条目格式均支持：
//   - 欧洲语言：单行 {word:'…',…},
//   - 日语：多行 { "word": "…", … },
// 用法：node scripts/dedupe_words.js [--dry]
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dry = process.argv.includes('--dry');

function extractKey(text, isJa) {
  const word = /['"]?word['"]?\s*:\s*['"]((?:[^'"\\]|\\.)*)['"]/.exec(text);
  if (!word) return null;
  let key = word[1];
  if (isJa) {
    const reading = /['"]?reading['"]?\s*:\s*['"]((?:[^'"\\]|\\.)*)['"]/.exec(text);
    key += '|' + (reading ? reading[1] : '');
  }
  return key;
}

// 在文本中找到 words 数组条目的 span（起点 offset 之后）。
// 扫描字符级，跟踪字符串（' 或 "）与转义，depth 由 0→1 是条目开始、1→0 是结束。
function findEntrySpans(text, from) {
  const spans = [];
  let i = from;
  let depth = 0, start = -1, quote = null;
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      if (depth > 0) quote = ch;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        let end = i + 1;
        let begin = start;
        // 吞掉条目前的缩进（回退到行首），保证删除后不残留空白行
        while (begin > 0 && /[ \t]/.test(text[begin - 1])) begin--;
        // 吞掉紧跟的逗号与空白（作为条目分隔的一部分）
        let j = end;
        while (j < text.length && (text[j] === ',' || /\s/.test(text[j]))) {
          end = text[j] === ',' ? j + 1 : end;
          j++;
        }
        spans.push({ start: begin, end });
        start = -1;
      }
      if (depth < 0) break; // words 数组结束（遇到 ] 不会到这，防御）
    } else if (ch === ']' && depth === 0) {
      break;
    }
    i++;
  }
  return spans;
}

let totalRemoved = 0;
for (const lang of ['fr', 'es', 'it', 'pt', 'ru', 'de', 'ja']) {
  const file = path.join(root, 'words', lang + '.js');
  const text = fs.readFileSync(file, 'utf8');
  const wordsArr = /['"]?words['"]?\s*:/.exec(text);
  if (!wordsArr) { console.error(`${lang}: 找不到 words 数组，跳过`); continue; }
  const arrStart = wordsArr.index + wordsArr[0].length;

  const spans = findEntrySpans(text, arrStart);
  const seen = new Set();
  const dupes = [];
  for (const span of spans) {
    const entry = text.slice(span.start, span.end);
    const key = extractKey(entry, lang === 'ja');
    if (!key) continue;
    if (seen.has(key)) dupes.push({ span, key });
    else seen.add(key);
  }
  if (dupes.length === 0) { console.log(`${lang}: 无重复`); continue; }

  // 从后往前删除，避免位移
  let out = text;
  for (const { span, key } of dupes.reverse()) {
    out = out.slice(0, span.start) + out.slice(span.end);
  }
  if (!dry) fs.writeFileSync(file, out, 'utf8');
  totalRemoved += dupes.length;
  console.log(`${lang}: 删除 ${dupes.length} 条重复 -> ${dupes.map(d => d.key.split('|')[0]).join(', ')}`);
}
console.log(dry ? `[dry-run] 共 ${totalRemoved} 条` : `共删除 ${totalRemoved} 条重复词条`);
