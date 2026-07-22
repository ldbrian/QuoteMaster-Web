import { ResearchResult } from "../models/research-result";
import { ResearchProvider, ResearchInput } from "./research-provider";

export class ManualProvider implements ResearchProvider {
  readonly name = "manual";

  async research(input: ResearchInput): Promise<ResearchResult> {
    return {
      companyName: input.companyName,
      website: input.website || "",
      description: input.description || "",
      additionalNotes: input.additionalInfo || "",
      products: "",
      markets: "",
      businessModel: "",
      knownFacts: this.extractKnownFacts(input),
      unknownFacts: this.identifyUnknowns(input),
      sources: ["用户输入"],
    };
  }

  private extractKnownFacts(input: ResearchInput): string[] {
    const facts: string[] = [];
    if (input.companyName) facts.push(`公司名称：${input.companyName}`);
    if (input.website) facts.push(`网址：${input.website}`);
    if (input.description) facts.push(`客户描述：${input.description}`);
    if (input.additionalInfo) facts.push(`补充信息：${input.additionalInfo}`);
    return facts;
  }

  private identifyUnknowns(input: ResearchInput): string[] {
    const unknowns: string[] = [];
    if (!input.website) unknowns.push("客户官网未知");
    if (!input.description) unknowns.push("客户业务描述未知");
    if (!input.additionalInfo) unknowns.push("产品/市场等详细信息未知");
    unknowns.push("客户商业模式（B2B/B2C）未知");
    unknowns.push("客户目标市场区域未知");
    return unknowns;
  }
}
