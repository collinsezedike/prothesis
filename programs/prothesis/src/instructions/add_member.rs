use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member},
};

#[derive(Accounts)]
pub struct AddMember<'info> {
    #[account(mut)]
    pub council_signer: Signer<'info>,

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
    pub new_member: Account<'info, Member>,

    #[account(
        seeds = [MEMBER_SEED, council_signer.key().as_ref(), dao_config.key().as_ref()],
        bump = council_member.bump,
        constraint = council_member.is_council @ ProthesisError::NotCouncilMember
    )]
    pub council_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> AddMember<'info> {
    pub fn add_member(&mut self, bumps: &AddMemberBumps) -> Result<()> {
        self.new_member.set_inner(Member {
            owner: self.aspirant.key(),
            is_council: false,
            joined_at: Clock::get()?.unix_timestamp,
            bump: bumps.new_member,
        });

        self.dao_config.members_count = self
            .dao_config
            .members_count
            .checked_add(1)
            .ok_or(ProthesisError::CountOutOfRange)?;

        Ok(())
    }
}
