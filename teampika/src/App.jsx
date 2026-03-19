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

const toArr = (snap) => {
  if (!snap) return [];
  if (Array.isArray(snap)) return snap.filter(Boolean);
  return Object.entries(snap).map(([id, v]) => ({ ...(typeof v === 'object' ? v : {}), id }));
};
const normArr = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
};

// ── Constants (unchanged) ──────────────────────────────────────────────────
const POSITIONS = ["PG","SG","SF","PF","C"];

// ★ 인스타 감성 포지션 컬러 — 채도 낮은 파스텔/뮤트 계열
const POS_COLOR = {
  PG: "#5B8DEF",  // soft blue
  SG: "#F2845C",  // muted coral
  SF: "#5CB87A",  // sage green
  PF: "#C97BB2",  // dusty pink/purple
  C:  "#E5B84A",  // warm amber
};
const POS_LABEL = { PG:"포인트가드", SG:"슈팅가드", SF:"스몰포워드", PF:"파워포워드", C:"센터" };

const PLAY_STYLES = [
  { id:"shot_creator",    label:"Shot Creator",          ko:"샷 크리에이터",       desc:"드리블로 공간 만들고 미드레인지·스텝백 점퍼를 만드는 공격형 가드",   ex:"Kyrie Irving" },
  { id:"catch&shooter",   label:"catch&shooter",         ko:"캐치앤슈터",          desc:"패스를 받은 즉시 바로 슛을 시도할 수 있는 그래비티 창출형 선수",   ex:"Klay Thompson" },
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
  high:   { label:"위협 높음", color:"#E05555", bg:"rgba(224,85,85,0.08)" },
  medium: { label:"위협 보통", color:"#D4952A", bg:"rgba(212,149,42,0.08)" },
  low:    { label:"위협 낮음", color:"#5CB87A", bg:"rgba(92,184,122,0.08)" },
};
const DEFAULT_ZONE = {
  PG:{ cx:50, cy:80, rx:26, ry:16 },
  SG:{ cx:18, cy:62, rx:18, ry:13 },
  SF:{ cx:82, cy:62, rx:18, ry:13 },
  PF:{ cx:28, cy:40, rx:16, ry:11 },
  C: { cx:50, cy:30, rx:13, ry:10 },
};

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:        "#F7F7F5",       // 오프화이트 배경
  surface:   "#FFFFFF",       // 카드 흰색
  surfaceAlt:"#F2F1EE",       // 살짝 회색 서피스
  border:    "#E8E6E1",       // 연한 베이지 보더
  borderMid: "#D5D2CB",       // 조금 진한 보더
  text:      "#1A1A1A",       // 거의 검정
  textSub:   "#6B6860",       // 서브 텍스트
  textMuted: "#AAA89F",       // 뮤트 텍스트
  accent:    "#1A1A1A",       // 액센트 = 다크
  accentSoft:"#F0EDE8",       // 소프트 액센트 배경
  danger:    "#E05555",
  dangerBg:  "rgba(224,85,85,0.07)",
};

// ── Shared styles (redesigned) ─────────────────────────────────────────────
const LS = {
  display:"block",
  fontSize:"11px",
  color: T.textMuted,
  marginBottom:"6px",
  textTransform:"uppercase",
  letterSpacing:"0.6px",
  fontWeight:"500",
};
const IS = {
  width:"100%",
  background: T.surface,
  border:`1px solid ${T.border}`,
  borderRadius:"10px",
  padding:"9px 12px",
  color: T.text,
  fontSize:"13px",
  outline:"none",
  boxSizing:"border-box",
  fontFamily:"inherit",
  transition:"border-color 0.15s",
};

// ── Court constants (unchanged) ────────────────────────────────────────────
const CW = 488, CM = 16;
const CCX = CM + CW / 2;
const FT = CW / 50;
const CD = 32 * FT;
const VBW = CW + CM * 2;
const VBH = CD + CM * 2;

// ── StyleBtn ──────────────────────────────────────────────────────────────
function StyleBtn({ style, active, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button onClick={onClick}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{
          padding:"5px 12px", borderRadius:"20px", fontSize:"12px", cursor:"pointer",
          border:`1px solid ${active ? color : T.border}`,
          background: active ? color : T.surface,
          color: active ? "#fff" : T.textSub,
          fontWeight: active ? "600" : "400",
          transition:"all 0.15s",
          fontFamily:"inherit",
        }}>
        {style.ko}
      </button>
      {hover && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)",
          zIndex:100, width:"220px", background: T.surface,
          border:`1px solid ${T.border}`, borderRadius:"12px", padding:"12px 14px",
          pointerEvents:"none", boxShadow:"0 8px 24px rgba(0,0,0,0.10)",
        }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color: T.text, marginBottom:"3px" }}>{style.label}</div>
          <div style={{ fontSize:"11px", color: T.textSub, lineHeight:"1.5", marginBottom:"5px" }}>{style.desc}</div>
          <div style={{ fontSize:"11px", color: T.accentSoft === "#F0EDE8" ? "#888" : T.accent }}>예: {style.ex}</div>
          <div style={{ position:"absolute", bottom:"-5px", left:"50%", transform:"translateX(-50%)", width:"9px", height:"9px", background: T.surface, border:`1px solid ${T.border}`, borderTop:"none", borderLeft:"none", rotate:"45deg" }}/>
        </div>
      )}
    </div>
  );
}

function TagBtn({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 12px", borderRadius:"20px", fontSize:"12px", cursor:"pointer",
      border:`1px solid ${active ? color : T.border}`,
      background: active ? color : T.surface,
      color: active ? "#fff" : T.textSub,
      fontWeight: active ? "600" : "400",
      transition:"all 0.15s", fontFamily:"inherit",
    }}>
      {label}
    </button>
  );
}

// ── PlayerForm ─────────────────────────────────────────────────────────────
const EP = { name:"", positions:[], height:"", strengths:"", playStyles:[], notes:"", photo:"" };

function PlayerForm({ player, onSave, onCancel }) {
  const [f, setF] = useState({ ...EP, ...(player||{}) });
  const togPos = (pos) => setF(p => ({ ...p, positions: p.positions.includes(pos) ? p.positions.filter(x=>x!==pos) : [...p.positions, pos] }));
  const togStyle = (id) => setF(p => ({ ...p, playStyles: p.playStyles.includes(id) ? p.playStyles.filter(x=>x!==id) : [...p.playStyles, id] }));
  const ac = f.positions.length ? POS_COLOR[f.positions[0]] : POS_COLOR.PG;
  const handlePhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setF(p => ({...p, photo: ev.target.result}));
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"22px", marginBottom:"16px", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize:"14px", fontWeight:"700", color: T.text, marginBottom:"18px" }}>
        {player ? "선수 편집" : "새 선수 추가"}
      </div>
      <div style={{ display:"flex", gap:"16px", marginBottom:"14px", alignItems:"flex-start" }}>
        <div style={{ flexShrink:0 }}>
          <label style={{...LS, marginBottom:"6px"}}>프로필</label>
          <label style={{ display:"block", width:"68px", height:"68px", borderRadius:"50%", border:`2px dashed ${ac}80`, background:`${ac}10`, cursor:"pointer", overflow:"hidden", position:"relative" }}>
            {f.photo
              ? <img src={f.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="프로필"/>
              : <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"2px" }}>
                  <span style={{ fontSize:"20px" }}>📷</span>
                  <span style={{ fontSize:"9px", color: T.textMuted, textAlign:"center" }}>추가</span>
                </div>
            }
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
          </label>
        </div>
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          <div>
            <label style={LS}>이름 *</label>
            <input style={IS} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="홍길동"
              onFocus={e=>e.target.style.borderColor=ac} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div>
            <label style={LS}>키 (cm)</label>
            <input style={IS} value={f.height} onChange={e=>setF(p=>({...p,height:e.target.value}))} placeholder="185"
              onFocus={e=>e.target.style.borderColor=ac} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:"14px" }}>
        <label style={LS}>포지션</label>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {POSITIONS.map(pos => {
            const active = f.positions.includes(pos);
            const c = POS_COLOR[pos];
            return (
              <button key={pos} onClick={()=>togPos(pos)} style={{
                padding:"6px 14px", borderRadius:"10px", border:`1px solid ${active ? c : T.border}`,
                background: active ? c : T.surface, color: active ? "#fff" : T.textSub,
                fontWeight: active ? "700" : "400", fontSize:"13px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
              }}>
                {pos}
                <span style={{ fontSize:"10px", marginLeft:"4px", opacity:0.75 }}>{POS_LABEL[pos]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom:"14px" }}>
        <label style={LS}>장점 / 특징</label>
        <textarea style={{...IS, height:"60px", resize:"vertical"}} value={f.strengths} onChange={e=>setF(p=>({...p,strengths:e.target.value}))} placeholder="빠른 드리블, 강한 수비..."/>
      </div>

      <div style={{ marginBottom:"16px" }}>
        <label style={LS}>플레이 스타일
          <span style={{ textTransform:"none", color: T.textMuted, fontSize:"10px", marginLeft:"6px", fontWeight:"400" }}>버튼에 마우스를 올리면 설명이 표시됩니다</span>
        </label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          {PLAY_STYLES.map(s=><StyleBtn key={s.id} style={s} active={f.playStyles.includes(s.id)} color={ac} onClick={()=>togStyle(s.id)}/>)}
        </div>
      </div>

      <div style={{ marginBottom:"18px" }}>
        <label style={LS}>메모</label>
        <textarea style={{...IS, height:"50px", resize:"vertical"}} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="특이사항..."/>
      </div>

      <div style={{ display:"flex", gap:"8px" }}>
        <button onClick={()=>f.name&&onSave(f)} style={{
          flex:1, padding:"11px", borderRadius:"10px", border:"none",
          background: f.name ? T.text : T.border,
          color: f.name ? "#fff" : T.textMuted,
          fontWeight:"700", cursor: f.name ? "pointer" : "default",
          fontSize:"13px", fontFamily:"inherit", transition:"all 0.15s",
        }}>저장</button>
        <button onClick={onCancel} style={{
          padding:"11px 18px", borderRadius:"10px", border:`1px solid ${T.border}`,
          background: T.surface, color: T.textSub, cursor:"pointer", fontFamily:"inherit", fontSize:"13px",
        }}>취소</button>
      </div>
    </div>
  );
}

// ── StyleTagCard ──────────────────────────────────────────────────────────
function StyleTagCard({ style, color }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <span onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        style={{ display:"inline-block", background:`${color}12`, color, border:`1px solid ${color}35`, borderRadius:"20px", padding:"2px 10px", fontSize:"11px", cursor:"default", userSelect:"none", fontWeight:"500" }}>
        {style.ko}
      </span>
      {hover && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", zIndex:100, width:"210px", background: T.surface, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"12px 14px", pointerEvents:"none", boxShadow:"0 8px 24px rgba(0,0,0,0.10)" }}>
          <div style={{ fontSize:"12px", fontWeight:"700", color: T.text, marginBottom:"3px" }}>{style.label}</div>
          <div style={{ fontSize:"11px", color: T.textSub, lineHeight:"1.5", marginBottom:"5px" }}>{style.desc}</div>
          <div style={{ fontSize:"11px", color: T.textMuted }}>예: {style.ex}</div>
          <div style={{ position:"absolute", bottom:"-5px", left:"50%", transform:"translateX(-50%)", width:"9px", height:"9px", background: T.surface, border:`1px solid ${T.border}`, borderTop:"none", borderLeft:"none", rotate:"45deg" }}/>
        </div>
      )}
    </div>
  );
}

