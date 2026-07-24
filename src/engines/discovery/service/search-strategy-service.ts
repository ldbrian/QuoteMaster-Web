import { callDeepSeek, cleanJsonResponse } from "@/src/utils/deepseek/client";

export type SearchStrategyInput = {
  market: string;
  product: string;
  clientType: string;
};

export type SearchQuery = {
  query: string;
  angle: string;
  suggestion: string;
};

export type SearchStrategy = {
  analysis: string;
  queries: SearchQuery[];
};

const STRATEGY_PROMPT = `你是一个外贸客户开发专家。用户会告诉你目标市场、产品和客户类型，你需要生成一套搜索策略。

输出 JSON，结构如下：
{
  "analysis": "一句话分析这个搜索目标的特点和最优搜索方向",
  "queries": [
    {
      "query": "具体的搜索关键词，用英文",
      "angle": "这个搜索角度的简短说明",
      "suggestion": "建议去哪里搜，例如：Google、LinkedIn、行业目录、Yellow Pages"
    }
  ]
}

规则：
- 生成 6 条搜索查询，覆盖不同角度（行业术语、采购角色、地区限定、商业模式、平台等）
- 查询用英文，搜索引擎索引英文内容最全面
- 避免重复，每条查询有独特的搜索角度
- analysis 控制在 100 字以内
- angle 控制在 20 字以内
- suggestion 控制在 30 字以内`;

export async function generateSearchStrategy(
  input: SearchStrategyInput
): Promise<SearchStrategy> {
  const userMessage = `目标市场：${input.market}
产品：${input.product}
客户类型：${input.clientType}`;

  const content = await callDeepSeek(STRATEGY_PROMPT, userMessage, {
    responseFormat: "json_object",
    temperature: 0.7,
  });

  const parsed = JSON.parse(cleanJsonResponse(content)) as SearchStrategy;

  return {
    analysis: parsed.analysis || "",
    queries: (parsed.queries || []).slice(0, 8),
  };
}
