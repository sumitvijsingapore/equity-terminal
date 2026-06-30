/* ============================================================
   ENGINE.JS — data, formatting, DCF, and the signal-analysis
   engine. No framework. Loads data.json; falls back to SAMPLE.
   ============================================================ */

const YRS = ["2024","2023","2022","2021"];
const QTRS = ["Q4'24","Q3'24","Q2'24","Q1'24","Q4'23","Q3'23","Q2'23","Q1'23"];

function marginsOf(rev,g,o,e,n,f){
  return rev.map((r,i)=>({
    gross:g?+(g[i]/r*100).toFixed(1):null,
    operating:+(o[i]/r*100).toFixed(1),
    ebitda:+(e[i]/r*100).toFixed(1),
    net:+(n[i]/r*100).toFixed(1),
    fcf:+(f[i]/r*100).toFixed(1),
  }));
}
function mk(t,n,mkt,sec,ind,price,shares,mcap,ev,debt,g,mult,A,Q){
  return {t,n,mkt,sec,ind,price,shares,mcap,ev,debt,g,...mult,
    annual:{periods:YRS,...A,margins:marginsOf(A.revenue,A.grossProfit,A.operatingIncome,A.ebitda,A.netIncome,A.fcf)},
    quarterly:{periods:QTRS,...Q,margins:marginsOf(Q.revenue,null,Q.operatingIncome,Q.ebitda,Q.netIncome,Q.fcf)}};
}

