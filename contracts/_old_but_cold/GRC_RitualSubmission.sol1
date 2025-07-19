// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title GRC_RitualSubmission
 * @dev Smart contract for logging Global Regeneration Ceremony ritual submissions
 * @author Valtid Caushi
 * @notice This contract stores ritual submission metadata and validation results
 */
contract GRC_RitualSubmission is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Events
    event RitualSubmitted(
        uint256 indexed ritualId,
        address indexed submitter,
        string indexed bioregionId,
        string ipfsHash,
        uint256 esepScore,
        uint256 cedaScore,
        bool isApproved,
        uint256 timestamp
    );

    event RitualValidated(
        uint256 indexed ritualId,
        bool isApproved,
        string feedback,
        uint256 timestamp
    );

    event BioregionRegistered(
        string indexed bioregionId,
        string name,
        string description,
        address registrar,
        uint256 timestamp
    );

    // Structs
    struct RitualSubmission {
        uint256 ritualId;
        address submitter;
        string bioregionId;
        string ritualName;
        string ipfsHash;
        uint256 esepScore; // 0-100 (scaled from 0.0-1.0)
        uint256 cedaScore; // Number of cultural references
        bool isApproved;
        uint256 submissionTimestamp;
        uint256 validationTimestamp;
        string validationFeedback;
        bool exists;
    }

    struct Bioregion {
        string bioregionId;
        string name;
        string description;
        address registrar;
        uint256 registrationTimestamp;
        uint256 ritualCount;
        bool isActive;
    }

    // State variables
    Counters.Counter private _ritualIds;

    mapping(uint256 => RitualSubmission) public ritualSubmissions;
    mapping(string => Bioregion) public bioregions;
    mapping(address => uint256[]) public submitterRituals;
    mapping(string => uint256[]) public bioregionRituals;

    uint256 public totalRituals;
    uint256 public approvedRituals;
    uint256 public totalBioregions;

    // Constants
    uint256 public constant MAX_ESEP_SCORE = 70; // 0.7 * 100
    uint256 public constant MIN_CEDA_SCORE = 2;
    uint256 public constant MAX_RITUAL_NAME_LENGTH = 100;
    uint256 public constant MAX_IPFS_HASH_LENGTH = 100;

    // Modifiers
    modifier validBioregion(string memory bioregionId) {
        require(bioregions[bioregionId].isActive, "Bioregion not registered or inactive");
        _;
    }

    modifier validRitualId(uint256 ritualId) {
        require(ritualSubmissions[ritualId].exists, "Ritual does not exist");
        _;
    }

    modifier validScores(uint256 esepScore, uint256 cedaScore) {
        require(esepScore <= 100, "ESEP score must be <= 100");
        require(cedaScore <= 100, "CEDA score must be <= 100");
        _;
    }

    // Constructor
    constructor() Ownable(msg.sender) {
        totalRituals = 0;
        approvedRituals = 0;
        totalBioregions = 0;
    }

    /**
     * @dev Submit a ritual for validation and logging
     * @param bioregionId The bioregion identifier
     * @param ritualName The name of the ritual
     * @param ipfsHash The IPFS hash of the ritual metadata
     * @param esepScore The ESEP validation score (0-100)
     * @param cedaScore The CEDA validation score (number of cultural references)
     * @return ritualId The unique identifier for the submitted ritual
     */
    function submitRitual(
        string memory bioregionId,
        string memory ritualName,
        string memory ipfsHash,
        uint256 esepScore,
        uint256 cedaScore
    )
        external
        nonReentrant
        whenNotPaused
        validBioregion(bioregionId)
        validScores(esepScore, cedaScore)
        returns (uint256 ritualId)
    {
        require(bytes(ritualName).length > 0, "Ritual name cannot be empty");
        require(bytes(ritualName).length <= MAX_RITUAL_NAME_LENGTH, "Ritual name too long");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(bytes(ipfsHash).length <= MAX_IPFS_HASH_LENGTH, "IPFS hash too long");

        _ritualIds.increment();
        ritualId = _ritualIds.current();

        bool isApproved = esepScore <= MAX_ESEP_SCORE && cedaScore >= MIN_CEDA_SCORE;

        RitualSubmission memory submission = RitualSubmission({
            ritualId: ritualId,
            submitter: msg.sender,
            bioregionId: bioregionId,
            ritualName: ritualName,
            ipfsHash: ipfsHash,
            esepScore: esepScore,
            cedaScore: cedaScore,
            isApproved: isApproved,
            submissionTimestamp: block.timestamp,
            validationTimestamp: block.timestamp,
            validationFeedback: "",
            exists: true
        });

        ritualSubmissions[ritualId] = submission;
        submitterRituals[msg.sender].push(ritualId);
        bioregionRituals[bioregionId].push(ritualId);

        bioregions[bioregionId].ritualCount++;
        totalRituals++;

        if (isApproved) {
            approvedRituals++;
        }

        emit RitualSubmitted(
            ritualId,
            msg.sender,
            bioregionId,
            ipfsHash,
            esepScore,
            cedaScore,
            isApproved,
            block.timestamp
        );

        return ritualId;
    }

    /**
     * @dev Register a new bioregion
     * @param bioregionId The unique identifier for the bioregion
     * @param name The name of the bioregion
     * @param description The description of the bioregion
     */
    function registerBioregion(
        string memory bioregionId,
        string memory name,
        string memory description
    ) external onlyOwner {
        require(bytes(bioregionId).length > 0, "Bioregion ID cannot be empty");
        require(bytes(name).length > 0, "Bioregion name cannot be empty");
        require(!bioregions[bioregionId].isActive, "Bioregion already registered");

        Bioregion memory bioregion = Bioregion({
            bioregionId: bioregionId,
            name: name,
            description: description,
            registrar: msg.sender,
            registrationTimestamp: block.timestamp,
            ritualCount: 0,
            isActive: true
        });

        bioregions[bioregionId] = bioregion;
        totalBioregions++;

        emit BioregionRegistered(
            bioregionId,
            name,
            description,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Update ritual validation feedback (owner only)
     * @param ritualId The ritual ID to update
     * @param feedback The validation feedback
     */
    function updateValidationFeedback(
        uint256 ritualId,
        string memory feedback
    ) external onlyOwner validRitualId(ritualId) {
        ritualSubmissions[ritualId].validationFeedback = feedback;
        ritualSubmissions[ritualId].validationTimestamp = block.timestamp;

        emit RitualValidated(
            ritualId,
            ritualSubmissions[ritualId].isApproved,
            feedback,
            block.timestamp
        );
    }

    /**
     * @dev Get ritual submission details
     * @param ritualId The ritual ID
     * @return submission The ritual submission data
     */
    function getRitualSubmission(uint256 ritualId)
        external
        view
        validRitualId(ritualId)
        returns (RitualSubmission memory submission)
    {
        return ritualSubmissions[ritualId];
    }

    /**
     * @dev Get bioregion details
     * @param bioregionId The bioregion ID
     * @return bioregion The bioregion data
     */
    function getBioregion(string memory bioregionId)
        external
        view
        returns (Bioregion memory bioregion)
    {
        return bioregions[bioregionId];
    }

    /**
     * @dev Get all ritual IDs for a submitter
     * @param submitter The submitter address
     * @return ritualIds Array of ritual IDs
     */
    function getSubmitterRituals(address submitter)
        external
        view
        returns (uint256[] memory ritualIds)
    {
        return submitterRituals[submitter];
    }

    /**
     * @dev Get all ritual IDs for a bioregion
     * @param bioregionId The bioregion ID
     * @return ritualIds Array of ritual IDs
     */
    function getBioregionRituals(string memory bioregionId)
        external
        view
        returns (uint256[] memory ritualIds)
    {
        return bioregionRituals[bioregionId];
    }

    /**
     * @dev Get contract statistics
     * @return _totalRituals Total number of rituals submitted
     * @return _approvedRituals Total number of approved rituals
     * @return _totalBioregions Total number of registered bioregions
     * @return _approvalRate Approval rate as percentage
     */
    function getStatistics()
        external
        view
        returns (
            uint256 _totalRituals,
            uint256 _approvedRituals,
            uint256 _totalBioregions,
            uint256 _approvalRate
        )
    {
        _totalRituals = totalRituals;
        _approvedRituals = approvedRituals;
        _totalBioregions = totalBioregions;
        _approvalRate = totalRituals > 0 ? (approvedRituals * 100) / totalRituals : 0;
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

    /**
     * @dev Deactivate a bioregion (owner only)
     * @param bioregionId The bioregion ID to deactivate
     */
    function deactivateBioregion(string memory bioregionId) external onlyOwner {
        require(bioregions[bioregionId].isActive, "Bioregion already inactive");
        bioregions[bioregionId].isActive = false;
    }

    /**
     * @dev Reactivate a bioregion (owner only)
     * @param bioregionId The bioregion ID to reactivate
     */
    function reactivateBioregion(string memory bioregionId) external onlyOwner {
        require(!bioregions[bioregionId].isActive, "Bioregion already active");
        bioregions[bioregionId].isActive = true;
    }
}