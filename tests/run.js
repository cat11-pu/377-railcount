import assert from "node:assert";
import { fitOf, putOf } from "../rail.js";
import { step, close } from "../railrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, low: 0, high: 100,
  state: { table: [], shown: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "put", name: "a", value: 150 }],
  bad_name_code: "E_BAD_NAME", bad_value_code: "E_BAD_VALUE",
  no_name_code: "E_NO_NAME", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("fitOf returns a number", () => {
  assert.strictEqual(typeof fitOf(5, 0, 10), "number");
});

check("putOf returns a list", () => {
  assert.ok(Array.isArray(putOf([], "a", 1, 0)));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
