/* ============================================================
   APP.JS — state, rendering, and event wiring.
   No framework. Renders into #root via template strings.
   ============================================================ */

const State = {
  data: SAMPLE,
  live: false,
  tab: "stocks",
  mkt: "ALL",
  capTier: "ALL",
  preset: "all",
  q: "",
  sort: "health",
  sel: null,
  discount: 10,
  termGrowth: 3,
  driverDir: Object.fromEntries(MACRO_DRIVERS.map(d=>[d.id,"down"])),
  phase: 0,
  view: "annual",
  kpiExpanded: false,
  learnMode: true,
  showWatchlist: false,
  watchlist: JSON.parse(localStorage.getItem("terminal_watchlist")||"[]"),
  compare: [],
};

function saveWatchlist(){ localStorage.setItem("terminal_watchlist", JSON.stringify(State.watchlist)); }
function toggleWatch(t){
  const i=State.watchlist.indexOf(t);
  if(i>=0) State.watchlist.splice(i,1); else State.watchlist.push(t);
  saveWatchlist(); render();
}
function toggleCompare(t){
  const i=State.compare.indexOf(t);
  if(i>=0){ State.compare.splice(i,1); }
  else { if(State.compare.length>=5){ alert("You can compare up to 5 stocks at a time. Remove one first."); return; } State.compare.push(t); }
  render();
}

fetch("data.json").then(r=>r.ok?r.json():Promise.reject()).then(d=>{
  if(Array.isArray(d)&&d.length){ State.data=d; State.live=true; render(); }
}).catch(()=>{});

function computeRows(){
  return State.data.map(s=>{
    const intrinsic = dcf(normalize(s), {discount:State.discount, termGrowth:State.termGrowth, years:10});
    return analyze(s, intrinsic);
  });
}

function capTierOf(s){
  const usdMcap = s.mkt==="US" ? s.mcap : s.mcap/830;
  if(usdMcap>200) return "mega";
  if(usdMcap>10) return "large";
  return "mid";
}

const PRESETS=[
  {id:"all", label:"All stocks", n:"", test:()=>true},
  {id:"quality", label:"Quality compounders", n:"ROE>20% · FCF/NI≥1 · low debt",
   test:s=>s.roe>20 && (s.fcfNi==null||s.fcfNi>=0.9) && (s.debtToEbitda==null||s.debtToEbitda<2)},
  {id:"value", label:"Undervalued + growing", n:"DCF gap>15% · FCF growing",
   test:s=>s.mos!=null && s.mos>15 && s.fcfG!=null && s.fcfG>0},
  {id:"cash", label:"Cash machines", n:"Top FCF yield",
   test:s=>s.fcfYield!=null && s.fcfYield>5},
  {id:"flags", label:"Red flags", n:"Warning signals firing",
   test:s=>s.flags.some(f=>f.s==="warn")},
  {id:"watch", label:"★ Watchlist", n:"",
   test:s=>State.watchlist.includes(s.t)},
];

function filteredRows(){
  let rows = computeRows();
  const preset = PRESETS.find(p=>p.id===State.preset) || PRESETS[0];
  rows = rows.filter(s=>
    (State.mkt==="ALL"||s.mkt===State.mkt) &&
    (State.capTier==="ALL"||capTierOf(s)===State.capTier) &&
    (State.q===""||s.t.toLowerCase().includes(State.q.toLowerCase())||s.n.toLowerCase().includes(State.q.toLowerCase())) &&
    preset.test(s)
  );
  const dir = {health:-1,mcap:-1,revG:-1,fcfG:-1,mos:-1,roe:-1,pe:1}[State.sort] || -1;
  rows.sort((a,b)=>{
    const av = State.sort==="health"?a.healthScore:a[State.sort];
    const bv = State.sort==="health"?b.healthScore:b[State.sort];
    return ((av??-1e9)-(bv??-1e9))*dir;
  });
  return rows;
}

function clr(v){ return v==null?"#6b6b68":v>0?"var(--good)":"var(--warn)"; }

function renderHeader(){
  return `
  <header class="app">
    <div class="headrow">
      <span class="brand"><span class="dot">▮▮</span> TERMINAL</span>
      <div class="tabs">
        <button data-tab="stocks" class="${State.tab==='stocks'?'on':''}">Stocks</button>
        <button data-tab="sectors" class="${State.tab==='sectors'?'on':''}">Sectors &amp; cycles</button>
        <button data-tab="compare" class="${State.tab==='compare'?'on':''}">Compare${State.compare.length?` (${State.compare.length})`:''}</button>
      </div>
      <button class="watchbtn" id="watchToggle">★ Watchlist (${State.watchlist.length})</button>
      <span class="livebadge ${State.live?'live':'sample'}">${State.live?'● LIVE · YAHOO':'● SAMPLE DATA'} · ${State.data.length} names</span>
    </div>
  </header>`;
}

function renderPresets(){
  return `<div class="presets">${PRESETS.map(p=>`
    <button class="preset ${State.preset===p.id?'on':''}" data-preset="${p.id}">
      ${p.label}${p.n?`<span class="n">${p.n}</span>`:''}
    </button>`).join("")}</div>`;
}

