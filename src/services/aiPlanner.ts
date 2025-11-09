import type { DayItem, DayItemType, DayPlan, TravelPreferences, TripPlan } from '../types/plan';

interface GeneratePlanPayload {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  travelers: number;
  preferences: TravelPreferences;
}

export interface PlanResult {
  plan: TripPlan | null;
  diagnostics: string[];
  rawContent?: string;
}

interface HunyuanClientConfig {
  model: string;
  endpoint: string;
  temperature?: number;
  topP?: number;
  region?: string;
}

interface LlmDayItem {
  id?: string;
  type?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  estimatedCost?: number | string;
}

interface LlmDayPlan {
  date?: string;
  summary?: string;
  items?: LlmDayItem[];
  totalEstimatedCost?: number | string;
}

interface LlmTripPlan {
  title?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelers?: number | string;
  budget?: number | string;
  currency?: string;
  days?: LlmDayPlan[];
}

interface LlmPlanResponse {
  plan?: LlmTripPlan;
  diagnostics?: unknown;
}

type ThemeKey =
  | '综合'
  | '美食'
  | '文化'
  | '自然'
  | '购物'
  | '亲子'
  | '夜生活'
  | '冒险'
  | '休闲'
  | '动漫'
  | '历史'
  | '海滨';

interface ThemeTemplate {
  morning: string[];
  afternoon: string[];
  evening: string[];
  meals: string[];
  notes: string[];
}

const THEME_LIBRARY: Record<ThemeKey, ThemeTemplate> = {
  综合: {
    morning: ['城市地标巡游', '经典地标打卡', '当地文化散步'],
    afternoon: ['特色街区体验', '博物馆深度参观', '城市近郊轻徒步'],
    evening: ['夜景漫步与休闲', '地道夜市探索', '当地传统演出'],
    meals: ['本地风味午餐', '特色晚餐预订', '街头小吃 sampling'],
    notes: ['体验城市代表性景点与文化', '感受当地生活节奏'],
  },
  美食: {
    morning: ['市场与早餐美食体验', '特色咖啡厅探访', '名店早午餐预约'],
    afternoon: ['米其林餐厅品鉴', '美食街深度打卡', '名厨料理课堂'],
    evening: ['夜市小吃地图', '餐后酒吧巡礼', '甜品店串联'],
    meals: ['当地人气餐厅午餐', '预约特色餐厅晚餐', '深夜食堂体验'],
    notes: ['围绕特色料理规划行程', '兼顾排队热门餐厅时间'],
  },
  文化: {
    morning: ['历史古迹导览', '博物馆精选路线', '世界遗产深度游'],
    afternoon: ['美术馆与展览', '传统工坊体验', '文化街区漫步'],
    evening: ['传统表演欣赏', '夜访古城与灯会', '文化沙龙参与'],
    meals: ['文化主题餐厅午餐', '老字号美食晚餐', '传统茶屋体验'],
    notes: ['安排专业讲解，深入了解城市底蕴'],
  },
  自然: {
    morning: ['国家公园晨间徒步', '城市近郊森林浴', '海岸线日出漫步'],
    afternoon: ['自然风光拍摄', '温泉放松时光', '湖畔骑行体验'],
    evening: ['星空观测与夜景', '自然主题瑜伽', '森林系晚餐体验'],
    meals: ['农场到餐桌午餐', '自然景观餐厅晚餐', '健康营养轻食'],
    notes: ['关注天气与交通时间，预留缓冲'],
  },
  购物: {
    morning: ['免税店 VIP 预约', '特色手作市集', '潮流商圈打卡'],
    afternoon: ['精品百货选购', '设计师品牌探店', '独立书店巡礼'],
    evening: ['夜间商场购物', '本地买手店私享', '艺术品拍卖体验'],
    meals: ['网红餐厅午餐', '网红甜品下午茶', '商圈隐蔽餐馆晚餐'],
    notes: ['合理安排行李寄存与退税时间'],
  },
  亲子: {
    morning: ['亲子主题乐园', '科学探索中心', '动物园互动体验'],
    afternoon: ['城市亲子工作坊', '儿童博物馆', '室内乐园畅玩'],
    evening: ['亲子剧场观演', '夜间灯光乐园', '家庭友好餐厅'],
    meals: ['儿童友好自助餐', '亲子主题下午茶', '营养均衡家庭套餐'],
    notes: ['预留午休与换尿布时间，选择儿童友好交通'],
  },
  夜生活: {
    morning: ['睡到自然醒，咖啡慢享', '城市 Brunch 精选', '精品咖啡探店'],
    afternoon: ['特色酒厂参观', '街头艺术区漫步', '调酒课程体验'],
    evening: ['屋顶酒吧夜景', '隐藏酒吧探秘', '现场音乐会'],
    meals: ['深夜美食攻略', '鸡尾酒搭配晚餐', '夜市烧烤聚会'],
    notes: ['控制酒精摄入，安排夜间交通'],
  },
  冒险: {
    morning: ['户外冒险项目', '高空/极限运动', '山地车越野'],
    afternoon: ['水上运动体验', '森林高空挑战', '专业向导探险'],
    evening: ['营地篝火互动', '冒险主题分享会', '户外装备巡礼'],
    meals: ['能量补给午餐', '本地特色晚餐', '营地烧烤自助'],
    notes: ['确认安全保障与保险，准备替换衣物'],
  },
  休闲: {
    morning: ['精品 SPA 放松', '瑜伽 & 冥想课堂', '花园漫步'],
    afternoon: ['海滨度假酒店', '日式温泉体验', '下午茶慢时光'],
    evening: ['海边日落野餐', '爵士音乐酒吧', '轻松电影之夜'],
    meals: ['酒店 Brunch', '健康低卡午餐', '景观餐厅晚餐'],
    notes: ['控制每日行程密度，预留自由时间'],
  },
  动漫: {
    morning: ['主题展馆预约', '角色圣地巡礼', '动漫周边旗舰店'],
    afternoon: ['Cosplay 体验馆', '主题咖啡店打卡', '限定周边抢购'],
    evening: ['夜间主题乐园', '动漫音乐会', '卡拉 OK 动漫专场'],
    meals: ['主题餐厅午餐', '角色限定下午茶', '御宅族聚会餐厅'],
    notes: ['提前预约热门展馆与限定活动'],
  },
  历史: {
    morning: ['城堡/古城导览', '遗址考古体验', '传统街区散策'],
    afternoon: ['历史博物馆精讲', '手工艺文化课', '名人故居参观'],
    evening: ['古典音乐会', '夜景城墙漫步', '茶道体验'],
    meals: ['历史老字号午餐', '古风主题晚宴', '传统茶点品鉴'],
    notes: ['配合专业讲解，延伸阅读资料推荐'],
  },
  海滨: {
    morning: ['海边晨跑与日出', '海岛浮潜体验', '帆船出海'],
    afternoon: ['海滩自由时光', '海鲜市场午餐', '水上摩托体验'],
    evening: ['海边篝火派对', '沙滩电影院', '海景餐厅晚餐'],
    meals: ['海鲜料理午餐', '度假酒店自助晚餐', '海景下午茶'],
    notes: ['注意防晒补水，关注潮汐时间'],
  },
};

