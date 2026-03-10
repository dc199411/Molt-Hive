---
name: data-analysis
description: Use when you need to process data, run calculations, parse files, or analyze information using code execution.
---

# Data Analysis

## Overview

Read data files, process them with JavaScript or Python, and report findings.

## Actions

### Read and parse a data file
```
TOOL_CALL: file_read {"path": "data.json"}
TOOL_CALL: code_execute {"code": "const data = require('./data.json'); console.log('Records:', data.length); console.log('Fields:', Object.keys(data[0]))"}
```

### Run calculations
```
TOOL_CALL: code_execute {"code": "const prices = [100, 200, 150, 300]; const avg = prices.reduce((a,b) => a+b) / prices.length; console.log('Average:', avg)"}
```

### Python analysis
```
TOOL_CALL: code_execute {"code": "import json; data = [1,2,3,4,5]; print(f'Sum: {sum(data)}, Mean: {sum(data)/len(data)}')", "language": "python"}
```

### Process CSV data
```
TOOL_CALL: file_read {"path": "data.csv"}
TOOL_CALL: code_execute {"code": "const lines = require('fs').readFileSync('data.csv','utf-8').split('\\n'); console.log('Rows:', lines.length); console.log('Header:', lines[0])"}
```

## Notes

- Prefer JavaScript for Node.js environments, Python for data-heavy tasks
- Print results clearly so you can use them in the next step
- CRYSTALLIZE useful data processing patterns
