use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, TREASURY_SEED},
    state::{DAOConfig, Member},
};

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

    #[account(
        init,
        payer = creator,
        seeds = [MEMBER_SEED, creator.key().as_ref(), dao_config.key().as_ref()],
        bump,
        space = Member::SPACE
    )]
    pub member: Account<'info, Member>,

    #[account(
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeDAO<'info> {
    pub fn initialize_dao(
        &mut self,
        id: u64,
        consensus_pct: u16,
        consensus_lifetime: i64,
        bumps: &InitializeDAOBumps,
    ) -> Result<()> {
        // Initialize DAO Config
        self.dao_config.set_inner(DAOConfig {
            id,
            consensus_pct,
            consensus_lifetime,
            members_count: 0,
            council_count: 1,
            bump: bumps.dao_config,
            treasury_bump: bumps.treasury,
        });

        // Initialize creator as a council member
        self.member.set_inner(Member {
            owner: self.creator.key(),
            is_council: 1,
            joined_at: Clock::get()?.unix_timestamp,
            bump: bumps.member,
        });

        Ok(())
    }
}
