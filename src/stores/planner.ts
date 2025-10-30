import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { TripPlan, TravelPreferences } from '../types/plan';
import { generatePlan } from '../services/aiPlanner';
import {
  startVoiceRecognition,
  type SpeechResult,
  type VoiceRecognitionSession,
} from '../services/voiceService';

export type TravelPace = 'relaxed' | 'balanced' | 'intensive';

export interface PlannerForm {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  travelers: number;
  pace: TravelPace;
  preferenceTags: string[];
  extraNotes: string;
  intentText: string;
}

interface ParseOutcome {
  messages: string[];
}

interface ParsedIntent {
  destination?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  budget?: number;
  travelers?: number;
  preferenceTags?: string[];
  pace?: TravelPace;
  kidFriendly?: boolean;
  notes?: string;
  messages: string[];
}

const PREFERENCE_TAG_OPTIONS = [
  '美食',
  '文化',
  '自然',
  '购物',
  '亲子',
  '夜生活',
  '冒险',
  '休闲',
  '艺术',
  '历史',
  '动漫',
  '海滨',
];

function createDefaultForm(): PlannerForm {
  return {
    destination: '',
    startDate: '',
    endDate: '',
    budget: null,
    travelers: 2,
    pace: 'balanced',
    preferenceTags: ['美食'],
    extraNotes: '',
    intentText: '',
  };
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return formatDate(base);
}

function diffDays(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
}

function detectThemes(text: string): string[] {
  const matches = new Set<string>();
  const THEME_REGEX: Array<[string, RegExp]> = [
    ['美食', /美食|吃|料理|餐厅|寿司|小吃|夜市/gi],
    ['文化', /文化|历史|博物馆|寺|神社|古城|艺术/gi],
    ['自然', /自然|公园|徒步|温泉|山|海|湖|花园/gi],
    ['购物', /购物|买|商场|免税|逛街|市场/gi],
    ['亲子', /亲子|孩子|带娃|家庭|儿童|乐园/gi],
    ['夜生活', /夜生活|酒吧|夜店|live|音乐|居酒屋/gi],
    ['冒险', /冒险|刺激|极限|潜水|滑雪|攀岩|冲浪/gi],
    ['休闲', /放松|休闲|度假|spa|慢生活/gi],
    ['艺术', /艺术|展览|画廊/gi],
    ['历史', /历史|遗址|古迹|城堡|故宫/gi],
    ['动漫', /动漫|二次元|动画|主题店|角色扮演/gi],
    ['海滨', /海边|海滨|沙滩|海岸/gi],
  ];

  THEME_REGEX.forEach(([tag, regex]) => {
    if (regex.test(text)) {
      matches.add(tag);
      regex.lastIndex = 0;
    }
  });
  return Array.from(matches);
}

