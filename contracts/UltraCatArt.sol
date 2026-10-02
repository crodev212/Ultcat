// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/// @notice Compact, reusable pixel-vector art for ULTRA CAT.
/// @dev No image files, remote links, fonts, scripts, or external stylesheets.
library UltraCatArt {
    string internal constant INK = "#17182d";
    string internal constant FUR0 = "#f3a34b";
    string internal constant FUR1 = "#dfe4e8";
    string internal constant FUR2 = "#eebd83";
    string internal constant FUR3 = "#aab1bd";
    string internal constant FUR4 = "#f7dfae";
    string internal constant FUR5 = "#b7a0db";

    function traitName(uint8 layer, uint8 id) internal pure returns (string memory) {
        if (layer == 0) {
            if (id == 0) return "Neon Alley";
            if (id == 1) return "Moonlit Rooftop";
            if (id == 2) return "Cat Garden";
            if (id == 3) return "Candy Grid";
            if (id == 4) return "Royal Blue";
            return "Aurora";
        }
        if (layer == 1) {
            if (id == 0) return "Shorthair";
            if (id == 1) return "Maine Coon";
            if (id == 2) return "Persian";
            if (id == 3) return "Siamese";
            if (id == 4) return "Sphynx";
            return "Fold-Eared";
        }
        if (layer == 2) {
            if (id == 0) return "Ginger";
            if (id == 1) return "Tuxedo";
            if (id == 2) return "Calico";
            if (id == 3) return "Silver Tabby";
            if (id == 4) return "Cream";
            return "Lavender";
        }
        if (layer == 3) {
            if (id == 0) return "Street Hoodie";
            if (id == 1) return "Royal Cape";
            if (id == 2) return "Star Suit";
            if (id == 3) return "Paw Sweater";
            if (id == 4) return "Tuxedo";
            return "Astro Armor";
        }
        if (layer == 4) {
            if (id == 0) return "Curious";
            if (id == 1) return "Sleepy";
            if (id == 2) return "Grinning";
            if (id == 3) return "Sly";
            if (id == 4) return "Blep";
            return "Fierce";
        }
        if (layer == 5) {
            if (id == 0) return "Emerald";
            if (id == 1) return "Sapphire";
            if (id == 2) return "Gold";
            if (id == 3) return "Star Pupils";
            if (id == 4) return "Slit Eyes";
            return "Heterochrome";
        }
        if (id == 0) return "Bell Collar";
        if (id == 1) return "Blue Bow";
        if (id == 2) return "Mini Crown";
        if (id == 3) return "Headphones";
        if (id == 4) return "Moon Charm";
        return "Flower Clip";
    }

    function coat(uint8 id) internal pure returns (string memory) {
        if (id == 0) return FUR0;
        if (id == 1) return FUR1;
        if (id == 2) return FUR2;
        if (id == 3) return FUR3;
        if (id == 4) return FUR4;
        return FUR5;
    }

    function outfit(uint8 id) internal pure returns (string memory) {
        if (id == 0) return "#273e73";
        if (id == 1) return "#8b2854";
        if (id == 2) return "#2c536c";
        if (id == 3) return "#34734a";
        if (id == 4) return "#15151c";
        return "#6a4ea4";
    }

    function eye(uint8 id) internal pure returns (string memory) {
        if (id == 0) return "#37b879";
        if (id == 1) return "#3587e8";
        if (id == 2) return "#f0b831";
        if (id == 3) return "#d74fd7";
        if (id == 4) return "#9ddcf4";
        return "#ed6b81";
    }

    function background(uint8 id) internal pure returns (string memory) {
        if (id == 0) return string.concat("<rect width='64' height='64' fill='#12162e'/><rect x='4' y='8' width='4' height='4' fill='#e95e9c'/><rect x='52' y='12' width='4' height='4' fill='#53dbe7'/><rect x='8' y='48' width='8' height='4' fill='#3152a2'/><rect x='48' y='40' width='8' height='4' fill='#3152a2'/>");
        if (id == 1) return string.concat("<rect width='64' height='64' fill='#29244d'/><rect x='44' y='8' width='12' height='12' fill='#f4d783'/><rect x='48' y='4' width='4' height='4' fill='#f4d783'/><rect x='8' y='16' width='4' height='4' fill='white'/><rect x='52' y='32' width='4' height='4' fill='white'/>");
        if (id == 2) return string.concat("<rect width='64' height='64' fill='#214a41'/><rect x='4' y='12' width='8' height='8' fill='#3d8a5a'/><rect x='52' y='8' width='8' height='12' fill='#3d8a5a'/><rect x='8' y='40' width='4' height='4' fill='#f1d15a'/><rect x='52' y='44' width='4' height='4' fill='#ea7292'/>");
        if (id == 3) return string.concat("<rect width='64' height='64' fill='#41285f'/><rect x='0' y='8' width='16' height='4' fill='#ed5e9a'/><rect x='48' y='20' width='16' height='4' fill='#54d9d2'/><rect x='4' y='48' width='12' height='4' fill='#f1cc5c'/><rect x='44' y='52' width='16' height='4' fill='#ed5e9a'/>");
        if (id == 4) return string.concat("<rect width='64' height='64' fill='#082b62'/><path d='M0 0h12l20 26H20zM64 0H52L32 26h12zM0 64h12l20-22H20zM64 64H52L32 42h12z' fill='#1357b7'/><rect y='56' width='64' height='8' fill='#101a3a'/>");
        return string.concat("<rect width='64' height='64' fill='#172b54'/><path d='M0 12h16v4h8v4h8v4h8v4h8v4h16v4H48v4h-8v4h-8v4h-8v4h-8v4H0z' fill='#287f83'/><rect x='8' y='12' width='4' height='4' fill='#ec8fc3'/><rect x='48' y='48' width='4' height='4' fill='#f1d279'/>");
    }

    function body(uint8 breed, uint8 fur, uint8 clothes) internal pure returns (string memory) {
        string memory c = coat(fur);
        string memory o = outfit(clothes);
        string memory tail;
        if (breed == 3) tail = "<path d='M44 45h8v-8h8v8h-4v8h-8v4h-8v-4h4z'";
        else if (breed == 1) tail = "<path d='M42 45h8v-8h8v-8h4v12h-4v8h-8v4h-8z'";
        else tail = "<path d='M44 45h8v-8h8v8h-4v8h-8v4h-8v-4h4z'";
        return string.concat(
            tail, " fill='", c, "' stroke='", INK, "' stroke-width='3'/>",
            "<path d='M16 38h32v5h4v17h-4v4H16v-4h-4V43h4z' fill='", c, "' stroke='", INK, "' stroke-width='3'/>",
            "<path d='M17 47h30v17H17z' fill='", o, "' stroke='", INK, "' stroke-width='2'/>",
            "<rect x='27' y='48' width='10' height='3' fill='#f3d46b'/><rect x='29' y='55' width='6' height='5' fill='#f3d46b'/>",
            _bodyStyle(clothes), _furPattern(fur)
        );
    }

    function head(uint8 breed, uint8 fur) internal pure returns (string memory) {
        string memory c = coat(fur);
        string memory ears;
        if (breed == 0) ears = "<path d='M15 24V8h8v6h6v-6h8v6h6V8h8v16z'";
        else if (breed == 1) ears = "<path d='M12 26V5h10v8h6V4h9v9h6V5h10v21z'";
        else if (breed == 2) ears = "<path d='M15 24V10h10v4h5v-4h10v4h5v-4h9v14z'";
        else if (breed == 3) ears = "<path d='M14 25V7h8v8h6V7h8v8h6V7h8v18z'";
        else if (breed == 4) ears = "<path d='M12 26V3h11v9h6V3h9v9h6V3h10v23z'";
        else ears = "<path d='M14 23V8h8v8h7v-4h8v4h7V8h8v15z'";
        return string.concat(
            ears, " fill='", INK, "'/>",
            "<path d='M17 23h30v4h4v14h-4v5H17v-5h-4V27h4z' fill='", c, "' stroke='", INK, "' stroke-width='3'/>",
            _breedMarks(breed), _furFace(fur)
        );
    }

    function face(uint8 expression, uint8 eyes) internal pure returns (string memory) {
        string memory e = eye(eyes);
        string memory eyesSvg;
        if (eyes == 0) eyesSvg = "<rect x='21' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='35' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='24' y='30' width='4' height='5' fill='";
        else if (eyes == 1) eyesSvg = "<rect x='21' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='35' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='23' y='30' width='5' height='5' fill='";
        else if (eyes == 2) eyesSvg = "<rect x='21' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='35' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='24' y='30' width='4' height='5' fill='";
        else if (eyes == 3) eyesSvg = "<rect x='21' y='29' width='8' height='7' fill='#f4f0e7'/><rect x='35' y='29' width='8' height='7' fill='#f4f0e7'/><path d='M21 32l4-4 4 4-4 4z' fill='";
        else if (eyes == 4) eyesSvg = "<rect x='24' y='29' width='3' height='8' fill='";
        else eyesSvg = "<rect x='21' y='29' width='8' height='7' fill='#3bdb9c'/><rect x='35' y='29' width='8' height='7' fill='#ed7199'/><rect x='24' y='30' width='4' height='5' fill='";
        string memory eyeClose = eyes == 4 ? "<rect x='37' y='29' width='3' height='8' fill='" : "<rect x='38' y='30' width='4' height='5' fill='";
        return string.concat(
            eyesSvg, e, "'/>", eyeClose, e, "'/>",
            _expression(expression), _whiskers(expression)
        );
    }

    function ornament(uint8 id) internal pure returns (string memory) {
        if (id == 0) return "<path d='M19 44h26v4H19z' fill='#edcf62'/><rect x='29' y='46' width='6' height='6' fill='#f8e9aa' stroke='#17182d' stroke-width='1'/>";
        if (id == 1) return "<path d='M29 42h6v5h-6zM24 42h5l-2-4-5 2zM35 42h5l2-4 5 2-5 4z' fill='#3fa7e6' stroke='#17182d' stroke-width='1'/>";
        if (id == 2) return "<path d='M24 13h4V9h8v4h4v8H24z' fill='#f3d05f' stroke='#17182d' stroke-width='2'/><rect x='30' y='15' width='4' height='4' fill='#f8f1da'/>";
        if (id == 3) return "<path d='M13 26v-7h4v-4h4v-4h22v4h4v4h4v7h-4v-5h-4v-4H21v4h-4v5z' fill='#423276' stroke='#17182d' stroke-width='2'/><rect x='14' y='24' width='5' height='10' fill='#51d4d0'/><rect x='45' y='24' width='5' height='10' fill='#51d4d0'/>";
        if (id == 4) return "<path d='M30 23a6 6 0 1 0 7 8 5 5 0 1 1-7-8z' fill='#f1d46c'/><rect x='31' y='37' width='3' height='4' fill='#f1d46c'/>";
        return "<rect x='42' y='15' width='4' height='4' fill='#ec6d9c'/><rect x='38' y='13' width='4' height='4' fill='#ec6d9c'/><rect x='42' y='11' width='4' height='4' fill='#f4d566'/><rect x='46' y='13' width='4' height='4' fill='#ec6d9c'/><rect x='42' y='17' width='4' height='4' fill='#f4d566'/>";
    }

    function backgroundAndCharacter(uint8[7] memory t, uint8 specialId) internal pure returns (string memory) {
        string memory s = string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 64 64' shape-rendering='crispEdges'>",
            background(t[0]),
            body(t[1], t[2], t[3]),
            head(t[1], t[2]),
            face(t[4], t[5]),
            ornament(t[6]),
            specialId == 255 ? "" : _special(specialId),
            "</svg>"
        );
        return s;
    }

    function collectionLogo() internal pure returns (string memory) {
        return string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 64 64' shape-rendering='crispEdges'>",
            "<rect width='64' height='64' fill='#12162e'/><rect x='4' y='4' width='56' height='56' fill='#29244d'/>",
            "<rect x='8' y='8' width='4' height='4' fill='#53dbe7'/><rect x='52' y='12' width='4' height='4' fill='#f3d05f'/>",
            "<path d='M14 28V13h9v7h6v-8h8v8h6v-7h9v15h4v17h-5v7H17v-7h-5V28z' fill='#17182d'/>",
            "<path d='M17 27h30v4h4v12h-4v5H17v-5h-4V31h4z' fill='#f3a34b'/>",
            "<rect x='21' y='33' width='8' height='7' fill='#f4f0e7'/><rect x='35' y='33' width='8' height='7' fill='#f4f0e7'/>",
            "<rect x='24' y='34' width='4' height='5' fill='#37b879'/><rect x='38' y='34' width='4' height='5' fill='#3587e8'/>",
            "<path d='M28 43h8v3h-8z' fill='#17182d'/><rect x='30' y='43' width='4' height='2' fill='#f7efe3'/>",
            "<path d='M18 50h28v7H18z' fill='#273e73'/><rect x='29' y='51' width='6' height='6' fill='#f3d05f'/>",
            "</svg>"
        );
    }

    function tierName(uint8 tier) internal pure returns (string memory) {
        if (tier == 0) return "Common";
        if (tier == 1) return "Uncommon";
        if (tier == 2) return "Rare";
        if (tier == 3) return "Epic";
        if (tier == 4) return "Legendary";
        return "1/1";
    }

    function oneOfOneName(uint8 id) internal pure returns (string memory) {
        if (id == 0) return "Moonbeam Monarch";
        if (id == 1) return "Solar Pouncer";
        if (id == 2) return "Nebula Whiskers";
        if (id == 3) return "Crown of Nine Lives";
        if (id == 4) return "Prismatic Paw";
        if (id == 5) return "Midnight Oracle";
        if (id == 6) return "Aurora Purr";
        if (id == 7) return "Golden Comet";
        if (id == 8) return "Crystal Claw";
        if (id == 9) return "Cosmic Catnip";
        if (id == 10) return "Ember Empress";
        if (id == 11) return "Frostfang";
        if (id == 12) return "Velvet Phantom";
        if (id == 13) return "Lucky Lantern";
        if (id == 14) return "Royal Ragdoll";
        if (id == 15) return "Starfall Sprite";
        if (id == 16) return "Jade Jester";
        if (id == 17) return "Pearl Prowler";
        if (id == 18) return "Thunder Tabby";
        if (id == 19) return "Dreamweaver";
        return "Ultra Genesis";
    }

    function _bodyStyle(uint8 id) private pure returns (string memory) {
        if (id == 0) return "<rect x='16' y='49' width='32' height='4' fill='#325e9d'/><rect x='20' y='54' width='24' height='3' fill='#1d2d55'/>";
        if (id == 1) return "<path d='M20 46h24l4 17H16z' fill='#9b2d62'/><rect x='28' y='49' width='8' height='4' fill='#f4d56a'/>";
        if (id == 2) return "<rect x='18' y='48' width='28' height='15' fill='#264e68'/><rect x='24' y='51' width='4' height='4' fill='#f4d56a'/><rect x='36' y='51' width='4' height='4' fill='#f4d56a'/>";
        if (id == 3) return "<rect x='16' y='48' width='32' height='15' fill='#36774c'/><path d='M24 50h16v3H24zM22 56h20v3H22z' fill='#8ccf86'/>";
        if (id == 4) return "<rect x='16' y='48' width='32' height='15' fill='#17171e'/><rect x='28' y='48' width='8' height='15' fill='#eee7dc'/><rect x='30' y='53' width='4' height='4' fill='#d64970'/>";
        return "<path d='M16 48h32v15H16z' fill='#6a4ea4'/><rect x='22' y='51' width='4' height='4' fill='#53dbe7'/><rect x='38' y='51' width='4' height='4' fill='#53dbe7'/><rect x='29' y='56' width='6' height='4' fill='#f4d56a'/>";
    }

    function _furPattern(uint8 id) private pure returns (string memory) {
        if (id == 0) return "<rect x='27' y='20' width='3' height='8' fill='#bd6b32'/><rect x='34' y='20' width='3' height='8' fill='#bd6b32'/><rect x='16' y='54' width='4' height='4' fill='#bd6b32'/>";
        if (id == 1) return "<path d='M25 40h14v6H25z' fill='#f5f2ed'/><rect x='18' y='21' width='5' height='4' fill='#202432'/><rect x='41' y='21' width='5' height='4' fill='#202432'/>";
        if (id == 2) return "<rect x='18' y='18' width='7' height='7' fill='#d86d4a'/><rect x='40' y='22' width='6' height='6' fill='#f5e6cf'/><rect x='20' y='54' width='7' height='5' fill='#d86d4a'/>";
        if (id == 3) return "<rect x='25' y='18' width='3' height='8' fill='#737d8a'/><rect x='36' y='18' width='3' height='8' fill='#737d8a'/><rect x='16' y='55' width='6' height='3' fill='#737d8a'/>";
        if (id == 4) return "<rect x='22' y='18' width='4' height='3' fill='#fff0cf'/><rect x='38' y='18' width='4' height='3' fill='#fff0cf'/><rect x='30' y='24' width='4' height='3' fill='#fff0cf'/>";
        return "<rect x='19' y='24' width='4' height='4' fill='#d3c5eb'/><rect x='41' y='24' width='4' height='4' fill='#d3c5eb'/><rect x='29' y='18' width='6' height='3' fill='#d3c5eb'/>";
    }

    function _breedMarks(uint8 id) private pure returns (string memory) {
        if (id == 0) return "<rect x='15' y='22' width='4' height='6' fill='#f5cb94'/><rect x='45' y='22' width='4' height='6' fill='#f5cb94'/>";
        if (id == 1) return "<path d='M18 15l-5-7 8 3M42 11l8-4-4 9' fill='#db9959'/><rect x='12' y='34' width='4' height='4' fill='#f1d0a8'/><rect x='48' y='34' width='4' height='4' fill='#f1d0a8'/>";
        if (id == 2) return "<rect x='17' y='19' width='7' height='5' fill='#dfb18a'/><rect x='40' y='19' width='7' height='5' fill='#dfb18a'/><rect x='18' y='39' width='4' height='4' fill='#e6c2a0'/>";
        if (id == 3) return "<rect x='16' y='12' width='5' height='12' fill='#493c57'/><rect x='43' y='12' width='5' height='12' fill='#493c57'/><rect x='16' y='51' width='6' height='7' fill='#493c57'/>";
        if (id == 4) return "<rect x='13' y='9' width='4' height='7' fill='#dca979'/><rect x='47' y='9' width='4' height='7' fill='#dca979'/><rect x='21' y='25' width='3' height='2' fill='#dbb9a4'/>";
        return "<path d='M15 14h8v4h-4v5h-4zM41 14h8v9h-4v-5h-4z' fill='#d3c5eb'/><rect x='16' y='22' width='5' height='3' fill='#d3c5eb'/>";
    }

    function _furFace(uint8 id) private pure returns (string memory) {
        if (id == 1) return "<rect x='20' y='20' width='6' height='4' fill='#222532'/><rect x='38' y='20' width='6' height='4' fill='#222532'/>";
        if (id == 2) return "<rect x='18' y='20' width='6' height='5' fill='#ce6043'/><rect x='40' y='22' width='6' height='5' fill='#f5e6cf'/>";
        if (id == 3) return "<rect x='26' y='17' width='3' height='8' fill='#737d8a'/><rect x='35' y='17' width='3' height='8' fill='#737d8a'/>";
        if (id == 4) return "<rect x='20' y='19' width='5' height='3' fill='#fff0cf'/><rect x='39' y='19' width='5' height='3' fill='#fff0cf'/>";
        if (id == 5) return "<rect x='21' y='22' width='4' height='3' fill='#d3c5eb'/><rect x='39' y='22' width='4' height='3' fill='#d3c5eb'/>";
        return "";
    }

    function _expression(uint8 id) private pure returns (string memory) {
        if (id == 0) return "<path d='M27 39h4v3h2v-3h4v4h-2v3h-6v-3h-2z' fill='#3a2630'/><rect x='29' y='39' width='6' height='2' fill='#f7efe3'/>";
        if (id == 1) return "<path d='M28 41h8v2h-8z' fill='#3a2630'/><rect x='22' y='40' width='4' height='2' fill='#bd766a'/><rect x='38' y='40' width='4' height='2' fill='#bd766a'/>";
        if (id == 2) return "<path d='M26 38h12v6h-2v3h-8v-3h-2z' fill='#3a2630'/><rect x='28' y='39' width='8' height='2' fill='#f7efe3'/><rect x='31' y='44' width='4' height='3' fill='#dc6687'/>";
        if (id == 3) return "<path d='M28 41h6v2h6v-3h3v5h-9v3h-4v-3h-3v-2h1z' fill='#3a2630'/>";
        if (id == 4) return "<rect x='28' y='40' width='8' height='3' fill='#3a2630'/><path d='M30 43h7v4h-3v3h-3v-4h-1z' fill='#e56b96'/>";
        return "<path d='M26 38h12v5h-2v4h-8v-4h-2z' fill='#3a2630'/><rect x='28' y='38' width='3' height='4' fill='#f7efe3'/><rect x='33' y='38' width='3' height='4' fill='#f7efe3'/><path d='M28 48l3-4 2 4 2-4 3 4' fill='#f7efe3'/>";
    }

    function _whiskers(uint8 expression) private pure returns (string memory) {
        if (expression == 1) return "<rect x='8' y='37' width='6' height='2' fill='#eee5d6'/><rect x='50' y='37' width='6' height='2' fill='#eee5d6'/>";
        return "<path d='M13 37h10v2H13zM41 37h10v2H41zM10 42h11v2H10zM43 42h11v2H43z' fill='#f7efe3'/>";
    }

    function _special(uint8 id) private pure returns (string memory) {
        uint8 col = id % 6;
        string memory accent = col == 0 ? "#f5d35c" : col == 1 ? "#58d7e8" : col == 2 ? "#ec65ad" : col == 3 ? "#9bdd7c" : col == 4 ? "#bd92fa" : "#ffffff";
        uint8 x = 4 + (id % 7) * 8;
        uint8 y = 4 + (id / 7) * 8;
        return string.concat("<rect x='", _num(x), "' y='", _num(y), "' width='4' height='4' fill='", accent, "'/><rect x='", _num(x + 4), "' y='", _num(y + 4), "' width='4' height='4' fill='", accent, "'/>");
    }

    function _num(uint8 n) private pure returns (string memory) {
        if (n < 10) return string(abi.encodePacked(bytes1(uint8(48 + n))));
        return string(abi.encodePacked(bytes1(uint8(48 + n / 10)), bytes1(uint8(48 + n % 10))));
    }
}
