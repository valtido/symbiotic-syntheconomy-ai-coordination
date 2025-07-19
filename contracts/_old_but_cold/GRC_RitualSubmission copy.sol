// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GRC_RitualSubmission {
    event RitualSubmitted(address indexed submitter, string ritualData);

    function submitRitual(string calldata ritualData) external {
        emit RitualSubmitted(msg.sender, ritualData);
    }
}