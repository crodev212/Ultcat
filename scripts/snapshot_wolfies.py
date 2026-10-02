#!/usr/bin/env python3
"""Enumerate unique Wolfies owners at a fixed Cronos block using Multicall3."""
import argparse
import csv
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

WOLFIES = "0x719fdfb0ba006747a83438cc8900c8a2b35e0aff"
MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11"
DEFAULT_BLOCK = 97406258
RPC_URL = "https://evm.cronos.org"
OWNER_OF_SELECTOR = bytes.fromhex("6352211e")
AGGREGATE3_SELECTOR = bytes.fromhex("82ad56cb")


def word(n: int) -> bytes:
    return n.to_bytes(32, "big")


def encode_owner_call(token_id: int) -> bytes:
    return OWNER_OF_SELECTOR + word(token_id)


def encode_aggregate3(token_ids: list[int]) -> str:
    calls = []
    for token_id in token_ids:
        data = encode_owner_call(token_id)
        encoded = bytes.fromhex(WOLFIES[2:]).rjust(32, b"\0") + word(1) + word(96) + word(len(data)) + data.ljust(((len(data) + 31) // 32) * 32, b"\0")
        calls.append(encoded)
    offsets = []
    cursor = len(calls) * 32
    for encoded in calls:
        offsets.append(word(cursor))
        cursor += len(encoded)
    array = word(len(calls)) + b"".join(offsets) + b"".join(calls)
    return "0x" + (AGGREGATE3_SELECTOR + word(32) + array).hex()


def decode_aggregate3(output: str, expected: int) -> list[str | None]:
    raw = bytes.fromhex(output.removeprefix("0x"))
    top_offset = int.from_bytes(raw[:32], "big")
    length = int.from_bytes(raw[top_offset:top_offset + 32], "big")
    if length != expected:
        raise ValueError(f"Multicall returned {length} results, expected {expected}")
    offsets_at = top_offset + 32
    values: list[str | None] = []
    for i in range(length):
        relative = int.from_bytes(raw[offsets_at + 32 * i: offsets_at + 32 * (i + 1)], "big")
        item = offsets_at + relative
        success = int.from_bytes(raw[item:item + 32], "big") != 0
        data_rel = int.from_bytes(raw[item + 32:item + 64], "big")
        if not success:
            values.append(None)
            continue
        data_start = item + data_rel
        data_len = int.from_bytes(raw[data_start:data_start + 32], "big")
        result = raw[data_start + 32:data_start + 32 + data_len]
        if len(result) < 32:
            raise ValueError("ownerOf response was shorter than one ABI word")
        values.append("0x" + result[-20:].hex())
    return values


def rpc_call(payload: dict, retries: int = 4) -> dict:
    data = json.dumps(payload).encode()
    request = urllib.request.Request(RPC_URL, data=data, headers={"Content-Type": "application/json", "User-Agent": "UltraCatSnapshot/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.loads(response.read())
            if "error" in result:
                raise RuntimeError(result["error"])
            return result
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            if attempt + 1 == retries:
                raise
            time.sleep(0.75 * (attempt + 1))
    raise AssertionError("unreachable")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--block", type=int, default=DEFAULT_BLOCK)
    parser.add_argument("--last-token-id", type=int, default=5212)
    parser.add_argument("--chunk-size", type=int, default=150)
    parser.add_argument("--out", type=Path, default=Path("/home/user/ultracat/snapshot"))
    args = parser.parse_args()
    tag = hex(args.block)
    args.out.mkdir(parents=True, exist_ok=True)

    header = rpc_call({"jsonrpc": "2.0", "method": "eth_getBlockByNumber", "params": [tag, False], "id": 1})["result"]
    supply_hex = rpc_call({"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": WOLFIES, "data": "0x18160ddd"}, tag], "id": 2})["result"]
    total_supply = int(supply_hex, 16)
    if int(header["number"], 16) != args.block:
        raise ValueError("RPC returned a different snapshot block")

    owner_by_id: dict[int, str] = {}
    for start in range(1, args.last_token_id + 1, args.chunk_size):
        ids = list(range(start, min(start + args.chunk_size, args.last_token_id + 1)))
        response = rpc_call({"jsonrpc": "2.0", "method": "eth_call", "params": [{"to": MULTICALL3, "data": encode_aggregate3(ids)}, tag], "id": start})["result"]
        owners = decode_aggregate3(response, len(ids))
        owner_by_id.update({token_id: owner for token_id, owner in zip(ids, owners) if owner})
        print(f"Checked IDs through {ids[-1]}: {len(owner_by_id)} live tokens", flush=True)

    unique = sorted(set(owner_by_id.values()))
    out_csv = args.out / f"wolfies-holders-block-{args.block}.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["recipient_address"])
        writer.writerows([[address] for address in unique])
    report = {
        "collection": "Wolfies",
        "contract": WOLFIES,
        "network": "Cronos mainnet (chain ID 25)",
        "snapshot_block": args.block,
        "snapshot_hash": header["hash"],
        "snapshot_timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(header["timestamp"], 16))),
        "reported_total_supply": total_supply,
        "token_id_scan": f"1..{args.last_token_id}",
        "live_token_ids_found": len(owner_by_id),
        "unique_holder_addresses": len(unique),
        "burned_or_nonexistent_ids": args.last_token_id - len(owner_by_id),
        "csv": str(out_csv),
        "note": "Point-in-time public-address snapshot only. Review excluded/burn/contract addresses and approve the recipient list before any airdrop. New transfers after this block are not included."
    }
    report_path = args.out / f"wolfies-snapshot-block-{args.block}.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
