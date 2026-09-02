#!/usr/bin/env node
// 図解HTMLのビジュアル検証スクリプト。
//
// モード:
//   検出（既定）:  node verify-diagram.mjs <html>
//       デスクトップ/モバイル幅でレンダリングし、はみ出し・見切れを
//       プログラム的に検出してテキストレポートを標準出力に返す。画像は出さない。
//   スクショ:      node verify-diagram.mjs <html> --screenshot <出力プレフィックス>
//       最終版の確認用に <プレフィックス>-desktop.png / -mobile.png を保存する。
//
// 終了コードは常に0（レポート本文が判定材料。Bashツールが失敗扱いしないため）。
// 依存が無い場合のみ1で終了し、導入手順を案内する。

import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

// --- 検証する画面幅。レスポンシブの切り替わりを両端で押さえる ---
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },  // PCの一般的な閲覧幅
  { name: 'mobile', width: 375, height: 812 },    // スマホ縦（iPhone相当）の代表幅
];

// レイアウトのサブピクセル丸め誤差。これ未満のはみ出しは崩れと見なさない
const TOLERANCE_PX = 2;
// レポートに載せる要素数の上限。多すぎると修正対象が絞れなくなる
const MAX_REPORTED = 8;
// CDN/フォント/アイコン描画の追加待ち時間。networkidle後の最終描画ぶれを吸収
const SETTLE_MS = 800;

function usage() {
  console.error('使い方: node verify-diagram.mjs <htmlファイル> [--screenshot <出力プレフィックス>]');
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error('[依存なし] playwright が見つかりません。');
    console.error('.claude/skills/ai-concept-visualizer/references/playwright-setup-guide.md の手順で導入してください。');
    process.exit(1);
  }
}

// ページ内で実行する検出ロジック。レイアウト実測値で崩れを判定する。
function detectInPage(tol) {
  const vw = window.innerWidth;
  const docEl = document.documentElement;

  const overflowPx = docEl.scrollWidth - docEl.clientWidth;

  // 祖先に横スクロール領域（pre等）があれば、その中のはみ出しは意図的なので除外
  const inScrollable = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      p = p.parentElement;
    }
    return false;
  };

  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const describe = (el) => {
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls}` + (text ? ` 〈${text}〉` : '');
  };

  const all = Array.from(document.body.querySelectorAll('*'));

  // ① 画面幅を超えてはみ出している要素（横スクロールの原因）
  const overflowing = [];
  for (const el of all) {
    if (!isVisible(el) || inScrollable(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + tol || r.left < -tol) {
      overflowing.push({ desc: describe(el), right: Math.round(r.right), left: Math.round(r.left) });
    }
  }
  overflowing.sort((a, b) => b.right - a.right);

  // ② ボックス内で内容が見切れている要素。
  // overflowX が hidden/clip のときだけ内容は実際に「切れる」。
  // visible は溢れて見えるだけ（テキストの折り返し誤差はここに入るので除外）で、
  // 画面外まで溢れる場合は①のはみ出し検出が拾う。auto/scroll は意図的なので対象外。
  const clipped = [];
  for (const el of all) {
    if (!isVisible(el)) continue;
    const s = getComputedStyle(el);
    if (s.overflowX !== 'hidden' && s.overflowX !== 'clip') continue;
    if (el.scrollWidth - el.clientWidth > tol && el.clientWidth > 0) {
      clipped.push({ desc: describe(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    }
  }
  clipped.sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth));

  return {
    viewportWidth: vw,
    pageOverflowPx: overflowPx,
    overflowing,
    clipped,
  };
}

async function waitReady(page) {
  // CDN・フォント・Lucideアイコンの描画を待つ
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch { /* networkidleに到達しなくても続行 */ }
  try {
    await page.waitForFunction(() => document.querySelectorAll('svg').length > 0, { timeout: 5000 });
  } catch { /* アイコン未描画でも検出は可能 */ }
  await page.waitForTimeout(SETTLE_MS);
}

function formatReport(results) {
  const lines = [];
  let total = 0;
  for (const r of results) {
    lines.push(`\n■ ${r.name}（幅 ${r.viewportWidth}px）`);
    if (r.pageOverflowPx > TOLERANCE_PX) {
      lines.push(`  ⚠ ページ全体が横に ${r.pageOverflowPx}px はみ出しています（横スクロール発生）`);
    }
    if (r.overflowing.length === 0 && r.clipped.length === 0 && r.pageOverflowPx <= TOLERANCE_PX) {
      lines.push('  ✓ はみ出し・見切れは検出されませんでした');
      continue;
    }
    if (r.overflowing.length > 0) {
      total += r.overflowing.length;
      lines.push(`  [はみ出し] 画面右端(${r.viewportWidth}px)を超える要素 ${r.overflowing.length}件:`);
      for (const e of r.overflowing.slice(0, MAX_REPORTED)) {
        lines.push(`    - right=${e.right}px  ${e.desc}`);
      }
      if (r.overflowing.length > MAX_REPORTED) lines.push(`    …他 ${r.overflowing.length - MAX_REPORTED}件`);
    }
    if (r.clipped.length > 0) {
      total += r.clipped.length;
      lines.push(`  [見切れ] ボックス内で内容が溢れている要素 ${r.clipped.length}件:`);
      for (const e of r.clipped.slice(0, MAX_REPORTED)) {
        lines.push(`    - 内容${e.scrollWidth}px > 枠${e.clientWidth}px  ${e.desc}`);
      }
      if (r.clipped.length > MAX_REPORTED) lines.push(`    …他 ${r.clipped.length - MAX_REPORTED}件`);
    }
  }
  const header = total === 0
    ? 'RESULT: CLEAN — レイアウト崩れは検出されませんでした'
    : `RESULT: ISSUES FOUND (${total}件) — 下記を修正してください`;
  return header + '\n' + lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) { usage(); process.exit(1); }

  const htmlArg = args[0];
  const htmlPath = isAbsolute(htmlArg) ? htmlArg : resolve(process.cwd(), htmlArg);
  if (!existsSync(htmlPath)) {
    console.error(`[エラー] ファイルが見つかりません: ${htmlPath}`);
    process.exit(1);
  }

  const ssIndex = args.indexOf('--screenshot');
  const screenshotMode = ssIndex !== -1;
  const ssPrefix = screenshotMode ? args[ssIndex + 1] : null;
  if (screenshotMode && !ssPrefix) {
    console.error('[エラー] --screenshot には出力プレフィックスが必要です');
    process.exit(1);
  }

  const { chromium } = await loadPlaywright();

  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.error('[ブラウザ未導入] Chromium を起動できませんでした。');
    console.error('次を実行してください: npx --prefix .claude/skills/ai-concept-visualizer/scripts playwright install chromium');
    console.error(`詳細: ${e.message}`);
    process.exit(1);
  }

  const fileUrl = pathToFileURL(htmlPath).href;
  const results = [];

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(fileUrl, { waitUntil: 'load' });
      await waitReady(page);

      if (screenshotMode) {
        const out = resolve(process.cwd(), `${ssPrefix}-${vp.name}.png`);
        await page.screenshot({ path: out, fullPage: true });
        console.log(`保存: ${out}`);
      } else {
        const r = await page.evaluate(detectInPage, TOLERANCE_PX);
        results.push({ name: vp.name, ...r });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (!screenshotMode) {
    console.log(formatReport(results));
  }
}

main().catch((e) => {
  console.error('[想定外エラー]', e.message);
  process.exit(1);
});
