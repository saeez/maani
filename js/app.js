(function(){
"use strict";

/* ================= constants ================= */
const QC = "https://api.quran.com/api/v4";
const SURAHS = window.SURAHS;            /* [arabic, transliteration, Urdu meaning, ayah count] */
const CUR = window.CURATED || {};
const SRC = {ur:"اردو لفظی ترجمہ (Quran.com)", en:"انگریزی لفظی ترجمہ (Quran.com)", U:"آپ کا معنی",
  J:"جلالین", Q:"قرطبی", B:"ابو حیان (البحر المحیط)", K:"ابن کثیر", M:"لفظی / نحوی نوٹ"};
/* verse translations on api.quran.com: [id, lang, name] */
const TRANS = [
  [234,"ur","فتح محمد جالندھری"],[54,"ur","محمد جوناگڑھی"],[97,"ur","ابوالاعلیٰ مودودی (تفہیم القرآن)"],
  [158,"ur","ڈاکٹر اسرار احمد (بیان القرآن)"],[151,"ur","شیخ الہند محمود الحسن"],[819,"ur","وحید الدین خان"],[156,"ur","فی ظلال القرآن"],
  [20,"en","Saheeh International"],[85,"en","Abdel Haleem"],[84,"en","Taqi Usmani"],[95,"en","Maududi"],
  [22,"en","Yusuf Ali"],[19,"en","Pickthall"],[203,"en","Hilali & Khan"],[149,"en","Bridges (Fadel Soliman)"]];
/* tafsir editions: "mcp:<edition>" via quran.ai MCP, "qc:<id>" via api.quran.com */
const TAFSIRS = [
  ["mcp:ar-jalalayn","تفسیر الجلالین","ar"],["mcp:ar-ibn-kathir","تفسیر ابن کثیر","ar"],
  ["mcp:ar-qurtubi","قرطبی، الجامع لاحکام القرآن","ar"],["mcp:ar-albahr-almuheet","ابو حیان، البحر المحیط","ar"],
  ["mcp:ar-tabari","طبری، جامع البیان","ar"],["mcp:ar-alrazi","رازی، مفاتیح الغیب","ar"],
  ["mcp:ar-kashaf","زمخشری، الکشاف","ar"],["mcp:ar-baghawi","بغوی، معالم التنزیل","ar"],
  ["mcp:ar-alaloosi","آلوسی، روح المعانی","ar"],["mcp:ar-tahrir-wa-tanwir","ابن عاشور، التحریر والتنویر","ar"],
  ["mcp:ar-saadi","سعدی، تیسیر الکریم الرحمن","ar"],["mcp:ar-muyassar","التفسیر المیسر","ar"],
  ["mcp:ar-al-wasit","طنطاوی، التفسیر الوسیط","ar"],["mcp:ar-ibn-alqayyim","تفسیر ابن قیم","ar"],
  ["mcp:ar-nathm-aldurar","بقاعی، نظم الدرر","ar"],["mcp:ar-ghareeb-ibn-qutaybah","ابن قتیبہ، غریب القرآن","ar"],
  ["mcp:ar-wahidi-asbab","واحدی، اسباب النزول","ar"],
  ["qc:160","تفسیر ابن کثیر (اردو)","ur"],["qc:159","بیان القرآن، ڈاکٹر اسرار احمد","ur"],
  ["qc:157","فی ظلال القرآن (اردو)","ur"],["qc:818","تذکیر القرآن، وحید الدین خان","ur"],
  ["mcp:en-ibn-kathir","Ibn Kathir (Abridged)","en"],["mcp:en-maarif-ul-quran","Ma'arif al-Qur'an","en"],
  ["mcp:en-tazkirul-quran","Tazkirul Quran","en"]];
const UR = {noun:"اسم",verb:"فعل",particle:"حرف",pronoun:"ضمیر","proper noun":"اسمِ علم",adjective:"صفت",
  "1st":"متکلم","2nd":"حاضر","3rd":"غائب",masculine:"مذکر",feminine:"مؤنث",singular:"واحد",dual:"تثنیہ",plural:"جمع",
  perfect:"ماضی",imperfect:"مضارع",imperative:"امر",indicative:"مرفوع",subjunctive:"منصوب",jussive:"مجزوم",
  active:"معروف",passive:"مجہول",nominative:"مرفوع",accusative:"منصوب",genitive:"مجرور",definite:"معرفہ",indefinite:"نکرہ"};
const FEAT = [["part_of_speech","قسم"],["aspect","فعل کی قسم"],["person","صیغہ"],["gender","جنس"],["number","عدد"],
  ["voice","معروف / مجہول"],["mood","فعل کا اعراب"],["case","اعراب"],["definiteness","تعریف"],["verb_form","باب (وزن)"]];
const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

/* ================= utils ================= */
const $ = id => document.getElementById(id);
const stage=$("stage"), world=$("world"), svg=$("links"), root=document.documentElement;
const isMobile = () => matchMedia("(max-width:820px)").matches;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function esc(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
const toLatin = s => String(s).replace(/[٠-٩]/g, d=>d.charCodeAt(0)-0x660).replace(/[۰-۹]/g, d=>d.charCodeAt(0)-0x6F0);
const surahName = s => SURAHS[s-1]?.[0] || s;
const akey = w => w.slice(0, w.lastIndexOf(":"));          /* "2:102:3" -> "2:102" */
const wpos = w => +w.slice(w.lastIndexOf(":")+1);
const spaced = r => [...r].join(" ");
const urf = v => { const u=UR[String(v).toLowerCase()]; return u ? `${u} (${v})` : String(v); };
const cmpKey = (a,b) => { const [s1,a1]=a.k.split(":").map(Number), [s2,a2]=b.k.split(":").map(Number); return s1-s2 || a1-a2 || a.p-b.p; };
/* trust boundary: API responses and localStorage are outside our control, so ids are checked against
   the real mushaf and numbers forced to numbers before anything reaches the page */
const validAyah = k => { const m=/^(\d{1,3}):(\d{1,3})$/.exec(String(k)); return !!m && SURAHS[m[1]-1] && +m[2]>=1 && +m[2]<=SURAHS[m[1]-1][3]; };
const validWord = w => typeof w==="string" && /^\d{1,3}:\d{1,3}:\d{1,3}$/.test(w) && validAyah(akey(w));
const int = v => { const n=Number(v); return Number.isInteger(n) && n>=0 ? n : 0; };

/* ================= state ================= */
const KEY="maani-jaal-quran-v1";
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null"); }catch(e){ return null; } },
  set(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} }
};
let S = {ayahs:[], sel:{}, links:[], custom:{}, pos:{}, view:null, theme:null, pw:null, tr:[234,20], tafsir:"mcp:ar-jalalayn", showEn:true};
/* debounced: wheel-zoom and drags would otherwise stringify+write S on every event */
function save(){ clearTimeout(save.t); save.t=setTimeout(()=>store.set(S),300); }
addEventListener("pagehide", ()=>{ clearTimeout(save.t); store.set(S); });

/* API responses that never change (verse words, morphology, translations) are kept across visits */
const CV="c1:";
const pcache = {
  get(k){ try{ return JSON.parse(localStorage.getItem(CV+k)); }catch(e){ return null; } },
  set(k,v){
    try{ localStorage.setItem(CV+k, JSON.stringify(v)); }
    catch(e){ /* storage full: drop the cache (never the user's state) and try once more */
      try{ for(const x of Object.keys(localStorage)) if(x.startsWith(CV)) localStorage.removeItem(x); localStorage.setItem(CV+k, JSON.stringify(v)); }catch(_){}
    }
  }
};

/* ================= data: api.quran.com ================= */
async function getJSON(url){ const r=await fetch(url,{signal:AbortSignal.timeout(20000)}); if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); }
const VERSES={}, MORPH={}, MORPH_ERR={}, TRC={}, TAF={}, CONC={}, inflight={};
function once(k, fn){ return inflight[k] ||= fn().finally(()=>{ delete inflight[k]; }); }

