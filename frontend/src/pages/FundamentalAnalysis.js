import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
// FIX 1: Route must be <Route path="/fundamentals/:paramSymbol" element={<FundamentalAnalysis/>} />
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Shield,
  Activity, AlertCircle, CheckCircle2, XCircle, Minus,
  RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight, Search,
  BookOpen, Percent, Calendar
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area, Legend,
  ComposedChart, ReferenceLine,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 80 }) {
  const s = Math.max(0, Math.min(score ?? 0, 100));
  const stroke = 8, r = (size - stroke * 2) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const filled = (s / 100) * circ;
  const color = s >= 70 ? "#22c55e" : s >= 50 ? "#f59e0b" : s >= 30 ? "#f97316" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 1.2s ease" }} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={Math.round(size / 4)} fontWeight="800"
          fontFamily="Rajdhani, monospace">{s}</text>
      </svg>
      <span style={{ fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
const VCFG = {
  "STRONG BUY": { bg: "#052e16", border: "#16a34a", text: "#4ade80", Icon: CheckCircle2 },
  "BUY":        { bg: "#052e16", border: "#22c55e", text: "#86efac", Icon: TrendingUp },
  "HOLD":       { bg: "#451a03", border: "#d97706", text: "#fcd34d", Icon: Minus },
  "WEAK":       { bg: "#431407", border: "#ea580c", text: "#fb923c", Icon: AlertCircle },
  "AVOID":      { bg: "#450a0a", border: "#dc2626", text: "#f87171", Icon: XCircle },
};
function VerdictBadge({ verdict }) {
  const cfg = VCFG[verdict] || VCFG["HOLD"];
  const { Icon } = cfg;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px",
      borderRadius: 8, background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.text, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase"
    }}>
      <Icon style={{ width: 13, height: 13 }} />{verdict}
    </span>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, color = "#cbd5e1", sub }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MRow({ label, value, unit = "", good, warn, sub }) {
  let color = "#cbd5e1";
  const n = parseFloat(value);
  if (!isNaN(n) && value !== null && value !== undefined) {
    if (good && good(n))      color = "#4ade80";
    else if (warn && warn(n)) color = "#fbbf24";
    else if (good || warn)    color = "#f87171";
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #0f172a" }}>
      <div>
        <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
        {sub && <span style={{ color: "#334155", fontSize: 11, marginLeft: 6 }}>{sub}</span>}
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>
        {(value !== null && value !== undefined) ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SCard({ title, icon: Icon, accent = "#60a5fa", children }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid #1e293b", background: "#111827" }}>
        <Icon style={{ width: 14, height: 14, color: accent }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, fontFamily: "Rajdhani,sans-serif" }}>{title}</span>
      </div>
      <div style={{ padding: "0 16px 4px" }}>{children}</div>
    </div>
  );
}

// ─── CAGR Pill ────────────────────────────────────────────────────────────────
function CagrPill({ label, value }) {
  const n = value ?? 0;
  const good = n >= 15, ok = n >= 8;
  const color = good ? "#4ade80" : ok ? "#fbbf24" : "#f87171";
  const bg    = good ? "rgba(34,197,94,0.1)" : ok ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)";
  return (
    <div style={{ textAlign: "center", padding: "10px 6px", background: bg, border: `1px solid ${color}22`, borderRadius: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color }}>
        {value !== null && value !== undefined ? `${value}%` : "—"}
      </div>
      <div style={{ fontSize: 10, color: "#475569", marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
function CT({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: "monospace", fontWeight: 700 }}>
          {p.name}: {p.value != null ? `${Number(p.value).toLocaleString("en-IN")}${suffix}` : "—"}
        </div>
      ))}
    </div>
  );
}

// ─── Shareholding Donut ───────────────────────────────────────────────────────
function ShpDonut({ promoter, fii, dii, pub }) {
  const vals = [
    { label: "Promoters", pct: promoter ?? 0, color: "#3b82f6" },
    { label: "FIIs",      pct: fii      ?? 0, color: "#a855f7" },
    { label: "DIIs",      pct: dii      ?? 0, color: "#22c55e" },
    { label: "Public",    pct: pub      ?? 0, color: "#f59e0b" },
  ];
  const cx = 60, cy = 60, r = 46, strokeW = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = vals.map(v => {
    const len = (v.pct / 100) * circ;
    const slice = { ...v, dashArray: `${len} ${circ - len}`, offset };
    offset += len;
    return slice;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg width={120} height={120}>
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={strokeW}
            strokeDasharray={s.dashArray} strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${cx} ${cy})`} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight="700" fontFamily="monospace">{promoter ?? "—"}%</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize={9}>Promoter</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {vals.map(v => (
          <div key={v.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: v.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#94a3b8", flex: 1 }}>{v.label}</span>
            <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#cbd5e1" }}>
              {v.pct ? `${v.pct}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ h = 120 }) => (
  <div style={{ height: h, background: "#1e293b", borderRadius: 12, animation: "pulse 1.5s infinite" }} />
);

