import { callDeepSeek } from "@/src/utils/deepseek/client";

const QUESTIONS = [
  { key: "companyName", question: "你的公司名称是什么？" },
  { key: "mainProducts", question: "你们公司主要做什么产品？请列出核心产品和品类。" },
  { key: "coreAdvantages", question: "相比同行，你们的核心优势是什么？（例如：价格优势、质量认证、设计能力、快速交货等）" },
  { key: "targetCustomerType", question: "你们的目标客户是哪些类型？（例如：批发商、品牌商、零售商、电商卖家、进口商等）" },
  { key: "targetMarkets", question: "你们主要做哪些市场？（例如：北美、欧洲、东南亚、中东、南美等）" },
  { key: "unsuitableClients", question: "有没有哪些客户是你们不太适合做的？或者不想接的订单类型？（帮助我们过滤不匹配的机会）" },
];

export { QUESTIONS };

export type CompanyDnaData = {
  companyName: string;
  mainProducts: string;
  coreAdvantages: string;
  targetCustomerType: string;
  targetMarkets: string;
  unsuitableClients: string;
};

const NEXT_QUESTION_PROMPT = `你是一个外贸企业画像引导助手。你的任务是引导用户一步步完善他们的公司资料。

当前已收集的信息：
{existingData}

请根据已收集的信息，判断接下来最应该问什么问题，以帮助用户完善公司画像。

规则：
1. 如果还有关键信息缺失，提出下一个问题并说明为什么需要这个信息
2. 如果所有信息已经收集完整，输出一句总结，并告诉用户资料已完善
3. 语气友好专业，用中文

输出 JSON 格式：
{
  "nextQuestion": "问题内容",
  "reason": "为什么需要这个信息",
  "isComplete": false
}

当 isComplete 为 true 时，nextQuestion 应输出总结和完成提示。`;

export async function getNextQuestion(existingData: Partial<CompanyDnaData>) {
  const filledFields = Object.entries(existingData).filter(([, v]) => v?.trim());
  const isComplete = filledFields.length >= QUESTIONS.length;

  if (isComplete) {
    return {
      nextQuestion: "太好了！你的公司资料已经完善。现在你可以开始分析潜在客户了。",
      reason: "所有信息已收集完成",
      isComplete: true,
    };
  }

  const existingText = filledFields
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const content = await callDeepSeek(
    NEXT_QUESTION_PROMPT,
    existingText || "还没有任何信息，请从第一个问题开始。",
    { responseFormat: "json_object" }
  );

  return JSON.parse(content) as {
    nextQuestion: string;
    reason: string;
    isComplete: boolean;
  };
}
