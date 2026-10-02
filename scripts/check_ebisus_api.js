#!/usr/bin/env node
// Read-only compatibility probe for Ebisu's Bay's documented public API.
// Usage: node scripts/check_ebisus_api.js <collection-contract> [tokenId]

const address = process.argv[2];
const tokenId = process.argv[3] || '1';

if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) {
  console.error('Usage: node scripts/check_ebisus_api.js <0x-collection-contract> [tokenId]');
  process.exit(2);
}
if (!/^\d+$/.test(tokenId)) {
  console.error('tokenId must be a non-negative integer string.');
  process.exit(2);
}

async function main() {
  const url = new URL('https://api.ebisusbay.com/nft');
  url.searchParams.set('collection', address);
  url.searchParams.set('tokenId', tokenId);

  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error(`Ebisu API returned non-JSON (HTTP ${response.status}): ${text.slice(0, 300)}`); }

  if (!response.ok || !body.nft) {
    throw new Error(`Ebisu API did not return an NFT (HTTP ${response.status}, API status ${body.status ?? 'unknown'}): ${body.error || 'not indexed or no metadata available'}`);
  }

  const nft = body.nft;
  const image = typeof nft.image === 'string' ? nft.image : '';
  const originalImage = typeof nft.original_image === 'string' ? nft.original_image : '';
  const imageData = typeof nft.image_data === 'string' ? nft.image_data : '';
  const imageUrl = image || originalImage || imageData;
  let imageCheck = { present: Boolean(imageUrl), source_field: image ? 'image' : originalImage ? 'original_image' : imageData ? 'image_data' : null };

  if (imageUrl.startsWith('data:image/svg+xml;base64,')) {
    const svg = Buffer.from(imageUrl.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8');
    imageCheck = {
      ...imageCheck,
      uri_type: 'base64-svg-data-uri',
      decoded_svg_starts_correctly: svg.startsWith('<svg'),
      dimensions_512_square: /width=['"]512['"][^>]*height=['"]512['"]/.test(svg) || /height=['"]512['"][^>]*width=['"]512['"]/.test(svg),
      decoded_bytes: Buffer.byteLength(svg)
    };
  } else if (/^https?:\/\//i.test(imageUrl)) {
    imageCheck.uri_type = 'http(s)-image-url';
    try {
      const imageResponse = await fetch(imageUrl, { method: 'GET', signal: AbortSignal.timeout(20000) });
      imageCheck.fetch_status = imageResponse.status;
      imageCheck.content_type = imageResponse.headers.get('content-type');
      imageCheck.fetch_ok = imageResponse.ok;
      await imageResponse.arrayBuffer();
    } catch (error) {
      imageCheck.fetch_error = error.message;
    }
  } else if (imageUrl) {
    imageCheck.uri_type = imageUrl.slice(0, 48);
  }

  const result = {
    api_http_status: response.status,
    api_status: body.status,
    contract: nft.nftAddress || address,
    token_id: nft.nftId || tokenId,
    name: nft.name || null,
    attributes_count: Array.isArray(nft.attributes) ? nft.attributes.length : null,
    attributes: Array.isArray(nft.attributes) ? nft.attributes : null,
    image: imageCheck,
    original_image_present: Boolean(originalImage),
    image_data_present: Boolean(imageData),
    indexed_in_api: true,
    note: 'This checks Ebisu’s documented API response only. Confirm the actual collection/item page in the marketplace UI; a successful API response does not prove display in every marketplace or wallet.'
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
