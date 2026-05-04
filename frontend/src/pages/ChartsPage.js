// import React, { useState, useEffect, useRef, useCallback } from "react";
// import axios from "axios";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { createChart, CandlestickSeries, HistogramSeries, LineSeries,AreaSeries } from "lightweight-charts";
// import { BarChart3, Search, TrendingUp, TrendingDown, Activity, X } from "lucide-react";
// import { toast } from "sonner";
// import { useParams } from "react-router-dom";

// const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// /* ─── helpers ───────────────────────────────────────────────── */
// const fmt = (n, d = 2) =>
//   n == null || isNaN(n) ? "—" : Number(n).toFixed(d);

// const calcSMA = (data, period) =>
//   data.map((d, i) => {
//     if (i < period - 1) return null;
//     const avg = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
//     return { time: d.time, value: avg };
//   }).filter(Boolean);

//   const calcBB = (data, period = 20, multiplier = 2) => {

//     if (!data || data.length < period) return [];
  
//     const result = [];
  
//     for (let i = period - 1; i < data.length; i++) {
  
//       const slice = data.slice(i - period + 1, i + 1);
  
//       const mean =
//         slice.reduce((s, x) => s + x.close, 0) / period;
  
//       const variance =
//         slice.reduce((s, x) => s + (x.close - mean) ** 2, 0) / (period - 1);
  
//       const stdDev = Math.sqrt(variance);
  
//       result.push({
//         time: data[i].time,
//         middle: mean,
//         upper: mean + multiplier * stdDev,
//         lower: mean - multiplier * stdDev,
//       });
  
//     }
  
//     return result;
//   };
//   const calcSuperTrend = (data, period = 10, multiplier = 3) => {

//     if (!data || data.length < period) return [];
  
//     const result = [];
//     const tr = [];
//     const atr = [];
  
//     // True Range
//     for (let i = 0; i < data.length; i++) {
  
//       if (i === 0) {
//         tr.push(data[i].high - data[i].low);
//       } else {
//         tr.push(Math.max(
//           data[i].high - data[i].low,
//           Math.abs(data[i].high - data[i-1].close),
//           Math.abs(data[i].low - data[i-1].close)
//         ));
//       }
//     }
  
//     // ATR (SMA)
//     for (let i = 0; i < tr.length; i++) {
  
//       if (i < period) {
//         atr.push(null);
//       } else {
  
//         let sum = 0;
//         for (let j = i - period; j < i; j++) {
//           sum += tr[j];
//         }
  
//         atr.push(sum / period);
//       }
//     }
  
//     let prevFinalUpper = 0;
//     let prevFinalLower = 0;
//     let prevTrend = 1;
  
//     for (let i = 0; i < data.length; i++) {
  
//       if (!atr[i]) continue;
  
//       const hl2 = (data[i].high + data[i].low) / 2;
  
//       const basicUpper = hl2 + multiplier * atr[i];
//       const basicLower = hl2 - multiplier * atr[i];
  
//       const finalUpper =
//         (basicUpper < prevFinalUpper || data[i-1]?.close > prevFinalUpper)
//           ? basicUpper
//           : prevFinalUpper;
  
//       const finalLower =
//         (basicLower > prevFinalLower || data[i-1]?.close < prevFinalLower)
//           ? basicLower
//           : prevFinalLower;
  
//       let trend = prevTrend;
  
//       if (prevTrend === -1 && data[i].close > finalUpper) {
//         trend = 1;
//       } else if (prevTrend === 1 && data[i].close < finalLower) {
//         trend = -1;
//       }
  
//       const value = trend === 1 ? finalLower : finalUpper;
  
//       result.push({
//         time: data[i].time,
//         value
//       });
  
//       prevFinalUpper = finalUpper;
//       prevFinalLower = finalLower;
//       prevTrend = trend;
//     }
  
//     return result;
//   };


// const calcRSI = (data, period = 14) => {
//   if (data.length < period + 1) return [];
//   const result = [];
//   let gains = 0, losses = 0;
//   for (let i = 1; i <= period; i++) {
//     const diff = data[i].close - data[i - 1].close;
//     if (diff > 0) gains += diff; else losses -= diff;
//   }
//   let avgGain = gains / period, avgLoss = losses / period;
//   result.push({ time: data[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
//   for (let i = period + 1; i < data.length; i++) {
//     const diff = data[i].close - data[i - 1].close;
//     avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
//     avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
//     result.push({ time: data[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
//   }
//   return result;
// };

// const calcAvgVol= (data, period = 20) => {
//   if (data.length < period) return [];
//   const result = [];
//   for (let i = period - 1; i < data.length; i++) {
//     const avgVol = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.volume, 0) / period;
//     result.push({ time: data[i].time, value: avgVol });
//   }
//   return result;
// }






// /* ─── skeleton loader ───────────────────────────────────────── */
// const ChartSkeleton = () => {
//   // generate once, stable across renders
//   const bars = useRef(
//     Array.from({ length: 60 }, () => ({ h: 30 + Math.random() * 60, up: Math.random() > 0.45 }))
//   ).current;
//   return (
//     <div className="w-full h-[500px] flex flex-col gap-2 p-3">
//       <div className="flex items-end gap-[3px] flex-1">
//         {bars.map((b, i) => (
//           <div key={i} className="flex flex-col items-center flex-1" style={{ gap: 1 }}>
//             <div className={`w-px animate-pulse ${b.up ? "bg-emerald-700/30" : "bg-red-700/30"}`} style={{ height: b.h * 0.25 + "%" }} />
//             <div className={`w-full rounded-[1px] animate-pulse ${b.up ? "bg-emerald-800/40" : "bg-red-800/40"}`} style={{ height: b.h + "%" }} />
//             <div className={`w-px animate-pulse ${b.up ? "bg-emerald-700/30" : "bg-red-700/30"}`} style={{ height: b.h * 0.15 + "%" }} />
//           </div>
//         ))}
//       </div>
//       <div className="flex items-end gap-[3px] h-14 opacity-30">
//         {bars.map((b, i) => (
//           <div key={i} className="flex-1 bg-slate-600/50 rounded-[1px] animate-pulse" style={{ height: 15 + Math.random() * 85 + "%" }} />
//         ))}
//       </div>
//     </div>
//   );
// };

// /* ─── floating OHLC tooltip ─────────────────────────────────── */
// const OHLCTooltip = ({ ohlc, prevClose }) => {
//   if (!ohlc) return null;
//   const change = prevClose ? ohlc.close - prevClose : ohlc.close - ohlc.open;
//   const changePct = prevClose
//     ? ((ohlc.close - prevClose) / prevClose) * 100
//     : ((ohlc.close - ohlc.open) / ohlc.open) * 100;
//   const isUp = change >= 0;

//   return (
//     <div className="absolute top-2 left-2 z-50 pointer-events-none">
//       <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-xl text-[11px] font-mono">
//         {ohlc.time && <span className="text-slate-500 text-[10px]">{ohlc.time}</span>}
//         <span><span className="text-slate-500">O </span><span className="text-slate-200 font-semibold">{fmt(ohlc.open)}</span></span>
//         <span><span className="text-emerald-400">H </span><span className="text-slate-200 font-semibold">{fmt(ohlc.high)}</span></span>
//         <span><span className="text-red-400">L </span><span className="text-slate-200 font-semibold">{fmt(ohlc.low)}</span></span>
//         <span><span className="text-slate-500">C </span><span className="text-slate-200 font-semibold">{fmt(ohlc.close)}</span></span>
//         <span className={`flex items-center gap-0.5 font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
//           {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
//           {isUp ? "+" : ""}{fmt(change)} ({isUp ? "+" : ""}{fmt(changePct)}%)
//         </span>
//         {ohlc.volume > 0 && (
//           <span className="text-slate-500">Vol <span className="text-slate-400">{(ohlc.volume / 1e6).toFixed(2)}M</span></span>
//         )}
//       </div>
//     </div>
//   );
// };

