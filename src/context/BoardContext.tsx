import {
    createContext,
    useContext,
    useReducer,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import type { BoardAction, BoardState } from './BoardActions';
import { boardReducer } from './BoardReducer';
import type { Card, Lane, Project } from '../types';
import { generateId } from '../utils';
import { storage } from '../services';

/**
 * Context value with state and convenience methods
 */
interface BoardContextValue {
    state: BoardState;
    dispatch: React.Dispatch<BoardAction>;

    // Card methods
    addCard: (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => void;
    updateCard: (id: string, updates: Partial<Card>) => void;
    deleteCard: (id: string) => void;
    restoreCard: (id: string) => void;
    moveCard: (cardId: string, toLaneId: string, toIndex: number) => void;
    reorderCards: (laneId: string, cardIds: string[]) => void;
    undoCard: (cardId: string) => void;

    // Lane methods
    addLane: (title: string) => void;
    updateLane: (id: string, updates: Partial<Lane>) => void;
    deleteLane: (id: string) => void;
    reorderLanes: (laneIds: string[]) => void;

    // Project methods
    updateProject: (updates: Partial<Project>) => void;

    // Helpers
    getCardsByLane: (laneId: string) => Card[];
    canUndoCard: (cardId: string) => boolean;
}

const BoardContext = createContext<BoardContextValue | null>(null);

/**
 * Create initial state with default project and lanes
 */
function createInitialState(): BoardState {
    const now = new Date().toISOString();
    const defaultLanes: Lane[] = [
        { id: generateId(), title: 'Todo', order: 0, cardIds: [] },
        { id: generateId(), title: 'Doing', order: 1, cardIds: [] },
        { id: generateId(), title: 'Done', order: 2, cardIds: [] },
    ];

    return {
        project: {
            id: generateId(),
            name: 'Stuff to do now, stuff to do later',
            lanes: defaultLanes,
            createdAt: now,
            updatedAt: now,
        },
        cards: {},
        cardVersions: {},
        isLoading: true,
        error: null,
    };
}

interface BoardProviderProps {
    children: ReactNode;
    initialState?: BoardState;
}

/**
 * Board context provider
 */
export function BoardProvider({ children, initialState }: BoardProviderProps) {
    const [state, dispatch] = useReducer(
        boardReducer,
        initialState ?? createInitialState()
    );

    const saveTimeoutRef = useRef<number | null>(null);

    // Load state from storage on mount
    useEffect(() => {
        let isActive = true;
        const fallbackTimeoutId = window.setTimeout(() => {
            if (!isActive) return;
            const freshState = createInitialState();
            freshState.isLoading = false;
            dispatch({ type: 'LOAD_STATE', payload: freshState });
        }, 3000);

        const loadState = async () => {
            try {
                const savedState = await storage.load();
                if (!isActive) return;

                if (savedState) {
                    dispatch({ type: 'LOAD_STATE', payload: { ...savedState, isLoading: false } });
                } else {
                    // No saved state, mark as loaded
                    dispatch({ type: 'SET_ERROR', payload: null });
                    // Create fresh state and save it
                    const freshState = createInitialState();
                    freshState.isLoading = false;
                    dispatch({ type: 'LOAD_STATE', payload: freshState });
                }
            } catch (error) {
                console.error('Failed to initialize board state:', error);
                if (!isActive) return;
                const freshState = createInitialState();
                freshState.isLoading = false;
                dispatch({ type: 'LOAD_STATE', payload: freshState });
            } finally {
                window.clearTimeout(fallbackTimeoutId);
            }
        };

        loadState();

        return () => {
            isActive = false;
            window.clearTimeout(fallbackTimeoutId);
        };
    }, []);

    // Save state to storage whenever it changes (after initial load)
    useEffect(() => {
        if (state.isLoading) return;

        if (saveTimeoutRef.current !== null) {
            window.clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            void storage.save(state);
        }, 400);

        return () => {
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [state]);

    // Card methods
    const addCard = useCallback(
        (card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
            dispatch({ type: 'ADD_CARD', payload: card });
        },
        []
    );

    const updateCard = useCallback((id: string, updates: Partial<Card>) => {
        dispatch({ type: 'UPDATE_CARD', payload: { id, updates } });
    }, []);

    const deleteCard = useCallback((id: string) => {
        dispatch({ type: 'DELETE_CARD', payload: { id } });
    }, []);

    const restoreCard = useCallback((id: string) => {
        dispatch({ type: 'RESTORE_CARD', payload: { id } });
    }, []);

    const moveCard = useCallback(
        (cardId: string, toLaneId: string, toIndex: number) => {
            dispatch({ type: 'MOVE_CARD', payload: { cardId, toLaneId, toIndex } });
        },
        []
    );

    const reorderCards = useCallback((laneId: string, cardIds: string[]) => {
        dispatch({ type: 'REORDER_CARDS', payload: { laneId, cardIds } });
    }, []);

    const undoCard = useCallback((cardId: string) => {
        dispatch({ type: 'UNDO_CARD', payload: { cardId } });
    }, []);

    // Lane methods
    const addLane = useCallback((title: string) => {
        dispatch({ type: 'ADD_LANE', payload: { title } });
    }, []);

    const updateLane = useCallback((id: string, updates: Partial<Lane>) => {
        dispatch({ type: 'UPDATE_LANE', payload: { id, updates } });
    }, []);

    const deleteLane = useCallback((id: string) => {
        dispatch({ type: 'DELETE_LANE', payload: { id } });
    }, []);

    const reorderLanes = useCallback((laneIds: string[]) => {
        dispatch({ type: 'REORDER_LANES', payload: { laneIds } });
    }, []);

    // Project methods
    const updateProject = useCallback((updates: Partial<Project>) => {
        dispatch({ type: 'UPDATE_PROJECT', payload: updates });
    }, []);

    // Helper methods
    const getCardsByLane = useCallback(
        (laneId: string): Card[] => {
            const lane = state.project.lanes.find(l => l.id === laneId);
            if (!lane) return [];

            return lane.cardIds
                .map(cardId => state.cards[cardId])
                .filter((card): card is Card => card !== undefined && !card.isDeleted);
        },
        [state.project.lanes, state.cards]
    );

    const canUndoCard = useCallback(
        (cardId: string): boolean => {
            const versions = state.cardVersions[cardId];
            return versions !== undefined && versions.length > 0;
        },
        [state.cardVersions]
    );

    const value: BoardContextValue = {
        state,
        dispatch,
        addCard,
        updateCard,
        deleteCard,
        restoreCard,
        moveCard,
        reorderCards,
        undoCard,
        addLane,
        updateLane,
        deleteLane,
        reorderLanes,
        updateProject,
        getCardsByLane,
        canUndoCard,
    };

    return (
        <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
    );
}

/**
 * Hook to access board context
 */
export function useBoard(): BoardContextValue {
    const context = useContext(BoardContext);
    if (!context) {
        throw new Error('useBoard must be used within a BoardProvider');
    }
    return context;
}

/**
 * Hook to access just the board state (for components that only read)
 */
export function useBoardState(): BoardState {
    const { state } = useBoard();
    return state;
}

