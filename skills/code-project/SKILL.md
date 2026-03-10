---
name: code-project
description: Use when you need to create, modify, or manage code projects. Covers scaffolding, file creation, dependency management, and building.
---

# Code Project Management

## Overview

Create, modify, and manage code projects. Install dependencies, write files, and build.

## Actions

### Scaffold a new project
```
TOOL_CALL: shell_execute {"command": "mkdir my-project && cd my-project && npm init -y"}
TOOL_CALL: npm_install {"packages": "express"}
TOOL_CALL: file_write {"path": "my-project/index.js", "content": "const express = require('express');\nconst app = express();\napp.get('/', (req, res) => res.send('Hello'));\napp.listen(3000);"}
```

### Read and understand existing code
```
TOOL_CALL: file_list {"path": ".", "recursive": true}
TOOL_CALL: file_read {"path": "package.json"}
TOOL_CALL: file_read {"path": "src/index.js"}
```

### Install dependencies
```
TOOL_CALL: npm_install {"packages": "axios cheerio dotenv"}
```

### Build and test
```
TOOL_CALL: shell_execute {"command": "npm run build"}
TOOL_CALL: shell_execute {"command": "npm test"}
```

## Notes

- Always read existing code before modifying it
- Check package.json to understand the project structure
- Use `file_list` with `recursive: true` to map the project
- Install dependencies before writing code that uses them
