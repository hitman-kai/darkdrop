let wasm;

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
/**
 * Generate zero-balance proof for account configuration
 * @param {string} request_json
 * @returns {any}
 */
export function generate_configure_account_proof(request_json) {
    const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_configure_account_proof(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Generate proofs for confidential transfer (Equality + Validity + Range)
 * @param {string} request_json
 * @returns {any}
 */
export function generate_transfer_proof(request_json) {
    const ptr0 = passStringToWasm0(request_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.generate_transfer_proof(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

export function init_panic_hook() {
    wasm.init_panic_hook();
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

const AeCiphertextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_aeciphertext_free(ptr >>> 0, 1));
/**
 * Authenticated encryption nonce and ciphertext
 */
export class AeCiphertext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AeCiphertext.prototype);
        obj.__wbg_ptr = ptr;
        AeCiphertextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AeCiphertextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_aeciphertext_free(ptr, 0);
    }
}
if (Symbol.dispose) AeCiphertext.prototype[Symbol.dispose] = AeCiphertext.prototype.free;

const AeKeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_aekey_free(ptr >>> 0, 1));

export class AeKey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(AeKey.prototype);
        obj.__wbg_ptr = ptr;
        AeKeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        AeKeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_aekey_free(ptr, 0);
    }
    /**
     * @param {AeCiphertext} ciphertext
     * @returns {bigint | undefined}
     */
    decrypt(ciphertext) {
        _assertClass(ciphertext, AeCiphertext);
        const ret = wasm.aekey_decrypt(this.__wbg_ptr, ciphertext.__wbg_ptr);
        return ret[0] === 0 ? undefined : BigInt.asUintN(64, ret[1]);
    }
    /**
     * Encrypts an amount under the authenticated encryption key.
     * @param {bigint} amount
     * @returns {AeCiphertext}
     */
    encrypt(amount) {
        const ret = wasm.aekey_encrypt(this.__wbg_ptr, amount);
        return AeCiphertext.__wrap(ret);
    }
    /**
     * Generates a random authenticated encryption key.
     *
     * This function is randomized. It internally samples a scalar element using `OsRng`.
     * @returns {AeKey}
     */
    static newRand() {
        const ret = wasm.aekey_newRand();
        return AeKey.__wrap(ret);
    }
}
if (Symbol.dispose) AeKey.prototype[Symbol.dispose] = AeKey.prototype.free;

const BatchedGroupedCiphertext2HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext2handlesvalidityproof_free(ptr >>> 0, 1));
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

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext2HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext2handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext2HandlesValidityProof.prototype[Symbol.dispose] = BatchedGroupedCiphertext2HandlesValidityProof.prototype.free;

const BatchedGroupedCiphertext2HandlesValidityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext2handlesvalidityproofcontext_free(ptr >>> 0, 1));

export class BatchedGroupedCiphertext2HandlesValidityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchedGroupedCiphertext2HandlesValidityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        BatchedGroupedCiphertext2HandlesValidityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext2HandlesValidityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext2handlesvalidityproofcontext_free(ptr, 0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get first_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set first_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get second_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set second_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext2Handles}
     */
    get grouped_ciphertext_lo() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext2Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext2Handles} arg0
     */
    set grouped_ciphertext_lo(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext2Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext2Handles}
     */
    get grouped_ciphertext_hi() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_hi(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext2Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext2Handles} arg0
     */
    set grouped_ciphertext_hi(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext2Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_hi(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {BatchedGroupedCiphertext2HandlesValidityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.batchedgroupedciphertext2handlesvalidityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext2HandlesValidityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.batchedgroupedciphertext2handlesvalidityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext2HandlesValidityProofContext.prototype[Symbol.dispose] = BatchedGroupedCiphertext2HandlesValidityProofContext.prototype.free;

const BatchedGroupedCiphertext2HandlesValidityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext2handlesvalidityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyBatchedGroupedCiphertextValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class BatchedGroupedCiphertext2HandlesValidityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchedGroupedCiphertext2HandlesValidityProofData.prototype);
        obj.__wbg_ptr = ptr;
        BatchedGroupedCiphertext2HandlesValidityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext2HandlesValidityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext2handlesvalidityproofdata_free(ptr, 0);
    }
    /**
     * @returns {BatchedGroupedCiphertext2HandlesValidityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofdata_context(this.__wbg_ptr);
        return BatchedGroupedCiphertext2HandlesValidityProofContext.__wrap(ret);
    }
    /**
     * @param {BatchedGroupedCiphertext2HandlesValidityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, BatchedGroupedCiphertext2HandlesValidityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodBatchedGroupedCiphertext2HandlesValidityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofdata_proof(this.__wbg_ptr);
        return PodBatchedGroupedCiphertext2HandlesValidityProof.__wrap(ret);
    }
    /**
     * @param {PodBatchedGroupedCiphertext2HandlesValidityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodBatchedGroupedCiphertext2HandlesValidityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {BatchedGroupedCiphertext2HandlesValidityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.batchedgroupedciphertext2handlesvalidityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext2HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {GroupedElGamalCiphertext2Handles} grouped_ciphertext_lo
     * @param {GroupedElGamalCiphertext2Handles} grouped_ciphertext_hi
     * @param {bigint} amount_lo
     * @param {bigint} amount_hi
     * @param {PedersenOpening} opening_lo
     * @param {PedersenOpening} opening_hi
     * @returns {BatchedGroupedCiphertext2HandlesValidityProofData}
     */
    static new(first_pubkey, second_pubkey, grouped_ciphertext_lo, grouped_ciphertext_hi, amount_lo, amount_hi, opening_lo, opening_hi) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(grouped_ciphertext_lo, GroupedElGamalCiphertext2Handles);
        _assertClass(grouped_ciphertext_hi, GroupedElGamalCiphertext2Handles);
        _assertClass(opening_lo, PedersenOpening);
        _assertClass(opening_hi, PedersenOpening);
        const ret = wasm.batchedgroupedciphertext2handlesvalidityproofdata_new(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, grouped_ciphertext_lo.__wbg_ptr, grouped_ciphertext_hi.__wbg_ptr, amount_lo, amount_hi, opening_lo.__wbg_ptr, opening_hi.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext2HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.batchedgroupedciphertext2handlesvalidityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext2HandlesValidityProofData.prototype[Symbol.dispose] = BatchedGroupedCiphertext2HandlesValidityProofData.prototype.free;

const BatchedGroupedCiphertext3HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext3handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * Batched grouped ciphertext validity proof with two handles.
 */
export class BatchedGroupedCiphertext3HandlesValidityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext3HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext3handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext3HandlesValidityProof.prototype[Symbol.dispose] = BatchedGroupedCiphertext3HandlesValidityProof.prototype.free;

const BatchedGroupedCiphertext3HandlesValidityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext3handlesvalidityproofcontext_free(ptr >>> 0, 1));

export class BatchedGroupedCiphertext3HandlesValidityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchedGroupedCiphertext3HandlesValidityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        BatchedGroupedCiphertext3HandlesValidityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext3HandlesValidityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext3handlesvalidityproofcontext_free(ptr, 0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get first_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set first_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get second_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set second_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get third_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set third_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext3Handles}
     */
    get grouped_ciphertext_lo() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext3Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext3Handles} arg0
     */
    set grouped_ciphertext_lo(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext3Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext3Handles}
     */
    get grouped_ciphertext_hi() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_hi(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext3Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext3Handles} arg0
     */
    set grouped_ciphertext_hi(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext3Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_hi(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {BatchedGroupedCiphertext3HandlesValidityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.batchedgroupedciphertext3handlesvalidityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext3HandlesValidityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.batchedgroupedciphertext3handlesvalidityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext3HandlesValidityProofContext.prototype[Symbol.dispose] = BatchedGroupedCiphertext3HandlesValidityProofContext.prototype.free;

const BatchedGroupedCiphertext3HandlesValidityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchedgroupedciphertext3handlesvalidityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyBatchedGroupedCiphertext3HandlesValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class BatchedGroupedCiphertext3HandlesValidityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchedGroupedCiphertext3HandlesValidityProofData.prototype);
        obj.__wbg_ptr = ptr;
        BatchedGroupedCiphertext3HandlesValidityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchedGroupedCiphertext3HandlesValidityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchedgroupedciphertext3handlesvalidityproofdata_free(ptr, 0);
    }
    /**
     * @returns {BatchedGroupedCiphertext3HandlesValidityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofdata_context(this.__wbg_ptr);
        return BatchedGroupedCiphertext3HandlesValidityProofContext.__wrap(ret);
    }
    /**
     * @param {BatchedGroupedCiphertext3HandlesValidityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, BatchedGroupedCiphertext3HandlesValidityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodBatchedGroupedCiphertext3HandlesValidityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofdata_proof(this.__wbg_ptr);
        return PodBatchedGroupedCiphertext3HandlesValidityProof.__wrap(ret);
    }
    /**
     * @param {PodBatchedGroupedCiphertext3HandlesValidityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodBatchedGroupedCiphertext3HandlesValidityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {BatchedGroupedCiphertext3HandlesValidityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.batchedgroupedciphertext3handlesvalidityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext3HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {ElGamalPubkey} third_pubkey
     * @param {GroupedElGamalCiphertext3Handles} grouped_ciphertext_lo
     * @param {GroupedElGamalCiphertext3Handles} grouped_ciphertext_hi
     * @param {bigint} amount_lo
     * @param {bigint} amount_hi
     * @param {PedersenOpening} opening_lo
     * @param {PedersenOpening} opening_hi
     * @returns {BatchedGroupedCiphertext3HandlesValidityProofData}
     */
    static new(first_pubkey, second_pubkey, third_pubkey, grouped_ciphertext_lo, grouped_ciphertext_hi, amount_lo, amount_hi, opening_lo, opening_hi) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(third_pubkey, ElGamalPubkey);
        _assertClass(grouped_ciphertext_lo, GroupedElGamalCiphertext3Handles);
        _assertClass(grouped_ciphertext_hi, GroupedElGamalCiphertext3Handles);
        _assertClass(opening_lo, PedersenOpening);
        _assertClass(opening_hi, PedersenOpening);
        const ret = wasm.batchedgroupedciphertext3handlesvalidityproofdata_new(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, third_pubkey.__wbg_ptr, grouped_ciphertext_lo.__wbg_ptr, grouped_ciphertext_hi.__wbg_ptr, amount_lo, amount_hi, opening_lo.__wbg_ptr, opening_hi.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BatchedGroupedCiphertext3HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.batchedgroupedciphertext3handlesvalidityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) BatchedGroupedCiphertext3HandlesValidityProofData.prototype[Symbol.dispose] = BatchedGroupedCiphertext3HandlesValidityProofData.prototype.free;

const CiphertextCiphertextEqualityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextciphertextequalityproof_free(ptr >>> 0, 1));
/**
 * The ciphertext-ciphertext equality proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class CiphertextCiphertextEqualityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCiphertextEqualityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextciphertextequalityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) CiphertextCiphertextEqualityProof.prototype[Symbol.dispose] = CiphertextCiphertextEqualityProof.prototype.free;

const CiphertextCiphertextEqualityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextciphertextequalityproofcontext_free(ptr >>> 0, 1));
/**
 * The context data needed to verify a ciphertext-ciphertext equality proof.
 */
export class CiphertextCiphertextEqualityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CiphertextCiphertextEqualityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        CiphertextCiphertextEqualityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCiphertextEqualityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextciphertextequalityproofcontext_free(ptr, 0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get first_pubkey() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set first_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get second_pubkey() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofcontext_second_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set second_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofcontext_second_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalCiphertext}
     */
    get first_ciphertext() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofcontext_first_ciphertext(this.__wbg_ptr);
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * @param {PodElGamalCiphertext} arg0
     */
    set first_ciphertext(arg0) {
        _assertClass(arg0, PodElGamalCiphertext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofcontext_first_ciphertext(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalCiphertext}
     */
    get second_ciphertext() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofcontext_second_ciphertext(this.__wbg_ptr);
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * @param {PodElGamalCiphertext} arg0
     */
    set second_ciphertext(arg0) {
        _assertClass(arg0, PodElGamalCiphertext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofcontext_second_ciphertext(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {CiphertextCiphertextEqualityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ciphertextciphertextequalityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCiphertextEqualityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.ciphertextciphertextequalityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) CiphertextCiphertextEqualityProofContext.prototype[Symbol.dispose] = CiphertextCiphertextEqualityProofContext.prototype.free;

const CiphertextCiphertextEqualityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextciphertextequalityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyCiphertextCiphertextEquality` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class CiphertextCiphertextEqualityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CiphertextCiphertextEqualityProofData.prototype);
        obj.__wbg_ptr = ptr;
        CiphertextCiphertextEqualityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCiphertextEqualityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextciphertextequalityproofdata_free(ptr, 0);
    }
    /**
     * @returns {CiphertextCiphertextEqualityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofdata_context(this.__wbg_ptr);
        return CiphertextCiphertextEqualityProofContext.__wrap(ret);
    }
    /**
     * @param {CiphertextCiphertextEqualityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, CiphertextCiphertextEqualityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodCiphertextCiphertextEqualityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofdata_proof(this.__wbg_ptr);
        return PodCiphertextCiphertextEqualityProof.__wrap(ret);
    }
    /**
     * @param {PodCiphertextCiphertextEqualityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodCiphertextCiphertextEqualityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {CiphertextCiphertextEqualityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ciphertextciphertextequalityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCiphertextEqualityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalKeypair} first_keypair
     * @param {ElGamalPubkey} second_pubkey
     * @param {ElGamalCiphertext} first_ciphertext
     * @param {ElGamalCiphertext} second_ciphertext
     * @param {PedersenOpening} second_opening
     * @param {bigint} amount
     * @returns {CiphertextCiphertextEqualityProofData}
     */
    static new(first_keypair, second_pubkey, first_ciphertext, second_ciphertext, second_opening, amount) {
        _assertClass(first_keypair, ElGamalKeypair);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(first_ciphertext, ElGamalCiphertext);
        _assertClass(second_ciphertext, ElGamalCiphertext);
        _assertClass(second_opening, PedersenOpening);
        const ret = wasm.ciphertextciphertextequalityproofdata_new(first_keypair.__wbg_ptr, second_pubkey.__wbg_ptr, first_ciphertext.__wbg_ptr, second_ciphertext.__wbg_ptr, second_opening.__wbg_ptr, amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCiphertextEqualityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.ciphertextciphertextequalityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) CiphertextCiphertextEqualityProofData.prototype[Symbol.dispose] = CiphertextCiphertextEqualityProofData.prototype.free;

const CiphertextCommitmentEqualityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextcommitmentequalityproof_free(ptr >>> 0, 1));
/**
 * Equality proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class CiphertextCommitmentEqualityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCommitmentEqualityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextcommitmentequalityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) CiphertextCommitmentEqualityProof.prototype[Symbol.dispose] = CiphertextCommitmentEqualityProof.prototype.free;

const CiphertextCommitmentEqualityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextcommitmentequalityproofcontext_free(ptr >>> 0, 1));
/**
 * The context data needed to verify a ciphertext-commitment equality proof.
 */
export class CiphertextCommitmentEqualityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CiphertextCommitmentEqualityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        CiphertextCommitmentEqualityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCommitmentEqualityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextcommitmentequalityproofcontext_free(ptr, 0);
    }
    /**
     * The ElGamal pubkey
     * @returns {PodElGamalPubkey}
     */
    get pubkey() {
        const ret = wasm.__wbg_get_ciphertextciphertextequalityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * The ElGamal pubkey
     * @param {PodElGamalPubkey} arg0
     */
    set pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextciphertextequalityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * The ciphertext encrypted under the ElGamal pubkey
     * @returns {PodElGamalCiphertext}
     */
    get ciphertext() {
        const ret = wasm.__wbg_get_ciphertextcommitmentequalityproofcontext_ciphertext(this.__wbg_ptr);
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * The ciphertext encrypted under the ElGamal pubkey
     * @param {PodElGamalCiphertext} arg0
     */
    set ciphertext(arg0) {
        _assertClass(arg0, PodElGamalCiphertext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextcommitmentequalityproofcontext_ciphertext(this.__wbg_ptr, ptr0);
    }
    /**
     * The Pedersen commitment
     * @returns {PodPedersenCommitment}
     */
    get commitment() {
        const ret = wasm.__wbg_get_ciphertextcommitmentequalityproofcontext_commitment(this.__wbg_ptr);
        return PodPedersenCommitment.__wrap(ret);
    }
    /**
     * The Pedersen commitment
     * @param {PodPedersenCommitment} arg0
     */
    set commitment(arg0) {
        _assertClass(arg0, PodPedersenCommitment);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextcommitmentequalityproofcontext_commitment(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {CiphertextCommitmentEqualityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ciphertextcommitmentequalityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCommitmentEqualityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.ciphertextcommitmentequalityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) CiphertextCommitmentEqualityProofContext.prototype[Symbol.dispose] = CiphertextCommitmentEqualityProofContext.prototype.free;

const CiphertextCommitmentEqualityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ciphertextcommitmentequalityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyCiphertextCommitmentEquality` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class CiphertextCommitmentEqualityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(CiphertextCommitmentEqualityProofData.prototype);
        obj.__wbg_ptr = ptr;
        CiphertextCommitmentEqualityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CiphertextCommitmentEqualityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ciphertextcommitmentequalityproofdata_free(ptr, 0);
    }
    /**
     * @returns {CiphertextCommitmentEqualityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_ciphertextcommitmentequalityproofdata_context(this.__wbg_ptr);
        return CiphertextCommitmentEqualityProofContext.__wrap(ret);
    }
    /**
     * @param {CiphertextCommitmentEqualityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, CiphertextCommitmentEqualityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextcommitmentequalityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodCiphertextCommitmentEqualityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_ciphertextcommitmentequalityproofdata_proof(this.__wbg_ptr);
        return PodCiphertextCommitmentEqualityProof.__wrap(ret);
    }
    /**
     * @param {PodCiphertextCommitmentEqualityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodCiphertextCommitmentEqualityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_ciphertextcommitmentequalityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {CiphertextCommitmentEqualityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ciphertextcommitmentequalityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCommitmentEqualityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalKeypair} keypair
     * @param {ElGamalCiphertext} ciphertext
     * @param {PedersenCommitment} commitment
     * @param {PedersenOpening} opening
     * @param {bigint} amount
     * @returns {CiphertextCommitmentEqualityProofData}
     */
    static new(keypair, ciphertext, commitment, opening, amount) {
        _assertClass(keypair, ElGamalKeypair);
        _assertClass(ciphertext, ElGamalCiphertext);
        _assertClass(commitment, PedersenCommitment);
        _assertClass(opening, PedersenOpening);
        const ret = wasm.ciphertextcommitmentequalityproofdata_new(keypair.__wbg_ptr, ciphertext.__wbg_ptr, commitment.__wbg_ptr, opening.__wbg_ptr, amount);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return CiphertextCommitmentEqualityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.ciphertextcommitmentequalityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) CiphertextCommitmentEqualityProofData.prototype[Symbol.dispose] = CiphertextCommitmentEqualityProofData.prototype.free;

const DecryptHandleFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_decrypthandle_free(ptr >>> 0, 1));
/**
 * Decryption handle for Pedersen commitment.
 */
export class DecryptHandle {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DecryptHandle.prototype);
        obj.__wbg_ptr = ptr;
        DecryptHandleFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DecryptHandleFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_decrypthandle_free(ptr, 0);
    }
}
if (Symbol.dispose) DecryptHandle.prototype[Symbol.dispose] = DecryptHandle.prototype.free;

const ElGamalCiphertextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_elgamalciphertext_free(ptr >>> 0, 1));
/**
 * Ciphertext for the ElGamal encryption scheme.
 */
