(function () {
  'use strict';
  const data = window.BRAND_INGREDIENTS_DATA;
  const select = document.getElementById('brand-ingredient-select');
  const detail = document.getElementById('brand-ingredient-detail');
  const panel = document.getElementById('brand-ingredient-panel');
  if (!data || !select || !detail || !panel) return;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  select.innerHTML = data.brands.map(item => `<option value="${escape(item.brand)}">${escape(item.brand)}</option>`).join('');

  function render() {
    const item = data.brands.find(row => row.brand === select.value);
    if (!item) { detail.innerHTML = ''; return; }
    const shared = item.shared ? `<p class="brand-ingredient-shared">这段资料来自文档中的合并品牌标题“${escape(item.sourceHeading)}”，属于共性描述，未逐一确认到 ${escape(item.brand)} 的具体单品。</p>` : '';
    detail.innerHTML = `<div class="brand-ingredient-title"><div><span>文档对应品牌</span><h4>${escape(item.brand)}</h4></div><small>${item.shared ? '品牌组共性记录' : '单品牌记录'} · ${item.facts.length} 项</small></div>${shared}<div class="brand-ingredient-facts">${item.facts.map(fact => `<div class="brand-ingredient-fact"><strong>${escape(fact.label)}</strong><p>${escape(fact.text)}</p></div>`).join('')}</div><p class="brand-ingredient-source">资料来源：用户提供《品牌成分解析.docx》。上列描述是原文整理，非独立核验结论。</p>`;
  }

  select.addEventListener('change', render);
  document.getElementById('brand-analysis').addEventListener('click', event => {
    const button = event.target.closest('[data-ingredient-brand]');
    if (!button) return;
    select.value = button.dataset.ingredientBrand;
    render();
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  });
  render();
})();
