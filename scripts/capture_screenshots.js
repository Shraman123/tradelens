#!/usr/bin/env node
/**
 * Captures the 4 screenshots build_pdf.js needs into submission_assets/,
 * by driving the live deployed app with Puppeteer (no local dev server
 * needed). The app has no URL routing -- every screen is React state --
 * so each shot is reached by clicking through from a fresh page load.
 *
 * Usage: node scripts/capture_screenshots.js
 */
const path = require("node:path");
const fs = require("node:fs");

const LIVE_URL = "https://app-azure-zeta-42.vercel.app";
const OUT_DIR = path.join(__dirname, "..", "submission_assets");
const VIEWPORT = { width: 480, height: 900 };

async function clickText(page, text, tag = "button") {
  const handle = await page.evaluateHandle(
    (t, sel) =>
      [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().startsWith(t)),
    text,
    tag
  );
  const el = handle.asElement();
  if (!el) throw new Error(`Could not find <${tag}> starting with "${text}"`);
  await el.click();
  return el;
}

async function shoot(page, file) {
  // The app fades in each new screen (`animate-screen-in`, keyed on
  // persona+screen); without this the shot can land mid-transition.
  await new Promise((r) => setTimeout(r, 500));

  // `body` is `min-h-screen` with `pb-16`, so a naive fullPage shot on a
  // short screen (Vikram/Sara -- no habit cards) captures a few hundred
  // extra pixels of pure black padding. That tail then spills onto its own
  // near-empty page in the PDF. Clip to the real content bottom instead.
  const height = await page.evaluate(() => {
    const main = document.getElementById("main");
    const rect = main.getBoundingClientRect();
    return Math.ceil(window.scrollY + rect.bottom) + 24; // +24px breathing room
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const p = path.join(OUT_DIR, file);
  await page.screenshot({
    path: p,
    clip: { x: 0, y: 0, width: VIEWPORT.width, height },
  });
  console.log(`Wrote submission_assets/${file}`);
}

async function main() {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // 1. Arjun -- Habit Detail (default persona on load; open habit #1)
    await page.goto(LIVE_URL, { waitUntil: "networkidle0" });
    await page.waitForSelector("h3"); // habit card title rendered
    await clickText(page, "Habit #1"); // the whole habit card is the click target
    await page.waitForSelector("h1");
    await shoot(page, "arjun_habit_detail.png");

    // 2. Neha -- Review
    await page.goto(LIVE_URL, { waitUntil: "networkidle0" });
    await clickText(page, "Neha");
    await page.waitForSelector("h3");
    await shoot(page, "neha_review.png");

    // 3. Vikram -- Review, nothing found, expanded
    await page.goto(LIVE_URL, { waitUntil: "networkidle0" });
    await clickText(page, "Vikram");
    await clickText(page, "What we checked and ruled out", "summary");
    await shoot(page, "vikram_nothing_found.png");

    // 4. Sara -- Review, not enough data
    await page.goto(LIVE_URL, { waitUntil: "networkidle0" });
    await clickText(page, "Sara");
    await page.waitForSelector("h1");
    await shoot(page, "sara_not_enough_data.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
