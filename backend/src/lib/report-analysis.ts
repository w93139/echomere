import { type BaziPillar } from "./bazi.js";

const WUXING_DESC: Record<string, string> = {
  木: "木代表生发、成长，对应肝胆、手脚、头发，也代表学业、思考能力。",
  火: "火代表热情、活力，对应心脏、眼睛、血液循环，也代表表达能力、人际交往。",
  土: "土代表稳重、承载，对应脾胃、皮肤、肌肉，也代表信用、踏实程度。",
  金: "金代表刚毅、决断，对应肺、大肠、呼吸系统，也代表魄力、行动力。",
  水: "水代表智慧、流动，对应肾、膀胱、水液系统，也代表思维能力、适应能力。",
};

const DAY_MASTER_TIPS: Record<string, string> = {
  甲: "甲木就像一棵大树，天生有上进心、责任心强，喜欢被人需要。性格直爽，但有时候过于固执。",
  乙: "乙木就像花草藤蔓，性格温柔随和，适应能力强，善于变通。外表柔弱，内心有自己的坚持。",
  丙: "丙火就像太阳，热情开朗，爱表现，有领导力。但也容易三分钟热度，脾气来得快去得也快。",
  丁: "丁火就像蜡烛灯光，外冷内热，善于观察细节，第六感很强。适合做顾问、策划这类幕后工作。",
  戊: "戊土就像城墙泥土，为人稳重厚道，讲信用，靠得住。但有时候想法比较保守，不够灵活。",
  己: "己土就像田园泥土，性格包容谦让，善于协调关系，适合做行政、人事这类需要耐心的工作。",
  庚: "庚金就像刀斧矿石，性格刚毅果断，立场坚定，认准的事不容易改变。有魄力，适合创业或管理。",
  辛: "辛金就像珠玉首饰，精致细腻，追求完美，善于审美和打磨。适合做设计、精品类的工作。",
  壬: "壬水就像江河湖海，性格豪放洒脱，善于变通，适应力强。想法多，点子多，但有时候不够专注。",
  癸: "癸水就像雨露清泉，性格柔和内敛，直觉敏锐，善于思考。适合做研究、分析这类需要沉下心的工作。",
};

const WUXING_ORDER = ["木", "火", "土", "金", "水"];

const GENERATES: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const OVERCOMES: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

function isSheng(from: string, to: string): boolean {
  return GENERATES[from] === to;
}

function isKe(from: string, to: string): boolean {
  return OVERCOMES[from] === to;
}

function describeWuxingLevel(element: string, score: number): string {
  if (score >= 3.0) {
    return `▸ ${element}很旺（${score.toFixed(1)}分）：这个方面你天赋很强，但也可能过犹不及。${WUXING_DESC[element]}`;
  }
  if (score >= 2.0) {
    return `▸ ${element}偏旺（${score.toFixed(1)}分）：这个方面你条件不错，可以发挥优势。${WUXING_DESC[element]}`;
  }
  if (score >= 1.0) {
    return `▸ ${element}一般（${score.toFixed(1)}分）：基本够用，但没太多余力。${WUXING_DESC[element]}`;
  }
  return `▸ ${element}偏弱（${score.toFixed(1)}分）：这是你的短板，需要注意补足。${WUXING_DESC[element]}`;
}

function buildWuxingRelations(scores: Record<string, number>): string[] {
  const lines: string[] = [];
  const pairs = [
    ["木", "火"],
    ["火", "土"],
    ["土", "金"],
    ["金", "水"],
    ["水", "木"],
  ] as const;

  for (const [from, to] of pairs) {
    if (scores[from] > 0 && scores[to] > 0) {
      const rel =
        scores[from] >= scores[to]
          ? `${from}能生${to}，你的${from}可以助旺${to}。`
          : `${from}生${to}，但你的${to}相对更旺，${from}的力量被${to}消耗。`;
      lines.push(`  • ${from}生${to}：${rel}`);
    }
  }
  return lines;
}

