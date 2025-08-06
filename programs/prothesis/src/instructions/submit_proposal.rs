use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, Status},
};

#[derive(Accounts)]
#[instruction(title: String)]
pub struct SubmitProposal<'info> {
    #[account(mut)]
    pub author: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump,
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        seeds = [MEMBER_SEED, author.key().as_ref(), dao_config.key().as_ref()],
        bump = member.bump
    )]
    pub member: Account<'info, Member>,

    #[account(
        init,
        payer = author,
        seeds = [PROPOSAL_SEED, title.as_bytes().as_ref(), dao_config.key().as_ref()],
        bump,
        space = Proposal::SPACE
    )]
    pub proposal: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

impl<'info> SubmitProposal<'info> {
    pub fn submit_proposal(
        &mut self,
        title: String,
        content: String,
        treasury: Pubkey,
        bumps: &SubmitProposalBumps,
    ) -> Result<()> {
        require!(title.len() <= 64, ProthesisError::TitleTooLong);
        require!(content.len() <= 2048, ProthesisError::ContentTooLong);

        self.proposal.set_inner(Proposal {
            author: self.member.key(),
            title,
            content,
            treasury,
            upvotes: 0,
            downvotes: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: Status::Pending,

            bump: bumps.proposal,
        });

        Ok(())
    }
}