// /* ─── indicator pill ────────────────────────────────────────── */
// const IndicatorPill = ({ label, active, color, onClick }) => (
//   <button
//     onClick={onClick}
//     className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
//       active ? "" : "border-slate-200 text-slate-400 hover:border-slate-400"
//     }`}
//     style={active ? { backgroundColor: color + "22", borderColor: color, color } : {}}
//   >
//     {label}
//   </button>
// );

// /* ─── main ──────────────────────────────────────────────────── */
// const ChartsPage = () => {
//   const [stocks, setStocks] = useState([]);
//   const [search, setSearch] = useState("");
//   const { symbol } = useParams();
//   const [selectedStock, setSelectedStock] = useState(null);
//   const [timeframe, setTimeframe] = useState("1d");
//   const [loading, setLoading] = useState(false);

//   // tooltip
//   const [ohlc, setOhlc] = useState(null);
//   const [prevClose, setPrevClose] = useState(null);

//   // raw data in ref — never stale in renderCharts
//   const rawDataRef = useRef([]);

//   // indicators
//   const [showMA20, setShowMA20] = useState(false);
//   const [showMA50, setShowMA50] = useState(false);
//   const [showSuperTrend, setShowSuperTrend] = useState(false);
//   const [showBB, setShowBB] = useState(false);
//   const [showRSI, setShowRSI] = useState(false);
//   const [showVolume, setShowVolume] = useState(true);

//   // DOM + chart refs
//   const mainContainerRef = useRef(null);
//   const rsiContainerRef = useRef(null);
//   const mainChartRef = useRef(null);
//   const rsiChartRef = useRef(null);

//   // persisted visible range — so indicator toggles don't reset the viewport
//   const visibleRangeRef = useRef(null);
//   // flag to distinguish "new stock load" vs "indicator toggle re-render"
//   const isNewStockRef = useRef(false);
//   // set to true right after loadChartData renders — causes indicator effect to skip one run
//   const justLoadedRef = useRef(true);

//   useEffect(() => { fetchStocks(); }, []);

//   useEffect(() => {
//     if (symbol && symbol !== "loading")
//       setSelectedStock({ symbol: symbol + ".NS", name: symbol + ".NS" });
//   }, [symbol]);

//   useEffect(() => {
//     if (selectedStock) {
//       isNewStockRef.current = true;   // mark as fresh load → fitContent
//        visibleRangeRef.current= null; // reset saved range
//       loadChartData();
//     }
//   }, [selectedStock, timeframe]);

//   // re-render on indicator toggle without re-fetching
//   useEffect(() => {
//     // skip the run that fires right after loadChartData already rendered
//     // if (justLoadedRef.current) { justLoadedRef.current = false; return; }
//     if (!loading && selectedStock && rawDataRef.current.length) {
//       isNewStockRef.current = false;  // preserve range
//       renderCharts(rawDataRef.current);
//     }
//   }, [showMA20, showMA50, showRSI, showVolume,showBB,showSuperTrend,selectedStock,loading]);

//   const fetchStocks = async () => {
//     try {
//       const res = await axios.get(`${API}/stocks/all`);
//       setStocks(res.data);
//     } catch (e) { console.error(e); }
//   };

//   const destroyCharts = () => {
//     if (mainChartRef.current) { mainChartRef.current.remove(); mainChartRef.current = null; }
//     if (rsiChartRef.current) { rsiChartRef.current.remove(); rsiChartRef.current = null; }
//   };

//   const renderCharts = useCallback((chartData) => {
//     // save range before destroy (only when not a fresh load)
//     if (!isNewStockRef.current && mainChartRef.current) {
//       try { visibleRangeRef.current = mainChartRef.current.timeScale().getVisibleLogicalRange(); } catch (_) {}
//     }
    
//     destroyCharts();
//     if (!mainContainerRef.current || !chartData.length) return;

//     const BASE_OPTS = {
//       layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
//       grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
//       rightPriceScale: { borderColor: "#334155" },
//       timeScale: { borderColor: "#334155", timeVisible: true },
//       crosshair: { mode: 1 },
//     };

//     /* ── main chart ── */
//     const mainH = showRSI ? 400 : 520;
//     const chart = createChart(mainContainerRef.current, {
//       ...BASE_OPTS,
//       width: mainContainerRef.current.clientWidth,
//       height: mainH,
//       rightPriceScale: {
//         ...BASE_OPTS.rightPriceScale,
//         scaleMargins: { top: 0.07, bottom: showVolume ? 0.26 : 0.07 },
//       },
//     });
//     mainChartRef.current = chart;

//     // candles
//     const candleSeries = chart.addSeries(CandlestickSeries, {
//       upColor: "#22c55e", downColor: "#ef4444",
//       wickUpColor: "#22c55e", wickDownColor: "#ef4444",
//       borderVisible: false,
//     });
//     candleSeries.setData(chartData);

//     // volume
//     if (showVolume) {
//       const volSeries = chart.addSeries(HistogramSeries, {
//         priceFormat: { type: "volume" },
//         priceScaleId: "vol",
//       });
//       const avgvol=chart.addSeries(LineSeries,{color:"yellow",lineWidth:2,priceFormat:{type:"volume"},priceScaleId:"vol",priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
//       avgvol.setData(calcAvgVol(chartData));
//       chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, borderVisible: false });
//       volSeries.setData(chartData.map((d) => ({
//         time: d.time, value: d.volume || 0,
//         color: d.close >= d.open ? "#26a69a" : "#ef5350",
//       })));
//     }

//     // MA20
//     if (showMA20) {
//       const s = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
//       s.setData(calcSMA(chartData, 20));
//     }

//     // MA50
//     if (showMA50) {
//       const s = chart.addSeries(LineSeries, { color: "#818cf8", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
//       s.setData(calcSMA(chartData, 50));
//     }

//     if(showBB){
//       const bbData = calcBB(chartData);
//       const middle = chart.addSeries(LineSeries, { color: "#800080", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
//       const upper = chart.addSeries(LineSeries, { color: "#345EF6", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
//       const lower = chart.addSeries(LineSeries, { color: "#2962FF", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
//       upper.setData(bbData.map(d => ({ time: d.time, value: d.upper })));
//       lower.setData(bbData.map(d => ({ time: d.time, value: d.lower })));
//       middle.setData(bbData.map(d => ({ time: d.time, value: d.middle })));
      // const bbArea = chart.addSeries(AreaSeries, {
      //   topColor: "rgba(52,94,246,0.25)",
      //   bottomColor: "rgba(52,94,246,0.05)",
      //   lineColor: "rgba(0,0,0,0)",
      //   lineWidth: 0,
      //   priceLineVisible: false,
      //   lastValueVisible: false
      // });
      // bbArea.setData(bbData.map(d => ({ time: d.time, value: d.upper, value2: d.lower })));

      // const bb2Area = chart.addSeries(AreaSeries, {
      //   // topColor: "transparent",
      //   // bottomColor: "transparent",
      //   lineColor: "rgba(0,0,0,0)",
      //   lineWidth: 0,
      //   priceLineVisible: false,
      //   lastValueVisible: false
      // });
      // bb2Area.setData(bbData.map(d => ({ time: d.time, value: d.lower, value2: d.lower })));
//     }
    
//     if (showSuperTrend) {
//         const st = calcSuperTrend(chartData);
      
//         const bullish = chart.addSeries(LineSeries, {
//           color: "#00C853",
//           lineWidth: 2,
//           priceLineVisible: false,
//           lastValueVisible: false
//         });
      
//         const bearish = chart.addSeries(LineSeries, {
//           color: "#D50000",
//           lineWidth: 2,
//           priceLineVisible: false,
//           lastValueVisible: false
//         });
      
//         const bullData = [];
//         const bearData = [];
      
//         st.forEach(d => {
      
//           if (d.trend === 1) {
//             bullData.push({
//               time: d.time,
//               value: d.value
//             });
//           }
      
