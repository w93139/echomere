// 使用 ?? 而非 ||，让生产环境可以显式设置为空字符串，从而使用相对路径。
// 使用 || 会把空字符串误判为 falsy，回退到 localhost:3001，导致部署后登录请求失败。
const rawBase =
  (typeof process !== "undefined"
    ? process.env?.NEXT_PUBLIC_API_BASE_URL
    : undefined) ?? "";
const API_BASE = rawBase === "" ? "" : rawBase.replace(/\/$/, "");

const USE_DEMO_API =
  (typeof process !== "undefined"
    ? process.env?.NEXT_PUBLIC_USE_DEMO_API
    : undefined) === "true";

export function isFrontendPreview() {
  return USE_DEMO_API;
}

const demoBazi = {
  schemaVersion: 2,
  engine: { name: "TAIBU CORE", version: "2.0" },
  year: "己巳",
  month: "丁丑",
  day: "庚辰",
  hour: "壬午",
  dayMaster: { gan: "庚", zhi: "辰", wuxing: "金" },
  genderLabel: "女",
  wuxing: { 金: 4, 木: 1, 水: 1, 火: 1, 土: 2 },
  lunarDate: { year: "己巳", month: "腊", day: "十九" },
  bodyStrength: "强",
  xiYongShen: { xi: ["水", "木"], ji: ["土", "金"] },
  chart: {
    trueSolarTimeInfo: { clockTime: "12:30", trueSolarTime: "12:24", longitude: 121.47, correctionMinutes: -6 },
    relations: [{ type: "合", description: "巳午相会，火势相承" }, { type: "生", description: "土金相生，根气清晰" }],
  },
  dayun: { list: [{ startYear: 1998, startAge: 8, ganZhi: "癸未", tenGod: "伤官", diShi: "冠带" }] },
};

const demoProfile = {
  id: "demo-profile",
  name: "妮娜",
  gender: "female",
  birthDateTime: "1990-01-15T12:30:00.000Z",
  birthLocation: "中国 · 上海市",
  isPrimary: true,
  type: "self",
  baziPillar: JSON.stringify(demoBazi),
};

const demoUser = {
  id: "demo-user",
  email: "preview@echomere.local",
  phone: null,
  name: "妮娜",
  locale: "zh-CN",
  defaultDestinySystem: "bazi",
};

