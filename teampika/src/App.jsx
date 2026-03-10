import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, remove, update } from "firebase/database";

// ── Firebase Setup ─────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDYbZ3whNq4zvnkd_VYwWVUSn5s5ysHCy8",
  authDomain: "teampika.firebaseapp.com",
  projectId: "teampika",
  databaseURL: "https://teampika-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "teampika.firebasestorage.app",
  messagingSenderId: "793726245846",
  appId: "1:793726245846:web:2e7bc547432740e6c4a277",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// helper: object → array with id injected
const toArr = (snap) => snap ? Object.entries(snap).map(([id, v]) => ({ ...v, id })) : [];

// ── Constants ─────────────────────────────────────────────────────────────
const POSITIONS = ["PG","SG","SF","PF","C"];
const POS_COLOR = { PG:"#00e5ff", SG:"#ff6b35", SF:"#a8ff3e", PF:"#ff3e9d", C:"#ffe03e" };
const POS_LABEL = { PG:"포인트가드", SG:"슈팅가드", SF:"스몰포워드", PF:"파워포워드", C:"센터" };
const PLAY_STYLES = [
  { id:"shot_creator",    label:"Shot Creator",          ko:"샷 크리에이터",       desc:"드리블로 공간 만들고 미드레인지·스텝백 점퍼를 만드는 공격형 가드",   ex:"Kyrie Irving" },
  { id:"playmaker",       label:"Playmaker",             ko:"플레이메이커",         desc:"패스 시야와 픽앤롤 운영으로 팀 공격을 조립하는 스타일",              ex:"Chris Paul" },
  { id:"3nd_wing",        label:"3&D Wing",              ko:"쓰리앤디 윙",          desc:"3점슛 + 강한 외곽 수비에 특화된 윙. 현대 농구 최고 수요 유형",      ex:"OG Anunoby" },
  { id:"slasher",         label:"Slasher",               ko:"슬래셔",               desc:"폭발적인 돌파와 림어택이 핵심인 공격 스타일",                        ex:"Ja Morant" },
  { id:"stretch_big",     label:"Stretch Big",           ko:"스트레치 빅",          desc:"빅맨이지만 외곽슛 능력이 뛰어나 스페이싱을 만드는 타입",             ex:"Karl-Anthony Towns" },
  { id:"rim_protector",   label:"Rim Protector",         ko:"림 프로텍터",          desc:"블락과 페인트존 수비로 골밑을 지키는 수비 앵커",                     ex:"Rudy Gobert" },
  { id:"point_forward",   label:"Point Forward",         ko:"포인트 포워드",        desc:"큰 사이즈로 볼핸들링과 패스를 하는 플레이메이킹 포워드",             ex:"LeBron James" },
  { id:"paint_beast",     label:"Paint Beast",           ko:"페인트 비스트",        desc:"리바운드와 포스트업으로 골밑을 지배하는 파워 빅맨",                   ex:"Joel Embiid" },
  { id:"microwave",       label:"Microwave Scorer",      ko:"마이크로웨이브",       desc:"벤치에서 나와 짧은 시간 동안 득점을 폭발시키는 유형",                ex:"Jordan Clarkson" },
  { id:"transition",      label:"Transition Finisher",   ko:"트랜지션 피니셔",      desc:"속공 상황에서 가장 위협적인 피니셔",                                  ex:"Giannis Antetokounmpo" },
  { id:"lockdown",        label:"Lockdown Defender",     ko:"락다운 디펜더",        desc:"에이스 스코어러를 전담 수비하는 수비 전문가",                        ex:"Kawhi Leonard" },
  { id:"pnr_maestro",     label:"Pick-and-Roll Maestro", ko:"픽앤롤 마에스트로",    desc:"픽앤롤 상황에서 득점과 패스를 동시에 만드는 가드",                   ex:"Luka Dončić" },
  { id:"offball_sniper",  label:"Off-Ball Sniper",       ko:"오프볼 스나이퍼",      desc:"공 없이 움직이며 캐치앤슛 3점을 넣는 슈터",                          ex:"Klay Thompson" },
  { id:"athletic_wing",   label:"Athletic Wing",         ko:"애슬레틱 윙",          desc:"운동능력 기반으로 덩크·수비·트랜지션에서 영향력 발휘",               ex:"Anthony Edwards" },
  { id:"post_tech",       label:"Post Technician",       ko:"포스트 테크니션",      desc:"발기술과 페이크로 포스트 공격을 하는 정교한 빅맨",                   ex:"Hakeem Olajuwon" },
  { id:"floor_general",   label:"Floor General",         ko:"플로어 제너럴",        desc:"경기 템포 조절과 전술 지휘에 특화된 가드",                           ex:"Jason Kidd" },
  { id:"swiss_knife",     label:"Swiss-Army Knife",      ko:"스위스 아미 나이프",   desc:"득점·수비·리바운드 등 여러 역할을 수행하는 만능형",                  ex:"Draymond Green" },
  { id:"rebounder",       label:"Rebounding Specialist", ko:"리바운딩 스페셜리스트", desc:"득점보다 리바운드와 허슬플레이 중심 역할",                          ex:"Dennis Rodman" },
  { id:"iso_scorer",      label:"Iso Scorer",            ko:"아이소 스코어러",      desc:"아이솔레이션에서 1대1 공격을 극대화하는 선수",                       ex:"James Harden" },
  { id:"two_way_star",    label:"Two-Way Superstar",     ko:"투웨이 슈퍼스타",      desc:"공격과 수비 모두 팀의 중심이 되는 슈퍼스타 유형",                   ex:"Jayson Tatum" },
];
const WEAKNESSES = ["왼손 약함","오른손 약함","수비 취약","체력 약함","3점슛 낮음","드리블 불안","신체접촉 약함","스크린 후 느림"];
const DRIVE_DIRS = ["왼쪽 선호","오른쪽 선호","양방향 가능","직선 돌파"];
const THREAT_CFG = {
  high:   { label:"위협 높음", color:"#ff4444", bg:"rgba(255,68,68,0.12)" },
  medium: { label:"위협 보통", color:"#ffb347", bg:"rgba(255,179,71,0.12)" },
  low:    { label:"위협 낮음", color:"#a8ff3e", bg:"rgba(168,255,62,0.12)" },
};
const DEFAULT_ZONE = {
  PG:{ cx:50, cy:80, rx:26, ry:16 },
  SG:{ cx:18, cy:62, rx:18, ry:13 },
  SF:{ cx:82, cy:62, rx:18, ry:13 },
  PF:{ cx:28, cy:40, rx:16, ry:11 },
  C: { cx:50, cy:30, rx:13, ry:10 },
};

// ── Shared styles ─────────────────────────────────────────────────────────
const LS = { display:"block", fontSize:"11px", color:"rgba(255,255,255,0.4)", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.5px" };
const IS = { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", padding:"8px 10px", color:"#fff", fontSize:"13px", outline:"none", boxSizing:"border-box" };

// ── Court constants ───────────────────────────────────────────────────────
const CW = 488, CM = 16;
const CCX = CM + CW / 2;
const FT = CW / 50;
const CD = 32 * FT;
const VBW = CW + CM * 2;
const VBH = CD + CM * 2;

// ── Style Tag Button (with tooltip) ──────────────────────────────────────
function StyleBtn({ style, active, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button onClick={onClick}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{ padding:"5px 11px", borderRadius:"20px", fontSize:"12px", cursor:"pointer", border:"1px solid", transition:"all 0.15s",
          background: active ? `${color}22` : "transparent",
          borderColor: active ? color : "rgba(255,255,255,0.15)",
          color: active ? color : "rgba(255,255,255,0.5)" }}>
        {style.ko}
      </button>
      {hover && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", zIndex:100, width:"220px", background:"#1a2540", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"10px", padding:"10px 12px", pointerEvents:"none", boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:"#fff", marginBottom:"3px" }}>{style.label}</div>
          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", lineHeight:"1.5", marginBottom:"5px" }}>{style.desc}</div>
          <div style={{ fontSize:"11px", color:"#ffb347" }}>예: {style.ex}</div>
          <div style={{ position:"absolute", bottom:"-5px", left:"50%", transform:"translateX(-50%)", width:"9px", height:"9px", background:"#1a2540", border:"1px solid rgba(255,255,255,0.15)", borderTop:"none", borderLeft:"none", rotate:"45deg" }}/>
        </div>
      )}
    </div>
  );
}

