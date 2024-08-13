import { Relay } from "nostr-tools/relay";
import { NWCClientInterface } from "./interface/NWCClientInterface.ts";
import { Event, finalizeEvent, getEventHash, getPublicKey, nip04, nip19, UnsignedEvent, VerifiedEvent } from "nostr-tools";
import { Nip47Capability, Nip47NotificationType, Nip47GetInfoResponse, Nip47GetBalanceResponse, Nip47PayInvoiceRequest, Nip47PayResponse, Nip47PayKeysendRequest, Nip47SignMessageRequest, Nip47SignMessageResponse, Nip47MultiPayInvoiceRequest, Nip47MultiPayInvoiceResponse, Nip47MultiPayKeysendRequest, Nip47MultiPayKeysendResponse, Nip47MakeInvoiceRequest, Nip47Transaction, Nip47LookupInvoiceRequest, Nip47ListTransactionsRequest, Nip47ListTransactionsResponse, Nip47Notification, Nip47SingleMethod, Nip47Method, Nip47MultiMethod } from "./types/nip47.ts";
import { NWCClientOptions, NWCOptions, NWCs } from "./types/nwc.ts";
import { Nip47PublishError, Nip47PublishTimeoutError, Nip47ReplyTimeoutError, Nip47ResponseDecodingError, Nip47ResponseValidationError, Nip47UnexpectedResponseError, Nip47WalletError } from "./types/error.ts";
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export class NWCClient implements NWCClientInterface {
    relay: Relay;
    relayUrl: string;
    secret: string | undefined;
    walletPubkey: string;
    options: NWCOptions;

    static parseWalletConnectUrl(walletConnectUrl: string): NWCOptions {
        // makes it possible to parse with URL in the different environments (browser/node/...)
        // parses both new and legacy protocols, with or without "//"
        walletConnectUrl = walletConnectUrl
            .replace("nostrwalletconnect://", "http://")
            .replace("nostr+walletconnect://", "http://")
            .replace("nostrwalletconnect:", "http://")
            .replace("nostr+walletconnect:", "http://");
        const url = new URL(walletConnectUrl);
        const relayUrl = url.searchParams.get("relay");
        if (!relayUrl) {
            throw new Error("No relay URL found in connection string");
        }

        const options: NWCOptions = {
            walletPubkey: url.host,
            relayUrl,
        };
        const secret = url.searchParams.get("secret");
        if (secret) {
            options.secret = secret;
        }
        return options;
    }


    constructor(options?: NWCClientOptions) {
        if (options && options.nostrWalletConnectUrl) {
            options = {
                ...NWCClient.parseWalletConnectUrl(options.nostrWalletConnectUrl),
                ...options,
            };
        }
        const providerOptions = NWCs[options?.providerName || "alby"] as NWCOptions;
        this.options = {
            ...providerOptions,
            ...(options || {}),
        } as NWCOptions;

        this.relayUrl = this.options.relayUrl;
        this.relay = new Relay(this.relayUrl);
        if (this.options.secret) {
            this.secret = (
                this.options.secret.toLowerCase().startsWith("nsec")
                    ? nip19.decode(this.options.secret).data
                    : this.options.secret
            ) as string;
        }
        this.walletPubkey = (
            this.options.walletPubkey.toLowerCase().startsWith("npub")
                ? nip19.decode(this.options.walletPubkey).data
                : this.options.walletPubkey
        ) as string;
    }

    get connected() {
        return this.relay.connected;
    }

    get publicKey() {
        if (!this.secret) {
            throw new Error("Missing secret key");
        }
        return getPublicKey(hexToBytes(this.secret));
    }

    getNostrWalletConnectUrl(includeSecret = true) {
        let url = `nostr+walletconnect://${this.walletPubkey}?relay=${this.relayUrl}&pubkey=${this.publicKey}`;
        if (includeSecret) {
            url = `${url}&secret=${this.secret}`;
        }
        return url;
    }

    get nostrWalletConnectUrl() {
        return this.getNostrWalletConnectUrl();
    }

    getPublicKey(): Promise<string> {
        return Promise.resolve(this.publicKey);
    }

    signEvent(event: UnsignedEvent): Promise<VerifiedEvent> {
        if (!this.secret) {
            throw new Error("Missing secret key");
        }

        return Promise.resolve(finalizeEvent(event, this.secret));
    }
    getEventHash(event: UnsignedEvent): string {
        return getEventHash(event);
    }
    close(): void {
        return this.relay.close();
    }

    async encrypt(pubkey: string, content: string): Promise<string> {
        if (!this.secret) {
            throw new Error("Missing secret");
        }
        const encrypted = await nip04.encrypt(this.secret, pubkey, content);
        return encrypted;
    }

    async decrypt(pubkey: string, content: string): Promise<string> {
        if (!this.secret) {
            throw new Error("Missing secret");
        }
        const decrypted = await nip04.decrypt(this.secret, pubkey, content);
        return decrypted;
    }
    getAuthorizationUrl(options?: any): URL {
        throw new Error("Method not implemented.");
    }
    initNWC(options?: any): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async getWalletServiceInfo(): Promise<{ capabilities: Nip47Capability[]; notifications: Nip47NotificationType[]; }> {
        await this._checkConnected();
        return new Promise(async (resolve, reject) => {
            const eventSub = await this.relay.subscribe(
                [
                    {
                        kinds: [13194],
                        limit: 1,
                        authors: [this.walletPubkey],
                    },
                ],
                {
                    eoseTimeout: 10000,
                    onevent: (evt) => {
                        const content = evt.content;
                        const notificationsTag = evt.tags.find(
                            (t) => t[0] === "notifications");
                        resolve({
                            // delimiter is " " per spec, but Alby NWC originally returned ","
                            capabilities: content.split(/[ |,]/g) as Nip47Method[],
                            notifications: (notificationsTag?.[1]?.split(" ") ||
                                []) as Nip47NotificationType[],
                        })
                    },
                    oneose: () => {
                        console.log('oneose called')
                    }

                },
            );
        });
    }
    async getInfo(): Promise<Nip47GetInfoResponse> {
        try {
            const result = await this.executeNip47Request<Nip47GetInfoResponse>(
                "get_info",
                {},
                (result) => !!result.methods,
            );
            return result;
        } catch (error) {
            console.error("Failed to request get_info", error);
            throw error;
        }
    }
    async getBalance(): Promise<Nip47GetBalanceResponse> {
        try {
            const result = await this.executeNip47Request<Nip47GetBalanceResponse>(
                "get_balance",
                {},
                (result) => result.balance !== undefined,
            );
            return result;
        } catch (error) {
            console.error("Failed to request get_balance", error);
            throw error;
        }
    }

    async payInvoice(request: Nip47PayInvoiceRequest): Promise<Nip47PayResponse> {
        try {
            const result = await this.executeNip47Request<Nip47PayResponse>(
                "pay_invoice",
                request,
                (result) => !!result.preimage,
            );
            return result;
        } catch (error) {
            console.error("Failed to request pay_invoice", error);
            throw error;
        }
    }

    async payKeysend(request: Nip47PayKeysendRequest): Promise<Nip47PayResponse> {
        try {
            const result = await this.executeNip47Request<Nip47PayResponse>(
                "pay_keysend",
                request,
                (result) => !!result.preimage,
            );

            return result;
        } catch (error) {
            console.error("Failed to request pay_keysend", error);
            throw error;
        }
    }
    async signMessage(request: Nip47SignMessageRequest): Promise<Nip47SignMessageResponse> {
        try {
            const result = await this.executeNip47Request<Nip47SignMessageResponse>(
                "sign_message",
                request,
                (result) => result.message === request.message && !!result.signature,
            );

            return result;
        } catch (error) {
            console.error("Failed to request sign_message", error);
            throw error;
        }
    }
    async multiPayInvoice(request: Nip47MultiPayInvoiceRequest): Promise<Nip47MultiPayInvoiceResponse> {
        try {
            const results = await this.executeMultiNip47Request<
                { invoice: Nip47PayInvoiceRequest } & Nip47PayResponse
            >(
                "multi_pay_invoice",
                request,
                request.invoices.length,
                (result) => !!result.preimage,
            );

            return {
                invoices: results,
                // TODO: error handling
                errors: [],
            };
        } catch (error) {
            console.error("Failed to request multi_pay_invoice", error);
            throw error;
        }
    }

    async multiPayKeysend(request: Nip47MultiPayKeysendRequest): Promise<Nip47MultiPayKeysendResponse> {
        try {
            const results = await this.executeMultiNip47Request<
                { keysend: Nip47PayKeysendRequest } & Nip47PayResponse
            >(
                "multi_pay_keysend",
                request,
                request.keysends.length,
                (result) => !!result.preimage,
            );

            return {
                keysends: results,
                // TODO: error handling
                errors: [],
            };
        } catch (error) {
            console.error("Failed to request multi_pay_keysend", error);
            throw error;
        }
    }

    async makeInvoice(request: Nip47MakeInvoiceRequest): Promise<Nip47Transaction> {
        try {
            if (!request.amount) {
                throw new Error("No amount specified");
            }

            const result = await this.executeNip47Request<Nip47Transaction>(
                "make_invoice",
                request,
                (result) => !!result.invoice,
            );

            return result;
        } catch (error) {
            console.error("Failed to request make_invoice", error);
            throw error;
        }
    }

    async lookupInvoice(request: Nip47LookupInvoiceRequest): Promise<Nip47Transaction> {
        try {
            const result = await this.executeNip47Request<Nip47Transaction>(
                "lookup_invoice",
                request,
                (result) => !!result.invoice,
            );

            return result;
        } catch (error) {
            console.error("Failed to request lookup_invoice", error);
            throw error;
        }
    }
    async listTransactions(request: Nip47ListTransactionsRequest): Promise<Nip47ListTransactionsResponse> {
        try {
            // maybe we can tailor the response to our needs
            const result =
                await this.executeNip47Request<Nip47ListTransactionsResponse>(
                    "list_transactions",
                    request,
                    (response) => !!response.transactions,
                );

            return result;
        } catch (error) {
            console.error("Failed to request list_transactions", error);
            throw error;
        }
    }
    subscribeNotifications(onNotification: (notification: Nip47Notification) => void, notificationTypes?: Nip47NotificationType[]): Promise<() => void> {
        throw new Error("Method not implemented.");
    }

    private async executeNip47Request<T>(
        nip47Method: Nip47SingleMethod,
        params: unknown,
        resultValidator: (result: T) => boolean,
    ): Promise<T> {
        await this._checkConnected();
        return new Promise<T>((resolve, reject) => {
            (async () => {
                const command = {
                    method: nip47Method,
                    params,
                };
                const encryptedCommand = await this.encrypt(
                    this.walletPubkey,
                    JSON.stringify(command),
                );

                const unsignedEvent: UnsignedEvent = {
                    kind: 23194,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [["p", this.walletPubkey]],
                    content: encryptedCommand,
                    pubkey: this.publicKey,
                };

                const event = await this.signEvent(unsignedEvent);

                function replyTimeout() {
                    sub.close();
                    //console.error(`Reply timeout: event ${event.id} `);
                    reject(
                        new Nip47ReplyTimeoutError(
                            `reply timeout: event ${event.id}`,
                            "INTERNAL",
                        ),
                    );
                }

                const replyTimeoutCheck = setTimeout(replyTimeout, 60000);

                // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
                // that reference the request event (NIP_47_REQUEST_KIND)
                const sub = this.relay.subscribe([
                    {
                        kinds: [23195],
                        authors: [this.walletPubkey],
                        "#e": [event.id],
                    },
                ], {
                    onevent: async (evt) => {
                        sub.close();
                        const decryptedContent = await this.decrypt(
                            this.walletPubkey,
                            evt.content,
                        );
                        let response;
                        try {
                            response = JSON.parse(decryptedContent);
                        } catch (e) {
                            clearTimeout(replyTimeoutCheck);
                            sub.close();
                            reject(
                                new Nip47ResponseDecodingError(
                                    "failed to deserialize response",
                                    "INTERNAL",
                                ),
                            );
                            return;
                        }
                        if (response.result) {
                            // console.info("NIP-47 result", response.result);
                            if (resultValidator(response.result)) {
                                resolve(response.result);
                            } else {
                                clearTimeout(replyTimeoutCheck);
                                sub.close();
                                reject(
                                    new Nip47ResponseValidationError(
                                        "response from NWC failed validation: " +
                                        JSON.stringify(response.result),
                                        "INTERNAL",
                                    ),
                                );
                            }
                        } else {
                            clearTimeout(replyTimeoutCheck);
                            sub.close();
                            // console.error("Wallet error", response.error);
                            reject(
                                new Nip47WalletError(
                                    response.error?.message || "unknown Error",
                                    response.error?.code || "INTERNAL",
                                ),
                            );
                        }

                    },
                });

                function publishTimeout() {
                    sub.close();
                    //console.error(`Publish timeout: event ${event.id}`);
                    reject(
                        new Nip47PublishTimeoutError(
                            `publish timeout: ${event.id}`,
                            "INTERNAL",
                        ),
                    );
                }

                const publishTimeoutCheck = setTimeout(publishTimeout, 5000);

                try {
                    await this.relay.publish(event);
                } catch (error) {
                    reject(
                        new Nip47PublishError(`failed to publish: ${error}`, "INTERNAL"),
                    );
                }
            })()

        });
    }

    // TODO: this method currently fails if any payment fails.
    // this could be improved in the future.
    // TODO: reduce duplication between executeNip47Request and executeMultiNip47Request
    private async executeMultiNip47Request<T>(
        nip47Method: Nip47MultiMethod,
        params: unknown,
        numPayments: number,
        resultValidator: (result: T) => boolean,
    ): Promise<(T & { dTag: string })[]> {
        await this._checkConnected();
        const results: (T & { dTag: string })[] = [];
        return new Promise<(T & { dTag: string })[]>((resolve, reject) => {
            (async () => {
                const command = {
                    method: nip47Method,
                    params,
                };
                const encryptedCommand = await this.encrypt(
                    this.walletPubkey,
                    JSON.stringify(command),
                );
                const unsignedEvent: UnsignedEvent = {
                    kind: 23194,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [["p", this.walletPubkey]],
                    content: encryptedCommand,
                    pubkey: this.publicKey,
                };

                const event = await this.signEvent(unsignedEvent);
                // subscribe to NIP_47_SUCCESS_RESPONSE_KIND and NIP_47_ERROR_RESPONSE_KIND
                // that reference the request event (NIP_47_REQUEST_KIND)
                const sub = this.relay.subscribe([
                    {
                        kinds: [23195],
                        authors: [this.walletPubkey],
                        "#e": [event.id],
                    },
                ], {
                    onevent: async (event) => {
                        // console.log(`Received reply event: `, event);

                        const decryptedContent = await this.decrypt(
                            this.walletPubkey,
                            event.content,
                        );
                        // console.log(`Decrypted content: `, decryptedContent);
                        let response;
                        try {
                            response = JSON.parse(decryptedContent);
                        } catch (e) {
                            // console.error(e);
                            clearTimeout(replyTimeoutCheck);
                            sub.close();
                            reject(
                                new Nip47ResponseDecodingError(
                                    "failed to deserialize response",
                                    "INTERNAL",
                                ),
                            );
                        }
                        if (response.result) {
                            // console.info("NIP-47 result", response.result);
                            if (!resultValidator(response.result)) {
                                clearTimeout(replyTimeoutCheck);
                                sub.close();
                                reject(
                                    new Nip47ResponseValidationError(
                                        "Response from NWC failed validation: " +
                                        JSON.stringify(response.result),
                                        "INTERNAL",
                                    ),
                                );
                                return;
                            }
                            const dTag = event.tags.find((tag) => tag[0] === "d")?.[1];
                            if (dTag === undefined) {
                                clearTimeout(replyTimeoutCheck);
                                sub.close();
                                reject(
                                    new Nip47ResponseValidationError(
                                        "No d tag found in response event",
                                        "INTERNAL",
                                    ),
                                );
                                return;
                            }
                            results.push({
                                ...response.result,
                                dTag,
                            });
                            if (results.length === numPayments) {
                                clearTimeout(replyTimeoutCheck);
                                sub.close();
                                //console.log("Received results", results);
                                resolve(results);
                            }
                        } else {
                            clearTimeout(replyTimeoutCheck);
                            sub.close();
                            reject(
                                new Nip47UnexpectedResponseError(
                                    response.error?.message,
                                    response.error?.code,
                                ),
                            );
                        }
                    }

                });

                function replyTimeout() {
                    sub.close();
                    //console.error(`Reply timeout: event ${event.id} `);
                    reject(
                        new Nip47ReplyTimeoutError(
                            `reply timeout: event ${event.id}`,
                            "INTERNAL",
                        ),
                    );
                }

                const replyTimeoutCheck = setTimeout(replyTimeout, 60000);

                function publishTimeout() {
                    sub.close();
                    //console.error(`Publish timeout: event ${event.id}`);
                    reject(
                        new Nip47PublishTimeoutError(
                            `Publish timeout: ${event.id}`,
                            "INTERNAL",
                        ),
                    );
                }
                const publishTimeoutCheck = setTimeout(publishTimeout, 5000);

                try {
                    await this.relay.publish(event);
                    clearTimeout(publishTimeoutCheck);
                    //console.debug(`Event ${event.id} for ${invoice} published`);
                } catch (error) {
                    //console.error(`Failed to publish to ${this.relay.url}`, error);
                    clearTimeout(publishTimeoutCheck);
                    reject(
                        new Nip47PublishError(`Failed to publish: ${error}`, "INTERNAL"),
                    );
                }
            })();
        });
    }

    private async _checkConnected() {
        if (!this.secret) {
            throw new Error("Missing secret key");
        }
        await this.relay.connect();
    }
}
