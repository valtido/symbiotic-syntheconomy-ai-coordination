import { run } from 'hardhat';

export async function verify(contractAddress: string, args: any[]) {
  console.log('🔍 Verifying contract:', contractAddress);

  try {
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error: any) {
    if (error.message.toLowerCase().includes('already verified')) {
      console.log('✅ Contract is already verified!');
    } else {
      console.log('❌ Verification failed:', error.message);
    }
  }
}
