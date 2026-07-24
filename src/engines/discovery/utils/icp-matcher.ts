const STOP_WORDS = new Set([
  "的", "公司", "有限公司", "股份", "有限", "集团", "group", "co", "ltd", "inc", "llc",
  "corp", "corporation", "limited", "company", "gmbh", "sarl", "bv", "pty",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,，.。/\\()（）\-_]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function matchScore(keywords: string[], target: string): number {
  const targetTokens = new Set(tokenize(target));
  const matched = keywords.filter((k) => {
    const kLower = k.toLowerCase();
    return target.toLowerCase().includes(kLower);
  });
  return keywords.length > 0 ? matched.length / keywords.length : 0;
}

export type IcpInput = {
  keywords: string[];
};

export function scoreCandidates(
  icp: IcpInput,
  candidates: { companyName: string; website?: string }[]
): { companyName: string; website?: string; icpScore: number; matchReasons: string[] }[] {
  if (!icp.keywords.length) {
    return candidates.map((c) => ({ ...c, icpScore: 0, matchReasons: [] }));
  }

  return candidates.map((c) => {
    const text = `${c.companyName} ${c.website || ""}`;
    const score = matchScore(icp.keywords, text);
    const matchedKeywords = icp.keywords.filter((k) =>
      text.toLowerCase().includes(k.toLowerCase())
    );
    return {
      ...c,
      icpScore: Math.round(score * 100),
      matchReasons: matchedKeywords.length > 0
        ? [`匹配关键词: ${matchedKeywords.join(", ")}`]
        : [],
    };
  }).sort((a, b) => b.icpScore - a.icpScore);
}