function loadVerse(key){
  if(VERSES[key]?.words) return Promise.resolve(VERSES[key]);
  const c=pcache.get("v:"+key); if(c){ VERSES[key]=c; return Promise.resolve(c); }
  return once("v:"+key, async()=>{
    try{
      const q="words=true&word_fields=text_uthmani&fields=text_uthmani";
      const [u,e]=await Promise.all([getJSON(`${QC}/verses/by_key/${key}?${q}&language=ur`), getJSON(`${QC}/verses/by_key/${key}?words=true&language=en`)]);
      const enT={}; for(const w of e.verse.words) enT[w.position]=w.translation?.text||"";
      const v={key, text:String(u.verse.text_uthmani||""), words:u.verse.words.filter(w=>w.char_type_name==="word" && int(w.position)>0).map(w=>({
        p:int(w.position), ar:String(w.text_uthmani||""), ur:String(w.translation?.text||""), en:String(enT[w.position]||""), tl:String(w.transliteration?.text||"")}))};
      VERSES[key]=v; pcache.set("v:"+key, v); return v;
    }catch(err){ VERSES[key]={key, error:err.message}; throw err; }
  });
}
function htmlText(html){ const d=new DOMParser().parseFromString(html,"text/html"); d.querySelectorAll("sup").forEach(n=>n.remove()); return d.body.textContent.replace(/\s+/g," ").trim(); }
/* tafsir HTML from the API is untrusted: parse inert, keep only text, split into paragraphs */
function htmlParas(html){
  const d=new DOMParser().parseFromString(html,"text/html");
  d.querySelectorAll("sup,script,style").forEach(n=>n.remove());
  const blocks=[...d.body.querySelectorAll("p,h1,h2,h3,h4,h5,li,blockquote")].filter(b=>!b.querySelector("p,h1,h2,h3,h4,h5,li"));
  const out = blocks.length ? blocks.map(b=>({h:/^H\d$/.test(b.tagName), t:b.textContent.replace(/\s+/g," ").trim()}))
                            : d.body.textContent.split(/\n+/).map(t=>({t:t.trim()}));
  return out.filter(x=>x.t);
}
function loadTr(id, key){
  const k=id+"|"+key; if(TRC[k]!=null) return Promise.resolve(TRC[k]);
  const c=pcache.get("t:"+k); if(c!=null){ TRC[k]=c; return Promise.resolve(c); }
  return once("t:"+k, async()=>{
    const j=await getJSON(`${QC}/quran/translations/${id}?verse_key=${key}`);
    const t=htmlText(j.translations?.[0]?.text||""); TRC[k]=t; pcache.set("t:"+k,t); return t;
  });
}

/* ================= data: quran.ai MCP (browser client) =================
   Streamable-HTTP JSON-RPC straight from the page (the server allows CORS).
   The public server allows one tool call per second per client, so calls run one at a time
   ~1.1 s apart; urgent ones (what the user just tapped) jump the queue. */
const MCP = (()=>{
  const URL_="https://mcp.quran.ai/"; let sid=null, ready=null, nonce=null, last=0, rid=0, busy=false;
  const Q=[]; let onQueue=()=>{};
  async function post(method, params, notify){
    const body={jsonrpc:"2.0", method, params}; if(!notify) body.id=++rid;
    const h={"content-type":"application/json", accept:"application/json, text/event-stream"};
    if(sid){ h["mcp-session-id"]=sid; h["mcp-protocol-version"]="2025-03-26"; }
    const r=await fetch(URL_,{method:"POST", headers:h, body:JSON.stringify(body), signal:AbortSignal.timeout(30000)});
    if((r.status===404||r.status===400) && sid){ sid=null; ready=null; const e=new Error("session expired"); e.session=true; throw e; }
    if(!r.ok) throw new Error("quran.ai HTTP "+r.status);
    sid=r.headers.get("mcp-session-id")||sid;
    if(notify) return null;
    const t=await r.text();
    const data=t.split("\n").filter(l=>l.startsWith("data:")).map(l=>l.slice(5)).pop();
    const j=JSON.parse(data ?? t);
    if(j.error) throw new Error(j.error.message||"quran.ai error");
    return j.result;
  }
  function init(){
    return ready ||= (async()=>{
      await post("initialize",{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"quran-word-study",version:"1.0"}});
      await post("notifications/initialized",{},true);
    })().catch(e=>{ ready=null; throw e; });
  }
  async function raw(name, args){
    for(let tries=0;;tries++){
      await init();
      const wait=last+1100-Date.now(); if(wait>0) await sleep(wait);
      last=Date.now();
      let res;
      try{ res=await post("tools/call",{name, arguments:args}); }
      catch(e){ if(e.session && tries<2) continue; throw e; }
      const ab=res?._meta?.["quran.ai/abuse"];
      if(res?.isError && ab && tries<4){ await sleep((ab.retry_after_seconds||1)*1000+250); continue; }
      if(res?.isError) throw new Error(res.content?.[0]?.text || "quran.ai error");
      return res.structuredContent ?? res;
    }
  }
  async function pump(){
    if(busy) return; busy=true;
    while(Q.length){ onQueue(Q.length); const j=Q.shift(); try{ j.res(await raw(j.name, j.args)); }catch(e){ j.rej(e); } }
    busy=false; onQueue(0);
  }
  function call(name, args, urgent){
    return new Promise((res,rej)=>{ const j={name,args,res,rej}; urgent ? Q.unshift(j) : Q.push(j); pump(); });
  }
  /* move already-queued calls matching pred to the front */
  function bump(pred){ const hit=Q.filter(pred); if(hit.length){ for(const j of hit) Q.splice(Q.indexOf(j),1); Q.unshift(...hit); } }
  async function tafsir(edition, key){
    if(!nonce){ const g=await call("fetch_grounding_rules",{},true); nonce=(JSON.stringify(g).match(/gnd-[0-9a-f]+/)||[])[0]||null; }
    return call("fetch_tafsir",{ayahs:key, editions:[edition], ...(nonce?{grounding_nonce:nonce}:{})}, true);
  }
  return {call, bump, tafsir, set onQueue(f){ onQueue=f; }};
})();

function loadMorph(key, urgent){
  if(MORPH[key]) return Promise.resolve(MORPH[key]);
  const c=pcache.get("m:"+key); if(c){ MORPH[key]=c; return Promise.resolve(c); }
  if(urgent) MCP.bump(j=>j.name==="fetch_word_morphology" && j.args.ayah_key===key);
  return once("m:"+key, async()=>{
    const sc=await MCP.call("fetch_word_morphology",{ayah_key:key}, urgent);
    const m={};
    for(const w of sc?.words||[]){
      const f=w.grammatical_features||{};
      if(!w.root && !w.lemma && !f.part_of_speech) continue;   /* the ayah-number marker */
      if(!int(w.position)) continue;
      m[int(w.position)]={root:String(w.root||""), lemma:String(w.lemma||""),
        rc:int(w.root_frequency?.word_count), rv:int(w.root_frequency?.verse_count),
        lc:int(w.lemma_frequency?.word_count), lv:int(w.lemma_frequency?.verse_count),
        desc:w.description||"",
        f:Object.fromEntries(Object.entries(f).filter(([k,v])=>v!=null && v!=="" && k!=="features_version" && k!=="raw_unrecognized_tags")),
        seg:(w.morpheme_segments||[]).map(s=>[s.text, s.grammar_description||s.part_of_speech_name||""])};
    }
    MORPH[key]=m; delete MORPH_ERR[key]; pcache.set("m:"+key,m); return m;
  });
}
function loadConc(w, mode){
  const k=mode+"|"+w, c=CONC[k] ||= {items:[], seen:new Set(), page:0, total:null, verses:null, done:false};
  if(c.loading || c.done) return;
  c.loading=true; c.err=null; renderDetail();
  MCP.call("fetch_word_concordance",{ayah_key:akey(w), word_position:wpos(w), match_by:mode, group_by:"word", page:c.page+1, page_size:100, rerank_from:"false"}, true)
    .then(sc=>{
      c.page++; c.total=int(sc.total_words); c.verses=int(sc.total_verses);
      const rs=sc.word_results||[];
      for(const r of rs){
        if(!validAyah(r.ayah_key) || !int(r.position)) continue;
        const id=r.ayah_key+":"+int(r.position); if(c.seen.has(id)) continue; c.seen.add(id);
        c.items.push({k:r.ayah_key, p:int(r.position), ar:String(r.text_uthmani||""), v:String(r.verse_text||"")}); }
      c.done = !rs.length || c.items.length>=c.total;
    }, e=>{ c.err=e.message; })
    .finally(()=>{ c.loading=false; renderDetail(); });
}
function loadTafsir(ed, key){
  const k=ed+"|"+key; if(TAF[k]) return Promise.resolve(TAF[k]);
  return once("f:"+k, async()=>{
    let r;
    if(ed.startsWith("qc:")){
      const j=await getJSON(`${QC}/tafsirs/${ed.slice(3)}/by_ayah/${key}`);
      r={paras:htmlParas(j.tafsir?.text||""), range:Object.keys(j.tafsir?.verses||{})};
    } else {
      const id=ed.slice(4), sc=await MCP.tafsir(id, key), entries=sc?.results?.[id]||[];
      r={paras:entries.flatMap(e=>String(e.text||"").split(/\n+/)).map(t=>({t:t.trim()})).filter(x=>x.t),
         range:[...new Set(entries.flatMap(e=>e.ayahs||[]))].filter(validAyah)};
    }
    TAF[k]=r; return r;
  });
}

