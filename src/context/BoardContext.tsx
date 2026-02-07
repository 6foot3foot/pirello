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
import type { Card, CardVersion, Lane, Project } from '../types';
import { DEFAULT_LANES } from '../types';
import { generateId } from '../utils';
import { storage } from '../services';

/**
 * Context value with state and convenience methods
 */
interface BoardContextValue {
    state: BoardState;
    dispatch: React.Dispatch<BoardAction>;
    activeProject: Project | null;
    activeProjectId: string | null;
    projects: Project[];

    // Card methods
    addCard: (
        card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'projectId'>
    ) => void;
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
    updateProjectById: (id: string, updates: Partial<Project>) => void;
    addProject: (input: { title: string; thumbnailUrl?: string | null }) => void;
    deleteProject: (id: string) => void;
    setActiveProject: (id: string) => void;

    // Helpers
    getCardsByLane: (laneId: string) => Card[];
    canUndoCard: (cardId: string) => boolean;
}

const BoardContext = createContext<BoardContextValue | null>(null);

/**
 * Create default lanes
 */
function createDefaultLanes(): Lane[] {
    return DEFAULT_LANES.map(lane => ({
        ...lane,
        id: generateId(),
    }));
}

/**
 * Create initial state with default project and lanes
 */
function createInitialState(): BoardState {
    const now = new Date().toISOString();
    const defaultLanes = createDefaultLanes();
    const defaultProject: Project = {
        id: generateId(),
        title: 'Stuff to do now, stuff to do later',
        thumbnailUrl: null,
        lanes: defaultLanes,
        createdAt: now,
        updatedAt: now,
    };

    return {
        projects: [defaultProject],
        activeProjectId: defaultProject.id,
        cards: {},
        cardVersions: {},
        isLoading: true,
        error: null,
    };
}

type LegacyBoardState = {
    project: {
        id: string;
        name?: string;
        title?: string;
        lanes: Lane[];
        createdAt: string;
        updatedAt: string;
    };
    cards: Record<string, Omit<Card, 'projectId'> & { projectId?: string }>;
    cardVersions: Record<string, CardVersion[]>;
    isLoading?: boolean;
    error?: string | null;
};

function normalizeState(raw: BoardState | LegacyBoardState): BoardState {
    if ('projects' in raw) {
        const projects = raw.projects.map(project => ({
            ...project,
            title: project.title ?? 'Untitled project',
            thumbnailUrl: project.thumbnailUrl ?? null,
        }));
        const candidateProjectId = raw.activeProjectId ?? projects[0]?.id ?? null;
        const activeProjectId = projects.some(project => project.id === candidateProjectId)
            ? candidateProjectId
            : projects[0]?.id ?? null;
        const cards = Object.fromEntries(
            Object.entries(raw.cards).map(([id, card]) => [
                id,
                {
                    ...card,
                    projectId: card.projectId ?? activeProjectId ?? '',
                },
            ])
        );
        const cardVersions = Object.fromEntries(
            Object.entries(raw.cardVersions ?? {}).map(([cardId, versions]) => {
                const projectId = cards[cardId]?.projectId ?? activeProjectId ?? '';
                return [
                    cardId,
                    versions.map(version => ({
                        ...version,
                        data: {
                            ...version.data,
                            projectId: version.data.projectId ?? projectId,
                        },
                    })),
                ];
            })
        );
        return {
            ...raw,
            projects,
            activeProjectId,
            cards,
            cardVersions,
            isLoading: raw.isLoading ?? false,
            error: raw.error ?? null,
        };
    }

    const project = raw.project;
    const normalizedProject: Project = {
        id: project.id,
        title: project.title ?? project.name ?? 'Untitled project',
        thumbnailUrl: null,
        lanes: project.lanes ?? createDefaultLanes(),
        createdAt: project.createdAt ?? new Date().toISOString(),
        updatedAt: project.updatedAt ?? new Date().toISOString(),
    };
    const cards = Object.fromEntries(
        Object.entries(raw.cards ?? {}).map(([id, card]) => [
            id,
            {
                ...card,
                projectId: card.projectId ?? normalizedProject.id,
            },
        ])
    );
    const cardVersions = Object.fromEntries(
        Object.entries(raw.cardVersions ?? {}).map(([cardId, versions]) => {
            const projectId = cards[cardId]?.projectId ?? normalizedProject.id;
            return [
                cardId,
                versions.map(version => ({
                    ...version,
                    data: {
                        ...version.data,
                        projectId: version.data.projectId ?? projectId,
                    },
                })),
            ];
        })
    );

    return {
        projects: [normalizedProject],
        activeProjectId: normalizedProject.id,
        cards,
        cardVersions,
        isLoading: raw.isLoading ?? false,
        error: raw.error ?? null,
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
                    const normalized = normalizeState(savedState);
                    dispatch({
                        type: 'LOAD_STATE',
                        payload: { ...normalized, isLoading: false },
                    });
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
        (
            card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'projectId'>
        ) => {
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
        if (!state.activeProjectId) return;
        dispatch({
            type: 'UPDATE_PROJECT',
            payload: { id: state.activeProjectId, updates },
        });
    }, [state.activeProjectId]);

    const updateProjectById = useCallback((id: string, updates: Partial<Project>) => {
        dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
    }, []);

    const addProject = useCallback(
        (input: { title: string; thumbnailUrl?: string | null }) => {
            const trimmed = input.title.trim();
            if (!trimmed) return;
            const payload = {
                title: trimmed,
                thumbnailUrl: input.thumbnailUrl?.trim() || null,
            };
            dispatch({ type: 'ADD_PROJECT', payload });
        },
        []
    );

    const deleteProject = useCallback((id: string) => {
        dispatch({ type: 'DELETE_PROJECT', payload: { id } });
    }, []);

    const setActiveProject = useCallback((id: string) => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: { id } });
    }, []);

    // Helper methods
    const getCardsByLane = useCallback(
        (laneId: string): Card[] => {
            const activeProject = state.projects.find(
                project => project.id === state.activeProjectId
            );
            if (!activeProject) return [];
            const lane = activeProject.lanes.find(l => l.id === laneId);
            if (!lane) return [];

            return lane.cardIds
                .map(cardId => state.cards[cardId])
                .filter(
                    (card): card is Card =>
                        card !== undefined &&
                        !card.isDeleted &&
                        card.projectId === activeProject.id
                );
        },
        [state.projects, state.cards, state.activeProjectId]
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
        activeProject:
            state.projects.find(project => project.id === state.activeProjectId) ??
            null,
        activeProjectId: state.activeProjectId,
        projects: state.projects,
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
        updateProjectById,
        addProject,
        deleteProject,
        setActiveProject,
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

