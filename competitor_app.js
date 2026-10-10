(() => {
  const data = window.COMPETITOR_DATA;
  const root = document.getElementById('core-competitors');
  if (!root) return;
  if (!data || !Array.isArray(data.brands) || !data.brands.length) {
    root.querySelector('#competitor-kpis').textContent = '竞品逐日数据未加载，请重新生成页面。';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 1});
  const amount = value => `${number.format(value)} 万元`;
  const percent = value => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const palette = ['#0b897d','#426899','#d48932','#a8546e','#7c67a4','#3187aa','#ba6845','#4b8b51','#79843c','#be6b98','#6d75bb','#9b724b','#547ca5','#a65e77','#368b89'];
  const brandColor = Object.fromEntries(data.brands.map((brand, index) => [brand.name, palette[index % palette.length]]));
  const brandByName = new Map(data.brands.map(brand => [brand.name, brand]));
  const latest = data.fullMonths[data.fullMonths.length - 1];
  const previous = data.fullMonths[data.fullMonths.length - 2];
  const monthValue = (brand, month) => brand.monthly.find(row => row[0] === month)?.[1] ?? 0;
  const ranked = [...data.brands].sort((a,b) => monthValue(b,latest)-monthValue(a,latest));
  const biggestGain = [...data.brands].sort((a,b) => (monthValue(b,latest)/monthValue(b,previous)-1)-(monthValue(a,latest)/monthValue(a,previous)-1))[0];
  $('competitor-kpis').innerHTML = [
    ['追踪品牌', `${data.brands.length} 个`, '各自连续 365 天'],
    ['完整自然月', `${data.fullMonths.length} 个月`, '2025 年 11 月—2026 年 9 月'],
    ['9 月表内最高', ranked[0].name, amount(monthValue(ranked[0],latest))],
    ['9 月环比增幅最高', biggestGain.name, percent((monthValue(biggestGain,latest)/monthValue(biggestGain,previous)-1)*100)],
  ].map(([label,value,note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');

  const width=960, height=270, left=72, right=24, top=24, bottom=47;
  const xAt=(index,total) => left + index*(width-left-right)/Math.max(total-1,1);
  const plotHeight=height-top-bottom;
  const niceMax=value => Math.ceil(value/Math.pow(10,Math.floor(Math.log10(Math.max(value,1))))) * Math.pow(10,Math.floor(Math.log10(Math.max(value,1))));
  const axis=(max,labels,scale,format) => {
    const grid=[0,.25,.5,.75,1].map(fraction => {
      const y=height-bottom-fraction*plotHeight;
      return `<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e5eeee"/><text x="${left-9}" y="${y+4}" text-anchor="end" fill="#6c7f8e" font-size="12">${esc(format(scale(fraction,max)))}</text>`;
    }).join('');
    const ticks=labels.map((label,index) => `<text x="${xAt(index,labels.length)}" y="${height-13}" text-anchor="middle" fill="#6c7f8e" font-size="11">${esc(label)}</text>`).join('');
    return grid+ticks;
  };
  const svg=(body,label) => `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  const selected = new Set(['赫系','韩束','长发小寨','科芮实验室']);
  function renderChoices() {
    $('competitor-choices').innerHTML=data.brands.map(brand=>`<label class="competitor-choice"><input type="checkbox" value="${esc(brand.name)}" ${selected.has(brand.name)?'checked':''} ${selected.size>=4&&!selected.has(brand.name)?'disabled':''}><i style="background:${brandColor[brand.name]}"></i>${esc(brand.name)}</label>`).join('');
    $('competitor-choices').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      if(input.checked)selected.add(input.value); else selected.delete(input.value);
      renderChoices();renderIndex();
    }));
  }
  function renderIndex() {
    const series=[...selected].map(name=>brandByName.get(name)).filter(Boolean);
    if(!series.length){$('competitor-index-chart').textContent='请选择至少一个品牌。';return;}
    const values=series.flatMap(brand=>brand.monthly.map(row=>row[1]/brand.monthly[0][1]*100));
    const logarithmic=Math.max(...values)>800;
    const min=logarithmic?Math.min(40,...values):0;
    const max=logarithmic?Math.max(...values)*1.12:niceMax(Math.max(...values)*1.08);
    const lo=logarithmic?Math.log(Math.max(min,1)):0;
    const hi=logarithmic?Math.log(max):max;
    const yAt=value=>height-bottom-((logarithmic?Math.log(Math.max(value,1)):value)-lo)/(hi-lo)*plotHeight;
    const tickValue=fraction=>logarithmic?Math.exp(lo+fraction*(hi-lo)):fraction*max;
    const grid=[0,.25,.5,.75,1].map(f=>{const y=height-bottom-f*plotHeight;return `<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e5eeee"/><text x="${left-9}" y="${y+4}" text-anchor="end" fill="#6c7f8e" font-size="12">${number.format(tickValue(f))}</text>`;}).join('');
    const months=data.fullMonths.map((month,index)=>`<text x="${xAt(index,data.fullMonths.length)}" y="${height-13}" text-anchor="middle" fill="#6c7f8e" font-size="11">${esc(month.slice(2))}</text>`).join('');
    const paths=series.map(brand=>{
      const baseline=brand.monthly[0][1];
      const points=brand.monthly.map((row,index)=>[xAt(index,data.fullMonths.length),yAt(row[1]/baseline*100),row]);
      const path=points.map((point,index)=>`${index?'L':'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
      const dots=points.map(([x,y,row])=>`<circle cx="${x}" cy="${y}" r="3" fill="${brandColor[brand.name]}"><title>${esc(brand.name)} ${esc(row[0])}：${number.format(row[1]/baseline*100)}（${amount(row[1])}）</title></circle>`).join('');
      return `<path d="${path}" fill="none" stroke="${brandColor[brand.name]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join('');
    $('competitor-index-chart').innerHTML=`<div class="competitor-chart-meta">2025 年 11 月 = 100${logarithmic?' · 纵轴为对数刻度（兼容高增长品牌）':''}</div>`+svg(grid+paths+months,'核心竞品逐月销售额估算指数趋势');
  }

  $('competitor-focus').innerHTML=ranked.map(brand=>`<option value="${esc(brand.name)}">${esc(brand.name)}</option>`).join('');
  function renderFocus() {
    const brand=brandByName.get($('competitor-focus').value);
    if(!brand)return;
    const max=niceMax(Math.max(...brand.monthly.map(row=>row[1]))*1.05);
    const yAt=value=>height-bottom-value/max*plotHeight;
    const step=(width-left-right)/brand.monthly.length;
    const bars=brand.monthly.map((row,index)=>{
      const x=left+index*step+step*.18,w=step*.64;
      return `<rect x="${x}" y="${yAt(row[1])}" width="${w}" height="${height-bottom-yAt(row[1])}" rx="3" fill="${brandColor[brand.name]}"><title>${esc(row[0])}：${amount(row[1])}${row[2]!==null?'；保守口径 '+amount(row[2]):''}</title></rect>`;
    }).join('');
    $('competitor-monthly-chart').innerHTML=svg(axis(max,data.fullMonths.map(m=>m.slice(2)),(f,m)=>f*m,v=>number.format(v))+bars,`${brand.name}逐月销售额估算，单位万元`);
    const thisMonth=monthValue(brand,latest),lastMonth=monthValue(brand,previous);
    const peak=brand.monthly.reduce((a,b)=>b[1]>a[1]?b:a);
    const recentThree=brand.monthly.slice(-3).reduce((sum,row)=>sum+row[1],0);
    const priorThree=brand.monthly.slice(-6,-3).reduce((sum,row)=>sum+row[1],0);
    const latestThirty=brand.daily.slice(-30).reduce((sum,row)=>sum+row[1],0);
    const priorThirty=brand.daily.slice(-60,-30).reduce((sum,row)=>sum+row[1],0);
    const quarterChange=(recentThree/priorThree-1)*100;
    const thirtyChange=(latestThirty/priorThirty-1)*100;
    $('competitor-focus-metrics').innerHTML=`<div><span>9 月估算额</span><strong>${amount(thisMonth)}</strong></div><div><span>较 8 月</span><strong class="${thisMonth>=lastMonth?'positive':'negative'}">${percent((thisMonth/lastMonth-1)*100)}</strong></div><div><span>近 3 个完整月 vs 前 3 个月</span><strong class="${quarterChange>=0?'positive':'negative'}">${percent(quarterChange)}</strong></div><div><span>近 30 天 vs 前 30 天</span><strong class="${thirtyChange>=0?'positive':'negative'}">${percent(thirtyChange)}</strong></div><div><span>最高完整月</span><strong>${peak[0].slice(2)} · ${amount(peak[1])}</strong></div>`;
    const rolling=brand.daily.map((row,index)=>{
      const start=Math.max(0,index-6);
      return brand.daily.slice(start,index+1).reduce((sum,day)=>sum+day[1],0)/(index-start+1);
    });
    const dayMax=niceMax(Math.max(...rolling)*1.05),dayY=value=>height-bottom-value/dayMax*plotHeight;
    const path=rolling.map((value,index)=>`${index?'L':'M'}${xAt(index,rolling.length).toFixed(1)},${dayY(value).toFixed(1)}`).join(' ');
    const ticks=[0,60,120,180,240,300,364].map(index=>`<text x="${xAt(index,rolling.length)}" y="${height-13}" text-anchor="middle" fill="#6c7f8e" font-size="11">${brand.daily[index][0].slice(2,7)}</text>`).join('');
    const grid=[0,.25,.5,.75,1].map(f=>{const y=height-bottom-f*plotHeight;return `<line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#e5eeee"/><text x="${left-9}" y="${y+4}" text-anchor="end" fill="#6c7f8e" font-size="12">${number.format(f*dayMax)}</text>`;}).join('');
    $('competitor-daily-chart').innerHTML=svg(grid+`<path d="${path}" fill="none" stroke="${brandColor[brand.name]}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`+ticks,`${brand.name}逐日七日移动平均销售额估算，单位万元`);
    $('competitor-source-note').textContent=`来源：${brand.sourceLabel}。覆盖 ${brand.start}—${brand.end}；${brand.scope}。${brand.conservativeInversions?`保守口径有 ${brand.conservativeInversions} 天高于主口径，已停用保守区间。`:brand.hasConservative?'来源另含保守口径，图中采用主口径。':'来源只提供单一金额列。'}`;
  }
  $('competitor-focus').addEventListener('change',renderFocus);
  const observeMonths=data.fullMonths.filter(month=>month>='2026-04'&&month<='2026-09');
  const tableBrands=new Set(data.brands.map(brand=>brand.name));
  let page=0;
  let tablePages=1;
  function renderBrandPicker() {
    $('competitor-brand-options').innerHTML=data.brands.map(brand=>`<label><input type="checkbox" data-brand-name="${esc(brand.name)}" ${tableBrands.has(brand.name)?'checked':''}>${esc(brand.name)}</label>`).join('');
    $('competitor-brand-picker-label').textContent=tableBrands.size===data.brands.length
      ? `筛选品牌（全部 ${data.brands.length} 个）` : `筛选品牌（已选 ${tableBrands.size} 个）`;
  }
  function renderTable() {
    const choice=$('competitor-observe-month').value;
    const sortMonth=choice==='all'?latest:choice;
    const query=$('competitor-observe-search').value.trim().toLowerCase();
    const fullRanked=[...data.brands].sort((a,b)=>monthValue(b,sortMonth)-monthValue(a,sortMonth));
    const found=fullRanked.map((brand,index)=>({brand,rank:index+1}))
      .filter(({brand})=>tableBrands.has(brand.name)&&(!query||brand.name.toLowerCase().includes(query)));
    tablePages=Math.max(1,Math.ceil(found.length/5));
    page=Math.min(page,tablePages-1);
    const allMonths=choice==='all';
    const prior=data.fullMonths[data.fullMonths.indexOf(sortMonth)-1];
    $('competitor-observe-head').innerHTML=allMonths
      ? `<tr><th>9 月名次</th><th>品牌</th>${observeMonths.map(month=>`<th>${Number(month.slice(-2))} 月金额</th>`).join('')}<th>365 天合计</th><th>表内范围</th></tr>`
      : `<tr><th>${Number(sortMonth.slice(-2))} 月名次</th><th>品牌</th><th>${Number(sortMonth.slice(-2))} 月金额</th><th>较上月</th><th>365 天合计</th><th>表内范围</th></tr>`;
    $('competitor-rows').innerHTML=found.slice(page*5,(page+1)*5).map(({brand,rank})=>{
      const monthly=allMonths
        ? observeMonths.map(month=>`<td>${number.format(monthValue(brand,month))}</td>`).join('')
        : `<td>${number.format(monthValue(brand,sortMonth))}</td><td><span class="${monthValue(brand,sortMonth)>=monthValue(brand,prior)?'positive':'negative'}">${percent((monthValue(brand,sortMonth)/monthValue(brand,prior)-1)*100)}</span></td>`;
      return `<tr><td>${rank}</td><td><strong>${esc(brand.name)}</strong></td>${monthly}<td>${number.format(brand.total)}</td><td><small>${esc(brand.scope)} · ${esc(brand.sourceType)}</small></td></tr>`;
    }).join('') || `<tr><td colspan="${allMonths?10:6}" class="competitor-observe-empty">没有符合筛选条件的品牌</td></tr>`;
    $('competitor-observe-status').textContent=`${allMonths?'4—9 月全部':Number(sortMonth.slice(-2))+' 月'} · 已选 ${tableBrands.size} 个品牌 · 符合搜索 ${found.length} 个`;
    $('competitor-page').textContent=`第 ${page+1} / ${tablePages} 页 · 共 ${found.length} 个品牌`;
    $('competitor-prev').disabled=page===0;
    $('competitor-next').disabled=page>=tablePages-1;
  }
  $('competitor-brand-options').addEventListener('change',event=>{
    const input=event.target.closest('[data-brand-name]');
    if(!input)return;
    if(input.checked)tableBrands.add(input.dataset.brandName);else tableBrands.delete(input.dataset.brandName);
    page=0;renderBrandPicker();renderTable();
  });
  $('competitor-brand-all').addEventListener('click',()=>{data.brands.forEach(brand=>tableBrands.add(brand.name));page=0;renderBrandPicker();renderTable();});
  $('competitor-brand-none').addEventListener('click',()=>{tableBrands.clear();page=0;renderBrandPicker();renderTable();});
  $('competitor-observe-month').addEventListener('change',()=>{page=0;renderTable();});
  $('competitor-observe-search').addEventListener('input',()=>{page=0;renderTable();});
  $('competitor-prev').addEventListener('click',()=>{if(page>0){page--;renderTable();}});
  $('competitor-next').addEventListener('click',()=>{if(page<tablePages-1){page++;renderTable();}});
  renderBrandPicker();
  renderChoices();renderIndex();renderFocus();renderTable();
})();
