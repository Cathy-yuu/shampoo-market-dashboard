(() => {
  const data = window.XHS_COMMENT_DATA;
  const root = document.getElementById('xhs-comments');
  if (!root) return;
  if (!data || !Array.isArray(data.categories) || !data.categories.length) {
    root.querySelector('#xhs-kpis').textContent = '评论汇总未加载，请重新生成页面。';
    return;
  }
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = new Intl.NumberFormat('zh-CN');
  const share = (count, total) => total ? (count / total * 100).toFixed(1) + '%' : '0.0%';
  const categorySelect = $('xhs-category');
  categorySelect.innerHTML = data.categories.map(category => `<option value="${esc(category.key)}">${esc(category.key)}</option>`).join('');

  function render() {
    const category = data.categories.find(item => item.key === categorySelect.value) || data.categories[0];
    $('xhs-period').textContent = `评论日期：${category.firstComment}—${category.lastComment}`;
    $('xhs-kpis').innerHTML = [
      ['采集笔记', number.format(category.postCount), '源文件中的笔记数'],
      ['去重评论', number.format(category.commentCount), '按文件内评论 ID 去重'],
      ['明确相关评论', number.format(category.relevantCount), '评论文本命中洗护词'],
      ['显式提及比例', share(category.relevantCount, category.commentCount), '占该类目去重评论'],
    ].map(([label, value, note]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');

    const top = category.themes.slice(0, 3);
    const leadingPost = category.topPosts[0];
    $('xhs-insight').innerHTML = `<strong>${esc(category.key)} · 样本观察</strong><p>在 ${number.format(category.relevantCount)} 条明确相关评论中，提及较多的话题是 ${top.map(item => `${esc(item.name)} ${number.format(item.count)} 条（${share(item.count, category.relevantCount)}）`).join('、')}。${leadingPost ? `单篇笔记最多贡献 ${share(leadingPost.count, category.relevantCount)} 的明确相关评论；` : ''}这些是话题提及，不能判断评论持赞成或反对态度。</p>`;
    $('xhs-themes').innerHTML = category.themes.map(item => {
      const percent = category.relevantCount ? item.count / category.relevantCount * 100 : 0;
      return `<div class="xhs-theme-row"><span>${esc(item.name)}</span><div class="xhs-theme-track"><i style="width:${Math.min(percent, 100).toFixed(1)}%"></i></div><strong>${number.format(item.count)} <small>· ${share(item.count, category.relevantCount)}</small></strong></div>`;
    }).join('');

    const max = Math.max(1, ...category.months.map(item => item.count));
    $('xhs-months').innerHTML = category.months.map(item => `<div class="xhs-month"><strong>${number.format(item.count)}</strong><div class="xhs-month-track"><i style="height:${(item.count ? Math.max(2, item.count / max * 100) : 0).toFixed(1)}%"></i></div><span>${Number(item.month.slice(-2))} 月</span></div>`).join('');
    $('xhs-posts').innerHTML = category.topPosts.map((item, index) => `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(item.title)}</strong><small>${number.format(item.count)} 条明确相关评论 ↗</small></a>`).join('');
  }
  categorySelect.addEventListener('change', render);
  render();
})();
