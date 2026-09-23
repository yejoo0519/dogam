
if (!globalThis.DV1_DRAGON_VIEWS) throw new Error("드래곤 데이터 로드 실패: 초기화 중단");

// ================================================================
// 게임 데이터
// ================================================================


const TEM_BASE='https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/tem';
const ACC_IMG_MAP={
  '20':{'빛뿔':12,'바뿔':13,'악보':20,'황보':21,'여보':22,'대뿔':1433,'물뿔':1435,'불뿔':1437},
  '19':{'악보':1273,'황보':1274,'여보':1275,'바뿔':1276,'대뿔':1306,'물뿔':1308,'불뿔':1310},
  '18':{'빛뿔':1209,'악보':1205,'황보':1206,'여보':1207,'바뿔':1202,'대뿔':1247,'물뿔':1249,'불뿔':1251},
  '17':{'악보':1102,'황보':1103,'여보':1104,'바뿔':1105,'대뿔':1130,'물뿔':1132,'불뿔':1134},
  '16':{'악보':1046,'황보':1047,'여보':1048,'바뿔':1049,'대뿔':1130,'물뿔':1132,'불뿔':1134},
};
const accImg=(lv,name)=>{const n=ACC_IMG_MAP[String(lv)]?.[name];return n?`${TEM_BASE}/${n}.png`:'';};
const DRAGON_IMG_NUM=DV1_DRAGON_VIEWS.imageNumbers();const DRAGON_IMG_BASE="https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main";
function getDragonImgUrl(name){
  let n=DRAGON_IMG_NUM[name];
  if(!n){const s=name.replace(/ 드래곤$/,'').replace(/드래곤$/,'').trim();n=DRAGON_IMG_NUM[s];}
  if(!n)return null;
  return DRAGON_IMG_BASE+"/dragon/"+n+"/profile/8.png";
}
const GUILD_MODE=location.pathname.endsWith('/noob.html')?'noob':'pvp';
const DRAGON_ALLOWED=DV1_DRAGON_VIEWS.allowed(GUILD_MODE);
function isAllowedDragon(cat,name){
  const strip=n=>String(n||'').replace(/\s*드래곤$/,'').trim();
  const nameS=strip(name);
  return (DRAGON_ALLOWED[cat]||[]).some(function(n){return n===name||strip(n)===nameS;});
}
function filterDragonDrop(cat,ci,q){
  const drop=document.getElementById("dragon-drop-"+cat+"-"+ci);
  if(!drop)return;
  const input=drop.previousElementSibling;
  if(input){
    const r=input.getBoundingClientRect();
    drop.style.top=(r.bottom+2)+"px";
    drop.style.left=r.left+"px";
    drop.style.width=r.width+"px";
  }
  const kw=(q||"").trim();
  const attrList=DRAGON_ALLOWED[cat]||[];
  const kwMatch=kw?findDragonMatch(kw):null;
  const filtered=kw?attrList.filter(function(n){
    if(n.includes(kw)||englishDragonName(n).toLowerCase().includes(kw.toLowerCase()))return true;
    if(kwMatch){
      const stripped=n.replace(/\s*드래곤$/,'').trim();
      if(normDragonName(stripped)===normDragonName(kwMatch.name))return true;
    }
    return false;
  }):attrList;
  if(!filtered.length){drop.innerHTML="";drop.classList.remove("open");return;}
  drop.innerHTML=filtered.slice(0,30).map(function(n){
    return "<div class=\"acc-drop-item\" onmousedown=\"selectDragonName('"+cat+"',"+ci+",'"+n.replace(/'/g,"\\'")+"\')\">"
      +"<span>"+n+"</span></div>";
  }).join("");
  drop.classList.add("open");
}
function selectDragonName(cat,ci,name){
  normalizeDragonCards();
  const card=S.dragonCards[cat][ci];
  card.name=name;
  const match=findDragonMatch(name);
  if(match){card.dtype=match.type;}
  syncDragonDupeGroupByName(card.name);
  warnUncheckedDragonDuplicate();
  renderDragonInfo();
  qSave();
}
let _gpCat=null,_gpCi=null;

function switchDragonView(mode){
  const formEl=document.getElementById('dragon-form-view');
  const galleryEl=document.getElementById('dragon-gallery');
  const btnForm=document.getElementById('btn-dragon-form');
  const btnGallery=document.getElementById('btn-dragon-gallery');
  if(mode==='gallery'){
    formEl.classList.add('hidden');
    galleryEl.classList.add('active');
    btnForm.classList.remove('active');
    btnGallery.classList.add('active');
    renderDragonGallery();
  } else {
    formEl.classList.remove('hidden');
    galleryEl.classList.remove('active');
    btnForm.classList.add('active');
    btnGallery.classList.remove('active');
  }
}

function renderDragonGallery(){
  normalizeDragonCards();
  const el=document.getElementById('dragon-gallery');
  if(!el)return;
  const attrIcon={'땅':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/11.png','물':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/12.png','불':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/13.png','바람':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/14.png','빛':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/84.png','어둠':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/87.png','여명':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/486.png','황혼':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/487.png','악몽':'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/488.png'};
  let html2='';
  DRAGON_CATS.forEach(function(cat){
    const cards=S.dragonCards[cat]||[];
    const named=cards.filter(function(c){return c.name;});
    if(!named.length)return;
    const iconHtml=named.map(function(c,i){
      const ci=cards.indexOf(c);
      const url=getDragonImgUrl(c.name);
      const imgTag=url?('<img src="'+url+'" onerror="this.style.visibility=\'hidden\'" style="width:44px;height:44px;object-fit:contain;border-radius:6px;">'):('<div style="width:44px;height:44px;background:var(--sf);border-radius:6px;"></div>');
      const safecat=cat.replace(/'/g,"\\'");
      return '<div class="gallery-card" onclick="openGalleryPanel(\''+safecat+'\','+ci+')" title="'+c.name+'">'
        +imgTag
        +'<span class="gc-name">'+c.name+'</span>'
        +'</div>';
    }).join('');
    html2+='<div class="gallery-section">'
      +'<div class="gallery-section-title"><img src="'+attrIcon[cat]+'" style="width:18px;height:18px;object-fit:contain;">'+cat+' ('+named.length+'마리)</div>'
      +'<div class="gallery-grid">'+iconHtml+'</div>'
      +'</div>';
  });
  el.innerHTML=html2||'<div style="color:var(--dim);text-align:center;padding:40px;font-size:13px;">입력된 용이 없습니다</div>';
}

function openGalleryPanel(cat,ci){
  normalizeDragonCards();
  const card=S.dragonCards[cat][ci];
  if(!card)return;
  _gpCat=cat;_gpCi=ci;
  const url=getDragonImgUrl(card.name);
  const imgEl=document.getElementById('gp-img');
  if(url){imgEl.src=url;imgEl.style.display='';}
  else imgEl.style.display='none';
  document.getElementById('gp-name').textContent=card.name||'(이름 없음)';
  document.getElementById('gp-type').textContent=(card.dtype||'')+(card.dtype&&card.growth?' · ':'')+((card.growth||''));
  const gradeLabel=card.growth==='진각'?'진각':card.grade||'-';
  document.getElementById('gp-rows').innerHTML=
    '<div class="gp-row"><div class="gp-label">속성</div><div class="gp-val">'+cat+'</div></div>'
    +'<div class="gp-row"><div class="gp-label">타입</div><div class="gp-val">'+(card.dtype||'-')+'</div></div>'
    +'<div class="gp-row"><div class="gp-label">강림 단계</div><div class="gp-val">'+(card.growth||'-')+'</div></div>'
    +'<div class="gp-row"><div class="gp-label">등급</div><div class="gp-val">'+gradeLabel+'</div></div>';
  const opts=card.opts||[];
  const bonusLabel={'hp':'체력 (+40)','atk':'공격 (+10)','def':'방어 (+10)'};
  const bonusRow=card.bonus?'<div class="gp-opt-row"><span class="gp-opt-label">부가옵</span><span class="gp-opt-val">'+bonusLabel[card.bonus]+'</span></div>':'';
  document.getElementById('gp-opts').innerHTML=opts.map(function(o,i){
    if(!o.stat||o.stat==='없음')return '';
    const v=fmtDragonSpVal(i+1,o.stat,o.type);
    return '<div class="gp-opt-row"><span class="gp-opt-label">'+(i+1)+'옵 '+o.stat+'</span><span class="gp-opt-val">'+v+'</span></div>';
  }).join('')+bonusRow;
  document.getElementById('gp-overlay').classList.add('open');
  document.getElementById('gallery-panel').classList.add('open');
}

function closeGalleryPanel(){
  document.getElementById('gp-overlay').classList.remove('open');
  document.getElementById('gallery-panel').classList.remove('open');
  _gpCat=null;_gpCi=null;
}

function goEditDragon(){
  if(!_gpCat||_gpCi===null)return;
  closeGalleryPanel();
  switchDragonView('form');
  // 해당 속성 details 열기
  const details=document.querySelector('[data-dragon-list="'+_gpCat+'"]');
  if(details){
    const det=details.closest('details');
    if(det)det.open=true;
  }
  // 해당 카드로 스크롤
  setTimeout(function(){
    const cards=document.querySelectorAll('[data-dragon-list="'+_gpCat+'"] .dragon-card');
    if(cards[_gpCi]){
      cards[_gpCi].scrollIntoView({behavior:'smooth',block:'center'});
      cards[_gpCi].style.outline='2px solid var(--gold)';
      setTimeout(function(){cards[_gpCi].style.outline='';},1500);
    }
  },100);
}



const IMG_빛뿔18=accImg(18,'빛뿔');
const IMG_빛뿔20=accImg(20,'빛뿔');
const IMG_악보16=accImg(16,'악보');
const IMG_황보16=accImg(16,'황보');
const IMG_여보16=accImg(16,'여보');
const IMG_물16=accImg(16,'물뿔');
const IMG_불16=accImg(16,'불뿔');
const IMG_땅16=accImg(16,'대뿔');
const IMG_바람16=accImg(16,'바뿔');
const IMG_악보17=accImg(17,'악보');
const IMG_황보17=accImg(17,'황보');
const IMG_여보17=accImg(17,'여보');
const IMG_물17=accImg(17,'물뿔');
const IMG_불17=accImg(17,'불뿔');
const IMG_땅17=accImg(17,'대뿔');
const IMG_바람17=accImg(17,'바뿔');
const IMG_악보18=accImg(18,'악보');
const IMG_황보18=accImg(18,'황보');
const IMG_여보18=accImg(18,'여보');
const IMG_물18=accImg(18,'물뿔');
const IMG_불18=accImg(18,'불뿔');
const IMG_땅18=accImg(18,'대뿔');
const IMG_바람18=accImg(18,'바뿔');
const IMG_악보19=accImg(19,'악보');
const IMG_황보19=accImg(19,'황보');
const IMG_여보19=accImg(19,'여보');
const IMG_물19=accImg(19,'물뿔');
const IMG_불19=accImg(19,'불뿔');
const IMG_땅19=accImg(19,'대뿔');
const IMG_바람19=accImg(19,'바뿔');
const IMG_악보20=accImg(20,'악보');
const IMG_황보20=accImg(20,'황보');
const IMG_여보20=accImg(20,'여보');
const IMG_물20=accImg(20,'물뿔');
const IMG_불20=accImg(20,'불뿔');
const IMG_땅20=accImg(20,'대뿔');
const IMG_바뿔20=accImg(20,'바뿔');
const IMG_PEND={
  태양:`${TEM_BASE}/1337.png`,
  달:`${TEM_BASE}/1336.png`,
  별:`${TEM_BASE}/1335.png`
};

const ACC_DB=[

  {n:'빛뿔 (크/체) 18',hp:0.08, atk:0,    def:0   , img:IMG_빛뿔18},
  {n:'빛뿔 (크/공) 18',hp:0,    atk:0.08, def:0   , img:IMG_빛뿔18},
  {n:'빛뿔 (크/방) 18',hp:0,    atk:0,    def:0.08, img:IMG_빛뿔18},

  {n:'빛뿔 (크/체) 20',hp:0.1, atk:0,    def:0   , img:IMG_빛뿔20},
  {n:'빛뿔 (크/공) 20',hp:0,    atk:0.1, def:0   , img:IMG_빛뿔20},
  {n:'빛뿔 (크/방) 20',hp:0,    atk:0,    def:0.1, img:IMG_빛뿔20},

  {n:'악몽 수호자의 보주 (악보) 16',hp:0.16, atk:0,    def:0   , img:IMG_악보16},
  {n:'황혼 수호자의 보주 (황보) 16',hp:0,    atk:0.16, def:0   , img:IMG_황보16},
  {n:'여명 수호자의 보주 (여보) 16',hp:0,    atk:0,    def:0.16, img:IMG_여보16},
  {n:'물뿔 (체/공) 16',hp:0.1,  atk:0.06, def:0   , img:IMG_물16},
  {n:'물뿔 (체/방) 16',hp:0.1,  atk:0,    def:0.06, img:IMG_물16},
  {n:'불뿔 (공/체) 16',hp:0.06, atk:0.1,  def:0   , img:IMG_불16},
  {n:'불뿔 (공/방) 16',hp:0,    atk:0.1,  def:0.06, img:IMG_불16},
  {n:'대뿔 (방/체) 16',hp:0.06, atk:0,    def:0.1 , img:IMG_땅16},
  {n:'대뿔 (방/공) 16',hp:0,    atk:0.06, def:0.1 , img:IMG_땅16},
  {n:'바뿔 (체/방) 16',hp:0.08, atk:0,    def:0.08, img:IMG_바람16},
  {n:'바뿔 (공/체) 16',hp:0.08, atk:0.08, def:0   , img:IMG_바람16},
  {n:'바뿔 (공/방) 16',hp:0,    atk:0.08, def:0.08, img:IMG_바람16},

  {n:'악몽 수호자의 보주 (악보) 17',hp:0.17, atk:0,    def:0   , img:IMG_악보17},
  {n:'황혼 수호자의 보주 (황보) 17',hp:0,    atk:0.17, def:0   , img:IMG_황보17},
  {n:'여명 수호자의 보주 (여보) 17',hp:0,    atk:0,    def:0.17, img:IMG_여보17},
  {n:'물뿔 (체/공) 17',hp:0.11, atk:0.06, def:0   , img:IMG_물17},
  {n:'물뿔 (체/방) 17',hp:0.11, atk:0,    def:0.06, img:IMG_물17},
  {n:'불뿔 (공/체) 17',hp:0.06, atk:0.11, def:0   , img:IMG_불17},
  {n:'불뿔 (공/방) 17',hp:0,    atk:0.11, def:0.06, img:IMG_불17},
  {n:'대뿔 (방/체) 17',hp:0.06, atk:0,    def:0.11, img:IMG_땅17},
  {n:'대뿔 (방/공) 17',hp:0,    atk:0.06, def:0.11, img:IMG_땅17},
  {n:'바뿔 (체/방) 17',hp:0.09, atk:0,    def:0.08, img:IMG_바람17},
  {n:'바뿔 (공/체) 17',hp:0.08, atk:0.09, def:0   , img:IMG_바람17},
  {n:'바뿔 (공/방) 17',hp:0,    atk:0.09, def:0.08, img:IMG_바람17},

  {n:'악몽 수호자의 보주 (악보) 18',hp:0.18, atk:0,    def:0   , img:IMG_악보18},
  {n:'황혼 수호자의 보주 (황보) 18',hp:0,    atk:0.18, def:0   , img:IMG_황보18},
  {n:'여명 수호자의 보주 (여보) 18',hp:0,    atk:0,    def:0.18, img:IMG_여보18},
  {n:'물뿔 (체/공) 18',hp:0.12, atk:0.06, def:0   , img:IMG_물18},
  {n:'물뿔 (체/방) 18',hp:0.12, atk:0,    def:0.06, img:IMG_물18},
  {n:'불뿔 (공/체) 18',hp:0.06, atk:0.12, def:0   , img:IMG_불18},
  {n:'불뿔 (공/방) 18',hp:0,    atk:0.12, def:0.06, img:IMG_불18},
  {n:'대뿔 (방/체) 18',hp:0.06, atk:0,    def:0.12, img:IMG_땅18},
  {n:'대뿔 (방/공) 18',hp:0,    atk:0.06, def:0.12, img:IMG_땅18},
  {n:'바뿔 (체/방) 18',hp:0.09, atk:0,    def:0.09, img:IMG_바람18},
  {n:'바뿔 (공/체) 18',hp:0.09, atk:0.09, def:0   , img:IMG_바람18},
  {n:'바뿔 (공/방) 18',hp:0,    atk:0.09, def:0.09, img:IMG_바람18},

  {n:'악몽 수호자의 보주 (악보) 19',hp:0.19, atk:0,    def:0   , img:IMG_악보19},
  {n:'황혼 수호자의 보주 (황보) 19',hp:0,    atk:0.19, def:0   , img:IMG_황보19},
  {n:'여명 수호자의 보주 (여보) 19',hp:0,    atk:0,    def:0.19, img:IMG_여보19},
  {n:'물뿔 (체/공) 19',hp:0.13, atk:0.06, def:0   , img:IMG_물19},
  {n:'물뿔 (체/방) 19',hp:0.13, atk:0,    def:0.06, img:IMG_물19},
  {n:'불뿔 (공/체) 19',hp:0.06, atk:0.13, def:0   , img:IMG_불19},
  {n:'불뿔 (공/방) 19',hp:0,    atk:0.13, def:0.06, img:IMG_불19},
  {n:'대뿔 (방/체) 19',hp:0.06, atk:0,    def:0.13, img:IMG_땅19},
  {n:'대뿔 (방/공) 19',hp:0,    atk:0.06, def:0.13, img:IMG_땅19},
  {n:'바뿔 (체/방) 19',hp:0.1,  atk:0,    def:0.09, img:IMG_바람19},
  {n:'바뿔 (공/체) 19',hp:0.09, atk:0.1,  def:0   , img:IMG_바람19},
  {n:'바뿔 (공/방) 19',hp:0,    atk:0.1,  def:0.09, img:IMG_바람19},

  {n:'악몽 수호자의 보주 (악보) 20',hp:0.2,  atk:0,    def:0   , img:IMG_악보20},
  {n:'황혼 수호자의 보주 (황보) 20',hp:0,    atk:0.2,  def:0   , img:IMG_황보20},
  {n:'여명 수호자의 보주 (여보) 20',hp:0,    atk:0,    def:0.2 , img:IMG_여보20},
  {n:'물뿔 (체/공) 20',hp:0.14, atk:0.06, def:0   , img:IMG_물20},
  {n:'물뿔 (체/방) 20',hp:0.14, atk:0,    def:0.06, img:IMG_물20},
  {n:'불뿔 (공/체) 20',hp:0.06, atk:0.14, def:0   , img:IMG_불20},
  {n:'불뿔 (공/방) 20',hp:0,    atk:0.14, def:0.06, img:IMG_불20},
  {n:'대뿔 (방/체) 20',hp:0.06, atk:0,    def:0.14, img:IMG_땅20},
  {n:'대뿔 (방/공) 20',hp:0,    atk:0.06, def:0.14, img:IMG_땅20},
  {n:'바뿔 (체/방) 20',hp:0.1, atk:0,    def:0.1, img:IMG_바뿔20},
  {n:'바뿔 (공/체) 20',hp:0.1, atk:0.1, def:0   , img:IMG_바뿔20},
  {n:'바뿔 (공/방) 20',hp:0,    atk:0.1, def:0.1, img:IMG_바뿔20},
];

// 신규 장신구 입력 시 정렬 판단 기준
const ACC_TYPE_ORDER=['악보','황보','여보','물뿔','불뿔','대뿔','바뿔','빛뿔'];
const ENC_ORDER={hp:0,atk:1,def:2,none:3}

// 기본스탯 DB (등급별 × 타입별)
const BASE={
  '진각':{체력형:{hp:1257,atk:168,def:168},공격형:{hp:865,atk:273,def:161},방어형:{hp:781,atk:180,def:275},공방형:{hp:713,atk:240,def:232},체공형:{hp:1073,atk:253,def:129},체방형:{hp:1073,atk:123,def:259}},
  '7.0':{체력형:{hp:1252,atk:176,def:176},공격형:{hp:876,atk:285,def:161},방어형:{hp:788,atk:185,def:283},공방형:{hp:720,atk:242,def:243},체공형:{hp:1080,atk:262,def:133},체방형:{hp:1080,atk:133,def:262}},
  '8.0':{체력형:{hp:1332,atk:176,def:176},공격형:{hp:876,atk:305,def:161},방어형:{hp:788,atk:185,def:303},공방형:{hp:720,atk:252,def:253},체공형:{hp:1120,atk:272,def:133},체방형:{hp:1120,atk:133,def:272}},
  '9.0':{체력형:{hp:1412,atk:176,def:176},공격형:{hp:876,atk:325,def:161},방어형:{hp:788,atk:185,def:323},공방형:{hp:720,atk:262,def:263},체공형:{hp:1160,atk:282,def:133},체방형:{hp:1160,atk:133,def:282}},
};

// 젬 DB (단계별 체/공/방 수치)
const GEM={36:{hp:144,atk:36,def:36},37:{hp:152,atk:38,def:38},38:{hp:160,atk:40,def:40},39:{hp:168,atk:42,def:42},40:{hp:176,atk:44,def:44}};
const GEM_NAME={36:36,37:38,38:40,39:42,40:44}; // 저장키(구 단계) → 표시명(신 단계)
const FALLBACK_GEM_LV=36;
const FALLBACK_GEM_COUNT=999;

// 정령 DB: +옵 수치 (스탯×옵번호), %옵 수치 (옵번호), 부가옵 수치
const SP_PLUS={hp:{1:216,2:240,3:264,4:480},atk:{1:54,2:60,3:66,4:120},def:{1:54,2:60,3:66,4:120}};
const SP_PCT={1:0.24,2:0.28,3:0.32,4:0.40};
const SP_BONUS={hp:40,atk:10,def:10};
const SP_PRESETS=[
  {id:'custom',name:'직접입력',types:['','','','']},
  {id:'last_plus',name:'막플',types:['%','%','%','+']},
  {id:'all_pct',name:'올퍼',types:['%','%','%','%']},
  {id:'one_four_plus',name:'14플',types:['+','%','%','+']},
  {id:'first_plus',name:'24플',types:['%','+','%','+']}
];

const DTYPES=['체력형','공격형','방어형','체공형','체방형','공방형'];
const DCOLORS={체력형:'#fbbf24',공격형:'#f87171',방어형:'#60a5fa',체공형:'#f59e4a',체방형:'#90d97f',공방형:'#c084fc'};
const SK={hp:'체',atk:'공',def:'방'};
const SKEYS=['hp','atk','def'];
const DRAGON_CATS=['땅','물','불','바람','빛','어둠','여명','황혼','악몽'];
const DRAGON_TYPE_DB=window.DRAGON_TYPE_DB||{};
const DRAGON_ATTR_DB=window.DRAGON_ATTR_DB||{};
const newDragonUid=()=>`dragon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const mkDragonCard=()=>({uid:newDragonUid(),name:'',dtype:'',dupe:false,grade:'9.0',growth:'강림(축복)',opts:[{stat:'',type:''},{stat:'',type:''},{stat:'',type:''},{stat:'',type:''}],bonus:''});
const mkDragonCards=()=>Object.fromEntries(DRAGON_CATS.map(c=>[c,[]]));
const mkSettingBuffs=()=>({
  buff:{attr:'어둠',type:'체공형',stat1:'hp',stat2:'hp'},
  debuff:{attr:'바람',type:'방어형',stat1:'atk',stat2:'hp'}
});

// ================================================================
// 상태 관리 (LocalStorage)
// ================================================================
const mkState=()=>({
  accCards:[],
  gems:{hp:{37:0,38:0,39:0,40:0},atk:{37:0,38:0,39:0,40:0},def:{37:0,38:0,39:0,40:0}},
  pendants:[],
  spirit:{level:1,maxLvl:false,opts:[{stat:'',type:''},{stat:'',type:''},{stat:'',type:''},{stat:'',type:''}],bonus:''},
  coll:{hp:0,atk:0,def:0},
  dragonCards:mkDragonCards(),
  settingBuffs:mkSettingBuffs()
});

let S=mkState();
let simGrade='9.0', simBuf=2;

const SAVE_KEY='dv1simEN_'+location.pathname.split('/').pop().replace(/\.[^.]+$/,'');

function readEnglishState(raw){
 const value=JSON.parse(raw),acc={'Horn of light +18 (Crit/HP)':'빛뿔 (크/체) 18','Horn of light +18 (Crit/ATK)':'빛뿔 (크/공) 18','Horn of light +18 (Crit/DEF)':'빛뿔 (크/방) 18','Horn of light +20 (Crit/HP)':'빛뿔 (크/체) 20','Horn of light +20 (Crit/ATK)':'빛뿔 (크/공) 20','Horn of light +20 (Crit/DEF)':'빛뿔 (크/방) 20','Nightmare Orb +16 (HP)':'악몽 수호자의 보주 (악보) 16','Dusk Orb +16 (ATK)':'황혼 수호자의 보주 (황보) 16','Dawn Orb +16 (DEF)':'여명 수호자의 보주 (여보) 16','Horn of water +16 (HP/ATK)':'물뿔 (체/공) 16','Horn of water +16 (HP/DEF)':'물뿔 (체/방) 16','Horn of fire +16 (ATK/HP)':'불뿔 (공/체) 16','Horn of fire +16 (ATK/DEF)':'불뿔 (공/방) 16','Horn of earth +16 (DEF/HP)':'대뿔 (방/체) 16','Horn of earth +16 (DEF/ATK)':'대뿔 (방/공) 16','Horn of wind +16 (HP/DEF)':'바뿔 (체/방) 16','Horn of wind +16 (ATK/HP)':'바뿔 (공/체) 16','Horn of wind +16 (ATK/DEF)':'바뿔 (공/방) 16','Nightmare Orb +17 (HP)':'악몽 수호자의 보주 (악보) 17','Dusk Orb +17 (ATK)':'황혼 수호자의 보주 (황보) 17','Dawn Orb +17 (DEF)':'여명 수호자의 보주 (여보) 17','Horn of water +17 (HP/ATK)':'물뿔 (체/공) 17','Horn of water +17 (HP/DEF)':'물뿔 (체/방) 17','Horn of fire +17 (ATK/HP)':'불뿔 (공/체) 17','Horn of fire +17 (ATK/DEF)':'불뿔 (공/방) 17','Horn of earth +17 (DEF/HP)':'대뿔 (방/체) 17','Horn of earth +17 (DEF/ATK)':'대뿔 (방/공) 17','Horn of wind +17 (HP/DEF)':'바뿔 (체/방) 17','Horn of wind +17 (ATK/HP)':'바뿔 (공/체) 17','Horn of wind +17 (ATK/DEF)':'바뿔 (공/방) 17','Nightmare Orb +18 (HP)':'악몽 수호자의 보주 (악보) 18','Dusk Orb +18 (ATK)':'황혼 수호자의 보주 (황보) 18','Dawn Orb +18 (DEF)':'여명 수호자의 보주 (여보) 18','Horn of water +18 (HP/ATK)':'물뿔 (체/공) 18','Horn of water +18 (HP/DEF)':'물뿔 (체/방) 18','Horn of fire +18 (ATK/HP)':'불뿔 (공/체) 18','Horn of fire +18 (ATK/DEF)':'불뿔 (공/방) 18','Horn of earth +18 (DEF/HP)':'대뿔 (방/체) 18','Horn of earth +18 (DEF/ATK)':'대뿔 (방/공) 18','Horn of wind +18 (HP/DEF)':'바뿔 (체/방) 18','Horn of wind +18 (ATK/HP)':'바뿔 (공/체) 18','Horn of wind +18 (ATK/DEF)':'바뿔 (공/방) 18','Nightmare Orb +19 (HP)':'악몽 수호자의 보주 (악보) 19','Dusk Orb +19 (ATK)':'황혼 수호자의 보주 (황보) 19','Dawn Orb +19 (DEF)':'여명 수호자의 보주 (여보) 19','Horn of water +19 (HP/ATK)':'물뿔 (체/공) 19','Horn of water +19 (HP/DEF)':'물뿔 (체/방) 19','Horn of fire +19 (ATK/HP)':'불뿔 (공/체) 19','Horn of fire +19 (ATK/DEF)':'불뿔 (공/방) 19','Horn of earth +19 (DEF/HP)':'대뿔 (방/체) 19','Horn of earth +19 (DEF/ATK)':'대뿔 (방/공) 19','Horn of wind +19 (HP/DEF)':'바뿔 (체/방) 19','Horn of wind +19 (ATK/HP)':'바뿔 (공/체) 19','Horn of wind +19 (ATK/DEF)':'바뿔 (공/방) 19','Nightmare Orb +20 (HP)':'악몽 수호자의 보주 (악보) 20','Dusk Orb +20 (ATK)':'황혼 수호자의 보주 (황보) 20','Dawn Orb +20 (DEF)':'여명 수호자의 보주 (여보) 20','Horn of water +20 (HP/ATK)':'물뿔 (체/공) 20','Horn of water +20 (HP/DEF)':'물뿔 (체/방) 20','Horn of fire +20 (ATK/HP)':'불뿔 (공/체) 20','Horn of fire +20 (ATK/DEF)':'불뿔 (공/방) 20','Horn of earth +20 (DEF/HP)':'대뿔 (방/체) 20','Horn of earth +20 (DEF/ATK)':'대뿔 (방/공) 20','Horn of wind +20 (HP/DEF)':'바뿔 (체/방) 20','Horn of wind +20 (ATK/HP)':'바뿔 (공/체) 20','Horn of wind +20 (ATK/DEF)':'바뿔 (공/방) 20'};
 const dragons=DV1_DRAGON_VIEWS.savedNameMap(typeof GUILD_MODE==='undefined'?'calculator':GUILD_MODE);
 function walk(v){if(!v||typeof v!=='object')return v;if(typeof v.name==='string')v.name=acc[v.name]||dragons[v.name]||v.name;Object.values(v).forEach(walk);return v;}
 return walk(value);
}
function doLoad(){
  try{
    const r=localStorage.getItem(SAVE_KEY);
    // ── 내 스펙 자동 적용 ──
    (function(){
      try{
        const _sr=localStorage.getItem('dv1simEN_spec');
        if(!_sr)return;
        const _sp=readEnglishState(_sr);
        if(_sp.accCards)S.accCards=_sp.accCards;
        if(_sp.gems)Object.keys(_sp.gems).forEach(k=>{if(S.gems&&S.gems[k])Object.assign(S.gems[k],_sp.gems[k]);});
        if(_sp.pendants)S.pendants=_sp.pendants;
        if(_sp.coll)Object.assign(S.coll,_sp.coll);
      }catch(_e){}
    })();
    if(!r)return;
    const p=readEnglishState(r);
    S={...mkState(),...p,accCards:p.accCards||[],gems:{...mkState().gems,...(p.gems||{})},spirit:{...mkState().spirit,...(p.spirit||{})},coll:{...mkState().coll,...(p.coll||{})},dragonCards:{...mkDragonCards(),...(p.dragonCards||{})},settingBuffs:{...mkSettingBuffs(),...(p.settingBuffs||{})}};
    while(S.spirit.opts.length<4)S.spirit.opts.push({stat:'',type:''});
    normalizeDragonCards();
    // ── 내 스펙 자동 적용 ──
    (function(){
      try{
        const _sr=localStorage.getItem('dv1simEN_spec');
        if(!_sr)return;
        const _sp=readEnglishState(_sr);
        if(_sp.accCards)S.accCards=_sp.accCards;
        if(_sp.gems)Object.keys(_sp.gems).forEach(k=>{if(S.gems&&S.gems[k])Object.assign(S.gems[k],_sp.gems[k]);});
        if(_sp.pendants)S.pendants=_sp.pendants;
        if(_sp.coll)Object.assign(S.coll,_sp.coll);
      }catch(_e){}
    })();
    }catch(e){console.error(e);}
}

function saveDragonToSpec(){
  try{
    // S.dragonCards 직접 사용 (localStorage보다 최신 상태 보장)
    const dragonCards=S.dragonCards||{};
    const specRaw=localStorage.getItem('dv1simEN_spec');
    const spec=specRaw?JSON.parse(specRaw):{};
    spec.dragonCards=dragonCards;
    localStorage.setItem('dv1simEN_spec',JSON.stringify(spec));
    localStorage.setItem('dv1simEN_dragon_pending','1');
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0a0c18;padding:10px 24px;border-radius:8px;font-weight:800;font-size:14px;z-index:9999;transition:opacity .3s';
    t.textContent='내 스펙에 드래곤 셋팅이 저장됐어요!';
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2200);
  }catch(e){console.error(e);}
}

let saveT=null;
function doSave(){
  clearTimeout(saveT);
  localStorage.setItem(SAVE_KEY,JSON.stringify(S));
  const el=document.getElementById('save-msg');
  if(el){el.textContent='저장됨';setTimeout(()=>el.textContent='',2000);}
}
function qSave(){clearTimeout(saveT);saveT=setTimeout(doSave,1200);}
function resetAll(){
  if(!confirm('모든 입력값 및 시뮬 결과가 초기화됩니다.(컬렉션 포함)'))return;
  S=mkState();
  const chk=document.getElementById('chk-stat-only');
  if(chk)chk.checked=true;
  renderAcc();
  populateGems();
  renderPends();
  renderSpirit();
  renderDragonInfo();
  renderSettingBuffs();
  populateColl();
  resetSimResult();
  qSave();
}

function resetSimResult(){
  const rs=document.getElementById('res-sec');
  if(rs)rs.style.display='none';
  const rb=document.getElementById('res-body-top');
  if(rb)rb.innerHTML='';
  const rb2=document.getElementById('res-body-avg');
  if(rb2)rb2.innerHTML='';
}

function getAccNum(name){
  const m=name.match(/(\d+)\s*$/);
  return m?parseInt(m[1]):0;
}
function getAccType(name){
  for(let i=0;i<ACC_TYPE_ORDER.length;i++){
    const type=ACC_TYPE_ORDER[i];
    if(name.startsWith(type)||name.includes(`(${type})`))return i;
  }
  return 99;
}
function sortAccCards(){
  S.accCards=S.accCards.map((c,i)=>({...c,_idx:i}));
  S.accCards.sort((a,b)=>{
    const numA=getAccNum(a.name||''),numB=getAccNum(b.name||'');
    if(numB!==numA)return numB-numA;
    const typeA=getAccType(a.name||''),typeB=getAccType(b.name||'');
    if(typeA!==typeB)return typeA-typeB;
    const encA=ENC_ORDER[a.enchant]??3,encB=ENC_ORDER[b.enchant]??3;
    if(encA!==encB)return encA-encB;
    return a._idx-b._idx;
  });
  S.accCards=S.accCards.map(({_idx,...c})=>c);
}
function getPendOrder(type){return type==='태양'?0:type==='달'?1:2;}
function getPendSum(p){
  const mo=p.type==='태양'?3:p.type==='달'?2:1;
  return p.options.slice(0,mo).reduce((s,o)=>s+(o.val||0),0);
}
function sortPendants(){
  S.pendants=S.pendants.map((p,i)=>({...p,_idx:i}));
  S.pendants.sort((a,b)=>{
    const oA=getPendOrder(a.type),oB=getPendOrder(b.type);
    if(oA!==oB)return oA-oB;
    const sA=getPendSum(a),sB=getPendSum(b);
    if(sB!==sA)return sB-sA;
    return a._idx-b._idx;
  });
  S.pendants=S.pendants.map(({_idx,...p})=>p);
}

// ================================================================
// UI - 장신구 섹션
// ================================================================
function fmtAccSt(a){
  if(!a)return'';
  const p=[];
  if(a.hp>0)p.push(`<span style="color:var(--hpc)">체${(a.hp*100).toFixed(0)}%</span>`);
  if(a.atk>0)p.push(`<span style="color:var(--atc)">공${(a.atk*100).toFixed(0)}%</span>`);
  if(a.def>0)p.push(`<span style="color:var(--dfc)">방${(a.def*100).toFixed(0)}%</span>`);
  return p.length?p.join(' '):'<span style="color:var(--dimmer)">크리/회피</span>';
}

function applyEncColor(sel){
  const v=sel.value;
  sel.style.color=v==='hp'?'var(--gold)':v==='atk'?'var(--red)':v==='def'?'var(--blue)':'var(--text)';
}

function renderAcc(){
  const list=document.getElementById('acc-list');
  if(!list)return;
  if(!S.accCards.length){
    list.innerHTML='<div style="color:var(--dimmer);font-size:13px">보유 장신구 없음</div>';
    return;
  }
  let html='';
  S.accCards.forEach((card,ci)=>{
    const a=ACC_DB.find(x=>x.n===card.name);
    const stHtml=a?fmtAccSt(a):'<span style="color:var(--dimmer)">-</span>';
    html+=`<div class="acc-card">
      <div class="acc-card-row">
        <div class="acc-search-wrap" id="acc-wrap-${ci}">
          <input class="acc-search-input" id="acc-inp-${ci}" value="${card.name||''}" placeholder="장신구 검색..."
            oninput="filterAccDrop(${ci},this.value)"
            onfocus="openAccDrop(${ci})"
            onblur="setTimeout(()=>closeAccDrop(${ci},this),150)"
            onkeydown="accNavKey(event,${ci})">
          <div class="acc-dropdown" id="acc-drop-${ci}"></div>
        </div>
        ${a && a.img ? `<img src="${a.img}" style="width:40px;height:40px;object-fit:contain;flex-shrink:0">` : '<span style="width:40px;flex-shrink:0"></span>'}
        <span style="font-size:11px;min-width:80px">${stHtml}</span>
        <span style="font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.3px;font-weight:700;flex-shrink:0">인챈트</span>
        <select style="font-size:12px" onchange="onAccEnc(${ci},this.value);applyEncColor(this)">
          <option value="none" ${card.enchant==='none'?'selected':''}>인챈트 없음</option>
          <option value="hp"   ${card.enchant==='hp'?'selected':''}>체 +21%</option>
          <option value="atk"  ${card.enchant==='atk'?'selected':''}>공 +21%</option>
          <option value="def"  ${card.enchant==='def'?'selected':''}>방 +21%</option>
        </select>
        <button class="btn-red" onclick="delAcc(${ci})">삭제</button>
      </div>
    </div>`;
  });
  list.innerHTML=html;
  document.querySelectorAll('#acc-list select').forEach(sel=>applyEncColor(sel));
}

function openAccDrop(ci){
  filterAccDrop(ci, document.getElementById('acc-inp-'+ci).value);
  const drop=document.getElementById('acc-drop-'+ci);
  drop.classList.add('open');
  const sec=drop.closest('.sec');
  if(sec)sec.style.overflow='visible';
}

function closeAccDrop(ci,el){
  const drop=document.getElementById('acc-drop-'+ci);
  if(!drop)return;
  drop.classList.remove('open');
  const sec=drop.closest('.sec');
  if(sec)sec.style.overflow='';
  if(el){
    const valid=ACC_DB.some(a=>a.n===el.value);
    if(!valid){
      S.accCards[ci].name='';
      S.accCards[ci].enchant='none';
      el.value='';
      qSave();
    }
  }
}

function accNavKey(e,ci){
  const drop=document.getElementById('acc-drop-'+ci);
  if(!drop||!drop.classList.contains('open'))return;
  const items=[...drop.querySelectorAll('.acc-drop-item')];
  if(!items.length)return;
  const cur=drop.querySelector('.acc-drop-item.focused');
  let idx=items.indexOf(cur);
  if(e.key==='ArrowDown'){
    e.preventDefault();
    idx=Math.min(idx+1,items.length-1);
    items.forEach(el=>el.classList.remove('focused'));
    items[idx].classList.add('focused');
    items[idx].scrollIntoView({block:'nearest'});
  }else if(e.key==='ArrowUp'){
    e.preventDefault();
    idx=Math.max(idx-1,0);
    items.forEach(el=>el.classList.remove('focused'));
    items[idx].classList.add('focused');
    items[idx].scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'){
    e.preventDefault();
    if(cur)cur.dispatchEvent(new MouseEvent('mousedown'));
  }else if(e.key==='Escape'){
    closeAccDrop(ci);
  }
}

function filterAccDrop(ci,q){
  const drop=document.getElementById('acc-drop-'+ci);
  if(!drop)return;
  const kw=q.toLowerCase().trim();
  const statOnly=document.getElementById('chk-stat-only')?.checked;
  let filtered=statOnly?ACC_DB.filter(a=>!a.n.startsWith('빛뿔')):ACC_DB;
  if(kw)filtered=filtered.filter(a=>a.n.toLowerCase().includes(kw));
  drop.innerHTML=filtered.slice(0,30).map(a=>
    `<div class="acc-drop-item" onmousedown="selectAcc(${ci},'${a.n.replace(/'/g,"\'")}')">
      <span class="acc-drop-name">${a.n}</span>
    </div>`
  ).join('');
  drop.classList.add('open');
}

function selectAcc(ci,name){
  S.accCards[ci].name=name;
  const inp=document.getElementById('acc-inp-'+ci);
  if(inp)inp.value=name;
  closeAccDrop(ci);
  renderAcc();qSave();
}

function addAcc(){
  S.accCards.unshift({name:'',enchant:'none'});
  renderAcc();qSave();
}

//장신구 단계별 일괄 추가
function addAccBulk(lv){
  const statOnly=document.getElementById('chk-stat-only')?.checked;
  const targets=ACC_DB.filter(a=>getAccNum(a.n)===lv&&(!statOnly||!a.n.startsWith('빛뿔')));
  if(!targets.length){
    alert(`${lv} 장신구를 찾을 수 없습니다.`);
    return;
  }
  targets.forEach(a=>S.accCards.unshift({name:a.n,enchant:'none'}));
  sortAccCards();
  renderAcc();
  resetSimResult();
  qSave();
  alert(`${lv} 장신구 1세트가 추가되었습니다.`);
}

function delAcc(ci){
  S.accCards.splice(ci,1);
  renderAcc();qSave();
}

function resetAcc(){
  if(!confirm('입력한 옵션값이 전부 초기화됩니다.'))return;
  S.accCards=[];
  renderAcc();
  qSave();
}

function onAccEnc(ci,enc){
  S.accCards[ci].enchant=enc;
  qSave();
}

// ================================================================
// UI - 젬 섹션
// ================================================================
function populateGems(){
  for(const s of SKEYS)for(const lv of [37,38,39,40]){
    const el=document.getElementById(`gem-${s}-${lv}`);
    if(el)el.value=S.gems[s]?.[lv]||0;
  }
}

function resetGems(){
  if(!confirm('입력한 옵션값이 전부 초기화됩니다.'))return;
  S.gems={hp:{37:0,38:0,39:0,40:0},atk:{37:0,38:0,39:0,40:0},def:{37:0,38:0,39:0,40:0}};
  populateGems();
  qSave();
}

function onGem(stat,lv,val,el){
  const n=Math.max(0,parseInt(val)||0);
  S.gems[stat][lv]=n;
  if(el&&el.value==='')el.value=0;
  qSave();
}

// ================================================================
// UI - 펜던트 섹션
// ================================================================
function renderPends(){
  const el=document.getElementById('pend-list');
  if(!el)return;
  if(!S.pendants.length){
    el.innerHTML='<div style="color:var(--dimmer);font-size:13px">보유 펜던트 없음 (시뮬 시 펜던트 효과 미적용)</div>';
    return;
  }
  let html='';
  S.pendants.forEach((p,pi)=>{
    const mo=p.type==='태양'?3:p.type==='달'?2:1;
    let opts='';
    for(let oi=0;oi<mo;oi++){
      const o=p.options[oi]||{stat:'hp',val:1};
      opts+=`<div class="popt-row">
        <span class="popt-idx">${oi+1}옵</span>
        <select onchange="onPOpt(${pi},${oi},'stat',this.value)">
          <option value="hp"  ${o.stat==='hp'?'selected':''}>체력</option>
          <option value="atk" ${o.stat==='atk'?'selected':''}>공격</option>
          <option value="def" ${o.stat==='def'?'selected':''}>방어</option>
        </select>
        <input type="number" min="1" max="6" value="${o.val||1}" style="width:50px;text-align:center"
          onchange="validatePOpt(this,${pi},${oi})" onkeydown="if(event.key==='Enter')this.blur()">
        <span style="color:var(--dim)">%</span>
      </div>`;
    }
    const summ=getPendSummary(p);
    html+=`<div class="pcard">
      <div class="pcard-hd">
        <select onchange="onPType(${pi},this.value)" style="width:100px">
          <option value="태양" ${p.type==='태양'?'selected':''}>태양 (3옵)</option>
          <option value="달"   ${p.type==='달'?'selected':''}>달 (2옵)</option>
          <option value="별"   ${p.type==='별'?'selected':''}>별 (1옵)</option>
        </select>
        <img src="${IMG_PEND[p.type]||''}" style="width:36px;height:36px;object-fit:contain;border-radius:4px">
        <span id="pend-summ-${pi}" style="color:var(--text);font-size:12px">(${summ})</span>
        <button class="btn-red" onclick="delPend(${pi})" style="margin-left:auto">삭제</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:2px">${opts}</div>
    </div>`;
  });
  el.innerHTML=html;
}

function getPendSummary(p){
  if(!p)return'';
  const mo=p.type==='태양'?3:p.type==='달'?2:1;
  return p.options.slice(0,mo).map(o=>`${SK[o.stat]||'?'}${o.val||0}%`).join('/');
}

function updatePendSummary(pi){
  const el=document.getElementById(`pend-summ-${pi}`);
  const p=S.pendants[pi];
  if(el&&p)el.textContent=`(${getPendSummary(p)})`;
}

function addPendant(){
  S.pendants.unshift({type:'달',options:[{stat:'hp',val:1},{stat:'hp',val:1}]});
  renderPends();qSave();
}

function addMoonPendantSet(){
  const combos=[
    ['hp','hp'],
    ['hp','atk'],
    ['hp','def'],
    ['atk','atk'],
    ['atk','def'],
    ['def','def']
  ];
  const set=combos.map(([a,b])=>({
    type:'달',
    options:[{stat:a,val:6},{stat:b,val:6}]
  }));
  S.pendants.unshift(...set);
  renderPends();
  qSave();
  alert('달펜 세트 1개(6종)가 추가되었습니다.');
}

function delPend(i){S.pendants.splice(i,1);renderPends();qSave();}

function resetPend(){
  if(!confirm('입력한 옵션값이 전부 초기화됩니다.'))return;
  S.pendants=[];
  renderPends();
  qSave();
}

function onPType(pi,type){
  S.pendants[pi].type=type;
  const max=type==='태양'?3:type==='달'?2:1;
  while(S.pendants[pi].options.length<max)S.pendants[pi].options.push({stat:'hp',val:1});
  S.pendants[pi].options=S.pendants[pi].options.slice(0,max);
  renderPends();qSave();
}

function validatePOpt(el,pi,oi){
  const n=parseInt(el.value);
  if(el.value===''||isNaN(n)||n<1||n>6){
    alert('1~6 사이의 정수를 입력해주세요.');
    el.value='';
    return;
  }
  onPOpt(pi,oi,'val',n);
}

function onPOpt(pi,oi,field,val){
  if(!S.pendants[pi].options[oi])S.pendants[pi].options[oi]={stat:'hp',val:1};
  S.pendants[pi].options[oi][field]=val;
  updatePendSummary(pi);
  resetSimResult();
  qSave();
}

// ================================================================
// UI - 정령 섹션
// ================================================================
function spPresetLabel(type){
  return type==='%'?'%':type==='+'?'+':'-';
}

function isSpiritPresetActive(preset){
  return preset.types.every((type,i)=>{
    const cur=S.spirit.opts[i]||{};
    return cur.type===type;
  });
}

function applySpiritPreset(id){
  const preset=SP_PRESETS.find(p=>p.id===id);
  if(!preset)return;
  S.spirit.opts=preset.types.map((type,i)=>({
    stat:S.spirit.opts[i]?.stat||'',
    type
  }));
  renderSpirit();
  resetSimResult();
  qSave();
}

function renderSpirit(){
  const el=document.getElementById('sp-bd');
  if(!el)return;
  const sp=S.spirit;

  const presets=SP_PRESETS.map(p=>{
    const desc=p.types.map(spPresetLabel).join('');
    return `<button class="sp-preset-btn ${isSpiritPresetActive(p)?'active':''}" onclick="applySpiritPreset('${p.id}')">
      <span class="sp-preset-name">${p.name}</span>
      <span class="sp-preset-desc">${desc}</span>
    </button>`;
  }).join('');

  el.innerHTML=`<div class="sp-preset-grid">${presets}</div>${SpiritInput.options(sp,'onSpOpt',[],fmtSpVal)}${SpiritInput.bonus(sp,'onSpBonus',[])}`;
}

function resetSpirit(){
  if(!confirm('입력한 옵션값과 시뮬 결과가 초기화됩니다.'))return;
  S.spirit={level:1,maxLvl:false,opts:[{stat:'',type:''},{stat:'',type:''},{stat:'',type:''},{stat:'',type:''}],bonus:''};
  renderSpirit();
  resetSimResult();
  qSave();
}

function fmtSpVal(n,stat,type){
  if(!stat||!type)return'';
  return type==='+'?`<b>+${SP_PLUS[stat][n]}</b>`:`<b>+${(SP_PCT[n]*100).toFixed(0)}%</b>`;
}

function onSpOpt(idx,field,val){
  S.spirit.opts[idx][field]=val;
  renderSpirit();
  resetSimResult();
  qSave();
}

function onSpBonus(val){
  S.spirit.bonus=val;
  renderSpirit();
  resetSimResult();
  qSave();
}

// ================================================================
// UI - 내 용 정보
// ================================================================
function escHtml(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function normalizeDragonCards(){
  if(!S.dragonCards)S.dragonCards=mkDragonCards();
  DRAGON_CATS.forEach(cat=>{
    if(!Array.isArray(S.dragonCards[cat]))S.dragonCards[cat]=[];
    S.dragonCards[cat]=S.dragonCards[cat].map(card=>({
      ...mkDragonCard(),
      ...card,
      opts:[...(card.opts||[])]
    }));
    S.dragonCards[cat].forEach(card=>{
      while(card.opts.length<4)card.opts.push({stat:'',type:''});
      card.opts=card.opts.slice(0,4).map(o=>({stat:o?.stat||'',type:o?.type||''}));
      card.uid=card.uid||newDragonUid();
      card.bonus=card.bonus||'';
      card.name=card.name||'';
      card.dtype=card.dtype||'';
      card.dupe=!!card.dupe;
      if(!card.grade&&BASE[card.growth])card.grade=card.growth;
      card.grade=BASE[card.grade]?card.grade:'9.0';
      card.growth=['강림(축복)','강림','진각'].includes(card.growth)?card.growth:'강림(축복)';
      if(card.growth==='진각')card.grade='진각';
      else if(!['7.0','8.0','9.0'].includes(card.grade))card.grade='7.0';
    });
  });
}

function dragonStatOptions(v){
  return `
    <option value="" ${!v?'selected':''}>-</option>
    <option value="hp" ${v==='hp'?'selected':''}>체력</option>
    <option value="atk" ${v==='atk'?'selected':''}>공격</option>
    <option value="def" ${v==='def'?'selected':''}>방어</option>`;
}

function dragonTypeOptions(v){
  return `
    <option value="" ${!v?'selected':''}>-</option>
    <option value="+" ${v==='+'?'selected':''}>+스탯</option>
    <option value="%" ${v==='%'?'selected':''}>%스탯</option>`;
}

function normDragonName(name){
  return String(name||'').replace(/ 드래곤$/,'').replace(/\s+/g,'').toLowerCase();
}

function englishDragonName(name){
  const row=DV1_DRAGONS.records.find(r=>r.name.ko===name||(r.aliases.ko||[]).includes(name));
  return row?.name.en||name;
}

function dragonDbNames(entry){
  if(typeof entry==='string')return[entry];
  if(!entry||typeof entry!=='object')return[];
  return [entry.name,...(entry.aliases||[])].filter(Boolean);
}

function dragonOfficialName(entry){
  return typeof entry==='string'?entry:entry?.name||'';
}

function findDragonMatch(name){
  const typed=String(name||'').trim().toLowerCase();
  const english=DV1_DRAGONS.records.find(r=>r.name.en?.toLowerCase()===typed||(r.aliases.en||[]).some(a=>a.toLowerCase()===typed));
  if(english)name=english.name.ko;
  const key=normDragonName(name);
  if(!key)return null;
  const prefixMatches=[];
  for(const [typeOrName,namesOrType] of Object.entries(DRAGON_TYPE_DB)){
    if(Array.isArray(namesOrType)&&DTYPES.includes(typeOrName)){
      for(const entry of namesOrType){
        const official=dragonOfficialName(entry);
        if(!official)continue;
        if(dragonDbNames(entry).some(dbName=>normDragonName(dbName)===key))return{name:official,type:typeOrName};
        if(key.length>=2&&normDragonName(official).startsWith(key))prefixMatches.push({name:official,type:typeOrName});
      }
    }else if(typeof namesOrType==='string'&&DTYPES.includes(namesOrType)){
      if(normDragonName(typeOrName)===key)return{name:typeOrName,type:namesOrType};
    }
  }
  return prefixMatches.length===1?prefixMatches[0]:null;
}

function findDragonType(name){
  return findDragonMatch(name)?.type||'';
}

function findDragonAttr(name){
  const key=normDragonName(name);
  if(!key)return'';
  for(const [attr,names] of Object.entries(DRAGON_ATTR_DB)){
    if((names||[]).some(n=>normDragonName(n)===key))return attr;
  }
  return'';
}

function dragonIdentityKey(card){
  const nameKey=normDragonName(card?.name);
  return card?.dupe&&card?.uid?card.uid:nameKey;
}

function findUncheckedDragonDuplicate(){
  const byName=new Map();
  DRAGON_CATS.forEach(cat=>{
    (S.dragonCards?.[cat]||[]).forEach((card,idx)=>{
      const key=normDragonName(card.name);
      if(!key)return;
      if(!byName.has(key))byName.set(key,[]);
      byName.get(key).push({cat,idx,card});
    });
  });
  for(const group of byName.values()){
    if(group.length>1&&group.some(x=>!x.card.dupe))return group;
  }
  return null;
}

function hasOtherDragonWithSameName(cat,idx){
  const card=S.dragonCards?.[cat]?.[idx];
  const key=normDragonName(card?.name);
  if(!key)return false;
  return DRAGON_CATS.some(c=>(S.dragonCards?.[c]||[]).some((other,oi)=>!(c===cat&&oi===idx)&&normDragonName(other.name)===key));
}

function warnUncheckedDragonDuplicate(){
  const group=findUncheckedDragonDuplicate();
  if(!group)return;
  const name=group[0].card.name;
  alert(`동일한 용 이름 "${name}"이 입력되어 있습니다. 같은 개체가 아니라면 각 카드의 중복 여부를 체크해주세요.`);
}

function syncDragonDupeGroupByName(name){
  const key=normDragonName(name);
  if(!key)return false;
  const group=[];
  DRAGON_CATS.forEach(cat=>{
    (S.dragonCards?.[cat]||[]).forEach(card=>{
      if(normDragonName(card.name)===key)group.push(card);
    });
  });
  if(group.length<2||!group.some(card=>card.dupe))return false;
  group.forEach(card=>{card.dupe=true;});
  return true;
}

function fmtDragonSpVal(n,stat,type){
  if(!stat||!type)return'';
  return type==='+'?`+${SP_PLUS[stat][n]}`:`+${(SP_PCT[n]*100).toFixed(0)}%`;
}

function isDragonSpiritPresetActive(card,preset){
  return preset.types.every((type,i)=>(card.opts[i]?.type||'')===type);
}

function renderDragonCounts(){
  DRAGON_CATS.forEach(cat=>{
    const el=document.querySelector(`[data-dragon-count="${cat}"]`);
    if(el)el.textContent=`(${(S.dragonCards?.[cat]||[]).length}마리)`;
  });
}

function gCardHtml(cat,ci){
  const card=(S.dragonCards[cat]||[])[ci];
  if(!card)return '';

      const presets=SP_PRESETS.map(p=>{
        const desc=p.types.map(spPresetLabel).join('');
        return `<button class="sp-preset-btn ${isDragonSpiritPresetActive(card,p)?'active':''}" onclick="applyDragonSpiritPreset('${cat}',${ci},'${p.id}')">
          <span class="sp-preset-name">${p.name}</span>
          <span class="sp-preset-desc">${desc}</span>
        </button>`;
      }).join('');
      const opts=SpiritInput.options(card,'onDragonOpt',[cat,ci],fmtDragonSpVal);
      return `
        <div class="dragon-card">
          <div class="dragon-card-hd">
            <div class="dragon-name-cell">
              <span class="dragon-card-no">${ci+1}</span>
              ${(()=>{const _u=getDragonImgUrl(card.name);return _u?'<img class="dragon-img-icon" src="'+_u+'" onerror="this.style.display=\'none\'">':'<div class="dragon-img-placeholder"></div>';})()}
              <div class="dragon-name-wrap">
                <input class="dragon-name-input" type="text" value="${escHtml(englishDragonName(card.name))}" placeholder="용 이름" oninput="onDragonNameInput('${cat}',${ci},this.value);filterDragonDrop('${cat}',${ci},this.value)" onchange="applyDragonNameType('${cat}',${ci})" onfocus="filterDragonDrop('${cat}',${ci},this.value)" onblur="setTimeout(()=>{const d=document.getElementById('dragon-drop-${cat}-${ci}');if(d)d.classList.remove('open');},200)">
                <div class="dragon-drop" id="dragon-drop-${cat}-${ci}"></div>
              </div>
            </div>
            <label class="dragon-dupe-check">중복 여부 <input type="checkbox" ${card.dupe?'checked':''} onchange="onDragonDupe('${cat}',${ci},this.checked)"></label>
            <div class="readonly-field dragon-type-field">${escHtml(card.dtype||'타입')}</div>
            <select onchange="onDragonField('${cat}',${ci},'growth',this.value)">
              <option value="강림(축복)" ${card.growth==='강림(축복)'?'selected':''}>강림(축복)</option>
              <option value="강림" ${card.growth==='강림'?'selected':''}>강림</option>
              <option value="진각" ${card.growth==='진각'?'selected':''}>진각</option>
            </select>
            <select onchange="onDragonField('${cat}',${ci},'grade',this.value)" ${card.growth==='진각'?'disabled':''}>
              ${card.growth==='진각'?'<option value="진각" selected>진각</option>':['9.0','8.0','7.0'].map(g=>`<option value="${g}" ${card.grade===g?'selected':''}>${g}</option>`).join('')}
            </select>
            <button class="btn-red dragon-delete-btn" onclick="delDragonCard('${cat}',${ci})">용 정보 삭제</button>
          </div>
          <div class="dragon-preset-row">
            ${presets}
            <button class="btn-reset dragon-reset-btn" onclick="resetDragonCard('${cat}',${ci})"></button>
          </div>
          <div class="dragon-spirit-grid">${opts}</div>
          ${SpiritInput.bonus(card,'onDragonBonus',[cat,ci])}
        </div>`;

}
// ── 내 용 정보: 속성 레일 + 그룹 표 ─────────────────────────
const EL_ICON={'땅':11,'물':12,'불':13,'바람':14,'빛':84,'어둠':87,'황혼':487,'여명':486,'악몽':488};
const EL_DOT={'땅':'#a3956b','물':'#5b9bd5','불':'#e0776f','바람':'#6fbf8e','빛':'#e8d07a',
              '어둠':'#9b8bc4','황혼':'#c9836b','여명':'#7fb3d5','악몽':'#8f7ab0'};
const EL_IMG_BASE='https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/';
function elIcon(attr){return EL_IMG_BASE+(EL_ICON[attr]||11)+'.png';}
let G_ATTR='';    // 레일에서 고른 속성
let G_EDIT=null;  // {cat, ci}
function setGAttr(a){G_ATTR=(G_ATTR===a)?'':a;renderDragonInfo();}
function gOpenEdit(cat,ci){
  const same=G_EDIT&&G_EDIT.cat===cat&&G_EDIT.ci===ci;
  G_EDIT=same?null:{cat:cat,ci:ci};
  renderDragonInfo();
}
function gCloseEdit(){G_EDIT=null;renderDragonInfo();}
// 편집 칸은 PC 표 안 / 모바일 시트 안 — 한 번에 한 곳에만 그립니다.
// 두 곳에 동시에 그리면 이름 검색 드롭다운 id 가 겹쳐 모바일에서 고를 수 없습니다.
const _gMQ=window.matchMedia('(max-width:760px)');
const G_MOBILE=()=>_gMQ.matches;
if(_gMQ.addEventListener)_gMQ.addEventListener('change',()=>{if(G_EDIT)renderDragonInfo();});
// 정령 옵션 요약 칩
function gSpChips(card){
  const M={hp:'체',atk:'공',def:'방'};
  const out=(card.opts||[]).map(o=>{
    if(!o.stat)return '<span class="sp-chip none">·</span>';
    return `<span class="sp-chip ${o.stat}">${M[o.stat]||''}${o.type==='+'?'+':'%'}</span>`;
  });
  if(card.bonus)out.push(`<span class="sp-chip ${card.bonus} bn">부가</span>`);
  return `<span class="sp-chips">${out.join('')}</span>`;
}

function renderDragonInfo(){
  normalizeDragonCards();
  renderDragonCounts();
  const host=document.getElementById('dragon-split');
  if(!host)return;

  const total=DRAGON_CATS.reduce((n,c)=>n+(S.dragonCards[c]||[]).length,0);
  const shown=G_ATTR?[G_ATTR]:DRAGON_CATS.slice();

  const rail=`<div class="dr-rail">
    <div class="dr-rail-t">속성</div>
    <button class="dr-rail-i${G_ATTR?'':' on'}" onclick="setGAttr('')">전체<span class="n">${total}</span></button>
    ${DRAGON_CATS.map(c=>{
      const n=(S.dragonCards[c]||[]).length;
      return `<button class="dr-rail-i${G_ATTR===c?' on':''}${n?'':' off'}" onclick="setGAttr('${c}')">
        <img src="${elIcon(c)}" onerror="this.style.visibility='hidden'" alt="">${c}
        <span class="n">${n||'—'}</span></button>`;
    }).join('')}
  </div>`;

  const grpBar=(cat,n,mobile)=>`
    <div class="grp-bar">
      <span class="bar" style="background:${EL_DOT[cat]}"></span>
      <img src="${elIcon(cat)}" onerror="this.style.visibility='hidden'" alt="">
      <span class="nm">${cat}</span><span class="cnt">${n}마리</span>
      <span class="acts">
        ${n?`<button class="btn-red" onclick="event.stopPropagation();clearDragonCat('${cat}',event)">일괄 삭제</button>`:''}
        <button class="btn-white" onclick="event.stopPropagation();addDragonCard('${cat}',event)">＋ 추가</button>
      </span>
    </div>`;

  // PC 표
  let rows='';
  {
    shown.forEach(cat=>{
      const cards=S.dragonCards[cat]||[];
      rows+=`<tr class="grp-row"><td colspan="6">${grpBar(cat,cards.length)}</td></tr>`;
      cards.forEach((card,ci)=>{
        const open=G_EDIT&&G_EDIT.cat===cat&&G_EDIT.ci===ci;
        const url=getDragonImgUrl(card.name);
        const nameTxt=card.name||'용 미선택';
        const sub=[card.dtype||'', card.growth||'', (card.growth==='강림(축복)'?card.grade:'')].filter(Boolean).join(' · ');
        rows+=`<tr class="dr-row${open?' on':''}" onclick="gOpenEdit('${cat}',${ci})">
          <td class="c-bar" style="background:${EL_DOT[cat]}"></td>
          <td class="c-name"><span class="nw">
            ${url?`<img class="dr-img" src="${url}" onerror="this.style.visibility='hidden'" alt="">`:'<span class="dr-img"></span>'}
            <span class="t">${escHtml(nameTxt)}</span>
            ${card.dupe?'<span class="dupe-i">중복</span>':''}
          </span></td>
          <td class="c-sub">${escHtml(sub)||'<span class="dim">—</span>'}</td>
          <td class="c-sp">${gSpChips(card)}${card.name&&!card.dtype?'<span class="warn-i">타입을 골라야 계산돼요</span>':''}</td>
          <td class="c-act">
            <button class="icon-btn red" title="삭제" onclick="event.stopPropagation();delDragonCard('${cat}',${ci})">✕</button>
          </td>
          <td class="c-caret">${open?'▴':'▾'}</td>
        </tr>`;
        if(open&&!G_MOBILE())rows+=`<tr class="dr-editrow"><td class="c-bar" style="background:${EL_DOT[cat]}"></td><td colspan="5">${gCardHtml(cat,ci)}</td></tr>`;
      });
    });
  }
  const hint=total?'':'<div class="dr-hint">아직 등록한 용이 없어요. 속성 줄의 ＋ 추가를 눌러 등록해주세요.</div>';
  const table=hint+`<table class="dr-tbl"><tbody>${rows}</tbody></table>`;

  // 모바일 목록
  let mo='';
  {
    shown.forEach(cat=>{
      const cards=S.dragonCards[cat]||[];
      mo+=`<div class="mo-grp"><span class="bar" style="background:${EL_DOT[cat]}"></span>
        <img src="${elIcon(cat)}" onerror="this.style.visibility='hidden'" alt="">
        <span class="nm">${cat}</span><span class="cnt">${cards.length}마리</span>
        <button class="btn" onclick="addDragonCard('${cat}',event)">＋</button></div>`;
      mo+='<div class="mo-list">'+cards.map((card,ci)=>{
        const url=getDragonImgUrl(card.name);
        const sub=[card.dtype||'', card.growth||''].filter(Boolean).join(' · ');
        return `<button type="button" class="mo-row" onclick="gOpenEdit('${cat}',${ci})">
          <span class="bar" style="background:${EL_DOT[cat]}"></span>
          ${url?`<img class="dr-img" src="${url}" onerror="this.style.visibility='hidden'" alt="">`:'<span class="dr-img"></span>'}
          <span class="tx"><span class="t">${escHtml(card.name||'용 미선택')}</span>
            <span class="s">${escHtml(sub)||'타입을 골라야 계산돼요'}</span></span>
          ${gSpChips(card)}
        </button>`;
      }).join('')+'</div>';
    });
  }

  mo=hint+mo;

  // 모바일 편집 시트
  let sheet='';
  if(G_EDIT&&G_MOBILE()){
    const {cat,ci}=G_EDIT;
    const card=(S.dragonCards[cat]||[])[ci];
    if(card){
      const url=getDragonImgUrl(card.name);
      sheet=`<div class="dr-scrim" onclick="gCloseEdit()"></div>
        <div class="dr-sheet">
          <div class="dr-sheet-grab"></div>
          <div class="dr-sheet-hd">
            ${url?`<img class="dr-img" src="${url}" onerror="this.style.visibility='hidden'" alt="">`:'<span class="dr-img"></span>'}
            <div><div class="t">${escHtml(card.name||'용 미선택')}</div><div class="s">${cat}</div></div>
            <button class="icon-btn red" title="삭제" onclick="delDragonCard('${cat}',${ci});gCloseEdit()">✕</button>
          </div>
          <div class="dr-sheet-bd">${gCardHtml(cat,ci)}</div>
          <div class="dr-sheet-ft"><button class="btn-sim" onclick="gCloseEdit()">확인</button></div>
        </div>`;
    }
  }

  host.innerHTML=`<div class="dr-split">${rail}<div class="dr-main">${table}</div></div>`
    +`<div class="dr-mo">${mo}</div>`+sheet;
}

function addDragonCard(cat,ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  normalizeDragonCards();
  S.dragonCards[cat].push(mkDragonCard());
  renderDragonInfo();
  qSave();
}

function delDragonCard(cat,idx){
  normalizeDragonCards();
  S.dragonCards[cat].splice(idx,1);
  renderDragonInfo();
  qSave();
}

function clearDragonCat(cat,ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  normalizeDragonCards();
  if(!S.dragonCards[cat].length)return;
  if(!confirm(`${cat} 속성의 용 정보를 모두 삭제할까요?`))return;
  S.dragonCards[cat]=[];
  renderDragonInfo();
  qSave();
}

function resetAllDragonInfo(){
  normalizeDragonCards();
  const total=DRAGON_CATS.reduce((sum,cat)=>sum+(S.dragonCards[cat]?.length||0),0);
  if(!total)return;
  if(!confirm('내 용 정보의 모든 카드를 삭제할까요?'))return;
  S.dragonCards=mkDragonCards();
  renderDragonInfo();
  qSave();
}

function resetDragonCard(cat,idx){
  normalizeDragonCards();
  S.dragonCards[cat][idx]=mkDragonCard();
  renderDragonInfo();
  qSave();
}

function onDragonNameInput(cat,idx,val){
  normalizeDragonCards();
  S.dragonCards[cat][idx].name=val;
  qSave();
}

function applyDragonNameType(cat,idx){
  normalizeDragonCards();
  const card=S.dragonCards[cat][idx];
  const match=findDragonMatch(card.name);
  if(match){
    const attr=findDragonAttr(match.name);
    if(attr&&attr!==cat){
      card.name='';card.dtype='';
      renderDragonInfo();qSave();return;
    }
    if(!isAllowedDragon(cat,match.name)&&!isAllowedDragon(cat,card.name)){
      card.name='';card.dtype='';
      renderDragonInfo();qSave();return;
    }
    if(!isAllowedDragon(cat,card.name))card.name=match.name;
    card.dtype=match.type;
  } else if(card.name){
    card.name='';card.dtype='';
    renderDragonInfo();qSave();return;
  }
  const synced=syncDragonDupeGroupByName(card.name);
  if(match||synced)renderDragonInfo();
  warnUncheckedDragonDuplicate();
  qSave();
}

function onDragonField(cat,idx,field,val){
  normalizeDragonCards();
  const card=S.dragonCards[cat][idx];
  card[field]=val;
  if(card.growth==='진각')card.grade='진각';
  else if(!['7.0','8.0','9.0'].includes(card.grade))card.grade='7.0';
  if(field==='growth'||field==='grade')renderDragonInfo();
  qSave();
}

function onDragonDupe(cat,idx,checked){
  normalizeDragonCards();
  const card=S.dragonCards[cat][idx];
  const key=normDragonName(card?.name);
  if(checked&&key){
    card.dupe=true;
    syncDragonDupeGroupByName(card.name);
    renderDragonInfo();
    qSave();
    return;
  }
  if(!checked&&hasOtherDragonWithSameName(cat,idx)){
    alert(`동일한 용 이름 "${card.name}"이 입력되어 있습니다. 중복 개체가 아니라면 용 이름을 다르게 입력해주세요.`);
  }
  card.dupe=checked;
  qSave();
}

function onDragonOpt(cat,idx,optIdx,field,val){
  normalizeDragonCards();
  S.dragonCards[cat][idx].opts[optIdx][field]=val;
  renderDragonInfo();
  qSave();
}

function applyDragonSpiritPreset(cat,idx,presetId){
  normalizeDragonCards();
  const preset=SP_PRESETS.find(p=>p.id===presetId);
  const card=S.dragonCards[cat][idx];
  if(!preset||!card)return;
  card.opts=preset.types.map((type,i)=>({
    stat:card.opts[i]?.stat||'',
    type
  }));
  renderDragonInfo();
  qSave();
}

function onDragonBonus(cat,idx,val){
  normalizeDragonCards();
  S.dragonCards[cat][idx].bonus=val;
  renderDragonInfo();
  qSave();
}

// ================================================================
// UI - 3vs3 세팅 버프/디버프
// ================================================================
function settingAttrOptions(v){
  return DRAGON_CATS.map(cat=>`<option value="${cat}" ${v===cat?'selected':''}>${cat}</option>`).join('');
}

function settingStatOptions(v){
  const labels={hp:'HP',atk:'ATK',def:'DEF'};
  return SKEYS.map(s=>`<option value="${s}" ${v===s?'selected':''}>${labels[s]}</option>`).join('');
}

function settingTypeOptions(v){
  return DTYPES.map(t=>`<option value="${t}" ${v===t?'selected':''}>${t.replace('형','')}</option>`).join('');
}

function settingBuffPanel(key,title){
  const cfg=S.settingBuffs[key];
  const _attrNums={'땅':11,'물':12,'불':13,'바람':14,'빛':84,'어둠':87,'황혼':487,'여명':486,'악몽':488};
  const attrImg=`https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/${_attrNums[cfg.attr]||11}.png`;
  return `
    <div class="buff-setting-panel">
      <div class="buff-setting-title">${title}</div>
      <div class="buff-setting-body">
        <div class="buff-setting-cell">
          <div class="buff-setting-lbl">속성</div>
          <select onchange="onSettingBuff('${key}','attr',this.value)">${settingAttrOptions(cfg.attr)}</select>
          <img class="buff-attr-icon" src="${attrImg}" alt="">
        </div>
        <div class="buff-setting-cell">
          <select aria-label="속성 ${title}" onchange="onSettingBuff('${key}','stat1',this.value)">${settingStatOptions(cfg.stat1)}</select>
        </div>
        <div class="buff-setting-cell">
          <div class="buff-setting-lbl">타입</div>
          <select onchange="onSettingBuff('${key}','type',this.value)">${settingTypeOptions(cfg.type)}</select>
        </div>
        <div class="buff-setting-cell">
          <select onchange="onSettingBuff('${key}','stat2',this.value)">${settingStatOptions(cfg.stat2)}</select>
        </div>
      </div>
    </div>`;
}

function renderSettingBuffs(){
  if(!S.settingBuffs)S.settingBuffs=mkSettingBuffs();
  S.settingBuffs={...mkSettingBuffs(),...S.settingBuffs};
  const el=document.getElementById('setting-buffs');
  if(!el)return;
  el.innerHTML=`<div class="buff-setting-grid">${settingBuffPanel('buff','버프')}${settingBuffPanel('debuff','디버프')}</div>`;
}

function onSettingBuff(key,field,val){
  if(!S.settingBuffs)S.settingBuffs=mkSettingBuffs();
  S.settingBuffs[key][field]=val;
  renderSettingBuffs();
  qSave();
}

// ================================================================
// UI - 컬렉션
// ================================================================
function populateColl(){
  document.getElementById('coll-hp').value=S.coll.hp||0;
  document.getElementById('coll-atk').value=S.coll.atk||0;
  document.getElementById('coll-def').value=S.coll.def||0;
}

function onColl(stat,val,el){const n=Math.max(0,parseInt(val)||0);S.coll[stat]=n;if(el&&el.value==='')el.value=0;qSave();}

function setFullCollection(){
  S.coll={hp:240,atk:60,def:60};
  populateColl();
  resetSimResult();
  qSave();
}

// ================================================================
// 탭 / 시뮬 설정 컨트롤
// ================================================================
function switchTab(t){
  if(t==='spec'){try{renderSpecView();}catch(e){}}
  ['spec','dragon','sim'].forEach(x=>{
    const c=document.getElementById('tab-'+x); if(c)c.classList.toggle('active',x===t);
    const bt=document.getElementById('tab-btn-'+x); if(bt)bt.classList.toggle('active',x===t);
  });
  const pane=document.getElementById('setpane');
  if(pane)pane.style.display=(t==='sim')?'':'none';
  if(window.UI&&UI.task&&!switchTab._q){switchTab._q=1;UI.task(t);switchTab._q=0;}
}

function setGrade(g){
  simGrade=g;
  document.querySelectorAll('#grd-grp button').forEach(b=>b.classList.toggle('active',b.textContent===g));
}

function setBuf(b){
  simBuf=b;
  document.querySelectorAll('#buf-grp button').forEach(btn=>btn.classList.toggle('active',Number(btn.getAttribute('onclick').match(/\d+/)[0])===b));
}

// ================================================================
// 시뮬레이션 엔진
// ================================================================

// 보유 젬을 풀(pool)로 변환. 각 원소: {s:스탯, lv:단계, cnt:보유수, h:체기여, a:공기여, d:방기여}
function buildPool(){
  const pool=[];
  for(const s of SKEYS)for(const lv of [37,38,39,40]){
    const cnt=S.gems[s]?.[lv]||0;
    if(cnt>0)pool.push({s,lv,cnt,h:s==='hp'?GEM[lv].hp:0,a:s==='atk'?GEM[lv].atk:0,d:s==='def'?GEM[lv].def:0});
  }
  for(const s of SKEYS){
    const lv=FALLBACK_GEM_LV;
    pool.push({s,lv,cnt:FALLBACK_GEM_COUNT,h:s==='hp'?GEM[lv].hp:0,a:s==='atk'?GEM[lv].atk:0,d:s==='def'?GEM[lv].def:0});
  }
  return pool;
}

// 5슬롯 젬 배분 경우의 수 열거 (백트래킹). 반환: [[각 풀 원소 사용 개수], ...]
function genAllocs(pool,slots,includePartial=false){
  const total=pool.reduce((s,g)=>s+g.cnt,0);
  const maxS=Math.min(slots,total);
  const res=[];
  const cur=new Array(pool.length).fill(0);
  function bt(i,rem){
    if(i===pool.length){if(rem===0)res.push([...cur]);return;}
    for(let k=0;k<=Math.min(pool[i].cnt,rem);k++){cur[i]=k;bt(i+1,rem-k);}
  }
  if(includePartial){
    res.push(new Array(pool.length).fill(0));
    for(let use=1;use<=maxS;use++)bt(0,use);
  }else if(maxS>0)bt(0,maxS);
  if(!res.length)res.push(new Array(pool.length).fill(0));
  return res;
}

function gemAllocKey(alloc){
  return alloc.join(',');
}

function gemAllocShape(pool,alloc){
  return SKEYS.map(stat=>alloc.reduce((sum,n,i)=>sum+(pool[i].s===stat?n:0),0)).join('/');
}

function gemAllocScore(pool,alloc){
  return alloc.reduce((sum,n,i)=>sum+n*(pool[i].h+pool[i].a+pool[i].d),0);
}

function maxGemLevel(pool,alloc){
  let max=0;
  alloc.forEach((n,i)=>{if(n>0)max=Math.max(max,pool[i].lv);});
  return max;
}

function getBaselineGemLv(stat,totalNeed=15){
  let sum=0;
  for(const lv of [40,39,38,37]){
    sum+=S.gems[stat]?.[lv]||0;
    if(sum>=totalNeed)return lv;
  }
  return FALLBACK_GEM_LV;
}

function buildBaselineGemPool(totalNeed=15){
  return SKEYS.map(s=>{
    const lv=getBaselineGemLv(s,totalNeed);
    return {s,lv,cnt:totalNeed,h:s==='hp'?GEM[lv].hp:0,a:s==='atk'?GEM[lv].atk:0,d:s==='def'?GEM[lv].def:0};
  });
}

function allocRawToItems(pool,alloc){
  const items=[];
  alloc.forEach((k,i)=>{
    for(let n=0;n<k;n++){
      const g=pool[i];
      items.push({s:g.s,lv:g.lv,h:g.h,a:g.a,d:g.d});
    }
  });
  return items;
}

function compressGemItems(items){
  const groups=new Map();
  items.forEach(g=>{
    const key=`${g.s}|${g.lv}`;
    groups.set(key,{k:(groups.get(key)?.k||0)+1,g});
  });
  return [...groups.values()].sort((a,b)=>{
    const so=SKEYS.indexOf(a.g.s)-SKEYS.indexOf(b.g.s);
    return so||b.g.lv-a.g.lv;
  });
}

function applyGemItems(opt,items){
  let gH=0,gA=0,gD=0;
  items.forEach(g=>{gH+=g.h;gA+=g.a;gD+=g.d;});
  const c=opt._calc;
  opt.fH=calcStat(c.bh,gH,24,c.aH,c.sPct.hp,c.pH,c.sP.hp,c.sB.hp,c.coll.hp,c.netBufH??c.bufH);
  opt.fA=calcStat(c.ba,gA,6,c.aA,c.sPct.atk,c.pA,c.sP.atk,c.sB.atk,c.coll.atk,c.netBufA??c.bufA);
  opt.fD=calcStat(c.bd,gD,6,c.aD,c.sPct.def,c.pD,c.sP.def,c.sB.def,c.coll.def,c.netBufD??c.bufD);
  opt.bv=opt.fH*opt.fA*opt.fD;
  opt.alloc=compressGemItems(items);
}

function getUpgradeGemTokens(){
  const tokens=[];
  for(const s of SKEYS){
    const base=getBaselineGemLv(s);
    for(const lv of [40,39,38,37]){
      if(lv<=base)continue;
      const cnt=S.gems[s]?.[lv]||0;
      for(let i=0;i<cnt;i++)tokens.push({s,lv,h:s==='hp'?GEM[lv].hp:0,a:s==='atk'?GEM[lv].atk:0,d:s==='def'?GEM[lv].def:0});
    }
  }
  return tokens.sort((a,b)=>b.lv-a.lv);
}

function applyBestGemUpgrades(deck){
  deck.forEach(opt=>{opt._gemItems=allocRawToItems(opt._pool,opt.allocRaw);});
  for(const token of getUpgradeGemTokens()){
    let best=null;
    deck.forEach((opt,oi)=>{
      opt._gemItems.forEach((cur,gi)=>{
        if(cur.s!==token.s||cur.lv>=token.lv)return;
        const before=opt.bv;
        const test=[...opt._gemItems];
        test[gi]=token;
        let gH=0,gA=0,gD=0;
        test.forEach(g=>{gH+=g.h;gA+=g.a;gD+=g.d;});
        const c=opt._calc;
        const fH=calcStat(c.bh,gH,24,c.aH,c.sPct.hp,c.pH,c.sP.hp,c.sB.hp,c.coll.hp,c.netBufH??c.bufH);
        const fA=calcStat(c.ba,gA,6,c.aA,c.sPct.atk,c.pA,c.sP.atk,c.sB.atk,c.coll.atk,c.netBufA??c.bufA);
        const fD=calcStat(c.bd,gD,6,c.aD,c.sPct.def,c.pD,c.sP.def,c.sB.def,c.coll.def,c.netBufD??c.bufD);
        const bv=fH*fA*fD;
        const gain=typeof guildScore==='function'?guildScore(opt,bv)-guildScore(opt,before):bv-before;
        const bvGain=bv-before;
        if(bvGain>0&&(!best||gain>best.gain||(gain===best.gain&&bvGain>best.bvGain)))best={gain,bvGain,oi,gi,token};
      });
    });
    if(best){
      deck[best.oi]._gemItems[best.gi]=best.token;
      applyGemItems(deck[best.oi],deck[best.oi]._gemItems);
    }
  }
  deck.forEach(opt=>delete opt._gemItems);
  return deck.sort((a,b)=>typeof guildCompare==='function'?guildCompare(a,b):b.bv-a.bv);
}

function genDiverseGemAllocs(pool,slots,perShapeLimit=24){
  const all=genAllocs(pool,slots,true);
  const groups=new Map();
  all.forEach(alloc=>{
    const shape=gemAllocShape(pool,alloc);
    if(!groups.has(shape))groups.set(shape,[]);
    groups.get(shape).push(alloc);
  });
  const seen=new Set();
  const result=[];
  groups.forEach(list=>{
    list.sort((a,b)=>gemAllocScore(pool,b)-gemAllocScore(pool,a));
    const picks=[...list.slice(0,perShapeLimit)];
    [40,39,38,37].forEach(lv=>{
      const capped=list.find(alloc=>maxGemLevel(pool,alloc)<=lv);
      if(capped)picks.push(capped);
    });
    picks.forEach(alloc=>{
      const key=gemAllocKey(alloc);
      if(seen.has(key))return;
      seen.add(key);
      result.push(alloc);
    });
  });
  return result;
}

function optKey(opt){
  return `${opt.accId}|${opt.pendId??'none'}|${opt.enc}|${opt.allocRaw.join(',')}`;
}

function mergeOptionGroups(groups,limit){
  const seen=new Set();
  const merged=[];
  groups.forEach(group=>{
    group
      .filter(Boolean)
      .sort((a,b)=>b.bv-a.bv)
      .forEach(opt=>{
        const key=optKey(opt);
        if(seen.has(key))return;
        seen.add(key);
        merged.push(opt);
      });
  });
  return merged.sort((a,b)=>b.bv-a.bv);
}

/*
 * 최종스탯 계산 공식 (게임 수식 그대로 INT = 버림):
 *   A = base + gem + potion
 *   B = INT(A * (1 + acc% + enc%))
 *   C = INT(B * (1 + spirit%) + spiritPlus * (1 + spirit%))   ← 본체와 정령 고정값을 합쳐 한 번만 버림
 *   D = INT(C * (1 + pendant%))
 *   buf = INT(bufLevel * base * 0.20)
 *   finalStat = D + spiritBonus + collection + buf            ← 부가옵은 펜던트를 곱하지 않습니다
 */
const INT=x=>Math.floor(x+1e-9);
function calcStat(B,G,P,AP,SP,PP,SL,SB,C,BU){
  const a=INT((B+G+P)*(1+AP));
  const b=INT(a*(1+SP)+SL*(1+SP));
  const c=INT(b*(1+PP));
  return c+SB+C+BU;
}

// 정령 상태를 스탯별 + / % / 부가옵 기여로 변환
function procSpirit(){
  const sp=S.spirit;
  const lv=5;
  const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0},bonus={hp:0,atk:0,def:0};
  for(let i=0;i<4;i++){
    if(i+1>lv)continue;
    const o=sp.opts[i];
    if(!o||!o.stat||!o.type)continue;
    if(o.type==='+')plus[o.stat]+=SP_PLUS[o.stat][i+1];
    else if(o.type==='%')pct[o.stat]+=SP_PCT[i+1];
  }
  if(sp.bonus&&SP_BONUS[sp.bonus])bonus[sp.bonus]=SP_BONUS[sp.bonus];
  return{plus,pct,bonus};
}

function getBufCombos(bufLv){
  if(bufLv===0)return[{h:0,a:0,d:0,w:1,label:'버프 없음'}];
  if(bufLv===1)return[
    {h:1,a:0,d:0,w:1/3,label:'체'},
    {h:0,a:1,d:0,w:1/3,label:'공'},
    {h:0,a:0,d:1,w:1/3,label:'방'},
  ];
  return[
    {h:2,a:0,d:0,w:1/9,label:'체+체'},
    {h:1,a:1,d:0,w:2/9,label:'체+공'},
    {h:1,a:0,d:1,w:2/9,label:'체+방'},
    {h:0,a:2,d:0,w:1/9,label:'공+공'},
    {h:0,a:1,d:1,w:2/9,label:'공+방'},
    {h:0,a:0,d:2,w:1/9,label:'방+방'},
  ];
}

function switchResTab(t){
  ['top','avg'].forEach(x=>{
    const res=document.getElementById('res-'+x);
    const btn=document.getElementById('res-tab-btn-'+x);
    if(res)res.style.display=x===t?'':'none';
    if(btn)btn.classList.toggle('active',x===t);
  });
}

function runSim(){
  if(document.getElementById('sim-btn').disabled)return;
  {const _e=document.getElementById('res-sec-empty');if(_e)_e.style.display='none';}
  const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
  const ownedAcc=S.accCards
    .map((c,i)=>({...ACC_DB.find(a=>a.n===c.name),_accId:i,_enc:encMode==='infinite'?'none':c.enchant}))
    .filter(a=>a.n);
  if(!ownedAcc.length){alert('내 스펙 탭에서 장신구를 1개 이상 추가하세요.');return;}
  const btn=document.getElementById('sim-btn');
  CalcProgress.start();
  setTimeout(async()=>{
    let completed=false;
    try{
      const excSun=false;
      const includeDebuff=document.getElementById('include-debuff')?.checked||false;
      const candidates=getSimDragonCandidates();
      if(!candidates.length)throw new Error('내 용 정보에 계산 가능한 용이 없습니다.');
      const filtered=includeDebuff?candidates:candidates.filter(d=>!isDebuffedDragon(d));
      if(!filtered.length)throw new Error('디버프를 받지 않는 용이 없습니다.');
      if(filtered.length<3)throw new Error('디버프 제외 후 계산 가능한 용이 3마리 미만입니다.');
      const deck=await doSimDeck(ownedAcc,filtered,excSun,(p,stage)=>CalcProgress.update(p,stage));
      if(deck.length<3)throw new Error('장신구/펜던트/젬 중복 제한을 만족하는 3마리 조합을 찾지 못했습니다.');
      renderResDeck(deck,includeDebuff?0:candidates.length-filtered.length);
      const rs=document.getElementById('res-sec');
      rs.style.display='';
      rs.scrollIntoView({behavior:'smooth',block:'start'});
      completed=true;
      await afterSimComplete(deck);
    }catch(e){console.error(e);alert('오류: '+e.message);}
    CalcProgress.finish(completed);
  },20);
}

function getPends(excSun){
  const raw=[null,...S.pendants.map((p,i)=>({...p,_pendId:i}))];
  const filtered=excSun?raw.filter(p=>!p||p.type!=='태양'):raw;
  return filtered.length?filtered:[null];
}

function calcPendPct(pend){
  let pH=0,pA=0,pD=0;
  if(pend){
    const mo=pend.type==='태양'?3:pend.type==='달'?2:1;
    pend.options.slice(0,mo).forEach(o=>{
      if(!o||!o.stat)return;
      const v=(o.val||0)/100;
      if(o.stat==='hp')pH+=v;else if(o.stat==='atk')pA+=v;else pD+=v;
    });
  }
  return{pH,pA,pD};
}

function procSpiritFrom(sp){
  const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0},bonus={hp:0,atk:0,def:0};
  const opts=sp?.opts||[];
  for(let i=0;i<4;i++){
    const o=opts[i];
    if(!o||!o.stat||!o.type)continue;
    if(o.type==='+')plus[o.stat]+=SP_PLUS[o.stat][i+1];
    else if(o.type==='%')pct[o.stat]+=SP_PCT[i+1];
  }
  if(sp?.bonus&&SP_BONUS[sp.bonus])bonus[sp.bonus]=SP_BONUS[sp.bonus];
  return{plus,pct,bonus};
}

function getSimDragonCandidates(){
  normalizeDragonCards();
  const dragons=[];
  DRAGON_CATS.forEach(attr=>{
    (S.dragonCards?.[attr]||[]).forEach((card,idx)=>{
      if(!card.name||!card.dtype||!BASE[card.grade]?.[card.dtype])return;
      dragons.push({...card,attr,idx});
    });
  });
  return dragons;
}

function receivesWeeklyEffect(dragon,cfg){
  if(!dragon||!cfg)return false;
  return dragon.attr===cfg.attr||dragon.dtype===cfg.type;
}

function isDebuffedDragon(dragon){
  return receivesWeeklyEffect(dragon,S.settingBuffs?.debuff);
}

function getDragonBuffCounts(dragon){
  const counts={hp:0,atk:0,def:0};
  const cfg=S.settingBuffs?.buff;
  if(!dragon||!cfg)return counts;
  if(dragon.attr===cfg.attr&&counts[cfg.stat1]!=null)counts[cfg.stat1]++;
  if(dragon.dtype===cfg.type&&counts[cfg.stat2]!=null)counts[cfg.stat2]++;
  return counts;
}

function getDragonDebuffCounts(dragon){
  const counts={hp:0,atk:0,def:0};
  const cfg=S.settingBuffs?.debuff;
  if(!dragon||!cfg)return counts;
  if(dragon.attr===cfg.attr&&counts[cfg.stat1]!=null)counts[cfg.stat1]++;
  if(dragon.dtype===cfg.type&&counts[cfg.stat2]!=null)counts[cfg.stat2]++;
  return counts;
}

async function doSimDeck(ownedAcc,dragons,excSun,onProgress=()=>{}){
  const pool=buildBaselineGemPool(15);
  const allocs=genAllocs(pool,5,true);
  const pends=getPends(excSun);
  const coll=S.coll;
  const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
  const optionLimit=80;
  const dragonOptionSets=[];
  const total=dragons.length*ownedAcc.length*(encMode==='infinite'?3:1)*pends.length*allocs.length;
  let done=0,lastYield=performance.now();
  onProgress(0,'장비 조합 계산');await new Promise(r=>setTimeout(r,0));

  for(const dragon of dragons){
    const {plus:sP,pct:sPct,bonus:sB}=procSpiritFrom(dragon);
    const bs=BASE[dragon.grade][dragon.dtype];
    const bh=bs.hp,ba=bs.atk,bd=bs.def;
    const buff=getDragonBuffCounts(dragon);
    const bufH=Math.floor(buff.hp*bh*.2);
    const bufA=Math.floor(buff.atk*ba*.2);
    const bufD=Math.floor(buff.def*bd*.2);
    const debuff=getDragonDebuffCounts(dragon);
    const debufH=Math.floor(debuff.hp*bh*.2);
    const debufA=Math.floor(debuff.atk*ba*.2);
    const debufD=Math.floor(debuff.def*bd*.2);
    const netBufH=bufH-debufH, netBufA=bufA-debufA, netBufD=bufD-debufD;
    let options=[];
    const bestByAcc=new Map();
    const bestByPend=new Map();
    const bestByAccPend=new Map();
    const bestByResourceShape=new Map();
    let minBV=-Infinity;

    for(const acc of ownedAcc){
      const encs=encMode==='infinite'?['hp','atk','def']:[acc._enc||'none'];
      for(const enc of encs){
        const aH=acc.hp+(enc==='hp'?.21:0);
        const aA=acc.atk+(enc==='atk'?.21:0);
        const aD=acc.def+(enc==='def'?.21:0);
        for(const pend of pends){
          const{pH,pA,pD}=calcPendPct(pend);
          for(const alloc of allocs){
            if((++done&1023)===0&&performance.now()-lastYield>=100){onProgress(80*done/Math.max(1,total),'장비 조합 계산');await CalcProgress.yield();lastYield=performance.now();}
            let gH=0,gA=0,gD=0;
            for(let i=0;i<alloc.length;i++){gH+=alloc[i]*pool[i].h;gA+=alloc[i]*pool[i].a;gD+=alloc[i]*pool[i].d;}
            const fH=calcStat(bh,gH,24,aH,sPct.hp,pH,sP.hp,sB.hp,coll.hp,netBufH);
            const fA=calcStat(ba,gA,6,aA,sPct.atk,pA,sP.atk,sB.atk,coll.atk,netBufA);
            const fD=calcStat(bd,gD,6,aD,sPct.def,pD,sP.def,sB.def,coll.def,netBufD);
            const bv=fH*fA*fD;
            const opt={
              bv,dragon,accN:acc.n,accId:acc._accId,enc,pend,pendId:pend?pend._pendId:null,
              allocRaw:[...alloc],alloc:alloc.map((k,i)=>({k,g:pool[i]})).filter(x=>x.k>0),
              fH,fA,fD,buff,debuff,_pool:pool,_calc:{bh,ba,bd,aH,aA,aD,pH,pA,pD,sPct,sP,sB,coll,bufH,bufA,bufD,debufH,debufA,debufD,netBufH,netBufA,netBufD}
            };
            if(!bestByAcc.has(acc._accId)||opt.bv>bestByAcc.get(acc._accId).bv)bestByAcc.set(acc._accId,opt);
            const pendKey=pend?pend._pendId:'none';
            const pairKey=`${acc._accId}|${pendKey}`;
            if(!bestByPend.has(pendKey)||opt.bv>bestByPend.get(pendKey).bv)bestByPend.set(pendKey,opt);
            if(!bestByAccPend.has(pairKey)||opt.bv>bestByAccPend.get(pairKey).bv)bestByAccPend.set(pairKey,opt);
            const gemCount=opt.allocRaw.reduce((s,n)=>s+n,0);
            const gemByStat=SKEYS.map(stat=>opt.allocRaw.reduce((sum,n,i)=>sum+(pool[i].s===stat?n:0),0)).join('/');
            const gemLvSig=opt.allocRaw.map((n,i)=>n?`${pool[i].s}${pool[i].lv}:${n}`:'').filter(Boolean).join(',');
            const shapeKey=`${acc._accId}|${pend?pend._pendId:'none'}|${enc}|${gemCount}|${gemByStat}|${gemLvSig}`;
            if(!bestByResourceShape.has(shapeKey)||opt.bv>bestByResourceShape.get(shapeKey).bv)bestByResourceShape.set(shapeKey,opt);
            if(opt.bv>minBV||options.length<optionLimit){
              let lo=0,hi=options.length;
              while(lo<hi){const m=(lo+hi)>>1;if(options[m].bv>=opt.bv)lo=m+1;else hi=m;}
              options.splice(lo,0,opt);
              if(options.length>optionLimit)options.pop();
              minBV=options.length===optionLimit?options[optionLimit-1].bv:-Infinity;
            }
          }
        }
      }
    }
    if(options.length){
      const topOptions=[...options].sort((a,b)=>b.bv-a.bv).slice(0,optionLimit);
      options=mergeOptionGroups([
        topOptions,
        [...bestByAcc.values()],
        [...bestByPend.values()],
        [...bestByAccPend.values()],
        [...bestByResourceShape.values()].sort((a,b)=>b.bv-a.bv).slice(0,optionLimit)
      ],optionLimit*3);
      dragonOptionSets.push({dragon,options,bestBV:options[0].bv});
    }
  }

  dragonOptionSets.sort((a,b)=>b.bestBV-a.bestBV);
  onProgress(80,'3마리 조합 탐색');
  const deck=await findBestDeck(dragonOptionSets,pool,onProgress);
  return deck.length?applyBestGemUpgrades(deck):deck;
}

function deckOptionsCompatible(a,b,pool){
  if(a.accId===b.accId)return false;
  if(a.pendId!=null&&a.pendId===b.pendId)return false;
  for(let i=0;i<pool.length;i++){
    if((a.allocRaw[i]||0)+(b.allocRaw[i]||0)>pool[i].cnt)return false;
  }
  return true;
}

function deckCanAdd(deck,opt,pool){
  const gemUse=new Array(pool.length).fill(0);
  for(const cur of deck){
    if(cur.accId===opt.accId)return false;
    if(cur.pendId!=null&&opt.pendId!=null&&cur.pendId===opt.pendId)return false;
    for(let i=0;i<pool.length;i++)gemUse[i]+=cur.allocRaw[i]||0;
  }
  for(let i=0;i<pool.length;i++){
    if(gemUse[i]+(opt.allocRaw[i]||0)>pool[i].cnt)return false;
  }
  return true;
}

async function findBestDeck(dragonOptionSets,pool,onProgress=()=>{}){
  const score=r=>typeof guildScore==='function'?guildScore(r):r.bv;
  const sets=dragonOptionSets.map(s=>({...s,options:s.options.slice().sort((a,b)=>score(b)-score(a)||b.bv-a.bv)}));
  let bestDeck=[],bestScore=-Infinity,bestBV=-Infinity;
  const totalTriples=sets.length*(sets.length-1)*(sets.length-2)/6;let done=0,steps=0,lastYield=0;
  const cannotBeat=(scoreSum,bvSum)=>scoreSum<bestScore||(scoreSum===bestScore&&bvSum<=bestBV);
  for(let i=0;i<sets.length-2;i++)for(let j=i+1;j<sets.length-1;j++)for(let k=j+1;k<sets.length;k++){
    if((done&31)===0&&performance.now()-lastYield>=100){onProgress(80+19*done/Math.max(1,totalTriples),'3마리 조합 탐색');await CalcProgress.yield();lastYield=performance.now();}
    done++;
    const A=sets[i].options,B=sets[j].options,C=sets[k].options;
    if(cannotBeat(score(A[0])+score(B[0])+score(C[0]),A[0].bv+B[0].bv+C[0].bv))continue;
    for(const a of A){
      if(cannotBeat(score(a)+score(B[0])+score(C[0]),a.bv+B[0].bv+C[0].bv))break;
      for(const b of B){
        if(cannotBeat(score(a)+score(b)+score(C[0]),a.bv+b.bv+C[0].bv))break;
        if(!deckOptionsCompatible(a,b,pool))continue;
        for(const c of C){
          if((++steps&4095)===0&&performance.now()-lastYield>=100){onProgress(80+19*(done-1)/Math.max(1,totalTriples),'3마리 조합 탐색');await CalcProgress.yield();lastYield=performance.now();}
          const total=score(a)+score(b)+score(c),bv=a.bv+b.bv+c.bv;
          if(cannotBeat(total,bv))break;
          if(!deckCanAdd([a,b],c,pool))continue;
          bestScore=total;bestBV=bv;bestDeck=[a,b,c].sort((x,y)=>score(y)-score(x)||y.bv-x.bv);
        }
      }
    }
  }
  return bestDeck;
}

function doSimTop(ownedAcc,bufCombos,excSun){
  const {plus:sP,pct:sPct,bonus:sB}=procSpirit();
  const pool=buildPool();
  const allocs=genAllocs(pool,5);
  const pends=getPends(excSun);
  const coll=S.coll;
  const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
  const top10=[];
  let minBV=-Infinity;

  for(const dt of DTYPES){
    const bs=BASE[simGrade][dt];
    const bh=bs.hp,ba=bs.atk,bd=bs.def;
    for(const acc of ownedAcc){
      const encs=encMode==='infinite'?['hp','atk','def']:[acc._enc||'none'];
      for(const enc of encs){
        const aH=acc.hp+(enc==='hp'?.21:0);
        const aA=acc.atk+(enc==='atk'?.21:0);
        const aD=acc.def+(enc==='def'?.21:0);
        for(const pend of pends){
          const{pH,pA,pD}=calcPendPct(pend);
          for(const alloc of allocs){
            let gH=0,gA=0,gD=0;
            for(let i=0;i<alloc.length;i++){gH+=alloc[i]*pool[i].h;gA+=alloc[i]*pool[i].a;gD+=alloc[i]*pool[i].d;}
            for(const buf of bufCombos){
              const bufH=Math.floor(buf.h*bh*.2);
              const bufA=Math.floor(buf.a*ba*.2);
              const bufD=Math.floor(buf.d*bd*.2);
              const fH=calcStat(bh,gH,24,aH,sPct.hp,pH,sP.hp,sB.hp,coll.hp,bufH);
              const fA=calcStat(ba,gA,6,aA,sPct.atk,pA,sP.atk,sB.atk,coll.atk,bufA);
              const fD=calcStat(bd,gD,6,aD,sPct.def,pD,sP.def,sB.def,coll.def,bufD);
              const bv=fH*fA*fD;
              if(bv>minBV||top10.length<10){
                let lo=0,hi=top10.length;
                while(lo<hi){const m=(lo+hi)>>1;if(top10[m].bv>=bv)lo=m+1;else hi=m;}
                top10.splice(lo,0,{bv,dt,accN:acc.n,enc,pend,buf,alloc:alloc.map((k,i)=>({k,g:pool[i]})).filter(x=>x.k>0),fH,fA,fD});
                if(top10.length>10)top10.pop();
                minBV=top10.length===10?top10[9].bv:-Infinity;
              }
            }
          }
        }
      }
    }
  }
  return top10;
}

//시뮬레이션 실행 관련
function doSimAvg(ownedAcc,bufCombos,excSun){
  const {plus:sP,pct:sPct,bonus:sB}=procSpirit();
  const pool=buildPool();
  const allocs=genAllocs(pool,5);
  const pends=getPends(excSun);
  const coll=S.coll;
  const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
  const results=[];

  for(const dt of DTYPES){
    const bs=BASE[simGrade][dt];
    const bh=bs.hp,ba=bs.atk,bd=bs.def;
    const bufResults=[];

    for(const buf of bufCombos){
      const bufH=Math.floor(buf.h*bh*.2);
      const bufA=Math.floor(buf.a*ba*.2);
      const bufD=Math.floor(buf.d*bd*.2);
      const top5=[];
      let minBV=-Infinity;

      for(const acc of ownedAcc){
        const encs=encMode==='infinite'?['hp','atk','def']:[acc._enc||'none'];
        for(const enc of encs){
          const aH=acc.hp+(enc==='hp'?.21:0);
          const aA=acc.atk+(enc==='atk'?.21:0);
          const aD=acc.def+(enc==='def'?.21:0);
          for(const pend of pends){
            const{pH,pA,pD}=calcPendPct(pend);
            for(const alloc of allocs){
              let gH=0,gA=0,gD=0;
              for(let i=0;i<alloc.length;i++){gH+=alloc[i]*pool[i].h;gA+=alloc[i]*pool[i].a;gD+=alloc[i]*pool[i].d;}
              const fH=calcStat(bh,gH,24,aH,sPct.hp,pH,sP.hp,sB.hp,coll.hp,bufH);
              const fA=calcStat(ba,gA,6,aA,sPct.atk,pA,sP.atk,sB.atk,coll.atk,bufA);
              const fD=calcStat(bd,gD,6,aD,sPct.def,pD,sP.def,sB.def,coll.def,bufD);
              const bv=fH*fA*fD;
              if(bv>minBV||top5.length<5){
                let lo=0,hi=top5.length;
                while(lo<hi){const m=(lo+hi)>>1;if(top5[m].bv>=bv)lo=m+1;else hi=m;}
                top5.splice(lo,0,{bv,accN:acc.n,enc,pend,alloc:alloc.map((k,i)=>({k,g:pool[i]})).filter(x=>x.k>0),fH,fA,fD});
                if(top5.length>5)top5.pop();
                minBV=top5.length===5?top5[4].bv:-Infinity;
              }
            }
          }
        }
      }
      bufResults.push({label:buf.label,w:buf.w,top5,bestBV:top5.length?top5[0].bv:0});
    }

    bufResults.sort((a,b)=>b.bestBV-a.bestBV);
    const avgBV=bufResults.reduce((s,b)=>s+b.w*b.bestBV,0);
    const peakBV=bufResults[0].bestBV;
    const bottomBV=bufResults[bufResults.length-1].bestBV;
    results.push({dt,avgBV,peakBV,bottomBV,bufResults});
  }

  results.sort((a,b)=>b.avgBV-a.avgBV);
  return results;
}

const STAT_COL={체:'#fbbf24',공:'#f87171',방:'#60a5fa'};
function fmtBufLabel(label){
  if(label==='버프 없음')return`<span style="color:var(--dim)">버프 없음</span>`;
  return label.split('+').map((s,i)=>{
    const trimmed=s.trim();
    const col=STAT_COL[trimmed]||'var(--text)';
    return(i>0?`<span style="color:var(--text)">+</span>`:'')
      +`<span style="color:${col};font-weight:700">${trimmed}</span>`;
  }).join('');
}

function fmtAccName(name){
  const colored=name.replace(/[체공방]/g,s=>{
    const col=s==='체'?'#fbbf24':s==='공'?'#f87171':'#60a5fa';
    return`<span style="color:${col}">${s}</span>`;
  });
  const shortMatch=name.match(/\(([^)]+)\)\s*(\d+)$/);
  const shortName=shortMatch?shortMatch[1]+' '+shortMatch[2]:name;
  const shortColored=shortName.replace(/[체공방]/g,s=>{
    const col=s==='체'?'#fbbf24':s==='공'?'#f87171':'#60a5fa';
    return`<span style="color:${col}">${s}</span>`;
  });
  return`<span class="acc-name-full">${colored}</span><span class="acc-name-short">${shortColored}</span>`;
}

function fmtAccEnc(enc){
  if(enc==='none')return'<span class="enc-b enc-none">없음</span>';
  const col=enc==='hp'?'#fbbf24':enc==='atk'?'#f87171':'#60a5fa';
  const lbl=enc==='hp'?'체':enc==='atk'?'공':'방';
  return`<span class="enc-b" style="border-color:${col};color:${col}">${lbl} +21%</span>`;
}

//최고 비밸 결과 출력
function renderResTop(top10){
  const el=document.getElementById('res-body-top');
  if(!top10.length){el.innerHTML='<div style="padding:30px;text-align:center;color:var(--dim)">결과 없음</div>';return;}
  const medals=['<span class="rank-n rk1">1</span>','<span class="rank-n rk2">2</span>','<span class="rank-n rk3">3</span>'];
  let html=`<table class="rtbl"><thead><tr>
    <th>순위</th><th>타입</th><th>장신구 / 인챈트</th>
    <th>젬 배분</th><th>펜던트</th><th>버프</th><th>체 / 공 / 방</th><th>비밸</th>
  </tr></thead><tbody>`;
  top10.forEach((r,i)=>{
    const rank=i<3?medals[i]:`<span class="rank-n">${i+1}</span>`;
    const dc=DCOLORS[r.dt];
    html+=`<tr>
      <td>${rank}</td>
      <td><span class="dtype-b" style="color:${dc};border-color:${dc}">${r.dt}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          ${(()=>{const a=ACC_DB.find(x=>x.n===r.accN);return a&&a.img?`<img src="${a.img}" style="width:36px;height:36px;object-fit:contain;border-radius:4px">`:'';})()}
          <div><div style="font-weight:800;margin-bottom:3px">${fmtAccName(r.accN)}</div>${fmtAccEnc(r.enc)}</div>
        </div>
      </td>
      <td><div class="gem-tags">${fmtGem(r.alloc)}</div></td>
      <td style="font-size:12px;color:var(--dim)">${fmtPend(r.pend)}</td>
      <td style="font-size:12px">${fmtBufLabel(r.buf.label)}</td>
      <td class="st-cell">
        <span style="color:var(--hpc)">${r.fH.toLocaleString('ko-KR')}</span> /
        <span style="color:var(--atc)">${r.fA.toLocaleString('ko-KR')}</span> /
        <span style="color:var(--dfc)">${r.fD.toLocaleString('ko-KR')}</span>
      </td>
      <td class="bv-cell">${(r.bv/1e6).toFixed(1)}</td>
    </tr>`;
  });
  el.innerHTML=html+'</tbody></table>';
}

function fmtWeeklyBuff(buff,debuff){
  const SK_LABEL={hp:'체',atk:'공',def:'방'};
  const parts=[];
  // 버프: +스텟
  SKEYS.forEach(s=>{
    const n=buff?.[s]||0;
    if(n>0) parts.push(`<span style="color:var(--gold);font-weight:800">+${SK_LABEL[s]}${n>1?'×'+n:''}</span>`);
  });
  // 너프: -스텟
  SKEYS.forEach(s=>{
    const n=debuff?.[s]||0;
    if(n>0) parts.push(`<span style="color:#f87171;font-weight:800">-${SK_LABEL[s]}${n>1?'×'+n:''}</span>`);
  });
  return parts.length?parts.join(' '):'<span style="color:var(--dim)">버프 없음</span>';
}


function weeklyStatRows(r){
  const c=r._calc||{};
  return [['hp','체력','H'],['atk','공격','A'],['def','방어','D']].map(([key,label,suffix])=>{
    const after=r['f'+suffix],plus=c['buf'+suffix]||0,minus=c['debuf'+suffix]||0;
    return {key,label,before:after-plus+minus,plus,minus,after};
  });
}
function fmtWeeklyStats(r){
  const fmt=n=>n.toLocaleString('ko-KR');
  return '<div class="weekly-stats">'+weeklyStatRows(r).map(s=>
    '<div class="weekly-stat" data-stat="'+s.key+'"><b>'+s.label+'</b> '+fmt(s.before)+
    ' <span class="weekly-plus">(+'+fmt(s.plus)+')</span> <span class="weekly-minus">(−'+fmt(s.minus)+')</span> → <strong>'+fmt(s.after)+'</strong></div>'
  ).join('')+'</div>';
}
function fmtWeeklyDetails(r){
  return '<details class="weekly-details"><summary>버프 상세</summary><div>각 효과는 해당 등급 기본 스탯의 20%씩 적용됩니다. 버프와 디버프는 각각 소수점을 버린 뒤 더하고 뺍니다.</div>'+weeklyStatRows(r).map(s=>
    '<div>'+s.label+': 버프 '+((r.buff||{})[s.key]||0)+'단계 / 디버프 '+((r.debuff||{})[s.key]||0)+'단계</div>'
  ).join('')+'</details>';
}
function switchGuildMode(mode){
  if(!['pvp','noob'].includes(mode)||mode===GUILD_MODE)return;
  if(saveT)doSave();
  const active=document.querySelector('.tc.active')?.id.replace('tab-','');
  const tab=['spec','dragon','sim'].includes(active)?active:'spec';
  location.href='./'+mode+'.html#'+tab;
}

function renderResDeck(results,excludedCount){
  const el=document.getElementById('res-body-avg');
  if(!results.length){el.innerHTML='<div style="padding:30px;text-align:center;color:var(--dim)">결과 없음</div>';return;}
  let html='';
  if(excludedCount>0){
    html+=`<div style="padding:10px 16px;color:var(--dim);font-size:12px;border-bottom:1px solid var(--bd)">디버프 대상 ${excludedCount}마리는 계산에서 제외했습니다.</div>`;
  }
  html+=`<table class="rtbl"><thead><tr>
    <th>순위</th><th>용</th><th>속성 / 타입</th><th>장신구 / 인챈트</th>
    <th>젬 배분</th><th>펜던트</th><th>버프</th><th>체 / 공 / 방</th><th>비밸</th>
  </tr></thead><tbody>`;
  const medals=['<span class="rank-n rk1">1</span>','<span class="rank-n rk2">2</span>','<span class="rank-n rk3">3</span>'];
  results.forEach((r,i)=>{
    const dc=DCOLORS[r.dragon.dtype];
    const rank=i<3?medals[i]:`<span class="rank-n">${i+1}</span>`;
    const _debuff=r.debuff||{hp:0,atk:0,def:0};
    const _an={'땅':11,'물':12,'불':13,'바람':14,'빛':84,'어둠':87,'황혼':487,'여명':486,'악몽':488};
    const attrImg=`https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/${_an[r.dragon.attr]||11}.png`;
    const _SK={hp:'체력',atk:'공격',def:'방어'};
    const _BL={hp:'체력+40',atk:'공격+10',def:'방어+10'};
    const _opts=r.dragon.opts||[];
    const _fO=(idx)=>{const o=_opts[idx]||{};if(!o.stat||!o.type)return null;return `${_SK[o.stat]}${fmtSpVal(idx+1,o.stat,o.type)}`;};
    const _l1=[_fO(0),_fO(1)].filter(Boolean).join(' / ');
    const _l2p=[_fO(2),_fO(3)].filter(Boolean);
    if(r.dragon.bonus)_l2p.push(`<span style="color:var(--gold)">${_BL[r.dragon.bonus]}</span>`);
    const _l2=_l2p.join(' / ');
    const _SKS={hp:'체',atk:'공',def:'방'};
    const _BLS={hp:'체+40',atk:'공+10',def:'방+10'};
    const _fC=(idx)=>{const o=_opts[idx]||{};if(!o.stat||!o.type)return null;
      const v=o.type==='+'?`+${SP_PLUS[o.stat][idx+1]}`:`+${(SP_PCT[idx+1]*100).toFixed(0)}%`;
      return `<span class="sp-chip sp-${o.stat}">${_SKS[o.stat]}<b>${v}</b></span>`;};
    const _cps=[_fC(0),_fC(1),_fC(2),_fC(3)].filter(Boolean);
    if(r.dragon.bonus)_cps.push(`<span class="sp-chip sp-bonus">${_BLS[r.dragon.bonus]}</span>`);
    const spiritLines=_cps.length?`<div class="sp-chips">${_cps.join('')}</div>`:'<div class="sp-none">정령 없음</div>';
    const accImg=(()=>{const a=ACC_DB.find(x=>x.n===r.accN);return a&&a.img?`<img src="${a.img}" style="width:30px;height:30px;object-fit:contain;border-radius:4px">`:'';})();
    const pendMob=(()=>{
      if(!r.pend)return'<span style="color:var(--dimmer);font-size:11px">펜던트 없음</span>';
      const mo=r.pend.type==='태양'?3:r.pend.type==='달'?2:1;
      const opts=r.pend.options.slice(0,mo).filter(o=>o&&o.stat).map(o=>{
        const col=o.stat==='hp'?'#fbbf24':o.stat==='atk'?'#f87171':'#60a5fa';
        return`<span style="color:${col}">${SK[o.stat]}</span><span>${o.val||0}%</span>`;
      }).join('<span style="color:var(--dim)">/</span>');
      const shortTypeMap={'달':'달펜','태양':'태양펜','별':'별펜'};
      const pimg=IMG_PEND[r.pend.type]?`<img src="${IMG_PEND[r.pend.type]}" style="width:26px;height:26px;object-fit:contain;border-radius:3px">`:'';
      return`<div class="mob-pend">${pimg}<span style="font-size:11px;color:var(--dim)">${shortTypeMap[r.pend.type]||r.pend.type} <small>(${opts})</small></span></div>`;
    })();
    const buffCount=SKEYS.reduce((s,k)=>s+(r.buff?.[k]||0),0);
    html+=`<tr>
      <td class="td-pc">${rank}</td>
      <td class="td-pc">
        <div style="font-weight:800">${escHtml(r.dragon.name)}${r.dragon.growth==='진각'?' <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(167,139,250,.2);color:#a78bfa;font-weight:700;border:1px solid rgba(167,139,250,.4)">진각</span>':''}</div>
        ${spiritLines}
      </td>
      <td class="td-pc">
        <div class="res-attr-type">
          <img class="res-attr-icon" src="${attrImg}" alt="${escHtml(r.dragon.attr)}">
          <span class="dtype-b" style="color:${dc};border-color:${dc}">${r.dragon.dtype}</span>
        </div>
      </td>
      <td class="td-pc">
        <div style="display:flex;align-items:center;gap:8px">
          ${(()=>{const a=ACC_DB.find(x=>x.n===r.accN);return a&&a.img?`<img src="${a.img}" style="width:36px;height:36px;object-fit:contain;border-radius:4px">`:'';})()}
          <div><div style="font-weight:800;margin-bottom:3px">${fmtAccName(r.accN)}</div>${fmtAccEnc(r.enc)}</div>
        </div>
      </td>
      <td class="td-pc"><div class="gem-tags">${fmtGem(r.alloc)}</div></td>
      <td class="td-pc" style="font-size:12px;color:var(--dim)">${fmtPend(r.pend)}</td>
      <td class="td-pc" style="font-size:12px">${fmtWeeklyBuff(r.buff,_debuff)}</td>
      <td class="td-pc st-cell">${r.fH.toLocaleString()} / ${r.fA.toLocaleString()} / ${r.fD.toLocaleString()}
      </td>
      <td class="td-pc bv-cell">${(r.bv/1e6).toFixed(1)}${(()=>{if(typeof fmtTar!=='function')return '';const t=fmtTar(r.bv,r.dragon.dtype,r.buff);return t?`<div class="tar-v" title="${tarLabel(r.buff)} 버프 기준 만점 대비">TAR ${t}</div>`:'';})()}</td>
      <td class="td-mob" colspan="9">
        <div class="mob-row1">
          <span class="mob-rank">${rank}</span>
          <img src="${attrImg}" style="width:20px;height:20px;object-fit:contain">
          <span class="mob-dname">${escHtml(r.dragon.name)}${r.dragon.growth==='진각'?' <span style="font-size:9px;color:#a78bfa;font-weight:700">진각</span>':''}</span>
          <span class="dtype-b" style="color:${dc};border-color:${dc};font-size:11px">${r.dragon.dtype}</span>
          <span class="mob-bv">${(r.bv/1e6).toFixed(1)}${(()=>{if(typeof fmtTar!=='function')return '';const t=fmtTar(r.bv,r.dragon.dtype,r.buff);return t?`<small class="tar-v"> TAR ${t}</small>`:'';})()}</span>
        </div>
        ${_l1?`<div class="mob-spirit">${_l1}</div>`:''}
        ${_l2?`<div class="mob-spirit">${_l2}</div>`:''}
        <div class="mob-divider"></div>
        <div class="mob-row2">
          <div class="mob-acc">
            ${accImg}
            <div>
              <div style="font-weight:800;font-size:12px">${fmtAccName(r.accN)}</div>
              ${fmtAccEnc(r.enc)}
            </div>
          </div>
          <div style="flex:1"><div class="gem-tags">${fmtGem(r.alloc)}</div></div>
        </div>
        <div class="mob-row3">
          ${pendMob}
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            ${fmtWeeklyBuff(r.buff,_debuff)}
            <div class="mob-stats">${fmtWeeklyStats(r)}${fmtWeeklyDetails(r)}</div>

          </div>
        </div>
      </td>
    </tr><tr class="weekly-detail-row"><td class="td-pc" colspan="9"><div class="weekly-wide">${fmtWeeklyStats(r)}${fmtWeeklyDetails(r)}</div></td></tr>`;
  });
  const top3=results.slice(0,3);
  const avgBV=top3.reduce((s,r)=>s+r.bv,0)/top3.length;
  el.innerHTML=html+'</tbody></table>'
    +(top3.length>1?'<div style="padding:10px 16px;border-top:1px solid var(--bd);text-align:right;font-size:13px;color:var(--dim)">3마리 평균 비밸 <span class="bv-cell" style="font-size:15px">'+(avgBV/1e6).toFixed(1)+'</span></div>':'');
}
//평균 비밸 결과 출력
function renderResAvg(results){
  const el=document.getElementById('res-body-avg');
  if(!results.length){el.innerHTML='<div style="padding:30px;text-align:center;color:var(--dim)">결과 없음</div>';return;}
  let html=`<table class="rtbl"><thead><tr>
    <th>타입</th><th>고점</th><th>저점</th><th>평균 비밸</th>
  </tr></thead><tbody>`;
  results.forEach((r,i)=>{
    const dc=DCOLORS[r.dt];
    const peak=r.bufResults[0];
    const bottom=r.bufResults[r.bufResults.length-1];
    html+=`<tr style="cursor:pointer" onclick="toggleAvgDetail(${i})">
      <td>
        <span class="dtype-b" style="color:${dc};border-color:${dc}">${r.dt}</span>
        <span class="avg-arrow" id="avg-arrow-${i}" style="color:var(--text);font-size:10px;margin-left:6px">▼</span>
      </td>
      <td><span class="bv-cell">${(peak.bestBV/1e6).toFixed(1)}</span> (${fmtBufLabel(peak.label)})</td>
      <td><span class="bv-cell">${(bottom.bestBV/1e6).toFixed(1)}</span> (${fmtBufLabel(bottom.label)})</td>
      <td class="bv-cell">${(r.avgBV/1e6).toFixed(1)}</td>
    </tr>
    <tr id="avg-detail-${i}" style="display:none">
      <td colspan="4" style="padding:0">${renderAvgDetail(r)}</td>
    </tr>`;
  });
  el.innerHTML=html+'</tbody></table>';
}

function toggleAvgDetail(i){
  const el=document.getElementById(`avg-detail-${i}`);
  const arrow=document.getElementById('avg-arrow-'+i);
  if(!el)return;
  const open=el.style.display==='none';
  el.style.display=open?'':'none';
  if(arrow)arrow.textContent=open?'▲':'▼';
}

function renderAvgDetail(r){
  let html='<div style="padding:10px 16px;background:var(--sf2)">';
  r.bufResults.forEach(buf=>{
    html+=`<div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:800;margin-bottom:6px"><span class="bv-cell">${(buf.bestBV/1e6).toFixed(1)}</span> (${fmtBufLabel(buf.label)})</div>
      <table class="rtbl" style="min-width:0"><thead><tr>
        <th>순위</th><th>장신구 / 인챈트</th><th>젬 배분</th><th>펜던트</th><th>체 / 공 / 방</th><th>비밸</th>
      </tr></thead><tbody>`;
    const medals=['<span class="rank-n rk1">1</span>','<span class="rank-n rk2">2</span>','<span class="rank-n rk3">3</span>'];
    buf.top5.forEach((item,j)=>{
      const rank=j<3?medals[j]:`<span class="rank-n">${j+1}</span>`;
      const a=ACC_DB.find(x=>x.n===item.accN);
      const accImg=a&&a.img?`<img src="${a.img}" style="width:28px;height:28px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:6px">`:'';
      html+=`<tr>
        <td>${rank}</td>
        <td><div style="display:flex;align-items:center">${accImg}<div><div style="font-weight:800;font-size:12px">${fmtAccName(item.accN)}</div>${fmtAccEnc(item.enc)}</div></div></td>
        <td><div class="gem-tags">${fmtGem(item.alloc)}</div></td>
        <td style="font-size:12px">${fmtPend(item.pend)}</td>
        <td class="st-cell">
          <span style="color:var(--hpc)">${item.fH.toLocaleString('ko-KR')}</span> /
          <span style="color:var(--atc)">${item.fA.toLocaleString('ko-KR')}</span> /
          <span style="color:var(--dfc)">${item.fD.toLocaleString('ko-KR')}</span>
        </td>
        <td class="bv-cell">${(item.bv/1e6).toFixed(1)}</td>
      </tr>`;
    });
    html+='</tbody></table></div>';
  });
  html+='</div>';
  return html;
}

// 젬 배분을 "체2(40,40) 공1(39) 방2(40,38)" 형식으로 포맷
function fmtGem(alloc){
  if(!alloc||!alloc.length)return'<span style="color:var(--dimmer)">없음</span>';
  const bySt={hp:[],atk:[],def:[]};
  alloc.forEach(({k,g})=>{for(let i=0;i<k;i++)bySt[g.s].push(g.lv);});
  const cols={hp:'var(--hpc)',atk:'var(--atc)',def:'var(--dfc)'};
  const parts=[];
  for(const s of SKEYS){
    const lvs=bySt[s].sort((a,b)=>b-a);
    if(lvs.length)parts.push(`<span class="gem-tag" style="color:${cols[s]}">${SK[s]}${lvs.length}(${(()=>{const o=[];lvs.map(l=>GEM_NAME[l]||l).forEach(v=>{
         const t=o[o.length-1]; if(t&&t.v===v)t.n++; else o.push({v,n:1});});
         return o.map(x=>x.n>1?x.v+'×'+x.n:x.v).join(',');})()})</span>`);
  }
  return parts.length?parts.join(''):'<span style="color:var(--dimmer)">없음</span>';
}

// 펜던트 포맷 "태양의 펜던트 (체6%/공4%/방3%)"
function fmtPend(p){
  if(!p)return'<span style="color:var(--dimmer)">없음</span>';
  const mo=p.type==='태양'?3:p.type==='달'?2:1;
  const opts=p.options.slice(0,mo).filter(o=>o&&o.stat).map(o=>{
    const col=o.stat==='hp'?'#fbbf24':o.stat==='atk'?'#f87171':'#60a5fa';
    return`<span style="color:${col}">${SK[o.stat]}</span><span style="color:var(--text)">${o.val||0}%</span>`;
  }).join('<span style="color:var(--dim)"> / </span>');
  const img=IMG_PEND[p.type]?`<img src="${IMG_PEND[p.type]}" style="width:28px;height:28px;object-fit:contain;border-radius:4px">`:'';
  const shortTypeMap={'달':'달펜','태양':'태양펜','별':'별펜'};
  const shortType=shortTypeMap[p.type]||p.type;
  return`<div style="display:flex;align-items:center;gap:8px">${img}<div style="color:var(--text)"><span class="pend-name-full">${p.type}의 펜던트</span><span class="pend-name-short">${shortType}</span><br><small style="font-size:10.5px">(${opts})</small></div></div>`;
}

// ================================================================
// 초기화
// ================================================================
function init(){
  try{doLoad();}catch(e){console.error('doLoad',e);}
  try{renderAcc();}catch(e){}
  try{populateGems();}catch(e){}
  try{renderPends();}catch(e){}
  try{renderSpirit();}catch(e){}
  try{renderDragonInfo();}catch(e){}
  try{renderSettingBuffs();}catch(e){}
  try{populateColl();}catch(e){}
}
document.addEventListener('DOMContentLoaded',function(){init();try{renderSpecView();}catch(e){}});

globalThis.DV1_GUILD_READY=true;
