/* Translate rendered labels only. Canonical option values and saved game keys
   remain unchanged so the English and Korean pages use identical calculations. */
(function(w,d){
 'use strict';if(!/\/en\//.test(location.pathname))return;
 const exact=Object.assign({},w.EN_MESSAGES||{}, {
 '드래곤빌리지 초월 등급표, 도감, 레이드, 공략, 길드, 자동 계산기까지 — 한 페이지에서.':'Dragon Village tiers, dragon dex, raids, guides, guilds and calculators — all in one place.',
 '3팀 × 3마리 · 최종 스탯 · EVAL · 비벨':'3 teams × 3 dragons · Final stats · EVAL · B-Val',
 '드래곤빌리지 초월 등급표, 도감, 레이드, 공략, 길드, 자동계산기까지 — 한 페이지에서.':'Dragon Village tiers, dragon dex, raids, guides, guilds and calculators — all in one place.',
 '비밸·TAR 비교 · 버프 최적화 및 직접 지정':'Compare B-Val and TAR · Optimize or set buffs',
 '오리지널·뉴비 모드 전환 · 비밸·TAR 추천':'Original and Beginner modes · B-Val and TAR rankings',
 '3팀 × 3마리 · 최종 스탯 · EVAL · 비밸':'3 teams × 3 dragons · Final stats · EVAL · B-Val',
 '길드 홍보 & 모집':'Guild listings and recruitment','신규 드래곤 추가: 넵튠, 아우로스, 노아':'New dragons: Neptune, Auros and Noah',
 '도감 설명·티어표 반영':'Dex descriptions and tier list updated','챔피언대전 수동 계산기 추가 (KR/EN)':'Champion manual calculator added (KR/EN)',
 '내 스펙 프리셋 기능 추가 (최대 10개)':'My Spec presets added (up to 10)',
 '계산기 드래곤 자동저장 / 스펙 새로고침 / 기기 간 셋팅 충돌 시 선택 기능':'Automatic dragon saving, spec refresh and cross-device setup conflict resolution',
 '복구 코드로 아이디·비밀번호 찾기 추가 (기존 친구코드 방식도 유지)':'Account recovery by recovery code added; friend-code recovery remains available',
 '문의 후 답변까지 1~2일 소요될 수 있습니다.':'Replies may take 1–2 days.',
 '비벨(체력 × 공격 × 방어) 최적화':'Optimize B-Val (HP × ATK × DEF)','비벨 최적화 · 3vs3':'B-Val optimization · 3vs3',
 '모든 등급의 TAR은 같은 타입·버프의 최고 세팅 대비 점수입니다.':'TAR compares each grade against the peak setup for the same type and buffs.',
 '왼쪽에서 설정을 마치고 [계산 실행]을 눌러주세요.':'Choose your settings and press Calculate.',
 '챔피언대전':'Champion League','자동 계산기':'Auto calculator','수동 계산기':'Manual calculator','디버프 설정':'Debuff settings','길드전 모드':'Guild War mode',
 '통합 TOP 10':'Overall TOP 10','패치노트':'Patch notes','고점':'Peak','챔대':'Champ','길드':'Guild','테마':'Theme','속성':'Element',
 '정령 고점 계산기':'Spirit Peak Calculator','내 정령이 도달할 수 있는 가장 높은 세팅을 찾아보세요.':'Find the highest possible setup for your spirit.',
 '내 스펙과 분리된 계산기입니다.':'This calculator is separate from My Spec.',
 '입력한 정령으로 보유 장비 제한 없이 이론상 고점을 계산합니다. ‘내 스펙’을 읽거나 변경하지 않으며, 정령 입력값은 새로고침하면 초기화됩니다.':'Find the theoretical peak with no inventory restrictions. My Spec is neither read nor changed. Spirit input resets when you reload.',
 '정령 옵션':'Spirit options','정령 초기화':'Reset spirit','계산 조건':'Calculation settings','드래곤 등급':'Dragon grade','버프 단계':'Buff level',
 '2버프 · 배분 최적화':'2 buffs · optimize distribution','1버프 · 배분 최적화':'1 buff · optimize distribution',
 '정령 시뮬레이터와 같은 강림 타입별 기본 스탯·계산식을 사용합니다. 풀컬렉션(240/60/60), 물약(24/6/6)을 포함합니다. 개별 드래곤의 전투 스킬은 비교하지 않습니다.':'Uses the Spirit Simulator’s descended-type stats and formulas. Includes full collection (240/60/60) and potions (24/6/6). Individual combat skills are not compared.',
 '이론상 고점의 장비 조건':'Theoretical gear assumptions','44단계 체·공·방 젬, 5슬롯 최적 배분':'Five Lv.44 HP/ATK/DEF gems, optimally distributed',
 '사이트에 등록된 전체 장신구 비교 (최대 20레벨)':'All accessories in the site database (up to Lv.20)',
 '체·공·방 인첸트 21% 최적화':'Optimize 21% HP/ATK/DEF enchantment','태양 펜던트 3옵 각 6%, 스탯 배분 최적화':'Sun pendant: three 6% options with optimal stat distribution',
 '정령 옵션을 입력한 뒤 계산을 실행해 주세요.':'Enter your spirit options, then select Calculate.',
 '정령과 조건을 입력하면':'Enter a spirit and your settings to see','타입별 고점과 최적 장비 조합을 보여드립니다.':'the peak and best equipment for each type.',
 'TAR은 같은 타입·버프 조건의 9.0 기준표 대비 점수입니다. 이론상 고점의 절대 백분율은 아니며 100을 넘을 수 있습니다.':'TAR compares against the grade 9.0 benchmark for the same type and buffs. It is not an absolute percentage of the theoretical peak and may exceed 100.',
 '모든 등급의 TAR은 같은 타입·버프의 9.0 최고 세팅 대비 점수입니다.':'For every grade, TAR uses the grade 9.0 benchmark for the same type and buffs.',
 'TAR 기준표를 불러오지 못했습니다. 비밸 비교를 이용해 주세요.':'The TAR benchmark is unavailable. Compare B-Val instead.',
 '입력 조건이 변경되었습니다. 아래 결과는 직전 계산 결과입니다. 다시 계산해 주세요.':'Inputs changed. The results below are from the previous run. Please calculate again.',
 '정령 옵션 또는 부가옵을 하나 이상 입력해 주세요.':'Enter at least one spirit option or bonus.',
 '선택한 조건에서 고점 세팅을 찾고 있습니다.':'Finding the peak setup for the selected settings.',
 '계산 완료. 비밸·TAR 기준과 타입을 바꿔 결과를 확인하세요.':'Calculation complete. Compare B-Val, TAR and dragon types.',
 '계산 완료. 우선순위와 타입을 바꿔 결과를 비교해 보세요.':'Calculation complete. Change the ranking or type to compare results.',
 '버프와 추천 기준을 선택한 뒤 내 세팅을 비교해 보세요.':'Select buffs and a ranking, then calculate your setup.',
 '보유 장비와 선택한 버프를 비교하고 있습니다.':'Comparing your equipment and selected buffs.',
 '설정이 변경되었습니다. 다시 실행하면 새 조건이 반영됩니다.':'Settings changed. Calculate again to use the new conditions.',
 '내 스펙에서 장신구를 1개 이상 등록해 주세요.':'Add at least one accessory in My Spec.',
 '내 스펙 탭에서 장신구를 1개 이상 추가하세요.':'Add at least one accessory in My Spec.',
 '계산 중단 — 입력값을 확인해 주세요.':'Calculation stopped — check your inputs.',
 '보유 제한 없이 정령의 이론상 최고점 탐색':'Find your spirit’s theoretical peak without inventory limits',
 '입력한 옵션값과 시뮬 결과가 초기화됩니다.':'Reset the spirit options and simulation results?',
 '정령 옵션을 확인해 주세요.':'Check your spirit options.','정령 스탯과 옵션 종류를 선택해 주세요.':'Select a spirit stat and option type.',
 '부가옵을 확인해 주세요.':'Check the bonus option.','계산 모드와 등급을 확인해 주세요.':'Check the calculation mode and grade.',
 '버프는 0~2단계로 선택해 주세요.':'Select 0–2 buff levels.',
 '내 용 정보에 계산 가능한 용이 없습니다.':'No eligible dragons in My Dragons.',
 '디버프를 받지 않는 용이 없습니다.':'All entered dragons receive the debuff.',
 '디버프 제외 후 계산 가능한 용이 3마리 미만입니다.':'Fewer than three eligible dragons remain after excluding debuffed dragons.',
 '장신구/펜던트/젬 중복 제한을 만족하는 3마리 조합을 찾지 못했습니다.':'No three-dragon team satisfies your accessory, pendant and gem limits.',
 '입력값은 이 화면에서만 유지되며 새로고침하면 초기화됩니다.':'Inputs remain on this page only and reset on reload.',
 'HP·ATK·DEF를 직접 지정합니다. 합계 최대 40%.':'Set HP, ATK and DEF manually, up to 40% total.',
 '선택한 단계에서 가능한 모든 버프 조합을 비교합니다.':'Compare all buff distributions at the selected level.',
 '직접 지정 버프는 합계 2단계(40%)까지 선택할 수 있습니다.':'Manual buffs may total at most two levels (40%).',
 '계산기 준비 중…':'Preparing calculator…','시뮬레이션 설정':'Simulation settings','시뮬레이션 결과':'Simulation results',
 '보유중인 인챈트 사용':'Use the saved enchantment','인챈트 상관X 승계 가능':'Optimize enchantment (transfer allowed)',
 '태펜 제외':'Exclude sun pendant','디버프 용 포함':'Include debuffed dragons','디버프 포함':'Include debuffs',
 '내 스펙에 드래곤 셋팅이 저장됐어요!':'Dragon setup saved to My Spec!',
 '버프 적용 전후':'Before and after buffs','같은 속성·타입 중복 가능':'Repeated elements and types allowed',
 '보유 드래곤과 장비로 세팅 계산':'Optimize your dragons and equipment',
 '챔피언대전 계산기 (자동)':'Champion League Calculator (Auto)','챔피언대전 계산기 (수동)':'Champion League Calculator (Manual)',
 '길드전 계산기':'Guild War Calculator','정령 시뮬레이터':'Spirit Simulator','기존 방식':'Dropdowns','버튼 방식':'Buttons',
 '정령 입력 방식':'Spirit input mode','고점 계산':'Peak search','계산 실행':'Calculate','계산 완료':'Complete','계산 준비':'Preparing',
 '장비 조합 계산':'Equipment search','3마리 조합 탐색':'Team search','계산 중':'Calculating','계산하지 못했습니다:':'Calculation failed:',
 '이론상 고점':'Theoretical peak','최고점 세팅':'Peak setup','비밸 우선':'B-Val first','TAR 우선':'TAR first',
 '내 셋팅 비교하기':'Calculate','내 세팅 비교하기':'Calculate','정령 고점':'Spirit peak','내 용 정보':'My Dragons','3vs3 세팅':'3vs3 setup',
 '내 스펙 관리':'My Spec','내 스펙':'My Spec','내 드래곤':'My Dragons','내 장비':'My Equipment',
 '체력형':'HP Type','공격형':'ATK Type','방어형':'DEF Type','체공형':'HP/ATK Type','체방형':'HP/DEF Type','공방형':'ATK/DEF Type',
 '강림(축복)':'Descended (Blessed)','강림':'Descended','진각':'True Awakening','뉴비':'Beginner','오리지널':'Original',
 '정령':'Spirit','부가옵':'Bonus','부가':'Bonus','막플':'Last flat','올퍼':'All %','14플':'1 & 4 flat','24플':'2 & 4 flat',
 '장신구':'Accessory','펜던트':'Pendant','인챈트':'Enchantment','인첸트':'Enchantment','젬 배분':'Gem distribution','젬':'Gem',
 '체력':'HP','공격':'ATK','방어':'DEF','크리':'Crit','회피':'Evade','버프 없음':'No buffs','미장착':'None',
 '전체 타입':'All types','전체':'All','타입':'Type','등급':'Grade','레벨':'Level','버프':'Buff','디버프':'Debuff',
 '시뮬레이션':'Simulation','보유량':'Inventory','보유 장신구':'Owned accessories','보유 펜던트':'Owned pendants',
 '저장됨':'Saved','저장':'Save','초기화':'Reset','삭제':'Delete','추가':'Add','없음':'None','결과':'Results',
 '용 정보 삭제':'Delete dragon','용 이름':'Dragon name','중복 여부':'Allow duplicate','직접입력':'Custom',
 '설정':'Settings','추천 기준':'Ranking','인챈트 옵션':'Enchantment options','버프 설정':'Buff settings',
 '버프 최적화':'Optimize buffs','버프 직접 지정':'Set buffs manually','전체 보기':'Show all',
 '종합 정보사이트':'Dragon Village 1 Guide','정보':'Info','계산기':'Calculators','편의성':'Tools','공략 & 가이드':'Guides',
 '초월 등급표':'Transcendence tiers','드래곤 도감':'Dragon Dex','길드전':'Guild War','길드 홍보':'Guild listings',
 '아르하 입구':'Arha Gate','레이드 정보':'Raid Info','오라 미리보기':'Aura Preview','패치 노트':'Patch notes',
 '로그인':'Sign in','로그아웃':'Sign out','회원가입':'Register','친구코드':'Friend code','관리자':'Admin','어드민':'Admin',
 '비벨':'B-Val','비밸':'B-Val','백만':'million','스탯':'Stat','콜렉션':'Collection','컬렉션':'Collection',
 '체':'HP','공':'ATK','방':'DEF','태양':'Sun','달':'Moon','별':'Star','땅':'Earth','물':'Water','불':'Fire','바람':'Wind','빛':'Light','어둠':'Dark','황혼':'Dusk','여명':'Dawn','악몽':'Nightmare'
 });
 let pairs;function refreshPairs(){pairs=Object.entries(exact).filter(([k])=>/[가-힣]/.test(k)).sort((a,b)=>b[0].length-a[0].length);}
 refreshPairs();
 function tr(text){if(!/[가-힣]/.test(text))return text;const trimmed=text.trim();if(exact[trimmed])return text.replace(trimmed,exact[trimmed]);
   let out=text.replace(/(\d+)옵/g,'Option $1').replace(/(\d+)단계/g,'Lv.$1').replace(/(\d+)개 후보 비교/g,'$1 candidates compared').replace(/(\d+)개 세팅 비교/g,'$1 setups compared').replace(/(\d+)개 메뉴/g,'$1 pages').replace(/(\d+)마리/g,'$1 dragons').replace(/(\d+)종/g,'$1 types').replace(/(\d+)버프/g,'$1 buffs');
   for(const [ko,en]of pairs){if(ko.length===1)continue;out=out.split(ko).join(en);}
   out=out.replace(/([체공방])(?=\s*[+×\d/·,]|$)/g,s=>exact[s]).replace(/(^|[+/(·,\s])([체공방])(?=[+/)·,\s])/g,(_,a,s)=>a+exact[s]);
   return out;
 }
 function node(n){if(n.nodeType===3){if(n.parentElement?.closest('script,style,textarea,[contenteditable]'))return;const value=tr(n.nodeValue);if(value!==n.nodeValue){const p=n.parentElement;if(p?.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',p.value);n.nodeValue=value;}return;}
   if(n.nodeType!==1)return;if(['SCRIPT','STYLE','TEXTAREA'].includes(n.tagName)||n.isContentEditable)return;
   for(const key of ['title','placeholder','aria-label','alt','data-empty'])if(n.hasAttribute(key)){const v=n.getAttribute(key),t=tr(v);if(t!==v)n.setAttribute(key,t);}
   for(const c of Array.from(n.childNodes))node(c);
 }
 let observer;function flush(){node(d.documentElement);}
 function start(){
   for(const row of w.DV1_DRAGONS?.records||[])if(row.name?.ko&&row.name?.en)exact[row.name.ko]=row.name.en;refreshPairs();flush();
   observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList')r.addedNodes.forEach(node);else node(r.target);}});
   observer.observe(d.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt','data-empty']});
 }
 for(const method of ['alert','confirm','prompt']){const original=w[method].bind(w);w[method]=(message,...args)=>original(tr(String(message)),...args);}
 w.EnLocale={text:tr,flush};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
})(window,document);
