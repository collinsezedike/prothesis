use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, Status},
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
        match self.proposal.status {
            Status::Approved => {
                // Mint NFT
            }
            Status::Dismissed | Status::Expired => {} // Do nothing, just close the account
            Status::Pending => return Err(ProthesisError::CannotResolveBeforeReview.into()),
        };

        Ok(())
    }

    pub fn mint_nft(&mut self) -> Result<()> {
        Ok(())
    }
}
