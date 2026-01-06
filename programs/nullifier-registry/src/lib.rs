use anchor_lang::prelude::*;

declare_id!("NulL1f1erR3g1stry1111111111111111111111111");

#[cfg(test)]
mod tests {
    use super::*;
}

#[program]
pub mod nullifier_registry {
    use super::*;

    /// Mark a nullifier as used (called before decompression)
    /// This prevents double-spending by ensuring each nullifier can only be used once
    pub fn mark_nullifier_used(
        ctx: Context<MarkNullifierUsed>,
        nullifier: [u8; 32], // 32-byte nullifier hash
        signature: Option<String>, // Optional transaction signature for tracking
    ) -> Result<()> {
        let nullifier_account = &mut ctx.accounts.nullifier_account;
        
        // Check if nullifier is already used
        require!(
            !nullifier_account.is_used,
            NullifierError::NullifierAlreadyUsed
        );
        
        // Mark as used
        nullifier_account.is_used = true;
        nullifier_account.used_at = Clock::get()?.unix_timestamp;
        nullifier_account.claimer = ctx.accounts.claimer.key();
        
        // Store optional signature (truncated to fit in account)
        if let Some(sig) = signature {
            let sig_bytes = sig.as_bytes();
            let len = sig_bytes.len().min(64); // Max 64 bytes
            nullifier_account.claim_signature[..len].copy_from_slice(&sig_bytes[..len]);
            nullifier_account.signature_len = len as u8;
        }
        
        msg!("Nullifier marked as used");
        
        Ok(())
    }

    /// Verify that a nullifier is NOT used (called before allowing decompression)
    /// This is a read-only check that can be used in CPI contexts
    pub fn verify_nullifier_unused(
        ctx: Context<VerifyNullifierUnused>,
    ) -> Result<()> {
        let nullifier_account = &ctx.accounts.nullifier_account;
        
        require!(
            !nullifier_account.is_used,
            NullifierError::NullifierAlreadyUsed
        );
        
        Ok(())
    }

    /// Initialize a nullifier account (optional, can be created on-demand)
    pub fn initialize_nullifier(
        ctx: Context<InitializeNullifier>,
        nullifier: [u8; 32],
    ) -> Result<()> {
        let nullifier_account = &mut ctx.accounts.nullifier_account;
        nullifier_account.nullifier = nullifier;
        nullifier_account.is_used = false;
        nullifier_account.claimer = Pubkey::default();
        nullifier_account.used_at = 0;
        nullifier_account.signature_len = 0;
        
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nullifier: [u8; 32])]
pub struct MarkNullifierUsed<'info> {
    #[account(
        init_if_needed,
        payer = claimer,
        space = 8 + NullifierAccount::LEN,
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,
    
    /// The account claiming the drop (must sign)
    #[account(mut)]
    pub claimer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyNullifierUnused<'info> {
    /// PDA account for the nullifier
    #[account(
        seeds = [b"nullifier", nullifier_account.nullifier.as_ref()],
        bump = nullifier_account.bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,
}

#[derive(Accounts)]
#[instruction(nullifier: [u8; 32])]
pub struct InitializeNullifier<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + NullifierAccount::LEN,
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NullifierAccount {
    /// The nullifier hash (32 bytes)
    pub nullifier: [u8; 32],
    
    /// Whether this nullifier has been used
    pub is_used: bool,
    
    /// The account that claimed this nullifier
    pub claimer: Pubkey,
    
    /// Unix timestamp when nullifier was used
    pub used_at: i64,
    
    /// Transaction signature (truncated, max 64 bytes)
    pub claim_signature: [u8; 64],
    
    /// Length of signature stored
    pub signature_len: u8,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl NullifierAccount {
    pub const LEN: usize = 32 + // nullifier
                           1 +  // is_used
                           32 + // claimer
                           8 +  // used_at
                           64 + // claim_signature
                           1 +  // signature_len
                           1;   // bump
}

#[error_code]
pub enum NullifierError {
    #[msg("This nullifier has already been used")]
    NullifierAlreadyUsed,
}

