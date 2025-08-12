# Prothesis DAO Smart Contract

> **⚠️ EXPERIMENTAL BRANCH**: This branch contains experimental features including NFT minting for approved proposals, lazy account initialization to save compute units, and DAO configuration updates via community consensus. These features are under development and not yet recommended for production use.

Welcome to **Prothesis**, a phased governance DAO smart contract built on Solana using Anchor. This project implements a decentralized autonomous organization (DAO) with streamlined proposal lifecycle management, council-controlled membership, and secure multisig funding approvals.

---

## Experimental Features

This experimental branch includes the following enhancements:

1. **NFT Minting for Approved Proposals**: When a proposal is successfully approved and resolved, an NFT is automatically minted to commemorate the proposal. This NFT serves as a permanent record on the blockchain and can be used for historical tracking and recognition.

2. **Lazy Account Initialization**: To optimize compute unit usage and reduce transaction costs, accounts are now initialized lazily (only when needed). This approach significantly reduces the computational overhead of the program.

3. **DAO Configuration Updates via Consensus**: The DAO configuration can now be updated after deployment through a community consensus process, allowing for more flexible governance as the DAO evolves.

---

## Table of Contents

- [Overview](#overview)  
- [Features](#features)  
- [Architecture](#architecture)  
- [Installation](#installation)  
- [Usage](#usage)  
- [Instructions](#instructions)  
- [Account Types](#account-types)  
- [Multisig Governance](#multisig-governance)  
- [Error Handling](#error-handling)  
- [Development](#development)  
- [Contributing](#contributing)  
- [License](#license)  

---

## Overview

Prothesis is a Solana program implementing a DAO with a single-phase proposal system. Proposals must reach a consensus threshold (e.g., 75% upvotes) within a time limit or are dismissed automatically. Approved proposals can be funded only via multisignature transactions requiring council member approvals. Upon funding, proposals are minted as NFTs to the DAO treasury as sponsorship badges.

Membership and council privileges govern key DAO actions such as adding members, promoting council members, and funding proposals — all secured by multisig consensus to ensure decentralized control.

---

## Features

- **Proposal Lifecycle**: Submit, vote, review, resolve, and fund proposals.  
- **Time-bound Proposals**: Proposals auto-expire after a configurable time limit.  
- **Unweighted, One-Vote-Per-Member Voting**: Votes are unweighted and each member votes once per proposal.  
- **Council Membership**: Only council members can add new members or promote peers.  
- **Multisig Funding**: Proposal funding requires multisig approvals by a configurable threshold of council members.  
- **NFT Sponsorship**: Funded proposals are minted as NFTs to the DAO treasury vault.  
- **Role-based Access Control**: DAO membership, council, and aspirants have clear privileges enforced in program logic.  
- **Consensus Thresholds**: Configurable percentage-based consensus thresholds for proposal approvals, council promotions, and multisig actions.  
- **Robust Error Handling**: Descriptive custom errors to facilitate debugging and safe operation.

---

## Architecture

The program uses **Anchor** framework patterns with strongly-typed accounts and instructions.

### Account Types

- `DaoConfig`: Stores DAO-wide config including consensus thresholds, council size, treasury accounts, and bump seeds.  
- `Member`: Represents DAO members, tracks council status and ownership.  
- `Proposal`: Stores proposal data, voting state, status, timestamps, and treasury references.  
- `RoleOp`: Tracks pending promotions, demotions, or removals of members/council with multisig votes.  
- `Treasury`: PDA account holding DAO funds for proposals and other expenses.

### Instruction Flow

- **Initialize DAO**: Set up DAO config, treasury, and admin.  
- **Add Member**: Add new member accounts; restricted to council members.  
- **Promote/Demote Council Members**: Initiate and resolve role operations requiring multisig consensus.  
- **Submit Proposal**: Members create detailed proposals linked to DAO.  
- **Vote Proposal**: Members cast unweighted up/down votes.  
- **Review Proposal**: Any user can resolve proposal status (approve/dismiss/expire) based on votes and time.  
- **Fund Proposal**: Council multisig approves funding; funds transfer from treasury to proposal treasury; mint NFT sponsorship.  
- **Exit DAO / Remove Member**: Members can leave; council can remove members.

---

## Installation

### Prerequisites

- **Rust and Cargo**
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup component add rustfmt clippy
  rustup target add bpfel-unknown-unknown
  ```

- **Solana CLI**
  ```bash
  sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
  ```
  Add Solana to your PATH as instructed by the installer.

- **Anchor CLI**
  ```bash
  cargo install --git https://github.com/coral-xyz/anchor avm --locked
  avm install latest
  avm use latest
  ```

- **Node.js and Yarn** (for client and tests)
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
  nvm install 16
  nvm use 16
  npm install -g yarn
  ```

### Clone and Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prothesis.git
   cd prothesis
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Build the program**
   ```bash
   anchor build
   ```

4. **Update Program ID**
   After building, update the program ID in `Anchor.toml` and `lib.rs` with the generated program ID:
   ```bash
   solana-keygen pubkey target/deploy/prothesis-keypair.json
   ```
   Then update the ID in the files mentioned above.

### Local Development Environment

1. **Start a local Solana validator**
   ```bash
   solana-test-validator
   ```

2. **Deploy to localnet**
   ```bash
   anchor deploy
   ```

3. **Run tests**
   ```bash
   anchor test
   ```

### Deployment to Devnet/Testnet/Mainnet

1. **Configure Solana CLI for the desired network**
   ```bash
   # For devnet
   solana config set --url https://api.devnet.solana.com
   
   # For testnet
   solana config set --url https://api.testnet.solana.com
   
   # For mainnet
   solana config set --url https://api.mainnet-beta.solana.com
   ```

2. **Create or import a keypair for deployment**
   ```bash
   solana-keygen new -o deployer.json
   ```
   Or import an existing keypair.

3. **Fund the deployer account (for devnet/testnet)**
   ```bash
   solana airdrop 2 $(solana-keygen pubkey deployer.json)
   ```

4. **Build and deploy**
   ```bash
   anchor build
   anchor deploy --provider.wallet deployer.json
   ```

---

## Usage

### Initializing a DAO

To initialize a new DAO, you need to:

1. Create a DAO configuration with appropriate thresholds
2. Set up the initial council member(s)
3. Initialize the treasury

Example using the Anchor client:

```typescript
// Initialize DAO with configuration
await program.methods.initializeDao({
  name: "My DAO",
  proposalThreshold: 75, // 75% approval needed
  roleOpThreshold: 60,   // 60% approval for role changes
  proposalDuration: 604800, // 1 week in seconds
})
.accounts({
  authority: adminWallet.publicKey,
  daoConfig: daoPDA,
  treasury: treasuryPDA,
  systemProgram: SystemProgram.programId,
})
.signers([adminWallet])
.rpc();
```

### Adding Members

Only council members can add new members:

```typescript
await program.methods.addMember(memberWallet.publicKey, "Member Name", false)
.accounts({
  authority: councilMemberWallet.publicKey,
  daoConfig: daoPDA,
  member: memberPDA,
  systemProgram: SystemProgram.programId,
})
.signers([councilMemberWallet])
.rpc();
```

### Submitting and Voting on Proposals

Members can submit proposals and vote on them:

```typescript
// Submit proposal
await program.methods.submitProposal(
  "Proposal Title",
  "Proposal Description",
  new BN(1000000000) // 1 SOL funding request
)
.accounts({
  authority: memberWallet.publicKey,
  member: memberPDA,
  daoConfig: daoPDA,
  proposal: proposalPDA,
  systemProgram: SystemProgram.programId,
})
.signers([memberWallet])
.rpc();

// Vote on proposal
await program.methods.voteOnProposal(true) // true for upvote
.accounts({
  authority: voterWallet.publicKey,
  member: voterMemberPDA,
  proposal: proposalPDA,
  vote: votePDA,
  systemProgram: SystemProgram.programId,
})
.signers([voterWallet])
.rpc();
```

For more detailed examples, refer to the test files in the `tests/` directory.

---

## Development

### Development Workflow

The Prothesis development workflow follows these steps:

1. **Feature Planning**: Define new features or improvements in issues
2. **Branch Creation**: Create feature branches from `main` using the naming convention `feature/feature-name`
3. **Implementation**: Develop the feature with appropriate tests
4. **Testing**: Run comprehensive tests to ensure functionality
5. **Code Review**: Submit a pull request for peer review
6. **Integration**: Merge approved changes into the `main` branch
7. **Deployment**: Deploy to testnet/devnet for further testing
8. **Release**: Tag stable versions for mainnet deployment

### Project Structure

```
prothesis/
├── Anchor.toml           # Anchor configuration
├── Cargo.toml            # Rust dependencies
├── programs/
│   └── prothesis/        # Main program code
│       ├── src/
│       │   ├── lib.rs    # Program entry point
│       │   ├── error.rs  # Custom error definitions
│       │   ├── state/    # Account structures
│       │   └── instructions/ # Program instructions
├── tests/                # Integration tests
├── migrations/           # Deployment scripts
└── app/                  # Client application (if applicable)
```

### Testing Strategy

The project employs a comprehensive testing strategy:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test complete workflows

Tests are categorized into:

- **Green Tests**: Happy path scenarios
- **Red Tests**: Error and edge cases

Run tests with:
```bash
anchor test
```

### Continuous Integration

The project uses GitHub Actions for CI/CD:

1. **Build Check**: Ensures the program builds successfully
2. **Test Suite**: Runs all tests
3. **Linting**: Checks code quality with Clippy and Rustfmt
4. **Security Scan**: Analyzes for potential vulnerabilities

### Versioning

The project follows Semantic Versioning (SemVer):

- **Major**: Breaking changes
- **Minor**: New features, non-breaking
- **Patch**: Bug fixes and minor improvements

---

## Contributing

We welcome contributions to Prothesis! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Submit a pull request

Please adhere to the coding standards and include appropriate tests.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.