/* ================= model ================= */
let WORDS=[], WBY={}, MEAN={};     /* loaded words in canvas order; by key; meanings per word */
let focus=null, selLink=null, linkFrom=null;
const curatedOf = w => CUR[akey(w)]?.words?.[wpos(w)-1];
function meaningsOf(w){
  const d=WBY[w]?.d, out=[], c=curatedOf(w);
  if(c) c[1].forEach((x,j)=>out.push({k:"c:"+(x[0]||String(j)), t:x[1], s:x[2], d:x[3]||"", n:x[4]||""}));
  if(d){ out.push({k:"ur", t:d.ur||"—", s:"ur", d:"", n:""}); if(S.showEn && d.en) out.push({k:"en", t:d.en, s:"en", d:"", n:""}); }
  for(const m of S.custom[w]||[]) out.push({k:m.k, t:m.t, s:"U", d:m.n||"", n:""});
  return out;
}
function rebuildWords(){
  WORDS=[]; WBY={}; MEAN={};
  for(const key of S.ayahs){ const v=VERSES[key]; if(!v?.words) continue;
    for(const d of v.words){ const o={w:key+":"+d.p, key, p:d.p, d}; WORDS.push(o); WBY[o.w]=o; } }
  for(const o of WORDS) MEAN[o.w]=meaningsOf(o.w);
  if(focus && (!WBY[focus.w] || !meaning(focus.w,focus.k))) focus = WBY[focus.w] ? {w:focus.w, k:selKey(focus.w)} : null;
  if(!focus && WORDS.length) focus={w:WORDS[0].w, k:selKey(WORDS[0].w)};
}
function meaning(w,k){ return (MEAN[w]||[]).find(x=>x.k===k); }
function selKey(w){ const k=S.sel[w], ms=MEAN[w]||[]; return (k && ms.some(x=>x.k===k)) ? k : ms[0]?.k; }
const nodeId = n => n.w+"~"+n.k;
function linkId(a,b){ const x=nodeId(a), y=nodeId(b); return x<y ? x+"|"+y : y+"|"+x; }
const linkOK = L => !!(meaning(L.a.w,L.a.k) && meaning(L.b.w,L.b.k));
function addLink(a,b,src){
  if(a.w===b.w) return false;
  const id=linkId(a,b); if(S.links.some(L=>L.id===id)) return false;
  S.links.push({id,a,b,src}); return true;
}
function removeLink(id){ S.links=S.links.filter(L=>L.id!==id); if(selLink===id) selLink=null; }
function presetOf(src){ const [key,id]=String(src).split("#"); return CUR[key]?.presets?.find(p=>p.id===id); }
const colorOf = L => L.src==="user" ? "var(--gold)" : (presetOf(L.src)?.color || "var(--gold)");
function chains(){
  const parent={}, f=x=>{ while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; };
  const add=x=>{ if(!(x in parent)) parent[x]=x; };
  const ls=S.links.filter(linkOK);
  ls.forEach(L=>{ const a=nodeId(L.a), b=nodeId(L.b); add(a); add(b); parent[f(a)]=f(b); });
  const groups={};
  Object.keys(parent).forEach(n=>{ const r=f(n); (groups[r] ||= []).push(n); });
  const order=w=>{ const i=S.ayahs.indexOf(akey(w)); return i*1000+wpos(w); };
  return Object.values(groups).map(nodes=>{
    const set=new Set(nodes);
    const ns=nodes.map(n=>{ const i=n.lastIndexOf("~"); return {w:n.slice(0,i), k:n.slice(i+1)}; }).sort((a,b)=>order(a.w)-order(b.w));
    return {nodes:ns, links:ls.filter(L=>set.has(nodeId(L.a)))};
  }).sort((a,b)=>order(a.nodes[0].w)-order(b.nodes[0].w));
}
function presetMatches(key,p){ return Object.entries(p.sel).every(([pos,k])=>selKey(key+":"+pos)==="c:"+(k||"0")); }

/* ================= canvas ================= */
const CW=180, HEAD=58, PH=30, PG=4, GX=212, GY=70, TITLE=44, AGAP=36;
const cardEls={}, titleEls={};
let AUTO={}, AUTO_T={}, COLS=7;
const cardH = w => HEAD + (MEAN[w]||[]).length*(PH+PG) + 6;
const rowW = () => (COLS-1)*GX+CW;
function autoLayout(){
  /* phones get 2–4 columns so cards stay tappable at fit zoom */
  COLS = isMobile() ? Math.max(2, Math.min(4, Math.floor(stage.clientWidth/190))) : 7;
  AUTO={}; AUTO_T={}; let y=60;
  for(const key of S.ayahs){
    AUTO_T[key]={x:40, y}; y+=TITLE;
    const ws=WORDS.filter(o=>o.key===key);
    for(let i=0;i<ws.length;i+=COLS){
      let mh=0;
      ws.slice(i,i+COLS).forEach((o,c)=>{ AUTO[o.w]={x:40+(COLS-1-c)*GX, y}; mh=Math.max(mh,cardH(o.w)); });
      y+=mh+GY;
    }
    y += ws.length ? AGAP : 40;
  }
}
const pos = w => S.pos[w] || AUTO[w] || {x:0,y:0};
const tpos = key => AUTO_T[key];
function buildCard(o, sig){
  const c=el("div","card"); c.dataset.w=o.w; c._sig=sig;
  const h=el("div","head"); h.dataset.w=o.w; h.tabIndex=0; h.setAttribute("role","button"); h.setAttribute("aria-label", o.d.ar+": تفصیل");
  h.append(el("span","num",String(o.p)), el("span","ar",o.d.ar), el("span","root"));
  c.append(h);
  const ps=el("div","pills");
  for(const m of MEAN[o.w]){
    const p=el("div","pill"); p.dataset.w=o.w; p.dataset.k=m.k; p.dataset.src=m.s; p.tabIndex=0;
    p.setAttribute("role","button"); p.setAttribute("aria-label", o.d.ar+": "+m.t);
    const dot=el("span","dot"); dot.style.background=`var(--s-${m.s})`;
    p.append(dot, el("span","tx",m.t)); p.title=m.t+" · "+SRC[m.s]+(m.n?" ("+m.n+")":"");
    ps.append(p);
  }
  c.append(ps);
  if(cardEls[o.w]) cardEls[o.w].replaceWith(c); else world.append(c);
  cardEls[o.w]=c;
}
function syncCanvas(){
  for(const key of Object.keys(titleEls)) if(!S.ayahs.includes(key)){ titleEls[key].remove(); delete titleEls[key]; }
  for(const key of S.ayahs){
    let t=titleEls[key]; if(!t){ t=titleEls[key]=el("div","atitle"); t.dataset.key=key; world.append(t); }
    const v=VERSES[key];
    const st = v?.error ? "لوڈ نہیں ہو سکا، دوبارہ کوشش کے لیے ٹیپ کریں" : (!v?.words ? "لوڈ ہو رہا ہے…" : "");
    const html=`${esc(surahName(+key.split(":")[0]))} ${esc(key)} <small>${st}</small>`;
    if(t.innerHTML!==html) t.innerHTML=html;
  }
  for(const w of Object.keys(cardEls)) if(!WBY[w]){ cardEls[w].remove(); delete cardEls[w]; }
  for(const o of WORDS){
    const sig=MEAN[o.w].map(m=>m.k+"\u0001"+m.t).join("\u0002");
    if(cardEls[o.w]?._sig!==sig) buildCard(o, sig);
  }
}
function neighbours(){
  const set=new Set(); if(!focus) return set;
  for(const L of S.links){
    if(L.a.w===focus.w && L.a.k===focus.k) set.add(nodeId(L.b));
    if(L.b.w===focus.w && L.b.k===focus.k) set.add(nodeId(L.a));
  }
  return set;
}
function updateCards(){
  const nb=neighbours(), fr=focus ? MORPH[akey(focus.w)]?.[wpos(focus.w)]?.root : "";
  for(const o of WORDS){
    const c=cardEls[o.w]; if(!c) continue;
    const p=pos(o.w); c.style.left=p.x+"px"; c.style.top=p.y+"px";
    const m=MORPH[o.key]?.[o.p], r=c.querySelector(".root"), rt=m?.root ? spaced(m.root) : "";
    if(r.textContent!==rt){ r.textContent=rt; r.title = m?.root ? `مادہ ${rt}: قرآن میں ${m.rc} بار` : ""; }
    c.classList.toggle("focused", !!focus && focus.w===o.w);
    c.classList.toggle("sameroot", !!fr && m?.root===fr && focus.w!==o.w);
    const sk=selKey(o.w);
    for(const pe of c.querySelectorAll(".pill")){
      const k=pe.dataset.k;
      pe.classList.toggle("on", k===sk);
      pe.classList.toggle("focus", !!focus && focus.w===o.w && focus.k===k);
      pe.classList.toggle("hl", nb.has(o.w+"~"+k));
    }
  }
  for(const key of S.ayahs){ const t=titleEls[key], p=tpos(key); if(!t||!p) continue; t.style.left=p.x+"px"; t.style.top=p.y+"px"; t.style.width=rowW()+"px"; }
}
function anchor(w,k,side){
  const i=Math.max(0,(MEAN[w]||[]).findIndex(x=>x.k===k)), p=pos(w);
  return {x:p.x+(side==="L"?9:CW-9), y:p.y+1+HEAD+i*(PH+PG)+PH/2};
}
function pathFor(a,b){
  const pa=pos(a.w), pb=pos(b.w), dx=pb.x-pa.x; let sa, sb;
  if(Math.abs(dx)<60){ sa="L"; sb="L"; } else if(dx<0){ sa="L"; sb="R"; } else { sa="R"; sb="L"; }
  const A=anchor(a.w,a.k,sa), B=anchor(b.w,b.k,sb);
  const off = sa===sb ? Math.max(60, Math.abs(B.y-A.y)/4) : Math.max(50, Math.abs(B.x-A.x)/3);
  const ax=A.x+(sa==="L"?-off:off), bx=B.x+(sb==="L"?-off:off);
  return {d:`M${A.x},${A.y} C${ax},${A.y} ${bx},${B.y} ${B.x},${B.y}`, A, B};
}
function drawLinks(temp){
  let maxX=0, maxY=0;
  for(const o of WORDS){ const p=pos(o.w); maxX=Math.max(maxX,p.x+CW+200); maxY=Math.max(maxY,p.y+cardH(o.w)+200); }
  svg.setAttribute("width", maxX); svg.setAttribute("height", maxY);
  let h="";
  for(const L of S.links){
    if(!linkOK(L)) continue;
    const {d,A,B}=pathFor(L.a,L.b), c=colorOf(L);
    const touch = focus && ((L.a.w===focus.w&&L.a.k===focus.k)||(L.b.w===focus.w&&L.b.k===focus.k));
    const on = selLink===L.id || touch, dim = selLink && selLink!==L.id;
    h+=`<path class="v${on?" on":""}${dim?" dim":""}" d="${d}" stroke="${c}"/>`;
    h+=`<circle cx="${A.x}" cy="${A.y}" r="3.5" fill="${c}"/><circle cx="${B.x}" cy="${B.y}" r="3.5" fill="${c}"/>`;
    h+=`<path class="h" data-id="${esc(L.id)}" d="${d}"><title>${esc(WBY[L.a.w].d.ar+" ↔ "+WBY[L.b.w].d.ar)}</title></path>`;
  }
  if(temp) h+=`<path class="v on" d="${temp}" stroke="var(--gold)" stroke-dasharray="6 5"/>`;
  svg.innerHTML=h;
  $("delLink").hidden=!selLink;
}

