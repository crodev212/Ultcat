// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "erc721a/contracts/ERC721A.sol";
import "./UltraCatRenderer.sol";
import "./Base64.sol";

/// @title ULTRA CAT — 5,212 fully on-chain pixel-art NFTs
/// @notice No public mint. Wolfies snapshot recipients are direct-minted by the treasury,
///         then remaining supply is minted to that same treasury for manual marketplace listings.
/// @dev Art/traits are generated deterministically by code; ownership and distribution state are on-chain.
contract UltraCat5212 is ERC721A {
    uint256 public constant MAX_SUPPLY = 5_212;
    uint256 public constant AIRDROP_RECIPIENTS = 701;
    uint256 public constant WOLFIES_SNAPSHOT_BLOCK = 97_406_258;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant ROYALTY_BPS = 500;
    uint256 public constant COLLECTION_SEED = uint256(keccak256("ULTCAT_5212_GENESIS_V1"));
    uint256 private constant COMBO_MULTIPLIER = (COLLECTION_SEED & 0xFFFFC) | 1;
    uint256 private constant COMBO_INCREMENT = ((COLLECTION_SEED >> 20) & 0xFFFFF) | 1;
    uint256 private constant RARITY_MULTIPLIER = ((COLLECTION_SEED >> 40) & 0x1FFC) | 1;
    uint256 private constant RARITY_INCREMENT = ((COLLECTION_SEED >> 53) & 0x1FFF) | 1;
    uint256 public constant RESERVE_SUPPLY = MAX_SUPPLY - AIRDROP_RECIPIENTS;
    bytes32 public constant AIRDROP_MERKLE_ROOT = 0x8d76cd31a22143ef72d43419c198435d88d7bdfca371978359dcb2f12e24c43c;
    uint256 public constant MAX_AIRDROP_BATCH = 100;
    uint256 public constant MAX_RESERVE_BATCH = 500;

    address public constant WOLFIES_COLLECTION = 0x719FDfb0ba006747A83438cc8900c8a2b35e0afF;
    address public immutable treasury;
    address public immutable royaltyReceiver;
    UltraCatRenderer public immutable artRenderer;

    uint256 public airdropRecipientCount;
    address public lastAirdropRecipient;
    bytes32 public lastAirdropSortKey;
    bool public distributionFinalized;

    error ZeroAddress();
    error InvalidRenderer();
    error Unauthorized();
    error DistributionClosed();
    error EmptyBatch();
    error BatchTooLarge();
    error InvalidRecipient();
    error InvalidProof();
    error RecipientsNotStrictlyAscending();
    error AirdropIncomplete();
    error SupplyExceeded();
    error DistributionIncomplete();
    error InvalidTokenId();

    event AirdropBatch(address indexed operator, uint256 indexed firstTokenId, uint256 count);
    event ReserveBatch(address indexed treasury, uint256 indexed firstTokenId, uint256 count);
    event DistributionFinalized(uint256 totalSupply, uint256 airdropRecipientCount);

    constructor(address treasury_, address renderer_) ERC721A("ULTRA CAT", "ULTCAT") {
        if (treasury_ == address(0) || treasury_ == address(0x000000000000000000000000000000000000dEaD)) revert ZeroAddress();
        if (renderer_ == address(0)) revert InvalidRenderer();
        if (renderer_.code.length == 0) revert InvalidRenderer();
        treasury = treasury_;
        royaltyReceiver = treasury_;
        artRenderer = UltraCatRenderer(renderer_);
    }

    modifier onlyTreasury() {
        if (msg.sender != treasury) revert Unauthorized();
        _;
    }

    /// @notice Mint one NFT to each committed snapshot recipient, in public seed-hash order.
    /// @dev Merkle proofs bind the 701 recipients; no public claim or paid mint exists.
    function airdropBatch(address[] calldata recipients, bytes32[][] calldata proofs) external onlyTreasury {
        if (distributionFinalized) revert DistributionClosed();
        uint256 length = recipients.length;
        if (length == 0) revert EmptyBatch();
        if (length > MAX_AIRDROP_BATCH) revert BatchTooLarge();
        if (proofs.length != length) revert InvalidProof();
        if (airdropRecipientCount + length > AIRDROP_RECIPIENTS) revert SupplyExceeded();

        address previous = lastAirdropRecipient;
        bytes32 previousSortKey = lastAirdropSortKey;
        uint256 firstTokenId = _nextTokenId();
        for (uint256 i; i < length; ++i) {
            address recipient = recipients[i];
            if (recipient == address(0) || recipient == address(0x000000000000000000000000000000000000dEaD)) revert InvalidRecipient();
            bytes32 sortKey = keccak256(abi.encodePacked(COLLECTION_SEED, recipient));
            if (
                uint256(sortKey) < uint256(previousSortKey)
                    || (sortKey == previousSortKey && uint160(recipient) <= uint160(previous))
            ) revert RecipientsNotStrictlyAscending();
            if (!_verifyAirdropProof(recipient, proofs[i])) revert InvalidProof();
            _mint(recipient, 1);
            previous = recipient;
            previousSortKey = sortKey;
        }
        lastAirdropRecipient = previous;
        lastAirdropSortKey = previousSortKey;
        airdropRecipientCount += length;
        emit AirdropBatch(msg.sender, firstTokenId, length);
    }

    /// @notice Mint a chunk of the non-sale reserve directly to the treasury.
    /// @dev Must be called after all 701 direct airdrops. The ERC721A batch mint keeps reserve minting efficient.
    function mintReserveBatch(uint256 quantity) external onlyTreasury {
        if (distributionFinalized) revert DistributionClosed();
        if (airdropRecipientCount != AIRDROP_RECIPIENTS) revert AirdropIncomplete();
        if (quantity == 0) revert EmptyBatch();
        if (quantity > MAX_RESERVE_BATCH) revert BatchTooLarge();
        if (totalSupply() + quantity > MAX_SUPPLY) revert SupplyExceeded();
        uint256 firstTokenId = _nextTokenId();
        _mint(treasury, quantity);
        emit ReserveBatch(treasury, firstTokenId, quantity);
    }

    /// @notice Permanently closes the initial distribution after all 5,212 tokens are minted.
    function finalizeDistribution() external onlyTreasury {
        if (distributionFinalized) revert DistributionClosed();
        if (airdropRecipientCount != AIRDROP_RECIPIENTS || totalSupply() != MAX_SUPPLY) revert DistributionIncomplete();
        distributionFinalized = true;
        emit DistributionFinalized(totalSupply(), airdropRecipientCount);
    }

    /// @notice Fully on-chain metadata: token JSON and SVG are generated on demand from deterministic traits.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        (uint8[7] memory traits, uint8 tier, uint8 oneOfOneId) = _traits(tokenId);
        uint8 special = tier == 5 ? oneOfOneId : 255;
        string memory svg = artRenderer.render(traits, special);
        string memory attributes = artRenderer.attributes(traits, tier, oneOfOneId);
        string memory json = string.concat(
            '{"name":"ULTRA CAT #', _toString(tokenId),
            '","description":"A 5,212-piece pixel cat collection, fully rendered on Cronos. No external image or metadata host is required.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[', attributes, ']}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice Collection-level marketplace metadata, including the 5% royalty receiver.
    function contractURI() external view returns (string memory) {
        string memory logo = artRenderer.collectionImage();
        string memory json = string.concat(
            '{"name":"ULTRA CAT","symbol":"ULTCAT",',
            '"description":"5,212 fully on-chain pixel cat PFPs on Cronos.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(logo)), '",',
            '"seller_fee_basis_points":500,"fee_recipient":"', _addressText(royaltyReceiver), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice ERC-2981 royalty quote: 5% of salePrice to the fixed treasury receiver.
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        return (royaltyReceiver, (salePrice * ROYALTY_BPS) / BPS_DENOMINATOR);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0x2a55205a || super.supportsInterface(interfaceId);
    }

    /// @notice Art preview for any planned token ID, including before it is minted.
    function previewSVG(uint256 tokenId) external view returns (string memory) {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) revert InvalidTokenId();
        (uint8[7] memory traits, uint8 tier, uint8 oneOfOneId) = _traits(tokenId);
        return artRenderer.render(traits, tier == 5 ? oneOfOneId : 255);
    }

    /// @notice Deterministic trait values and tier for a minted token.
    function getTraits(uint256 tokenId) external view returns (uint8[7] memory traits, uint8 tier, uint8 oneOfOneId) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        return _traits(tokenId);
    }

    function _verifyAirdropProof(address recipient, bytes32[] calldata proof) private pure returns (bool) {
        if (proof.length > 10) return false;
        bytes32 computed = keccak256(abi.encodePacked(keccak256(abi.encode(recipient))));
        for (uint256 i; i < proof.length; ++i) {
            bytes32 sibling = proof[i];
            if (uint256(computed) < uint256(sibling)) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }
        return computed == AIRDROP_MERKLE_ROOT;
    }

    function _traits(uint256 tokenId) private pure returns (uint8[7] memory traits, uint8 tier, uint8 oneOfOneId) {
        uint256 combo = _permute(tokenId - 1, 0xFFFFF, COMBO_MULTIPLIER, COMBO_INCREMENT, 279936);
        for (uint256 i; i < 7; ++i) {
            traits[i] = uint8(combo % 6);
            combo /= 6;
        }

        uint256 rarityRank = _permute(tokenId - 1, 0x1FFF, RARITY_MULTIPLIER, RARITY_INCREMENT, MAX_SUPPLY);
        if (rarityRank < 2500) return (traits, 0, 255);
        if (rarityRank < 4000) return (traits, 1, 255);
        if (rarityRank < 4800) return (traits, 2, 255);
        if (rarityRank < 5100) return (traits, 3, 255);
        if (rarityRank < 5191) return (traits, 4, 255);
        return (traits, 5, uint8(rarityRank - 5191));
    }

    /// @dev Cycle-walk a full-period LCG over 2^bits until it lands in [0, domain).
    ///      This is a permutation on the requested domain, so no two token IDs share a base trait tuple.
    function _permute(uint256 value, uint256 mask, uint256 multiplier, uint256 increment, uint256 domain) private pure returns (uint256) {
        for (uint256 i; i < 256; ++i) {
            value = (value * multiplier + increment) & mask;
            if (value < domain) return value;
        }
        revert InvalidTokenId();
    }

    function _startTokenId() internal view virtual override returns (uint256) {
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
