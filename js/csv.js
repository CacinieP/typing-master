// csv.js —— CSV 解析/序列化与 HTML 转义工具（issue #7）
// 独立无 DOM 依赖，node scripts/test_units.js 可直接加载测试。
(function () {
  'use strict';

  const HEADERS = {
    european: 'word,meaning,phonetic,category,difficulty',
    japanese: 'word,reading,romaji,meaning,level,category,difficulty'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // CSV 序列化 + 公式注入防护（issue #7）：
  // 以 = + - @ 开头的字段在 Excel 中打开会被当公式执行（=HYPERLINK/WEBSERVICE 等），
  // 序列化时前置单引号（OWASP CSV Injection 惯例）。
  function escapeCSV(val) {
    let s = String(val == null ? '' : val);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // 单行解析（经典状态机，支持引号内逗号/双引号转义）。保留原行为供单行用例。
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
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  // 整段解析：先按 CSV 状态机切成记录（引号字段内可含换行，issue #7）。
  // 返回 [{ line: 起始行号(1-based), fields: [...] }]，空记录原样保留、由调用方跳过。
  function parseRecords(text) {
    const records = [];
    let fields = [];
    let current = '';
    let inQuotes = false;
    let line = 1;
    let recordLine = 1;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else {
          if (ch === '\n') line++;
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '\n' || ch === '\r') {
        fields.push(current);
        records.push({ line: recordLine, fields });
        fields = [];
        current = '';
        if (ch === '\r' && text[i + 1] === '\n') i++;
        line++;
        recordLine = line;
      } else {
        current += ch;
      }
    }
    // 收尾：末尾无换行的最后一条（含未闭合引号的容错）
    if (current !== '' || fields.length > 0) {
      fields.push(current);
      records.push({ line: recordLine, fields });
    }
    return records;
  }

  // 词汇 CSV 导入解析。返回 {error} 或 {words, categories, errors, type}。
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    text = text.replace(/^\uFEFF/, '');
    const records = parseRecords(text);
    if (records.length < 2) {
      return { error: '文件为空或格式不正确（至少需要标题行+数据行）' };
    }

    const header = records[0].fields.map(h => h.trim().toLowerCase());
    const required = {
      european: ['word', 'meaning', 'category', 'difficulty'],
      japanese: ['word', 'reading', 'romaji', 'meaning', 'category', 'difficulty']
    };
    const isJapanese = header.includes('reading') && header.includes('romaji');
    const type = isJapanese ? 'japanese' : 'european';
    const missing = required[type].filter(f => !header.includes(f));
    if (missing.length > 0) {
      return { error: '缺少必要列: ' + missing.join(', ') + '。需要的列: ' + HEADERS[type] };
    }

    const words = [];
    const categories = {};
    const errors = [];

    for (let r = 1; r < records.length; r++) {
      const { line, fields } = records[r];
      // 跳过空行（与旧版 trim 后 continue 的行为一致）
      if (fields.every(f => f.trim() === '')) continue;
      const row = {};
      header.forEach((h, idx) => { row[h] = (fields[idx] || '').trim(); });

      if (!row.word) { errors.push('第' + line + '行: word 为空，已跳过'); continue; }
      if (!row.meaning) { errors.push('第' + line + '行: meaning 为空，已跳过'); continue; }

      const diff = parseInt(row.difficulty);
      if (isNaN(diff) || diff < 1 || diff > 5) { errors.push('第' + line + '行: difficulty 应为1-5，已设为1'); }

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

  (typeof window !== 'undefined' ? window : globalThis).CsvUtils = {
    HEADERS, escapeHtml, escapeCSV, parseCSVLine, parseRecords, parseCSV
  };
})();
