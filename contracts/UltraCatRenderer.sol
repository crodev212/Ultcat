// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "./UltraCatArt.sol";

/// @title ULTRA CAT on-chain renderer
/// @notice Stateless immutable art/trait engine. It stores no token ownership or metadata.
contract UltraCatRenderer {
    function render(uint8[7] calldata traits, uint8 specialId) external pure returns (string memory) {
        return UltraCatArt.backgroundAndCharacter(traits, specialId);
    }

    function collectionImage() external pure returns (string memory) {
        return UltraCatArt.collectionLogo();
    }

    function attributes(uint8[7] calldata traits, uint8 tier, uint8 oneOfOneId) external pure returns (string memory) {
        string memory attrs = string.concat(
            '{"trait_type":"Background","value":"', UltraCatArt.traitName(0, traits[0]), '"},',
            '{"trait_type":"Cat Style","value":"', UltraCatArt.traitName(1, traits[1]), '"},',
            '{"trait_type":"Fur Color","value":"', UltraCatArt.traitName(2, traits[2]), '"},',
            '{"trait_type":"Outfit","value":"', UltraCatArt.traitName(3, traits[3]), '"},',
            '{"trait_type":"Expression","value":"', UltraCatArt.traitName(4, traits[4]), '"},',
            '{"trait_type":"Eye Style","value":"', UltraCatArt.traitName(5, traits[5]), '"},',
            '{"trait_type":"Ornament","value":"', UltraCatArt.traitName(6, traits[6]), '"},',
            '{"trait_type":"Rarity","value":"', UltraCatArt.tierName(tier), '"}'
        );
        if (tier == 5) {
            attrs = string.concat(
                attrs,
                ',{"trait_type":"1/1","value":"', UltraCatArt.oneOfOneName(oneOfOneId), '"}'
            );
        }
        return attrs;
    }
}
