use std::{fs, path::PathBuf, str::FromStr};

use anyhow::{anyhow, bail, Context, Result};
use base64::engine::{general_purpose::STANDARD, Engine as _};
use clap::{ArgAction, Parser, Subcommand};
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{read_keypair_file, Keypair, Signature, Signer},
    system_instruction,
    transaction::Transaction,
};
use solana_zk_sdk::zk_elgamal_proof_program::{
    instruction::ProofInstruction,
    proof_data::{
        batched_grouped_ciphertext_validity::{
            BatchedGroupedCiphertext3HandlesValidityProofContext,
            BatchedGroupedCiphertext3HandlesValidityProofData,
        },
        batched_range_proof::{
            batched_range_proof_u128::BatchedRangeProofU128Data, BatchedRangeProofContext,
        },
        ciphertext_commitment_equality::{
            CiphertextCommitmentEqualityProofContext, CiphertextCommitmentEqualityProofData,
        },
        zero_ciphertext::{ZeroCiphertextProofContext, ZeroCiphertextProofData},
    },
    state::ProofContextState,
};

const PROOF_PROGRAM_ID: Pubkey =
    solana_sdk::pubkey!("ZkE1Gama1Proof11111111111111111111111111111");

const ZERO_PROOF_DATA_LEN: usize = std::mem::size_of::<ZeroCiphertextProofData>();
const EQUALITY_PROOF_DATA_LEN: usize =
    std::mem::size_of::<CiphertextCommitmentEqualityProofData>();
const VALIDITY_PROOF_DATA_LEN: usize =
    std::mem::size_of::<BatchedGroupedCiphertext3HandlesValidityProofData>();
const RANGE_PROOF_DATA_LEN: usize = std::mem::size_of::<BatchedRangeProofU128Data>();

const ZERO_CONTEXT_SPACE: usize =
    std::mem::size_of::<ProofContextState<ZeroCiphertextProofContext>>();
const EQUALITY_CONTEXT_SPACE: usize =
    std::mem::size_of::<ProofContextState<CiphertextCommitmentEqualityProofContext>>();
const VALIDITY_CONTEXT_SPACE: usize =
    std::mem::size_of::<ProofContextState<BatchedGroupedCiphertext3HandlesValidityProofContext>>();
const RANGE_CONTEXT_SPACE: usize =
    std::mem::size_of::<ProofContextState<BatchedRangeProofContext>>();

#[derive(Debug, Parser)]
#[command(name = "darkdrop-ct-service", version, about = "Utility for handling SPL Token-2022 Confidential Transfer proofs")]
struct Cli {
    /// RPC endpoint (defaults to cluster-specific env)
    #[arg(long, global = true)]
    rpc_url: Option<String>,

    /// Output machine-readable JSON (suppresses logs)
    #[arg(long, global = true, action = ArgAction::SetTrue)]
    json: bool,

