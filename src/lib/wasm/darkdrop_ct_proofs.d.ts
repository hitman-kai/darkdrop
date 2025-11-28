/* tslint:disable */
/* eslint-disable */
/**
 * Generate zero-balance proof for account configuration
 */
export function generate_configure_account_proof(request_json: string): any;
/**
 * Generate proofs for confidential transfer (Equality + Validity + Range)
 */
export function generate_transfer_proof(request_json: string): any;
export function init_panic_hook(): void;
/**
 * Authenticated encryption nonce and ciphertext
 */
export class AeCiphertext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class AeKey {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  decrypt(ciphertext: AeCiphertext): bigint | undefined;
  /**
   * Encrypts an amount under the authenticated encryption key.
   */
  encrypt(amount: bigint): AeCiphertext;
  /**
   * Generates a random authenticated encryption key.
   *
   * This function is randomized. It internally samples a scalar element using `OsRng`.
   */
  static newRand(): AeKey;
}
/**
 * Batched grouped ciphertext validity proof with two handles.
 *
 * A batched grouped ciphertext validity proof certifies the validity of two instances of a
 * standard ciphertext validity proof. An instance of a standard validity proof consists of one
 * ciphertext and two decryption handles: `(commitment, first_handle, second_handle)`. An
 * instance of a batched ciphertext validity proof is a pair `(commitment_0,
 * first_handle_0, second_handle_0)` and `(commitment_1, first_handle_1,
 * second_handle_1)`. The proof certifies the analogous decryptable properties for each one of
 * these pairs of commitment and decryption handles.
 */
export class BatchedGroupedCiphertext2HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class BatchedGroupedCiphertext2HandlesValidityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): BatchedGroupedCiphertext2HandlesValidityProofContext;
  toBytes(): Uint8Array;
  first_pubkey: PodElGamalPubkey;
  second_pubkey: PodElGamalPubkey;
  grouped_ciphertext_lo: PodGroupedElGamalCiphertext2Handles;
  grouped_ciphertext_hi: PodGroupedElGamalCiphertext2Handles;
}
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyBatchedGroupedCiphertextValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class BatchedGroupedCiphertext2HandlesValidityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): BatchedGroupedCiphertext2HandlesValidityProofData;
  static new(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, grouped_ciphertext_lo: GroupedElGamalCiphertext2Handles, grouped_ciphertext_hi: GroupedElGamalCiphertext2Handles, amount_lo: bigint, amount_hi: bigint, opening_lo: PedersenOpening, opening_hi: PedersenOpening): BatchedGroupedCiphertext2HandlesValidityProofData;
  toBytes(): Uint8Array;
  context: BatchedGroupedCiphertext2HandlesValidityProofContext;
  proof: PodBatchedGroupedCiphertext2HandlesValidityProof;
}
/**
 * Batched grouped ciphertext validity proof with two handles.
 */
export class BatchedGroupedCiphertext3HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class BatchedGroupedCiphertext3HandlesValidityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): BatchedGroupedCiphertext3HandlesValidityProofContext;
  toBytes(): Uint8Array;
  first_pubkey: PodElGamalPubkey;
  second_pubkey: PodElGamalPubkey;
  third_pubkey: PodElGamalPubkey;
  grouped_ciphertext_lo: PodGroupedElGamalCiphertext3Handles;
  grouped_ciphertext_hi: PodGroupedElGamalCiphertext3Handles;
}
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyBatchedGroupedCiphertext3HandlesValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class BatchedGroupedCiphertext3HandlesValidityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): BatchedGroupedCiphertext3HandlesValidityProofData;
  static new(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, third_pubkey: ElGamalPubkey, grouped_ciphertext_lo: GroupedElGamalCiphertext3Handles, grouped_ciphertext_hi: GroupedElGamalCiphertext3Handles, amount_lo: bigint, amount_hi: bigint, opening_lo: PedersenOpening, opening_hi: PedersenOpening): BatchedGroupedCiphertext3HandlesValidityProofData;
  toBytes(): Uint8Array;
  context: BatchedGroupedCiphertext3HandlesValidityProofContext;
  proof: PodBatchedGroupedCiphertext3HandlesValidityProof;
}
/**
 * The ciphertext-ciphertext equality proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class CiphertextCiphertextEqualityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The context data needed to verify a ciphertext-ciphertext equality proof.
 */
export class CiphertextCiphertextEqualityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): CiphertextCiphertextEqualityProofContext;
  toBytes(): Uint8Array;
  first_pubkey: PodElGamalPubkey;
  second_pubkey: PodElGamalPubkey;
  first_ciphertext: PodElGamalCiphertext;
  second_ciphertext: PodElGamalCiphertext;
}
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyCiphertextCiphertextEquality` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class CiphertextCiphertextEqualityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): CiphertextCiphertextEqualityProofData;
  static new(first_keypair: ElGamalKeypair, second_pubkey: ElGamalPubkey, first_ciphertext: ElGamalCiphertext, second_ciphertext: ElGamalCiphertext, second_opening: PedersenOpening, amount: bigint): CiphertextCiphertextEqualityProofData;
  toBytes(): Uint8Array;
  context: CiphertextCiphertextEqualityProofContext;
  proof: PodCiphertextCiphertextEqualityProof;
}
/**
 * Equality proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class CiphertextCommitmentEqualityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The context data needed to verify a ciphertext-commitment equality proof.
 */
export class CiphertextCommitmentEqualityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): CiphertextCommitmentEqualityProofContext;
  toBytes(): Uint8Array;
  /**
   * The ElGamal pubkey
   */
  pubkey: PodElGamalPubkey;
  /**
   * The ciphertext encrypted under the ElGamal pubkey
   */
  ciphertext: PodElGamalCiphertext;
  /**
   * The Pedersen commitment
   */
  commitment: PodPedersenCommitment;
}
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyCiphertextCommitmentEquality` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class CiphertextCommitmentEqualityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): CiphertextCommitmentEqualityProofData;
  static new(keypair: ElGamalKeypair, ciphertext: ElGamalCiphertext, commitment: PedersenCommitment, opening: PedersenOpening, amount: bigint): CiphertextCommitmentEqualityProofData;
  toBytes(): Uint8Array;
  context: CiphertextCommitmentEqualityProofContext;
  proof: PodCiphertextCommitmentEqualityProof;
}
/**
 * Decryption handle for Pedersen commitment.
 */
export class DecryptHandle {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * Ciphertext for the ElGamal encryption scheme.
 */
export class ElGamalCiphertext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  commitment: PedersenCommitment;
  handle: DecryptHandle;
}
/**
 * A (twisted) ElGamal encryption keypair.
 *
 * The instances of the secret key are zeroized on drop.
 */
export class ElGamalKeypair {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  pubkeyOwned(): ElGamalPubkey;
  /**
   * Generates the public and secret keys for ElGamal encryption.
   *
   * This function is randomized. It internally samples a scalar element using `OsRng`.
   */
  static newRand(): ElGamalKeypair;
}
/**
 * Public key for the ElGamal encryption scheme.
 */
export class ElGamalPubkey {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  encryptU64(amount: bigint): ElGamalCiphertext;
  encryptWithU64(amount: bigint, opening: PedersenOpening): ElGamalCiphertext;
}
/**
 * The grouped ciphertext validity proof for 2 handles.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class GroupedCiphertext2HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class GroupedCiphertext2HandlesValidityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): GroupedCiphertext2HandlesValidityProofContext;
  toBytes(): Uint8Array;
  first_pubkey: PodElGamalPubkey;
  second_pubkey: PodElGamalPubkey;
  grouped_ciphertext: PodGroupedElGamalCiphertext2Handles;
}
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyGroupedCiphertextValidity`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class GroupedCiphertext2HandlesValidityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): GroupedCiphertext2HandlesValidityProofData;
  static new(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, grouped_ciphertext: GroupedElGamalCiphertext2Handles, amount: bigint, opening: PedersenOpening): GroupedCiphertext2HandlesValidityProofData;
  toBytes(): Uint8Array;
  context: GroupedCiphertext2HandlesValidityProofContext;
  proof: PodGroupedCiphertext2HandlesValidityProof;
}
/**
 * The grouped ciphertext validity proof for 3 handles.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class GroupedCiphertext3HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class GroupedCiphertext3HandlesValidityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): GroupedCiphertext3HandlesValidityProofContext;
  toBytes(): Uint8Array;
  first_pubkey: PodElGamalPubkey;
  second_pubkey: PodElGamalPubkey;
  third_pubkey: PodElGamalPubkey;
  grouped_ciphertext: PodGroupedElGamalCiphertext3Handles;
}
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyGroupedCiphertext3HandlesValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class GroupedCiphertext3HandlesValidityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): GroupedCiphertext3HandlesValidityProofData;
  static new(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, third_pubkey: ElGamalPubkey, grouped_ciphertext: GroupedElGamalCiphertext3Handles, amount: bigint, opening: PedersenOpening): GroupedCiphertext3HandlesValidityProofData;
  toBytes(): Uint8Array;
  context: GroupedCiphertext3HandlesValidityProofContext;
  proof: PodGroupedCiphertext3HandlesValidityProof;
}
export class GroupedElGamalCiphertext2Handles {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static encryptU64(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, amount: bigint): GroupedElGamalCiphertext2Handles;
  static encryptionWithU64(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, amount: bigint, opening: PedersenOpening): GroupedElGamalCiphertext2Handles;
}
export class GroupedElGamalCiphertext3Handles {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static encryptU64(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, third_pubkey: ElGamalPubkey, amount: bigint): GroupedElGamalCiphertext3Handles;
  static encryptionWithU64(first_pubkey: ElGamalPubkey, second_pubkey: ElGamalPubkey, third_pubkey: ElGamalPubkey, amount: bigint, opening: PedersenOpening): GroupedElGamalCiphertext3Handles;
}
/**
 * wasm-bindgen version of the Instruction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Instruction struct.
 */
