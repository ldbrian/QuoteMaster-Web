import { DiscoveryProvider } from "../provider/discovery-provider";
import { DiscoveryInput, DiscoveryResult } from "../models/discovery-types";
import { ManualDiscoveryProvider } from "../provider/manual-provider";
import { BraveSearchProvider } from "../provider/brave-search-provider";
import { MultiQueryProvider } from "../provider/multi-query-provider";
import { DuckDuckGoProvider } from "../provider/duckduckgo-provider";

export class DiscoveryService {
  private providers: Map<string, DiscoveryProvider> = new Map();
  private fallbackProvider: DiscoveryProvider;

  constructor() {
    const manual = new ManualDiscoveryProvider();
    this.fallbackProvider = manual;
    this.register(manual);
    try {
      this.register(new BraveSearchProvider());
      this.register(new MultiQueryProvider());
    } catch {
      // Brave provider registration skipped (env vars not configured)
    }

    try {
      this.register(new DuckDuckGoProvider());
    } catch {
      // DuckDuckGo provider registration skipped
    }
  }

  register(provider: DiscoveryProvider): void {
    this.providers.set(provider.name, provider);
  }

  unregister(name: string): void {
    this.providers.delete(name);
  }

  getProvider(name: string): DiscoveryProvider | undefined {
    return this.providers.get(name);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async discover(
    input: DiscoveryInput,
    providerName?: string
  ): Promise<DiscoveryResult> {
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        return provider.discover(input);
      }
    }
    return this.fallbackProvider.discover(input);
  }
}

export const discoveryService = new DiscoveryService();
