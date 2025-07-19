// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GRC_RitualSubmission
 * @dev Smart contract for logging ritual submissions on Base testnet
 * @author Valtid Caushi - Symbiotic Syntheconomy v1.0
 */
contract GRC_RitualSubmission is Ownable, Pausable, ReentrancyGuard {

    struct Ritual {
        string ipfsHash;
        string bioregionId;
        address author;
        uint256 esepScore;      // 0-1000 (0.0-1.0 * 1000)
        uint256 cedaScore;      // Number of cultural references
        uint256 narrativeScore; // 0-1000 (0.0-1.0 * 1000)
        bool isApproved;
        uint256 timestamp;
    }

    struct Statistics {
        uint256 totalSubmissions;
        uint256 approvedSubmissions;
        uint256 rejectedSubmissions;
        uint256 approvalRate;   // 0-1000 (0.0-1.0 * 1000)
    }

    // State variables
    uint256 private _ritualCounter;
    mapping(uint256 => Ritual) private _rituals;
    mapping(string => string) private _bioregionNames;
    mapping(string => uint256) private _submissionsByBioregion;
    string[] private _registeredBioregions;

    // Events
    event RitualSubmitted(
        uint256 indexed ritualId,
        string indexed ipfsHash,
        string indexed bioregionId,
        address author,
        uint256 esepScore,
        uint256 cedaScore,
        uint256 narrativeScore,
        bool isApproved
    );

    event BioregionRegistered(string indexed bioregionId, string name);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    // Errors
    error BioregionNotRegistered(string bioregionId);
    error BioregionAlreadyRegistered(string bioregionId);
    error RitualNotFound(uint256 ritualId);
    error InvalidScore(uint256 score, uint256 maxScore);

    /**
     * @dev Constructor
     */
    constructor() Ownable() {
        _ritualCounter = 0;
    }

    /**
     * @dev Register a new bioregion
     * @param bioregionId Unique identifier for the bioregion
     * @param name Display name for the bioregion
     */
    function registerBioregion(string calldata bioregionId, string calldata name)
        external
        onlyOwner
    {
        if (bytes(_bioregionNames[bioregionId]).length > 0) {
            revert BioregionAlreadyRegistered(bioregionId);
        }

        _bioregionNames[bioregionId] = name;
        _registeredBioregions.push(bioregionId);

        emit BioregionRegistered(bioregionId, name);
    }

    /**
     * @dev Submit a ritual for logging
     * @param ipfsHash IPFS hash of the ritual metadata
     * @param bioregionId ID of the bioregion
     * @param author Address of the ritual author
     * @param esepScore ESEP validation score (0-1000)
     * @param cedaScore CEDA cultural reference count
     * @param narrativeScore Narrative forensics score (0-1000)
     * @param isApproved Whether the ritual passed validation
     */
    function submitRitual(
        string calldata ipfsHash,
        string calldata bioregionId,
        address author,
        uint256 esepScore,
        uint256 cedaScore,
        uint256 narrativeScore,
        bool isApproved
    )
        external
        whenNotPaused
        nonReentrant
    {
        // Validate bioregion is registered
        if (bytes(_bioregionNames[bioregionId]).length == 0) {
            revert BioregionNotRegistered(bioregionId);
        }

        // Validate scores
        if (esepScore > 1000) {
            revert InvalidScore(esepScore, 1000);
        }
        if (narrativeScore > 1000) {
            revert InvalidScore(narrativeScore, 1000);
        }

        _ritualCounter++;

        Ritual memory ritual = Ritual({
            ipfsHash: ipfsHash,
            bioregionId: bioregionId,
            author: author,
            esepScore: esepScore,
            cedaScore: cedaScore,
            narrativeScore: narrativeScore,
            isApproved: isApproved,
            timestamp: block.timestamp
        });

        _rituals[_ritualCounter] = ritual;
        _submissionsByBioregion[bioregionId]++;

        emit RitualSubmitted(
            _ritualCounter,
            ipfsHash,
            bioregionId,
            author,
            esepScore,
            cedaScore,
            narrativeScore,
            isApproved
        );
    }

    /**
     * @dev Get ritual by ID
     * @param ritualId ID of the ritual
     * @return ritual Ritual data
     */
    function getRitual(uint256 ritualId) external view returns (Ritual memory ritual) {
        if (ritualId == 0 || ritualId > _ritualCounter) {
            revert RitualNotFound(ritualId);
        }
        return _rituals[ritualId];
    }

    /**
     * @dev Get bioregion name
     * @param bioregionId ID of the bioregion
     * @return name Display name of the bioregion
     */
    function getBioregionName(string calldata bioregionId) external view returns (string memory name) {
        return _bioregionNames[bioregionId];
    }

    /**
     * @dev Get number of submissions for a bioregion
     * @param bioregionId ID of the bioregion
     * @return count Number of submissions
     */
    function getSubmissionsByBioregion(string calldata bioregionId) external view returns (uint256 count) {
        return _submissionsByBioregion[bioregionId];
    }

    /**
     * @dev Get total number of bioregions
     * @return count Number of registered bioregions
     */
    function getBioregionCount() external view returns (uint256 count) {
        return _registeredBioregions.length;
    }

    /**
     * @dev Get total number of ritual submissions
     * @return count Total submissions
     */
    function getTotalSubmissions() external view returns (uint256 count) {
        return _ritualCounter;
    }

    /**
     * @dev Get comprehensive statistics
     * @return stats Statistics struct
     */
    function getStatistics() external view returns (Statistics memory stats) {
        uint256 total = _ritualCounter;
        uint256 approved = 0;
        uint256 rejected = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (_rituals[i].isApproved) {
                approved++;
            } else {
                rejected++;
            }
        }

        uint256 approvalRate = total > 0 ? (approved * 1000) / total : 0;

        return Statistics({
            totalSubmissions: total,
            approvedSubmissions: approved,
            rejectedSubmissions: rejected,
            approvalRate: approvalRate
        });
    }

    /**
     * @dev Get all registered bioregions
     * @return bioregions Array of bioregion IDs
     */
    function getRegisteredBioregions() external view returns (string[] memory bioregions) {
        return _registeredBioregions;
    }

    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @dev Check if contract is paused
     * @return bool True if paused
     */
    function paused() public view override returns (bool) {
        return super.paused();
    }
}