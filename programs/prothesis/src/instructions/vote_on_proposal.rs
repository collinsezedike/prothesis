use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, PROPOSAL_SEED, VOTE_SEED},
    error::ProthesisError,
    state::{DAOConfig, Proposal, ProposalStatus, Vote, VoteType},
};

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

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
        init,
        payer = voter,
        seeds = [VOTE_SEED, voter.key().as_ref(), proposal.key().as_ref()],
        bump,
        space = Vote::SPACE
    )]
    pub vote: Account<'info, Vote>,

    pub system_program: Program<'info, System>,
}

impl<'info> VoteOnProposal<'info> {
    pub fn vote_on_proposal(&mut self, vote: u8) -> Result<()> {
            require!(
        self.proposal.status == ProposalStatus::Pending,
        ProthesisError::ProposalNotPending
    );
    
        self.vote.vote_type = match vote {
            0 => VoteType::Downvote,
            1 => VoteType::Upvote,
            _ => return Err(ProthesisError::InvalidVoteType.into()),
        };

        match self.vote.vote_type {
            VoteType::Downvote => self.proposal.downvotes += 1,
            VoteType::Upvote => self.proposal.upvotes += 1,
        }

        Ok(())
    }
}
