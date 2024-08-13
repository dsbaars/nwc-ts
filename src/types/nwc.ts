export type NWCAuthorizationUrlOptions = {
    name?: string;
    requestMethods?: string[];
    returnTo?: string;
    expiresAt?: Date;
    maxAmount?: number;
    budgetRenewal?: "never" | "daily" | "weekly" | "monthly" | "yearly";
    editable?: boolean;
};

export type NWCClientOptions = {
    providerName?: string;
    authorizationUrl?: string;
    relayUrl?: string;
    secret?: string;
    walletPubkey?: string;
    nostrWalletConnectUrl?: string;
};

export interface NWCOptions {
    authorizationUrl?: string;
    relayUrl: string;
    walletPubkey: string;
    secret?: string;
}

export const NWCs: Record<string, NWCOptions> = {
    alby: {
      authorizationUrl: "https://nwc.getalby.com/apps/new",
      relayUrl: "wss://relay.getalby.com/v1",
      walletPubkey:
        "69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9",
    },
  };