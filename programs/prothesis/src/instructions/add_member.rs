use anchor_lang::prelude::*;

use crate::{constants::{DAO_CONFIG_SEED, MEMBER_SEED}, state::{DAOConfig, Member}};

#[derive(Accounts)]
pub struct AddMember<'info> {
    #[account(mut)]
    pub aspirant: Signer<'info>,

    #[account(
        mut,
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        init,
        payer = aspirant,
        seeds = [MEMBER_SEED, aspirant.key().as_ref(), dao_config.key().as_ref()], 
        bump,
        space = Member::SPACE
    )]
    pub member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddMember<'info> {
    pub fn add_member(&mut self, bumps: &AddMemberBumps) -> Result<()> {
        self.member.set_inner( Member {
            joined_at: Clock::get()?.unix_timestamp,
            bump: bumps.member
        });

        self.dao_config.members_count += 1;

        Ok(())
    }
}