export function buildWuxingAnalysis(bazi: BaziPillar) {
  const scores = bazi.wuxing;
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([element, score]) => ({ element, score }));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const lines: string[] = [
    "你的命里五行分布如下：",
    "",
    `木 ${scores["木"].toFixed(1)}分 | 火 ${scores["火"].toFixed(1)}分 | 土 ${scores["土"].toFixed(1)}分 | 金 ${scores["金"].toFixed(1)}分 | 水 ${scores["水"].toFixed(1)}分`,
    "",
  ];

  for (const wx of WUXING_ORDER) {
    lines.push(describeWuxingLevel(wx, scores[wx]));
  }

  const relations = buildWuxingRelations(scores);
  if (relations.length > 0) {
    lines.push("", "命局中五行生克关系：");
    lines.push(...relations);
  }

  if (strongest.score - weakest.score >= 1.5) {
    lines.push(
      `\n五行平衡的关键在于各元素互相配合。你的命里${strongest.element}和${weakest.element}差距较大，需要特别注意补足${weakest.element}，让五行流转更顺畅。`
    );
  }

  const bodyStrengthDesc =
    bazi.bodyStrength === "强"
      ? "身强说明你本身能量充足，精力充沛，面对压力也能扛得住。不过要注意别太自我，多听听别人的意见。"
      : bazi.bodyStrength === "弱"
      ? "身弱说明你本身能量偏弱，容易受外界影响，需要借助外力来增强自己。多关注健康，学会借力。"
      : "你的能量比较平衡，既不会太激进也不会太消极，适应能力不错。";

  const dayMasterTip =
    DAY_MASTER_TIPS[bazi.dayMaster.gan] ||
    `${bazi.dayMaster.gan}属于${bazi.dayMaster.wuxing}。`;

  return {
    scores,
    ranking: sorted,
    dayMasterElement: bazi.dayMaster.wuxing,
    bodyStrength: bazi.bodyStrength,
    xiYongShen: bazi.xiYongShen,
    overview: `你的日主是${bazi.dayMaster.gan}（${bazi.dayMaster.wuxing}），整体属于「${bazi.bodyStrength}」。五行中${strongest.element}最旺（${strongest.score.toFixed(1)}分），${weakest.element}最弱（${weakest.score.toFixed(1)}分）。喜用神为${bazi.xiYongShen.xi.join("、")}，忌神为${bazi.xiYongShen.ji.join("、")}。`,
    dayMasterAnalysis: `${dayMasterTip}\n\n你的日主${bazi.dayMaster.gan}是${bazi.dayMaster.wuxing}，整体${bazi.bodyStrength === "强" ? "身强" : bazi.bodyStrength === "弱" ? "身弱" : "中和"}。${bodyStrengthDesc}`,
    detail: lines.join("\n"),
  };
}

interface ChineseDayunItem {
  干支?: string;
  十神?: string;
  起运年份?: number;
  起运年龄?: number;
  藏干?: Array<{ 天干?: string; 十神?: string }>;
}

interface DayunJson {
  起运信息?: { 起运年龄?: number; 起运详情?: string };
  大运列表?: ChineseDayunItem[];
}

