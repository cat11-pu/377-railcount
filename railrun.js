// railrun.js：按处理预算处理并留账
import { fitOf, putOf } from "./rail.js";

function codeOf(spec, key, fallback) {
  return spec && spec[key] ? spec[key] : fallback;
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

// 先校验：结构 -> 名字 -> 读数，过了才规整成 [kind, name, value, id]
function normalize(spec, event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail(codeOf(spec, "event_error_code", "E_BAD_EVENT"));
  }
  const kind = event.kind;
  if (kind !== "put" && kind !== "show") {
    fail(codeOf(spec, "event_error_code", "E_BAD_EVENT"));
  }
  const name = event.name;
  if (typeof name !== "string" || name.length === 0) {
    fail(codeOf(spec, "bad_name_code", "E_BAD_NAME"));
  }
  if (kind === "put" && !Number.isInteger(event.value)) {
    fail(codeOf(spec, "bad_value_code", "E_BAD_VALUE"));
  }
  return [kind, name, kind === "put" ? event.value : null, event.id];
}

function copyState(state) {
  const source = state || {};
  return {
    table: (source.table || []).map(function (row) { return [row[0], [row[1][0], row[1][1]]]; }),
    shown: (source.shown || []).map(function (row) { return [row[0], row[1], row[2]]; }),
    ledger: (source.ledger || []).map(function (entry) { return entry.slice(); }),
    applied: (source.applied || []).slice()
  };
}

function apply(state, entry, spec) {
  const kind = entry[0];
  const name = entry[1];
  if (kind === "put") {
    const value = entry[2];
    const crossed = value < spec.low || value > spec.high ? 1 : 0;
    state.table = putOf(state.table, name, fitOf(value, spec.low, spec.high), crossed);
  } else {
    const row = state.table.find(function (r) { return r[0] === name; });
    if (!row) fail(codeOf(spec, "no_name_code", "E_NO_NAME"));
    state.shown = state.shown.concat([[name, row[1][0], row[1][1]]]);
  }
  if (entry[3] !== undefined) state.applied = state.applied.concat([entry[3]]);
}

export function step(spec) {
  const state = copyState(spec.state);
  const events = spec.events || [];
  const incoming = events.map(function (event) { return normalize(spec, event); });
  const queue = [];
  for (const entry of state.ledger) queue.push(entry);
  for (const entry of incoming) {
    if (entry[3] !== undefined && state.applied.indexOf(entry[3]) !== -1) continue;
    queue.push(entry);
  }
  let budget = spec.budget || 0;
  let served = 0;
  const pending = [];
  for (const entry of queue) {
    if (budget > 0) {
      budget -= 1;
      apply(state, entry, spec);
      served += 1;
    } else {
      pending.push(entry);
    }
  }
  state.ledger = pending;
  return {
    state: state,
    served: served,
    ledger_before: pending.length,
    ledger: pending.map(function (entry) { return [entry[0], entry[1], entry[2]]; }),
    judged: served,
    judged_bound: queue.length
  };
}

export function close(spec) {
  const state = copyState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of pending) {
    apply(state, entry, spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
