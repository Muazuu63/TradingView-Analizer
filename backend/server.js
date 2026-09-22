import express from "express";
import cors from "cors";
import { MARKETS, TIMEFRAMES, getMarket } from "./markets.js";
import { fetchYahooChart } from "./yahoo.js";
import { analyzeMarket } from "./analyze.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get("/api/markets", (_req, res) => {
  res.json({
    markets: MARKETS.map((m) => ({
      id: m.id,
      name: m.name,
      asset: m.asset,
      tv: m.tv,
      tickLabel: m.tickLabel,
    })),
    timeframes: Object.entries(TIMEFRAMES).map(([id, t]) => ({
      id,
      label: t.label,
      hold: t.hold,
      style: t.style,
    })),
  });
});

app.get("/api/analyze/:id", async (req, res) => {
  try {
    const market = getMarket(req.params.id);
    if (!market) return res.status(404).json({ error: "Unknown market" });
    const tfKey = TIMEFRAMES[req.query.tf] ? req.query.tf : "1h";
    const tf = TIMEFRAMES[tfKey];
    const candles = await fetchYahooChart(market.yahoo, tf.interval, tf.range);
    const analysis = analyzeMarket(market, candles, tfKey);
    analysis.tf = tfKey;
    res.json(analysis);
  } catch (err) {
    res.status(502).json({ error: String(err.message || err) });
  }
});

app.get("/api/overview", async (req, res) => {
  const tfKey = TIMEFRAMES[req.query.tf] ? req.query.tf : "1h";
  const tf = TIMEFRAMES[tfKey];
  const results = await Promise.all(
    MARKETS.map(async (market) => {
      try {
        const candles = await fetchYahooChart(market.yahoo, tf.interval, tf.range);
        const a = analyzeMarket(market, candles, tfKey);
        return {
          id: market.id,
          name: market.name,
          asset: market.asset,
          tv: market.tv,
          tickLabel: market.tickLabel,
          price: a.quote.price,
          changePct: a.quote.changePct,
          bias: a.signal.bias,
          confidence: a.signal.confidence,
          side: a.trade.side,
          entryFrom: a.trade.entryFrom,
          entryTo: a.trade.entryTo,
          sl: a.trade.sl,
          tp1: a.trade.tp1,
          tp2: a.trade.tp2,
          ticksSL: a.trade.ticksSL,
          ticksTP1: a.trade.ticksTP1,
          holdTime: a.trade.holdTime,
          style: a.trade.style,
          rsi: a.indicators.rsi,
          adx: a.indicators.adx,
          engines: a.engines.summary,
        };
      } catch (err) {
        return {
          id: market.id,
          name: market.name,
          asset: market.asset,
          error: String(err.message || err),
        };
      }
    })
  );
  res.json({ tf: tfKey, markets: results });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`trade-overview-api listening on ${PORT}`);
});
