import { Solar } from "lunar-javascript";
import {
  calculateBazi,
  calculateBaziFiveElementsStats,
  toBaziJson,
  toBaziText,
  type BaziInput,
  type BaziOutput,
} from "taibu-core/bazi";
import {
  calculateBaziDayun,
  toBaziDayunJson,
  toBaziDayunText,
  type DayunOutput,
} from "taibu-core/bazi-dayun";

export const BAZI_ENGINE = {
  name: "taibu-core",
  version: "3.5.0",
  schemaVersion: 2,
  source: "https://github.com/hhszzzz/taibu",
} as const;

const WUXING_MAP: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土",
  庚: "金", 辛: "金", 壬: "水", 癸: "水",
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

const GENERATES: Record<string, string> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};

const OVERCOMES: Record<string, string> = {
  木: "土", 土: "水", 水: "火", 火: "金", 金: "木",
};

export interface BaziCalculationOptions {
  calendarType?: "solar" | "lunar";
  isLeapMonth?: boolean;
  birthPlace?: string;
  longitude?: number;
}

export interface BaziPillar {
  schemaVersion: 2;
  engine: typeof BAZI_ENGINE;
  input: BaziInput;
  year: string;
  month: string;
  day: string;
  hour: string;
  dayMaster: { gan: string; zhi: string; wuxing: string };
  genderLabel: string;
  wuxing: Record<string, number>;
  shishen: { gan: string[]; zhi: string[] };
  nayin: string[];
  lunarDate: { year: string; month: string; day: string };
  bodyStrength: "强" | "弱" | "中和";
  xiYongShen: { xi: string[]; ji: string[] };
  assessment: { kind: "heuristic"; warning: string };
  chart: BaziOutput;
  canonicalJson: ReturnType<typeof toBaziJson>;
  canonicalText: string;
  dayun: DayunOutput;
  dayunJson: ReturnType<typeof toBaziDayunJson>;
  dayunText: string;
}

export interface YearlyFlow {
  year: number;
  ganZhi: string;
  gan: string;
  zhi: string;
  shiShen: string;
  naYin: string;
  wuXing: { gan: string; zhi: string };
  age?: number;
  diShi?: string;
  shenSha?: string[];
  taiSui?: string[];
  branchRelations?: unknown[];
}

function toGender(gender: "male" | "female" | string): "male" | "female" {
  return gender === "female" ? "female" : "male";
}

function buildInput(
  birthDateTime: Date,
  gender: "male" | "female" | string,
  options: BaziCalculationOptions,
): BaziInput {
  return {
    gender: toGender(gender),
    birthYear: birthDateTime.getFullYear(),
    birthMonth: birthDateTime.getMonth() + 1,
    birthDay: birthDateTime.getDate(),
    birthHour: birthDateTime.getHours(),
    birthMinute: birthDateTime.getMinutes(),
    calendarType: options.calendarType ?? "solar",
    isLeapMonth: options.isLeapMonth ?? false,
    birthPlace: options.birthPlace,
    longitude: options.longitude,
  };
}

function isHelpful(dayElement: string, target: string): boolean {
  return dayElement === target || GENERATES[target] === dayElement;
}

function isConsuming(dayElement: string, target: string): boolean {
  return GENERATES[dayElement] === target || OVERCOMES[dayElement] === target;
}

/** 兼容旧 UI 的参考值，不作为确定性排盘事实提供给模型。 */
function buildCompatibilityAssessment(
  chart: BaziOutput,
  stats: Record<string, number>,
): Pick<BaziPillar, "bodyStrength" | "xiYongShen" | "assessment"> {
  const dayElement = WUXING_MAP[chart.dayMaster] || "";
  let helpful = 0;
  let consuming = 0;
  for (const [element, score] of Object.entries(stats)) {
    if (isHelpful(dayElement, element)) helpful += score;
    if (isConsuming(dayElement, element)) consuming += score;
  }
  const monthElement = WUXING_MAP[chart.fourPillars.month.branch] || "";
  if (isHelpful(dayElement, monthElement)) helpful += 1.5;
  if (isConsuming(dayElement, monthElement)) consuming += 1.5;

  const bodyStrength: BaziPillar["bodyStrength"] =
    helpful > consuming + 1.8 ? "强" : consuming > helpful + 1.8 ? "弱" : "中和";
  const all = ["金", "木", "水", "火", "土"];
  const xi = all.filter((element) =>
    bodyStrength === "强" ? isConsuming(dayElement, element) : isHelpful(dayElement, element),
  );
  const ji = all.filter((element) =>
    bodyStrength === "强" ? isHelpful(dayElement, element) : isConsuming(dayElement, element),
  );
  return {
    bodyStrength,
    xiYongShen: { xi, ji },
    assessment: {
      kind: "heuristic",
      warning: "身强弱及喜忌为兼容界面的参考估计，不属于确定性排盘结果。",
    },
  };
}

function buildLunarDate(birthDateTime: Date) {
  const lunar = Solar.fromYmdHms(
    birthDateTime.getFullYear(),
    birthDateTime.getMonth() + 1,
    birthDateTime.getDate(),
    birthDateTime.getHours(),
    birthDateTime.getMinutes(),
    birthDateTime.getSeconds(),
  ).getLunar() as ReturnType<ReturnType<typeof Solar.fromYmdHms>["getLunar"]> & {
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  };
  return {
    year: lunar.getYearInChinese(),
    month: lunar.getMonthInChinese(),
    day: lunar.getDayInChinese(),
  };
}

