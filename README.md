# Typing Master

[![Release](https://img.shields.io/github/v/release/CacinieP/typing-master?style=flat-square)](https://github.com/CacinieP/typing-master/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/CacinieP/typing-master/build.yml?branch=main&style=flat-square)](https://github.com/CacinieP/typing-master/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/CacinieP/typing-master?style=flat-square)](LICENSE)

A multilingual typing practice desktop app for people learning to type in a foreign language. Supports French, Spanish, Italian, Portuguese, Russian, German, and Japanese, with a focus on training accent marks, Cyrillic letters, kana input, and multi-keyboard-layout switching.

## Download

Download the latest version from [Releases](https://github.com/CacinieP/typing-master/releases/latest):

- Windows: `.exe` installer
- macOS Intel: `.dmg`
- macOS Apple Silicon: `arm64.dmg`

You can also run from source:

```bash
git clone https://github.com/CacinieP/typing-master.git
cd typing-master
npm install
npm start
```

Requires Node.js 18+.

## Highlights

- **7 languages**: French / Spanish / Italian / Portuguese / Russian / German / Japanese
- **3 modes**: Free practice, timed challenge, precision mode
- **Virtual keyboard**: Real-time display of the current key to press
- **Keyboard layouts**: US International, Russian ЙЦУКЕН, Japanese JIS kana layout
- **Japanese dual mode**: Romaji input / direct kana input
- **Difficulty levels**: European languages A1–C1 / Japanese JLPT N5–N1
- **Vocabulary management**: Download templates, import custom vocabulary, export current vocabulary
- **Practice statistics**: WPM, accuracy, category accuracy, error-prone character analysis

## Use Cases

| Scenario | Value |
|---|---|
| Learning French/Spanish/Italian/Portuguese | Train accent marks and special character input |
| Learning Russian | Familiarize with the ЙЦУКЕН keyboard layout |
| Learning Japanese | Switch between romaji input and direct kana input for training |
| Building custom word lists | Import classroom vocabulary, exam vocabulary, or professional terminology via CSV |

## Vocabulary CSV

European languages:

```csv
word,meaning,phonetic,category,difficulty
bonjour,hello,/bɔ̃ʒuʁ/,salutations,1
```

Japanese:

```csv
word,reading,romaji,meaning,level,category,difficulty
私,わたし,watashi,I,N5,noun_basic,1
```

## Project Structure

```text
├── main.js           # Electron main process
├── index.html        # App shell
├── css/style.css
├── js/
│   ├── renderer.js   # Practice logic and vocabulary management
│   ├── keyboard.js   # Virtual keyboard
│   └── stats.js      # Practice statistics
├── words/            # Built-in vocabulary
├── templates/        # CSV templates
└── manuals/          # Language-specific typing manuals
```

## Tech Stack

- Electron 33
- Native HTML/CSS/JavaScript
- localStorage persistence
- GitHub Actions release builds for Windows and macOS

## License

MIT

---

# Typing Master

[![Release](https://img.shields.io/github/v/release/CacinieP/typing-master?style=flat-square)](https://github.com/CacinieP/typing-master/releases/latest)
[![Build](https://img.shields.io/github/actions/workflow/status/CacinieP/typing-master/build.yml?branch=main&style=flat-square)](https://github.com/CacinieP/typing-master/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/CacinieP/typing-master?style=flat-square)](LICENSE)

多语言打字练习桌面应用，面向正在学习外语输入的人。支持法语、西班牙语、意大利语、葡萄牙语、俄语、德语和日语，重点训练重音符号、西里尔字母、假名输入和多键盘布局切换。

## Download

从 [Releases](https://github.com/CacinieP/typing-master/releases/latest) 下载最新版：

- Windows: `.exe` 安装包
- macOS Intel: `.dmg`
- macOS Apple Silicon: `arm64.dmg`

也可以从源码运行：

```bash
git clone https://github.com/CacinieP/typing-master.git
cd typing-master
npm install
npm start
```

需要 Node.js 18+。

## Highlights

- **7 种语言**：法语 / 西班牙语 / 意大利语 / 葡萄牙语 / 俄语 / 德语 / 日语
- **3 种模式**：自由练习、限时挑战、精确模式
- **虚拟键盘**：实时显示当前需要按的键位
- **键盘布局**：US International、俄语 ЙЦУКЕН、日语 JIS 假名布局
- **日语双模式**：罗马字输入 / 假名直接输入
- **难度分级**：欧洲语言 A1-C1 / 日语 JLPT N5-N1
- **词汇管理**：下载模板、导入自定义词汇、导出当前词汇
- **练习统计**：WPM、准确率、分类正确率、易错字符分析

## Use Cases

| 场景 | 价值 |
|---|---|
| 学法语/西语/意语/葡语 | 训练重音符号和特殊字符输入 |
| 学俄语 | 熟悉 ЙЦУКЕН 键盘布局 |
| 学日语 | 在罗马字输入和假名直接输入之间切换训练 |
| 自建词库 | 用 CSV 导入课堂词汇、考试词汇或专业术语 |

## Vocabulary CSV

欧洲语言：

```csv
word,meaning,phonetic,category,difficulty
bonjour,你好,/bɔ̃ʒuʁ/,salutations,1
```

日语：

```csv
word,reading,romaji,meaning,level,category,difficulty
私,わたし,watashi,我,N5,noun_basic,1
```

## Project Structure

```text
├── main.js           # Electron main process
├── index.html        # App shell
├── css/style.css
├── js/
│   ├── renderer.js   # Practice logic and vocabulary management
│   ├── keyboard.js   # Virtual keyboard
│   └── stats.js      # Practice statistics
├── words/            # Built-in vocabulary
├── templates/        # CSV templates
└── manuals/          # Language-specific typing manuals
```

## Tech Stack

- Electron 33
- Native HTML/CSS/JavaScript
- localStorage persistence
- GitHub Actions release builds for Windows and macOS

## License

MIT