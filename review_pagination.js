(() => {
  const body = document.getElementById('review-table-body');
  const previous = document.getElementById('review-prev');
  const next = document.getElementById('review-next');
  const status = document.getElementById('review-page-status');
  if (!body || !previous || !next || !status) return;

  const rows = [...body.rows];
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  let page = 0;

  function render() {
    rows.forEach((row, index) => { row.hidden = Math.floor(index / pageSize) !== page; });
    previous.disabled = page === 0;
    next.disabled = page === pageCount - 1;
    const first = rows.length ? page * pageSize + 1 : 0;
    const last = Math.min((page + 1) * pageSize, rows.length);
    status.textContent = `第 ${page + 1} / ${pageCount} 页 · ${first}–${last} / ${rows.length} 条`;
  }

  previous.addEventListener('click', () => { if (page > 0) { page -= 1; render(); } });
  next.addEventListener('click', () => { if (page < pageCount - 1) { page += 1; render(); } });
  render();
})();
