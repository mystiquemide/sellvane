// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SellvaneSeller} from "../src/SellvaneSeller.sol";
import {SellvaneTestToken} from "../src/SellvaneTestToken.sol";
import {ISpendPermissionManager, SpendPermission} from "../src/ISpendPermissionManager.sol";

interface ICoinbaseSmartWalletFactory {
    function createAccount(bytes[] calldata owners, uint256 nonce) external payable returns (address);
}

interface ICoinbaseSmartWallet {
    function addOwnerAddress(address owner) external;
    function replaySafeHash(bytes32 hash) external view returns (bytes32);
}

struct SignatureWrapper {
    uint256 ownerIndex;
    bytes signatureData;
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96)
        external
        payable
        returns (address pool);

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

/// Fork tests against live Base mainnet: SpendPermissionManager, Coinbase Smart Wallet factory,
/// Uniswap v3 SwapRouter02 and NonfungiblePositionManager.
contract SellvaneSellerTest is Test {
    address constant MANAGER = 0xf85210B21cC50302F477BA56686d2019dC9b67Ad;
    address constant FACTORY = 0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842;
    address constant ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant NPM = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    uint24 constant FEE = 10000;

    uint256 constant OWNER_PK = 0xA11CE;

    SellvaneSeller seller;
    SellvaneTestToken token;
    address account;
    address ownerEoa;
    address operator = address(0x0FE7A704);

    function setUp() public {
        vm.createSelectFork(vm.envOr("BASE_RPC", string("https://mainnet.base.org")));
        vm.store(0x4200000000000000000000000000000000000015, bytes32(uint256(8)), bytes32(uint256(1)));

        ownerEoa = vm.addr(OWNER_PK);
        seller = new SellvaneSeller(MANAGER, ROUTER, WETH, operator);

        bytes[] memory owners = new bytes[](1);
        owners[0] = abi.encode(ownerEoa);
        account = ICoinbaseSmartWalletFactory(FACTORY).createAccount(owners, 0);
        vm.prank(ownerEoa);
        ICoinbaseSmartWallet(account).addOwnerAddress(MANAGER);

        address[] memory to = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        to[0] = account;
        amounts[0] = 1_000_000e18;
        to[1] = address(this);
        amounts[1] = 1_000e18;
        token = new SellvaneTestToken("Vane Demo", "VDEMO", 1_001_000e18, to, amounts);

        _seedPool(1_000e18, 1_000e18);
    }

    // ------------------------------------------------------------------ helpers

    function _seedPool(uint256 tokenAmt, uint256 wethAmt) internal {
        deal(WETH, address(this), wethAmt);
        (address t0, address t1) = address(token) < WETH ? (address(token), WETH) : (WETH, address(token));
        (uint256 a0, uint256 a1) = address(token) < WETH ? (tokenAmt, wethAmt) : (wethAmt, tokenAmt);
        INonfungiblePositionManager(NPM).createAndInitializePoolIfNecessary(t0, t1, FEE, uint160(1 << 96));
        IERC20(address(token)).approve(NPM, tokenAmt);
        IERC20(WETH).approve(NPM, wethAmt);
        INonfungiblePositionManager(NPM).mint(
            INonfungiblePositionManager.MintParams({
                token0: t0,
                token1: t1,
                fee: FEE,
                tickLower: -887200,
                tickUpper: 887200,
                amount0Desired: a0,
                amount1Desired: a1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            })
        );
    }

    function _permission(uint160 allowance, uint256 salt) internal view returns (SpendPermission memory) {
        return SpendPermission({
            account: account,
            spender: address(seller),
            token: address(token),
            allowance: allowance,
            period: 1 days,
            start: uint48(block.timestamp - 600),
            end: type(uint48).max,
            salt: salt,
            extraData: ""
        });
    }

    function _sign(SpendPermission memory p) internal view returns (bytes memory) {
        bytes32 h = ISpendPermissionManager(MANAGER).getHash(p);
        bytes32 digest = ICoinbaseSmartWallet(p.account).replaySafeHash(h);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_PK, digest);
        return abi.encode(SignatureWrapper({ownerIndex: 0, signatureData: abi.encodePacked(r, s, v)}));
    }

    function _assertNoResidue() internal view {
        assertEq(token.balanceOf(address(seller)), 0, "tokens rested in seller");
        assertEq(IERC20(WETH).balanceOf(address(seller)), 0, "weth rested in seller");
        assertEq(address(seller).balance, 0, "eth rested in seller");
    }

    // -------------------------------------------------------------------- tests

    function test_sell_happyPath_ethGoesToTeamAccount() public {
        SpendPermission memory p = _permission(50e18, 0);
        bytes memory sig = _sign(p);
        uint256 ethBefore = account.balance;

        vm.recordLogs();
        vm.prank(operator);
        uint256 out = seller.sell(p, sig, true, 10e18, 1, FEE);

        assertGt(out, 0, "no eth out");
        assertEq(account.balance - ethBefore, out, "team account did not receive proceeds");
        assertEq(token.balanceOf(account), 1_000_000e18 - 10e18, "wrong amount left account");
        _assertNoResidue();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 soldTopic = keccak256("Sold(bytes32,address,address,uint256,uint256)");
        bool found;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter == address(seller) && logs[i].topics[0] == soldTopic) found = true;
        }
        assertTrue(found, "Sold not emitted");
    }

    function test_sell_secondSell_withoutApprove() public {
        SpendPermission memory p = _permission(50e18, 0);
        vm.startPrank(operator);
        seller.sell(p, _sign(p), true, 10e18, 1, FEE);
        seller.sell(p, "", false, 10e18, 1, FEE);
        vm.stopPrank();
        assertEq(token.balanceOf(account), 1_000_000e18 - 20e18);
        _assertNoResidue();
    }

    function test_sell_overCap_singleSell_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        bytes memory sig = _sign(p);
        vm.prank(operator);
        vm.expectRevert();
        seller.sell(p, sig, true, 25e18, 1, FEE);
        assertEq(token.balanceOf(account), 1_000_000e18, "tokens left account on revert");
    }

    function test_sell_overCap_cumulative_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        vm.startPrank(operator);
        seller.sell(p, _sign(p), true, 15e18, 1, FEE);
        vm.expectRevert();
        seller.sell(p, "", false, 10e18, 1, FEE);
        vm.stopPrank();
    }

    function test_sell_capResetsNextPeriod() public {
        SpendPermission memory p = _permission(20e18, 0);
        bytes memory sig = _sign(p);
        vm.prank(operator);
        seller.sell(p, sig, true, 20e18, 1, FEE);
        vm.warp(block.timestamp + 1 days);
        vm.prank(operator);
        seller.sell(p, "", false, 20e18, 1, FEE);
        assertEq(token.balanceOf(account), 1_000_000e18 - 40e18);
    }

    function test_sell_nonOperator_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        bytes memory sig = _sign(p);
        vm.prank(address(0xBAD));
        vm.expectRevert(SellvaneSeller.NotOperator.selector);
        seller.sell(p, sig, true, 1e18, 1, FEE);
    }

    function test_sell_wrongSpender_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        p.spender = address(0xBEEF);
        vm.prank(operator);
        vm.expectRevert(SellvaneSeller.WrongSpender.selector);
        seller.sell(p, "", true, 1e18, 1, FEE);
    }

    function test_sell_zeroPriceFloor_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        bytes memory sig = _sign(p);
        vm.prank(operator);
        vm.expectRevert(SellvaneSeller.NoPriceFloor.selector);
        seller.sell(p, sig, true, 1e18, 0, FEE);
    }

    function test_sell_priceFloorTooHigh_reverts() public {
        SpendPermission memory p = _permission(20e18, 0);
        bytes memory sig = _sign(p);
        vm.prank(operator);
        vm.expectRevert();
        seller.sell(p, sig, true, 10e18, 10e18, FEE);
        assertEq(token.balanceOf(account), 1_000_000e18, "tokens left account on revert");
    }

    function test_unexpectedEth_reverts() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(seller).call{value: 1 ether}("");
        assertFalse(ok, "seller accepted stray eth");
    }

    function test_setOperator() public {
        vm.prank(operator);
        seller.setOperator(address(0x1234));
        assertEq(seller.operator(), address(0x1234));
        vm.prank(operator);
        vm.expectRevert(SellvaneSeller.NotOperator.selector);
        seller.setOperator(operator);
    }
}