export class ElGamalCiphertext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ElGamalCiphertext.prototype);
        obj.__wbg_ptr = ptr;
        ElGamalCiphertextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ElGamalCiphertextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_elgamalciphertext_free(ptr, 0);
    }
    /**
     * @returns {PedersenCommitment}
     */
    get commitment() {
        const ret = wasm.__wbg_get_elgamalciphertext_commitment(this.__wbg_ptr);
        return PedersenCommitment.__wrap(ret);
    }
    /**
     * @param {PedersenCommitment} arg0
     */
    set commitment(arg0) {
        _assertClass(arg0, PedersenCommitment);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_elgamalciphertext_commitment(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {DecryptHandle}
     */
    get handle() {
        const ret = wasm.__wbg_get_elgamalciphertext_handle(this.__wbg_ptr);
        return DecryptHandle.__wrap(ret);
    }
    /**
     * @param {DecryptHandle} arg0
     */
    set handle(arg0) {
        _assertClass(arg0, DecryptHandle);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_elgamalciphertext_handle(this.__wbg_ptr, ptr0);
    }
}
if (Symbol.dispose) ElGamalCiphertext.prototype[Symbol.dispose] = ElGamalCiphertext.prototype.free;

const ElGamalKeypairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_elgamalkeypair_free(ptr >>> 0, 1));
/**
 * A (twisted) ElGamal encryption keypair.
 *
 * The instances of the secret key are zeroized on drop.
 */
export class ElGamalKeypair {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ElGamalKeypair.prototype);
        obj.__wbg_ptr = ptr;
        ElGamalKeypairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ElGamalKeypairFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_elgamalkeypair_free(ptr, 0);
    }
    /**
     * @returns {ElGamalPubkey}
     */
    pubkeyOwned() {
        const ret = wasm.elgamalkeypair_pubkeyOwned(this.__wbg_ptr);
        return ElGamalPubkey.__wrap(ret);
    }
    /**
     * Generates the public and secret keys for ElGamal encryption.
     *
     * This function is randomized. It internally samples a scalar element using `OsRng`.
     * @returns {ElGamalKeypair}
     */
    static newRand() {
        const ret = wasm.elgamalkeypair_newRand();
        return ElGamalKeypair.__wrap(ret);
    }
}
if (Symbol.dispose) ElGamalKeypair.prototype[Symbol.dispose] = ElGamalKeypair.prototype.free;

const ElGamalPubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_elgamalpubkey_free(ptr >>> 0, 1));
/**
 * Public key for the ElGamal encryption scheme.
 */
export class ElGamalPubkey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ElGamalPubkey.prototype);
        obj.__wbg_ptr = ptr;
        ElGamalPubkeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ElGamalPubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_elgamalpubkey_free(ptr, 0);
    }
    /**
     * @param {bigint} amount
     * @returns {ElGamalCiphertext}
     */
    encryptU64(amount) {
        const ret = wasm.elgamalpubkey_encryptU64(this.__wbg_ptr, amount);
        return ElGamalCiphertext.__wrap(ret);
    }
    /**
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {ElGamalCiphertext}
     */
    encryptWithU64(amount, opening) {
        _assertClass(opening, PedersenOpening);
        const ret = wasm.elgamalpubkey_encryptWithU64(this.__wbg_ptr, amount, opening.__wbg_ptr);
        return ElGamalCiphertext.__wrap(ret);
    }
}
if (Symbol.dispose) ElGamalPubkey.prototype[Symbol.dispose] = ElGamalPubkey.prototype.free;

const GroupedCiphertext2HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext2handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The grouped ciphertext validity proof for 2 handles.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class GroupedCiphertext2HandlesValidityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext2HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext2handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) GroupedCiphertext2HandlesValidityProof.prototype[Symbol.dispose] = GroupedCiphertext2HandlesValidityProof.prototype.free;

const GroupedCiphertext2HandlesValidityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext2handlesvalidityproofcontext_free(ptr >>> 0, 1));

