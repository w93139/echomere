import {
  calculateLiuyao,
  toLiuyaoCanonicalJson,
  toLiuyaoCanonicalText,
  type LiuQinType,
  type LiuyaoOutput,
} from "taibu-core/liuyao";
import { HEXAGRAMS } from "taibu-core/data/hexagrams";

export const LIUYAO_ENGINE = {
  name: "taibu-core",
  version: "3.5.0",
  schemaVersion: 2,
} as const;

export type YaoType = "少阴" | "少阳" | "老阴" | "老阳";

export interface Yao {
  index: number;
  type: YaoType;
  yin: boolean;
  changing: boolean;
  liuQin?: string;
  liuShen?: string;
  naJia?: string;
  wuXing?: string;
  isShiYao?: boolean;
  isYingYao?: boolean;
  movementLabel?: string;
  yaoCi?: string;
}

export interface HexagramResult {
  schemaVersion: 2;
  engine: typeof LIUYAO_ENGINE;
  originalName: string;
  originalNumber: number;
  changedName: string;
  changedNumber: number;
  changingYaos: number[];
  yaos: Yao[];
  yongShenTargets: LiuQinType[];
  chart: LiuyaoOutput;
  canonicalJson: ReturnType<typeof toLiuyaoCanonicalJson>;
  canonicalText: string;
}

function hexagramNumber(name?: string): number {
  if (!name) return 0;
  const index = HEXAGRAMS.findIndex((hexagram) => hexagram.name === name);
  return index >= 0 ? index + 1 : 0;
}

function toLegacyYaoType(type: number, isChanging: boolean): YaoType {
  if (type === 0) return isChanging ? "老阴" : "少阴";
  return isChanging ? "老阳" : "少阳";
}

export function inferYongShenTargets(question: string): LiuQinType[] {
  const targets = new Set<LiuQinType>();
  if (/工作|事业|职位|升职|考试|录取|官司|领导|疾病|病情/.test(question)) targets.add("官鬼");
  if (/财|收入|投资|生意|回款|妻子|女友|对象/.test(question)) targets.add("妻财");
  if (/合同|房|车|证件|父母|长辈|消息|文书|学校/.test(question)) targets.add("父母");
  if (/孩子|子女|宠物|医药|娱乐|解决|福气/.test(question)) targets.add("子孙");
  if (/朋友|同事|竞争|合作|兄弟|姐妹|合伙/.test(question)) targets.add("兄弟");
  if (targets.size === 0) targets.add("官鬼");
  return [...targets];
}

function formatLocalDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 使用完整六爻引擎起卦。相同问题、时间戳和 seed 会得到同一卦，便于审计与复现。
 */
export async function castHexagram(
  question: string,
  timestamp = Date.now(),
  options?: { seed?: string; yongShenTargets?: LiuQinType[] },
): Promise<HexagramResult> {
  const yongShenTargets = options?.yongShenTargets ?? inferYongShenTargets(question);
  const seed = options?.seed ?? `${question}-${timestamp}`;
  const chart = await calculateLiuyao({
    question,
    yongShenTargets,
    method: "auto",
    date: formatLocalDateTime(timestamp),
    seed,
    seedScope: "soothsayer-conversation",
    detailLevel: "full",
  });
  const yaos = chart.fullYaos.map((yao): Yao => {
    const type = toLegacyYaoType(yao.type, yao.isChanging);
    return {
      index: yao.position,
      type,
      yin: type === "少阴" || type === "老阴",
      changing: yao.isChanging,
      liuQin: yao.liuQin,
      liuShen: yao.liuShen,
      naJia: yao.naJia,
      wuXing: yao.wuXing,
      isShiYao: yao.isShiYao,
      isYingYao: yao.isYingYao,
      movementLabel: yao.movementLabel,
      yaoCi: yao.yaoCi,
    };
  });
  return {
    schemaVersion: 2,
    engine: LIUYAO_ENGINE,
    originalName: chart.hexagramName,
    originalNumber: hexagramNumber(chart.hexagramName),
    changedName: chart.changedHexagramName || "无",
    changedNumber: hexagramNumber(chart.changedHexagramName),
    changingYaos: yaos.filter((yao) => yao.changing).map((yao) => yao.index),
    yaos,
    yongShenTargets,
    chart,
    canonicalJson: toLiuyaoCanonicalJson(chart),
    canonicalText: toLiuyaoCanonicalText(chart),
  };
}

export function formatLiuyaoForAI(result: HexagramResult): string {
  return [
    `【排盘引擎】${result.engine.name} ${result.engine.version}`,
    result.canonicalText,
    "【事实边界】卦象、干支、六亲、六神、纳甲、世应、动爻和用神候选是计算结果；吉凶与应期属于解释性推断，必须列出依据并保留不确定性。",
  ].join("\n\n");
}
