import { useMemo, useState } from 'react';
import { useBoard } from '../../context';
import { Button, Input, ImageUpload } from '../common';
import styles from './ProjectsOverview.module.css';

interface ProjectsOverviewProps {
  onOpenProject: (projectId: string) => void;
}

export function ProjectsOverview({ onOpenProject }: ProjectsOverviewProps) {
  const {
    projects,
    addProject,
    updateProjectById,
    state,
  } = useBoard();
  const [titleDraft, setTitleDraft] = useState('');
  const [thumbnailDraft, setThumbnailDraft] = useState<string | null>(null);

  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of Object.values(state.cards)) {
      if (card.isDeleted) continue;
      counts[card.projectId] = (counts[card.projectId] ?? 0) + 1;
    }
    return counts;
  }, [state.cards]);

  if (state.isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading projects...</p>
      </div>
    );
  }

  const handleCreateProject = () => {
    if (!titleDraft.trim()) return;
    addProject({
      title: titleDraft.trim(),
      thumbnailUrl: thumbnailDraft,
    });
    setTitleDraft('');
    setThumbnailDraft(null);
  };

  const handleOpenProject = (projectId: string) => {
    onOpenProject(projectId);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Projects</p>
          <h1 className={styles.title}>Choose a board</h1>
        </div>
      </header>

      <section className={styles.createPanel}>
        <div className={styles.createFields}>
          <Input
            label="Project title"
            value={titleDraft}
            onChange={event => setTitleDraft(event.target.value)}
            placeholder="e.g. Product launch"
          />
          <div className={styles.thumbnailUploadField}>
            <label className={styles.fieldLabel}>Thumbnail (optional)</label>
            <ImageUpload
              value={thumbnailDraft}
              onChange={setThumbnailDraft}
              placeholder="Click to upload thumbnail"
            />
          </div>
        </div>
        <div className={styles.createActions}>
          <Button
            variant="primary"
            onClick={handleCreateProject}
            disabled={!titleDraft.trim()}
          >
            Create project
          </Button>
        </div>
      </section>

      <section className={styles.grid}>
        {projects.map(project => {
          const cardsCount = cardCounts[project.id] ?? 0;
          return (
            <article key={project.id} className={styles.card}>
              <div className={styles.thumbnail}>
                <ImageUpload
                  value={project.thumbnailUrl ?? null}
                  onChange={(url) => updateProjectById(project.id, { thumbnailUrl: url })}
                  placeholder="Upload thumbnail"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{project.title}</h2>
                  <p className={styles.cardMeta}>
                    {project.lanes.length} lanes · {cardsCount} cards
                  </p>
                </div>
                <div className={styles.cardActions}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    Open board
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
