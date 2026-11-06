// 从 js/vocab-templates.js（唯一事实来源）重新生成 templates/*.csv（issue #6）。
// 用法：node scripts/gen_templates.js
// CI 校验：生成后 `git diff --exit-code -- templates/`，有漂移即失败。
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'js', 'vocab-templates.js'), 'utf8');
const { VOCAB_TEMPLATES } = new Function(code + '; return { VOCAB_TEMPLATES: globalThis.VOCAB_TEMPLATES };')();

const outDir = path.join(root, 'templates');
fs.mkdirSync(outDir, { recursive: true });
for (const [lang, content] of Object.entries(VOCAB_TEMPLATES.TEMPLATES)) {
  const file = path.join(outDir, VOCAB_TEMPLATES.FILE_NAMES[lang] + '_template.csv');
  fs.writeFileSync(file, content, 'utf8');
  console.log('written', path.relative(root, file), `(${content.trim().split('\n').length - 1} 词条)`);
}
console.log('done');
