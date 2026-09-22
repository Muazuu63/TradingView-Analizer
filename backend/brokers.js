export const BROKERS = [
  {
    id: "tradingview",
    name: "TradingView",
    tvPrefix: "TV",
    minLot: 0.01,
    lotStep: 0.01,
    goldContractOz: 100,
    notes: "TradingView chart + Yahoo mid price. No broker spread. Use as clean analysis, then map to Exness/XM.",
  },
  {
    id: "exness",
    name: "Exness",
    tvPrefix: "EXNESS",
    minLot: 0.01,
    lotStep: 0.01,
    goldContractOz: 100,
    notes: "Exness gold usually tight spread. Raw/zero accounts even tighter. SL te spread buffer rakho.",
  },
  {
    id: "xm",
    name: "XM",
    tvPrefix: "XM",
    minLot: 0.01,
    lotStep: 0.01,
    goldContractOz: 100,
    notes: "XM gold spread generally wider than Exness. SL extra tuki dao, TP1 e aghe book kora safer.",
  },
];

const SPREAD_PRICE = {
  tradingview: {
    XAUUSD: 0,
    XAGUSD: 0,
    EURUSD: 0,
    GBPUSD: 0,
    USDJPY: 0,
    USDCHF: 0,
    AUDUSD: 0,
    USDCAD: 0,
    NZDUSD: 0,
    US30: 0,
    NAS100: 0,
    SPX500: 0,
    USOIL: 0,
    NATGAS: 0,
    BTCUSD: 0,
    ETHUSD: 0,
  },
  exness: {
    XAUUSD: 0.12,
    XAGUSD: 0.018,
    EURUSD: 0.00008,
    GBPUSD: 0.00010,
    USDJPY: 0.012,
    USDCHF: 0.00010,
    AUDUSD: 0.00010,
    USDCAD: 0.00012,
    NZDUSD: 0.00014,
    US30: 2.2,
    NAS100: 1.6,
    SPX500: 0.4,
    USOIL: 0.03,
    NATGAS: 0.004,
    BTCUSD: 12,
    ETHUSD: 1.2,
  },
  xm: {
    XAUUSD: 0.30,
    XAGUSD: 0.028,
    EURUSD: 0.00016,
    GBPUSD: 0.00020,
    USDJPY: 0.020,
    USDCHF: 0.00020,
    AUDUSD: 0.00018,
    USDCAD: 0.00022,
    NZDUSD: 0.00024,
    US30: 3.5,
    NAS100: 2.4,
    SPX500: 0.6,
    USOIL: 0.05,
    NATGAS: 0.007,
    BTCUSD: 22,
    ETHUSD: 2.0,
  },
};

export function getBroker(id) {
  return BROKERS.find((b) => b.id === id) || BROKERS[0];
}

export function typicalSpread(brokerId, marketId) {
  return SPREAD_PRICE[brokerId]?.[marketId] ?? 0;
}

export function usdPerTuki(market, lot = 1) {
  const oz = market.contractOz || 100;
  if (market.asset === "metal" && market.id === "XAUUSD") {
    return market.pip * oz * lot;
  }
  if (market.asset === "metal" && market.id === "XAGUSD") {
    return market.pip * 5000 * lot;
  }
  if (market.asset === "forex") {
    if (market.id.endsWith("JPY")) return (market.pip / 0.01) * 1000 * lot;
    return (market.pip / 0.0001) * 10 * lot;
  }
  if (market.asset === "index") return market.pip * lot;
  if (market.asset === "energy" && market.id === "USOIL") return market.pip * 1000 * lot;
  if (market.asset === "energy") return market.pip * 10000 * lot;
  if (market.asset === "crypto") return market.pip * lot;
  return market.pip * lot;
}

export function tvSymbolFor(market, brokerId) {
  if (brokerId === "exness") return `EXNESS:${market.id}`;
  if (brokerId === "xm") return `XM:${market.id}`;
  return market.tv;
}
