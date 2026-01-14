import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card as CardType } from '../../types';
import { useBoard } from '../../context';
import { CardEditor } from './CardEditor';
import styles from './Card.module.css';

interface CardProps {
  card: CardType;
  onDelete: (id: string) => void;
}

export function Card({ card, onDelete }: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateCard, canUndoCard, undoCard } = useBoard();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = (updates: Partial<CardType>) => {
    updateCard(card.id, updates);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <CardEditor
        card={card}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const priorityClass = styles[`priority${card.priority.charAt(0).toUpperCase()}${card.priority.slice(1)}`];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
    >
      {/* Priority indicator */}
      <div className={`${styles.priorityBar} ${priorityClass}`} />

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className={styles.labels}>
          {card.labels.map(label => (
            <span
              key={label.id}
              className={styles.label}
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className={styles.title}>{card.title}</h3>

      {/* Description preview */}
      {card.description && (
        <p className={styles.description}>{card.description}</p>
      )}

      {/* Meta info */}
      <div className={styles.meta}>
        {card.dueDate && (
          <span className={styles.dueDate}>
            📅 {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}
        {card.assignee && (
          <span className={styles.assignee}>👤 {card.assignee}</span>
        )}
        <span className={styles.type}>{card.type}</span>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title="Edit card"
        >
          ✏️
        </button>
        {canUndoCard(card.id) && (
          <button
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              undoCard(card.id);
            }}
            title="Undo last change"
          >
            ↩️
          </button>
        )}
        <button
          className={styles.actionBtn}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          title="Delete card"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

