import { useState, useMemo, useEffect } from "react";

const API = 'https://productivity-tracker-production-6bb0.up.railway.app';

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BASELINE_MONTHS = [
  {m:7,label:"Jul 2025"},{m:8,label:"Aug 2025"},{m:9,label:"Sep 2025"},
  {m:10,label:"Oct 2025"},{m:11,label:"Nov 2025"},{m:12,label:"Dec 2025"}
];
const TRACK_MONTHS = Array.from({length:12},(_,i)=>({m:i+1,label:`${MONTHS[i]} 2026`}));

const INIT_PROJECTS = [
  {id:1,name:"Alpha Platform",baseline:{7:82,8:88,9:90,10:85,11:79,12:86},tracking:{}},
  {id:2,name:"Beta Mobile App",baseline:{7:60,8:65,9:58,10:62,11:70,12:65},tracking:{}},
  {id:3,name:"Gamma Analytics",baseline:{7:110,8:105,9:112,10:108,11:100,12:115},tracking:{}}
];

const PROJECT_GRADIENTS = [
  "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
  "linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)",
  "linear-gradient(135deg,#059669 0%,#0ea5e9 100%)",
  "linear-gradient(135deg,#d97706 0%,#ef4444 100%)",
  "linear-gradient(135deg,#db2777 0%,#9333ea 100%)",
];

function avgBaseline(bl){
  const vals=Object.values(bl).map(Number);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
}
function rag(sp,avg){
  if(sp>=avg*1.3)return "GREEN";
  if(sp>avg)return "AMBER";
  return "RED";
}
const RAG_STYLE={
  GREEN:{bg:"#d1fae5",border:"#6ee7b7",text:"#065f46",dot:"#10b981"},
  AMBER:{bg:"#fef9c3",border:"#fde047",text:"#713f12",dot:"#f59e0b"},
  RED:  {bg:"#fee2e2",border:"#fca5a5",text:"#7f1d1d",dot:"#ef4444"},
};
const RAG_LABEL={GREEN:"≥ Baseline +30%",AMBER:"Baseline to +30%",RED:"Below Baseline"};

const card={background:"#ffffff",borderRadius:14,border:"1px solid #e8eaf0",
  boxShadow:"0 2px 8px rgba(0,0,0,0.06)",padding:"20px 24px"};

const selStyle={width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #e5e7eb",
  background:"#f9fafb",color:"#374151",fontSize:12,outline:"none"};

function Badge({status}){
  const s=RAG_STYLE[status];
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 11px",
      borderRadius:20,background:s.bg,border:`1px solid ${s.border}`,
      color:s.text,fontSize:11,fontWeight:600,letterSpacing:.3}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:s.dot,display:"inline-block"}}/>
      {status}
    </span>
  );
}

function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:100}}>
      <div style={{...card,padding:28,width:"min(540px,92vw)",maxHeight:"80vh",
        overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.16)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:600,fontSize:16,color:"#1a1d23"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            fontSize:22,color:"#9ca3af",lineHeight:1,padding:"0 4px"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldInput({label,value,onChange,type="number",placeholder}){
  return(
    <div style={{marginBottom:12}}>
      {label&&<label style={{display:"block",fontSize:12,color:"#6b7280",
        marginBottom:4,fontWeight:500,letterSpacing:.2}}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",
          background:"#f9fafb",color:"#1a1d23",fontSize:14,boxSizing:"border-box",outline:"none"}}/>
    </div>
  );
}