//           if (d.trend === -1) {
//             bearData.push({
//               time: d.time,
//               value: d.value
//             });
//           }
      
//         });
      
//         bullish.setData(bullData);
//         bearish.setData(bearData);
//     }

//     // restore or fit
//     if (!isNewStockRef.current && visibleRangeRef.current) {
//       try { chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch (_) { chart.timeScale().fitContent(); }
//     } else {
//       chart.timeScale().fitContent();
//     }

//     // keep range updated as user scrolls/zooms
//     chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
//       if (r) visibleRangeRef.current = r;
//     });

//     // crosshair → tooltip
//     chart.subscribeCrosshairMove((param) => {
//       if (!param || !param.time) { setOhlc(null); return; }
//       const bar = param.seriesData.get(candleSeries);
//       if (bar) {
//         const idx = chartData.findIndex((d) => d.time === param.time);
//         setPrevClose(idx > 0 ? chartData[idx - 1].close : null);
//         setOhlc({ ...bar, time: param.time, volume: chartData[idx]?.volume ?? 0 });
//       }
//     });

//     /* ── RSI sub-chart ── */
//     if (showRSI && rsiContainerRef.current) {
//       const rsiChart = createChart(rsiContainerRef.current, {
//         ...BASE_OPTS,
//         width: rsiContainerRef.current.clientWidth,
//         height: 120,
//         rightPriceScale: { ...BASE_OPTS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
//       });
//       rsiChartRef.current = rsiChart;

//       const rsiLine = rsiChart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
//       rsiLine.setData(calcRSI(chartData));

//       const ob = rsiChart.addSeries(LineSeries, { color: "#ef444450", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
//       const os = rsiChart.addSeries(LineSeries, { color: "#22c55e50", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
//       const times = chartData.map((d) => d.time);
//       ob.setData(times.map((t) => ({ time: t, value: 70 })));
//       os.setData(times.map((t) => ({ time: t, value: 30 })));

//       if (!isNewStockRef.current && visibleRangeRef.current) {
//         try { rsiChart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch (_) { rsiChart.timeScale().fitContent(); }
//       } else {
//         rsiChart.timeScale().fitContent();
//       }

//       // sync scroll
//       let syncing = false;
//       chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
//         if (syncing || !r) return; syncing = true;
//         rsiChart.timeScale().setVisibleLogicalRange(r); syncing = false;
//       });
//       rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
//         if (syncing || !r) return; syncing = true;
//         chart.timeScale().setVisibleLogicalRange(r); syncing = false;
//       });
//     }
//   }, [showMA20, showMA50, showRSI, showVolume,showBB,showSuperTrend]);

//   const loadChartData = async () => {
//     try {
//       setLoading(true);
//       setOhlc(null);
//       destroyCharts();

//       const endDate = new Date().toISOString().split("T")[0];
//       const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
//       const res = await axios.get(
//         `${API}/stocks/${selectedStock.symbol}/data?start_date=${startDate}&end_date=${endDate}&timeframe=${timeframe}`
//       );

//       const chartData = res.data.data
//         .map((d) => ({
//           time: d.Date.split("T")[0],
//           open: Number(d.Open), high: Number(d.High),
//           low: Number(d.Low), close: Number(d.Close),
//           volume: Number(d.Volume || 0),
//         }))
//         .sort((a, b) => a.time.localeCompare(b.time));

//       rawDataRef.current = chartData;
//       setLoading(false);
//       renderCharts(chartData);
//       justLoadedRef.current = true; // skip indicator effect's next run
//       toast.success(`${selectedStock.symbol} loaded`);
//     } catch (e) {
//       setLoading(false);
//       toast.error("Failed loading chart data");
//       console.error(e);
//     }
//   };

//   // resize observer
//   useEffect(() => {
//     const obs = new ResizeObserver(() => {
//       if (mainChartRef.current && mainContainerRef.current)
//         mainChartRef.current.applyOptions({ width: mainContainerRef.current.clientWidth });
//       if (rsiChartRef.current && rsiContainerRef.current)
//         rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
//     });
//     if (mainContainerRef.current) obs.observe(mainContainerRef.current);
//     return () => obs.disconnect();
//   }, []);

//   useEffect(() => () => destroyCharts(), []);

//   const filteredStocks = [...new Map(stocks.map((s) => [s.symbol, s])).values()].filter(
//     (s) =>
//       s.symbol.toLowerCase().includes(search.toLowerCase()) ||
//       s.name.toLowerCase().includes(search.toLowerCase())
//   );

//   const cleanSymbol = selectedStock?.symbol?.replace(/\.NS$/, "");
//   const latest = rawDataRef.current[rawDataRef.current.length - 1];
//   const prevLast = rawDataRef.current[rawDataRef.current.length - 2];
//   const dayChange = latest && prevLast ? latest.close - prevLast.close : null;
//   const dayChangePct = dayChange && prevLast ? (dayChange / prevLast.close) * 100 : null;
//   const isPositive = dayChange >= 0;

//   return (
//     <div className="space-y-5">
//       {/* header */}
//       <div className="flex items-end justify-between">
//         <div>
//           <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-tight">Live Charts</h1>
//           <p className="text-muted-foreground text-sm mt-0.5">Candlestick · Volume · MA · RSI BollingerBands</p>
//         </div>
//         {latest && cleanSymbol && (
//           <div className="text-right hidden sm:block">
//             <div className="text-2xl font-bold font-mono">₹{fmt(latest.close)}</div>
//             <div className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
//               {isPositive ? "▲" : "▼"} {fmt(Math.abs(dayChange))} ({fmt(Math.abs(dayChangePct))}%)
//             </div>
//           </div>
//         )}
//       </div>

//       {/* search card – original light styling */}
//       <Card>
//         <CardHeader><CardTitle>Search Stock</CardTitle></CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex gap-4">
//             <div className="relative w-full">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Search stock (e.g. RELIANCE)"
//                 className="pl-10"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//               />
//             </div>
//             <Select value={timeframe} onValueChange={setTimeframe}>
//               <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="1d">Daily</SelectItem>
//                 <SelectItem value="1wk">Weekly</SelectItem>
//                 <SelectItem value="1mo">Monthly</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           {search && filteredStocks.length > 0 && (
//             <div className="border rounded-lg max-h-48 overflow-y-auto">
//               {filteredStocks.slice(0, 10).map((stock) => (
//                 <div
//                   key={stock.symbol}
//                   className="px-4 py-2 cursor-pointer hover:bg-muted flex items-center justify-between"
//                   onClick={() => {destroyCharts(); setSelectedStock(stock); setSearch("");
//                     rawDataRef.current = [];
//                     visibleRangeRef.current = null;
                    
//                    }}
//                 >
//                   <span className="font-semibold">{stock.symbol.replace(/\.NS$/, "")}</span>
//                   <span className="text-muted-foreground text-sm">{stock.name}</span>
//                 </div>
//               ))}
//             </div>
//           )}

//           {selectedStock && (
//             <div className="flex flex-wrap items-center gap-3">
//               <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 font-mono">
//                 <Activity className="w-3.5 h-3.5 text-blue-400" />
//                 <span className="text-sm font-semibold text-blue-300">{cleanSymbol}</span>
//                 <button
//                   className="text-slate-400 hover:text-red-500 transition-colors"
//                   onClick={() => {
//                     setSelectedStock(null);
//                     rawDataRef.current = [];
//                     visibleRangeRef.current = null;
//                     destroyCharts();
//                     setOhlc(null);
//                   }}
//                 >
//                   <X className="w-3 h-3" />
//                 </button>
//               </div>
//               <div className="flex items-center gap-2 flex-wrap">
//                 <span className="text-xs text-muted-foreground">Indicators:</span>
//                 <IndicatorPill label="MA 20"   active={showMA20}   color="#f59e0b" onClick={() => setShowMA20(v => !v)} />
//                 <IndicatorPill label="MA 50"   active={showMA50}   color="#818cf8" onClick={() => setShowMA50(v => !v)} />
//                 <IndicatorPill label="Volume"  active={showVolume} color="#F78265" onClick={() => setShowVolume(v => !v)} />
//                 <IndicatorPill label="RSI(14)" active={showRSI}   color="#a78bfa" onClick={() => setShowRSI(v => !v)} />
//                 <IndicatorPill label="Bollinger Bands" active={showBB} color="#f58f2c" onClick={() => {setShowBB(v => !v)}} />
//                 {/* <IndicatorPill label="SuperTrend" active={showSuperTrend} color="#f43f5e" onClick={() => {setShowSuperTrend(v => !v)}} /> */}


                






