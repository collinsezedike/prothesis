use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, Status},
};

#[derive(Accounts)]
pub struct ReviewProposal<'info> {
    // Anybody can review the proposal, not just the author or council members
    #[account(mut)]
    pub reviewer: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump,
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, proposal.title.as_bytes().as_ref(), dao_config.key().as_ref()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        seeds = [MEMBER_SEED, reviewer.key().as_ref(), dao_config.key().as_ref()],
        bump = reviewer_member.bump
    )]
    pub reviewer_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> ReviewProposal<'info> {
    pub fn review_proposal(&mut self) -> Result<()> {
        // Require proposal to be unreviewed
        require!(
            self.proposal.status == Status::Pending,
            ProthesisError::AlreadyReviewed
        );

        let vote_threshold =
            (self.dao_config.consensus_pct as u64 * self.dao_config.members_count) / 10_000;

        // Check if upvotes have crossed the threshold
        if self.proposal.upvotes >= vote_threshold {
            self.proposal.status = Status::Approved
        }

        // Check if downvotes have crossed the threshold
        if self.proposal.downvotes >= vote_threshold {
            self.proposal.status = Status::Dismissed
        }

        // Check if proposal has passed the expiry time
        let time_elasped = (Clock::get()?.unix_timestamp - self.proposal.created_at);
        if time_elasped >= self.dao_config.consensus_lifetime {
            self.proposal.status = Status::Expired
        }

        Ok(())
    }
}
