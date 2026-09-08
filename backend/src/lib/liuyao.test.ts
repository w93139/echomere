import assert from "node:assert/strict";
import test from "node:test";
import { castHexagram, formatLiuyaoForAI, inferYongShenTargets } from "./liuyao.js";

test("完整六爻起卦可复现且包含标准盘字段", async () => {
  const first = await castHexagram("今年适合换工作吗", 1_800_000_000_000, { seed: "fixed" });
  const second = await castHexagram("今年适合换工作吗", 1_800_000_000_000, { seed: "fixed" });

  assert.equal(first.schemaVersion, 2);
  assert.equal(first.originalName, second.originalName);
  assert.deepEqual(first.changingYaos, second.changingYaos);
  assert.equal(first.yaos.length, 6);
  assert.ok(first.yaos.every((yao) => yao.liuQin && yao.liuShen && yao.naJia));
  assert.ok(first.yaos.every((yao) => yao.changing === yao.type.startsWith("老")));
  assert.ok(first.yaos.every((yao) => yao.yin === yao.type.endsWith("阴")));
  assert.ok(first.chart.ganZhiTime.day.gan);
  assert.ok(first.canonicalText.includes("六爻分析"));
  assert.ok(formatLiuyaoForAI(first).includes("事实边界"));
});

test("根据问题选择六爻用神", () => {
  assert.ok(inferYongShenTargets("这份工作能否录取").includes("官鬼"));
  assert.ok(inferYongShenTargets("这笔回款什么时候到账").includes("妻财"));
  assert.ok(inferYongShenTargets("购房合同是否顺利").includes("父母"));
});
