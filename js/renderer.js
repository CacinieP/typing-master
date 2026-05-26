// renderer.js - Main game logic

(function () {
  'use strict';

  const WORD_DATA = window.WORD_DATA || {};
  const langNames = {
    fr: '法语 Français', es: '西班牙语 Español',
    it: '意大利语 Italiano', pt: '葡萄牙语 Português',
    ru: '俄语 Русский', ja: '日本語 日语'
  };

  // State
  let currentLang = null;
  let inputMode = 'romaji';
  let gameMode = 'practice';
  let gameActive = false;
  let words = [];
  let wordIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let startTime = null;
  let timerInterval = null;
  let timeLimit = 60;
  let charErrors = {};
  let categoryStats = {};
  let kb = null;
  let stats = null;
  let precisionTotal = 20;
  let precisionErrors = 0;

  // DOM
  const $ = id => document.getElementById(id);
  const welcomeEl = $('welcome');
  const gameArea = $('game-area');
  const liveStats = $('live-stats');
  const resultPanel = $('result-panel');
  const statsPanel = $('stats-panel');
  const manualPanel = $('manual-panel');
  const targetWord = $('target-word');
  const kanjiDisplay = $('kanji-display');
  const furiganaDisplay = $('furigana-display');
  const wordMeaning = $('word-meaning');
  const wordPhonetic = $('word-phonetic');
  const typingInput = $('typing-input');
  const charFeedback = $('char-feedback');
  const modeSelect = $('mode-select');
  const timeSelect = $('time-select');
  const categorySelect = $('category-select');
  const difficultySelect = $('difficulty-select');
  const inputModeGroup = $('input-mode-group');
  const inputModeSelect = $('input-mode-select');
  const statWpm = $('stat-wpm');
  const statAccuracy = $('stat-accuracy');
  const statProgress = $('stat-progress');
  const statTimer = $('stat-timer');
  const kbContainer = $('keyboard');
  const kbHint = $('keyboard-hint');

  // Get the typing target string for the current word
  function getTypingTarget(w) {
    if (currentLang === 'ja') {
      return inputMode === 'kana' ? w.reading : w.romaji;
    }
    return w.word;
  }

  // Init
  function init() {
    kb = new VirtualKeyboard(kbContainer, kbHint);
    stats = new StatsManager();

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => selectLanguage(btn.dataset.lang));
    });
    document.querySelectorAll('.welcome-lang-card').forEach(card => {
      card.addEventListener('click', () => selectLanguage(card.dataset.lang));
    });

    $('btn-start').addEventListener('click', startGame);
    modeSelect.addEventListener('change', () => {
      timeSelect.classList.toggle('hidden', modeSelect.value !== 'timed');
    });
    $('btn-retry').addEventListener('click', () => { resultPanel.classList.add('hidden'); startGame(); });
    $('btn-home').addEventListener('click', goHome);
    $('btn-stats').addEventListener('click', showStats);
    $('btn-close-stats').addEventListener('click', () => statsPanel.classList.add('hidden'));
    $('btn-manual').addEventListener('click', showManual);
    $('btn-close-manual').addEventListener('click', () => manualPanel.classList.add('hidden'));
    $('btn-reset').addEventListener('click', () => {
      if (confirm('确定重置所有进度？')) {
        stats.reset(currentLang);
      }
    });

    inputModeSelect.addEventListener('change', () => {
      inputMode = inputModeSelect.value;
      kb.setInputMode(inputMode);
      if (gameActive) showCurrentWord();
    });

    typingInput.addEventListener('input', onInput);
    typingInput.addEventListener('keydown', onKeyDown);
  }

  function selectLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));

    const data = WORD_DATA[lang];
    if (!data) {
      alert('词汇数据未加载: ' + lang);
      return;
    }

    // Populate categories
    categorySelect.innerHTML = '<option value="all">全部</option>';
    for (const [key, label] of Object.entries(data.categories)) {
      categorySelect.innerHTML += `<option value="${key}">${label}</option>`;
    }

    // Difficulty labels
    updateDifficultyLabels();

    // Input mode selector
    if (lang === 'ja') {
      inputModeGroup.classList.add('visible');
      $('input-mode-label').textContent = '输入法 Input';
      inputModeSelect.innerHTML = '<option value="romaji">罗马字 Romaji</option><option value="kana">假名 かな</option>';
      inputMode = 'romaji';
      document.body.classList.add('lang-ja');
    } else {
      inputModeGroup.classList.remove('visible');
      document.body.classList.remove('lang-ja');
    }

    // Set keyboard
    kb.setLanguage(lang, inputMode);

    // Show controls, hide welcome
    welcomeEl.classList.add('hidden');
    $('controls').classList.remove('hidden');
    gameArea.classList.add('hidden');
    liveStats.classList.add('hidden');
    resultPanel.classList.add('hidden');

    typingInput.focus();
  }

  function updateDifficultyLabels() {
    if (currentLang === 'ja') {
      difficultySelect.innerHTML = '<option value="all">全部</option>' +
        '<option value="1">N5 初級</option>' +
        '<option value="2">N4 基礎</option>' +
        '<option value="3">N3 中級</option>' +
        '<option value="4">N2 中上級</option>' +
        '<option value="5">N1 上級</option>';
    } else {
      difficultySelect.innerHTML = '<option value="all">全部</option>' +
        '<option value="1">A1 初級</option>' +
        '<option value="2">A2 基礎</option>' +
        '<option value="3">B1 中級</option>' +
        '<option value="4">B2 中上級</option>' +
        '<option value="5">C1 上級</option>';
    }
  }

  function getFilteredWords() {
    const data = WORD_DATA[currentLang];
    if (!data) return [];
    let filtered = data.words;
    const cat = categorySelect.value;
    const diff = difficultySelect.value;
    if (cat !== 'all') filtered = filtered.filter(w => w.category === cat);
    if (diff !== 'all') filtered = filtered.filter(w => w.difficulty === parseInt(diff));
    return filtered;
  }

  function startGame() {
    const filtered = getFilteredWords();
    if (filtered.length === 0) {
      alert('没有匹配的词汇');
      return;
    }

    words = shuffle([...filtered]);
    wordIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    charErrors = {};
    categoryStats = {};
    precisionErrors = 0;
    gameActive = true;
    startTime = null;

    gameMode = modeSelect.value;
    timeLimit = parseInt(timeSelect.value) || 60;
    precisionTotal = gameMode === 'precision' ? 20 : words.length;

    $('controls').classList.remove('hidden');
    gameArea.classList.remove('hidden');
    liveStats.classList.remove('hidden');
    resultPanel.classList.add('hidden');
    welcomeEl.classList.add('hidden');

    updateLiveStats();
    showCurrentWord();
    typingInput.value = '';
    typingInput.focus();
    kb.clearHighlights();

    if (timerInterval) clearInterval(timerInterval);
    if (gameMode === 'timed') {
      statTimer.textContent = timeLimit + 's';
      timerInterval = setInterval(tick, 1000);
    } else {
      statTimer.textContent = '--';
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function showCurrentWord() {
    if (wordIndex >= words.length) {
      endGame();
      return;
    }
    const w = words[wordIndex];

    // Japanese: show kanji + furigana, type target is romaji or reading
    if (currentLang === 'ja') {
      kanjiDisplay.classList.remove('hidden');
      furiganaDisplay.classList.remove('hidden');
      kanjiDisplay.textContent = w.word;
      furiganaDisplay.textContent = w.reading;
      wordMeaning.textContent = w.meaning;
      wordPhonetic.textContent = w.level;

      const target = getTypingTarget(w);
      let html = '';
      for (const ch of target) {
        html += `<span class="char pending">${ch}</span>`;
      }
      targetWord.innerHTML = html;
      typingInput.maxLength = target.length;
    } else {
      // Non-Japanese
      kanjiDisplay.classList.add('hidden');
      furiganaDisplay.classList.add('hidden');
      kanjiDisplay.textContent = '';
      furiganaDisplay.textContent = '';
      wordMeaning.textContent = w.meaning;
      wordPhonetic.textContent = w.phonetic;

      let html = '';
      for (const ch of w.word) {
        html += `<span class="char pending">${ch}</span>`;
      }
      targetWord.innerHTML = html;
      typingInput.maxLength = w.word.length;
    }

    charFeedback.textContent = '';
    typingInput.value = '';

    const chars = targetWord.querySelectorAll('.char');
    const target = getTypingTarget(w);
    if (chars.length > 0) {
      chars[0].classList.remove('pending');
      chars[0].classList.add('current');
      kb.highlightKey(target[0]);
    }
  }

  function onInput(e) {
    if (!gameActive) return;
    if (!startTime) startTime = Date.now();

    const w = words[wordIndex];
    const target = getTypingTarget(w);
    const val = typingInput.value;
    const pos = val.length - 1;

    if (pos < 0) return;

    const targetChars = targetWord.querySelectorAll('.char');

    if (pos < target.length) {
      const expected = target[pos];
      const typed = val[pos];

      targetChars[pos].classList.remove('current', 'pending');

      if (typed === expected) {
        targetChars[pos].classList.add('correct');
        kb.showCorrect(typed);
      } else {
        targetChars[pos].classList.add('incorrect');
        kb.showWrong(typed);
        typingInput.classList.add('shake');
        setTimeout(() => typingInput.classList.remove('shake'), 300);

        if (!charErrors[expected]) charErrors[expected] = { total: 0, errors: 0 };
        charErrors[expected].total++;
        charErrors[expected].errors++;
      }

      if (pos + 1 < target.length) {
        targetChars[pos + 1].classList.remove('pending');
        targetChars[pos + 1].classList.add('current');
        kb.highlightKey(target[pos + 1]);
      }
    }

    if (val.length >= target.length) {
      let wordErrors = 0;
      for (let i = 0; i < target.length; i++) {
        if (val[i] !== target[i]) wordErrors++;
      }

      if (wordErrors === 0) {
        correctCount++;
      } else {
        wrongCount++;
        precisionErrors += wordErrors;
      }

      const cat = words[wordIndex].category;
      if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };
      categoryStats[cat].total++;
      if (wordErrors === 0) categoryStats[cat].correct++;

      wordIndex++;
      updateLiveStats();

      if (gameMode === 'precision' && wordIndex >= precisionTotal) {
        endGame();
        return;
      }
      if (wordIndex >= words.length) {
        endGame();
        return;
      }

      setTimeout(() => showCurrentWord(), 150);
    }
  }

  function onKeyDown(e) {
    if (!gameActive) return;
    if (e.key === 'Escape') {
      endGame();
    }
  }

  function tick() {
    if (!gameActive || !startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = timeLimit - elapsed;
    if (remaining <= 0) {
      endGame();
      return;
    }
    statTimer.textContent = remaining + 's';
  }

  function updateLiveStats() {
    const elapsed = startTime ? (Date.now() - startTime) / 60000 : 0;
    const wpm = elapsed > 0 ? Math.round(correctCount / elapsed) : 0;
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 100;
    const maxWords = gameMode === 'precision' ? precisionTotal : words.length;

    statWpm.textContent = wpm + ' WPM';
    statAccuracy.textContent = accuracy + '%';
    statProgress.textContent = `${wordIndex}/${maxWords}`;
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const elapsed = startTime ? (Date.now() - startTime) / 60000 : 0;
    const wpm = elapsed > 0 ? Math.round(correctCount / elapsed) : 0;
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 100;

    stats.record(currentLang, {
      wpm, accuracy,
      correct: correctCount,
      wrong: wrongCount,
      mode: gameMode,
      timeLimit: gameMode === 'timed' ? timeLimit : null,
      duration: Math.round(elapsed * 60),
      charErrors,
      categoryStats
    });

    gameArea.classList.add('hidden');
    liveStats.classList.add('hidden');
    resultPanel.classList.remove('hidden');

    $('result-stats').innerHTML = `
      <div class="result-stat"><div class="rs-label">速度</div><div class="rs-value">${wpm} WPM</div></div>
      <div class="result-stat"><div class="rs-label">准确率</div><div class="rs-value">${accuracy}%</div></div>
      <div class="result-stat"><div class="rs-label">正确</div><div class="rs-value" style="color:var(--green)">${correctCount}</div></div>
      <div class="result-stat"><div class="rs-label">错误</div><div class="rs-value" style="color:var(--red)">${wrongCount}</div></div>
      <div class="result-stat"><div class="rs-label">用时</div><div class="rs-value">${Math.round(elapsed * 60)}s</div></div>
      <div class="result-stat"><div class="rs-label">词汇</div><div class="rs-value">${wordIndex}</div></div>
    `;
  }

  function goHome() {
    gameActive = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    gameArea.classList.add('hidden');
    liveStats.classList.add('hidden');
    resultPanel.classList.add('hidden');
    welcomeEl.classList.remove('hidden');
  }

  function showStats() {
    statsPanel.classList.remove('hidden');
    const container = $('stats-content');
    if (currentLang) {
      stats.renderStats(currentLang, container);
    } else {
      let html = '';
      for (const lang of ['fr', 'es', 'it', 'pt', 'ru', 'ja']) {
        const s = stats.getStats(lang);
        if (s) {
          html += `<h3 style="margin-top:12px">${langNames[lang]}</h3>`;
          html += `<p>${s.totalSessions} 次练习 | 平均 ${s.avgWpm} WPM | 准确率 ${s.avgAccuracy}%</p>`;
        }
      }
      container.innerHTML = html || '<p style="text-align:center;color:var(--text-dim)">暂无数据</p>';
    }
  }

  function showManual() {
    manualPanel.classList.remove('hidden');
    const lang = currentLang || 'fr';
    const title = $('manual-title');
    const content = $('manual-content');
    title.textContent = langNames[lang] + ' 打字手册';

    if (lang === 'ru') {
      content.innerHTML = getRussianManual();
    } else if (lang === 'ja') {
      content.innerHTML = getJapaneseManual();
    } else {
      content.innerHTML = getUSInternationalManual(lang);
    }
  }

  // --- Manual generators ---

  function getUSInternationalManual(lang) {
    const langAccents = {
      fr: {
        title: '法语特殊字符',
        chars: [
          ['é', "'", 'e', '锐音符 acute'],
          ['è', '`', 'e', '钝音符 grave'],
          ['ê', '^', 'e', '长音符 circumflex'],
          ['ë', '"', 'e', '分音符 diaeresis'],
          ['à', '`', 'a', ''], ['â', '^', 'a', ''],
          ['ù', '`', 'u', ''], ['û', '^', 'u', ''],
          ['ô', '^', 'o', ''], ['î', '^', 'i', ''],
          ['ï', '"', 'i', ''],
          ['ç', 'AltGr', 'c', '软音符 cédille'],
          ['œ', 'AltGr', 'o', '连字 ligature'],
          ['æ', 'AltGr', 'a', '连字 ligature'],
        ]
      },
      es: {
        title: '西班牙语特殊字符',
        chars: [
          ['á', "'", 'a', '锐音符'], ['é', "'", 'e', ''],
          ['í', "'", 'i', ''], ['ó', "'", 'o', ''], ['ú', "'", 'u', ''],
          ['ñ', '~', 'n', '波浪号 tilde'],
          ['ü', '"', 'u', '分音符'],
          ['¿', 'AltGr', '/', '反问号'],
          ['¡', 'AltGr', '1', '反叹号'],
        ]
      },
      it: {
        title: '意大利语特殊字符',
        chars: [
          ['à', '`', 'a', '钝音符'], ['è', '`', 'e', ''],
          ['é', "'", 'e', '锐音符'], ['ì', '`', 'i', ''],
          ['ò', '`', 'o', ''], ['ù', '`', 'u', ''],
        ]
      },
      pt: {
        title: '葡萄牙语特殊字符',
        chars: [
          ['ã', '~', 'a', '波浪号'], ['õ', '~', 'o', ''],
          ['ç', 'AltGr', 'c', '软音符 cedilha'],
          ['á', "'", 'a', '锐音符'], ['é', "'", 'e', ''],
          ['í', "'", 'i', ''], ['ó', "'", 'o', ''], ['ú', "'", 'u', ''],
          ['â', '^', 'a', '长音符'], ['ê', '^', 'e', ''], ['ô', '^', 'o', ''],
          ['à', '`', 'a', '钝音符'],
        ]
      }
    };

    const langData = langAccents[lang] || langAccents.fr;
    let html = '';

    html += `<div class="manual-section">
      <h3>US International 键盘输入法</h3>
      <p>US International 使用「死键」(dead key) 机制输入带重音的字符。</p>
      <p><strong>方法：</strong>先按死键（不产生字符），再按目标字母 → 组合成带重音的字符。</p>
    </div>`;

    html += `<div class="manual-section">
      <h3>死键对照表</h3>
      <table>
        <tr><th>死键</th><th>按的位置</th><th>产生重音</th></tr>
        <tr><td class="combo">' (撇号)</td><td>' 键（不按Shift）</td><td>锐音符 (á é í ó ú)</td></tr>
        <tr><td class="combo">\` (反引号)</td><td>左上角 \` 键</td><td>钝音符 (à è ì ò ù)</td></tr>
        <tr><td class="combo">^ (脱字符)</td><td>Shift+6</td><td>长音符 (â ê î ô û)</td></tr>
        <tr><td class="combo">" (双引号)</td><td>Shift+'</td><td>分音符 (ä ë ï ö ü)</td></tr>
        <tr><td class="combo">~ (波浪号)</td><td>Shift+\`</td><td>波浪号 (ã ñ õ)</td></tr>
        <tr><td class="combo">AltGr</td><td>右Alt键</td><td>直接输出 ç œ æ 等</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>${langData.title}</h3>
      <table>
        <tr><th>字符</th><th>步骤 1 (先按)</th><th>步骤 2 (再按)</th><th>说明</th></tr>`;
    langData.chars.forEach(([ch, step1, step2, note]) => {
      html += `<tr><td style="font-size:18px">${ch}</td><td class="combo">${step1}</td><td class="combo">${step2}</td><td>${note}</td></tr>`;
    });
    html += '</table></div>';

    html += `<div class="manual-section">
      <h3>小技巧</h3>
      <p>• 如果只想输入死键本身（如撇号 '），按死键后再按空格键。</p>
      <p>• 大写重音字母：先按死键，再按 Shift+字母。</p>
    </div>`;

    return html;
  }

  function getRussianManual() {
    let html = '';
    html += `<div class="manual-section">
      <h3>俄语标准键盘布局（ЙЦУКЕН）</h3>
      <p>俄语键盘使用标准的 ЙЦУКЕН 布局，与英文 QWERTY 键位的对应关系：</p>
    </div>`;

    html += `<div class="manual-section">
      <h3>键位对应表</h3>
      <table>
        <tr><th>英文</th><th>俄文</th><th></th><th>英文</th><th>俄文</th></tr>`;
    const en = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.'.split('');
    const ru = 'йцукенгшщзхъфывапролджэячсмитьбю'.split('');
    for (let i = 0; i < Math.ceil(en.length / 2); i++) {
      const j = i + Math.ceil(en.length / 2);
      html += `<tr>
        <td class="combo">${en[i]}</td><td style="font-size:16px">${ru[i] || ''}</td><td></td>
        ${j < en.length ? `<td class="combo">${en[j]}</td><td style="font-size:16px">${ru[j] || ''}</td>` : '<td></td><td></td>'}
      </tr>`;
    }
    html += '</table></div>';

    html += `<div class="manual-section">
      <h3>特殊字符</h3>
      <table>
        <tr><th>字符</th><th>按法</th></tr>
        <tr><td style="font-size:18px">ё</td><td class="combo">\` 键（左上角）</td></tr>
        <tr><td style="font-size:18px">Ъ</td><td class="combo">Shift + ъ / ] 键</td></tr>
        <tr><td style="font-size:18px">Ь</td><td class="combo">Shift + ь / m 键</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>练习建议</h3>
      <p>• 先熟悉前两行键位（ЙЦУКЕН、ФЫВАПРОЛД）</p>
      <p>• 注意区分容易混淆的字母：ш/щ, ы/и, ъ/ь</p>
    </div>`;

    return html;
  }

  function getJapaneseManual() {
    let html = '';

    html += `<div class="manual-section">
      <h3>日语打字模式</h3>
      <p>本练习支持两种输入模式：</p>
      <p><strong>罗马字模式 (Romaji)：</strong>使用英文键盘按标准罗马字输入。适合初学者。</p>
      <p><strong>假名模式 (かな)：</strong>使用 JIS 假名键盘布局，每个键直接对应一个假名。</p>
    </div>`;

    html += `<div class="manual-section">
      <h3>罗马字输入对照表（Hepburn式）</h3>
      <table>
        <tr><th>あ行</th><th>か行</th><th>さ行</th><th>た行</th><th>な行</th></tr>
        <tr><td>a あ</td><td>ka か</td><td>sa さ</td><td>ta た</td><td>na な</td></tr>
        <tr><td>i い</td><td>ki き</td><td>shi し</td><td>chi ち</td><td>ni に</td></tr>
        <tr><td>u う</td><td>ku く</td><td>su す</td><td>tsu つ</td><td>nu ぬ</td></tr>
        <tr><td>e え</td><td>ke け</td><td>se せ</td><td>te て</td><td>ne ね</td></tr>
        <tr><td>o お</td><td>ko こ</td><td>so そ</td><td>to と</td><td>no の</td></tr>
      </table>
      <table style="margin-top:8px">
        <tr><th>は行</th><th>ま行</th><th>や行</th><th>ら行</th><th>わ行</th></tr>
        <tr><td>ha は</td><td>ma ま</td><td>ya や</td><td>ra ら</td><td>wa わ</td></tr>
        <tr><td>hi ひ</td><td>mi み</td><td></td><td>ri り</td><td></td></tr>
        <tr><td>fu ふ</td><td>mu む</td><td>yu ゆ</td><td>ru る</td><td></td></tr>
        <tr><td>he へ</td><td>me め</td><td></td><td>re れ</td><td></td></tr>
        <tr><td>ho ほ</td><td>mo も</td><td>yo よ</td><td>ro ろ</td><td>wo を</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>特殊输入</h3>
      <table>
        <tr><th>字符</th><th>罗马字</th><th>说明</th></tr>
        <tr><td>ん</td><td class="combo">nn</td><td>拨音</td></tr>
        <tr><td>っ</td><td class="combo">后接辅音双写 (如 tta → った)</td><td>促音</td></tr>
        <tr><td>きゃ</td><td class="combo">kya</td><td>拗音示例</td></tr>
        <tr><td>しゃ</td><td class="combo">sha</td><td>拗音示例</td></tr>
        <tr><td>ちゃ</td><td class="combo">cha</td><td>拗音示例</td></tr>
        <tr><td>ー</td><td class="combo">-</td><td>长音符号</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>浊音·半浊音</h3>
      <table>
        <tr><th>が行</th><th>ざ行</th><th>だ行</th><th>ば行</th><th>ぱ行</th></tr>
        <tr><td>ga が</td><td>za ざ</td><td>da だ</td><td>ba ば</td><td>pa ぱ</td></tr>
        <tr><td>gi ぎ</td><td>ji じ</td><td>di ぢ</td><td>bi び</td><td>pi ぴ</td></tr>
        <tr><td>gu ぐ</td><td>zu ず</td><td>du づ</td><td>bu ぶ</td><td>pu ぷ</td></tr>
        <tr><td>ge げ</td><td>ze ぜ</td><td>de で</td><td>be べ</td><td>pe ぺ</td></tr>
        <tr><td>go ご</td><td>zo ぞ</td><td>do ど</td><td>bo ぼ</td><td>po ぽ</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>JIS 假名键盘布局</h3>
      <p>假名模式下，键盘布局切换为 JIS 标准。每个键直接对应一个假名：</p>
      <table>
        <tr><th>键位</th><th>假名</th><th></th><th>键位</th><th>假名</th></tr>
        <tr><td class="combo">Q</td><td>た</td><td></td><td class="combo">A</td><td>ち</td></tr>
        <tr><td class="combo">W</td><td>て</td><td></td><td class="combo">S</td><td>と</td></tr>
        <tr><td class="combo">E</td><td>い</td><td></td><td class="combo">D</td><td>し</td></tr>
        <tr><td class="combo">R</td><td>す</td><td></td><td class="combo">F</td><td>は</td></tr>
        <tr><td class="combo">T</td><td>か</td><td></td><td class="combo">G</td><td>き</td></tr>
        <tr><td class="combo">Y</td><td>ん</td><td></td><td class="combo">H</td><td>く</td></tr>
        <tr><td class="combo">U</td><td>な</td><td></td><td class="combo">J</td><td>ま</td></tr>
        <tr><td class="combo">I</td><td>に</td><td></td><td class="combo">K</td><td>の</td></tr>
        <tr><td class="combo">O</td><td>ら</td><td></td><td class="combo">L</td><td>り</td></tr>
        <tr><td class="combo">P</td><td>せ</td><td></td><td class="combo">;</td><td>れ</td></tr>
        <tr><td class="combo">Z</td><td>つ</td><td></td><td class="combo">X</td><td>さ</td></tr>
      </table>
    </div>`;

    html += `<div class="manual-section">
      <h3>练习建议</h3>
      <p>• 初学者建议先使用罗马字模式，熟悉五十音图后再尝试假名模式</p>
      <p>• 注意促音(っ)的输入：双写下一个辅音字母</p>
      <p>• 拨音(ん)输入 nn 可避免与后续假名混淆</p>
      <p>• 汉字识读：屏幕上方显示汉字，下方显示振假名（读音提示）</p>
      <p>• JLPT 分级：N5(初級) → N1(上級)，建议按级别逐步练习</p>
    </div>`;

    return html;
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
