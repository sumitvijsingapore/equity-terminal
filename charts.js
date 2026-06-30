/* ============================================================
   CHARTS.JS — tiny SVG chart helpers (no library) + sector
   cycle intelligence knowledge base.
   ============================================================ */

function svgBarChart(series, labels, color, height){
  height = height||130;
  const data=[...series].reverse(), labs=[...labels].reverse();
  const vals=data.map(v=>v||0);
  const max=Math.max(...vals,0), min=Math.min(...vals,0), span=(max-min)||1;
  const zero = max>0&&min<0 ? max/span*100 : (min>=0?100:0);
  const w=data.length?100/data.length:100;
  const bars=data.map((v,i)=>{
    const val=v||0, h=Math.abs(val)/span*100, y=val>=0?zero-h:zero, neg=val<0;
    return `<rect x="${i*w+w*0.18}" width="${w*0.64}" y="${y}" height="${Math.max(h,0.5)}"
      fill="${neg?'#c0392b':color}" opacity="${i===data.length-1?1:0.5}" rx="0.6"/>`;
  }).join("");
  const labelsHtml = labs.map(l=>`<span style="width:${w}%;text-align:center;font-size:10px;color:#8a8a86;font-family:var(--mono)">${l}</span>`).join("");
  return `<div style="width:100%">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:${height}px;display:block">
      <line x1="0" y1="${zero}" x2="100" y2="${zero}" stroke="#e3e1db" stroke-width="0.5"/>
      ${bars}
    </svg>
    <div style="display:flex">${labelsHtml}</div>
  </div>`;
}

function svgLineChart(datasets, labels, height){
  height = height||150;
  const allLabs=[...labels].reverse();
  const series=datasets.map(d=>({...d,data:[...d.data].reverse()}));
  const flat=series.flatMap(s=>s.data.filter(v=>v!=null));
  const max=Math.max(...flat,0), min=Math.min(...flat,0), span=(max-min)||1;
  const n=allLabs.length;
  const xpos=i=>n>1?i/(n-1)*100:50;
  const ypos=v=>100-((v-min)/span*92+4);
  const lines=series.map(s=>{
    const pts=s.data.map((v,i)=>v==null?null:`${xpos(i)},${ypos(v)}`).filter(Boolean).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  }).join("");
  const dots=series.map(s=>s.data.map((v,i)=>v==null?"":`<circle cx="${xpos(i)}" cy="${ypos(v)}" r="1.3" fill="${s.color}"/>`).join("")).join("");
  const gridlines=[0.25,0.5,0.75].map(g=>`<line x1="0" y1="${g*100}" x2="100" y2="${g*100}" stroke="#eeece6" stroke-width="0.3"/>`).join("");
  const labelsHtml = allLabs.map(l=>`<span style="font-size:10px;color:#8a8a86;font-family:var(--mono)">${l}</span>`).join("");
  return `<div style="width:100%">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:${height}px;display:block">
      ${gridlines}${lines}${dots}
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:4px">${labelsHtml}</div>
  </div>`;
}

function svgSpark(data, w, h){
  w=w||70; h=h||22;
  const d=(data||[]).filter(v=>v!=null).slice().reverse();
  if(d.length<2) return `<svg width="${w}" height="${h}"></svg>`;
  const max=Math.max(...d),min=Math.min(...d),span=(max-min)||1;
  const pts=d.map((v,i)=>`${i/(d.length-1)*w},${h-((v-min)/span*(h-4)+2)}`).join(" ");
  const up=d[d.length-1]>=d[0];
  return `<svg width="${w}" height="${h}" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${up?'#1a8a63':'#c0392b'}" stroke-width="1.4"/>
  </svg>`;
}

/* ============================================================
   SECTOR CYCLE INTELLIGENCE — same knowledge base as before.
   ============================================================ */
