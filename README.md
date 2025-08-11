# Prothesis DAO Smart Contract

Welcome to **Prothesis**, a phased governance DAO smart contract built on Solana using Anchor. This project implements a decentralized autonomous organization (DAO) with streamlined proposal lifecycle management, council-controlled membership, and secure multisig funding approvals.

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

1. **Prerequisites**  
   - Rust and Cargo (with latest stable version)  
   - Solana CLI (for localnet and cluster interaction)  
   - Anchor CLI  

2. **Clone the repo**  
```bash
git clone https://github.com/yourusername/prothesis.git
cd prothesis
