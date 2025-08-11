use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, PROPOSAL_SEED, TREASURY_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, Proposal, Status},
};

#[derive(Accounts)]
pub struct ResolveProposal<'info> {
    // Anybody can resolve the proposal, not just the author or council members
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        seeds = [MEMBER_SEED, resolver.key().as_ref(), dao_config.key().as_ref()],
        bump = resolver_member.bump
    )]
    pub resolver_member: Account<'info, Member>,

    #[account(
        mut,
        seeds = [PROPOSAL_SEED, proposal.title.as_bytes().as_ref(), dao_config.key().as_ref()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump,
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump = dao_config.treasury_bump
    )]
    pub dao_treasury: SystemAccount<'info>,

    /// CHECK: This is validated with the treasury field in the proposal struct
    #[account(mut)]
    pub proposal_treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ResolveProposal<'info> {
    pub fn resolve_proposal(&mut self) -> Result<()> {
        match self.proposal.status {
            Status::Approved => {
                require!(
                    self.dao_treasury.to_account_info().lamports() > self.proposal.amount_required,
                    ProthesisError::InsufficientTreasuryBalance
                );

                require!(
                    self.proposal_treasury.key() == self.proposal.treasury.key(),
                    ProthesisError::MismatchedTreasuryAccount
                );

                let seeds: &[&[&[u8]]] = &[&[
                    TREASURY_SEED,
                    &self.dao_config.id.to_le_bytes(),
                    &[self.dao_config.bump],
                ]];

                let cpi_program = self.system_program.to_account_info();

                let cpi_accounts = Transfer {
                    from: self.dao_treasury.to_account_info(),
                    to: self.proposal_treasury.to_account_info(),
                };

                let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds);

                transfer(cpi_ctx, self.proposal.amount_required)?;
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
