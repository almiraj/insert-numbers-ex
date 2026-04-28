const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const { detectSequenceFormatter } = require("../dist/sequence-formatter.js");

function formatFirst(source, count = 4) {
  const formatter = detectSequenceFormatter(source);
  assert.ok(formatter, `Expected "${source}" to be supported`);
  return Array.from({ length: count }, (_, index) => formatter(index));
}

describe("README examples", () => {
  const examples = [
    ["0", ["0", "1", "2", "3"]],
    ["1", ["1", "2", "3", "4"]],
    ["01", ["01", "02", "03", "04"]],
    ["1_", ["1_", "2_", "3_", "4_"]],
    ["[1]", ["[1]", "[2]", "[3]", "[4]"]],
    ["2026/04/29", ["2026/04/29", "2026/04/30", "2026/05/01", "2026/05/02"]],
    ["2026/4/29", ["2026/4/29", "2026/4/30", "2026/5/1", "2026/5/2"]],
    ["04/29/2026", ["04/29/2026", "04/30/2026", "05/01/2026", "05/02/2026"]],
    ["4/29/2026", ["4/29/2026", "4/30/2026", "5/1/2026", "5/2/2026"]],
    ["20260429", ["20260429", "20260430", "20260501", "20260502"]],
    ["2026/04", ["2026/04", "2026/05", "2026/06", "2026/07"]],
    ["202604", ["202604", "202605", "202606", "202607"]],
    ["23:59:58", ["23:59:58", "23:59:59", "00:00:00", "00:00:01"]],
    ["23:58", ["23:58", "23:59", "00:00", "00:01"]],
    [
      "2026/04/30 23:59:58",
      ["2026/04/30 23:59:58", "2026/04/30 23:59:59", "2026/05/01 00:00:00", "2026/05/01 00:00:01"]
    ],
    [
      "2026-04-30 23:59:58",
      ["2026-04-30 23:59:58", "2026-04-30 23:59:59", "2026-05-01 00:00:00", "2026-05-01 00:00:01"]
    ],
    ["竇", ["竇", "竇｡", "竇｢", "竇｣"]],
    ["竭", ["竭", "竭｡", "竭｢", "竭｣"]],
    ["a", ["a", "b", "c", "d"]],
    ["繧｢", ["繧｢", "繧､", "繧ｦ", "繧ｨ"]]
  ];

  for (const [source, expected] of examples) {
    it(`formats ${source}`, () => {
      assert.deepEqual(formatFirst(source), expected);
    });
  }
});

it("loops characters defined in characterSets", () => {
  assert.deepEqual(formatFirst("y"), ["y", "z", "a", "b"]);
});

it("repeats unsupported non-empty input without looping", () => {
  assert.deepEqual(formatFirst("-"), ["-", "-", "-", "-"]);
});
