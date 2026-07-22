import { DiscoveryProvider } from "./discovery-provider";
import { DiscoveryInput, DiscoveryResult, CandidateCompany } from "../models/discovery-types";

export class ManualDiscoveryProvider implements DiscoveryProvider {
  readonly name = "manual";

  async discover(input: DiscoveryInput): Promise<DiscoveryResult> {
    if (!input.rawList?.trim()) {
      return { candidates: [], totalFound: 0, provider: this.name };
    }

    const lines = input.rawList
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("#"));

    const candidates: CandidateCompany[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const companyName = parts[0];
      if (!companyName || seen.has(companyName.toLowerCase())) continue;
      seen.add(companyName.toLowerCase());

      candidates.push({
        companyName,
        website: parts.length > 1 ? parts[1] : undefined,
        confidence: 50,
        matchReasons: ["用户导入"],
        source: "手动导入",
      });
    }

    return { candidates, totalFound: candidates.length, provider: this.name };
  }
}
