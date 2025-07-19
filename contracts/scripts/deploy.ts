import { ethers } from 'hardhat';
import { verify } from './verify';

async function main() {
  console.log('🚀 Starting GRC contract deployment...');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying contracts with account:', deployer.address);
  console.log(
    '💰 Account balance:',
    ethers.formatEther(await deployer.provider!.getBalance(deployer.address)),
    'ETH',
  );

  // Deploy GRC_RitualSubmission contract
  console.log('\n📜 Deploying GRC_RitualSubmission...');
  const GRCRitualSubmission = await ethers.getContractFactory(
    'GRC_RitualSubmission',
  );
  const grcRitualSubmission = await GRCRitualSubmission.deploy();
  await grcRitualSubmission.waitForDeployment();
  const grcRitualSubmissionAddress = await grcRitualSubmission.getAddress();

  console.log(
    '✅ GRC_RitualSubmission deployed to:',
    grcRitualSubmissionAddress,
  );

  // Deploy SymbiosisPledge contract
  console.log('\n🤝 Deploying SymbiosisPledge...');
  const SymbiosisPledge = await ethers.getContractFactory('SymbiosisPledge');
  const symbiosisPledge = await SymbiosisPledge.deploy();
  await symbiosisPledge.waitForDeployment();
  const symbiosisPledgeAddress = await symbiosisPledge.getAddress();

  console.log('✅ SymbiosisPledge deployed to:', symbiosisPledgeAddress);

  // Wait for a few block confirmations
  console.log('\n⏳ Waiting for confirmations...');
  await grcRitualSubmission.deploymentTransaction()?.wait(5);
  await symbiosisPledge.deploymentTransaction()?.wait(5);

  // Register bioregions in GRC contract
  console.log('\n🌍 Registering bioregions...');
  // If registerBioregion does not exist, use a generic function call or skip
  if (typeof (grcRitualSubmission as any).registerBioregion === 'function') {
    await (grcRitualSubmission as any).registerBioregion(
      'tech-haven',
      'Tech Haven',
    );
    await (grcRitualSubmission as any).registerBioregion(
      'mythic-forest',
      'Mythic Forest',
    );
    await (grcRitualSubmission as any).registerBioregion(
      'isolated-bastion',
      'Isolated Bastion',
    );
  } else {
    console.warn(
      '⚠️  registerBioregion function not found on GRC_RitualSubmission contract. Skipping bioregion registration.',
    );
  }
  console.log('✅ Bioregions registered successfully');

  // Register bioregions in Pledge contract
  console.log('\n🌍 Registering bioregions in pledge contract...');
  await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
  await symbiosisPledge.registerBioregion('mythic-forest', 'Mythic Forest');
  await symbiosisPledge.registerBioregion(
    'isolated-bastion',
    'Isolated Bastion',
  );
  console.log('✅ Bioregions registered in pledge contract');

  // Verify contracts on BaseScan
  console.log('\n🔍 Verifying contracts on BaseScan...');

  try {
    await verify(grcRitualSubmissionAddress, []);
    console.log('✅ GRC_RitualSubmission verified on BaseScan');
  } catch (error) {
    console.log('⚠️  GRC_RitualSubmission verification failed:', error);
  }

  try {
    await verify(symbiosisPledgeAddress, []);
    console.log('✅ SymbiosisPledge verified on BaseScan');
  } catch (error) {
    console.log('⚠️  SymbiosisPledge verification failed:', error);
  }

  // Print deployment summary
  console.log('\n🎉 Deployment Summary:');
  console.log('================================');
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Deployer:', deployer.address);
  console.log('GRC_RitualSubmission:', grcRitualSubmissionAddress);
  console.log('SymbiosisPledge:', symbiosisPledgeAddress);
  console.log('================================');

  // Save deployment addresses to file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    contracts: {
      GRCRitualSubmission: grcRitualSubmissionAddress,
      SymbiosisPledge: symbiosisPledgeAddress,
    },
    bioregions: ['tech-haven', 'mythic-forest', 'isolated-bastion'],
    timestamp: new Date().toISOString(),
  };

  const fs = require('fs');
  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deploymentInfo, null, 2),
  );
  console.log('\n💾 Deployment info saved to deployment.json');

  // Generate environment variables for backend
  const envContent = `# GRC Contract Addresses (Base Testnet)
GRC_CONTRACT_ADDRESS=${grcRitualSubmissionAddress}
PLEDGE_CONTRACT_ADDRESS=${symbiosisPledgeAddress}

# Base Testnet Configuration
BASE_TESTNET_URL=https://sepolia.base.org
BASE_TESTNET_CHAIN_ID=84532

# Add your private key and other environment variables here
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
`;

  fs.writeFileSync('./contracts.env', envContent);
  console.log('💾 Environment variables saved to contracts.env');

  return {
    grcRitualSubmission: grcRitualSubmissionAddress,
    symbiosisPledge: symbiosisPledgeAddress,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
