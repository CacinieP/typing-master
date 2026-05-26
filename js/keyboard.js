// keyboard.js - Virtual keyboard for US International + Russian + Japanese Kana layouts

const LAYOUTS = {
  us_international: {
    rows: [
      [
        { key: '`', shift: '~', label: '`', sub: '~' },
        { key: '1', shift: '!', label: '1', sub: '!' },
        { key: '2', shift: '@', label: '2', sub: '@' },
        { key: '3', shift: '#', label: '3', sub: '#' },
        { key: '4', shift: '$', label: '4', sub: '$' },
        { key: '5', shift: '%', label: '5', sub: '%' },
        { key: '6', shift: '^', label: '6', sub: '^' },
        { key: '7', shift: '&', label: '7', sub: '&' },
        { key: '8', shift: '*', label: '8', sub: '*' },
        { key: '9', shift: '(', label: '9', sub: '(' },
        { key: '0', shift: ')', label: '0', sub: ')' },
        { key: '-', shift: '_', label: '-', sub: '_' },
        { key: '=', shift: '+', label: '=', sub: '+' },
      ],
      [
        { key: 'q', shift: 'Q', label: 'Q' },
        { key: 'w', shift: 'W', label: 'W' },
        { key: 'e', shift: 'E', label: 'E' },
        { key: 'r', shift: 'R', label: 'R' },
        { key: 't', shift: 'T', label: 'T' },
        { key: 'y', shift: 'Y', label: 'Y' },
        { key: 'u', shift: 'U', label: 'U' },
        { key: 'i', shift: 'I', label: 'I' },
        { key: 'o', shift: 'O', label: 'O' },
        { key: 'p', shift: 'P', label: 'P' },
        { key: '[', shift: '{', label: '[', sub: '{' },
        { key: ']', shift: '}', label: ']', sub: '}' },
        { key: '\\', shift: '|', label: '\\', sub: '|' },
      ],
      [
        { key: 'a', shift: 'A', label: 'A' },
        { key: 's', shift: 'S', label: 'S' },
        { key: 'd', shift: 'D', label: 'D' },
        { key: 'f', shift: 'F', label: 'F' },
        { key: 'g', shift: 'G', label: 'G' },
        { key: 'h', shift: 'H', label: 'H' },
        { key: 'j', shift: 'J', label: 'J' },
        { key: 'k', shift: 'K', label: 'K' },
        { key: 'l', shift: 'L', label: 'L' },
        { key: ';', shift: ':', label: ';', sub: ':' },
        { key: "'", shift: '"', label: "'", sub: '"', deadKey: 'acute' },
      ],
      [
        { key: 'z', shift: 'Z', label: 'Z' },
        { key: 'x', shift: 'X', label: 'X' },
        { key: 'c', shift: 'C', label: 'C' },
        { key: 'v', shift: 'V', label: 'V' },
        { key: 'b', shift: 'B', label: 'B' },
        { key: 'n', shift: 'N', label: 'N' },
        { key: 'm', shift: 'M', label: 'M' },
        { key: ',', shift: '<', label: ',', sub: '<' },
        { key: '.', shift: '>', label: '.', sub: '>' },
        { key: '/', shift: '?', label: '/', sub: '?' },
      ],
      [{ key: ' ', shift: ' ', label: 'Espace', cls: 'kb-space' }],
    ],
    // Dead key combos: deadKeyChar → { targetChar: producedChar }
    deadKeys: {
      "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', c: 'ć', n: 'ń', z: 'ź' },
      '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù' },
      '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ' },
      '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' },
    },
    altGrChars: {
      'c': 'ç', 'C': 'Ç',
      'a': 'á', 'A': 'Á',
      'e': 'é', 'E': 'É',
      'o': 'ó', 'O': 'Ó',
      's': 'ß',
      'y': '¥', 'S': '§',
      '1': '¡', '2': '²', '3': '³', '4': '¤', '5': '€',
    },
  },
  russian: {
    rows: [
      [
        { key: 'й', shift: 'Й', label: 'Й' },
        { key: 'ц', shift: 'Ц', label: 'Ц' },
        { key: 'у', shift: 'У', label: 'У' },
        { key: 'к', shift: 'К', label: 'К' },
        { key: 'е', shift: 'Е', label: 'Е' },
        { key: 'н', shift: 'Н', label: 'Н' },
        { key: 'г', shift: 'Г', label: 'Г' },
        { key: 'ш', shift: 'Ш', label: 'Ш' },
        { key: 'щ', shift: 'Щ', label: 'Щ' },
        { key: 'з', shift: 'З', label: 'З' },
        { key: 'х', shift: 'Х', label: 'Х' },
        { key: 'ъ', shift: 'Ъ', label: 'Ъ' },
      ],
      [
        { key: 'ф', shift: 'Ф', label: 'Ф' },
        { key: 'ы', shift: 'Ы', label: 'Ы' },
        { key: 'в', shift: 'В', label: 'В' },
        { key: 'а', shift: 'А', label: 'А' },
        { key: 'п', shift: 'П', label: 'П' },
        { key: 'р', shift: 'Р', label: 'Р' },
        { key: 'о', shift: 'О', label: 'О' },
        { key: 'л', shift: 'Л', label: 'Л' },
        { key: 'д', shift: 'Д', label: 'Д' },
        { key: 'ж', shift: 'Ж', label: 'Ж' },
        { key: 'э', shift: 'Э', label: 'Э' },
      ],
      [
        { key: 'я', shift: 'Я', label: 'Я' },
        { key: 'ч', shift: 'Ч', label: 'Ч' },
        { key: 'с', shift: 'С', label: 'С' },
        { key: 'м', shift: 'М', label: 'М' },
        { key: 'и', shift: 'И', label: 'И' },
        { key: 'т', shift: 'Т', label: 'Т' },
        { key: 'ь', shift: 'Ь', label: 'Ь' },
        { key: 'б', shift: 'Б', label: 'Б' },
        { key: 'ю', shift: 'Ю', label: 'Ю' },
        { key: '.', shift: ',', label: '.' },
      ],
      [{ key: ' ', shift: ' ', label: 'Пробел', cls: 'kb-space' }],
    ],
    deadKeys: {},
    altGrChars: {},
  },
  japanese_kana: {
    rows: [
      [
        { key: '1', shift: '!', label: '1' },
        { key: '2', shift: '"', label: '2' },
        { key: '3', shift: '#', label: '3' },
        { key: '4', shift: '$', label: '4' },
        { key: '5', shift: '%', label: '5' },
        { key: '6', shift: '&', label: '6' },
        { key: '7', shift: "'", label: '7' },
        { key: '8', shift: '(', label: '8' },
        { key: '9', shift: ')', label: '9' },
        { key: '0', shift: '', label: '0' },
        { key: '-', shift: '=', label: '-' },
        { key: '^', shift: '~', label: 'へ' },
        { key: '\\', shift: '|', label: 'ろ' },
      ],
      [
        { key: 'q', shift: 'Q', label: 'た' },
        { key: 'w', shift: 'W', label: 'て' },
        { key: 'e', shift: 'E', label: 'い' },
        { key: 'r', shift: 'R', label: 'す' },
        { key: 't', shift: 'T', label: 'か' },
        { key: 'y', shift: 'Y', label: 'ん' },
        { key: 'u', shift: 'U', label: 'な' },
        { key: 'i', shift: 'I', label: 'に' },
        { key: 'o', shift: 'O', label: 'ら' },
        { key: 'p', shift: 'P', label: 'せ' },
        { key: '@', shift: '`', label: '゛' },
        { key: '[', shift: '{', label: '゜' },
      ],
      [
        { key: 'a', shift: 'A', label: 'ち' },
        { key: 's', shift: 'S', label: 'と' },
        { key: 'd', shift: 'D', label: 'し' },
        { key: 'f', shift: 'F', label: 'は' },
        { key: 'g', shift: 'G', label: 'き' },
        { key: 'h', shift: 'H', label: 'く' },
        { key: 'j', shift: 'J', label: 'ま' },
        { key: 'k', shift: 'K', label: 'の' },
        { key: 'l', shift: 'L', label: 'り' },
        { key: ';', shift: '+', label: 'れ' },
        { key: ':', shift: '*', label: 'け' },
      ],
      [
        { key: 'z', shift: 'Z', label: 'つ' },
        { key: 'x', shift: 'X', label: 'さ' },
        { key: 'c', shift: 'C', label: 'そ' },
        { key: 'v', shift: 'V', label: 'ひ' },
        { key: 'b', shift: 'B', label: 'こ' },
        { key: 'n', shift: 'N', label: 'み' },
        { key: 'm', shift: 'M', label: 'も' },
        { key: ',', shift: '<', label: 'ね' },
        { key: '.', shift: '>', label: 'る' },
        { key: '/', shift: '?', label: 'め' },
      ],
      [{ key: ' ', shift: ' ', label: '空白', cls: 'kb-space' }],
    ],
    deadKeys: {},
    altGrChars: {},
  },
};