// ─── Chart section wrapper ────────────────────────────────────────────────────
function ChartBox({ title, children, height = 200 }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 16, fontFamily: "Rajdhani,sans-serif" }}>{title}</div>
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const FundamentalAnalysis = () => {
  // FIX 1: Route must be: <Route path="/fundamentals/:paramSymbol" element={<FundamentalAnalysis/>} />
  const { paramSymbol } = useParams();
  const navigate = useNavigate();

  // FIX 2: Normalize symbol — strip .NS and uppercase
  const symbol = (paramSymbol && paramSymbol !== "loading")
    ? paramSymbol.replace(/\.NS$/, "").toUpperCase()
    : null;

  const [search, setSearch]               = useState("");
  const [stocks, setStocks]               = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [tab, setTab]                     = useState("overview");

  // fetch all stocks once
  useEffect(() => {
    axios.get(`${API}/stocks/all`)
      .then(res => setStocks(res.data))
      .catch(e => console.error("fetchStocks failed:", e));
  }, []);

  // sync selectedStock chip from URL param
  useEffect(() => {
    if (symbol) setSelectedStock({ symbol: symbol + ".NS", name: symbol });
    else        setSelectedStock(null);
  }, [symbol]);

  // FIX 3: Single fetchData, useCallback on symbol — no duplicate calls
  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);
    setTab("overview");
    try {
      const res = await axios.get(`${API}/stocks/${symbol}/fundamental`);
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (symbol) {
      fetchData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [symbol, fetchData]);

  // search helpers
  const filteredStocks = [...new Map(stocks.map(s => [s.symbol, s])).values()]
    .filter(s =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
    );

  // FIX 4: handleSelect must navigate — NOT call fetchData directly
  const handleSelect = (stock) => {
    const clean = stock.symbol.replace(/\.NS$/, "").toUpperCase();
    setSearch("");
    navigate(`/fundamentals/${clean}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && search.trim()) {
      const clean = search.replace(/\.NS$/, "").toUpperCase();
      setSearch("");
      navigate(`/fundamentals/${clean}`);
    }
  };

  const cleanSymbol = selectedStock?.symbol?.replace(/\.NS$/, "");

  const TABS = ["overview", "growth", "financials", "balance sheet", "shareholding"];
  const tabStyle = (t) => ({
    flex: 1, padding: "8px 4px", fontSize: 11, fontWeight: 700, borderRadius: 8,
    border: "none", cursor: "pointer", fontFamily: "Rajdhani,sans-serif",
    letterSpacing: "0.08em", textTransform: "uppercase", transition: "all 0.2s",
    background: tab === t ? "#2563eb" : "transparent",
    color: tab === t ? "#fff" : "#64748b",
    boxShadow: tab === t ? "0 2px 12px rgba(37,99,235,0.3)" : "none",
  });

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold font-['Rajdhani']">Fundamental Analysis</h1>
        <p className="text-muted-foreground">Search any NSE stock to explore deep financial fundamentals</p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader><CardTitle>Search Stock</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol (e.g. RELIANCE, TCS)…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
          </div>

          {/* Dropdown */}
          {search && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredStocks.length === 0
                ? <div className="px-4 py-3 text-sm text-muted-foreground">No stocks found</div>
                : filteredStocks.slice(0, 10).map((stock) => (
                    <div key={stock.symbol}
                      className="px-4 py-2 cursor-pointer hover:bg-muted flex items-center justify-between"
                      onClick={() => handleSelect(stock)}
                    >
                      <span>
                        <span className="font-semibold font-mono">{stock.symbol.replace(/\.NS$/, "")}</span>
                        <span className="text-muted-foreground ml-2 text-sm">{stock.name}</span>
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))
              }
            </div>
          )}

          {/* Selected chip */}
          {selectedStock && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 font-mono text-sm">
                {cleanSymbol}
              </div>
              <button className="text-sm text-red-500 hover:text-red-400"
                onClick={() => { setSelectedStock(null); navigate("/fundamentals/loading"); }}>
                remove
              </button>
            </div>
          )}

          {/* Quick picks when nothing selected */}
          {!selectedStock && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">Quick:</span>
              {["RELIANCE","TCS","HDFCBANK","INFY","WIPRO","SBIN","ICICIBANK","BHARTIARTL"].map(sym => (
                <button key={sym} onClick={() => navigate(`/fundamentals/${sym}`)}
                  className="px-3 py-1 rounded-md border border-border text-xs font-mono hover:bg-muted transition-colors">
                  {sym}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fundamentals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {cleanSymbol ? `Fundamentals — ${cleanSymbol}` : "Fundamentals"}
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* Empty state */}
          {!symbol && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Activity className="w-10 h-10 opacity-30" />
              <span className="text-sm">Search and select a stock above to view fundamentals</span>
            </div>
          )}

          {/* Loading */}
          {symbol && loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Sk h={180} /><Sk h={100} /><Sk h={220} /><Sk h={180} />
            </div>
          )}

          {/* Error */}
          {symbol && error && (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <XCircle className="w-12 h-12 text-red-400" />
              <div className="text-center">
                <div className="font-semibold">Could not load {symbol}</div>
                <div className="text-sm text-muted-foreground mt-1">{error}</div>
              </div>
              <button onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {/* ── Data loaded ── */}
          {symbol && !loading && !error && data && (() => {
            const {
              scores, valuation, profitability, growth, balance_sheet,
              cashflow, efficiency, ownership, analysis, trends, announcements
            } = data;

            // 52W range position
            const rangePct = data["52w_low"] && data["52w_high"] && data.current_price
              ? Math.min(Math.max(((data.current_price - data["52w_low"]) / (data["52w_high"] - data["52w_low"])) * 100, 0), 100)
              : null;

            const fromHigh = data["52w_high"] && data.current_price
              ? (((data.current_price - data["52w_high"]) / data["52w_high"]) * 100).toFixed(1)
              : null;

            const fromLow = data["52w_low"] && data.current_price
              ? (((data.current_price - data["52w_low"]) / data["52w_low"]) * 100).toFixed(1)
              : null;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* ══ HERO ══ */}
                <div style={{
                  background: "linear-gradient(135deg,#0f172a 0%,#111827 100%)",
                  border: "1px solid #1e293b", borderRadius: 16, padding: 20,
                  position: "relative", overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, background: "radial-gradient(circle,rgba(59,130,246,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
                    {/* Left: identity */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", fontFamily: "Rajdhani,sans-serif", letterSpacing: "0.05em" }}>
                          {data.symbol}
                        </span>
                        <VerdictBadge verdict={scores?.verdict} />
                        {data.source_url && (
                          <a href={data.source_url} target="_blank" rel="noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#3b82f6", textDecoration: "none" }}>
                            <ExternalLink style={{ width: 11, height: 11 }} /> Screener
                          </a>
                        )}
                      </div>

                      {/* FIX 5: Show full company name from API */}
                      <div style={{ color: "#94a3b8", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{data.name}</div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {data.sector && (
                          <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
                            {data.sector}
                          </span>
                        )}
                        {data.industry && (
                          <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", color: "#64748b" }}>
                            {data.industry}
                          </span>
                        )}
                      </div>

                      {/* Index badges */}
                      {data.indices?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {data.indices.slice(0, 5).map(idx => (
                            <span key={idx} style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, background: "#1e293b", border: "1px solid #334155", color: "#475569" }}>{idx}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: price block */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 38, fontWeight: 900, color: "#f1f5f9", fontFamily: "monospace", lineHeight: 1 }}>
                          ₹{data.current_price?.toLocaleString("en-IN") ?? "—"}
                        </span>
                        {data.price_change_pct != null && (
                          <span style={{
                            fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                            color: data.price_change_pct >= 0 ? "#4ade80" : "#f87171",
                            display: "flex", alignItems: "center", gap: 2
                          }}>
                            {data.price_change_pct >= 0
                              ? <ArrowUpRight style={{ width: 14, height: 14 }} />
                              : <ArrowDownRight style={{ width: 14, height: 14 }} />}
                            {data.price_change_pct}%
                          </span>
                        )}
                      </div>

                      {/* FIX 6: Market cap formatted in Cr */}
                      {data.market_cap && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                          Mkt Cap: <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                            ₹{(data.market_cap / 100).toFixed(0)} Cr
                          </span>
                          <span style={{ color: "#334155", marginLeft: 4 }}>
                            (₹{(data.market_cap / 100000).toFixed(2)}L Cr)
                          </span>
                        </div>
                      )}

                      {/* FIX 7: book_value now shown — it's in root of API response */}
                      {data.book_value && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                          Book Value: <span style={{ color: "#94a3b8", fontWeight: 600 }}>₹{data.book_value}</span>
                        </div>
                      )}

                      {/* FIX 8: face_value shown */}
                      {data.face_value && (
                        <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>
                          Face Value: <span style={{ color: "#475569" }}>₹{data.face_value}</span>
                        </div>
                      )}

                      {/* From high/low */}
                      <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "flex-end" }}>
                        {fromHigh && (
                          <div style={{ fontSize: 11, fontFamily: "monospace", color: parseFloat(fromHigh) < 0 ? "#f87171" : "#4ade80" }}>
                            {fromHigh}% from High
                          </div>
                        )}
                        {fromLow && (
                          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#4ade80" }}>
                            +{fromLow}% from Low
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 52W Range bar */}
                  {rangePct !== null && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 8, fontFamily: "monospace" }}>
                        <span>₹{data["52w_low"]?.toLocaleString("en-IN")} <span style={{ color: "#334155" }}>52W Low</span></span>
                        <span style={{ color: "#334155" }}>52-Week Range</span>
                        <span>₹{data["52w_high"]?.toLocaleString("en-IN")} <span style={{ color: "#334155" }}>52W High</span></span>
                      </div>
                      <div style={{ position: "relative", height: 8, borderRadius: 99, background: "linear-gradient(90deg,#ef4444,#f59e0b 50%,#22c55e)", opacity: 0.7 }} />
                      <div style={{ position: "relative", marginTop: -7 }}>
                        <div style={{ position: "absolute", left: `calc(${rangePct}% - 7px)`, top: 0, width: 14, height: 14, background: "#fff", borderRadius: "50%", border: "2px solid #0f172a", boxShadow: "0 0 0 2px #3b82f6,0 2px 8px rgba(0,0,0,0.5)" }} />
                      </div>
                      <div style={{ height: 10 }} />
                    </div>
                  )}
                </div>

                {/* ══ SCORE RINGS ══ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                  {[
                    { label: "Valuation",     score: scores?.valuation,        b: "#1d4ed8" },
                    { label: "Profitability", score: scores?.profitability,    b: "#166534" },
                    { label: "Growth",        score: scores?.growth,           b: "#92400e" },
                    { label: "Fin. Health",   score: scores?.financial_health, b: "#6b21a8" },
                    { label: "Overall",       score: scores?.overall,          b: "#0369a1" },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 6px",
                      background: "#0f172a", border: `1px solid ${s.b}44`, borderRadius: 14,
                      boxShadow: s.label === "Overall" ? `0 0 20px ${s.b}33` : "none"
                    }}>
                      <ScoreRing score={s.score ?? 0} label={s.label} size={s.label === "Overall" ? 88 : 74} />
                    </div>
                  ))}
                </div>

                {/* ══ PROS / CONS ══ */}
                {(analysis?.pros?.length > 0 || analysis?.cons?.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* Show pros panel only if there are pros */}
                    {analysis.pros?.length > 0 ? (
                      <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#22c55e", marginBottom: 10, fontFamily: "Rajdhani,sans-serif" }}>✓ Pros</div>
                        {analysis.pros.map((p, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                            <CheckCircle2 style={{ width: 13, height: 13, color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>{p}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // FIX 9: When pros is empty [], show a neutral placeholder so layout doesn't break
                      <div style={{ background: "rgba(100,116,139,0.05)", border: "1px solid rgba(100,116,139,0.15)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 12, color: "#334155" }}>No pros listed</span>
                      </div>
                    )}

                    {analysis.cons?.length > 0 && (
                      <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", marginBottom: 10, fontFamily: "Rajdhani,sans-serif" }}>✗ Cons</div>
                        {analysis.cons.map((c, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                            <XCircle style={{ width: 13, height: 13, color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ TABS ══ */}
                <div style={{ display: "flex", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 4, gap: 4 }}>
                  {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{t}</button>)}
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* OVERVIEW TAB                                               */}
                {/* ══════════════════════════════════════════════════════════ */}
                {tab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* FIX 10: 8-tile KPI grid with all key metrics from API */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      <KpiTile label="P/E Ratio"  value={valuation?.pe}
                        color={valuation?.pe && valuation?.pe < 25 ? "#4ade80" : "#f87171"} />
                      <KpiTile label="P/B Ratio"  value={valuation?.price_to_book}
                        color={valuation?.price_to_book && valuation?.price_to_book < 3 ? "#4ade80" : "#fbbf24"} />
                      <KpiTile label="ROCE"
                        value={valuation?.roce != null ? `${valuation.roce}%` : null}
                        color={valuation?.roce > 12 ? "#4ade80" : "#fbbf24"} />
                      <KpiTile label="ROE"
                        value={valuation?.roe != null ? `${valuation.roe}%` : null}
                        color={valuation?.roe > 12 ? "#4ade80" : "#f87171"} />
                      <KpiTile label="OPM"
                        value={profitability?.operating_margin != null ? `${profitability.operating_margin}%` : null}
                        color={profitability?.operating_margin > 15 ? "#4ade80" : "#fbbf24"} />
                      <KpiTile label="Net Margin"
                        value={profitability?.net_margin != null ? `${profitability.net_margin}%` : null}
                        color={profitability?.net_margin > 8 ? "#4ade80" : "#f87171"} />
                      <KpiTile label="D/E Ratio"  value={balance_sheet?.debt_to_equity}
                        color={balance_sheet?.debt_to_equity < 1 ? "#4ade80" : "#fbbf24"} />
                      <KpiTile label="Div Yield"
                        value={valuation?.dividend_yield != null ? `${valuation.dividend_yield}%` : null}
                        color="#60a5fa" />
                    </div>

                    {/* About */}
                    {data.description && (
                      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 8, fontFamily: "Rajdhani,sans-serif" }}>About</div>
                        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, margin: 0 }}>{data.description}</p>
                      </div>
                    )}

                    {/* Annual Revenue & Profit chart */}
                    {trends?.annual?.length > 1 && (
                      <ChartBox title="Annual Revenue & Net Profit (₹ Crores)" height={220}>
                        <ComposedChart data={trends.annual} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                          <Tooltip content={<CT suffix=" Cr" />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <Bar dataKey="revenue"    name="Revenue"    fill="#3b82f6" radius={[4,4,0,0]} />
                          <Bar dataKey="net_income" name="Net Profit" fill="#22c55e" radius={[4,4,0,0]} />
                          <Line type="monotone" dataKey="opm" name="OPM %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} yAxisId={0} />
                        </ComposedChart>
                      </ChartBox>
                    )}

                    {/* Quarterly chart */}
                    {trends?.quarterly?.length > 1 && (
                      <ChartBox title="Quarterly Sales & Net Profit (₹ Crores)" height={190}>
                        <ComposedChart data={trends.quarterly} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="quarter" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                          <Tooltip content={<CT suffix=" Cr" />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <Bar dataKey="sales"      name="Sales"      fill="#3b82f6" radius={[3,3,0,0]} />
                          <Bar dataKey="net_profit" name="Net Profit" fill="#22c55e" radius={[3,3,0,0]} />
                          {/* FIX 11: OPM line on quarterly chart too */}
                          <Line type="monotone" dataKey="opm" name="OPM %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ChartBox>
                    )}

                    {/* Valuation + Profitability */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <SCard title="Valuation" icon={DollarSign} accent="#60a5fa">
                        <MRow label="P/E Ratio"    value={valuation?.pe}            good={v=>v<15} warn={v=>v<25} />
                        <MRow label="Price / Book" value={valuation?.price_to_book} good={v=>v<1.5} warn={v=>v<3} />
                        <MRow label="ROCE"         value={valuation?.roce}   unit="%" good={v=>v>15} warn={v=>v>10} />
                        <MRow label="ROE"          value={valuation?.roe}    unit="%" good={v=>v>15} warn={v=>v>10} />
                        <MRow label="Div Yield"    value={valuation?.dividend_yield} unit="%" good={v=>v>2} warn={v=>v>0.5} />
                      </SCard>
                      <SCard title="Profitability" icon={TrendingUp} accent="#4ade80">
                        <MRow label="ROCE"         value={profitability?.roce}             unit="%" good={v=>v>15} warn={v=>v>10} />
                        <MRow label="ROE"          value={profitability?.roe}              unit="%" good={v=>v>18} warn={v=>v>10} />
                        <MRow label="OPM"          value={profitability?.operating_margin} unit="%" good={v=>v>18} warn={v=>v>10} />
                        <MRow label="Net Margin"   value={profitability?.net_margin}       unit="%" good={v=>v>12} warn={v=>v>5} />
                        <MRow label="ROE (3Y avg)" value={profitability?.roe_3y}           unit="%" good={v=>v>15} warn={v=>v>10} />
                        {/* FIX 12: Show roe_5y from API */}
                        <MRow label="ROE (5Y avg)" value={profitability?.roe_5y}           unit="%" good={v=>v>15} warn={v=>v>10} />
                      </SCard>
                    </div>

                    {/* EPS trend */}
                    {trends?.eps?.length > 1 && (
                      <ChartBox title="Quarterly EPS (₹)" height={160}>
                        <LineChart data={trends.eps}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="quarter" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CT suffix=" ₹" />} />
                          {/* FIX 13: ReferenceLine at 0 so negative EPS is clear */}
                          <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="eps" name="EPS" stroke="#f59e0b" strokeWidth={2.5}
                            dot={{ fill: "#f59e0b", r: 3, strokeWidth: 0 }}
                            activeDot={{ fill: "#f59e0b", r: 5, stroke: "#78350f", strokeWidth: 2 }} />
                        </LineChart>
                      </ChartBox>
                    )}

                    {/* Announcements */}
                    {announcements?.length > 0 && (
                      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 12, fontFamily: "Rajdhani,sans-serif" }}>Recent Announcements</div>
                        {announcements.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid #0f172a", textDecoration: "none" }}
                            onMouseEnter={e => e.currentTarget.querySelector("span").style.color = "#cbd5e1"}
                            onMouseLeave={e => e.currentTarget.querySelector("span").style.color = "#94a3b8"}
                          >
                            <ExternalLink style={{ width: 12, height: 12, color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, transition: "color 0.15s" }}>{a.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* GROWTH TAB                                                 */}
                {/* ══════════════════════════════════════════════════════════ */}
                {tab === "growth" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* FIX 14: revenue_yoy and profit_yoy from API used as TTM fallbacks */}
                    {[
                      { title: "Compounded Sales Growth",
                        keys:   ["sales_cagr_10y","sales_cagr_5y","sales_cagr_3y","sales_cagr_ttm"],
                        labels: ["10 Years","5 Years","3 Years","TTM"],
                        fb:     [null, null, null, growth?.revenue_yoy] },
                      { title: "Compounded Profit Growth",
                        keys:   ["profit_cagr_10y","profit_cagr_5y","profit_cagr_3y","profit_cagr_ttm"],
                        labels: ["10 Years","5 Years","3 Years","TTM"],
                        fb:     [null, null, null, growth?.profit_yoy] },
                      { title: "Stock Price CAGR",
                        keys:   ["price_cagr_10y","price_cagr_5y","price_cagr_3y","price_cagr_1y"],
                        labels: ["10 Years","5 Years","3 Years","1 Year"],
                        fb:     [null, null, null, null] },
                    ].map(s => (
                      <div key={s.title} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 14, fontFamily: "Rajdhani,sans-serif" }}>{s.title}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                          {s.keys.map((k, i) => <CagrPill key={k} label={s.labels[i]} value={growth?.[k] ?? s.fb[i]} />)}
                        </div>
                      </div>
                    ))}

                    {/* ROE history */}
                    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 14, fontFamily: "Rajdhani,sans-serif" }}>Return on Equity</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                        <CagrPill label="10 Years"  value={profitability?.roe_10y ?? growth?.roe_10y} />
                        <CagrPill label="5 Years"   value={profitability?.roe_5y  ?? growth?.roe_5y} />
                        <CagrPill label="3 Years"   value={profitability?.roe_3y} />
                        <CagrPill label="Last Year" value={profitability?.roe} />
                      </div>
                    </div>

                    {/* FIX 15: YoY growth quick-stat row from API */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <KpiTile label="Revenue YoY Growth" value={growth?.revenue_yoy != null ? `${growth.revenue_yoy}%` : null}
                        color={growth?.revenue_yoy > 10 ? "#4ade80" : growth?.revenue_yoy > 0 ? "#fbbf24" : "#f87171"} />
                      <KpiTile label="Profit YoY Growth"  value={growth?.profit_yoy  != null ? `${growth.profit_yoy}%`  : null}
                        color={growth?.profit_yoy  > 10 ? "#4ade80" : growth?.profit_yoy  > 0 ? "#fbbf24" : "#f87171"} />
                    </div>

                    {/* Revenue area chart */}
                    {trends?.annual?.length > 1 && (
                      <ChartBox title="Annual Revenue Trend (₹ Cr)" height={210}>
                        <AreaChart data={trends.annual}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                          <Tooltip content={<CT suffix=" Cr" />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <Area type="monotone" dataKey="revenue"    name="Revenue"    stroke="#3b82f6" fill="url(#revGrad)"  strokeWidth={2} />
                          <Area type="monotone" dataKey="net_income" name="Net Profit" stroke="#22c55e" fill="url(#profGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ChartBox>
                    )}

                    {/* Annual P&L table */}
                    {trends?.annual?.length > 0 && (
                      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, overflowX: "auto" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 12, fontFamily: "Rajdhani,sans-serif" }}>Annual P&L Summary</div>
                        <table style={{ width: "100%", fontSize: 12, minWidth: 520, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1e293b" }}>
                              {["Year","Sales (₹Cr)","Net Profit","Net Margin","OPM","EPS (₹)"].map((h, i) => (
                                <th key={h} style={{ padding: "0 0 10px", textAlign: i===0?"left":"right", fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {trends.annual.map((row, i) => {
                              const margin = row.revenue && row.net_income ? ((row.net_income/row.revenue)*100).toFixed(1) : null;
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                                  <td style={{ padding: "8px 0", color: "#94a3b8", fontFamily: "monospace" }}>{row.year}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#cbd5e1" }}>{row.revenue ? row.revenue.toLocaleString("en-IN") : "—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: (row.net_income??0)>0?"#4ade80":"#f87171" }}>{row.net_income ? row.net_income.toLocaleString("en-IN") : "—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: margin>10?"#4ade80":margin>5?"#fbbf24":"#f87171" }}>{margin?`${margin}%`:"—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: row.opm>15?"#4ade80":row.opm>10?"#fbbf24":"#f87171" }}>{row.opm!=null?`${row.opm}%`:"—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#cbd5e1" }}>{row.eps??"—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* FINANCIALS TAB                                             */}
                {/* ══════════════════════════════════════════════════════════ */}
                {tab === "financials" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <SCard title="Profitability Ratios" icon={TrendingUp} accent="#4ade80">
                        <MRow label="ROCE"         value={profitability?.roce}             unit="%" good={v=>v>15} warn={v=>v>10} />
                        <MRow label="ROE"          value={profitability?.roe}              unit="%" good={v=>v>18} warn={v=>v>10} />
                        <MRow label="OPM"          value={profitability?.operating_margin} unit="%" good={v=>v>18} warn={v=>v>10} />
                        <MRow label="Net Margin"   value={profitability?.net_margin}       unit="%" good={v=>v>12} warn={v=>v>5} />
                        <MRow label="ROE (3Y avg)" value={profitability?.roe_3y}           unit="%" good={v=>v>15} warn={v=>v>10} />
                        <MRow label="ROE (5Y avg)" value={profitability?.roe_5y}           unit="%" good={v=>v>15} warn={v=>v>10} />
                      </SCard>

                      {/* FIX 16: Cashflow values are in root of API — all 4 fields shown */}
                      <SCard title="Cash Flow (₹ Cr)" icon={BarChart3} accent="#fb923c">
                        <MRow label="Operating CF" value={cashflow?.operating} good={v=>v>0} />
                        <MRow label="Investing CF" value={cashflow?.investing} />
                        <MRow label="Financing CF" value={cashflow?.financing} />
                        <MRow label="Free CF"      value={cashflow?.free_cf}   good={v=>v>0} />
                        {/* FIX 17: FCF as % of operating CF */}
                        {cashflow?.operating && cashflow?.free_cf && (
                          <MRow label="FCF Conversion"
                            value={((cashflow.free_cf / cashflow.operating) * 100).toFixed(1)}
                            unit="%" good={v=>v>30} warn={v=>v>10} />
                        )}
                      </SCard>
                    </div>

                    <SCard title="Efficiency Ratios" icon={Activity} accent="#a78bfa">
                      <MRow label="Debtor Days"           value={efficiency?.debtor_days}           good={v=>v<30} warn={v=>v<60} />
                      <MRow label="Inventory Days"        value={efficiency?.inventory_days}        good={v=>v<60} warn={v=>v<90} />
                      <MRow label="Days Payable"          value={efficiency?.days_payable} />
                      {/* FIX 18: Cash Conversion Cycle — negative is good (paid before you pay suppliers) */}
                      <MRow label="Cash Conversion Cycle" value={efficiency?.cash_conversion_cycle} good={v=>v<0}  warn={v=>v<30}
                        sub={efficiency?.cash_conversion_cycle < 0 ? "(negative = good)" : ""} />
                    </SCard>

                    {/* Cashflow trend chart */}
                    {trends?.cashflow?.length > 1 && (
                      <ChartBox title="Cash Flow Trend (₹ Crores)" height={190}>
                        <ComposedChart data={trends.cashflow} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                          <Tooltip content={<CT suffix=" Cr" />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <ReferenceLine y={0} stroke="#334155" />
                          <Bar dataKey="operating"  name="Operating"  fill="#22c55e" radius={[3,3,0,0]} />
                          <Bar dataKey="investing"  name="Investing"  fill="#ef4444" radius={[3,3,0,0]} />
                          <Line type="monotone" dataKey="free_cf" name="Free CF" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: "#60a5fa" }} />
                        </ComposedChart>
                      </ChartBox>
                    )}

                    {/* FIX 19: Quarterly P&L table in financials tab */}
                    {trends?.quarterly?.length > 0 && (
                      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, overflowX: "auto" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 12, fontFamily: "Rajdhani,sans-serif" }}>Quarterly P&L</div>
                        <table style={{ width: "100%", fontSize: 12, minWidth: 400, borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1e293b" }}>
                              {["Quarter","Sales (₹Cr)","Net Profit","Net Margin","OPM"].map((h,i) => (
                                <th key={h} style={{ padding: "0 0 10px", textAlign: i===0?"left":"right", fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...trends.quarterly].reverse().map((row, i) => {
                              const margin = row.sales && row.net_profit ? ((row.net_profit/row.sales)*100).toFixed(1) : null;
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                                  <td style={{ padding: "8px 0", color: "#94a3b8", fontFamily: "monospace" }}>{row.quarter}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#cbd5e1" }}>{row.sales ? row.sales.toLocaleString("en-IN") : "—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: (row.net_profit??0)>0?"#4ade80":"#f87171" }}>{row.net_profit ? row.net_profit.toLocaleString("en-IN") : "—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: margin>10?"#4ade80":margin>5?"#fbbf24":"#f87171" }}>{margin?`${margin}%`:"—"}</td>
                                  <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: row.opm>15?"#4ade80":row.opm>10?"#fbbf24":"#f87171" }}>{row.opm!=null?`${row.opm}%`:"—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* BALANCE SHEET TAB                                          */}
                {/* ══════════════════════════════════════════════════════════ */}
                {tab === "balance sheet" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <SCard title="Balance Sheet (Latest)" icon={Shield} accent="#22d3ee">
                        <MRow label="Equity Capital (₹Cr)" value={balance_sheet?.equity_capital} />
                        <MRow label="Reserves (₹Cr)"       value={balance_sheet?.reserves    && balance_sheet.reserves.toLocaleString("en-IN")} />
                        <MRow label="Borrowings (₹Cr)"     value={balance_sheet?.borrowings   && balance_sheet.borrowings.toLocaleString("en-IN")} />
                        <MRow label="Total Assets (₹Cr)"   value={balance_sheet?.total_assets && balance_sheet.total_assets.toLocaleString("en-IN")} />
                        <MRow label="Debt / Equity"         value={balance_sheet?.debt_to_equity} good={v=>v<0.5} warn={v=>v<1.5} />
                        {/* FIX 20: book_value and face_value in balance sheet too */}
                        <MRow label="Book Value / Share"    value={data.book_value} />
                        <MRow label="Face Value"            value={data.face_value} />
                      </SCard>
                      <SCard title="Debt Trend" icon={TrendingDown} accent="#f87171">
                        {trends?.balance_sheet?.slice(-6).map((row, i) => (
                          <MRow key={i} label={row.year} value={row.de_ratio ?? "—"}
                            good={v=>v<0.5} warn={v=>v<1}
                            sub={`Borr: ₹${(row.borrowings||0).toLocaleString("en-IN")}Cr`} />
                        ))}
                      </SCard>
                    </div>

                    {/* Borrowings vs Equity chart */}
                    {trends?.balance_sheet?.length > 1 && (
                      <ChartBox title="Borrowings vs Equity (₹ Crores)" height={210}>
                        <ComposedChart data={trends.balance_sheet} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="year" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                          <Tooltip content={<CT suffix=" Cr" />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <Bar dataKey="borrowings" name="Borrowings" fill="#ef4444" radius={[3,3,0,0]} />
                          <Bar dataKey="equity"     name="Equity"     fill="#22c55e" radius={[3,3,0,0]} />
                          {/* FIX 21: D/E ratio line overlay on balance sheet chart */}
                          <Line type="monotone" dataKey="de_ratio" name="D/E Ratio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }} yAxisId={0} />
                        </ComposedChart>
                      </ChartBox>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════ */}
                {/* SHAREHOLDING TAB                                           */}
                {/* ══════════════════════════════════════════════════════════ */}
                {tab === "shareholding" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* Current holding donut */}
                    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase", marginBottom: 16, fontFamily: "Rajdhani,sans-serif" }}>Current Holding</div>
                      <ShpDonut
                        promoter={ownership?.promoter_pct}
                        fii={ownership?.fii_pct}
                        dii={ownership?.dii_pct}
                        pub={ownership?.public_pct}
                      />
                    </div>

                    {/* Shareholding trend chart */}
                    {trends?.shareholding?.length > 1 && (
                      <ChartBox title="Shareholding Trend (%)" height={210}>
                        <LineChart data={trends.shareholding}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="quarter" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 70]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CT suffix="%" />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          <Line type="monotone" dataKey="promoter" name="Promoters" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="fii"      name="FIIs"      stroke="#a855f7" strokeWidth={2} dot={{ r: 2, fill: "#a855f7", strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="dii"      name="DIIs"      stroke="#22c55e" strokeWidth={2} dot={{ r: 2, fill: "#22c55e", strokeWidth: 0 }} />
                        </LineChart>
                      </ChartBox>
                    )}

                    {/* FIX 22: Shareholding table shows QoQ change in promoter % */}
                    {trends?.shareholding?.length > 0 && (() => {
                      const rows = [...trends.shareholding].reverse();
                      return (
                        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, overflowX: "auto" }}>
                          <table style={{ width: "100%", fontSize: 12, minWidth: 480, borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                                {["Quarter","Promoters","Chg","FIIs","DIIs"].map((h,i) => (
                                  <th key={h} style={{ padding: "0 0 10px", textAlign: i===0?"left":"right", fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, i) => {
                                const prev = rows[i + 1];
                                const chg = prev && row.promoter != null && prev.promoter != null
                                  ? (row.promoter - prev.promoter).toFixed(2) : null;
                                return (
                                  <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                                    <td style={{ padding: "8px 0", color: "#94a3b8", fontFamily: "monospace" }}>{row.quarter}</td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: row.promoter > 50 ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>
                                      {row.promoter != null ? `${row.promoter}%` : "—"}
                                    </td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", fontSize: 11,
                                      color: chg === null ? "#334155" : parseFloat(chg) > 0 ? "#4ade80" : parseFloat(chg) < 0 ? "#f87171" : "#475569" }}>
                                      {chg !== null ? (parseFloat(chg) > 0 ? `+${chg}` : chg) : "—"}
                                    </td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#a78bfa" }}>
                                      {row.fii != null ? `${row.fii}%` : "—"}
                                    </td>
                                    <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#4ade80" }}>
                                      {row.dii != null ? `${row.dii}%` : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}

              </div>
            );
          })()}

        </CardContent>
      </Card>
    </div>
  );
};

export default FundamentalAnalysis;