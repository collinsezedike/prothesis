use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, TREASURY_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member},
};

#[derive(Accounts)]
pub struct ExitDao<'info> {
    #[account(mut)]
    pub exiter: Signer<'info>,

    #[account(
        mut,
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        close = treasury,
        seeds = [MEMBER_SEED, exiter.key().as_ref(), dao_config.key().as_ref()],
        bump = exiting_member.bump
    )]
    pub exiting_member: Account<'info, Member>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump = dao_config.treasury_bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ExitDao<'info> {
    pub fn exit_dao(&mut self) -> Result<()> {
        if self.exiting_member.is_council {
            self.dao_config.council_count = self
                .dao_config
                .council_count
                .checked_sub(1)
                .ok_or(ProthesisError::CountOutOfRange)?;
        }

        self.dao_config.members_count = self
            .dao_config
            .members_count
            .checked_sub(1)
            .ok_or(ProthesisError::CountOutOfRange)?;

        Ok(())
    }
}
