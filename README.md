# nwc-ts

Nostr Tools v2 based library for Nostr Wallet Connect.
Loosely based on [getAlby/js-sdk](https://github.com/getAlby/js-sdk) and aimed to be a drop-in replacement for it.

## Notable differences

- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) v2 based
- Implements interface to allow multiple implementations which can be switched easily

## Known issues

Not everything is implemented or working.

## Example

````TypeScript
import { NWCClient } from "./NWCClient.ts";
import { useWebSocketImplementation } from 'nostr-tools/relay' 
import WebSocket from 'ws'
useWebSocketImplementation(WebSocket)

const nwc = new NWCClient({
    nostrWalletConnectUrl:   "nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861418cf3ae760d9?relay=wss://relay.getalby.com/v1&secret=e839faf78693765b3833027fefa5a305c78f6965d0a5d2e47a3fcb25aa7cc45b"
})

const response = await nwc.listTransactions({});
````