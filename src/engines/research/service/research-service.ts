import { ResearchResult } from "../models/research-result";
import { ResearchProvider, ResearchInput } from "../provider/research-provider";
import { WebFetchProvider } from "../provider/web-fetch-provider";

export class ResearchService {
  private providers: Map<string, ResearchProvider> = new Map();
  private fallbackProvider: ResearchProvider;

  constructor() {
    const webFetch = new WebFetchProvider();
    this.fallbackProvider = webFetch;
    this.register(webFetch);
  }

  register(provider: ResearchProvider): void {
    this.providers.set(provider.name, provider);
  }

  unregister(name: string): void {
    this.providers.delete(name);
  }

  getProvider(name: string): ResearchProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async research(
    input: ResearchInput,
    providerName?: string
  ): Promise<ResearchResult> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        return provider.research(input);
      }
    }
    return this.fallbackProvider.research(input);
  }
}

export const researchService = new ResearchService();
