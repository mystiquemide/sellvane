// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {ISpendPermissionManager, SpendPermission} from "./ISpendPermissionManager.sol";

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IWETH {
    function withdraw(uint256 amount) external;
}

/// @title SellvaneSeller
/// @notice The only spender named in a team's Sellvane spend permission. One `sell()` pulls
///         unlocked team tokens through the SpendPermissionManager (which enforces the daily
///         cap), swaps them for WETH on Uniswap v3, unwraps, and sends the ETH to the team's
///         own account, all in one transaction.
/// @dev Custody: proceeds always go to `p.account`. There is no withdraw path and no arbitrary
///      call. Tokens and ETH only pass through during `sell()`.
contract SellvaneSeller {
    using SafeERC20 for IERC20;

    ISpendPermissionManager public immutable manager;
    ISwapRouter02 public immutable router;
    address public immutable weth;

    /// @notice Agent key allowed to trigger sells. It can only sell inside a permission's cap,
    ///         with a price floor, and proceeds can only go to the team account.
    address public operator;

    event Sold(
        bytes32 indexed permissionHash,
        address indexed account,
        address indexed token,
        uint256 amountIn,
        uint256 ethOut
    );
    event OperatorChanged(address indexed previousOperator, address indexed newOperator);

    error NotOperator();
    error ZeroAddress();
    error WrongSpender();
    error ApproveFailed();
    error NoPriceFloor();
    error EthTransferFailed();
    error UnexpectedEth();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address manager_, address router_, address weth_, address operator_) {
        if (manager_ == address(0) || router_ == address(0) || weth_ == address(0) || operator_ == address(0)) {
            revert ZeroAddress();
        }
        manager = ISpendPermissionManager(manager_);
        router = ISwapRouter02(router_);
        weth = weth_;
        operator = operator_;
    }

    /// @notice Sell `amount` of the permission's token for ETH, sent to the team account.
    /// @param p The team's spend permission naming this contract as spender.
    /// @param signature Owner signature for approveWithSignature (only used if `needsApprove`).
    /// @param needsApprove True on the first sell of a permission not yet approved on chain.
    /// @param amount Token amount to sell. The manager reverts if it exceeds the period cap.
    /// @param minEthOut Price floor. Must be non-zero so every sell is impact-bounded on chain.
    /// @param fee Uniswap v3 pool fee tier.
    function sell(
        SpendPermission calldata p,
        bytes calldata signature,
        bool needsApprove,
        uint160 amount,
        uint256 minEthOut,
        uint24 fee
    ) external onlyOperator returns (uint256 ethOut) {
        if (p.spender != address(this)) revert WrongSpender();
        if (minEthOut == 0) revert NoPriceFloor();

        if (needsApprove && !manager.approveWithSignature(p, signature)) revert ApproveFailed();

        manager.spend(p, amount);

        IERC20(p.token).forceApprove(address(router), amount);
        ethOut = router.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: p.token,
                tokenOut: weth,
                fee: fee,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: minEthOut,
                sqrtPriceLimitX96: 0
            })
        );

        IWETH(weth).withdraw(ethOut);
        (bool ok,) = p.account.call{value: ethOut}("");
        if (!ok) revert EthTransferFailed();

        emit Sold(manager.getHash(p), p.account, p.token, amount, ethOut);
    }

    function setOperator(address newOperator) external onlyOperator {
        if (newOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    /// @dev Only WETH unwrapping may send ETH here.
    receive() external payable {
        if (msg.sender != weth) revert UnexpectedEth();
    }
}
