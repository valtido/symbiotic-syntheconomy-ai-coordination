import { execSync } from 'child_process';
import { ethers } from 'hardhat';

async function main() {
  console.log('🔧 Generating TypeChain bindings...');

  try {
    // Compile contracts first
    console.log('📦 Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });

    // Generate TypeChain types
    console.log('🔗 Generating TypeChain types...');
    execSync(
      'npx typechain --target ethers-v6 --out-dir typechain-types "artifacts/contracts/**/*.json"',
      {
        stdio: 'inherit',
      },
    );

    console.log('✅ TypeChain bindings generated successfully!');
    console.log('📁 Types saved to: typechain-types/');

    // Verify the generated types
    console.log('🔍 Verifying generated types...');
    const fs = require('fs');
    const typechainDir = './typechain-types';

    if (fs.existsSync(typechainDir)) {
      const files = fs.readdirSync(typechainDir);
      console.log(`📄 Generated ${files.length} type files:`);
      files.forEach((file: string) => {
        console.log(`   - ${file}`);
      });
    }

    console.log('🎉 Type generation complete!');
  } catch (error) {
    console.error('❌ Failed to generate types:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Type generation failed:', error);
    process.exit(1);
  });
