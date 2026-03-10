---
name: web-research
description: Use when you need to research a topic, find information, read documentation, or learn how to do something new.
---

# Web Research

## Overview

Search the web and read pages to gather information before taking action. Always research first when you don't know how to do something.

## Steps

1. Search for the topic using `web_search`
2. Read the most relevant result using `web_fetch`
3. Summarize findings and decide next action

## Examples

### Research a technology
```
TOOL_CALL: web_search {"query": "how to create ethereum wallet with ethers.js v6"}
TOOL_CALL: web_fetch {"url": "https://docs.ethers.org/v6/getting-started/"}
```

### Find documentation
```
TOOL_CALL: web_search {"query": "express.js middleware documentation"}
TOOL_CALL: web_fetch {"url": "https://expressjs.com/en/guide/using-middleware.html"}
```

### Check pricing / APIs
```
TOOL_CALL: web_search {"query": "coingecko API free endpoints"}
TOOL_CALL: web_fetch {"url": "https://www.coingecko.com/en/api/documentation"}
```

## Notes

- Always search before guessing how to do something
- Read multiple sources if the first one isn't sufficient
- CRYSTALLIZE useful findings for future reference
