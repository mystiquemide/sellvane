// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Spend permission struct matching coinbase/spend-permissions as deployed on Base
///         mainnet at 0xf85210B21cC50302F477BA56686d2019dC9b67Ad.
struct SpendPermission {
    address account;
    address spender;
    address token;
    uint160 allowance;
    uint48 period;
    uint48 start;
    uint48 end;
    uint256 salt;
    bytes extraData;
}

interface ISpendPermissionManager {
    function approveWithSignature(SpendPermission calldata spendPermission, bytes calldata signature)
        external
        returns (bool);

    function spend(SpendPermission calldata spendPermission, uint160 value) external;

    function getHash(SpendPermission calldata spendPermission) external view returns (bytes32);
}
