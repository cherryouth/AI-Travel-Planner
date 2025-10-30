import type { DayItem, DayPlan, TravelPreferences, TripPlan } from '../types/plan';

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

export async function generatePlan(payload: GeneratePlanPayload): Promise<PlanResult> {
  try {
    // 预留：未来在此集成真实的 Hunyuan-T1 API。
    // 如果配置了有效的 API Key，可在此处调用远程模型。
    // 当前环境若缺少密钥，则直接使用本地智能生成器。
    return buildHeuristicPlan(payload);
  } catch (err) {
    const diagnostics = ['行程规划引擎异常，已返回空计划。'];
    if (import.meta.env.DEV) {
      console.error('[aiPlanner] 生成行程失败', err);
    }
    return { plan: null, diagnostics };
  }
}