//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* chart card */}
//       <Card className="border-slate-800 overflow-hidden">
//         <CardHeader className="pb-2 border-b border-slate-800">
//           <CardTitle className="flex items-center gap-2 text-base">
//             <BarChart3 className="w-4 h-4 text-slate-400" />
//             {cleanSymbol
//               ? <span className="font-['Rajdhani'] text-lg">{cleanSymbol} — Price Chart</span>
//               : <span className="text-muted-foreground font-normal text-sm">Select a stock to begin</span>
//             }
//           </CardTitle>
//         </CardHeader>

//         <CardContent className="p-0">
//           {!selectedStock ? (
//             <div className="h-[520px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
//               <BarChart3 className="w-10 h-10 opacity-20" />
//               <p className="text-sm">Search and select a stock to view chart</p>
//             </div>
//           ) : loading ? (
//             <ChartSkeleton />
//           ) : (
//             <div className="p-2 space-y-0">
//               {/* main chart with floating tooltip */}
//               <div className="relative">
//                 <OHLCTooltip ohlc={ohlc} prevClose={prevClose} />
//                 <div ref={mainContainerRef} className="w-full" />
//               </div>

//               {/* RSI panel */}
//               {showRSI && (
//                 <div>
//                   <div className="flex items-center gap-2 px-3 py-1 border-t border-slate-800">
//                     <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">RSI (14)</span>
//                     <span className="text-[10px] text-slate-500">· Overbought: 70 · Oversold: 30</span>
//                   </div>
//                   <div ref={rsiContainerRef} className="w-full" />
//                 </div>
//               )}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* legend */}
//       {selectedStock  && !loading && (
//         <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
//           <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-emerald-500 rounded" />Bullish</span>
//           <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-red-500 rounded" />Bearish</span>
//           {showMA20   && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-amber-400 rounded" />MA 20</span>}
//           {showMA50   && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-indigo-400 rounded" />MA 50</span>}
//           {showRSI    && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-violet-400 rounded" />RSI (14)</span>}
//           {showBB     && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-yellow-400 rounded" />Bollinger Bands</span>}
//           {showSuperTrend && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-pink-400 rounded" />SuperTrend</span>}
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChartsPage;
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } from "lightweight-charts";
import { BarChart3, Search, TrendingUp, TrendingDown, Activity, X, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* ─── helpers ───────────────────────────────────────────────── */
const fmt = (n, d = 2) =>
  n == null || isNaN(n) ? "—" : Number(n).toFixed(d);

/* ─── indicator calculations ─────────────────────────────────── */

const calcSMA = (data, period) =>
  data.map((d, i) => {
    if (i < period - 1) return null;
    const avg = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0) / period;
    return { time: d.time, value: avg };
  }).filter(Boolean);

const calcEMA = (data, period) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = data.slice(0, period).reduce((s, x) => s + x.close, 0) / period;
  result.push({ time: data[period - 1].time, value: ema });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: ema });
  }
  return result;
};

const calcEMAValues = (closes, period) => {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(closes.length).fill(null);
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
};

const calcMACD = (data, fast = 12, slow = 26, signal = 9) => {
  if (data.length < slow + signal) return { macdLine: [], signalLine: [], histogram: [] };
  const closes = data.map(d => d.close);
  const emaFast = calcEMAValues(closes, fast);
  const emaSlow = calcEMAValues(closes, slow);

  const macdValues = [];
  const macdTimes = [];
  for (let i = slow - 1; i < data.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdValues.push(emaFast[i] - emaSlow[i]);
      macdTimes.push(data[i].time);
    }
  }

  const k = 2 / (signal + 1);
  const signalValues = [];
  let sig = macdValues.slice(0, signal).reduce((s, v) => s + v, 0) / signal;
  signalValues.push(sig);
  for (let i = signal; i < macdValues.length; i++) {
    sig = macdValues[i] * k + sig * (1 - k);
    signalValues.push(sig);
  }

  const offset = signal - 1;
  const macdLine = macdValues.slice(offset).map((v, i) => ({ time: macdTimes[i + offset], value: v }));
  const signalLine = signalValues.map((v, i) => ({ time: macdTimes[i + offset], value: v }));
  const histogram = macdLine.map((d, i) => ({
    time: d.time,
    value: d.value - signalLine[i].value,
    color: d.value - signalLine[i].value >= 0 ? "#22c55e88" : "#ef444488",
  }));
  return { macdLine, signalLine, histogram };
};

const calcATR = (data, period) => {
  const tr = data.map((d, i) => {
    if (i === 0) return d.high - d.low;
    return Math.max(d.high - d.low, Math.abs(d.high - data[i-1].close), Math.abs(d.low - data[i-1].close));
  });
  const result = [];
  let atr = tr.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result.push({ time: data[period - 1].time, value: atr });
  for (let i = period; i < data.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result.push({ time: data[i].time, value: atr });
  }
  return result;
};

const calcADX = (data, period = 14) => {
  if (data.length < period * 2) return { adx: [], plusDI: [], minusDI: [] };
  const tr = [], plusDM = [], minusDM = [];

  for (let i = 1; i < data.length; i++) {
    const h = data[i].high - data[i - 1].high;
    const l = data[i - 1].low - data[i].low;
    plusDM.push(h > l && h > 0 ? h : 0);
    minusDM.push(l > h && l > 0 ? l : 0);
    tr.push(Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    ));
  }

  const smooth = (arr, p) => {
    const res = [arr.slice(0, p).reduce((s, v) => s + v, 0)];
    for (let i = p; i < arr.length; i++) res.push(res[res.length - 1] - res[res.length - 1] / p + arr[i]);
    return res;
  };

  const sTR = smooth(tr, period);
  const sPDM = smooth(plusDM, period);
  const sMDM = smooth(minusDM, period);

  const adxArr = [], pdArr = [], mdArr = [];
  const dx = [];
  for (let i = 0; i < sTR.length; i++) {
    const pdi = sTR[i] ? (sPDM[i] / sTR[i]) * 100 : 0;
    const mdi = sTR[i] ? (sMDM[i] / sTR[i]) * 100 : 0;
    pdArr.push(pdi);
    mdArr.push(mdi);
    dx.push(pdi + mdi ? Math.abs(pdi - mdi) / (pdi + mdi) * 100 : 0);
  }

  let adxVal = dx.slice(0, period).reduce((s, v) => s + v, 0) / period;
  adxArr.push(adxVal);
  for (let i = period; i < dx.length; i++) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period;
    adxArr.push(adxVal);
  }

  const startIdx = period * 2 - 1;
  return {
    adx: adxArr.map((v, i) => ({ time: data[startIdx + i].time, value: v })),
    plusDI: pdArr.slice(period - 1).map((v, i) => ({ time: data[startIdx + i].time, value: v })),
    minusDI: mdArr.slice(period - 1).map((v, i) => ({ time: data[startIdx + i].time, value: v })),
  };
};

const calcBB = (data, period = 20, multiplier = 2) => {
  if (!data || data.length < period) return [];
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, x) => s + x.close, 0) / period;
    const variance = slice.reduce((s, x) => s + (x.close - mean) ** 2, 0) / (period - 1);
    const stdDev = Math.sqrt(variance);
    result.push({ time: data[i].time, middle: mean, upper: mean + multiplier * stdDev, lower: mean - multiplier * stdDev });
  }
  return result;
};