function renderScreener(){
  const rows = filteredRows();
  const cols=[["t","Ticker"],["mcap","Mkt cap"],["price","Price"],["revG","Rev YoY"],
    ["fcfG","FCF YoY"],["pe","P/E"],["mos","DCF gap"],["health","Score"]];
  return `
  ${renderPresets()}
  <div class="toolbar">
    <div class="seg">
      ${["ALL","US","IN"].map(m=>`<button data-mkt="${m}" class="${State.mkt===m?'on':''}">${m==="US"?"S&P 500":m==="IN"?"Nifty":"All markets"}</button>`).join("")}
    </div>
    <div class="seg">
      ${[["ALL","All sizes"],["mega","Mega cap"],["large","Large cap"],["mid","Mid cap"]].map(([k,l])=>`<button data-cap="${k}" class="${State.capTier===k?'on':''}">${l}</button>`).join("")}
    </div>
    <input class="search" id="searchBox" placeholder="Search ticker or name…" value="${State.q}"/>
  </div>
  <div style="overflow-x:auto">
  <table class="grid">
    <thead><tr>
      <th></th>
      <th></th>
      ${cols.map(([k,l])=>`<th class="${k==='t'?'left':''}" data-sort="${k}" style="${State.sort===k?'color:var(--accent)':''}">${l}</th>`).join("")}
      <th>5Q trend</th>
    </tr></thead>
    <tbody>
      ${rows.length===0?`<tr><td colspan="10" style="padding:30px;text-align:center;color:var(--dim)">No stocks match these filters. Try a broader preset.</td></tr>`:
      rows.map(s=>`
        <tr class="row" data-open="${s.t}">
          <td><span class="star ${State.watchlist.includes(s.t)?'on':''}" data-star="${s.t}">★</span></td>
          <td><span class="cmpbox ${State.compare.includes(s.t)?'on':''}" data-cmp="${s.t}" title="Add to compare">${State.compare.includes(s.t)?'✓':'+'}</span></td>
          <td class="left"><span class="tname">${s.t}</span><span class="tsub">${s.n}</span></td>
          <td>${fmtB(s.mcap,s.mkt)}</td>
          <td>${fmtP(s.price,s.mkt)}</td>
          <td style="color:${clr(s.revG)}">${sign(s.revG)}</td>
          <td style="color:${clr(s.fcfG)}">${sign(s.fcfG)}</td>
          <td>${s.pe==null?"—":s.pe.toFixed(0)}</td>
          <td style="color:${clr(s.mos)}">${sign(s.mos)}</td>
          <td><span class="pill ${s.verdict.l==='Constructive'?'good':s.verdict.l==='Caution'?'warn':'neutral'}">${s.healthScore}</span></td>
          <td>${svgSpark((s.quarterly.revenue||[]).slice(0,5))}</td>
        </tr>`).join("")}
    </tbody>
  </table>
  </div>
  <p class="hint">Showing ${rows.length} of ${State.data.length} stocks. Click any row for the full tearsheet. Score blends growth, cash quality, valuation cushion, and balance-sheet health.</p>
  `;
}

