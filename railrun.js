// railrun.js：按处理预算处理并留账，收尾把账补齐
import { fitOf, putOf } from "./rail.js";

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function isIntegerValue(value) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function cloneState(state) {
  const src = state || {};
  return {
    table: (src.table || []).map(function (row) { return [row[0], [row[1][0], row[1][1]]]; }),
    shown: (src.shown || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    ledger: (src.ledger || []).map(function (entry) {
      return { kind: entry.kind, name: entry.name, value: entry.value, id: entry.id };
    }),
    applied: (src.applied || []).slice()
  };
}

function codes(spec) {
  return {
    badName: spec.bad_name_code || "E_BAD_NAME",
    badValue: spec.bad_value_code || "E_BAD_VALUE",
    noName: spec.no_name_code || "E_NO_NAME",
    badEvent: spec.event_error_code || "E_BAD_EVENT"
  };
}

// 先做全部静态校验：结构 -> 名字 -> 读数，任何一条不合法整批不动。
function validate(events, already, err) {
  events.forEach(function (event) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
      throw fail(err.badEvent);
    }
    if (event.kind !== "put" && event.kind !== "show") {
      throw fail(err.badEvent);
    }
    if (event.id !== undefined && already.indexOf(event.id) !== -1) {
      return;
    }
    if (typeof event.name !== "string" || event.name.length === 0) {
      throw fail(typeof event.name === "string" ? err.badName : err.badEvent);
    }
    if (event.kind === "put" && !isIntegerValue(event.value)) {
      throw fail(err.badValue);
    }
  });
}

// 账上的条目内部带 id，对外只露三元组。
function ledgerView(ledger) {
  return ledger.map(function (entry) {
    return [entry.kind, entry.name, entry.value];
  });
}

function findRow(table, name) {
  for (let i = 0; i < table.length; i += 1) {
    if (table[i][0] === name) return table[i][1];
  }
  return null;
}

function applyEntry(state, entry, low, high, err) {
  if (entry.kind === "put") {
    let crossed = 0;
    const previous = findRow(state.table, entry.name);
    if (previous) crossed = previous[1];
    if (entry.value > high || entry.value < low) crossed += 1;
    const fitted = fitOf(entry.value, low, high);
    state.table = putOf(state.table, entry.name, fitted, crossed);
  } else {
    const record = findRow(state.table, entry.name);
    if (!record) throw fail(err.noName);
    state.shown.push([entry.name, record[0], record[1]]);
  }
  if (entry.id !== undefined && entry.id !== null) {
    if (state.applied.indexOf(entry.id) === -1) state.applied.push(entry.id);
  }
}

function run(spec, unlimited) {
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const low = spec.low;
  const high = spec.high;
  const err = codes(spec);

  let served = 0;
  let judged = 0;

  let queue = [];
  let budget = unlimited ? Infinity : Math.max(0, Math.floor(Number(spec.budget)) || 0);

  if (unlimited) {
    queue = state.ledger.slice();
    state.ledger = [];
  } else {
    validate(events, state.applied, err);
    const carried = state.ledger.slice();
    const incoming = events
      .filter(function (event) {
        return !(event.id !== undefined && state.applied.indexOf(event.id) !== -1);
      })
      .map(function (event) {
        return { kind: event.kind, name: event.name, value: event.kind === "put" ? event.value : null, id: event.id };
      });
    queue = carried.concat(incoming);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    if (budget <= 0) break;
    const entry = queue[cursor];
    applyEntry(state, entry, low, high, err);
    budget -= 1;
    served += 1;
    judged += 1;
    cursor += 1;
  }
  if (!unlimited) {
    state.ledger = queue.slice(cursor);
  }

  const bound = Math.min(queue.length, unlimited ? queue.length : Math.max(0, Math.floor(Number(spec.budget)) || 0));
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: ledgerView(state.ledger),
    judged: judged,
    judged_bound: bound
  };
}

export function step(spec) {
  return run(spec, false);
}

export function close(spec) {
  const result = run(spec, true);
  return { state: result.state, catchup: result.served };
}
