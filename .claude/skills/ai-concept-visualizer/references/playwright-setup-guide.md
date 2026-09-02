# Playwright セットアップガイド

図解HTMLのビジュアル検証（レンダリングして崩れを検出・スクショ取得）には Playwright と Chromium が必要。
未導入のときだけこの手順を案内する。導入済みなら何もしなくてよい。

## 前提: Node.js

`node --version` でバージョン番号が出ればOK。`command not found` の場合は、まず Node.js（LTS版）を https://nodejs.org/ から入れてもらう。

## 導入手順（2コマンド）

スキルの `scripts/` ディレクトリで実行する。

```bash
# 1. playwright 本体を入れる（scripts/package.json の依存をインストール）
npm install --prefix .claude/skills/ai-concept-visualizer/scripts

# 2. Chromium ブラウザ本体をダウンロードする（初回のみ・約150MB）
npx --prefix .claude/skills/ai-concept-visualizer/scripts playwright install chromium
```

> パスはスキルの設置場所に合わせて読み替える。リポジトリ内で開発中なら
> `ai-concept-visualizer/scripts` のように相対パスで指定する。

## よくあるエラーと対応

エラーメッセージはそのまま見せず、何が起きていて何をすれば直るかを平易に説明する。

| 症状 | 対応 |
|------|------|
| `playwright が見つかりません` | 上の手順1（`npm install`）を実行する |
| `Chromium を起動できません` / `Executable doesn't exist` | 上の手順2（`playwright install chromium`）を実行する |
| `command not found: npm` / `node` | Node.js が未導入。https://nodejs.org/ から入れる |
| ダウンロードが遅い・止まる | ネットワークを確認して手順2を再実行する |

## 確認

導入後、検証スクリプトを一度動かして確認できる。

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs <検証したいHTMLファイル>
```

`RESULT: CLEAN` または `RESULT: ISSUES FOUND` が出れば正常に動いている。
