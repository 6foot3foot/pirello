import { useState } from 'react';
import type { Card, CardType, Priority, Label } from '../../types';
import { DEFAULT_LABELS } from '../../types';
import { Button } from '../common';
import styles from './Card.module.css';

interface CardEditorProps {
  card?: Partial<Card>;
  onSave: (card: Partial<Card>) => void;
  onCancel: () => void;
}

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'story', label: 'Story' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function CardEditor({ card, onSave, onCancel }: CardEditorProps) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [description, setDescription] = useState(card?.description ?? '');
  const [type, setType] = useState<CardType>(card?.type ?? 'task');
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '');
  const [assignee, setAssignee] = useState(card?.assignee ?? '');
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(card?.labels ?? []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      dueDate: dueDate || null,
      assignee: assignee.trim() || null,
      labels: selectedLabels,
    });
  };

  const toggleLabel = (label: Label) => {
    setSelectedLabels(prev => {
      const exists = prev.some(l => l.id === label.id);
      if (exists) {
        return prev.filter(l => l.id !== label.id);
      }
      return [...prev, label];
    });
  };

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Card title..."
        className={styles.editorInput}
        autoFocus
      />

      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description..."
        className={styles.editorTextarea}
        rows={3}
      />

      <div className={styles.editorRow}>
        <select
          value={type}
          onChange={e => setType(e.target.value as CardType)}
          className={styles.editorSelect}
        >
          {CARD_TYPES.map(t => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={e => setPriority(e.target.value as Priority)}
          className={styles.editorSelect}
        >
          {PRIORITIES.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.editorRow}>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className={styles.editorInput}
        />

        <input
          type="text"
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
          placeholder="Assignee..."
          className={styles.editorInput}
        />
      </div>

      {/* Labels */}
      <div className={styles.labelPicker}>
        {DEFAULT_LABELS.map(label => (
          <button
            key={label.id}
            type="button"
            className={`${styles.labelOption} ${
              selectedLabels.some(l => l.id === label.id) ? styles.labelSelected : ''
            }`}
            style={{ backgroundColor: label.color }}
            onClick={() => toggleLabel(label)}
            title={label.name}
          >
            {label.name}
          </button>
        ))}
      </div>

      <div className={styles.editorActions}>
        <Button type="button" variant="ghost" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="small" disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}

