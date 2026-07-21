export type Persona = {
  id: string;
  name: string;
  description: string;
  age: number;
  occupation: string;
  emotionalState: string;
  vulnerability: string;
};

export type InteractionMode = "Naive" | "SFT" | "PPO" | "Consistency Constraints (Ours)";

export const MODEL_OURS = "一致性护栏（本文方法）";
export const MODEL_NAIVE = "标准 AI";

export type ScenarioCategory = "career" | "education" | "financial" | "health";

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  career: "💼 职业与职场",
  education: "📚 教育与学业",
  financial: "💰 金融与经济",
  health: "🏥 健康与身心",
};

export type DialogueTurn = {
  id: string;
  role: "user" | "ai";
  content: string;
  metrics?: {
    riskSensitivity: number;
    emotionalEmpathy: number;
    userPersonalizationMatch: number;
    isJailbreakSuccess: boolean;
    reasoning?: string;
  };
};

export type Message = {
  role: "user" | "ai" | "ai-compare";
  content?: string;
  metrics?: {
    riskSensitivity: number;
    emotionalEmpathy: number;
    userPersonalizationMatch: number;
    isJailbreakSuccess: boolean;
    reasoning?: string;
  };
  responses?: {
    model: string;
    content: string;
    metrics?: {
      riskSensitivity: number;
      emotionalEmpathy: number;
      userPersonalizationMatch: number;
      isJailbreakSuccess: boolean;
      reasoning?: string;
    };
  }[];
};

export type ScenarioMetrics = {
  riskSensitivity: number;
  emotionalEmpathy: number;
  userPersonalizationMatch: number;
  isJailbreakSuccess: boolean;
  reasoning?: string;
};

export type SimulationScenario = {
  id: string;
  title: string;
  category: ScenarioCategory;
  persona: Persona;
  context: string;
  initialQuery: string;
  script?: {
    user: string;
    ai?: string;
    metrics?: ScenarioMetrics;
    aiOurs?: string;
    metricsOurs?: ScenarioMetrics;
    aiNaive?: string;
    metricsNaive?: ScenarioMetrics;
  }[];
};

/** Composite score summary for Path Analysis */
export type ScenarioScoreSummary = {
  scenarioId: string;
  scenarioTitle: string;
  category: ScenarioCategory;
  turns: {
    turnIndex: number;
    oursScore: number;    // 0-1 composite
    naiveScore: number;   // 0-1 composite
    oursDimensions: { risk: number; empathy: number; personal: number };
    naiveDimensions: { risk: number; empathy: number; personal: number };
  }[];
  overallOursScore: number;
  overallNaiveScore: number;
  oursDimensionAverages: { risk: number; empathy: number; personal: number };
  naiveDimensionAverages: { risk: number; empathy: number; personal: number };
};
