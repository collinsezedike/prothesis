use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROMOTION_SEED, TREASURY_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Promotion, Status},
};

#[derive(Accounts)]
pub struct ResolvePromotion<'info> {
    // Any council member can resolve the promotion
    #[account(mut)]
    pub council_signer: Signer<'info>,

    /// CHECK: Safe because `aspirant` is verified via the linked Member and Promotion accounts.
    #[account(mut)]
    pub aspirant: UncheckedAccount<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        close = treasury, // Rent goes to the treasury as a small contribution from the aspirant.
        seeds = [PROMOTION_SEED, promotion.member.as_ref(), dao_config.key().as_ref()],
        bump = promotion.bump
    )]
    pub promotion: Account<'info, Promotion>,

    #[account(
        mut,
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

    #[account(
        mut,
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump = dao_config.treasury_bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ResolvePromotion<'info> {
    pub fn resolve_promotion(&mut self) -> Result<()> {
        match self.promotion.status {
            Status::Approved => {
                self.council_member.is_council = 1;
                self.dao_config.council_count += 1;
            }
            Status::Dismissed | Status::Expired => {} // Do nothing, just close the account
            Status::Pending => return Err(ProthesisError::CannotResolveBeforeReview.into()),
        };

        Ok(())
    }
}
