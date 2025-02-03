import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  styled,
} from '@mui/material';
import {
  ExitToApp as ExitToAppIcon,
  Analytics as AnalyticsIcon,
  People as PeopleIcon,
  Archive as ArchiveIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Logo = styled('img')({
  height: '28px',
  marginRight: '24px',
  display: 'block',
});

const StyledAppBar = styled(AppBar)({
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #E5E7EB',
  boxShadow: 'none',
});

const StyledToolbar = styled(Toolbar)({
  minHeight: '64px',
  padding: '0 24px',
});

const StyledTab = styled(Tab)({
  textTransform: 'none',
  minWidth: 0,
  padding: '8px 16px',
  color: '#374151',
  fontSize: '0.875rem',
  fontWeight: 500,
  outline: 'none !important',
  background: 'none',
  '&.Mui-selected': {
    color: '#3B82F6',
    fontWeight: 600,
    background: 'none',
  },
  '&:hover': {
    color: '#3B82F6',
    background: 'none',
  },
  '&:focus': {
    outline: 'none',
    background: 'none',
  },
});

const WavingHand = styled('span')({
  display: 'inline-block',
  fontSize: '1.2rem',
  animation: 'wave 2.5s infinite',
  transformOrigin: '70% 70%',
  '@keyframes wave': {
    '0%': { transform: 'rotate(0deg)' },
    '10%': { transform: 'rotate(14deg)' },
    '20%': { transform: 'rotate(-8deg)' },
    '30%': { transform: 'rotate(14deg)' },
    '40%': { transform: 'rotate(-4deg)' },
    '50%': { transform: 'rotate(10deg)' },
    '60%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(0deg)' },
  },
});

const UserGreeting = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginRight: '16px',
  '& .greeting-text': {
    fontWeight: 500,
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
});

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser, isAdmin } = useAuth();

  const menuItems = [
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', adminOnly: true },
    { text: 'Schedule Management', icon: <ScheduleIcon />, path: '/schedules', adminOnly: true },
    { text: 'Employee Management', icon: <PeopleIcon />, path: '/employees', adminOnly: true },
    { text: 'Archive', icon: <ArchiveIcon />, path: '/archive', adminOnly: true },
  ];

  const countryItems = [
    { text: 'Egypt', icon: <PublicIcon />, path: '/country/egypt' },
    { text: 'Morocco', icon: <PublicIcon />, path: '/country/morocco' },
    { text: 'Africa', icon: <PublicIcon />, path: '/country/africa' },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);
  const allNavItems = [...filteredMenuItems, ...countryItems];
  const currentTab = allNavItems.findIndex(item => {
    // Check if current path starts with the menu item path
    // This handles both exact matches and sub-paths
    return location.pathname.startsWith(item.path);
  });

  // If no tab matches, default to first tab
  const activeTab = currentTab === -1 ? 0 : currentTab;

  const getUserFirstName = () => {
    if (currentUser?.email) {
      // Extract name from email (e.g., "john.doe@gmail.com" -> "John")
      const name = currentUser.email.split('@')[0].split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'User';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <StyledAppBar position="fixed">
        <StyledToolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Logo src="/assets/indrive-logo.svg" alt="InDrive Logo" />
          </Box>

          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => navigate(allNavItems[newValue].path)}
            sx={{ 
              ml: 4,
              background: 'none',
              '& .MuiTabs-indicator': {
                backgroundColor: '#3B82F6',
                height: 2,
              },
              '& .MuiTab-root': {
                outline: 'none !important',
                background: 'none',
              },
              '& .MuiTabs-flexContainer': {
                background: 'none',
              }
            }}
          >
            {allNavItems.map((item, index) => (
              <StyledTab 
                key={item.text} 
                label={item.text}
                id={`nav-tab-${index}`}
                aria-controls={`nav-tabpanel-${index}`}
              />
            ))}
          </Tabs>

          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserGreeting>
              <Typography variant="h6" className="greeting-text">
                Hello, {getUserFirstName()}
              </Typography>
              <WavingHand>👋</WavingHand>
            </UserGreeting>
            <IconButton 
              onClick={handleLogout}
              sx={{ color: '#374151' }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Box>
        </StyledToolbar>
      </StyledAppBar>

      <Box
        component="main"
        sx={{
          backgroundColor: '#F9FAFB',
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          mt: '64px',
        }}
      >
        <Box
          sx={{
            maxWidth: '1600px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