// US International key sequence map for accented characters
// Maps each accented char to the keystroke sequence needed
const ACCENT_SEQUENCES = {
  // Acute (')
  'é': ["'", 'e'], 'É': ["'", 'E'],
  'á': ["'", 'a'], 'Á': ["'", 'A'],
  'í': ["'", 'i'], 'Í': ["'", 'I'],
  'ó': ["'", 'o'], 'Ó': ["'", 'O'],
  'ú': ["'", 'u'], 'Ú': ["'", 'U'],
  // Grave (`)
  'è': ['`', 'e'], 'È': ['`', 'E'],
  'à': ['`', 'a'], 'À': ['`', 'A'],
  'ì': ['`', 'i'], 'Ì': ['`', 'I'],
  'ò': ['`', 'o'], 'Ò': ['`', 'O'],
  'ù': ['`', 'u'], 'Ù': ['`', 'U'],
  // Circumflex (^)
  'ê': ['^', 'e'], 'Ê': ['^', 'E'],
  'â': ['^', 'a'], 'Â': ['^', 'A'],
  'î': ['^', 'i'], 'Î': ['^', 'I'],
  'ô': ['^', 'o'], 'Ô': ['^', 'O'],
  'û': ['^', 'u'], 'Û': ['^', 'U'],
  // Diaeresis (")
  'ë': ['"', 'e'], 'Ë': ['"', 'E'],
  'ä': ['"', 'a'], 'Ä': ['"', 'A'],
  'ï': ['"', 'i'], 'Ï': ['"', 'I'],
  'ö': ['"', 'o'], 'Ö': ['"', 'O'],
  'ü': ['"', 'u'], 'Ü': ['"', 'U'],
  // Cedilla
  'ç': ['AltGr', 'c'], 'Ç': ['AltGr', 'C'],
  // Ligatures
  'œ': ['AltGr', 'o'], 'Œ': ['AltGr', 'O'],
  'æ': ['AltGr', 'a'], 'Æ': ['AltGr', 'A'],
  // Inverted punctuation
  '¡': ['AltGr', '1'],
  '¿': ['AltGr', '/'],
  // Tilde
  'ñ': ['~', 'n'], 'Ñ': ['~', 'N'],
  'ã': ['~', 'a'], 'Ã': ['~', 'A'],
  'õ': ['~', 'o'], 'Õ': ['~', 'O'],
};

