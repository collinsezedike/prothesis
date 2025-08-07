use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROMOTION_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Promotion},
};

#[derive(Accounts)]
pub struct VoteOnPromotion<'info> {
    #[account(mut)]
    pub council_signer: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [PROMOTION_SEED, promotion.member.as_ref(), dao_config.key().as_ref()],
        bump = promotion.bump
    )]
    pub promotion: Account<'info, Promotion>,

    #[account(
        seeds = [MEMBER_SEED, council_signer.key().as_ref(), dao_config.key().as_ref()],
        bump = council_member.bump,
        constraint = council_member.is_council == 1 @ ProthesisError::NotCouncilMember
    )]
    pub council_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> VoteOnPromotion<'info> {
    pub fn vote_on_promotion(&mut self, vote: u8) -> Result<()> {
        match vote {
            0 => self.promotion.downvotes += 1,
            1 => self.promotion.upvotes += 1,
            _ => return Err(ProthesisError::InvalidVoteType.into()),
        };

        Ok(())
    }
}
