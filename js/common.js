/* ============================================
   GONESH MARKET INTELLIGENCE
   common.js - Shared utilities
   ============================================ */

// ---------- IST TIME FORMATTING ----------

/**
 * Convert ISO/UTC string to IST display
 * Example: "2026-09-13T08:58:02Z" → "13 Sep, 14:28:02 IST"
 */
function formatIST(isoString) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";

    const options = {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    const parts = new Intl.DateTimeFormat("en-IN", options).formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t)?.value || "";

    return `${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}:${get("second")} IST`;
  } catch (e) {
    return "—";
  }
}

/**
 * Short time only - "14:28 IST"
 */
function formatISTShort(isoString) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";

    const options = {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    return new Intl.DateTimeFormat("en-IN", options).format(date) + " IST";
  } catch (e) {
    return "—";
  }
}

// ---------- FRESHNESS ----------

/**
 * Calculate freshness based on age in minutes
 * Returns: "latest" | "delayed" | "stale" | "unavailable"
 */
function getFreshness(isoTimestamp) {
  if (!isoTimestamp) return "unavailable";

  try {
    const then = new Date(isoTimestamp).getTime();
    if (isNaN(then)) return "unavailable";

    const ageMinutes = (Date.now() - then) / 1000 / 60;

    if (ageMinutes <= 15) return "latest";
    if (ageMinutes <= 60) return "delayed";
    if (ageMinutes <= 24 * 60) return "stale";
    return "unavailable";
  } catch (e) {
    return "unavailable";
  }
}

/**
 * Human-readable label from freshness key
 */
function freshnessLabel(key) {
  const labels = {
    latest: "LATEST AVAILABLE",
    delayed: "DELAYED",
    stale: "STALE",
    unavailable: "DATA UNAVAILABLE",
  };
  return labels[key] || "—";
}

/**
 * Update a freshness badge element
 */
function setFreshnessBadge(el, isoTimestamp) {
  if (!el) return;
  const key = getFreshness(isoTimestamp);
  el.className = `freshness ${key}`;
  el.textContent = freshnessLabel(key);
}

// ---------- NUMBER FORMATTING ----------

/**
 * Format number with commas
 * 23456.78 → "23,456.78"
 */
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format with sign
 * 234.5 → "+234.50"
 * -123.4 → "-123.40"
 */
function formatChange(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  const sign = num > 0 ? "+" : "";
  return sign + formatNumber(num, decimals);
}

/**
 * Format percent
 * 1.23 → "+1.23%"
 */
function formatPercent(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return "—";
  const sign = num > 0 ? "+" : "";
  return sign + Number(num).toFixed(decimals) + "%";
}

/**
 * Returns CSS class based on value
 */
function changeClass(num) {
  if (num === null || num === undefined || isNaN(num)) return "neutral";
  if (num > 0) return "positive";
  if (num < 0) return "negative";
  return "neutral";
}

// ---------- DATA FETCHING ----------

/**
 * Fetch JSON with cache-busting
 * Returns: object | null
 */
async function fetchJSON(path) {
  try {
    const url = path + "?v=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`Fetch failed: ${path} (${res.status})`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`Fetch error: ${path}`, e);
    return null;
  }
}

// ---------- UNAVAILABLE STATE ----------

/**
 * Render a "DATA UNAVAILABLE" block
 */
function unavailableHTML(reason = "Source not available") {
  return `
    <div class="unavailable">
      <div class="unavailable-title">DATA UNAVAILABLE</div>
      <div>${reason}</div>
    </div>
  `;
}

// ---------- MOOD HELPERS ----------

/**
 * Convert score (-100 to +100) to mood label
 */
function moodLabel(score) {
  if (score === null || score === undefined || isNaN(score)) return "UNAVAILABLE";
  if (score >= 70) return "STRONGLY POSITIVE";
  if (score >= 30) return "POSITIVE";
  if (score >= -29) return "NEUTRAL";
  if (score >= -69) return "NEGATIVE";
  return "STRONGLY NEGATIVE";
}

/**
 * CSS class for mood score
 */
function moodClass(score) {
  if (score === null || score === undefined || isNaN(score)) return "neutral";
  if (score >= 30) return "positive";
  if (score <= -30) return "negative";
  return "neutral";
}

/**
 * Render mood meter HTML
 */
function renderMoodMeter(score, explanation) {
  const label = moodLabel(score);
  const cls = moodClass(score);
  const width = Math.abs(score) / 2; // half width from center
  const left = score >= 0 ? 50 : 50 - width;
  const fillColor =
    score >= 30 ? "var(--accent-green)"
    : score <= -30 ? "var(--accent-red)"
    : "var(--accent-yellow)";

  return `
    <div class="mood-meter">
      <div class="mood-score-row">
        <div class="mood-score ${cls}">${score > 0 ? "+" : ""}${score}</div>
        <div class="mood-label ${cls}">${label}</div>
      </div>
      <div class="mood-bar">
        <div class="mood-bar-center"></div>
        <div class="mood-bar-fill" style="left:${left}%;width:${width}%;background:${fillColor};"></div>
      </div>
      ${explanation ? `<div class="mood-explanation">${explanation}</div>` : ""}
    </div>
  `;
}

// ---------- DOM READY ----------

/**
 * Update the header "Last Updated" time
 */
function updateHeaderTime(isoString) {
  const el = document.getElementById("last-updated");
  if (el) el.textContent = formatIST(isoString);
}
