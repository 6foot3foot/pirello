import { useState } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Lane as LaneType, Card as CardType } from '../../types';
import { useBoard } from '../../context';
import { Card, CardEditor } from '../Card';
import { Button, Dialog } from '../common';
import styles from './Lane.module.css';

interface LaneProps {
  lane: LaneType;
  cards: CardType[];
}

export function Lane({ lane, cards }: LaneProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(lane.title);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const { addCard, deleteCard, updateLane, deleteLane, state } = useBoard();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lane.id, data: { type: 'lane' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddCard = (cardData: Partial<CardType>) => {
    addCard({
      title: cardData.title!,
      description: cardData.description ?? '',
      type: cardData.type ?? 'task',
      priority: cardData.priority ?? 'medium',
      dueDate: cardData.dueDate ?? null,
      labels: cardData.labels ?? [],
      assignee: cardData.assignee ?? null,
      laneId: lane.id,
      order: cards.length,
    });
    setIsAddingCard(false);
  };

  const handleTitleSave = () => {
    if (title.trim() && title !== lane.title) {
      updateLane(lane.id, { title: title.trim() });
    } else {
      setTitle(lane.title);
    }
    setIsEditingTitle(false);
  };

  const handleDeleteLane = () => {
    deleteLane(lane.id);
  };

  const handleConfirmDeleteCard = () => {
    if (cardToDelete) {
      deleteCard(cardToDelete);
      setCardToDelete(null);
    }
  };

  const canDeleteLane = state.project.lanes.length > 1;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.lane} ${isDragging ? styles.dragging : ''}`}
      >
        {/* Lane header */}
        <div className={styles.header} {...attributes} {...listeners}>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitle(lane.title);
                  setIsEditingTitle(false);
                }
              }}
              className={styles.titleInput}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h2
              className={styles.title}
              onClick={e => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              {lane.title}
            </h2>
          )}
          <span className={styles.count}>{cards.length}</span>
          {canDeleteLane && (
            <button
              className={styles.deleteBtn}
              onClick={e => {
                e.stopPropagation();
                handleDeleteLane();
              }}
              title="Delete lane"
            >
              ×
            </button>
          )}
        </div>

        {/* Cards list */}
        <div className={styles.cards}>
          <SortableContext
            items={cards.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map(card => (
              <Card
                key={card.id}
                card={card}
                onDelete={setCardToDelete}
              />
            ))}
          </SortableContext>
        </div>

        {/* Add card */}
        {isAddingCard ? (
          <div className={styles.addCardForm}>
            <CardEditor
              onSave={handleAddCard}
              onCancel={() => setIsAddingCard(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="small"
            className={styles.addCardBtn}
            onClick={() => setIsAddingCard(true)}
          >
            + Add card
          </Button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={cardToDelete !== null}
        onClose={() => setCardToDelete(null)}
        title="Delete Card"
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteCard}
      >
        Are you sure you want to delete this card? This action can be undone using the undo button.
      </Dialog>
    </>
  );
}

