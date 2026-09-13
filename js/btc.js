/* ============================================
   GONESH Market Intelligence
   btc.js - BTC page logic
   ============================================ */

async function loadBtcPage() {

  // ========== BTC SNAPSHOT ==========
  const btcData = await fetchJSON("data/btc.json");
  const btcEl = document.getElementById("btc-top");
  const btcFresh = document.getElementById("btc-freshness");
  const btcFreshHeader = document.getElementById("btc-freshness-header");
  const btcSourceTime = document.getElementById("btc-source-time");

  if (!btcData || btcData.status === "DATA UNAVAILABLE") {
    btcEl.innerHTML = unavailableHTML("BTC data unavailable");
  } else {
    const d = btcData.data || {};
    const changeCls = changeClass(d.change_24h);
    btcEl.innerHTML = `
      <div class="market-value large">$${formatNumber(d.price, 2)}</div>
      <div class="market-change ${changeCls}">
        <span>$${formatChange(d.change_24h, 2)}</span>
        <span>(${formatPercent(d.change_24h_percent, 2)})</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Previous Close</div>
          <div class="stat-value">$${formatNumber(d.previous_close, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">24h Volume (USDT)</div>
          <div class="stat-value">${formatNumber(d.volume_24h, 0)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">24h High</div>
          <div class="stat-value">$${formatNumber(d.high_24h, 2)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">24h Low</div>
          <div class="stat-value">$${formatNumber(d.low_24h, 2)}</div>
        </div>
      </div>
    `;
    setFreshnessBadge(btcFresh, btcData.updated_utc);
    updateHeaderTime(btcData.updated_utc);
    if (btcSourceTime) btcSourceTime.textContent = formatISTShort(btcData.updated_utc);
    if (btcFreshHeader) {
      btcFreshHeader.textContent = freshnessLabel(getFreshness(btcData.updated_utc));
    }
  }

  // ========== BTC MOOD ==========
  const moodEl = document.getElementById("btc-mood");
  if (btcData && btcData.data && btcData.data.mood_score !== undefined && btcData.data.mood_score !== null) {
    const score = btcData.data.mood_score;
    const reason = btcData.data.mood_reason || "";
    moodEl.innerHTML = renderMoodMeter(score, reason);
  } else {
    moodEl.innerHTML = unavailableHTML("Mood unavailable");
  }

  // ========== DXY (loaded from nifty_factors.json) ==========
  const dxyEl = document.getElementById("factor-dxy");
  const niftyFactors = await fetchJSON("data/nifty_factors.json");
  if (!niftyFactors || !niftyFactors.dxy) {
    dxyEl.innerHTML = unavailableHTML("DXY data unavailable");
  } else {
    const dxy = niftyFactors.dxy;
    const cls = changeClass(dxy.change);
    dxyEl.innerHTML = `
      <div class="factor">
        <div class="factor-header">
          <div class="factor-name">US Dollar Index</div>
          <div class="factor-score ${cls}">${formatNumber(dxy.value, 2)}</div>
        </div>
        <div class="factor-evidence ${cls}">
          ${formatChange(dxy.change, 2)} (${formatPercent(dxy.change_percent, 2)})
        </div>
        <div class="factor-meta">
          Stronger dollar typically pressures BTC. Falling DXY often supports risk assets.
        </div>
      </div>
    `;
  }

  // ========== DERIVATIVES (OI + Funding) ==========
  const derivEl = document.getElementById("factor-derivatives");
  const derivData = await fetchJSON("data/btc_factors.json");

  if (!derivData || (!derivData.open_interest && !derivData.funding)) {
    derivEl.innerHTML = unavailableHTML("Derivatives data unavailable");
  } else {
    let html = "";

    if (derivData.open_interest) {
      const oi = derivData.open_interest;
      const oiFormatted = oi >= 1000
        ? formatNumber(oi / 1000, 2) + "K"
        : formatNumber(oi, 0);
      html += `
        <div class="factor">
          <div class="factor-header">
            <div class="factor-name">Open Interest</div>
            <div class="factor-score neutral">${oiFormatted} BTC</div>
          </div>
          <div class="factor-evidence">
            Total open perpetual contracts. Rising OI + rising price = long buildup.
          </div>
        </div>
      `;
    }

    if (derivData.funding && derivData.funding.funding_rate !== null && derivData.funding.funding_rate !== undefined) {
      const fr = derivData.funding.funding_rate;
      let frCls = "neutral";
      let frInterpret = "Balanced positioning";
      if (fr > 0.03) {
        frCls = "negative";
        frInterpret = "Longs paying shorts — potentially overheated";
      } else if (fr < -0.03) {
        frCls = "positive";
        frInterpret = "Shorts paying longs — potentially oversold";
      }
      html += `
        <div class="factor">
          <div class="factor-header">
            <div class="factor-name">Funding Rate</div>
            <div class="factor-score ${frCls}">${fr.toFixed(4)}%</div>
          </div>
          <div class="factor-evidence">${frInterpret}</div>
        </div>
      `;

      if (derivData.funding.mark_price) {
        html += `
          <div class="factor">
            <div class="factor-header">
              <div class="factor-name">Mark Price</div>
              <div class="factor-score neutral">$${formatNumber(derivData.funding.mark_price, 2)}</div>
            </div>
          </div>
        `;
      }
    }

    if (!html) {
      derivEl.innerHTML = unavailableHTML("No derivatives data");
    } else {
      derivEl.innerHTML = html;
    }
  }
}

document.addEventListener("DOMContentLoaded", loadBtcPage);
setInterval(loadBtcPage, 5 * 60 * 1000);
