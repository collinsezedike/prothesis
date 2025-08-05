use anchor_lang::prelude::*;

use crate::{
    error::ProthesisError,
    state::{DAOConfig, Proposal, ProposalStatus},
};

#[derive(Accounts)]
#[instruction(title: String)]
pub struct SubmitProposal<'info> {
    #[account(mut)]
    pub author: Signer<'info>,

    #[account(
        seeds = [b"dao", dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump,
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        init,
        payer = author,
        seeds = [b"proposal", title.as_bytes().as_ref(), dao_config.key().as_ref()],
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
        bumps: &SubmitProposalBumps,
    ) -> Result<()> {
        require!(title.len() <= 64, ProthesisError::TitleTooLong);
        require!(content.len() <= 2048, ProthesisError::ContentTooLong);

        self.proposal.set_inner(Proposal {
            author: self.author.key(),
            title,
            content,
            upvotes: 0,
            downvotes: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: ProposalStatus::Pending,

            bump: bumps.proposal,
        });

        Ok(())
    }
}
