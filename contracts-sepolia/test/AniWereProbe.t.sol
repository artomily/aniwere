// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AniWereProbe, IPool} from "../src/AniWereProbe.sol";

contract MockPool is IPool {
    mapping(address => uint256[6]) internal data;

    function set(address user, uint256 coll, uint256 debt, uint256 hf) external {
        data[user] = [coll, debt, 0, 0, 0, hf];
    }

    function getUserAccountData(address user)
        external
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256)
    {
        uint256[6] memory d = data[user];
        return (d[0], d[1], d[2], d[3], d[4], d[5]);
    }
}

contract AniWereProbeTest is Test {
    AniWereProbe internal probe;
    MockPool internal pool;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    event PositionProbedForCover(
        address indexed user,
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 healthFactor,
        uint256 probedAt
    );

    function setUp() public {
        pool = new MockPool();
        probe = new AniWereProbe(address(pool));
    }

    function test_ProbeEmitsSnapshot() public {
        pool.set(alice, 10_000e8, 4_000e8, 1.6e18);

        vm.expectEmit(true, false, false, true);
        emit PositionProbedForCover(alice, 10_000e8, 4_000e8, 1.6e18, block.timestamp);

        probe.probe(alice);
    }

    /// @dev Ini bukan sekadar tes, ini properti desain: siapa pun boleh
    ///      mem-probe siapa pun. Kalau tes ini gagal, artinya seseorang
    ///      menambahkan gatekeeper dan trust assumption kembali muncul.
    function test_ProbeIsPermissionless() public {
        pool.set(alice, 5_000e8, 1_000e8, 3e18);

        vm.prank(bob);
        probe.probe(alice);
    }

    function test_RevertOnZeroAddress() public {
        vm.expectRevert(AniWereProbe.ZeroAddress.selector);
        probe.probe(address(0));
    }

    function test_BatchProbe() public {
        pool.set(alice, 1e8, 0, type(uint256).max);
        pool.set(bob, 2e8, 1e8, 1.2e18);

        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob;

        vm.recordLogs();
        probe.probeBatch(users);
        assertEq(vm.getRecordedLogs().length, 2);
    }
}
