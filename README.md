# Symbiotic Syntheconomy v1.0 - Global Regeneration Ceremony (GRC)

A decentralized simulation platform for bioregional ritual submission and validation, featuring AI-powered cultural authenticity filters and blockchain-based governance.

## 🏗️ Architecture

- **Backend**: Node.js v23.6.0 + TypeScript (Fastify)
- **Frontend**: Next.js 15 with TypeScript
- **Smart Contracts**: Solidity on Base testnet (Hardhat)
- **Database**: MongoDB Atlas + Azure Functions
- **Storage**: IPFS for ritual metadata
- **AI Filters**: ESEP (Ethical-Spiritual Evaluation Protocol) + CEDA (Cultural Expression Detection Algorithm)

## 🎯 Objectives

1. Simulate 3 bioregions submitting regeneration rituals
2. Validate rituals using ESEP (max 0.7 skew) and CEDA (min 2 cultural references)
3. Store ritual metadata on IPFS and log transactions to Base testnet
4. Run DAO-based CHC (Cultural Heritage Council) elections and narrative engine

## 🚀 Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Build all components
npm run build

# Deploy smart contracts
npm run deploy:contracts
```

## 📁 Project Structure

```
├── backend/           # Fastify API server
├── frontend/          # Next.js web application
├── contracts/         # Solidity smart contracts
├── schemas/           # Project requirements and schemas
└── docs/             # Documentation
```

## 🔧 Development

### Backend (Fastify)

- Ritual submission endpoint
- AI filter integration (ESEP, CEDA)
- IPFS metadata storage
- MongoDB integration

### Frontend (Next.js)

- Ritual submission form (.grc files)
- Real-time validation feedback
- Bioregion selection interface
- DAO governance dashboard

### Smart Contracts (Base testnet)

- `GRC_RitualSubmission.sol`: Ritual submission logging
- `SymbiosisPledge.sol`: Bioregional commitment tracking

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test specific components
npm run test:backend
npm run test:frontend
npm run test:contracts
```

## 📋 Requirements

- Node.js v23.6.0+
- MongoDB Atlas account
- Base testnet wallet
- IPFS node access

## 🤝 Contributing

This project follows the Symbiotic Syntheconomy principles of regenerative collaboration and cultural authenticity.

## 📄 License

MIT License - See LICENSE file for details.

---

**Lead Developer**: Valtid Caushi
**Version**: 1.0.0
**Status**: Development
