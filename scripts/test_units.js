// 单元测试：node scripts/test_units.js
// 覆盖：死键中间态判定（issue #3）、StatsManager 新旧数据格式与错误率（issue #4）。
// 不依赖 DOM：keyboard.js 顶层为纯数据；stats.js 仅经 localStorage 存取（此处打桩）。

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ok - ' + msg); } else { failures++; console.error('  FAIL - ' + msg); }
}

// ---------- 1) 死键中间态判定 isDeadKeyCombo ----------
console.log('== isDeadKeyCombo (issue #3) ==');
const kbModule = new Function(
  fs.readFileSync(path.join(root, 'js/keyboard.js'), 'utf8') + '; return { isDeadKeyCombo };'
)();
const { isDeadKeyCombo } = kbModule;

assert(isDeadKeyCombo("'", 'é') === true, "café：value 以 ' 结尾、期望 é → 死键中间态");
assert(isDeadKeyCombo('`', 'à') === true, 'grave 死键 + à → 中间态');
assert(isDeadKeyCombo('"', 'ü') === true, 'diaeresis 死键 + ü → 中间态');
assert(isDeadKeyCombo('^', 'ê') === true, 'circumflex 死键 + ê → 中间态');
assert(isDeadKeyCombo('~', 'ã') === true, 'tilde 死键 + ã → 中间态');
assert(isDeadKeyCombo("'", 'e') === false, "普通字母 e 收到 ' → 不是死键组合（应按错字处理）");
assert(isDeadKeyCombo("'", "'") === false, "目标本身是撇号（s'il）→ 正常比对，非中间态");
assert(isDeadKeyCombo('e', 'é') === false, '已组合出的 é → 正常比对');
assert(isDeadKeyCombo('c', 'a') === false, '普通字符 → false');

// ---------- 2) StatsManager：新格式错误率 + 旧数据兼容 ----------
console.log('== StatsManager (issue #4) ==');
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
const statsCtor = new Function(
  'localStorage',
  fs.readFileSync(path.join(root, 'js/stats.js'), 'utf8') + '; return StatsManager;'
);
const StatsManager = statsCtor(global.localStorage);
const sm = new StatsManager();

sm.record('fr', {
  wpm: 30, accuracy: 90, correct: 9, wrong: 1, mode: 'practice',
  charErrors: { é: 1, à: 2 }, charTotals: { é: 10, à: 5, z: 4 }, categoryStats: {}
});
sm.record('fr', {
  wpm: 40, accuracy: 100, correct: 5, wrong: 0, mode: 'practice',
  charErrors: { é: 1 }, charTotals: { é: 8 }, categoryStats: {}
});
const fr = sm.getStats('fr');
assert(fr.totalSessions === 2, '两个会话都被记录');
const é = fr.charStats.find(c => c.char === 'é');
const à = fr.charStats.find(c => c.char === 'à');
assert(!!é && é.total === 18 && é.errors === 2, `é total=18(10+8) errors=2，实际 ${é && (é.total + '/' + é.errors)}`);
assert(Math.round(é.errorRate * 100) === 11, `é 错误率 ≈11%（不再是 100%），实际 ${é && Math.round(é.errorRate * 100)}%`);
assert(!!à && à.total === 5 && à.errors === 2, `à total=5 errors=2，实际 ${à && (à.total + '/' + à.errors)}`);
assert(fr.charStats.every(c => c.total >= 3), '样本 <3 的字符被过滤');

// 旧格式兼容：历史 localStorage 里 charErrors 是 {total,errors} 对象且 total≡errors
sm._save(Object.assign({}, JSON.parse(store['typing-game-stats']), {
  de: {
    sessions: [{ wpm: 20, accuracy: 80, correct: 4, wrong: 1, mode: 'practice', timestamp: 1 }],
    chars: { ß: { total: 7, errors: 7 } } // 旧格式：total≡errors
  }
}));
const de = sm.getStats('de');
const oldß = de.charStats.find(c => c.char === 'ß');
assert(!!oldß && oldß.total === 7 && oldß.errors === 7, '旧格式数据可读（total/errors 保持）');

// 累计写入：新格式再次 record 到含旧格式的语言
sm.record('de', { wpm: 25, accuracy: 90, correct: 3, wrong: 1, mode: 'practice', charErrors: { ß: 1 }, charTotals: { ß: 6 } });
const de2 = sm.getStats('de');
const ß2 = de2.charStats.find(c => c.char === 'ß');
assert(ß2.total === 13 && ß2.errors === 8, `旧+新累计：total=13 errors=8，实际 ${ß2.total}/${ß2.errors}`);

// 空会话不入库由 renderer.endGame 保证（total>0 才 record），此处验证 record 不因空 charErrors 报错
sm.record('es', { wpm: 0, accuracy: 100, correct: 0, wrong: 0, mode: 'practice', charErrors: {}, charTotals: {}, categoryStats: {} });
assert(sm.getStats('es') !== null, '空错误表 record 不抛错');

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
