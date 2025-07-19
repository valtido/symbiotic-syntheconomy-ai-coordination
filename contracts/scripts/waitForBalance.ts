// scripts/waitForBalance.ts
import { ethers } from 'hardhat';

async function waitForEth(minEth: string) {
  const signer = (await ethers.getSigners())[0];
  const balance = await signer.provider.getBalance(signer.address);

  const eth = ethers.formatEther(balance);
  console.log(`💰 Balance: ${eth} ETH`);

  if (parseFloat(eth) >= parseFloat(minEth)) {
    console.log('✅ Sufficient ETH, ready to deploy.');
  } else {
    console.log(`⏳ Waiting... need at least ${minEth} ETH`);
  }
}

waitForEth('0.003'); // You can adjust threshold