function TagBtn({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:"4px 10px", borderRadius:"20px", fontSize:"12px", cursor:"pointer", border:"1px solid", transition:"all 0.15s",
      background: active ? `${color}20` : "transparent",
      borderColor: active ? color : "rgba(255,255,255,0.15)",
      color: active ? color : "rgba(255,255,255,0.5)" }}>
      {label}
    </button>
  );
}

// ── My Team Player Form ───────────────────────────────────────────────────
const EP = { name:"", positions:[], height:"", strengths:"", playStyles:[], notes:"", photo:"" };

function PlayerForm({ player, onSave, onCancel }) {
  const [f, setF] = useState({ ...EP, ...(player||{}) });
  const togPos = (pos) => setF(p => ({ ...p, positions: p.positions.includes(pos) ? p.positions.filter(x=>x!==pos) : [...p.positions, pos] }));
  const togStyle = (id) => setF(p => ({ ...p, playStyles: p.playStyles.includes(id) ? p.playStyles.filter(x=>x!==id) : [...p.playStyles, id] }));
  const ac = f.positions.length ? POS_COLOR[f.positions[0]] : "#00e5ff";
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setF(p => ({...p, photo: ev.target.result}));
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"16px", padding:"20px", marginBottom:"16px" }}>
      <div style={{ display:"flex", gap:"16px", marginBottom:"12px", alignItems:"flex-start" }}>
        <div style={{ flexShrink:0 }}>
          <label style={{...LS, marginBottom:"6px"}}>프로필 사진</label>
          <label style={{ display:"block", width:"72px", height:"72px", borderRadius:"50%", border:`2px dashed ${ac}80`, background:`${ac}10`, cursor:"pointer", overflow:"hidden", position:"relative" }}>
            {f.photo
              ? <img src={f.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="프로필"/>
              : <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"2px" }}>
                  <span style={{ fontSize:"22px" }}>📷</span>
                  <span style={{ fontSize:"9px", color:`${ac}90`, textAlign:"center" }}>사진 추가</span>
                </div>
            }
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
          </label>
        </div>
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          <div><label style={LS}>이름 *</label><input style={IS} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="홍길동"/></div>
          <div><label style={LS}>키 (cm)</label><input style={IS} value={f.height} onChange={e=>setF(p=>({...p,height:e.target.value}))} placeholder="185"/></div>
        </div>
      </div>
      <div style={{ marginBottom:"12px" }}>
        <label style={LS}>포지션 (복수 선택)</label>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {POSITIONS.map(pos => {
            const active = f.positions.includes(pos);
            const c = POS_COLOR[pos];
            return (
              <button key={pos} onClick={()=>togPos(pos)} style={{ padding:"6px 12px", borderRadius:"8px", border:`1px solid ${active?c:"rgba(255,255,255,0.15)"}`, background:active?`${c}20`:"transparent", color:active?c:"rgba(255,255,255,0.5)", fontWeight:active?"700":"400", fontSize:"13px", cursor:"pointer", transition:"all 0.15s" }}>
                {pos}<span style={{fontSize:"10px",marginLeft:"4px",opacity:0.7}}>{POS_LABEL[pos]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom:"12px" }}><label style={LS}>장점 / 특징</label>
        <textarea style={{...IS,height:"60px",resize:"vertical"}} value={f.strengths} onChange={e=>setF(p=>({...p,strengths:e.target.value}))} placeholder="빠른 드리블, 강한 수비..."/></div>
      <div style={{ marginBottom:"16px" }}>
        <label style={LS}>🏀 플레이 스타일 <span style={{textTransform:"none",color:"rgba(255,255,255,0.25)",fontSize:"10px",marginLeft:"4px"}}>버튼에 마우스를 올리면 설명이 표시됩니다</span></label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          {PLAY_STYLES.map(s=><StyleBtn key={s.id} style={s} active={f.playStyles.includes(s.id)} color={ac} onClick={()=>togStyle(s.id)}/>)}
        </div>
      </div>
      <div style={{ marginBottom:"16px" }}><label style={LS}>메모</label>
        <textarea style={{...IS,height:"50px",resize:"vertical"}} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="특이사항..."/></div>
      <div style={{ display:"flex", gap:"8px" }}>
        <button onClick={()=>f.name&&onSave(f)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:f.name?"#00e5ff":"rgba(255,255,255,0.1)", color:f.name?"#000":"rgba(255,255,255,0.3)", fontWeight:"700", cursor:f.name?"pointer":"default" }}>저장</button>
        <button onClick={onCancel} style={{ padding:"10px 16px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>취소</button>
      </div>
    </div>
  );
}

// ── My Team Player Card ───────────────────────────────────────────────────
function PlayerCard({ player, onEdit, onDelete }) {
  const positions = player.positions||[];
  const c = positions.length ? POS_COLOR[positions[0]] : "#00e5ff";
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${c}30`, borderRadius:"12px", padding:"16px", transition:"border-color 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=c+"70"} onMouseLeave={e=>e.currentTarget.style.borderColor=c+"30"}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"10px" }}>
        <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:`${c}20`, border:`2px solid ${c}`, flexShrink:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px", fontWeight:"900", color:c }}>
          {player.photo ? <img src={player.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={player.name}/> : player.name.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <span style={{ fontSize:"16px", fontWeight:"700", color:"#fff" }}>{player.name}</span>
            {positions.map(pos=><span key={pos} style={{ background:`${POS_COLOR[pos]}20`, color:POS_COLOR[pos], border:`1px solid ${POS_COLOR[pos]}50`, borderRadius:"4px", padding:"1px 6px", fontSize:"11px", fontWeight:"700" }}>{pos}</span>)}
            {player.height&&<span style={{ color:"rgba(255,255,255,0.4)", fontSize:"12px" }}>{player.height}cm</span>}
          </div>
          {positions.length>0&&<div style={{ color:"rgba(255,255,255,0.4)", fontSize:"11px", marginTop:"2px" }}>{positions.map(p=>POS_LABEL[p]).join(" · ")}</div>}
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={onEdit} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"6px", padding:"4px 8px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"12px" }}>편집</button>
          <button onClick={onDelete} style={{ background:"rgba(255,60,60,0.1)", border:"none", borderRadius:"6px", padding:"4px 8px", color:"#ff6b6b", cursor:"pointer", fontSize:"12px" }}>삭제</button>
        </div>
      </div>
      {player.strengths&&<div style={{ marginBottom:"8px" }}><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginBottom:"4px" }}>💪 장점</div><div style={{ fontSize:"13px", color:"rgba(255,255,255,0.8)", lineHeight:"1.5" }}>{player.strengths}</div></div>}
      {(player.playStyles||[]).length>0&&<div style={{ marginBottom:"6px" }}><div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginBottom:"4px" }}>🏀 플레이 스타일</div><div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>{(player.playStyles||[]).map(id=>{ const s=PLAY_STYLES.find(x=>x.id===id); return s?<StyleTagCard key={id} style={s} color={c}/>:null; })}</div></div>}
      {player.notes&&<div style={{ marginTop:"8px", padding:"8px", background:"rgba(255,255,255,0.03)", borderRadius:"6px", fontSize:"12px", color:"rgba(255,255,255,0.5)", borderLeft:`2px solid ${c}50` }}>{player.notes}</div>}
    </div>
  );
}

// ── Style Tag Card (read-only with tooltip) ───────────────────────────────
function StyleTagCard({ style, color }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <span onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{ display:"inline-block", background:`${color}15`, color, border:`1px solid ${color}40`, borderRadius:"20px", padding:"2px 9px", fontSize:"11px", cursor:"default", userSelect:"none" }}>
        {style.ko}
      </span>
      {hover && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", zIndex:100, width:"210px", background:"#1a2540", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"10px", padding:"10px 12px", pointerEvents:"none", boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:"#fff", marginBottom:"3px" }}>{style.label}</div>
          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)", lineHeight:"1.5", marginBottom:"5px" }}>{style.desc}</div>
          <div style={{ fontSize:"11px", color:"#ffb347" }}>예: {style.ex}</div>
          <div style={{ position:"absolute", bottom:"-5px", left:"50%", transform:"translateX(-50%)", width:"9px", height:"9px", background:"#1a2540", border:"1px solid rgba(255,255,255,0.15)", borderTop:"none", borderLeft:"none", rotate:"45deg" }}/>
        </div>
      )}
    </div>
  );
}

// ── Court SVG ─────────────────────────────────────────────────────────────
function CourtSVG() {
  const lc = "rgba(255,255,255,0.9)", lw = 2.2;
  const bY = CM + 5.25*FT, rimR = FT*0.75;
  const pW = 16*FT, pX = CCX-pW/2, ftY = CM+19*FT, ftR = 6*FT, raR = 4*FT;
  const r3 = 23.75*FT, c3L = CM+3*FT, c3R = CM+CW-3*FT;
  const c3Y = bY + Math.sqrt(r3*r3 - (CCX-c3L)**2);
  const botY = CM+CD;
  const stripes = Array.from({length:21},(_,i)=>CM+i*(CW/20));
  return (
    <>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c8853a"/><stop offset="20%" stopColor="#d49550"/>
          <stop offset="40%" stopColor="#be7828"/><stop offset="60%" stopColor="#d09248"/>
          <stop offset="80%" stopColor="#c07830"/><stop offset="100%" stopColor="#c88540"/>
        </linearGradient>
        <linearGradient id="ws" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,230,170,0.22)"/>
          <stop offset="50%" stopColor="rgba(255,210,130,0.06)"/>
          <stop offset="100%" stopColor="rgba(160,90,10,0.12)"/>
        </linearGradient>
        <clipPath id="cc"><rect x={CM} y={CM} width={CW} height={CD}/></clipPath>
      </defs>
      <rect x={CM} y={CM} width={CW} height={CD} fill="url(#wg)"/>
      <rect x={CM} y={CM} width={CW} height={CD} fill="url(#ws)"/>
      <g clipPath="url(#cc)">
        {stripes.map((x,i)=><line key={i} x1={x} y1={CM} x2={x} y2={botY} stroke="rgba(150,90,20,0.09)" strokeWidth="1.4"/>)}
      </g>
      <g stroke={lc} strokeWidth={lw} fill="none">
        <line x1={CM} y1={CM} x2={CM+CW} y2={CM}/>
        <line x1={CM} y1={CM} x2={CM} y2={botY}/>
        <line x1={CM+CW} y1={CM} x2={CM+CW} y2={botY}/>
        <line x1={CM} y1={botY} x2={CM+CW} y2={botY}/>
        <rect x={pX} y={CM} width={pW} height={19*FT} fill="rgba(185,75,15,0.25)" stroke={lc} strokeWidth={lw}/>
        <line x1={pX} y1={ftY} x2={pX+pW} y2={ftY}/>
        <path d={`M ${CCX-ftR} ${ftY} A ${ftR} ${ftR} 0 0 0 ${CCX+ftR} ${ftY}`}/>
        <path d={`M ${CCX-ftR} ${ftY} A ${ftR} ${ftR} 0 0 1 ${CCX+ftR} ${ftY}`} strokeDasharray="9,6"/>
        <path d={`M ${CCX-raR} ${bY} A ${raR} ${raR} 0 0 1 ${CCX+raR} ${bY}`}/>
        {[7,8,11,14].map(f=>{
          const y=CM+f*FT;
          return <g key={f}><line x1={pX-7} y1={y} x2={pX} y2={y}/><line x1={pX+pW} y1={y} x2={pX+pW+7} y2={y}/></g>;
        })}
        <line x1={CCX-2*FT} y1={CM+4*FT} x2={CCX+2*FT} y2={CM+4*FT} strokeWidth={3.5}/>
        <circle cx={CCX} cy={bY} r={rimR} stroke="#ff7a00" strokeWidth={2.8}/>
        <line x1={c3L} y1={CM} x2={c3L} y2={c3Y}/>
        <line x1={c3R} y1={CM} x2={c3R} y2={c3Y}/>
        <path d={`M ${c3L} ${c3Y} A ${r3} ${r3} 0 0 0 ${c3R} ${c3Y}`}/>
      </g>
    </>
  );
}

// ── Half Court Editor ─────────────────────────────────────────────────────
const DEF_ZONE = { cx: CCX, cy: CM + CD * 0.62, rx: 55, ry: 35 };

function HalfCourtEditor({ players, zones, onZonesChange }) {
  const svgRef = useRef(null);
  const zonesRef = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  const [selId, setSelId] = useState(null);
  // drag: { id, handle: "move"|"rx"|"ry", startPt, startZone }
  const dragRef = useRef(null);

  const getZ = (id) => zonesRef.current[id] || { ...DEF_ZONE };

  const svgPt = (e) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - r.left) * (VBW / r.width), y: (clientY - r.top) * (VBH / r.height) };
  };

  const onHandleDown = (e, id, handle) => {
    e.preventDefault(); e.stopPropagation();
    setSelId(id);
    dragRef.current = { id, handle, startPt: svgPt(e), startZone: { ...getZ(id) } };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const cur = svgPt(e);
      const dx = cur.x - d.startPt.x;
      const dy = cur.y - d.startPt.y;
      const z = { ...d.startZone };
      if (d.handle === "move") {
        z.cx = Math.max(CM + z.rx, Math.min(CM + CW - z.rx, z.cx + dx));
        z.cy = Math.max(CM + z.ry, Math.min(CM + CD - z.ry, z.cy + dy));
      } else if (d.handle === "rx") {
        z.rx = Math.max(18, Math.min(CW * 0.48, d.startZone.rx + dx));
      } else if (d.handle === "ry") {
        z.ry = Math.max(14, Math.min(CD * 0.45, d.startZone.ry + dy));
      }
      onZonesChange(prev => ({ ...prev, [d.id]: z }));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onZonesChange]);

  const resetAll = () => {
    const next = {};
    const active = players.filter(p => p.name);
    active.forEach((p, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      next[p.id] = {
        cx: CM + CW * (0.12 + col * 0.24),
        cy: CM + CD * (0.42 + row * 0.24),
        rx: 52, ry: 34,
      };
    });
    onZonesChange(next);
  };

  const activePlayers = players.filter(p => p.name);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"10px" }}>
        <button onClick={resetAll} style={{ padding:"6px 14px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:"12px" }}>🔄 전체 초기화</button>
      </div>

      <div style={{ display:"flex", gap:"16px", alignItems:"flex-start", flexWrap:"wrap" }}>
        {/* SVG court */}
        <div style={{ flex:"1 1 380px", minWidth:"280px" }}>
          <svg ref={svgRef} viewBox={`0 0 ${VBW} ${VBH}`}
            style={{ width:"100%", borderRadius:"12px", border:"2px solid rgba(255,255,255,0.12)", userSelect:"none", touchAction:"none", boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}
            onClick={e => { if (e.target === e.currentTarget) setSelId(null); }}>
            <CourtSVG/>

            {activePlayers.map(player => {
              const z = getZ(player.id);
              const c = (player.positions||[]).length ? POS_COLOR[player.positions[0]] : "#00e5ff";
              const sel = selId === player.id;

              return (
                <g key={player.id}>
                  {/* ellipse body — drag to move */}
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={c} fillOpacity={sel ? 0.26 : 0.13}
                    stroke={c} strokeWidth={sel ? 2.5 : 1.5}
                    strokeDasharray={sel ? "none" : "8,4"}
                    style={{ cursor:"grab" }}
                    onMouseDown={e => onHandleDown(e, player.id, "move")}
                    onTouchStart={e => onHandleDown(e, player.id, "move")}
                    onClick={e => { e.stopPropagation(); setSelId(player.id); }}
                  />

                  {/* name label */}
                  <text x={z.cx} y={z.cy + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="12" fontWeight="800" fill={c}
                    stroke="rgba(0,0,0,0.7)" strokeWidth="2.5" paintOrder="stroke"
                    style={{ pointerEvents:"none" }}>
                    {player.name}
                  </text>
                  {(player.positions||[]).length > 0 && (
                    <text x={z.cx} y={z.cy + 14} textAnchor="middle"
                      fontSize="9" fill={c} fillOpacity="0.8"
                      stroke="rgba(0,0,0,0.6)" strokeWidth="2" paintOrder="stroke"
                      style={{ pointerEvents:"none" }}>
                      {player.positions.join("/")}
                    </text>
                  )}

                  {/* resize handles — only when selected */}
                  {sel && <>
                    {/* right handle: resize rx */}
                    <circle cx={z.cx + z.rx} cy={z.cy} r={9}
                      fill={c} stroke="#0a1628" strokeWidth="2"
                      style={{ cursor:"ew-resize" }}
                      onMouseDown={e => onHandleDown(e, player.id, "rx")}
                      onTouchStart={e => onHandleDown(e, player.id, "rx")}/>
                    <text x={z.cx + z.rx} y={z.cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fontWeight="900" fill="#0a1628" style={{ pointerEvents:"none" }}>↔</text>

                    {/* bottom handle: resize ry */}
                    <circle cx={z.cx} cy={z.cy + z.ry} r={9}
                      fill={c} stroke="#0a1628" strokeWidth="2"
                      style={{ cursor:"ns-resize" }}
                      onMouseDown={e => onHandleDown(e, player.id, "ry")}
                      onTouchStart={e => onHandleDown(e, player.id, "ry")}/>
                    <text x={z.cx} y={z.cy + z.ry + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize="9" fontWeight="900" fill="#0a1628" style={{ pointerEvents:"none" }}>↕</text>

                    {/* center dot */}
                    <circle cx={z.cx} cy={z.cy} r={4}
                      fill={c} stroke="#0a1628" strokeWidth="1.5"
                      style={{ pointerEvents:"none" }}/>
                  </>}
                </g>
              );
            })}
          </svg>
          <div style={{ marginTop:"8px", fontSize:"12px", color:"rgba(255,255,255,0.3)", textAlign:"center" }}>
            타원 클릭 후 드래그 → 이동 &nbsp;·&nbsp;
            <span style={{color:"rgba(255,255,255,0.5)"}}>↔</span> 가로 크기 &nbsp;·&nbsp;
            <span style={{color:"rgba(255,255,255,0.5)"}}>↕</span> 세로 크기
          </div>
        </div>

        {/* 선수 목록 */}
        <div style={{ width:"200px", flexShrink:0 }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color:"rgba(255,255,255,0.4)", marginBottom:"10px", textTransform:"uppercase", letterSpacing:"0.5px" }}>선수 선택</div>
          {!activePlayers.length && <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.2)", textAlign:"center", padding:"20px 0" }}>선수단 탭에서<br/>선수를 추가하세요</div>}
          {activePlayers.map(player => {
            const positions = player.positions || [];
            const c = positions.length ? POS_COLOR[positions[0]] : "#00e5ff";
            const sel = selId === player.id;
            return (
              <div key={player.id} onClick={() => setSelId(sel ? null : player.id)}
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"8px", marginBottom:"5px", cursor:"pointer", background: sel ? `${c}18` : "rgba(255,255,255,0.03)", border:`1px solid ${sel ? c+"60" : c+"20"}`, transition:"all 0.15s" }}>
                <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:`${c}25`, border:`2px solid ${c}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"800", color:c, flexShrink:0 }}>
                  {player.name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:"13px", fontWeight:"700", color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.name}</div>
                  <div style={{ fontSize:"10px", color:c }}>{positions.join(" · ") || "포지션 미설정"}</div>
                </div>
                {sel && <span style={{fontSize:"11px"}}>✏️</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Voice Tab ─────────────────────────────────────────────────────────────
function VoiceTab({ players, voices, onAdd, onDel }) {
  const [selPlayer, setSelPlayer] = useState("");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");

  const submit = () => {
    if (!selPlayer || !text.trim()) return;
    onAdd(selPlayer, text.trim());
    setText("");
  };

  const del = (id) => onDel(id);

  const activePlayers = players.filter(p => p.name);
  const selP = activePlayers.find(p => p.id === selPlayer);
  const selC = selP ? ((selP.positions||[]).length ? POS_COLOR[selP.positions[0]] : "#00e5ff") : "#00e5ff";

  const filtered = filter === "all" ? voices : voices.filter(v => v.playerId === filter);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"24px" }}>
        {/* Input card */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"16px", padding:"18px" }}>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"rgba(255,255,255,0.7)", marginBottom:"14px" }}>💬 의견 남기기</div>
          {/* Player picker */}
          <div style={{ marginBottom:"12px" }}>
            <label style={LS}>선수 선택</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
              {!activePlayers.length && <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.25)" }}>선수단 탭에서 선수를 등록하세요</div>}
              {activePlayers.map(p => {
                const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : "#00e5ff";
                const active = selPlayer === p.id;
                return (
                  <button key={p.id} onClick={() => setSelPlayer(active ? "" : p.id)}
                    style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 10px", borderRadius:"20px", border:`1px solid ${active ? c : "rgba(255,255,255,0.12)"}`, background: active ? `${c}20` : "transparent", cursor:"pointer", transition:"all 0.15s" }}>
                    <div style={{ width:"22px", height:"22px", borderRadius:"50%", overflow:"hidden", border:`1.5px solid ${c}`, flexShrink:0, background:`${c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800", color:c }}>
                      {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                    </div>
                    <span style={{ fontSize:"12px", color: active ? c : "rgba(255,255,255,0.55)", fontWeight: active ? "700" : "400" }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom:"12px" }}>
            <label style={LS}>의견 내용</label>
            <textarea
              style={{ ...IS, height:"100px", resize:"vertical", borderColor: selPlayer ? `${selC}50` : "rgba(255,255,255,0.12)" }}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={selPlayer ? `${selP?.name}으로 의견을 남겨보세요...` : "선수를 선택한 후 의견을 입력하세요"}
            />
          </div>
          <button onClick={submit} disabled={!selPlayer || !text.trim()}
            style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"none", background: selPlayer && text.trim() ? `linear-gradient(135deg, ${selC}, ${selC}aa)` : "rgba(255,255,255,0.06)", color: selPlayer && text.trim() ? "#000" : "rgba(255,255,255,0.25)", fontWeight:"700", fontSize:"13px", cursor: selPlayer && text.trim() ? "pointer" : "default", transition:"all 0.2s" }}>
            의견 등록
          </button>
        </div>

        {/* Summary */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:"16px", padding:"18px" }}>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"rgba(255,255,255,0.7)", marginBottom:"14px" }}>📊 참여 현황</div>
          {!activePlayers.length && <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.2)", textAlign:"center", padding:"20px 0" }}>선수를 등록하면<br/>참여 현황이 표시됩니다</div>}
          {activePlayers.map(p => {
            const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : "#00e5ff";
            const cnt = voices.filter(v => v.playerId === p.id).length;
            return (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                <div style={{ width:"30px", height:"30px", borderRadius:"50%", overflow:"hidden", border:`2px solid ${c}`, flexShrink:0, background:`${c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"800", color:c }}>
                  {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                    <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.7)" }}>{p.name}</span>
                    <span style={{ fontSize:"11px", color:cnt>0?c:"rgba(255,255,255,0.25)" }}>{cnt}개</span>
                  </div>
                  <div style={{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px" }}>
                    <div style={{ height:"100%", width: voices.length ? `${Math.min(cnt/Math.max(...activePlayers.map(pp=>voices.filter(v=>v.playerId===pp.id).length),1)*100,100)}%` : "0%", background:c, borderRadius:"2px", transition:"width 0.4s" }}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"rgba(255,255,255,0.7)" }}>의견 목록 <span style={{ color:"#00e5ff", fontSize:"13px" }}>{filtered.length}개</span></div>
          <div style={{ display:"flex", gap:"6px" }}>
            <button onClick={() => setFilter("all")} style={{ padding:"4px 12px", borderRadius:"20px", border:`1px solid ${filter==="all"?"#00e5ff":"rgba(255,255,255,0.12)"}`, background:filter==="all"?"rgba(0,229,255,0.12)":"transparent", color:filter==="all"?"#00e5ff":"rgba(255,255,255,0.4)", fontSize:"12px", cursor:"pointer" }}>전체</button>
            {activePlayers.map(p => {
              const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : "#00e5ff";
              const active = filter === p.id;
              return <button key={p.id} onClick={() => setFilter(active ? "all" : p.id)}
                style={{ padding:"4px 12px", borderRadius:"20px", border:`1px solid ${active?c:"rgba(255,255,255,0.12)"}`, background:active?`${c}18`:"transparent", color:active?c:"rgba(255,255,255,0.4)", fontSize:"12px", cursor:"pointer" }}>{p.name}</button>;
            })}
          </div>
        </div>

        {!filtered.length && <div style={{ textAlign:"center", padding:"40px", color:"rgba(255,255,255,0.2)", fontSize:"13px" }}>아직 의견이 없어요.<br/>첫 번째 의견을 남겨보세요! 🏀</div>}

        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map(v => {
            const p = activePlayers.find(x => x.id === v.playerId);
            if (!p) return null;
            const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : "#00e5ff";
            return (
              <div key={v.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${c}25`, borderRadius:"12px", padding:"14px 16px", position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                  <div style={{ width:"34px", height:"34px", borderRadius:"50%", overflow:"hidden", border:`2px solid ${c}`, flexShrink:0, background:`${c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:"800", color:c }}>
                    {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:"13px", fontWeight:"700", color:c }}>{p.name}</span>
                    {(p.positions||[]).length > 0 && <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginLeft:"6px" }}>{p.positions.join("/")}</span>}
                  </div>
                  <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)" }}>{v.ts}</span>
                  <button onClick={() => del(v.id)} style={{ background:"rgba(255,60,60,0.08)", border:"none", borderRadius:"5px", padding:"2px 7px", color:"rgba(255,100,100,0.6)", cursor:"pointer", fontSize:"11px" }}>✕</button>
                </div>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.8)", lineHeight:"1.65", paddingLeft:"44px" }}>{v.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Opponent Form ──────────────────────────────────────────────────────────
const EO = { name:"", positions:[], height:"", playStyle:[], weaknesses:[], driveDir:"", notes:"", threat:"medium" };

function OppForm({ player, onSave, onCancel }) {
  const [f, setF] = useState({ ...EO, ...(player||{}) });
  const togPos = (pos) => setF(p=>({ ...p, positions: (p.positions||[]).includes(pos) ? p.positions.filter(x=>x!==pos) : [...(p.positions||[]), pos] }));
  const togPS = (id) => setF(p=>({ ...p, playStyle: p.playStyle.includes(id) ? p.playStyle.filter(x=>x!==id) : [...p.playStyle, id] }));
  const togW  = (val) => setF(p=>({ ...p, weaknesses: p.weaknesses.includes(val) ? p.weaknesses.filter(x=>x!==val) : [...p.weaknesses, val] }));
  return (
    <div style={{ background:"rgba(255,60,60,0.04)", border:"1px solid rgba(255,60,60,0.18)", borderRadius:"16px", padding:"20px", marginBottom:"16px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
        <div><label style={LS}>이름 *</label><input style={IS} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="상대 선수명"/></div>
        <div><label style={LS}>키 (cm)</label><input style={IS} value={f.height} onChange={e=>setF(p=>({...p,height:e.target.value}))} placeholder="188"/></div>
      </div>
      <div style={{ marginBottom:"12px" }}>
        <label style={LS}>포지션 (복수 선택)</label>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {POSITIONS.map(pos => {
            const active = (f.positions||[]).includes(pos);
            const c = POS_COLOR[pos];
            return <button key={pos} onClick={()=>togPos(pos)} style={{ padding:"5px 10px", borderRadius:"8px", border:`1px solid ${active?c:"rgba(255,255,255,0.15)"}`, background:active?`${c}20`:"transparent", color:active?c:"rgba(255,255,255,0.5)", fontWeight:active?"700":"400", fontSize:"13px", cursor:"pointer", transition:"all 0.15s" }}>{pos}</button>;
          })}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
        <div><label style={LS}>위협도</label><select style={IS} value={f.threat} onChange={e=>setF(p=>({...p,threat:e.target.value}))}><option value="high">🔴 높음</option><option value="medium">🟡 보통</option><option value="low">🟢 낮음</option></select></div>
        <div><label style={LS}>돌파 선호 방향</label><select style={IS} value={f.driveDir} onChange={e=>setF(p=>({...p,driveDir:e.target.value}))}><option value="">미설정</option>{DRIVE_DIRS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
      </div>
      <div style={{ marginBottom:"12px" }}>
        <label style={LS}>🏀 플레이 스타일 <span style={{textTransform:"none",color:"rgba(255,255,255,0.25)",fontSize:"10px",marginLeft:"4px"}}>버튼에 마우스를 올리면 설명이 표시됩니다</span></label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          {PLAY_STYLES.map(s=><StyleBtn key={s.id} style={s} active={f.playStyle.includes(s.id)} color="#ff8080" onClick={()=>togPS(s.id)}/>)}
        </div>
      </div>
      <div style={{ marginBottom:"12px" }}><label style={LS}>⚠️ 약점 / 단점</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>{WEAKNESSES.map(s=><TagBtn key={s} label={s} active={f.weaknesses.includes(s)} color="#a8ff3e" onClick={()=>togW(s)}/>)}</div></div>
      <div style={{ marginBottom:"16px" }}><label style={LS}>📝 분석 메모</label>
        <textarea style={{...IS,height:"70px",resize:"vertical"}} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="수비 포인트, 매치업 전략..."/></div>
      <div style={{ display:"flex", gap:"8px" }}>
        <button onClick={()=>f.name&&onSave(f)} style={{ flex:1, padding:"10px", borderRadius:"8px", border:"none", background:f.name?"#ff6b6b":"rgba(255,255,255,0.1)", color:f.name?"#000":"rgba(255,255,255,0.3)", fontWeight:"700", cursor:f.name?"pointer":"default" }}>저장</button>
        <button onClick={onCancel} style={{ padding:"10px 16px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.15)", background:"transparent", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}>취소</button>
      </div>
    </div>
  );
}

// ── Opponent Card ──────────────────────────────────────────────────────────
function OppCard({ player, onEdit, onDelete }) {
  const [exp, setExp] = useState(false);
  const t = THREAT_CFG[player.threat]||THREAT_CFG.medium;
  const positions = player.positions||[];
  const pc = positions.length ? POS_COLOR[positions[0]] : "#aaa";
  const psIds = player.playStyle||[];
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,80,80,0.2)", borderRadius:"12px", overflow:"hidden", transition:"border-color 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,80,80,0.45)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,80,80,0.2)"}>
      <div style={{ height:"3px", background:t.color }}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"rgba(255,80,80,0.15)", border:`2px solid ${t.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"900", color:t.color, flexShrink:0 }}>{player.name.charAt(0)}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <span style={{ fontSize:"15px", fontWeight:"700", color:"#fff" }}>{player.name}</span>
              {positions.map(pos=><span key={pos} style={{ background:`${POS_COLOR[pos]}20`, color:POS_COLOR[pos], border:`1px solid ${POS_COLOR[pos]}40`, borderRadius:"4px", padding:"1px 6px", fontSize:"11px", fontWeight:"700" }}>{pos}</span>)}
              {player.height&&<span style={{ color:"rgba(255,255,255,0.4)", fontSize:"12px" }}>{player.height}cm</span>}
              <span style={{ background:t.bg, color:t.color, border:`1px solid ${t.color}40`, borderRadius:"20px", padding:"1px 8px", fontSize:"11px", fontWeight:"600" }}>{t.label}</span>
            </div>
            {player.driveDir&&<div style={{ fontSize:"11px", color:"rgba(255,200,100,0.85)", marginTop:"3px" }}>🏃 {player.driveDir}</div>}
          </div>
          <div style={{ display:"flex", gap:"5px" }}>
            <button onClick={()=>setExp(v=>!v)} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"6px", padding:"4px 8px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"12px" }}>{exp?"접기":"펼치기"}</button>
            <button onClick={onEdit} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:"6px", padding:"4px 8px", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:"12px" }}>편집</button>
            <button onClick={onDelete} style={{ background:"rgba(255,60,60,0.1)", border:"none", borderRadius:"6px", padding:"4px 8px", color:"#ff6b6b", cursor:"pointer", fontSize:"12px" }}>삭제</button>
          </div>
        </div>
        {(psIds.length>0||player.weaknesses.length>0)&&(
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"4px" }}>
            {psIds.map(id=>{ const s=PLAY_STYLES.find(x=>x.id===id); return s?<StyleTagCard key={id} style={s} color="#ff8080"/>:null; })}
            {player.weaknesses.map(s=><span key={s} style={{ background:"rgba(168,255,62,0.10)", color:"#a8ff3e", border:"1px solid rgba(168,255,62,0.25)", borderRadius:"20px", padding:"2px 8px", fontSize:"11px" }}>⚠ {s}</span>)}
          </div>
        )}
        {exp&&player.notes&&<div style={{ marginTop:"8px", padding:"10px", background:"rgba(255,255,255,0.03)", borderRadius:"8px", fontSize:"13px", color:"rgba(255,255,255,0.72)", lineHeight:"1.6", borderLeft:"2px solid rgba(255,107,107,0.4)" }}>{player.notes}</div>}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

// ── Main App (Firebase Realtime DB) ───────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("우리 팀");
  const [editTN, setEditTN] = useState(false);
  const [players, setPlayers] = useState([]);
  const [zones, setZones] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [tab, setTab] = useState("roster");
  const [strat, setStrat] = useState({ offense:"", defense:"", notes:"" });
  const [editStrat, setEditStrat] = useState(false);
  const [oppTeams, setOppTeams] = useState([{ id:"t1", name:"상대 팀 1", players:[] }]);
  const [selTeamId, setSelTeamId] = useState("t1");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [oppForm, setOppForm] = useState(false);
  const [oppIdx, setOppIdx] = useState(null);
  const [voices, setVoices] = useState([]);
  const [syncStatus, setSyncStatus] = useState("연결 중...");

  // ── Firebase listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [];

    const listen = (path, handler) => {
      const r = ref(db, path);
      const unsub = onValue(r, (snap) => handler(snap.val()), (err) => {
        console.error(path, err);
        setSyncStatus("⚠️ 연결 오류");
      });
      unsubs.push(unsub);
    };

    listen("teamName", (val) => { if (val) setTeamName(val); });
    listen("players", (val) => { setPlayers(val ? toArr(val) : []); });
    listen("zones",   (val) => { setZones(val || {}); });
    listen("strategy",(val) => { if (val) setStrat(val); });
    listen("oppTeams",(val) => {
      if (val) {
        const teams = toArr(val).map(t => ({ ...t, players: t.players ? toArr(t.players) : [] }));
        setOppTeams(teams.length ? teams : [{ id:"t1", name:"상대 팀 1", players:[] }]);
      }
    });
    listen("voices",  (val) => {
      if (val) {
        const arr = toArr(val).sort((a,b) => (b.tsNum||0)-(a.tsNum||0));
        setVoices(arr);
      } else { setVoices([]); }
    });

    // mark loaded after first tick
    setTimeout(() => { setLoading(false); setSyncStatus("🟢 실시간 연결됨"); }, 1200);
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Write helpers ───────────────────────────────────────────────────────
  const fbSet   = (path, val) => set(ref(db, path), val).catch(console.error);
  const fbPush  = (path, val) => push(ref(db, path), val).catch(console.error);
  const fbDel   = (path)      => remove(ref(db, path)).catch(console.error);
  const fbUpd   = (path, val) => update(ref(db, path), val).catch(console.error);

  // ── Team name ───────────────────────────────────────────────────────────
  const saveTeamName = (name) => { setTeamName(name); fbSet("teamName", name); };

  // ── Players ─────────────────────────────────────────────────────────────
  const savePlayer = (p) => {
    if (editIdx !== null) {
      const id = players[editIdx].id;
      fbSet(`players/${id}`, { ...p, id });
      setEditIdx(null);
    } else {
      fbPush("players", p);
    }
    setShowForm(false);
  };
  const delPlayer = (i) => {
    const id = players[i].id;
    fbDel(`players/${id}`);
    fbDel(`zones/${id}`);
  };

  // ── Zones ───────────────────────────────────────────────────────────────
  const saveZones = (newZones) => {
    setZones(newZones);
    fbSet("zones", newZones);
  };

  // ── Strategy ────────────────────────────────────────────────────────────
  const saveStrat = (s) => { setStrat(s); fbSet("strategy", s); };

  // ── Voices ──────────────────────────────────────────────────────────────
  const addVoice = (playerId, text) => {
    const now = new Date();
    const ts = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    fbPush("voices", { playerId, text, ts, tsNum: Date.now() });
  };
  const delVoice = (id) => fbDel(`voices/${id}`);

  // ── OppTeams ─────────────────────────────────────────────────────────────
  const curTeam = oppTeams.find(t=>t.id===selTeamId) || oppTeams[0];
  const opps = curTeam ? curTeam.players : [];

  const saveOpp = (p) => {
    if (oppIdx !== null) {
      const oid = opps[oppIdx].id;
      fbSet(`oppTeams/${curTeam.id}/players/${oid}`, { ...p, id: oid });
      setOppIdx(null);
    } else {
      fbPush(`oppTeams/${curTeam.id}/players`, p);
    }
    setOppForm(false);
  };
  const delOpp = (i) => { const oid = opps[i].id; fbDel(`oppTeams/${curTeam.id}/players/${oid}`); };

  const addTeam = () => {
    const newRef = push(ref(db, "oppTeams"), { name:`상대 팀 ${oppTeams.length+1}`, players:{} });
    newRef.then(() => { if(newRef.key) setSelTeamId(newRef.key); }).catch(console.error);
    setOppForm(false); setOppIdx(null);
  };
  const delTeam = (id) => {
    fbDel(`oppTeams/${id}`);
    const remaining = oppTeams.filter(t=>t.id!==id);
    if (selTeamId===id && remaining.length) setSelTeamId(remaining[0].id);
  };
  const renameTeam = (id, name) => fbUpd(`oppTeams/${id}`, { name });

  // ── Derived ──────────────────────────────────────────────────────────────
  const posSumm = POSITIONS.map(pos=>({pos,count:players.filter(p=>(p.positions||[]).includes(pos)).length})).filter(x=>x.count>0);
  const highThreat = opps.filter(p=>p.threat==="high");
  const TABS = [{id:"roster",label:"🏃 선수단"},{id:"court",label:"🗺 코트 배치"},{id:"strategy",label:"⚔️ 전략"},{id:"voice",label:"💬 팀 의견함"},{id:"opponent",label:"🔍 상대팀 분석"}];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#060d1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px" }}>
      <svg viewBox="0 0 100 100" style={{ width:"80px", height:"80px", animation:"spin 1.5s linear infinite" }}>
        <style>{`@keyframes spin { from{transform-origin:50% 50%;transform:rotate(0deg)} to{transform-origin:50% 50%;transform:rotate(360deg)} }`}</style>
        <ellipse cx="50" cy="62" rx="32" ry="28" fill="#F5C518"/>
        <polygon points="20,42 10,12 32,30" fill="#F5C518"/><polygon points="80,42 90,12 68,30" fill="#F5C518"/>
        <polygon points="20,42 10,12 16,18" fill="#1a1a1a"/><polygon points="80,42 90,12 84,18" fill="#1a1a1a"/>
        <ellipse cx="50" cy="52" rx="26" ry="24" fill="#F5C518"/>
        <circle cx="40" cy="46" r="5" fill="#1a1a1a"/><circle cx="60" cy="46" r="5" fill="#1a1a1a"/>
        <circle cx="41.5" cy="44.5" r="1.8" fill="#fff"/><circle cx="61.5" cy="44.5" r="1.8" fill="#fff"/>
        <ellipse cx="50" cy="54" rx="3" ry="2" fill="#c0392b"/>
        <path d="M44 57 Q50 63 56 57" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="34" cy="57" r="6" fill="#ff6b6b" fillOpacity="0.7"/><circle cx="66" cy="57" r="6" fill="#ff6b6b" fillOpacity="0.7"/>
      </svg>
      <div style={{ color:"rgba(255,255,255,0.5)", fontSize:"14px" }}>Firebase 연결 중...</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#060d1a", fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", color:"#fff" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(180deg,#0a1628,#060d1a)", borderBottom:"1px solid rgba(0,229,255,0.15)", padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"10px", overflow:"hidden", flexShrink:0 }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"100%" }}>
              <ellipse cx="50" cy="62" rx="32" ry="28" fill="#F5C518"/>
              <polygon points="20,42 10,12 32,30" fill="#F5C518"/><polygon points="80,42 90,12 68,30" fill="#F5C518"/>
              <polygon points="22,38 14,18 30,30" fill="#F5C518"/><polygon points="78,38 86,18 70,30" fill="#F5C518"/>
              <polygon points="20,42 10,12 16,18" fill="#1a1a1a"/><polygon points="80,42 90,12 84,18" fill="#1a1a1a"/>
              <ellipse cx="50" cy="52" rx="26" ry="24" fill="#F5C518"/>
              <circle cx="40" cy="46" r="5" fill="#1a1a1a"/><circle cx="60" cy="46" r="5" fill="#1a1a1a"/>
              <circle cx="41.5" cy="44.5" r="1.8" fill="#fff"/><circle cx="61.5" cy="44.5" r="1.8" fill="#fff"/>
              <ellipse cx="50" cy="54" rx="3" ry="2" fill="#c0392b"/>
              <path d="M44 57 Q50 63 56 57" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="34" cy="57" r="6" fill="#ff6b6b" fillOpacity="0.7"/><circle cx="66" cy="57" r="6" fill="#ff6b6b" fillOpacity="0.7"/>
              <path d="M82 68 L92 55 L88 72 Z" fill="#F5C518"/><path d="M88 55 L96 48 L94 60 Z" fill="#F5C518"/>
            </svg>
          </div>
          <div>
            {editTN
              ? <input autoFocus style={{...IS,fontSize:"18px",fontWeight:"800",padding:"2px 8px",width:"180px"}} value={teamName}
                  onChange={e=>setTeamName(e.target.value)}
                  onBlur={()=>{ saveTeamName(teamName); setEditTN(false); }}
                  onKeyDown={e=>e.key==="Enter"&&(saveTeamName(teamName),setEditTN(false))}/>
              : <h1 onClick={()=>setEditTN(true)} style={{ margin:0, fontSize:"18px", fontWeight:"800", cursor:"pointer" }}>{teamName} <span style={{fontSize:"12px",color:"rgba(255,255,255,0.3)"}}>✏️</span></h1>}
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)" }}>농구팀 전략 대시보드</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
          {posSumm.map(({pos,count})=><div key={pos} style={{textAlign:"center"}}><div style={{fontSize:"18px",fontWeight:"800",color:POS_COLOR[pos]}}>{count}</div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>{pos}</div></div>)}
          <div style={{ textAlign:"center", marginLeft:"8px", paddingLeft:"16px", borderLeft:"1px solid rgba(255,255,255,0.1)" }}><div style={{fontSize:"18px",fontWeight:"800"}}>{players.length}</div><div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>총 선수</div></div>
          <div style={{ fontSize:"11px", color: syncStatus.includes("🟢") ? "#a8ff3e" : syncStatus.includes("⚠️") ? "#ffb347" : "rgba(255,255,255,0.3)", padding:"4px 10px", borderRadius:"20px", border:`1px solid ${syncStatus.includes("🟢")?"rgba(168,255,62,0.25)":syncStatus.includes("⚠️")?"rgba(255,179,71,0.25)":"rgba(255,255,255,0.1)"}`, background: syncStatus.includes("🟢")?"rgba(168,255,62,0.06)":"transparent" }}>{syncStatus}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"0 24px", overflowX:"auto" }}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none", border:"none", padding:"14px 16px", cursor:"pointer", fontSize:"13px", fontWeight:"600", whiteSpace:"nowrap", color:tab===t.id?"#00e5ff":"rgba(255,255,255,0.4)", borderBottom:tab===t.id?"2px solid #00e5ff":"2px solid transparent", transition:"all 0.2s" }}>{t.label}</button>)}
      </div>

      <div style={{ padding:"20px 24px", maxWidth:"1200px", margin:"0 auto" }}>

        {/* ROSTER */}
        {tab==="roster"&&<div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700", color:"rgba(255,255,255,0.7)" }}>선수 목록 <span style={{color:"#00e5ff"}}>{players.length}명</span></h2>
            {!showForm&&<button onClick={()=>{setShowForm(true);setEditIdx(null);}} style={{ background:"linear-gradient(135deg,#00e5ff,#0099bb)", border:"none", borderRadius:"8px", padding:"8px 16px", color:"#000", fontWeight:"700", cursor:"pointer", fontSize:"13px" }}>+ 선수 추가</button>}
          </div>
          {showForm&&<PlayerForm player={editIdx!==null?players[editIdx]:null} onSave={savePlayer} onCancel={()=>{setShowForm(false);setEditIdx(null);}}/>}
          {!players.length&&!showForm
            ? <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,0.2)" }}><div style={{fontSize:"48px",marginBottom:"12px"}}>🏀</div><div style={{fontSize:"16px",marginBottom:"8px"}}>선수가 없어요</div><div style={{fontSize:"13px"}}>+ 선수 추가 버튼으로 팀원을 등록하세요</div></div>
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"12px" }}>{players.map((p,i)=>editIdx===i&&showForm?null:<PlayerCard key={p.id} player={p} onEdit={()=>{setEditIdx(i);setShowForm(true);}} onDelete={()=>delPlayer(i)}/>)}</div>}
        </div>}

        {/* COURT */}
        {tab==="court"&&<div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700", color:"rgba(255,255,255,0.7)" }}>선호 공격 위치</h2>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)" }}>선수 클릭 후 타원 드래그</div>
          </div>
          <HalfCourtEditor players={players} zones={zones} onZonesChange={saveZones}/>
        </div>}

        {/* STRATEGY */}
        {tab==="strategy"&&<div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
            <h2 style={{ margin:0, fontSize:"15px", fontWeight:"700", color:"rgba(255,255,255,0.7)" }}>팀 전략</h2>
            <button onClick={()=>{ if(editStrat) saveStrat(strat); setEditStrat(v=>!v); }}
              style={{ background:editStrat?"#00e5ff":"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"8px 14px", color:editStrat?"#000":"rgba(255,255,255,0.6)", fontWeight:"700", cursor:"pointer", fontSize:"13px" }}>
              {editStrat?"💾 저장":"✏️ 편집"}
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
            {[{k:"offense",label:"⚡ 공격 전략",c:"#ff6b35",ph:"예) 픽앤롤 중심의 빠른 속공..."},{k:"defense",label:"🛡 수비 전략",c:"#00e5ff",ph:"예) 맨투맨 기반 헬프 디펜스..."}].map(({k,label,c,ph})=>(
              <div key={k} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${c}20`, borderRadius:"12px", padding:"16px" }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:c, marginBottom:"10px" }}>{label}</div>
                {editStrat
                  ? <textarea style={{...IS,height:"120px",resize:"vertical"}} value={strat[k]} onChange={e=>setStrat(s=>({...s,[k]:e.target.value}))} placeholder={ph}/>
                  : <div style={{ fontSize:"13px", color:strat[k]?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.2)", lineHeight:"1.7", minHeight:"80px" }}>{strat[k]||ph}</div>}
              </div>
            ))}
          </div>
          <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#a8ff3e", marginBottom:"10px" }}>📋 기타 전술 메모</div>
            {editStrat
              ? <textarea style={{...IS,height:"100px",resize:"vertical"}} value={strat.notes} onChange={e=>setStrat(s=>({...s,notes:e.target.value}))} placeholder="타임아웃 전략, 세트플레이..."/>
              : <div style={{ fontSize:"13px", color:strat.notes?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.2)", lineHeight:"1.7", minHeight:"60px" }}>{strat.notes||"타임아웃 전략, 세트플레이..."}</div>}
          </div>
        </div>}

        {/* VOICE */}
        {tab==="voice"&&<VoiceTab players={players} voices={voices} onAdd={addVoice} onDel={delVoice}/>}

        {/* OPPONENT */}
        {tab==="opponent"&&<div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"20px", flexWrap:"wrap" }}>
            {oppTeams.map(t=>{
              const isSel = t.id===selTeamId;
              const isEditing = editingTeamId===t.id;
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:"4px", padding:"6px 10px 6px 14px", borderRadius:"30px", cursor:"pointer", border:`1px solid ${isSel?"rgba(255,100,100,0.6)":"rgba(255,255,255,0.1)"}`, background:isSel?"rgba(255,80,80,0.12)":"rgba(255,255,255,0.03)", transition:"all 0.15s" }}
                  onClick={()=>{ setSelTeamId(t.id); setOppForm(false); setOppIdx(null); }}>
                  {isEditing
                    ? <input autoFocus style={{...IS,width:"100px",padding:"0",background:"transparent",border:"none",fontSize:"13px",fontWeight:"700",color:"#ff8080"}}
                        value={t.name} onChange={e=>renameTeam(t.id,e.target.value)}
                        onBlur={()=>setEditingTeamId(null)} onKeyDown={e=>e.key==="Enter"&&setEditingTeamId(null)}
                        onClick={e=>e.stopPropagation()}/>
                    : <span style={{ fontSize:"13px", fontWeight:"700", color:isSel?"#ff8080":"rgba(255,255,255,0.55)" }}>{t.name}</span>}
                  {isSel&&!isEditing&&<span onClick={e=>{e.stopPropagation();setEditingTeamId(t.id);}} style={{fontSize:"11px",marginLeft:"4px",cursor:"pointer",opacity:0.5}}>✏️</span>}
                  {oppTeams.length>1&&isSel&&<span onClick={e=>{e.stopPropagation();delTeam(t.id);}} style={{fontSize:"12px",marginLeft:"4px",cursor:"pointer",opacity:0.4,color:"#ff6b6b"}}>✕</span>}
                </div>
              );
            })}
            <button onClick={addTeam} style={{ padding:"6px 14px", borderRadius:"30px", border:"1px dashed rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.4)", fontSize:"13px", cursor:"pointer" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,100,100,0.5)";e.currentTarget.style.color="#ff8080";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.2)";e.currentTarget.style.color="rgba(255,255,255,0.4)";}}>
              + 팀 추가
            </button>
          </div>

          {curTeam&&<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(255,60,60,0.12)", border:"1px solid rgba(255,60,60,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>🔍</div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:"700", color:"rgba(255,255,255,0.7)" }}>{curTeam.name} <span style={{color:"#ff8080"}}>선수 분석</span></div>
                <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)" }}>총 {opps.length}명 등록됨</div>
              </div>
            </div>
            {!oppForm&&<button onClick={()=>{setOppForm(true);setOppIdx(null);}} style={{ background:"linear-gradient(135deg,#ff6b6b,#cc2222)", border:"none", borderRadius:"8px", padding:"8px 16px", color:"#fff", fontWeight:"700", cursor:"pointer", fontSize:"13px" }}>+ 선수 추가</button>}
          </div>}

          {highThreat.length>0&&<div style={{ background:"rgba(255,62,62,0.08)", border:"1px solid rgba(255,62,62,0.28)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{fontSize:"18px"}}>🚨</span>
            <div><div style={{fontSize:"13px",fontWeight:"700",color:"#ff6b6b",marginBottom:"4px"}}>주요 위협 선수</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{highThreat.map(p=><span key={p.id} style={{background:"rgba(255,62,62,0.15)",color:"#ff8080",border:"1px solid rgba(255,62,62,0.35)",borderRadius:"20px",padding:"2px 10px",fontSize:"12px",fontWeight:"600"}}>{p.name}</span>)}</div>
            </div>
          </div>}

          {oppForm&&<OppForm player={oppIdx!==null?opps[oppIdx]:null} onSave={saveOpp} onCancel={()=>{setOppForm(false);setOppIdx(null);}}/>}
          {!opps.length&&!oppForm&&<div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,0.2)" }}><div style={{fontSize:"48px",marginBottom:"12px"}}>🔍</div><div style={{fontSize:"16px",marginBottom:"8px"}}>선수 정보가 없어요</div><div style={{fontSize:"13px"}}>+ 선수 추가로 분석을 시작하세요</div></div>}

          {opps.length>0&&<div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            {POSITIONS.map(pos=>{ const plist=opps.filter(p=>(p.positions||[]).includes(pos)||(!(p.positions||[]).length&&pos==="PG")); if(!plist.length) return null; return (
              <div key={pos}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <div style={{ width:"6px", height:"20px", borderRadius:"3px", background:POS_COLOR[pos] }}/>
                  <span style={{fontSize:"13px",fontWeight:"700",color:POS_COLOR[pos]}}>{pos}</span>
                  <span style={{fontSize:"12px",color:"rgba(255,255,255,0.3)"}}>{POS_LABEL[pos]} · {plist.length}명</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"10px" }}>
                  {plist.map(player=>{ const gi=opps.findIndex(p=>p.id===player.id); return oppIdx===gi&&oppForm?null:<OppCard key={player.id} player={player} onEdit={()=>{setOppIdx(gi);setOppForm(true);}} onDelete={()=>delOpp(gi)}/>; })}
                </div>
              </div>);
            })}
          </div>}
        </div>}

      </div>
    </div>
  );
}
