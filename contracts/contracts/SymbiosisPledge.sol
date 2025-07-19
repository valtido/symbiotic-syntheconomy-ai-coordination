// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SymbiosisPledge
 * @dev Smart contract for tracking bioregional regeneration pledges and commitments
 * @author Valtid Caushi
 * @notice This contract manages pledges for regenerative practices and symbiotic relationships
 */
contract SymbiosisPledge is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Events
    event PledgeCreated(
        uint256 indexed pledgeId,
        address indexed pledger,
        string indexed bioregionId,
        string pledgeType,
        string description,
        uint256 commitmentAmount,
        uint256 timestamp
    );

    event PledgeFulfilled(
        uint256 indexed pledgeId,
        address indexed pledger,
        string proofHash,
        uint256 fulfillmentTimestamp
    );

    event PledgeVerified(
        uint256 indexed pledgeId,
        address indexed verifier,
        bool isVerified,
        string verificationNotes,
        uint256 timestamp
    );

    event BioregionPledge(
        string indexed bioregionId,
        uint256 totalPledges,
        uint256 totalCommitment,
        uint256 timestamp
    );

    // Structs
    struct Pledge {
        uint256 pledgeId;
        address pledger;
        string bioregionId;
        string pledgeType;
        string description;
        uint256 commitmentAmount;
        uint256 creationTimestamp;
        uint256 deadline;
        bool isFulfilled;
        bool isVerified;
        string proofHash;
        uint256 fulfillmentTimestamp;
        address verifier;
        string verificationNotes;
        uint256 verificationTimestamp;
        bool exists;
    }

    struct BioregionStats {
        string bioregionId;
        uint256 totalPledges;
        uint256 fulfilledPledges;
        uint256 totalCommitment;
        uint256 verifiedCommitment;
        uint256 lastUpdateTimestamp;
    }

    // State variables
    Counters.Counter private _pledgeIds;

    mapping(uint256 => Pledge) public pledges;
    mapping(address => uint256[]) public pledgerPledges;
    mapping(string => uint256[]) public bioregionPledges;
    mapping(string => BioregionStats) public bioregionStats;

    uint256 public totalPledges;
    uint256 public fulfilledPledges;
    uint256 public totalCommitment;
    uint256 public verifiedCommitment;

    // Constants
    uint256 public constant MIN_COMMITMENT_AMOUNT = 1;
    uint256 public constant MAX_COMMITMENT_AMOUNT = 1000000;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 500;
    uint256 public constant MAX_PLEDGE_TYPE_LENGTH = 50;
    uint256 public constant DEFAULT_DEADLINE_DAYS = 365;

    // Pledge types
    string[] public pledgeTypes = [
        "land_regeneration",
        "water_restoration",
        "biodiversity_enhancement",
        "community_education",
        "cultural_preservation",
        "sustainable_agriculture",
        "renewable_energy",
        "waste_reduction",
        "indigenous_rights",
        "climate_action"
    ];

    // Modifiers
    modifier validPledgeId(uint256 pledgeId) {
        require(pledges[pledgeId].exists, "Pledge does not exist");
        _;
    }

    modifier validCommitmentAmount(uint256 amount) {
        require(amount >= MIN_COMMITMENT_AMOUNT, "Commitment amount too low");
        require(amount <= MAX_COMMITMENT_AMOUNT, "Commitment amount too high");
        _;
    }

    modifier validPledgeType(string memory pledgeType) {
        bool isValid = false;
        for (uint i = 0; i < pledgeTypes.length; i++) {
            if (keccak256(bytes(pledgeTypes[i])) == keccak256(bytes(pledgeType))) {
                isValid = true;
                break;
            }
        }
        require(isValid, "Invalid pledge type");
        _;
    }

    modifier onlyPledger(uint256 pledgeId) {
        require(pledges[pledgeId].pledger == msg.sender, "Only pledger can perform this action");
        _;
    }

    modifier pledgeNotFulfilled(uint256 pledgeId) {
        require(!pledges[pledgeId].isFulfilled, "Pledge already fulfilled");
        _;
    }

    // Constructor
    constructor() Ownable() {
        totalPledges = 0;
        fulfilledPledges = 0;
        totalCommitment = 0;
        verifiedCommitment = 0;
    }
    mapping(string => string) public bioregions;


    function registerBioregion(string memory id, string memory name) public onlyOwner {
        require(bytes(id).length > 0, "ID required");
        require(bytes(name).length > 0, "Name required");
        bioregions[id] = name;
    }
    /**
     * @dev Create a new regeneration pledge
     * @param bioregionId The bioregion identifier
     * @param pledgeType The type of pledge
     * @param description Description of the pledge
     * @param commitmentAmount The commitment amount
     * @param deadlineDays Days until deadline (optional, defaults to 365)
     * @return pledgeId The unique identifier for the created pledge
     */
    function createPledge(
        string memory bioregionId,
        string memory pledgeType,
        string memory description,
        uint256 commitmentAmount,
        uint256 deadlineDays
    )
        external
        nonReentrant
        whenNotPaused
        validCommitmentAmount(commitmentAmount)
        validPledgeType(pledgeType)
        returns (uint256 pledgeId)
    {
        require(bytes(bioregionId).length > 0, "Bioregion ID cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(deadlineDays > 0 && deadlineDays <= 3650, "Invalid deadline (1-3650 days)");

        _pledgeIds.increment();
        pledgeId = _pledgeIds.current();

        uint256 deadline = block.timestamp + (deadlineDays * 1 days);

        Pledge memory pledge = Pledge({
            pledgeId: pledgeId,
            pledger: msg.sender,
            bioregionId: bioregionId,
            pledgeType: pledgeType,
            description: description,
            commitmentAmount: commitmentAmount,
            creationTimestamp: block.timestamp,
            deadline: deadline,
            isFulfilled: false,
            isVerified: false,
            proofHash: "",
            fulfillmentTimestamp: 0,
            verifier: address(0),
            verificationNotes: "",
            verificationTimestamp: 0,
            exists: true
        });

        pledges[pledgeId] = pledge;
        pledgerPledges[msg.sender].push(pledgeId);
        bioregionPledges[bioregionId].push(pledgeId);

        // Update bioregion stats
        if (bioregionStats[bioregionId].totalPledges == 0) {
            bioregionStats[bioregionId] = BioregionStats({
                bioregionId: bioregionId,
                totalPledges: 1,
                fulfilledPledges: 0,
                totalCommitment: commitmentAmount,
                verifiedCommitment: 0,
                lastUpdateTimestamp: block.timestamp
            });
        } else {
            bioregionStats[bioregionId].totalPledges++;
            bioregionStats[bioregionId].totalCommitment += commitmentAmount;
            bioregionStats[bioregionId].lastUpdateTimestamp = block.timestamp;
        }

        totalPledges++;
        totalCommitment += commitmentAmount;

        emit PledgeCreated(
            pledgeId,
            msg.sender,
            bioregionId,
            pledgeType,
            description,
            commitmentAmount,
            block.timestamp
        );

        emit BioregionPledge(
            bioregionId,
            bioregionStats[bioregionId].totalPledges,
            bioregionStats[bioregionId].totalCommitment,
            block.timestamp
        );

        return pledgeId;
    }

    /**
     * @dev Fulfill a pledge by providing proof
     * @param pledgeId The pledge ID to fulfill
     * @param proofHash IPFS hash of the fulfillment proof
     */
    function fulfillPledge(
        uint256 pledgeId,
        string memory proofHash
    )
        external
        onlyPledger(pledgeId)
        pledgeNotFulfilled(pledgeId)
    {
        require(bytes(proofHash).length > 0, "Proof hash cannot be empty");
        require(block.timestamp <= pledges[pledgeId].deadline, "Pledge deadline has passed");

        pledges[pledgeId].isFulfilled = true;
        pledges[pledgeId].proofHash = proofHash;
        pledges[pledgeId].fulfillmentTimestamp = block.timestamp;

        fulfilledPledges++;
        bioregionStats[pledges[pledgeId].bioregionId].fulfilledPledges++;

        emit PledgeFulfilled(
            pledgeId,
            msg.sender,
            proofHash,
            block.timestamp
        );
    }

    /**
     * @dev Verify a fulfilled pledge (owner or designated verifier)
     * @param pledgeId The pledge ID to verify
     * @param isVerified Whether the pledge is verified
     * @param verificationNotes Notes about the verification
     */
    function verifyPledge(
        uint256 pledgeId,
        bool isVerified,
        string memory verificationNotes
    )
        external
        onlyOwner
        validPledgeId(pledgeId)
    {
        require(pledges[pledgeId].isFulfilled, "Pledge must be fulfilled before verification");
        require(!pledges[pledgeId].isVerified, "Pledge already verified");

        pledges[pledgeId].isVerified = isVerified;
        pledges[pledgeId].verifier = msg.sender;
        pledges[pledgeId].verificationNotes = verificationNotes;
        pledges[pledgeId].verificationTimestamp = block.timestamp;

        if (isVerified) {
            verifiedCommitment += pledges[pledgeId].commitmentAmount;
            bioregionStats[pledges[pledgeId].bioregionId].verifiedCommitment += pledges[pledgeId].commitmentAmount;
        }

        emit PledgeVerified(
            pledgeId,
            msg.sender,
            isVerified,
            verificationNotes,
            block.timestamp
        );
    }

    /**
     * @dev Get pledge details
     * @param pledgeId The pledge ID
     * @return pledge The pledge data
     */
    function getPledge(uint256 pledgeId)
        external
        view
        validPledgeId(pledgeId)
        returns (Pledge memory pledge)
    {
        return pledges[pledgeId];
    }

    /**
     * @dev Get bioregion statistics
     * @param bioregionId The bioregion ID
     * @return stats The bioregion statistics
     */
    function getBioregionStats(string memory bioregionId)
        external
        view
        returns (BioregionStats memory stats)
    {
        return bioregionStats[bioregionId];
    }

    /**
     * @dev Get all pledge IDs for a pledger
     * @param pledger The pledger address
     * @return pledgeIds Array of pledge IDs
     */
    function getPledgerPledges(address pledger)
        external
        view
        returns (uint256[] memory pledgeIds)
    {
        return pledgerPledges[pledger];
    }

    /**
     * @dev Get all pledge IDs for a bioregion
     * @param bioregionId The bioregion ID
     * @return pledgeIds Array of pledge IDs
     */
    function getBioregionPledges(string memory bioregionId)
        external
        view
        returns (uint256[] memory pledgeIds)
    {
        return bioregionPledges[bioregionId];
    }

    /**
     * @dev Get available pledge types
     * @return types Array of available pledge types
     */
    function getPledgeTypes() external view returns (string[] memory types) {
        return pledgeTypes;
    }

    /**
     * @dev Get contract statistics
     * @return _totalPledges Total number of pledges
     * @return _fulfilledPledges Total number of fulfilled pledges
     * @return _totalCommitment Total commitment amount
     * @return _verifiedCommitment Total verified commitment amount
     * @return _fulfillmentRate Fulfillment rate as percentage
     * @return _verificationRate Verification rate as percentage
     */
    function getStatistics()
        external
        view
        returns (
            uint256 _totalPledges,
            uint256 _fulfilledPledges,
            uint256 _totalCommitment,
            uint256 _verifiedCommitment,
            uint256 _fulfillmentRate,
            uint256 _verificationRate
        )
    {
        _totalPledges = totalPledges;
        _fulfilledPledges = fulfilledPledges;
        _totalCommitment = totalCommitment;
        _verifiedCommitment = verifiedCommitment;
        _fulfillmentRate = totalPledges > 0 ? (fulfilledPledges * 100) / totalPledges : 0;
        _verificationRate = fulfilledPledges > 0 ? (verifiedCommitment * 100) / totalCommitment : 0;
    }

    /**
     * @dev Add a new pledge type (owner only)
     * @param pledgeType The new pledge type to add
     */
    function addPledgeType(string memory pledgeType) external onlyOwner {
        require(bytes(pledgeType).length > 0, "Pledge type cannot be empty");
        require(bytes(pledgeType).length <= MAX_PLEDGE_TYPE_LENGTH, "Pledge type too long");

        // Check if already exists
        for (uint i = 0; i < pledgeTypes.length; i++) {
            require(keccak256(bytes(pledgeTypes[i])) != keccak256(bytes(pledgeType)), "Pledge type already exists");
        }

        pledgeTypes.push(pledgeType);
    }

    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}