export class Instruction {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class Instructions {
  free(): void;
  [Symbol.dispose](): void;
  constructor();
  push(instruction: Instruction): void;
}
/**
 * Algorithm handle for the Pedersen commitment scheme.
 */
export class Pedersen {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static withU64(amount: bigint, opening: PedersenOpening): PedersenCommitment;
}
/**
 * Pedersen commitment type.
 */
export class PedersenCommitment {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * Pedersen opening type.
 *
 * Instances of Pedersen openings are zeroized on drop.
 */
export class PedersenOpening {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static newRand(): PedersenOpening;
}
/**
 * Percentage-with-cap proof.
 *
 * The proof consists of two main components: `percentage_max_proof` and
 * `percentage_equality_proof`. If the committed amount is greater than the maximum cap value,
 * then the `percentage_max_proof` is properly generated and `percentage_equality_proof` is
 * simulated. If the encrypted amount is smaller than the maximum cap bound, the
 * `percentage_equality_proof` is properly generated and `percentage_max_proof` is simulated.
 */
export class PercentageWithCapProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The context data needed to verify a percentage-with-cap proof.
 *
 * We refer to [`ZK ElGamal proof`] for the formal details on how the percentage-with-cap proof is
 * computed.
 *
 * [`ZK ElGamal proof`]: https://docs.solanalabs.com/runtime/zk-token-proof
 */
export class PercentageWithCapProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): PercentageWithCapProofContext;
  toBytes(): Uint8Array;
  /**
   * The Pedersen commitment to the percentage amount.
   */
  percentage_commitment: PodPedersenCommitment;
  /**
   * The Pedersen commitment to the delta amount.
   */
  delta_commitment: PodPedersenCommitment;
  /**
   * The Pedersen commitment to the claimed amount.
   */
  claimed_commitment: PodPedersenCommitment;
  /**
   * The maximum cap bound.
   */
  max_value: PodU64;
}
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyPercentageWithCap`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class PercentageWithCapProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): PercentageWithCapProofData;
  static new(percentage_commitment: PedersenCommitment, percentage_opening: PedersenOpening, percentage_amount: bigint, delta_commitment: PedersenCommitment, delta_opening: PedersenOpening, delta_amount: bigint, claimed_commitment: PedersenCommitment, claimed_opening: PedersenOpening, max_value: bigint): PercentageWithCapProofData;
  toBytes(): Uint8Array;
  context: PercentageWithCapProofContext;
  proof: PodPercentageWithCapProof;
}
/**
 * The `AeCiphertext` type as a `Pod`.
 */
export class PodAeCiphertext {
  free(): void;
  [Symbol.dispose](): void;
  constructor(value: any);
  decode(): AeCiphertext;
  static encode(decoded: AeCiphertext): PodAeCiphertext;
  equals(other: PodAeCiphertext): boolean;
  static zeroed(): PodAeCiphertext;
  toBytes(): Uint8Array;
  toString(): string;
}
/**
 * The `BatchedGroupedCiphertext2HandlesValidityProof` type as a `Pod`.
 */
export class PodBatchedGroupedCiphertext2HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `BatchedGroupedCiphertext3HandlesValidityProof` type as a `Pod`.
 */
export class PodBatchedGroupedCiphertext3HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `CiphertextCiphertextEqualityProof` type as a `Pod`.
 */
export class PodCiphertextCiphertextEqualityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `CiphertextCommitmentEqualityProof` type as a `Pod`.
 */
export class PodCiphertextCommitmentEqualityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `ElGamalCiphertext` type as a `Pod`.
 */
export class PodElGamalCiphertext {
  free(): void;
  [Symbol.dispose](): void;
  constructor(value: any);
  decode(): ElGamalCiphertext;
  static encode(decoded: ElGamalCiphertext): PodElGamalCiphertext;
  equals(other: PodElGamalCiphertext): boolean;
  static zeroed(): PodElGamalCiphertext;
  toBytes(): Uint8Array;
  toString(): string;
}
/**
 * The `ElGamalPubkey` type as a `Pod`.
 */
export class PodElGamalPubkey {
  free(): void;
  [Symbol.dispose](): void;
  constructor(value: any);
  decode(): ElGamalPubkey;
  static encode(decoded: ElGamalPubkey): PodElGamalPubkey;
  equals(other: PodElGamalPubkey): boolean;
  static zeroed(): PodElGamalPubkey;
  toBytes(): Uint8Array;
  toString(): string;
}
/**
 * The `GroupedCiphertext2HandlesValidityProof` type as a `Pod`.
 */
export class PodGroupedCiphertext2HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `GroupedCiphertext3HandlesValidityProof` type as a `Pod`.
 */
export class PodGroupedCiphertext3HandlesValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `GroupedElGamalCiphertext` type with two decryption handles as a `Pod`
 */
export class PodGroupedElGamalCiphertext2Handles {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `GroupedElGamalCiphertext` type with three decryption handles as a `Pod`
 */
export class PodGroupedElGamalCiphertext3Handles {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `PedersenCommitment` type as a `Pod`.
 */
export class PodPedersenCommitment {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `PercentageWithCapProof` type as a `Pod`.
 */
export class PodPercentageWithCapProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `PubkeyValidityProof` type as a `Pod`.
 */
export class PodPubkeyValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
export class PodU64 {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The `ZeroCiphertextProof` type as a `Pod`.
 */
export class PodZeroCiphertextProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The address of a [Solana account][acc].
 *
 * Some account addresses are [ed25519] public keys, with corresponding secret
 * keys that are managed off-chain. Often, though, account addresses do not
 * have corresponding secret keys &mdash; as with [_program derived
 * addresses_][pdas] &mdash; or the secret key is not relevant to the operation
 * of a program, and may have even been disposed of. As running Solana programs
 * can not safely create or manage secret keys, the full [`Keypair`] is not
 * defined in `solana-program` but in `solana-sdk`.
 *
 * [acc]: https://solana.com/docs/core/accounts
 * [ed25519]: https://ed25519.cr.yp.to/
 * [pdas]: https://solana.com/docs/core/cpi#program-derived-addresses
 * [`Keypair`]: https://docs.rs/solana-sdk/latest/solana_sdk/signer/keypair/struct.Keypair.html
 */
export class Pubkey {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Create a new Pubkey object
   *
   * * `value` - optional public key as a base58 encoded string, `Uint8Array`, `[number]`
   */
  constructor(value: any);
  /**
   * Checks if two `Pubkey`s are equal
   */
  equals(other: Pubkey): boolean;
  /**
   * Return the `Uint8Array` representation of the public key
   */
  toBytes(): Uint8Array;
  /**
   * Return the base58 string representation of the public key
   */
  toString(): string;
}
/**
 * Public-key proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class PubkeyValidityProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The context data needed to verify a pubkey validity proof.
 */
export class PubkeyValidityProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): PubkeyValidityProofContext;
  toBytes(): Uint8Array;
  /**
   * The public key to be proved
   */
  pubkey: PodElGamalPubkey;
}
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyPubkeyValidity`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class PubkeyValidityProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): PubkeyValidityProofData;
  static new(keypair: ElGamalKeypair): PubkeyValidityProofData;
  toBytes(): Uint8Array;
  /**
   * The context data for the public key validity proof
   */
  context: PubkeyValidityProofContext;
  /**
   * Proof that the public key is well-formed
   */
  proof: PodPubkeyValidityProof;
}
/**
 * Zero-ciphertext proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class ZeroCiphertextProof {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
}
/**
 * The context data needed to verify a zero-ciphertext proof.
 */
