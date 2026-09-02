# ai-concept-visualizer スキル 実装計画

> この計画書は実行時点の記録です。図解の正本は `.claude/skills/ai-concept-visualizer/references/model-answer.html` であり、以降の模範回答の変更をこの計画書へ反映する必要はありません。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** バイブコーディング学習中に出会った用語 1 つを、図中心の「用語カルテ型」8 セクションで図解する HTML を生成するプロジェクトスキルを作る。

**Architecture:** 既存スキル `~/.claude/skills/creating-visual-explainers` の土台（額縁テンプレート・Playwright 検証スクリプト）をこのリポジトリにコピーし、模範回答 HTML を「用語カルテ型」で新規に書き起こす。SKILL.md は手順書に徹し、デザインの詳細は模範回答に語らせる。

**Tech Stack:** 静的 HTML / Tailwind CSS (CDN) / Lucide Icons (CDN) / Node.js + Playwright（検証のみ）

**Spec:** [docs/superpowers/specs/2026-09-02-ai-concept-visualizer-design.md](../specs/2026-09-02-ai-concept-visualizer-design.md)

## Global Constraints

このセクションは全タスクの要件に暗黙に含まれる。

- スキルの設置場所: `.claude/skills/ai-concept-visualizer/`（このリポジトリのプロジェクトスキル）
- 生成した図解の保存先: リポジトリ直下の `output/`
- 出力はすべて日本語
- 図解の固定構成は 8 セクション（順序固定・省略不可）
- セクション見出しの直後は必ず図。地の文を先に置かない
- 地の文は図の後、最大 3 文
- 図で説明できない内容は載せない
- セクション 5 には画面再現を最低 1 つ入れる
- 専門用語は初出で括弧書き解説（例: 「API（ソフトウェア同士がやり取りするための窓口）」）
- 読者のレベルに言及しない（「初心者向け」「入門」等のラベル禁止）
- 禁止: React / shadcn-ui、絵文字、インタラクティブ要素・アニメーション、`<style>` タグ追加、`<script>` 追加、テンプレート外の外部リソース、テンプレートの額縁構造の変更
- 検証の合格条件: `node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs <html>` が `RESULT: CLEAN` を返すこと

**このプロジェクトの「テスト」は Playwright 検証スクリプト。** 単体テストのフレームワークは使わない。各タスクは「検証を走らせて崩れがないことを確認する」で締める。

---

### Task 1: 土台のセットアップ

既存スキルからテンプレートと検証スクリプトをコピーし、検証が走る状態にする。

**Files:**
- Create: `.claude/skills/ai-concept-visualizer/references/base.html`
- Create: `.claude/skills/ai-concept-visualizer/references/playwright-setup-guide.md`
- Create: `.claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs`
- Create: `.claude/skills/ai-concept-visualizer/scripts/package.json`
- Create: `.gitignore`
- Create: `output/.gitkeep`

**Interfaces:**
- Produces: `verify-diagram.mjs` の CLI。`node <path>/verify-diagram.mjs <html>` で検出モード、`--screenshot <prefix>` でスクショモード。標準出力の最終行が `RESULT: CLEAN` か `RESULT: ISSUES FOUND`
- Produces: `base.html` のプレースホルダー `<!-- TITLE -->` / `<!-- DESCRIPTION -->` / `<!-- CONTENT_START -->` 〜 `<!-- CONTENT_END -->`
- Produces: `base.html` の ADS 配色 Tailwind クラス。`bg-ads-bg` `bg-ads-surface` `bg-ads-hover` `border-ads-border` `text-ads-accent` `text-ads-text` `text-ads-muted` `text-ads-dim` `text-ads-positive` `text-ads-negative` `text-ads-warning`

- [ ] **Step 1: ディレクトリを作る**

```bash
mkdir -p .claude/skills/ai-concept-visualizer/references \
         .claude/skills/ai-concept-visualizer/scripts \
         output
touch output/.gitkeep
```

- [ ] **Step 2: 既存スキルから土台ファイルをコピーする**

`model-answer.html` はコピーしない（Task 2 で新規に書く）。

```bash
SRC=~/.claude/skills/creating-visual-explainers
DST=.claude/skills/ai-concept-visualizer
cp "$SRC/references/base.html"                 "$DST/references/base.html"
cp "$SRC/references/playwright-setup-guide.md" "$DST/references/playwright-setup-guide.md"
cp "$SRC/scripts/verify-diagram.mjs"           "$DST/scripts/verify-diagram.mjs"
cp "$SRC/scripts/package.json"                 "$DST/scripts/package.json"
```

