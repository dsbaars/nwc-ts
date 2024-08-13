export class Nip47Error extends Error {
    /**
     * @deprecated please use message. Deprecated since v3.3.2. Will be removed in v4.0.0.
     */
    error: string;
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.error = message;
      this.code = code;
    }
  }
  
  /**
   * A NIP-47 response was received, but with an error code (see https://github.com/nostr-protocol/nips/blob/master/47.md#error-codes)
   */
  export class Nip47WalletError extends Nip47Error {}
  
  export class Nip47TimeoutError extends Nip47Error {}
  export class Nip47PublishTimeoutError extends Nip47TimeoutError {}
  export class Nip47ReplyTimeoutError extends Nip47TimeoutError {}
  export class Nip47PublishError extends Nip47Error {}
  export class Nip47ResponseDecodingError extends Nip47Error {}
  export class Nip47ResponseValidationError extends Nip47Error {}
  export class Nip47UnexpectedResponseError extends Nip47Error {}