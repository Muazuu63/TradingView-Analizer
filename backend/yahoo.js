const cache = new Map();
const inflight = new Map();

function cacheKey(symbol, interval, range) {
  return `${symbol}|${interval}|${range}`;
}

export async function fetchYahooChart(symbol, interval, range) {
  const key = cacheKey(symbol, interval, range);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < 45000) return hit.data;

  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TradeOverview/1.0)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Yahoo ${symbol} ${res.status}`);
    }
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`No chart for ${symbol}`);
    const quote = result.indicators?.quote?.[0] || {};
    const ts = result.timestamp || [];
    const candles = [];
    for (let i = 0; i < ts.length; i++) {
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      if ([o, h, l, c].some((v) => v == null || Number.isNaN(v))) continue;
      candles.push({
        time: ts[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: quote.volume?.[i] || 0,
      });
    }
    if (candles.length < 30) throw new Error(`Not enough candles for ${symbol}`);
    cache.set(key, { ts: Date.now(), data: candles });
    return candles;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}