const SAMPLE=[
 mk("AAPL","Apple Inc.","US","Technology","Consumer Electronics",213,15.2,3238,3258,50,8,
  {pe:33,fpe:30,pb:51,ps:8.3,evEbitda:24,divYield:0.5,roe:147,roa:29,beta:1.25,high52:237,low52:164},
  {revenue:[391,383,394,366],grossProfit:[180,169,171,153],operatingIncome:[123,114,119,109],ebitda:[135,126,130,120],netIncome:[94,97,100,95],ocf:[118,111,122,104],capex:[-10,-11,-11,-11],fcf:[108,100,111,93]},
  {revenue:[124,95,86,91,120,90,82,95],operatingIncome:[42,29,26,28,40,27,23,30],ebitda:[46,33,30,32,44,31,27,34],netIncome:[36,15,21,24,34,23,20,28],fcf:[35,21,22,28,33,19,21,27]}),
 mk("MSFT","Microsoft Corp.","US","Technology","Software—Infrastructure",497,7.43,3693,3663,-30,13,
  {pe:38,fpe:33,pb:11,ps:14,evEbitda:25,divYield:0.7,roe:35,roa:18,beta:0.9,high52:510,low52:385},
  {revenue:[245,212,198,168],grossProfit:[171,146,135,115],operatingIncome:[109,89,83,70],ebitda:[129,105,98,82],netIncome:[88,72,73,61],ocf:[119,87,89,77],capex:[-45,-28,-24,-21],fcf:[74,59,65,56]},
  {revenue:[70,65,62,62,62,57,56,53],operatingIncome:[32,29,28,28,27,25,24,22],ebitda:[37,34,33,32,32,30,29,27],netIncome:[26,25,22,22,22,20,18,17],fcf:[20,21,17,20,19,17,16,15]}),
 mk("NVDA","NVIDIA Corp.","US","Technology","Semiconductors",158,24.6,3887,3857,-30,25,
  {pe:53,fpe:38,pb:48,ps:30,evEbitda:42,divYield:0.02,roe:119,roa:80,beta:1.6,high52:174,low52:86},
  {revenue:[130,61,27,27],grossProfit:[98,44,15,17],operatingIncome:[81,33,4,10],ebitda:[83,35,6,11],netIncome:[73,30,4,9],ocf:[64,28,5,9],capex:[-4,-1,-1,-1],fcf:[60,27,4,8]},
  {revenue:[39,35,30,26,22,18,13,7],operatingIncome:[24,22,18,17,14,11,7,3],ebitda:[25,23,19,18,15,12,8,4],netIncome:[22,19,17,15,12,9,6,2],fcf:[16,15,15,14,11,8,6,3]}),
 mk("META","Meta Platforms","US","Communication Services","Internet Content",710,2.53,1796,1826,-30,14,
  {pe:29,fpe:26,pb:9,ps:11,evEbitda:18,divYield:0.3,roe:36,roa:24,beta:1.2,high52:740,low52:442},
  {revenue:[164,135,116,118],grossProfit:[134,108,92,93],operatingIncome:[69,47,29,47],ebitda:[87,62,42,57],netIncome:[62,39,23,39],ocf:[91,71,50,57],capex:[-37,-28,-32,-19],fcf:[54,43,18,38]},
  {revenue:[48,41,39,36,40,34,32,29],operatingIncome:[23,17,15,14,16,13,11,7],ebitda:[28,22,20,18,21,18,15,11],netIncome:[21,16,13,12,14,12,8,5],fcf:[13,15,11,15,12,10,5,11]}),
 mk("RELIANCE","Reliance Industries","IN","Energy","Oil & Gas Refining",1490,1353,201600,317600,116000,10,
  {pe:25,fpe:21,pb:2.1,ps:2.0,evEbitda:11,divYield:0.4,roe:8.5,roa:3.8,beta:1.0,high52:1609,low52:1115},
  {revenue:[1000000,974000,976000,792000],grossProfit:null,operatingIncome:[145000,138000,130000,110000],ebitda:[178000,166000,158000,128000],netIncome:[79000,73000,67000,60000],ocf:[160000,115000,110000,98000],capex:[-125000,-118000,-141000,-95000],fcf:[35000,-3000,-31000,3000]},
  {revenue:[267000,258000,250000,236000],operatingIncome:[40000,38000,36000,34000],ebitda:[48000,45000,44000,42000],netIncome:[21000,19000,18000,17000],fcf:[12000,8000,9000,6000]}),
 mk("TCS","Tata Consultancy","IN","Technology","IT Services",3450,362,124890,74890,-50000,9,
  {pe:27,fpe:25,pb:14,ps:6.0,evEbitda:18,divYield:1.4,roe:51,roa:38,beta:0.7,high52:4585,low52:3060},
  {revenue:[255000,240000,225000,191000],grossProfit:null,operatingIncome:[62000,57000,53000,46000],ebitda:[68000,63000,58000,50000],netIncome:[46000,45000,42000,38000],ocf:[48000,42000,40000,35000],capex:[-6000,-4000,-3000,-3000],fcf:[42000,38000,37000,32000]},
  {revenue:[64000,64000,62000,61000],operatingIncome:[16000,15500,15000,15000],ebitda:[17500,17000,16500,16000],netIncome:[12000,11900,11000,11000],fcf:[11000,10000,10500,10000]}),
 mk("HDFCBANK","HDFC Bank","IN","Financial Services","Banks—Regional",1980,765,151470,151470,0,14,
  {pe:21,fpe:18,pb:2.8,ps:4.6,evEbitda:null,divYield:1.0,roe:17,roa:1.9,beta:0.9,high52:2038,low52:1588},
  {revenue:[330000,205000,170000,146000],grossProfit:null,operatingIncome:[88000,55000,46000,41000],ebitda:[90000,57000,47000,42000],netIncome:[65000,46000,44000,38000],ocf:[70000,50000,45000,40000],capex:[-5000,-4000,-3000,-3000],fcf:[65000,46000,42000,37000]},
  {revenue:[85000,82000,80000,78000],operatingIncome:[23000,22000,21000,20000],ebitda:[23500,22500,21500,20500],netIncome:[17000,16500,16000,15500],fcf:[16500,16000,15500,15000]}),
 mk("INFY","Infosys","IN","Technology","IT Services",1560,415,64740,34740,-30000,9,
  {pe:25,fpe:23,pb:8,ps:4.0,evEbitda:15,divYield:2.3,roe:32,roa:23,beta:0.8,high52:2007,low52:1352},
  {revenue:[163000,153000,146000,121000],grossProfit:null,operatingIncome:[34000,32000,31000,27000],ebitda:[37000,35000,33000,29000],netIncome:[26000,25000,24000,22000],ocf:[31000,27000,25000,23000],capex:[-3000,-2000,-2000,-2000],fcf:[28000,25000,23000,21000]},
  {revenue:[41000,40000,39000,38000],operatingIncome:[8700,8500,8200,8000],ebitda:[9400,9200,8900,8700],netIncome:[6600,6500,6400,6300],fcf:[7000,6800,6500,6200]}),
];