- [ ] **Step 3: package.json の name をこのスキル用に直す**

コピー元は `creating-visual-explainers-scripts` になっている。

```bash
cd .claude/skills/ai-concept-visualizer/scripts
python3 - <<'PY'
import json
p = "package.json"
d = json.load(open(p))
d["name"] = "ai-concept-visualizer-scripts"
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
open(p, "a").write("\n")
PY
```

- [ ] **Step 4: playwright-setup-guide.md 内のパスをこのスキルに合わせる**

ガイドには `creating-visual-explainers` へのパスが 3 箇所ハードコードされている。放置すると誤った手順を案内してしまう。

```bash
python3 - <<'PY'
p = ".claude/skills/ai-concept-visualizer/references/playwright-setup-guide.md"
s = open(p).read()
s = s.replace(".claude/skills/creating-visual-explainers/scripts",
              ".claude/skills/ai-concept-visualizer/scripts")
s = s.replace("`creating-visual-explainers/scripts`",
              "`ai-concept-visualizer/scripts`")
open(p, "w").write(s)
PY
grep -n "creating-visual-explainers" .claude/skills/ai-concept-visualizer/references/playwright-setup-guide.md
```

期待: 何も出力されない（ヒットゼロ）。

- [ ] **Step 5: .gitignore を作る**

```bash
cat > .gitignore <<'EOF'
node_modules/
*-desktop.png
*-mobile.png
.DS_Store
EOF
```

- [ ] **Step 6: Playwright を導入する**

```bash
npm install --prefix .claude/skills/ai-concept-visualizer/scripts
npx --prefix .claude/skills/ai-concept-visualizer/scripts playwright install chromium
```

`command not found: npm` が出た場合は Node.js（LTS 版）が未導入。https://nodejs.org/ から入れてもらう。

- [ ] **Step 7: 検証スクリプトが動くことを確認する（土台の受け入れテスト）**

`base.html` は中身が空だが、レンダリング自体は通るので検証が動く確認に使える。

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     .claude/skills/ai-concept-visualizer/references/base.html
```

期待: 最終行が `RESULT: CLEAN`。
`[依存なし]` が出たら Step 6 の `npm install` を、`[ブラウザ未導入]` が出たら Step 6 の `playwright install chromium` をやり直す。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(cat <<'MSG'
Set up ai-concept-visualizer skill scaffolding

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: 模範回答 前半（セクション 1〜4）

模範回答は AI が品質基準を読み取る唯一の実物。題材は「環境変数」。
前半でヒーローから仕組み説明までを作り、デザインの方向性を確定させる。

**Files:**
- Create: `.claude/skills/ai-concept-visualizer/references/model-answer.html`

**Interfaces:**
- Consumes: Task 1 の `base.html`（額縁とプレースホルダー）、`verify-diagram.mjs`
- Produces: セクション 1〜4 の実装済み HTML。Task 3 はこの続きに 5〜8 を足す
- Produces: 各セクションの見出しマークアップの型。Task 3 は同じ型を使う

- [ ] **Step 1: base.html をコピーして model-answer.html の土台にする**

```bash
cp .claude/skills/ai-concept-visualizer/references/base.html \
   .claude/skills/ai-concept-visualizer/references/model-answer.html
```

- [ ] **Step 2: プレースホルダーを埋める**

- `<!-- TITLE -->`（2 箇所: `og:title` と `<title>`）→ `環境変数とは`
- `<!-- DESCRIPTION -->` → `APIキーやパスワードをコードの外に置いておく仕組みを、制作の流れに沿って図解します。`

- [ ] **Step 3: セクション 1（ヒーロー＋一言の答え）を書く**

`<!-- CONTENT_START -->` の直後に置く。バッジはトピックのカテゴリ（読者のレベルではない）。

```html
<header class="mb-14 md:mb-20">
  <span class="inline-block text-xs font-bold tracking-wider text-ads-accent bg-blue-50 px-3 py-1 rounded-full mb-4">開発ツール</span>
  <h1 class="text-3xl md:text-5xl font-black text-ads-text leading-tight mb-5">環境変数</h1>
  <div class="bg-ads-surface border border-ads-border rounded-xl p-6">
    <p class="text-lg md:text-xl font-bold text-ads-text leading-relaxed">
      プログラムの<span class="text-ads-accent">外側</span>に置いておく、人に見せたくない設定値のこと。
    </p>
  </div>