class VirtualKeyboard {
  constructor(containerEl, hintEl) {
    this.container = containerEl;
    this.hintEl = hintEl;
    this.layout = null;
    this.keyElements = {};
    this.currentLang = null;
    this.inputMode = 'romaji';
  }

  setLanguage(lang, mode) {
    this.currentLang = lang;
    if (mode) this.inputMode = mode;
    if (lang === 'ru') {
      this.layout = LAYOUTS.russian;
    } else if (lang === 'ja' && this.inputMode === 'kana') {
      this.layout = LAYOUTS.japanese_kana;
    } else {
      this.layout = LAYOUTS.us_international;
    }
    this.render();
  }

  setInputMode(mode) {
    this.inputMode = mode;
    this.setLanguage(this.currentLang, mode);
  }

  render() {
    this.container.innerHTML = '';
    this.keyElements = {};
    if (!this.layout) return;

    this.layout.rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(keyDef => {
        const keyEl = document.createElement('div');
        keyEl.className = 'kb-key' + (keyDef.cls ? ' ' + keyDef.cls : '');
        keyEl.textContent = keyDef.label;
        if (keyDef.sub) {
          const sub = document.createElement('span');
          sub.className = 'sub-label';
          sub.textContent = keyDef.sub;
          keyEl.appendChild(sub);
        }
        const k = keyDef.key;
        this.keyElements[k] = keyEl;
        this.keyElements[keyDef.shift] = keyEl;
        rowEl.appendChild(keyEl);
      });
      this.container.appendChild(rowEl);
    });
  }

  highlightKey(char) {
    this.clearHighlights();
    if (!char) return;

    if (this.currentLang === 'ru' || (this.currentLang === 'ja' && this.inputMode === 'kana')) {
      const lower = char.toLowerCase();
      const el = this.keyElements[lower] || this.keyElements[char];
      if (el) el.classList.add('active-key');
      return;
    }

    // Japanese romaji mode - highlight the roman letter
    if (this.currentLang === 'ja' && this.inputMode === 'romaji') {
      const lower = char.toLowerCase();
      const el = this.keyElements[lower] || this.keyElements[char];
      if (el) el.classList.add('active-key');
      this.hintEl.textContent = '';
      return;
    }

    // For US International, check if it's an accented character
    const seq = ACCENT_SEQUENCES[char];
    if (seq) {
      // Highlight the dead key and the base key
      this.hintEl.textContent = this._formatHint(char, seq);
      const deadKeyEl = this.keyElements[seq[0]];
      if (deadKeyEl) {
        deadKeyEl.classList.add('dead-key');
      }
      const baseKeyEl = this.keyElements[seq[1].toLowerCase()] || this.keyElements[seq[1]];
      if (baseKeyEl) {
        baseKeyEl.classList.add('active-key');
      }
    } else {
      // Regular character
      const lower = char.toLowerCase();
      const el = this.keyElements[lower] || this.keyElements[char];
      if (el) el.classList.add('active-key');
      this.hintEl.textContent = '';
    }
  }

  showCorrect(char) {
    this.clearHighlights();
    const lower = char.toLowerCase();
    const el = this.keyElements[lower] || this.keyElements[char];
    if (el) {
      el.classList.add('correct-key');
      setTimeout(() => el.classList.remove('correct-key'), 300);
    }
  }

  showWrong(char) {
    this.clearHighlights();
    const lower = char.toLowerCase();
    const el = this.keyElements[lower] || this.keyElements[char];
    if (el) {
      el.classList.add('wrong-key');
      setTimeout(() => el.classList.remove('wrong-key'), 300);
    }
  }

  clearHighlights() {
    Object.values(this.keyElements).forEach(el => {
      el.classList.remove('active-key', 'correct-key', 'wrong-key', 'dead-key');
    });
    this.hintEl.textContent = '';
  }

  _formatHint(char, seq) {
    const deadKeyName = { "'": "' (锐音符 acute)", '`': '` (钝音符 grave)', '"': '" (分音符 diaeresis)', '^': '^ (长音符 circumflex)', '~': '~ (波浪号 tilde)', 'AltGr': 'AltGr' };
    const dk = deadKeyName[seq[0]] || seq[0];
    if (seq[0] === 'AltGr') {
      return `${char} = AltGr + ${seq[1]}`;
    }
    return `${char} = 先按 ${seq[0]}，再按 ${seq[1]}`;
  }
}

// Get the keystroke sequence for a character
function getKeySequence(char) {
  if (ACCENT_SEQUENCES[char]) return ACCENT_SEQUENCES[char];
  return [char];
}
