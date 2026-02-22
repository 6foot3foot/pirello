#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.PIRELLO_API_URL || "http://localhost:3001";

async function fetchBoard() {
  const response = await fetch(`${API_BASE}/api/board`);
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch board: ${response.status}`);
  }
  return response.json();
}

async function saveBoard(state) {
  const response = await fetch(`${API_BASE}/api/board`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    throw new Error(`Failed to save board: ${response.status}`);
  }
}

function generateId() {
  return crypto.randomUUID();
}

const server = new Server(
  {
    name: "pirello-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_projects",
        description: "List all projects/boards in Pirello",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_lanes",
        description: "List all lanes in a project",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "The project ID to list lanes for",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "list_cards",
        description: "List all cards in a project, optionally filtered by lane",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "The project ID to list cards for",
            },
            laneId: {
              type: "string",
              description: "Optional lane ID to filter cards",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "create_card",
        description: "Create a new card/ticket in Pirello",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "The project ID to create the card in",
            },
            laneId: {
              type: "string",
              description: "The lane ID to place the card in (defaults to first lane)",
            },
            title: {
              type: "string",
              description: "The title of the card",
            },
            description: {
              type: "string",
              description: "The description of the card",
            },
            type: {
              type: "string",
              enum: ["feature", "bug", "task", "story"],
              description: "The type of card (default: task)",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "The priority level (default: medium)",
            },
          },
          required: ["projectId", "title"],
        },
      },
      {
        name: "update_card",
        description: "Update an existing card",
        inputSchema: {
          type: "object",
          properties: {
            cardId: {
              type: "string",
              description: "The card ID to update",
            },
            title: {
              type: "string",
              description: "New title for the card",
            },
            description: {
              type: "string",
              description: "New description for the card",
            },
            type: {
              type: "string",
              enum: ["feature", "bug", "task", "story"],
              description: "New type for the card",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "New priority level",
            },
          },
          required: ["cardId"],
        },
      },
      {
        name: "move_card",
        description: "Move a card to a different lane",
        inputSchema: {
          type: "object",
          properties: {
            cardId: {
              type: "string",
              description: "The card ID to move",
            },
            targetLaneId: {
              type: "string",
              description: "The lane ID to move the card to",
            },
          },
          required: ["cardId", "targetLaneId"],
        },
      },
      {
        name: "delete_card",
        description: "Delete (soft delete) a card",
        inputSchema: {
          type: "object",
          properties: {
            cardId: {
              type: "string",
              description: "The card ID to delete",
            },
          },
          required: ["cardId"],
        },
      },
      {
        name: "create_project",
        description: "Create a new project/board",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the project",
            },
          },
          required: ["title"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let state = await fetchBoard();

    if (!state) {
      state = {
        projects: [],
        activeProjectId: null,
        cards: {},
        cardVersions: {},
        isLoading: false,
        error: null,
      };
    }

    switch (name) {
      case "list_projects": {
        const projects = state.projects.map((p) => ({
          id: p.id,
          title: p.title,
          laneCount: p.lanes.length,
          cardCount: Object.values(state.cards).filter(
            (c) => c.projectId === p.id && !c.isDeleted
          ).length,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case "list_lanes": {
        const project = state.projects.find((p) => p.id === args.projectId);
        if (!project) {
          throw new Error(`Project not found: ${args.projectId}`);
        }
        const lanes = project.lanes.map((l) => ({
          id: l.id,
          title: l.title,
          order: l.order,
          cardCount: l.cardIds.length,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(lanes, null, 2),
            },
          ],
        };
      }

      case "list_cards": {
        let cards = Object.values(state.cards).filter(
          (c) => c.projectId === args.projectId && !c.isDeleted
        );
        if (args.laneId) {
          cards = cards.filter((c) => c.laneId === args.laneId);
        }
        const cardList = cards.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          type: c.type,
          priority: c.priority,
          laneId: c.laneId,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(cardList, null, 2),
            },
          ],
        };
      }

      case "create_card": {
        const project = state.projects.find((p) => p.id === args.projectId);
        if (!project) {
          throw new Error(`Project not found: ${args.projectId}`);
        }

        const laneId = args.laneId || project.lanes[0]?.id;
        if (!laneId) {
          throw new Error("No lanes available in project");
        }

        const lane = project.lanes.find((l) => l.id === laneId);
        if (!lane) {
          throw new Error(`Lane not found: ${laneId}`);
        }

        const cardId = generateId();
        const now = new Date().toISOString();

        const newCard = {
          id: cardId,
          projectId: args.projectId,
          title: args.title,
          description: args.description || "",
          type: args.type || "task",
          priority: args.priority || "medium",
          dueDate: null,
          labels: [],
          assignee: null,
          laneId: laneId,
          order: lane.cardIds.length,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        state.cards[cardId] = newCard;
        lane.cardIds.push(cardId);

        await saveBoard(state);

        return {
          content: [
            {
              type: "text",
              text: `Created card "${args.title}" with ID: ${cardId}`,
            },
          ],
        };
      }

      case "update_card": {
        const card = state.cards[args.cardId];
        if (!card) {
          throw new Error(`Card not found: ${args.cardId}`);
        }

        if (args.title !== undefined) card.title = args.title;
        if (args.description !== undefined) card.description = args.description;
        if (args.type !== undefined) card.type = args.type;
        if (args.priority !== undefined) card.priority = args.priority;
        card.updatedAt = new Date().toISOString();

        await saveBoard(state);

        return {
          content: [
            {
              type: "text",
              text: `Updated card "${card.title}"`,
            },
          ],
        };
      }

      case "move_card": {
        const card = state.cards[args.cardId];
        if (!card) {
          throw new Error(`Card not found: ${args.cardId}`);
        }

        const project = state.projects.find((p) => p.id === card.projectId);
        if (!project) {
          throw new Error(`Project not found for card`);
        }

        const sourceLane = project.lanes.find((l) => l.id === card.laneId);
        const targetLane = project.lanes.find((l) => l.id === args.targetLaneId);

        if (!targetLane) {
          throw new Error(`Target lane not found: ${args.targetLaneId}`);
        }

        if (sourceLane) {
          sourceLane.cardIds = sourceLane.cardIds.filter((id) => id !== args.cardId);
        }

        targetLane.cardIds.push(args.cardId);
        card.laneId = args.targetLaneId;
        card.order = targetLane.cardIds.length - 1;
        card.updatedAt = new Date().toISOString();

        await saveBoard(state);

        return {
          content: [
            {
              type: "text",
              text: `Moved card "${card.title}" to lane "${targetLane.title}"`,
            },
          ],
        };
      }

      case "delete_card": {
        const card = state.cards[args.cardId];
        if (!card) {
          throw new Error(`Card not found: ${args.cardId}`);
        }

        card.isDeleted = true;
        card.updatedAt = new Date().toISOString();

        const project = state.projects.find((p) => p.id === card.projectId);
        if (project) {
          const lane = project.lanes.find((l) => l.id === card.laneId);
          if (lane) {
            lane.cardIds = lane.cardIds.filter((id) => id !== args.cardId);
          }
        }

        await saveBoard(state);

        return {
          content: [
            {
              type: "text",
              text: `Deleted card "${card.title}"`,
            },
          ],
        };
      }

      case "create_project": {
        const projectId = generateId();
        const now = new Date().toISOString();

        const defaultLanes = [
          { id: generateId(), title: "Todo", order: 0, cardIds: [] },
          { id: generateId(), title: "Doing", order: 1, cardIds: [] },
          { id: generateId(), title: "Done", order: 2, cardIds: [] },
        ];

        const newProject = {
          id: projectId,
          title: args.title,
          thumbnailUrl: null,
          lanes: defaultLanes,
          createdAt: now,
          updatedAt: now,
        };

        state.projects.push(newProject);

        await saveBoard(state);

        return {
          content: [
            {
              type: "text",
              text: `Created project "${args.title}" with ID: ${projectId}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pirello MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