function Btn({children,onClick,variant="primary",small}){
  const base={cursor:"pointer",borderRadius:8,fontWeight:500,border:"none",
    fontSize:small?12:13,padding:small?"5px 12px":"9px 20px",transition:"opacity .15s"};
  const styles={
    primary:{...base,background:"#1a1d23",color:"#ffffff"},
    secondary:{...base,background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb"},
    danger:{...base,background:"#fee2e2",color:"#7f1d1d",border:"1px solid #fca5a5"},
  };
  return <button style={styles[variant]||styles.primary} onClick={onClick}>{children}</button>;
}

function StatCell({label,val,color}){
  return(
    <div style={{background:"#f9fafb",borderRadius:8,padding:"8px 10px",border:"1px solid #f0f1f5"}}>
      <div style={{fontSize:11,color:"#9ca3af",marginBottom:3,fontWeight:500,letterSpacing:.2}}>{label}</div>
      <div style={{fontSize:15,fontWeight:700,color:color||"#1a1d23"}}>{val}</div>
    </div>
  );
}

function MiniBar({entries,avg}){
  const max=Math.max(...entries.map(e=>e.sp),avg*1.4)||1;
  return(
    <div style={{display:"flex",gap:4,alignItems:"flex-end",height:44,marginTop:6,
      paddingTop:4,borderTop:"1px solid #f0f1f5"}}>
      {entries.slice(-6).map(e=>{
        const h=Math.max(4,Math.round((e.sp/max)*40));
        const s=e.status?RAG_STYLE[e.status]:null;
        return(
          <div key={e.key} title={`${e.label}: ${e.sp} SP`}
            style={{flex:1,height:h,borderRadius:"3px 3px 0 0",
              background:s?s.dot:"#e5e7eb",minWidth:6,transition:"height .2s"}}/>
        );
      })}
    </div>
  );
}

function NumericFilter({values,min,setMin,max,setMax}){
  const nums=values.filter(v=>v!==null&&!isNaN(v));
  const dataMin=nums.length?Math.min(...nums):null;
  const dataMax=nums.length?Math.max(...nums):null;
  return(
    <div>
      {dataMin!==null&&(
        <div style={{fontSize:10,color:"#9ca3af",marginBottom:4,letterSpacing:.2}}>
          Range: <span style={{color:"#6b7280",fontWeight:600}}>{dataMin} – {dataMax}</span>
        </div>
      )}
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <input style={{...selStyle,width:"50%",padding:"5px 7px"}} type="number"
          placeholder={dataMin??""} value={min} onChange={e=>setMin(e.target.value)}/>
        <span style={{fontSize:11,color:"#d1d5db",flexShrink:0}}>–</span>
        <input style={{...selStyle,width:"50%",padding:"5px 7px"}} type="number"
          placeholder={dataMax??""} value={max} onChange={e=>setMax(e.target.value)}/>
      </div>
    </div>
  );
}

function ColHeader({label,col,sortCol,sortDir,onSort,children}){
  return(
    <th style={{padding:"0 0 0",textAlign:"left",fontWeight:600,color:"#6b7280",
      fontSize:11,letterSpacing:.5,textTransform:"uppercase",
      borderBottom:"1px solid #f0f1f5",verticalAlign:"bottom",minWidth:110}}>
      <div style={{cursor:col?"pointer":"default",userSelect:"none",
        display:"flex",alignItems:"center",gap:2,padding:"10px 14px 6px"}}
        onClick={()=>col&&onSort(col)}>
        {label}
        {col&&(sortCol===col
          ?<span style={{fontSize:10}}>{sortDir==="asc"?" ↑":" ↓"}</span>
          :<span style={{opacity:.3,fontSize:10}}> ⇅</span>)}
      </div>
      <div style={{padding:"0 8px 8px"}}>{children}</div>
    </th>
  );
}

function DataTable({dashData}){
  const [fProject,setFProject]=useState("");
  const [fPeriod,setFPeriod]=useState("");
  const [fSPMin,setFSPMin]=useState("");
  const [fSPMax,setFSPMax]=useState("");
  const [fBLMin,setFBLMin]=useState("");
  const [fBLMax,setFBLMax]=useState("");
  const [fGreenMin,setFGreenMin]=useState("");
  const [fGreenMax,setFGreenMax]=useState("");
  const [fPctMin,setFPctMin]=useState("");
  const [fPctMax,setFPctMax]=useState("");
  const [fStatus,setFStatus]=useState("");
  const [sortCol,setSortCol]=useState(null);
  const [sortDir,setSortDir]=useState("asc");

  const allRows=useMemo(()=>dashData.flatMap(pr=>pr.entries.map(e=>{
    const pct=pr.avg!==0?+((e.sp-pr.avg)/pr.avg*100).toFixed(1):null;
    return{projectName:pr.name,period:e.label,sp:e.sp,
      baseline:pr.avg?+pr.avg.toFixed(1):null,
      green:pr.avg?+(pr.avg*1.3).toFixed(1):null,
      pct,status:e.status,key:`${pr.id}-${e.key}`};
  })),[dashData]);

  const uniqueProjects=[...new Set(allRows.map(r=>r.projectName))];
  const uniquePeriods=[...new Set(allRows.map(r=>r.period))];
  const uniqueStatuses=[...new Set(allRows.map(r=>r.status).filter(Boolean))];

  let rows=allRows.filter(r=>{
    if(fProject&&r.projectName!==fProject)return false;
    if(fPeriod&&r.period!==fPeriod)return false;
    if(fSPMin!==""&&r.sp<+fSPMin)return false;
    if(fSPMax!==""&&r.sp>+fSPMax)return false;
    if(fBLMin!==""&&(r.baseline===null||r.baseline<+fBLMin))return false;
    if(fBLMax!==""&&(r.baseline===null||r.baseline>+fBLMax))return false;
    if(fGreenMin!==""&&(r.green===null||r.green<+fGreenMin))return false;
    if(fGreenMax!==""&&(r.green===null||r.green>+fGreenMax))return false;
    if(fPctMin!==""&&(r.pct===null||r.pct<+fPctMin))return false;
    if(fPctMax!==""&&(r.pct===null||r.pct>+fPctMax))return false;
    if(fStatus&&r.status!==fStatus)return false;
    return true;
  });

  if(sortCol){
    rows=[...rows].sort((a,b)=>{
      let av=a[sortCol],bv=b[sortCol];
      if(typeof av==="string"){av=av.toLowerCase();bv=bv.toLowerCase();}
      if(av===null)return 1;
      if(bv===null)return -1;
      return sortDir==="asc"?(av>bv?1:-1):(av<bv?1:-1);
    });
  }

  function toggleSort(col){
    if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortCol(col);setSortDir("asc");}
  }

  function clearAll(){
    setFProject("");setFPeriod("");setFSPMin("");setFSPMax("");
    setFBLMin("");setFBLMax("");setFGreenMin("");setFGreenMax("");
    setFPctMin("");setFPctMax("");setFStatus("");setSortCol(null);
  }

  const anyFilter=fProject||fPeriod||fSPMin||fSPMax||fBLMin||fBLMax||
    fGreenMin||fGreenMax||fPctMin||fPctMax||fStatus;

  return(
    <div style={{...card,marginTop:20,padding:0,overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #f0f1f5",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:14,color:"#1a1d23"}}>All Productivity Data</span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"#9ca3af"}}>{rows.length} row{rows.length!==1?"s":""} shown</span>
          {anyFilter&&(
            <button onClick={clearAll} style={{fontSize:12,color:"#6366f1",background:"#ede9fe",
              border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:500}}>
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f9fafb"}}>
              <ColHeader label="Project" col="projectName" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <select style={selStyle} value={fProject} onChange={e=>setFProject(e.target.value)}>
                  <option value="">All</option>
                  {uniqueProjects.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </ColHeader>
              <ColHeader label="Period" col="period" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <select style={selStyle} value={fPeriod} onChange={e=>setFPeriod(e.target.value)}>
                  <option value="">All</option>
                  {uniquePeriods.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </ColHeader>
              <ColHeader label="Actual SP" col="sp" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <NumericFilter values={allRows.map(r=>r.sp)} min={fSPMin} setMin={setFSPMin} max={fSPMax} setMax={setFSPMax}/>
              </ColHeader>
              <ColHeader label="Baseline Avg" col="baseline" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <NumericFilter values={allRows.map(r=>r.baseline)} min={fBLMin} setMin={setFBLMin} max={fBLMax} setMax={setFBLMax}/>
              </ColHeader>
              <ColHeader label="Green >=" col="green" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <NumericFilter values={allRows.map(r=>r.green)} min={fGreenMin} setMin={setFGreenMin} max={fGreenMax} setMax={setFGreenMax}/>
              </ColHeader>
              <ColHeader label="% vs Baseline" col="pct" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <NumericFilter values={allRows.map(r=>r.pct)} min={fPctMin} setMin={setFPctMin} max={fPctMax} setMax={setFPctMax}/>
              </ColHeader>
              <ColHeader label="Status" col="status" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}>
                <select style={selStyle} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
                  <option value="">All</option>
                  {uniqueStatuses.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </ColHeader>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const s=r.status?RAG_STYLE[r.status]:null;
              return(
                <tr key={r.key} style={{borderBottom:"1px solid #f5f6f8",
                  background:s?s.bg+"44":"transparent"}}>
                  <td style={{padding:"10px 16px",color:"#1a1d23",fontWeight:600}}>{r.projectName}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.period}</td>
                  <td style={{padding:"10px 16px",color:"#1a1d23",fontWeight:500}}>{r.sp}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.baseline??"-"}</td>
                  <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.green??"-"}</td>
                  <td style={{padding:"10px 16px",fontWeight:600,
                    color:r.pct!==null&&r.pct>=0?"#10b981":"#ef4444"}}>
                    {r.pct!==null?(r.pct>=0?"+":"")+r.pct+"%":"-"}
                  </td>
                  <td style={{padding:"10px 16px"}}>{r.status?<Badge status={r.status}/>:"-"}</td>
                </tr>
              );
            })}
            {rows.length===0&&(
              <tr>
                <td colSpan={7} style={{padding:"28px 16px",textAlign:"center",
                  color:"#9ca3af",fontSize:13}}>
                  {allRows.length===0
                    ?"No tracking data yet. Enter story points above."
                    :"No rows match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectDetail({pr,onInsight,aiLoading,aiInsight,activeProjectId,onEnter}){
  const ragCounts={GREEN:0,AMBER:0,RED:0};
  pr.entries.forEach(e=>{if(e.status)ragCounts[e.status]++;});
  const max=Math.max(...pr.entries.map(e=>e.sp),pr.avg*1.4,pr.avg+1)||1;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          flexWrap:"wrap",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontWeight:700,fontSize:20,color:"#1a1d23",marginBottom:4}}>{pr.name}</div>
            <div style={{fontSize:13,color:"#6b7280"}}>
              Baseline avg: <strong style={{color:"#1a1d23"}}>{pr.avg.toFixed(1)} SP</strong>
              <span style={{margin:"0 6px",color:"#d1d5db"}}>·</span>
              Green &gt;= <strong style={{color:"#1a1d23"}}>{(pr.avg*1.3).toFixed(1)} SP</strong>
              <span style={{margin:"0 6px",color:"#d1d5db"}}>·</span>
              {pr.entries.length} month{pr.entries.length!==1?"s":""} tracked
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn small variant="secondary" onClick={onEnter}>+ Enter SP</Btn>
            <Btn small onClick={onInsight}>{aiLoading?"Analysing…":"✦ AI Insight"}</Btn>
          </div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {Object.entries(ragCounts).map(([k,v])=>{
            const s=RAG_STYLE[k];
            return(
              <div key={k} style={{background:s.bg,border:`1px solid ${s.border}`,
                borderRadius:12,padding:"12px 22px",textAlign:"center",minWidth:90}}>
                <div style={{fontWeight:700,fontSize:26,color:s.dot,lineHeight:1}}>{v}</div>
                <div style={{fontSize:11,fontWeight:600,color:s.text,marginTop:4,letterSpacing:.4}}>{k}</div>
              </div>
            );
          })}
        </div>
      </div>

      {pr.entries.length>0&&(
        <div style={card}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:18,color:"#1a1d23"}}>
            Monthly Story Points vs Baseline
          </div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:148}}>
            {pr.entries.map(e=>{
              const h=Math.max(8,Math.round((e.sp/max)*126));
              const s=e.status?RAG_STYLE[e.status]:null;
              return(
                <div key={e.key} style={{flex:1,display:"flex",flexDirection:"column",
                  alignItems:"center",gap:4}}>
                  <div style={{fontSize:10,color:"#6b7280",fontWeight:600}}>{e.sp}</div>
                  <div style={{width:"100%",height:h,borderRadius:"5px 5px 0 0",
                    background:s?s.dot:"#e5e7eb",transition:"height .3s"}}/>
                  <div style={{fontSize:10,color:"#9ca3af",writingMode:"vertical-lr",
                    transform:"rotate(180deg)",height:34,display:"flex",alignItems:"center"}}>
                    {MONTHS[e.month-1]}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap",paddingTop:10,
            borderTop:"1px solid #f0f1f5"}}>
            {Object.entries(RAG_STYLE).map(([k,s])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6b7280"}}>
                <span style={{width:10,height:10,borderRadius:3,background:s.dot,display:"inline-block"}}/>
                {RAG_LABEL[k]}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{...card,padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 22px",borderBottom:"1px solid #f0f1f5"}}>
          <span style={{fontWeight:700,fontSize:14,color:"#1a1d23"}}>Month-wise Detail</span>
        </div>
        {pr.entries.length===0?(
          <div style={{padding:"28px 22px",textAlign:"center",color:"#9ca3af",fontSize:13}}>
            No data entered yet. Click "+ Enter SP" to add story points.
          </div>
        ):(
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#f9fafb"}}>
                {["Month","Story Points","Baseline Avg","Delta vs Baseline","Threshold","Status"].map(h=>(
                  <th key={h} style={{padding:"10px 16px",textAlign:"left",fontWeight:600,
                    color:"#9ca3af",fontSize:11,letterSpacing:.5,textTransform:"uppercase",
                    borderBottom:"1px solid #f0f1f5"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pr.entries.map(e=>{
                const diff=(e.sp-pr.avg).toFixed(1);
                const pct=pr.avg?((e.sp-pr.avg)/pr.avg*100).toFixed(1):"-";
                const s=e.status?RAG_STYLE[e.status]:null;
                return(
                  <tr key={e.key} style={{borderBottom:"1px solid #f5f6f8",
                    background:s?s.bg+"55":"transparent"}}>
                    <td style={{padding:"10px 16px",fontWeight:600,color:"#1a1d23"}}>{e.label}</td>
                    <td style={{padding:"10px 16px",color:"#1a1d23",fontWeight:600}}>{e.sp} SP</td>
                    <td style={{padding:"10px 16px",color:"#6b7280"}}>{pr.avg.toFixed(1)} SP</td>
                    <td style={{padding:"10px 16px",fontWeight:600,
                      color:+diff>=0?"#10b981":"#ef4444"}}>
                      {+diff>=0?"+":""}{diff} SP ({+pct>=0?"+":""}{pct}%)
                    </td>
                    <td style={{padding:"10px 16px",color:"#6b7280"}}>{(pr.avg*1.3).toFixed(1)} SP</td>
                    <td style={{padding:"10px 16px"}}>{e.status?<Badge status={e.status}/>:"-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(aiLoading||(aiInsight&&activeProjectId===pr.id))&&(
        <div style={{...card,borderLeft:"4px solid #6366f1",background:"#fafafe"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:"#1a1d23",
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:20,height:20,borderRadius:5,background:"#6366f1",
              display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="white" strokeWidth="1.2"/>
                <path d="M5.5 4V5.5L6.5 7" stroke="white" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            </span>
            AI Insights
          </div>
          {aiLoading
            ?<div style={{color:"#9ca3af",fontSize:13}}>Analysing productivity data...</div>
            :<div style={{fontSize:14,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aiInsight}</div>
          }
        </div>
      )}
    </div>
  );
}

const NAV_TABS=[{id:"dashboard",label:"Dashboard"},{id:"projects",label:"Projects"},{id:"enter",label:"Enter Data"}];

export default function App(){
  // Here you can connect your database — on mount: GET /api/projects to replace INIT_PROJECTS
  const [projects, setProjects] = useState([]);
  const [tab,setTab]=useState("dashboard");
  const [selProject,setSelProject]=useState(null);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [aiLoading,setAiLoading]=useState(false);
  const [aiInsight,setAiInsight]=useState("");
  const [activeProjectId,setActiveProjectId]=useState(null);

  useEffect(() => {
    fetch(`${API}/api/projects`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          console.error('API did not return an array:', data);
          setProjects(INIT_PROJECTS);
        }
      })
      .catch(err => {
        console.error('Failed to fetch projects:', err);
        setProjects(INIT_PROJECTS);
      });
  }, []);

  const closeModal=()=>{setModal(null);setForm({});};

  // Here you can connect your database — POST /api/projects { name } then use returned id
  async function addProject(){
    if(!form.name?.trim())return;
    const res = await fetch(`${API}/api/projects`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:form.name.trim()}),
    });
    const {id,name} = await res.json();
    setProjects(p=>[...p,{id,name,baseline:{},tracking:{}}]);
    closeModal();
  }

  function deleteProject(id){
    fetch(`${API}/api/projects/${id}`,{method:'DELETE'});
    setProjects(p=>p.filter(x=>x.id!==id));
    if(selProject===id)setSelProject(null);
  }

  async function saveBaseline(){
    const projectId = Number(form.projectId || form.blProject);
    console.log('saveBaseline called — form:', form);
    console.log('resolved projectId:', projectId);

    if (!projectId) {
      alert('Please select a project first.');
      return;
    }

    const months = BASELINE_MONTHS.map(({m}) => {
      // Enter Data tab uses blm7/blm8, modal uses m7/m8
      const raw = form[`blm${m}`] !== undefined ? form[`blm${m}`] : form[`m${m}`];
      const v = parseFloat(raw);
      console.log(`month ${m} value:`, raw, '→ parsed:', v);
      return isNaN(v) ? 0 : v;
    });
    console.log('months array:', months);

    try {
      const payload = { project_id: projectId, months };
      console.log('sending to API:', payload);

      const res = await fetch('https://productivity-tracker-production-6bb0.up.railway.app/api/baseline', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('API response:', data);

      if (!data.success) {
        alert('Error saving baseline: ' + (data.error || 'Unknown error'));
        return;
      }

      setProjects(p => p.map(pr => {
        if (pr.id !== projectId) return pr;
        const bl = {};
        BASELINE_MONTHS.forEach(({m}, i) => { bl[m] = months[i]; });
        return {
          ...pr,
          baseline: bl,
          baseline_avg: data.baseline_avg,
          green_threshold: data.green_threshold,
        };
      }));
      closeModal();
    } catch(err) {
      alert('Failed to save baseline. Is the server running?');
      console.error('saveBaseline error:', err);
    }
  }

  // Here you can connect your database — POST /api/productivity { project_id, year, month, story_points }
  async function saveSP(){
    const sp=parseFloat(form.sp);
    if(isNaN(sp)||sp<0)return;
    await fetch(`${API}/api/productivity`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        project_id:form.projectId,
        year:form.year,
        month:form.month,
        story_points:sp,
      }),
    });
    setProjects(p=>p.map(pr=>{
      if(pr.id!==form.projectId)return pr;
      return{...pr,tracking:{...pr.tracking,[`${form.year}-${form.month}`]:sp}};
    }));
    closeModal();
  }

  async function fetchInsight(proj){
    setAiLoading(true);setAiInsight("");setActiveProjectId(proj.id);
    const avg=avgBaseline(proj.baseline);
    const rows=Object.entries(proj.tracking).map(([k,v])=>{
      const [y,m]=k.split("-");
      return `${MONTHS[+m-1]} ${y}: ${v} SP (${rag(v,avg)})`;
    }).join("\n")||"No tracking data yet.";
    const prompt=`You are a concise agile coach. Analyse this project's productivity data and give 3 bullet-point insights (max 2 lines each). Be direct and actionable.\n\nProject: ${proj.name}\n6-month baseline average: ${avg.toFixed(1)} SP\nGreen threshold (>=+30%): ${(avg*1.3).toFixed(1)} SP\n\nMonthly tracking (Jan 2026 onwards):\n${rows}\n\nRespond ONLY with 3 bullet points starting with "bullet". No preamble.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,
          messages:[{role:"user",content:prompt}]})
      });
      const d=await res.json();
      setAiInsight(d.content?.find(x=>x.type==="text")?.text||"No insight returned.");
    }catch(e){setAiInsight("Could not fetch insight.");}
    setAiLoading(false);
  }

  const dashData=projects.map(pr=>{
    // Use baseline_avg from DB directly if available, else compute from baseline object
    const avg = pr.baseline_avg != null ? pr.baseline_avg : avgBaseline(pr.baseline);
    const baselineComplete = pr.baseline_avg != null || Object.keys(pr.baseline).length===6;
    const entries=Object.entries(pr.tracking).map(([k,v])=>{
      const [y,m]=k.split("-");
      const status=baselineComplete?rag(v,avg):null;
      return{key:k,year:+y,month:+m,sp:v,status,label:`${MONTHS[+m-1]} ${y}`};
    }).sort((a,b)=>a.year-b.year||a.month-b.month);
    const latest=entries[entries.length-1]||null;
    return{...pr,avg,baselineComplete,entries,latest};
  });

  const selectedDash=selProject!=null?dashData.find(p=>p.id===selProject):null;

  function openBaseline(pr){
    const f={projectId:pr.id, blProject:pr.id};
    BASELINE_MONTHS.forEach(({m})=>{
      const val = pr.baseline[m] ?? "";
      f[`m${m}`]   = val;
      f[`blm${m}`] = val;
    });
    setForm(f);setModal("editBaseline");
  }

  return(
    <div style={{minHeight:"100vh",background:"#f5f7fb",fontFamily:"sans-serif",padding:"0 0 48px"}}>
      <div style={{background:"#ffffff",borderBottom:"1.5px solid #e8eaf0",
        boxShadow:"0 1px 4px rgba(0,0,0,0.05)",padding:"0 32px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",
          justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:8,background:"#1a1d23",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="3" height="6" rx="1" fill="white"/>
                <rect x="6" y="5" width="3" height="9" rx="1" fill="white"/>
                <rect x="11" y="2" width="3" height="12" rx="1" fill="white"/>
              </svg>
            </div>
            <span style={{fontWeight:700,fontSize:15,color:"#1a1d23",letterSpacing:-.2}}>
              Productivity Tracker
            </span>
            <span style={{fontSize:11,fontWeight:600,color:"#6366f1",background:"#ede9fe",
              padding:"2px 9px",borderRadius:12,letterSpacing:.3}}>2026</span>
          </div>
          <div style={{display:"flex",gap:4,background:"#f3f4f6",borderRadius:10,padding:4}}>
            {NAV_TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"6px 18px",borderRadius:7,border:"none",cursor:"pointer",
                  fontWeight:tab===t.id?600:400,fontSize:13,transition:"all .15s",
                  background:tab===t.id?"#ffffff":"transparent",
                  color:tab===t.id?"#1a1d23":"#6b7280",
                  boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.10)":"none"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"28px auto",padding:"0 28px"}}>

        {tab==="dashboard"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
              {[
                {label:"Total Active Projects",sub:"Across all teams",val:projects.length,
                  color:"#6366f1",grad:"linear-gradient(135deg,#6366f1 0%,#818cf8 100%)",
                  icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="6" width="8" height="14" rx="2" fill="white" fillOpacity=".9"/><rect x="12" y="2" width="8" height="18" rx="2" fill="white" fillOpacity=".6"/></svg>},
                {label:"Exceeding Baseline",sub:"Latest month >= +30%",
                  val:dashData.filter(p=>p.latest?.status==="GREEN").length,
                  color:"#059669",grad:"linear-gradient(135deg,#059669 0%,#34d399 100%)",
                  icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><polyline points="2,16 8,9 13,13 20,4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><polyline points="15,4 20,4 20,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>},
                {label:"Above Baseline",sub:"Latest month within +30%",
                  val:dashData.filter(p=>p.latest?.status==="AMBER").length,
                  color:"#d97706",grad:"linear-gradient(135deg,#d97706 0%,#fbbf24 100%)",
                  icon:<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" fill="none"/><line x1="11" y1="7" x2="11" y2="12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/><circle cx="11" cy="15" r="1.2" fill="white"/></svg>},
              ].map(k=>(
                <div key={k.label} style={{borderRadius:16,background:k.grad,padding:"22px 24px",
                  display:"flex",alignItems:"center",gap:18,
                  boxShadow:`0 4px 20px ${k.color}44`,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",right:-18,top:-18,width:90,height:90,
                    borderRadius:"50%",background:"rgba(255,255,255,0.10)"}}/>
                  <div style={{position:"absolute",right:18,bottom:-24,width:60,height:60,
                    borderRadius:"50%",background:"rgba(255,255,255,0.07)"}}/>
                  <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,0.18)",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {k.icon}
                  </div>
                  <div>
                    <div style={{fontSize:32,fontWeight:800,color:"#ffffff",lineHeight:1}}>{k.val}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.95)",marginTop:3}}>{k.label}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.70)",marginTop:1}}>{k.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:22}}>
              {[{id:null,label:"All Projects"},...dashData.map(p=>({id:p.id,label:p.name}))].map(t=>(
                <button key={String(t.id)} onClick={()=>setSelProject(t.id)}
                  style={{padding:"6px 16px",borderRadius:20,cursor:"pointer",fontSize:13,
                    fontWeight:selProject===t.id?600:400,transition:"all .15s",
                    background:selProject===t.id?"#1a1d23":"#ffffff",
                    color:selProject===t.id?"#ffffff":"#4b5563",
                    border:selProject===t.id?"1px solid #1a1d23":"1px solid #e5e7eb",
                    boxShadow:selProject===t.id?"0 2px 6px rgba(0,0,0,0.14)":"none"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {selProject==null&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:20}}>
                {dashData.map((pr,idx)=>{
                  const latestStatus=pr.latest?.status;
                  const grad=PROJECT_GRADIENTS[idx%PROJECT_GRADIENTS.length];
                  return(
                    <div key={pr.id} onClick={()=>setSelProject(pr.id)}
                      style={{...card,cursor:"pointer",padding:0,overflow:"hidden",transition:"box-shadow .18s,transform .18s"}}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.13)";e.currentTarget.style.transform="translateY(-3px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow=card.boxShadow;e.currentTarget.style.transform="none";}}>
                      <div style={{background:grad,padding:"18px 20px 14px",position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",right:-16,top:-16,width:80,height:80,
                          borderRadius:"50%",background:"rgba(255,255,255,0.10)"}}/>
                        <div style={{position:"absolute",right:20,bottom:-20,width:52,height:52,
                          borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <span style={{fontWeight:700,fontSize:15,color:"#ffffff",letterSpacing:-.1}}>{pr.name}</span>
                          {latestStatus&&<Badge status={latestStatus}/>}
                        </div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.70)",marginTop:4,fontWeight:500}}>
                          {pr.baselineComplete?`Baseline: ${pr.avg.toFixed(1)} SP avg`:"Baseline not configured"}
                        </div>
                      </div>
                      <div style={{padding:"14px 18px 16px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 10px",marginBottom:12}}>
                          <StatCell label="Baseline Avg" val={pr.avg?pr.avg.toFixed(1)+" SP":"—"}/>
                          <StatCell label="Green >=" val={pr.avg?(pr.avg*1.3).toFixed(1)+" SP":"—"}/>
                          <StatCell label="Latest SP" val={pr.latest?pr.latest.sp+" SP":"—"}/>
                          <StatCell label="vs Baseline"
                            val={pr.latest&&pr.avg?(((pr.latest.sp-pr.avg)/pr.avg*100).toFixed(1)+"%"):"—"}
                            color={pr.latest&&pr.avg?(pr.latest.sp>=pr.avg?"#10b981":"#ef4444"):undefined}/>
                        </div>
                        {pr.entries.length>0&&<MiniBar entries={pr.entries} avg={pr.avg}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selProject!=null&&selectedDash&&(
              <ProjectDetail pr={selectedDash}
                onInsight={()=>fetchInsight(selectedDash)}
                aiLoading={aiLoading&&activeProjectId===selectedDash.id}
                aiInsight={activeProjectId===selectedDash.id?aiInsight:""}
                activeProjectId={activeProjectId}
                onEnter={()=>{setForm({projectId:selectedDash.id,year:2026,month:1,sp:""});setModal("enterSP");}}/>
            )}
          </>
        )}

        {tab==="projects"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <span style={{fontWeight:700,fontSize:18,color:"#1a1d23"}}>Manage Projects</span>
              <Btn onClick={()=>setModal("addProject")}>+ Add Project</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {dashData.map(pr=>(
                <div key={pr.id} style={{...card,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",padding:"16px 22px"}}>
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontWeight:600,fontSize:14,color:"#1a1d23"}}>{pr.name}</div>
                    <div style={{fontSize:12,color:"#9ca3af",marginTop:3}}>
                      {pr.baselineComplete
                        ?`Baseline avg: ${pr.avg.toFixed(1)} SP`
                        :`${Object.keys(pr.baseline).length}/6 baseline months entered`}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <Btn small variant="secondary" onClick={()=>openBaseline(pr)}>Edit Baseline</Btn>
                    <Btn small variant="secondary" onClick={()=>{setForm({projectId:pr.id,year:2026,month:1,sp:""});setModal("enterSP");}}>Enter SP</Btn>
                    <Btn small variant="danger" onClick={()=>deleteProject(pr.id)}>Delete</Btn>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab==="enter"&&(
          <>
            <div style={{borderRadius:16,background:"linear-gradient(135deg,#1a1d23 0%,#3b3f4a 100%)",
              padding:"22px 28px",marginBottom:24,display:"flex",alignItems:"center",
              justifyContent:"space-between",gap:16,position:"relative",overflow:"hidden",
              boxShadow:"0 4px 20px rgba(26,29,35,0.28)"}}>
              <div style={{position:"absolute",right:-24,top:-24,width:110,height:110,
                borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
              <div style={{position:"absolute",right:60,bottom:-30,width:72,height:72,
                borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
              <div>
                <div style={{fontWeight:800,fontSize:20,color:"#ffffff",letterSpacing:-.3}}>Data Entry</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:4}}>
                  Configure baselines · Record monthly story points · Review entries
                </div>
              </div>
              <div style={{display:"flex",gap:10,flexShrink:0}}>
                <div style={{background:"rgba(255,255,255,0.10)",borderRadius:10,padding:"10px 18px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:800,color:"#ffffff",lineHeight:1}}>
                    {dashData.filter(p=>p.baselineComplete).length}/{projects.length}
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:2,letterSpacing:.3}}>BASELINES SET</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.10)",borderRadius:10,padding:"10px 18px",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:800,color:"#ffffff",lineHeight:1}}>
                    {dashData.reduce((a,p)=>a+p.entries.length,0)}
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:2,letterSpacing:.3}}>TOTAL ENTRIES</div>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
              <div style={{...card,padding:0,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
                  padding:"16px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",right:-12,top:-12,width:64,height:64,
                    borderRadius:"50%",background:"rgba(255,255,255,0.10)"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.18)",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white"/>
                        <rect x="9" y="2" width="5" height="5" rx="1.5" fill="white" fillOpacity=".7"/>
                        <rect x="2" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity=".7"/>
                        <rect x="9" y="9" width="5" height="5" rx="1.5" fill="white" fillOpacity=".4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"#ffffff"}}>Baseline Story Points</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",marginTop:1}}>Jul - Dec 2025 · 6 months per project</div>
                    </div>
                  </div>
                </div>
                <div style={{padding:"18px 22px"}}>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Project</label>
                    <select value={form.blProject||""} onChange={e=>setForm(f=>({...f,blProject:+e.target.value}))}
                      style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,
                        border:"1px solid #e5e7eb",background:"#f9fafb",color:"#1a1d23",fontSize:14}}>
                      <option value="">Select project...</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {form.blProject&&(
                    <>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        {BASELINE_MONTHS.map(({m,label})=>(
                          <FieldInput key={m} label={label}
                            value={form[`blm${m}`]??projects.find(p=>p.id===form.blProject)?.baseline[m]??""}
                            onChange={e=>setForm(f=>({...f,[`blm${m}`]:e.target.value}))} placeholder="SP"/>
                        ))}
                      </div>
                      <div style={{marginTop:14}}>
                        <Btn onClick={()=>{
                          saveBaseline();
                        }}>Save Baseline</Btn>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{...card,padding:0,overflow:"hidden"}}>
                <div style={{background:"linear-gradient(135deg,#059669 0%,#0ea5e9 100%)",
                  padding:"16px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",right:-12,top:-12,width:64,height:64,
                    borderRadius:"50%",background:"rgba(255,255,255,0.10)"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.18)",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="9" width="3" height="5" rx="1" fill="white"/>
                        <rect x="6" y="6" width="3" height="8" rx="1" fill="white" fillOpacity=".8"/>
                        <rect x="11" y="3" width="3" height="11" rx="1" fill="white" fillOpacity=".6"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"#ffffff"}}>Monthly Story Points</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.65)",marginTop:1}}>Jan 2026 onwards · one entry per project per month</div>
                    </div>
                  </div>
                </div>
                <div style={{padding:"18px 22px"}}>
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Project</label>
                    <select value={form.trProject||""} onChange={e=>setForm(f=>({...f,trProject:+e.target.value}))}
                      style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,
                        border:"1px solid #e5e7eb",background:"#f9fafb",color:"#1a1d23",fontSize:14}}>
                      <option value="">Select project...</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div>
                      <label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Month</label>
                      <select value={form.trMonth||1} onChange={e=>setForm(f=>({...f,trMonth:+e.target.value}))}
                        style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,
                          border:"1px solid #e5e7eb",background:"#f9fafb",color:"#1a1d23",fontSize:14}}>
                        {TRACK_MONTHS.map(({m,label})=><option key={m} value={m}>{label}</option>)}
                      </select>
                    </div>
                    <FieldInput label="Story Points" value={form.trSP||""}
                      onChange={e=>setForm(f=>({...f,trSP:e.target.value}))} placeholder="e.g. 95"/>
                  </div>
                  {form.trProject&&form.trSP&&!isNaN(+form.trSP)&&(()=>{
                    const pr=dashData.find(p=>p.id===form.trProject);
                    if(!pr||!pr.baselineComplete)return(
                      <div style={{fontSize:12,color:"#9ca3af",marginBottom:10,padding:"8px 12px",
                        background:"#f9fafb",borderRadius:8,border:"1px solid #e5e7eb"}}>
                        Baseline incomplete - set all 6 months first.
                      </div>);
                    const status=rag(+form.trSP,pr.avg);
                    const s=RAG_STYLE[status];
                    return(
                      <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,
                        padding:"10px 14px",marginBottom:12,fontSize:13,color:s.text,
                        display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:s.dot,
                          display:"inline-block",flexShrink:0}}/>
                        <span><span style={{fontWeight:700}}>{status}</span> — {RAG_LABEL[status]}
                          <span style={{opacity:.7}}> · baseline {pr.avg.toFixed(1)} SP</span>
                        </span>
                      </div>);
                  })()}
                  <Btn onClick={()=>{
                    if(!form.trProject||!form.trSP)return;
                    const sp=parseFloat(form.trSP);
                    if(isNaN(sp)||sp<0)return;
                    const key=`2026-${form.trMonth||1}`;
                    fetch(`${API}/api/productivity`,{
                      method:'POST',
                      headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({
                        project_id:form.trProject,
                        year:2026,
                        month:form.trMonth||1,
                        story_points:sp,
                      }),
                    });
                    setProjects(p=>p.map(pr=>{
                      if(pr.id!==form.trProject)return pr;
                      return{...pr,tracking:{...pr.tracking,[key]:sp}};
                    }));
                    setForm(f=>({...f,trSP:""}));
                  }}>Save Entry</Btn>

                  {form.trProject&&(()=>{
                    const pr=dashData.find(p=>p.id===form.trProject);
                    if(!pr||pr.entries.length===0)return null;
                    return(
                      <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #f0f1f5"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:8,
                          letterSpacing:.5,textTransform:"uppercase"}}>
                          Existing entries - {pr.name}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {pr.entries.map(e=>{
                            const s=e.status?RAG_STYLE[e.status]:null;
                            return(
                              <div key={e.key} style={{display:"flex",justifyContent:"space-between",
                                alignItems:"center",padding:"7px 12px",borderRadius:8,
                                background:s?s.bg:"#f9fafb",border:`1px solid ${s?s.border:"#e5e7eb"}`}}>
                                <span style={{fontSize:13,color:s?s.text:"#374151"}}>{e.label}</span>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:13,fontWeight:700,color:s?s.text:"#1a1d23"}}>{e.sp} SP</span>
                                  {e.status&&<Badge status={e.status}/>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <DataTable dashData={dashData}/>
          </>
        )}
      </div>

      {modal==="addProject"&&(
        <Modal title="Add New Project" onClose={closeModal}>
          <FieldInput label="Project Name" type="text" value={form.name||""}
            onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Delta API"/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
            <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={addProject}>Add Project</Btn>
          </div>
        </Modal>
      )}
      {modal==="editBaseline"&&(
        <Modal title={`Baseline - ${projects.find(p=>p.id===form.projectId)?.name}`} onClose={closeModal}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {BASELINE_MONTHS.map(({m,label})=>(
              <FieldInput key={m} label={label} value={form[`m${m}`]??""} placeholder="SP"
                onChange={e=>setForm(f=>({...f,[`m${m}`]:e.target.value}))}/>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
            <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={saveBaseline}>Save Baseline</Btn>
          </div>
        </Modal>
      )}
      {modal==="enterSP"&&(
        <Modal title="Enter Story Points" onClose={closeModal}>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Project</label>
            <select value={form.projectId||""} onChange={e=>setForm(f=>({...f,projectId:+e.target.value}))}
              style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,
                border:"1px solid #e5e7eb",background:"#f9fafb",color:"#1a1d23",fontSize:14}}>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Month</label>
              <select value={form.month||1} onChange={e=>setForm(f=>({...f,month:+e.target.value}))}
                style={{width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,
                  border:"1px solid #e5e7eb",background:"#f9fafb",color:"#1a1d23",fontSize:14}}>
                {TRACK_MONTHS.map(({m,label})=><option key={m} value={m}>{label}</option>)}
              </select>
            </div>
            <FieldInput label="Story Points" value={form.sp||""}
              onChange={e=>setForm(f=>({...f,sp:e.target.value}))} placeholder="e.g. 95"/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
            <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
            <Btn onClick={saveSP}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}