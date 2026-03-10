---
name: deployment
description: Use when you need to build, deploy, or serve a project — static sites, Node.js apps, Docker containers.
---

# Deployment

## Overview

Build and deploy projects to various platforms.

## Actions

### Build a project
```
TOOL_CALL: shell_execute {"command": "npm run build"}
```

### Serve locally
```
TOOL_CALL: shell_execute {"command": "npx serve -s dist -l 3000"}
```

### Deploy to Vercel
```
TOOL_CALL: npm_install {"packages": "vercel"}
TOOL_CALL: shell_execute {"command": "npx vercel --prod"}
```

### Docker build and run
```
TOOL_CALL: shell_execute {"command": "docker build -t myapp ."}
TOOL_CALL: shell_execute {"command": "docker run -p 3000:3000 myapp"}
```

### Check if port is in use
```
TOOL_CALL: shell_execute {"command": "netstat -ano | findstr :3000"}
```

## Notes

- Always build before deploying
- Check for build errors before proceeding
- Verify the deployment is accessible after launch