/* ---------- view ---------- */
function applyView(){ const v=S.view; world.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.k})`; }
function toWorld(cx,cy){ const r=stage.getBoundingClientRect(), v=S.view; return {x:(cx-r.left-v.x)/v.k, y:(cy-r.top-v.y)/v.k}; }
function fit(){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const add=(x,y,w,h)=>{ x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x+w); y1=Math.max(y1,y+h); };
  for(const o of WORDS){ const p=pos(o.w); add(p.x,p.y,CW,cardH(o.w)); }
  for(const key of S.ayahs){ const p=tpos(key); if(p) add(p.x,p.y,rowW(),TITLE); }
  if(x0>x1) return;
  const r=stage.getBoundingClientRect(), W0=r.width>50 ? r.width : 900;
  const k=Math.max(0.4, Math.min(1, (W0-60)/(x1-x0)));
  S.view={k, x:(W0-(x1-x0)*k)/2 - x0*k, y:56 - y0*k};
  applyView(); save();
}
function zoomAt(f, cx, cy){
  const r=stage.getBoundingClientRect(), v=S.view;
  if(cx==null){ cx=r.left+r.width/2; cy=r.top+r.height/2; }
  const k=Math.max(0.2, Math.min(2.2, v.k*f)), px=cx-r.left, py=cy-r.top;
  v.x = px-(px-v.x)*(k/v.k); v.y = py-(py-v.y)*(k/v.k); v.k=k;
  applyView(); save();
}
function centerOn(w){
  const c=cardEls[w]; if(!c) return;
  const r=stage.getBoundingClientRect(), p=pos(w), v=S.view;
  v.x = r.width/2 - (p.x+CW/2)*v.k; v.y = r.height/3 - (p.y+40)*v.k;
  applyView(); save();
  c.classList.add("flash"); setTimeout(()=>c.classList.remove("flash"),1200);
}
function centerOnAyah(key){
  const p=tpos(key); if(!p) return;
  const r=stage.getBoundingClientRect(), v=S.view;
  v.x = r.width/2 - (p.x+rowW()/2)*v.k; v.y = 56 - p.y*v.k;
  applyView(); save();
}

/* ================= panel ================= */
const closedAyahs=new Set();
function renderChips(){
  $("ayahChips").innerHTML = S.ayahs.map(key=>`<span class="achip"><button data-goto="${key}" title="کینوس پر دکھائیں">${esc(surahName(+key.split(":")[0]))} ${key}</button><button class="x" data-rm="${key}" aria-label="${key} ہٹائیں">×</button></span>`).join("")
    || `<span class="empty">ابھی کوئی آیت نہیں۔ سورہ اور آیت چن کر شامل کریں۔</span>`;
}
function renderTiles(){
  const n=[[S.ayahs.length,"آیات"],[WORDS.length,"الفاظ"],[S.links.filter(linkOK).length,"لنک"],[chains().length,"زنجیریں"]];
  $("tiles").innerHTML = n.map(([v,l])=>`<div class="tile"><b>${v}</b><span>${l}</span></div>`).join("");
}
function renderReading(){
  $("reading").innerHTML = S.ayahs.map(key=>{
    const v=VERSES[key], open=closedAyahs.has(key)?"":" open";
    const head=`<summary><span>${esc(surahName(+key.split(":")[0]))} ${key}</span><a href="https://quran.com/${key}" target="_blank" rel="noopener">quran.com ↗</a></summary>`;
    if(!v?.words) return `<details class="ayah" data-key="${key}"${open}>${head}<div class="meta">${v?.error
      ? `<span class="err">لوڈ نہیں ہو سکا (${esc(v.error)})</span> <button class="btn" data-retry="${key}">دوبارہ</button>`
      : '<span class="spin"></span> لوڈ ہو رہا ہے…'}</div></details>`;
    const reading=WORDS.filter(o=>o.key===key).map(o=>{
      const ms=MEAN[o.w], k=selKey(o.w), m=ms.find(x=>x.k===k)||ms[0];
      return `<span data-w="${o.w}" class="${m.s==="U"?"alt mine":(k!==ms[0].k?"alt":"")}" title="${esc(o.d.ar)}">${esc(m.t)}</span>`;
    }).join(" ");
    const pre = CUR[key]?.presets ? (()=>{ const ok=CUR[key].presets.filter(p=>presetMatches(key,p));
      return `<div class="match">${ok.length ? "یہ انتخاب ملتا ہے: "+ok.map(p=>`<span class="chip" style="color:${p.color}">${esc(p.name)}</span>`).join("") : "یہ انتخاب مفسرین کی دی گئی قراءتوں میں سے کسی سے پورا نہیں ملتا۔"}</div>`; })() : "";
    const trs=S.tr.map(id=>{ const t=TRANS.find(x=>x[0]===id), txt=TRC[id+"|"+key];
      return `<div class="tr"${t?.[1]==="en"?' dir="ltr"':""}><i>${esc(t?.[2]||id)}</i>${txt==null?'<span class="spin"></span>':esc(txt)}</div>`; }).join("");
    return `<details class="ayah" data-key="${key}"${open}>${head}<div class="qtext">${esc(v.text)}</div><div class="reading">${reading}</div>${pre}${trs}</details>`;
  }).join("") || `<span class="empty">آیات شامل کریں تو یہاں ان کا متن، آپ کے چنے معانی سے بنتا مطلب، اور ترجمے نظر آئیں گے۔</span>`;
}
let concMode="root";
function concHTML(o, mw){
  const mode = mw.root ? concMode : "lemma", total = mode==="root" ? mw.rc : mw.lc;
  if(!total) return "";
  const c=CONC[mode+"|"+o.w];
  let h=`<div class="box"><h3>قرآن میں ${mode==="root"?"اسی مادے":"اسی لیما"} کے تمام مقامات</h3>`;
  if(mw.root) h+=`<div class="toggle" style="margin-bottom:6px"><button data-cmode="root" class="${mode==="root"?"on":""}">مادہ · ${mw.rc}</button><button data-cmode="lemma" class="${mode==="lemma"?"on":""}">لیما · ${mw.lc}</button></div>`;
  if(!c || (!c.items.length && !c.loading && !c.err)) return h+`<div><button class="btn primary" data-act="conc">${total} مقامات دکھائیں</button></div></div>`;
  const groups=new Map();
  for(const it of [...c.items].sort(cmpKey)){ const s=+it.k.split(":")[0]; if(!groups.has(s)) groups.set(s,[]); groups.get(s).push(it); }
  h+=`<div class="meta">${c.items.length} / ${c.total??"?"} الفاظ · ${c.verses??"?"} آیات · ${groups.size} سورتیں${c.done?"":" (اب تک)"}</div><div class="conc">`;
  for(const [s,list] of groups){
    h+=`<div class="sg"><b>${s} · ${esc(surahName(s))}</b> · ${list.length} بار</div><div class="occ">`+
      list.map(it=>`<button data-occ="${it.k}" data-p="${it.p}" class="${it.k===o.key&&it.p===o.p?"cur":S.ayahs.includes(it.k)?"here":""}" title="${esc(it.k+" · "+it.v)}">${it.k.split(":")[1]} <i>${esc(it.ar)}</i></button>`).join("")+`</div>`;
  }
  h+=`</div>`;
  if(c.loading) h+=`<div class="meta"><span class="spin"></span> لوڈ ہو رہا ہے…</div>`;
  else if(c.err) h+=`<div class="err">${esc(c.err)}</div><button class="btn" data-act="conc">دوبارہ کوشش</button>`;
  else if(!c.done) h+=`<button class="btn" data-act="conc">اگلے ${Math.min(100,c.total-c.items.length)} لوڈ کریں</button>`;
  return h+`<div class="meta small">کسی مقام پر ٹیپ کریں تو وہ آیت کینوس میں شامل ہو جائے گی۔ سبز: کینوس پر پہلے سے موجود۔</div></div>`;
}
function renderDetail(){
  const d=$("detail");
  if(!focus || !WBY[focus.w]){ d.innerHTML=`<span class="empty">${S.ayahs.length?"لوڈ ہو رہا ہے…":"آیت شامل کریں، پھر کسی لفظ یا پِل پر ٹیپ کریں۔"}</span>`; d.dataset.w=""; return; }
  /* keep what the user is typing / where they scrolled when the panel refreshes */
  const same=d.dataset.w===focus.w, keep={a:$("mineIn")?.value||"", b:$("mineNote")?.value||"", st:d.querySelector(".conc")?.scrollTop||0, act:document.activeElement?.id};
  const o=WBY[focus.w], m=meaning(focus.w,focus.k)||MEAN[focus.w][0], key=o.key, M=MORPH[key], mw=M?.[o.p];
  const conn=S.links.filter(L=>(L.a.w===focus.w&&L.a.k===m.k)||(L.b.w===focus.w&&L.b.k===m.k)).length;
  let h=`<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="ar">${esc(o.d.ar)}</span><span class="meta">${esc(surahName(+key.split(":")[0]))} ${key} · لفظ ${o.p}${o.d.tl?` · <span dir="ltr">${esc(o.d.tl)}</span>`:""}</span></div>`;
  h+=`<div class="t">${esc(m.t)}</div><div class="meta"><span style="color:var(--s-${m.s})">${esc(SRC[m.s])}</span>${m.n?" · قول: "+esc(m.n):""}</div>${m.d?`<div class="small">${esc(m.d)}</div>`:""}`;
  h+=`<div class="meta">${conn?conn+" لنک اس معنی سے جڑے ہیں":"اس معنی سے ابھی کوئی لنک نہیں"}</div>`;
  h+=`<div class="btns"><button class="btn primary" data-act="choose">یہ معنی چنیں</button><button class="btn" data-act="goto">کینوس پر دکھائیں</button><button class="btn${linkFrom?" primary":""}" data-act="link">${linkFrom?"لنک منسوخ کریں":"اس سے لنک بنائیں"}</button></div>`;
  const mine=S.custom[focus.w]||[];
  h+=`<div class="box"><h3>اپنا معنی شامل کریں</h3><div class="mine"><input class="field" id="mineIn" placeholder="اس لفظ کا اپنا معنی" aria-label="اپنا معنی"><input class="field" id="mineNote" placeholder="ماخذ / نوٹ (اختیاری)" aria-label="ماخذ یا نوٹ"><button class="btn" data-act="mine">شامل کریں</button></div>`+
     (mine.length ? `<div class="mylist" style="margin-top:6px">${mine.map(x=>`<div><span>${esc(x.t)}${x.n?` <span class="muted small">(${esc(x.n)})</span>`:""}</span><button class="btn danger" data-delmine="${esc(x.k)}" aria-label="یہ معنی ہٹائیں">×</button></div>`).join("")}</div>` : "")+`</div>`;
  h+=`<div class="box"><h3>صرف اور مادہ <span class="muted small">· quran.ai (Quranic Arabic Corpus)</span></h3>`;
  if(!M) h += MORPH_ERR[key] ? `<span class="err">صرفی ڈیٹا لوڈ نہیں ہو سکا (${esc(MORPH_ERR[key])})</span> <button class="btn" data-act="remorph">دوبارہ</button>` : `<span class="spin"></span> <span class="meta">لوڈ ہو رہا ہے…</span>`;
  else if(!mw) h+=`<span class="meta">اس لفظ کا صرفی ڈیٹا نہیں ملا۔</span>`;
  else {
    h+=`<dl class="kv">`;
    h+= mw.root ? `<dt>مادہ</dt><dd><span class="rootl">${esc(spaced(mw.root))}</span> · قرآن میں <b>${mw.rc}</b> بار، <b>${mw.rv}</b> آیات میں</dd>`
                : `<dt>مادہ</dt><dd class="muted">کوئی مادہ نہیں (حرف یا ضمیر)</dd>`;
    if(mw.lemma) h+=`<dt>لیما</dt><dd><span class="rootl" style="letter-spacing:0">${esc(mw.lemma)}</span> · <b>${mw.lc}</b> بار، <b>${mw.lv}</b> آیات میں</dd>`;
    for(const [f,label] of FEAT) if(mw.f[f]!=null) h+=`<dt>${label}</dt><dd>${esc(f==="verb_form" ? "Form "+(ROMAN[mw.f[f]]||mw.f[f]) : urf(mw.f[f]))}</dd>`;
    h+=`</dl>`;
    if(mw.seg.length>1) h+=`<div class="seg" style="margin-top:4px">${mw.seg.map(([t,g])=>`<span><b>${esc(t)}</b> <span class="en" style="display:inline">${esc(g)}</span></span>`).join("")}</div>`;
    if(mw.desc) h+=`<div class="en" style="margin-top:4px">${esc(mw.desc)}</div>`;
  }
  h+=`</div>`;
  if(mw) h+=concHTML(o, mw);
  d.innerHTML=h; d.dataset.w=focus.w;
  if(same){
    $("mineIn").value=keep.a; $("mineNote").value=keep.b;
    const cc=d.querySelector(".conc"); if(cc) cc.scrollTop=keep.st;
    if(keep.act==="mineIn"||keep.act==="mineNote") $(keep.act).focus();
  }
}
let tafShown=null;
function renderTafsir(){
  const key = focus ? akey(focus.w) : S.ayahs[0], box=$("tafsir"), meta=$("tafsirMeta");
  if(!key){ meta.textContent=""; box.textContent="کوئی آیت نہیں۔"; tafShown=null; return; }
  const def=TAFSIRS.find(t=>t[0]===S.tafsir)||TAFSIRS[0], k=def[0]+"|"+key;
  if(tafShown===k) return;
  box.lang=def[2]; box.dir = def[2]==="en" ? "ltr" : "rtl";
  meta.textContent=`${def[1]} · ${key}`;
  if(!$("tafsirSec").open){ tafShown=null; return; }      /* loaded when the section is opened */
  const t=TAF[k];
  if(!t){
    tafShown=null; box.innerHTML='<span class="spin"></span> لوڈ ہو رہا ہے…';
    loadTafsir(def[0], key).then(renderTafsir, e=>{ if(meta.textContent.endsWith(key)) box.innerHTML=`<span class="err">تفسیر لوڈ نہیں ہو سکی: ${esc(e.message)}</span> <button class="btn" data-act="retaf">دوبارہ</button>`; });
    return;
  }
  tafShown=k;
  box.replaceChildren(...t.paras.map(p=>{
    const e=el(p.h?"h4":"p");
    for(const part of p.t.split(/(﴿[^﴾]*﴾)/)) if(part) e.append(part.startsWith("﴿") ? el("span","q",part) : part);
    return e;
  }));
  if(!t.paras.length) box.textContent="اس آیت پر اس تفسیر میں کوئی متن نہیں ملا۔";
  if(t.range.length>1) meta.textContent += ` · یہ حصہ آیات ${t.range[0]} تا ${t.range[t.range.length-1]} کا ہے`;
  box.scrollTop=0;
}
function renderChains(){
  const ch=chains();
  $("chains").innerHTML = ch.length ? ch.map((c,ci)=>{
    const nodes=c.nodes.map(n=>`<span class="n">${akey(n.w)}:${wpos(n.w)} <i>${esc(WBY[n.w].d.ar)}</i>: ${esc(meaning(n.w,n.k).t)}</span>`).join(" ← ");
    const rows=c.links.map(L=>{ const p=presetOf(L.src);
      return `<div class="linkrow${selLink===L.id?" sel":""}" data-id="${esc(L.id)}"><span style="display:flex;align-items:center;gap:6px"><span class="sw" style="background:${colorOf(L)}"></span>${akey(L.a.w)}:${wpos(L.a.w)} ↔ ${akey(L.b.w)}:${wpos(L.b.w)}${p?" · "+esc(p.name):" · آپ کا"}</span><button class="x" data-del="${esc(L.id)}" aria-label="لنک ہٹائیں">×</button></div>`; }).join("");
    return `<div class="chain"><div class="nodes">${nodes}</div>${rows}<div class="btns"><button class="btn" data-apply="${ci}">یہ زنجیر بطور مطلب چنیں</button></div></div>`;
  }).join("") : `<span class="empty">ابھی کوئی لنک نہیں۔ کینوس پر پِل کو کھینچ کر دوسرے لفظ کے پِل پر چھوڑیں، یا "اس سے لنک بنائیں" استعمال کریں۔ مختلف آیات کے الفاظ بھی جوڑے جا سکتے ہیں۔</span>`;
}
function renderPresets(){
  const keys=S.ayahs.filter(k=>CUR[k]?.presets);
  $("presetSec").hidden=!keys.length;
  $("presets").innerHTML = keys.flatMap(key=>CUR[key].presets.map(p=>{
    const has=S.links.some(L=>L.src===key+"#"+p.id), m=presetMatches(key,p);
    return `<div class="preset" style="--c:${p.color}"><div class="top"><span class="name">${esc(p.name)}</span>${m?`<span class="chip" style="color:${p.color}">انتخاب ملتا ہے</span>`:""}</div><p>${esc(p.note)}</p><div class="btns"><button class="btn" data-preset="${key}#${p.id}">یہ قراءت لگائیں</button>${has?`<button class="btn" data-unpreset="${key}#${p.id}">اس کے لنک ہٹائیں</button>`:""}</div></div>`;
  })).join("");
}
function renderPanel(){ renderChips(); renderTiles(); renderReading(); renderDetail(); renderChains(); renderPresets(); renderTafsir(); }
function renderAll(){ rebuildWords(); syncCanvas(); autoLayout(); updateCards(); drawLinks(); renderPanel(); }

/* ================= actions ================= */
let pendingCenter=null, pendingFocus=null, needFit=false;
function ensureAyah(key){
  loadVerse(key).then(()=>{
    renderAll();
    if(needFit){ needFit=false; requestAnimationFrame(fit); }
    if(pendingFocus && akey(pendingFocus)===key && WBY[pendingFocus]){ const w=pendingFocus; pendingFocus=pendingCenter=null; setFocus(w, selKey(w)); centerOn(w); }
    else if(pendingCenter===key){ pendingCenter=null; centerOnAyah(key); }
    for(const id of S.tr) loadTr(id,key).then(renderReading, ()=>{});
  }, ()=>renderAll());
  loadMorph(key).then(()=>{ updateCards(); if(focus && akey(focus.w)===key) renderDetail(); },
    e=>{ MORPH_ERR[key]=e.message; if(focus && akey(focus.w)===key) renderDetail(); });
}
function addAyahs(keys, opts={}){
  keys=keys.filter(validAyah);
  const fresh=keys.filter(k=>!S.ayahs.includes(k));
  S.ayahs.push(...fresh); save(); renderAll();
  if(opts.focus) pendingFocus=opts.focus;
  if(opts.center) pendingCenter=keys[0];
  keys.forEach(ensureAyah);
  return fresh.length;
}
function removeAyah(key){
  S.ayahs=S.ayahs.filter(k=>k!==key);
  S.links=S.links.filter(L=>akey(L.a.w)!==key && akey(L.b.w)!==key);
  if(selLink && !S.links.some(L=>L.id===selLink)) selLink=null;
  if(linkFrom && akey(linkFrom.w)===key) setLinkFrom(null);
  save(); renderAll();
}
function setFocus(w,k){
  focus={w,k};
  const key=akey(w); if(!MORPH[key]) loadMorph(key,true).then(()=>{ updateCards(); renderDetail(); }, e=>{ MORPH_ERR[key]=e.message; renderDetail(); });
  updateCards(); drawLinks(); renderDetail(); renderTafsir(); renderChains();
}
function scrollToDetail(){ $("detail").closest("section").scrollIntoView({block: isMobile() ? "start" : "nearest", behavior:"smooth"}); }
function choose(w,k){
  S.sel[w]=k; save(); setFocus(w,k); renderReading(); renderTiles(); renderPresets();
  scrollToDetail();   /* keep the chosen meaning visible: desktop scrolls the panel, mobile scrolls it up under the pinned canvas */
}
function setLinkFrom(v){ linkFrom=v; $("linkMode").hidden=!v; renderDetail(); }
function applyPreset(key,id){
  const p=CUR[key].presets.find(x=>x.id===id);
  for(const [ps,k] of Object.entries(p.sel)) S.sel[key+":"+ps]="c:"+(k||"0");
  for(const [aw,ak,bw,bk] of p.links) addLink({w:key+":"+aw,k:"c:"+(ak||"0")},{w:key+":"+bw,k:"c:"+(bk||"0")}, key+"#"+id);
  save(); renderAll();
}
function addMine(w,t,n){
  t=t.trim(); if(!t) return;
  const k="u"+Date.now().toString(36);
  (S.custom[w] ||= []).push({k, t, n:n.trim()}); S.sel[w]=k; focus={w,k};
  save(); renderAll();
}
function delMine(w,k){
  S.custom[w]=(S.custom[w]||[]).filter(x=>x.k!==k); if(!S.custom[w].length) delete S.custom[w];
  S.links=S.links.filter(L=>!((L.a.w===w&&L.a.k===k)||(L.b.w===w&&L.b.k===k)));
  if(S.sel[w]===k) delete S.sel[w];
  save(); renderAll();
}
function flashMsg(t, id="msg"){ const m=$(id); m.textContent=t; clearTimeout(m._t); m._t=setTimeout(()=>m.textContent="",4000); }
function chainsText(){
  return chains().map((c,i)=>(i+1)+". "+c.nodes.map(n=>`${akey(n.w)}:${wpos(n.w)} ${WBY[n.w].d.ar}: ${meaning(n.w,n.k).t}`).join(" ← ")).join("\n");
}

/* ---------- panel events ---------- */
$("panel").addEventListener("click", e=>{
  const t=e.target.closest("[data-goto],[data-rm],[data-retry],[data-w],[data-act],[data-delmine],[data-cmode],[data-occ],[data-del],[data-apply],[data-preset],[data-unpreset],.linkrow");
  if(!t) return;
  const D=t.dataset;
  if(D.goto){ centerOnAyah(D.goto); return; }
  if(D.rm){ removeAyah(D.rm); return; }
  if(D.retry){ delete VERSES[D.retry]; renderAll(); ensureAyah(D.retry); return; }
  if(D.del){ removeLink(D.del); save(); renderAll(); return; }
  if(D.delmine && focus){ delMine(focus.w, D.delmine); return; }
  if(D.cmode){ concMode=D.cmode; renderDetail(); return; }
  if(D.occ){ const w=D.occ+":"+D.p;
    if(S.ayahs.includes(D.occ)){ if(WBY[w]){ setFocus(w, selKey(w)); centerOn(w); } else centerOnAyah(D.occ); }
    else addAyahs([D.occ], {center:true, focus:w});
    return; }
  if(D.apply!=null){
    const c=chains()[+D.apply], seen=new Set(); let clash=false;
    c.nodes.forEach(n=>{ if(seen.has(n.w)) clash=true; else { seen.add(n.w); S.sel[n.w]=n.k; } });
    save(); renderAll(); if(clash) flashMsg("اس زنجیر میں ایک لفظ کے دو معنی ہیں؛ پہلا چنا گیا۔");
    return;
  }
  if(D.preset){ const [k,id]=D.preset.split("#"); applyPreset(k,id); return; }
  if(D.unpreset){ S.links=S.links.filter(L=>L.src!==D.unpreset); selLink=null; save(); renderAll(); return; }
  if(D.act==="choose" && focus){ choose(focus.w,focus.k); return; }
  if(D.act==="goto" && focus){ centerOn(focus.w); return; }
  if(D.act==="link" && focus){ setLinkFrom(linkFrom ? null : {...focus}); return; }
  if(D.act==="mine" && focus){ addMine(focus.w, $("mineIn").value, $("mineNote").value); return; }
  if(D.act==="conc" && focus){ const mw=MORPH[akey(focus.w)]?.[wpos(focus.w)]; loadConc(focus.w, mw?.root ? concMode : "lemma"); return; }
  if(D.act==="remorph" && focus){ const k=akey(focus.w); delete MORPH_ERR[k]; renderDetail(); setFocus(focus.w,focus.k); return; }
  if(D.act==="retaf"){ tafShown=null; renderTafsir(); return; }
  if(t.classList.contains("linkrow")){
    selLink = selLink===D.id ? null : D.id; drawLinks(); renderChains();
    const L=S.links.find(x=>x.id===selLink); if(L) centerOn(L.a.w);   /* show the picked link on the canvas */
    return;
  }
  if(D.w && t.closest("#reading")){ setFocus(D.w, selKey(D.w)); centerOn(D.w); }
});
$("panel").addEventListener("keydown", e=>{
  if((e.target.id==="mineIn"||e.target.id==="mineNote") && e.key==="Enter" && !e.isComposing && focus) addMine(focus.w, $("mineIn").value, $("mineNote").value);
});
$("reading").addEventListener("toggle", e=>{ const k=e.target.dataset?.key; if(k) e.target.open ? closedAyahs.delete(k) : closedAyahs.add(k); }, true);
$("tafsirSec").addEventListener("toggle", ()=>renderTafsir());
$("tafsirSel").addEventListener("change", e=>{ S.tafsir=e.target.value; save(); renderTafsir(); });
$("trChecks").addEventListener("change", e=>{
  const id=+e.target.dataset.tr; if(!id) return;
  const on=new Set(S.tr); e.target.checked ? on.add(id) : on.delete(id);
  S.tr=TRANS.map(x=>x[0]).filter(x=>on.has(x)); save(); renderReading();
  for(const key of S.ayahs) if(VERSES[key]?.words) for(const i of S.tr) loadTr(i,key).then(renderReading, ()=>{});
});
$("showEn").addEventListener("change", e=>{ S.showEn=e.target.checked; save(); renderAll(); });
$("addForm").addEventListener("submit", e=>{
  e.preventDefault();
  let s=+$("surahSel").value, a, b;
  const m=toLatin($("ayahFrom").value).match(/^\s*(\d+)\s*[:.]\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);   /* "2:255" or "2:1-5" typed directly */
  if(m){ s=+m[1]; a=+m[2]; b=+(m[3]||m[2]); if(SURAHS[s-1]) $("surahSel").value=s; }
  else { a=+toLatin($("ayahFrom").value||"1"); b=+toLatin($("ayahTo").value||a); }
  const n=SURAHS[s-1]?.[3];
  if(!n){ flashMsg("سورہ نمبر 1 سے 114 تک ہے۔","addMsg"); return; }
  if(!(a>=1 && a<=n)){ flashMsg(`سورہ ${surahName(s)} میں 1 سے ${n} تک آیات ہیں۔`,"addMsg"); return; }
  const hi=Math.min(Math.max(a,b), n), to=Math.min(hi, a+19), keys=[];
  for(let i=a;i<=to;i++) keys.push(s+":"+i);
  const added=addAyahs(keys,{center:true});
  flashMsg(added ? `${added} آیت شامل ہوئی${hi>to?" (ایک بار میں زیادہ سے زیادہ 20)":""}` : "یہ آیات پہلے سے موجود ہیں۔","addMsg");
  $("ayahFrom").value=""; $("ayahTo").value="";
});
$("copyBtn").addEventListener("click", ()=>{
  const txt=chainsText(); if(!txt){ flashMsg("کاپی کرنے کے لیے ابھی کوئی زنجیر نہیں۔"); return; }
  const fail=()=>flashMsg("کاپی نہیں ہو سکا؛ براؤزر نے اجازت نہیں دی۔");
  try{ navigator.clipboard.writeText("زنجیریں\n"+txt).then(()=>flashMsg("زنجیریں کاپی ہو گئیں۔"), fail); }catch(e){ fail(); }
});
let clearArmed=false;
$("clearBtn").addEventListener("click", e=>{
  const b=e.currentTarget;
  if(!clearArmed){ clearArmed=true; b.textContent="دوبارہ دبائیں تو سب لنک اور انتخاب صاف"; setTimeout(()=>{ clearArmed=false; b.textContent="لنک اور انتخاب صاف کریں"; },3000); return; }
  clearArmed=false; b.textContent="لنک اور انتخاب صاف کریں";
  S.links=[]; S.sel={}; selLink=null; save(); renderAll();
});

/* ---------- toolbar ---------- */
const isDark=()=> root.dataset.theme ? root.dataset.theme==="dark" : matchMedia("(prefers-color-scheme: dark)").matches;
function setTheme(t){
  if(t) root.dataset.theme=t;
  const d=isDark(), b=$("theme");
  b.textContent = d ? "☀\uFE0E" : "☾"; b.title = d ? "لائٹ تھیم" : "ڈارک تھیم"; b.setAttribute("aria-label", b.title);
  $("themeColor").content = d ? "#10141c" : "#eef1f5";   /* phone status bar follows the theme */
}
$("theme").onclick=()=>{ S.theme = isDark() ? "light" : "dark"; setTheme(S.theme); save(); };
$("zin").onclick=()=>zoomAt(1.2);
$("zout").onclick=()=>zoomAt(1/1.2);
$("fit").onclick=fit;
$("relayout").onclick=()=>{ S.pos={}; save(); renderAll(); fit(); };
$("linkMode").onclick=()=>setLinkFrom(null);
$("delLink").onclick=()=>{ if(selLink){ removeLink(selLink); save(); renderAll(); } };
MCP.onQueue = n => { const s=$("status"); s.hidden=!n; s.textContent=`quran.ai سے ڈیٹا آ رہا ہے… (${n})`; };

/* panel/canvas divider: panel sits on the right (rtl), so dragging left widens it */
const app=document.querySelector(".app"), split=$("split");
function setPW(px){ S.pw=Math.round(Math.max(260, Math.min(innerWidth-320, px))); app.style.setProperty("--pw", S.pw+"px"); }
split.addEventListener("pointerdown", e=>{
  e.preventDefault();   /* no text selection in the panel while dragging */
  const w0=$("panel").offsetWidth, x0=e.clientX;
  split.setPointerCapture(e.pointerId); split.classList.add("on");
  split.onpointermove = ev=>setPW(w0 + x0 - ev.clientX);
});
split.addEventListener("lostpointercapture", ()=>{ split.onpointermove=null; split.classList.remove("on"); save(); });
split.addEventListener("keydown", e=>{ const d={ArrowLeft:20, ArrowRight:-20}[e.key]; if(d){ e.preventDefault(); setPW($("panel").offsetWidth+d); save(); } });

/* ================= pointer interactions ================= */
let drag=null, dropEl=null, raf=0, lastEv=null;
const pts=new Map();   /* pointers currently down on the stage; two = pinch */
function pinchState(){ const [a,b]=[...pts.values()]; return {mx:(a.x+b.x)/2, my:(a.y+b.y)/2, dist:Math.hypot(a.x-b.x,a.y-b.y)||1}; }
stage.addEventListener("pointerdown", e=>{
  if(e.target.closest(".toolbar")) return;
  if(e.isPrimary) pts.clear();   /* a new gesture: drop any pointer whose up we missed */
  const pill=e.target.closest(".pill"), head=e.target.closest(".head"), hit=e.target.closest("path.h"), title=e.target.closest(".atitle");
  if(hit && !pts.size) return;
  pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  stage.setPointerCapture(e.pointerId);
  if(pts.size>1){   /* second finger: whatever was going on becomes a pinch-zoom */
    if(pts.size>2) return;
    if(dropEl){ dropEl.classList.remove("drop"); dropEl=null; }
    if(drag?.type==="pill") drawLinks();
    drag={type:"pinch", ...pinchState()}; stage.classList.remove("panning");
    return;
  }
  if(pill) drag={type:"pill", w:pill.dataset.w, k:pill.dataset.k, sx:e.clientX, sy:e.clientY, moved:false};
  else if(head){ const w=head.dataset.w, p=pos(w), wp=toWorld(e.clientX,e.clientY); drag={type:"card", w, ox:wp.x-p.x, oy:wp.y-p.y, sx:e.clientX, sy:e.clientY, moved:false}; }
  else { drag={type:"pan", sx:e.clientX, sy:e.clientY, vx:S.view.x, vy:S.view.y, moved:false, title:title?.dataset.key}; stage.classList.add("panning"); }
});
/* on phones the hint covers cards; it has done its job once the user touches the canvas */
stage.addEventListener("pointerdown", e=>{ if(e.pointerType==="touch") stage.querySelector(".hint").hidden=true; }, {once:true});
/* pointermove fires several times per frame; do the work (SVG rebuild, hit-test) at most once per frame */
stage.addEventListener("pointermove", e=>{
  if(pts.has(e.pointerId)) pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(!drag) return;
  lastEv=e;
  if(!raf) raf=requestAnimationFrame(()=>{ raf=0; move(lastEv); });
});
const far = (e,d) => Math.hypot(e.clientX-d.sx, e.clientY-d.sy) >= (d.type==="pan"?4:7);   /* a tap with finger jitter is still a tap */
function move(e){
  if(!drag) return;
  if(drag.type==="pinch"){
    if(pts.size<2) return;
    const p=pinchState();
    S.view.x+=p.mx-drag.mx; S.view.y+=p.my-drag.my;
    zoomAt(p.dist/drag.dist, p.mx, p.my);
    Object.assign(drag, p);
  } else if(drag.type==="pan"){
    if(!drag.moved && !far(e,drag)) return;
    S.view.x=drag.vx+(e.clientX-drag.sx); S.view.y=drag.vy+(e.clientY-drag.sy); drag.moved=true; applyView();
  } else if(drag.type==="card"){
    if(!drag.moved && !far(e,drag)) return;
    const wp=toWorld(e.clientX,e.clientY);
    S.pos[drag.w]={x:Math.round(wp.x-drag.ox), y:Math.round(wp.y-drag.oy)}; drag.moved=true;
    const c=cardEls[drag.w]; c.style.left=S.pos[drag.w].x+"px"; c.style.top=S.pos[drag.w].y+"px";
    drawLinks();
  } else if(drag.type==="pill"){
    if(!drag.moved && !far(e,drag)) return;
    drag.moved=true;
    /* reads (hit-test, rect) before the SVG write, so the browser doesn't lay out twice */
    const under=document.elementFromPoint(e.clientX,e.clientY)?.closest(".pill"), wp=toWorld(e.clientX,e.clientY);
    if(dropEl&&dropEl!==under) dropEl.classList.remove("drop");
    dropEl = (under && under.dataset.w!==drag.w) ? under : null;
    if(dropEl) dropEl.classList.add("drop");
    const A=anchor(drag.w,drag.k, wp.x<pos(drag.w).x+CW/2 ? "L":"R"), mx=(A.x+wp.x)/2;
    drawLinks(`M${A.x},${A.y} C${mx},${A.y} ${mx},${wp.y} ${wp.x},${wp.y}`);
  }
}
function endDrag(e){
  if(drag && raf){ cancelAnimationFrame(raf); raf=0; move(lastEv); }   /* apply the last pending move so the drop lands where the pointer was released */
  pts.delete(e.pointerId);
  if(!drag) return;
  if(drag.type==="pinch"){ if(pts.size<2){ drag=null; save(); } return; }
  const d=drag; drag=null; stage.classList.remove("panning");
  if(dropEl) dropEl.classList.remove("drop");
  if(d.type==="pill"){
    if(!d.moved){
      if(linkFrom && linkFrom.w!==d.w){
        const ok=addLink(linkFrom, {w:d.w,k:d.k}, "user");
        focus={...linkFrom}; linkFrom=null; $("linkMode").hidden=true;
        save(); renderAll();
        if(!ok) flashMsg("یہ لنک پہلے سے موجود ہے۔");
      } else {
        if(linkFrom) linkFrom={w:d.w,k:d.k};   /* same word: just switch the source meaning */
        choose(d.w,d.k);
      }
    } else if(dropEl){
      const ok=addLink({w:d.w,k:d.k}, {w:dropEl.dataset.w, k:dropEl.dataset.k}, "user");
      focus={w:d.w,k:d.k}; save(); renderAll();
      if(!ok) flashMsg("یہ لنک پہلے سے موجود ہے۔");
    } else drawLinks();
  } else if(d.type==="card"){
    if(d.moved) save(); else { setFocus(d.w, selKey(d.w)); scrollToDetail(); }
  } else if(d.type==="pan"){
    if(d.moved) save();
    else if(d.title){ if(VERSES[d.title]?.error){ delete VERSES[d.title]; renderAll(); ensureAyah(d.title); } else { const o=WORDS.find(x=>x.key===d.title); if(o){ setFocus(o.w, selKey(o.w)); scrollToDetail(); } } }
    else if(selLink){ selLink=null; drawLinks(); renderChains(); }
  }
  dropEl=null;
}
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
svg.addEventListener("click", e=>{
  const h=e.target.closest("path.h"); if(!h) return;
  selLink = selLink===h.dataset.id ? null : h.dataset.id; drawLinks(); renderChains();
});
/* trackpad: two-finger scroll pans, pinch (sent as ctrl+wheel) zooms; mouse: wheel pans, ctrl+wheel zooms */
stage.addEventListener("wheel", e=>{
  e.preventDefault();
  if(e.ctrlKey){ const d=Math.max(-25, Math.min(25, e.deltaY)); zoomAt(Math.exp(-d*0.01), e.clientX, e.clientY); return; }
  const m = e.deltaMode===1 ? 16 : 1;   /* Firefox reports lines */
  S.view.x-=e.deltaX*m; S.view.y-=e.deltaY*m; applyView(); save();
}, {passive:false});
stage.addEventListener("keydown", e=>{
  if(e.key!=="Enter" && e.key!==" ") return;
  const pill=e.target.closest?.(".pill"), head=e.target.closest?.(".head");
  if(pill){ e.preventDefault(); choose(pill.dataset.w, pill.dataset.k); }
  else if(head){ e.preventDefault(); setFocus(head.dataset.w, selKey(head.dataset.w)); scrollToDetail(); }
});

/* ================= init ================= */
$("surahSel").innerHTML = SURAHS.map((s,i)=>`<option value="${i+1}">${i+1}. ${esc(s[0])} · ${esc(s[1])} (${s[3]})</option>`).join("");
$("surahSel").value="2";
$("trChecks").innerHTML = TRANS.map(([id,lang,name])=>`<label><input type="checkbox" data-tr="${id}"> ${esc(name)}<span class="muted">${lang==="ur"?"":" · EN"}</span></label>`).join("");
$("tafsirSel").innerHTML = [["ar","عربی تفاسیر (quran.ai)"],["ur","اردو تفاسیر (Quran.com)"],["en","English (quran.ai)"]].map(([lang,label])=>
  `<optgroup label="${label}">${TAFSIRS.filter(t=>t[2]===lang).map(t=>`<option value="${t[0]}">${esc(t[1])}</option>`).join("")}</optgroup>`).join("");
$("legend").innerHTML = Object.entries(SRC).map(([k,v])=>`<span><i style="background:var(--s-${k})"></i>${esc(v)}</span>`).join("")+`<span><i style="background:var(--gold)"></i>آپ کے لنک</span><span><i style="background:var(--same)"></i>ایک ہی مادہ</span>`;
$("curSources").innerHTML = Object.entries(CUR).map(([key,c])=>`<p style="margin:8px 0 0">${key} کے ہاتھ سے چنے گئے معانی صرف ان تفاسیر سے لیے گئے ہیں:</p><ul>${c.sources.map(([n,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join("")}</ul>`).join("");

const saved=store.get(), fresh=!(saved && Array.isArray(saved.ayahs));
/* saved state may come from an older version or be hand-edited: keep only well-formed parts */
function sanitize(x){
  const node=n=>n && validWord(n.w) && typeof n.k==="string", obj=v=>v && typeof v==="object" && !Array.isArray(v);
  const o={ayahs:[...new Set((Array.isArray(x.ayahs)?x.ayahs:[]).filter(validAyah))],
    links:(Array.isArray(x.links)?x.links:[]).filter(L=>L && node(L.a) && node(L.b) && typeof L.id==="string" && typeof L.src==="string")};
  for(const f of ["sel","custom","pos"]) if(obj(x[f])) o[f]=x[f];
  if(obj(x.view) && [x.view.x,x.view.y,x.view.k].every(Number.isFinite) && x.view.k>0) o.view=x.view;
  if(x.theme==="light" || x.theme==="dark") o.theme=x.theme;
  if(Number.isFinite(x.pw)) o.pw=x.pw;
  if(Array.isArray(x.tr)) o.tr=x.tr.filter(id=>TRANS.some(t=>t[0]===id));
  if(TAFSIRS.some(t=>t[0]===x.tafsir)) o.tafsir=x.tafsir;
  if(typeof x.showEn==="boolean") o.showEn=x.showEn;
  return o;
}
if(!fresh) S=Object.assign(S, sanitize(saved));
setTheme(S.theme);
if(S.pw) setPW(S.pw);
$("showEn").checked=!!S.showEn;
$("tafsirSel").value=S.tafsir;
for(const i of $("trChecks").querySelectorAll("input")) i.checked=S.tr.includes(+i.dataset.tr);
if(fresh){
  /* first visit: 2:102 with Jalalayn's reading selected and Qurtubi's chain beside it */
  S.ayahs=["2:102"];
  applyPreset("2:102","jal");
  for(const [aw,ak,bw,bk] of CUR["2:102"].presets.find(p=>p.id==="qur").links) addLink({w:"2:102:"+aw,k:"c:"+(ak||"0")},{w:"2:102:"+bw,k:"c:"+(bk||"0")},"2:102#qur");
}
if(!S.view){ S.view={k:1,x:0,y:0}; needFit=true; }
applyView(); renderAll();
S.ayahs.forEach(ensureAyah);
})();
