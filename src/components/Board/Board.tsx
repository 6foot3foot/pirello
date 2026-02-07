import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useBoard } from '../../context';
import type { Card as CardType } from '../../types';
import { Lane } from '../Lane';
import { Card } from '../Card';
import { Button } from '../common';
import styles from './Board.module.css';

interface BoardProps {
  onBackToProjects?: () => void;
}

export function Board({ onBackToProjects }: BoardProps) {
  const {
    state,
    activeProject,
    getCardsByLane,
    moveCard,
    reorderCards,
    reorderLanes,
    addLane,
    updateProject,
  } = useBoard();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [isAddingLane, setIsAddingLane] = useState(false);
  const [newLaneTitle, setNewLaneTitle] = useState('');
  const [projectNameDraft, setProjectNameDraft] = useState(
    activeProject?.title ?? ''
  );

  useEffect(() => {
    setProjectNameDraft(activeProject?.title ?? '');
  }, [activeProject?.title]);

  const saveProjectName = () => {
    const trimmed = projectNameDraft.trim();
    if (!trimmed) {
      setProjectNameDraft(activeProject?.title ?? '');
      return;
    }
    if (trimmed !== (activeProject?.title ?? '')) {
      updateProject({ title: trimmed });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Find the card being dragged
    const card = state.cards[activeId];
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a card
    const activeCard = state.cards[activeId];
    if (!activeCard) return;

    // Find the lane we're over
    let overLaneId: string | null = null;

    // Check if we're over a lane directly
    const overLane = activeProject?.lanes.find(l => l.id === overId);
    if (overLane) {
      overLaneId = overLane.id;
    } else {
      // Check if we're over a card, and get its lane
      const overCard = state.cards[overId];
      if (overCard) {
        overLaneId = overCard.laneId;
      }
    }

    // If we're over a different lane, move the card
    if (overLaneId && overLaneId !== activeCard.laneId) {
      const overLane = activeProject?.lanes.find(l => l.id === overLaneId);
      if (overLane) {
        const overIndex = overLane.cardIds.length;
        moveCard(activeId, overLaneId, overIndex);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're reordering lanes
    const activeLane = activeProject?.lanes.find(l => l.id === activeId);
    const overLane = activeProject?.lanes.find(l => l.id === overId);

    if (activeLane && overLane && activeId !== overId) {
      const laneIds = activeProject?.lanes.map(l => l.id) ?? [];
      const oldIndex = laneIds.indexOf(activeId);
      const newIndex = laneIds.indexOf(overId);

      const newLaneIds = [...laneIds];
      newLaneIds.splice(oldIndex, 1);
      newLaneIds.splice(newIndex, 0, activeId);

      reorderLanes(newLaneIds);
      return;
    }

    // Check if we're reordering cards within a lane
    const activeCard = state.cards[activeId];
    if (!activeCard) return;

    const overCard = state.cards[overId];
    if (overCard && activeCard.laneId === overCard.laneId && activeId !== overId) {
      const lane = activeProject?.lanes.find(l => l.id === activeCard.laneId);
      if (!lane) return;

      const cardIds = [...lane.cardIds];
      const oldIndex = cardIds.indexOf(activeId);
      const newIndex = cardIds.indexOf(overId);

      cardIds.splice(oldIndex, 1);
      cardIds.splice(newIndex, 0, activeId);

      reorderCards(lane.id, cardIds);
    }
  };

  const handleAddLane = () => {
    if (newLaneTitle.trim()) {
      addLane(newLaneTitle.trim());
      setNewLaneTitle('');
      setIsAddingLane(false);
    }
  };

  const sortedLanes = [...(activeProject?.lanes ?? [])].sort(
    (a, b) => a.order - b.order
  );

  if (state.isLoading || !activeProject) {
    return (
      <div className={styles.loading}>
        <p>Loading board...</p>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.projectNameRow}>
          {onBackToProjects && (
            <Button
              variant="ghost"
              size="small"
              className={styles.backButton}
              onClick={onBackToProjects}
            >
              ← Projects
            </Button>
          )}
          <span className={styles.projectNameLabel}>Project</span>
          <input
            className={styles.projectNameInput}
            value={projectNameDraft}
            onChange={event => setProjectNameDraft(event.target.value)}
            onBlur={saveProjectName}
            onKeyDown={event => {
              if (event.key === 'Enter') saveProjectName();
              if (event.key === 'Escape') {
                setProjectNameDraft(activeProject.title);
              }
            }}
            placeholder="Project title"
            aria-label="Project title"
          />
        </div>
      </header>

      {/* Lanes container */}
      <div className={styles.lanesContainer}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedLanes.map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sortedLanes.map(lane => (
              <Lane
                key={lane.id}
                lane={lane}
                cards={getCardsByLane(lane.id)}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeCard && (
              <Card
                card={activeCard}
                onDelete={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Add lane */}
        {isAddingLane ? (
          <div className={styles.addLaneForm}>
            <input
              type="text"
              value={newLaneTitle}
              onChange={e => setNewLaneTitle(e.target.value)}
              placeholder="Lane title..."
              className={styles.addLaneInput}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddLane();
                if (e.key === 'Escape') {
                  setIsAddingLane(false);
                  setNewLaneTitle('');
                }
              }}
            />
            <div className={styles.addLaneActions}>
              <Button
                variant="primary"
                size="small"
                onClick={handleAddLane}
                disabled={!newLaneTitle.trim()}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={() => {
                  setIsAddingLane(false);
                  setNewLaneTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            className={styles.addLaneBtn}
            onClick={() => setIsAddingLane(true)}
          >
            + Add lane
          </button>
        )}
      </div>
    </div>
  );
}

