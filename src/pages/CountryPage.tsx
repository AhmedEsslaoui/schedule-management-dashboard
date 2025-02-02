import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import WbTwilightIcon from '@mui/icons-material/WbTwilight';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatTimeSlot } from '../utils/timeZones';
import LoadingAnimation from '../components/LoadingAnimation';

type TaskType = 
  | 'Chat'
  | 'Chat/Appeals+Reviews'
  | 'Appeals/Reviews'
  | 'Appeals/Reviews/Calls'
  | 'Calls'
  | 'Calls/App follow'
  | 'Chat/Emails+Groups+Calls'
  | 'Emails (New)+Appeals+Calls'
  | 'Emails (Need attention)+Reviews+Groups+Calls'
  | 'Appeals/Reviews/Calls/App follow'
  | 'Emails'
  | 'Sick'
  | 'No Show';

interface Task {
  timeSlot: string;
  taskType: TaskType;
  hasBreak?: boolean;
}

interface Agent {
  id: string;
  name: string;
  tasks: Task[];
}

interface Schedule {
  id: string;
  date: string;
  timeFrame: 'Day' | 'Afternoon' | 'Night';
  seniorName: string;
  country: string;
  agents: Agent[];
  status: 'draft' | 'published';
}

const countryMap: { [key: string]: string } = {
  'egypt': 'Egypt',
  'morocco': 'Morocco',
  'africa': 'Africa'
};

const timeFrameConfig = {
  Day: {
    icon: WbSunnyOutlinedIcon,
    color: '#FF9800',
    lightColor: '#FFF3E0',
    label: 'Day'
  },
  Afternoon: {
    icon: WbTwilightIcon,
    color: '#5C6BC0',
    lightColor: '#E8EAF6',
    label: 'Afternoon'
  },
  Night: {
    icon: DarkModeOutlinedIcon,
    color: '#455A64',
    lightColor: '#ECEFF1',
    label: 'Night'
  }
};

export default function CountryPage() {
  const { countryId } = useParams<{ countryId: string }>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | false>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryId) {
      console.log('No country ID provided');
      return;
    }

    const lowercaseCountryId = countryId.toLowerCase();
    const formattedCountry = countryMap[lowercaseCountryId];
    
    if (!formattedCountry) {
      console.log('Invalid country ID:', countryId, 'Available countries:', Object.keys(countryMap));
      return;
    }
    
    console.log('Fetching schedules for country:', formattedCountry);
    
    const q = query(
      collection(db, 'schedules'),
      where('country', '==', formattedCountry),
      where('status', '==', 'published')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoading(false);
      const scheduleData: Schedule[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Schedule));
      
      setSchedules(scheduleData);
    }, (error) => {
      console.error('Error fetching schedules:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [countryId]);

  if (!countryId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">No country ID provided</Typography>
      </Box>
    );
  }

  const lowercaseCountryId = countryId.toLowerCase();
  const formattedCountry = countryMap[lowercaseCountryId];
  
  if (!formattedCountry) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          Invalid country ID: {countryId}. Available countries: {Object.keys(countryMap).join(', ')}
        </Typography>
      </Box>
    );
  }

  const timeFrameOrder = {
    'Day': 0,
    'Afternoon': 1,
    'Night': 2
  };

  // Sort schedules by date and timeFrame
  const sortedSchedules = [...schedules].sort((a, b) => {
    // First sort by date
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // Then sort by timeFrame
    return (timeFrameOrder[a.timeFrame] || 0) - (timeFrameOrder[b.timeFrame] || 0);
  });

  const handleAccordionChange = (scheduleId: string, agentId: string) => 
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAgent(isExpanded ? `${scheduleId}-${agentId}` : false);
    };

  const formatTaskTime = (timeSlot: string): string => {
    // Check if the time is in "HH:00 - HH:00" format
    const match = timeSlot.match(/^(\d{1,2}):00 - (\d{1,2}):00$/);
    if (match) {
      const startHour = parseInt(match[1]);
      const endHour = parseInt(match[2]);
      return `${formatTimeSlot(startHour)} - ${formatTimeSlot(endHour)}`;
    }
    return timeSlot;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingAnimation variant="dots" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {formattedCountry} Schedules
      </Typography>

      {sortedSchedules.length > 0 ? (
        <Grid container spacing={2}>
          {sortedSchedules.map((schedule) => (
            <Grid item xs={12} sm={6} md={4} key={schedule.id}>
              <Paper 
                sx={{ 
                  p: 3,
                  height: '100%',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  boxShadow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h6">
                    {new Date(schedule.date).toLocaleDateString()}
                  </Typography>
                  {(() => {
                    const config = timeFrameConfig[schedule.timeFrame];
                    const Icon = config.icon;
                    return (
                      <Chip
                        icon={<Icon style={{ color: config.color }} />}
                        label={config.label}
                        sx={{
                          bgcolor: config.lightColor,
                          color: config.color,
                          fontWeight: 500,
                          '& .MuiChip-icon': {
                            fontSize: '1.2rem'
                          }
                        }}
                      />
                    );
                  })()}
                  <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 'auto' }}>
                    Senior: {schedule.seniorName}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2, flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Assignments:
                  </Typography>
                  {schedule.agents?.map((agent) => (
                    <Accordion
                      key={agent.id}
                      expanded={expandedAgent === `${schedule.id}-${agent.id}`}
                      onChange={handleAccordionChange(schedule.id, agent.id)}
                      sx={{
                        mb: 1,
                        '&:before': {
                          display: 'none',
                        },
                        boxShadow: 'none',
                        bgcolor: 'transparent',
                        '& .MuiAccordionSummary-root': {
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          '&.Mui-expanded': {
                            bgcolor: 'action.selected',
                          }
                        }
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          px: 1,
                          minHeight: 40,
                          '& .MuiAccordionSummary-content': {
                            my: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          width: '100%'
                        }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {agent.name}
                          </Typography>
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            bgcolor: '#F3F4F6',
                            borderRadius: '16px',
                            padding: '4px 12px',
                            minWidth: '80px',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="body2" sx={{ color: '#6B7280' }}>
                              {agent.tasks.length} tasks
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'grid', gap: 2 }}>
                          {agent.tasks.map((task, taskIndex) => (
                            <Box
                              key={taskIndex}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                py: 0.75,
                                px: 2,
                                '&:nth-of-type(odd)': {
                                  bgcolor: 'rgba(0, 0, 0, 0.02)'
                                }
                              }}
                            >
                              <Typography 
                                sx={{ 
                                  color: '#374151',
                                  fontWeight: 500,
                                  minWidth: '100px',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {formatTaskTime(task.timeSlot)}
                              </Typography>
                              <Typography 
                                sx={{ 
                                  color: '#6B7280',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {task.taskType}
                              </Typography>
                              {task.hasBreak && (
                                <Box 
                                  sx={{ 
                                    bgcolor: '#E5E7EB',
                                    color: '#374151',
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: '16px',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  Break
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  {(!schedule.agents || schedule.agents.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      No agents assigned
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No published schedules found for {formattedCountry}
        </Typography>
      )}
    </Box>
  );
}
