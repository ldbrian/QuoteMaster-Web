import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { prisma } from "@/src/utils/prisma";
import type { CompanyDnaData } from "./company-dna";
import type { OpportunityAnalysis } from "./opportunity";

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

const OUTREACH_PROMPT = `你是一个资深外贸开发信写作专家。你的任务是基于用户公司信息和客户分析结果，生成针对性的开发信。

## 用户公司信息

{companyDna}

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

规则：
1. 正文使用英文，保持专业但友好的语气
2. 第一段：提及客户背景/需求，建立关联
3. 第二段：展示公司价值主张，呼应推荐切入角度
4. 第三段：明确的 CTA（Call to Action）
5. 正文不要超过 200 个单词
6. 不要使用过度推销的语言

{extraInstructions}`;

export async function generateOutreach(
  companyDna: CompanyDnaData,
  analysis: OpportunityAnalysis,
  options?: OutreachInput,
  userId?: string
): Promise<OutreachResult> {
  const companyDnaText = Object.entries(companyDna)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const extraInstructions = options?.instructions
    ? `\n额外要求：${options.instructions}`
    : options?.tone
      ? `\n语气要求：${options.tone}`
      : "";

  const systemPrompt = OUTREACH_PROMPT.replace("{companyDna}", companyDnaText)
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
