import type { BoardAction, BoardState } from './BoardActions';
import type { Card, CardVersion } from '../types';
import { generateId } from '../utils';

/**
 * Create a version snapshot of a card for undo functionality
 */
function createCardVersion(card: Card, existingVersions: CardVersion[]): CardVersion {
  const nextVersion = existingVersions.length > 0
    ? Math.max(...existingVersions.map(v => v.version)) + 1
    : 1;

  return {
    id: generateId(),
    cardId: card.id,
    version: nextVersion,
    data: {
      title: card.title,
      description: card.description,
      type: card.type,
      priority: card.priority,
      dueDate: card.dueDate,
      labels: card.labels,
      assignee: card.assignee,
      laneId: card.laneId,
      order: card.order,
      isDeleted: card.isDeleted,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Board reducer - handles all state updates
 */
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  const now = new Date().toISOString();

  switch (action.type) {
    // ==================== CARD ACTIONS ====================

    case 'ADD_CARD': {
      const { payload } = action;
      const newCard: Card = {
        ...payload,
        id: generateId(),
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      // Add card to the lane's cardIds
      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === payload.laneId) {
          return {
            ...lane,
            cardIds: [...lane.cardIds, newCard.id],
          };
        }
        return lane;
      });

      return {
        ...state,
        cards: {
          ...state.cards,
          [newCard.id]: newCard,
        },
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'UPDATE_CARD': {
      const { id, updates } = action.payload;
      const existingCard = state.cards[id];

      if (!existingCard) {
        return state;
      }

      // Create version snapshot before updating
      const existingVersions = state.cardVersions[id] || [];
      const newVersion = createCardVersion(existingCard, existingVersions);

      const updatedCard: Card = {
        ...existingCard,
        ...updates,
        updatedAt: now,
      };

      return {
        ...state,
        cards: {
          ...state.cards,
          [id]: updatedCard,
        },
        cardVersions: {
          ...state.cardVersions,
          [id]: [...existingVersions, newVersion],
        },
        project: {
          ...state.project,
          updatedAt: now,
        },
      };
    }

    case 'DELETE_CARD': {
      const { id } = action.payload;
      const existingCard = state.cards[id];

      if (!existingCard) {
        return state;
      }

      // Create version snapshot before soft deleting
      const existingVersions = state.cardVersions[id] || [];
      const newVersion = createCardVersion(existingCard, existingVersions);

      // Soft delete - just mark as deleted
      const updatedCard: Card = {
        ...existingCard,
        isDeleted: true,
        updatedAt: now,
      };

      // Remove from lane's cardIds
      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === existingCard.laneId) {
          return {
            ...lane,
            cardIds: lane.cardIds.filter(cardId => cardId !== id),
          };
        }
        return lane;
      });

      return {
        ...state,
        cards: {
          ...state.cards,
          [id]: updatedCard,
        },
        cardVersions: {
          ...state.cardVersions,
          [id]: [...existingVersions, newVersion],
        },
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'RESTORE_CARD': {
      const { id } = action.payload;
      const existingCard = state.cards[id];

      if (!existingCard || !existingCard.isDeleted) {
        return state;
      }

      const restoredCard: Card = {
        ...existingCard,
        isDeleted: false,
        updatedAt: now,
      };

      // Add back to lane's cardIds
      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === existingCard.laneId) {
          return {
            ...lane,
            cardIds: [...lane.cardIds, id],
          };
        }
        return lane;
      });

      return {
        ...state,
        cards: {
          ...state.cards,
          [id]: restoredCard,
        },
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'MOVE_CARD': {
      const { cardId, toLaneId, toIndex } = action.payload;
      const card = state.cards[cardId];

      if (!card) {
        return state;
      }

      const fromLaneId = card.laneId;

      // Create version snapshot before moving
      const existingVersions = state.cardVersions[cardId] || [];
      const newVersion = createCardVersion(card, existingVersions);

      // Update the card's laneId
      const updatedCard: Card = {
        ...card,
        laneId: toLaneId,
        updatedAt: now,
      };

      // Update lanes
      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === fromLaneId && fromLaneId !== toLaneId) {
          // Remove from source lane
          return {
            ...lane,
            cardIds: lane.cardIds.filter(id => id !== cardId),
          };
        }
        if (lane.id === toLaneId) {
          // Add to destination lane at specific index
          const newCardIds = lane.cardIds.filter(id => id !== cardId);
          newCardIds.splice(toIndex, 0, cardId);
          return {
            ...lane,
            cardIds: newCardIds,
          };
        }
        return lane;
      });

      return {
        ...state,
        cards: {
          ...state.cards,
          [cardId]: updatedCard,
        },
        cardVersions: {
          ...state.cardVersions,
          [cardId]: [...existingVersions, newVersion],
        },
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'REORDER_CARDS': {
      const { laneId, cardIds } = action.payload;

      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === laneId) {
          return {
            ...lane,
            cardIds,
          };
        }
        return lane;
      });

      return {
        ...state,
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'UNDO_CARD': {
      const { cardId } = action.payload;
      const versions = state.cardVersions[cardId];

      if (!versions || versions.length === 0) {
        return state;
      }

      // Get the previous version (second to last, since last is current)
      const previousVersion = versions[versions.length - 1];
      if (!previousVersion) {
        return state;
      }

      const restoredCard: Card = {
        id: cardId,
        ...previousVersion.data,
        updatedAt: now,
      };

      // Update lane cardIds if lane changed
      const currentCard = state.cards[cardId];
      let updatedLanes = state.project.lanes;

      if (currentCard && currentCard.laneId !== restoredCard.laneId) {
        updatedLanes = state.project.lanes.map(lane => {
          if (lane.id === currentCard.laneId) {
            return {
              ...lane,
              cardIds: lane.cardIds.filter(id => id !== cardId),
            };
          }
          if (lane.id === restoredCard.laneId) {
            return {
              ...lane,
              cardIds: [...lane.cardIds, cardId],
            };
          }
          return lane;
        });
      }

      // Remove the used version
      const remainingVersions = versions.slice(0, -1);

      return {
        ...state,
        cards: {
          ...state.cards,
          [cardId]: restoredCard,
        },
        cardVersions: {
          ...state.cardVersions,
          [cardId]: remainingVersions,
        },
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    // ==================== LANE ACTIONS ====================

    case 'ADD_LANE': {
      const { title } = action.payload;
      const maxOrder = Math.max(...state.project.lanes.map(l => l.order), -1);

      const newLane = {
        id: generateId(),
        title,
        order: maxOrder + 1,
        cardIds: [],
      };

      return {
        ...state,
        project: {
          ...state.project,
          lanes: [...state.project.lanes, newLane],
          updatedAt: now,
        },
      };
    }

    case 'UPDATE_LANE': {
      const { id, updates } = action.payload;

      const updatedLanes = state.project.lanes.map(lane => {
        if (lane.id === id) {
          return { ...lane, ...updates };
        }
        return lane;
      });

      return {
        ...state,
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'DELETE_LANE': {
      const { id } = action.payload;

      // Don't allow deleting the last lane
      if (state.project.lanes.length <= 1) {
        return {
          ...state,
          error: 'Cannot delete the last lane',
        };
      }

      const laneToDelete = state.project.lanes.find(l => l.id === id);
      if (!laneToDelete) {
        return state;
      }

      // Move cards to the first remaining lane
      const remainingLanes = state.project.lanes.filter(l => l.id !== id);
      const firstLane = remainingLanes[0];

      // Update cards to point to new lane
      const updatedCards = { ...state.cards };
      for (const cardId of laneToDelete.cardIds) {
        if (updatedCards[cardId]) {
          updatedCards[cardId] = {
            ...updatedCards[cardId],
            laneId: firstLane.id,
            updatedAt: now,
          };
        }
      }

      // Add cards to first lane
      const updatedLanes = remainingLanes.map((lane, index) => {
        if (lane.id === firstLane.id) {
          return {
            ...lane,
            cardIds: [...lane.cardIds, ...laneToDelete.cardIds],
            order: index,
          };
        }
        return { ...lane, order: index };
      });

      return {
        ...state,
        cards: updatedCards,
        project: {
          ...state.project,
          lanes: updatedLanes,
          updatedAt: now,
        },
      };
    }

    case 'REORDER_LANES': {
      const { laneIds } = action.payload;

      const laneMap = new Map(state.project.lanes.map(l => [l.id, l]));
      const reorderedLanes = laneIds
        .map((id, index) => {
          const lane = laneMap.get(id);
          return lane ? { ...lane, order: index } : null;
        })
        .filter((lane): lane is NonNullable<typeof lane> => lane !== null);

      return {
        ...state,
        project: {
          ...state.project,
          lanes: reorderedLanes,
          updatedAt: now,
        },
      };
    }

    // ==================== PROJECT ACTIONS ====================

    case 'UPDATE_PROJECT': {
      return {
        ...state,
        project: {
          ...state.project,
          ...action.payload,
          updatedAt: now,
        },
      };
    }

    case 'LOAD_STATE': {
      return {
        ...action.payload,
        isLoading: false,
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload,
      };
    }

    default:
      return state;
  }
}

