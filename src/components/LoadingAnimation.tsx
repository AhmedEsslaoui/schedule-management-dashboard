import React from 'react';
import { Box, CircularProgress, styled } from '@mui/material';

const LoadingContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  gap: '16px',
  width: '100%',
});

const PulsingDot = styled('div')({
  position: 'relative',
  width: '10px',
  height: '10px',
  borderRadius: '5px',
  backgroundColor: '#3b82f6',
  color: '#3b82f6',
  animation: 'loadingPulse 1.5s ease-in-out infinite',
  '&:before, &:after': {
    content: '""',
    position: 'absolute',
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '5px',
    backgroundColor: '#3b82f6',
    color: '#3b82f6',
    animation: 'loadingPulse 1.5s ease-in-out infinite',
  },
  '&:before': {
    left: '-15px',
    animationDelay: '-0.3s',
  },
  '&:after': {
    left: '15px',
    animationDelay: '0.3s',
  },
  '@keyframes loadingPulse': {
    '0%, 100%': {
      opacity: 1,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.5,
      transform: 'scale(0.8)',
    },
  },
});

const LoadingRing = styled(Box)({
  position: 'relative',
  width: '40px',
  height: '40px',
  '&:after': {
    content: '""',
    display: 'block',
    width: '32px',
    height: '32px',
    margin: '4px',
    borderRadius: '50%',
    border: '3px solid #3b82f6',
    borderColor: '#3b82f6 transparent #3b82f6 transparent',
    animation: 'ring 1.2s linear infinite',
  },
  '@keyframes ring': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
});

interface LoadingAnimationProps {
  variant?: 'dots' | 'ring' | 'circular';
  size?: 'small' | 'medium' | 'large';
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  variant = 'dots',
  size = 'medium'
}) => {
  const getLoadingElement = () => {
    switch (variant) {
      case 'dots':
        return <PulsingDot />;
      case 'ring':
        return <LoadingRing />;
      case 'circular':
        return <CircularProgress size={size === 'small' ? 24 : size === 'large' ? 48 : 32} />;
      default:
        return <PulsingDot />;
    }
  };

  return (
    <LoadingContainer>
      {getLoadingElement()}
    </LoadingContainer>
  );
};

export default LoadingAnimation;
