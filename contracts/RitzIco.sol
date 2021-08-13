// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./ico/CappedCrowdsale.sol";
import "./ico/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Ritz ICO
 * @author salmancodez@gmail.com
 * @dev Crowdsale is a base contract for managing a token crowdsale
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them Ritz tokens based
 * on a Ritz token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive
 */
contract RitzIco is CappedCrowdsale, RefundableCrowdsale {
    using SafeMath for uint256;

    // Constructor
    // ============
    constructor(address _wallet)
        CappedCrowdsale(MaximumGoal, MinimumGoal)
        FinalizableCrowdsale()
        RefundableCrowdsale(MinimumGoal)
        Crowdsale(_wallet)
    {}

    // =============

    // Crowdsale Stage Management
    // =========================================================

    // Change Crowdsale Stage. Available Options: PreICO, ICO
    function setCrowdsaleStage(uint256 value) public onlyOwner {
        CrowdsaleStage _stage;

        if (uint256(CrowdsaleStage.PREICO) == value) {
            _stage = CrowdsaleStage.PREICO;
        } else if (uint256(CrowdsaleStage.ICO) == value) {
            _stage = CrowdsaleStage.ICO;
        }

        stage = _stage;
    }

    // ================ Stage Management Over =====================

    // Token Purchase
    // =========================
    receive() external payable override {
        buyTokens(msg.sender);
    }

    function forwardFunds() internal override(RefundableCrowdsale, Crowdsale) {
        if (stage == CrowdsaleStage.PREICO) {
            wallet.transfer(msg.value);
            emit EthTransferred("forwarding funds to wallet");
        } else if (stage == CrowdsaleStage.ICO) {
            emit EthTransferred("forwarding funds to refundable vault");
            RefundableCrowdsale.forwardFunds();
        }
    }

    // ===========================

    // Finish: Mint Extra Tokens as needed before finalizing the Crowdsale.
    // ====================================================================

    function finish() public onlyOwner {
        require(!isFinalized,"FINISHED");
        require(totalSold < maxTokens);
        uint256 unsoldTokens = totalTokensForSale.sub(totalSold);
        if (unsoldTokens > 0) {
            token.mint(owner(), unsoldTokens);
        }
        finalize();
    }

    // ===============================

    function validPurchase() internal view override(CappedCrowdsale, Crowdsale) returns (bool isValidPurchase) {
        return CappedCrowdsale.validPurchase();
    }

    function hasEnded() public view virtual override(CappedCrowdsale, Crowdsale) returns (bool) {
        return CappedCrowdsale.hasEnded();
    }

    /**
     * @dev Functions to set the pre-allocated amount of tokens of addresses to receive
     * @dev Only the owner can call the functions
     * @param destination Array of addresses to receive tokens.
     * @param value  Amount of tokens for each address to receive.
     */
    function addInvestorAllocation(address[] calldata destination, uint256[] calldata value) external onlyOwner {
        require(destination.length == value.length);
        uint256 len = destination.length;
        uint256 sum = 0;

        for (uint256 i = 0; i < len; ++i) {
            require(destination[i] != address(0));
            sum = sum.add(value[i]);
        }

        investorsTotalAllocated = investorsTotalAllocated.add(sum);

        require(investorsTotalAllocated < investorsAllocation,"INVESTOR_ALLOCATION_LIMIT_REACHED");

        for (uint256 j = 0; j < len; ++j) {
            if (investorsAllocated[destination[j]] == 0) investorsAllocatedAddresses.push(destination[j]);

            investorsAllocated[destination[j]] = investorsAllocated[destination[j]].add(value[j]);
        }
    }

    function addTeamAllocation(address[] calldata destination, uint256[] calldata value) external onlyOwner {
        require(destination.length == value.length);
        uint256 len = destination.length;
        uint256 sum = 0;

        for (uint256 i = 0; i < len; ++i) {
            require(destination[i] != address(0));
            sum = sum.add(value[i]);
        }

        teamTotalAllocated = teamTotalAllocated.add(sum);

        require(teamTotalAllocated < foundersAllocation,"FOUNDERS_ALLOCATION_LIMIT_REACHED");

        for (uint256 j = 0; j < len; ++j) {
            if (foundersAllocated[destination[j]] == 0) foundersAllocatedAddresses.push(destination[j]);

            foundersAllocated[destination[j]] = foundersAllocated[destination[j]].add(value[j]);
        }
    }

    /**
     * @dev Functions to distribute tokens to the pre-allocated addresses
     * @dev Every address is processed only once.
     * @dev Privileged users or owner can call the functions
     * @param count count of addresses to process.
     */
    function distributeToPrivateInvestors(uint256 count) external onlyOwner {
        require(hasEnded(),"NOT_ENDED");

        uint256 addressesLeft = investorsAllocatedAddresses.length.sub(investorsProcessed);
        uint256 top = investorsProcessed.add(count);

        if (count > addressesLeft) top = investorsProcessed.add(addressesLeft);

        for (uint256 i = investorsProcessed; i < top; ++i) {
            token.mint(investorsAllocatedAddresses[i], investorsAllocated[investorsAllocatedAddresses[i]]);
            ++investorsProcessed;
        }
    }

    function distributeToTeam(uint256 count) external onlyOwner {
        require(hasEnded());

        uint256 addressesLeft = foundersAllocatedAddresses.length.sub(foundersProcessed);
        uint256 top = foundersProcessed.add(count);

        if (count > addressesLeft) top = foundersProcessed.add(addressesLeft);

        for (uint256 i = foundersProcessed; i < top; ++i) {
            token.mint(foundersAllocatedAddresses[i], foundersAllocated[foundersAllocatedAddresses[i]]);
            ++foundersProcessed;
        }
    }
}