export function getBaziProfile(
  birthDateTime: Date,
  gender: "male" | "female" | string,
  options: BaziCalculationOptions = {},
): BaziPillar {
  const input = buildInput(birthDateTime, gender, options);
  const chart = calculateBazi(input);
  const dayun = calculateBaziDayun(input);
  const stats = calculateBaziFiveElementsStats(chart.fourPillars);
  const statsRecord: Record<string, number> = { ...stats };
  const pillars = chart.fourPillars;
  return {
    schemaVersion: 2,
    engine: BAZI_ENGINE,
    input,
    year: `${pillars.year.stem}${pillars.year.branch}`,
    month: `${pillars.month.stem}${pillars.month.branch}`,
    day: `${pillars.day.stem}${pillars.day.branch}`,
    hour: `${pillars.hour.stem}${pillars.hour.branch}`,
    dayMaster: {
      gan: pillars.day.stem,
      zhi: pillars.day.branch,
      wuxing: WUXING_MAP[pillars.day.stem] || "",
    },
    genderLabel: gender === "male" ? "元男" : gender === "female" ? "元女" : "元身",
    wuxing: statsRecord,
    shishen: {
      gan: [pillars.year.tenGod || "", pillars.month.tenGod || "", "日主", pillars.hour.tenGod || ""],
      zhi: [pillars.year, pillars.month, pillars.day, pillars.hour].map((pillar) =>
        pillar.hiddenStems.map((hidden) => hidden.tenGod).join("、"),
      ),
    },
    nayin: [pillars.year.naYin || "", pillars.month.naYin || "", pillars.day.naYin || "", pillars.hour.naYin || ""],
    lunarDate: buildLunarDate(birthDateTime),
    ...buildCompatibilityAssessment(chart, statsRecord),
    chart,
    canonicalJson: toBaziJson(chart),
    canonicalText: toBaziText(chart, { detailLevel: "full" }),
    dayun,
    dayunJson: toBaziDayunJson(dayun),
    dayunText: toBaziDayunText(dayun, { detailLevel: "full" }),
  };
}

function getLegacyTenGod(dayMasterGan: string, targetGan: string): string {
  const dayElement = WUXING_MAP[dayMasterGan];
  const targetElement = WUXING_MAP[targetGan];
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const samePolarity = stems.indexOf(dayMasterGan) % 2 === stems.indexOf(targetGan) % 2;
  if (dayMasterGan === targetGan) return "比肩";
  if (dayElement === targetElement) return "劫财";
  if (GENERATES[dayElement] === targetElement) return samePolarity ? "食神" : "伤官";
  if (GENERATES[targetElement] === dayElement) return samePolarity ? "偏印" : "正印";
  if (OVERCOMES[dayElement] === targetElement) return samePolarity ? "偏财" : "正财";
  if (OVERCOMES[targetElement] === dayElement) return samePolarity ? "七杀" : "正官";
  return "未知";
}

export function getYearlyFlow(profile: BaziPillar, year: number): YearlyFlow {
  const precise = profile.dayun?.list
    ?.flatMap((item) => item.liunianList || [])
    .find((item) => item.year === year);
  if (precise) {
    return {
      year,
      ganZhi: precise.ganZhi,
      gan: precise.gan,
      zhi: precise.zhi,
      shiShen: precise.tenGod,
      naYin: precise.nayin,
      wuXing: { gan: WUXING_MAP[precise.gan] || "", zhi: WUXING_MAP[precise.zhi] || "" },
      age: precise.age,
      diShi: precise.diShi,
      shenSha: precise.shenSha,
      taiSui: precise.taiSui,
      branchRelations: precise.branchRelations,
    };
  }

  // 历史档案没有 dayun 时的兼容回退。
  const lunar = Solar.fromYmd(year, 7, 1).getLunar();
  const ganZhi = lunar.getYearInGanZhiByLiChun();
  const gan = lunar.getYearGanByLiChun();
  const zhi = lunar.getYearZhiByLiChun();
  return {
    year,
    ganZhi,
    gan,
    zhi,
    shiShen: getLegacyTenGod(profile.dayMaster.gan, gan),
    naYin: "",
    wuXing: { gan: WUXING_MAP[gan] || "", zhi: WUXING_MAP[zhi] || "" },
  };
}

export interface DailyFlow {
  date: string;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  dayShiShen: string;
  dayNaYin: string;
  dayWuXing: string;
}

export function getDailyFlow(profile: BaziPillar, date: Date): DailyFlow {
  const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar();
  const dayGanZhi = lunar.getDayInGanZhi();
  const dayGan = lunar.getDayGan();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    yearGanZhi: lunar.getYearInGanZhiByLiChun(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi,
    dayShiShen: getLegacyTenGod(profile.dayMaster.gan, dayGan),
    dayNaYin: "",
    dayWuXing: WUXING_MAP[dayGan] || "",
  };
}

export function formatBaziForAI(profile: BaziPillar, targetYear?: number): string {
  const sections = [
    `【排盘引擎】${profile.engine.name} ${profile.engine.version}（结构版本 ${profile.schemaVersion}）`,
    profile.canonicalText,
    toBaziDayunText(profile.dayun, { detailLevel: "default" }),
  ];
  if (targetYear) {
    sections.push(`## 用户关注流年\n${JSON.stringify(getYearlyFlow(profile, targetYear), null, 2)}`);
  }
  sections.push("【事实边界】以上排盘文本是计算结果；身强弱、格局、喜用神和事件判断必须结合全盘论证，不得直接采用兼容字段中的启发式结论。");
  return sections.join("\n\n");
}
