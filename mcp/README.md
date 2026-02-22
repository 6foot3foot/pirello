# Pirello MCP Server

An MCP (Model Context Protocol) server that allows AI assistants to interact with your Pirello Kanban board.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects/boards |
| `list_lanes` | List all lanes in a project |
| `list_cards` | List cards in a project (optionally filtered by lane) |
| `create_card` | Create a new card/ticket |
| `update_card` | Update an existing card |
| `move_card` | Move a card to a different lane |
| `delete_card` | Delete (soft delete) a card |
| `create_project` | Create a new project/board |

## Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pirello": {
      "command": "node",
      "args": ["/path/to/pirello/mcp/index.js"],
      "env": {
        "PIRELLO_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json` in your project or global config):

```json
{
  "mcpServers": {
    "pirello": {
      "command": "node",
      "args": ["/path/to/pirello/mcp/index.js"],
      "env": {
        "PIRELLO_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PIRELLO_API_URL` | URL of your Pirello API server | `http://localhost:3001` |

## Example Usage

Once configured, you can ask your AI assistant things like:

- "Create a new ticket called 'Fix login bug' with high priority"
- "List all cards in my project"
- "Move the card about login to the Done lane"
- "Create a new project called 'Q1 Planning'"

## Running Standalone

```bash
cd mcp
PIRELLO_API_URL=http://your-pirello-server:3001 node index.js
```

The server communicates over stdio, so it's designed to be launched by an MCP client.
