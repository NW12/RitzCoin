// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract Ritz is ERC20Capped, Pausable, Ownable, ERC20Permit {
    uint256 private constant CAPPED_SUPPLY = 1000000000000 ether;
    bool public mintingFinished = false;

    constructor(string memory _name, string memory _symbol)
        ERC20Permit(_name)
        ERC20(_name, _symbol)
        ERC20Capped(CAPPED_SUPPLY)
    {}

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    function finishMinting() public onlyOwner canMint returns (bool) {
        mintingFinished = true;
        return true;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _mint(address account, uint256 amount) internal virtual override(ERC20Capped, ERC20) {
        ERC20Capped._mint(account, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
