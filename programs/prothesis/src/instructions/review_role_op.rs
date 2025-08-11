use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status},
};

#[derive(Accounts)]
pub struct ReviewRoleOp<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [role_op.seed.as_ref(), role_op.member.as_ref(), dao_config.key().as_ref()],
        bump = role_op.bump
    )]
    pub role_op: Account<'info, RoleOp>,

    #[account(
        seeds = [MEMBER_SEED, reviewer.key().as_ref(), dao_config.key().as_ref()],
        bump = reviewer_member.bump,
    )]
    pub reviewer_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> ReviewRoleOp<'info> {
    pub fn review_role_op(&mut self) -> Result<()> {
        // Require role operation to be unreviewed
        require!(
            self.role_op.status == Status::Pending,
            ProthesisError::AlreadyReviewed
        );

        // Account checks for the different role operations
        match self.role_op.op_type {
            RoleOpType::PromoteToCouncil | RoleOpType::DemoteFromCouncil => {
                require!(
                    self.reviewer_member.is_council,
                    ProthesisError::NotCouncilMember,
                ); // Only council members can review a promotion or demotion
            }
            RoleOpType::RemoveMember => {} // Do nothing, anybody can review a removal
        }

        let vote_threshold =
            (self.dao_config.consensus_pct as u64 * self.dao_config.council_count) / 10_000;

        // Check if upvotes have crossed the threshold
        if self.role_op.upvotes >= vote_threshold.max(1) {
            self.role_op.status = Status::Approved
        }

        // Check if downvotes have crossed the threshold
        if self.role_op.downvotes >= vote_threshold.max(1) {
            self.role_op.status = Status::Dismissed
        }

        // Check if role operation has passed the expiry time
        let time_elasped = (Clock::get()?.unix_timestamp - self.role_op.created_at);
        if time_elasped >= self.dao_config.consensus_lifetime {
            self.role_op.status = Status::Expired
        }

        Ok(())
    }
}
