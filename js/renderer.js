// renderer.js - Main game logic

(function () {
  'use strict';

  const WORD_DATA = window.WORD_DATA || {};
  const langNames = {
    fr: '法语 Français', es: '西班牙语 Español',
    it: '意大利语 Italiano', pt: '葡萄牙语 Português',
    ru: '俄语 Русский', de: '德语 Deutsch', ja: '日本語 日语'
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
  // 语言说明卡（landing）DOM
  const langIntro = $('lang-intro');
  const langIntroIcon = $('lang-intro-icon');
  const langIntroTitle = $('lang-intro-title');
  const langIntroSubtitle = $('lang-intro-subtitle');
  const langIntroDesc = $('lang-intro-desc');
  const langIntroChars = $('lang-intro-chars');
  const langIntroNotice = $('lang-intro-notice');
  const langIntroBody = $('lang-intro-body');
  const langIntroToggle = $('lang-intro-toggle');
  // 说明卡折叠状态：记忆用户偏好（true=展开, false=收起）
  let langIntroCollapsed = localStorage.getItem('typingmaster_intro_collapsed') === '1';

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

    // 说明卡折叠切换：点击切换展开/收起，状态持久化到 localStorage
    langIntroToggle.addEventListener('click', () => {
      langIntroCollapsed = !langIntroCollapsed;
      localStorage.setItem('typingmaster_intro_collapsed', langIntroCollapsed ? '1' : '0');
      applyLangIntroCollapsed();
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
    $('btn-vocab').addEventListener('click', showVocabPanel);
    $('btn-close-vocab').addEventListener('click', () => $('vocab-panel').classList.add('hidden'));
    $('btn-reset').addEventListener('click', () => {
      if (confirm('确定重置所有进度？')) {
        stats.reset(currentLang);
      }
    });

    inputModeSelect.addEventListener('change', () => {
      inputMode = inputModeSelect.value;
      kb.setInputMode(inputMode);
      updateLangIntro();
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

    updateLangIntro();

    // Show controls, hide welcome
    welcomeEl.classList.add('hidden');
    $('controls').classList.remove('hidden');
    gameArea.classList.add('hidden');
    liveStats.classList.add('hidden');
    resultPanel.classList.add('hidden');

    typingInput.focus();
  }

  // 各语言 landing 说明卡内容。选语言后在控制栏上方展示，
  // 让用户在开始打字前了解这门语言的打字特点、特殊字符、输入法提示。
  const LANG_INTRO = {
    fr: {
      icon: '🇫🇷', title: '法语 Français', subtitle: 'Romance 语族 · 拉丁字母 + 重音符',
      desc: '法语使用锐音符(é)、钝音符(è)、长音符(ê)、分音符(ë)和软音符(ç)。用 US International 键盘的死键组合即可输入全部重音字符。',
      chars: ['é', 'è', 'ê', 'ë', 'ç', 'à', 'ù', 'â', 'ô', 'î', 'œ', 'æ'],
      notice: '⌨ 切换到 US International 键盘，重音字符用死键组合输入（如 é = 先按 \' 再按 e）'
    },
    es: {
      icon: '🇪🇸', title: '西班牙语 Español', subtitle: 'Romance 语族 · 拉丁字母 + 重音符',
      desc: '西班牙语的特色字符是 ñ（带波浪号的 n）、重音元音 á é í ó ú，以及反问号 ¿ 和反叹号 ¡。',
      chars: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
      notice: '⌨ 切换到 US International 键盘，ñ 用先按 ~ 再按 n，重音元音用先按 \' 再按元音'
    },
    it: {
      icon: '🇮🇹', title: '意大利语 Italiano', subtitle: 'Romance 语族 · 拉丁字母 + 重音符',
      desc: '意大利语主要使用钝音符（à è ì ò ù）和少量锐音符（é）。重音符号是意大利语拼写的一部分。',
      chars: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
      notice: '⌨ 切换到 US International 键盘，钝音符用先按 ` 再按元音'
    },
    pt: {
      icon: '🇵🇹', title: '葡萄牙语 Português', subtitle: 'Romance 语族 · 拉丁字母 + 重音符',
      desc: '葡萄牙语有较多特殊字符：鼻音化的 ã õ、软音符 ç、各种重音(á é â ê ô à)等，是重音最丰富的欧语之一。',
      chars: ['ã', 'õ', 'ç', 'á', 'é', 'â', 'ê', 'ô', 'à'],
      notice: '⌨ 切换到 US International 键盘，ã/õ 用先按 ~ 再按元音，ç 用 AltGr+c'
    },
    de: {
      icon: '🇩🇪', title: '德语 Deutsch', subtitle: '日耳曼语族 · 拉丁字母 + Umlaut + ß',
      desc: '德语特有的字符是变元音 ä ö ü 和 Eszett(ß)。用 US International 键盘的分音符死键(\")可输入 ä ö ü，ß 用 AltGr+s。所有名词首字母大写。',
      chars: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
      notice: '⌨ 切换到 US International 键盘：ä = 先按 \" 再按 a，ß = AltGr+s'
    },
    ru: {
      icon: '🇷🇺', title: '俄语 Русский', subtitle: '斯拉夫语族 · 西里尔字母 ЙЦУКЕН 布局',
      desc: '俄语使用 33 个西里尔字母，标准键盘布局是 ЙЦУКЕН（与英文 QWERTY 键位不同）。注意区分易混字母：ш/щ、ы/и、ъ/ь。',
      chars: ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', 'ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э', 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
      notice: '⌨ 请切换到俄语（ЙЦУКЕН）系统输入法后开始练习'
    },
    ja: {
      icon: '🇯🇵', title: '日本語 日语', subtitle: '日本语系 · 假名 + 汉字 + 罗马字',
      desc: '日语打字有两种模式：罗马字模式（用英文键盘按 watashi 等罗马字，适合初学者）和假名模式（JIS 假名键盘，每键对应一个假名）。屏幕上方显示汉字，下方显示振假名读音。',
      chars: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ'],
      notice: '⌨ 罗马字模式直接用英文键盘输入即可（如 watashi）'
    }
  };

  // 渲染语言说明卡。selectLanguage 和 inputMode 切换时调用。
  function updateLangIntro() {
    if (!currentLang) {
      langIntro.classList.add('hidden');
      return;
    }
    const data = LANG_INTRO[currentLang];
    if (!data) {
      langIntro.classList.add('hidden');
      return;
    }
    langIntroIcon.textContent = data.icon;
    langIntroTitle.textContent = data.title;
    langIntroSubtitle.textContent = data.subtitle;
    langIntroDesc.textContent = data.desc;
    // 字符标签
    langIntroChars.innerHTML = '';
    data.chars.forEach(ch => {
      const chip = document.createElement('span');
      chip.className = 'char-chip';
      chip.textContent = ch;
      langIntroChars.appendChild(chip);
    });
    // notice：日语根据 inputMode 动态
    if (currentLang === 'ja' && inputMode === 'kana') {
      langIntroNotice.textContent = '⌨ 请切换到日语 JIS 假名输入法（每键对应一个假名）';
    } else {
      langIntroNotice.textContent = data.notice;
    }
    langIntro.classList.remove('hidden');
    // 同步折叠状态（切语言后保持用户的展开/收起偏好）
    applyLangIntroCollapsed();
  }

  // 应用说明卡的折叠状态到 DOM：收起时隐藏 body，按钮文案变"展开"
  function applyLangIntroCollapsed() {
    if (langIntroCollapsed) {
      langIntroBody.classList.add('hidden');
      langIntroToggle.textContent = '展开';
      langIntroToggle.classList.add('collapsed');
    } else {
      langIntroBody.classList.remove('hidden');
      langIntroToggle.textContent = '收起';
      langIntroToggle.classList.remove('collapsed');
    }
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
      // 不设 maxLength：日语假名输入法可能产生多码组合，
      // 且 romaji 里促音/拨音/长音的按键数与目标字符数不一致。
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
      // 不设 maxLength：欧语重音字符用 US International 死键输入时，
      // 死键中间态（如 café 的 caf'）会先占满长度，导致最后的字母无法输入。
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
      return;
    }
    // Backspace: 整词重置当前词的高亮状态，让用户重新打。
    // 逐字符回退在重音/死键/假名组合输入下位置同步很脆弱，整词重置更可靠。
    // 计数器（correct/wrong/charErrors）只在词打满时结算，Backspace 不影响它们。
    if (e.key === 'Backspace') {
      e.preventDefault();
      typingInput.value = '';
      showCurrentWord();
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
      ${gameMode === 'precision' ? `<div class="result-stat"><div class="rs-label">错误字符</div><div class="rs-value" style="color:var(--red)">${precisionErrors}</div></div>` : ''}
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
      for (const lang of ['fr', 'es', 'it', 'pt', 'ru', 'de', 'ja']) {
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
      },
      de: {
        title: '德语特殊字符',
        chars: [
          ['ä', '"', 'a', '变元音 Umlaut'], ['ö', '"', 'o', '变元音 Umlaut'],
          ['ü', '"', 'u', '变元音 Umlaut'],
          ['Ä', '"', 'A', '大写变元音'], ['Ö', '"', 'O', '大写变元音'], ['Ü', '"', 'U', '大写变元音'],
          ['ß', 'AltGr', 's', 'Eszett / scharfes S'],
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

  // --- Vocabulary management ---

  const CSV_HEADERS = {
    european: 'word,meaning,phonetic,category,difficulty',
    japanese: 'word,reading,romaji,meaning,level,category,difficulty'
  };

  const LANG_TYPE = { fr: 'european', es: 'european', it: 'european', pt: 'european', ru: 'european', de: 'european', ja: 'japanese' };

  function escapeCSV(val) {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadFile(filename, content) {
    const BOM = '﻿';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateTemplate(lang) {
    const type = LANG_TYPE[lang];
    const templates = {
      fr: 'bonjour,你好,/bɔ̃ʒuʁ/,salutations,1\n' +
          'merci,谢谢,/mɛʁsi/,salutations,1\n' +
          'croissant,羊角面包,/kʁwasɑ̃/,nourriture,1\n' +
          'bibliothèque,图书馆,/biblijɔtɛk/,quotidien,2\n' +
          'développement,发展,/devlɔpmɑ̃/,emotions,3\n',
      es: 'hola,你好,/ola/,saludos,1\n' +
          'gracias,谢谢,/ɡɾaθjas/,saludos,1\n' +
          'tapas,小吃,/tapas/,nourriture,1\n' +
          'biblioteca,图书馆,/iblioteka/,quotidien,2\n' +
          'desarrollo,发展,/desaroʎo/,emotions,3\n',
      it: 'ciao,你好,/tʃao/,saluti,1\n' +
          'grazie,谢谢,/ˈɡrattsje/,saluti,1\n' +
          'pizza,披萨,/ˈpittsa/,nourriture,1\n' +
          'biblioteca,图书馆,/biblioˈteka/,quotidien,2\n' +
          'sviluppo,发展,/zviˈluppo/,emotions,3\n',
      pt: 'olá,你好,/ɔˈla/,saudacoes,1\n' +
          'obrigado,谢谢,/obɾiˈɡadu/,saudacoes,1\n' +
          'feijoada,黑豆炖肉,/fejˈʒwada/,nourriture,2\n' +
          'biblioteca,图书馆,/biliuˈtɛka/,quotidien,2\n' +
          'desenvolvimento,发展,/dezevolveˈmẽtu/,emotions,4\n',
      ru: 'привет,你好,/prʲɪˈvʲet/,salutations,1\n' +
          'спасибо,谢谢,/spɐˈsʲibə/,salutations,1\n' +
          'водка,伏特加,/ˈvotkə/,nourriture,1\n' +
          'библиотека,图书馆,/bʲɪblʲɪɐˈtʲekə/,quotidien,2\n' +
          'развитие,发展,/rɐzˈvʲitʲɪje/,emotions,3\n',
      de: 'hallo,你好,/ˈhalo/,begruessung,1\n' +
          'danke,谢谢,/ˈdaŋkə/,begruessung,1\n' +
          'Grüße,问候,/ˈɡʁyːsə/,begruessung,3\n' +
          'Mädchen,女孩,/ˈmɛːtçn̩/,familie,2\n' +
          'Straße,街道,/ˈʃtʁaːsə/,reisen,2\n' +
          'Bücher,书籍,/ˈbyːçɐ/,alltag,3\n' +
          'schön,美丽的,/ʃøːn/,emotions,2\n'
    };

    if (type === 'japanese') {
      return CSV_HEADERS.japanese + '\n' +
        '私,わたし,watashi,我,N5,noun_basic,1\n' +
        '食べる,たべる,taberu,吃,N5,verb_2,1\n' +
        '飲む,のむ,nomu,喝,N5,verb_1,1\n' +
        '美しい,うつくしい,utsukushii,美丽的,N3,adjective_i,3\n' +
        '図書館,としょかん,toshokan,图书馆,N3,noun_nature,3\n';
    }

    return CSV_HEADERS.european + '\n' + (templates[lang] || templates.fr);
  }

  function exportVocab(lang) {
    const data = WORD_DATA[lang];
    if (!data) return;
    const type = LANG_TYPE[lang];
    let csv = type === 'japanese' ? CSV_HEADERS.japanese : CSV_HEADERS.european;
    csv += '\n';
    data.words.forEach(w => {
      if (type === 'japanese') {
        csv += [escapeCSV(w.word), escapeCSV(w.reading), escapeCSV(w.romaji), escapeCSV(w.meaning), escapeCSV(w.level), escapeCSV(w.category), w.difficulty].join(',') + '\n';
      } else {
        csv += [escapeCSV(w.word), escapeCSV(w.meaning), escapeCSV(w.phonetic), escapeCSV(w.category), w.difficulty].join(',') + '\n';
      }
    });
    const names = { fr: 'french', es: 'spanish', it: 'italian', pt: 'portuguese', ru: 'russian', de: 'german', ja: 'japanese' };
    downloadFile((names[lang] || lang) + '_vocabulary.csv', csv);
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { error: '文件为空或格式不正确（至少需要标题行+数据行）' };

    // Skip BOM
    if (lines[0].charCodeAt(0) === 0xFEFF) lines[0] = lines[0].substring(1);

    const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const required = {
      european: ['word', 'meaning', 'category', 'difficulty'],
      japanese: ['word', 'reading', 'romaji', 'meaning', 'category', 'difficulty']
    };

    const isJapanese = header.includes('reading') && header.includes('romaji');
    const type = isJapanese ? 'japanese' : 'european';
    const missing = required[type].filter(f => !header.includes(f));
    if (missing.length > 0) {
      return { error: '缺少必要列: ' + missing.join(', ') + '。需要的列: ' + CSV_HEADERS[type] };
    }

    const words = [];
    const categories = {};
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = parseCSVLine(line);
      const row = {};
      header.forEach((h, idx) => { row[h] = (fields[idx] || '').trim(); });

      if (!row.word) { errors.push('第' + (i + 1) + '行: word 为空，已跳过'); continue; }
      if (!row.meaning) { errors.push('第' + (i + 1) + '行: meaning 为空，已跳过'); continue; }

      const diff = parseInt(row.difficulty);
      if (isNaN(diff) || diff < 1 || diff > 5) { errors.push('第' + (i + 1) + '行: difficulty 应为1-5，已设为1'); }

      if (type === 'japanese') {
        const w = {
          word: row.word,
          reading: row.reading || '',
          romaji: row.romaji || '',
          meaning: row.meaning,
          level: row.level || 'N5',
          category: row.category || 'custom',
          difficulty: isNaN(diff) ? 1 : Math.max(1, Math.min(5, diff))
        };
        words.push(w);
        categories[w.category] = w.category;
      } else {
        const w = {
          word: row.word,
          meaning: row.meaning,
          phonetic: row.phonetic || '',
          category: row.category || 'custom',
          difficulty: isNaN(diff) ? 1 : Math.max(1, Math.min(5, diff))
        };
        words.push(w);
        categories[w.category] = w.category;
      }
    }

    if (words.length === 0) {
      return { error: '没有解析到有效词汇' };
    }

    return { words, categories, errors, type };
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  function showVocabPanel() {
    const panel = $('vocab-panel');
    panel.classList.remove('hidden');
    $('vocab-import-status').textContent = '';
    $('vocab-import-status').className = '';
    $('vocab-file-label').textContent = '选择文件...';
    $('vocab-file-input').value = '';
  }

  function initVocabHandlers() {
    // Download template buttons
    document.querySelectorAll('.vocab-download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        const names = { fr: 'french', es: 'spanish', it: 'italian', pt: 'portuguese', ru: 'russian', de: 'german', ja: 'japanese' };
        downloadFile((names[lang] || lang) + '_template.csv', generateTemplate(lang));
      });
    });

    // File input
    $('vocab-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        $('vocab-file-label').textContent = file.name;
      }
    });

    // Import button
    $('btn-vocab-import').addEventListener('click', () => {
      const fileInput = $('vocab-file-input');
      const statusEl = $('vocab-import-status');
      if (!fileInput.files || !fileInput.files[0]) {
        statusEl.textContent = '请先选择一个 CSV 文件';
        statusEl.className = 'error';
        return;
      }

      const lang = $('vocab-import-lang').value;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = parseCSV(e.target.result);
        if (result.error) {
          statusEl.textContent = result.error;
          statusEl.className = 'error';
          return;
        }

        // Merge with existing categories
        const data = WORD_DATA[lang];
        if (data) {
          const mergedCats = Object.assign({}, data.categories, result.categories);
          WORD_DATA[lang] = { categories: mergedCats, words: result.words };
        } else {
          WORD_DATA[lang] = { categories: result.categories, words: result.words };
        }

        // Save to localStorage for persistence
        try {
          localStorage.setItem('typingmaster_custom_' + lang, JSON.stringify(WORD_DATA[lang]));
        } catch (err) { /* ignore */ }

        let msg = '导入成功！共 ' + result.words.length + ' 个词汇';
        if (result.errors.length > 0) {
          msg += '（' + result.errors.length + ' 条警告）';
        }
        statusEl.textContent = msg;
        statusEl.className = 'success';

        // Refresh category selector if current lang matches
        if (currentLang === lang) {
          const data2 = WORD_DATA[lang];
          categorySelect.innerHTML = '<option value="all">全部</option>';
          for (const [key, label] of Object.entries(data2.categories)) {
            categorySelect.innerHTML += '<option value="' + key + '">' + label + '</option>';
          }
        }
      };
      reader.readAsText(fileInput.files[0], 'UTF-8');
    });

    // Export button
    $('btn-vocab-export').addEventListener('click', () => {
      exportVocab($('vocab-export-lang').value);
    });
  }

  function loadCustomVocab() {
    for (const lang of ['fr', 'es', 'it', 'pt', 'ru', 'de', 'ja']) {
      try {
        const saved = localStorage.getItem('typingmaster_custom_' + lang);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.words && parsed.words.length > 0) {
            WORD_DATA[lang] = parsed;
          }
        }
      } catch (e) { /* ignore */ }
    }
  }

  // Start
  document.addEventListener('DOMContentLoaded', () => {
    loadCustomVocab();
    init();
    initVocabHandlers();
  });
})();
