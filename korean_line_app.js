(function () {
  'use strict';
  const data = window.KOREAN_LINE_DATA;
  const root = document.getElementById('korean-lines');
  if (!data || !root) return;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const filters = document.getElementById('korean-line-filters');
  const cards = document.getElementById('korean-line-cards');
  const detail = document.getElementById('korean-line-detail');
  const search = document.getElementById('korean-line-search');
  const status = document.getElementById('korean-line-status');
  const pageLabel = document.getElementById('korean-line-page');
  const prev = document.getElementById('korean-line-prev');
  const next = document.getElementById('korean-line-next');
  let group = '全部路径';
  let page = 0;
  let selected = data.profiles[0].brand;
  const pageSize = 5;

  function visible() {
    const query = search.value.trim().toLowerCase();
    return data.profiles.filter(item =>
      (group === '全部路径' || item.group === group) &&
      (!query || `${item.brand} ${item.mode} ${item.positioning} ${item.productPath}`.toLowerCase().includes(query))
    );
  }

  function renderFilters() {
    const groups = ['全部路径', '头皮科学', '功效单品', '造型与香氛'];
    filters.innerHTML = groups.map(name => {
      const count = name === '全部路径' ? data.profiles.length : data.profiles.filter(item => item.group === name).length;
      return `<button type="button" class="korean-filter${name === group ? ' active' : ''}" data-group="${escape(name)}" aria-pressed="${name === group}">${escape(name)} <span>${count}</span></button>`;
    }).join('');
  }

  function renderDetail() {
    const item = data.profiles.find(profile => profile.brand === selected);
    if (!item) { detail.innerHTML = ''; return; }
    const image = item.imageId ? document.getElementById(item.imageId) : null;
    const imageHtml = image ? `<figure class="korean-line-image"><img src="${escape(image.src)}" alt="${escape(item.brand)} 产品线原表图片" loading="lazy"><figcaption>产品表原图 · ${escape(item.brand)}</figcaption></figure>` : '';
    const rows = item.lines.length ? `<div class="korean-line-table-wrap"><table class="korean-line-table"><thead><tr><th>${item.detailType === '单品概念' ? '单品概念' : '产品线'}</th><th>原表核心定位 / 技术</th><th>原表代表产品 / 表述</th></tr></thead><tbody>${item.lines.map(line => `<tr><td><strong>${escape(line.name)}</strong></td><td>${escape(line.position)}</td><td>${escape(line.representative)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="korean-line-empty">产品表未提供 ${escape(item.brand)} 的结构化品线；上方定位来自 PPT。</div>`;
    detail.innerHTML = `<div class="korean-detail-header"><div><span class="korean-kicker">${escape(item.group)} · PPT 第 ${item.slide} 页</span><h3>${escape(item.brand)}</h3><p>${escape(item.mode)}</p></div><span class="source-pill">${item.lines.length ? item.lines.length + ' 条原表记录' : '仅 PPT 案例'}</span></div><div class="korean-detail-summary"><div><small>定位逻辑</small><p>${escape(item.positioning)}</p></div><div><small>产品路径</small><p>${escape(item.productPath)}</p></div></div>${imageHtml}${rows}<p class="korean-source-note">以上为用户提供资料的整理；原文中的功效、技术、排名和认证尚未独立核验。</p>`;
  }

  function render() {
    renderFilters();
    const list = visible();
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    page = Math.min(page, pages - 1);
    const shown = list.slice(page * pageSize, (page + 1) * pageSize);
    if (shown.length && !shown.some(item => item.brand === selected)) selected = shown[0].brand;
    status.textContent = `显示 ${list.length} / ${data.profiles.length} 个品牌 · 产品表覆盖 8 个品牌`;
    cards.innerHTML = shown.map(item => `<button type="button" class="korean-brand-card${item.brand === selected ? ' active' : ''}" data-brand="${escape(item.brand)}" aria-pressed="${item.brand === selected}"><span>${escape(item.group)}</span><strong>${escape(item.brand)}</strong><small>${escape(item.mode)}</small><em>${item.lines.length ? `${item.lines.length} 条${item.detailType}` : 'PPT 案例'}</em></button>`).join('') || '<p class="korean-line-empty">没有匹配的品牌。</p>';
    pageLabel.textContent = `第 ${page + 1} / ${pages} 页`;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
    if (list.length) renderDetail(); else detail.innerHTML = '';
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    group = button.dataset.group;
    page = 0;
    render();
  });
  cards.addEventListener('click', event => {
    const button = event.target.closest('[data-brand]');
    if (!button) return;
    selected = button.dataset.brand;
    render();
  });
  search.addEventListener('input', () => { page = 0; render(); });
  prev.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => { page++; render(); });
  render();
})();
