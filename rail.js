// rail.js：裁剪与越界计数
export function fitOf(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

export function putOf(table, name, value, crossed) {
  const next = table.filter(function (row) { return row[0] !== name; });
  next.push([name, [value, crossed]]);
  next.sort(function (a, b) {
    const x = String(a[0]);
    const y = String(b[0]);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return next;
}
