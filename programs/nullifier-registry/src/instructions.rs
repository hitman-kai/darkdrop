use anchor_lang::prelude::*;
use crate::nullifier_registry;

/// Helper function to derive nullifier PDA
pub fn derive_nullifier_pda(
    program_id: &Pubkey,
    nullifier: &[u8; 32],
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"nullifier", nullifier.as_slice()],
        program_id,
    )
}

/// Helper function to create mark_nullifier_used instruction
pub fn create_mark_nullifier_used_instruction(
    program_id: &Pubkey,
    nullifier: [u8; 32],
    claimer: &Pubkey,
    signature: Option<String>,
) -> Instruction {
    let (nullifier_pda, _bump) = derive_nullifier_pda(program_id, &nullifier);
    
    let accounts = nullifier_registry::accounts::MarkNullifierUsed {
        nullifier_account: nullifier_pda,
        claimer: *claimer,
        system_program: anchor_lang::system_program::ID,
    };
    
    let ctx = CpiContext::new(program_id, accounts);
    
    nullifier_registry::instruction::MarkNullifierUsed {
        nullifier,
        signature,
    }
    .to_instruction()
}


