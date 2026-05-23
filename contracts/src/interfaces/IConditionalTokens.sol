// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Minimal interface to the simplified binary conditional-tokens contract,
///         covering only the surface the AMM and factory call.
interface IConditionalTokens {
    function prepareCondition(address collateral, bytes32 questionId, uint8 outcomeSlotCount)
        external
        returns (bytes32 conditionId);

    function splitPosition(bytes32 conditionId, uint256 amount) external;

    function mergePositions(bytes32 conditionId, uint256 amount) external;

    function getPositionId(address collateral, bytes32 conditionId, uint8 outcomeIndex) external pure returns (uint256);

    /// @return 0=None, 1=Open, 2=Resolved, 3=Voided
    function conditionStatus(bytes32 conditionId) external view returns (uint8);

    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint8);

    function reportPayouts(bytes32 conditionId, uint256[] calldata payouts) external;

    function payoutNumerators(bytes32 conditionId) external view returns (uint256[] memory);

    function balanceOf(address account, uint256 id) external view returns (uint256);

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
}
