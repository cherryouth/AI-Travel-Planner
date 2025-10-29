import type { TravelPreferences, TripPlan } from '../types/plan';

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

// TODO: 调用 Hunyuan-T1 API，解析结构化返回
export async function generatePlan(payload: GeneratePlanPayload): Promise<PlanResult> {
  console.info('调用 Hunyuan-T1 行程规划 API（暂未实现）', payload);

  // 这里先返回占位数据，后续替换为真实接口调用
  return {
    plan: null,
    diagnostics: ['行程规划服务未实现，返回空计划。'],
  };
}
