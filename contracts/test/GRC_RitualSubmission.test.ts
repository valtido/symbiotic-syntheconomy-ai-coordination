import { expect } from 'chai';
import { ethers } from 'hardhat';
import { GRC_RitualSubmission } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('GRC_RitualSubmission', function () {
  let grcRitualSubmission: GRC_RitualSubmission;
  let owner: SignerWithAddress;
  let submitter: SignerWithAddress;
  let daoMember: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    [owner, submitter, daoMember, ...addrs] = await ethers.getSigners();

    const GRCRitualSubmission = await ethers.getContractFactory(
      'GRC_RitualSubmission',
    );
    grcRitualSubmission = await GRCRitualSubmission.deploy();
    await grcRitualSubmission.waitForDeployment();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await grcRitualSubmission.owner()).to.equal(owner.address);
    });

    it('Should start with zero ritual submissions', async function () {
      expect(await grcRitualSubmission.getTotalSubmissions()).to.equal(0);
    });

    it('Should start with zero bioregions', async function () {
      expect(await grcRitualSubmission.getBioregionCount()).to.equal(0);
    });
  });

  describe('Bioregion Management', function () {
    it('Should allow owner to register bioregion', async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
      expect(await grcRitualSubmission.getBioregionCount()).to.equal(1);
      expect(await grcRitualSubmission.getBioregionName('tech-haven')).to.equal(
        'Tech Haven',
      );
    });

    it('Should not allow non-owner to register bioregion', async function () {
      await expect(
        grcRitualSubmission
          .connect(submitter)
          .registerBioregion('tech-haven', 'Tech Haven'),
      ).to.be.revertedWithCustomError(
        grcRitualSubmission,
        'OwnableUnauthorizedAccount',
      );
    });

    it('Should not allow duplicate bioregion registration', async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
      await expect(
        grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven'),
      ).to.be.revertedWith('Bioregion already registered');
    });
  });

  describe('Ritual Submission', function () {
    beforeEach(async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
      await grcRitualSubmission.registerBioregion(
        'mythic-forest',
        'Mythic Forest',
      );
      await grcRitualSubmission.registerBioregion(
        'isolated-bastion',
        'Isolated Bastion',
      );
    });

    it('Should allow ritual submission with valid data', async function () {
      const ipfsHash = 'QmTestHash123456789';
      const bioregionId = 'tech-haven';
      const author = submitter.address;
      const esepScore = 500; // 0.5 * 1000
      const cedaScore = 2;
      const narrativeScore = 600; // 0.6 * 1000
      const isApproved = true;

      await expect(
        grcRitualSubmission
          .connect(submitter)
          .submitRitual(
            ipfsHash,
            bioregionId,
            author,
            esepScore,
            cedaScore,
            narrativeScore,
            isApproved,
          ),
      )
        .to.emit(grcRitualSubmission, 'RitualSubmitted')
        .withArgs(
          1,
          ipfsHash,
          bioregionId,
          author,
          esepScore,
          cedaScore,
          narrativeScore,
          isApproved,
        );

      expect(await grcRitualSubmission.getTotalSubmissions()).to.equal(1);
    });

    it('Should not allow submission for unregistered bioregion', async function () {
      const ipfsHash = 'QmTestHash123456789';
      const bioregionId = 'unknown-bioregion';

      await expect(
        grcRitualSubmission
          .connect(submitter)
          .submitRitual(
            ipfsHash,
            bioregionId,
            submitter.address,
            500,
            2,
            600,
            true,
          ),
      ).to.be.revertedWith('Bioregion not registered');
    });

    it('Should not allow submission when paused', async function () {
      await grcRitualSubmission.pause();

      await expect(
        grcRitualSubmission
          .connect(submitter)
          .submitRitual(
            'QmTestHash123456789',
            'tech-haven',
            submitter.address,
            500,
            2,
            600,
            true,
          ),
      ).to.be.revertedWith('Pausable: paused');
    });

    it('Should track submissions by bioregion', async function () {
      // Submit rituals for different bioregions
      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash1',
          'tech-haven',
          submitter.address,
          500,
          2,
          600,
          true,
        );

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash2',
          'mythic-forest',
          submitter.address,
          400,
          3,
          700,
          true,
        );

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash3',
          'tech-haven',
          submitter.address,
          300,
          4,
          800,
          true,
        );

      expect(
        await grcRitualSubmission.getSubmissionsByBioregion('tech-haven'),
      ).to.equal(2);
      expect(
        await grcRitualSubmission.getSubmissionsByBioregion('mythic-forest'),
      ).to.equal(1);
      expect(
        await grcRitualSubmission.getSubmissionsByBioregion('isolated-bastion'),
      ).to.equal(0);
    });
  });

  describe('Ritual Retrieval', function () {
    beforeEach(async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
    });

    it('Should retrieve ritual by ID', async function () {
      const ipfsHash = 'QmTestHash123456789';
      const bioregionId = 'tech-haven';
      const author = submitter.address;
      const esepScore = 500;
      const cedaScore = 2;
      const narrativeScore = 600;
      const isApproved = true;

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          ipfsHash,
          bioregionId,
          author,
          esepScore,
          cedaScore,
          narrativeScore,
          isApproved,
        );

      const ritual = await grcRitualSubmission.getRitual(1);
      expect(ritual.ipfsHash).to.equal(ipfsHash);
      expect(ritual.bioregionId).to.equal(bioregionId);
      expect(ritual.author).to.equal(author);
      expect(ritual.esepScore).to.equal(esepScore);
      expect(ritual.cedaScore).to.equal(cedaScore);
      expect(ritual.narrativeScore).to.equal(narrativeScore);
      expect(ritual.isApproved).to.equal(isApproved);
      expect(ritual.timestamp).to.be.gt(0);
    });

    it('Should revert for non-existent ritual ID', async function () {
      await expect(grcRitualSubmission.getRitual(999)).to.be.revertedWith(
        'Ritual not found',
      );
    });
  });

  describe('Statistics', function () {
    beforeEach(async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
      await grcRitualSubmission.registerBioregion(
        'mythic-forest',
        'Mythic Forest',
      );
    });

    it('Should calculate approval rate correctly', async function () {
      // Submit 4 rituals, 3 approved, 1 rejected
      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash1',
          'tech-haven',
          submitter.address,
          500,
          2,
          600,
          true,
        );

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash2',
          'tech-haven',
          submitter.address,
          400,
          3,
          700,
          true,
        );

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash3',
          'mythic-forest',
          submitter.address,
          300,
          4,
          800,
          true,
        );

      await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmHash4',
          'mythic-forest',
          submitter.address,
          800,
          1,
          300,
          false,
        );

      const stats = await grcRitualSubmission.getStatistics();
      expect(stats.totalSubmissions).to.equal(4);
      expect(stats.approvedSubmissions).to.equal(3);
      expect(stats.rejectedSubmissions).to.equal(1);
      expect(stats.approvalRate).to.equal(750); // 75% * 1000
    });
  });

  describe('Access Control', function () {
    it('Should allow owner to pause and unpause', async function () {
      await grcRitualSubmission.pause();
      expect(await grcRitualSubmission.paused()).to.be.true;

      await grcRitualSubmission.unpause();
      expect(await grcRitualSubmission.paused()).to.be.false;
    });

    it('Should not allow non-owner to pause', async function () {
      await expect(
        grcRitualSubmission.connect(submitter).pause(),
      ).to.be.revertedWithCustomError(
        grcRitualSubmission,
        'OwnableUnauthorizedAccount',
      );
    });

    it('Should not allow non-owner to unpause', async function () {
      await grcRitualSubmission.pause();
      await expect(
        grcRitualSubmission.connect(submitter).unpause(),
      ).to.be.revertedWithCustomError(
        grcRitualSubmission,
        'OwnableUnauthorizedAccount',
      );
    });
  });

  describe('Gas Optimization', function () {
    beforeEach(async function () {
      await grcRitualSubmission.registerBioregion('tech-haven', 'Tech Haven');
    });

    it('Should use reasonable gas for ritual submission', async function () {
      const tx = await grcRitualSubmission
        .connect(submitter)
        .submitRitual(
          'QmTestHash123456789',
          'tech-haven',
          submitter.address,
          500,
          2,
          600,
          true,
        );

      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });
  });
});
