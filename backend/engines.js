import { sma, ema, rsi, macd, atr, stochastic, adx, swings } from "./ta.js";

function last(arr) {
  return arr[arr.length - 1];
}

function slope(a, b) {
  if (a == null || b == null) return 0;
  return b - a;
}

function vote(side, conf, reason) {
  return { side, conf: Math.max(0, Math.min(100, Math.round(conf))), reason };
}

function kernelReg(values, bandwidth = 8) {
  const n = values.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let num = 0;
    let den = 0;
    const from = Math.max(0, i - bandwidth * 3);
    const to = Math.min(n - 1, i + bandwidth * 3);
    for (let j = from; j <= to; j++) {
      const w = Math.exp(-((i - j) ** 2) / (2 * bandwidth * bandwidth));
      num += w * values[j];
      den += w;
    }
    out[i] = den ? num / den : values[i];
  }
  return out;
}

function heikin(candles) {
  const ha = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({
      open: haOpen,
      close: haClose,
      high: Math.max(c.high, haOpen, haClose),
      low: Math.min(c.low, haOpen, haClose),
    });
  }
  return ha;
}

function pivots(candles, left = 3, right = 3) {
  const ph = [];
  const pl = [];
  for (let i = left; i < candles.length - right; i++) {
    let isH = true;
    let isL = true;
    for (let k = i - left; k <= i + right; k++) {
      if (k === i) continue;
      if (candles[k].high >= candles[i].high) isH = false;
      if (candles[k].low <= candles[i].low) isL = false;
    }
    if (isH) ph.push({ i, price: candles[i].high });
    if (isL) pl.push({ i, price: candles[i].low });
  }
  return { ph, pl };
}

function lineAt(p1, p2, x) {
  if (!p1 || !p2 || p2.i === p1.i) return null;
  const m = (p2.price - p1.price) / (p2.i - p1.i);
  return p1.price + m * (x - p1.i);
}

function swiftAlgoX(candles, closes) {
  const e8 = ema(closes, 8);
  const e21 = ema(closes, 21);
  const r = rsi(closes, 7);
  const m = macd(closes);
  const px = last(closes);
  let score = 0;
  if (e8 != null && e21 != null) score += e8 > e21 ? 2 : -2;
  if (px > e8) score += 1;
  else score -= 1;
  if (r != null) {
    if (r > 55) score += 1;
    if (r < 45) score -= 1;
    if (r > 75) score -= 1;
    if (r < 25) score += 1;
  }
  if (m) score += m.hist > 0 ? 1 : -1;
  const side = score >= 2 ? "BUY" : score <= -2 ? "SELL" : "WAIT";
  return vote(side, 40 + Math.abs(score) * 10, `EMA 8/21 ribbon + RSI7 + MACD. Score ${score}`);
}

function scalperPro(candles, closes) {
  const a = atr(candles, 7) || 0;
  const px = last(closes);
  const prev = closes[closes.length - 2];
  const st = stochastic(candles, 9);
  const e9 = ema(closes, 9);
  const body = Math.abs(last(candles).close - last(candles).open);
  const range = last(candles).high - last(candles).low || 1;
  const impulse = body / range;
  const mom = px - (closes[closes.length - 4] || px);
  let side = "WAIT";
  let conf = 42;
  if (e9 != null && st != null) {
    if (px > e9 && mom > 0 && st < 80 && impulse > 0.45) { side = "BUY"; conf = 55 + impulse * 20; }
    if (px < e9 && mom < 0 && st > 20 && impulse > 0.45) { side = "SELL"; conf = 55 + impulse * 20; }
    if (st < 15 && px < e9 && Math.abs(px - prev) < a * 0.4) { side = "BUY"; conf = 62; }
    if (st > 85 && px > e9 && Math.abs(px - prev) < a * 0.4) { side = "SELL"; conf = 62; }
  }
  return vote(side, conf, `Scalp: 9-EMA, Stoch9, ATR7 impulse ${impulse.toFixed(2)}`);
}

