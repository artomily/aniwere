// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAttestcoinProver, VerifiedLog} from "../src/interfaces/IAttestcoinProver.sol";

/// @notice Pengganti Block Prover Precompile untuk testing lokal.
/// @dev Menerima log yang sudah "terverifikasi" via setter, jadi kita bisa
///      menguji seluruh business logic tanpa Attestcoin testnet.
///      Ketika interface asli sudah diketahui, hanya file ini dan
///      IAttestcoinProver yang perlu disesuaikan.
contract MockProver is IAttestcoinProver {
    mapping(bytes32 => uint256) internal blockOf;
    mapping(bytes32 => VerifiedLog[]) internal logsOf;
    mapping(bytes32 => bool) internal registered;

    error ProofRejected();

    function registerTransaction(bytes calldata rawTransaction, uint256 sourceBlock, VerifiedLog[] calldata logs)
        external
    {
        bytes32 key = keccak256(rawTransaction);
        registered[key] = true;
        blockOf[key] = sourceBlock;

        delete logsOf[key];
        for (uint256 i; i < logs.length; ++i) {
            logsOf[key].push(logs[i]);
        }
    }

    function verifyTransaction(bytes calldata, bytes calldata, bytes calldata rawTransaction)
        external
        view
        returns (uint256, VerifiedLog[] memory)
    {
        bytes32 key = keccak256(rawTransaction);

        // Perilaku yang benar: REVERT kalau tidak sah, bukan return false.
        if (!registered[key]) revert ProofRejected();

        return (blockOf[key], logsOf[key]);
    }
}
