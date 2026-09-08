import assert from "node:assert/strict";
import test from "node:test";
import { formatBaziForAI, getBaziProfile, getYearlyFlow } from "./bazi.js";

test("完整八字排盘保持旧字段并提供 taibu-core 结构", () => {
  const profile = getBaziProfile(new Date(1990, 4, 15, 15, 0), "male");

  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.engine.name, "taibu-core");
  assert.deepEqual(
    [profile.year, profile.month, profile.day, profile.hour],
    ["庚午", "辛巳", "庚辰", "甲申"],
  );
  assert.equal(profile.dayMaster.gan, "庚");
  assert.equal(profile.chart.fourPillars.hour.kongWang.isKong, true);
  assert.ok(profile.chart.fourPillars.day.hiddenStems.length >= 2);
  assert.ok(profile.chart.relations.some((relation) => relation.description.includes("巳申")));
  assert.ok(profile.canonicalText.includes("八字命盘"));
  assert.ok(profile.dayun.list.length >= 8);
});

test("经度输入启用真太阳时，AI 文本标明事实边界", () => {
  const profile = getBaziProfile(new Date(1990, 4, 15, 15, 0), "female", {
    birthPlace: "成都",
    longitude: 104.0665,
  });
  assert.equal(profile.chart.trueSolarTimeInfo?.longitude, 104.0665);
  assert.ok(formatBaziForAI(profile, 2026).includes("事实边界"));
  assert.ok(formatBaziForAI(profile, 2026).includes("用户关注流年"));
});

test("流年优先使用大运引擎的精确数据", () => {
  const profile = getBaziProfile(new Date(1990, 4, 15, 15, 0), "male");
  const flow = getYearlyFlow(profile, 2026);
  assert.equal(flow.year, 2026);
  assert.ok(flow.ganZhi.length === 2);
  assert.notEqual(flow.shiShen, "未知");
  assert.ok(Array.isArray(flow.shenSha));
});