export class GroupedCiphertext2HandlesValidityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedCiphertext2HandlesValidityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        GroupedCiphertext2HandlesValidityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext2HandlesValidityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext2handlesvalidityproofcontext_free(ptr, 0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get first_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set first_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get second_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set second_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext2Handles}
     */
    get grouped_ciphertext() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext2Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext2Handles} arg0
     */
    set grouped_ciphertext(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext2Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {GroupedCiphertext2HandlesValidityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.groupedciphertext2handlesvalidityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext2HandlesValidityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.groupedciphertext2handlesvalidityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) GroupedCiphertext2HandlesValidityProofContext.prototype[Symbol.dispose] = GroupedCiphertext2HandlesValidityProofContext.prototype.free;

const GroupedCiphertext2HandlesValidityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext2handlesvalidityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyGroupedCiphertextValidity`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class GroupedCiphertext2HandlesValidityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedCiphertext2HandlesValidityProofData.prototype);
        obj.__wbg_ptr = ptr;
        GroupedCiphertext2HandlesValidityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext2HandlesValidityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext2handlesvalidityproofdata_free(ptr, 0);
    }
    /**
     * @returns {GroupedCiphertext2HandlesValidityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_groupedciphertext2handlesvalidityproofdata_context(this.__wbg_ptr);
        return GroupedCiphertext2HandlesValidityProofContext.__wrap(ret);
    }
    /**
     * @param {GroupedCiphertext2HandlesValidityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, GroupedCiphertext2HandlesValidityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_groupedciphertext2handlesvalidityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedCiphertext2HandlesValidityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_groupedciphertext2handlesvalidityproofdata_proof(this.__wbg_ptr);
        return PodGroupedCiphertext2HandlesValidityProof.__wrap(ret);
    }
    /**
     * @param {PodGroupedCiphertext2HandlesValidityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodGroupedCiphertext2HandlesValidityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_groupedciphertext2handlesvalidityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {GroupedCiphertext2HandlesValidityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.groupedciphertext2handlesvalidityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext2HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {GroupedElGamalCiphertext2Handles} grouped_ciphertext
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {GroupedCiphertext2HandlesValidityProofData}
     */
    static new(first_pubkey, second_pubkey, grouped_ciphertext, amount, opening) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(grouped_ciphertext, GroupedElGamalCiphertext2Handles);
        _assertClass(opening, PedersenOpening);
        const ret = wasm.groupedciphertext2handlesvalidityproofdata_new(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, grouped_ciphertext.__wbg_ptr, amount, opening.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext2HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.groupedciphertext2handlesvalidityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) GroupedCiphertext2HandlesValidityProofData.prototype[Symbol.dispose] = GroupedCiphertext2HandlesValidityProofData.prototype.free;

const GroupedCiphertext3HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext3handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The grouped ciphertext validity proof for 3 handles.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class GroupedCiphertext3HandlesValidityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext3HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext3handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) GroupedCiphertext3HandlesValidityProof.prototype[Symbol.dispose] = GroupedCiphertext3HandlesValidityProof.prototype.free;

const GroupedCiphertext3HandlesValidityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext3handlesvalidityproofcontext_free(ptr >>> 0, 1));

export class GroupedCiphertext3HandlesValidityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedCiphertext3HandlesValidityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        GroupedCiphertext3HandlesValidityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext3HandlesValidityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext3handlesvalidityproofcontext_free(ptr, 0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get first_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set first_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get second_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set second_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_second_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    get third_pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} arg0
     */
    set third_pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_third_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedElGamalCiphertext3Handles}
     */
    get grouped_ciphertext() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr);
        return PodGroupedElGamalCiphertext3Handles.__wrap(ret);
    }
    /**
     * @param {PodGroupedElGamalCiphertext3Handles} arg0
     */
    set grouped_ciphertext(arg0) {
        _assertClass(arg0, PodGroupedElGamalCiphertext3Handles);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_grouped_ciphertext_lo(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {GroupedCiphertext3HandlesValidityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.groupedciphertext3handlesvalidityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext3HandlesValidityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.groupedciphertext3handlesvalidityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) GroupedCiphertext3HandlesValidityProofContext.prototype[Symbol.dispose] = GroupedCiphertext3HandlesValidityProofContext.prototype.free;

const GroupedCiphertext3HandlesValidityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedciphertext3handlesvalidityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the
 * `ProofInstruction::VerifyGroupedCiphertext3HandlesValidity` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class GroupedCiphertext3HandlesValidityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedCiphertext3HandlesValidityProofData.prototype);
        obj.__wbg_ptr = ptr;
        GroupedCiphertext3HandlesValidityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedCiphertext3HandlesValidityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedciphertext3handlesvalidityproofdata_free(ptr, 0);
    }
    /**
     * @returns {GroupedCiphertext3HandlesValidityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_groupedciphertext3handlesvalidityproofdata_context(this.__wbg_ptr);
        return GroupedCiphertext3HandlesValidityProofContext.__wrap(ret);
    }
    /**
     * @param {GroupedCiphertext3HandlesValidityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, GroupedCiphertext3HandlesValidityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_groupedciphertext3handlesvalidityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodGroupedCiphertext3HandlesValidityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_groupedciphertext3handlesvalidityproofdata_proof(this.__wbg_ptr);
        return PodGroupedCiphertext3HandlesValidityProof.__wrap(ret);
    }
    /**
     * @param {PodGroupedCiphertext3HandlesValidityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodGroupedCiphertext3HandlesValidityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_groupedciphertext3handlesvalidityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {GroupedCiphertext3HandlesValidityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.groupedciphertext3handlesvalidityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext3HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {ElGamalPubkey} third_pubkey
     * @param {GroupedElGamalCiphertext3Handles} grouped_ciphertext
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {GroupedCiphertext3HandlesValidityProofData}
     */
    static new(first_pubkey, second_pubkey, third_pubkey, grouped_ciphertext, amount, opening) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(third_pubkey, ElGamalPubkey);
        _assertClass(grouped_ciphertext, GroupedElGamalCiphertext3Handles);
        _assertClass(opening, PedersenOpening);
        const ret = wasm.groupedciphertext3handlesvalidityproofdata_new(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, third_pubkey.__wbg_ptr, grouped_ciphertext.__wbg_ptr, amount, opening.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return GroupedCiphertext3HandlesValidityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.groupedciphertext3handlesvalidityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) GroupedCiphertext3HandlesValidityProofData.prototype[Symbol.dispose] = GroupedCiphertext3HandlesValidityProofData.prototype.free;

const GroupedElGamalCiphertext2HandlesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedelgamalciphertext2handles_free(ptr >>> 0, 1));

export class GroupedElGamalCiphertext2Handles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedElGamalCiphertext2Handles.prototype);
        obj.__wbg_ptr = ptr;
        GroupedElGamalCiphertext2HandlesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedElGamalCiphertext2HandlesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedelgamalciphertext2handles_free(ptr, 0);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {bigint} amount
     * @returns {GroupedElGamalCiphertext2Handles}
     */
    static encryptU64(first_pubkey, second_pubkey, amount) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        const ret = wasm.groupedelgamalciphertext2handles_encryptU64(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, amount);
        return GroupedElGamalCiphertext2Handles.__wrap(ret);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {GroupedElGamalCiphertext2Handles}
     */
    static encryptionWithU64(first_pubkey, second_pubkey, amount, opening) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(opening, PedersenOpening);
        const ret = wasm.groupedelgamalciphertext2handles_encryptionWithU64(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, amount, opening.__wbg_ptr);
        return GroupedElGamalCiphertext2Handles.__wrap(ret);
    }
}
if (Symbol.dispose) GroupedElGamalCiphertext2Handles.prototype[Symbol.dispose] = GroupedElGamalCiphertext2Handles.prototype.free;

const GroupedElGamalCiphertext3HandlesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_groupedelgamalciphertext3handles_free(ptr >>> 0, 1));

export class GroupedElGamalCiphertext3Handles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(GroupedElGamalCiphertext3Handles.prototype);
        obj.__wbg_ptr = ptr;
        GroupedElGamalCiphertext3HandlesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GroupedElGamalCiphertext3HandlesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_groupedelgamalciphertext3handles_free(ptr, 0);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {ElGamalPubkey} third_pubkey
     * @param {bigint} amount
     * @returns {GroupedElGamalCiphertext3Handles}
     */
    static encryptU64(first_pubkey, second_pubkey, third_pubkey, amount) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(third_pubkey, ElGamalPubkey);
        const ret = wasm.groupedelgamalciphertext3handles_encryptU64(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, third_pubkey.__wbg_ptr, amount);
        return GroupedElGamalCiphertext3Handles.__wrap(ret);
    }
    /**
     * @param {ElGamalPubkey} first_pubkey
     * @param {ElGamalPubkey} second_pubkey
     * @param {ElGamalPubkey} third_pubkey
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {GroupedElGamalCiphertext3Handles}
     */
    static encryptionWithU64(first_pubkey, second_pubkey, third_pubkey, amount, opening) {
        _assertClass(first_pubkey, ElGamalPubkey);
        _assertClass(second_pubkey, ElGamalPubkey);
        _assertClass(third_pubkey, ElGamalPubkey);
        _assertClass(opening, PedersenOpening);
        const ret = wasm.groupedelgamalciphertext3handles_encryptionWithU64(first_pubkey.__wbg_ptr, second_pubkey.__wbg_ptr, third_pubkey.__wbg_ptr, amount, opening.__wbg_ptr);
        return GroupedElGamalCiphertext3Handles.__wrap(ret);
    }
}
if (Symbol.dispose) GroupedElGamalCiphertext3Handles.prototype[Symbol.dispose] = GroupedElGamalCiphertext3Handles.prototype.free;

const InstructionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_instruction_free(ptr >>> 0, 1));
/**
 * wasm-bindgen version of the Instruction struct.
 * This duplication is required until https://github.com/rustwasm/wasm-bindgen/issues/3671
 * is fixed. This must not diverge from the regular non-wasm Instruction struct.
 */
export class Instruction {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InstructionFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_instruction_free(ptr, 0);
    }
}
if (Symbol.dispose) Instruction.prototype[Symbol.dispose] = Instruction.prototype.free;

const InstructionsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_instructions_free(ptr >>> 0, 1));

export class Instructions {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        InstructionsFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_instructions_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.instructions_constructor();
        this.__wbg_ptr = ret >>> 0;
        InstructionsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {Instruction} instruction
     */
    push(instruction) {
        _assertClass(instruction, Instruction);
        var ptr0 = instruction.__destroy_into_raw();
        wasm.instructions_push(this.__wbg_ptr, ptr0);
    }
}
if (Symbol.dispose) Instructions.prototype[Symbol.dispose] = Instructions.prototype.free;

const PedersenFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pedersen_free(ptr >>> 0, 1));
/**
 * Algorithm handle for the Pedersen commitment scheme.
 */
export class Pedersen {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PedersenFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pedersen_free(ptr, 0);
    }
    /**
     * @param {bigint} amount
     * @param {PedersenOpening} opening
     * @returns {PedersenCommitment}
     */
    static withU64(amount, opening) {
        _assertClass(opening, PedersenOpening);
        const ret = wasm.pedersen_withU64(amount, opening.__wbg_ptr);
        return PedersenCommitment.__wrap(ret);
    }
}
if (Symbol.dispose) Pedersen.prototype[Symbol.dispose] = Pedersen.prototype.free;

const PedersenCommitmentFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pedersencommitment_free(ptr >>> 0, 1));
/**
 * Pedersen commitment type.
 */
export class PedersenCommitment {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PedersenCommitment.prototype);
        obj.__wbg_ptr = ptr;
        PedersenCommitmentFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PedersenCommitmentFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pedersencommitment_free(ptr, 0);
    }
}
if (Symbol.dispose) PedersenCommitment.prototype[Symbol.dispose] = PedersenCommitment.prototype.free;

const PedersenOpeningFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pedersenopening_free(ptr >>> 0, 1));
/**
 * Pedersen opening type.
 *
 * Instances of Pedersen openings are zeroized on drop.
 */
export class PedersenOpening {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PedersenOpening.prototype);
        obj.__wbg_ptr = ptr;
        PedersenOpeningFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PedersenOpeningFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pedersenopening_free(ptr, 0);
    }
    /**
     * @returns {PedersenOpening}
     */
    static newRand() {
        const ret = wasm.pedersenopening_newRand();
        return PedersenOpening.__wrap(ret);
    }
}
if (Symbol.dispose) PedersenOpening.prototype[Symbol.dispose] = PedersenOpening.prototype.free;

const PercentageWithCapProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_percentagewithcapproof_free(ptr >>> 0, 1));
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

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PercentageWithCapProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_percentagewithcapproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PercentageWithCapProof.prototype[Symbol.dispose] = PercentageWithCapProof.prototype.free;

const PercentageWithCapProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_percentagewithcapproofcontext_free(ptr >>> 0, 1));
/**
 * The context data needed to verify a percentage-with-cap proof.
 *
 * We refer to [`ZK ElGamal proof`] for the formal details on how the percentage-with-cap proof is
 * computed.
 *
 * [`ZK ElGamal proof`]: https://docs.solanalabs.com/runtime/zk-token-proof
 */
export class PercentageWithCapProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PercentageWithCapProofContext.prototype);
        obj.__wbg_ptr = ptr;
        PercentageWithCapProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PercentageWithCapProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_percentagewithcapproofcontext_free(ptr, 0);
    }
    /**
     * The Pedersen commitment to the percentage amount.
     * @returns {PodPedersenCommitment}
     */
    get percentage_commitment() {
        const ret = wasm.__wbg_get_percentagewithcapproofcontext_percentage_commitment(this.__wbg_ptr);
        return PodPedersenCommitment.__wrap(ret);
    }
    /**
     * The Pedersen commitment to the percentage amount.
     * @param {PodPedersenCommitment} arg0
     */
    set percentage_commitment(arg0) {
        _assertClass(arg0, PodPedersenCommitment);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofcontext_percentage_commitment(this.__wbg_ptr, ptr0);
    }
    /**
     * The Pedersen commitment to the delta amount.
     * @returns {PodPedersenCommitment}
     */
    get delta_commitment() {
        const ret = wasm.__wbg_get_percentagewithcapproofcontext_delta_commitment(this.__wbg_ptr);
        return PodPedersenCommitment.__wrap(ret);
    }
    /**
     * The Pedersen commitment to the delta amount.
     * @param {PodPedersenCommitment} arg0
     */
    set delta_commitment(arg0) {
        _assertClass(arg0, PodPedersenCommitment);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofcontext_delta_commitment(this.__wbg_ptr, ptr0);
    }
    /**
     * The Pedersen commitment to the claimed amount.
     * @returns {PodPedersenCommitment}
     */
    get claimed_commitment() {
        const ret = wasm.__wbg_get_percentagewithcapproofcontext_claimed_commitment(this.__wbg_ptr);
        return PodPedersenCommitment.__wrap(ret);
    }
    /**
     * The Pedersen commitment to the claimed amount.
     * @param {PodPedersenCommitment} arg0
     */
    set claimed_commitment(arg0) {
        _assertClass(arg0, PodPedersenCommitment);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofcontext_claimed_commitment(this.__wbg_ptr, ptr0);
    }
    /**
     * The maximum cap bound.
     * @returns {PodU64}
     */
    get max_value() {
        const ret = wasm.__wbg_get_percentagewithcapproofcontext_max_value(this.__wbg_ptr);
        return PodU64.__wrap(ret);
    }
    /**
     * The maximum cap bound.
     * @param {PodU64} arg0
     */
    set max_value(arg0) {
        _assertClass(arg0, PodU64);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofcontext_max_value(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {PercentageWithCapProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.percentagewithcapproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PercentageWithCapProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.percentagewithcapproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) PercentageWithCapProofContext.prototype[Symbol.dispose] = PercentageWithCapProofContext.prototype.free;

const PercentageWithCapProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_percentagewithcapproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyPercentageWithCap`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class PercentageWithCapProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PercentageWithCapProofData.prototype);
        obj.__wbg_ptr = ptr;
        PercentageWithCapProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PercentageWithCapProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_percentagewithcapproofdata_free(ptr, 0);
    }
    /**
     * @returns {PercentageWithCapProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_percentagewithcapproofdata_context(this.__wbg_ptr);
        return PercentageWithCapProofContext.__wrap(ret);
    }
    /**
     * @param {PercentageWithCapProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, PercentageWithCapProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * @returns {PodPercentageWithCapProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_percentagewithcapproofdata_proof(this.__wbg_ptr);
        return PodPercentageWithCapProof.__wrap(ret);
    }
    /**
     * @param {PodPercentageWithCapProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodPercentageWithCapProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_percentagewithcapproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {PercentageWithCapProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.percentagewithcapproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PercentageWithCapProofData.__wrap(ret[0]);
    }
    /**
     * @param {PedersenCommitment} percentage_commitment
     * @param {PedersenOpening} percentage_opening
     * @param {bigint} percentage_amount
     * @param {PedersenCommitment} delta_commitment
     * @param {PedersenOpening} delta_opening
     * @param {bigint} delta_amount
     * @param {PedersenCommitment} claimed_commitment
     * @param {PedersenOpening} claimed_opening
     * @param {bigint} max_value
     * @returns {PercentageWithCapProofData}
     */
    static new(percentage_commitment, percentage_opening, percentage_amount, delta_commitment, delta_opening, delta_amount, claimed_commitment, claimed_opening, max_value) {
        _assertClass(percentage_commitment, PedersenCommitment);
        _assertClass(percentage_opening, PedersenOpening);
        _assertClass(delta_commitment, PedersenCommitment);
        _assertClass(delta_opening, PedersenOpening);
        _assertClass(claimed_commitment, PedersenCommitment);
        _assertClass(claimed_opening, PedersenOpening);
        const ret = wasm.percentagewithcapproofdata_new(percentage_commitment.__wbg_ptr, percentage_opening.__wbg_ptr, percentage_amount, delta_commitment.__wbg_ptr, delta_opening.__wbg_ptr, delta_amount, claimed_commitment.__wbg_ptr, claimed_opening.__wbg_ptr, max_value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PercentageWithCapProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.percentagewithcapproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) PercentageWithCapProofData.prototype[Symbol.dispose] = PercentageWithCapProofData.prototype.free;

const PodAeCiphertextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podaeciphertext_free(ptr >>> 0, 1));
/**
 * The `AeCiphertext` type as a `Pod`.
 */