</header>
```

- [ ] **Step 4: セクション 2（一枚絵サマリー）を書く**

核心を 1 枚の図にする。「.env ファイル → 読み込む → プログラム」の関係図と、身近な接点ピル 3 個。

```html
<section class="mb-14 md:mb-20">
  <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-8">
    <div class="w-full md:w-auto md:flex-1 max-w-xs bg-white border-2 border-ads-accent rounded-xl p-5 text-center">
      <i data-lucide="file-key" class="w-8 h-8 text-ads-accent mx-auto mb-2"></i>
      <p class="font-bold text-ads-text">.env ファイル</p>
      <p class="text-sm text-ads-muted mt-1">秘密の値を書いておく場所</p>
    </div>
    <div class="flex md:flex-col items-center text-ads-dim">
      <i data-lucide="arrow-right" class="w-6 h-6 hidden md:block"></i>
      <i data-lucide="arrow-down" class="w-6 h-6 md:hidden"></i>
      <span class="text-xs ml-2 md:ml-0 md:mt-1">読み込む</span>
    </div>
    <div class="w-full md:w-auto md:flex-1 max-w-xs bg-white border-2 border-ads-border rounded-xl p-5 text-center">
      <i data-lucide="code-2" class="w-8 h-8 text-ads-muted mx-auto mb-2"></i>
      <p class="font-bold text-ads-text">プログラム</p>
      <p class="text-sm text-ads-muted mt-1">値そのものは書かない</p>
    </div>
  </div>
  <div class="flex flex-wrap justify-center gap-2">
    <span class="text-sm bg-ads-hover text-ads-muted px-3 py-1.5 rounded-full">APIキー（外部サービスの合言葉）</span>
    <span class="text-sm bg-ads-hover text-ads-muted px-3 py-1.5 rounded-full">パスワード</span>
    <span class="text-sm bg-ads-hover text-ads-muted px-3 py-1.5 rounded-full">データベースの接続先</span>
  </div>
  <p class="text-center text-ads-muted mt-6">ここからひとつずつ見ていきます。</p>
</section>
```

- [ ] **Step 5: セクション 3（なぜ必要？）を書く**

「ないとき ✗ / あるとき ✓」の左右対比。同じ観点を同じ行に揃える。
見出しの型はここで確定させ、以降のセクションで使い回す。

```html
<section class="mb-14 md:mb-20">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">なぜ必要？</h2>
  <div class="grid md:grid-cols-2 gap-4">
    <div class="border-2 border-red-200 rounded-xl overflow-hidden">
      <div class="bg-red-50 px-5 py-3 flex items-center gap-2">
        <i data-lucide="x-circle" class="w-5 h-5 text-ads-negative"></i>
        <p class="font-bold text-ads-negative">コードに直接書く</p>
      </div>
      <div class="p-5 space-y-3">
        <p class="font-mono text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">apiKey = "sk-abc123..."</p>
        <p class="text-sm text-ads-muted">コードを GitHub に上げた瞬間、鍵も一緒に公開される</p>
      </div>
    </div>
    <div class="border-2 border-emerald-200 rounded-xl overflow-hidden">
      <div class="bg-emerald-50 px-5 py-3 flex items-center gap-2">
        <i data-lucide="check-circle-2" class="w-5 h-5 text-ads-positive"></i>
        <p class="font-bold text-ads-positive">環境変数にする</p>
      </div>
      <div class="p-5 space-y-3">
        <p class="font-mono text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">apiKey = process.env.API_KEY</p>
        <p class="text-sm text-ads-muted">コードには置き場所だけ。鍵は手元に残る</p>
      </div>
    </div>
  </div>
  <p class="text-ads-muted mt-6">APIキーは、他人に使われると料金だけこちらに請求されます。だから外に出す必要があります。</p>
