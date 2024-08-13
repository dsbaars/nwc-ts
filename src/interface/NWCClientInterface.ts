import { Relay, UnsignedEvent, VerifiedEvent } from "nostr-tools";
import { Nip47Capability, Nip47NotificationType, Nip47GetInfoResponse, Nip47GetBalanceResponse, Nip47PayInvoiceRequest, Nip47PayResponse, Nip47PayKeysendRequest, Nip47SignMessageRequest, Nip47SignMessageResponse, Nip47MultiPayInvoiceRequest, Nip47MultiPayInvoiceResponse, Nip47MultiPayKeysendRequest, Nip47MultiPayKeysendResponse, Nip47MakeInvoiceRequest, Nip47Transaction, Nip47LookupInvoiceRequest, Nip47ListTransactionsRequest, Nip47ListTransactionsResponse, Nip47Notification } from "../types/nip47.ts";
import { NWCOptions, NWCClientOptions, NWCAuthorizationUrlOptions } from "../types/nwc.ts";

export interface NWCClientInterface {
    // Properties
    relay: Relay;
    relayUrl: string;
    secret: string | undefined;
    walletPubkey: string;
    options: NWCOptions;
    nostrWalletConnectUrl: string;
    connected: boolean;
    publicKey: string;

    getPublicKey(): Promise<string>;
    signEvent(event: UnsignedEvent): Promise<VerifiedEvent>;
    getEventHash(event: UnsignedEvent): string;
    close(): void;

    encrypt(pubkey: string, content: string): Promise<string>;
    decrypt(pubkey: string, content: string): Promise<string>;

    getAuthorizationUrl(options?: NWCAuthorizationUrlOptions): URL;
    initNWC(options?: NWCAuthorizationUrlOptions): Promise<void>;

    getWalletServiceInfo(): Promise<{
        capabilities: Nip47Capability[];
        notifications: Nip47NotificationType[];
    }>;

    getInfo(): Promise<Nip47GetInfoResponse>;
    getBalance(): Promise<Nip47GetBalanceResponse>;
    payInvoice(request: Nip47PayInvoiceRequest): Promise<Nip47PayResponse>;
    payKeysend(request: Nip47PayKeysendRequest): Promise<Nip47PayResponse>;
    signMessage(
        request: Nip47SignMessageRequest
    ): Promise<Nip47SignMessageResponse>;

    multiPayInvoice(
        request: Nip47MultiPayInvoiceRequest
    ): Promise<Nip47MultiPayInvoiceResponse>;
    multiPayKeysend(
        request: Nip47MultiPayKeysendRequest
    ): Promise<Nip47MultiPayKeysendResponse>;

    makeInvoice(request: Nip47MakeInvoiceRequest): Promise<Nip47Transaction>;
    lookupInvoice(request: Nip47LookupInvoiceRequest): Promise<Nip47Transaction>;
    listTransactions(
        request: Nip47ListTransactionsRequest
    ): Promise<Nip47ListTransactionsResponse>;

    subscribeNotifications(
        onNotification: (notification: Nip47Notification) => void,
        notificationTypes?: Nip47NotificationType[]
    ): Promise<() => void>;
}