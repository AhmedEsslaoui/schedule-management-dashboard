import React from 'react';
import { Box, styled } from '@mui/material';
import LoadingAnimation from './LoadingAnimation';

const LoadingContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100%',
  backgroundColor: '#fff',
});

const LoadingScreen: React.FC = () => {
  return (
    <LoadingContainer>
      <LoadingAnimation variant="dots" size="large" />
    </LoadingContainer>
  );
};

export default LoadingScreen;
