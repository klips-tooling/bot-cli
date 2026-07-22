// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title {{TOKEN_NAME}}
 * @dev ERC-20 token scaffolded by bot-cli for BOT Chain
 */
contract {{TOKEN_NAME}} is ERC20, ERC20Burnable, Ownable {
    constructor(address initialOwner)
        ERC20("{{TOKEN_NAME}}", "{{TOKEN_SYMBOL}}")
        Ownable(initialOwner)
    {
        // Mint 1,000,000 tokens to the deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Mint additional tokens (owner only)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
