# PulseDesk — TradingView Analyzer

Live all-market overview with **BUY and SELL** setups, tuki/pip TP-SL ladder, and **Exness / XM** spread-adjusted analysis.

Gold (XAUUSD), silver, FX, US indices, oil, gas, BTC, ETH.

## What it shows

- Where to take BUY and SELL (entry zone)
- How many tuki/pips for SL, TP1, TP2, TP3
- Risk:reward and lot P/L table (0.01 / 0.1 / 1.00)
- Exness vs XM typical spread + extra SL buffer
- TradingView chart for the selected broker symbol

Educational only. Not financial advice. Confirm live quotes in MT4/MT5.

## Run

```bash
bash start.sh
```

Frontend port 5173 (proxies `/api` to backend 3001).