function aurumNarra(candles, closes) {
  const px = last(closes);
  const a = atr(candles, 14) || 1;
  const sw = swings(candles, 48);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const round = Math.round(px / 5) * 5;
  const nearRound = Math.abs(px - round) < a * 0.35;
  const hh = last(candles).high >= sw.nearRes - a * 0.15;
  const ll = last(candles).low <= sw.nearSup + a * 0.15;
  let score = 0;
  if (e20 != null && e50 != null) score += e20 > e50 ? 2 : -2;
  if (px > e20) score += 1; else score -= 1;
  if (r != null && r > 50) score += 1;
  if (r != null && r < 50) score -= 1;
  if (hh && score > 0) score += 1;
  if (ll && score < 0) score -= 1;
  if (nearRound) score = Math.round(score * 0.8);
  const side = score >= 2 ? "BUY" : score <= -2 ? "SELL" : "WAIT";
  return vote(side, 45 + Math.abs(score) * 8, `Gold structure vs 20/50 EMA, round ${round}, ATR ${a.toFixed(2)}`);
}

function trendlineV4(candles) {
  const { ph, pl } = pivots(candles, 4, 2);
  const i = candles.length - 1;
  const px = candles[i].close;
  const a = atr(candles, 14) || 1;
  const p2h = ph[ph.length - 1];
  const p1h = ph[ph.length - 2];
  const p2l = pl[pl.length - 1];
  const p1l = pl[pl.length - 2];
  const resLine = lineAt(p1h, p2h, i);
  const supLine = lineAt(p1l, p2l, i);
  let side = "WAIT";
  let conf = 40;
  let why = "Need two highs and two lows for trendline";
  if (resLine != null && px > resLine + a * 0.15) {
    side = "BUY";
    conf = 68;
    why = `Broke falling/flat resistance trendline at ${resLine.toFixed(2)}`;
  } else if (supLine != null && px < supLine - a * 0.15) {
    side = "SELL";
    conf = 68;
    why = `Broke rising/flat support trendline at ${supLine.toFixed(2)}`;
  } else if (supLine != null && Math.abs(px - supLine) < a * 0.4 && px >= supLine) {
    side = "BUY";
    conf = 58;
    why = `Holding support trendline ${supLine.toFixed(2)}`;
  } else if (resLine != null && Math.abs(px - resLine) < a * 0.4 && px <= resLine) {
    side = "SELL";
    conf = 58;
    why = `Rejected at resistance trendline ${resLine.toFixed(2)}`;
  }
  return vote(side, conf, why);
}

function neuralKernel(closes) {
  if (closes.length < 30) return vote("WAIT", 35, "Not enough bars for kernel");
  const k = kernelReg(closes, 8);
  const px = last(closes);
  const kv = last(k);
  const kPrev = k[k.length - 6] ?? kv;
  const d = slope(kPrev, kv);
  const dist = px - kv;
  let side = "WAIT";
  let conf = 44;
  if (d > 0 && px > kv) { side = "BUY"; conf = 70; }
  else if (d < 0 && px < kv) { side = "SELL"; conf = 70; }
  else if (d > 0 && px < kv) { side = "BUY"; conf = 52; }
  else if (d < 0 && px > kv) { side = "SELL"; conf = 52; }
  return vote(side, conf, `Gaussian kernel (bw 8). Price ${dist >= 0 ? "above" : "below"} kernel, slope ${d.toFixed(4)}`);
}