/* ---------- formatting ---------- */
const curOf = m => m==="US" ? "$" : "₹";
const fmtB = (v,m) => v==null ? "—" : (m==="US" ? `$${v.toFixed(1)}B` : `₹${(v/1000).toFixed(1)}k cr`);
const fmtP = (v,m) => v==null ? "—" : curOf(m)+v.toLocaleString(undefined,{maximumFractionDigits:0});
const sign = v => v==null ? "—" : `${v>0?"+":""}${v.toFixed(1)}%`;
const xMult = v => v==null ? "—" : `${v.toFixed(1)}×`;
const pctStr = v => v==null ? "—" : `${v.toFixed(1)}%`;

/* ---------- growth math ---------- */
const arr = v => Array.isArray(v) ? v : [];
const yoy = s => { const a=arr(s); return (a.length>1 && a[1]) ? (a[0]-a[1])/Math.abs(a[1])*100 : null; };
const qoq = yoy;
const cagr = s => {
  const a = arr(s).filter(v=>v!=null);
  if (a.length<2 || a.some(v=>v<=0)) return null;
  return (Math.pow(a[0]/a[a.length-1], 1/(a.length-1))-1)*100;
};

/* ---------- DCF (two-stage) ---------- */
function dcf(s,{discount,termGrowth,years}){
  const r=discount/100, tg=termGrowth/100, g0=s.g/100;
  const base = arr(s.annual.fcf)[0];
  if (base==null || base<=0) return null;
  let pv=0, fcf=base;
  for (let y=1;y<=years;y++){
    const gr = g0*(1-(y-1)/years) + tg*((y-1)/years);
    fcf *= (1+gr);
    pv += fcf/Math.pow(1+r,y);
  }
  pv += (fcf*(1+tg))/(r-tg) / Math.pow(1+r,years);
  return (pv - s.debt) / s.shares;
}

/* ---------- normalize a stock record so nothing ever crashes ---------- */
function normalize(x){
  const na = v => Array.isArray(v) ? v : [];
  const normSeries = obj => ({
    periods: na(obj?.periods), revenue: na(obj?.revenue), ebitda: na(obj?.ebitda),
    netIncome: na(obj?.netIncome), fcf: na(obj?.fcf), ocf: na(obj?.ocf), capex: na(obj?.capex),
    operatingIncome: na(obj?.operatingIncome), grossProfit: na(obj?.grossProfit), margins: na(obj?.margins),
  });
  return { ...x, annual: normSeries(x.annual), quarterly: normSeries(x.quarterly) };
}

/* ============================================================
   SIGNAL ENGINE — 20 factor-combination checks, each with a
   plain read, why it matters, and how to read it (teaching).
   ============================================================ */
