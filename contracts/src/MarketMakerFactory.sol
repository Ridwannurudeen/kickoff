// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IConditionalTokens} from "./interfaces/IConditionalTokens.sol";
import {FixedProductMarketMaker} from "./FixedProductMarketMaker.sol";

/// @title MarketMakerFactory
/// @notice Deploys one FixedProductMarketMaker (EIP-1167 clone) per market and prepares its
///         underlying binary condition. Markets are owned by this factory's owner (the treasury).
contract MarketMakerFactory is Ownable {
    address public immutable conditionalTokens;
    address public immutable implementation;
    uint256 public defaultFeeBps;

    address[] public allMarkets;
    mapping(address market => bytes32 conditionId) public marketCondition;

    event MarketCreated(
        address indexed market,
        bytes32 indexed conditionId,
        address collateral,
        uint8 outcomeSlotCount,
        string metadataURI
    );
    event DefaultFeeUpdated(uint256 feeBps);

    constructor(address ct, address impl, uint256 feeBps, address owner_) Ownable(owner_) {
        require(ct != address(0) && impl != address(0), "zero addr");
        require(feeBps <= 1000, "fee too high");
        conditionalTokens = ct;
        implementation = impl;
        defaultFeeBps = feeBps;
    }

    /// @notice Prepare an `outcomeSlotCount`-way condition for `questionId` and deploy its market maker.
    function createMarket(address collateral, bytes32 questionId, uint8 outcomeSlotCount, string calldata metadataURI)
        external
        onlyOwner
        returns (address market, bytes32 conditionId)
    {
        conditionId = IConditionalTokens(conditionalTokens).prepareCondition(collateral, questionId, outcomeSlotCount);
        market = Clones.clone(implementation);
        FixedProductMarketMaker(market)
            .initialize(conditionalTokens, collateral, conditionId, outcomeSlotCount, defaultFeeBps, owner());
        allMarkets.push(market);
        marketCondition[market] = conditionId;
        emit MarketCreated(market, conditionId, collateral, outcomeSlotCount, metadataURI);
    }

    function setDefaultFeeBps(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "fee too high");
        defaultFeeBps = feeBps;
        emit DefaultFeeUpdated(feeBps);
    }

    function marketsLength() external view returns (uint256) {
        return allMarkets.length;
    }
}