function profitAlgo(candles, closes) {
  const a = atr(candles, 10) || 1;
  const e = ema(closes, 10);
  const ad = adx(candles, 14);
  const px = last(closes);
  if (e == null) return vote("WAIT", 35, "EMA not ready");
  const up = e + 1.6 * a;
  const dn = e - 1.6 * a;
  const trending = ad && ad.adx >= 22;
  let side = "WAIT";
  let conf = 40;
  if (px > up) { side = "BUY"; conf = trending ? 74 : 55; }
  else if (px < dn) { side = "SELL"; conf = trending ? 74 : 55; }
  else if (px > e) { side = "BUY"; conf = trending ? 58 : 46; }
  else { side = "SELL"; conf = trending ? 58 : 46; }
  return vote(side, conf, `ATR channel around EMA10. ADX ${ad ? ad.adx.toFixed(1) : "--"} ${trending ? "trend" : "chop"}`);
}

function ginzAlgo(candles, closes) {
  const ha = heikin(candles);
  const lastHa = last(ha);
  const prevHa = ha[ha.length - 2] || lastHa;
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const bull = lastHa.close > lastHa.open && prevHa.close > prevHa.open;
  const bear = lastHa.close < lastHa.open && prevHa.close < prevHa.open;
  const px = last(closes);
  let side = "WAIT";
  let conf = 48;
  if (bull && e12 != null && e26 != null && e12 >= e26 && px > e12) { side = "BUY"; conf = 72; }
  else if (bear && e12 != null && e26 != null && e12 <= e26 && px < e12) { side = "SELL"; conf = 72; }
  else if (bull) { side = "BUY"; conf = 54; }
  else if (bear) { side = "SELL"; conf = 54; }
  return vote(side, conf, `Heikin-ashi color run + EMA 12/26 stack`);
}

function srRetestBreakout(candles) {
  const a = atr(candles, 14) || 1;
  const { ph, pl } = pivots(candles, 3, 2);
  const i = candles.length - 1;
  const c = candles[i];
  const prev = candles[i - 1] || c;
  const res = ph[ph.length - 1];
  const sup = pl[pl.length - 1];
  let side = "WAIT";
  let conf = 40;
  let why = "No fresh S/R break + retest";
  if (res && i - res.i > 2 && i - res.i < 18) {
    const broke = candles.slice(res.i + 1, i).some((x) => x.close > res.price + a * 0.05);
    const retest = Math.abs(c.low - res.price) <= a * 0.55 && c.close >= res.price - a * 0.1;
    const hold = c.close > res.price;
    if (broke && retest && hold) {
      side = "BUY";
      conf = 78;
      why = `Resistance ${res.price.toFixed(2)} broken then retested as support`;
    } else if (broke && c.close > res.price && prev.close > res.price) {
      side = "BUY";
      conf = 60;
      why = `Holding above broken resistance ${res.price.toFixed(2)}`;
    }
  }
  if (side === "WAIT" && sup && i - sup.i > 2 && i - sup.i < 18) {
    const broke = candles.slice(sup.i + 1, i).some((x) => x.close < sup.price - a * 0.05);
    const retest = Math.abs(c.high - sup.price) <= a * 0.55 && c.close <= sup.price + a * 0.1;
    const hold = c.close < sup.price;
    if (broke && retest && hold) {
      side = "SELL";
      conf = 78;
      why = `Support ${sup.price.toFixed(2)} broken then retested as resistance`;
    } else if (broke && c.close < sup.price && prev.close < sup.price) {
      side = "SELL";
      conf = 60;
      why = `Holding below broken support ${sup.price.toFixed(2)}`;
    }
  }
  return vote(side, conf, why);
}