function renderTearsheet(t){
  const rows = computeRows();
  const s = rows.find(r=>r.t===t);
  if(!s) { State.sel=null; return renderScreener(); }
  const isQ = State.view==="quarterly";
  const P = isQ ? s.quarterly : s.annual;
  const A = s.annual;
  const periods = P.periods;

  const coreKpis = [
    ["Market cap", fmtB(s.mcap,s.mkt)], ["DCF intrinsic", fmtP(s.intrinsic,s.mkt)],
    ["Free cash flow", fmtB(A.fcf[0],s.mkt)], ["Net margin", s.nmNow==null?"—":s.nmNow.toFixed(1)+"%"],
    ["FCF / Net income", s.fcfNi==null?"—":s.fcfNi.toFixed(2)], ["ROE", s.roe==null?"—":s.roe.toFixed(0)+"%"],
  ];
  const extraKpis = [
    ["Enterprise value", fmtB(s.ev,s.mkt)], ["Revenue (TTM)", fmtB(A.revenue[0],s.mkt)],
    ["EBITDA", fmtB(A.ebitda[0],s.mkt)], ["Net income", fmtB(A.netIncome[0],s.mkt)],
    ["Rev CAGR 3y", sign(s.revCagr)], ["FCF CAGR 3y", sign(s.fcfCagr)],
    ["Net debt", fmtB(s.debt,s.mkt)], ["FCF yield", s.fcfYield==null?"—":s.fcfYield.toFixed(1)+"%"],
    ["P/E", s.pe==null?"—":s.pe.toFixed(1)], ["EV/EBITDA", s.evEbitda==null?"—":s.evEbitda.toFixed(1)],
    ["PEG", s.peg==null?"—":s.peg.toFixed(2)], ["Net debt/EBITDA", s.debtToEbitda==null?(s.debt<0?"net cash":"—"):s.debtToEbitda.toFixed(1)+"×"],
    [s.mkt==="IN"?"Promoter holding":"Insider ownership", s.insiderPct==null?"—":s.insiderPct.toFixed(1)+"%"+(s.insiderTrend!=null?(s.insiderTrend>0?" ▲":" ▼"):"")],
  ];

  return `
  <button class="backbtn" id="backBtn">← All stocks</button>

  <div class="tshead">
    <div>
      <div class="tsticker">${s.t}<span class="tsmkt">${s.mkt==="US"?"NYSE/NASDAQ":"NSE"}</span></div>
      <div class="tsname">${s.n}</div>
      <div class="tssec">${s.sec}${s.ind?` · ${s.ind}`:""}</div>
    </div>
    <div class="tspricebox">
      <div class="tsprice">${fmtP(s.price,s.mkt)}</div>
      <div class="tsrange">52wk ${fmtP(s.low52,s.mkt)} — ${fmtP(s.high52,s.mkt)}</div>
      ${s.pricePos!=null?`<div class="rangebar"><div class="rangefill" style="width:${s.pricePos}%"></div></div>`:""}
    </div>
    <div class="tsverdict" style="border-color:${s.verdict.c}">
      <span class="l" style="color:${s.verdict.c}">${s.verdict.l.toUpperCase()}</span>
      <span class="sub">${s.flags.filter(f=>f.s==="good").length} positive · ${s.flags.filter(f=>f.s==="warn").length} caution</span>
    </div>
    <span class="star ${State.watchlist.includes(s.t)?'on':''}" data-star="${s.t}" style="font-size:24px;align-self:center">★</span>
    <button class="watchbtn" data-cmp="${s.t}" style="align-self:center">${State.compare.includes(s.t)?'✓ In compare':'+ Add to compare'}</button>
  </div>

  <div class="takeaway">${takeaway(s)}</div>

  <div class="kpiCore">
    ${coreKpis.map(([l,v])=>`<div class="kpi"><div class="kpiV">${v}</div><div class="kpiL">${l}</div></div>`).join("")}
  </div>
  <button class="showmore" id="kpiToggle">${State.kpiExpanded?"− Show fewer metrics":"+ Show all metrics"}</button>
  <div class="kpiCore kpiExtra ${State.kpiExpanded?'show':''}">
    ${extraKpis.map(([l,v])=>`<div class="kpi"><div class="kpiV">${v}</div><div class="kpiL">${l}</div></div>`).join("")}
  </div>

  ${renderAskClaude(s)}
  ${renderEarningsSentiment(s)}

  <div class="viewtoggle">
    <button data-view="annual" class="${!isQ?'on':''}">Annual</button>
    <button data-view="quarterly" class="${isQ?'on':''}">Quarterly (QoQ)</button>
  </div>

  <div class="panelgrid">
    <div class="panel"><div class="panelhead"><span class="panelt">Revenue</span><span class="panels">${isQ?`QoQ ${sign(qoq(P.revenue))}`:`YoY ${sign(yoy(P.revenue))}`}</span></div>${svgBarChart(P.revenue,periods,"#0e6e5c")}</div>
    <div class="panel"><div class="panelhead"><span class="panelt">EBITDA</span><span class="panels">${isQ?`QoQ ${sign(qoq(P.ebitda))}`:`YoY ${sign(yoy(P.ebitda))}`}</span></div>${svgBarChart(P.ebitda,periods,"#6d5dd3")}</div>
    <div class="panel"><div class="panelhead"><span class="panelt">Net income</span><span class="panels">${isQ?`QoQ ${sign(qoq(P.netIncome))}`:`YoY ${sign(yoy(P.netIncome))}`}</span></div>${svgBarChart(P.netIncome,periods,"#1a8a63")}</div>
    <div class="panel"><div class="panelhead"><span class="panelt">Free cash flow</span><span class="panels">${isQ?`QoQ ${sign(qoq(P.fcf))}`:`YoY ${sign(yoy(P.fcf))}`}</span></div>${svgBarChart(P.fcf,periods,"#2aa37c")}</div>

    <div class="panel wide">
      <div class="panelhead"><span class="panelt">Margin ladder</span><span class="panels">Operating · EBITDA · Net · FCF</span></div>
      ${svgLineChart([
        {color:"#0e6e5c",data:P.margins.map(m=>m.operating)},
        {color:"#6d5dd3",data:P.margins.map(m=>m.ebitda)},
        {color:"#1a8a63",data:P.margins.map(m=>m.net)},
        {color:"#2aa37c",data:P.margins.map(m=>m.fcf)},
      ],periods)}
      <div class="legend">
        <span class="legitem"><i style="background:#0e6e5c"></i>Operating</span>
        <span class="legitem"><i style="background:#6d5dd3"></i>EBITDA</span>
        <span class="legitem"><i style="background:#1a8a63"></i>Net</span>
        <span class="legitem"><i style="background:#2aa37c"></i>FCF</span>
      </div>
    </div>

    <div class="panel wide">
      <div class="panelhead"><span class="panelt">Revenue vs free cash flow</span><span class="panels">Do sales convert to cash?</span></div>
      ${svgLineChart([{color:"#0e6e5c",data:P.revenue},{color:"#2aa37c",data:P.fcf}],periods)}
      <div class="legend"><span class="legitem"><i style="background:#0e6e5c"></i>Revenue</span><span class="legitem"><i style="background:#2aa37c"></i>Free cash flow</span></div>
    </div>

    <div class="panel">
      <div class="panelhead"><span class="panelt">Valuation multiples</span></div>
      ${renderKV([["P/E (trailing)",s.pe?.toFixed(1)],["P/E (forward)",s.fpe?.toFixed(1)],["EV/EBITDA",s.evEbitda?.toFixed(1)],["Price/Sales",s.ps?.toFixed(1)],["Price/Book",s.pb?.toFixed(1)],["Div yield",s.divYield?s.divYield.toFixed(1)+"%":"—"]])}
    </div>
    <div class="panel">
      <div class="panelhead"><span class="panelt">Quality &amp; returns</span></div>
      ${renderKV([["Return on equity",s.roe?s.roe.toFixed(0)+"%":"—"],["Return on assets",s.roa?s.roa.toFixed(0)+"%":"—"],["FCF/Net income",s.fcfNi?s.fcfNi.toFixed(2):"—"],["Net debt/Mkt cap",(s.debt/s.mcap*100).toFixed(0)+"%"],["Beta",s.beta?.toFixed(2)],["FCF margin",A.margins[0]?.fcf?.toFixed(1)+"%"]])}
    </div>

    <div class="panel">
      <div class="panelhead"><span class="panelt">DCF intrinsic value</span><span class="panels">${State.discount}% disc · ${State.termGrowth}% terminal</span></div>
      <div class="dcfbox">
        <div><div class="kpiL">Intrinsic/share</div><div class="dcfval" style="color:${s.verdict.c}">${fmtP(s.intrinsic,s.mkt)}</div></div>
        <div><div class="kpiL">Market price</div><div class="dcfval">${fmtP(s.price,s.mkt)}</div></div>
        <div><div class="kpiL">Gap</div><div class="dcfval" style="color:${clr(s.mos)}">${sign(s.mos)}</div></div>
      </div>
      <div class="dcfsliders">
        <label>Discount ${State.discount}%</label><input type="range" min="6" max="16" value="${State.discount}" id="discountSlider"/>
        <label>Terminal ${State.termGrowth}%</label><input type="range" min="1" max="5" value="${State.termGrowth}" id="termSlider"/>
      </div>
    </div>
    <div class="panel">
      <div class="panelhead"><span class="panelt">Efficiency &amp; risk</span></div>
      ${renderKV([["FCF yield",s.fcfYield?s.fcfYield.toFixed(1)+"%":"—"],["Earnings yield",s.earnYield?s.earnYield.toFixed(1)+"%":"—"],["PEG ratio",s.peg?s.peg.toFixed(2):"—"],["Net debt/EBITDA",s.debtToEbitda?s.debtToEbitda.toFixed(1)+"×":(s.debt<0?"net cash":"—")],["Capex intensity",s.capexIntensity?s.capexIntensity.toFixed(1)+"%":"—"],["Rev growth Δ",s.revDecel!=null?sign(s.revDecel)+" pts":"—"]])}
    </div>
  </div>

  ${renderSignalMatrix(s)}
  ${renderSources(s)}
  `;
}
function renderKV(rows){
  return `<div class="kv">${rows.map(([k,v])=>`<div class="kvrow"><span class="kvk">${k}</span><span class="kvv">${v??"—"}</span></div>`).join("")}</div>`;
}

