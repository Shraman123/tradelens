#!/usr/bin/env node
/**
 * Rebuilds TradeLens_Submission.pdf -- the single combined submission PDF:
 * a cover page, then four artifacts, each behind its own divider page:
 *   1. The one-pager      (ONE_PAGER.md, as-is)
 *   2. The prompts        (a one-page summary, then PROMPTS_LOG.md in full)
 *   3. The evals          (eval_report.md, as-is)
 *   4. The working app    (live + repo links, four screenshots)
 *
 * Pipeline: pandoc converts each markdown source to an HTML fragment; this
 * script assembles the cover, dividers and fragments into one HTML
 * document; Puppeteer (headless Chromium) prints it to PDF with page
 * numbers in the footer. Not pandoc's built-in --pdf-engine, because that
 * needs a LaTeX install (pdflatex) or wkhtmltopdf, and both require an
 * install this environment couldn't complete (a multi-hundred-MB LaTeX
 * distribution, or an installer needing admin elevation this sandboxed
 * shell can't grant). Puppeteer is a plain npm devDependency -- no
 * elevation, no system package -- and ships its own Chromium.
 *
 * Usage: npm run build:pdf   (from the repo root)
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PDF = path.join(ROOT, "TradeLens_Submission.pdf");
const ASSETS_DIR = path.join(ROOT, "submission_assets");

const LIVE_URL = "https://app-azure-zeta-42.vercel.app";
const REPO_URL = "https://github.com/Shraman123/tradelens";

// Filled in once provided; see the cover page section below.
const CONTACT = {
  name: "Shraman Hazra",
  email: "hazrashraman2002@gmail.com",
  phone: "8900406041",
};

// Screenshot files expected in submission_assets/, in display order.
const SCREENSHOTS = [
  { file: "arjun_habit_detail.png", caption: "Arjun -- Habit Detail (confirmed habit, evidence, and the concrete rule)" },
  { file: "neha_review.png", caption: "Neha -- Review (one confirmed habit, ranked and costed)" },
  { file: "vikram_nothing_found.png", caption: "Vikram -- Review, nothing found (“What we checked and ruled out” expanded)" },
  { file: "sara_not_enough_data.png", caption: "Sara -- Review, not enough data" },
];

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
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
  );
}

function imageToDataUri(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/${mime};base64,${data}`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- page building blocks --------------------------------------------------

function coverPageHtml() {
  return `
<section class="cover-page">
  <h1 class="cover-title">TradeLens</h1>
  <p class="cover-subtitle">Post-trade Review &middot; Problem 03</p>

  <table class="cover-contact">
    <tr><td>Name</td><td>${escapeHtml(CONTACT.name)}</td></tr>
    <tr><td>Email</td><td>${escapeHtml(CONTACT.email)}</td></tr>
    <tr><td>Phone</td><td>${escapeHtml(CONTACT.phone)}</td></tr>
  </table>

  <p class="cover-link-label">Live prototype</p>
  <p class="cover-link"><a href="${LIVE_URL}">${LIVE_URL}</a></p>

  <p class="cover-link-label">Source code</p>
  <p class="cover-link"><a href="${REPO_URL}">${REPO_URL}</a></p>

  <div class="cover-toc">
    <p class="cover-toc-label">Contents</p>
    <ol>
      <li>The one-pager</li>
      <li>The prompts</li>
      <li>The evals</li>
      <li>The working app</li>
    </ol>
  </div>
</section>`;
}

function dividerHtml(number, title) {
  return `
<section class="divider-page">
  <p class="divider-eyebrow">Artifact ${number} of 4</p>
  <h1 class="divider-title">${escapeHtml(title)}</h1>
</section>`;
}

// Curated by hand from PROMPTS_LOG.md -- not mechanically extracted, so the
// wording here can stay a true one-line summary rather than however long
// each section's own heading happens to be. Update this if a new numbered
// section is appended to PROMPTS_LOG.md.
const PROMPT_VERSIONS = [
  ["1", "2026-09-11", "Initial build brief (Claude Code)", "Product scoped: 5 screens, 4 personas, code-computes/LLM-narrates architecture, no-advice hard line."],
  ["2", "2026-09-11", "Go-ahead + provider switch", "Approved tool installs; narration LLM switched to Groq (free tier) after the Anthropic key had no credit."],
  ["3", "2026-09-11", "Narration prompt v1–v5", "v1 FAILED (raw floats, not plain English). v2 FAILED (self-modelled the banned word “habit”). v3 FAILED (closing nudged toward a rule even with none to pick). v4 passed automated checks. v5 fixed why_it_matters completeness for rerun stability."],
  ["4", "2026-09-11", "Reliability incident, v5 stability run", "Malformed-JSON response and a digit-insertion flake found mid-batch; added a runtime self-check retry and reliability counters."],
  ["5", "2026-09-12", "Four fixes from the deployed app", "Not-reported list humanized (labels + plain-English reasons); Vikram's closing rewritten; window wording fixed; habit-detail cost relabeled; concrete rule for size_up_after_loss."],
  ["6", "2026-09-12", "Narration prompt v6", "“This window” not “this month”; one narrow exception letting the nothing-found closing state the trade count; concrete-rule builder. Stability: 5/5, all four personas."],
  ["7", "2026-09-12", "Two copy fixes, v7", "Ruled-out phrasing varied by p-value tier instead of one repeated sentence; fixed a false-causal “so” in the nothing-found closing. Stability: 5/5."],
  ["8", "2026-09-12", "Live-app bug: “a loss of a loss”, v8", "A duplicated phrase automated checks couldn't catch (correct number, broken English) found by reading the live app; new prompt rule plus a permanent redundant_framing check."],
  ["9", "2026-09-12", "v8 stability, partial", "Arjun 5/5, Neha 1/5, Vikram/Sara blocked by Groq's daily quota. Also fixed eval_narration.py silently reporting a missing stability run as a pass instead of a skip."],
  ["10", "2026-09-12/13", "ONE_PAGER.md + PDF pipeline", "Added the one-pager (699 words) and a pandoc + Puppeteer build for this submission PDF."],
];

function promptsSummaryTableHtml() {
  const rows = PROMPT_VERSIONS.map(
    ([n, date, what, change]) =>
      `<tr><td class="col-n">${n}</td><td class="col-date">${date}</td><td class="col-what"><strong>${escapeHtml(what)}</strong></td><td class="col-change">${change}</td></tr>`
  ).join("\n");
  return `
<section class="summary-page">
  <h2>Prompt log — summary</h2>
  <p class="summary-note">Full log, including every failed narration-prompt version, follows this page. Numbered sections below match PROMPTS_LOG.md's own numbering.</p>
  <table class="summary-table">
    <thead><tr><th>#</th><th>Date</th><th>What it covers</th><th>What changed</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function artifact4Html() {
  const shots = SCREENSHOTS.map((s, i) => {
    const filePath = path.join(ASSETS_DIR, s.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing screenshot: submission_assets/${s.file}`);
    }
    const uri = imageToDataUri(filePath);
    const figure = `
      <figure class="screenshot">
        <img src="${uri}" alt="${escapeHtml(s.caption)}" />
        <figcaption>${escapeHtml(s.caption)}</figcaption>
      </figure>`;
    // One persona per page: force a break before every screenshot after the
    // first (the first shares its page with the two link lines above, which
    // is short enough to leave room). max-height on the img (see STYLE) is
    // what keeps each screenshot from spanning multiple pages on its own.
    return i === 0 ? figure : `<div class="page-break">${figure}</div>`;
  }).join("\n");

  return `
<section class="artifact4">
  <p><strong>Live prototype:</strong> <a href="${LIVE_URL}">${LIVE_URL}</a> — no login required.</p>
  <p><strong>Source code:</strong> <a href="${REPO_URL}">${REPO_URL}</a></p>
  ${shots}
</section>`;
}

const STYLE = `
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: "Georgia", "Times New Roman", serif;
    color: #1a1a1a;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  h1 { font-size: 17pt; margin: 0 0 4pt 0; letter-spacing: -0.01em; }
  h2 { font-size: 13pt; margin: 0 0 10pt 0; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
  h2.md-h2 { font-size: 12.5pt; margin: 16pt 0 6pt 0; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
  p { margin: 0 0 8pt 0; }
  strong { color: #92400e; }
  a { color: #92400e; text-decoration: none; }
  code { font-family: "Consolas", monospace; font-size: 0.9em; }
  pre { background: #f5f3ef; padding: 8pt; border-radius: 4pt; font-size: 8.5pt; overflow-wrap: break-word; white-space: pre-wrap; }
  blockquote { border-left: 3px solid #ddd; margin: 0 0 8pt 0; padding: 0 0 0 10pt; color: #444; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
  hr { border: none; border-top: 1px solid #ddd; margin: 10pt 0; }

  .page-break { page-break-before: always; }

  /* Cover page */
  .cover-page {
    display: flex; flex-direction: column; justify-content: center;
    min-height: 240mm;
    text-align: center;
  }
  .cover-title { font-size: 40pt; margin-bottom: 2pt; }
  .cover-subtitle { font-size: 14pt; color: #555; margin-bottom: 28pt; }
  .cover-contact { margin: 0 auto 24pt auto; font-size: 11pt; }
  .cover-contact td { padding: 2pt 10pt; text-align: left; }
  .cover-contact td:first-child { color: #777; text-align: right; }
  .cover-link-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; color: #777; margin: 12pt 0 2pt 0; }
  .cover-link { font-size: 15pt; margin-bottom: 4pt; }
  .cover-toc { margin-top: 36pt; text-align: left; display: inline-block; }
  .cover-toc-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; color: #777; margin-bottom: 4pt; }
  .cover-toc ol { margin: 0; padding-left: 18pt; font-size: 12pt; }
  .cover-toc li { margin-bottom: 4pt; }

  /* Divider pages */
  .divider-page {
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    min-height: 240mm;
    text-align: center;
  }
  .divider-eyebrow { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.1em; color: #92400e; margin-bottom: 8pt; }
  .divider-title { font-size: 28pt; }

  /* Prompts summary table */
  .summary-page { }
  .summary-note { font-size: 9.5pt; color: #555; margin-bottom: 10pt; }
  .summary-table { font-size: 8pt; }
  .summary-table th { text-align: left; border-bottom: 1px solid #999; padding: 3pt 5pt; }
  .summary-table td { vertical-align: top; padding: 4pt 5pt; border-bottom: 1px solid #eee; }
  .summary-table .col-n { width: 3%; }
  .summary-table .col-date { width: 10%; white-space: nowrap; }
  .summary-table .col-what { width: 22%; }
  .summary-table .col-change { width: 65%; }

  /* Artifact 4 */
  .artifact4 figure.screenshot {
    margin: 0 0 14pt 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .artifact4 figure.screenshot img {
    /* Bounded by height, not width, so a tall phone-width screenshot
       (e.g. Arjun's habit detail, with 5 example trades) still fits one
       print page instead of spanning three with a near-empty tail page.
       225mm leaves room, within the ~267mm content height (A4 minus this
       script's 16mm/14mm top/bottom margins), for the figcaption below. */
    display: inline-block;
    max-width: 100%;
    max-height: 225mm;
    width: auto;
    height: auto;
    border: 1px solid #ddd;
    border-radius: 3pt;
  }
  .artifact4 figcaption { font-size: 9pt; color: #555; margin-top: 6pt; text-align: center; }
</style>`;

function wrapDocument(bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>TradeLens Submission</title>${STYLE}</head>
<body>${bodyHtml}</body>
</html>`;
}

async function main() {
  const pandocPath = findPandoc();

  const onePagerFragment = markdownToHtmlFragment(pandocPath, path.join(ROOT, "ONE_PAGER.md"));
  const promptsFragment = markdownToHtmlFragment(pandocPath, path.join(ROOT, "PROMPTS_LOG.md")).replace(/<h2/g, '<h2 class="md-h2"');
  const evalsFragment = markdownToHtmlFragment(pandocPath, path.join(ROOT, "eval_report.md")).replace(/<h2/g, '<h2 class="md-h2"');

  const body = [
    coverPageHtml(),

    `<div class="page-break">${dividerHtml(1, "The one-pager")}</div>`,
    `<div class="page-break">${onePagerFragment}</div>`,

    `<div class="page-break">${dividerHtml(2, "The prompts")}</div>`,
    `<div class="page-break">${promptsSummaryTableHtml()}</div>`,
    `<div class="page-break"><h2 class="md-h2">Full prompt log</h2>${promptsFragment}</div>`,

    `<div class="page-break">${dividerHtml(3, "The evals")}</div>`,
    `<div class="page-break">${evalsFragment}</div>`,

    `<div class="page-break">${dividerHtml(4, "The working app")}</div>`,
    `<div class="page-break">${artifact4Html()}</div>`,
  ].join("\n");

  const html = wrapDocument(body);

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
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%; font-size:8px; color:#999; text-align:center; font-family: Georgia, serif;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
      margin: { top: "16mm", bottom: "14mm", left: "18mm", right: "18mm" },
    });
  } finally {
    await browser.close();
  }

  const { PDFDocument } = require("pdf-lib");
  const bytes = fs.readFileSync(OUTPUT_PDF);
  const doc = await PDFDocument.load(bytes);
  const sizeMb = (bytes.length / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PDF)}: ${doc.getPageCount()} pages, ${sizeMb} MB.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