export class PodAeCiphertext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodAeCiphertext.prototype);
        obj.__wbg_ptr = ptr;
        PodAeCiphertextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodAeCiphertextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podaeciphertext_free(ptr, 0);
    }
    /**
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.podaeciphertext_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PodAeCiphertextFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {AeCiphertext}
     */
    decode() {
        const ret = wasm.podaeciphertext_decode(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return AeCiphertext.__wrap(ret[0]);
    }
    /**
     * @param {AeCiphertext} decoded
     * @returns {PodAeCiphertext}
     */
    static encode(decoded) {
        _assertClass(decoded, AeCiphertext);
        const ret = wasm.podaeciphertext_encode(decoded.__wbg_ptr);
        return PodAeCiphertext.__wrap(ret);
    }
    /**
     * @param {PodAeCiphertext} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PodAeCiphertext);
        const ret = wasm.podaeciphertext_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {PodAeCiphertext}
     */
    static zeroed() {
        const ret = wasm.podaeciphertext_zeroed();
        return PodAeCiphertext.__wrap(ret);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.podaeciphertext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.podaeciphertext_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) PodAeCiphertext.prototype[Symbol.dispose] = PodAeCiphertext.prototype.free;

const PodBatchedGroupedCiphertext2HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podbatchedgroupedciphertext2handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The `BatchedGroupedCiphertext2HandlesValidityProof` type as a `Pod`.
 */
export class PodBatchedGroupedCiphertext2HandlesValidityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodBatchedGroupedCiphertext2HandlesValidityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodBatchedGroupedCiphertext2HandlesValidityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodBatchedGroupedCiphertext2HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podbatchedgroupedciphertext2handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodBatchedGroupedCiphertext2HandlesValidityProof.prototype[Symbol.dispose] = PodBatchedGroupedCiphertext2HandlesValidityProof.prototype.free;

const PodBatchedGroupedCiphertext3HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podbatchedgroupedciphertext3handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The `BatchedGroupedCiphertext3HandlesValidityProof` type as a `Pod`.
 */
export class PodBatchedGroupedCiphertext3HandlesValidityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodBatchedGroupedCiphertext3HandlesValidityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodBatchedGroupedCiphertext3HandlesValidityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodBatchedGroupedCiphertext3HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podbatchedgroupedciphertext3handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodBatchedGroupedCiphertext3HandlesValidityProof.prototype[Symbol.dispose] = PodBatchedGroupedCiphertext3HandlesValidityProof.prototype.free;

const PodCiphertextCiphertextEqualityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podciphertextciphertextequalityproof_free(ptr >>> 0, 1));
/**
 * The `CiphertextCiphertextEqualityProof` type as a `Pod`.
 */
export class PodCiphertextCiphertextEqualityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodCiphertextCiphertextEqualityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodCiphertextCiphertextEqualityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodCiphertextCiphertextEqualityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podciphertextciphertextequalityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodCiphertextCiphertextEqualityProof.prototype[Symbol.dispose] = PodCiphertextCiphertextEqualityProof.prototype.free;

const PodCiphertextCommitmentEqualityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podciphertextcommitmentequalityproof_free(ptr >>> 0, 1));
/**
 * The `CiphertextCommitmentEqualityProof` type as a `Pod`.
 */
export class PodCiphertextCommitmentEqualityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodCiphertextCommitmentEqualityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodCiphertextCommitmentEqualityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodCiphertextCommitmentEqualityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podciphertextcommitmentequalityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodCiphertextCommitmentEqualityProof.prototype[Symbol.dispose] = PodCiphertextCommitmentEqualityProof.prototype.free;

const PodElGamalCiphertextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podelgamalciphertext_free(ptr >>> 0, 1));
/**
 * The `ElGamalCiphertext` type as a `Pod`.
 */
export class PodElGamalCiphertext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodElGamalCiphertext.prototype);
        obj.__wbg_ptr = ptr;
        PodElGamalCiphertextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodElGamalCiphertextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podelgamalciphertext_free(ptr, 0);
    }
    /**
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.podelgamalciphertext_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PodElGamalCiphertextFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {ElGamalCiphertext}
     */
    decode() {
        const ret = wasm.podelgamalciphertext_decode(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ElGamalCiphertext.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalCiphertext} decoded
     * @returns {PodElGamalCiphertext}
     */
    static encode(decoded) {
        _assertClass(decoded, ElGamalCiphertext);
        const ret = wasm.podelgamalciphertext_encode(decoded.__wbg_ptr);
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * @param {PodElGamalCiphertext} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PodElGamalCiphertext);
        const ret = wasm.podelgamalciphertext_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {PodElGamalCiphertext}
     */
    static zeroed() {
        const ret = wasm.podaeciphertext_zeroed();
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.podelgamalciphertext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.podelgamalciphertext_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) PodElGamalCiphertext.prototype[Symbol.dispose] = PodElGamalCiphertext.prototype.free;

const PodElGamalPubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podelgamalpubkey_free(ptr >>> 0, 1));
/**
 * The `ElGamalPubkey` type as a `Pod`.
 */
export class PodElGamalPubkey {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodElGamalPubkey.prototype);
        obj.__wbg_ptr = ptr;
        PodElGamalPubkeyFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodElGamalPubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podelgamalpubkey_free(ptr, 0);
    }
    /**
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.podelgamalpubkey_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PodElGamalPubkeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {ElGamalPubkey}
     */
    decode() {
        const ret = wasm.podelgamalpubkey_decode(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ElGamalPubkey.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalPubkey} decoded
     * @returns {PodElGamalPubkey}
     */
    static encode(decoded) {
        _assertClass(decoded, ElGamalPubkey);
        const ret = wasm.podelgamalpubkey_encode(decoded.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @param {PodElGamalPubkey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, PodElGamalPubkey);
        const ret = wasm.podelgamalpubkey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {PodElGamalPubkey}
     */
    static zeroed() {
        const ret = wasm.podelgamalpubkey_zeroed();
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.podelgamalpubkey_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.podelgamalpubkey_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) PodElGamalPubkey.prototype[Symbol.dispose] = PodElGamalPubkey.prototype.free;

const PodGroupedCiphertext2HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podgroupedciphertext2handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The `GroupedCiphertext2HandlesValidityProof` type as a `Pod`.
 */
export class PodGroupedCiphertext2HandlesValidityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodGroupedCiphertext2HandlesValidityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodGroupedCiphertext2HandlesValidityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodGroupedCiphertext2HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podgroupedciphertext2handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodGroupedCiphertext2HandlesValidityProof.prototype[Symbol.dispose] = PodGroupedCiphertext2HandlesValidityProof.prototype.free;

const PodGroupedCiphertext3HandlesValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podgroupedciphertext3handlesvalidityproof_free(ptr >>> 0, 1));
/**
 * The `GroupedCiphertext3HandlesValidityProof` type as a `Pod`.
 */
export class PodGroupedCiphertext3HandlesValidityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodGroupedCiphertext3HandlesValidityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodGroupedCiphertext3HandlesValidityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodGroupedCiphertext3HandlesValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podgroupedciphertext3handlesvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodGroupedCiphertext3HandlesValidityProof.prototype[Symbol.dispose] = PodGroupedCiphertext3HandlesValidityProof.prototype.free;

const PodGroupedElGamalCiphertext2HandlesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podgroupedelgamalciphertext2handles_free(ptr >>> 0, 1));
/**
 * The `GroupedElGamalCiphertext` type with two decryption handles as a `Pod`
 */
export class PodGroupedElGamalCiphertext2Handles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodGroupedElGamalCiphertext2Handles.prototype);
        obj.__wbg_ptr = ptr;
        PodGroupedElGamalCiphertext2HandlesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodGroupedElGamalCiphertext2HandlesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podgroupedelgamalciphertext2handles_free(ptr, 0);
    }
}
if (Symbol.dispose) PodGroupedElGamalCiphertext2Handles.prototype[Symbol.dispose] = PodGroupedElGamalCiphertext2Handles.prototype.free;