    /// Path to fee-payer keypair (JSON)
    #[arg(long, global = true)]
    keypair: PathBuf,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Upload zero-balance configure proof to a context account
    Configure {
        /// Path to configure proof payload JSON
        #[arg(long)]
        input: PathBuf,
    },
    /// Upload transfer proofs (equality, validity, range) to context accounts
    Transfer {
        /// Path to transfer proof payload JSON
        #[arg(long)]
        input: PathBuf,
    },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfigureJob {
    cluster: String,
    mint: String,
    payer: String,
    owner: String,
    token_account: String,
    proof: ConfigureProofPayload,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct ConfigureProofPayload {
    aes_key: String,
    zero_balance_proof: String,
    elgamal_keypair: String,
    elgamal_pubkey: String,
    decryptable_zero_balance: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransferJob {
    cluster: String,
    mint: String,
    payer: String,
    owner: String,
    source_token_account: String,
    destination_token_account: String,
    amount: String,
    proofs: TransferProofPayload,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct TransferProofPayload {
    equality_proof: String,
    validity_proof: String,
    range_proof: String,
    new_source_balance: String,
    sender_elgamal_keypair: String,
    new_source_decryptable_balance: Option<String>,
    transfer_auditor_ciphertext_lo: Option<String>,
    transfer_auditor_ciphertext_hi: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProofContextSummary {
    context: String,
    signature: String,
}

#[derive(Debug, Serialize)]
struct ConfigureResponse {
    context: ProofContextSummary,
}

#[derive(Debug, Serialize)]
struct TransferResponse {
    equality: ProofContextSummary,
    validity: ProofContextSummary,
    range: ProofContextSummary,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match &cli.command {
        Commands::Configure { input } => {
            let job: ConfigureJob = load_json(input)?;
            summarize_configure_job(&job, cli.json);
            run_configure(&cli, &job).await?;
        }
        Commands::Transfer { input } => {
            let job: TransferJob = load_json(input)?;
            summarize_transfer_job(&job, cli.json);
            run_transfer(&cli, &job).await?;
        }
    }
    Ok(())
}

struct RpcContext {
    client: RpcClient,
    payer: Keypair,
    url: String,
}

struct ProofUploadResult {
    context: Pubkey,
    signature: Signature,
}

impl ProofUploadResult {
    fn summary(&self) -> ProofContextSummary {
        ProofContextSummary {
            context: self.context.to_string(),
            signature: self.signature.to_string(),
        }
    }
}

struct TransferProofUpload {
    equality: ProofUploadResult,
    validity: ProofUploadResult,
    range: ProofUploadResult,
}

fn load_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T> {
    let bytes = fs::read(path).with_context(|| format!("failed to read {}", path.display()))?;
    let job = serde_json::from_slice(&bytes)
        .with_context(|| format!("failed to parse {}", path.display()))?;
    Ok(job)
}

fn summarize_configure_job(job: &ConfigureJob, quiet: bool) {
    if quiet {
        return;
    }
    println!("Configure job for cluster {}", job.cluster);
    println!("Mint        : {}", job.mint);
    println!("Owner       : {}", job.owner);
    println!("Token acct  : {}", job.token_account);
    println!("Fee payer   : {}", job.payer);
    println!("Proof sizes :");
    println!("  AES key                : {} bytes", decode_len(&job.proof.aes_key));
    println!(
        "  Zero balance proof     : {} bytes",
        decode_len(&job.proof.zero_balance_proof)
    );
    println!(
        "  Decryptable zero cipher: {} bytes",
        decode_len(&job.proof.decryptable_zero_balance)
    );
}

fn summarize_transfer_job(job: &TransferJob, quiet: bool) {
    if quiet {
        return;
    }
    println!("Transfer job for cluster {}", job.cluster);
    println!("Mint        : {}", job.mint);
    println!("Source ATA  : {}", job.source_token_account);
    println!("Dest ATA    : {}", job.destination_token_account);
    println!("Owner       : {}", job.owner);
    println!("Fee payer   : {}", job.payer);
    println!("Amount (raw): {}", job.amount);
    println!("Proof sizes :");
    println!(
        "  Equality   : {} bytes",
        decode_len(&job.proofs.equality_proof)
    );
    println!(
        "  Validity   : {} bytes",
        decode_len(&job.proofs.validity_proof)
    );
    println!(
        "  Range      : {} bytes",
        decode_len(&job.proofs.range_proof)
    );
    if let Some(ref cipher) = job.proofs.new_source_decryptable_balance {
        println!("  New balance: {} bytes", decode_len(cipher));
    }
    if job.proofs.transfer_auditor_ciphertext_lo.is_some() {
        println!("  Auditor ciphertexts present");
    }
}

fn decode_len(value: &str) -> usize {
    STANDARD.decode(value).map(|v| v.len()).unwrap_or_default()
}

fn parse_pubkey(label: &str, value: &str) -> Result<Pubkey> {
    Pubkey::from_str(value)
        .map_err(|err| anyhow!("invalid {} pubkey ({}): {}", label, value, err))
}

fn decode_proof_bytes(label: &str, encoded: &str, expected: usize) -> Result<Vec<u8>> {
    let bytes = STANDARD
        .decode(encoded)
        .with_context(|| format!("failed to decode base64 for {}", label))?;
    if bytes.len() != expected {
        bail!(
            "{} proof length mismatch (expected {}, got {})",
            label,
            expected,
            bytes.len()
        );
    }
    Ok(bytes)
}

async fn run_configure(cli: &Cli, job: &ConfigureJob) -> Result<()> {
    let rpc = rpc_context(&job.cluster, cli.rpc_url.as_deref(), &cli.keypair)?;
    let owner = parse_pubkey("owner", &job.owner)?;
    let zero_proof_bytes = decode_proof_bytes(
        "zero_balance_proof",
        &job.proof.zero_balance_proof,
        ZERO_PROOF_DATA_LEN,
    )?;

    let upload = upload_proof_context(
        &rpc,
        &owner,
        ProofInstruction::VerifyZeroCiphertext,
        zero_proof_bytes,
        ZERO_CONTEXT_SPACE,
    )
    .await?;

    if cli.json {
        let response = ConfigureResponse {
            context: upload.summary(),
        };
        println!("{}", serde_json::to_string(&response)?);
    } else {
        println!(
            "Zero-balance proof stored at context {} (tx {})",
            upload.context, upload.signature
        );
        println!("Store this context account in the configure transaction's metadata.");
    }
    Ok(())
}

async fn run_transfer(cli: &Cli, job: &TransferJob) -> Result<()> {
    let rpc = rpc_context(&job.cluster, cli.rpc_url.as_deref(), &cli.keypair)?;
    let owner = parse_pubkey("owner", &job.owner)?;

    let equality_bytes = decode_proof_bytes(
        "equality_proof",
        &job.proofs.equality_proof,
        EQUALITY_PROOF_DATA_LEN,
    )?;
    let validity_bytes = decode_proof_bytes(
        "validity_proof",
        &job.proofs.validity_proof,
        VALIDITY_PROOF_DATA_LEN,
    )?;
    let range_bytes =
        decode_proof_bytes("range_proof", &job.proofs.range_proof, RANGE_PROOF_DATA_LEN)?;

    let uploads = TransferProofUpload {
        equality: upload_proof_context(
            &rpc,
            &owner,
            ProofInstruction::VerifyCiphertextCommitmentEquality,
            equality_bytes,
            EQUALITY_CONTEXT_SPACE,
        )
        .await?,
        validity: upload_proof_context(
            &rpc,
            &owner,
            ProofInstruction::VerifyBatchedGroupedCiphertext3HandlesValidity,
            validity_bytes,
            VALIDITY_CONTEXT_SPACE,
        )
        .await?,
        range: upload_proof_context(
            &rpc,
            &owner,
            ProofInstruction::VerifyBatchedRangeProofU128,
            range_bytes,
            RANGE_CONTEXT_SPACE,
        )
        .await?,
    };

    if cli.json {
        let response = TransferResponse {
            equality: uploads.equality.summary(),
            validity: uploads.validity.summary(),
            range: uploads.range.summary(),
        };
        println!("{}", serde_json::to_string(&response)?);
    } else {
        println!("Uploaded proof contexts:");
        println!(
            "  Equality : {} (tx {})",
            uploads.equality.context, uploads.equality.signature
        );
        println!(
            "  Validity : {} (tx {})",
            uploads.validity.context, uploads.validity.signature
        );
        println!(
            "  Range    : {} (tx {})",
            uploads.range.context, uploads.range.signature
        );
        println!("Reference these accounts in the ConfidentialTransfer instruction (offset -3).");
    }
    Ok(())
}

async fn upload_proof_context(
    rpc: &RpcContext,
    authority: &Pubkey,
    instruction_tag: ProofInstruction,
    proof_bytes: Vec<u8>,
    context_space: usize,
) -> Result<ProofUploadResult> {
    let context_keypair = Keypair::new();
    let instructions = build_proof_context_instructions(
        rpc,
        authority,
        &context_keypair,
        instruction_tag,
        proof_bytes,
        context_space,
    )?;
    let signature = send_transaction(rpc, instructions, &[&context_keypair]).await?;
    Ok(ProofUploadResult {
        context: context_keypair.pubkey(),
        signature,
    })
}

fn build_proof_context_instructions(
    rpc: &RpcContext,
    authority: &Pubkey,
    context_keypair: &Keypair,
    instruction_tag: ProofInstruction,
    proof_bytes: Vec<u8>,
    context_space: usize,
) -> Result<Vec<Instruction>> {
    let rent = rpc
        .client
        .get_minimum_balance_for_rent_exemption(context_space)
        .context("failed to fetch rent for proof context")?;
    let create_ix = system_instruction::create_account(
        &rpc.payer.pubkey(),
        &context_keypair.pubkey(),
        rent,
        context_space as u64,
        &PROOF_PROGRAM_ID,
    );

    let mut data = Vec::with_capacity(1 + proof_bytes.len());
    data.push(instruction_tag as u8);
    data.extend_from_slice(&proof_bytes);

    let verify_ix = Instruction {
        program_id: PROOF_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(context_keypair.pubkey(), false),
            AccountMeta::new_readonly(*authority, false),
        ],
        data,
    };

    Ok(vec![create_ix, verify_ix])
}

async fn send_transaction(
    rpc: &RpcContext,
    instructions: Vec<Instruction>,
    extra_signers: &[&Keypair],
) -> Result<Signature> {
    let blockhash = rpc
        .client
        .get_latest_blockhash()
        .context("failed to fetch blockhash")?;
    let mut signers: Vec<&Keypair> = Vec::with_capacity(1 + extra_signers.len());
    signers.push(&rpc.payer);
    signers.extend(extra_signers.iter().copied());

    let tx = Transaction::new_signed_with_payer(
        &instructions,
        Some(&rpc.payer.pubkey()),
        &signers,
        blockhash,
    );
    let signature = rpc
        .client
        .send_and_confirm_transaction(&tx)
        .context("failed to send proof transaction")?;
    Ok(signature)
}

fn rpc_context(cluster: &str, override_url: Option<&str>, keypair_path: &PathBuf) -> Result<RpcContext> {
    let rpc_url = if let Some(url) = override_url {
        url.to_owned()
    } else {
        default_rpc_url(cluster)?
    };
    let payer = read_keypair_file(keypair_path).map_err(|err| {
        anyhow!(
            "failed to read keypair {}: {}",
            keypair_path.display(),
            err
        )
    })?;
    let client = RpcClient::new_with_commitment(rpc_url.clone(), CommitmentConfig::confirmed());
    Ok(RpcContext { client, payer, url: rpc_url })
}

fn default_rpc_url(cluster: &str) -> Result<String> {
    match cluster.to_lowercase().as_str() {
        "devnet" => Ok("https://api.devnet.solana.com".to_string()),
        "testnet" => Ok("https://api.testnet.solana.com".to_string()),
        "mainnet" | "mainnet-beta" | "mainnetbeta" => {
            Ok("https://api.mainnet-beta.solana.com".to_string())
        }
        other => bail!("unknown cluster '{}', provide --rpc-url", other),
    }
}
