import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";
import { prisma } from "@/src/utils/prisma";

export type ThreadAnalysis = {
  summary: string;
  priority: "high" | "medium" | "low";
  status: "active" | "waiting" | "follow_up" | "completed";
  intent: string;
  nextAction: string;
  keyInfo: {
    deadline?: string;
    quantity?: string;
    targetPrice?: string;
    sampleStatus?: string;
  };
};

const THREAD_PROMPT = `你是一个资深外贸跟单分析助手。你的任务是分析一段客户沟通记录，提取关键信息并给出行动建议。

## 沟通内容

{messageBody}

{context}

## 输出要求

返回 JSON 格式：

{
  "summary": "本次沟通的一句话总结（中文）",
  "priority": "根据紧急程度返回 high | medium | low",
  "status": "根据沟通内容判断当前状态：active（需要处理）| waiting（等待对方回复）| follow_up（需要跟进）| completed（已完成）",
  "intent": "客户的核心意图（如：询价、打样、议价、确认订单、催货、售后等）",
  "nextAction": "建议跟单员下一步做什么（具体可执行）",
  "keyInfo": {
    "deadline": "如果有截止日期",
    "quantity": "如果有数量信息",
    "targetPrice": "如果有目标价格",
    "sampleStatus": "如果有打样状态"
  }
}

注意：如果没有足够信息判断某些字段，返回 null 而不是猜测。`;

export async function analyzeCommunication(
  messageBody: string,
  existingContext: string,
  userId?: string
): Promise<ThreadAnalysis> {
  const context = existingContext
    ? `## 已有上下文\n\n${existingContext}`
    : "";

  const systemPrompt = THREAD_PROMPT.replace("{messageBody}", messageBody)
    .replace("{context}", context);

  const content = await callDeepSeek(systemPrompt, "请分析这段沟通。", {
    responseFormat: "json_object",
    temperature: 0.1,
  });

  return JSON.parse(cleanJsonResponse(content)) as ThreadAnalysis;
}