const PodGroupedElGamalCiphertext3HandlesFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podgroupedelgamalciphertext3handles_free(ptr >>> 0, 1));
/**
 * The `GroupedElGamalCiphertext` type with three decryption handles as a `Pod`
 */
export class PodGroupedElGamalCiphertext3Handles {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodGroupedElGamalCiphertext3Handles.prototype);
        obj.__wbg_ptr = ptr;
        PodGroupedElGamalCiphertext3HandlesFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodGroupedElGamalCiphertext3HandlesFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podgroupedelgamalciphertext3handles_free(ptr, 0);
    }
}
if (Symbol.dispose) PodGroupedElGamalCiphertext3Handles.prototype[Symbol.dispose] = PodGroupedElGamalCiphertext3Handles.prototype.free;

const PodPedersenCommitmentFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podpedersencommitment_free(ptr >>> 0, 1));
/**
 * The `PedersenCommitment` type as a `Pod`.
 */
export class PodPedersenCommitment {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodPedersenCommitment.prototype);
        obj.__wbg_ptr = ptr;
        PodPedersenCommitmentFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodPedersenCommitmentFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podpedersencommitment_free(ptr, 0);
    }
}
if (Symbol.dispose) PodPedersenCommitment.prototype[Symbol.dispose] = PodPedersenCommitment.prototype.free;

const PodPercentageWithCapProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podpercentagewithcapproof_free(ptr >>> 0, 1));
/**
 * The `PercentageWithCapProof` type as a `Pod`.
 */
export class PodPercentageWithCapProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodPercentageWithCapProof.prototype);
        obj.__wbg_ptr = ptr;
        PodPercentageWithCapProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodPercentageWithCapProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podpercentagewithcapproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodPercentageWithCapProof.prototype[Symbol.dispose] = PodPercentageWithCapProof.prototype.free;

const PodPubkeyValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podpubkeyvalidityproof_free(ptr >>> 0, 1));
/**
 * The `PubkeyValidityProof` type as a `Pod`.
 */
export class PodPubkeyValidityProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodPubkeyValidityProof.prototype);
        obj.__wbg_ptr = ptr;
        PodPubkeyValidityProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodPubkeyValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podpubkeyvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodPubkeyValidityProof.prototype[Symbol.dispose] = PodPubkeyValidityProof.prototype.free;

const PodU64Finalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podu64_free(ptr >>> 0, 1));

export class PodU64 {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodU64.prototype);
        obj.__wbg_ptr = ptr;
        PodU64Finalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodU64Finalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podu64_free(ptr, 0);
    }
}
if (Symbol.dispose) PodU64.prototype[Symbol.dispose] = PodU64.prototype.free;

const PodZeroCiphertextProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_podzerociphertextproof_free(ptr >>> 0, 1));
/**
 * The `ZeroCiphertextProof` type as a `Pod`.
 */
export class PodZeroCiphertextProof {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PodZeroCiphertextProof.prototype);
        obj.__wbg_ptr = ptr;
        PodZeroCiphertextProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PodZeroCiphertextProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_podzerociphertextproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PodZeroCiphertextProof.prototype[Symbol.dispose] = PodZeroCiphertextProof.prototype.free;

const PubkeyFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pubkey_free(ptr >>> 0, 1));
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

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PubkeyFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pubkey_free(ptr, 0);
    }
    /**
     * Create a new Pubkey object
     *
     * * `value` - optional public key as a base58 encoded string, `Uint8Array`, `[number]`
     * @param {any} value
     */
    constructor(value) {
        const ret = wasm.pubkey_constructor(value);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        PubkeyFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Checks if two `Pubkey`s are equal
     * @param {Pubkey} other
     * @returns {boolean}
     */
    equals(other) {
        _assertClass(other, Pubkey);
        const ret = wasm.pubkey_equals(this.__wbg_ptr, other.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Return the `Uint8Array` representation of the public key
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.pubkey_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Return the base58 string representation of the public key
     * @returns {string}
     */
    toString() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.pubkey_toString(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
}
if (Symbol.dispose) Pubkey.prototype[Symbol.dispose] = Pubkey.prototype.free;

const PubkeyValidityProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pubkeyvalidityproof_free(ptr >>> 0, 1));
/**
 * Public-key proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class PubkeyValidityProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PubkeyValidityProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pubkeyvalidityproof_free(ptr, 0);
    }
}
if (Symbol.dispose) PubkeyValidityProof.prototype[Symbol.dispose] = PubkeyValidityProof.prototype.free;

const PubkeyValidityProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pubkeyvalidityproofcontext_free(ptr >>> 0, 1));
/**
 * The context data needed to verify a pubkey validity proof.
 */
export class PubkeyValidityProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PubkeyValidityProofContext.prototype);
        obj.__wbg_ptr = ptr;
        PubkeyValidityProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PubkeyValidityProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pubkeyvalidityproofcontext_free(ptr, 0);
    }
    /**
     * The public key to be proved
     * @returns {PodElGamalPubkey}
     */
    get pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * The public key to be proved
     * @param {PodElGamalPubkey} arg0
     */
    set pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext3handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {PubkeyValidityProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pubkeyvalidityproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PubkeyValidityProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.pubkeyvalidityproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) PubkeyValidityProofContext.prototype[Symbol.dispose] = PubkeyValidityProofContext.prototype.free;

const PubkeyValidityProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pubkeyvalidityproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the `ProofInstruction::VerifyPubkeyValidity`
 * instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class PubkeyValidityProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PubkeyValidityProofData.prototype);
        obj.__wbg_ptr = ptr;
        PubkeyValidityProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PubkeyValidityProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pubkeyvalidityproofdata_free(ptr, 0);
    }
    /**
     * The context data for the public key validity proof
     * @returns {PubkeyValidityProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_pubkeyvalidityproofdata_context(this.__wbg_ptr);
        return PubkeyValidityProofContext.__wrap(ret);
    }
    /**
     * The context data for the public key validity proof
     * @param {PubkeyValidityProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, PubkeyValidityProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_pubkeyvalidityproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * Proof that the public key is well-formed
     * @returns {PodPubkeyValidityProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_pubkeyvalidityproofdata_proof(this.__wbg_ptr);
        return PodPubkeyValidityProof.__wrap(ret);
    }
    /**
     * Proof that the public key is well-formed
     * @param {PodPubkeyValidityProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodPubkeyValidityProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_pubkeyvalidityproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {PubkeyValidityProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pubkeyvalidityproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PubkeyValidityProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalKeypair} keypair
     * @returns {PubkeyValidityProofData}
     */
    static new(keypair) {
        _assertClass(keypair, ElGamalKeypair);
        const ret = wasm.pubkeyvalidityproofdata_new(keypair.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return PubkeyValidityProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.pubkeyvalidityproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) PubkeyValidityProofData.prototype[Symbol.dispose] = PubkeyValidityProofData.prototype.free;

const ZeroCiphertextProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_zerociphertextproof_free(ptr >>> 0, 1));
/**
 * Zero-ciphertext proof.
 *
 * Contains all the elliptic curve and scalar components that make up the sigma protocol.
 */
