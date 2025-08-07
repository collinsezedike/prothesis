use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROMOTION_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Promotion, Status},
};

#[derive(Accounts)]
pub struct InitiatePromotion<'info> {
    #[account(mut)]
    pub council_signer: Signer<'info>,

    #[account(mut)]
    pub aspirant: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        init,
        payer = aspirant,
        seeds = [PROMOTION_SEED, aspiring_council_member.key().as_ref(), dao_config.key().as_ref()],
        bump,
        space = Member::SPACE
    )]
    pub promotion: Account<'info, Promotion>,

    #[account(
        seeds = [MEMBER_SEED, aspirant.key().as_ref(), dao_config.key().as_ref()],
        bump = aspiring_council_member.bump,
    )]
    pub aspiring_council_member: Account<'info, Member>,

    #[account(
        seeds = [MEMBER_SEED, council_signer.key().as_ref(), dao_config.key().as_ref()],
        bump = council_member.bump,
        constraint = council_member.is_council == 1 @ ProthesisError::NotCouncilMember
    )]
    pub council_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitiatePromotion<'info> {
    pub fn initiate_promotion(&mut self, bumps: &InitiatePromotionBumps) -> Result<()> {
        self.promotion.set_inner(Promotion {
            member: self.aspiring_council_member.key(),
            upvotes: 0,
            downvotes: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: Status::Pending,
            bump: bumps.promotion,
        });

        Ok(())
    }
}
