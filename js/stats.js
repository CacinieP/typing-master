// stats.js - Statistics tracking with localStorage

class StatsManager {
  constructor() {
    this.storageKey = 'typing-game-stats';
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch { return {}; }
  }

  _save(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  record(lang, session) {
    const data = this._load();
    if (!data[lang]) {
      data[lang] = { sessions: [], chars: {} };
    }
    data[lang].sessions.push({
      ...session,
      timestamp: Date.now()
    });
    // Keep last 100 sessions per language
    if (data[lang].sessions.length > 100) {
      data[lang].sessions = data[lang].sessions.slice(-100);
    }
    // Track character errors
    if (session.charErrors) {
      for (const [ch, count] of Object.entries(session.charErrors)) {
        if (!data[lang].chars[ch]) data[lang].chars[ch] = { total: 0, errors: 0 };
        data[lang].chars[ch].total += count.total || 0;
        data[lang].chars[ch].errors += count.errors || 0;
      }
    }
    this._save(data);
  }

  getStats(lang) {
    const data = this._load();
    const ld = data[lang];
    if (!ld || !ld.sessions.length) return null;

    const sessions = ld.sessions;
    const totalSessions = sessions.length;
    const avgWpm = Math.round(sessions.reduce((s, x) => s + x.wpm, 0) / totalSessions);
    const avgAccuracy = Math.round(sessions.reduce((s, x) => s + x.accuracy, 0) / totalSessions);
    const bestWpm = Math.max(...sessions.map(x => x.wpm));
    const totalWords = sessions.reduce((s, x) => s + (x.correct + x.wrong), 0);
    const totalCorrect = sessions.reduce((s, x) => s + x.correct, 0);

    // Problem characters
    const charStats = Object.entries(ld.chars || {})
      .map(([ch, s]) => ({ char: ch, errorRate: s.errors / Math.max(s.total, 1), ...s }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);

    // Category accuracy
    const catStats = {};
    sessions.forEach(s => {
      if (s.categoryStats) {
        for (const [cat, st] of Object.entries(s.categoryStats)) {
          if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 };
          catStats[cat].correct += st.correct;
          catStats[cat].total += st.total;
        }
      }
    });

    return {
      totalSessions, avgWpm, avgAccuracy, bestWpm,
      totalWords, totalCorrect,
      charStats, catStats
    };
  }

  reset(lang) {
    const data = this._load();
    if (lang) {
      delete data[lang];
    } else {
      // Reset all
      for (const k of Object.keys(data)) delete data[k];
    }
    this._save(data);
  }

  renderStats(lang, containerEl) {
    const stats = this.getStats(lang);
    if (!stats) {
      containerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim)">暂无数据 Aucune donnée</p>';
      return;
    }

    const langNames = { fr: '法语 Français', es: '西班牙语 Español', it: '意大利语 Italiano', pt: '葡萄牙语 Português', ru: '俄语 Русский' };
    let html = `<h3 style="text-align:center;margin-bottom:16px">${langNames[lang] || lang}</h3>`;

    // Summary
    html += '<div class="stats-grid">';
    html += `<div class="stats-card"><div class="sc-title">总练习次数 Sessions</div><div class="sc-value">${stats.totalSessions}</div></div>`;
    html += `<div class="stats-card"><div class="sc-title">总打词数 Mots</div><div class="sc-value">${stats.totalWords}</div></div>`;
    html += `<div class="stats-card"><div class="sc-title">平均速度 WPM moyen</div><div class="sc-value" style="color:var(--accent)">${stats.avgWpm}</div></div>`;
    html += `<div class="stats-card"><div class="sc-title">最佳速度 Meilleur WPM</div><div class="sc-value" style="color:var(--green)">${stats.bestWpm}</div></div>`;
    html += `<div class="stats-card"><div class="sc-title">平均准确率 Précision</div><div class="sc-value" style="color:var(--yellow)">${stats.avgAccuracy}%</div></div>`;
    html += `<div class="stats-card"><div class="sc-title">总正确率 Correct</div><div class="sc-value">${stats.totalWords > 0 ? Math.round(stats.totalCorrect / stats.totalWords * 100) : 0}%</div></div>`;
    html += '</div>';

    // Problem characters
    if (stats.charStats && stats.charStats.length > 0) {
      html += '<h4 style="margin-top:20px;color:var(--red)">常错字符 Caractères difficiles</h4>';
      html += '<div class="stats-bar-container">';
      stats.charStats.forEach(cs => {
        const pct = Math.round(cs.errorRate * 100);
        const color = pct > 30 ? 'var(--red)' : pct > 15 ? 'var(--orange)' : 'var(--yellow)';
        html += `<div class="stats-bar">
          <span class="sb-label" style="font-family:Consolas;font-size:16px">${cs.char}</span>
          <div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="sb-value" style="color:${color}">${pct}%</span>
        </div>`;
      });
      html += '</div>';
    }

    containerEl.innerHTML = html;
  }
}