let demoProfiles = [
  demoProfile,
  { ...demoProfile, id: "demo-profile-2", name: "小莉", gender: "female", type: "others", isPrimary: false, baziPillar: JSON.stringify({ ...demoBazi, year: "辛巳", month: "庚寅", day: "乙未", hour: "丁亥" }) },
];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function demoResponse(path: string, init: RequestInit): Response {
  const method = (init.method || "GET").toUpperCase();
  if (path === "/auth/me") return jsonResponse(demoUser);
  if (path === "/auth/login") return jsonResponse({ user: demoUser });
  if (path === "/profile") {
    const primaryProfile = demoProfiles.find((profile) => profile.isPrimary) || demoProfiles[0];
    return jsonResponse({ user: demoUser, primaryProfile, bazi: primaryProfile ? JSON.parse(primaryProfile.baziPillar) : null });
  }
  if (path === "/profiles" && method === "GET") {
    return jsonResponse(demoProfiles);
  }
  const demoProfileMatch = path.match(/^\/profiles\/([^/]+)$/);
  if (demoProfileMatch) {
    const profileId = decodeURIComponent(demoProfileMatch[1]);
    const profileIndex = demoProfiles.findIndex((profile) => profile.id === profileId);
    if (profileIndex === -1) return jsonResponse({ error: "Not found" }, 404);
    if (method === "GET") return jsonResponse(demoProfiles[profileIndex]);
    if (method === "PATCH") {
      const changes = typeof init.body === "string" ? JSON.parse(init.body) : {};
      const current = demoProfiles[profileIndex];
      const birth = new Date(current.birthDateTime);
      const birthDateTime = new Date(
        changes.year ?? birth.getFullYear(),
        (changes.month ?? birth.getMonth() + 1) - 1,
        changes.day ?? birth.getDate(),
        changes.hour ?? birth.getHours(),
        changes.minute ?? birth.getMinutes()
      ).toISOString();
      const updated = {
        ...current,
        name: changes.name ?? current.name,
        gender: changes.gender ?? current.gender,
        birthLocation: changes.birthLocation ?? current.birthLocation,
        birthDateTime,
      };
      demoProfiles = demoProfiles.map((profile, index) => {
        if (index === profileIndex) return { ...updated, isPrimary: changes.isPrimary ? true : updated.isPrimary };
        return changes.isPrimary ? { ...profile, isPrimary: false } : profile;
      });
      return jsonResponse(demoProfiles[profileIndex]);
    }
  }
  if (path === "/daily-fortune") return jsonResponse([]);
  const reportDetailMatch = path.match(/^\/reports\/([^/]+)$/);
  if (path === "/reports" && method === "GET") return jsonResponse([]);
  if (path === "/reports" && method === "POST") {
    return jsonResponse({
      id: "demo-report",
      profileId: "demo-profile",
      profileName: "妮娜",
      title: "八字深度报告",
      summary: "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  if (reportDetailMatch) {
    return jsonResponse({
      id: reportDetailMatch[1],
      profileId: "demo-profile",
      profileName: "妮娜",
      title: "八字深度报告",
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: {
        dayun: demoBazi.dayun,
        wuxingAnalysis: {
          scores: demoBazi.wuxing,
          ranking: Object.entries(demoBazi.wuxing).map(([element, score]) => ({ element, score })).sort((a, b) => b.score - a.score),
          dayMasterElement: demoBazi.dayMaster.wuxing,
          bodyStrength: demoBazi.bodyStrength,
          xiYongShen: demoBazi.xiYongShen,
          assessment: "日主庚金，身强，五行金旺木弱。",
        },
      },
    });
  }
  if (path === "/subscription") return jsonResponse({
    currentPlan: "free", used: 0, limit: null,
    plans: [
      { id: "free", name: "体验版", price: 0, period: "月", features: ["八字深度报告", "八字星云图", "看运/倾听/问事 无限次测试"], cta: "当前方案", popular: false },
      { id: "lite", name: "轻量版", price: 2900, period: "月", features: ["每月 30 次深度解读", "优先响应", "历史对话导出"], cta: "选择轻量版", popular: false },
      { id: "pro", name: "专业版", price: 9900, period: "月", features: ["每月 100 次深度解读", "紫微斗数（敬请期待）", "真人 1v1 折扣"], cta: "选择专业版", popular: true },
      { id: "ultra", name: "无限版", price: 29900, period: "月", features: ["无限次深度解读", "全部命理体系", "优先真人 1v1"], cta: "选择无限版", popular: false },
    ],
  });
  if (path === "/conversations") return jsonResponse([]);
  if (path === "/bazi") return jsonResponse(demoBazi);
  if (path === "/chat/stream") {
    const body = [
      `event: meta\ndata: ${JSON.stringify({ conversationId: "demo-conversation", toolCalls: [], routeReason: "本地前端演示" })}\n\n`,
      `event: chunk\ndata: ${JSON.stringify({ content: "这是纯前端演示模式。洄映的对话界面、模式切换与视觉状态均可直接体验，无需连接后端。" })}\n\n`,
    ].join("");
    return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }
  return jsonResponse({ ok: true });
}

export function getApiBase() {
  return API_BASE;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  if (isFrontendPreview()) return demoResponse(path, init);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  // 后端 API 统一在 /api 命名空间下；调用处仍可使用旧路径，自动补上前缀。
  const apiPath = path.startsWith("/api/") ? path : `/api${path}`;
  const url = `${getApiBase()}${apiPath}`;
  return fetch(url, { ...init, headers, credentials: "include" });
}
