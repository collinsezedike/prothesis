use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROMOTION_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Promotion, Status},
};

#[derive(Accounts)]
pub struct ReviewPromotion<'info> {
    // Any council member can review the promotion
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

impl<'info> ReviewPromotion<'info> {
    pub fn review_promotion(&mut self) -> Result<()> {
        // Require promotion to be unreviewed
        require!(
            self.promotion.status == Status::Pending,
            ProthesisError::AlreadyReviewed
        );

        let vote_threshold =
            (self.dao_config.consensus_pct as u64 * self.dao_config.council_count) / 10_000;

        // Check if upvotes have crossed the threshold
        if self.promotion.upvotes >= vote_threshold {
            self.promotion.status = Status::Approved
        }

        // Check if downvotes have crossed the threshold
        if self.promotion.downvotes >= vote_threshold {
            self.promotion.status = Status::Dismissed
        }

        // Check if promotion have crossed the expiry time
        let time_elasped = (Clock::get()?.unix_timestamp - self.promotion.created_at) / 86400;
        if time_elasped >= self.dao_config.consensus_lifetime {
            self.promotion.status = Status::Expired
        }

        Ok(())
    }
}
