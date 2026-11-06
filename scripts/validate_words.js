// 词库与模板数据校验（issue #5 / #6）。用法：node scripts/validate_words.js
// 检查：重复词、必填字段、难度范围、ja 等级格式、category 声明与使用、
//       模板 category key 与内置词库一致性、模板可由 gen_templates 复现。
// 发现问题退出码 1（CI 直接作为门禁）。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const LANGS = ['fr', 'es', 'it', 'pt', 'ru', 'de', 'ja'];

function loadWordData() {
  let data = {};
  for (const lang of LANGS) {
    const code = fs.readFileSync(path.join(root, 'words', lang + '.js'), 'utf8');
    data = new Function('WORD_DATA', code + '; return WORD_DATA;')(data);
  }
  return data;
}

function loadTemplates() {
  const code = fs.readFileSync(path.join(root, 'js', 'vocab-templates.js'), 'utf8');
  return new Function(code + '; return globalThis.VOCAB_TEMPLATES;')();
}

let problems = 0;
const report = [];
const WORD_DATA = loadWordData();

for (const lang of LANGS) {
  const data = WORD_DATA[lang];
  if (!data) { report.push(`${lang}: 词库缺失`); problems++; continue; }
  const issues = [];
  const seen = new Map();
  const isJa = lang === 'ja';
  const requiredFields = isJa
    ? ['word', 'reading', 'romaji', 'meaning', 'level', 'category', 'difficulty']
    : ['word', 'meaning', 'phonetic', 'category', 'difficulty'];

  data.words.forEach((w, i) => {
    for (const f of requiredFields) {
      if (w[f] === undefined || w[f] === null || w[f] === '') {
        issues.push(`#${i} "${w.word || '?'}" 缺字段 ${f}`);
      }
    }
    if (!Number.isInteger(w.difficulty) || w.difficulty < 1 || w.difficulty > 5) {
      issues.push(`#${i} "${w.word}" difficulty=${w.difficulty} 越界`);
    }
    if (isJa && w.level && !/^N[1-5]$/.test(String(w.level).trim())) {
      issues.push(`#${i} "${w.word}" level="${w.level}" 非 N1-N5`);
    }
    if (w.category && !data.categories[w.category]) {
      issues.push(`#${i} "${w.word}" category="${w.category}" 未在 categories 中声明`);
    }
    const key = isJa ? w.word + '|' + w.reading : w.word;
    if (seen.has(key)) issues.push(`#${i} 重复词 "${w.word}"（首次 #${seen.get(key)}）`);
    else seen.set(key, i);
  });

  const usedCats = new Set(data.words.map(w => w.category));
  for (const c of Object.keys(data.categories)) {
    if (!usedCats.has(c)) issues.push(`category "${c}" 已声明但无词汇使用`);
  }

  problems += issues.length;
  report.push(`${lang}: ${data.words.length} 词 / ${issues.length} 个问题`);
  report.push(...issues.slice(0, 30).map(s => '  - ' + s));
  if (issues.length > 30) report.push(`  ...其余 ${issues.length - 30} 条省略`);
}

// ---- 模板校验（issue #6）：key 与内置词库一致、内容与 js/vocab-templates.js 无漂移 ----
const VOCAB_TEMPLATES = loadTemplates();
const templatesDir = path.join(root, 'templates');
for (const [lang, content] of Object.entries(VOCAB_TEMPLATES.TEMPLATES)) {
  const file = path.join(templatesDir, VOCAB_TEMPLATES.FILE_NAMES[lang] + '_template.csv');
  const actual = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (actual !== content) {
    problems++;
    report.push(`template ${lang}: templates/*.csv 与 js/vocab-templates.js 漂移（运行 node scripts/gen_templates.js 重新生成）`);
  }
  // 模板 category key 必须在内置词库中声明
  const lines = content.trim().split('\n').slice(1);
  const catIdx = content.split('\n')[0].split(',').indexOf('category');
  for (const line of lines) {
    const cat = line.split(',')[catIdx];
    if (cat && WORD_DATA[lang] && !WORD_DATA[lang].categories[cat]) {
      problems++;
      report.push(`template ${lang}: category "${cat}" 不在 ${lang} 内置词库 categories 中`);
    }
  }
}

console.log(report.join('\n'));
if (problems > 0) {
  console.error(`\nVALIDATION FAILED: ${problems} 个问题`);
  process.exit(1);
}
console.log('\nVALIDATION PASSED');
