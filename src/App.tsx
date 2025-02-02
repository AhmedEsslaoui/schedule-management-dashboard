import { lazy, Suspense } from 'react';
import { 
  createBrowserRouter, 
  createRoutesFromElements, 
  RouterProvider,
  Route,
  Navigate,
  Outlet,
  isRouteErrorResponse,
  useRouteError
} from 'react-router-dom';
import { Box, Typography, Button, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Analytics from './pages/Analytics';
import ScheduleManagement from './pages/ScheduleManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loaded components
const Archive = lazy(() => import('./pages/Archive'));
const CountryPage = lazy(() => import('./pages/CountryPage'));

function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error.status} {error.statusText}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          {error.data}
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.href = '/schedules'}
        >
          Go to Schedule Management
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h5" color="error" gutterBottom>
        Oops! Something went wrong
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Please try again or contact support if the problem persists.
      </Typography>
      <Button 
        variant="contained" 
        color="primary"
        onClick={() => window.location.href = '/schedules'}
      >
        Go to Schedule Management
      </Button>
    </Box>
  );
}

function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<ErrorBoundary />}>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><LayoutWrapper /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/country/egypt" replace />} />
        
        {/* Country routes - accessible to all users */}
        <Route path="/country/:countryId" element={
          <Suspense fallback={<LoadingScreen />}>
            <CountryPage />
          </Suspense>
        } />
        
        {/* Admin only routes */}
        <Route element={<ProtectedRoute requireAdmin><Outlet /></ProtectedRoute>}>
          <Route path="/employees" element={<EmployeeManagement />} />
          <Route path="/schedules" element={<ScheduleManagement />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/archive" element={
            <Suspense fallback={<LoadingScreen />}>
              <Archive />
            </Suspense>
          } />
        </Route>
      </Route>
    </Route>
  )
);

function App() {
  return (
    <AuthProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <RouterProvider router={router} />
      </LocalizationProvider>
    </AuthProvider>
  );
}

export default App;
