use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, ProposalStatus},
};

#[derive(Accounts)]
pub struct ResolveProposal<'info> {
    // Anybody can resolve the proposal, not just the author or council members
    #[account(mut)]
    pub resolver: Signer<'info>,

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
        seeds = [MEMBER_SEED, resolver.key().as_ref(), dao_config.key().as_ref()],
        bump = member.bump
    )]
    pub member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> ResolveProposal<'info> {
    pub fn resolve_proposal(&mut self) -> Result<()> {
        // Require proposal to be uresolved
        require!(
            self.proposal.status == ProposalStatus::Pending,
            ProthesisError::ProposalAlreadyResolved
        );

        let vote_threshold =
            (self.dao_config.vote_pct as u64 * self.dao_config.members_count) / 10_000;

        // Check if upvotes have crossed the threshold
        if self.proposal.upvotes >= vote_threshold {
            self.proposal.status = ProposalStatus::Approved
        }

        // Check if downvotes have crossed the threshold
        if self.proposal.downvotes >= vote_threshold {
            self.proposal.status = ProposalStatus::Dismissed
        }

        // Check if proposal have crossed the expiry time
        let time_elasped = (Clock::get()?.unix_timestamp - self.proposal.created_at) / 86400;
        if time_elasped >= self.dao_config.proposal_lifetime {
            self.proposal.status = ProposalStatus::Expired
        }

        Ok(())
    }
}
