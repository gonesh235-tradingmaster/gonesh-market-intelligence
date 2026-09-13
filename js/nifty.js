/* ============================================
   GONESH Market Intelligence
   nifty.js - NIFTY page logic
   ============================================ */

async function loadNiftyPage() {

  // ========== NIFTY SNAPSHOT ==========
  const niftyData = await fetchJSON("data/nifty.json");
  const niftyEl = document.getElementById("nifty-top");
  const niftyFresh = document.getElementById("nifty-freshness");
  const niftyFreshHeader = document.getElementById("nifty-freshness-header");
  const niftySourceTime = document.getElementById("nifty-source-time");

  if (!niftyData || niftyData.status === "DATA UNAVAILABLE") {
    niftyEl.innerHTML = unavailableHTML("NIFTY data unavailable");
  } else {
    const d = niftyData.data || {};
    const changeCls = changeClass(d.change);
    niftyEl.innerHTML = `
      <div class="market-value large">${formatNumber(d.value, 2)}</div>
      <div class="market-change ${changeCls}">
        <span>${formatChange(d.change, 2)}</span>
        <span>(${formatPercent(d.change_percent, 2)})</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Previous Close</div>
          <div class="stat-value">${formatNumber(d.previous_close, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Market State</div>
          <div class="stat-value">${d.market_state || "—"}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Day High</div>
          <div class="stat-value">${formatNumber(d.day_high, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Day Low</div>
          <div class="stat-value">${formatNumber(d.day_low, 2)}</div>
        </div>
      </div>
    `;
    setFreshnessBadge(niftyFresh, niftyData.updated_utc);
    updateHeaderTime(niftyData.updated_utc);
    if (niftySourceTime) niftySourceTime.textContent = formatISTShort(niftyData.updated_utc);
    if (niftyFreshHeader) {
      niftyFreshHeader.textContent = freshnessLabel(getFreshness(niftyData.updated_utc));
    }
  }

  // ========== NIFTY MOOD ==========
  const moodEl = document.getElementById("nifty-mood");
  if (niftyData && niftyData.data && niftyData.data.mood_score !== undefined && niftyData.data.mood_score !== null) {
    const score = niftyData.data.mood_score;
    const reason = niftyData.data.mood_reason || "";
    moodEl.innerHTML = renderMoodMeter(score, reason);
  } else {
    moodEl.innerHTML = unavailableHTML("Mood unavailable");
  }

  // ========== FACTORS ==========
  const factors = await fetchJSON("data/nifty_factors.json");

  // F1 - US Markets
  const usEl = document.getElementById("factor-us");
  if (!factors || !factors.us_markets) {
    usEl.innerHTML = unavailableHTML("US market data unavailable");
  } else {
    const us = factors.us_markets;
    usEl.innerHTML = `
      ${renderMiniQuote("S&P 500", us.sp500)}
      ${renderMiniQuote("Nasdaq", us.nasdaq)}
      ${renderMiniQuote("Dow Jones", us.dow)}
      ${renderMiniQuote("US VIX", us.vix)}
      <div class="factor-meta">Higher US markets = positive for NIFTY sentiment. Elevated VIX = risk-off.</div>
    `;
  }

  // F2 - Bonds
  const bondsEl = document.getElementById("factor-bonds");
  if (!factors || !factors.bonds) {
    bondsEl.innerHTML = unavailableHTML("Bond data unavailable");
  } else {
    const b = factors.bonds;
    bondsEl.innerHTML = `
      ${renderMiniQuote("US 10Y Yield", b.us10y)}
      <div class="factor-meta">Rising yields = pressure on equity valuations.</div>
    `;
  }

  // F3 - Commodities
  const commEl = document.getElementById("factor-commodities");
  if (!factors || !factors.commodities) {
    commEl.innerHTML = unavailableHTML("Commodity data unavailable");
  } else {
    const c = factors.commodities;
    commEl.innerHTML = `
      ${renderMiniQuote("Brent Crude", c.brent)}
      ${renderMiniQuote("WTI Crude", c.wti)}
      ${renderMiniQuote("Gold", c.gold)}
      <div class="factor-meta">Higher crude oil = negative for India (import cost).</div>
    `;
  }
}

function renderMiniQuote(label, q) {
  if (!q || q.value === null || q.value === undefined) {
    return `
      <div class="factor">
        <div class="factor-header">
          <div class="factor-name">${label}</div>
          <div class="factor-score neutral">N/A</div>
        </div>
      </div>
    `;
  }
  const cls = changeClass(q.change);
  return `
    <div class="factor">
      <div class="factor-header">
        <div class="factor-name">${label}</div>
        <div class="factor-score ${cls}">
          ${formatNumber(q.value, 2)}
        </div>
      </div>
      <div class="factor-evidence ${cls}">
        ${formatChange(q.change, 2)} (${formatPercent(q.change_percent, 2)})
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", loadNiftyPage);
setInterval(loadNiftyPage, 5 * 60 * 1000);
