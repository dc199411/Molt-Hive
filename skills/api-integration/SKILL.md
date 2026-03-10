---
name: api-integration
description: Use when you need to interact with external APIs — REST calls, authentication, reading API docs, and handling responses.
---

# API Integration

## Overview

Research, connect to, and interact with any external API. Covers finding documentation, making requests, and handling responses.

## Steps

1. Research the API documentation using `web_search` and `web_fetch`
2. Make a test request using `http_request`
3. Parse and use the response

## Actions

### Discover an API
```
TOOL_CALL: web_search {"query": "CoinGecko API endpoints free"}
TOOL_CALL: web_fetch {"url": "https://api.coingecko.com/api/v3"}
```

### Make a GET request
```
TOOL_CALL: http_request {"method": "GET", "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"}
```

### Make a POST request with auth
```
TOOL_CALL: http_request {"method": "POST", "url": "https://api.example.com/data", "headers": {"Authorization": "Bearer YOUR_TOKEN"}, "body": {"key": "value"}}
```

### Interact with blockchain RPCs
```
TOOL_CALL: http_request {"method": "POST", "url": "https://mainnet.infura.io/v3/YOUR_KEY", "body": {"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}}
```

## Notes

- Always read API docs before making calls
- Check rate limits and authentication requirements
- Use CRYSTALLIZE to save useful API patterns for reuse
