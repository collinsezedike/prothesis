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
    pub fn resolve_proposal(&mut self, remaining_accounts: Vec<AccountInfo>) -> Result<()> {
        match self.proposal.status {
            Status::Approved => {
                self.check_signers(remaining_accounts)?;
                self.transfer_funds()?;
            }
            Status::Dismissed | Status::Expired => {} // Do nothing, just close the account
            Status::Pending => return Err(ProthesisError::CannotResolveBeforeReview.into()),
        };

        Ok(())
    }

    pub fn check_signers(&self, remaining_accounts: Vec<AccountInfo>) -> Result<()> {
        // If the resolver member itself is already a council member, that's enough
        let mut found_council_member = self.resolver_member.is_council;
        let mut signers_count: u64 = 1; // resolver_member counts as one signer

        // Collect all signer public keys from the remaining accounts (the actual keypair signers)
        let signer_pubkeys: Vec<Pubkey> = remaining_accounts
            .iter()
            .filter(|acct_info| acct_info.is_signer)
            .map(|acct_info| *acct_info.key)
            .collect();

        // Iterate through all remaining accounts to find Member accounts
        for acct_info in remaining_accounts.iter() {
            // Try to deserialize as Member
            if let Ok(data) = acct_info.try_borrow_data() {
                if let Ok(member) = Member::try_deserialize(&mut &data[..]) {
                    // Check if this member's owner is one of the signer keys
                    if signer_pubkeys.contains(&member.owner) {
                        signers_count = signers_count
                            .checked_add(1)
                            .ok_or(ProthesisError::CountOutOfRange)?;

                        // Check if this member is council
                        if member.is_council {
                            found_council_member = true;
                        }

                        // Break early if conditions met
                        if found_council_member
                            && signers_count >= self.dao_config.min_multisig_signers
                        {
                            break;
                        }
                    }
                }
            }
        }

        require!(found_council_member, ProthesisError::NoCouncilMemberSigned);
        require!(
            signers_count >= self.dao_config.min_multisig_signers,
            ProthesisError::InsufficientMultisigSigners
        );

        Ok(())
    }
    pub fn transfer_funds(&mut self) -> Result<()> {
        require!(
            self.dao_treasury.to_account_info().lamports() > self.proposal.amount_required,
            ProthesisError::InsufficientTreasuryBalance
        );

        require!(
            self.proposal_treasury.key() == self.proposal.treasury.key(),
            ProthesisError::MismatchedTreasuryAccount
        );

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer {
            from: self.dao_treasury.to_account_info(),
            to: self.proposal_treasury.to_account_info(),
        };

        let dao_config = self.dao_config.key();

        let seeds: &[&[&[u8]]] = &[&[
            TREASURY_SEED,
            &dao_config.as_ref(),
            &[self.dao_config.treasury_bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, seeds);

        transfer(cpi_ctx, self.proposal.amount_required)
    }
}
