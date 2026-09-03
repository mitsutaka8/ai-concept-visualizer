# ai-concept-visualizer

バイブコーディングの学習中に出会った用語を1つ渡すと、その用語の図解HTMLを1本作る Claude Code のスキルです。

## セットアップ

Node.js が要ります（`node --version` でバージョンが出ればOK。無ければ [nodejs.org](https://nodejs.org/) から）。

リポジトリのルートで2つ実行してください。

```bash
npm install --prefix .claude/skills/ai-concept-visualizer/scripts
npx --prefix .claude/skills/ai-concept-visualizer/scripts playwright install chromium
```

図解の崩れを自動で検証するために使います（Chromium のダウンロードは初回のみ、約150MB）。

## 使い方

このリポジトリで Claude Code を開き、こう頼みます。

```
MCPって何？図解して
```

デザインを「ノーマル」と「新聞風」のどちらにするか聞かれるので、選んでください。

## 出力

`output/{用語}.html` に保存されます。ブラウザで開いて読み、印刷すればPDFになります。

サンプルとして `output/mcp.html` と `output/tokens.html` が入っています。

## 中身

| 場所 | 役割 |
|---|---|
| `.claude/skills/ai-concept-visualizer/SKILL.md` | 手順書。図解の構成や書き方のルール |
| `references/model-answer*.html` | 模範回答。図解の品質はここを基準に作られる |
| `references/base*.html` | 額縁テンプレート。フォントや配色の土台 |
| `scripts/verify-diagram.mjs` | レイアウト崩れの検証スクリプト |
| `docs/superpowers/` | 設計書と実装計画（使うだけなら読まなくてよい） |

図解の見た目を変えたいときは `references/model-answer*.html` を直します。
