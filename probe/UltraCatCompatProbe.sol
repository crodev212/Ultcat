// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "erc721a/contracts/ERC721A.sol";
import "../contracts/UltraCatRenderer.sol";
import "../contracts/Base64.sol";

/// @title ULTRA CAT compatibility probe — TEST ONLY, one token, do not sell.
/// @notice Uses the same immutable renderer and nested Base64 JSON/SVG format as production.
///         Deploy this only if the owner approves a separate Cronos Mainnet integration test.
contract UltraCatCompatProbe is ERC721A {
    uint256 private constant BPS_DENOMINATOR = 10_000;
    uint256 private constant ROYALTY_BPS = 500;

    address public immutable royaltyReceiver;
    UltraCatRenderer public immutable artRenderer;

    error ZeroAddress();
    error InvalidRenderer();
    error InvalidTokenId();

    constructor(address recipient_, address renderer_, address royaltyReceiver_)
        ERC721A("ULTRA CAT COMPAT PROBE", "ULTCAT-PROBE")
    {
        if (recipient_ == address(0) || royaltyReceiver_ == address(0)) revert ZeroAddress();
        if (renderer_ == address(0) || renderer_.code.length == 0) revert InvalidRenderer();
        artRenderer = UltraCatRenderer(renderer_);
        royaltyReceiver = royaltyReceiver_;
        _mint(recipient_, 1);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        uint8[7] memory traits = [uint8(0), uint8(1), uint8(2), uint8(3), uint8(4), uint8(5), uint8(0)];
        string memory svg = artRenderer.render(traits, 255);
        string memory attributes = artRenderer.attributes(traits, 0, 255);
        string memory json = string.concat(
            '{"name":"ULTRA CAT COMPAT PROBE #1",',
            '"description":"Test-only compatibility token. Pixel art and metadata are generated on-chain.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[', attributes, ']}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function contractURI() external view returns (string memory) {
        string memory logo = artRenderer.collectionImage();
        string memory json = string.concat(
            '{"name":"ULTRA CAT COMPAT PROBE","symbol":"ULTCAT-PROBE",',
            '"description":"Test-only collection for on-chain metadata compatibility checks.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(logo)), '",',
            '"seller_fee_basis_points":500,"fee_recipient":"', _addressText(royaltyReceiver), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * ROYALTY_BPS) / BPS_DENOMINATOR);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0x2a55205a || super.supportsInterface(interfaceId);
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function _addressText(address account) private pure returns (string memory) {
        bytes16 alphabet = "0123456789abcdef";
        bytes20 value = bytes20(account);
        bytes memory out = new bytes(42);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i; i < 20; ++i) {
            out[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            out[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(out);
    }
}
