import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SymbiosisPledge } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('SymbiosisPledge', function () {
  let symbiosisPledge: SymbiosisPledge;
  let owner: SignerWithAddress;
  let pledger: SignerWithAddress;
  let verifier: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    [owner, pledger, verifier, ...addrs] = await ethers.getSigners();

    const SymbiosisPledge = await ethers.getContractFactory('SymbiosisPledge');
    symbiosisPledge = await SymbiosisPledge.deploy();
    await symbiosisPledge.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await symbiosisPledge.owner()).to.equal(owner.address);
    });

    it('Should start with zero pledges', async function () {
      expect(await symbiosisPledge.getTotalPledges()).to.equal(0);
    });

    it('Should start with zero bioregions', async function () {
      expect(await symbiosisPledge.getBioregionCount()).to.equal(0);
    });
  });

  describe('Bioregion Management', function () {
    it('Should allow owner to register bioregion', async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
      expect(await symbiosisPledge.getBioregionCount()).to.equal(1);
      expect(await symbiosisPledge.getBioregionName('tech-haven')).to.equal(
        'Tech Haven',
      );
    });

    it('Should not allow non-owner to register bioregion', async function () {
      await expect(
        symbiosisPledge
          .connect(pledger)
          .registerBioregion('tech-haven', 'Tech Haven'),
      ).to.be.revertedWithCustomError(
        symbiosisPledge,
        'OwnableUnauthorizedAccount',
      );
    });

    it('Should not allow duplicate bioregion registration', async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
      await expect(
        symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven'),
      ).to.be.revertedWith('Bioregion already registered');
    });
  });

  describe('Pledge Creation', function () {
    beforeEach(async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
      await symbiosisPledge.registerBioregion('mythic-forest', 'Mythic Forest');
    });

    it('Should allow pledge creation with valid data', async function () {
      const bioregionId = 'tech-haven';
      const pledgeType = 'regeneration';
      const description = 'Plant 1000 trees in urban areas';
      const targetAmount = ethers.parseEther('1.0');
      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

      await expect(
        symbiosisPledge
          .connect(pledger)
          .createPledge(
            bioregionId,
            pledgeType,
            description,
            targetAmount,
            deadline,
          ),
      )
        .to.emit(symbiosisPledge, 'PledgeCreated')
        .withArgs(
          1,
          pledger.address,
          bioregionId,
          pledgeType,
          targetAmount,
          deadline,
        );

      expect(await symbiosisPledge.getTotalPledges()).to.equal(1);
    });

    it('Should not allow pledge for unregistered bioregion', async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        symbiosisPledge
          .connect(pledger)
          .createPledge(
            'unknown-bioregion',
            'regeneration',
            'Test pledge',
            ethers.parseEther('1.0'),
            deadline,
          ),
      ).to.be.revertedWith('Bioregion not registered');
    });

    it('Should not allow pledge with past deadline', async function () {
      const deadline = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago

      await expect(
        symbiosisPledge
          .connect(pledger)
          .createPledge(
            'tech-haven',
            'regeneration',
            'Test pledge',
            ethers.parseEther('1.0'),
            deadline,
          ),
      ).to.be.revertedWith('Deadline must be in the future');
    });

    it('Should not allow pledge with zero target amount', async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        symbiosisPledge
          .connect(pledger)
          .createPledge(
            'tech-haven',
            'regeneration',
            'Test pledge',
            0,
            deadline,
          ),
      ).to.be.revertedWith('Target amount must be greater than zero');
    });
  });

  describe('Pledge Fulfillment', function () {
    let pledgeId: bigint;

    beforeEach(async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Plant 1000 trees',
          ethers.parseEther('1.0'),
          deadline,
        );
      pledgeId = 1n;
    });

    it('Should allow pledge fulfillment with contribution', async function () {
      const contribution = ethers.parseEther('0.5');

      await expect(
        symbiosisPledge.connect(pledger).fulfillPledge(pledgeId, contribution),
      )
        .to.emit(symbiosisPledge, 'PledgeFulfilled')
        .withArgs(pledgeId, pledger.address, contribution);

      const pledge = await symbiosisPledge.getPledge(pledgeId);
      expect(pledge.fulfilledAmount).to.equal(contribution);
      expect(pledge.isFulfilled).to.be.false; // Not fully fulfilled yet
    });

    it('Should mark pledge as fulfilled when target is reached', async function () {
      const targetAmount = ethers.parseEther('1.0');
      const contribution = targetAmount;

      await symbiosisPledge
        .connect(pledger)
        .fulfillPledge(pledgeId, contribution);

      const pledge = await symbiosisPledge.getPledge(pledgeId);
      expect(pledge.isFulfilled).to.be.true;
      expect(pledge.fulfilledAmount).to.equal(targetAmount);
    });

    it('Should not allow fulfillment of non-existent pledge', async function () {
      await expect(
        symbiosisPledge
          .connect(pledger)
          .fulfillPledge(999n, ethers.parseEther('0.5')),
      ).to.be.revertedWith('Pledge not found');
    });

    it('Should not allow fulfillment of expired pledge', async function () {
      // Fast forward time
      await ethers.provider.send('evm_increaseTime', [86400]); // 24 hours
      await ethers.provider.send('evm_mine', []);

      await expect(
        symbiosisPledge
          .connect(pledger)
          .fulfillPledge(pledgeId, ethers.parseEther('0.5')),
      ).to.be.revertedWith('Pledge has expired');
    });
  });

  describe('Pledge Verification', function () {
    let pledgeId: bigint;

    beforeEach(async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Plant 1000 trees',
          ethers.parseEther('1.0'),
          deadline,
        );
      pledgeId = 1n;

      // Fulfill the pledge
      await symbiosisPledge
        .connect(pledger)
        .fulfillPledge(pledgeId, ethers.parseEther('1.0'));
    });

    it('Should allow verifier to verify fulfilled pledge', async function () {
      const verificationData = 'IPFS hash of verification evidence';

      await expect(
        symbiosisPledge
          .connect(verifier)
          .verifyPledge(pledgeId, verificationData),
      )
        .to.emit(symbiosisPledge, 'PledgeVerified')
        .withArgs(pledgeId, verifier.address, verificationData);

      const pledge = await symbiosisPledge.getPledge(pledgeId);
      expect(pledge.isVerified).to.be.true;
      expect(pledge.verifier).to.equal(verifier.address);
    });

    it('Should not allow verification of unfulfilled pledge', async function () {
      // Create a new pledge but don't fulfill it
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Another pledge',
          ethers.parseEther('1.0'),
          deadline,
        );
      const newPledgeId = 2n;

      await expect(
        symbiosisPledge
          .connect(verifier)
          .verifyPledge(newPledgeId, 'verification data'),
      ).to.be.revertedWith('Pledge must be fulfilled before verification');
    });

    it('Should not allow double verification', async function () {
      await symbiosisPledge
        .connect(verifier)
        .verifyPledge(pledgeId, 'verification data');

      await expect(
        symbiosisPledge
          .connect(verifier)
          .verifyPledge(pledgeId, 'another verification'),
      ).to.be.revertedWith('Pledge already verified');
    });
  });

  describe('Statistics and Queries', function () {
    beforeEach(async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
      await symbiosisPledge.registerBioregion('mythic-forest', 'Mythic Forest');
    });

    it('Should track pledges by bioregion', async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      // Create pledges for different bioregions
      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Tech pledge',
          ethers.parseEther('1.0'),
          deadline,
        );

      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'mythic-forest',
          'conservation',
          'Forest pledge',
          ethers.parseEther('2.0'),
          deadline,
        );

      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'innovation',
          'Another tech pledge',
          ethers.parseEther('0.5'),
          deadline,
        );

      expect(
        await symbiosisPledge.getPledgesByBioregion('tech-haven'),
      ).to.equal(2);
      expect(
        await symbiosisPledge.getPledgesByBioregion('mythic-forest'),
      ).to.equal(1);
    });

    it('Should calculate fulfillment statistics', async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      // Create and fulfill pledges
      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Pledge 1',
          ethers.parseEther('1.0'),
          deadline,
        );

      await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'conservation',
          'Pledge 2',
          ethers.parseEther('2.0'),
          deadline,
        );

      // Fulfill first pledge completely, second pledge partially
      await symbiosisPledge
        .connect(pledger)
        .fulfillPledge(1n, ethers.parseEther('1.0'));
      await symbiosisPledge
        .connect(pledger)
        .fulfillPledge(2n, ethers.parseEther('1.0'));

      const stats = await symbiosisPledge.getStatistics();
      expect(stats.totalPledges).to.equal(2);
      expect(stats.fulfilledPledges).to.equal(1);
      expect(stats.partiallyFulfilledPledges).to.equal(1);
      expect(stats.totalFulfilledAmount).to.equal(ethers.parseEther('2.0'));
    });
  });

  describe('Access Control', function () {
    it('Should allow owner to pause and unpause', async function () {
      await symbiosisPledge.pause();
      expect(await symbiosisPledge.paused()).to.be.true;

      await symbiosisPledge.unpause();
      expect(await symbiosisPledge.paused()).to.be.false;
    });

    it('Should not allow pledge creation when paused', async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
      await symbiosisPledge.pause();

      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        symbiosisPledge
          .connect(pledger)
          .createPledge(
            'tech-haven',
            'regeneration',
            'Test pledge',
            ethers.parseEther('1.0'),
            deadline,
          ),
      ).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('Gas Optimization', function () {
    beforeEach(async function () {
      await symbiosisPledge.registerBioregion('tech-haven', 'Tech Haven');
    });

    it('Should use reasonable gas for pledge creation', async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const tx = await symbiosisPledge
        .connect(pledger)
        .createPledge(
          'tech-haven',
          'regeneration',
          'Test pledge',
          ethers.parseEther('1.0'),
          deadline,
        );

      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.lt(300000); // Should use less than 300k gas
    });
  });
});
