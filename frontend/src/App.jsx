import React, { useEffect, useMemo, useState } from "react";

const TF = [
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
];

function clsBias(b) {
  if (!b) return "neutral";
  const x = String(b).toLowerCase().replace(/\s+/g, "-");
  if (x.includes("buy")) return x.includes("strong") ? "strong-buy" : "buy";
  if (x.includes("sell")) return x.includes("strong") ? "strong-sell" : "sell";
  return "neutral";
}

function colorBias(b) {
  if (!b) return "var(--muted)";
  if (String(b).includes("BUY")) return "var(--green)";
  if (String(b).includes("SELL")) return "var(--red)";
  return "var(--muted)";
}

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return "--";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="clock">{t.toUTCString().replace("GMT", "UTC")}</div>;
}

function Ladder({ setup, price, digits, preferred }) {
  if (!setup) return null;
  const isBuy = setup.side === "BUY";
  const hi = Math.max(setup.tp3, setup.sl, setup.entryTo, price);
  const lo = Math.min(setup.tp3, setup.sl, setup.entryFrom, price);
  const span = hi - lo || 1;
  const pos = (p) => ((hi - p) / span) * 100;
  const marks = [
    { key: "tp3", label: "TP3", p: setup.tp3, extra: `${setup.ticksTP3} ${setup.tickLabel} · ${setup.rr3}R`, cls: "mk-tp" },
    { key: "tp2", label: "TP2", p: setup.tp2, extra: `${setup.ticksTP2} ${setup.tickLabel} · ${setup.rr2}R`, cls: "mk-tp" },
    { key: "tp1", label: "TP1", p: setup.tp1, extra: `${setup.ticksTP1} ${setup.tickLabel} · ${setup.rr1}R`, cls: "mk-tp" },
    { key: "en", label: "ENTRY", p: setup.entryMid, extra: `${fmt(setup.entryFrom, digits)} – ${fmt(setup.entryTo, digits)}`, cls: "mk-en" },
    { key: "sl", label: "SL", p: setup.sl, extra: `${setup.ticksSL} ${setup.tickLabel}`, cls: "mk-sl" },
  ];
  return (
    <div className={`ladder ${isBuy ? "is-buy" : "is-sell"} ${preferred ? "is-pref" : ""}`}>
      <div className="lad-head">
        <span className={`side-pill ${isBuy ? "buy" : "sell"}`}>{setup.side} SETUP</span>
        {preferred ? <span className="pref-tag">PREFERRED</span> : <span className="alt-tag">ALTERNATE</span>}
      </div>
      <p className="how">{setup.how}</p>
      <div className="rail-wrap">
        <div className="rail">
          <div className="rail-fill" style={{ top: `${pos(isBuy ? setup.tp3 : setup.sl)}%`, height: `${Math.abs(pos(setup.sl) - pos(isBuy ? setup.tp3 : setup.tp3))}%` }} />
          <div className="price-dot" style={{ top: `${pos(price)}%` }} title="Live price" />
        </div>
        <div className="marks">
          {marks.map((m) => (
            <div key={m.key} className={`mark ${m.cls}`} style={{ top: `${pos(m.p)}%` }}>
              <span className="mlab">{m.label}</span>
              <span className="mpx">{fmt(m.p, digits)}</span>
              <span className="mx">{m.extra}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="tuki-row">
        <div><b>SL</b> {setup.ticksSL} {setup.tickLabel}</div>
        <div><b>TP1</b> {setup.ticksTP1} {setup.tickLabel}</div>
        <div><b>TP2</b> {setup.ticksTP2} {setup.tickLabel}</div>
        <div><b>TP3</b> {setup.ticksTP3} {setup.tickLabel}</div>
      </div>
      <p className="hint">{setup.invalidation}. {setup.riskNote}. Hold: {setup.holdTime}.</p>
    </div>
  );
}

function Money({ setup }) {
  if (!setup?.money) return null;
  return (
    <table className="money">
      <thead>
        <tr>
          <th>Lot</th>
          <th>SL $</th>
          <th>TP1 $</th>
          <th>TP2 $</th>
          <th>TP3 $</th>
        </tr>
      </thead>
      <tbody>
        {setup.money.map((r) => (
          <tr key={r.lot}>
            <td>{r.lot}</td>
            <td className="down">{fmt(r.slUsd, 2)}</td>
            <td className="up">{fmt(r.tp1Usd, 2)}</td>
            <td className="up">{fmt(r.tp2Usd, 2)}</td>
            <td className="up">{fmt(r.tp3Usd, 2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BrokerCard({ b, side, digits, tickLabel }) {
  const s = side === "BUY" ? b.buy : b.sell;
  if (!s) return null;
  return (
    <div className="broker-card">
      <div className="bc-head">
        <div>
          <div className="bc-name">{b.name}</div>
          <div className="bc-sub">{b.tv} · min lot {b.minLot}</div>
        </div>
        <div className="spread-chip">
          spread ~{b.spreadTuki} {tickLabel}
        </div>
      </div>
      <div className="grid2">
        <div className="kv">
          <div className="k">Broker SL (spread buffer)</div>
          <div className="v sell">{fmt(s.sl, digits)}</div>
        </div>
        <div className="kv">
          <div className="k">SL size</div>
          <div className="v">{s.ticksSL} {tickLabel}</div>
        </div>
        <div className="kv">
          <div className="k">RR after spread</div>
          <div className="v">{s.rr1}R / {s.rr2}R / {s.rr3}R</div>
        </div>
        <div className="kv">
          <div className="k">Typical spread</div>
          <div className="v">{fmt(b.typicalSpread, digits)} ({b.spreadTuki} {tickLabel})</div>
        </div>
      </div>
      <Money setup={s} />
      <p className="hint">{s.note}</p>
    </div>
  );
}

export default function App() {
  const [tf, setTf] = useState("1h");
  const [list, setList] = useState([]);
  const [sel, setSel] = useState("XAUUSD");
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState("exness");
  const [tab, setTab] = useState("setup");

  async function loadOverview(curTf) {
    const r = await fetch(`/api/overview?tf=${curTf}`);
    const j = await r.json();
    setList(j.markets || []);
  }

  async function loadDetail(id, curTf) {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`/api/analyze/${id}?tf=${curTf}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setDetail(j);
    } catch (e) {
      setErr(String(e.message || e));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    await Promise.all([loadOverview(tf), loadDetail(sel, tf)]);
  }

  useEffect(() => {
    loadOverview(tf).catch(() => {});
  }, [tf]);

  useEffect(() => {
    loadDetail(sel, tf);
  }, [sel, tf]);

  useEffect(() => {
    const id = setInterval(() => {
      loadOverview(tf).catch(() => {});
      loadDetail(sel, tf);
    }, 60000);
    return () => clearInterval(id);
  }, [sel, tf]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((m) => `${m.id} ${m.name} ${m.asset}`.toLowerCase().includes(s));
  }, [list, q]);

  const sig = detail?.signal;
  const quote = detail?.quote;
  const digits = detail?.market?.digits ?? 2;
  const tickLabel = detail?.market?.tickLabel || "tuki";
  const preferred = detail?.preferred || "BUY";
  const activeBroker = (detail?.brokers || []).find((b) => b.id === broker) || detail?.brokers?.[0];
  const tv = activeBroker?.tv || detail?.market?.tv || "OANDA:XAUUSD";
  const tvInterval = tf === "5m" ? "5" : tf === "15m" ? "15" : tf === "1h" ? "60" : tf === "4h" ? "240" : "D";

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark" />
          PulseDesk
          <span className="sub">BUY / SELL · tuki TP-SL · Exness / XM</span>
        </div>
        <input
          className="search"
          placeholder="Search Gold, XAUUSD, BTC..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="tf-row">
          {TF.map((x) => (
            <button key={x.id} className={`tf-btn ${tf === x.id ? "active" : ""}`} onClick={() => setTf(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="tf-row">
          <button className={`tf-btn ${broker === "exness" ? "active" : ""}`} onClick={() => setBroker("exness")}>Exness</button>
          <button className={`tf-btn ${broker === "xm" ? "active" : ""}`} onClick={() => setBroker("xm")}>XM</button>
        </div>
        <button className="refresh-btn" onClick={refresh}>Refresh</button>
        <Clock />
      </header>

      <div className="body">
        <aside className="sidebar">
          <div className="side-head">
            <span>Watchlist</span>
            <span>{filtered.length}</span>
          </div>
          <div className="mlist">
            {filtered.map((m) => (
              <div
                key={m.id}
                className={`mrow ${sel === m.id ? "active" : ""}`}
                onClick={() => setSel(m.id)}
              >
                <div className="mname">
                  <span className="id">{m.id}</span>
                  <span className="nm">{m.name}</span>
                </div>
                <div>
                  <div className={`mprice ${m.changePct >= 0 ? "up" : "down"}`}>
                    {m.price != null ? fmt(m.price, digits) : "--"}
                  </div>
                  <div className={`mpct ${m.changePct >= 0 ? "up" : "down"}`}>
                    {m.changePct == null ? "" : `${m.changePct >= 0 ? "+" : ""}${m.changePct}%`}
                  </div>
                </div>
                <span className={`badge ${clsBias(m.bias)}`}>{m.bias || (m.error ? "ERR" : "--")}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="main">
          <div className="meta-bar">
            <div className="pair-title">
              {detail?.market?.id || sel}
              <small>{detail?.market?.name || ""} · {tf.toUpperCase()} · {broker.toUpperCase()}</small>
            </div>
            {quote && (
              <>
                <div className={`live-px ${quote.changePct >= 0 ? "up" : "down"}`}>{fmt(quote.price, digits)}</div>
                <div className={quote.changePct >= 0 ? "up" : "down"}>
                  {quote.change >= 0 ? "+" : ""}{fmt(quote.change, digits)} ({quote.changePct >= 0 ? "+" : ""}{quote.changePct}%)
                </div>
                <span className="chip">H <b>{fmt(quote.high, digits)}</b></span>
                <span className="chip">L <b>{fmt(quote.low, digits)}</b></span>
                {sig && <span className={`badge ${clsBias(sig.bias)}`}>{sig.bias} · {sig.confidence}%</span>}
              </>
            )}
          </div>

          <div className="chart-wrap">
            <iframe
              title="tv"
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(tv)}&interval=${tvInterval}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0d1117&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&hide_top_toolbar=0&locale=en`}
            />
          </div>

          <div className="tabs">
            <button className={tab === "setup" ? "on" : ""} onClick={() => setTab("setup")}>BUY + SELL indicator</button>
            <button className={tab === "broker" ? "on" : ""} onClick={() => setTab("broker")}>{broker.toUpperCase()} analysis</button>
            <button className={tab === "ta" ? "on" : ""} onClick={() => setTab("ta")}>Indicators</button>
          </div>

          {loading && !detail ? <div className="loading">Loading analysis...</div> : null}
          {err ? <div className="error">{err}</div> : null}

          {tab === "setup" && detail && (
            <div className="setup-grid">
              <div className="overview-col">
                <div className="ph">Kothay trade nibo</div>
                <div className="bias-row">
                  <div className="bias-big" style={{ color: colorBias(sig?.bias) }}>{sig?.bias}</div>
                  <div className="conf">{sig?.confidence}% · preferred {preferred}</div>
                </div>
                <div className="bar">
                  <div className="b" style={{ width: `${sig?.buyPct || 50}%` }} />
                  <div className="s" style={{ width: `${sig?.sellPct || 50}%` }} />
                </div>
                <p className="overview">{detail.overview}</p>
                <ul className="notes">
                  {(sig?.notes || []).map((n, i) => <li key={i}>{n}</li>)}
                </ul>
                <div className="quick">
                  <div className="qbox buy">
                    <div className="qk">BUY entry</div>
                    <div className="qv">{fmt(detail.buy?.entryFrom, digits)} – {fmt(detail.buy?.entryTo, digits)}</div>
                    <div className="qs">SL {detail.buy?.ticksSL} {tickLabel} · TP1 {detail.buy?.ticksTP1} {tickLabel}</div>
                  </div>
                  <div className="qbox sell">
                    <div className="qk">SELL entry</div>
                    <div className="qv">{fmt(detail.sell?.entryFrom, digits)} – {fmt(detail.sell?.entryTo, digits)}</div>
                    <div className="qs">SL {detail.sell?.ticksSL} {tickLabel} · TP1 {detail.sell?.ticksTP1} {tickLabel}</div>
                  </div>
                </div>
              </div>
              <Ladder setup={detail.buy} price={quote?.price} digits={digits} preferred={preferred === "BUY"} />
              <Ladder setup={detail.sell} price={quote?.price} digits={digits} preferred={preferred === "SELL"} />
            </div>
          )}

          {tab === "broker" && detail && activeBroker && (
            <div className="broker-grid">
              <div className="ph-line">
                {activeBroker.name} te {detail.market.id} — same levels, spread-adjusted SL. Chart symbol: {activeBroker.tv}
              </div>
              <BrokerCard b={activeBroker} side="BUY" digits={digits} tickLabel={tickLabel} />
              <BrokerCard b={activeBroker} side="SELL" digits={digits} tickLabel={tickLabel} />
            </div>
          )}

          {tab === "ta" && detail?.indicators && (
            <div className="ta-wrap">
              <div className="inds">
                <div className="ind"><div className="k">RSI 14</div><div className="v">{detail.indicators.rsi ?? "--"}</div></div>
                <div className="ind"><div className="k">ADX</div><div className="v">{detail.indicators.adx ?? "--"}</div></div>
                <div className="ind"><div className="k">Stoch</div><div className="v">{detail.indicators.stoch ?? "--"}</div></div>
                <div className="ind"><div className="k">EMA 20</div><div className="v">{fmt(detail.indicators.ema20, digits)}</div></div>
                <div className="ind"><div className="k">EMA 50</div><div className="v">{fmt(detail.indicators.ema50, digits)}</div></div>
                <div className="ind"><div className="k">SMA 200</div><div className="v">{fmt(detail.indicators.sma200, digits)}</div></div>
                <div className="ind"><div className="k">ATR</div><div className="v">{fmt(detail.indicators.atr, digits)}</div></div>
                <div className="ind"><div className="k">Support</div><div className="v">{fmt(detail.indicators.support, digits)}</div></div>
                <div className="ind"><div className="k">Resistance</div><div className="v">{fmt(detail.indicators.resistance, digits)}</div></div>
                <div className="ind"><div className="k">BB upper</div><div className="v">{fmt(detail.indicators.bb?.upper, digits)}</div></div>
                <div className="ind"><div className="k">BB mid</div><div className="v">{fmt(detail.indicators.bb?.mid, digits)}</div></div>
                <div className="ind"><div className="k">BB lower</div><div className="v">{fmt(detail.indicators.bb?.lower, digits)}</div></div>
              </div>
              <p className="warn">Educational only. Not financial advice. Spread values are typical estimates, live Exness/XM quotes differ by account type. Always confirm in MT4/MT5.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