const SUPPORTED_DAY_ITEM_TYPES: DayItemType[] = [
  'transport',
  'attraction',
  'meal',
  'hotel',
  'free',
];

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-4)}`;
}

function pickFromList(list: string[], index: number, fallback: string): string {
  if (list.length === 0) {
    return fallback;
  }
  return list[index % list.length] ?? fallback;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coerceNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(/[,，]/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeTime(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^([0-9]{1,2})(?::([0-9]{1,2}))?$/);
  if (!match) {
    return trimmed;
  }

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = match[2] ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function stripModelFormatting(content: string): string {
  const withoutFences = content
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .replace(/\uFEFF/g, '');
  const trimmed = withoutFences.trim();
  if (trimmed.startsWith('Note:')) {
    return trimmed.replace(/^Note:[^\n]*\n?/, '').trim();
  }
  return trimmed;
}

function extractFirstJsonObject(content: string): string | null {
  const sanitized = content.trim();
  if (!sanitized) {
    return null;
  }

  let startIndex = -1;
  let depth = 0;
  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];
    if (char === '{') {
      if (depth === 0) {
        startIndex = i;
      }
      depth += 1;
    } else if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && startIndex !== -1) {
          return sanitized.slice(startIndex, i + 1);
        }
      }
    }
  }

  return null;
}

function tryParseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function looksLikeTripPlanStructure(value: unknown): value is LlmTripPlan {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.days) && record.days.length > 0) {
    return true;
  }
  const indicativeKeys = ['destination', 'startDate', 'endDate', 'title'];
  return indicativeKeys.some(key => typeof record[key] === 'string');
}

function resolvePlanEnvelope(candidate: unknown): LlmPlanResponse | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const visited = new Set<unknown>();
  const queue: unknown[] = [candidate];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const record = current as Record<string, unknown>;
    const planKey = Object.keys(record).find(key => key.toLowerCase() === 'plan');
    if (planKey) {
      const planValue = record[planKey];
      if (planValue && typeof planValue === 'object') {
        const diagnosticsKey = Object.keys(record).find(key => key.toLowerCase() === 'diagnostics');
        const diagnosticsValue =
          diagnosticsKey !== undefined ? record[diagnosticsKey] : record.diagnostics;
        return {
          plan: planValue as LlmTripPlan,
          diagnostics: diagnosticsValue,
        };
      }
    }

    if (looksLikeTripPlanStructure(record)) {
      return {
        plan: record as unknown as LlmTripPlan,
        diagnostics: (record as { diagnostics?: unknown }).diagnostics,
      };
    }

    for (const next of Object.values(record)) {
      if (next && typeof next === 'object' && !visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return null;
}

function parsePlanResponseFromContent(content: string): LlmPlanResponse {
  const sanitized = stripModelFormatting(content);
  const attempts: string[] = [];
  if (sanitized) {
    attempts.push(sanitized);
  }

  const block = extractFirstJsonObject(sanitized);
  if (block && block !== sanitized) {
    attempts.push(block);
  }

  for (const candidate of attempts) {
    const parsed = tryParseJson<unknown>(candidate);
    if (!parsed) {
      continue;
    }
    const normalized = resolvePlanEnvelope(parsed);
    if (normalized) {
      return normalized;
    }
  }

  throw new Error('混元 T1 返回内容未包含可解析的 JSON 计划。');
}

function readChoiceContent(choice: unknown): string {
  if (!choice || typeof choice !== 'object') {
    return '';
  }

  const record = choice as Record<string, unknown>;
  const message = record.Message;
  if (message && typeof message === 'object') {
    const content = (message as Record<string, unknown>).Content;
    if (typeof content === 'string' && content.trim()) {
      return content;
    }
  }

  const delta = record.Delta;
  if (delta && typeof delta === 'object') {
    const content = (delta as Record<string, unknown>).Content;
    if (typeof content === 'string' && content.trim()) {
      return content;
    }
  }

  if (typeof record.Content === 'string' && record.Content.trim()) {
    return record.Content;
  }

  return '';
}

function collectChoiceContents(
  choices: unknown,
  options?: {
    preserveWhitespace?: boolean;
  },
): string {
  if (!Array.isArray(choices)) {
    return '';
  }

  const segments = choices
    .map(choice => readChoiceContent(choice))
    .filter(part => {
      if (!part) {
        return false;
      }
      if (options?.preserveWhitespace) {
        return part.length > 0;
      }
      return part.trim().length > 0;
    });

  if (options?.preserveWhitespace) {
    return segments.join('');
  }

  return segments.join('\n').trim();
}

function parseDiagnostics(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(entry => entry.length > 0);
}

function resolveThemeSequence(preferences: TravelPreferences): ThemeKey[] {
  const themes = new Set<ThemeKey>();
  (preferences.themes ?? []).forEach(tag => {
    if (tag in THEME_LIBRARY) {
      themes.add(tag as ThemeKey);
    }
  });
  if (preferences.kidFriendly) {
    themes.add('亲子');
  }
  if (themes.size === 0) {
    themes.add('综合');
  }
  return Array.from(themes);
}

function createDayItems(
  dayIndex: number,
  totalDays: number,
  date: string,
  theme: ThemeKey,
  destination: string,
  dailyBudget: number,
  travelers: number,
  pace: TravelPreferences['pace'],
): DayItem[] {
  const template = THEME_LIBRARY[theme] ?? THEME_LIBRARY['综合'];
  const items: DayItem[] = [];
  const baseCost = Math.max(200, Math.round(dailyBudget / 3));

  if (dayIndex === 0) {
    items.push({
      id: createId('transport'),
      type: 'transport',
      title: `抵达 ${destination}`,
      startTime: '08:30',
      endTime: '10:00',
      notes: '根据航班/列车时间调整，可安排送机/送站服务。',
      estimatedCost: Math.round(baseCost * 0.8),
    });
  }

  const paceOffset = pace === 'relaxed' ? 1 : pace === 'intensive' ? 0.8 : 1;
  const morningTitle = pickFromList(template.morning, dayIndex, `探索 ${destination} 特色`);
  items.push({
    id: createId('attraction'),
    type: 'attraction',
    title: morningTitle,
    startTime: '10:30',
    endTime: '12:30',
    notes: template.notes.join('，'),
    estimatedCost: Math.round(baseCost * paceOffset),
  });

  const lunchTitle = pickFromList(template.meals, dayIndex, `${destination} 人气午餐`);
  items.push({
    id: createId('meal'),
    type: 'meal',
    title: lunchTitle,
    startTime: '12:30',
    endTime: '14:00',
    notes: `为 ${travelers} 人预订餐位，预留排队时间。`,
    estimatedCost: Math.round(baseCost * 1.2),
  });

  const afternoonTitle = pickFromList(
    template.afternoon,
    dayIndex,
    `下午体验 ${destination} 精选活动`,
  );
  items.push({
    id: createId('attraction'),
    type: 'attraction',
    title: afternoonTitle,
    startTime: '14:30',
    endTime: '17:30',
    notes: '根据天气和体力灵活调整，可增加自由活动时间。',
    estimatedCost: Math.round(baseCost * 1.4),
  });

  const eveningTitle = pickFromList(template.evening, dayIndex, `${destination} 夜间体验`);
  items.push({
    id: createId('meal'),
    type: 'meal',
    title: eveningTitle,
    startTime: '18:30',
    endTime: '20:30',
    notes: '提前预约人气餐厅，结束后可漫步回酒店。',
    estimatedCost: Math.round(baseCost * 1.1),
  });

  items.push({
    id: createId('hotel'),
    type: 'hotel',
    title: `${destination} 优选酒店`,
    startTime: '21:00',
    endTime: '08:00',
    notes: '选择交通便利、评价高的住宿，含早餐。',
    estimatedCost: Math.round(dailyBudget * 0.8),
  });

  if (dayIndex === totalDays - 1) {
    items.push({
      id: createId('transport'),
      type: 'transport',
      title: `返程离开 ${destination}`,
      startTime: '12:00',
      endTime: '17:00',
      notes: '提前办理退房，预留机场/车站候车时间。',
      estimatedCost: Math.round(baseCost * 0.8),
    });
  }

  return items;
}

function assembleDayPlan(
  dayIndex: number,
  totalDays: number,
  date: Date,
  theme: ThemeKey,
  ctx: {
    destination: string;
    dailyBudget: number;
    travelers: number;
    pace: TravelPreferences['pace'];
  },
): DayPlan {
  const isoDate = formatDate(date);
  const items = createDayItems(
    dayIndex,
    totalDays,
    isoDate,
    theme,
    ctx.destination,
    ctx.dailyBudget,
    ctx.travelers,
    ctx.pace,
  );

  const totalEstimatedCost = items.reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0);
  const summary = `围绕「${theme}」主题安排，兼顾交通与节奏，预计花费约 ${Math.round(totalEstimatedCost)} 元。`;

  return {
    id: createId('day'),
    date: isoDate,
    summary,
    items,
    totalEstimatedCost,
  };
}

function buildHeuristicPlan(payload: GeneratePlanPayload): PlanResult {
  const totalDays = Math.max(1, daysBetween(payload.startDate, payload.endDate));
  const startDate = new Date(`${payload.startDate}T00:00:00`);
  const themeSequence = resolveThemeSequence(payload.preferences);
  const dailyBudget = Math.max(
    600,
    payload.budget > 0 ? Math.round(payload.budget / totalDays) : 900,
  );
  const pace = payload.preferences.pace ?? 'balanced';

  const days: DayPlan[] = [];
  for (let i = 0; i < totalDays; i += 1) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const theme = themeSequence[i % themeSequence.length] ?? '综合';
    days.push(
      assembleDayPlan(i, totalDays, currentDate, theme, {
        destination: payload.destination,
        dailyBudget,
        travelers: payload.travelers,
        pace,
      }),
    );
  }

  const plan: TripPlan = {
    id: createId('plan'),
    title: `${payload.destination} ${totalDays} 日行程`,
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    travelers: payload.travelers,
    budget: payload.budget > 0 ? payload.budget : dailyBudget * totalDays,
    currency: 'CNY',
    days,
  };

  const diagnostics = [`已使用本地智能引擎根据偏好（${themeSequence.join('、')}）生成行程草案。`];

  if (payload.budget <= 0) {
    diagnostics.push('未提供预算，已按中档消费水平估算费用，可在生成后自行调整。');
  }

  return { plan, diagnostics };
}

export async function generatePlan(
  payload: GeneratePlanPayload,
  options: {
    onProgress?: (preview: string) => void;
  } = {},
): Promise<PlanResult> {
  const hunyuanAttempt = await tryHunyuanPlan(payload, options);
  if (hunyuanAttempt.planResult) {
    return hunyuanAttempt.planResult;
  }

  const fallback = buildHeuristicPlan(payload);
  if (hunyuanAttempt.warning) {
    fallback.diagnostics.unshift(hunyuanAttempt.warning);
  }
  return fallback;
}

function resolveHunyuanConfig(): HunyuanClientConfig {
  const model =
    (import.meta.env.VITE_HUNYUAN_T1_MODEL as string | undefined)?.trim() ?? 'hunyuan-t1-latest';
  const endpoint =
    (import.meta.env.VITE_HUNYUAN_T1_ENDPOINT as string | undefined)?.trim() ??
    (import.meta.env.VITE_HUNYUAN_T1_PROXY_ENDPOINT as string | undefined)?.trim() ??
    'https://hunyuan.tencentcloudapi.com';

  const defaultTemperature = 0.2;
  const temperatureRaw = (
    import.meta.env.VITE_HUNYUAN_T1_TEMPERATURE as string | undefined
  )?.trim();
  const temperatureValue =
    temperatureRaw && temperatureRaw.length > 0 ? Number(temperatureRaw) : defaultTemperature;
  const temperature = Number.isFinite(temperatureValue) ? temperatureValue : defaultTemperature;

  const topPRaw = (import.meta.env.VITE_HUNYUAN_T1_TOP_P as string | undefined)?.trim();
  const topPValue = topPRaw ? Number(topPRaw) : Number.NaN;
  const topP = Number.isFinite(topPValue) && topPValue > 0 ? topPValue : undefined;

  const region = (import.meta.env.VITE_HUNYUAN_T1_REGION as string | undefined)?.trim();

  return {
    model,
    endpoint,
    temperature,
    topP,
    region,
  };
}

const PLAN_RESPONSE_TEMPLATE = `{
  "plan": {
    "title": "示例行程标题",
    "destination": "目的地",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "travelers": 2,
    "budget": 8000,
    "currency": "CNY",
    "days": [
      {
        "date": "YYYY-MM-DD",
        "summary": "当天概述",
        "items": [
          {
            "type": "transport",
            "title": "机场快线前往市区",
            "startTime": "09:00",
            "endTime": "10:00",
            "notes": "抵达后购买交通卡",
            "estimatedCost": 120
          },
          {
            "type": "attraction",
            "title": "市区地标参观",
            "startTime": "10:30",
            "endTime": "13:00",
            "notes": "提前预约导览",
            "estimatedCost": 280
          },
          {
            "type": "meal",
            "title": "本地特色午餐",
            "startTime": "13:15",
            "endTime": "14:15",
            "notes": "尝试招牌菜",
            "estimatedCost": 180
          },
          {
            "type": "free",
            "title": "下午自由活动",
            "notes": "可逛购物区或咖啡馆"
          },
          {
            "type": "hotel",
            "title": "入住市中心酒店",
            "startTime": "21:00",
            "notes": "办理入住手续",
            "estimatedCost": 520
          }
        ],
        "totalEstimatedCost": 1100
      },
      {
        "date": "YYYY-MM-DD",
        "summary": "主题活动日",
        "items": [
          {
            "type": "transport",
            "title": "地铁前往景区",
            "startTime": "08:30",
            "estimatedCost": 20
          },
          {
            "type": "attraction",
            "title": "主题公园游玩",
            "startTime": "09:30",
            "endTime": "17:00",
            "notes": "包含亲子设施",
            "estimatedCost": 480
          },
          {
            "type": "meal",
            "title": "公园内特色晚餐",
            "startTime": "18:00",
            "estimatedCost": 220
          }
        ],
        "totalEstimatedCost": 720
      }
    ]
  },
  "diagnostics": [
    "建议提前在线购买景区门票以避免排队",
    "预算余量可分配至特色体验或升级餐饮"
  ]
}`;

function createHunyuanSystemPrompt(): string {
  return [
    '你是一名专业的中文旅行规划师，负责根据用户需求生成详细的行程安排与预算估计。',
    '请严格遵守以下规则：',
    '1. 仅输出标准 JSON 文本，不得包含额外解释、注释或 Markdown 代码块。',
    '2. 所有金额使用数字表示，默认货币为人民币（CNY）。',
    '3. 确保返回的字段齐全且与输入要求匹配。',
  ].join('\n');
}

function composeHunyuanUserPrompt(payload: GeneratePlanPayload): string {
  const { destination, startDate, endDate, budget, travelers, preferences } = payload;
  const tags = [
    ...(preferences.themes ?? []),
    preferences.pace ? `节奏：${preferences.pace}` : '',
    preferences.kidFriendly ? '适合亲子' : '',
  ].filter(Boolean);

  const rows: string[] = [];
  rows.push('请根据以下旅行需求生成行程规划，请返回符合字段约束的 JSON：');
  rows.push(`- 目的地：${destination}`);
  rows.push(`- 行程日期：${startDate} 至 ${endDate}`);
  rows.push(`- 预算：${budget > 0 ? `${budget} 元` : '未指定，请合理估算'}`);
  rows.push(`- 出行人数：${travelers} 人`);
  rows.push(`- 出行偏好：${tags.length > 0 ? tags.join('，') : '未特别说明'}`);
  rows.push('- 若缺少具体信息，请结合常见安排给出合理估计。');
  rows.push('- items.type 字段仅可使用 transport、attraction、meal、hotel、free 之一。');
  rows.push('- 所有日期采用 YYYY-MM-DD，时间使用 24 小时制，可留空。');
  rows.push('- diagnostics 为中文数组，可用于说明预算分配或注意事项。');
  rows.push('\n返回 JSON 示例（请根据实际需求填充内容）：');
  rows.push(PLAN_RESPONSE_TEMPLATE);

  return rows.join('\n');
}

function mapLlmPlanToTrip(payload: GeneratePlanPayload, llmPlan: LlmTripPlan): TripPlan | null {
  const daysSource = Array.isArray(llmPlan.days)
    ? llmPlan.days.filter(day => day && typeof day === 'object')
    : [];

  if (daysSource.length === 0) {
    return null;
  }

  const destination = safeString(llmPlan.destination) || payload.destination;
  const startDate = safeString(llmPlan.startDate) || payload.startDate;
  const startDateObj = new Date(`${startDate}T00:00:00`);
  const startDateValid = !Number.isNaN(startDateObj.getTime());

  const derivedEndDate = (() => {
    if (!startDateValid) {
      return payload.endDate;
    }
    const end = new Date(startDateObj);
    end.setDate(end.getDate() + daysSource.length - 1);
    return formatDate(end);
  })();

  const endDate = safeString(llmPlan.endDate) || derivedEndDate;
  const travelers = Math.max(1, Math.round(coerceNumber(llmPlan.travelers, payload.travelers)));
  const budgetSource = coerceNumber(llmPlan.budget, payload.budget);
  const budget = budgetSource > 0 ? budgetSource : payload.budget;
  const currency = safeString(llmPlan.currency) || 'CNY';
  const title = safeString(llmPlan.title) || `${destination} ${daysSource.length} 日行程`;

  const days: DayPlan[] = daysSource.map((day, dayIndex) => {
    const dateSource = safeString(day.date);
    let isoDate = dateSource;
    if (!isoDate) {
      if (startDateValid) {
        const current = new Date(startDateObj);
        current.setDate(startDateObj.getDate() + dayIndex);
        isoDate = formatDate(current);
      } else {
        isoDate = payload.startDate;
      }
    }

    const itemsSource = Array.isArray(day.items)
      ? day.items.filter(item => item && typeof item === 'object')
      : [];

    const items: DayItem[] = itemsSource.map((item, itemIndex) => {
      const rawType = safeString(item.type).toLowerCase();
      const type = SUPPORTED_DAY_ITEM_TYPES.includes(rawType as DayItemType)
        ? (rawType as DayItemType)
        : 'attraction';

      const estimatedCostSource = coerceNumber(item.estimatedCost, 0);
      const estimatedCost = estimatedCostSource > 0 ? estimatedCostSource : undefined;

      return {
        id: safeString(item.id) || createId(type),
        type,
        title: safeString(item.title) || `行程事项 ${itemIndex + 1}`,
        startTime: normalizeTime(item.startTime),
        endTime: normalizeTime(item.endTime),
        notes: safeString(item.notes) || undefined,
        estimatedCost,
      };
    });

    const totalEstimatedCostSource =
      day.totalEstimatedCost !== undefined
        ? coerceNumber(day.totalEstimatedCost, 0)
        : items.reduce((sum, entry) => sum + (entry.estimatedCost ?? 0), 0);

    const totalEstimatedCost = totalEstimatedCostSource > 0 ? totalEstimatedCostSource : undefined;

    return {
      id: createId('day'),
      date: isoDate,
      summary: safeString(day.summary) || `第 ${dayIndex + 1} 天行程安排`,
      items,
      totalEstimatedCost,
    };
  });

  if (days.length === 0) {
    return null;
  }

  return {
    id: createId('plan'),
    title,
    destination,
    startDate,
    endDate,
    travelers,
    budget,
    currency,
    days,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

interface HunyuanAttemptResult {
  planResult: PlanResult | null;
  warning?: string;
}

interface HunyuanChatErrorInfo {
  Code?: string;
  Message?: string;
}

interface HunyuanChatResponse {
  Response?: {
    Choices?: unknown[];
    Error?: HunyuanChatErrorInfo;
    Note?: string;
    RequestId?: string;
  };
  Note?: string;
}

type HunyuanErrorLike = {
  Code?: string;
  Message?: string;
};

function parseSseEventPayload(rawEvent: string): string | null {
  const trimmed = rawEvent.trim();
  if (!trimmed) {
    return null;
  }

  const lines = trimmed.replace(/\r\n/g, '\n').split('\n');
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }
    let payload = line.slice(5);
    if (payload.startsWith(' ')) {
      payload = payload.slice(1);
    }
    dataLines.push(payload);
  }

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
}

function extractChoicesFromChunk(chunk: unknown): unknown[] | null {
  if (!chunk || typeof chunk !== 'object') {
    return null;
  }

  const record = chunk as Record<string, unknown>;
  if (Array.isArray(record.Choices)) {
    return record.Choices;
  }

  const response = record.Response;
  if (response && typeof response === 'object') {
    const nested = (response as Record<string, unknown>).Choices;
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return null;
}

function extractErrorFromChunk(chunk: unknown): HunyuanErrorLike | null {
  if (!chunk || typeof chunk !== 'object') {
    return null;
  }

  const record = chunk as Record<string, unknown>;
  const direct = record.ErrorMsg;
  if (direct && typeof direct === 'object') {
    return direct as HunyuanErrorLike;
  }

  const response = record.Response;
  if (response && typeof response === 'object') {
    const nestedError = (response as Record<string, unknown>).Error;
    if (nestedError && typeof nestedError === 'object') {
      return nestedError as HunyuanErrorLike;
    }
  }

  return null;
}

function extractFinishReasons(choices: unknown[]): string[] {
  const results: string[] = [];
  choices.forEach(choice => {
    if (!choice || typeof choice !== 'object') {
      return;
    }
    const finish = (choice as Record<string, unknown>).FinishReason;
    if (typeof finish === 'string') {
      results.push(finish);
    }
  });
  return results;
}

function formatHunyuanError(errorInfo: HunyuanErrorLike | null | undefined): string {
  if (!errorInfo) {
    return '混元 T1 返回错误。';
  }
  const message = [errorInfo.Code, errorInfo.Message].filter(Boolean).join(': ');
  return message || '混元 T1 返回错误。';
}

async function consumeHunyuanStream(
  response: Response,
  onChunk?: (preview: string) => void,
): Promise<string> {
  const body = response.body;
  if (!body) {
    throw new Error('混元代理未返回可读的流式数据。');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let aggregatedContent = '';
  let stopDetected = false;
  let readerCancelled = false;
  let completedNaturally = false;

  const handleEvent = (rawEvent: string) => {
    const payload = parseSseEventPayload(rawEvent);
    if (payload === null) {
      return;
    }

    if (payload === '[DONE]') {
      stopDetected = true;
      return;
    }

    let chunk: unknown;
    try {
      chunk = JSON.parse(payload) as unknown;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[aiPlanner] 无法解析混元流式片段', err, payload);
      }
      return;
    }

    const errorInfo = extractErrorFromChunk(chunk);
    if (errorInfo) {
      throw new Error(formatHunyuanError(errorInfo));
    }

    const choices = extractChoicesFromChunk(chunk);
    if (choices) {
      const piece = collectChoiceContents(choices, { preserveWhitespace: true });
      if (piece) {
        aggregatedContent += piece;
        onChunk?.(aggregatedContent);
      }
      const finishReasons = extractFinishReasons(choices);
      if (finishReasons.includes('sensitive')) {
        throw new Error('混元 T1 返回内容未通过安全审核。');
      }
      if (finishReasons.includes('stop')) {
        stopDetected = true;
      }
    }
  };

  const processBuffer = (force = false) => {
    buffer = buffer.replace(/\r\n/g, '\n');
    let boundaryIndex = buffer.indexOf('\n\n');

    while (boundaryIndex >= 0) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      handleEvent(rawEvent);
      boundaryIndex = buffer.indexOf('\n\n');
    }

    if (force && buffer.trim().length > 0) {
      handleEvent(buffer);
      buffer = '';
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        processBuffer(true);
        completedNaturally = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      processBuffer();

      if (stopDetected) {
        processBuffer(true);
        await reader.cancel().catch(() => undefined);
        readerCancelled = true;
        break;
      }
    }
  } catch (err) {
    if (!readerCancelled) {
      await reader.cancel().catch(() => undefined);
      readerCancelled = true;
    }
    throw err;
  } finally {
    if (!readerCancelled && !completedNaturally) {
      await reader.cancel().catch(() => undefined);
    }
  }

  if (!aggregatedContent.trim()) {
    throw new Error('混元 T1 流式响应未包含有效内容。');
  }

  return aggregatedContent;
}

async function tryHunyuanPlan(
  payload: GeneratePlanPayload,
  options: {
    onProgress?: (preview: string) => void;
  } = {},
): Promise<HunyuanAttemptResult> {
  const config = resolveHunyuanConfig();

  try {
    const systemPrompt = createHunyuanSystemPrompt();
    const userPrompt = composeHunyuanUserPrompt(payload);

    const unparseableMessage = '混元 T1 返回内容无法解析为 JSON 行程，已展示原始回复。';
    const provideRawContent = (raw: string, reason?: unknown): HunyuanAttemptResult => {
      const original = raw ?? '';
      const normalized = original.trim();
      if (!normalized) {
        throw new Error('混元 T1 返回数据里没有有效的文本内容。');
      }
      if (import.meta.env.DEV && reason) {
        console.warn('[aiPlanner] 混元 T1 返回内容无法解析', reason, raw);
      }
      options.onProgress?.(original);
      return {
        planResult: {
          plan: null,
          diagnostics: [unparseableMessage],
          rawContent: original,
        },
        warning: unparseableMessage,
      };
    };

    const requestBody: Record<string, unknown> = {
      Model: config.model,
      Messages: [
        { Role: 'system', Content: systemPrompt },
        { Role: 'user', Content: userPrompt },
      ],
      Stream: true,
    };

    if (typeof config.temperature === 'number' && Number.isFinite(config.temperature)) {
      requestBody.Temperature = config.temperature;
    }
    if (typeof config.topP === 'number' && Number.isFinite(config.topP)) {
      requestBody.TopP = config.topP;
    }

    options.onProgress?.('正在向混元 T1 请求规划，请稍候...');

    const proxyResponse = await fetch('/api/hunyuan/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: config.endpoint,
        region: config.region ?? undefined,
        action: 'ChatCompletions',
        version: '2023-09-01',
        body: requestBody,
      }),
    });
    if (!proxyResponse.ok) {
      const rawError = await proxyResponse.text();
      let errorMessage = `HTTP ${proxyResponse.status}`;
      if (rawError) {
        try {
          const parsed = JSON.parse(rawError) as {
            error?: string;
            Response?: { Error?: HunyuanChatErrorInfo };
          };
          if (typeof parsed.error === 'string' && parsed.error.trim()) {
            errorMessage = parsed.error.trim();
          } else if (parsed.Response?.Error) {
            const { Code, Message } = parsed.Response.Error;
            errorMessage = [Code, Message].filter(Boolean).join(': ') || errorMessage;
          }
        } catch (parseErr) {
          if (import.meta.env.DEV) {
            console.warn('[aiPlanner] 混元代理错误响应解析失败', parseErr);
          }
        }
      }
      throw new Error(errorMessage);
    }

    const contentType = proxyResponse.headers.get('content-type') ?? '';

    let parsed: LlmPlanResponse | null = null;
    let rawContentForDisplay = '';

    if (contentType.includes('text/event-stream')) {
      const aggregatedContent = await consumeHunyuanStream(proxyResponse, preview => {
        if (preview && preview.trim()) {
          options.onProgress?.(preview);
        }
      });
      options.onProgress?.('正在整理规划结果，请稍候...');
      rawContentForDisplay = aggregatedContent;
      try {
        parsed = parsePlanResponseFromContent(aggregatedContent);
      } catch (err) {
        return provideRawContent(rawContentForDisplay, err);
      }
    } else {
      const rawText = await proxyResponse.text();
      options.onProgress?.('已收到完整响应，正在解析...');
      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new Error('混元 T1 返回内容为空。');
      }
      rawContentForDisplay = trimmed;

      let payloadJson: HunyuanChatResponse;
      try {
        payloadJson = JSON.parse(trimmed) as HunyuanChatResponse;
      } catch (err) {
        throw new Error(`混元 T1 返回数据不是有效 JSON：${toErrorMessage(err)}`);
      }

      const responseData = (payloadJson.Response ?? {}) as Record<string, unknown>;
      const errorInfo = (responseData.Error as HunyuanChatErrorInfo | undefined) ?? undefined;
      if (errorInfo) {
        const { Code, Message } = errorInfo;
        const formatted = [Code, Message].filter(Boolean).join(': ');
        throw new Error(formatted || '混元 T1 返回错误。');
      }

      parsed = resolvePlanEnvelope(responseData) ?? resolvePlanEnvelope(payloadJson);

      if (!parsed) {
        const choicesValue = responseData.Choices as unknown;
        const contentWithWhitespace = collectChoiceContents(choicesValue, {
          preserveWhitespace: true,
        });
        const content = contentWithWhitespace || collectChoiceContents(choicesValue);
        if (!content) {
          if (import.meta.env.DEV) {
            console.warn('[aiPlanner] 混元 T1 返回缺少 Choices 内容', payloadJson);
          }
          throw new Error('混元 T1 返回数据里没有有效的文本内容。');
        }
        rawContentForDisplay = contentWithWhitespace || content;
        try {
          parsed = parsePlanResponseFromContent(content);
        } catch (err) {
          return provideRawContent(rawContentForDisplay, err);
        }
      }
    }

    if (!parsed) {
      return provideRawContent(rawContentForDisplay, new Error('缺少可用的解析结果'));
    }

    if (!parsed.plan) {
      return provideRawContent(rawContentForDisplay, new Error('返回结果缺少 plan 字段'));
    }

    const mappedPlan = mapLlmPlanToTrip(payload, parsed.plan);
    if (!mappedPlan) {
      throw new Error('混元 T1 返回的行程数据不完整。');
    }

    const diagnostics = parseDiagnostics(parsed.diagnostics);
    diagnostics.unshift('已使用混元 T1 大模型生成行程规划与预算估算。');

    return {
      planResult: {
        plan: mappedPlan,
        diagnostics,
      },
    };
  } catch (error) {
    const message = toErrorMessage(error);
    if (import.meta.env.DEV) {
      console.error('[aiPlanner] 混元 T1 调用失败', error);
    }
    return {
      planResult: null,
      warning: `混元 T1 调用失败：${message}`,
    };
  }
}
