(() => {
  const data = window.POSITIONING_DATA;
  const compass = window.MARKET_DATA?.compassExports;
  const map = document.getElementById('positioning-map');
  const detail = document.getElementById('positioning-detail');
  const kpis = document.getElementById('positioning-kpis');
  const dimensionSelect = document.getElementById('positioning-dimension');
  const categorySelect = document.getElementById('positioning-category');
  const status = document.getElementById('positioning-map-status');
  if (!map || !detail || !kpis || !dimensionSelect || !categorySelect || !status) return;
  if (!data || !Array.isArray(data.records) || !data.records.length) {
    map.textContent = '定位数据未加载。请重新生成竞品拆解数据。';
    return;
  }

  const esc = value => String(value == null || value === '' ? '—' : value)
    .replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const nf = new Intl.NumberFormat('zh-CN');
  const estimate = window.COMPASS_ESTIMATE;
  const colors = ['#178b86', '#5276c6', '#d79a52', '#866bb5', '#67a48f', '#bf7590', '#6f98b2'];
  const dimensions = {
    position: '产品定位',
    sellingPointPosition: '直播间主讲卖点',
    endorsementType: '背书类型',
    channelTactic: '产品渠道打法',
  };
  let selectedIndex = 0;

  function valuesForDimension(dimension) {
    const values = [...new Set(data.records.map(record => record[dimension] || '未填写'))];
    const prescribed = dimension === 'position' ? data.groups
      : dimension === 'sellingPointPosition' ? data.sellingPointGroups : null;
    return prescribed
      ? prescribed.filter(value => values.includes(value))
      : values.sort((a, b) => data.records.filter(record => (record[dimension] || '未填写') === b).length
        - data.records.filter(record => (record[dimension] || '未填写') === a).length || a.localeCompare(b, 'zh-CN'));
  }

  function refreshCategories() {
    const dimension = dimensionSelect.value;
    const values = valuesForDimension(dimension);
    categorySelect.innerHTML = '<option value="">全部类别</option>'
      + values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
    categorySelect.value = '';
  }

  function field(label, value) {
    return `<div class="positioning-field"><span>${esc(label)}</span><p>${esc(value)}</p></div>`;
  }

  function resolveCompassBrand(brand) {
    if (!compass) return null;
    const names = new Set(compass.months.flatMap(month => compass.brands[month].map(row => row.brand)));
    if (names.has(brand)) return brand;
    const aliases = [...names].filter(name => name.startsWith(`${brand}/`));
    return aliases.length === 1 ? aliases[0] : null;
  }

  function compassDetail(brand) {
    if (!compass) return '<div class="panel-foot">罗盘数据未加载。</div>';
    const matched = resolveCompassBrand(brand);
    if (!matched) return `<div class="positioning-compass"><h4>罗盘 4—9 月品牌金额指数</h4><p class="positioning-empty">${esc(brand)}未出现在这六个月的品牌前 30 榜单中。</p></div>`;
    const brandRows = compass.months.map(month => ({
      month, row: compass.brands[month].find(row => row.brand === matched),
    }));
    return `<div class="positioning-compass"><h4>罗盘 4—9 月品牌金额指数</h4><p class="positioning-compass-note">罗盘榜单名称：${esc(matched)}。销售额估算统一按金额指数 × ${estimate.yuanPerPoint.toFixed(2)} 元／点试算；品牌榜尚未经实际销售额校准，未进当月前 30 的月份留空。</p>
      <div class="positioning-compass-series">${brandRows.map(({month,row}) => `<div class="positioning-compass-month"><span>${Number(month.slice(-2))} 月</span><strong>${row ? estimate.text(row.amountIndex) : '—'}</strong><small>${row ? `金额指数 ${nf.format(row.amountIndex)}` : '未进前 30'}</small></div>`).join('')}</div></div>`;
  }

  function select(index) {
    const record = data.records[index];
    if (!record) return;
    selectedIndex = index;
    map.querySelectorAll('[data-position-index]').forEach(button => {
      const active = Number(button.dataset.positionIndex) === index;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const productLink = record.productUrl
      ? `<a class="positioning-product-link" href="${esc(record.productUrl)}" target="_blank" rel="noopener noreferrer">查看原表商品链接 ↗</a>` : '';
    const correction = record.positionAdjusted
      ? `<p class="positioning-correction">展示分类按你的要求调整为“${esc(record.position)}”；原表产品性质为“${esc(record.rawPosition)}”。</p>` : '';
    detail.innerHTML = `
      <div class="panel-head positioning-detail-head"><div><span class="eyebrow">商品定位详情 · 来源表第 ${record.sourceRow} 行</span><h3>${esc(record.brand)}</h3><p>${esc(record.position)} · 直播间主讲卖点：${esc(record.sellingPointPosition)}</p>${correction}</div>${productLink}</div>
      <div class="positioning-detail-grid">
        ${field('直播间主讲卖点（用户指定）', record.sellingPointPosition)}
        ${record.sellingPointDetail ? field('原指定说法', record.sellingPointDetail) : ''}
        ${record.sellingPointContext ? field('品牌层面卖点补充（用户指定）', record.sellingPointContext) : ''}
        ${field('核心卖点（原表记录）', record.sellingPoints)}
        ${field('核心成分（原表记录）', record.ingredients)}
        ${field('规格与 SKU / 价格', [record.size, record.skuPrice].filter(Boolean).join(' · '))}
        ${field('产品渠道打法', record.channelTactic)}
        ${field('背书类型与具体背书（原表记录）', [record.endorsementType, record.endorsementDetails].filter(Boolean).join(' · '))}
        ${field('数据报告 / 实测说法（原表记录）', record.dataReport)}
        ${field('直播间风格', record.liveStyle)}
        ${field('单链接最大销量（原表值）', record.maxLinkSales)}
      </div>
      <details class="positioning-script"><summary>查看直播间话术框架</summary><p>${esc(record.liveScript)}</p></details>
      ${compassDetail(record.brand)}
      <div class="panel-foot">直播间主讲卖点与 EHD 分类按你的补充展示；其余定位与营销说法来自竞品拆解表。罗盘品牌榜的销售额估算仅按统一系数试算，不是实际人民币成交额。</div>`;
  }

  function renderMap() {
    const dimension = dimensionSelect.value;
    const category = categorySelect.value;
    const groups = valuesForDimension(dimension)
      .filter(name => !category || name === category)
      .map((name, index) => ({name, color: colors[index % colors.length], records: data.records.filter(record => (record[dimension] || '未填写') === name)}));
    const max = Math.max(1, ...groups.map(group => group.records.length));
    const visibleRecords = groups.flatMap(group => group.records);
    kpis.innerHTML = [
      ['商品记录', visibleRecords.length, `全部样本 ${data.records.length} 条`],
      ['品牌', new Set(visibleRecords.map(record => record.brand)).size, '按品牌名称去重'],
      ['当前类别', groups.length, dimensions[dimension]],
    ].map(([name, value, note]) => `<div><span>${esc(name)}</span><strong>${value}</strong><small>${esc(note)}</small></div>`).join('');
    status.textContent = `${dimensions[dimension]} · ${category || '全部类别'} · ${visibleRecords.length} 条商品记录`;
    map.innerHTML = groups.map(group => `
      <div class="positioning-row">
        <div class="positioning-name"><i style="background:${group.color}"></i><strong>${esc(group.name)}</strong></div>
        <div class="positioning-content">
          <div class="positioning-track" aria-label="${esc(group.name)}：${group.records.length} 条商品记录"><span style="width:${(group.records.length/max*100).toFixed(1)}%;background:${group.color}"></span></div>
          <div class="positioning-brands">${group.records.map(record => {
            const index = data.records.indexOf(record);
            return `<button type="button" data-position-index="${index}" title="查看${esc(record.brand)}的定位及罗盘数据">${esc(record.brand)}</button>`;
          }).join('')}</div>
        </div>
        <div class="positioning-count"><strong>${group.records.length}</strong><span>款</span></div>
      </div>`).join('');
    if (!visibleRecords.some(record => data.records.indexOf(record) === selectedIndex)) {
      selectedIndex = data.records.indexOf(visibleRecords[0]);
    }
    select(selectedIndex);
  }

  dimensionSelect.addEventListener('change', () => { refreshCategories(); renderMap(); });
  categorySelect.addEventListener('change', renderMap);
  map.addEventListener('click', event => {
    const button = event.target.closest('[data-position-index]');
    if (button) select(Number(button.dataset.positionIndex));
  });
  refreshCategories();
  renderMap();
})();
