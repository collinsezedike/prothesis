use anchor_lang::prelude::*;

use crate::{constants::DAO_CONFIG_SEED, state::DAOConfig};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct InitializeDAO<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        seeds = [DAO_CONFIG_SEED, id.to_le_bytes().as_ref()],
        bump,
        space = DAOConfig::SPACE
    )]
    pub dao_config: Account<'info, DAOConfig>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeDAO<'info> {
    pub fn initialize_dao(
        &mut self,
        id: u64,
        authority: Option<Pubkey>,
        vote_pct: u16,
        min_sig_pct: u16,
        proposal_lifetime: i64,
        bumps: &InitializeDAOBumps,
    ) -> Result<()> {
        self.dao_config.set_inner(DAOConfig {
            id,
            authority,
            vote_pct,
            min_sig_pct,
            proposal_lifetime,
            bump: bumps.dao_config,
        });

        Ok(())
    }
}