function oneShotAlgo(candles, closes) {
  const c = last(candles);
  const p = candles[candles.length - 2] || c;
  const r = rsi(closes, 14);
  const e = ema(closes, 21);
  const a = atr(candles, 14) || 1;
  const bullEng = c.close > c.open && p.close < p.open && c.close >= p.open && c.open <= p.close;
  const bearEng = c.close < c.open && p.close > p.open && c.close <= p.open && c.open >= p.close;
  const range = c.high - c.low || 1;
  const strong = Math.abs(c.close - c.open) / range > 0.55 && range > a * 0.8;
  let side = "WAIT";
  let conf = 38;
  let why = "No one-bar trigger";
  if (bullEng && e != null && c.close > e && (r == null || r < 70)) {
    side = "BUY";
    conf = strong ? 76 : 64;
    why = "Bull engulfing close above EMA21 (one-shot)";
  } else if (bearEng && e != null && c.close < e && (r == null || r > 30)) {
    side = "SELL";
    conf = strong ? 76 : 64;
    why = "Bear engulfing close below EMA21 (one-shot)";
  } else if (strong && e != null && c.close > e && c.close > p.high) {
    side = "BUY";
    conf = 58;
    why = "Wide-range break of prior high";
  } else if (strong && e != null && c.close < e && c.close < p.low) {
    side = "SELL";
    conf = 58;
    why = "Wide-range break of prior low";
  }
  return vote(side, conf, why);
}

export const ENGINE_META = [
  { id: "swift", name: "Swift Algo X", style: "Fast trend", note: "Original EMA-ribbon momentum. Not the paid TV script." },
  { id: "scalper", name: "Scalper Pro v4.1", style: "Scalp", note: "Original 9-EMA / Stoch / ATR impulse. Inspired by scalper flow, not ZynAlgo source." },
  { id: "aurum", name: "Aurum Narra", style: "Gold / metals", note: "Original gold structure + round-number + EMA stack." },
  { id: "trendline", name: "Trendline v4.2", style: "Trendline", note: "Original pivot trendlines. Not ZynAlgo source." },
  { id: "kernel", name: "Neural Kernel", style: "Kernel smooth", note: "Public Gaussian / Nadaraya-Watson math. Not JOAT Pine." },
  { id: "profit", name: "Profit Algo", style: "ATR channel", note: "Original EMA+ATR channel with ADX filter." },
  { id: "ginz", name: "Ginz Algo v2", style: "HA trend", note: "Original Heikin-ashi + EMA stack. Not GinzAlgo source." },
  { id: "srbreak", name: "S/R Retest Breakout", style: "Break + retest", note: "Original swing break then retest continuation." },
  { id: "oneshot", name: "One Shot Algo v2", style: "One-bar", note: "Original engulfing / wide-range one-candle trigger." },
];

export function runEngines(candles) {
  const closes = candles.map((c) => c.close);
  const map = {
    swift: swiftAlgoX(candles, closes),
    scalper: scalperPro(candles, closes),
    aurum: aurumNarra(candles, closes),
    trendline: trendlineV4(candles),
    kernel: neuralKernel(closes),
    profit: profitAlgo(candles, closes),
    ginz: ginzAlgo(candles, closes),
    srbreak: srRetestBreakout(candles),
    oneshot: oneShotAlgo(candles, closes),
  };
  const list = ENGINE_META.map((m) => ({ ...m, ...map[m.id] }));
  let buy = 0;
  let sell = 0;
  let wait = 0;
  let buyW = 0;
  let sellW = 0;
  for (const e of list) {
    if (e.side === "BUY") { buy += 1; buyW += e.conf; }
    else if (e.side === "SELL") { sell += 1; sellW += e.conf; }
    else wait += 1;
  }
  let consensus = "WAIT";
  if (buy > sell && buy >= 3) consensus = "BUY";
  if (sell > buy && sell >= 3) consensus = "SELL";
  if (buy >= 6) consensus = "STRONG BUY";
  if (sell >= 6) consensus = "STRONG SELL";
  const conf = Math.round(Math.max(buyW, sellW) / Math.max(1, Math.max(buy, sell)));
  return {
    list,
    summary: {
      buy,
      sell,
      wait,
      consensus,
      confidence: Math.min(92, conf || 40),
      text: `${buy} BUY / ${sell} SELL / ${wait} WAIT · consensus ${consensus}`,
    },
  };
}