function analyze(raw, intrinsic){
  const s = normalize(raw);
  const A = s.annual, Q = s.quarterly;
  const at0 = v => (v.length && v[0]!=null) ? v[0] : null;

  const revG=yoy(A.revenue), niG=yoy(A.netIncome), fcfG=yoy(A.fcf), ebitdaG=yoy(A.ebitda);
  const revQ=qoq(Q.revenue), fcfQ=qoq(Q.fcf), niQ=qoq(Q.netIncome);
  const m0=A.margins[0]||{}, m1=A.margins[1]||{};
  const nmNow=m0.net??null, nmPrev=m1.net??null;
  const omNow=m0.operating??null, omPrev=m1.operating??null;
  const emNow=m0.ebitda??null;
  const fcfmNow=m0.fcf??null;
  const marginTrend=(nmNow!=null&&nmPrev!=null)?nmNow-nmPrev:null;
  const opMarginTrend=(omNow!=null&&omPrev!=null)?omNow-omPrev:null;
  const f0=at0(A.fcf), ni0=at0(A.netIncome), ebitda0=at0(A.ebitda), rev0=at0(A.revenue), capex0=at0(A.capex);
  const fcfNi=(f0!=null&&ni0)?f0/ni0:null;
  const mos=intrinsic?(intrinsic-s.price)/s.price*100:null;
  const pricePos=(s.high52&&s.low52)?(s.price-s.low52)/(s.high52-s.low52)*100:null;
  const fcfYield=(f0!=null&&s.mcap)?f0/s.mcap*100:null;
  const earnYield=s.pe?100/s.pe:null;
  const ruleOf40=(revG!=null&&fcfmNow!=null)?revG+fcfmNow:null;
  const debtToEbitda=(ebitda0&&ebitda0>0)?s.debt/ebitda0:null;
  const revPrior = A.revenue.length>1 ? yoy(A.revenue.slice(1)) : null;
  const revDecel=(revG!=null&&revPrior!=null)?revG-revPrior:null;
  const peg=(s.pe&&niG&&niG>0)?s.pe/niG:null;
  const capexIntensity=(capex0!=null&&rev0)?Math.abs(capex0)/rev0*100:null;

  const up=(v,t=2)=>v!=null&&v>t, dn=(v,t=-2)=>v!=null&&v<t;
  const F=[];
  const add=(sev,cat,tag,txt,why,how)=>F.push({s:sev,cat,tag,txt,why,how});

  if(up(revG)&&dn(fcfG))add("warn","Growth","Cash divergence",
    "Revenue is rising while free cash flow is falling — growth is consuming cash rather than producing it.",
    "Revenue can be booked before cash arrives. When sales climb but cash drops, the gap usually hides in unpaid customer invoices, unsold stock, or heavy capex. A business can look profitable and still run out of money.",
    "Check the Cash bridge. If Operating CF is flat while revenue rises, working capital is the leak. If capex spiked instead, it may just be an investment phase.");
  if(revDecel!=null&&revDecel<-5&&up(revG))add("warn","Growth","Growth decelerating",
    `Still growing, but the rate slowed about ${Math.abs(revDecel).toFixed(0)} points versus the prior year.`,
    "Markets price the change in growth rate, not just growth itself. Deceleration is the most common trigger for a high-multiple stock falling, even while still growing.",
    "Compare each year's revenue step-up — is it shrinking? Pair with valuation: a slowing grower on a high P/E is riskier than the same slowdown on a cheap multiple.");
  if(up(revG,8)&&up(fcfG,8)&&(marginTrend==null||marginTrend>-0.5))add("good","Growth","Clean compounding",
    "Revenue and free cash flow are growing together with stable margins — the highest-quality growth profile.",
    "When cash flow grows as fast as sales, the business scales without losing efficiency, letting it reinvest or return capital from its own engine.",
    "Confirm the FCF line tracks revenue rather than flattening, across several years not just one.");
  if(up(revG)&&marginTrend!=null&&marginTrend<-1)add("warn","Margins","Margin compression",
    "Sales grew but net margin contracted — converting less of each rupee/dollar of revenue into profit.",
    "Shrinking margins during growth usually mean discounting to win share, or costs rising faster than pricing power can offset.",
    "Check whether operating margin (the core business) or only net margin (often one-off items) is the one falling.");
  if(opMarginTrend!=null&&opMarginTrend>1.5)add("good","Margins","Operating leverage",
    `Operating margin expanded about ${opMarginTrend.toFixed(1)} points — costs growing slower than revenue.`,
    "Once fixed costs are covered, extra revenue drops mostly to profit. Expanding margin while growing is proof the model gets more profitable at scale.",
    "Make sure margin expanded because revenue grew, not because costs were cut in a shrinking business.");
  if(emNow!=null&&emNow>30)add("good","Margins","Premium profitability",
    `EBITDA margin near ${emNow.toFixed(0)}% — keeps an unusually large share of revenue as cash profit.`,
    "High, durable margins are the fingerprint of a moat — brand, network, or switching costs that block price competition.",
    "Check durability across years on the margin ladder chart — steady or rising is a moat, choppy is cyclical.");
  if(fcfNi!=null&&fcfNi<0.8)add("warn","Cash quality","Low cash conversion",
    `Only about ${(fcfNi*100).toFixed(0)}% of reported profit shows up as cash (FCF/NI ${fcfNi.toFixed(2)}).`,
    "Net income is an accounting opinion; free cash flow is a fact. A persistent gap is one of the most reliable predictors of future disappointment.",
    "A single low year can be a capex cycle. A multi-year pattern is the real warning sign — check the Cash bridge.");
  if(fcfNi!=null&&fcfNi>=1)add("good","Cash quality","High earnings quality",
    `Free cash flow meets or exceeds net income (FCF/NI ${fcfNi.toFixed(2)}) — profit fully backed by cash.`,
    "No gap to hide bad news in. The quiet signature of a high-quality business.",
    "Confirm it holds across multiple years, then combine with high ROE for the gold standard.");
  if(fcfYield!=null&&fcfYield>5)add("good","Cash quality","Strong owner yield",
    `Free-cash-flow yield around ${fcfYield.toFixed(1)}% — cash thrown off relative to price.`,
    "FCF yield is what you'd earn if the business paid out all its free cash to you. Compare to a bond yield — but this stream can grow.",
    "Compare to the 10-year government bond yield in that market. Well above it = cheap; below it = paying up for growth.");
  if(mos!=null&&mos>20&&up(fcfG))add("good","Valuation","Value + momentum",
    `Trades roughly ${mos.toFixed(0)}% below DCF value while cash flow still grows — cheap and improving at once.`,
    "Cheap relative to intrinsic value gives a margin of safety; growing cash flow means that value is rising while you wait.",
    "Push the discount rate to 12-13% and terminal growth to 2%. If it still looks cheap, the margin of safety is real.");
  if(mos!=null&&mos<-25)add("warn","Valuation","Priced for perfection",
    `Market price sits about ${Math.abs(mos).toFixed(0)}% above intrinsic value — years of flawless execution already priced in.`,
    "A rich valuation removes your safety net — even a small stumble can trigger a sharp re-rating when expectations are this high.",
    "Raise your DCF growth assumption until intrinsic = price. If that rate looks heroic versus history, the risk is asymmetric.");
  if(peg!=null&&peg<1&&niG>0)add("good","Valuation","Growth at reasonable price",
    `P/E low relative to earnings growth (PEG ≈ ${peg.toFixed(2)}) — not overpaying for the growth you're getting.`,
    "PEG normalises P/E for growth. Below 1.0 traditionally signals growth bought without a premium.",
    "Use a conservative growth estimate, not one hot year. Avoid PEG entirely on cyclicals or financials.");
  if(s.evEbitda!=null&&s.evEbitda<10&&emNow!=null&&emNow>15)add("good","Valuation","Cheap on cash earnings",
    `EV/EBITDA around ${s.evEbitda.toFixed(1)}× on a healthy ${emNow.toFixed(0)}% margin — inexpensive vs operating cash profit.`,
    "EV/EBITDA values the whole business including debt, the multiple acquirers actually use. Under ~10× on solid margins is historically cheap.",
    "Pair with FCF yield — EV/EBITDA ignores capex, so a capital-hungry business can look falsely cheap on this metric alone.");
  if(s.debt<0)add("good","Balance sheet","Net cash fortress",
    "Holds more cash than debt — can fund buybacks, acquisitions, or survive a downturn without raising money.",
    "A net-cash company controls its own destiny and can act when leveraged rivals are forced to retrench.",
    "Great unless lazy — check whether cash is being returned or reinvested at high ROE, not just sitting idle.");
  if(debtToEbitda!=null&&debtToEbitda>3)add("warn","Balance sheet","Elevated leverage",
    `Net debt is roughly ${debtToEbitda.toFixed(1)}× EBITDA.`,
    "Above ~3× EBITDA, little room for error — a downturn or rate rise can force emergency action, and equity holders are wiped first.",
    "Judge against business stability. Watch the trend — rising leverage into a slowdown is the dangerous combination.");
  else if(debtToEbitda!=null&&debtToEbitda>0&&debtToEbitda<1.5)add("good","Balance sheet","Conservative leverage",
    `Net debt only about ${debtToEbitda.toFixed(1)}× EBITDA — comfortably serviceable.`,
    "Modest, cheap debt that disciplines management while retaining flexibility to invest or weather a downturn.",
    "Pair with high ROE for the ideal combination — returns earned from the business, not borrowed.");
  if(s.roe!=null&&s.roe>20&&(fcfNi==null||fcfNi>0.8))add("good","Returns","High returns on capital",
    `ROE around ${s.roe.toFixed(0)}% with sound cash conversion — compounds shareholder capital efficiently.`,
    "Sustained high ROE usually signals a competitive advantage — a business that can reinvest at high rates.",
    "Check ROE isn't manufactured by debt — compare with ROA. High on both is the real thing.");
  if(s.roe!=null&&s.roa!=null&&s.roe>15&&s.roa<3&&s.debt>0)add("warn","Returns","Returns are leverage-driven",
    `ROE looks strong (${s.roe.toFixed(0)}%) but ROA is thin (${s.roa.toFixed(1)}%) — mostly borrowing, not operations.`,
    "The gap between ROE and ROA is leverage. It amplifies a mediocre underlying return and reverses violently in bad times.",
    "Normal for banks (ROA ~1%+ with mid-teens ROE is sound); a red flag elsewhere.");
  if(revQ!=null&&revQ<-3)add("warn","Momentum","Sequential slowdown",
    `Latest quarter revenue fell about ${Math.abs(revQ).toFixed(0)}% versus the prior quarter.`,
    "QoQ is the earliest read on a turning business, but also the noisiest — many businesses are seasonal.",
    "Check the same quarter a year ago to strip out seasonality. A drop confirmed both QoQ and YoY is the real signal.");
  if(revQ!=null&&niQ!=null&&revQ>2&&niQ>revQ*1.5)add("good","Momentum","Profit outpacing sales",
    "Latest quarter's profit grew faster than revenue — early evidence of operating leverage or improving mix.",
    "Caught early in quarterly data, this often precedes upward earnings revisions, which is what tends to move stocks.",
    "Confirm it's operational and not a one-off tax benefit or asset sale.");

  const goods=F.filter(f=>f.s==="good").length, warns=F.filter(f=>f.s==="warn").length;
  const verdict = goods-warns>=2 ? {l:"Constructive",c:"#1a8a63"} : warns-goods>=2 ? {l:"Caution",c:"#c0392b"} : {l:"Mixed signals",c:"#b8860b"};

  return { ...s, intrinsic, revG,niG,fcfG,ebitdaG,revQ,fcfQ,niQ,marginTrend,opMarginTrend,fcfNi,mos,pricePos,
    nmNow,omNow,emNow, fcfYield,earnYield,ruleOf40,debtToEbitda,revDecel,peg,capexIntensity,
    revCagr:cagr(A.revenue), fcfCagr:cagr(A.fcf), niCagr:cagr(A.netIncome),
    flags:F, verdict,
    healthScore: Math.round(Math.max(0,Math.min(100,
      50 + (goods*9) - (warns*9) + (fcfNi!=null?(fcfNi-1)*8:0) + (s.roe!=null?Math.min(s.roe,30)/3:0)
    ))) };
}

/* ---------- one-line plain-English takeaway per stock ---------- */
function takeaway(s){
  const bits=[];
  if(s.mos!=null) bits.push(s.mos>15?`trading ${s.mos.toFixed(0)}% below estimated value`:
    s.mos<-15?`trading ${Math.abs(s.mos).toFixed(0)}% above estimated value`:"trading near estimated value");
  if(s.revG!=null&&s.fcfG!=null){
    if(s.revG>0&&s.fcfG>0) bits.push("with revenue and cash flow both growing");
    else if(s.revG>0&&s.fcfG<0) bits.push("with revenue up but cash flow falling");
    else if(s.revG<0) bits.push("with revenue declining");
  }
  const lead = bits.length ? bits.join(", ") : "limited recent trend data";
  const tone = s.verdict.l==="Constructive" ? "a constructive setup" :
               s.verdict.l==="Caution" ? "several caution flags" : "a mixed picture";
  return `${s.n} is ${lead} — ${tone}.`;
}
