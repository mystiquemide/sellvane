// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @title SellvaneTestToken
/// @notice Fixed-supply ERC20 used to run Sellvane end to end on Base mainnet.
///         No mint after deploy, no owner, no fees.
contract SellvaneTestToken is ERC20 {
    constructor(string memory name_, string memory symbol_, uint256 supply, address[] memory to, uint256[] memory amounts)
        ERC20(name_, symbol_)
    {
        require(to.length == amounts.length, "length");
        uint256 total;
        for (uint256 i; i < to.length; ++i) {
            _mint(to[i], amounts[i]);
            total += amounts[i];
        }
        require(total == supply, "supply");
    }
}
