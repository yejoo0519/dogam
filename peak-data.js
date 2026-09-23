/* Snapshot of calculator.html game constants; no storage or network access. */
(function(){
const TEM_BASE='https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/tem';
const ACC_IMG_MAP={
  '20':{'빛뿔':12,'바뿔':13,'악보':20,'황보':21,'여보':22,'대뿔':1433,'물뿔':1435,'불뿔':1437},
  '19':{'악보':1273,'황보':1274,'여보':1275,'바뿔':1276,'대뿔':1306,'물뿔':1308,'불뿔':1310},
  '18':{'빛뿔':1209,'악보':1205,'황보':1206,'여보':1207,'바뿔':1202,'대뿔':1247,'물뿔':1249,'불뿔':1251},
  '17':{'악보':1102,'황보':1103,'여보':1104,'바뿔':1105,'대뿔':1130,'물뿔':1132,'불뿔':1134},
  '16':{'악보':1046,'황보':1047,'여보':1048,'바뿔':1049,'대뿔':1130,'물뿔':1132,'불뿔':1134},
};
const accImg=(lv,name)=>{const n=ACC_IMG_MAP[String(lv)]?.[name];return n?`${TEM_BASE}/${n}.png`:'';}

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

// ================================================================

window.PeakData={IMG_PEND,ACC_DB,BASE,GEM,GEM_NAME,SP_PLUS,SP_PCT,SP_BONUS,SP_PRESETS,DTYPES,DCOLORS,SK,SKEYS};
})();