function renderSignalMatrix(s){
  const dirs=[
    ["Price (52wk pos)",s.pricePos,v=>v>50],["Revenue YoY",s.revG,v=>v>0],
    ["EBITDA YoY",s.ebitdaG,v=>v>0],["Net income YoY",s.niG,v=>v>0],
    ["Free cash flow YoY",s.fcfG,v=>v>0],["Net margin trend",s.marginTrend,v=>v>0],
    ["Cash conversion",s.fcfNi==null?null:(s.fcfNi-1)*100,v=>v>=-20],
  ];
  const cats={};
  s.flags.forEach((f,i)=>{(cats[f.cat]=cats[f.cat]||[]).push({...f,i});});
  return `
  <div class="matrix">
    <div class="matrixhead">SIGNAL MATRIX · direction of each driver
      <button class="learntoggle" id="learnToggle">${State.learnMode?"Learn mode: ON":"Learn mode: OFF"}</button>
    </div>
    <div class="matrixgrid">
      ${dirs.map(([l,v,ok])=>{const good=v!=null&&ok(v);
        return `<div class="matrixcell"><span>${l}</span><span class="matrixarrow" style="color:${v==null?'#999':good?'var(--good)':'var(--warn)'}">${v==null?"—":good?"▲":"▼"}</span></div>`;
      }).join("")}
    </div>
    ${s.flags.length===0?`<p style="padding:16px 18px;color:var(--dim);font-size:13px">No strong signal combinations triggered — readings are neutral.</p>`:
    Object.entries(cats).map(([cat,flags])=>`
      <div class="catlabel">${cat}</div>
      ${flags.map(f=>`
        <div class="flag ${f.s}">
          <div class="flagtop" data-flagtoggle="${f.i}">
            <span class="flagtag ${f.s}">${f.tag}</span>
            <span class="flagtxt">${f.txt}</span>
          </div>
          <div class="flagdetail" style="display:${State.learnMode?'flex':'none'}" data-flagdetail="${f.i}">
            <div><span class="flagseclbl">WHY IT MATTERS</span><p class="flagsectxt">${f.why}</p></div>
            <div><span class="flagseclbl">HOW TO READ IT</span><p class="flagsectxt">${f.how}</p></div>
          </div>
        </div>`).join("")}
    `).join("")}
  </div>`;
}

function renderSources(s){
  const enc = encodeURIComponent;
  const isUS = s.mkt==="US";
  const ySym = isUS ? s.t : `${s.t}.NS`;
  const links = isUS ? [
    ["Morningstar quote", `https://www.morningstar.com/stocks/xnas/${s.t.toLowerCase()}/quote`, "Free quote page · star rating & fair value"],
    ["SEC EDGAR filings", `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${enc(s.n)}&type=10-K`, "Primary 10-K / 10-Q filings"],
    ["Yahoo Finance", `https://finance.yahoo.com/quote/${ySym}`, "Financials, statistics, estimates"],
    ["Investor relations", `https://www.google.com/search?q=${enc(s.n+" investor relations")}`, "Annual reports, earnings decks"],
    ["Earnings call transcript", `https://www.google.com/search?q=${enc(s.n+" latest earnings call transcript")}`, "Management's own words"],
  ] : [
    ["Morningstar India", `https://www.morningstar.in/stocks/${enc(s.t)}/overview.aspx`, "Free quote & summary"],
    ["Screener.in", `https://www.screener.in/company/${s.t}/`, "Best free Indian fundamentals"],
    ["NSE filings", `https://www.nseindia.com/get-quotes/equity?symbol=${enc(s.t)}`, "Primary exchange filings"],
    ["Yahoo Finance", `https://finance.yahoo.com/quote/${ySym}`, "Financials & estimates"],
    ["Investor relations", `https://www.google.com/search?q=${enc(s.n+" investor relations annual report")}`, "Annual reports & decks"],
  ];
  return `
  <div class="sources">
    <div class="sourceshead">↗ Primary sources &amp; deeper research</div>
    <div class="sourcesgrid">
      ${links.map(([l,u,d])=>`<a class="sourcecard" href="${u}" target="_blank" rel="noopener noreferrer"><span class="sourcelabel">${l}</span><span class="sourcedesc">${d}</span></a>`).join("")}
    </div>
  </div>`;
}