</section>
```

- [ ] **Step 6: セクション 4（どう動く？）を書く**

番号つきステップフロー。デスクトップは横並び、モバイルは縦。各ステップで色を変える。

```html
<section class="mb-14 md:mb-20">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">どう動く？</h2>
  <div class="grid md:grid-cols-3 gap-4">
    <div class="bg-ads-surface border border-ads-border rounded-xl p-5">
      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ads-accent text-white text-sm font-bold mb-3">1</span>
      <p class="font-bold text-ads-text mb-1">.env に書く</p>
      <p class="font-mono text-xs bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto">API_KEY=sk-abc123</p>
    </div>
    <div class="bg-ads-surface border border-ads-border rounded-xl p-5">
      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ads-warning text-white text-sm font-bold mb-3">2</span>
      <p class="font-bold text-ads-text mb-1">起動時に読み込まれる</p>
      <p class="text-sm text-ads-muted">プログラムが立ち上がるとき、.env の中身が記憶される</p>
    </div>
    <div class="bg-ads-surface border border-ads-border rounded-xl p-5">
      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ads-positive text-white text-sm font-bold mb-3">3</span>
      <p class="font-bold text-ads-text mb-1">名前で呼び出す</p>
      <p class="font-mono text-xs bg-slate-900 text-slate-100 rounded p-2 overflow-x-auto">process.env.API_KEY</p>
    </div>
  </div>
  <p class="text-ads-muted mt-6">値そのものではなく「API_KEY という名前」でやり取りするのがポイントです。名前だけならコードに書いても安全です。</p>
</section>
```

- [ ] **Step 7: 検証を走らせる**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     .claude/skills/ai-concept-visualizer/references/model-answer.html
```

期待: `RESULT: CLEAN`。
`RESULT: ISSUES FOUND` が出たら、レポートに挙がった要素を修正して再実行する。最大 3 回まで。

- [ ] **Step 8: スクショを撮って目視で確認する**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     .claude/skills/ai-concept-visualizer/references/model-answer.html \
     --screenshot /tmp/model-answer
```

`/tmp/model-answer-desktop.png` と `/tmp/model-answer-mobile.png` を Read して、余白・整列・全体の印象を確認する。明らかな問題があれば 1 回だけ直して撮り直す。

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "$(cat <<'MSG'
Add model answer sections 1-4 (environment variables)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 3: 模範回答 後半（セクション 5〜8）

このスキル固有の中核であるセクション 5「制作シーンで見る」を含む後半を作る。

**Files:**
- Modify: `.claude/skills/ai-concept-visualizer/references/model-answer.html`

**Interfaces:**
- Consumes: Task 2 のセクション見出しの型（`<h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">`）とセクション外枠（`<section class="mb-14 md:mb-20">`）
- Produces: 完成した `model-answer.html`。Task 4 の SKILL.md はこれを「品質基準」として参照する

- [ ] **Step 1: セクション 5（制作シーンで見る）を書く**

作業タイムライン＋画面再現の 2 段構え。★マークで用語が登場する瞬間を示す。

```html
<section class="mb-14 md:mb-20">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">制作シーンで見る</h2>

  <div class="bg-ads-surface border border-ads-border rounded-xl p-5 mb-6">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="text-center">
        <i data-lucide="message-square" class="w-6 h-6 text-ads-dim mx-auto mb-2"></i>
        <p class="text-xs text-ads-muted">AIに天気APIを<br>使いたいと頼む</p>
      </div>
      <div class="text-center">
        <i data-lucide="file-code" class="w-6 h-6 text-ads-dim mx-auto mb-2"></i>
        <p class="text-xs text-ads-muted">コードが<br>できあがる</p>
      </div>
      <div class="text-center bg-blue-50 rounded-lg py-2 -my-2 ring-2 ring-ads-accent">
        <i data-lucide="alert-triangle" class="w-6 h-6 text-ads-accent mx-auto mb-2"></i>
        <p class="text-xs font-bold text-ads-accent">ここで登場<br>「環境変数に設定を」</p>
      </div>
      <div class="text-center">
        <i data-lucide="check-circle-2" class="w-6 h-6 text-ads-dim mx-auto mb-2"></i>
        <p class="text-xs text-ads-muted">.envを作ると<br>動き出す</p>
      </div>
    </div>
  </div>

  <div class="rounded-xl overflow-hidden border border-slate-700 mb-4">
    <div class="bg-slate-800 px-4 py-2 flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-full bg-red-400"></span>
      <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
      <span class="w-3 h-3 rounded-full bg-green-400"></span>
      <span class="text-xs text-slate-400 ml-3">ターミナル</span>
    </div>
    <div class="bg-slate-900 p-4 font-mono text-xs md:text-sm overflow-x-auto">
      <p class="text-slate-400">$ npm run dev</p>
      <p class="text-red-400 mt-2">Error: API_KEY is not defined</p>
      <p class="text-slate-500 mt-2">↑ 「API_KEY という環境変数が見つからない」という意味</p>
    </div>
  </div>

  <div class="rounded-xl overflow-hidden border border-ads-border">
    <div class="bg-ads-hover px-4 py-2 flex items-center gap-2">
      <i data-lucide="file-text" class="w-4 h-4 text-ads-muted"></i>
      <span class="text-xs text-ads-muted font-mono">.env</span>
    </div>
    <div class="bg-white p-4 font-mono text-xs md:text-sm overflow-x-auto">
      <p class="text-ads-text">API_KEY=<span class="text-ads-accent">sk-abc123456789</span></p>
    </div>
  </div>

  <p class="text-ads-muted mt-6">AI が書いたコードは「値を入れる場所」だけを用意します。中身を入れるのは自分の仕事です。このエラーが出たら、.env ファイルを作れば動き出します。</p>
</section>
```

