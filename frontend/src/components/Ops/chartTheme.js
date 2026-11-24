export function getChartTheme(root = typeof document === 'undefined' ? null : document.querySelector('.ops')) {
  const styles = root && getComputedStyle(root);
  const token = (name) => styles?.getPropertyValue(name).trim() || 'var(' + name + ')';
  return {
    axis: { axisLine: false, tickLine: false, tick: { fill: token('--o-muted'), fontSize: token('--o-fs-xs') } },
    grid: { vertical: false, stroke: token('--o-chart-grid') },
    tooltip: {
      contentStyle: {
        backgroundColor: token('--o-surface'), border: '1px solid ' + token('--o-line'),
        borderRadius: token('--o-r-2'), color: token('--o-ink'), boxShadow: token('--o-shadow-float'),
      },
      cursor: { fill: token('--o-sunken') },
    },
    series: token('--o-chart-1'),
    series2: token('--o-chart-2'),
    mark: token('--o-mark'),
  };
}
