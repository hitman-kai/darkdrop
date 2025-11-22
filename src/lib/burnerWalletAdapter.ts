"use client";

import {
  BaseMessageSignerWalletAdapter,
  SendTransactionOptions,
  WalletName,
  WalletNotConnectedError,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";

const ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiMwMDAiLz48cGF0aCBkPSJNMzIgOUw0NCAzMlY1MEwyNCA1MEwyMCA0MUgyNEwyOCA0OUMyOCA0OSAyNiAzNCAyOCAzNEMzMCAzNCAyOCAxOSAyOCAxOUgyMEwyNCAxMEgyOEwzMiAxOVY5WiIgZmlsbD0iIzAwZmY0MSIvPjwvc3ZnPg==";

export const BurnerWalletName = "Burner Import" as WalletName<"Burner Import">;

export class BurnerWalletAdapter extends BaseMessageSignerWalletAdapter {
  readonly name = BurnerWalletName;
  readonly url = "https://darkdrop";
  readonly icon = ICON;
  readonly supportedTransactionVersions = null;
  readonly readyState = WalletReadyState.Installed;

  private _publicKey: PublicKey | null;

  constructor(private readonly keypair: Keypair) {
    super();
    this._publicKey = keypair.publicKey;
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return false;
  }

  async connect(): Promise<void> {
    this._publicKey = this.keypair.publicKey;
    this.emit("connect", this.keypair.publicKey);
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this.emit("disconnect");
  }

  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    const signed = await this.signTransaction(transaction);
    return connection.sendRawTransaction(signed.serialize(), options);
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    return this.applySignature(transaction);
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    return transactions.map((tx) => {
      this.applySignature(tx);
      return tx;
    });
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._publicKey) {
      throw new WalletNotConnectedError();
    }
    return nacl.sign.detached(message, this.keypair.secretKey);
  }

  private applySignature<T extends Transaction | VersionedTransaction>(transaction: T): T {
    if ("version" in transaction) {
      (transaction as VersionedTransaction).sign([this.keypair]);
    } else {
      (transaction as Transaction).sign(this.keypair);
    }
    return transaction;
  }
}
