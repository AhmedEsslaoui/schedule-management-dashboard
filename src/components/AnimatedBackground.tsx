import { Box, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';

const MotionDiv = motion.create("div");

interface OrbProps {
  delay?: number;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
}

interface FloatingParticleProps {
  size?: number;
  color?: string;
  x?: number;
  y?: number;
}

const Orb = ({ delay = 0, size = 300, color = '#4A90E2', x = 0, y = 0 }: OrbProps) => {
  return (
    <MotionDiv
      style={{
        position: 'absolute',
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${alpha(color, 0.7)}, ${alpha(color, 0)})`,
        filter: 'blur(40px)',
        zIndex: 0,
      }}
      initial={{ opacity: 0, scale: 0.5, x, y }}
      animate={{
        opacity: [0.5, 0.8, 0.5],
        scale: [1, 1.2, 1],
        x: [x - 100, x + 100, x - 100],
        y: [y - 100, y + 100, y - 100],
      }}
      transition={{
        duration: 15,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
        delay,
      }}
    />
  );
};

const FloatingParticle = ({ size = 4, color = '#4A90E2', x = 0, y = 0 }: FloatingParticleProps) => {
  return (
    <MotionDiv
      style={{
        position: 'absolute',
        width: size,
        height: size,
        background: alpha(color, 0.8),
        borderRadius: '50%',
        zIndex: 1,
      }}
      initial={{ x, y, opacity: 0 }}
      animate={{
        y: [y - 200, y + 200],
        x: [x - 100, x + 100],
        opacity: [0.4, 1, 0.4],
        scale: [1, 2, 1],
      }}
      transition={{
        duration: Math.random() * 5 + 5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      }}
    />
  );
};

export default function AnimatedBackground() {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;
  const accentColor = theme.palette.mode === 'dark' ? '#2D5C8F' : '#90CAF9';

  // Generate random positions for particles
  const particles = Array.from({ length: 30 }, () => ({
    x: Math.random() * dimensions.width,
    y: Math.random() * dimensions.height,
    size: Math.random() * 6 + 3,
    color: [primaryColor, secondaryColor, accentColor][Math.floor(Math.random() * 3)],
  }));

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0,
        opacity: theme.palette.mode === 'dark' ? 0.7 : 0.5,
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      }}
    >
      {/* Main orbs */}
      <Orb 
        color={primaryColor} 
        size={600} 
        x={-200} 
        y={-200} 
        delay={0} 
      />
      <Orb 
        color={secondaryColor} 
        size={500} 
        x={dimensions.width - 200} 
        y={-100} 
        delay={2}
      />
      <Orb 
        color={accentColor} 
        size={550} 
        x={dimensions.width / 2 - 250} 
        y={dimensions.height - 300} 
        delay={1}
      />

      {/* Floating particles */}
      {particles.map((particle, index) => (
        <FloatingParticle
          key={index}
          x={particle.x}
          y={particle.y}
          size={particle.size}
          color={particle.color}
        />
      ))}
    </Box>
  );
}
