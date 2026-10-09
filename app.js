(() => {
  const data = window.MARKET_DATA;
  if (!data) { document.body.innerHTML = '<p style="padding:2rem">数据文件未加载。请重新运行 build_market_data.py。</p>'; return; }
  const $ = (id) => document.getElementById(id);
  const nf = new Intl.NumberFormat('zh-CN');
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const set = (id, value) => { $(id).textContent = value; };
  const bars = (id, items, max, label) => { $(id).innerHTML = items.map(([name, value]) => `<div class="bar-row"><span class="bar-label" title="${esc(name)}">${esc(name)}</span><span class="bar-track"><span class="bar-fill" style="width:${(value / max * 100).toFixed(2)}%"></span></span><span class="bar-value" aria-label="${esc(name)}${label || ''}${nf.format(value)}">${nf.format(value)}</span></div>`).join(''); };
  const money = (v) => v >= 1e8 ? `¥${(v/1e8).toFixed(2)}亿` : v >= 1e4 ? `¥${(v/1e4).toFixed(1)}万` : `¥${nf.format(v)}`;
  const growth = (now, before) => before && before.gmvCny > 0 ? (now.gmvCny / before.gmvCny - 1) * 100 : null;
  const growthText = (value) => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const prevMonth = (month) => { const [y,m] = month.split('-').map(Number); return m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`; };
  const PAGE_SIZE = 10;
  const EXPORT_PRODUCT_PAGE_SIZE = 5;
  const TREND_PAGE_SIZE = 5;
  function updatePager(prefix, page, total, pageSize = PAGE_SIZE) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    $(`${prefix}-prev`).disabled = page === 0;
    $(`${prefix}-next`).disabled = page >= pages - 1;
    if ($(`${prefix}-page`)) set(`${prefix}-page`, `第 ${page + 1} / ${pages} 页 · 共 ${total} 条`);
  }

  set('moving-products', nf.format(data.annual.movingProducts));
  set('shops', nf.format(data.annual.shops));
  set('brands', nf.format(data.annual.brands));
  set('brand-concentration', data.annual.top5Concentration.brands + '%');
  const colors = {直播:'#0b897d',短视频:'#53b5ae',商品卡:'#accfdd'};
  $('channel-bar').innerHTML = Object.entries(data.annual.gmvChannelShare).map(([name, value]) => `<span class="channel-segment" title="${name} ${value}%" style="width:${value}%;background:${colors[name]}"></span>`).join('');
  $('channel-legend').innerHTML = Object.entries(data.annual.gmvChannelShare).map(([name, value]) => `<span class="legend-item"><i class="swatch" style="background:${colors[name]}"></i>${name}<strong>${value}%</strong></span>`).join('');
  bars('price-bands', data.annual.priceBandProducts.map(x => [x.band, x.count]), Math.max(...data.annual.priceBandProducts.map(x=>x.count)), '商品数');
  if (data.monthly.rows.length) {
    $('monthly-empty').hidden = true;
    $('monthly-content').hidden = false;
    const rows = data.monthly.rows, byMonth = new Map(rows.map(r => [r.month, r]));
    const latest = rows[rows.length-1], yearAgo = `${Number(latest.month.slice(0,4))-1}${latest.month.slice(4)}`;
    const metrics = [
      ['最新月份成交额', money(latest.gmvCny), latest.month],
      ['环比', growthText(growth(latest, byMonth.get(prevMonth(latest.month)))), '需相邻自然月'],
      ['同比', growthText(growth(latest, byMonth.get(yearAgo))), '需上一年同月'],
      ['成交客单价', latest.orders ? `¥${(latest.gmvCny/latest.orders).toFixed(2)}` : '—', latest.orders ? '成交额 ÷ 订单数' : '缺少订单数'],
    ];
    $('monthly-metrics').innerHTML = metrics.map(([label,value,note]) => `<div class="monthly-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
    set('monthly-basis', `${data.monthly.scope} · ${data.monthly.refundBasis} · 人民币成交额`);
    const max = Math.max(...rows.map(r => r.gmvCny));
    $('monthly-bars').innerHTML = rows.map(r => `<div class="monthly-row"><span>${r.month}</span><span class="bar-track"><span class="bar-fill" style="width:${(r.gmvCny/max*100).toFixed(2)}%"></span></span><strong>${money(r.gmvCny)}</strong><small>${growthText(growth(r,byMonth.get(prevMonth(r.month))))}</small></div>`).join('');
  }
  const annualTrend = data.feiguaAnnual.trend;
  const annualMonths = annualTrend.monthlyTotals.filter(row => row.days >= 28);
  const unitText = value => `${(value/1e4).toFixed(0)}万`;
  function svgLines(series, format = value => nf.format(Math.round(value))) {
    const width = 960, height = 210, left = 55, right = 20, top = 16, bottom = 42;
    const max = Math.max(1,...series.flatMap(item => item.values)) * 1.12;
    const x = i => left + i * (width-left-right) / (annualMonths.length-1);
    const y = v => height-bottom-(v/max)*(height-top-bottom);
    const grid = [0,.25,.5,.75,1].map(t => `<line x1="${left}" x2="${width-right}" y1="${y(t*max)}" y2="${y(t*max)}" stroke="#e8eff0"/><text x="${left-8}" y="${y(t*max)+4}" text-anchor="end" fill="#71818b" font-size="11">${esc(format(t*max))}</text>`).join('');
    const ticks = annualMonths.map((row,i) => `<text x="${x(i)}" y="${height-10}" text-anchor="middle" fill="#71818b" font-size="10">${esc(row.month.slice(2))}${row.days<28?'*':''}</text>`).join('');
    const paths = series.map(({label,values,color}) => {
      const path = values.map((v,i) => `${i?'L':'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
      const points = values.map((v,i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${color}"><title>${esc(annualMonths[i].month)} ${esc(label)}：${esc(format(v))}${annualMonths[i].days<28?'（仅 '+annualMonths[i].days+' 天）':''}</title></circle>`).join('');
      return `<path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points}`;
    }).join('');
    const legend = series.map(({label,color}) => `<span><i style="background:${color}"></i>${esc(label)}</span>`).join('');
    return `<div class="svg-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="逐月趋势折线图">${grid}${paths}${ticks}</svg>`;
  }
  function svgMonthlyFloor() {
    const width=960,height=210,left=55,right=20,top=16,bottom=42;
    const max=Math.max(...annualMonths.map(row=>row.gmvFloor))*1.12;
    const step=(width-left-right)/annualMonths.length;
    const y=value=>height-bottom-value/max*(height-top-bottom);
    const grid=[0,.25,.5,.75,1].map(t=>`<line x1="${left}" x2="${width-right}" y1="${y(t*max)}" y2="${y(t*max)}" stroke="#e8eff0"/><text x="${left-8}" y="${y(t*max)+4}" text-anchor="end" fill="#71818b" font-size="11">${(t*max/1e8).toFixed(1)}亿</text>`).join('');
    const bars=annualMonths.map((row,i)=>{const x=left+i*step+step*.17,w=step*.66;
      return `<rect x="${x}" y="${y(row.gmvFloor)}" width="${w}" height="${height-bottom-y(row.gmvFloor)}" rx="3" fill="#138f7b"><title>${esc(row.month)}：至少 ${money(row.gmvFloor)}${row.days<28?'（仅 '+row.days+' 天）':''}</title></rect><text x="${x+w/2}" y="${height-10}" text-anchor="middle" fill="#71818b" font-size="10">${esc(row.month.slice(2))}${row.days<28?'*':''}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="按月销售额下限柱状图">${grid}${bars}</svg>`;
  }
  $('annual-trend-summary').innerHTML = [
    ['连续日期',`${annualTrend.daily.length} 天`,'无断日'],
    ['销售额封顶',`${annualTrend.censoredGmvDays} 天`,'仅显示 1000万+'],
    ['最新完整月','2026 年 9 月','10 月只有 5 天'],
    ['金额口径','至少值','不是精确 GMV'],
  ].map(([label,value,note])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
  $('annual-gmv-chart').innerHTML = svgMonthlyFloor();
  $('annual-unit-chart').innerHTML = svgLines([
    {label:'销量区间下界',values:annualMonths.map(row=>row.unitLower),color:'#138f7b'},
    {label:'销量区间上界',values:annualMonths.map(row=>row.unitUpper),color:'#426899'},
  ],unitText);
  $('format-trend-line').innerHTML = svgLines([
    {label:'带货直播',values:annualMonths.map(row=>row.lives),color:'#138f7b'},
    {label:'带货视频',values:annualMonths.map(row=>row.videos),color:'#426899'},
  ]);
  const creatorMix = data.creatorMix || {rows:[],period:'',source:'',status:'waiting',issues:[],adjustments:[]};
  const mixCount = group => creatorMix.rows.filter(row => row.relation === group).length;
  const cardMixRows = creatorMix.rows.filter(row => row.cardLeading).sort((a,b)=>b.cardShare-a.cardShare);
  if (creatorMix.rows.length) {
    set('creator-mix-status',`已核对 ${creatorMix.rows.length} / ${creatorMix.inputCount} 个填报品牌 · ${creatorMix.scope} · 统计周期：${creatorMix.period} · 来源：${creatorMix.source}。自营/达人关系按两者可归属部分计算，商品卡单列。`);
  } else {
    set('creator-mix-status','暂无可核实的品牌自营、达人和商品卡占比；现有飞瓜及罗盘渠道数据不能替代这一拆分。');
  }
  $('creator-mix-kpis').innerHTML = [
    ['自营为主',mixCount('自营为主'),'自营占可归属部分 ≥60%'],
    ['达人为主',mixCount('达人为主'),'达人占可归属部分 ≥60%'],
    ['自营达人均衡',mixCount('自营达人均衡'),'双方均低于 60%'],
    ['商品卡份额最高',cardMixRows.length,'与左侧三组可重叠'],
  ].map(([label,value,note])=>`<div><span>${esc(label)}</span><strong>${value} 个</strong><small>${esc(note)}</small></div>`).join('');
  [['自营为主','self-mix'],['达人为主','creator-mix'],['自营达人均衡','balanced-mix']].forEach(([group,prefix])=>{
    const rows = creatorMix.rows.filter(row=>row.relation === group).sort((a,b)=>
      (group === '达人为主' ? b.creatorRelative-a.creatorRelative : b.selfRelative-a.selfRelative) || a.brand.localeCompare(b.brand,'zh-CN'));
    let page = 0;
    function render() {
      $(`${prefix}-brands`).innerHTML = rows.slice(page*5,(page+1)*5).map((row,i)=>{
        const relative = group === '达人为主' ? `达人在可归属部分 ${(row.creatorRelative*100).toFixed(1)}%` : `自营在可归属部分 ${(row.selfRelative*100).toFixed(1)}%`;
        return `<div class="channel-leader"><b>${String(page*5+i+1).padStart(2,'0')}</b><span><strong>${esc(row.brand)}</strong><small>自营 ${(row.selfShare*100).toFixed(1)}% · 达人 ${(row.creatorShare*100).toFixed(1)}% · 商品卡 ${(row.cardShare*100).toFixed(1)}%<br>${relative}</small></span></div>`;
      }).join('') || '<p class="mix-empty">暂无通过核对的品牌</p>';
      updatePager(prefix,page,rows.length,5);
    }
    $(`${prefix}-prev`).addEventListener('click',()=>{page--;render();});
    $(`${prefix}-next`).addEventListener('click',()=>{page++;render();});
    render();
  });
  let cardMixPage = 0;
  function renderCardMix() {
    $('card-mix-brands').innerHTML = cardMixRows.slice(cardMixPage*PAGE_SIZE,(cardMixPage+1)*PAGE_SIZE).map((row,i)=>
      `<div class="channel-leader"><b>${String(cardMixPage*PAGE_SIZE+i+1).padStart(2,'0')}</b><span><strong>${esc(row.brand)}</strong><small>商品卡 ${(row.cardShare*100).toFixed(1)}% · 自营 ${(row.selfShare*100).toFixed(1)}% · 达人 ${(row.creatorShare*100).toFixed(1)}%</small></span></div>`
    ).join('') || '<p class="mix-empty">暂无通过核对的品牌</p>';
    updatePager('card-mix',cardMixPage,cardMixRows.length);
  }
  $('card-mix-prev').addEventListener('click',()=>{cardMixPage--;renderCardMix();});
  $('card-mix-next').addEventListener('click',()=>{cardMixPage++;renderCardMix();});
  renderCardMix();
  if (creatorMix.rows.length) {
    const issues = creatorMix.issues.length ? `未计入：${creatorMix.issues.map(row=>`${row.brand}（${row.reason}）`).join('；')}。` : '所有填报行均通过核对。';
    $('creator-mix-audit').textContent = `口径：${creatorMix.method} ${issues} 已按用户确认修正 ${creatorMix.adjustments.length} 处录入值；源文件保留原样。统计周期和数据平台未注明，不能与其他期间的金额或指数直接比较。`;
  }
  const publicBrands = data.publicMarket.brands2025;
  const concentration = (count) => publicBrands.slice(0,count).reduce((sum, row) => sum + row[1], 0) / data.publicMarket.douyinShampoo2025Yi * 100;
  $('public-concentration').innerHTML = [5,10,20].map(count => `<div><span>TOP ${count} 品牌集中度</span><strong>${concentration(count).toFixed(1)}%</strong><small>按报告销售额 ÷ 108.99 亿元计算</small></div>`).join('');
  let publicBrandPage = 0;
  function renderPublicBrands() {
    $('public-brand-rows').innerHTML = publicBrands.slice(publicBrandPage*PAGE_SIZE,(publicBrandPage+1)*PAGE_SIZE).map(([name,amount,share],i) => `<tr><td>${publicBrandPage*PAGE_SIZE+i+1}</td><td><strong>${esc(name)}</strong></td><td>${amount.toFixed(2)} 亿元</td><td>${share}%</td><td><span class="share-track"><span style="width:${(share/5*100).toFixed(1)}%"></span></span></td></tr>`).join('');
    updatePager('public-brand',publicBrandPage,publicBrands.length);
  }
  $('public-brand-prev').addEventListener('click',() => {publicBrandPage--;renderPublicBrands();});
  $('public-brand-next').addEventListener('click',() => {publicBrandPage++;renderPublicBrands();});
  renderPublicBrands();

  const brandAnalysis = data.brandAnalysis;
  const analysisEntries = brandAnalysis.entries;
  $('brand-matrix').innerHTML = Object.entries(brandAnalysis.correctedCounts).map(([title,count])=>
    `<article class="matrix-card"><span>${esc(title)}</span><strong>${count} 个</strong><p>分类表 82 个品牌中的 ${((count/brandAnalysis.sampleSize)*100).toFixed(1)}% · 品牌数量占比</p></article>`).join('');
  [['overseas-spotlight',brandAnalysis.overseasProducts],['domestic-spotlight',brandAnalysis.domesticProducts]].forEach(([id,products])=>{
    $(id).innerHTML = products.map((product,i) => {
      const row = analysisEntries.find(item => item.name === product.name);
      return `<div title="${esc(product.title)} · ${esc(product.unitBand || product.source)}"><b>${String(i+1).padStart(2,'0')}</b><strong>${esc(row?.displayName || product.name)}</strong><small>${esc(product.shortTitle)}${product.unitBand ? ` · ${esc(product.unitBand)}` : ' · 罗盘榜'}</small></div>`;
    }).join('');
  });
  $('domestic-tiers').innerHTML = Object.entries(brandAnalysis.whiteTiers).map(([tier,names]) =>
    `<div><strong>${esc(tier)} · ${names.length} 个</strong><span>${names.map(esc).join('、')}</span></div>`).join('');
  const indexChange = (current, prior) => current != null && prior > 0 ? (current / prior - 1) * 100 : null;
  const changeCell = (value) => value == null ? '<span class="unavailable">—</span>' : `<span class="change ${value >= 0 ? 'up' : 'down'}">${growthText(value)}</span>`;
  function renderChangeChart(id, rows) {
    const maximum = Math.max(1,...rows.map(row => Math.abs(row.value)));
    $(id).innerHTML = rows.length ? rows.map(row => {
      const width = Math.abs(row.value) / maximum * 48;
      const left = row.value >= 0 ? 50 : 50 - width;
      const url = row.url?.startsWith('https://haohuo.jinritemai.com/') ? row.url : null;
      const tag = url ? 'a' : 'div';
      const link = url ? ` href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="打开${esc(row.name)}的商品链接，金额指数变动${growthText(row.value)}"` : '';
      return `<${tag} class="change-chart-row${url ? ' change-chart-link' : ''}"${link}><span title="${esc(row.name)}">${esc(row.name)}</span><span class="change-axis"><i class="${row.value >= 0 ? 'up' : 'down'}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></i></span><strong class="${row.value >= 0 ? 'positive' : 'negative'}">${growthText(row.value)}</strong></${tag}>`;
    }).join('') : '<p class="mix-empty">当前筛选没有可比较的上月商品记录。</p>';
  }
  const exportData = data.compassExports;
  const exportMonths = exportData.months;
  const exportBrandMaps = Object.fromEntries(exportMonths.map(month => [month,new Map(exportData.brands[month].map(row => [row.brand,row]))]));
  const exportLatest = exportMonths.at(-1), exportPrevious = exportMonths.at(-2);
  const exportLatestBrands = exportData.brands[exportLatest];
  const exportComparable = exportLatestBrands.filter(row => exportBrandMaps[exportPrevious].has(row.brand));
  const exportRising = exportComparable.filter(row => row.amountIndex > exportBrandMaps[exportPrevious].get(row.brand).amountIndex);
  $('export-kpis').innerHTML = [
    ['最新榜首品牌',exportLatestBrands[0].brand,`9 月金额指数 ${nf.format(exportLatestBrands[0].amountIndex)}`],
    ['8→9 月可比较品牌',`${exportComparable.length} / 30`,'均进入两个月品牌前 30'],
    ['金额指数上升',`${exportRising.length} 个品牌`,'只表示榜单指数上升'],
    ['9 月成人洗发水候选',`${exportData.products[exportLatest].filter(row => row.adultShampooCandidate).length} / 80`,'按标题与叶子类目初筛'],
  ].map(([label,value,note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
  const exportBrandNames = [...new Set([...exportMonths].reverse().flatMap(month => exportData.brands[month].map(row => row.brand)))];
  $('export-brand-select').innerHTML = exportBrandNames.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  $('export-brand-select').value = exportLatestBrands[0].brand;
  function renderExportBrandLine() {
    const name = $('export-brand-select').value;
    const values = exportMonths.map(month => exportBrandMaps[month].get(name)?.amountIndex ?? null);
    const maximum = Math.max(1,...values.filter(value => value != null)) * 1.15;
    const x = i => 55+i*105, y = value => 165-value/maximum*130;
    let lines = '', dots = '';
    values.forEach((value,i) => {
      if (value == null) return;
      if (i > 0 && values[i-1] != null) lines += `<line x1="${x(i-1)}" y1="${y(values[i-1]).toFixed(1)}" x2="${x(i)}" y2="${y(value).toFixed(1)}" stroke="#138f7b" stroke-width="3"/>`;
      dots += `<circle cx="${x(i)}" cy="${y(value).toFixed(1)}" r="5" fill="#138f7b"><title>${esc(exportMonths[i])}：${nf.format(value)} 金额指数</title></circle><text x="${x(i)}" y="${Math.max(18,y(value)-11).toFixed(1)}" text-anchor="middle" class="point-label">${nf.format(value)}</text>`;
    });
    $('export-brand-line').innerHTML = `<div class="export-line-heading"><strong>${esc(name)}</strong><span>金额指数 · 缺席月份留空</span></div><svg viewBox="0 0 640 215" role="img" aria-label="${esc(name)} 4 至 9 月金额指数走势"><line x1="55" y1="165" x2="580" y2="165" stroke="#cad8dc"/><line x1="55" y1="35" x2="580" y2="35" stroke="#e6eff0" stroke-dasharray="4 4"/>${lines}${dots}${exportMonths.map((month,i) => `<text x="${x(i)}" y="192" text-anchor="middle" class="month-label">${Number(month.slice(-2))} 月</text>`).join('')}</svg>`;
    const deltaGroups = [
      ['相邻月份',[[0,1],[1,2],[2,3],[3,4],[4,5]]],
      ['跨两个月',[[0,2],[1,3],[2,4],[3,5]]],
    ];
    $('export-brand-deltas').innerHTML = deltaGroups.map(([title,pairs]) => `<div><strong>${title}</strong><div>${pairs.map(([from,to]) => `<span>${Number(exportMonths[from].slice(-2))}→${Number(exportMonths[to].slice(-2))} 月 ${changeCell(indexChange(values[to],values[from]))}</span>`).join('')}</div></div>`).join('');
  }
  $('export-brand-select').addEventListener('change',renderExportBrandLine);
  renderExportBrandLine();
  const exportBrandRows = exportBrandNames.map(name => {
    const monthly = exportMonths.map(month => exportBrandMaps[month].get(name));
    return {name,monthly,latestRank:monthly.at(-1)?.rank ?? null,
      change89:indexChange(monthly.at(-1)?.amountIndex,monthly.at(-2)?.amountIndex)};
  });
  renderChangeChart('export-brand-change-chart',exportBrandRows
    .filter(row => row.latestRank && row.latestRank <= 15 && row.change89 != null)
    .sort((a,b) => b.change89-a.change89)
    .slice(0,10).map(row => ({name:row.name,value:row.change89})));
  function renderExportBrandSort() {
    const selector = $('export-brand-sort');
    const choice = selector.value.split(':');
    const label = selector.selectedOptions[0].textContent;
    let rows;
    if (choice[0] === 'rank') {
      const monthIndex = exportMonths.indexOf(choice[1]);
      rows = exportBrandRows.map((row,index) => ({index,name:row.name,value:row.monthly[monthIndex]?.rank ?? null}))
        .filter(row => row.value != null).sort((a,b) => a.value-b.value).slice(0,10);
    } else {
      const from = exportMonths.indexOf(choice[1]), to = exportMonths.indexOf(choice[2]);
      rows = exportBrandRows.map((row,index) => ({index,name:row.name,
        value:indexChange(row.monthly[to]?.amountIndex,row.monthly[from]?.amountIndex)}))
        .filter(row => row.value != null).sort((a,b) => b.value-a.value).slice(0,10);
    }
    set('export-brand-sort-title',`${label} · ${choice[0] === 'rank' ? '当月前 10 名' : '可比较品牌前 10 名'}`);
    $('export-brand-sort-results').innerHTML = rows.map((row,rank) => `<button type="button" data-brand-index="${row.index}"><b>${String(rank+1).padStart(2,'0')}</b><span>${esc(row.name)}</span><strong>${choice[0] === 'rank' ? `第 ${row.value} 名` : growthText(row.value)}</strong></button>`).join('') || '<p class="mix-empty">所选月份没有可比较品牌。</p>';
  }
  $('export-brand-sort').addEventListener('change',renderExportBrandSort);
  $('export-brand-sort-results').addEventListener('click',event => {
    const button = event.target.closest('[data-brand-index]');
    if (!button) return;
    $('export-brand-select').value = exportBrandRows[Number(button.dataset.brandIndex)].name;
    renderExportBrandLine();
  });
  renderExportBrandSort();

  const exportProductKey = row => row.productUrl;
  const exportProductMaps = Object.fromEntries(exportMonths.map(month => {
    const grouped = new Map();
    exportData.products[month].forEach(row => {
      const key = exportProductKey(row);
      grouped.set(key,[...(grouped.get(key) || []),row]);
    });
    return [month,grouped];
  }));
  const exportProductChoices = [...new Map(exportMonths.flatMap(month => exportData.products[month]
    .map(row => [row.productUrl,{...row,month}]))).values()].sort((a,b) =>
    b.month.localeCompare(a.month) || a.rank-b.rank);
  $('export-product-select').innerHTML = exportProductChoices.map(row =>
    `<option value="${esc(row.productUrl)}">${esc(row.brand)} · ${esc(row.title.slice(0,38))}</option>`).join('');
  function renderExportProductLine() {
    const url = $('export-product-select').value;
    const rows = exportMonths.map(month => ({month,row:exportData.products[month].find(item => item.productUrl === url)}));
    const selected = [...rows].reverse().find(item => item.row)?.row;
    const maximum = Math.max(1,...rows.map(item => item.row?.amountIndex || 0)) * 1.15;
    const x = i => 55+i*105, y = value => 165-value/maximum*130;
    let lines = '', dots = '';
    rows.forEach(({month,row},i) => {
      if (!row) return;
      if (i > 0 && rows[i-1].row) lines += `<line x1="${x(i-1)}" y1="${y(rows[i-1].row.amountIndex).toFixed(1)}" x2="${x(i)}" y2="${y(row.amountIndex).toFixed(1)}" stroke="#5276c6" stroke-width="3"/>`;
      dots += `<circle cx="${x(i)}" cy="${y(row.amountIndex).toFixed(1)}" r="5" fill="#5276c6"><title>${esc(month)}：第 ${row.rank} 名，金额指数 ${nf.format(row.amountIndex)}</title></circle><text x="${x(i)}" y="${Math.max(18,y(row.amountIndex)-11).toFixed(1)}" text-anchor="middle" class="point-label">${nf.format(row.amountIndex)}</text>`;
    });
    $('export-product-line').innerHTML = `<div class="export-line-heading"><strong>${esc(selected?.title || '请选择产品')}</strong><span>金额指数 · 未入当月商品前 80 榜则留空</span></div><svg viewBox="0 0 640 215" role="img" aria-label="所选产品 4 至 9 月金额指数走势"><line x1="55" y1="165" x2="580" y2="165" stroke="#cad8dc"/><line x1="55" y1="35" x2="580" y2="35" stroke="#e6eff0" stroke-dasharray="4 4"/>${lines}${dots}${exportMonths.map((month,i) => `<text x="${x(i)}" y="192" text-anchor="middle" class="month-label">${Number(month.slice(-2))} 月</text>`).join('')}</svg><div class="export-product-line-note">${rows.map(({month,row}) => `${Number(month.slice(-2))} 月${row ? `第 ${row.rank} 名` : '未进前 80'}`).join(' · ')} · <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">打开商品链接 ↗</a></div>`;
  }
  $('export-product-select').addEventListener('change',renderExportProductLine);
  renderExportProductLine();
  let exportProductPage = 0;
  function renderExportProducts() {
    const month = $('export-product-month').value;
    const previous = exportMonths[exportMonths.indexOf(month)-1];
    const adultOnly = $('export-adult-only').checked;
    const query = $('export-product-search').value.trim().toLowerCase();
    const rows = exportData.products[month].filter(row => (!adultOnly || row.adultShampooCandidate) &&
      (!query || [row.title,row.brand,row.shop].some(value => value.toLowerCase().includes(query))));
    const decorated = rows.map(row => {
      const key = exportProductKey(row);
      const prior = previous && exportProductMaps[previous].get(key);
      const current = exportProductMaps[month].get(key);
      const comparable = prior?.length === 1 && current?.length === 1;
      return {...row,change:comparable ? indexChange(row.amountIndex,prior[0].amountIndex) : null};
    });
    exportProductPage = Math.min(exportProductPage, Math.max(0,Math.ceil(decorated.length / EXPORT_PRODUCT_PAGE_SIZE)-1));
    $('export-product-status').textContent = `${Number(month.slice(-2))} 月符合筛选 ${rows.length} / 80 条 · ${adultOnly ? '成人洗发水候选' : '全部原榜'}`;
    $('export-product-chart-title').textContent = previous ? `${Number(previous.slice(-2))}→${Number(month.slice(-2))} 月代表商品金额指数变动 · 点击条形直接打开商品链接` : '4 月为首期导出，暂无上月对照';
    renderChangeChart('export-product-change-chart',decorated.filter(row => row.rank <= 15 && row.change != null).map(row => ({name:row.title,value:row.change,url:row.productUrl})));
    $('export-product-rows').innerHTML = decorated.slice(exportProductPage*EXPORT_PRODUCT_PAGE_SIZE,(exportProductPage+1)*EXPORT_PRODUCT_PAGE_SIZE).map(row => `<tr><td>${row.rank}</td><td><button type="button" class="export-product-pick" data-product-url="${esc(row.productUrl)}" title="查看这款产品的 4—9 月走势">${esc(row.title)}</button>${row.possibleBundle ? '<span class="badge bundle">标题疑似套装</span>' : ''}<small>${esc(row.leafCategory.split('>').at(-1))}${row.adultShampooCandidate ? '' : ' · 范围外待复核'} · <a href="${esc(row.productUrl)}" target="_blank" rel="noopener noreferrer">商品链接 ↗</a></small></td><td>${esc(row.brand)}</td><td>${esc(row.shop || '—')}</td><td>${esc(row.listedPrice)}</td><td>${nf.format(row.amountIndex)}</td><td>${nf.format(row.unitsIndex)}</td><td>${changeCell(row.change)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty-row">没有符合条件的商品</td></tr>';
    updatePager('export-product',exportProductPage,decorated.length,EXPORT_PRODUCT_PAGE_SIZE);
  }
  $('export-product-month').addEventListener('change',() => {exportProductPage=0;renderExportProducts();});
  $('export-adult-only').addEventListener('change',() => {exportProductPage=0;renderExportProducts();});
  $('export-product-search').addEventListener('input',() => {exportProductPage=0;renderExportProducts();});
  $('export-product-rows').addEventListener('click',event => {
    const button = event.target.closest('[data-product-url]');
    if (!button) return;
    $('export-product-select').value = button.dataset.productUrl;
    renderExportProductLine();
  });
  $('export-product-prev').addEventListener('click',() => {exportProductPage--;renderExportProducts();});
  $('export-product-next').addEventListener('click',() => {exportProductPage++;renderExportProducts();});
  renderExportProducts();
  set('adult-count', nf.format(data.sample.adultCandidates));
  set('child-count', nf.format(data.sample.excludedChildrenByTitle));
  set('bundle-count', nf.format(data.sample.possibleBundles));
  bars('tag-bars', Object.entries(data.sample.tagCounts).sort((a,b)=>b[1]-a[1]), Math.max(...Object.values(data.sample.tagCounts)), '商品');
  bars('sales-bands', Object.entries(data.sample.bandCounts), Math.max(...Object.values(data.sample.bandCounts)), '商品');
  const efficacyFloor=Object.entries(data.feiguaAnnual.channels.efficacySalesFloor).sort((a,b)=>b[1].gmvFloor-a[1].gmvFloor);
  const efficacyMax=Math.max(...efficacyFloor.map(([,value])=>value.gmvFloor));
  $('efficacy-sales-floor').innerHTML=efficacyFloor.map(([tag,value])=>`<div class="bar-row" title="${esc(tag)}：${value.count} 个榜内商品，销售额至少 ${money(value.gmvFloor)}"><span class="bar-label">${esc(tag)}</span><span class="bar-track"><span class="bar-fill" style="width:${(value.gmvFloor/efficacyMax*100).toFixed(1)}%"></span></span><span class="bar-value">≥${money(value.gmvFloor)}</span></div>`).join('');
  Object.keys(data.sample.tagCounts).forEach(tag => $('tag-filter').insertAdjacentHTML('beforeend', `<option value="${esc(tag)}">${esc(tag)}</option>`));
  Object.keys(data.sample.bandCounts).forEach(band => $('band-filter').insertAdjacentHTML('beforeend', `<option value="${esc(band)}">${esc(band)}</option>`));
  let samplePage = 0;
  const filters = ['search','tag-filter','band-filter','bundle-filter'];
  function renderProducts() {
    const query = $('search').value.trim().toLowerCase();
    const tag = $('tag-filter').value;
    const band = $('band-filter').value;
    const bundle = $('bundle-filter').value;
    const found = data.products.filter(p => (!query || p.title.toLowerCase().includes(query) || (p.brand || '').toLowerCase().includes(query)) && (!tag || p.tags.includes(tag)) && (!band || p.salesBand === band) && (!bundle || (bundle === 'bundle' ? p.possibleBundle : !p.possibleBundle)));
    samplePage = Math.min(samplePage,Math.max(0,Math.ceil(found.length / TREND_PAGE_SIZE)-1));
    set('filtered-count', `符合筛选 ${nf.format(found.length)} 件商品`);
    $('product-rows').innerHTML = found.slice(samplePage*TREND_PAGE_SIZE,(samplePage+1)*TREND_PAGE_SIZE).map(p => `<tr><td><span class="rank">${p.rank}</span></td><td><span class="product-name">${esc(p.title)}</span>${p.possibleBundle ? '<span class="badge bundle">可能为套装</span>' : ''}${p.duplicateTitle ? '<span class="badge bundle">同名未合并</span>' : ''}</td><td><span class="brand-name">${esc(p.brand || '未识别')}</span></td><td><span class="sales-band">${esc(p.salesBand)}</span></td><td>${p.tags.map(t=>`<span class="badge">${esc(t)}</span>`).join('') || '<span style="color:#87949c">未识别</span>'}</td><td>${p.influencers == null ? '—' : nf.format(p.influencers)}</td><td>${p.videos == null ? '—' : nf.format(p.videos)}</td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:#607184;padding:30px">没有符合条件的商品</td></tr>';
    updatePager('sample',samplePage,found.length,TREND_PAGE_SIZE);
    set('shown-count', `第 ${samplePage + 1} / ${Math.max(1,Math.ceil(found.length/TREND_PAGE_SIZE))} 页 · 共 ${found.length} 条`);
  }
  filters.forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', () => {samplePage=0;renderProducts();}));
  $('sample-prev').addEventListener('click',() => {samplePage--;renderProducts();});
  $('sample-next').addEventListener('click',() => {samplePage++;renderProducts();});
  renderProducts();
})();