export class ZeroCiphertextProofContext {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): ZeroCiphertextProofContext;
  toBytes(): Uint8Array;
  /**
   * The ElGamal pubkey associated with the ElGamal ciphertext
   */
  pubkey: PodElGamalPubkey;
  /**
   * The ElGamal ciphertext that encrypts zero
   */
  ciphertext: PodElGamalCiphertext;
}
/**
 * The instruction data that is needed for the `ProofInstruction::ZeroCiphertext` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class ZeroCiphertextProofData {
  private constructor();
  free(): void;
  [Symbol.dispose](): void;
  static fromBytes(bytes: Uint8Array): ZeroCiphertextProofData;
  static new(keypair: ElGamalKeypair, ciphertext: ElGamalCiphertext): ZeroCiphertextProofData;
  toBytes(): Uint8Array;
  /**
   * The context data for the zero-ciphertext proof
   */
  context: ZeroCiphertextProofContext;
  /**
   * Proof that the ciphertext is zero
   */
  proof: PodZeroCiphertextProof;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly generate_configure_account_proof: (a: number, b: number) => [number, number, number];
  readonly generate_transfer_proof: (a: number, b: number) => [number, number, number];
  readonly init_panic_hook: () => void;
  readonly __wbg_batchedgroupedciphertext3handlesvalidityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_batchedgroupedciphertext3handlesvalidityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_hi: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofdata_context: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext3handlesvalidityproofdata_proof: (a: number) => number;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofdata_context: (a: number) => number;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofdata_proof: (a: number) => number;
  readonly __wbg_get_pubkeyvalidityproofdata_context: (a: number) => number;
  readonly __wbg_get_pubkeyvalidityproofdata_proof: (a: number) => number;
  readonly __wbg_groupedciphertext3handlesvalidityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_groupedciphertext3handlesvalidityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_groupedelgamalciphertext2handles_free: (a: number, b: number) => void;
  readonly __wbg_groupedelgamalciphertext3handles_free: (a: number, b: number) => void;
  readonly __wbg_pubkeyvalidityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_pubkeyvalidityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_hi: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext3handlesvalidityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext3handlesvalidityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext3handlesvalidityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_pubkeyvalidityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_pubkeyvalidityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_zerociphertextproof_free: (a: number, b: number) => void;
  readonly batchedgroupedciphertext3handlesvalidityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly batchedgroupedciphertext3handlesvalidityproofcontext_toBytes: (a: number) => [number, number];
  readonly batchedgroupedciphertext3handlesvalidityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly batchedgroupedciphertext3handlesvalidityproofdata_new: (a: number, b: number, c: number, d: number, e: number, f: bigint, g: bigint, h: number, i: number) => [number, number, number];
  readonly batchedgroupedciphertext3handlesvalidityproofdata_toBytes: (a: number) => [number, number];
  readonly groupedciphertext3handlesvalidityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly groupedciphertext3handlesvalidityproofcontext_toBytes: (a: number) => [number, number];
  readonly groupedciphertext3handlesvalidityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly groupedciphertext3handlesvalidityproofdata_new: (a: number, b: number, c: number, d: number, e: bigint, f: number) => [number, number, number];
  readonly groupedciphertext3handlesvalidityproofdata_toBytes: (a: number) => [number, number];
  readonly groupedelgamalciphertext2handles_encryptU64: (a: number, b: number, c: bigint) => number;
  readonly groupedelgamalciphertext2handles_encryptionWithU64: (a: number, b: number, c: bigint, d: number) => number;
  readonly groupedelgamalciphertext3handles_encryptU64: (a: number, b: number, c: number, d: bigint) => number;
  readonly groupedelgamalciphertext3handles_encryptionWithU64: (a: number, b: number, c: number, d: bigint, e: number) => number;
  readonly pubkeyvalidityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly pubkeyvalidityproofcontext_toBytes: (a: number) => [number, number];
  readonly pubkeyvalidityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly pubkeyvalidityproofdata_new: (a: number) => [number, number, number];
  readonly pubkeyvalidityproofdata_toBytes: (a: number) => [number, number];
  readonly __wbg_set_groupedciphertext3handlesvalidityproofcontext_first_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext3handlesvalidityproofcontext_grouped_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext3handlesvalidityproofcontext_second_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext3handlesvalidityproofcontext_third_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_pubkeyvalidityproofcontext_pubkey: (a: number, b: number) => void;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofcontext_first_pubkey: (a: number) => number;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofcontext_grouped_ciphertext: (a: number) => number;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofcontext_second_pubkey: (a: number) => number;
  readonly __wbg_get_groupedciphertext3handlesvalidityproofcontext_third_pubkey: (a: number) => number;
  readonly __wbg_get_pubkeyvalidityproofcontext_pubkey: (a: number) => number;
  readonly __wbg_podbatchedgroupedciphertext2handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podbatchedgroupedciphertext3handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podciphertextciphertextequalityproof_free: (a: number, b: number) => void;
  readonly __wbg_podciphertextcommitmentequalityproof_free: (a: number, b: number) => void;
  readonly __wbg_podgroupedciphertext2handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podgroupedciphertext3handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podpedersencommitment_free: (a: number, b: number) => void;
  readonly __wbg_podpercentagewithcapproof_free: (a: number, b: number) => void;
  readonly __wbg_podpubkeyvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podzerociphertextproof_free: (a: number, b: number) => void;
  readonly __wbg_pubkeyvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_percentagewithcapproof_free: (a: number, b: number) => void;
  readonly __wbg_batchedgroupedciphertext2handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextciphertextequalityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextciphertextequalityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextcommitmentequalityproof_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextcommitmentequalityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextcommitmentequalityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_get_ciphertextciphertextequalityproofcontext_first_ciphertext: (a: number) => number;
  readonly __wbg_get_ciphertextciphertextequalityproofcontext_first_pubkey: (a: number) => number;
  readonly __wbg_get_ciphertextciphertextequalityproofcontext_second_ciphertext: (a: number) => number;
  readonly __wbg_get_ciphertextciphertextequalityproofcontext_second_pubkey: (a: number) => number;
  readonly __wbg_get_ciphertextciphertextequalityproofdata_context: (a: number) => number;
  readonly __wbg_get_ciphertextciphertextequalityproofdata_proof: (a: number) => number;
  readonly __wbg_get_ciphertextcommitmentequalityproofcontext_ciphertext: (a: number) => number;
  readonly __wbg_get_ciphertextcommitmentequalityproofcontext_commitment: (a: number) => number;
  readonly __wbg_get_ciphertextcommitmentequalityproofdata_context: (a: number) => number;
  readonly __wbg_get_ciphertextcommitmentequalityproofdata_proof: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofcontext_claimed_commitment: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofcontext_delta_commitment: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofcontext_max_value: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofcontext_percentage_commitment: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofdata_context: (a: number) => number;
  readonly __wbg_get_percentagewithcapproofdata_proof: (a: number) => number;
  readonly __wbg_percentagewithcapproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_percentagewithcapproofdata_free: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofcontext_first_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofcontext_first_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofcontext_second_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofcontext_second_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextciphertextequalityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextcommitmentequalityproofcontext_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextcommitmentequalityproofcontext_commitment: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextcommitmentequalityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_ciphertextcommitmentequalityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofcontext_claimed_commitment: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofcontext_delta_commitment: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofcontext_max_value: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofcontext_percentage_commitment: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_percentagewithcapproofdata_proof: (a: number, b: number) => void;
  readonly ciphertextciphertextequalityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly ciphertextciphertextequalityproofcontext_toBytes: (a: number) => [number, number];
  readonly ciphertextciphertextequalityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly ciphertextciphertextequalityproofdata_new: (a: number, b: number, c: number, d: number, e: number, f: bigint) => [number, number, number];
  readonly ciphertextciphertextequalityproofdata_toBytes: (a: number) => [number, number];
  readonly ciphertextcommitmentequalityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly ciphertextcommitmentequalityproofcontext_toBytes: (a: number) => [number, number];
  readonly ciphertextcommitmentequalityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly ciphertextcommitmentequalityproofdata_new: (a: number, b: number, c: number, d: number, e: bigint) => [number, number, number];
  readonly ciphertextcommitmentequalityproofdata_toBytes: (a: number) => [number, number];
  readonly percentagewithcapproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly percentagewithcapproofcontext_toBytes: (a: number) => [number, number];
  readonly percentagewithcapproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly percentagewithcapproofdata_new: (a: number, b: number, c: bigint, d: number, e: number, f: bigint, g: number, h: number, i: bigint) => [number, number, number];
  readonly percentagewithcapproofdata_toBytes: (a: number) => [number, number];
  readonly __wbg_set_ciphertextcommitmentequalityproofcontext_pubkey: (a: number, b: number) => void;
  readonly __wbg_get_ciphertextcommitmentequalityproofcontext_pubkey: (a: number) => number;
  readonly __wbg_groupedciphertext2handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_batchedgroupedciphertext2handlesvalidityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_batchedgroupedciphertext2handlesvalidityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_batchedgroupedciphertext3handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_ciphertextciphertextequalityproof_free: (a: number, b: number) => void;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_hi: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofdata_context: (a: number) => number;
  readonly __wbg_get_batchedgroupedciphertext2handlesvalidityproofdata_proof: (a: number) => number;
  readonly __wbg_get_groupedciphertext2handlesvalidityproofdata_context: (a: number) => number;
  readonly __wbg_get_groupedciphertext2handlesvalidityproofdata_proof: (a: number) => number;
  readonly __wbg_get_zerociphertextproofcontext_ciphertext: (a: number) => number;
  readonly __wbg_get_zerociphertextproofdata_context: (a: number) => number;
  readonly __wbg_get_zerociphertextproofdata_proof: (a: number) => number;
  readonly __wbg_groupedciphertext2handlesvalidityproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_groupedciphertext2handlesvalidityproofdata_free: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_hi: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_batchedgroupedciphertext2handlesvalidityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext2handlesvalidityproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext2handlesvalidityproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_set_zerociphertextproofcontext_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_zerociphertextproofdata_context: (a: number, b: number) => void;
  readonly __wbg_set_zerociphertextproofdata_proof: (a: number, b: number) => void;
  readonly __wbg_zerociphertextproofcontext_free: (a: number, b: number) => void;
  readonly __wbg_zerociphertextproofdata_free: (a: number, b: number) => void;
  readonly batchedgroupedciphertext2handlesvalidityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly batchedgroupedciphertext2handlesvalidityproofcontext_toBytes: (a: number) => [number, number];
  readonly batchedgroupedciphertext2handlesvalidityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly batchedgroupedciphertext2handlesvalidityproofdata_new: (a: number, b: number, c: number, d: number, e: bigint, f: bigint, g: number, h: number) => [number, number, number];
  readonly batchedgroupedciphertext2handlesvalidityproofdata_toBytes: (a: number) => [number, number];
  readonly groupedciphertext2handlesvalidityproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly groupedciphertext2handlesvalidityproofcontext_toBytes: (a: number) => [number, number];
  readonly groupedciphertext2handlesvalidityproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly groupedciphertext2handlesvalidityproofdata_new: (a: number, b: number, c: number, d: bigint, e: number) => [number, number, number];
  readonly groupedciphertext2handlesvalidityproofdata_toBytes: (a: number) => [number, number];
  readonly zerociphertextproofcontext_fromBytes: (a: number, b: number) => [number, number, number];
  readonly zerociphertextproofcontext_toBytes: (a: number) => [number, number];
  readonly zerociphertextproofdata_fromBytes: (a: number, b: number) => [number, number, number];
  readonly zerociphertextproofdata_new: (a: number, b: number) => [number, number, number];
  readonly zerociphertextproofdata_toBytes: (a: number) => [number, number];
  readonly __wbg_set_groupedciphertext2handlesvalidityproofcontext_first_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext2handlesvalidityproofcontext_grouped_ciphertext: (a: number, b: number) => void;
  readonly __wbg_set_groupedciphertext2handlesvalidityproofcontext_second_pubkey: (a: number, b: number) => void;
  readonly __wbg_set_zerociphertextproofcontext_pubkey: (a: number, b: number) => void;
  readonly __wbg_get_groupedciphertext2handlesvalidityproofcontext_first_pubkey: (a: number) => number;
  readonly __wbg_get_groupedciphertext2handlesvalidityproofcontext_grouped_ciphertext: (a: number) => number;
  readonly __wbg_get_groupedciphertext2handlesvalidityproofcontext_second_pubkey: (a: number) => number;
  readonly __wbg_get_zerociphertextproofcontext_pubkey: (a: number) => number;
  readonly __wbg_aeciphertext_free: (a: number, b: number) => void;
  readonly __wbg_aekey_free: (a: number, b: number) => void;
  readonly __wbg_decrypthandle_free: (a: number, b: number) => void;
  readonly __wbg_elgamalciphertext_free: (a: number, b: number) => void;
  readonly __wbg_elgamalkeypair_free: (a: number, b: number) => void;
  readonly __wbg_elgamalpubkey_free: (a: number, b: number) => void;
  readonly __wbg_get_elgamalciphertext_commitment: (a: number) => number;
  readonly __wbg_get_elgamalciphertext_handle: (a: number) => number;
  readonly __wbg_pedersen_free: (a: number, b: number) => void;
  readonly __wbg_pedersencommitment_free: (a: number, b: number) => void;
  readonly __wbg_pedersenopening_free: (a: number, b: number) => void;
  readonly __wbg_podgroupedelgamalciphertext2handles_free: (a: number, b: number) => void;
  readonly __wbg_podgroupedelgamalciphertext3handles_free: (a: number, b: number) => void;
  readonly __wbg_set_elgamalciphertext_commitment: (a: number, b: number) => void;
  readonly __wbg_set_elgamalciphertext_handle: (a: number, b: number) => void;
  readonly aekey_decrypt: (a: number, b: number) => [number, bigint];
  readonly aekey_encrypt: (a: number, b: bigint) => number;
  readonly aekey_newRand: () => number;
  readonly elgamalkeypair_newRand: () => number;
  readonly elgamalkeypair_pubkeyOwned: (a: number) => number;
  readonly elgamalpubkey_encryptU64: (a: number, b: bigint) => number;
  readonly elgamalpubkey_encryptWithU64: (a: number, b: bigint, c: number) => number;
  readonly pedersen_withU64: (a: bigint, b: number) => number;
  readonly pedersenopening_newRand: () => number;
  readonly __wbg_groupedciphertext3handlesvalidityproof_free: (a: number, b: number) => void;
  readonly __wbg_podaeciphertext_free: (a: number, b: number) => void;
  readonly __wbg_podelgamalciphertext_free: (a: number, b: number) => void;
  readonly __wbg_podelgamalpubkey_free: (a: number, b: number) => void;
  readonly __wbg_podu64_free: (a: number, b: number) => void;
  readonly podaeciphertext_constructor: (a: any) => [number, number, number];
  readonly podaeciphertext_decode: (a: number) => [number, number, number];
  readonly podaeciphertext_encode: (a: number) => number;
  readonly podaeciphertext_equals: (a: number, b: number) => number;
  readonly podaeciphertext_toBytes: (a: number) => [number, number];
  readonly podaeciphertext_toString: (a: number) => [number, number];
  readonly podaeciphertext_zeroed: () => number;
  readonly podelgamalciphertext_constructor: (a: any) => [number, number, number];
  readonly podelgamalciphertext_decode: (a: number) => [number, number, number];
  readonly podelgamalciphertext_encode: (a: number) => number;
  readonly podelgamalciphertext_equals: (a: number, b: number) => number;
  readonly podelgamalciphertext_toBytes: (a: number) => [number, number];
  readonly podelgamalciphertext_toString: (a: number) => [number, number];
  readonly podelgamalpubkey_constructor: (a: any) => [number, number, number];
  readonly podelgamalpubkey_decode: (a: number) => [number, number, number];
  readonly podelgamalpubkey_encode: (a: number) => number;
  readonly podelgamalpubkey_equals: (a: number, b: number) => number;
  readonly podelgamalpubkey_toBytes: (a: number) => [number, number];
  readonly podelgamalpubkey_toString: (a: number) => [number, number];
  readonly podelgamalpubkey_zeroed: () => number;
  readonly podelgamalciphertext_zeroed: () => number;
  readonly __wbg_instruction_free: (a: number, b: number) => void;
  readonly __wbg_instructions_free: (a: number, b: number) => void;
  readonly instructions_constructor: () => number;
  readonly instructions_push: (a: number, b: number) => void;
  readonly __wbg_pubkey_free: (a: number, b: number) => void;
  readonly pubkey_constructor: (a: any) => [number, number, number];
  readonly pubkey_equals: (a: number, b: number) => number;
  readonly pubkey_toBytes: (a: number) => [number, number];
  readonly pubkey_toString: (a: number) => [number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