function parseIntent(text: string, currentForm: PlannerForm): ParsedIntent {
  const trimmed = text.trim();
  if (!trimmed) {
    return { messages: [] };
  }

  const messages: string[] = [];
  const result: ParsedIntent = { messages };

  const destinationMatch = trimmed.match(
    /(?:到|去)([^，。\s]+?)(?:玩|旅游|旅行|看看|度假|安排|体验)?(?:[，。,\s]|$)/,
  );
  if (destinationMatch && destinationMatch[1]) {
    const destination = destinationMatch[1].replace(/^(去|到)/, '').trim();
    if (destination && destination !== currentForm.destination) {
      result.destination = destination;
      messages.push(`识别到目的地：${destination}`);
    }
  }

  const dateMatch = trimmed.match(/(\d{1,2})月(\d{1,2})日/);
  if (dateMatch) {
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    if (!Number.isNaN(month) && !Number.isNaN(day)) {
      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00`);
      if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        year += 1;
      }
      candidate.setFullYear(year);
      const dateStr = formatDate(candidate);
      if (dateStr !== currentForm.startDate) {
        result.startDate = dateStr;
        messages.push(`识别到出发日期：${dateStr}`);
      }
    }
  }

  const daysMatch = trimmed.match(/(\d+)(?:天|日)/);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    if (!Number.isNaN(days) && days > 0) {
      result.days = days;
      messages.push(`识别到行程天数：${days}天`);
    }
  }

  const budgetMatch = trimmed.match(/预算[^0-9]*([0-9]+(?:\.[0-9]+)?)(万)?/);
  const altBudgetMatch = trimmed.match(/([0-9]+(?:\.[0-9]+)?)\s*(万)?\s*(?:元|块|人民币)/);
  const targetBudget = budgetMatch ?? altBudgetMatch;
  if (targetBudget) {
    const value = Number(targetBudget[1]);
    if (!Number.isNaN(value)) {
      const budget = targetBudget[2] ? Math.round(value * 10000) : Math.round(value);
      result.budget = budget;
      messages.push(`识别到预算：约 ${budget} 元`);
    }
  }

  const travelersMatch = trimmed.match(/(\d+)(?:位|个)?(?:人|成人|旅伴|同事|朋友|家人|情侣|伙伴)/);
  if (travelersMatch) {
    const travelers = Number(travelersMatch[1]);
    if (!Number.isNaN(travelers) && travelers > 0 && travelers !== currentForm.travelers) {
      result.travelers = travelers;
      messages.push(`识别到同行人数：${travelers} 人`);
    }
  } else if (/一家|全家|我们|朋友们/.test(trimmed) && currentForm.travelers < 3) {
    result.travelers = 3;
    messages.push('识别到家庭/多人出行，暂定 3 人');
  }

  if (/孩子|亲子|宝贝|小孩|带娃/.test(trimmed)) {
    result.kidFriendly = true;
    messages.push('识别到亲子需求');
  }

  const paceMatchRelaxed = trimmed.match(/轻松|慢节奏|悠闲|放松/);
  const paceMatchIntensive = trimmed.match(/紧凑|高效|打卡|密集|深度/);
  if (paceMatchRelaxed) {
    result.pace = 'relaxed';
    messages.push('识别到偏好：轻松节奏');
  } else if (paceMatchIntensive) {
    result.pace = 'intensive';
    messages.push('识别到偏好：紧凑节奏');
  }

  const themes = detectThemes(trimmed);
  if (themes.length > 0) {
    result.preferenceTags = themes;
    messages.push(`识别到偏好主题：${themes.join('、')}`);
  }

  if (!/预算|费用|价/.test(trimmed) && !result.budget) {
    // no-op; allow manual entry
  }

  result.notes = trimmed;

  return result;
}

export const usePlannerStore = defineStore('planner', () => {
  const form = reactive(createDefaultForm());
  const plan = ref<TripPlan | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const diagnostics = ref<string[]>([]);
  const parseLogs = ref<string[]>([]);

  const voiceSession = ref<VoiceRecognitionSession | null>(null);
  const voiceLiveText = ref('');
  const voiceFinalText = ref('');
  const voiceError = ref<string | null>(null);

  const tripDays = computed(() => {
    if (!form.startDate || !form.endDate) {
      return 0;
    }
    return diffDays(form.startDate, form.endDate);
  });

  const isListening = computed(() => voiceSession.value?.isActive() ?? false);

  function mergePreferenceTags(tags: string[]) {
    const merged = new Set(form.preferenceTags);
    tags.forEach(tag => {
      if (PREFERENCE_TAG_OPTIONS.includes(tag)) {
        merged.add(tag);
      }
    });
    form.preferenceTags = Array.from(merged);
  }

  function applyParsedIntent(intent: ParsedIntent, { appendNotes }: { appendNotes: boolean }) {
    if (intent.destination) {
      form.destination = intent.destination;
    }
    if (intent.startDate) {
      form.startDate = intent.startDate;
      if (intent.days && intent.days > 0) {
        form.endDate = addDays(form.startDate, intent.days - 1);
      } else if (!form.endDate) {
        form.endDate = intent.startDate;
      }
    }
    if (intent.days && intent.days > 0 && form.startDate) {
      form.endDate = addDays(form.startDate, intent.days - 1);
    }
    if (intent.budget && intent.budget > 0) {
      form.budget = intent.budget;
    }
    if (intent.travelers && intent.travelers > 0) {
      form.travelers = intent.travelers;
    }
    if (intent.pace) {
      form.pace = intent.pace;
    }
    if (intent.preferenceTags && intent.preferenceTags.length > 0) {
      mergePreferenceTags(intent.preferenceTags);
    }
    if (intent.kidFriendly && !form.preferenceTags.includes('亲子')) {
      mergePreferenceTags(['亲子']);
    }
    if (appendNotes && intent.notes) {
      form.extraNotes = form.extraNotes
        ? `${form.extraNotes.trim()}\n${intent.notes.trim()}`
        : intent.notes.trim();
    }
  }

  function analyzeIntent(text?: string, options: { appendNotes?: boolean } = {}): ParseOutcome {
    const sourceText = text ?? form.intentText;
    const intent = parseIntent(sourceText, form);
    if (intent.messages.length) {
      parseLogs.value = [...parseLogs.value, ...intent.messages];
    }
    applyParsedIntent(intent, { appendNotes: options.appendNotes ?? true });
    if (intent.notes && !text) {
      form.intentText = intent.notes;
    }
    return { messages: intent.messages };
  }

  async function startVoiceInput() {
    if (isListening.value) {
      await stopVoiceInput();
    }
    voiceError.value = null;
    parseLogs.value = [];

    try {
      const session = await startVoiceRecognition(handleSpeechResult, {
        dynamicCorrection: true,
        vadEos: 6000,
      });
      voiceSession.value = session;
    } catch (err) {
      voiceError.value = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.error('[planner] 启动语音识别失败', err);
      }
    }
  }

  async function stopVoiceInput() {
    const session = voiceSession.value;
    if (!session) {
      return;
    }
    voiceSession.value = null;
    voiceLiveText.value = '';
    try {
      await session.stop();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[planner] 停止语音识别失败', err);
      }
    }
  }

  function handleSpeechResult(result: SpeechResult) {
    voiceLiveText.value = result.text;
    if (result.isFinal) {
      voiceFinalText.value = result.text;
      form.intentText = form.intentText
        ? `${form.intentText.trim()}\n${result.text.trim()}`
        : result.text.trim();
      analyzeIntent(result.text, { appendNotes: true });
    }
  }

  function buildPreferences(): TravelPreferences {
    return {
      pace: form.pace,
      themes: form.preferenceTags,
      kidFriendly: form.preferenceTags.includes('亲子'),
      mustHave: form.extraNotes
        ? form.extraNotes
            .split(/\n|，|,|。/)
            .map(item => item.trim())
            .filter(Boolean)
        : [],
    };
  }

  async function submitPlan() {
    error.value = null;
    diagnostics.value = [];

    if (!form.destination) {
      error.value = '请先填写或识别旅行目的地';
      return;
    }
    if (!form.startDate || !form.endDate) {
      error.value = '请设置出发和结束日期';
      return;
    }
    if (
      new Date(`${form.endDate}T00:00:00`).getTime() <
      new Date(`${form.startDate}T00:00:00`).getTime()
    ) {
      error.value = '结束日期不能早于出发日期';
      return;
    }

    loading.value = true;
    try {
      const preferences = buildPreferences();
      const payloadBudget = form.budget ?? 0;
      const result = await generatePlan({
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        budget: payloadBudget,
        travelers: Math.max(1, Math.round(form.travelers)),
        preferences,
      });

      plan.value = result.plan;
      diagnostics.value = result.diagnostics;
      if (!result.plan) {
        error.value = '暂时无法生成行程，请稍后重试。';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) {
        console.error('[planner] 生成行程失败', err);
      }
    } finally {
      loading.value = false;
    }
  }

  function resetPlan() {
    plan.value = null;
    diagnostics.value = [];
  }

  function resetForm() {
    const next = createDefaultForm();
    Object.assign(form, next);
    parseLogs.value = [];
    voiceLiveText.value = '';
    voiceFinalText.value = '';
    voiceError.value = null;
  }

  async function teardown() {
    await stopVoiceInput();
  }

  return {
    form,
    plan,
    loading,
    error,
    diagnostics,
    parseLogs,
    tripDays,
    voiceLiveText,
    voiceFinalText,
    voiceError,
    isListening,
    startVoiceInput,
    stopVoiceInput,
    analyzeIntent,
    submitPlan,
    resetPlan,
    resetForm,
    teardown,
    preferenceTagOptions: PREFERENCE_TAG_OPTIONS,
  };
});
