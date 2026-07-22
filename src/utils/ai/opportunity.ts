import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { prisma } from "@/src/utils/prisma";
import type { CompanyDnaData } from "./company-dna";

export type OpportunityInput = {
  companyName: string;
  website?: string;
  description?: string;
  additionalInfo?: string;
};

export type OpportunityAnalysis = {
  buyerProfile: string;
  productFit: "HIGH" | "MEDIUM" | "LOW";
  valueScore: number;
  approachAngle: string;
  risks: string;
  insight: string;
  summary: string;
};

const ANALYSIS_PROMPT = `你是一个资深外贸业务分析专家。你的任务是分析目标客户是否值得开发，并给出让业务员"没想到"的洞察。

## 用户公司信息（Company DNA）

{companyDna}

## 目标客户信息

公司名称：{companyName}
{website}
{description}
{additionalInfo}

## 输出要求

返回 JSON，严格使用以下结构：

{
  "buyerProfile": "客户基本画像。包括公司规模、所在行业、主要市场、商业模式（B2B/B2C）、大致年营收范围（如果有线索）",
  "productFit": "产品匹配度 HIGH | MEDIUM | LOW",
  "valueScore": "开发价值评分 1-10",
  "approachAngle": "推荐切入角度。具体策略，如'主打性价比''突出认证优势''针对圣诞季推广'",
  "risks": "风险提示。可能存在的开发风险",
  "insight": "关键洞察。这是最重要的字段。检查客户的网站、新闻、产品线、About Us 等，找出一个业务员自己看不出来的洞察。例如：'他们首页重点强调 OEM Service 而非具体产品，说明开发信应先介绍你们的定制能力而非产品目录'，或'新闻中心最近两个月更新了三次，说明业务在增长，现在开发时机好'。一次只给一个 Insight，要具体、可行动、让人看了觉得'这个我没想到'",
  "summary": "一句话总结。30 字以内，老板扫一眼就能判断。如：'值得开发，这是一家与你高度匹配的德国 OEM 客户，建议从定制能力切入'或'谨慎开发，产品匹配一般，竞争可能激烈'"
}

评分标准（valueScore）：
- 8-10：高度匹配，客户有明显采购需求，与本公司优势高度契合
- 5-7：中等匹配，有合作可能但需要进一步验证
- 1-4：匹配度低，建议谨慎投入`;

export async function analyzeOpportunity(
  input: OpportunityInput,
  companyDna: CompanyDnaData,
  userId?: string
): Promise<OpportunityAnalysis> {
  const website = input.website ? `网址：${input.website}` : "";
  const description = input.description ? `客户介绍：${input.description}` : "";
  const additionalInfo = input.additionalInfo
    ? `补充信息：${input.additionalInfo}`
    : "";

  const companyDnaText = Object.entries(companyDna)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const systemPrompt = ANALYSIS_PROMPT.replace("{companyDna}", companyDnaText)
    .replace("{companyName}", input.companyName)
    .replace("{website}", website)
    .replace("{description}", description)
    .replace("{additionalInfo}", additionalInfo);

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
