(function(root){
  'use strict';
  const DAY = 86400000;
  function day(value){ return Date.parse(value + 'T00:00:00Z') / DAY; }
  function iso(value){ return new Date(value * DAY).toISOString().slice(0,10); }
  function todayKST(now = new Date()){
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  }
  function median(values){
    if(!values.length) return null;
    const sorted = values.slice().sort((a,b)=>a-b), mid = Math.floor(sorted.length/2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
  }
  function addMonths(value,months){
    const date=new Date(value+'T00:00:00Z'),originalDay=date.getUTCDate();
    date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);
    const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay,end));return date.toISOString().slice(0,10);
  }
  function build(source,today=todayKST()){
    const groups = new Map(), current = day(today);
    for(const notice of source.notices){
      for(const event of notice.events){
        if(['골드드래곤','헬드래곤'].includes(event.name.replace(/\s+/g,''))) continue;
        if(!groups.has(event.dragonId)) groups.set(event.dragonId,{id:event.dragonId,name:event.name,sales:new Map()});
        const group = groups.get(event.dragonId);
        if(!group.sales.has(event.start)) group.sales.set(event.start,{...event,notices:[]});
        const sale = group.sales.get(event.start);
        if(!sale.notices.some(n=>n.id===notice.id)) sale.notices.push(notice);
        // More recent corrections supersede old ending dates; image review
        // prices survive a second source describing the same sale.
        if(!sale.latestNoticeId || notice.id > sale.latestNoticeId){sale.end=event.end;sale.latestNoticeId=notice.id;}
        if(event.price != null) sale.price=event.price;
        if(event.evidence) sale.evidence=event.evidence;
      }
    }
    return Array.from(groups.values(),group=>{
      const sales = Array.from(group.sales.values()).sort((a,b)=>a.start.localeCompare(b.start));
      // Upcoming official sales are displayed, but cannot become a completed
      // recurrence interval before their starting date.
      const begun = sales.filter(s=>s.start <= today);
      const gaps = begun.slice(1).map((s,i)=>day(s.start)-day(begun[i].start));
      const cycle = median(gaps), recent = begun.at(-1), next = sales.find(s=>s.start > today);
      const elapsed = recent ? current-day(recent.start) : 0;
      const stale = recent ? today >= addMonths(recent.start,30) : false;
      const estimate = cycle && !stale ? iso(day(recent.start)+Math.round(cycle)) : null;
      const active = sales.find(s=>s.start<=today && s.end>=today);
      return {id:group.id,name:group.name,sales,count:begun.length,first:begun[0]?.start||sales[0].start,
        recent:recent?.start||null,gaps,cycle,lastInterval:gaps.at(-1)||null,elapsed,stale,
        estimate,daysLeft:estimate?day(estimate)-current:null,active,next};
    });
  }
  const api={day,iso,todayKST,median,addMonths,build};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.PackageHistory=api;
})(globalThis);
