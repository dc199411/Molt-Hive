# API Reference

Molt Hive exposes a REST API via Express on port 3001 (configurable via `TOOL_SERVER_PORT`).

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status, version, available tools |

## Tool Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tools/execute` | Execute a tool by name |
| POST | `/api/tools/list` | List all available tools |

**Execute a tool:**
```json
POST /api/tools/execute
{
  "tool": "shell_execute",
  "params": { "command": "ls -la" }
}
```

## Agent Hierarchy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/tree` | Full agent hierarchy (parents + children) |
| GET | `/api/agents/:agentId/children` | Children of a specific agent |

## Task Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | All tasks (query: `agentId`, `activeOnly`) |
| POST | `/api/tasks/enqueue` | Add a task to the queue |
| GET | `/api/tasks/resumable` | Tasks with checkpoints that can resume |

**Enqueue a task:**
```json
POST /api/tasks/enqueue
{
  "agentId": "agent-123",
  "task": "Research AI frameworks",
  "priority": "high",
  "mode": "auto",
  "maxIterations": 20
}
```

## Scheduler

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduler/tasks` | All scheduled tasks (query: `agentId`) |
| POST | `/api/scheduler/create` | Create a scheduled recurring task |
| POST | `/api/scheduler/pause` | Pause a scheduled task |
| POST | `/api/scheduler/resume` | Resume a paused task |
| POST | `/api/scheduler/cancel` | Cancel a scheduled task |

**Create a scheduled task:**
```json
POST /api/scheduler/create
{
  "agentId": "agent-123",
  "cron": "0 9 * * 1-5",
  "task": "Check email and summarize",
  "name": "Morning email check"
}
```

## Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List all loaded skills |

## Available Tools

| Tool | Description |
|------|-------------|
| `shell_execute` | Run shell commands |
| `file_read` | Read file contents |
| `file_write` | Write/append to files |
| `file_list` | List directory contents |
| `web_search` | Search the web (DuckDuckGo) |
| `web_fetch` | Fetch URL content |
| `code_execute` | Run JavaScript or Python code |
| `npm_install` | Install npm packages |
| `http_request` | Make HTTP requests |