function buildPrompt(s, depth){
  const A=s.annual;
  const data={ticker:s.t,name:s.n,market:s.mkt,sector:s.sec,price:s.price,intrinsicDCF:s.intrinsic,
    dcfGapPct:s.mos,marketCap:s.mcap,netDebt:s.debt,pe:s.pe,evEbitda:s.evEbitda,roe:s.roe,
    fcfToNetIncome:s.fcfNi, revenueCAGR3y:s.revCagr, fcfCAGR3y:s.fcfCagr,
    annualRevenue:A.revenue, annualEBITDA:A.ebitda, annualNetIncome:A.netIncome, annualFCF:A.fcf,
    annualMargins:A.margins, triggeredSignals:s.flags.map(f=>`[${f.cat}] ${f.tag}: ${f.txt}`)};
  const sections = depth==="full"
    ? "1. BUSINESS MODEL\n2. ECONOMIC MOAT (None/Narrow/Wide + trend)\n3. GROWTH ANALYSIS\n4. PROFITABILITY & RETURNS\n5. CASH FLOW & CAPITAL ALLOCATION\n6. BALANCE SHEET & RISK\n7. FAIR VALUE (triangulate using DCF + multiples)\n8. BULL CASE\n9. BEAR CASE\n10. VERDICT"
    : "1. SNAPSHOT\n2. MOAT (None/Narrow/Wide, one sentence)\n3. FAIR VALUE (undervalued/fair/overvalued, vs DCF)\n4. BULL CASE\n5. BEAR CASE\n6. VERDICT";
  return `You are a senior equity analyst writing an independent research brief for a non-expert investor. Use ONLY the data below — do not invent facts you can't derive from it. Use these exact section headers in CAPS:\n\n${sections}\n\n${depth==="full"?"450-650 words.":"200-300 words."} Data:\n${JSON.stringify(data)}`;
}

function buildEarningsPrompt(s, transcriptText){
  const data={ticker:s.t,name:s.n,sector:s.sec,
    recentRevenueYoY:s.revG, recentFcfYoY:s.fcfG, recentMarginTrend:s.marginTrend,
    triggeredSignals:s.flags.map(f=>`[${f.cat}] ${f.tag}`)};
  return `You are an equity analyst scoring management tone from an earnings call transcript. Read the transcript below and score it on these exact dimensions, each with a one-line justification quoting or closely paraphrasing the transcript (keep any quotes under 15 words):

TONE SCORE: rate -2 (very cautious/defensive) to +2 (very confident/bullish), with reasoning
GUIDANCE LANGUAGE: did management raise, maintain, lower, or avoid giving forward guidance? Quote the key phrase.
HEDGING & DEFLECTION: count notable instances of hedging language ("uncertain," "challenging," "headwinds," evasive answers to analyst questions) vs confident, specific language
ANALYST Q&A TENSION: did analysts push back or express skepticism? How did management respond?
COMPARED TO FUNDAMENTALS: this company's recent numbers show revenue YoY of ${s.revG!=null?s.revG.toFixed(1)+'%':'unavailable'} and FCF YoY of ${s.fcfG!=null?s.fcfG.toFixed(1)+'%':'unavailable'}. Does management's tone match the numbers, sound more optimistic than the numbers justify, or more cautious than the numbers justify? This mismatch (if any) is the most useful signal — flag it clearly.
OVERALL SENTIMENT: Bullish / Neutral / Cautious / Bearish, one paragraph summary.

If I paste multiple transcripts (separated by "---NEXT CALL---"), score each one separately using the same format, then add a final TREND ACROSS CALLS section describing whether management tone is improving, stable, or deteriorating quarter over quarter.

Company: ${JSON.stringify(data)}

TRANSCRIPT(S):
${transcriptText || "[paste the earnings call transcript here before sending — search \"" + s.n + " earnings call transcript\" to find the latest one, e.g. on Motley Fool, Seeking Alpha (free transcripts), or the company's own IR site]"}`;
}

function renderEarningsSentiment(s){
  return `
  <div class="askbox" style="background:linear-gradient(135deg,#f3eefc,#ece4fa);border-color:#d8c8f2">
    <div class="askhead">
      <div>
        <div class="asktitle" style="color:#6d3dd3">◆ Earnings call sentiment</div>
        <div class="asksub">Paste one or more recent transcripts below (separate multiple with <code>---NEXT CALL---</code> to track sentiment trend over quarters). Builds a scoring prompt and opens claude.ai — free, no API key. No bulk transcript source exists for free, so this works one stock at a time, on demand.</div>
      </div>
    </div>
    <textarea id="transcriptBox" placeholder="Paste earnings call transcript(s) here, or leave blank to get a prompt with search instructions..." style="width:100%;min-height:90px;margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:7px;font-family:var(--sans);font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
    <div class="askbtns">
      <button class="askbtn" style="background:#6d3dd3" data-earnings="${s.t}">Analyze sentiment →</button>
    </div>
    <div class="askdone" id="earningsDone">✓ Prompt copied — claude.ai opened in a new tab. Paste (Ctrl/Cmd+V) and press enter.</div>
  </div>`;
}

async function handleEarnings(ticker){
  const rows = computeRows();
  const s = rows.find(r=>r.t===ticker);
  if(!s) return;
  const box = document.getElementById("transcriptBox");
  const text = box ? box.value.trim() : "";
  const prompt = buildEarningsPrompt(s, text);
  try{ await navigator.clipboard.writeText(prompt); }
  catch(e){
    const ta=document.createElement("textarea"); ta.value=prompt; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
  }
  window.open("https://claude.ai/new", "_blank");
  const done=document.getElementById("earningsDone");
  if(done) done.classList.add("show");
}

function renderAskClaude(s){
  return `
  <div class="askbox">
    <div class="askhead">
      <div>
        <div class="asktitle">◆ Ask Claude — free research brief</div>
        <div class="asksub">Copies a data-grounded prompt for ${s.t} to your clipboard and opens claude.ai in a new tab. Paste it in and hit enter — no API key, no cost.</div>
      </div>
      <div class="askbtns">
        <button class="askbtn secondary" data-ask="concise" data-tk="${s.t}">Quick take</button>
        <button class="askbtn" data-ask="full" data-tk="${s.t}">Full research brief</button>
      </div>
    </div>
    <div class="askdone" id="askDone">✓ Prompt copied — claude.ai opened in a new tab. Paste (Ctrl/Cmd+V) and press enter.</div>
  </div>`;
}

