import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import {
  Activity, ArrowRight, BarChart3, Building2, Calculator, Check,
  ChevronLeft, ChevronRight, CircleDollarSign, Database, Download,
  FileText, Home, LayoutDashboard, LineChart, Moon, RefreshCw, Search,
  Settings2, ShieldCheck, Sparkles, Sun, Target, Trophy, Users, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart as ReLineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import "./styles.css";

const API = "http://localhost:5000";
const INITIAL = {
  area: "3000", bedrooms: "3", bathrooms: "2", stories: "2", parking: "1",
  mainroad: "yes", guestroom: "no", basement: "no", hotwaterheating: "no", airconditioning: "yes",
  prefarea: "yes", furnishingstatus: "semi-furnished", cctv: "yes", security: "no", garden: "no",
  gym: "no", swimmingpool: "no", elevator: "no", balcony: "no", clubhouse: "no"
};
const NAV = [{ id: "home", label: "Home", icon: LayoutDashboard }, { id: "predict", label: "Predict", icon: Calculator }, { id: "analytics", label: "Analytics", icon: LineChart }, { id: "compare", label: "Compare", icon: Users }, { id: "models", label: "Model Lab", icon: Target }, { id: "history", label: "History", icon: RefreshCw }];
const STEPS = [
  { title: "Property details", keys: ["area", "bedrooms", "bathrooms", "stories"] },
  { title: "Location & features", keys: ["mainroad", "prefarea", "furnishingstatus", "guestroom", "basement"] },
  { title: "Core amenities", keys: ["parking", "airconditioning", "hotwaterheating", "cctv", "security"] },
  { title: "Lifestyle extras", keys: ["garden", "gym", "swimmingpool", "elevator", "balcony", "clubhouse"] }
];
const FIELDS = { area: ["Area", "number", "sq ft"], bedrooms: ["Bedrooms", "number", "rooms"], bathrooms: ["Bathrooms", "number", "rooms"], stories: ["Stories", "number", "levels"], parking: ["Parking spaces", "number", "cars"] };
const TOGGLE_FIELDS = {
  mainroad: "Main road access",
  prefarea: "Preferred area",
  guestroom: "Guest room",
  basement: "Basement",
  airconditioning: "Air conditioning",
  hotwaterheating: "Hot water heating",
  cctv: "CCTV",
  security: "Security guard",
  garden: "Garden",
  gym: "Gym",
  swimmingpool: "Swimming pool",
  elevator: "Elevator",
  balcony: "Balcony",
  clubhouse: "Clubhouse"
};

const formatMoney = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
const formatLakhs = (value) => `₹${((Number(value) || 0) / 100000).toFixed(1)}L`;
const getHistory = () => { try { return JSON.parse(localStorage.getItem("lumora-history") || "[]"); } catch { return []; } };

function App() {
  const [view, setView] = useState("home");
  const [theme, setTheme] = useState(() => localStorage.getItem("lumora-theme") || "light");
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(getHistory);
  const [analytics, setAnalytics] = useState(null);
  const [models, setModels] = useState(null);
  const [service, setService] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareA, setCompareA] = useState({ ...INITIAL, area: "2500" });
  const [compareB, setCompareB] = useState({ ...INITIAL, area: "3200", bedrooms: "4", bathrooms: "3", parking: "2" });
  const [compareResult, setCompareResult] = useState(null);
  const [whatIfs, setWhatIfs] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lumora-theme", theme);
  }, [theme]);
  useEffect(() => {
    fetch(`${API}/api/health`).then((response) => response.json()).then((data) => { setService("online"); setModels((current) => current || { best: data.model }); }).catch(() => setService("offline"));
    fetch(`${API}/api/analytics`).then((response) => response.json()).then(setAnalytics).catch(() => {});
    fetch(`${API}/api/models`).then((response) => response.json()).then(setModels).catch(() => {});
  }, []);

  const update = (setter, key, value) => setter((current) => ({ ...current, [key]: value }));
  const go = (next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const searchResults = NAV.filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase()));
  const reset = () => { setForm(INITIAL); setStep(0); setResult(null); setWhatIfs([]); setError(""); };

  async function requestPrediction(property) {
    const response = await fetch(`${API}/api/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(property) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Prediction failed");
    return data;
  }

  async function predict(event) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const data = await requestPrediction(form); setResult(data); setService("online");
      const upgradeOptions = [{ label: "Add air conditioning", property: { ...form, airconditioning: "yes" } }, { label: "Mark preferred area", property: { ...form, prefarea: "yes" } }, { label: "Add one parking space", property: { ...form, parking: String(Number(form.parking) + 1) } }];
      const simulations = await Promise.all(upgradeOptions.map(async (option) => ({ label: option.label, result: await requestPrediction(option.property) })));
      setWhatIfs(simulations);
      const item = { id: Date.now(), price: data.price, formatted: data.formatted, area: form.area, bedrooms: form.bedrooms, time: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) };
      const next = [item, ...history].slice(0, 8); setHistory(next); localStorage.setItem("lumora-history", JSON.stringify(next));
    } catch { setService("offline"); setError("Prediction service is unavailable. Start backend/app.py and try again."); }
    finally { setLoading(false); }
  }

  async function compare() {
    setLoading(true); setError("");
    try { setCompareResult({ a: await requestPrediction(compareA), b: await requestPrediction(compareB) }); setService("online"); }
    catch { setError("Run the Python backend to compare properties."); }
    finally { setLoading(false); }
  }

  function downloadReport() {
    if (!result) return;
    const doc = new jsPDF(); const date = new Date().toLocaleDateString("en-IN");
    doc.setFillColor(23, 60, 49); doc.rect(0, 0, 210, 34, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text("LUMORA", 18, 16); doc.setFontSize(9); doc.text("INTELLIGENT REAL ESTATE VALUATION", 18, 24);
    doc.setTextColor(24, 36, 31); doc.setFontSize(11); doc.text(`VALUATION REPORT · ${date}`, 18, 52); doc.setFontSize(30); doc.text(result.formatted, 18, 72); doc.setFontSize(11); doc.text(`Expected range: ${formatLakhs(result.range.low)} - ${formatLakhs(result.range.high)}`, 18, 84); doc.text(`Price per sq ft: ${formatMoney(result.perSqFt)}`, 18, 94); doc.text(`Model confidence: ${Math.round(result.confidence * 100)}%`, 18, 104); doc.text(`Model: ${result.model}`, 18, 114);
    doc.setFontSize(13); doc.text("Property profile", 18, 140); doc.setFontSize(10); doc.text(`Area: ${form.area} sq ft   Bedrooms: ${form.bedrooms}   Bathrooms: ${form.bathrooms}`, 18, 151); doc.text(`Stories: ${form.stories}   Parking: ${form.parking}   Furnishing: ${form.furnishingstatus}`, 18, 160); doc.setFontSize(13); doc.text("LUMORA insight", 18, 187); doc.setFontSize(10); doc.text("Property size, room count, and amenities were compared against", 18, 198); doc.text("545 historical housing records to produce this estimate.", 18, 207); doc.save("lumora-property-report.pdf");
  }

  function downloadAnalyticsCsv() {
    if (!analytics?.areaPrice?.length) return;
    const rows = [["area_sq_ft", "price"], ...analytics.areaPrice.map((item) => [item.area, item.price])];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "lumora-market-snapshot.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  const renderField = (key, property = form, setter = setForm) => {
    if (FIELDS[key]) { const [label, type, unit] = FIELDS[key]; return <label className="inputGroup" key={key}><span>{label}</span><div><input required min="0" type={type} value={property[key]} onChange={(event) => update(setter, key, event.target.value)} /><small>{unit}</small></div></label>; }
    if (key === "furnishingstatus") return <label className="inputGroup" key={key}><span>Furnishing status</span><select value={property[key]} onChange={(event) => update(setter, key, event.target.value)}><option>furnished</option><option>semi-furnished</option><option>unfurnished</option></select></label>;
    return <label className="inputGroup toggleRow" key={key}><span>{TOGGLE_FIELDS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}</span><select value={property[key]} onChange={(event) => update(setter, key, event.target.value)}><option>yes</option><option>no</option></select></label>;
  };

  function PredictionStudio() {
    return <section className="pageSection"><div className="pageHeader"><div><span className="kicker">PREDICTION STUDIO</span><h1>Price, with a point of view.</h1><p>Build a property profile step by step. LUMORA will return a value, a range, and the reasons behind it.</p></div><button className="ghostButton" onClick={reset}><RefreshCw size={15} /> Start over</button></div><div className="stepper">{STEPS.map((item, index) => <button className={step === index ? "active" : step > index ? "done" : ""} onClick={() => index <= step && setStep(index)} key={item.title}><span>{step > index ? <Check size={15} /> : `0${index + 1}`}</span>{item.title}</button>)}</div><form className="studioGrid" onSubmit={predict}><div className="studioCard"><div className="cardTitle"><div><span className="kicker">STEP 0{step + 1}</span><h2>{STEPS[step].title}</h2></div><Settings2 size={20} /></div><div className="inputGrid">{STEPS[step].keys.map((key) => renderField(key))}</div><div className="stepActions">{step > 0 && <button type="button" className="ghostButton" onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Back</button>}{step < STEPS.length - 1 ? <button type="button" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={16} /></button> : <button disabled={loading}>{loading ? "Analyzing..." : "Predict property value"} <ArrowRight size={16} /></button>}</div>{error && <p className="errorMessage"><X size={15} />{error}</p>}</div><aside className="studioAside"><div className="asideIcon"><ShieldCheck /></div><span className="kicker">LUMORA PROMISE</span><h3>Explainable by design.</h3><p>Every estimate comes with the model used, confidence, expected range, and feature signals you can discuss with a client or mentor.</p><div className="miniMetric"><Activity size={16} /><span>Live model status <b className={service}>{service}</b></span></div></aside></form>{result && <ResultCard result={result} onDownload={downloadReport} />}</section>;
  }

  function ResultCardLegacy({ result: data, onDownload }) {
    const average = analytics?.summary?.averagePrice || 0;
    const marketPosition = average && data.price > average * 1.1 ? "Above dataset average" : average && data.price < average * 0.9 ? "Below dataset average" : "Near dataset average";
    const scenarios = [["Conservative", data.range.low, "Lower bound"], ["LUMORA base", data.price, "Model estimate"], ["Upside", data.range.high, "Upper bound"]];
    return <div className="resultWorkspace"><div className="resultCard"><div className="resultTop"><span className="kicker">ESTIMATED PROPERTY VALUE</span><span className="confidence"><ShieldCheck size={15} /> {Math.round(data.confidence * 100)}% confidence</span></div><strong className="bigPrice">{data.formatted}</strong><div className="rangeRow"><span>{formatLakhs(data.range.low)}</span><div><i style={{ left: "12%" }} /><i style={{ left: "84%" }} /></div><span>{formatLakhs(data.range.high)}</span></div><div className="resultStats"><span><b>{formatMoney(data.perSqFt)}</b> / sq ft</span><span><b>{data.model}</b> selected model</span><span><b>{data.metrics.r2}</b> test R²</span></div><div className="scenarioStrip">{scenarios.map(([label, value, detail]) => <div key={label} className={label === "LUMORA base" ? "featured" : ""}><span>{label}</span><b>{formatLakhs(value)}</b><small>{detail}</small></div>)}</div><div className="marketPosition"><Activity size={15} /><span><b>{marketPosition}</b>{average ? ` · Dataset midpoint ${formatLakhs(average)}` : " · Comparing against current dataset"}</span></div><button onClick={onDownload}><Download size={16} /> Download property report</button></div><div className="insightCard"><div className="insightHeading"><Sparkles size={18} /><div><span className="kicker">LUMORA INSIGHT</span><h3>What shaped this estimate?</h3></div></div><p>Property size and the home&apos;s core features were compared with similar records in the training dataset.</p><div className="impactList">{data.impacts?.map((impact) => <div key={impact.label}><div><span>{impact.label}</span><b>{impact.percent}%</b></div><i><em style={{ width: `${impact.percent}%` }} /></i></div>)}</div></div></div>;
  }

  function WhatIfCard() { return <div className="whatIfCard"><div><span className="kicker">WHAT-IF SIMULATOR</span><h3>Which upgrade moves the needle?</h3><p>These are model-backed scenarios, not generic recommendations.</p></div><div className="whatIfList">{whatIfs.map((item) => <div key={item.label}><span>{item.label}</span><b>{formatLakhs(item.result.price)}</b><em>+{formatLakhs(Math.max(0, item.result.price - result.price))}</em></div>)}</div></div>; }
  function ResultCard({ result: data, onDownload }) { return <><ResultCardLegacy result={data} onDownload={onDownload} />{whatIfs.length > 0 && <WhatIfCard />}</>; }

  function HomeView() {
    return <><section className="landingHero"><div className="heroCopy"><span className="kicker">THE NEW STANDARD IN HOME VALUATION</span><h1>See the <i>story</i><br />behind the price.</h1><p>LUMORA combines machine learning and market signals to turn property details into a valuation you can understand and act on.</p><button onClick={() => go("predict")}>Predict your property <ArrowRight size={17} /></button><div className="heroStats"><span><b>545</b> properties studied</span><span><b>4</b> models benchmarked</span><span><b>65.3%</b> best R² score</span></div></div><div className="heroVisual"><div className="visualTag"><Building2 size={16} /><span><b>Live intelligence</b>Market-aware estimates</span></div></div></section><section className="homeGrid"><div className="sectionIntro"><span className="kicker">A MORE USEFUL ESTIMATE</span><h2>From number to narrative.</h2><p>Everything you need to explore a property, understand a model, and make a clearer decision.</p></div><div className="featureGrid"><Feature icon={Calculator} title="Prediction studio" text="A calm, guided workflow that turns 12 property attributes into an explainable estimate." onClick={() => go("predict")} /><Feature icon={LineChart} title="Market analytics" text="Explore the dataset with price, area, bedroom, and furnishing trends." onClick={() => go("analytics")} /><Feature icon={Users} title="Compare homes" text="Put two property profiles side by side and see the tradeoffs." onClick={() => go("compare")} /><Feature icon={Trophy} title="Model lab" text="See which regression approach wins on the same held-out test set." onClick={() => go("models")} /></div></section></>;
  }
  function Feature({ icon: Icon, title, text, onClick }) { return <button className="featureCard" onClick={onClick}><Icon size={21} /><h3>{title}</h3><p>{text}</p><span>Explore <ArrowRight size={14} /></span></button>; }

  function AnalyticsViewLegacy() { const summary = analytics?.summary; return <section className="pageSection"><PageTitle kicker="MARKET ANALYTICS" title="The market, in context." text="A transparent look at the 545 records behind LUMORA&apos;s valuation engine." /><div className="metricGrid">{[["Average price", summary ? formatLakhs(summary.averagePrice) : "--", CircleDollarSign], ["Price ceiling", summary ? formatLakhs(summary.maximumPrice) : "--", Trophy], ["Price floor", summary ? formatLakhs(summary.minimumPrice) : "--", ArrowRight], ["Average area", summary ? `${summary.averageArea.toLocaleString()} sq ft` : "--", Building2]].map(([label, value, Icon]) => <div className="metricCard" key={label}><Icon size={18} /><span>{label}</span><b>{value}</b></div>)}</div><div className="chartGrid"><ChartCard title="Area vs. price" subtitle="Each point is a property in the dataset."><ResponsiveContainer width="100%" height={260}><ScatterChart><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="area" name="Area" unit=" sq ft" /><YAxis dataKey="price" tickFormatter={(value) => `${Math.round(value / 100000)}L`} /><Tooltip formatter={(value) => formatMoney(value)} /><Scatter data={analytics?.areaPrice || []} fill="#4b8068" /></ScatterChart></ResponsiveContainer></ChartCard><ChartCard title="Average price by bedrooms" subtitle="More rooms, more context."><ResponsiveContainer width="100%" height={260}><BarChart data={analytics?.bedroomPrice || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bedrooms" /><YAxis tickFormatter={(value) => `${Math.round(value / 100000)}L`} /><Tooltip formatter={(value) => formatMoney(value)} /><Bar dataKey="price" fill="#e49b5d" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Furnishing signal" subtitle="Average price by finish level."><ResponsiveContainer width="100%" height={260}><BarChart data={analytics?.furnishingPrice || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `${Math.round(value / 100000)}L`} /><YAxis dataKey="furnishingstatus" type="category" width={95} /><Tooltip formatter={(value) => formatMoney(value)} /><Bar dataKey="price" fill="#81a99a" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Price distribution" subtitle="The shape of the training set."><ResponsiveContainer width="100%" height={260}><ReLineChart data={analytics?.distribution || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="value" tickFormatter={(value) => `${Math.round(value / 100000)}L`} /><YAxis dataKey="count" /><Tooltip formatter={(value) => `${value} homes`} /><Line type="monotone" dataKey="count" stroke="#173c31" strokeWidth={3} dot={false} /></ReLineChart></ResponsiveContainer></ChartCard></div></section>; }
  function AnalyticsView() { return <><AnalyticsViewLegacy /><section className="pageSection heatmapSection"><CorrelationCard data={analytics?.correlation} /></section></>; }
  function CorrelationCard({ data }) { const labels = data?.labels || []; const values = data?.values || []; return <article className="chartCard correlationCard"><h3>Correlation heatmap</h3><p>Strength of relationship between numeric features.</p><div className="heatmap"><div className="heatmapCorner" />{labels.map((label) => <span className="heatmapLabel" key={`top-${label}`}>{label === "price" ? "Price" : label}</span>)}{values.map((row, rowIndex) => <React.Fragment key={labels[rowIndex]}><span className="heatmapLabel rowLabel">{labels[rowIndex] === "price" ? "Price" : labels[rowIndex]}</span>{row.map((value, columnIndex) => <span className="heatCell" title={`${labels[rowIndex]} / ${labels[columnIndex]}: ${value}`} style={{ background: value >= 0 ? `rgba(75,128,104,${Math.max(.12, value)})` : `rgba(183,92,77,${Math.max(.12, Math.abs(value))})` }} key={`${rowIndex}-${columnIndex}`}>{value}</span>)}</React.Fragment>)}</div></article>; }
  function ChartCard({ title, subtitle, children }) { return <article className="chartCard"><h3>{title}</h3><p>{subtitle}</p>{children}</article>; }
  function PageTitle({ kicker, title, text }) { return <div className="pageHeader"><div><span className="kicker">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{kicker === "MARKET ANALYTICS" && <button className="ghostButton" onClick={downloadAnalyticsCsv} disabled={!analytics?.areaPrice?.length}><Download size={15} /> Export CSV</button>}</div>; }

  function ModelView() { return <section className="pageSection"><PageTitle kicker="MODEL LAB" title="One dataset. Four contenders." text="Every candidate is evaluated on the same 80/20 split. The best R² powers live predictions." /><div className="modelHero"><div><span className="kicker">CURRENT WINNER</span><h2>{models?.best || "Loading model..."}</h2><p>Selected automatically from the benchmark below.</p></div><Trophy size={54} /></div><div className="modelTable"><div className="modelRow modelHead"><span>Model</span><span>R²</span><span>MAE</span><span>RMSE</span></div>{(models?.models || []).map((model, index) => <div className={`modelRow ${index === 0 ? "winner" : ""}`} key={model.name}><span><b>{index === 0 && <Trophy size={14} />} {model.name}</b>{index === 0 && <small>BEST MODEL</small>}</span><strong>{model.r2}</strong><span>{formatLakhs(model.mae)}</span><span>{formatLakhs(model.rmse)}</span></div>)}</div></section>; }

  function CompareView() { const compareFieldKeys = ["area", "bedrooms", "bathrooms", "stories", "parking", "furnishingstatus", "cctv", "security", "garden", "gym", "swimmingpool", "elevator", "balcony", "clubhouse"]; return <section className="pageSection"><PageTitle kicker="PROPERTY COMPARISON" title="Two homes. One clearer decision." text="Adjust either profile, then compare the model&apos;s estimate and the practical differences." /><div className="compareGrid"><CompareCard title="Property A" property={compareA} setter={setCompareA} fields={compareFieldKeys} /><div className="versus">VS</div><CompareCard title="Property B" property={compareB} setter={setCompareB} fields={compareFieldKeys} /></div><button className="compareButton" onClick={compare} disabled={loading}>{loading ? "Comparing..." : "Compare properties"} <ArrowRight size={16} /></button>{compareResult && <div className="compareResult"><CompareResult label="PROPERTY A" result={compareResult.a} /><CompareResult label="PROPERTY B" result={compareResult.b} /></div>}{error && <p className="errorMessage">{error}</p>}</section>; }
  function CompareCard({ title, property, setter, fields }) { return <div className="compareCard"><span className="kicker">{title}</span><h2>{title === "Property A" ? "Urban character" : "Room to grow"}</h2>{fields.map((key) => renderField(key, property, setter))}</div>; }
  function CompareResult({ label, result: data }) { return <div><span className="kicker">{label}</span><b className="comparePrice">{data.formatted}</b><span>{Math.round(data.confidence * 100)}% confidence · {formatMoney(data.perSqFt)} / sq ft</span></div>; }

  function HistoryView() { return <section className="pageSection"><PageTitle kicker="MY PREDICTIONS" title="A record of your thinking." text="Your recent estimates stay on this device, ready for another look." />{history.length ? <div className="historyTable">{history.map((item, index) => <div className="historyRow" key={item.id}><span className="historyIndex">0{index + 1}</span><div><b>{item.formatted}</b><span>{item.area} sq ft · {item.bedrooms} bedrooms</span></div><time>{item.time}</time><button onClick={() => { setForm({ ...INITIAL, area: item.area, bedrooms: item.bedrooms }); setResult(null); go("predict"); }}>Open <ArrowRight size={14} /></button></div>)}</div> : <div className="emptyState"><Clock3Icon /><h3>No saved predictions yet</h3><p>Run your first valuation and it will appear here.</p><button onClick={() => go("predict")}>Start a prediction <ArrowRight size={16} /></button></div>}</section>; }
  function Clock3Icon() { return <RefreshCw size={34} />; }

  return <div className="appShell"><aside className="sidebar"><div className="brand"><span className="brandMark"><Home size={18} /></span><div><b>LUMORA</b><small>VALUATION PLATFORM</small></div></div><div className="navGroup"><span className="navLabel">WORKSPACE</span>{NAV.map(({ id, label, icon: Icon }) => <button className={view === id ? "selected" : ""} onClick={() => go(id)} key={id}><Icon size={17} />{label}</button>)}</div><div className="sidebarBottom"><button onClick={() => setTheme(theme === "light" ? "dark" : "light")}><span>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</span>{theme === "light" ? "Dark mode" : "Light mode"}</button><div className="profile"><span>AN</span><div><b>Aishwarya N R</b><small>Internship project</small></div></div></div></aside><main className="mainArea"><header className="topbar"><div className="mobileBrand"><span className="brandMark"><Home size={16} /></span><b>LUMORA</b></div><div className="topbarRight"><span className={`serviceDot ${service}`}><i /> {service === "online" ? "Model online" : service === "checking" ? "Connecting" : "Offline"}</span><button className="iconButton" title="Search" onClick={() => { setSearchOpen(true); setSearchTerm(""); }}><Search size={17} /></button></div></header>{view === "home" && <HomeView />}{view === "predict" && <PredictionStudio />}{view === "analytics" && <AnalyticsView />}{view === "models" && <ModelView />}{view === "compare" && <CompareView />}{view === "history" && <HistoryView />}</main>{searchOpen && <div className="searchBackdrop" onClick={() => setSearchOpen(false)}><div className="searchPanel" onClick={(event) => event.stopPropagation()}><div className="searchInput"><Search size={17} /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search LUMORA workspace..." onKeyDown={(event) => event.key === "Escape" && setSearchOpen(false)} /><button onClick={() => setSearchOpen(false)}><X size={16} /></button></div><div className="searchResults">{searchResults.length ? searchResults.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { go(id); setSearchOpen(false); }}><Icon size={17} /><span>{label}</span><ArrowRight size={14} /></button>) : <p>No workspace section matches that search.</p>}</div><small>Press Esc to close</small></div></div>}</div>;
}

const root = globalThis.__lumoraRoot || (globalThis.__lumoraRoot = createRoot(document.getElementById("root")));
root.render(<App />);
