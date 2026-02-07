import { useState } from 'react';
import { BoardProvider } from './context';
import { Board, ProjectsOverview } from './components';

function AppContent() {
  const [view, setView] = useState<'overview' | 'board'>('overview');

  if (view === 'overview') {
    return (
      <ProjectsOverview
        onOpenProject={() => {
          setView('board');
        }}
      />
    );
  }

  return (
    <Board
      onBackToProjects={() => {
        setView('overview');
      }}
    />
  );
}

function App() {
  return (
    <BoardProvider>
      <AppContent />
    </BoardProvider>
  );
}

export default App;
