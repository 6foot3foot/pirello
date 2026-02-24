import { useState, useEffect } from 'react';
import { BoardProvider, useBoard } from './context';
import { Board, ProjectsOverview } from './components';

function AppContent() {
  const { state, setActiveProject } = useBoard();
  const [view, setView] = useState<'overview' | 'board'>(() => {
    // Check URL hash on initial load
    const hash = window.location.hash;
    if (hash.startsWith('#board/')) {
      return 'board';
    }
    return 'overview';
  });

  // Restore active project from URL hash on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#board/')) {
      const projectId = hash.slice('#board/'.length);
      if (projectId && !state.isLoading) {
        const projectExists = state.projects.some(p => p.id === projectId);
        if (projectExists) {
          setActiveProject(projectId);
          setView('board');
        } else {
          // Project doesn't exist, go to overview
          window.location.hash = '';
          setView('overview');
        }
      }
    }
  }, [state.isLoading, state.projects, setActiveProject]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#board/')) {
        const projectId = hash.slice('#board/'.length);
        const projectExists = state.projects.some(p => p.id === projectId);
        if (projectExists) {
          setActiveProject(projectId);
          setView('board');
        }
      } else {
        setView('overview');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [state.projects, setActiveProject]);

  const handleOpenProject = (projectId: string) => {
    setActiveProject(projectId);
    window.location.hash = `board/${projectId}`;
    setView('board');
  };

  const handleBackToProjects = () => {
    window.location.hash = '';
    setView('overview');
  };

  if (view === 'overview') {
    return <ProjectsOverview onOpenProject={handleOpenProject} />;
  }

  return <Board onBackToProjects={handleBackToProjects} />;
}

function App() {
  return (
    <BoardProvider>
      <AppContent />
    </BoardProvider>
  );
}

export default App;
