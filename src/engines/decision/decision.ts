import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { prisma } from "@/src/utils/prisma";
import type { CompanyDnaData } from "@/src/utils/ai/company-dna";
import type { ResearchResult } from "@/src/engines/research/models/research-result";

export type OpportunityAnalysis = {
  buyerProfile: string;
  productFit: "HIGH" | "MEDIUM" | "LOW";
  valueScore: number;
  approachAngle: string;
  risks: string;
  insight: string;
  summary: string;
  confidenceScore: number;
  confidenceReason: string;
  decisionAdvice: string;
};

const ANALYSIS_PROMPT = `你是一个资深外贸业务分析专家。你的任务是分析目标客户是否值得开发，并给出让业务员"没想到"的洞察。

## 用户公司信息（Company DNA）

{companyDna}

## Research Summary（目标客户研究摘要）

{researchSummary}

## 输出要求

返回 JSON，严格使用以下结构：

{
  "buyerProfile": "客户基本画像。包括公司规模、所在行业、主要市场、商业模式（B2B/B2C）、大致年营收范围（如果有线索）",
  "productFit": "产品匹配度 HIGH | MEDIUM | LOW",
  "valueScore": "开发价值评分 1-10",
  "approachAngle": "推荐切入角度。具体策略，如'主打性价比''突出认证优势''针对圣诞季推广'",
  "risks": "风险提示。可能存在的开发风险",
  "insight": "关键洞察。这是最重要的字段。检查客户的产品、市场、商业模式等信息，找出一个业务员自己看不出来的洞察。例如：'目标市场集中在美国，说明他们对供应商的合规认证要求高，开发信应先强调你们的认证资质而非价格'，或'客户官网提到了 OEM，说明开发信应以定制能力切入而非产品目录'。一次只给一个 Insight，要具体、可行动、让人看了觉得'这个我没想到'",
  "summary": "一句话总结。30 字以内，老板扫一眼就能判断。如：'值得开发，这是一家与你高度匹配的德国 OEM 客户，建议从定制能力切入'或'谨慎开发，产品匹配一般，竞争可能激烈'",
  "confidenceScore": "分析可信度 0-100，根据 Research Summary 的完整度判断：提供了公司名+产品+市场+商业模式则 85+；缺少关键信息 60-70；只有公司名 40-50；只有公司名且模糊 20-30",
  "confidenceReason": "可信度评分的原因说明，例如：'提供了产品信息和市场定位，但缺少商业模式信息，分析依据部分充分'",
  "decisionAdvice": "如果我是业务员，下一步应该做什么？给出具体可执行的行动建议，如：'建议发送开发信，主推定制能力，关注他们的 OEM 需求'或'建议先通过 LinkedIn 了解采购决策人，再发送开发信'"
}

评分标准（valueScore）：
- 8-10：高度匹配，客户有明显采购需求，与本公司优势高度契合
- 5-7：中等匹配，有合作可能但需要进一步验证
- 1-4：匹配度低，建议谨慎投入

AI 必须回答：
1. 为什么值得开发？
2. 为什么可能不值得？
3. 如果我是业务员，下一步应该做什么？`;

function buildResearchSummary(input: ResearchResult): string {
  const lines: string[] = [];

  lines.push(`公司名称：${input.companyName}`);
  if (input.website) lines.push(`网址：${input.website}`);
  if (input.description) lines.push(`客户描述：${input.description}`);
  if (input.additionalNotes) lines.push(`补充信息：${input.additionalNotes}`);
  if (input.products) lines.push(`主营产品：${input.products}`);
  if (input.markets) lines.push(`目标市场：${input.markets}`);
  if (input.businessModel) lines.push(`商业模式：${input.businessModel}`);

  if (input.knownFacts.length > 0) {
    lines.push(`\n已知信息：`);
    input.knownFacts.forEach((f) => lines.push(`- ${f}`));
  }

  if (input.unknownFacts.length > 0) {
    lines.push(`\n缺失信息：`);
    input.unknownFacts.forEach((f) => lines.push(`- ${f}`));
  }

  return lines.join("\n");
}

export async function analyzeOpportunity(
  research: ResearchResult,
  companyDna: CompanyDnaData,
  userId?: string
): Promise<OpportunityAnalysis> {
  const companyDnaText = Object.entries(companyDna)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const researchSummary = buildResearchSummary(research);

  const systemPrompt = ANALYSIS_PROMPT
    .replace("{companyDna}", companyDnaText)
    .replace("{researchSummary}", researchSummary);

  const userMessage = "请分析这个客户。";
  const startTime = Date.now();

  let content: string;
  try {
    content = await callDeepSeek(systemPrompt, userMessage, {
      responseFormat: "json_object",
      temperature: 0.2,
    });
  } catch (error) {
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    await prisma.promptLog.create({
      data: {
        userId,
        promptType: "opportunity_analysis",
        systemPrompt,
        userMessage,
        durationMs,
      },
    }).catch(() => {});
  }

  const parsed = JSON.parse(cleanJsonResponse(content)) as OpportunityAnalysis;
  return parsed;
}
