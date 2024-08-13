type WithDTag = {
    dTag: string;
};

type WithOptionalId = {
    id?: string;
};

export type Nip47SingleMethod =
    | "get_info"
    | "get_balance"
    | "make_invoice"
    | "pay_invoice"
    | "pay_keysend"
    | "lookup_invoice"
    | "list_transactions"
    | "sign_message";

export type Nip47MultiMethod = "multi_pay_invoice" | "multi_pay_keysend";

export type Nip47Method = Nip47SingleMethod | Nip47MultiMethod;
export type Nip47Capability = Nip47Method | "notifications";

export type Nip47GetInfoResponse = {
    alias: string;
    color: string;
    pubkey: string;
    network: string;
    block_height: number;
    block_hash: string;
    methods: Nip47Method[];
    notifications: Nip47NotificationType[];
};

export type Nip47GetBalanceResponse = {
    balance: number; // msats
};

export type Nip47PayResponse = {
    preimage: string;
};

export type Nip47MultiPayInvoiceRequest = {
    invoices: (Nip47PayInvoiceRequest & WithOptionalId)[];
};

export type Nip47MultiPayKeysendRequest = {
    keysends: (Nip47PayKeysendRequest & WithOptionalId)[];
};

export type Nip47MultiPayInvoiceResponse = {
    invoices: ({ invoice: Nip47PayInvoiceRequest } & Nip47PayResponse &
        WithDTag)[];
    errors: []; // TODO: add error handling
};
export type Nip47MultiPayKeysendResponse = {
    keysends: ({ keysend: Nip47PayKeysendRequest } & Nip47PayResponse &
        WithDTag)[];
    errors: []; // TODO: add error handling
};

export interface Nip47ListTransactionsRequest {
    from?: number;
    until?: number;
    limit?: number;
    offset?: number;
    unpaid?: boolean;
    type?: "incoming" | "outgoing";
}

export type Nip47ListTransactionsResponse = {
    transactions: Nip47Transaction[];
};

export type Nip47Transaction = {
    type: string;
    invoice: string;
    description: string;
    description_hash: string;
    preimage: string;
    payment_hash: string;
    amount: number;
    fees_paid: number;
    settled_at: number;
    created_at: number;
    expires_at: number;
    metadata?: Record<string, unknown>;
};

export type Nip47NotificationType = Nip47Notification["notification_type"];

export type Nip47Notification =
    | {
        notification_type: "payment_received";
        notification: Nip47Transaction;
    }
    | {
        notification_type: "payment_sent";
        notification: Nip47Transaction;
    };

export type Nip47PayInvoiceRequest = {
    invoice: string;
    amount?: number; // msats
};

export type Nip47PayKeysendRequest = {
    amount: number; //msat
    pubkey: string;
    preimage?: string;
    tlv_records?: { type: number; value: string }[];
};

export type Nip47MakeInvoiceRequest = {
    amount: number; //msat
    description?: string;
    description_hash?: string;
    expiry?: number; // in seconds
};

export type Nip47LookupInvoiceRequest = {
    payment_hash?: string;
    invoice?: string;
};

export type Nip47SignMessageRequest = {
    message: string;
};

export type Nip47SignMessageResponse = {
    message: string;
    signature: string;
};