- [ ] **Step 2: セクション 6（よくある勘違い）を書く**

赤ヘッダーに誤解、本文に緑で正解。2 件。

```html
<section class="mb-14 md:mb-20">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">よくある勘違い</h2>
  <div class="space-y-4">
    <div class="border border-ads-border rounded-xl overflow-hidden">
      <div class="bg-red-50 px-5 py-3">
        <p class="font-bold text-ads-negative">✗ .env に書けば暗号化されて安全</p>
      </div>
      <div class="p-5">
        <p class="font-bold text-ads-positive mb-1">✓ ただのテキストファイル。誰でも中身を読める</p>
        <p class="text-sm text-ads-muted">安全なのは暗号化されているからではなく、Git（変更履歴を記録するツール）に含めず手元に留めるからです。</p>
      </div>
    </div>
    <div class="border border-ads-border rounded-xl overflow-hidden">
      <div class="bg-red-50 px-5 py-3">
        <p class="font-bold text-ads-negative">✗ .env も GitHub にアップする</p>
      </div>
      <div class="p-5">
        <p class="font-bold text-ads-positive mb-1">✓ .gitignore（Gitに含めないファイルの指定）に書いて除外する</p>
        <p class="text-sm text-ads-muted">代わりに、値を空にした .env.example（共有用のひな形）を置いて「何を設定すればいいか」だけを共有します。</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: セクション 7（AI への伝え方）を書く**

指示例の Before / After。実際にコピーして使える文にする。

```html
<section class="mb-14 md:mb-20">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">AIへの伝え方</h2>
  <div class="grid md:grid-cols-2 gap-4">
    <div class="border border-ads-border rounded-xl p-5 bg-ads-surface">
      <p class="text-xs font-bold text-ads-dim mb-3">BEFORE</p>
      <p class="text-ads-muted">「天気APIを使う機能を作って」</p>
      <p class="text-sm text-ads-negative mt-3">→ APIキーがコードに直接書かれることがある</p>
    </div>
    <div class="border-2 border-ads-accent rounded-xl p-5 bg-white">
      <p class="text-xs font-bold text-ads-accent mb-3">AFTER</p>
      <p class="text-ads-text font-medium">「天気APIを使う機能を作って。APIキーは環境変数で読み込む形にして、.env.example も用意して」</p>
      <p class="text-sm text-ads-positive mt-3">→ 最初から安全な形で出てくる</p>
    </div>
  </div>
</section>
```

- [ ] **Step 4: セクション 8（これだけ覚えればOK）を書く**

3 行まとめ。`<!-- CONTENT_END -->` の直前に置く。

```html
<section class="mb-6">
  <h2 class="text-2xl md:text-3xl font-black text-ads-text mb-6">これだけ覚えればOK</h2>
  <div class="bg-ads-surface border-l-4 border-ads-accent rounded-r-xl p-6 space-y-3">
    <p class="flex gap-3 text-ads-text"><span class="font-black text-ads-accent">1</span><span>見せたくない値は、コードではなく <span class="font-mono text-sm bg-ads-hover px-1.5 py-0.5 rounded">.env</span> に書く</span></p>
    <p class="flex gap-3 text-ads-text"><span class="font-black text-ads-accent">2</span><span>コードには値ではなく「名前」だけを書く</span></p>
    <p class="flex gap-3 text-ads-text"><span class="font-black text-ads-accent">3</span><span><span class="font-mono text-sm bg-ads-hover px-1.5 py-0.5 rounded">.env</span> は <span class="font-mono text-sm bg-ads-hover px-1.5 py-0.5 rounded">.gitignore</span> に入れて、絶対に公開しない</span></p>
  </div>
