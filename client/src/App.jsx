import { AppProvider } from './context/AppContext.jsx';
import { WorkspacePage } from './pages/WorkspacePage.jsx';

export default function App() {
  return (
    <AppProvider>
      <WorkspacePage />
    </AppProvider>
  );
}
