import { rsi, macd, atr, bollinger, stochastic, adx, sma, ema, swings, volumeTrend } from "./ta.js";
import { TIMEFRAMES } from "./markets.js";
import { BROKERS, typicalSpread, usdPerTuki, tvSymbolFor } from "./brokers.js";

function round(n, d) {
  if (n == null || Number.isNaN(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

function scoreBias(ind) {
  let buy = 0;
  let sell = 0;
  const notes = [];

  if (ind.rsi != null) {
    if (ind.rsi < 30) { buy += 2; notes.push("RSI oversold — bounce chance"); }
    else if (ind.rsi < 45) { buy += 1; notes.push("RSI below 45 — mild bullish lean"); }
    else if (ind.rsi > 70) { sell += 2; notes.push("RSI overbought — pullback chance"); }
    else if (ind.rsi > 55) { sell += 1; notes.push("RSI above 55 — mild bearish lean"); }
    else notes.push("RSI mid-range — no extreme");
  }

  if (ind.macd) {
    if (ind.macd.hist > 0 && ind.macd.line > ind.macd.signal) { buy += 2; notes.push("MACD bullish histogram"); }
    else if (ind.macd.hist < 0 && ind.macd.line < ind.macd.signal) { sell += 2; notes.push("MACD bearish histogram"); }
    else notes.push("MACD mixed / flattening");
  }

  if (ind.ema20 != null && ind.ema50 != null) {
    if (ind.price > ind.ema20 && ind.ema20 > ind.ema50) { buy += 2; notes.push("Price above EMA20 > EMA50 (uptrend)"); }
    else if (ind.price < ind.ema20 && ind.ema20 < ind.ema50) { sell += 2; notes.push("Price below EMA20 < EMA50 (downtrend)"); }
    else notes.push("EMAs mixed — range / transition");
  }

  if (ind.stoch != null) {
    if (ind.stoch < 20) { buy += 1; notes.push("Stochastic oversold"); }
    else if (ind.stoch > 80) { sell += 1; notes.push("Stochastic overbought"); }
  }

  if (ind.adx) {
    if (ind.adx.adx >= 25) {
      if (ind.adx.plusDI > ind.adx.minusDI) { buy += 1; notes.push("ADX trending up"); }
      else { sell += 1; notes.push("ADX trending down"); }
    } else notes.push("ADX weak — ranging market");
  }

  if (ind.bb) {
    if (ind.price <= ind.bb.lower) { buy += 1; notes.push("Price at lower Bollinger"); }
    else if (ind.price >= ind.bb.upper) { sell += 1; notes.push("Price at upper Bollinger"); }
  }

  if (ind.vol && ind.vol.ratio > 1.4) notes.push("Volume spike — move more reliable");
  else if (ind.vol && ind.vol.ratio < 0.7) notes.push("Low volume — weaker conviction");

  const total = buy + sell || 1;
  const buyPct = Math.round((buy / total) * 100);
  const sellPct = 100 - buyPct;
  let bias = "NEUTRAL";
  if (buy - sell >= 3) bias = "STRONG BUY";
  else if (buy - sell >= 1) bias = "BUY";
  else if (sell - buy >= 3) bias = "STRONG SELL";
  else if (sell - buy >= 1) bias = "SELL";

  const conf = Math.min(95, Math.round((Math.abs(buy - sell) / 10) * 100 + (ind.adx?.adx >= 25 ? 10 : 0) + (ind.vol?.ratio > 1.2 ? 5 : 0)));
  return { bias, buy, sell, buyPct, sellPct, confidence: Math.max(38, conf), notes };
}

function moneyTable(market, ticksSL, ticksTP1, ticksTP2, ticksTP3) {
  const lots = [0.01, 0.1, 1];
  return lots.map((lot) => {
    const per = usdPerTuki(market, lot);
    return {
      lot,
      perTuki: round(per, 2),
      slUsd: round(per * ticksSL, 2),
      tp1Usd: round(per * ticksTP1, 2),
      tp2Usd: round(per * ticksTP2, 2),
      tp3Usd: round(per * ticksTP3, 2),
    };
  });
}

function buildSetup(side, market, candles, tfKey, ind) {
  const last = candles[candles.length - 1];
  const price = last.close;
  const pip = market.pip;
  const d = market.digits;
  const atrv = ind.atr || Math.abs(last.high - last.low) || pip * 20;
  const tf = TIMEFRAMES[tfKey] || TIMEFRAMES["1h"];
  const ranging = ind.adx && ind.adx.adx < 20;
  const atrMultSL = ranging ? 1.2 : 1.5;
  const atrMultTP1 = ranging ? 1.0 : 1.6;
  const atrMultTP2 = ranging ? 1.8 : 2.6;
  const atrMultTP3 = ranging ? 2.6 : 4.0;

  let entryFrom;
  let entryTo;
  let sl;
  let tp1;
  let tp2;
  let tp3;

  if (side === "BUY") {
    entryFrom = price - atrv * 0.18;
    entryTo = price + atrv * 0.06;
    sl = Math.min(ind.swings.nearSup, price) - atrv * atrMultSL * 0.35;
    if (price - sl < atrv * 0.8) sl = price - atrv * atrMultSL;
    tp1 = price + atrv * atrMultTP1;
    tp2 = price + atrv * atrMultTP2;
    tp3 = Math.max(price + atrv * atrMultTP3, ind.swings.resistance);
  } else {
    entryFrom = price - atrv * 0.06;
    entryTo = price + atrv * 0.18;
    sl = Math.max(ind.swings.nearRes, price) + atrv * atrMultSL * 0.35;
    if (sl - price < atrv * 0.8) sl = price + atrv * atrMultSL;
    tp1 = price - atrv * atrMultTP1;
    tp2 = price - atrv * atrMultTP2;
    tp3 = Math.min(price - atrv * atrMultTP3, ind.swings.support);
  }

  const entryMid = (entryFrom + entryTo) / 2;
  const risk = Math.abs(entryMid - sl);
  const ticksSL = risk / pip;
  const ticksTP1 = Math.abs(tp1 - entryMid) / pip;
  const ticksTP2 = Math.abs(tp2 - entryMid) / pip;
  const ticksTP3 = Math.abs(tp3 - entryMid) / pip;
  const rr1 = risk > 0 ? ticksTP1 / ticksSL : 0;
  const rr2 = risk > 0 ? ticksTP2 / ticksSL : 0;
  const rr3 = risk > 0 ? ticksTP3 / ticksSL : 0;

  const levels = side === "BUY"
    ? [
        { id: "TP3", kind: "tp", price: tp3, tuki: ticksTP3, rr: rr3 },
        { id: "TP2", kind: "tp", price: tp2, tuki: ticksTP2, rr: rr2 },
        { id: "TP1", kind: "tp", price: tp1, tuki: ticksTP1, rr: rr1 },
        { id: "ENTRY", kind: "entry", price: entryMid, tuki: 0, rr: 0 },
        { id: "SL", kind: "sl", price: sl, tuki: ticksSL, rr: 0 },
      ]
    : [
        { id: "SL", kind: "sl", price: sl, tuki: ticksSL, rr: 0 },
        { id: "ENTRY", kind: "entry", price: entryMid, tuki: 0, rr: 0 },
        { id: "TP1", kind: "tp", price: tp1, tuki: ticksTP1, rr: rr1 },
        { id: "TP2", kind: "tp", price: tp2, tuki: ticksTP2, rr: rr2 },
        { id: "TP3", kind: "tp", price: tp3, tuki: ticksTP3, rr: rr3 },
      ];

  return {
    side,
    style: tf.style,
    holdTime: tf.hold,
    timeframe: tf.label,
    entryFrom: round(entryFrom, d),
    entryTo: round(entryTo, d),
    entryMid: round(entryMid, d),
    sl: round(sl, d),
    tp1: round(tp1, d),
    tp2: round(tp2, d),
    tp3: round(tp3, d),
    ticksSL: round(ticksSL, 1),
    ticksTP1: round(ticksTP1, 1),
    ticksTP2: round(ticksTP2, 1),
    ticksTP3: round(ticksTP3, 1),
    tickLabel: market.tickLabel,
    rr1: round(rr1, 2),
    rr2: round(rr2, 2),
    rr3: round(rr3, 2),
    how: side === "BUY"
      ? `BUY nibo ${round(entryFrom, d)} theke ${round(entryTo, d)} zone e. SL ${round(sl, d)} (${round(ticksSL, 1)} ${market.tickLabel} niche). TP1 ${round(tp1, d)} (${round(ticksTP1, 1)} ${market.tickLabel} upore).`
      : `SELL nibo ${round(entryFrom, d)} theke ${round(entryTo, d)} zone e. SL ${round(sl, d)} (${round(ticksSL, 1)} ${market.tickLabel} upore). TP1 ${round(tp1, d)} (${round(ticksTP1, 1)} ${market.tickLabel} niche).`,
    invalidation: side === "BUY"
      ? `Close below ${round(sl, d)} cancels BUY`
      : `Close above ${round(sl, d)} cancels SELL`,
    riskNote: ranging
      ? "Range market — SL tight, TP1 e partial close"
      : "Trend ache — TP2/TP3 porjonto hold kora jete pare",
    levels: levels.map((lv) => ({
      ...lv,
      price: round(lv.price, d),
      tuki: round(lv.tuki, 1),
      rr: round(lv.rr, 2),
    })),
    money: moneyTable(market, ticksSL, ticksTP1, ticksTP2, ticksTP3),
  };
}

function brokerize(setup, market, broker) {
  const d = market.digits;
  const spread = typicalSpread(broker.id, market.id);
  const spreadTuki = spread / market.pip;
  const buffer = spread * 1.6;
  let sl = setup.sl;
  if (setup.side === "BUY") sl = sl - buffer;
  else sl = sl + buffer;

  const entry = setup.entryMid;
  const ticksSL = Math.abs(entry - sl) / market.pip;
  const ticksTP1 = setup.ticksTP1;
  const ticksTP2 = setup.ticksTP2;
  const ticksTP3 = setup.ticksTP3;
  const rr1 = ticksSL ? ticksTP1 / ticksSL : 0;
  const rr2 = ticksSL ? ticksTP2 / ticksSL : 0;
  const rr3 = ticksSL ? ticksTP3 / ticksSL : 0;

  return {
    brokerId: broker.id,
    brokerName: broker.name,
    tv: tvSymbolFor(market, broker.id),
    typicalSpread: round(spread, Math.max(d, 5)),
    spreadTuki: round(spreadTuki, 1),
    sl: round(sl, d),
    ticksSL: round(ticksSL, 1),
    rr1: round(rr1, 2),
    rr2: round(rr2, 2),
    rr3: round(rr3, 2),
    money: moneyTable(market, ticksSL, ticksTP1, ticksTP2, ticksTP3),
    note: `${broker.name}: typical spread ~${round(spreadTuki, 1)} ${market.tickLabel}. SL te extra ${round(spreadTuki * 1.6, 1)} ${market.tickLabel} buffer. ${broker.notes}`,
  };
}

function overviewText(market, scored, buy, sell, tfKey) {
  const tf = TIMEFRAMES[tfKey] || TIMEFRAMES["1h"];
  const pref = scored.bias.includes("SELL") ? sell : scored.bias.includes("BUY") ? buy : (scored.buyPct >= scored.sellPct ? buy : sell);
  return `${market.name} (${market.id}) ${tf.label}. Bias ${scored.bias} (${scored.confidence}%). Preferred ${pref.side}: entry ${pref.entryFrom}-${pref.entryTo}, SL ${pref.sl} = ${pref.ticksSL} ${pref.tickLabel}, TP1 ${pref.tp1} = ${pref.ticksTP1} ${pref.tickLabel} (${pref.rr1}R). Hold ${pref.holdTime}. BUY plan and SELL plan both below — use the side that matches your bias.`;
}

export function analyzeMarket(market, candles, tfKey) {
  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const price = last.close;
  const change = price - prev.close;
  const changePct = prev.close ? (change / prev.close) * 100 : 0;

  const ind = {
    price,
    rsi: rsi(closes, 14),
    macd: macd(closes),
    atr: atr(candles, 14),
    bb: bollinger(closes, 20, 2),
    stoch: stochastic(candles, 14),
    adx: adx(candles, 14),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    sma200: sma(closes, Math.min(200, closes.length)),
    swings: swings(candles, Math.min(60, candles.length)),
    vol: volumeTrend(candles),
  };

  const scored = scoreBias(ind);
  const buy = buildSetup("BUY", market, candles, tfKey, ind);
  const sell = buildSetup("SELL", market, candles, tfKey, ind);
  const preferred = scored.bias.includes("SELL") ? "SELL" : scored.bias.includes("BUY") ? "BUY" : (scored.buyPct >= 50 ? "BUY" : "SELL");
  const trade = preferred === "BUY" ? buy : sell;

  const brokers = BROKERS.map((b) => ({
    id: b.id,
    name: b.name,
    tv: tvSymbolFor(market, b.id),
    minLot: b.minLot,
    typicalSpread: round(typicalSpread(b.id, market.id), Math.max(market.digits, 5)),
    spreadTuki: round(typicalSpread(b.id, market.id) / market.pip, 1),
    notes: b.notes,
    buy: brokerize(buy, market, b),
    sell: brokerize(sell, market, b),
  }));

  return {
    market: {
      id: market.id,
      name: market.name,
      asset: market.asset,
      tv: market.tv,
      digits: market.digits,
      tickLabel: market.tickLabel,
      pip: market.pip,
    },
    quote: {
      price: round(price, market.digits),
      open: round(last.open, market.digits),
      high: round(last.high, market.digits),
      low: round(last.low, market.digits),
      change: round(change, market.digits),
      changePct: round(changePct, 2),
      time: last.time,
    },
    indicators: {
      rsi: round(ind.rsi, 1),
      macd: ind.macd
        ? { line: round(ind.macd.line, market.digits + 1), signal: round(ind.macd.signal, market.digits + 1), hist: round(ind.macd.hist, market.digits + 1) }
        : null,
      atr: round(ind.atr, market.digits),
      stoch: round(ind.stoch, 1),
      adx: ind.adx ? round(ind.adx.adx, 1) : null,
      plusDI: ind.adx ? round(ind.adx.plusDI, 1) : null,
      minusDI: ind.adx ? round(ind.adx.minusDI, 1) : null,
      ema20: round(ind.ema20, market.digits),
      ema50: round(ind.ema50, market.digits),
      sma200: round(ind.sma200, market.digits),
      bb: ind.bb
        ? { upper: round(ind.bb.upper, market.digits), mid: round(ind.bb.mid, market.digits), lower: round(ind.bb.lower, market.digits) }
        : null,
      support: round(ind.swings.support, market.digits),
      resistance: round(ind.swings.resistance, market.digits),
      volumeRatio: round(ind.vol.ratio, 2),
    },
    signal: scored,
    preferred,
    trade,
    buy,
    sell,
    brokers,
    overview: overviewText(market, scored, buy, sell, tfKey),
    candles: candles.slice(-180).map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0,
    })),
  };
}
