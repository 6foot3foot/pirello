import { BoardProvider } from './context';
import { Board } from './components';

function App() {
  return (
    <BoardProvider>
      <Board />
    </BoardProvider>
  );
}

export default App;
