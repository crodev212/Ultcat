// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/// @notice Compact Base64 encoder for embedded SVG and JSON data URIs.
library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        bytes memory table = TABLE;
        uint256 encodedLength = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLength);
        assembly ("memory-safe") {
            let inputPtr := add(data, 32)
            let endPtr := add(inputPtr, mload(data))
            let outputPtr := add(result, 32)
            let tablePtr := add(table, 32)
            for { } lt(inputPtr, endPtr) { } {
                let word := mload(inputPtr)
                let packed := or(shl(16, byte(0, word)), or(shl(8, byte(1, word)), byte(2, word)))
                let i0 := and(shr(18, packed), 0x3f)
                let i1 := and(shr(12, packed), 0x3f)
                let i2 := and(shr(6, packed), 0x3f)
                let i3 := and(packed, 0x3f)
                mstore8(outputPtr, byte(0, mload(add(tablePtr, i0))))
                mstore8(add(outputPtr, 1), byte(0, mload(add(tablePtr, i1))))
                mstore8(add(outputPtr, 2), byte(0, mload(add(tablePtr, i2))))
                mstore8(add(outputPtr, 3), byte(0, mload(add(tablePtr, i3))))
                inputPtr := add(inputPtr, 3)
                outputPtr := add(outputPtr, 4)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(outputPtr, 1), 0x3d)
                mstore8(sub(outputPtr, 2), 0x3d)
            }
            case 2 { mstore8(sub(outputPtr, 1), 0x3d) }
        }
        return string(result);
    }
}
