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
    const excluded=['골드드래곤','헬드래곤','수룡','히드라곤','청룡','백룡','흑룡'];
    for(const notice of source.notices){
      for(const event of notice.events){
        if(excluded.includes(event.name.replace(/\s+/g,''))) continue;
        if(!groups.has(event.dragonId)) groups.set(event.dragonId,{id:event.dragonId,name:event.name,entries:[]});
        groups.get(event.dragonId).entries.push({event,notice});
      }
    }
    for(const group of groups.values()){
      const entries=group.entries.sort((a,b)=>a.notice.date.localeCompare(b.notice.date)||a.notice.id-b.notice.id);
      const sales=[];
      for(const {event,notice} of entries){
        let sale=sales.at(-1);
        // Follow successive notice dates: corrections inside three calendar
        // months belong to the same announcement round, including chains.
        if(!sale || notice.date>=addMonths(sale.lastNoticeDate,3)){
          sale={...event,start:event.start||null,end:event.end||null,dateBasis:event.start?'sale':'notice',
            referenceDate:event.start||notice.date,noticeDate:notice.date,lastNoticeDate:notice.date,notices:[]};
          sales.push(sale);
        }
        sale.lastNoticeDate=notice.date;
        if(!sale.notices.some(n=>n.id===notice.id)) sale.notices.push(notice);
        // A precise sale period takes precedence over a notice-date fallback.
        if(event.start && (!sale.start || event.start<sale.start)){
          sale.start=event.start;sale.end=event.end;sale.referenceDate=event.start;sale.dateBasis='sale';sale.latestNoticeId=notice.id;
        }else if(event.start===sale.start && (!sale.latestNoticeId || notice.id>sale.latestNoticeId)){
          sale.end=event.end;sale.latestNoticeId=notice.id;
        }
        if(event.price!=null) sale.price=event.price;
        if(event.evidence) sale.evidence=event.evidence;
      }
      group.sales=sales.sort((a,b)=>a.referenceDate.localeCompare(b.referenceDate));
    }
    return Array.from(groups.values(),group=>{
      const sales = group.sales;
      // Upcoming official sales are displayed, but cannot become a completed
      // recurrence interval before their starting date.
      const begun = sales.filter(s=>s.referenceDate <= today);
      const gaps = begun.slice(1).map((s,i)=>day(s.referenceDate)-day(begun[i].referenceDate));
      const cycle = median(gaps), recent = begun.at(-1), next = sales.find(s=>s.start && s.start > today);
      const elapsed = recent ? current-day(recent.referenceDate) : 0;
      const stale = recent ? today >= addMonths(recent.referenceDate,30) : false;
      const estimate = cycle && !stale ? iso(day(recent.referenceDate)+Math.round(cycle)) : null;
      const active = sales.find(s=>s.start && s.end && s.start<=today && s.end>=today);
      return {id:group.id,name:group.name,sales,count:begun.length,first:begun[0]?.referenceDate||sales[0].referenceDate,
        firstDateBasis:(begun[0]||sales[0]).dateBasis,recentDateBasis:recent?.dateBasis||'notice',usesNoticeDates:begun.some(s=>s.dateBasis==='notice'),
        recent:recent?.referenceDate||null,gaps,cycle,lastInterval:gaps.at(-1)||null,elapsed,stale,
        estimate,daysLeft:estimate?day(estimate)-current:null,active,next};
    });
  }
  const api={day,iso,todayKST,median,addMonths,build};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.PackageHistory=api;
})(globalThis);
