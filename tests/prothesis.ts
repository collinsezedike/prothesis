import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Prothesis } from "../target/types/prothesis";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

import { generateSigner, getDAOConfigPDA, getDAOTreasury, getMemberAccount, getProposalPDA, getRoleOpPDA, getRoleOpVotePDA, } from "./helpers";


describe("prothesis", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.prothesis as Program<Prothesis>;

  // Test wallets
  let creator: Keypair;
  let person1: Keypair;
  let person2: Keypair;
  let person3: Keypair;
  let nonMember: Keypair;

  // DAO parameters
  const daoId = new anchor.BN(Math.floor(Math.random() * 10_000_000_000));
  const consensusPct = 5100; // 51%
  const consensusLifetime = new anchor.BN(604800); // 7 days in seconds

  // PDAs
  let daoConfigPDA: PublicKey;
  let treasuryPDA: PublicKey;

  let creatorMemberAccount: PublicKey;
  let person1MemberAccount: PublicKey;
  let person2MemberAccount: PublicKey;
  let person3MemberAccount: PublicKey;

  let promotionRoleOpPDA: PublicKey;
  let demotionRoleOpPDA: PublicKey;
  let removalRoleOpPDA: PublicKey;

  let proposalPDA: PublicKey;
  let proposalVotePDA: PublicKey;

  // Proposal parameters
  const proposalTitle = "Test Proposal";
  const proposalContent = "This is a test proposal for the DAO";

  before(async () => {
    // Generate Signers
    creator = await generateSigner(provider);
    person1 = await generateSigner(provider);
    person2 = await generateSigner(provider);
    person3 = await generateSigner(provider);
    nonMember = await generateSigner(provider);

    // Derive PDAs
    daoConfigPDA = await getDAOConfigPDA(daoId);
    treasuryPDA = getDAOTreasury(daoConfigPDA);
    creatorMemberAccount = getMemberAccount(creator.publicKey, daoConfigPDA);
    person1MemberAccount = getMemberAccount(person1.publicKey, daoConfigPDA);
    person2MemberAccount = getMemberAccount(person2.publicKey, daoConfigPDA);
    person3MemberAccount = getMemberAccount(person3.publicKey, daoConfigPDA);
  });

  describe("DAO Initialization and Membership", () => {
    it("Should initialize a new DAO", async () => {
      const tx = await program.methods
        .initializeDao(daoId, consensusPct, consensusLifetime)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          creator: creator.publicKey,
          member: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify DAO config was created
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.id.toString()).to.equal(daoId.toString());
      expect(daoConfig.consensusPct).to.equal(consensusPct);
      expect(daoConfig.consensusLifetime.toString()).to.equal(consensusLifetime.toString());
      expect(daoConfig.membersCount.toString()).to.equal("1"); // creator is the first member
      expect(daoConfig.councilCount.toString()).to.equal("1"); // creator is a council member

      const memberAccount = await program.account.member.fetch(creatorMemberAccount);
      expect(memberAccount.isCouncil).to.equal(true);
    });

    it("Should fund the DAO treasury", async () => {
      const fundAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);

      await program.methods
        .fundDao(fundAmount)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          patron: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(fundAmount.toNumber());
    });

    it("Should add a new member", async () => {
      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person1.publicKey,
          newMember: person1MemberAccount,
          councilMember: creatorMemberAccount,
          councilSigner: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person1])
        .rpc();

      // Verify member was added
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.owner.toString()).to.equal(person1.publicKey.toString());
      expect(memberAccount.isCouncil).to.equal(false);

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("2");
      expect(daoConfig.councilCount.toString()).to.equal("1");
    });

    it("Should add another member", async () => {
      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person2.publicKey,
          newMember: person2MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person2])
        .rpc();

      // Verify member was added
      const memberAccount = await program.account.member.fetch(person2MemberAccount);
      expect(memberAccount.owner.toString()).to.equal(person2.publicKey.toString());

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("3");
    });

    it("Should add a third member", async () => {
      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person3.publicKey,
          newMember: person3MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person3])
        .rpc();

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("4");
    });
  });

  describe("Role Operations", () => {
    before(async () => {
      promotionRoleOpPDA = getRoleOpPDA("promotion", person1MemberAccount, daoConfigPDA);
      removalRoleOpPDA = getRoleOpPDA("removal", person1MemberAccount, daoConfigPDA)
      demotionRoleOpPDA = getRoleOpPDA("demotion", person1MemberAccount, daoConfigPDA)
    })

    it("Should initiate a promotion of a member", async () => {

      await program.methods
        .initiateRoleOp(Buffer.from("promotion"))
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: promotionRoleOpPDA,
          nominatedMember: person1MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(promotionRoleOpPDA);
      expect(roleOp.member.toString()).to.equal(person1MemberAccount.toString());
      expect(roleOp.seed.toString()).to.equal("promotion");
      expect("promoteToCouncil" in roleOp.opType).to.be.true;
      expect(roleOp.status.pending).to.not.be.undefined;
      expect(roleOp.upvotes.toString()).to.equal("0");
      expect(roleOp.downvotes.toString()).to.equal("0");
    });

    it("Should upvote on a promotion", async () => {
      const roleOpVotePDA = getRoleOpVotePDA(creatorMemberAccount, promotionRoleOpPDA);

      await program.methods
        .voteOnRoleOp(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: promotionRoleOpPDA,
          vote: roleOpVotePDA,
          voter: creator.publicKey,
          voterMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(roleOpVotePDA);
      expect("upvote" in vote.voteType).to.be.true;

      // Verify role op was updated
      const roleOp = await program.account.roleOp.fetch(promotionRoleOpPDA);
      expect(roleOp.upvotes.toString()).to.equal("1");
    });

    it("Should review a promotion", async () => {
      await program.methods
        .reviewRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: promotionRoleOpPDA,
          reviewer: creator.publicKey,
          reviewerMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op status was updated
      const roleOp = await program.account.roleOp.fetch(promotionRoleOpPDA);
      expect(roleOp.status.approved).to.not.be.undefined;
    });

    it("Should resolve an approved promotion", async () => {
      await program.methods
        .resolveRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          roleOp: promotionRoleOpPDA,
          nominatedMember: person1MemberAccount,
          resolver: creator.publicKey,
          resolverMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify member was promoted
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.isCouncil).to.equal(true);

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.councilCount.toString()).to.equal("2");
    });

    it("Should initiate a removal of a member", async () => {
      await program.methods
        .initiateRoleOp(Buffer.from("removal"))
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: removalRoleOpPDA,
          nominatedMember: person1MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(removalRoleOpPDA);
      expect(roleOp.member.toString()).to.equal(person1MemberAccount.toString());
      expect(roleOp.seed.toString()).to.equal("removal");
      expect("removeMember" in roleOp.opType).to.be.true;
      expect(roleOp.status.pending).to.not.be.undefined;
      expect(roleOp.upvotes.toString()).to.equal("0");
      expect(roleOp.downvotes.toString()).to.equal("0");
    });

    it("Should downvote on a removal", async () => {
      const roleOpVotePDA = getRoleOpVotePDA(person2MemberAccount, removalRoleOpPDA);

      await program.methods
        .voteOnRoleOp(0)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: removalRoleOpPDA,
          vote: roleOpVotePDA,
          voter: person2.publicKey,
          voterMember: person2MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person2])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(roleOpVotePDA);
      expect("downvote" in vote.voteType).to.be.true;

      // Verify role op was updated
      const roleOp = await program.account.roleOp.fetch(removalRoleOpPDA);
      expect(roleOp.downvotes.toString()).to.equal("1");
    });

    it("Should allow downvoting a removal from a different account", async () => {
      const roleOpVotePDA = getRoleOpVotePDA(person3MemberAccount, removalRoleOpPDA);

      await program.methods
        .voteOnRoleOp(0)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: removalRoleOpPDA,
          vote: roleOpVotePDA,
          voter: person3.publicKey,
          voterMember: person3MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person3])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(roleOpVotePDA);
      expect("downvote" in vote.voteType).to.be.true;

      // Verify role op was updated
      const roleOp = await program.account.roleOp.fetch(removalRoleOpPDA);
      expect(roleOp.downvotes.toString()).to.equal("2");
    });

    it("Should review a removal", async () => {
      await program.methods
        .reviewRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: removalRoleOpPDA,
          reviewer: person3.publicKey, // Anybody can review a removal, not just council members
          reviewerMember: person3MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person3])
        .rpc();

      // Verify role op status was updated
      const roleOp = await program.account.roleOp.fetch(removalRoleOpPDA);
      expect(roleOp.status.dismissed).to.not.be.undefined;
    });

    it("Should resolve a dismissed removal", async () => {
      await program.methods
        .resolveRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          roleOp: removalRoleOpPDA,
          nominatedMember: person1MemberAccount,
          resolver: person2.publicKey,   // Anybody can resolve a removal, not just council members
          resolverMember: person2MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person2])
        .rpc();

      // Verify member was promoted
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.isCouncil).to.equal(true);

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.councilCount.toString()).to.equal("2");
    });

    it("Should initiate a demotion for a member", async () => {
      demotionRoleOpPDA = getRoleOpPDA("demotion", person1MemberAccount, daoConfigPDA)

      await program.methods
        .initiateRoleOp(Buffer.from("demotion"))
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: demotionRoleOpPDA,
          nominatedMember: person1MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(demotionRoleOpPDA);
      expect(roleOp.member.toString()).to.equal(person1MemberAccount.toString());
      expect(roleOp.seed.toString()).to.equal("demotion");
      expect("demoteFromCouncil" in roleOp.opType).to.be.true;
      expect(roleOp.status.pending).to.not.be.undefined;
      expect(roleOp.upvotes.toString()).to.equal("0");
      expect(roleOp.downvotes.toString()).to.equal("0");
    });

    it("Should review a demotion", async () => {
      // Wait for the demotion to expire

      await program.methods
        .reviewRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: demotionRoleOpPDA,
          reviewer: creator.publicKey,
          reviewerMember: person3MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person3])
        .rpc();

      // Verify role op status was updated
      const roleOp = await program.account.roleOp.fetch(demotionRoleOpPDA);
      expect(roleOp.status.expired).to.not.be.undefined;
    });

    it("Should resolve an expired demotion", async () => {
      await program.methods
        .resolveRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          roleOp: demotionRoleOpPDA,
          nominatedMember: person1MemberAccount,
          resolver: creator.publicKey,
          resolverMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify member was not demoted
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.isCouncil).to.equal(true);

      // Verify DAO config was not updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.councilCount.toString()).to.equal("2");
    });
  });

  describe("Proposals", () => {
    it("Should submit a proposal", async () => {
      // Derive proposal PDA
      proposalPDA = getProposalPDA(proposalTitle, daoConfigPDA)

      await program.methods
        .submitProposal(proposalTitle, proposalContent, treasuryPDA)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          author: person1.publicKey,
          member: person1MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person1])
        .rpc();

      // Verify proposal was created
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.title).to.equal(proposalTitle);
      expect(proposal.content).to.equal(proposalContent);
      expect(proposal.author.toString()).to.equal(person1.publicKey.toString());
      expect(proposal.treasury.toString()).to.equal(treasuryPDA.toString());
      expect(proposal.status.pending).to.not.be.undefined;
      expect(proposal.upvotes.toString()).to.equal("1"); // Submitter's vote
    });

    it("Should vote on a proposal", async () => {
      // Derive vote PDA
      [proposalVotePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal_vote"),
          proposalPDA.toBuffer(),
          creator.publicKey.toBuffer()
        ],
        program.programId
      );

      await program.methods
        .voteOnProposal(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          vote: proposalVotePDA,
          voter: creator.publicKey,
          voterMember: getMemberAccount(creator, daoConfigPDA.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(proposalVotePDA);
      expect(vote.voter.toString()).to.equal(creator.publicKey.toString());
      expect(vote.voteType).to.equal(1); // Upvote

      // Verify proposal was updated
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.upvotes.toString()).to.equal("2");
    });

    it("Should review a proposal", async () => {
      // Have person3 vote as well to reach consensus
      const person3VotePDA = await createVoteAccount(person3, proposalPDA, "proposal_vote", 1);

      // Review the proposal
      await program.methods
        .reviewProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          reviewer: creator.publicKey,
          member: creatorMemberAccount,
          systemProgram: SystemProgram.programId
        })
        .signers([creator])
        .rpc();

      // Verify proposal status was updated
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.status.approved).to.not.be.undefined;
    });

    it("Should resolve an approved proposal", async () => {
      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);
      const person1BalanceBefore = await provider.connection.getBalance(person1.publicKey);

      await program.methods
        .resolveProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          treasury: treasuryPDA,
          beneficiary: person1.publicKey,
          resolver: creator.publicKey,
          resolverMember: getMemberAccount(creator, daoConfigPDA.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify proposal was resolved (funds transferred)
      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);
      const person1BalanceAfter = await provider.connection.getBalance(person1.publicKey);

      // The proposal doesn't specify an amount, so we can't verify exact transfer
      // But we can verify that treasury balance decreased and person1 balance increased
      expect(treasuryBalanceAfter).to.be.lessThan(treasuryBalanceBefore);
      expect(person1BalanceAfter).to.be.greaterThan(person1BalanceBefore);
    });
  });

  describe("Member Exit", () => {
    it("Should allow a member to exit the DAO", async () => {
      const membersCountBefore = (await program.account.daoConfig.fetch(daoConfigPDA)).membersCount;

      await program.methods
        .exitDao()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          member: person3MemberAccount,
          owner: person3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([person3])
        .rpc();

      // Verify member count was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal(membersCountBefore.subn(1).toString());

      // Verify member account was closed
      try {
        await program.account.member.fetch(person3MemberAccount);
        expect.fail("Member account should be closed");
      } catch (error) {
        expect(error.toString()).to.include("Account does not exist");
      }
    });
  });

  async function createRoleOpAccount(targetOwner: PublicKey, opType: number): Promise<PublicKey> {
    const targetMemberAccount = getMemberAccount(targetOwner, daoConfigPDA);
    const [roleOpPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("role operation"),
        targetOwner.toBuffer(),
        daoConfigPDA.toBuffer(),
        Buffer.from([opType])
      ],
      program.programId
    );
    return roleOpPDA;
  }

  async function createVoteAccount(
    voter: Keypair,
    targetPDA: PublicKey,
    voteType: string,
    vote: number
  ): Promise<PublicKey> {
    const [votePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(voteType),
        targetPDA.toBuffer(),
        voter.publicKey.toBuffer()
      ],
      program.programId
    );

    if (voteType === "role_op_vote") {
      await program.methods
        .voteOnRoleOp(vote)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: targetPDA,
          vote: votePDA,
          voter: voter.publicKey,
          voterMember: getMemberAccount(voter, daoConfigPDA.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();
    } else if (voteType === "proposal_vote") {
      await program.methods
        .voteOnProposal(vote)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: targetPDA,
          vote: votePDA,
          voter: voter.publicKey,
          voterMember: getMemberAccount(voter, daoConfigPDA.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();
    }

    return votePDA;
  }
});