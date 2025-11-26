use std::{fs, path::PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use base64::engine::{general_purpose::STANDARD, Engine as _};
use clap::{Parser, Subcommand};
use serde::Deserialize;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{commitment_config::CommitmentConfig, signature::read_keypair_file, signature::Keypair};

#[derive(Debug, Parser)]
#[command(name = "darkdrop-ct-service", version, about = "Utility for handling SPL Token-2022 Confidential Transfer proofs")]
struct Cli {
    /// RPC endpoint (defaults to cluster-specific env)
    #[arg(long, global = true)]
    rpc_url: Option<String>,

    /// Path to fee-payer keypair (JSON)
    #[arg(long, global = true)]
    keypair: PathBuf,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Prepare configure-account context from WASM proof output
    Configure {
        /// Path to configure proof payload JSON
        #[arg(long)]
        input: PathBuf,
    },
    /// Prepare confidential transfer context + submit transaction
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

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match &cli.command {
        Commands::Configure { input } => {
            let job: ConfigureJob = load_json(input)?;
            summarize_configure_job(&job);
            run_configure(&cli, &job).await?;
        }
        Commands::Transfer { input } => {
            let job: TransferJob = load_json(input)?;
            summarize_transfer_job(&job);
            run_transfer(&cli, &job).await?;
        }
    }
    Ok(())
}

struct RpcContext {
    client: RpcClient,
    _payer: Keypair,
    url: String,
}

fn load_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T> {
    let bytes = fs::read(path).with_context(|| format!("failed to read {}", path.display()))?;
    let job = serde_json::from_slice(&bytes)
        .with_context(|| format!("failed to parse {}", path.display()))?;
    Ok(job)
}

fn summarize_configure_job(job: &ConfigureJob) {
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

fn summarize_transfer_job(job: &TransferJob) {
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
    println!("  Range      : {} bytes", decode_len(&job.proofs.range_proof));
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

async fn run_configure(cli: &Cli, job: &ConfigureJob) -> Result<()> {
    let rpc = rpc_context(&job.cluster, cli.rpc_url.as_deref(), &cli.keypair)?;
    let blockhash = rpc
        .client
        .get_latest_blockhash()
        .context("failed to fetch blockhash")?;
    println!("RPC [{}] ready. Latest blockhash: {}", rpc.url, blockhash);
    println!(
        "TODO: submit configure transaction for token account {}",
        job.token_account
    );
    Ok(())
}

async fn run_transfer(cli: &Cli, job: &TransferJob) -> Result<()> {
    let rpc = rpc_context(&job.cluster, cli.rpc_url.as_deref(), &cli.keypair)?;
    let blockhash = rpc
        .client
        .get_latest_blockhash()
        .context("failed to fetch blockhash")?;
    println!("RPC [{}] ready. Latest blockhash: {}", rpc.url, blockhash);
    println!(
        "TODO: submit confidential transfer {} -> {} ({})",
        job.source_token_account, job.destination_token_account, job.amount
    );
    Ok(())
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
    Ok(RpcContext {
        client,
        _payer: payer,
        url: rpc_url,
    })
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
