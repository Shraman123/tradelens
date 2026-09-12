#!/usr/bin/env node
/**
 * Rebuilds TradeLens_Submission.pdf from ONE_PAGER.md.
 *
 * Pipeline: pandoc converts the markdown to an HTML fragment, this script
 * wraps that fragment in a print-styled page, then Puppeteer (headless
 * Chromium) prints it to PDF. Not pandoc's built-in --pdf-engine, because
 * that needs a LaTeX install (pdflatex) or wkhtmltopdf, and both require an
 * install this environment couldn't complete (a multi-hundred-MB LaTeX
 * distribution, or an installer that needs admin elevation this sandboxed
 * shell can't grant). Puppeteer is a plain npm devDependency — no elevation,
 * no system package — and ships its own Chromium.
 *
 * Usage: npm run build:pdf   (from the repo root)
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_MD = path.join(ROOT, "ONE_PAGER.md");
const OUTPUT_PDF = path.join(ROOT, "TradeLens_Submission.pdf");

// winget's user-scope install of pandoc didn't land on PATH in this
// environment even in a fresh shell, so check PATH first (works on a normal
// machine) and fall back to the known winget install location.
function findPandoc() {
  const candidates = [
    "pandoc",
    path.join(os.homedir(), "AppData", "Local", "Pandoc", "pandoc.exe"),
  ];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    "pandoc not found on PATH or at the usual winget install location. " +
      "Install it (winget install --id JohnMacFarlane.Pandoc -e) and re-run."
  );
}

function markdownToHtmlFragment(pandocPath, mdPath) {
  return execFileSync(
    pandocPath,
    [mdPath, "-f", "markdown", "-t", "html"],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
}

// Plain, restrained styling to match the product's own design voice (see
// app/src/index.css) -- readable print typography, one accent colour used
// sparingly, nothing decorative.
function wrapAsPrintableHtml(bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>TradeLens Submission</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  html, body {
    margin: 0; padding: 0;
    font-family: "Georgia", "Times New Roman", serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.5;
  }
  h1 {
    font-size: 17pt;
    margin: 0 0 4pt 0;
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 12.5pt;
    margin: 16pt 0 6pt 0;
    border-bottom: 1px solid #ccc;
    padding-bottom: 2pt;
  }
  p { margin: 0 0 8pt 0; }
  strong { color: #92400e; }
  a { color: #92400e; text-decoration: none; }
  code { font-family: "Consolas", monospace; font-size: 0.92em; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

async function main() {
  const pandocPath = findPandoc();
  const fragment = markdownToHtmlFragment(pandocPath, SOURCE_MD);
  const html = wrapAsPrintableHtml(fragment);

  // Lazy require: only needed here, keeps the pandoc-missing error (the
  // more common failure) from being masked by a puppeteer import error.
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.pdf({
      path: OUTPUT_PDF,
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
  } finally {
    await browser.close();
  }

  // Not reporting a word count here: a hand-rolled split() tokenizes
  // markdown syntax differently from `wc -w` (the count actually quoted
  // when this file's length is discussed) and the two numbers disagreeing
  // is more confusing than either alone. Run `wc -w ONE_PAGER.md` for that.
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PDF)} from ${path.relative(ROOT, SOURCE_MD)}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