</section>
```

- [ ] **Step 5: 検証を走らせる**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     .claude/skills/ai-concept-visualizer/references/model-answer.html
```

期待: `RESULT: CLEAN`。崩れが出たら修正して再実行（最大 3 回）。

- [ ] **Step 6: スクショを撮って全体を目視で確認する**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     .claude/skills/ai-concept-visualizer/references/model-answer.html \
     --screenshot /tmp/model-answer
```

2 枚を Read して確認する。特に見る点:
- 8 セクションの流れが一本につながっているか
- 各セクションで、見出しの直後が図になっているか（地の文が先に来ていないか）
- 地の文が 3 文以内に収まっているか
- モバイルでタイムラインやコードブロックがはみ出していないか

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "$(cat <<'MSG'
Complete model answer with sections 5-8

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: SKILL.md の執筆

手順書に徹する。デザインの詳細は模範回答に語らせ、ここには書き写さない。

**Files:**
- Create: `.claude/skills/ai-concept-visualizer/SKILL.md`

**Interfaces:**
- Consumes: Task 1 の `base.html` / `verify-diagram.mjs` / `playwright-setup-guide.md`、Task 3 の `model-answer.html`

- [ ] **Step 1: frontmatter を書く**

`description` は「いつ使うか」が判別できる形にする。

```yaml
---
name: ai-concept-visualizer
description: バイブコーディングの学習中に出会った用語・概念を1つ受け取り、図中心の用語カルテ型で図解HTMLを生成するスキル。「◯◯って何？図解して」「この用語がわからない、図解して」と依頼された際に使用する。
---
```

- [ ] **Step 2: 概要・依存・ワークフローのチェックリストを書く**

```markdown
# AI Concept Visualizer

バイブコーディングの学習中に出会った用語を 1 つ受け取り、図解 HTML を生成する。
説明文ではなく図で理解させることを最優先にする。

## 依存

- `references/model-answer.html` — 模範回答。品質基準・デザイン・情報量はここから読み取る
- `references/base.html` — 額縁テンプレート
- `scripts/verify-diagram.mjs` — レイアウト崩れの検証スクリプト
- `references/playwright-setup-guide.md` — Playwright 未導入時の案内

## ワークフロー

- [ ] Step 1: 模範回答とテンプレートを読む
- [ ] Step 2: ウェブで調べる
- [ ] Step 3: 8 セクションで書く
- [ ] Step 4: ファイルを作る
- [ ] Step 5: 検証する
- [ ] Step 6: 報告する
```

- [ ] **Step 3: 各ステップの手順を書く**

散文にせず箇条書きで。以下の内容を含める。

- **Step 1**: `references/model-answer.html` を読んで品質基準とデザインを把握する。`references/base.html` を読んでプレースホルダーの位置を把握する
- **Step 2**: ウェブ検索を 2〜3 回。観点は「正確な定義」「最新動向」「制作シーンでの実例」。採用した事実の出典 URL を控える
- **Step 3**: 8 セクション構成の表（下記 Step 4 で書く）に沿って書く
- **Step 4**: `base.html` をリポジトリ直下の `output/{スラッグ}.html` にコピーし、`<!-- TITLE -->` `<!-- DESCRIPTION -->` `<!-- CONTENT_START -->`〜`<!-- CONTENT_END -->` を置換する。スラッグは短い英単語（例: `env-vars`, `git-commit`）
- **Step 5**: 検証コマンドを実行 → `RESULT: CLEAN` になるまで修正（最大 3 回）→ 最後に 1 回だけスクショを撮って目視 → スクショを削除
- **Step 6**: 完成報告のフォーマット（タイトル / 1〜2 文の要約 / 保存先 / 検証結果と残課題 / 主なポイント 3〜5 個）

- [ ] **Step 4: 8 セクション構成を表で書く**

```markdown
## 図解の構成（順序固定・省略不可）

| # | セクション | 主役の図 |
|---|---|---|
| 1 | ヒーロー＋一言の答え | カテゴリバッジ＋太字1文 |
| 2 | 一枚絵サマリー | 核心の図＋身近な接点ピル |
| 3 | なぜ必要？ | 「ないとき ✗ / あるとき ✓」左右対比 |
| 4 | どう動く？ | 番号つきステップフロー |
| 5 | 制作シーンで見る | 作業タイムライン＋画面再現 |
| 6 | よくある勘違い | ✗誤解 → ✓正解カード |
| 7 | AIへの伝え方 | 指示例 Before / After |
| 8 | これだけ覚えればOK | 3行まとめ |

