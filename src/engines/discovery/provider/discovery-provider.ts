import { DiscoveryInput, DiscoveryResult } from "../models/discovery-types";

export interface DiscoveryProvider {
  readonly name: string;
  discover(input: DiscoveryInput): Promise<DiscoveryResult>;
}
