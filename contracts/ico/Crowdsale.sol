// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../token/Ritz.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract Crowdsale is ReentrancyGuard {
    using SafeMath for uint256;

    // The token being sold
    Ritz public token;

    // Starting Date
    // ============
    // August 21, 2021 12:00:00 AM => 1629504000 timestamp
    uint256 public preIcoStartTime = 1628726400;

    // End Date
    // ============
    // August 21, 2021 11:59:00 PM => 1628812799 timestamp
    uint256 public preIcoEndTime = 1628812799;

    // Starting Date
    // ============
    // September 18, 2021 12:00:00 AM => 1631923200 timestamp
    uint256 public icoStartTime = 1631923200;

    // End Date
    // ============
    // September 18, 2021 11:59:00 PM => 1632009540 timestamp
    uint256 public icoEndTime = 1632009599;

    // ICO Stages
    // ============
    enum CrowdsaleStage {
        PREICO,
        ICO
    }
    CrowdsaleStage public stage = CrowdsaleStage.PREICO; // By default it's Pre ICO

    // HardCap and SoftCaps
    // =============================
    uint256 public constant MaximumGoal = 10000 ether;
    uint256 public constant MinimumGoal = 5000 ether;
    // ==============================

    // Token Distribution
    // =============================
    uint256 public totalSold;
    uint256 public maxTokens = 1000000000000 ether; // There will be total 1000000000000 RITZ Tokens (100 %)
    // totalTokensForSale will be used for PreICO and ICO
    // RITZ will be reserved for PreICO Crowdsale (40 %)
    // 400000000000 RITZ will be sold in Crowdsale (40%)
    uint256 public totalTokensForSale = 400000000000 ether;
    // 100000000000 RITZ will be reserved for early investors (10%)
    uint256 public earlyInvestorBonus = 100000000000 ether;

    // Investors and Founders addresses
    // =============================
    address[] public investorsAllocatedAddresses;

    address[] public foundersAllocatedAddresses;

    mapping(address => uint256) public investorsAllocated;

    mapping(address => uint256) public foundersAllocated;

    // 200 RITZ will be reserved for investors (15%)
    uint256 public constant investorsAllocation = 150000000000 ether;

    // 200 RITZ will be reserved for founders (35%)
    uint256 public constant foundersAllocation = 350000000000 ether;

    uint256 public investorsTotalAllocated = 0;

    uint256 public teamTotalAllocated = 0;

    uint256 public investorsProcessed;

    uint256 public foundersProcessed;

    // ==============================

    uint256 public totalBonusedTokens;

    // minimum and maximum amount of ether a user can send
    uint256 public maxEtherAmount = 5000 ether;
    uint256 public minEtherAmount = 0.05 ether;

    // address where funds are collected
    address payable public wallet;

    // how many token units a buyer gets per wei
    uint256 public rate = 2000 ether;

    // amount of raised money in wei
    uint256 public weiRaised;

    // Amount raised in PreICO
    // ==================
    uint256 public totalWeiRaisedDuringPreICO;
    // ===================

    // Events
    event EthTransferred(string text);
    event EthRefunded(string text);

    modifier checkDeposit(uint256 value) {
        require(value >= minEtherAmount, "Crowdsale: Minimum deposit is 0.05");
        require(value <= maxEtherAmount, "Crowdsale: Maximum deposit is 5000");
        _;
    }

    modifier checkPreIcoTime() {
        if ((stage == CrowdsaleStage.PREICO) && (block.timestamp < preIcoStartTime))
            revert("Crowdsale: PRE_ICO_NOT_STARTED");
        if ((stage == CrowdsaleStage.PREICO) && (block.timestamp > preIcoEndTime)) revert("Crowdsale: PRE_ICO_ENDED");
        _;
    }

    modifier checkIcoTime() {
        if ((stage == CrowdsaleStage.ICO) && (block.timestamp < icoStartTime)) revert("Crowdsale: ICO_NOT_STARTED");
        if ((stage == CrowdsaleStage.ICO) && (block.timestamp > icoEndTime)) revert("Crowdsale: ICO_ENDED");
        _;
    }

    modifier checkCaps(uint256 weiAmount) {
        uint256 tokens = weiAmount.mul(rate).div(10**18);
        if (token.totalSupply() + tokens > totalTokensForSale) revert("CROWDSALE_LIMIT_REACHED");
        _;
    }

    function isValidTimePeriod() internal view returns (bool) {
        return ((block.timestamp >= preIcoStartTime && block.timestamp <= preIcoEndTime) ||
            (block.timestamp >= icoStartTime && block.timestamp <= icoEndTime));
    }

    /**
     * event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    constructor(address _wallet) {
        require(_wallet != address(0));

        token = createTokenContract();
        wallet = payable(_wallet);
    }

    // creates the token to be sold.
    // override this method to have crowdsale of a specific mintable token.
    function createTokenContract() internal returns (Ritz) {
        return new Ritz("RITZ coin", "RITZ");
    }

    // fallback function can be used to buy tokens
    fallback() external payable {
        buyTokens(msg.sender);
    }

    receive() external payable virtual {
        buyTokens(msg.sender);
    }

    // low level token purchase function
    function buyTokens(address beneficiary)
        public
        payable
        nonReentrant
        checkPreIcoTime
        checkIcoTime
        checkCaps(msg.value)
        checkDeposit(msg.value)
    {
        require(beneficiary != address(0),"ZERO_ADDRESS");
        require(validPurchase());
        uint256 bonus = 0;
        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = weiAmount.mul(rate).div(10**18);

        if (stage == CrowdsaleStage.PREICO) {
            if (totalBonusedTokens < earlyInvestorBonus) {
                bonus = tokens.mul(2).div(10); // 20% bouns
                tokens = tokens.add(bonus);
                totalBonusedTokens = totalBonusedTokens.add(bonus);
            }
        }

        // update state
        weiRaised = weiRaised.add(weiAmount);
        if (stage == CrowdsaleStage.PREICO) {
            totalWeiRaisedDuringPreICO = totalWeiRaisedDuringPreICO.add(weiAmount);
        }
        totalSold = totalSold.add(tokens);
        token.mint(beneficiary, tokens);
        emit TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    // send ether to the fund collection wallet
    // override to create custom fund forwarding mechanisms
    function forwardFunds() internal virtual {
        wallet.transfer(msg.value);
    }

    // @return true if the transaction can buy tokens
    function validPurchase() internal view virtual returns (bool) {
        bool withinPeriod = isValidTimePeriod();
        bool nonZeroPurchase = msg.value != 0;
        return withinPeriod && nonZeroPurchase;
    }

    // @return true if crowdsale event has ended
    function hasEnded() public view virtual returns (bool) {
        return block.timestamp > icoEndTime;
    }
}
