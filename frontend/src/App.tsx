import AppRouter from './AppRouter';
import { AuthProvider } from './state/authContext';
import TargetCursor from './components/TargetCursor';

const App = () => {
  return (
    
    <AuthProvider>
      
       <TargetCursor 
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
      />
      <AppRouter />
    </AuthProvider>
  );
};

export default App;