// ── PlayerCard ─────────────────────────────────────────────────────────────
function PlayerCard({ player, onEdit, onDelete }) {
  const positions = player.positions||[];
  const c = positions.length ? POS_COLOR[positions[0]] : POS_COLOR.PG;
  return (
    <div style={{
      background: T.surface, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px",
      transition:"box-shadow 0.2s, border-color 0.2s",
    }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.borderColor=T.borderMid; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor=T.border; }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px" }}>
        <div style={{
          width:"46px", height:"46px", borderRadius:"50%", background:`${c}15`,
          border:`2px solid ${c}40`, flexShrink:0, overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"18px", fontWeight:"800", color: c,
        }}>
          {player.photo ? <img src={player.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={player.name}/> : player.name.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap", marginBottom:"3px" }}>
            <span style={{ fontSize:"15px", fontWeight:"700", color: T.text }}>{player.name}</span>
            {positions.map(pos=>(
              <span key={pos} style={{ background:`${POS_COLOR[pos]}15`, color: POS_COLOR[pos], borderRadius:"6px", padding:"1px 7px", fontSize:"11px", fontWeight:"600" }}>{pos}</span>
            ))}
            {player.height&&<span style={{ color: T.textMuted, fontSize:"12px" }}>{player.height}cm</span>}
          </div>
          {positions.length>0&&<div style={{ color: T.textMuted, fontSize:"11px" }}>{positions.map(p=>POS_LABEL[p]).join(" · ")}</div>}
        </div>
        <div style={{ display:"flex", gap:"5px" }}>
          <button onClick={onEdit} style={{ background: T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:"7px", padding:"4px 10px", color: T.textSub, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>편집</button>
          <button onClick={onDelete} style={{ background: T.dangerBg, border:"none", borderRadius:"7px", padding:"4px 10px", color: T.danger, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>삭제</button>
        </div>
      </div>
      {player.strengths&&(
        <div style={{ marginBottom:"10px" }}>
          <div style={{ fontSize:"11px", color: T.textMuted, marginBottom:"4px", fontWeight:"500" }}>💪 장점</div>
          <div style={{ fontSize:"13px", color: T.textSub, lineHeight:"1.6" }}>{player.strengths}</div>
        </div>
      )}
      {(player.playStyles||[]).length>0&&(
        <div style={{ marginBottom:"8px" }}>
          <div style={{ fontSize:"11px", color: T.textMuted, marginBottom:"5px", fontWeight:"500" }}>🏀 플레이 스타일</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
            {(player.playStyles||[]).map(id=>{ const s=PLAY_STYLES.find(x=>x.id===id); return s?<StyleTagCard key={id} style={s} color={c}/>:null; })}
          </div>
        </div>
      )}
      {player.notes&&(
        <div style={{ marginTop:"10px", padding:"10px 12px", background: T.surfaceAlt, borderRadius:"8px", fontSize:"12px", color: T.textSub, borderLeft:`3px solid ${c}50`, lineHeight:"1.5" }}>
          {player.notes}
        </div>
      )}
    </div>
  );
}

// ── Court SVG (wood floor, same as before) ─────────────────────────────────
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

// ── HalfCourtEditor (logic unchanged, style updated) ──────────────────────
const DEF_ZONE = { cx: CCX, cy: CM + CD * 0.62, rx: 55, ry: 35 };
const ZONE_COLORS = ["#5B8DEF","#F2845C","#5CB87A","#C97BB2","#E5B84A","#7B9EE5","#E58C5B","#7BC895"];

function HalfCourtEditor({ players, zones, onZonesChange }) {
  const svgRef = useRef(null);
  const zonesRef = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  const [selPlayerId, setSelPlayerId] = useState(null);
  const [selZoneId, setSelZoneId] = useState(null);
  const dragRef = useRef(null);

  const activePlayers = players.filter(p => p.name);
  const selPlayer = activePlayers.find(p => p.id === selPlayerId);

  const getPlayerZones = (pid) => {
    const z = zonesRef.current[pid];
    if (!z) return [];
    if (Array.isArray(z)) return z;
    return [{ ...z, id: "z0" }];
  };

  const addZone = () => {
    if (!selPlayerId) return;
    const existing = getPlayerZones(selPlayerId);
    const newZone = { ...DEF_ZONE, id: `z${Date.now()}`, cx: CCX + (Math.random()-0.5)*80, cy: CM + CD * (0.4 + Math.random()*0.35) };
    const updated = { ...zonesRef.current, [selPlayerId]: [...existing, newZone] };
    onZonesChange(updated); setSelZoneId(newZone.id);
  };

  const delZone = (pid, zid) => {
    const existing = getPlayerZones(pid).filter(z => z.id !== zid);
    const updated = { ...zonesRef.current, [pid]: existing };
    onZonesChange(updated);
    if (selZoneId === zid) setSelZoneId(null);
  };

  const svgPt = (e) => {
    const el = svgRef.current; if (!el) return { x:0, y:0 };
    const r = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x:(clientX-r.left)*(VBW/r.width), y:(clientY-r.top)*(VBH/r.height) };
  };

  const onHandleDown = (e, pid, zid, handle) => {
    e.preventDefault(); e.stopPropagation();
    setSelPlayerId(pid); setSelZoneId(zid);
    const z = getPlayerZones(pid).find(z => z.id === zid) || DEF_ZONE;
    dragRef.current = { pid, zid, handle, startPt: svgPt(e), startZone: { ...z } };
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return; e.preventDefault();
      const cur = svgPt(e);
      const dx = cur.x - d.startPt.x, dy = cur.y - d.startPt.y;
      const z = { ...d.startZone };
      if (d.handle === "move") { z.cx = Math.max(CM+z.rx, Math.min(CM+CW-z.rx, z.cx+dx)); z.cy = Math.max(CM+z.ry, Math.min(CM+CD-z.ry, z.cy+dy)); }
      else if (d.handle === "rx") { z.rx = Math.max(18, Math.min(CW*0.48, d.startZone.rx+dx)); }
      else if (d.handle === "ry") { z.ry = Math.max(14, Math.min(CD*0.45, d.startZone.ry+dy)); }
      const arr = getPlayerZones(d.pid).map(x => x.id===d.zid ? z : x);
      onZonesChange({ ...zonesRef.current, [d.pid]: arr });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive:false });
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [onZonesChange]);

  const resetAll = () => {
    const next = {};
    activePlayers.forEach((p, i) => { const col = i%4, row = Math.floor(i/4); next[p.id] = [{ id:"z0", cx: CM+CW*(0.12+col*0.24), cy: CM+CD*(0.42+row*0.24), rx:52, ry:34 }]; });
    onZonesChange(next);
  };

  const pc = selPlayer ? ((selPlayer.positions||[]).length ? POS_COLOR[selPlayer.positions[0]] : POS_COLOR.PG) : POS_COLOR.PG;
  const selPlayerZones = selPlayerId ? getPlayerZones(selPlayerId) : [];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px", flexWrap:"wrap", gap:"8px" }}>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {!activePlayers.length && <div style={{ fontSize:"12px", color: T.textMuted }}>선수단 탭에서 선수를 추가하세요</div>}
          {activePlayers.map(p => {
            const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : POS_COLOR.PG;
            const active = selPlayerId === p.id;
            const zCount = getPlayerZones(p.id).length;
            return (
              <button key={p.id} onClick={() => { setSelPlayerId(active ? null : p.id); setSelZoneId(null); }}
                style={{ display:"flex", alignItems:"center", gap:"6px", padding:"6px 12px", borderRadius:"20px", border:`1px solid ${active ? c : T.border}`, background: active ? `${c}15` : T.surface, cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit" }}>
                <div style={{ width:"22px", height:"22px", borderRadius:"50%", overflow:"hidden", border:`1.5px solid ${c}`, background:`${c}15`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"800", color:c }}>
                  {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                </div>
                <span style={{ fontSize:"12px", color: active ? c : T.textSub, fontWeight: active ? "700" : "400" }}>{p.name}</span>
                {zCount > 0 && <span style={{ fontSize:"10px", background:`${c}20`, color:c, borderRadius:"10px", padding:"1px 6px", fontWeight:"600" }}>{zCount}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          {selPlayerId && <button onClick={addZone} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${pc}`, background:`${pc}12`, color:pc, cursor:"pointer", fontSize:"12px", fontWeight:"700", fontFamily:"inherit" }}>+ 구역 추가</button>}
          <button onClick={resetAll} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>🔄 초기화</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:"16px", alignItems:"flex-start", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 380px", minWidth:"280px" }}>
          <svg ref={svgRef} viewBox={`0 0 ${VBW} ${VBH}`}
            style={{ width:"100%", borderRadius:"14px", border:`1px solid ${T.border}`, userSelect:"none", touchAction:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}
            onClick={e => { if (e.target === e.currentTarget) setSelZoneId(null); }}>
            <CourtSVG/>
            {!selPlayerId && activePlayers.map(player => {
              const c = (player.positions||[]).length ? POS_COLOR[player.positions[0]] : POS_COLOR.PG;
              return getPlayerZones(player.id).map((z, zi) => (
                <g key={`${player.id}-${z.id}`}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.5} strokeDasharray="6,4" strokeOpacity={0.5}/>
                  {zi === 0 && <text x={z.cx} y={z.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill={c} stroke="rgba(0,0,0,0.3)" strokeWidth="2" paintOrder="stroke" style={{ pointerEvents:"none" }}>{player.name}</text>}
                </g>
              ));
            })}
            {selPlayerId && selPlayerZones.map((z, zi) => {
              const sel = selZoneId === z.id;
              const zColor = ZONE_COLORS[zi % ZONE_COLORS.length];
              return (
                <g key={z.id}>
                  <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                    fill={pc} fillOpacity={sel ? 0.25 : 0.12}
                    stroke={zColor} strokeWidth={sel ? 2.5 : 1.8}
                    strokeDasharray={sel ? "none" : "8,3"}
                    style={{ cursor:"grab" }}
                    onMouseDown={e => onHandleDown(e, selPlayerId, z.id, "move")}
                    onTouchStart={e => onHandleDown(e, selPlayerId, z.id, "move")}
                    onClick={e => { e.stopPropagation(); setSelZoneId(z.id); }}/>
                  <text x={z.cx} y={z.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="800" fill={zColor} stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" paintOrder="stroke" style={{ pointerEvents:"none" }}>
                    {selPlayer?.name}{selPlayerZones.length > 1 ? ` ${zi+1}` : ""}
                  </text>
                  {sel && <>
                    <circle cx={z.cx+z.rx} cy={z.cy} r={9} fill={zColor} stroke="#fff" strokeWidth="2" style={{ cursor:"ew-resize" }} onMouseDown={e => onHandleDown(e, selPlayerId, z.id, "rx")} onTouchStart={e => onHandleDown(e, selPlayerId, z.id, "rx")}/>
                    <text x={z.cx+z.rx} y={z.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="900" fill="#fff" style={{ pointerEvents:"none" }}>↔</text>
                    <circle cx={z.cx} cy={z.cy+z.ry} r={9} fill={zColor} stroke="#fff" strokeWidth="2" style={{ cursor:"ns-resize" }} onMouseDown={e => onHandleDown(e, selPlayerId, z.id, "ry")} onTouchStart={e => onHandleDown(e, selPlayerId, z.id, "ry")}/>
                    <text x={z.cx} y={z.cy+z.ry+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="900" fill="#fff" style={{ pointerEvents:"none" }}>↕</text>
                    <circle cx={z.cx} cy={z.cy} r={4} fill={zColor} stroke="#fff" strokeWidth="1.5" style={{ pointerEvents:"none" }}/>
                  </>}
                </g>
              );
            })}
          </svg>
          <div style={{ marginTop:"8px", fontSize:"11px", color: T.textMuted, textAlign:"center" }}>
            {selPlayerId ? `${selPlayer?.name} 구역 편집 중 · 타원 드래그→이동 · ↔↕→크기` : "선수 버튼 클릭 → 공격 구역 편집"}
          </div>
        </div>

        {selPlayerId && (
          <div style={{ width:"180px", flexShrink:0 }}>
            <div style={{ fontSize:"12px", fontWeight:"700", color: pc, marginBottom:"10px" }}>{selPlayer?.name}의 공격 구역</div>
            {!selPlayerZones.length && <div style={{ fontSize:"12px", color: T.textMuted, marginBottom:"10px" }}>구역이 없어요</div>}
            {selPlayerZones.map((z, zi) => {
              const zColor = ZONE_COLORS[zi % ZONE_COLORS.length];
              const sel = selZoneId === z.id;
              return (
                <div key={z.id} onClick={() => setSelZoneId(z.id)}
                  style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 10px", borderRadius:"8px", border:`1px solid ${sel ? zColor : T.border}`, background: sel ? `${zColor}08` : T.surface, cursor:"pointer", marginBottom:"6px", transition:"all 0.15s" }}>
                  <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:zColor, flexShrink:0 }}/>
                  <span style={{ fontSize:"12px", color: sel ? zColor : T.textSub, flex:1, fontWeight: sel ? "600" : "400" }}>구역 {zi+1}</span>
                  <button onClick={e => { e.stopPropagation(); delZone(selPlayerId, z.id); }}
                    style={{ background:"none", border:"none", color: T.textMuted, cursor:"pointer", fontSize:"13px", padding:"0", lineHeight:1 }}>✕</button>
                </div>
              );
            })}
            <button onClick={addZone} style={{ width:"100%", padding:"7px", borderRadius:"8px", border:`1px dashed ${pc}60`, background:"transparent", color:pc, cursor:"pointer", fontSize:"12px", fontWeight:"700", marginTop:"4px", fontFamily:"inherit" }}>+ 구역 추가</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── VoiceTab (Twitter-style feed) ─────────────────────────────────────────
function VoiceTab({ players, voices, onAdd, onDel }) {
  const [selPlayer, setSelPlayer] = useState("");
  const [text, setText]           = useState("");
  const [filter, setFilter]       = useState("all");
  const textareaRef = useRef(null);

  const activePlayers = players.filter(p => p.name);
  const selP  = activePlayers.find(p => p.id === selPlayer);
  const selC  = selP ? ((selP.positions||[]).length ? POS_COLOR[selP.positions[0]] : POS_COLOR.PG) : POS_COLOR.PG;
  const canPost = selPlayer && text.trim();
  const filtered = filter === "all" ? voices : voices.filter(v => v.playerId === filter);
  const MAX = 280;

  const submit = () => {
    if (!canPost) return;
    onAdd(selPlayer, text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const onKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  };

  // auto-grow textarea
  const onInput = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
  };

  return (
    <div style={{ maxWidth:"600px" }}>

      {/* ── Compose box ── */}
      <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"16px 18px", marginBottom:"20px" }}>

        {/* Avatar row + textarea */}
        <div style={{ display:"flex", gap:"12px" }}>
          {/* Avatar / player picker trigger */}
          <div style={{ flexShrink:0, paddingTop:"2px" }}>
            {selP ? (
              <div onClick={() => setSelPlayer("")}
                style={{ width:"40px", height:"40px", borderRadius:"50%", overflow:"hidden", border:`2px solid ${selC}`, background:`${selC}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"800", color:selC, cursor:"pointer", flexShrink:0 }}>
                {selP.photo ? <img src={selP.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : selP.name.charAt(0)}
              </div>
            ) : (
              <div style={{ width:"40px", height:"40px", borderRadius:"50%", background: T.surfaceAlt, border:`2px dashed ${T.borderMid}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", color: T.textMuted }}>
                👤
              </div>
            )}
          </div>

          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"10px" }}>
            {/* Player selector chips */}
            {!activePlayers.length ? (
              <div style={{ fontSize:"12px", color: T.textMuted, paddingTop:"10px" }}>선수단 탭에서 선수를 먼저 등록해주세요</div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                {activePlayers.map(p => {
                  const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : POS_COLOR.PG;
                  const active = selPlayer === p.id;
                  return (
                    <button key={p.id} onClick={() => { setSelPlayer(active ? "" : p.id); textareaRef.current?.focus(); }}
                      style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px",
                        border:`1px solid ${active ? c : T.border}`,
                        background: active ? c : T.surface,
                        color: active ? "#fff" : T.textSub,
                        fontWeight: active ? "700" : "400",
                        fontSize:"12px", cursor:"pointer", transition:"all .15s", fontFamily:"inherit" }}>
                      {active && (
                        <div style={{ width:"16px", height:"16px", borderRadius:"50%", overflow:"hidden", background:"rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"900", color:"#fff", flexShrink:0 }}>
                          {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                        </div>
                      )}
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onInput={onInput}
              onChange={()=>{}} // handled by onInput
              onKeyDown={onKey}
              placeholder={selP ? `${selP.name} (으)로 의견을 남겨보세요...` : "선수를 선택하고 의견을 남겨보세요"}
              maxLength={MAX}
              style={{
                ...IS,
                height:"auto", minHeight:"60px", resize:"none", overflow:"hidden",
                borderColor:"transparent", background:"transparent",
                padding:"0", fontSize:"15px", lineHeight:"1.65",
                color: T.text, fontFamily:"inherit",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:"1px", background: T.border, margin:"12px 0" }}/>

        {/* Footer: char count + post button */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:"12px", color: text.length > MAX*0.85 ? (text.length >= MAX ? T.danger : POS_COLOR.C) : T.textMuted }}>
            {text.length > 0 && `${text.length} / ${MAX}`}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"11px", color: T.textMuted }}>⌘↵ 로 전송</span>
            <button onClick={submit} disabled={!canPost}
              style={{ padding:"8px 20px", borderRadius:"20px", border:"none",
                background: canPost ? T.text : T.border,
                color: canPost ? "#fff" : T.textMuted,
                fontWeight:"700", fontSize:"13px", cursor: canPost ? "pointer" : "default",
                transition:"all .15s", fontFamily:"inherit",
              }}>
              게시
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter chips ── */}
      {voices.length > 0 && (
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"14px" }}>
          <button onClick={() => setFilter("all")}
            style={{ padding:"4px 14px", borderRadius:"20px", border:`1px solid ${filter==="all" ? T.text : T.border}`, background: filter==="all" ? T.text : T.surface, color: filter==="all" ? "#fff" : T.textSub, fontSize:"12px", cursor:"pointer", fontFamily:"inherit", fontWeight: filter==="all" ? "600" : "400" }}>
            전체 {voices.length}
          </button>
          {activePlayers.map(p => {
            const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : POS_COLOR.PG;
            const cnt = voices.filter(v => v.playerId === p.id).length;
            if (!cnt) return null;
            const active = filter === p.id;
            return (
              <button key={p.id} onClick={() => setFilter(active ? "all" : p.id)}
                style={{ padding:"4px 14px", borderRadius:"20px", border:`1px solid ${active ? c : T.border}`, background: active ? `${c}18` : T.surface, color: active ? c : T.textSub, fontSize:"12px", cursor:"pointer", fontFamily:"inherit", fontWeight: active ? "600" : "400" }}>
                {p.name} {cnt}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Feed ── */}
      {!filtered.length && (
        <div style={{ textAlign:"center", padding:"60px 20px", color: T.textMuted }}>
          <div style={{ fontSize:"32px", marginBottom:"10px" }}>🏀</div>
          <div style={{ fontSize:"14px", fontWeight:"600", color: T.textSub, marginBottom:"4px" }}>아직 의견이 없어요</div>
          <div style={{ fontSize:"13px" }}>팀원들의 생각을 자유롭게 남겨보세요</div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column" }}>
        {filtered.map((v, idx) => {
          const p = activePlayers.find(x => x.id === v.playerId);
          if (!p) return null;
          const c = (p.positions||[]).length ? POS_COLOR[p.positions[0]] : POS_COLOR.PG;
          const isLast = idx === filtered.length - 1;
          return (
            <div key={v.id} style={{
              display:"flex", gap:"12px",
              padding:"14px 0",
              borderBottom: isLast ? "none" : `1px solid ${T.border}`,
            }}>
              {/* Avatar */}
              <div style={{ flexShrink:0 }}>
                <div style={{ width:"40px", height:"40px", borderRadius:"50%", overflow:"hidden", border:`2px solid ${c}40`, background:`${c}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"800", color:c }}>
                  {p.photo ? <img src={p.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : p.name.charAt(0)}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                {/* Name row */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                  <span style={{ fontSize:"14px", fontWeight:"700", color: T.text }}>{p.name}</span>
                  {(p.positions||[]).map(pos => (
                    <span key={pos} style={{ background:`${POS_COLOR[pos]}15`, color: POS_COLOR[pos], borderRadius:"4px", padding:"0px 5px", fontSize:"10px", fontWeight:"600" }}>{pos}</span>
                  ))}
                  <span style={{ fontSize:"12px", color: T.textMuted, marginLeft:"auto" }}>{v.ts}</span>
                  <button onClick={() => onDel(v.id)}
                    style={{ background:"none", border:"none", color: T.textMuted, cursor:"pointer", fontSize:"13px", padding:"0 2px", lineHeight:1, opacity:0.5, transition:"opacity .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                    onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>
                    ✕
                  </button>
                </div>
                {/* Post text */}
                <div style={{ fontSize:"14px", color: T.textSub, lineHeight:"1.65", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                  {v.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ── OppForm ────────────────────────────────────────────────────────────────
const EO = { name:"", positions:[], height:"", playStyle:[], weaknesses:[], driveDir:"", notes:"", threat:"medium" };

function OppForm({ player, onSave, onCancel }) {
  const [f, setF] = useState({ ...EO, ...(player||{}) });
  const togPos = (pos) => setF(p=>({ ...p, positions: (p.positions||[]).includes(pos) ? p.positions.filter(x=>x!==pos) : [...(p.positions||[]), pos] }));
  const togPS  = (id)  => setF(p=>({ ...p, playStyle: p.playStyle.includes(id) ? p.playStyle.filter(x=>x!==id) : [...p.playStyle, id] }));
  const togW   = (val) => setF(p=>({ ...p, weaknesses: p.weaknesses.includes(val) ? p.weaknesses.filter(x=>x!==val) : [...p.weaknesses, val] }));
  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"22px", marginBottom:"16px", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize:"14px", fontWeight:"700", color: T.text, marginBottom:"18px" }}>
        {player ? "상대 선수 편집" : "상대 선수 추가"}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
        <div><label style={LS}>이름 *</label><input style={IS} value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="상대 선수명"/></div>
        <div><label style={LS}>키 (cm)</label><input style={IS} value={f.height} onChange={e=>setF(p=>({...p,height:e.target.value}))} placeholder="188"/></div>
      </div>
      <div style={{ marginBottom:"14px" }}>
        <label style={LS}>포지션</label>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {POSITIONS.map(pos => { const active = (f.positions||[]).includes(pos); const c = POS_COLOR[pos]; return <button key={pos} onClick={()=>togPos(pos)} style={{ padding:"5px 12px", borderRadius:"10px", border:`1px solid ${active ? c : T.border}`, background: active ? c : T.surface, color: active ? "#fff" : T.textSub, fontWeight: active ? "700" : "400", fontSize:"13px", cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit" }}>{pos}</button>; })}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
        <div><label style={LS}>위협도</label><select style={IS} value={f.threat} onChange={e=>setF(p=>({...p,threat:e.target.value}))}><option value="high">🔴 높음</option><option value="medium">🟡 보통</option><option value="low">🟢 낮음</option></select></div>
        <div><label style={LS}>돌파 선호 방향</label><select style={IS} value={f.driveDir} onChange={e=>setF(p=>({...p,driveDir:e.target.value}))}><option value="">미설정</option>{DRIVE_DIRS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
      </div>
      <div style={{ marginBottom:"14px" }}>
        <label style={LS}>플레이 스타일</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          {PLAY_STYLES.map(s=><StyleBtn key={s.id} style={s} active={f.playStyle.includes(s.id)} color={T.danger} onClick={()=>togPS(s.id)}/>)}
        </div>
      </div>
      <div style={{ marginBottom:"14px" }}>
        <label style={LS}>⚠️ 약점</label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>{WEAKNESSES.map(s=><TagBtn key={s} label={s} active={f.weaknesses.includes(s)} color={POS_COLOR.SF} onClick={()=>togW(s)}/>)}</div>
      </div>
      <div style={{ marginBottom:"18px" }}>
        <label style={LS}>분석 메모</label>
        <textarea style={{...IS, height:"70px", resize:"vertical"}} value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="수비 포인트, 매치업 전략..."/>
      </div>
      <div style={{ display:"flex", gap:"8px" }}>
        <button onClick={()=>f.name&&onSave(f)} style={{ flex:1, padding:"11px", borderRadius:"10px", border:"none", background: f.name ? T.danger : T.border, color: f.name ? "#fff" : T.textMuted, fontWeight:"700", cursor: f.name ? "pointer" : "default", fontFamily:"inherit", fontSize:"13px" }}>저장</button>
        <button onClick={onCancel} style={{ padding:"11px 18px", borderRadius:"10px", border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, cursor:"pointer", fontFamily:"inherit", fontSize:"13px" }}>취소</button>
      </div>
    </div>
  );
}

// ── OppCard ────────────────────────────────────────────────────────────────
function OppCard({ player, onEdit, onDelete }) {
  const [exp, setExp] = useState(false);
  const t = THREAT_CFG[player.threat]||THREAT_CFG.medium;
  const positions = player.positions||[];
  const psIds = player.playStyle||[];
  return (
    <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"14px", overflow:"hidden", transition:"box-shadow 0.2s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.07)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <div style={{ height:"3px", background: t.color }}/>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"50%", background: t.bg, border:`2px solid ${t.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", fontWeight:"900", color: t.color, flexShrink:0 }}>{player.name.charAt(0)}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"7px", flexWrap:"wrap", marginBottom:"3px" }}>
              <span style={{ fontSize:"15px", fontWeight:"700", color: T.text }}>{player.name}</span>
              {positions.map(pos=><span key={pos} style={{ background:`${POS_COLOR[pos]}15`, color: POS_COLOR[pos], borderRadius:"6px", padding:"1px 7px", fontSize:"11px", fontWeight:"600" }}>{pos}</span>)}
              {player.height&&<span style={{ color: T.textMuted, fontSize:"12px" }}>{player.height}cm</span>}
              <span style={{ background: t.bg, color: t.color, borderRadius:"20px", padding:"2px 9px", fontSize:"11px", fontWeight:"600", border:`1px solid ${t.color}30` }}>{t.label}</span>
            </div>
            {player.driveDir&&<div style={{ fontSize:"11px", color: T.textMuted }}>🏃 {player.driveDir}</div>}
          </div>
          <div style={{ display:"flex", gap:"5px" }}>
            <button onClick={()=>setExp(v=>!v)} style={{ background: T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:"7px", padding:"4px 10px", color: T.textSub, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>{exp?"접기":"펼치기"}</button>
            <button onClick={onEdit} style={{ background: T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:"7px", padding:"4px 10px", color: T.textSub, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>편집</button>
            <button onClick={onDelete} style={{ background: T.dangerBg, border:"none", borderRadius:"7px", padding:"4px 10px", color: T.danger, cursor:"pointer", fontSize:"12px", fontFamily:"inherit" }}>삭제</button>
          </div>
        </div>
        {(psIds.length>0||player.weaknesses.length>0)&&(
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"4px" }}>
            {psIds.map(id=>{ const s=PLAY_STYLES.find(x=>x.id===id); return s?<StyleTagCard key={id} style={s} color={T.danger}/>:null; })}
            {player.weaknesses.map(s=><span key={s} style={{ background:`${POS_COLOR.SF}12`, color: POS_COLOR.SF, border:`1px solid ${POS_COLOR.SF}30`, borderRadius:"20px", padding:"2px 9px", fontSize:"11px", fontWeight:"500" }}>⚠ {s}</span>)}
          </div>
        )}
        {exp&&player.notes&&(
          <div style={{ marginTop:"10px", padding:"10px 12px", background: T.surfaceAlt, borderRadius:"8px", fontSize:"13px", color: T.textSub, lineHeight:"1.6", borderLeft:`3px solid ${t.color}50` }}>{player.notes}</div>
        )}
      </div>
    </div>
  );
}

// ── TacticsBoard ───────────────────────────────────────────────────────────
const TACTIC_TOOLS = [
  { id:"move",  label:"이동",   icon:"✋" },
  { id:"pass",  label:"패스선", icon:"✏️" },
  { id:"run",   label:"이동선", icon:"➡️" },
  { id:"erase", label:"지우개", icon:"🗑️" },
];
const TACTIC_COLORS = [
  { hex:"#ffffff", name:"white" },
  { hex:"#F2845C", name:"coral" },
  { hex:"#5B8DEF", name:"blue" },
  { hex:"#E05555", name:"red" },
  { hex:"#E5B84A", name:"amber" },
];
const TACTIC_PLAYERS_MY  = [
  { id:"t_m1", num:"1", label:"PG", color:"#F2845C" },
  { id:"t_m2", num:"2", label:"SG", color:"#F2845C" },
  { id:"t_m3", num:"3", label:"SF", color:"#F2845C" },
  { id:"t_m4", num:"4", label:"PF", color:"#F2845C" },
  { id:"t_m5", num:"5", label:"C",  color:"#F2845C" },
];
const TACTIC_PLAYERS_OPP = [
  { id:"t_o1", num:"1", label:"PG", color:"#5B8DEF" },
  { id:"t_o2", num:"2", label:"SG", color:"#5B8DEF" },
  { id:"t_o3", num:"3", label:"SF", color:"#5B8DEF" },
  { id:"t_o4", num:"4", label:"PF", color:"#5B8DEF" },
  { id:"t_o5", num:"5", label:"C",  color:"#5B8DEF" },
];
const TACTIC_DEFAULT_POS = {
  t_m1:{ x: CCX,           y: CM+CD*0.78 },
  t_m2:{ x: CM+CW*0.18,    y: CM+CD*0.62 },
  t_m3:{ x: CM+CW*0.82,    y: CM+CD*0.62 },
  t_m4:{ x: CM+CW*0.30,    y: CM+CD*0.40 },
  t_m5:{ x: CCX,           y: CM+CD*0.46 },
  t_o1:{ x: CCX,           y: CM+CD*0.56 },
  t_o2:{ x: CM+CW*0.28,    y: CM+CD*0.44 },
  t_o3:{ x: CM+CW*0.72,    y: CM+CD*0.44 },
  t_o4:{ x: CM+CW*0.38,    y: CM+CD*0.26 },
  t_o5:{ x: CM+CW*0.62,    y: CM+CD*0.26 },
};

function TacticsBoard() {
  const svgRef = useRef(null);
  const [tool, setTool]     = useState("move");
  const [color, setColor]   = useState("#ffffff");
  const [drawings, setDrawings]   = useState([]);
  const [curPts, setCurPts]       = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [positions, setPositions] = useState(() => {
    const pos = {};
    [...TACTIC_PLAYERS_MY, ...TACTIC_PLAYERS_OPP].forEach(p => { pos[p.id] = { ...TACTIC_DEFAULT_POS[p.id] }; });
    return pos;
  });
  const dragRef    = useRef(null);
  const posRef     = useRef(positions);
  const drawRef    = useRef(drawings);
  useEffect(() => { posRef.current = positions; }, [positions]);
  useEffect(() => { drawRef.current = drawings; }, [drawings]);

  // ── SVG coord helper ────────────────────────────────────────────────────
  const svgPt = (e) => {
    const el = svgRef.current; if (!el) return {x:0,y:0};
    const r = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x:(cx-r.left)*(VBW/r.width), y:(cy-r.top)*(VBH/r.height) };
  };

  // ── Player drag ──────────────────────────────────────────────────────────
  const onPlayerDown = (e, pid) => {
    if (tool !== "move") return;
    e.preventDefault(); e.stopPropagation();
    const pt = svgPt(e);
    const p  = posRef.current[pid];
    dragRef.current = { pid, ox: pt.x - p.x, oy: pt.y - p.y };
  };

  // ── SVG draw ─────────────────────────────────────────────────────────────
  const onSVGDown = (e) => {
    if (dragRef.current) return;
    if (tool === "pass" || tool === "run") {
      setIsDrawing(true);
      const pt = svgPt(e);
      setCurPts([pt.x, pt.y]);
      e.preventDefault();
    }
    if (tool === "erase") eraseAt(svgPt(e));
  };
  const onSVGMove = (e) => {
    const pt = svgPt(e);
    if (dragRef.current) {
      const { pid, ox, oy } = dragRef.current;
      setPositions(prev => ({
        ...prev,
        [pid]: {
          x: Math.max(CM+16, Math.min(CM+CW-16, pt.x - ox)),
          y: Math.max(CM+16, Math.min(CM+CD-16, pt.y - oy)),
        }
      }));
      return;
    }
    if (isDrawing) {
      setCurPts(prev => [...prev, pt.x, pt.y]);
      e.preventDefault();
    }
    if (tool === "erase" && (e.buttons === 1 || (e.touches && e.touches.length))) eraseAt(pt);
  };
  const onSVGUp = () => {
    dragRef.current = null;
    if (isDrawing) {
      setIsDrawing(false);
      setCurPts(prev => {
        if (prev.length >= 4) {
          setDrawings(d => [...d, { color, pts: prev, isDash: tool==="pass", isArrow: tool==="run" }]);
        }
        return [];
      });
    }
  };

  // ── Drop from sidebar ────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    const pid = e.dataTransfer.getData("tpid"); if (!pid) return;
    const pt = svgPt(e);
    setPositions(prev => ({ ...prev, [pid]: { x: Math.max(CM+16, Math.min(CM+CW-16, pt.x)), y: Math.max(CM+16, Math.min(CM+CD-16, pt.y)) } }));
  };

  const eraseAt = (pt) => {
    setDrawings(prev => prev.filter(d => {
      for (let i=0; i<d.pts.length-2; i+=2) {
        const dx=d.pts[i]-pt.x, dy=d.pts[i+1]-pt.y;
        if (Math.sqrt(dx*dx+dy*dy) < 20) return false;
      }
      return true;
    }));
  };

  const ptsToPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M${pts[0]} ${pts[1]}`;
    for (let i=2; i<pts.length-2; i+=2) {
      const mx=(pts[i]+pts[i+2])/2, my=(pts[i+1]+pts[i+3])/2;
      d += ` Q${pts[i]} ${pts[i+1]} ${mx} ${my}`;
    }
    if (pts.length >= 4) d += ` L${pts[pts.length-2]} ${pts[pts.length-1]}`;
    return d;
  };

  const markerFor = (c) => {
    const map = {"#ffffff":"url(#ta-w)","#F2845C":"url(#ta-coral)","#5B8DEF":"url(#ta-blue)","#E05555":"url(#ta-red)","#E5B84A":"url(#ta-amber)"};
    return map[c] || "url(#ta-w)";
  };

  const allPlayers = [...TACTIC_PLAYERS_MY, ...TACTIC_PLAYERS_OPP];

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px", flexWrap:"wrap" }}>
        {/* tools */}
        <div style={{ display:"flex", gap:"4px", background: T.surfaceAlt, borderRadius:"10px", padding:"4px" }}>
          {TACTIC_TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} style={{
              padding:"6px 12px", borderRadius:"7px", border:"none", cursor:"pointer",
              background: tool===t.id ? T.surface : "transparent",
              color: tool===t.id ? T.text : T.textMuted,
              fontWeight: tool===t.id ? "600" : "400",
              fontSize:"12px", fontFamily:"inherit",
              boxShadow: tool===t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition:"all .15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* colors */}
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          <span style={{ fontSize:"11px", color: T.textMuted, fontWeight:"500" }}>선 색상</span>
          {TACTIC_COLORS.map(c => (
            <div key={c.name} onClick={() => setColor(c.hex)}
              style={{ width:"22px", height:"22px", borderRadius:"50%",
                background: c.hex === "#ffffff" ? "#e8e6e1" : c.hex,
                border: color===c.hex ? `2px solid ${T.text}` : `2px solid transparent`,
                cursor:"pointer", transition:".15s", transform: color===c.hex ? "scale(1.15)" : "scale(1)",
                boxShadow: color===c.hex ? "0 0 0 1px #fff, 0 0 0 2.5px #1a1a1a" : "none",
              }}/>
          ))}
        </div>

        {/* actions */}
        <div style={{ marginLeft:"auto", display:"flex", gap:"6px" }}>
          <button onClick={() => setDrawings([])} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, fontSize:"12px", cursor:"pointer", fontFamily:"inherit" }}>선 삭제</button>
          <button onClick={() => {
            setDrawings([]);
            setPositions(() => {
              const pos = {};
              [...TACTIC_PLAYERS_MY, ...TACTIC_PLAYERS_OPP].forEach(p => { pos[p.id] = { ...TACTIC_DEFAULT_POS[p.id] }; });
              return pos;
            });
          }} style={{ padding:"6px 14px", borderRadius:"8px", border:`1px solid ${T.border}`, background: T.surface, color: T.textSub, fontSize:"12px", cursor:"pointer", fontFamily:"inherit" }}>전체 초기화</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:"16px", alignItems:"flex-start" }}>

        {/* ── Sidebar: player tokens ── */}
        <div style={{ width:"96px", flexShrink:0, display:"flex", flexDirection:"column", gap:"10px" }}>
          <div style={{ fontSize:"10px", color: T.textMuted, fontWeight:"600", letterSpacing:".5px", textTransform:"uppercase" }}>우리팀</div>
          {TACTIC_PLAYERS_MY.map(p => (
            <div key={p.id} draggable onDragStart={e => e.dataTransfer.setData("tpid", p.id)}
              style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 8px", background: T.surface, border:`1px solid ${T.border}`, borderRadius:"8px", cursor:"grab" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:`${p.color}20`, border:`1.5px solid ${p.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:p.color, flexShrink:0 }}>{p.num}</div>
              <span style={{ fontSize:"11px", color: T.textSub, fontWeight:"500" }}>{p.label}</span>
            </div>
          ))}
          <div style={{ fontSize:"10px", color: T.textMuted, fontWeight:"600", letterSpacing:".5px", textTransform:"uppercase", marginTop:"4px" }}>상대팀</div>
          {TACTIC_PLAYERS_OPP.map(p => (
            <div key={p.id} draggable onDragStart={e => e.dataTransfer.setData("tpid", p.id)}
              style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 8px", background: T.surface, border:`1px solid ${T.border}`, borderRadius:"8px", cursor:"grab" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:`${p.color}20`, border:`1.5px solid ${p.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:p.color, flexShrink:0 }}>{p.num}</div>
              <span style={{ fontSize:"11px", color: T.textSub, fontWeight:"500" }}>{p.label}</span>
            </div>
          ))}
        </div>

        {/* ── Court SVG ── */}
        <div style={{ flex:1 }}>
          <svg ref={svgRef}
            viewBox={`0 0 ${VBW} ${VBH}`}
            style={{ width:"100%", borderRadius:"14px", border:`1px solid ${T.border}`, userSelect:"none", touchAction:"none", cursor: tool==="move" ? "default" : "crosshair", boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}
            onMouseDown={onSVGDown} onMouseMove={onSVGMove} onMouseUp={onSVGUp} onMouseLeave={onSVGUp}
            onTouchStart={e=>{e.preventDefault(); if(dragRef.current) return; onSVGDown(e);}} 
            onTouchMove={e=>{e.preventDefault(); onSVGMove(e);}} 
            onTouchEnd={onSVGUp}
            onDragOver={e=>e.preventDefault()} onDrop={onDrop}>

            <defs>
              {[["ta-w","#ffffff"],["ta-coral","#F2845C"],["ta-blue","#5B8DEF"],["ta-red","#E05555"],["ta-amber","#E5B84A"]].map(([id,c])=>(
                <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 1L9 5L0 9" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
                </marker>
              ))}
            </defs>

            {/* Court (same CourtSVG) */}
            <CourtSVG/>

            {/* Saved drawings */}
            {drawings.map((d, i) => (
              <path key={i} d={ptsToPath(d.pts)} fill="none" stroke={d.color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" opacity=".9"
                strokeDasharray={d.isDash ? "8 5" : "none"}
                markerEnd={d.isArrow ? markerFor(d.color) : undefined}/>
            ))}

            {/* Current drawing in progress */}
            {isDrawing && curPts.length >= 2 && (
              <path d={ptsToPath(curPts)} fill="none" stroke={color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" opacity=".8"
                strokeDasharray={tool==="pass" ? "8 5" : "none"}
                markerEnd={tool==="run" ? markerFor(color) : undefined}/>
            )}

            {/* Players */}
            {allPlayers.map(p => {
              const pos = positions[p.id];
              if (!pos) return null;
              return (
                <g key={p.id} style={{ cursor: tool==="move" ? "grab" : "default" }}
                  onMouseDown={e => onPlayerDown(e, p.id)}
                  onTouchStart={e => { e.preventDefault(); e.stopPropagation(); const pt=svgPt(e); dragRef.current={ pid:p.id, ox:pt.x-pos.x, oy:pt.y-pos.y }; }}>
                  {/* shadow */}
                  <ellipse cx={pos.x} cy={pos.y+2} rx="15" ry="5" fill="rgba(0,0,0,0.18)"/>
                  {/* body */}
                  <circle cx={pos.x} cy={pos.y} r="15" fill={`${p.color}DD`} stroke={p.color} strokeWidth="2"/>
                  {/* number */}
                  <text x={pos.x} y={pos.y+1} textAnchor="middle" dominantBaseline="central"
                    fontSize="12" fontWeight="700" fill="#fff"
                    stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" paintOrder="stroke"
                    style={{ pointerEvents:"none", userSelect:"none" }}>
                    {p.num}
                  </text>
                </g>
              );
            })}
          </svg>

          <div style={{ marginTop:"8px", fontSize:"11px", color: T.textMuted, textAlign:"center" }}>
            ✋ 선수 드래그로 배치 · ✏️ 패스선(점선) · ➡️ 이동선(화살표) · 사이드바에서 드래그로 추가
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
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

  // ── Firebase listeners (unchanged) ────────────────────────────────────
  useEffect(() => {
    const unsubs = [];
    const listen = (path, handler) => {
      const r = ref(db, path);
      const unsub = onValue(r, (snap) => handler(snap.val()), (err) => { console.error(path, err); setSyncStatus("⚠️ 연결 오류"); });
      unsubs.push(unsub);
    };
    listen("teamName", (val) => { if (val) setTeamName(val); });
    listen("players", (val) => { const arr = val ? toArr(val).map(p => ({ ...p, positions: normArr(p.positions), playStyles: normArr(p.playStyles) })) : []; setPlayers(arr); });
    listen("zones",   (val) => { setZones(val || {}); });
    listen("strategy",(val) => { if (val) setStrat(val); });
    listen("oppTeams",(val) => {
      if (val) {
        const teams = toArr(val).map(t => ({ ...t, players: t.players ? toArr(t.players).map(p => ({ ...p, positions: normArr(p.positions), playStyle: normArr(p.playStyle), weaknesses: normArr(p.weaknesses) })) : [] }));
        setOppTeams(teams.length ? teams : [{ id:"t1", name:"상대 팀 1", players:[] }]);
      }
    });
    listen("voices", (val) => { if (val) { const arr = toArr(val).sort((a,b) => (b.tsNum||0)-(a.tsNum||0)); setVoices(arr); } else { setVoices([]); } });
    setTimeout(() => { setLoading(false); setSyncStatus("🟢 실시간 연결됨"); }, 1200);
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Write helpers (unchanged) ─────────────────────────────────────────
  const fbSet  = (path, val) => set(ref(db, path), val).catch(console.error);
  const fbPush = (path, val) => push(ref(db, path), val).catch(console.error);
  const fbDel  = (path)      => remove(ref(db, path)).catch(console.error);
  const fbUpd  = (path, val) => update(ref(db, path), val).catch(console.error);

  const saveTeamName = (name) => { setTeamName(name); fbSet("teamName", name); };
  const savePlayer = (p) => { if (editIdx !== null) { const id = players[editIdx].id; fbSet(`players/${id}`, { ...p, id }); setEditIdx(null); } else { fbPush("players", p); } setShowForm(false); };
  const delPlayer = (i) => { const id = players[i].id; fbDel(`players/${id}`); fbDel(`zones/${id}`); };
  const saveZones = (newZones) => { setZones(newZones); fbSet("zones", newZones); };
  const saveStrat = (s) => { setStrat(s); fbSet("strategy", s); };
  const addVoice = (playerId, text) => { const now = new Date(); const ts = `${now.getMonth()+1}/${now.getDate()} ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`; fbPush("voices", { playerId, text, ts, tsNum: Date.now() }); };
  const delVoice = (id) => fbDel(`voices/${id}`);

  const curTeam = oppTeams.find(t=>t.id===selTeamId) || oppTeams[0];
  const opps = curTeam ? curTeam.players : [];
  const saveOpp = (p) => { if (oppIdx !== null) { const oid = opps[oppIdx].id; fbSet(`oppTeams/${curTeam.id}/players/${oid}`, { ...p, id: oid }); setOppIdx(null); } else { fbPush(`oppTeams/${curTeam.id}/players`, p); } setOppForm(false); };
  const delOpp = (i) => { const oid = opps[i].id; fbDel(`oppTeams/${curTeam.id}/players/${oid}`); };
  const addTeam = () => { const newRef = push(ref(db, "oppTeams"), { name:`상대 팀 ${oppTeams.length+1}`, players:{} }); newRef.then(() => { if(newRef.key) setSelTeamId(newRef.key); }).catch(console.error); setOppForm(false); setOppIdx(null); };
  const delTeam = (id) => { fbDel(`oppTeams/${id}`); const remaining = oppTeams.filter(t=>t.id!==id); if (selTeamId===id && remaining.length) setSelTeamId(remaining[0].id); };
  const renameTeam = (id, name) => fbUpd(`oppTeams/${id}`, { name });

  const posSumm = POSITIONS.map(pos=>({pos,count:players.filter(p=>(p.positions||[]).includes(pos)).length})).filter(x=>x.count>0);
  const highThreat = opps.filter(p=>p.threat==="high");
  const TABS = [{id:"roster",label:"선수단"},{id:"court",label:"코트 배치"},{id:"tactics",label:"전술판"},{id:"strategy",label:"전략"},{id:"voice",label:"팀 의견함"},{id:"opponent",label:"상대팀 분석"}];

  // ── Loading screen ────────────────────────────────────────────────────
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
    <div style={{ minHeight:"100vh", background: T.bg, fontFamily:"'Noto Sans KR','Apple SD Gothic Neo',sans-serif", color: T.text }}>

      {/* ── Header ── */}
      <div style={{ background: T.surface, borderBottom:`1px solid ${T.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {/* logo */}
          <div style={{ width:"40px", height:"40px", borderRadius:"10px", overflow:"hidden", flexShrink:0, background: T.surfaceAlt, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width:"28px", height:"28px" }}>
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
          </div>
          <div>
            {editTN
              ? <input autoFocus style={{...IS, fontSize:"16px", fontWeight:"700", padding:"2px 8px", width:"160px"}} value={teamName}
                  onChange={e=>setTeamName(e.target.value)}
                  onBlur={()=>{ saveTeamName(teamName); setEditTN(false); }}
                  onKeyDown={e=>e.key==="Enter"&&(saveTeamName(teamName),setEditTN(false))}/>
              : <h1 onClick={()=>setEditTN(true)} style={{ margin:0, fontSize:"16px", fontWeight:"700", cursor:"pointer", color: T.text, display:"flex", alignItems:"center", gap:"6px" }}>
                  {teamName}
                  <span style={{ fontSize:"11px", color: T.textMuted, fontWeight:"400" }}>편집</span>
                </h1>}
            <div style={{ fontSize:"11px", color: T.textMuted, marginTop:"1px" }}>농구팀 전략 대시보드</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
          {posSumm.map(({pos,count})=>(
            <div key={pos} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"17px", fontWeight:"700", color: POS_COLOR[pos] }}>{count}</div>
              <div style={{ fontSize:"10px", color: T.textMuted }}>{pos}</div>
            </div>
          ))}
          <div style={{ textAlign:"center", marginLeft:"4px", paddingLeft:"16px", borderLeft:`1px solid ${T.border}` }}>
            <div style={{ fontSize:"17px", fontWeight:"700", color: T.text }}>{players.length}</div>
            <div style={{ fontSize:"10px", color: T.textMuted }}>총 선수</div>
          </div>
          <div style={{
            fontSize:"11px", fontWeight:"500",
            color: syncStatus.includes("🟢") ? POS_COLOR.SF : syncStatus.includes("⚠️") ? POS_COLOR.C : T.textMuted,
            padding:"4px 10px", borderRadius:"20px",
            border:`1px solid ${syncStatus.includes("🟢") ? `${POS_COLOR.SF}40` : T.border}`,
            background: syncStatus.includes("🟢") ? `${POS_COLOR.SF}10` : T.surfaceAlt,
          }}>{syncStatus}</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px", display:"flex", overflowX:"auto", gap:"0" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:"none", border:"none", padding:"14px 18px", cursor:"pointer",
            fontSize:"13px", fontWeight: tab===t.id ? "700" : "500",
            whiteSpace:"nowrap", fontFamily:"inherit",
            color: tab===t.id ? T.text : T.textMuted,
            borderBottom: tab===t.id ? `2px solid ${T.text}` : "2px solid transparent",
            transition:"all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"24px", maxWidth:"1200px", margin:"0 auto" }}>

        {/* ── ROSTER ── */}
        {tab==="roster"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
              <div>
                <h2 style={{ margin:0, fontSize:"18px", fontWeight:"700", color: T.text }}>선수 목록</h2>
                <div style={{ fontSize:"12px", color: T.textMuted, marginTop:"2px" }}>{players.length}명 등록됨</div>
              </div>
              {!showForm&&(
                <button onClick={()=>{setShowForm(true);setEditIdx(null);}} style={{ background: T.text, border:"none", borderRadius:"10px", padding:"9px 18px", color:"#fff", fontWeight:"700", cursor:"pointer", fontSize:"13px", fontFamily:"inherit" }}>+ 선수 추가</button>
              )}
            </div>
            {showForm&&<PlayerForm player={editIdx!==null?players[editIdx]:null} onSave={savePlayer} onCancel={()=>{setShowForm(false);setEditIdx(null);}}/>}
            {!players.length&&!showForm
              ? <div style={{ textAlign:"center", padding:"72px 20px", color: T.textMuted }}>
                  <div style={{ fontSize:"40px", marginBottom:"12px" }}>🏀</div>
                  <div style={{ fontSize:"16px", fontWeight:"600", color: T.textSub, marginBottom:"6px" }}>선수가 없어요</div>
                  <div style={{ fontSize:"13px" }}>+ 선수 추가 버튼으로 팀원을 등록하세요</div>
                </div>
              : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"12px" }}>
                  {players.map((p,i)=>editIdx===i&&showForm?null:<PlayerCard key={p.id} player={p} onEdit={()=>{setEditIdx(i);setShowForm(true);}} onDelete={()=>delPlayer(i)}/>)}
                </div>
            }
          </div>
        )}

        {/* ── COURT ── */}
        {tab==="court"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
              <div>
                <h2 style={{ margin:0, fontSize:"18px", fontWeight:"700", color: T.text }}>코트 배치</h2>
                <div style={{ fontSize:"12px", color: T.textMuted, marginTop:"2px" }}>선수별 선호 공격 위치를 설정하세요</div>
              </div>
            </div>
            <HalfCourtEditor players={players} zones={zones} onZonesChange={saveZones}/>
          </div>
        )}

        {/* ── TACTICS ── */}
        {tab==="tactics"&&(
          <div>
            <div style={{ marginBottom:"18px" }}>
              <h2 style={{ margin:"0 0 4px", fontSize:"18px", fontWeight:"700", color: T.text }}>전술판</h2>
              <div style={{ fontSize:"12px", color: T.textMuted }}>선수를 배치하고 패스·이동 동선을 그려보세요</div>
            </div>
            <TacticsBoard/>
          </div>
        )}

        {/* ── STRATEGY ── */}
        {tab==="strategy"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
              <div>
                <h2 style={{ margin:0, fontSize:"18px", fontWeight:"700", color: T.text }}>팀 전략</h2>
                <div style={{ fontSize:"12px", color: T.textMuted, marginTop:"2px" }}>공격·수비 전략과 세트플레이를 기록하세요</div>
              </div>
              <button onClick={()=>{ if(editStrat) saveStrat(strat); setEditStrat(v=>!v); }}
                style={{ background: editStrat ? T.text : T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:"10px", padding:"9px 16px", color: editStrat ? "#fff" : T.textSub, fontWeight:"700", cursor:"pointer", fontSize:"13px", fontFamily:"inherit", transition:"all 0.15s" }}>
                {editStrat ? "💾 저장" : "✏️ 편집"}
              </button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
              {[{k:"offense",label:"⚡ 공격 전략",c: POS_COLOR.SG, ph:"예) 픽앤롤 중심의 빠른 속공..."},{k:"defense",label:"🛡 수비 전략",c: POS_COLOR.PG, ph:"예) 맨투맨 기반 헬프 디펜스..."}].map(({k,label,c,ph})=>(
                <div key={k} style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px" }}>
                  <div style={{ fontSize:"13px", fontWeight:"700", color: c, marginBottom:"12px" }}>{label}</div>
                  {editStrat
                    ? <textarea style={{...IS, height:"120px", resize:"vertical"}} value={strat[k]} onChange={e=>setStrat(s=>({...s,[k]:e.target.value}))} placeholder={ph}/>
                    : <div style={{ fontSize:"13px", color: strat[k] ? T.textSub : T.textMuted, lineHeight:"1.75", minHeight:"80px" }}>{strat[k]||ph}</div>}
                </div>
              ))}
            </div>

            <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px" }}>
              <div style={{ fontSize:"13px", fontWeight:"700", color: POS_COLOR.SF, marginBottom:"12px" }}>📋 기타 전술 메모</div>
              {editStrat
                ? <textarea style={{...IS, height:"100px", resize:"vertical"}} value={strat.notes} onChange={e=>setStrat(s=>({...s,notes:e.target.value}))} placeholder="타임아웃 전략, 세트플레이..."/>
                : <div style={{ fontSize:"13px", color: strat.notes ? T.textSub : T.textMuted, lineHeight:"1.75", minHeight:"60px" }}>{strat.notes||"타임아웃 전략, 세트플레이..."}</div>}
            </div>
          </div>
        )}

        {/* ── VOICE ── */}
        {tab==="voice"&&<VoiceTab players={players} voices={voices} onAdd={addVoice} onDel={delVoice}/>}

        {/* ── OPPONENT ── */}
        {tab==="opponent"&&(
          <div>
            <div style={{ marginBottom:"20px" }}>
              <h2 style={{ margin:"0 0 4px", fontSize:"18px", fontWeight:"700", color: T.text }}>상대팀 분석</h2>
              <div style={{ fontSize:"12px", color: T.textMuted }}>상대 선수 정보와 수비 전략을 기록하세요</div>
            </div>

            {/* Team tabs */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"20px", flexWrap:"wrap" }}>
              {oppTeams.map(t=>{
                const isSel = t.id===selTeamId;
                const isEditing = editingTeamId===t.id;
                return (
                  <div key={t.id}
                    style={{ display:"flex", alignItems:"center", gap:"4px", padding:"7px 14px", borderRadius:"30px", cursor:"pointer", border:`1px solid ${isSel ? T.borderMid : T.border}`, background: isSel ? T.surfaceAlt : T.surface, transition:"all 0.15s" }}
                    onClick={()=>{ setSelTeamId(t.id); setOppForm(false); setOppIdx(null); }}>
                    {isEditing
                      ? <input autoFocus style={{...IS, width:"100px", padding:"0", background:"transparent", border:"none", fontSize:"13px", fontWeight:"700"}}
                          value={t.name} onChange={e=>renameTeam(t.id,e.target.value)}
                          onBlur={()=>setEditingTeamId(null)} onKeyDown={e=>e.key==="Enter"&&setEditingTeamId(null)}
                          onClick={e=>e.stopPropagation()}/>
                      : <span style={{ fontSize:"13px", fontWeight: isSel ? "700" : "500", color: isSel ? T.text : T.textSub }}>{t.name}</span>}
                    {isSel&&!isEditing&&<span onClick={e=>{e.stopPropagation();setEditingTeamId(t.id);}} style={{ fontSize:"11px", marginLeft:"3px", cursor:"pointer", color: T.textMuted }}>✏️</span>}
                    {oppTeams.length>1&&isSel&&<span onClick={e=>{e.stopPropagation();delTeam(t.id);}} style={{ fontSize:"12px", marginLeft:"3px", cursor:"pointer", color: T.textMuted }}>✕</span>}
                  </div>
                );
              })}
              <button onClick={addTeam}
                style={{ padding:"7px 14px", borderRadius:"30px", border:`1px dashed ${T.border}`, background: T.surface, color: T.textMuted, fontSize:"13px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.borderMid; e.currentTarget.style.color=T.textSub; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.textMuted; }}>
                + 팀 추가
              </button>
            </div>

            {curTeam&&(
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
                <div style={{ fontSize:"13px", color: T.textSub }}>{curTeam.name} · {opps.length}명 등록됨</div>
                {!oppForm&&<button onClick={()=>{setOppForm(true);setOppIdx(null);}} style={{ background: T.danger, border:"none", borderRadius:"10px", padding:"9px 18px", color:"#fff", fontWeight:"700", cursor:"pointer", fontSize:"13px", fontFamily:"inherit" }}>+ 선수 추가</button>}
              </div>
            )}

            {highThreat.length>0&&(
              <div style={{ background: T.dangerBg, border:`1px solid ${T.danger}20`, borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"16px" }}>🚨</span>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"700", color: T.danger, marginBottom:"4px" }}>주요 위협 선수</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                    {highThreat.map(p=>(
                      <span key={p.id} style={{ background:"#fff", color: T.danger, borderRadius:"20px", padding:"2px 10px", fontSize:"12px", fontWeight:"600", border:`1px solid ${T.danger}30` }}>{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {oppForm&&<OppForm player={oppIdx!==null?opps[oppIdx]:null} onSave={saveOpp} onCancel={()=>{setOppForm(false);setOppIdx(null);}}/>}

            {!opps.length&&!oppForm&&(
              <div style={{ textAlign:"center", padding:"72px 20px", color: T.textMuted }}>
                <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔍</div>
                <div style={{ fontSize:"16px", fontWeight:"600", color: T.textSub, marginBottom:"6px" }}>선수 정보가 없어요</div>
                <div style={{ fontSize:"13px" }}>+ 선수 추가로 분석을 시작하세요</div>
              </div>
            )}

            {opps.length>0&&(
              <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
                {POSITIONS.map(pos=>{
                  const plist=opps.filter(p=>(p.positions||[]).includes(pos)||(!(p.positions||[]).length&&pos==="PG"));
                  if(!plist.length) return null;
                  return (
                    <div key={pos}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                        <div style={{ width:"4px", height:"18px", borderRadius:"2px", background: POS_COLOR[pos] }}/>
                        <span style={{ fontSize:"13px", fontWeight:"700", color: POS_COLOR[pos] }}>{pos}</span>
                        <span style={{ fontSize:"12px", color: T.textMuted }}>{POS_LABEL[pos]} · {plist.length}명</span>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"10px" }}>
                        {plist.map(player=>{ const gi=opps.findIndex(p=>p.id===player.id); return oppIdx===gi&&oppForm?null:<OppCard key={player.id} player={player} onEdit={()=>{setOppIdx(gi);setOppForm(true);}} onDelete={()=>delOpp(gi)}/>; })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