### セクション 5 の要件

このスキルの中核。次の 2 つを必ず入れる。

- **作業タイムライン** — バイブコーディングの作業の流れの中で、その用語が登場する瞬間を ★ でマークした横並びの図
- **画面再現** — ターミナル / エディタ / チャット / ブラウザのいずれかを Tailwind CSS で再現し、その用語が現れる箇所を指し示す

作っているものが会話からわかればその文脈を使う。わからなければ典型的な場面（Web アプリを作る / エラーが出た / デプロイする）を使う。
```

- [ ] **Step 5: 書き方のルールと禁止事項を書く**

```markdown
## 書き方

- セクション見出しの直後は必ず図。地の文を先に置かない
- 地の文は図の後、最大 3 文
- 図で説明できない内容は載せない
- 専門用語は初出で括弧書き解説する
- 採用した事実の近くに出典リンクを小さく添える（`text-xs text-ads-dim`）
- 日本語で書く
- 読者のレベルに言及しない（「初心者向け」「入門」等のラベルを使わない）

## 禁止事項

- React・shadcn/ui を使わない
- 絵文字を使わない（アイコンは Lucide Icons）
- インタラクティブ要素・アニメーションを入れない
- `<style>` タグ・`style` 属性を追加しない（Tailwind クラスで書く）
- `<script>` を追加しない
- テンプレート以外の外部リソースを読み込まない
- テンプレートの額縁構造（`<head>`・CDN・meta）を変更しない
```

- [ ] **Step 6: SKILL.md の分量を確認する**

```bash
wc -l .claude/skills/ai-concept-visualizer/SKILL.md
```

期待: 120 行以内。超えている場合は、模範回答を読めばわかるデザインの説明が紛れ込んでいないか見直して削る。

- [ ] **Step 7: 参照先のパスが実在することを確認する**

```bash
cd .claude/skills/ai-concept-visualizer
ls references/model-answer.html references/base.html \
   references/playwright-setup-guide.md scripts/verify-diagram.mjs
```

期待: 4 ファイルすべてが表示される。

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(cat <<'MSG'
Add SKILL.md for ai-concept-visualizer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: 試験実行と調整

スキルを実際に使って 1 本生成し、想定どおり動くかを確かめる。
ここでの気づきを model-answer.html と SKILL.md に反映する。

**Files:**
- Create: `output/{スラッグ}.html`
- Modify: `.claude/skills/ai-concept-visualizer/SKILL.md`（必要なら）
- Modify: `.claude/skills/ai-concept-visualizer/references/model-answer.html`（必要なら）

**Interfaces:**
- Consumes: Task 4 の `SKILL.md`（手順どおりに実行する）

- [ ] **Step 1: 題材を決めてスキルを実行する**

模範回答（環境変数）とは毛色の違う用語を選ぶ。推奨: `MCP` または `コンテキストウィンドウ`。
SKILL.md の Step 1〜5 を、書かれているとおりに実行する。手順に迷った箇所はメモしておく。

- [ ] **Step 2: 検証が通ることを確認する**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs output/{スラッグ}.html
```

期待: `RESULT: CLEAN`。

- [ ] **Step 3: 生成物を目視で確認する**

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs \
     output/{スラッグ}.html --screenshot /tmp/trial
```

2 枚を Read して確認する。チェック項目:
- 8 セクションがすべて入っているか
- セクション 5 に作業タイムラインと画面再現の両方があるか
- 見出しの直後が図になっているか
- 地の文が 3 文以内か
- 模範回答と同じ品質水準に達しているか

- [ ] **Step 4: 気づきをスキルに反映する**

Step 1〜3 で見つかった問題を分類して直す。

- 手順が曖昧で迷った → SKILL.md を直す
- デザイン・情報量が足りない → model-answer.html を直す（直したら Task 3 Step 5 の検証を再実行）

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(cat <<'MSG'
Add trial output and refine skill based on first run

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 6: ユーザーにデザインの確認を依頼する**

生成した図解をユーザーに見てもらい、デザインの方向性を決める。
設計時の約束どおり、ここから先は実際の生成物を見ながら model-answer.html を育てていく。
