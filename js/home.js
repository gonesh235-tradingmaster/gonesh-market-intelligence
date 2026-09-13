/* ============================================
   GONESH MARKET INTELLIGENCE
   home.js - HOME page logic
   ============================================ */

async function loadHome() {

  // ========== NIFTY CARD ==========
  const niftyData = await fetchJSON("data/nifty.json");
  const niftyEl = document.getElementById("nifty-card-content");
  const niftyFresh = document.getElementById("nifty-freshness");
  const niftyTime = document.getElementById("nifty-timestamp");

  if (!niftyData || niftyData.status === "DATA UNAVAILABLE") {
    niftyEl.innerHTML = unavailableHTML("NIFTY data unavailable");
    if (niftyFresh) {
      niftyFresh.className = "freshness unavailable";
      niftyFresh.textContent = "UNAVAILABLE";
    }
  } else {
    const d = niftyData.data || {};
    const changeCls = changeClass(d.change);
    niftyEl.innerHTML = `
      <div class="market-value">${formatNumber(d.value, 2)}</div>
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
          <div class="stat-label">Day High</div>
          <div class="stat-value">${formatNumber(d.day_high, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Day Low</div>
          <div class="stat-value">${formatNumber(d.day_low, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Mood</div>
          <div class="stat-value ${moodClass(d.mood_score)}">
            ${moodLabel(d.mood_score)}
          </div>
        </div>
      </div>
    `;
    setFreshnessBadge(niftyFresh, niftyData.updated_utc);
    if (niftyTime) niftyTime.textContent = formatISTShort(niftyData.updated_utc);
  }

  // ========== BTC CARD ==========
  const btcData = await fetchJSON("data/btc.json");
  const btcEl = document.getElementById("btc-card-content");
  const btcFresh = document.getElementById("btc-freshness");
  const btcTime = document.getElementById("btc-timestamp");

  if (!btcData || btcData.status === "DATA UNAVAILABLE") {
    btcEl.innerHTML = unavailableHTML("BTC data unavailable");
    if (btcFresh) {
      btcFresh.className = "freshness unavailable";
      btcFresh.textContent = "UNAVAILABLE";
    }
  } else {
    const d = btcData.data || {};
    const changeCls = changeClass(d.change_24h);
    btcEl.innerHTML = `
      <div class="market-value">$${formatNumber(d.price, 2)}</div>
      <div class="market-change ${changeCls}">
        <span>$${formatChange(d.change_24h, 2)}</span>
        <span>(${formatPercent(d.change_24h_percent, 2)})</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">24h High</div>
          <div class="stat-value">$${formatNumber(d.high_24h, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">24h Low</div>
          <div class="stat-value">$${formatNumber(d.low_24h, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Volume (USDT)</div>
          <div class="stat-value">${formatNumber(d.volume_24h, 0)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Mood</div>
          <div class="stat-value ${moodClass(d.mood_score)}">
            ${moodLabel(d.mood_score)}
          </div>
        </div>
      </div>
    `;
    setFreshnessBadge(btcFresh, btcData.updated_utc);
    if (btcTime) btcTime.textContent = formatISTShort(btcData.updated_utc);
  }

  // ========== GLOBAL MOOD ==========
  const globalData = await fetchJSON("data/global_mood.json");
  const globalEl = document.getElementById("global-mood-content");
  const headerFresh = document.getElementById("global-freshness-header");

  if (!globalData || globalData.status === "DATA UNAVAILABLE") {
    globalEl.innerHTML = unavailableHTML("Global mood unavailable");
  } else {
    const score = globalData.score;
    const explanation = globalData.explanation || "";
    globalEl.innerHTML = renderMoodMeter(score, explanation);
    updateHeaderTime(globalData.updated_utc);

    if (headerFresh) {
      const key = getFreshness(globalData.updated_utc);
      headerFresh.textContent = freshnessLabel(key);
    }
  }

  // ========== NEWS ==========
  const newsData = await fetchJSON("data/news.json");
  const newsEl = document.getElementById("home-news-content");

  if (!newsData || !newsData.items || newsData.items.length === 0) {
    newsEl.innerHTML = unavailableHTML("News unavailable");
  } else {
    const top5 = newsData.items.slice(0, 5);
    newsEl.innerHTML = top5.map(item => `
      <div class="news-item">
        <a href="${item.link}" target="_blank" rel="noopener" class="news-headline">
          ${item.title}
        </a>
        <div class="news-meta">
          <span>${item.source}</span>
          <span>•</span>
          <span>${formatIST(item.published || item.ts)}</span>
        </div>
      </div>
    `).join("");
  }
}

// Run on load
document.addEventListener("DOMContentLoaded", loadHome);

// Auto-refresh every 5 minutes
setInterval(loadHome, 5 * 60 * 1000);
