import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Button, 
  Typography, 
  Paper,
  Alert,
  Snackbar,
  useTheme,
  alpha,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../config/firebase';
import { logEvent } from 'firebase/analytics';
import AnimatedBackground from '../components/AnimatedBackground';

// Styled components using motion
const MotionContainer = motion.create(Container);
const MotionPaper = motion.create(Paper);
const MotionButton = motion.create(Button);

export default function Login() {
  const { currentUser, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    if (currentUser) {
      logEvent(analytics, 'login', {
        method: 'google',
        userId: currentUser.uid
      });
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
      setError('Failed to sign in with Google. Please try again.');
      logEvent(analytics, 'login_error', {
        method: 'google',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    tap: {
      scale: 0.98
    }
  };

  return (
    <>
      <AnimatedBackground />
      <Box
        component={MotionContainer}
        maxWidth="xs"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MotionPaper
            elevation={12}
            variants={itemVariants}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              backgroundColor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.background.paper, 0.8)
                : alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          >
            <motion.div variants={iconVariants}>
              <CalendarMonthIcon
                sx={{
                  fontSize: 48,
                  mb: 2,
                  color: theme.palette.primary.main,
                }}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Typography
                component="h1"
                variant="h4"
                gutterBottom
                color="text.primary"
                sx={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Schedule Management
              </Typography>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Typography
                variant="body1"
                color="text.secondary"
                align="center"
                sx={{ mb: 4, maxWidth: '280px' }}
              >
                Sign in to access your schedule management tools and stay organized
              </Typography>
            </motion.div>

            <MotionButton
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              fullWidth
              size="large"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              sx={{ 
                mt: 2,
                py: 1.5,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'common.white',
                color: theme.palette.mode === 'dark' ? 'common.white' : 'text.primary',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : alpha(theme.palette.primary.main, 0.04),
                  boxShadow: `0 0 0 1px ${alpha(
                    theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main, 
                    theme.palette.mode === 'dark' ? 0.3 : 0.2
                  )}`,
                },
                border: `1px solid ${alpha(
                  theme.palette.mode === 'dark' ? '#fff' : theme.palette.divider,
                  theme.palette.mode === 'dark' ? 0.2 : 0.1
                )}`,
                borderRadius: 2,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                '& .MuiSvgIcon-root': {
                  color: theme.palette.mode === 'dark' ? 'common.white' : 'inherit'
                }
              }}
            >
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </MotionButton>
          </MotionPaper>
        </Box>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