function describeDayunRelation(dayunGanZhi: string, dayMaster: string, dayMasterWuxing: string): string {
  if (!dayunGanZhi || dayunGanZhi.length < 2) return "";
  const stem = dayunGanZhi[0];
  const branch = dayunGanZhi[1];

  const stemWuxing =
    { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" }[stem] || "";
  const branchWuxing =
    { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" }[
      branch
    ] || "";

  const parts: string[] = [];
  for (const [wx, source] of [
    [stemWuxing, "天干"],
    [branchWuxing, "地支"],
  ] as const) {
    if (!wx) continue;
    if (wx === dayMasterWuxing) {
      parts.push(`大运${source}${wx}与日主${dayMaster}五行相同，为比劫运，主自我、竞争、同行助力。`);
    } else if (isSheng(wx, dayMasterWuxing)) {
      parts.push(`大运${source}${wx}生日主${dayMasterWuxing}（${dayMaster}），为印星运，易得贵人扶持。`);
    } else if (isSheng(dayMasterWuxing, wx)) {
      parts.push(`日主${dayMaster}生大运${source}${wx}（${dayMasterWuxing}生${wx}），为食伤运，才华展现、表达输出。`);
    } else if (isKe(wx, dayMasterWuxing)) {
      parts.push(`大运${source}${wx}克日主${dayMasterWuxing}（${dayMaster}），为官杀运，压力与机遇并存。`);
    } else if (isKe(dayMasterWuxing, wx)) {
      parts.push(`日主${dayMaster}克大运${source}${wx}（${dayMasterWuxing}克${wx}），为财运，主求财、资源。`);
    }
  }
  return parts.join(" ");
}

function describeDayunComprehensive(dayunGanZhi: string, scoreHint: "good" | "neutral" | "bad"): string {
  if (!dayunGanZhi || dayunGanZhi.length < 2) return "";
  const stem = dayunGanZhi[0];
  const stemWuxing =
    { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" }[stem] || "";

  const careerDesc: Record<string, string> = {
    木: "木有生发之意，利于创业、开拓新领域。",
    火: "火有光明之象，利于文化、传播、电子行业。",
    土: "土有承载之德，利于房地产、管理、仓储。",
    金: "金有收敛之力，利于金融、法律、精密行业。",
    水: "水有流通之性，利于贸易、物流、服务行业。",
  };

  const career = careerDesc[stemWuxing] || "";
  const wealth =
    scoreHint === "good"
      ? "财运走势较好，正财偏财皆有收获机会。"
      : scoreHint === "bad"
      ? "财运走势偏弱，保守理财、避免大额冒险。"
      : "财运走势平稳，以守成为主。";

  return `${career}${wealth}`;
}

export function buildDayunAnalysis(bazi: BaziPillar) {
  const dayunJson = bazi.dayunJson as unknown as DayunJson;
  const list: ChineseDayunItem[] = dayunJson?.大运列表 || [];
  const startInfo = dayunJson?.起运信息;

  const items = list.map((item, index) => {
    const relation = describeDayunRelation(
      item.干支 || "",
      bazi.dayMaster.gan,
      bazi.dayMaster.wuxing
    );

    // 用神匹配简单评分：大运五行包含喜用神则吉，包含忌神则凶
    const dayunWuxingSet = new Set<string>();
    if (item.干支) {
      const stem = item.干支[0];
      const branch = item.干支[1];
      const stemWx =
        { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" }[stem];
      const branchWx =
        { 子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水" }[branch];
      if (stemWx) dayunWuxingSet.add(stemWx);
      if (branchWx) dayunWuxingSet.add(branchWx);
    }

    const xiMatch = bazi.xiYongShen.xi.filter((wx) => dayunWuxingSet.has(wx)).length;
    const jiMatch = bazi.xiYongShen.ji.filter((wx) => dayunWuxingSet.has(wx)).length;

    let scoreHint: "good" | "neutral" | "bad" = "neutral";
    if (xiMatch > jiMatch) scoreHint = "good";
    else if (jiMatch > xiMatch) scoreHint = "bad";

    const rating =
      scoreHint === "good" ? "上" : scoreHint === "bad" ? "下" : "中";

    return {
      ...item,
      index: index + 1,
      relation,
      rating,
      comprehensive: describeDayunComprehensive(item.干支 || "", scoreHint),
    };
  });

  return {
    startInfo,
    list: items,
    summary: `大运自${startInfo?.起运年龄 ?? "—"}岁起运，共${items.length}步大运。每步大运约十年，反映人生不同阶段的运势起伏。`,
  };
}