const MACRO_DRIVERS=[
  {id:"crude",name:"Crude oil",
   helpsWhenDown:["Paints","Airlines","Tyres","Logistics","Consumer staples","Aviation"],
   hurtsWhenDown:["Oil & gas E&P","Energy"],
   why:"Crude is a direct raw material (paints, tyres, plastics, fertilisers) and the biggest cost line for transport. When it falls, their input costs drop and margins expand — often before it shows in price. Upstream oil producers earn less.",
   example:"Crude −20% → paint-makers' margins typically expand 2-4 points over 1-2 quarters."},
  {id:"rates",name:"Interest rates",
   helpsWhenDown:["Real estate","Autos","NBFCs","Capital goods","Banks (lending volume)","Technology"],
   hurtsWhenDown:["Banks (margin)","Insurance"],
   why:"Rates are the price of money. Falling rates cut EMIs and unlock big-ticket demand. They also lift the present value of future profits, helping long-duration growth stocks. Lenders see more volume but thinner spreads.",
   example:"Rate-cut cycle → autos and real estate usually lead the recovery."},
  {id:"inr",name:"INR / USD",
   helpsWhenDown:["IT services","Pharma (exports)","Specialty chemicals","Textiles"],
   hurtsWhenDown:["Oil importers","Airlines","Capital goods (imports)"],
   why:"A weaker rupee means exporters earn more rupees per dollar of revenue — pure margin tailwind for IT and pharma. Importers pay more for the same goods.",
   example:"₹ depreciates 5% → IT-services EBITDA margins get roughly a 1.5-2 point mechanical lift."},
  {id:"metals",name:"Industrial metals",
   helpsWhenDown:["Autos","Consumer durables","Capital goods","Construction","Infrastructure"],
   hurtsWhenDown:["Metals & mining","Steel"],
   why:"Steel, aluminium and copper are inputs for anyone who builds things. Cheaper metals lift margins for autos and infra. Miners and steelmakers earn less.",
   example:"Steel prices soften → auto-component margins improve with a 1-quarter lag."},
  {id:"growth",name:"Economic growth (GDP)",upDriver:true,
   helpsWhenUp:["Banks","Capital goods","Autos","Consumer discretionary","Industrials","Real estate"],
   hurtsWhenUp:["Consumer staples (relative)","Gold","Utilities (relative)"],
   why:"In an expansion, cyclicals lead — banks lend more, factories order machines, people travel. Defensives still grow but lag as investors rotate into growth.",
   example:"Early-cycle upturn → financials and industrials outperform; late-cycle → rotate toward staples."},
];
const SECTOR_PROFILE={
  "Technology":{cyc:"Growth/Cyclical",drivers:["INR weak ↑","Rates low ↑"],defensiveness:35,note:"Exporter economics; long-duration so rate-sensitive."},
  "Energy":{cyc:"Cyclical",drivers:["Crude high ↑"],defensiveness:30,note:"Earnings track crude and refining spreads."},
  "Financial Services":{cyc:"Cyclical",drivers:["Growth ↑"],defensiveness:25,note:"A geared play on the economy."},
  "Consumer":{cyc:"Defensive",drivers:["Crude low ↑"],defensiveness:80,note:"Steady demand; input costs drive the margin cycle."},
  "Cons":{cyc:"Defensive",drivers:["Crude low ↑"],defensiveness:78,note:"Steady demand through cycles."},
  "Health":{cyc:"Defensive",drivers:["INR weak ↑"],defensiveness:75,note:"Inelastic demand; exporters gain from a weak rupee."},
  "Comm":{cyc:"Growth",drivers:["Rates low ↑"],defensiveness:45,note:"Subscriber and ad-revenue driven."},
  "Indus":{cyc:"Cyclical",drivers:["Growth ↑","Metals low ↑"],defensiveness:30,note:"Order books track capex spending."},
  "Fin":{cyc:"Cyclical",drivers:["Growth ↑"],defensiveness:25,note:"Geared to credit growth and asset quality."},
  "Tech":{cyc:"Growth",drivers:["INR weak ↑","Rates low ↑"],defensiveness:35,note:"Exporter economics; rate-sensitive."},
};
function profileFor(sec){return SECTOR_PROFILE[sec]||{cyc:"—",drivers:[],defensiveness:50,note:"Cycle profile not classified for this label."};}
const CYCLE_PHASES=[
  {ph:"Early recovery",desc:"Rates falling, growth bottoming and turning up.",lead:["Financials","Autos","Real estate","Consumer discretionary"],lag:["Utilities","Staples"]},
  {ph:"Mid expansion",desc:"Growth accelerating, capex returning, rates stable.",lead:["Industrials","Capital goods","Technology","Materials"],lag:["Bonds","Gold"]},
  {ph:"Late cycle",desc:"Growth strong but peaking, inflation/rates rising.",lead:["Energy","Materials","Staples"],lag:["Discretionary","Real estate"]},
  {ph:"Slowdown / recession",desc:"Growth contracting, rates being cut.",lead:["Consumer staples","Healthcare","Utilities","Gold"],lag:["Financials","Industrials","Discretionary"]},
];
