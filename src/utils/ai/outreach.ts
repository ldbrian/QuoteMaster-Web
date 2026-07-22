import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { prisma } from "@/src/utils/prisma";
import type { CompanyDnaData } from "./company-dna";
import type { OpportunityAnalysis } from "./opportunity";
import type { ResearchResult } from "@/src/research/models/research-result";

export type OutreachInput = {
  tone?: string;
  instructions?: string;
};

export type OutreachResult = {
  subject: string;
  subjectAlt: string;
  body: string;
  suggestions: string;
};

const OUTREACH_PROMPT = `你是一个资深外贸开发信写作专家。你的任务是基于用户公司信息和客户研究摘要，生成针对性的开发信。

## 用户公司信息

{companyDna}

## 客户研究摘要（Research Summary）

{researchSummary}

## 客户分析结果

{buyerProfile}

匹配度：{productFit}
开发价值评分：{valueScore}/10
推荐切入角度：{approachAngle}
风险提示：{risks}

## 生成要求

请生成一封专业的外贸开发信，返回 JSON 格式：

{
  "subject": "推荐邮件主题",
  "subjectAlt": "备选邮件主题",
  "body": "邮件正文（3段式：破冰 -> 价值主张 -> CTA）",
  "suggestions": "优化建议（语气、长度、文化适配等方面的改进提示）"
}

## 必须遵守的写作规则

### Rule 1：每封开发信至少引用 Research Summary 中两个具体事实
引用客户的产品、市场、品牌定位或商业模式。例如：如果 Research Summary 提到"主营产品是家居装饰品，目标市场是美国"，正文必须具体提到这些，不能只说"your products"。

### Rule 2：禁止使用没有依据的赞美
如 "Your collections are beautiful"、"Your company is excellent" 等。除非 Research Summary 中有明确证据表明产品设计获奖或品牌知名。

### Rule 3：所有优势必须与客户产生关联
不要只说 "We provide high quality products"。必须结合客户背景，例如 "Based on your focus on the US home decor market, our certified quality and competitive pricing can help you expand your supplier base."

### Rule 4：Evidence Thinking
邮件中的所有切入点都必须来自 Research Summary。AI 不能自己虚构客户信息。如果 Research Summary 中缺少某类信息，不要编造。宁可邮件内容更短，也不能包含无依据的陈述。

## 格式规范
1. 正文使用英文，保持专业但友好的语气
2. 第一段：提及客户背景/需求，建立关联
3. 第二段：展示公司价值主张，呼应推荐切入角度
4. 第三段：明确的 CTA（Call to Action）
5. 正文不要超过 200 个单词
6. 不要使用过度推销的语言

{extraInstructions}`;

export async function generateOutreach(
  research: ResearchResult,
  companyDna: CompanyDnaData,
  analysis: OpportunityAnalysis,
  options?: OutreachInput,
  userId?: string
): Promise<OutreachResult> {
  const companyDnaText = Object.entries(companyDna)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const researchSummary = [
    `公司名称：${research.companyName}`,
    research.website ? `网址：${research.website}` : "",
    research.description ? `客户描述：${research.description}` : "",
    research.additionalNotes ? `补充信息：${research.additionalNotes}` : "",
    research.products ? `主营产品：${research.products}` : "",
    research.markets ? `目标市场：${research.markets}` : "",
    research.businessModel ? `商业模式：${research.businessModel}` : "",
  ].filter(Boolean).join("\n");

  const extraInstructions = options?.instructions
    ? `\n额外要求：${options.instructions}`
    : options?.tone
      ? `\n语气要求：${options.tone}`
      : "";

  const systemPrompt = OUTREACH_PROMPT
    .replace("{companyDna}", companyDnaText)
    .replace("{researchSummary}", researchSummary)
    .replace("{buyerProfile}", analysis.buyerProfile)
    .replace("{productFit}", analysis.productFit)
    .replace("{valueScore}", String(analysis.valueScore))
    .replace("{approachAngle}", analysis.approachAngle)
    .replace("{risks}", analysis.risks)
    .replace("{extraInstructions}", extraInstructions);

  const userMessage = "请生成开发信。";
  const startTime = Date.now();

  let content: string;
  try {
    content = await callDeepSeek(systemPrompt, userMessage, {
      responseFormat: "json_object",
      temperature: 0.4,
    });
  } catch (error) {
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    await prisma.promptLog.create({
      data: {
        userId,
        promptType: "outreach_generation",
        systemPrompt,
        userMessage,
        durationMs,
      },
    }).catch(() => {});
  }

  return JSON.parse(cleanJsonResponse(content)) as OutreachResult;
}
