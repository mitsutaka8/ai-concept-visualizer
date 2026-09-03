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

## 工夫していること

**図が主役で、文章は脇役です。** セクションの見出しの直後には必ず図が来ます。地の文は図の後に最大3文まで。読み飛ばしても図だけで骨格が伝わる状態を保っています。

**「その用語が、自分の作業のどの瞬間に出てくるか」を必ず入れます。** 用語集や公式ドキュメントが教えてくれないのはここです。作業のタイムラインの中で、その用語が顔を出す1コマだけを強調し、そのときのターミナルやエディタの画面も再現します。

**理解して終わりにしません。** 「AIへの伝え方」というセクションで、その用語を知った結果、AIへの指示がどう変わるかを Before / After で示します。

**次に何を調べるかまで書きます。** 1本読み終えた直後が、次の1本を決めるべき瞬間だからです。

**出荷前に2段階チェックします。** 内容（図と文章が矛盾していないか、コマンドが実際に通るか、解説のない専門用語が残っていないか）と、見た目（Playwright で実際にブラウザに描画し、はみ出しや見切れを検出）の両方です。

**知らないと事故ることは、削りません。** 「図にできない内容は載せない」を原則にしていますが、安全・費用・本番環境の話だけは例外です。図にできなくても注記として残します。

## 中身

| 場所 | 役割 |
|---|---|
| `.claude/skills/ai-concept-visualizer/SKILL.md` | 手順書。図解の構成や書き方のルール |
| `references/model-answer*.html` | 模範回答。図解の品質はここを基準に作られる |
| `references/base*.html` | 額縁テンプレート。フォントや配色の土台 |
| `scripts/verify-diagram.mjs` | レイアウト崩れの検証スクリプト |

図解の見た目を変えたいときは `references/model-answer*.html` を直します。

## 配る人向け: セットアップ用プロンプト

これから使う人には、次の2本を順番に渡してください。Claude Code に貼り付けて使います。

1本目で環境を整え、「準備完了」と返ってきたら2本目を渡します。**Node.js を新しく入れた場合は、
ターミナルを開き直してから2本目に進んでもらってください**（PATH の更新が反映されないため）。

### 1本目: 環境の準備

````markdown
これから ai-concept-visualizer というスキルを使います。その前に、必要な実行環境が
揃っているか確認し、足りなければ用意してください。

## 確認する

| 必要なもの | 確認コマンド | 条件 |
|---|---|---|
| git | `git --version` | 入っていること |
| Node.js | `node --version` | **v20 以上** |
| npm | `npm --version` | 入っていること |

3つとも条件を満たしていれば「準備完了です」と報告して終わってください。
何もインストールする必要はありません。

## 足りないものがあった場合

まず私に「◯◯が足りません。入れてよいですか」と確認してください。承諾を得るまで
インストールを実行しないでください。

承諾を得たら、次の順で進めてください。

1. パッケージ管理ツールがあるか調べる
   （macOS: `brew --version` / Windows: `winget --version` / Linux: `apt --version` など）
2. あれば、それで導入する
   - macOS: `brew install node`
   - Windows: `winget install OpenJS.NodeJS.LTS`
   - Linux: ディストリビューションの手順に従う
3. 導入後、`node --version` で v20 以上になったことを確認する

## 自動で進めず、私に指示を出してほしい場合

- パッケージ管理ツールが無い → https://nodejs.org/ の LTS 版を入れる手順を教えてください
- 管理者パスワードを求められた → コマンドを提示してください。私が自分で実行します
- macOS で git が無く、ダイアログが出た → 画面の指示を教えてください

## 最後に報告する

- 3つそれぞれのバージョン
- 何かをインストールした場合は、ターミナルを開き直す必要があるかどうか
````

### 2本目: クローンとセットアップ

````markdown
ai-concept-visualizer というスキルのリポジトリをセットアップしてください。
https://github.com/mitsutaka8/ai-concept-visualizer.git

## 1. 前提を確認する（インストールはしない）

`git --version` と `node --version` を実行してください。
git が無い、または Node.js が v20 未満なら、そこで止めて
「先に環境準備のプロンプトを実行してください」と私に伝えてください。

## 2. 保存場所を私に質問する（必須）

どこに保存するかを私に聞いてください。選択肢は2つです。

- 自分で指定する — 私がパスを答えます
- お任せ — ホームフォルダ直下の `~/src` に保存してください。`~/src` が
  無ければ作成し、既にあればその中に入れてください

私が答えるまで、クローンを実行しないでください。

## 3. クローンする

保存場所に `ai-concept-visualizer` フォルダが既にある場合は、上書きせずに私に知らせて
ください。無ければクローンしてください。

## 4. セットアップする

クローンしたフォルダのルートで、次の2つを実行してください。

```bash
npm install --prefix .claude/skills/ai-concept-visualizer/scripts
npx --prefix .claude/skills/ai-concept-visualizer/scripts playwright install chromium
```

2つ目は Chromium のダウンロード（約150MB）で、数分かかることがあります。

## 5. 動作確認する

```bash
node .claude/skills/ai-concept-visualizer/scripts/verify-diagram.mjs output/mcp.html
```

`RESULT: CLEAN` が出れば成功です。出なければ、エラーの内容と対処を教えてください。

## 6. 最後に報告する

- クローンした場所（絶対パス）
- 次にすること: そのフォルダで Claude Code を開き、「MCPって何？図解して」のように頼む
- 図解の保存先が `output/` であること
````
