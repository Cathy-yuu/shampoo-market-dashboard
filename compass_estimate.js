// User-specified exploratory conversion, applied uniformly to Compass amount indices.
(() => {
  const yuanPerPoint = 93.47;
  const wanFormatter = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  });
  window.COMPASS_ESTIMATE = Object.freeze({
    yuanPerPoint,
    yuan(index) { return index == null ? null : Number(index) * yuanPerPoint; },
    text(index) {
      return index == null ? '—' : `¥${wanFormatter.format(Number(index) * yuanPerPoint / 10000)}万`;
    },
  });
})();
