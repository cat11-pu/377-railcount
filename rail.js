// rail.js：裁剪与越界计数
export function fitOf(value, low, high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

export function putOf(table, name, value, crossed) {
  const next = [];
  let found = false;
  for (const row of table) {
    if (row[0] === name) {
      next.push([name, [value, row[1][1] + crossed]]);
      found = true;
    } else {
      next.push([row[0], [row[1][0], row[1][1]]]);
    }
  }
  if (!found) next.push([name, [value, crossed]]);
  next.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return next;
}
