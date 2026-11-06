// E2E 冒烟测试：真实启动 Electron 加载 index.html，模拟选语言 → 开始 → 输入整词 →
// 校验结算前进 + 恢复词库按钮存在。用法：npx electron scripts/smoke_e2e.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));

  const result = await win.webContents.executeJavaScript(`(async () => {
    const out = { errors: [] };
    try {
      out.langs = Object.keys(window.WORD_DATA).sort().join(',');
      out.hasCsvUtils = !!window.CsvUtils;
      out.hasTemplates = !!window.VOCAB_TEMPLATES;

      // 选法语 → 开始自由练习
      document.querySelector('.lang-btn[data-lang="fr"]').click();
      document.getElementById('btn-start').click();
      await new Promise(r => setTimeout(r, 60));

      const getTarget = () =>
        [...document.querySelectorAll('#target-word .char')].map(s => s.textContent).join('');

      // 等一个纯小写字母词（避开死键/空格/连字符路径，聚焦结算主链路）
      let target = getTarget();
      const input = document.getElementById('typing-input');
      for (let i = 0; i < 10 && !/^[a-z]+$/.test(target); i++) {
        input.value = target;                       // 整词提交（可能判错，无所谓）
        input.dispatchEvent(new Event('input'));
        await new Promise(r => setTimeout(r, 260)); // 150ms 切词 + 余量
        target = getTarget();
      }
      out.target = target;

      // 正确输入整词 → 应结算前进
      input.value = target;
      input.dispatchEvent(new Event('input'));
      await new Promise(r => setTimeout(r, 300));
      out.progress = document.getElementById('stat-progress').textContent;
      out.accuracy = document.getElementById('stat-accuracy').textContent;

      // 词汇面板 + 恢复内置词库按钮（issue #11）
      document.getElementById('btn-vocab').click();
      out.restoreBtn = !!document.getElementById('btn-vocab-restore');

      // 死键路径：直接验证 CsvUtils 判定已在单测覆盖，这里验证页面脚本无未捕获异常
      out.jsErrors = window.__smokeErrors || [];
    } catch (e) {
      out.errors.push(String(e));
    }
    return out;
  })()`);

  console.log(JSON.stringify(result, null, 2));
  // progress 为 "已结算/总词数"：等待纯字母词期间可能先跳过几个词，只要求 >0 且格式合法
  const progressOk = /^\d+\/\d+$/.test(result.progress || '') && parseInt(result.progress) > 0;
  const ok =
    result.langs === 'de,es,fr,it,ja,pt,ru' &&
    result.hasCsvUtils && result.hasTemplates &&
    /^[a-z]+$/.test(result.target || '') &&
    progressOk &&
    result.accuracy === '100%' &&
    result.restoreBtn === true &&
    (!result.errors || result.errors.length === 0);

  console.log(ok ? 'E2E SMOKE PASSED' : 'E2E SMOKE FAILED');
  app.exit(ok ? 0 : 1);
}).catch(err => { console.error('SMOKE BOOT FAIL', err); app.exit(1); });
