import AppRouter from './AppRouter';
import { AuthProvider } from './state/authContext';

const App = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;