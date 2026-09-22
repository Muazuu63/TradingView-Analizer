# PulseDesk — TradingView Analyzer

Live all-market overview with **BUY and SELL** setups, tuki/pip TP-SL ladder, **9 signal engines**, and **TradingView / Exness / XM** analysis.

Gold (XAUUSD), silver, FX, US indices, oil, gas, BTC, ETH.

## What it shows

- Where to take BUY and SELL (entry zone)
- How many tuki/pips for SL, TP1, TP2, TP3
- Risk:reward and lot P/L table (0.01 / 0.1 / 1.00)
- 9 original engines: Swift Algo X, Scalper Pro v4.1, Aurum Narra, Trendline v4.2, Neural Kernel, Profit Algo, Ginz Algo v2, S/R Retest Breakout, One Shot Algo v2
- TradingView / Exness / XM source switch (chart + spread-adjusted SL)
- TradingView chart for the selected broker symbol

Educational only. Not financial advice. Confirm live quotes in MT4/MT5.

## Run

```bash
bash start.sh
```

Frontend port 5173 (proxies `/api` to backend 3001).