export class ZeroCiphertextProof {

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ZeroCiphertextProofFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_zerociphertextproof_free(ptr, 0);
    }
}
if (Symbol.dispose) ZeroCiphertextProof.prototype[Symbol.dispose] = ZeroCiphertextProof.prototype.free;

const ZeroCiphertextProofContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_zerociphertextproofcontext_free(ptr >>> 0, 1));
/**
 * The context data needed to verify a zero-ciphertext proof.
 */
export class ZeroCiphertextProofContext {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ZeroCiphertextProofContext.prototype);
        obj.__wbg_ptr = ptr;
        ZeroCiphertextProofContextFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ZeroCiphertextProofContextFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_zerociphertextproofcontext_free(ptr, 0);
    }
    /**
     * The ElGamal pubkey associated with the ElGamal ciphertext
     * @returns {PodElGamalPubkey}
     */
    get pubkey() {
        const ret = wasm.__wbg_get_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr);
        return PodElGamalPubkey.__wrap(ret);
    }
    /**
     * The ElGamal pubkey associated with the ElGamal ciphertext
     * @param {PodElGamalPubkey} arg0
     */
    set pubkey(arg0) {
        _assertClass(arg0, PodElGamalPubkey);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_batchedgroupedciphertext2handlesvalidityproofcontext_first_pubkey(this.__wbg_ptr, ptr0);
    }
    /**
     * The ElGamal ciphertext that encrypts zero
     * @returns {PodElGamalCiphertext}
     */
    get ciphertext() {
        const ret = wasm.__wbg_get_zerociphertextproofcontext_ciphertext(this.__wbg_ptr);
        return PodElGamalCiphertext.__wrap(ret);
    }
    /**
     * The ElGamal ciphertext that encrypts zero
     * @param {PodElGamalCiphertext} arg0
     */
    set ciphertext(arg0) {
        _assertClass(arg0, PodElGamalCiphertext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_zerociphertextproofcontext_ciphertext(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {ZeroCiphertextProofContext}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.zerociphertextproofcontext_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ZeroCiphertextProofContext.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.zerociphertextproofcontext_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) ZeroCiphertextProofContext.prototype[Symbol.dispose] = ZeroCiphertextProofContext.prototype.free;

const ZeroCiphertextProofDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_zerociphertextproofdata_free(ptr >>> 0, 1));
/**
 * The instruction data that is needed for the `ProofInstruction::ZeroCiphertext` instruction.
 *
 * It includes the cryptographic proof as well as the context data information needed to verify
 * the proof.
 */
export class ZeroCiphertextProofData {

    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ZeroCiphertextProofData.prototype);
        obj.__wbg_ptr = ptr;
        ZeroCiphertextProofDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ZeroCiphertextProofDataFinalization.unregister(this);
        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_zerociphertextproofdata_free(ptr, 0);
    }
    /**
     * The context data for the zero-ciphertext proof
     * @returns {ZeroCiphertextProofContext}
     */
    get context() {
        const ret = wasm.__wbg_get_zerociphertextproofdata_context(this.__wbg_ptr);
        return ZeroCiphertextProofContext.__wrap(ret);
    }
    /**
     * The context data for the zero-ciphertext proof
     * @param {ZeroCiphertextProofContext} arg0
     */
    set context(arg0) {
        _assertClass(arg0, ZeroCiphertextProofContext);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_zerociphertextproofdata_context(this.__wbg_ptr, ptr0);
    }
    /**
     * Proof that the ciphertext is zero
     * @returns {PodZeroCiphertextProof}
     */
    get proof() {
        const ret = wasm.__wbg_get_zerociphertextproofdata_proof(this.__wbg_ptr);
        return PodZeroCiphertextProof.__wrap(ret);
    }
    /**
     * Proof that the ciphertext is zero
     * @param {PodZeroCiphertextProof} arg0
     */
    set proof(arg0) {
        _assertClass(arg0, PodZeroCiphertextProof);
        var ptr0 = arg0.__destroy_into_raw();
        wasm.__wbg_set_zerociphertextproofdata_proof(this.__wbg_ptr, ptr0);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {ZeroCiphertextProofData}
     */
    static fromBytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.zerociphertextproofdata_fromBytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ZeroCiphertextProofData.__wrap(ret[0]);
    }
    /**
     * @param {ElGamalKeypair} keypair
     * @param {ElGamalCiphertext} ciphertext
     * @returns {ZeroCiphertextProofData}
     */
    static new(keypair, ciphertext) {
        _assertClass(keypair, ElGamalKeypair);
        _assertClass(ciphertext, ElGamalCiphertext);
        const ret = wasm.zerociphertextproofdata_new(keypair.__wbg_ptr, ciphertext.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ZeroCiphertextProofData.__wrap(ret[0]);
    }
    /**
     * @returns {Uint8Array}
     */
    toBytes() {
        const ret = wasm.zerociphertextproofdata_toBytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) ZeroCiphertextProofData.prototype[Symbol.dispose] = ZeroCiphertextProofData.prototype.free;

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_debug_string_df47ffb5e35e6763 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_is_function_ee8a6c5833c90377 = function(arg0) {
        const ret = typeof(arg0) === 'function';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_c818261d21f283a4 = function(arg0) {
        const val = arg0;
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_string_fbb76cb2940daafd = function(arg0) {
        const ret = typeof(arg0) === 'string';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_2d472862bd29a478 = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_number_get_a20bf9b85341449d = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_string_get_e4f06c90489ad01b = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_call_525440f72fbfc0ea = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = arg0.call(arg1, arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_e762c39fa8ea36bf = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_crypto_574e78ad8b13b65f = function(arg0) {
        const ret = arg0.crypto;
        return ret;
    };
    imports.wbg.__wbg_done_2042aa2670fb1db1 = function(arg0) {
        const ret = arg0.done;
        return ret;
    };
    imports.wbg.__wbg_getRandomValues_b8f5dbd5f3995a9e = function() { return handleError(function (arg0, arg1) {
        arg0.getRandomValues(arg1);
    }, arguments) };
    imports.wbg.__wbg_get_efcb449f58ec27c2 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_instanceof_Uint8Array_20c8e73002f7af98 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_96e0af9891d0945d = function(arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_iterator_e5822695327a3c39 = function() {
        const ret = Symbol.iterator;
        return ret;
    };
    imports.wbg.__wbg_length_69bca3cb64fc8748 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_msCrypto_a61aeb35a24c1329 = function(arg0) {
        const ret = arg0.msCrypto;
        return ret;
    };
    imports.wbg.__wbg_new_1acc0b6eea89d040 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_a7442b4b19c1a356 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_e17d9f43105b08be = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_no_args_ee98eee5275000a4 = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_new_with_length_01aa0dc35aa13543 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_next_020810e0ae8ebcb0 = function() { return handleError(function (arg0) {
        const ret = arg0.next();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_next_2c826fe5dfec6b6a = function(arg0) {
        const ret = arg0.next;
        return ret;
    };
    imports.wbg.__wbg_node_905d3e251edff8a2 = function(arg0) {
        const ret = arg0.node;
        return ret;
    };
    imports.wbg.__wbg_process_dc0fbacc7c1c06f7 = function(arg0) {
        const ret = arg0.process;
        return ret;
    };
    imports.wbg.__wbg_prototypesetcall_2a6620b6922694b2 = function(arg0, arg1, arg2) {
        Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    };
    imports.wbg.__wbg_randomFillSync_ac0988aba3254290 = function() { return handleError(function (arg0, arg1) {
        arg0.randomFillSync(arg1);
    }, arguments) };
    imports.wbg.__wbg_require_60cc747a6bc5215a = function() { return handleError(function () {
        const ret = module.require;
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_c213c871859d6500 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_89e1d9ac6a1b250e = function() {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_8b530f326a9e48ac = function() {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_6fdf4b64710cc91b = function() {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_b45bfc5a37f6cfa2 = function() {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_subarray_480600f3d6a9f26c = function(arg0, arg1, arg2) {
        const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_value_692627309814bb8c = function(arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbg_values_58a781304289144d = function(arg0) {
        const ret = arg0.values();
        return ret;
    };
    imports.wbg.__wbg_versions_c01dfd4722a88165 = function(arg0) {
        const ret = arg0.versions;
        return ret;
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_cb9088102bce6b30 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
        const ret = getArrayU8FromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('darkdrop_ct_proofs_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
