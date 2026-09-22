export function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = sma(values.slice(0, period), period);
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

export function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(values) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  if (fast == null || slow == null) return null;
  const line = fast - slow;
  const signalBase = values.map((_, i) => {
    if (i < 25) return null;
    const f = ema(values.slice(0, i + 1), 12);
    const s = ema(values.slice(0, i + 1), 26);
    return f - s;
  }).filter((v) => v != null);
  const signal = ema(signalBase, 9);
  return { line, signal, hist: signal == null ? line : line - signal };
}

export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return sma(trs, period);
}

export function bollinger(values, period = 20, mult = 2) {
  const mid = sma(values, period);
  if (mid == null) return null;
  const slice = values.slice(-period);
  const variance = slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { mid, upper: mid + mult * sd, lower: mid - mult * sd, sd };
}

export function stochastic(candles, period = 14) {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const close = candles[candles.length - 1].close;
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
}

export function adx(candles, period = 14) {
  if (candles.length < period + 2) return null;
  const plusDM = [];
  const minusDM = [];
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atrv = sma(tr, period);
  const pdi = (sma(plusDM, period) / atrv) * 100;
  const mdi = (sma(minusDM, period) / atrv) * 100;
  const dx = (Math.abs(pdi - mdi) / (pdi + mdi)) * 100;
  return { adx: dx, plusDI: pdi, minusDI: mdi };
}

export function swings(candles, lookback = 40) {
  const slice = candles.slice(-lookback);
  const highs = slice.map((c) => c.high);
  const lows = slice.map((c) => c.low);
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  const midHighs = highs.slice(-10);
  const midLows = lows.slice(-10);
  return {
    resistance,
    support,
    nearRes: Math.max(...midHighs),
    nearSup: Math.min(...midLows),
  };
}

export function volumeTrend(candles) {
  if (candles.length < 20) return { avg: 0, last: 0, ratio: 1 };
  const vols = candles.map((c) => c.volume || 0);
  const avg = sma(vols, 20) || 1;
  const last = vols[vols.length - 1] || 0;
  return { avg, last, ratio: last / (avg || 1) };
}
