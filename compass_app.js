(() => {
  const shampoo = window.MARKET_DATA?.compassExports;
  const additional = window.COMPASS_CATEGORY_DATA || {};
  if (!shampoo) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const nf = new Intl.NumberFormat('zh-CN');
  const estimate = window.COMPASS_ESTIMATE;
  const monthLabel = month => `${Number(month.slice(-2))} 月`;
  const rangeLabel = months => months.length ? `${Number(months[0].slice(-2))}—${Number(months.at(-1).slice(-2))} 月` : '暂无月榜';
  const change = (now, before) => now != null && before > 0 ? (now / before - 1) * 100 : null;
  const percent = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  const changeCell = value => value == null ? '<span class="unavailable">—</span>' : `<span class="change ${value >= 0 ? 'up' : 'down'}">${percent(value)}</span>`;
  const source = {
    shampoo: {...shampoo, label:'洗发水', status:'ready', leafLabel:'成人洗发水', files:Array(12)},
    ...additional,
  };
  let category = 'shampoo';
  let dataset, months, brandMaps, brandNames, brandRows, productMaps, productChoices;
  let productPage = 0;
  const safeUrl = url => /^https:\/\/haohuo\.jinritemai\.com\/ecommerce\/trade\/detail\/index\.html\?id=\d+$/.test(url || '') ? url : '';

  function pager(total) {
    const pages = Math.max(1, Math.ceil(total / 5));
    productPage = Math.max(0, Math.min(productPage, pages - 1));
    $('export-product-prev').disabled = productPage === 0;
    $('export-product-next').disabled = productPage >= pages - 1;
    $('export-product-page').textContent = `第 ${productPage + 1} / ${pages} 页 · 共 ${total} 条`;
  }

  function changeChart(id, rows) {
    const maximum = Math.max(1, ...rows.map(row => Math.abs(row.value)));
    $(id).innerHTML = rows.length ? rows.map(row => {
      const width = Math.abs(row.value) / maximum * 48;
      const left = row.value >= 0 ? 50 : 50 - width;
      const url = safeUrl(row.url);
      const tag = url ? 'a' : 'div';
      return `<${tag} class="change-chart-row${url ? ' change-chart-link' : ''}"${url ? ` href="${esc(url)}" target="_blank" rel="noopener noreferrer"` : ''}><span title="${esc(row.name)}">${esc(row.name)}</span><span class="change-axis"><i class="${row.value >= 0 ? 'up' : 'down'}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%"></i></span><strong class="${row.value >= 0 ? 'positive' : 'negative'}">${percent(row.value)}</strong></${tag}>`;
    }).join('') : '<p class="mix-empty">所选月份没有可比较记录。</p>';
  }

  function lineChart(id, title, values, color, ranks, mode = 'index') {
    const maximum = Math.max(1, ...values.filter(value => value != null)) * 1.15;
    const left = 55, right = 580, bottom = 165;
    const x = index => months.length === 1 ? (left + right) / 2 : left + index * (right - left) / (months.length - 1);
    const y = value => bottom - value / maximum * 130;
    let lines = '', dots = '';
    values.forEach((value, index) => {
      if (value == null) return;
      if (index && values[index - 1] != null) lines += `<line x1="${x(index - 1).toFixed(1)}" y1="${y(values[index - 1]).toFixed(1)}" x2="${x(index).toFixed(1)}" y2="${y(value).toFixed(1)}" stroke="${color}" stroke-width="3"/>`;
      dots += `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="5" fill="${color}"><title>${esc(months[index])}：${ranks?.[index] ? `第 ${ranks[index]} 名，` : ''}销售额估算 ${estimate.text(value)}，金额指数 ${nf.format(value)}</title></circle><text x="${x(index).toFixed(1)}" y="${Math.max(18, y(value) - 11).toFixed(1)}" text-anchor="middle" class="point-label">${mode === 'estimate' ? estimate.text(value) : nf.format(value)}</text>`;
    });
    const metric = mode === 'estimate' ? '销售额估算' : '金额指数';
    const explanation = mode === 'estimate' ? `按 ${estimate.yuanPerPoint.toFixed(2)} 元／点换算；曲线形状与指数走势相同` : '原始榜单指数；缺席月份留空';
    $(id).innerHTML = `<div class="export-line-heading"><strong title="${esc(title)}">${esc(title)} · ${metric}走势</strong><span>${explanation}</span></div><svg viewBox="0 0 640 215" role="img" aria-label="${esc(title)} ${esc(rangeLabel(months))}${metric}走势"><line x1="55" y1="165" x2="580" y2="165" stroke="#cad8dc"/><line x1="55" y1="35" x2="580" y2="35" stroke="#e6eff0" stroke-dasharray="4 4"/>${lines}${dots}${months.map((month, index) => `<text x="${x(index).toFixed(1)}" y="192" text-anchor="middle" class="month-label">${monthLabel(month)}</text>`).join('')}</svg>`;
  }

  function renderBrandLine() {
    const name = $('export-brand-select').value;
    const values = months.map(month => brandMaps[month].get(name)?.amountIndex ?? null);
    lineChart('export-brand-line', name, values, '#138f7b');
    lineChart('export-brand-sales-line', name, values, '#c08039', null, 'estimate');
    const groups = [
      ['相邻月份', months.slice(1).map((_, index) => [index, index + 1])],
      ['跨两个月', months.slice(2).map((_, index) => [index, index + 2])],
    ];
    $('export-brand-deltas').innerHTML = groups.map(([title, pairs]) => `<div><strong>${title}</strong><div>${pairs.map(([from, to]) => `<span>${Number(months[from].slice(-2))}→${monthLabel(months[to])} ${changeCell(change(values[to], values[from]))}</span>`).join('') || '<span>暂无连续月份</span>'}</div></div>`).join('');
  }

  function renderBrandSort() {
    const selector = $('export-brand-sort');
    const [kind, fromMonth, toMonth] = selector.value.split(':');
    const label = selector.selectedOptions[0]?.textContent || '';
    const from = months.indexOf(fromMonth), to = months.indexOf(toMonth);
    const displayMonth = kind === 'rank' ? from : to;
    const rows = brandRows.map((row, index) => ({
      index, name:row.name,
      amountIndex:row.monthly[displayMonth]?.amountIndex ?? null,
      value:kind === 'rank' ? row.monthly[from]?.rank ?? null : change(row.monthly[to]?.amountIndex, row.monthly[from]?.amountIndex),
    })).filter(row => row.value != null)
      .sort((a,b) => kind === 'rank' ? a.value - b.value : b.value - a.value).slice(0,10);
    $('export-brand-sort-title').textContent = `${label} · ${kind === 'rank' ? '当月前 10 名' : '可比较品牌前 10 名'}`;
    $('export-brand-sort-results').innerHTML = rows.length
      ? `<div class="export-brand-sort-head"><span>序号</span><span>品牌</span><span>${monthLabel(months[displayMonth])}销售额估算</span><span>${monthLabel(months[displayMonth])}金额指数</span><span>${kind === 'rank' ? '当月名次' : '指数变动'}</span></div>`
        + rows.map((row, index) => `<button type="button" data-brand-index="${row.index}"><b>${String(index + 1).padStart(2,'0')}</b><span>${esc(row.name)}</span><span class="estimate-value">${estimate.text(row.amountIndex)}</span><span>${nf.format(row.amountIndex)}</span><strong>${kind === 'rank' ? `第 ${row.value} 名` : percent(row.value)}</strong></button>`).join('')
      : '<p class="mix-empty">所选月份没有可比较品牌。</p>';
  }

  function renderProductLine() {
    const url = $('export-product-select').value;
    const rows = months.map(month => ({month, row:dataset.products[month].find(item => item.productUrl === url)}));
    const selected = [...rows].reverse().find(item => item.row)?.row;
    const values = rows.map(item => item.row?.amountIndex ?? null);
    const ranks = rows.map(item => item.row?.rank);
    lineChart('export-product-line', selected?.title || '请选择产品', values, '#5276c6', ranks);
    lineChart('export-product-sales-line', selected?.title || '请选择产品', values, '#c08039', ranks, 'estimate');
    const rankNote = rows.map(({month,row}) => `${monthLabel(month)}${row ? `第 ${row.rank} 名` : '未入该月榜单'}`).join(' · ');
    const link = safeUrl(url) ? ` · <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">打开商品链接 ↗</a>` : '';
    $('export-product-line').insertAdjacentHTML('beforeend', `<div class="export-product-line-note">${rankNote}${link}</div>`);
  }

  function renderProducts() {
    const month = $('export-product-month').value;
    const previous = months[months.indexOf(month) - 1];
    const inCategoryOnly = $('export-adult-only').checked;
    const query = $('export-product-search').value.trim().toLowerCase();
    const original = dataset.products[month];
    const rows = original.filter(row => (!inCategoryOnly || (category === 'shampoo' ? row.adultShampooCandidate : row.inCategory)) &&
      (!query || [row.title,row.brand,row.shop].some(value => String(value || '').toLowerCase().includes(query))));
    const decorated = rows.map(row => {
      const prior = previous && productMaps[previous].get(row.productUrl);
      const current = productMaps[month].get(row.productUrl);
      return {...row, change:prior?.length === 1 && current?.length === 1 ? change(row.amountIndex, prior[0].amountIndex) : null};
    });
    pager(decorated.length);
    $('export-product-status').textContent = `${monthLabel(month)}符合筛选 ${rows.length} / ${original.length} 条 · ${inCategoryOnly ? $('export-category-filter-label').textContent : '全部原榜'}`;
    $('export-product-chart-title').textContent = previous ? `${Number(previous.slice(-2))}→${monthLabel(month)}代表商品金额指数变动 · 点击条形打开商品链接` : `${monthLabel(month)}为本类目首期导出，暂无上月对照`;
    changeChart('export-product-change-chart', decorated.filter(row => row.rank <= 15 && row.change != null)
      .map(row => ({name:row.title,value:row.change,url:row.productUrl})));
    $('export-product-rows').innerHTML = decorated.slice(productPage * 5, (productPage + 1) * 5).map(row => `<tr><td>${row.rank}</td><td><button type="button" class="export-product-pick" data-product-url="${esc(row.productUrl)}" title="查看这款产品的月度走势">${esc(row.title)}</button>${row.possibleBundle ? '<span class="badge bundle">标题疑似套装</span>' : ''}<small>${esc(row.leafCategory.split('>').at(-1))}${(category === 'shampoo' ? row.adultShampooCandidate : row.inCategory) ? '' : ' · 范围外待复核'} · <a href="${esc(row.productUrl)}" target="_blank" rel="noopener noreferrer">商品链接 ↗</a></small></td><td>${esc(row.brand)}</td><td>${esc(row.shop || '—')}</td><td>${esc(row.listedPrice)}</td><td class="estimate-value">${estimate.text(row.amountIndex)}</td><td>${nf.format(row.amountIndex)}</td><td>${row.unitsIndex == null ? '—' : nf.format(row.unitsIndex)}</td><td>${changeCell(row.change)}</td></tr>`).join('') || '<tr><td colspan="9" class="empty-row">没有符合条件的商品</td></tr>';
  }

  function renderCategory() {
    dataset = source[category];
    if (!dataset) return;
    for (const id of ['export-brand-select','export-brand-sort','export-product-select','export-product-month','export-product-search','export-adult-only']) $(id).disabled = false;
    months = dataset.months;
    const latest = months.at(-1), previous = months.at(-2);
    const latestBrands = dataset.brands[latest], latestProducts = dataset.products[latest];
    brandMaps = Object.fromEntries(months.map(month => [month, new Map(dataset.brands[month].map(row => [row.brand,row]))]));
    brandNames = [...new Set([...months].reverse().flatMap(month => dataset.brands[month].map(row => row.brand)))];
    brandRows = brandNames.map(name => ({name, monthly:months.map(month => brandMaps[month].get(name))}));
    productMaps = Object.fromEntries(months.map(month => {
      const grouped = new Map();
      dataset.products[month].forEach(row => grouped.set(row.productUrl, [...(grouped.get(row.productUrl) || []), row]));
      return [month, grouped];
    }));
    productChoices = [...new Map(months.flatMap(month => dataset.products[month].map(row => [row.productUrl, {...row,month}]))).values()]
      .sort((a,b) => b.month.localeCompare(a.month) || a.rank - b.rank);
    const comparable = latestBrands.filter(row => brandMaps[previous]?.has(row.brand));
    const rising = comparable.filter(row => row.amountIndex > brandMaps[previous].get(row.brand).amountIndex);
    const inCategoryCount = latestProducts.filter(row => category === 'shampoo' ? row.adultShampooCandidate : row.inCategory).length;
    const period = rangeLabel(months);
    $('compass-title').textContent = `${dataset.label}榜单 · ${period}`;
    $('compass-source-pill').textContent = `罗盘·策略 · ${dataset.files.length} 份月榜 Excel`;
    $('compass-category-coverage').textContent = `2026 年 ${period} · ${months.length} 个月`;
    $('compass-scope-note').textContent = `当前为${dataset.label}罗盘月榜（${period}）。销售额估算统一按金额指数 × ${estimate.yuanPerPoint.toFixed(2)} 元／点试算；品牌榜、商品榜及所有细分类目均使用同一系数。原始金额与件数仍为榜单指数，估算额不是罗盘实际 GMV；跨类目换算尚未经验证。文件仅标月份，年份按资料上下文推定为 2026。${dataset.note || ''}`;
    $('compass-overview-title').textContent = `罗盘${dataset.label}导出榜 · ${period}`;
    $('compass-overview-subtitle').textContent = `最新月品牌 ${latestBrands.length} 条、商品 ${latestProducts.length} 条；各月条数以原文件为准`;
    $('compass-file-count').textContent = `${dataset.files.length} 份 Excel · 文件名标注月份`;
    const note = category === 'shampoo'
      ? '工作簿未写年份、页面筛选条件或人民币金额；品牌榜未排除儿童商品。商品按标题与叶子类目初筛成人候选。'
      : `来源：用户提供的“${dataset.label}”月度品牌榜和商品榜。工作簿未写年份、页面筛选条件或人民币金额；商品榜含少量其他叶子类目，可用下方复选框筛选。${dataset.note || ''}`;
    $('compass-overview-note').textContent = note;
    $('export-kpis').innerHTML = [
      ['最新榜首品牌',latestBrands[0].brand,`${monthLabel(latest)}销售额估算 ${estimate.text(latestBrands[0].amountIndex)} · 金额指数 ${nf.format(latestBrands[0].amountIndex)}`],
      [`${Number(previous.slice(-2))}→${monthLabel(latest)}可比较品牌`,`${comparable.length} / ${latestBrands.length}`,'均进入相邻两个月品牌榜'],
      ['金额指数上升',`${rising.length} 个品牌`,'只表示榜单指数上升'],
      [`${monthLabel(latest)}${category === 'shampoo' ? '成人候选' : '本类目商品'}`,`${inCategoryCount} / ${latestProducts.length}`,'按标题与叶子类目初筛'],
    ].map(([label,value,detail]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></div>`).join('');
    $('export-category-filter-label').textContent = category === 'shampoo' ? '仅成人洗发水候选' : `仅叶子类目为${dataset.leafLabel}`;
    $('compass-product-subtitle').textContent = `按月查看${dataset.label}商品金额指数与原榜记录；默认仅看本类目候选`;
    $('export-brand-select').innerHTML = brandNames.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
    $('export-brand-select').value = latestBrands[0].brand;
    $('export-brand-sort').innerHTML = [
      `<optgroup label="当月名次">${[...months].reverse().map(month => `<option value="rank:${month}">${monthLabel(month)}名次</option>`).join('')}</optgroup>`,
      `<optgroup label="相邻月份金额指数变动">${months.slice(1).reverse().map(month => {const before = months[months.indexOf(month) - 1]; return `<option value="change:${before}:${month}">${Number(before.slice(-2))}→${monthLabel(month)}变动</option>`;}).join('')}</optgroup>`,
      `<optgroup label="跨两个月金额指数变动">${months.slice(2).reverse().map(month => {const before = months[months.indexOf(month) - 2]; return `<option value="change:${before}:${month}">${Number(before.slice(-2))}→${monthLabel(month)}变动</option>`;}).join('')}</optgroup>`,
    ].join('');
    $('export-brand-change-title').textContent = `${Number(previous.slice(-2))}→${monthLabel(latest)}金额指数变动 · 最新月前 ${Math.min(15,latestBrands.length)} 名中的可比较品牌 · 最多显示 10 个`;
    const brandChanges = brandRows.map(row => ({name:row.name, latestRank:row.monthly.at(-1)?.rank,
      value:change(row.monthly.at(-1)?.amountIndex,row.monthly.at(-2)?.amountIndex)}))
      .filter(row => row.latestRank && row.latestRank <= 15 && row.value != null)
      .sort((a,b) => b.value - a.value).slice(0,10);
    changeChart('export-brand-change-chart', brandChanges);
    $('export-product-select').innerHTML = productChoices.map(row => `<option value="${esc(row.productUrl)}">${esc(row.brand)} · ${esc(row.title.slice(0,38))}</option>`).join('');
    $('export-product-month').innerHTML = [...months].reverse().map(month => `<option value="${month}">${monthLabel(month)}</option>`).join('');
    $('export-product-search').value = '';
    $('export-adult-only').checked = true;
    productPage = 0;
    renderBrandLine(); renderBrandSort(); renderProductLine(); renderProducts();
  }

  $('compass-category').addEventListener('change', event => {category = event.target.value; renderCategory();});
  $('export-brand-select').addEventListener('change', renderBrandLine);
  $('export-brand-sort').addEventListener('change', renderBrandSort);
  $('export-brand-sort-results').addEventListener('click', event => {
    const button = event.target.closest('[data-brand-index]');
    if (!button) return;
    $('export-brand-select').value = brandRows[Number(button.dataset.brandIndex)].name;
    renderBrandLine();
  });
  $('export-product-select').addEventListener('change', renderProductLine);
  $('export-product-month').addEventListener('change', () => {productPage = 0; renderProducts();});
  $('export-adult-only').addEventListener('change', () => {productPage = 0; renderProducts();});
  $('export-product-search').addEventListener('input', () => {productPage = 0; renderProducts();});
  $('export-product-rows').addEventListener('click', event => {
    const button = event.target.closest('[data-product-url]');
    if (!button) return;
    $('export-product-select').value = button.dataset.productUrl;
    renderProductLine();
  });
  $('export-product-prev').addEventListener('click', () => {productPage--; renderProducts();});
  $('export-product-next').addEventListener('click', () => {productPage++; renderProducts();});
  renderCategory();
})();