const calcRSI = (data, period = 14) => {
  if (data.length < period + 1) return [];
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  result.push({ time: data[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push({ time: data[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return result;
};

const calcAvgVol = (data, period = 20) => {
  if (data.length < period) return [];
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const avgVol = data.slice(i - period + 1, i + 1).reduce((s, x) => s + x.volume, 0) / period;
    result.push({ time: data[i].time, value: avgVol });
  }
  return result;
};

const calcSuperTrend = (data, period = 10, multiplier = 3) => {
  if (!data || data.length < period) return [];
  const tr = data.map((d, i) => i === 0 ? d.high - d.low : Math.max(d.high - d.low, Math.abs(d.high - data[i-1].close), Math.abs(d.low - data[i-1].close)));
  const atr = tr.map((_, i) => {
    if (i < period) return null;
    return tr.slice(i - period, i).reduce((s, v) => s + v, 0) / period;
  });
  const result = [];
  let prevFU = 0, prevFL = 0, prevTrend = 1;
  for (let i = 0; i < data.length; i++) {
    if (!atr[i]) continue;
    const hl2 = (data[i].high + data[i].low) / 2;
    const bU = hl2 + multiplier * atr[i];
    const bL = hl2 - multiplier * atr[i];
    const fU = (bU < prevFU || data[i-1]?.close > prevFU) ? bU : prevFU;
    const fL = (bL > prevFL || data[i-1]?.close < prevFL) ? bL : prevFL;
    let trend = prevTrend;
    if (prevTrend === -1 && data[i].close > fU) trend = 1;
    else if (prevTrend === 1 && data[i].close < fL) trend = -1;
    result.push({ time: data[i].time, value: trend === 1 ? fL : fU, trend });
    prevFU = fU; prevFL = fL; prevTrend = trend;
  }
  return result;
};

/* ─── EMA Crossover signals ──────────────────────────────────── */
const calcEMACrossover = (data, fastPeriod, slowPeriod) => {
  const fast = calcEMAValues(data.map(d => d.close), fastPeriod);
  const slow = calcEMAValues(data.map(d => d.close), slowPeriod);
  const signals = [];
  for (let i = 1; i < data.length; i++) {
    if (fast[i] == null || slow[i] == null || fast[i-1] == null || slow[i-1] == null) continue;
    if (fast[i-1] <= slow[i-1] && fast[i] > slow[i]) signals.push({ time: data[i].time, type: "bull", price: data[i].low * 0.998 });
    if (fast[i-1] >= slow[i-1] && fast[i] < slow[i]) signals.push({ time: data[i].time, type: "bear", price: data[i].high * 1.002 });
  }
  return signals;
};

/* ─── default indicator settings ─────────────────────────────── */
const DEFAULT_SETTINGS = {
  ma20: { period: 20, color: "#f59e0b" },
  ma50: { period: 50, color: "#818cf8" },
  ema: { fastPeriod: 9, slowPeriod: 21, color: "#06b6d4" },
  emaCross: { fastPeriod: 9, slowPeriod: 21 },
  bb: { period: 20, multiplier: 2, color: "#f58f2c" },
  rsi: { period: 14, obLevel: 70, osLevel: 30 },
  macd: { fast: 12, slow: 26, signal: 9 },
  adx: { period: 14 },
  supertrend: { period: 10, multiplier: 3 },
  volume: { avgPeriod: 20 },
};

/* ─── skeleton loader ───────────────────────────────────────── */
const ChartSkeleton = () => {
  const bars = useRef(
    Array.from({ length: 60 }, () => ({ h: 30 + Math.random() * 60, up: Math.random() > 0.45 }))
  ).current;
  return (
    <div className="w-full h-[500px] flex flex-col gap-2 p-3">
      <div className="flex items-end gap-[3px] flex-1">
        {bars.map((b, i) => (
          <div key={i} className="flex flex-col items-center flex-1" style={{ gap: 1 }}>
            <div className={`w-px animate-pulse ${b.up ? "bg-emerald-700/30" : "bg-red-700/30"}`} style={{ height: b.h * 0.25 + "%" }} />
            <div className={`w-full rounded-[1px] animate-pulse ${b.up ? "bg-emerald-800/40" : "bg-red-800/40"}`} style={{ height: b.h + "%" }} />
            <div className={`w-px animate-pulse ${b.up ? "bg-emerald-700/30" : "bg-red-700/30"}`} style={{ height: b.h * 0.15 + "%" }} />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-[3px] h-14 opacity-30">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 bg-slate-600/50 rounded-[1px] animate-pulse" style={{ height: 15 + Math.random() * 85 + "%" }} />
        ))}
      </div>
    </div>
  );
};

/* ─── floating OHLC tooltip ─────────────────────────────────── */
const OHLCTooltip = ({ ohlc, prevClose }) => {
  if (!ohlc) return null;
  const change = prevClose ? ohlc.close - prevClose : ohlc.close - ohlc.open;
  const changePct = prevClose
    ? ((ohlc.close - prevClose) / prevClose) * 100
    : ((ohlc.close - ohlc.open) / ohlc.open) * 100;
  const isUp = change >= 0;
  return (
    <div className="absolute top-2 left-2 z-50 pointer-events-none">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-1.5 shadow-xl text-[11px] font-mono">
        {ohlc.time && <span className="text-slate-500 text-[10px]">{ohlc.time}</span>}
        <span><span className="text-slate-500">O </span><span className="text-slate-200 font-semibold">{fmt(ohlc.open)}</span></span>
        <span><span className="text-emerald-400">H </span><span className="text-slate-200 font-semibold">{fmt(ohlc.high)}</span></span>
        <span><span className="text-red-400">L </span><span className="text-slate-200 font-semibold">{fmt(ohlc.low)}</span></span>
        <span><span className="text-slate-500">C </span><span className="text-slate-200 font-semibold">{fmt(ohlc.close)}</span></span>
        <span className={`flex items-center gap-0.5 font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isUp ? "+" : ""}{fmt(change)} ({isUp ? "+" : ""}{fmt(changePct)}%)
        </span>
        {ohlc.volume > 0 && (
          <span className="text-slate-500">Vol <span className="text-slate-400">{(ohlc.volume / 1e6).toFixed(2)}M</span></span>
        )}
      </div>
    </div>
  );
};

/* ─── indicator pill ────────────────────────────────────────── */
const IndicatorPill = ({ label, active, color, onClick, onSettings, showSettings }) => (
  <div className="flex items-center">
    <button
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-l-full text-xs font-semibold border-y border-l transition-all duration-150 ${
        active ? "" : "border-slate-600 text-slate-400 hover:border-slate-400"
      } ${onSettings ? "" : "rounded-r-full border-r"}`}
      style={active ? { backgroundColor: color + "22", borderColor: color, color } : {}}
    >
      {label}
    </button>
    {onSettings && (
      <button
        onClick={onSettings}
        className={`px-1.5 py-0.5 rounded-r-full text-xs border-y border-r transition-all duration-150 ${
          active ? "" : "border-slate-600 text-slate-400 hover:border-slate-400"
        } ${showSettings ? "bg-slate-700" : ""}`}
        style={active ? { backgroundColor: color + "22", borderColor: color, color } : {}}
      >
        <Settings2 className="w-2.5 h-2.5" />
      </button>
    )}
  </div>
);

/* ─── settings panel ────────────────────────────────────────── */
const SettingsPanel = ({ label, color, fields, values, onChange, onClose }) => (
  <div className="absolute z-50 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 min-w-[200px]" style={{ borderColor: color + "55" }}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold" style={{ color }}>{label} Settings</span>
      <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
    </div>
    <div className="space-y-2">
      {fields.map(f => (
        <div key={f.key} className="flex items-center justify-between gap-3">
          <label className="text-xs text-slate-400 whitespace-nowrap">{f.label}</label>
          {f.type === "color" ? (
            <input type="color" value={values[f.key]} onChange={e => onChange(f.key, e.target.value)}
              className="w-8 h-6 rounded cursor-pointer bg-transparent border border-slate-600" />
          ) : (
            <input
              type="number" min={f.min} max={f.max} step={f.step || 1}
              value={values[f.key]}
              onChange={e => onChange(f.key, f.type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value))}
              className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white text-right focus:outline-none focus:border-slate-500"
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

/* ─── indicator config ──────────────────────────────────────── */
const INDICATOR_DEFS = [
  {
    key: "volume", label: "Volume", color: "#F78265",
    fields: [{ key: "avgPeriod", label: "Avg Period", min: 1, max: 200 }],
  },
  {
    key: "ma20", label: "MA 20", color: "#f59e0b",
    fields: [
      { key: "period", label: "Period", min: 1, max: 500 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  {
    key: "ma50", label: "MA 50", color: "#818cf8",
    fields: [
      { key: "period", label: "Period", min: 1, max: 500 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  {
    key: "ema", label: "EMA", color: "#06b6d4",
    fields: [
      { key: "fastPeriod", label: "Fast Period", min: 1, max: 200 },
      { key: "slowPeriod", label: "Slow Period", min: 1, max: 500 },
      { key: "color", label: "Color", type: "color" },
    ],
  },
  // {
  //   key: "emaCross", label: "EMA Cross", color: "#f43f5e",
  //   fields: [
  //     { key: "fastPeriod", label: "Fast EMA", min: 1, max: 200 },
  //     { key: "slowPeriod", label: "Slow EMA", min: 1, max: 500 },
  //   ],
  // },
  {
    key: "bb", label: "Bollinger", color: "#f58f2c",
    fields: [
      { key: "period", label: "Period", min: 2, max: 500 },
      { key: "multiplier", label: "StdDev ×", min: 0.1, max: 5, step: 0.1, type: "float" },
    ],
  },
  {
    key: "rsi", label: "RSI", color: "#a78bfa",
    fields: [
      { key: "period", label: "Period", min: 2, max: 100 },
      { key: "obLevel", label: "Overbought", min: 50, max: 99 },
      { key: "osLevel", label: "Oversold", min: 1, max: 49 },
    ],
  },
  {
    key: "macd", label: "MACD", color: "#34d399",
    fields: [
      { key: "fast", label: "Fast EMA", min: 1, max: 100 },
      { key: "slow", label: "Slow EMA", min: 1, max: 200 },
      { key: "signal", label: "Signal", min: 1, max: 100 },
    ],
  },
  {
    key: "adx", label: "ADX", color: "#fb923c",
    fields: [{ key: "period", label: "Period", min: 2, max: 100 }],
  },
  // {
  //   key: "supertrend", label: "SuperTrend", color: "#ec4899",
  //   fields: [
  //     { key: "period", label: "ATR Period", min: 1, max: 100 },
  //     { key: "multiplier", label: "Multiplier", min: 0.1, max: 10, step: 0.1, type: "float" },
  //   ],
  // },
];

/* ─── sub-chart panel label ─────────────────────────────────── */
const SubChartLabel = ({ label, color, extra }) => (
  <div className="flex items-center gap-2 px-3 py-1 border-t border-slate-800">
    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
    {extra && <span className="text-[10px] text-slate-500">{extra}</span>}
  </div>
);

/* ─── main component ─────────────────────────────────────────── */
const ChartsPage = () => {
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const { symbol } = useParams();
  const [selectedStock, setSelectedStock] = useState(null);
  const [timeframe, setTimeframe] = useState("1d");
  const [loading, setLoading] = useState(false);

  const [ohlc, setOhlc] = useState(null);
  const [prevClose, setPrevClose] = useState(null);

  const rawDataRef = useRef([]);

  // indicator active states
  const [active, setActive] = useState({ volume: true, ma20: false, ma50: false, ema: false, emaCross: false, bb: false, rsi: false, macd: false, adx: false, supertrend: false });
  // indicator settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // which settings panel is open
  const [openSettings, setOpenSettings] = useState(null);

  const mainContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const macdContainerRef = useRef(null);
  const adxContainerRef = useRef(null);

  const mainChartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const adxChartRef = useRef(null);

  const visibleRangeRef = useRef(null);
  const isNewStockRef = useRef(false);

  const toggleIndicator = (key) => setActive(a => ({ ...a, [key]: !a[key] }));
  const updateSetting = (indicatorKey, fieldKey, value) => {
    setSettings(s => ({ ...s, [indicatorKey]: { ...s[indicatorKey], [fieldKey]: value } }));
  };

  useEffect(() => { fetchStocks(); }, []);

  useEffect(() => {
    if (symbol && symbol !== "loading")
      setSelectedStock({ symbol: symbol + ".NS", name: symbol + ".NS" });
  }, [symbol]);

  useEffect(() => {
    if (selectedStock) {
      isNewStockRef.current = true;
      visibleRangeRef.current = null;
      loadChartData();
    }
  }, [selectedStock, timeframe]);

  useEffect(() => {
    if (!loading && selectedStock && rawDataRef.current.length) {
      isNewStockRef.current = false;
      renderCharts(rawDataRef.current);
    }
  }, [active, settings, selectedStock, loading]);

  const fetchStocks = async () => {
    try {
      const res = await axios.get(`${API}/stocks/all`);
      setStocks(res.data);
    } catch (e) { console.error(e); }
  };

  const destroyCharts = () => {
    [mainChartRef, rsiChartRef, macdChartRef, adxChartRef].forEach(r => {
      if (r.current) { try { r.current.remove(); } catch(_) {} r.current = null; }
    });
  };

  const syncCharts = (charts) => {
    let syncing = false;
    charts.forEach(src => {
      src.timeScale().subscribeVisibleLogicalRangeChange(r => {
        if (syncing || !r) return; syncing = true;
        charts.forEach(dst => { if (dst !== src) try { dst.timeScale().setVisibleLogicalRange(r); } catch(_) {} });
        syncing = false;
      });
    });
  };

  const renderCharts = useCallback((chartData) => {
    if (!isNewStockRef.current && mainChartRef.current) {
      try { visibleRangeRef.current = mainChartRef.current.timeScale().getVisibleLogicalRange(); } catch (_) {}
    }
    destroyCharts();
    if (!mainContainerRef.current || !chartData.length) return;

    const s = settings;
    const a = active;

    const subCharts = [active.rsi, active.macd, active.adx].filter(Boolean).length;
    const mainH = 480 - subCharts * 30;

    const BASE_OPTS = {
      layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
      // grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      gris:{ vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: { borderColor: "#334155", timeVisible: true },
      crosshair: { mode: 1 },
    };

    /* ── main chart ── */
    const chart = createChart(mainContainerRef.current, {
      ...BASE_OPTS,
      width: mainContainerRef.current.clientWidth,
      height: mainH,
      rightPriceScale: { ...BASE_OPTS.rightPriceScale, scaleMargins: { top: 0.07, bottom: a.volume ? 0.26 : 0.07 } },
    });
    mainChartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      borderVisible: false,
    });
    candleSeries.setData(chartData);

    // volume
    if (a.volume) {
      const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, borderVisible: false });
      volSeries.setData(chartData.map(d => ({ time: d.time, value: d.volume || 0, color: d.close >= d.open ? "#26a69a" : "#ef5350" })));
      const avgVol = chart.addSeries(LineSeries, { color: "yellow", lineWidth: 2, priceFormat: { type: "volume" }, priceScaleId: "vol", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      avgVol.setData(calcAvgVol(chartData, s.volume.avgPeriod));
    }

    // MA20
    if (a.ma20) {
      const ma = chart.addSeries(LineSeries, { color: s.ma20.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      ma.setData(calcSMA(chartData, s.ma20.period));
    }
    // MA50
    if (a.ma50) {
      const ma = chart.addSeries(LineSeries, { color: s.ma50.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      ma.setData(calcSMA(chartData, s.ma50.period));
    }
    // EMA
    if (a.ema) {
      const emaFast = chart.addSeries(LineSeries, { color: s.ema.color, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      emaFast.setData(calcEMA(chartData, s.ema.fastPeriod));
      const emaSlow = chart.addSeries(LineSeries, { color: s.ema.color + "88", lineWidth: 1.5, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      emaSlow.setData(calcEMA(chartData, s.ema.slowPeriod));
    }
    // EMA Crossover markers
    if (a.emaCross) {
      const crosses = calcEMACrossover(chartData, s.emaCross.fastPeriod, s.emaCross.slowPeriod);
      const bullMarkers = [], bearMarkers = [];
      crosses.forEach(c => {
        if (c.type === "bull") bullMarkers.push({ time: c.time, position: "belowBar", color: "#22c55e", shape: "arrowUp", text: "▲" });
        else bearMarkers.push({ time: c.time, position: "aboveBar", color: "#ef4444", shape: "arrowDown", text: "▼" });
      });
      candleSeries.setMarkers([...bullMarkers, ...bearMarkers].sort((a, b) => a.time.localeCompare(b.time)));
    }
    // Bollinger Bands
    if (a.bb) {
      const bbData = calcBB(chartData, s.bb.period, s.bb.multiplier);
      const upper = chart.addSeries(LineSeries, { color: "#345EF6", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
      const lower = chart.addSeries(LineSeries, { color: "#2962FF", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false });
      const middle = chart.addSeries(LineSeries, { color: "#800080", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
      upper.setData(bbData.map(d => ({ time: d.time, value: d.upper })));
      lower.setData(bbData.map(d => ({ time: d.time, value: d.lower })));
      middle.setData(bbData.map(d => ({ time: d.time, value: d.middle })));
      const bbArea = chart.addSeries(AreaSeries, {
        topColor: "rgba(52,94,246,0.25)",
        bottomColor: "rgba(52,94,246,0.05)",
        lineColor: "rgba(0,0,0,0)",
        lineWidth: 0,
        priceLineVisible: false,
        lastValueVisible: false
      });
      bbArea.setData(bbData.map(d => ({ time: d.time, value: d.upper, value2: d.lower })));

      const bb2Area = chart.addSeries(AreaSeries, {
        // topColor: "transparent",
        // bottomColor: "transparent",
        lineColor: "rgba(0,0,0,0)",
        lineWidth: 0,
        priceLineVisible: false,
        lastValueVisible: false
      });
      bb2Area.setData(bbData.map(d => ({ time: d.time, value: d.lower, value2: d.lower })));
    }
    // SuperTrend
    if (a.supertrend) {
      const st = calcSuperTrend(chartData, s.supertrend.period, s.supertrend.multiplier);
      const bull = chart.addSeries(LineSeries, { color: "#00C853", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      const bear = chart.addSeries(LineSeries, { color: "#D50000", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      bull.setData(st.filter(d => d.trend === 1).map(d => ({ time: d.time, value: d.value })));
      bear.setData(st.filter(d => d.trend !== 1).map(d => ({ time: d.time, value: d.value })));
    }

    /* ── RSI sub-chart ── */
    let rsiChart = null;
    if (a.rsi && rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, { ...BASE_OPTS, width: rsiContainerRef.current.clientWidth, height: 110, rightPriceScale: { ...BASE_OPTS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } } });
      rsiChartRef.current = rsiChart;
      const rsiLine = rsiChart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
      rsiLine.setData(calcRSI(chartData, s.rsi.period));
      const times = chartData.map(d => d.time);
      rsiChart.addSeries(LineSeries, { color: "#ef444450", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false }).setData(times.map(t => ({ time: t, value: s.rsi.obLevel })));
      rsiChart.addSeries(LineSeries, { color: "#22c55e50", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false }).setData(times.map(t => ({ time: t, value: s.rsi.osLevel })));
      if (!isNewStockRef.current && visibleRangeRef.current) { try { rsiChart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch(_) { rsiChart.timeScale().fitContent(); } }
      else rsiChart.timeScale().fitContent();
    }

    /* ── MACD sub-chart ── */
    let macdChart = null;
    if (a.macd && macdContainerRef.current) {
      macdChart = createChart(macdContainerRef.current, { ...BASE_OPTS, width: macdContainerRef.current.clientWidth, height: 120, rightPriceScale: { ...BASE_OPTS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } } });
      macdChartRef.current = macdChart;
      const { macdLine, signalLine, histogram } = calcMACD(chartData, s.macd.fast, s.macd.slow, s.macd.signal);
      macdChart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }).setData(histogram);
      macdChart.addSeries(LineSeries, { color: "#34d399", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true }).setData(macdLine);
      macdChart.addSeries(LineSeries, { color: "#f87171", lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true }).setData(signalLine);
      if (!isNewStockRef.current && visibleRangeRef.current) { try { macdChart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch(_) { macdChart.timeScale().fitContent(); } }
      else macdChart.timeScale().fitContent();
    }

    /* ── ADX sub-chart ── */
    let adxChart = null;
    if (a.adx && adxContainerRef.current) {
      adxChart = createChart(adxContainerRef.current, { ...BASE_OPTS, width: adxContainerRef.current.clientWidth, height: 110, rightPriceScale: { ...BASE_OPTS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } } });
      adxChartRef.current = adxChart;
      const { adx, plusDI, minusDI } = calcADX(chartData, s.adx.period);
      adxChart.addSeries(LineSeries, { color: "#fb923c", lineWidth: 2, priceLineVisible: false, lastValueVisible: true }).setData(adx);
      adxChart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: true }).setData(plusDI);
      adxChart.addSeries(LineSeries, { color: "#ef4444", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: true }).setData(minusDI);
      const times = chartData.map(d => d.time);
      adxChart.addSeries(LineSeries, { color: "#64748b", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false }).setData(times.map(t => ({ time: t, value: 25 })));
      if (!isNewStockRef.current && visibleRangeRef.current) { try { adxChart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch(_) { adxChart.timeScale().fitContent(); } }
      else adxChart.timeScale().fitContent();
    }

    // restore/fit main
    if (!isNewStockRef.current && visibleRangeRef.current) {
      try { chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current); } catch(_) { chart.timeScale().fitContent(); }
    } else chart.timeScale().fitContent();

    chart.timeScale().subscribeVisibleLogicalRangeChange(r => { if (r) visibleRangeRef.current = r; });

    // sync all sub-charts
    const allCharts = [chart, rsiChart, macdChart, adxChart].filter(Boolean);
    syncCharts(allCharts);

    // crosshair tooltip
    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time) { setOhlc(null); return; }
      const bar = param.seriesData.get(candleSeries);
      if (bar) {
        const idx = chartData.findIndex(d => d.time === param.time);
        setPrevClose(idx > 0 ? chartData[idx - 1].close : null);
        setOhlc({ ...bar, time: param.time, volume: chartData[idx]?.volume ?? 0 });
      }
    });
  }, [active, settings]);

  const loadChartData = async () => {
    try {
      setLoading(true); setOhlc(null); destroyCharts();
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      console.log(`Fetching data for ${selectedStock.symbol} from ${startDate} to ${endDate} with timeframe ${timeframe}`);
      const res = await axios.get(`${API}/stocks/${selectedStock.symbol}/data?start_date=${startDate}&end_date=${endDate}&timeframe=${timeframe}`);
      const chartData = res.data.data
        .map(d => ({ time: d.Date.split("T")[0], open: Number(d.Open), high: Number(d.High), low: Number(d.Low), close: Number(d.Close), volume: Number(d.Volume || 0) }))
        .sort((a, b) => a.time.localeCompare(b.time));
      rawDataRef.current = chartData;
      setLoading(false);
      renderCharts(chartData);
      toast.success(`${selectedStock.symbol} loaded`);
    } catch (e) {
      setLoading(false);
      toast.error("Failed loading chart data");
    }
  };

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (mainChartRef.current && mainContainerRef.current) mainChartRef.current.applyOptions({ width: mainContainerRef.current.clientWidth });
      if (rsiChartRef.current && rsiContainerRef.current) rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      if (macdChartRef.current && macdContainerRef.current) macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
      if (adxChartRef.current && adxContainerRef.current) adxChartRef.current.applyOptions({ width: adxContainerRef.current.clientWidth });
    });
    if (mainContainerRef.current) obs.observe(mainContainerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => () => destroyCharts(), []);

  // close settings panel on outside click
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest("[data-settings-panel]")) setOpenSettings(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredStocks = [...new Map(stocks.map(s => [s.symbol, s])).values()].filter(
    s => s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const cleanSymbol = selectedStock?.symbol?.replace(/\.NS$/, "");
  const latest = rawDataRef.current[rawDataRef.current.length - 1];
  const prevLast = rawDataRef.current[rawDataRef.current.length - 2];
  const dayChange = latest && prevLast ? latest.close - prevLast.close : null;
  const dayChangePct = dayChange && prevLast ? (dayChange / prevLast.close) * 100 : null;
  const isPositive = dayChange >= 0;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-tight">Live Charts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Candlestick · MA · EMA · RSI · MACD · ADX · Bollinger · SuperTrend</p>
        </div>
        {latest && cleanSymbol && (
          <div className="text-right hidden sm:block">
            <div className="text-2xl font-bold font-mono">₹{fmt(latest.close)}</div>
            <div className={`text-sm font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? "▲" : "▼"} {fmt(Math.abs(dayChange))} ({fmt(Math.abs(dayChangePct))}%)
            </div>
          </div>
        )}
      </div>

      {/* search card */}
      <Card>
        <CardHeader><CardTitle>Search Stock</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search stock (e.g. RELIANCE)" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Daily</SelectItem>
                <SelectItem value="1wk">Weekly</SelectItem>
                <SelectItem value="1mo">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {search && filteredStocks.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {filteredStocks.slice(0, 10).map(stock => (
                <div key={stock.symbol} className="px-4 py-2 cursor-pointer hover:bg-muted flex items-center justify-between"
                  onClick={() => { destroyCharts(); setSelectedStock(stock); setSearch(""); rawDataRef.current = []; visibleRangeRef.current = null; }}>
                  <span className="font-semibold">{stock.symbol.replace(/\.NS$/, "")}</span>
                  <span className="text-muted-foreground text-sm">{stock.name}</span>
                </div>
              ))}
            </div>
          )}

          {selectedStock && (
            <div className="flex flex-col gap-3">
              {/* stock chip */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 font-mono w-fit">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">{cleanSymbol}</span>
                <button className="text-slate-400 hover:text-red-500 transition-colors"
                  onClick={() => { setSelectedStock(null); rawDataRef.current = []; visibleRangeRef.current = null; destroyCharts(); setOhlc(null); }}>
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* indicator pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Indicators:</span>
                {INDICATOR_DEFS.map(def => (
                  <div key={def.key} className="relative" data-settings-panel>
                    <IndicatorPill
                      label={def.label}
                      active={active[def.key]}
                      color={def.color}
                      onClick={() => toggleIndicator(def.key)}
                      onSettings={() => setOpenSettings(openSettings === def.key ? null : def.key)}
                      showSettings={openSettings === def.key}
                    />
                    {openSettings === def.key && (
                      <SettingsPanel
                        label={def.label}
                        color={def.color}
                        fields={def.fields}
                        values={settings[def.key]}
                        onChange={(fKey, val) => updateSetting(def.key, fKey, val)}
                        onClose={() => setOpenSettings(null)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* EMA crossover fast/slow display when active */}
              {active.emaCross && (
                <div className="text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 w-fit font-mono">
                  EMA Cross: <span className="text-emerald-400">▲ Fast({settings.emaCross.fastPeriod}) crosses above Slow({settings.emaCross.slowPeriod})</span>
                  {" · "}
                  <span className="text-red-400">▼ Fast crosses below Slow</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* chart card */}
      <Card className="border-slate-800 overflow-hidden">
        <CardHeader className="pb-2 border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            {cleanSymbol
              ? <span className="font-['Rajdhani'] text-lg">{cleanSymbol} — Price Chart</span>
              : <span className="text-muted-foreground font-normal text-sm">Select a stock to begin</span>
            }
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {!selectedStock ? (
            <div className="h-[520px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <BarChart3 className="w-10 h-10 opacity-20" />
              <p className="text-sm">Search and select a stock to view chart</p>
            </div>
          ) : loading ? (
            <ChartSkeleton />
          ) : (
            <div className="p-2 space-y-0">
              <div className="relative">
                <OHLCTooltip ohlc={ohlc} prevClose={prevClose} />
                <div ref={mainContainerRef} className="w-full" />
              </div>

              {active.rsi && (
                <div>
                  <SubChartLabel label="RSI" color="#a78bfa" extra={`(${settings.rsi.period}) · OB: ${settings.rsi.obLevel} · OS: ${settings.rsi.osLevel}`} />
                  <div ref={rsiContainerRef} className="w-full" />
                </div>
              )}

              {active.macd && (
                <div>
                  <SubChartLabel label="MACD" color="#34d399"
                    extra={`(${settings.macd.fast}, ${settings.macd.slow}, ${settings.macd.signal}) · `}
                  />
                  <div className="flex items-center gap-3 px-3 pb-0.5">
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 inline-block bg-emerald-400 rounded" />MACD</span>
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 inline-block bg-red-400 rounded" />Signal</span>
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-3 inline-block bg-emerald-600/50 rounded-sm" />Histogram</span>
                  </div>
                  <div ref={macdContainerRef} className="w-full" />
                </div>
              )}

              {active.adx && (
                <div>
                  <SubChartLabel label="ADX" color="#fb923c" extra={`(${settings.adx.period}) · Trend strength > 25`} />
                  <div className="flex items-center gap-3 px-3 pb-0.5">
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 inline-block bg-orange-400 rounded" />ADX</span>
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 inline-block bg-emerald-400 rounded" />+DI</span>
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-3 h-0.5 inline-block bg-red-400 rounded" />−DI</span>
                  </div>
                  <div ref={adxContainerRef} className="w-full" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* legend */}
      {selectedStock && !loading && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-emerald-500 rounded" />Bullish</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-red-500 rounded" />Bearish</span>
          {active.ma20 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: settings.ma20.color }} />MA {settings.ma20.period}</span>}
          {active.ma50 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: settings.ma50.color }} />MA {settings.ma50.period}</span>}
          {active.ema && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: settings.ema.color }} />EMA {settings.ema.fastPeriod}/{settings.ema.slowPeriod}</span>}
          {active.emaCross && <span className="flex items-center gap-1.5"><span className="w-3 h-3 inline-flex items-center justify-center text-emerald-400">▲▼</span>EMA Cross {settings.emaCross.fastPeriod}/{settings.emaCross.slowPeriod}</span>}
          {active.bb && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-orange-400 rounded" />BB ({settings.bb.period}, {settings.bb.multiplier})</span>}
          {active.rsi && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-violet-400 rounded" />RSI ({settings.rsi.period})</span>}
          {active.macd && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-emerald-400 rounded" />MACD ({settings.macd.fast},{settings.macd.slow},{settings.macd.signal})</span>}
          {active.adx && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-orange-400 rounded" />ADX ({settings.adx.period})</span>}
          {active.supertrend && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block bg-pink-400 rounded" />SuperTrend ({settings.supertrend.period},{settings.supertrend.multiplier})</span>}
        </div>
      )}
    </div>
  );
};

export default ChartsPage;