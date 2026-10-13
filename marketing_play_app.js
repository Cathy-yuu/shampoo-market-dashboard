(() => {
  const data = window.MARKETING_PLAY_DATA;
  const sales = window.COMPETITOR_DATA;
  const root = document.querySelector('#marketing-play-map');
  if (!data || !root) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const groupById = Object.fromEntries(data.groups.map(group => [group.id, group]));
  const salesByBrand = Object.fromEntries((sales?.brands || []).map(brand => [brand.name, brand]));
  const groupSelect = document.querySelector('#marketing-play-filter');
  const searchInput = document.querySelector('#marketing-play-search');
  const status = document.querySelector('#marketing-play-status');
  const detail = document.querySelector('#marketing-play-detail');
  const tableBody = document.querySelector('#marketing-play-table');
  let activeBrand = data.brands[0].name;

  const quarters = [
    {id:'selfLive', label:'自营直播为主要成交', sub:'配合专场、代言或付费流量'},
    {id:'creatorLive', label:'外部达人直播为主要成交', sub:'专场与达人分销'},
    {id:'selfVideo', label:'自营直播成交，内容视频放大触达', sub:'短视频、KOC 与自有账号'},
    {id:'creatorVideo', label:'外部分销视频为主要出货', sub:'KOC 视频与商品卡'}
  ];

  function salesContext(brand) {
    const row = salesByBrand[brand];
    if (!row) return '<span class="play-no-sales">未提供同口径逐日表</span>';
    const months = row.monthly.filter(item => item[0] >= '2026-04' && item[0] <= '2026-09');
    if (months.length !== 6) return '<span class="play-no-sales">4—9 月资料不齐</span>';
    const values = months.map(item => Number(item[1]));
    const max = Math.max(...values, 1);
    const points = values.map((value, index) => `${8 + index * 28},${35 - value / max * 27}`).join(' ');
    return `<span class="play-sales-cell"><svg viewBox="0 0 156 40" aria-hidden="true"><polyline points="${points}" fill="none" stroke="#148f82" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg><strong>${values[5].toFixed(0)} 万</strong></span>`;
  }

  function matchingBrands() {
    const group = groupSelect.value;
    const search = searchInput.value.trim().toLowerCase();
    return data.brands.filter(brand => (!group || brand.group === group) && (!search || brand.name.toLowerCase().includes(search) || brand.engine.toLowerCase().includes(search)));
  }

  function brandButton(brand) {
    const group = groupById[brand.group];
    return `<button type="button" class="play-brand ${brand.name === activeBrand ? 'active' : ''}" data-play-brand="${esc(brand.name)}" style="--play-color:${group.color}" aria-pressed="${brand.name === activeBrand}">${esc(brand.name)}</button>`;
  }

  function renderDetail(brand) {
    activeBrand = brand.name;
    const group = groupById[brand.group];
    detail.innerHTML = `<div class="play-detail-top"><div><span class="eyebrow">品牌打法 · ${esc(group.name)}</span><h4>${esc(brand.name)}</h4><p>${esc(brand.engine)}</p></div><span class="play-detail-source">文档观察 + 看板交叉核对</span></div>
      <div class="play-detail-grid">
        <div><span>来源事实</span><p>${esc(brand.evidence)}</p></div>
        <div><span>信任支点</span><p>${esc(brand.trust)}</p></div>
        <div class="positive"><span>可见优势 · 分析判断</span><p>${esc(brand.advantage)}</p></div>
        <div class="caution"><span>依赖点 · 待验证</span><p>${esc(brand.dependency)}</p></div>
      </div><div class="panel-foot">文档的近 30 天数据包含指数、区间和不同链接，未与下方逐日表的月度估算相加。背书、资质和账号关系均按文档记录，未逐项独立核验。</div>`;
    root.querySelectorAll('[data-play-brand]').forEach(button => {
      const active = button.dataset.playBrand === brand.name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    tableBody.querySelectorAll('[data-play-row]').forEach(row => row.classList.toggle('active', row.dataset.playRow === brand.name));
  }

  function render() {
    const visible = matchingBrands();
    status.textContent = `展示 ${visible.length} / ${data.brands.length} 个品牌 · ${new Set(visible.map(brand => brand.group)).size} 类主要模式`;
    root.innerHTML = `<div class="play-group-grid">${data.groups.map(group => {
      const members = visible.filter(brand => brand.group === group.id);
      if (!members.length) return '';
      return `<article class="play-group-card" style="--play-color:${group.color}"><div class="play-group-head"><span>${members.length} 品牌</span><h4>${esc(group.name)}</h4></div><p>${esc(group.brief)}</p><div class="play-chip-list">${members.map(brandButton).join('')}</div></article>`;
    }).join('')}</div><div class="play-quadrant">
      <div class="play-axis-top">主要转化路径：左侧偏自营　→　右侧偏外部达人</div>
      <div class="play-quadrant-grid">${quarters.map(quarter => `<div class="play-quadrant-cell"><strong>${esc(quarter.label)}</strong><small>${esc(quarter.sub)}</small><div class="play-chip-list">${visible.filter(brand => brand.quadrant === quarter.id).map(brandButton).join('') || '<span class="play-empty">当前筛选无品牌</span>'}</div></div>`).join('')}</div>
      <div class="play-axis-bottom">上排以直播为主要成交　/　下排更倚重视频内容或商品卡</div></div>`;
    tableBody.innerHTML = visible.map(brand => `<tr data-play-row="${esc(brand.name)}"><td><button type="button" class="play-table-brand" data-play-brand="${esc(brand.name)}">${esc(brand.name)}</button></td><td><span class="play-group-dot" style="background:${groupById[brand.group].color}"></span>${esc(groupById[brand.group].name)}</td><td>${esc(brand.engine)}</td><td>${esc(brand.trust)}</td><td>${salesContext(brand.name)}</td></tr>`).join('') || '<tr><td colspan="5" class="play-empty-row">没有匹配的品牌</td></tr>';
    const selection = visible.find(brand => brand.name === activeBrand) || visible[0];
    if (selection) renderDetail(selection);
    else detail.innerHTML = '<p>没有匹配的品牌，请调整筛选条件。</p>';
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-play-brand]');
    if (button) renderDetail(data.brands.find(brand => brand.name === button.dataset.playBrand));
  });
  tableBody.addEventListener('click', event => {
    const button = event.target.closest('[data-play-brand]');
    if (button) renderDetail(data.brands.find(brand => brand.name === button.dataset.playBrand));
  });
  groupSelect.innerHTML = '<option value="">市场纵览</option>' + data.groups.map(group => `<option value="${group.id}">${esc(group.name)}</option>`).join('');
  groupSelect.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  render();
})();