async function handleAsk(ticker, depth){
  const rows = computeRows();
  const s = rows.find(r=>r.t===ticker);
  if(!s) return;
  const prompt = buildPrompt(s, depth);
  try{ await navigator.clipboard.writeText(prompt); }
  catch(e){
    const ta=document.createElement("textarea"); ta.value=prompt; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
  }
  window.open("https://claude.ai/new", "_blank");
  const done=document.getElementById("askDone");
  if(done) done.classList.add("show");
}

function renderSectors(){
  const rows = computeRows();
  const bySector={};
  rows.forEach(s=>{(bySector[s.sec]=bySector[s.sec]||[]).push(s);});
  const sectors = Object.entries(bySector).map(([sec,list])=>{
    const avg=k=>{const v=list.map(x=>x[k]).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
    return {sec,n:list.length,list,roe:avg("roe"),revG:avg("revG"),fcfG:avg("fcfG"),pe:avg("pe"),profile:profileFor(sec)};
  }).sort((a,b)=>(b.roe??-1)-(a.roe??-1));

  const reads = MACRO_DRIVERS.map(d=>{
    const dir = State.driverDir[d.id], isUp = dir==="up";
    let helps,hurts;
    if(d.upDriver){ helps=isUp?d.helpsWhenUp:d.hurtsWhenUp; hurts=isUp?d.hurtsWhenUp:d.helpsWhenUp; }
    else { helps=isUp?(d.hurtsWhenDown||[]):d.helpsWhenDown; hurts=isUp?d.helpsWhenDown:(d.hurtsWhenDown||[]); }
    return {...d,dir,helps,hurts};
  });
  const cycColor = c => c==="Defensive"?"var(--good)":c.includes("Cyclical")?"var(--warn)":c.includes("Growth")?"#6d5dd3":"#444";

  return `
  <div class="secintro">
    <h2>Sector cycles &amp; cross-asset read-through</h2>
    <p>Set each macro driver's direction. The board translates it into which sectors get a margin tailwind and which face a headwind. Example: push crude to <b style="color:var(--good)">down</b> and watch paints, airlines and tyres light up.</p>
  </div>

  <div class="driverboard">
    ${reads.map(d=>`
      <div class="drivercard">
        <div class="drivertop">
          <span class="drivername">${d.name}</span>
          <div class="seg">
            <button data-driver="${d.id}" data-dir="down" class="${d.dir==='down'?'on':''}" style="${d.dir==='down'?'background:#fbf3e0;color:var(--neutral)':''}">▼ Down</button>
            <button data-driver="${d.id}" data-dir="up" class="${d.dir==='up'?'on':''}" style="${d.dir==='up'?'background:var(--good-bg);color:var(--good)':''}">▲ Up</button>
          </div>
        </div>
        <div class="driverflow">
          <div class="flowcol"><span class="flowlblgood">TAILWIND →</span>${d.helps.map(x=>`<span class="chip good">${x}</span>`).join("")}</div>
          <div class="flowcol"><span class="flowlblbad">HEADWIND →</span>${d.hurts.map(x=>`<span class="chip bad">${x}</span>`).join("")}</div>
        </div>
        <p class="driverwhy">${d.why}</p>
        <p class="driverEg">↳ ${d.example}</p>
      </div>`).join("")}
  </div>

  <div class="cyclebox">
    <div class="cyclehead">WHERE ARE WE IN THE CYCLE? · sector rotation map</div>
    <div class="phaserow">
      ${CYCLE_PHASES.map((p,i)=>`<button class="phasebtn ${State.phase===i?'on':''}" data-phase="${i}">${p.ph}</button>`).join("")}
    </div>
    <div class="phasedetail">
      <p style="font-size:14px;margin:6px 0 0">${CYCLE_PHASES[State.phase].desc}</p>
      <div class="phasecols">
        <div><span class="flowlblgood">LEADERS</span><div style="margin-top:6px">${CYCLE_PHASES[State.phase].lead.map(x=>`<span class="chip good">${x}</span>`).join("")}</div></div>
        <div><span class="flowlblbad">LAGGARDS</span><div style="margin-top:6px">${CYCLE_PHASES[State.phase].lag.map(x=>`<span class="chip bad">${x}</span>`).join("")}</div></div>
      </div>
      <p style="font-size:12px;color:var(--dim);margin-top:14px;max-width:760px;line-height:1.6">Sectors rotate predictably as the economy moves through these phases. Money flows from defensives into cyclicals on the way up, and back to safety on the way down — leading the real economy by 6-12 months.</p>
    </div>
  </div>

  <div class="scorebox">
    <div class="cyclehead">YOUR UNIVERSE BY SECTOR · fundamentals + cycle profile</div>
    <div style="overflow-x:auto">
    <table class="grid" style="border:none;border-radius:0">
      <thead><tr>
        ${["Sector","#","Cycle type","Avg ROE","Avg rev YoY","Avg FCF YoY","Avg P/E","Defensiveness","Key drivers"].map(h=>`<th class="${h==="Sector"||h==="Cycle type"||h==="Key drivers"?"left":""}">${h}</th>`).join("")}
      </tr></thead>
      <tbody>
        ${sectors.map(sec=>`
          <tr class="row" data-opensector="${sec.list[0]?.t||''}">
            <td class="left" style="font-weight:700">${sec.sec}</td>
            <td>${sec.n}</td>
            <td class="left" style="color:${cycColor(sec.profile.cyc)}">${sec.profile.cyc}</td>
            <td>${sec.roe==null?"—":sec.roe.toFixed(0)+"%"}</td>
            <td style="color:${clr(sec.revG)}">${sign(sec.revG)}</td>
            <td style="color:${clr(sec.fcfG)}">${sign(sec.fcfG)}</td>
            <td>${sec.pe==null?"—":sec.pe.toFixed(0)}</td>
            <td><div class="defbar"><div class="deffill" style="width:${sec.profile.defensiveness}%;background:${sec.profile.defensiveness>60?'var(--good)':sec.profile.defensiveness>40?'var(--neutral)':'var(--warn)'}"></div></div></td>
            <td class="left" style="font-size:11px;color:var(--dim)">${sec.profile.drivers.join(" · ")||"—"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    </div>
    <p style="font-size:11.5px;color:var(--dim);padding:12px 18px;margin:0">Defensiveness = how steady earnings stay through a downturn. Click a sector row to jump to a constituent. Averages are equal-weighted across names in your dataset.</p>
  </div>`;
}

function renderCompare(){
  if(State.compare.length===0){
    return `
    <div class="secintro">
      <h2>Compare stocks</h2>
      <p>Pick up to 5 stocks to line up side by side across valuation, growth, cash quality, and balance-sheet metrics. Click the <b>+</b> icon next to any stock in the Stocks tab, or "+ Add to compare" on a tearsheet.</p>
    </div>
    <div class="panel" style="text-align:center;padding:50px 20px;color:var(--dim)">No stocks selected yet. Go to the Stocks tab and click + on a few names.</div>`;
  }
  const rows = computeRows();
  const stocks = State.compare.map(t=>rows.find(r=>r.t===t)).filter(Boolean);
  const colW = `${Math.floor(100/(stocks.length+1))}%`;

  const metricRows = [
    ["Price", s=>fmtP(s.price,s.mkt)],
    ["Market cap", s=>fmtB(s.mcap,s.mkt)],
    ["DCF intrinsic value", s=>fmtP(s.intrinsic,s.mkt)],
    ["DCF gap", s=>sign(s.mos), s=>clr(s.mos)],
    ["P/E", s=>s.pe==null?"—":s.pe.toFixed(1)],
    ["EV/EBITDA", s=>s.evEbitda==null?"—":s.evEbitda.toFixed(1)],
    ["PEG", s=>s.peg==null?"—":s.peg.toFixed(2)],
    ["Revenue YoY", s=>sign(s.revG), s=>clr(s.revG)],
    ["Revenue CAGR 3y", s=>sign(s.revCagr), s=>clr(s.revCagr)],
    ["FCF YoY", s=>sign(s.fcfG), s=>clr(s.fcfG)],
    ["FCF CAGR 3y", s=>sign(s.fcfCagr), s=>clr(s.fcfCagr)],
    ["Net margin", s=>s.nmNow==null?"—":s.nmNow.toFixed(1)+"%"],
    ["EBITDA margin", s=>s.emNow==null?"—":s.emNow.toFixed(1)+"%"],
    ["FCF / Net income", s=>s.fcfNi==null?"—":s.fcfNi.toFixed(2), s=>s.fcfNi>=1?"var(--good)":s.fcfNi<0.8?"var(--warn)":"#444"],
    ["FCF yield", s=>s.fcfYield==null?"—":s.fcfYield.toFixed(1)+"%"],
    ["ROE", s=>s.roe==null?"—":s.roe.toFixed(0)+"%"],
    ["ROA", s=>s.roa==null?"—":s.roa.toFixed(0)+"%"],
    ["Net debt / EBITDA", s=>s.debtToEbitda==null?(s.debt<0?"net cash":"—"):s.debtToEbitda.toFixed(1)+"×"],
    ["Net debt / Mkt cap", s=>(s.debt/s.mcap*100).toFixed(0)+"%"],
    ["Health score", s=>s.healthScore, s=>s.healthScore>66?"var(--good)":s.healthScore>40?"var(--neutral)":"var(--warn)"],
    ["Signal", s=>s.verdict.l, s=>s.verdict.c],
  ];

  // best-in-row highlighting for the numeric ones (higher = better, except PEG/PE/debt where lower = better)
  const lowerBetter = new Set(["P/E","EV/EBITDA","PEG","Net debt / EBITDA","Net debt / Mkt cap"]);

  return `
  <div class="secintro">
    <h2>Compare stocks</h2>
    <p>${stocks.length} of 5 selected. Click × to remove, or go to Stocks/tearsheets to add more.</p>
  </div>
  <div class="presets" style="margin-bottom:18px">
    ${stocks.map(s=>`<button class="preset on" data-cmp="${s.t}">${s.t} <span class="n">×</span></button>`).join("")}
  </div>

  <div style="overflow-x:auto">
  <table class="grid">
    <thead><tr>
      <th class="left" style="width:${colW}">Metric</th>
      ${stocks.map(s=>`<th class="left" style="width:${colW}"><span class="tname" style="cursor:pointer" data-open="${s.t}">${s.t}</span><span class="tsub">${s.n}</span></th>`).join("")}
    </tr></thead>
    <tbody>
      ${metricRows.map(([label,fn,colorFn])=>`
        <tr>
          <td class="left" style="color:var(--dim);font-size:12.5px">${label}</td>
          ${stocks.map(s=>`<td class="left" style="font-weight:700;${colorFn?`color:${colorFn(s)}`:''}">${fn(s)}</td>`).join("")}
        </tr>`).join("")}
    </tbody>
  </table>
  </div>

  <div class="panelgrid" style="margin-top:18px">
    <div class="panel wide">
      <div class="panelhead"><span class="panelt">Revenue trend (annual)</span><span class="panels">overlaid, last 4 years</span></div>
      ${svgLineChart(stocks.map((s,i)=>({color:CMP_COLORS[i%CMP_COLORS.length],data:s.annual.revenue})), stocks[0]?.annual.periods||[])}
      <div class="legend">${stocks.map((s,i)=>`<span class="legitem"><i style="background:${CMP_COLORS[i%CMP_COLORS.length]}"></i>${s.t}</span>`).join("")}</div>
    </div>
    <div class="panel wide">
      <div class="panelhead"><span class="panelt">Free cash flow trend (annual)</span><span class="panels">overlaid, last 4 years</span></div>
      ${svgLineChart(stocks.map((s,i)=>({color:CMP_COLORS[i%CMP_COLORS.length],data:s.annual.fcf})), stocks[0]?.annual.periods||[])}
      <div class="legend">${stocks.map((s,i)=>`<span class="legitem"><i style="background:${CMP_COLORS[i%CMP_COLORS.length]}"></i>${s.t}</span>`).join("")}</div>
    </div>
  </div>
  <p class="hint">Note: charts overlay raw values across markets/currencies — comparing US (USD bn) and India (INR cr) trend shapes is fine, but absolute scale differs. Use the metric table above for cross-market comparisons.</p>
  `;
}
const CMP_COLORS=["#0e6e5c","#6d5dd3","#c0392b","#b8860b","#2563eb"];

function renderWatchDrawer(){
  if(!State.showWatchlist) return "";
  const rows = computeRows().filter(s=>State.watchlist.includes(s.t));
  return `
  <div class="watchlist show">
    <div style="font-weight:700;margin-bottom:10px">★ Your watchlist</div>
    ${rows.length===0?`<div class="watchempty">No stocks pinned yet — click the star on any row or tearsheet to add one.</div>`:
    rows.map(s=>`<div class="watchrow"><span data-open="${s.t}" style="cursor:pointer;font-weight:600">${s.t} <span style="color:var(--dim);font-weight:400">${s.n}</span></span><span style="color:${clr(s.mos)}">${sign(s.mos)} vs DCF</span></div>`).join("")}
  </div>`;
}

function render(){
  const root = document.getElementById("root");
  root.innerHTML = `
    ${renderHeader()}
    <div class="wrap">
      ${renderWatchDrawer()}
      ${State.tab==="sectors" ? renderSectors() : State.tab==="compare" ? renderCompare() : (State.sel ? renderTearsheet(State.sel) : renderScreener())}
    </div>
  `;
  wireEvents();
}

function wireEvents(){
  const root = document.getElementById("root");

  root.querySelectorAll("[data-tab]").forEach(el=>el.onclick=()=>{State.tab=el.dataset.tab;State.sel=null;render();});
  const watchToggle=document.getElementById("watchToggle");
  if(watchToggle) watchToggle.onclick=()=>{State.showWatchlist=!State.showWatchlist;render();};

  root.querySelectorAll("[data-preset]").forEach(el=>el.onclick=()=>{State.preset=el.dataset.preset;render();});
  root.querySelectorAll("[data-mkt]").forEach(el=>el.onclick=()=>{State.mkt=el.dataset.mkt;render();});
  root.querySelectorAll("[data-cap]").forEach(el=>el.onclick=()=>{State.capTier=el.dataset.cap;render();});
  root.querySelectorAll("[data-sort]").forEach(el=>el.onclick=()=>{State.sort=el.dataset.sort;render();});
  const searchBox=document.getElementById("searchBox");
  if(searchBox){ searchBox.oninput=e=>{State.q=e.target.value;render();}; searchBox.focus(); searchBox.setSelectionRange(State.q.length,State.q.length); }

  root.querySelectorAll("[data-open]").forEach(el=>el.onclick=(e)=>{ if(e.target.closest('[data-star]')||e.target.closest('[data-cmp]'))return; State.sel=el.dataset.open;State.kpiExpanded=false;render();});
  root.querySelectorAll("[data-opensector]").forEach(el=>el.onclick=()=>{ if(el.dataset.opensector){State.sel=el.dataset.opensector;State.tab="stocks";render();}});
  const backBtn=document.getElementById("backBtn");
  if(backBtn) backBtn.onclick=()=>{State.sel=null;render();};

  root.querySelectorAll("[data-star]").forEach(el=>el.onclick=(e)=>{e.stopPropagation();toggleWatch(el.dataset.star);});
  root.querySelectorAll("[data-cmp]").forEach(el=>el.onclick=(e)=>{e.stopPropagation();toggleCompare(el.dataset.cmp);});

  const kpiToggle=document.getElementById("kpiToggle");
  if(kpiToggle) kpiToggle.onclick=()=>{State.kpiExpanded=!State.kpiExpanded;render();};

  root.querySelectorAll("[data-view]").forEach(el=>el.onclick=()=>{State.view=el.dataset.view;render();});

  const discountSlider=document.getElementById("discountSlider");
  if(discountSlider) discountSlider.oninput=e=>{State.discount=+e.target.value;render();};
  const termSlider=document.getElementById("termSlider");
  if(termSlider) termSlider.oninput=e=>{State.termGrowth=+e.target.value;render();};

  const learnToggle=document.getElementById("learnToggle");
  if(learnToggle) learnToggle.onclick=()=>{State.learnMode=!State.learnMode;render();};
  root.querySelectorAll("[data-flagtoggle]").forEach(el=>el.onclick=()=>{
    if(State.learnMode) return;
    const detail=root.querySelector(`[data-flagdetail="${el.dataset.flagtoggle}"]`);
    if(detail) detail.style.display = detail.style.display==="none" ? "flex" : "none";
  });

  root.querySelectorAll("[data-ask]").forEach(el=>el.onclick=()=>handleAsk(el.dataset.tk, el.dataset.ask));
  root.querySelectorAll("[data-earnings]").forEach(el=>el.onclick=()=>handleEarnings(el.dataset.earnings));

  root.querySelectorAll("[data-driver]").forEach(el=>el.onclick=()=>{State.driverDir[el.dataset.driver]=el.dataset.dir;render();});
  root.querySelectorAll("[data-phase]").forEach(el=>el.onclick=()=>{State.phase=+el.dataset.phase;render();});
}

render();
