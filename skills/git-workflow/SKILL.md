---
name: git-workflow
description: Use when you need to manage git repositories — staging, committing, pushing, branching, and checking status.
---

# Git Workflow

## Overview

Standard git operations for version control.

## Actions

### Check status
```
TOOL_CALL: shell_execute {"command": "git status"}
TOOL_CALL: shell_execute {"command": "git log --oneline -5"}
```

### Stage, commit, push
```
TOOL_CALL: shell_execute {"command": "git add -A"}
TOOL_CALL: shell_execute {"command": "git commit -m \"description of changes\""}
TOOL_CALL: shell_execute {"command": "git push origin main"}
```

### Create a branch
```
TOOL_CALL: shell_execute {"command": "git checkout -b feature/my-feature"}
```

### Clone a repository
```
TOOL_CALL: shell_execute {"command": "git clone https://github.com/user/repo.git"}
```

## Notes

- Always check `git status` before committing
- Write descriptive commit messages
- Push after each logical set of changes
