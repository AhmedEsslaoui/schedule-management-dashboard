import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Typography,
  TextField,
  IconButton,
  Step,
  StepLabel,
  Stepper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Collapse
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Publish as PublishIcon, 
  AutoFixHigh as AutoFixHighIcon, 
  Archive as ArchiveIcon, 
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import EditScheduleDialog from '../components/EditScheduleDialog';
import LoadingAnimation from '../components/LoadingAnimation';
import { isScheduleExpired } from '../utils/worldTime';
import { DatePicker, TextFieldProps } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Agent {
  id: string;
  name: string;
  timeSlots: {
    startTime: string;
    endTime: string;
    taskType: TaskType;
    hasBreak?: boolean;
  }[];
}

interface Schedule {
  id: string;
  date: string;
  timeFrame: string;
  startTime: string;
  endTime: string;
  interval: number;
  seniorName: string;
  country: string;
  agents: Agent[];
  status: 'draft' | 'published' | 'archived';
  lastStatusUpdate: Timestamp | null;
}

type TaskType = 
  | 'Chat'
  | 'Chat/Appeals+Reviews'
  | 'Appeals/Reviews'
  | 'Appeals/Reviews/Calls'
  | 'Calls'
  | 'Calls/App follow'
  | 'Chat/Emails+Groups+Calls'
  | 'All Tasks+Calls'
  | 'Appeals/Reviews/Calls/App follow'
  | 'Emails'
  | 'Kenya Calls'
  | '-'
  | 'Sick'
  | 'No Show';

const timeFrames = [
  { value: 'Day', label: 'Day (08:00 - 20:00)' },
  { value: 'Afternoon', label: 'Afternoon (12:00 - 00:00)' },
  { value: 'Night', label: 'Night (20:00 - 08:00)' }
];

const taskTypes = [
  { value: 'Chat' as TaskType, label: 'Chat' },
  { value: 'Chat/Appeals+Reviews' as TaskType, label: 'Chat/Appeals+Reviews' },
  { value: 'Appeals/Reviews' as TaskType, label: 'Appeals/Reviews' },
  { value: 'Appeals/Reviews/Calls' as TaskType, label: 'Appeals/Reviews/Calls' },
  { value: 'Calls' as TaskType, label: 'Calls' },
  { value: 'Calls/App follow' as TaskType, label: 'Calls/App follow' },
  { value: 'Chat/Emails+Groups+Calls' as TaskType, label: 'Chat/Emails+Groups+Calls' },
  { value: 'All Tasks+Calls' as TaskType, label: 'All Tasks+Calls' },
  { value: 'Appeals/Reviews/Calls/App follow' as TaskType, label: 'Appeals/Reviews/Calls/App follow' },
  { value: 'Emails' as TaskType, label: 'Emails' },
  { value: 'Kenya Calls' as TaskType, label: 'Kenya Calls' },
  { value: '-' as TaskType, label: '-' },
  { value: 'Sick' as TaskType, label: 'Sick' },
  { value: 'No Show' as TaskType, label: 'No Show' }
];

const countries = ['Egypt', 'Morocco', 'Africa'];
const steps = ['Creation Method', 'Basic Information', 'Time Configuration', 'Agent Assignment'];

const getTimeSlots = (timeFrame: string) => {
  switch (timeFrame) {
    case 'Day':
      return ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
    case 'Afternoon':
      return ['12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00', '22:00-00:00'];
    case 'Night':
      return ['20:00-22:00', '22:00-00:00', '00:00-02:00', '02:00-04:00', '04:00-06:00', '06:00-08:00'].sort((a, b) => {
        const [aStart] = a.split('-');
        const [bStart] = b.split('-');
        const aHour = parseInt(aStart);
        const bHour = parseInt(bStart);
        const adjustedA = aHour < 10 ? aHour + 24 : aHour;
        const adjustedB = bHour < 10 ? bHour + 24 : bHour;
        return adjustedA - adjustedB;
      });
    default:
      return [];
  }
};

export default function ScheduleManagement() {
  const [activeStep, setActiveStep] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('Chat');
  const [includeBreak, setIncludeBreak] = useState(false);
  const [creationMethod, setCreationMethod] = useState<'manual' | 'automatic' | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<TaskType[]>([]);
  const [autoAssignments, setAutoAssignments] = useState<Agent[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    timeFrame: '',
    startTime: '',
    endTime: '',
    interval: 2,
    seniorName: '',
    country: '',
  });
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedViewSchedule, setSelectedViewSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    // Subscribe to schedules collection
    const q = query(
      collection(db, 'schedules'),
      where('status', 'in', ['draft', 'published'])
    );

    const unsubscribeSchedules = onSnapshot(q, (snapshot) => {
      const scheduleData: Schedule[] = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw Firestore data for schedule:', doc.id, JSON.stringify(data, null, 2));
        
        const schedule = {
          id: doc.id,
          date: data.date,
          timeFrame: data.timeFrame,
          startTime: data.startTime,
          endTime: data.endTime,
          interval: data.interval,
          seniorName: data.seniorName,
          country: data.country,
          agents: data.agents?.map((agent: any) => {
            console.log('Raw agent data:', JSON.stringify(agent, null, 2));
            
            // Handle both old and new data structures
            let timeSlots: any[] = [];
            
            // New format: agent has tasks array
            if (agent.tasks && Array.isArray(agent.tasks)) {
              timeSlots = agent.tasks.map((task: any) => {
                const [startTime, endTime] = task.timeSlot.split(' - ').map(t => t.trim());
                return {
                  startTime,
                  endTime,
                  taskType: task.taskType,
                  hasBreak: task.hasBreak || false
                };
              });
            }
            // Old format: agent has timeSlots array
            else if (agent.timeSlots) {
              timeSlots = agent.timeSlots;
            } else if (agent.tasks && Array.isArray(agent.tasks)) {
              timeSlots = agent.tasks.map((task: any) => ({
                startTime: task.timeSlot.split('-')[0],
                endTime: task.timeSlot.split('-')[1],
                taskType: task.taskType,
                hasBreak: task.hasBreak
              }));
            }
            
            return {
              id: agent.id || agent.agentId,
              name: agent.name || agent.agentName,
              timeSlots
            };
          }) || [],
          status: data.status || 'draft',
          lastStatusUpdate: data.lastStatusUpdate || null
        };
        console.log('Processed schedule:', JSON.stringify(schedule, null, 2));
        return schedule;
      });

      // Check for expired schedules
      scheduleData.forEach(async (schedule) => {
        if (schedule.status === 'published') {
          // Skip schedules that were just published (within the last 10 seconds)
          const lastUpdate = schedule.lastStatusUpdate?.toDate() || new Date(0);
          const timeSinceUpdate = Date.now() - lastUpdate.getTime();
          if (timeSinceUpdate < 10000) {
            return;
          }

          const expired = await isScheduleExpired(schedule.date, schedule.timeFrame, schedule.country);
          if (expired) {
            try {
              const scheduleRef = doc(db, 'schedules', schedule.id);
              await updateDoc(scheduleRef, {
                status: 'archived'
              });
              console.log(`Auto-archived schedule ${schedule.id} as it has expired`);
            } catch (error) {
              console.error('Error auto-archiving schedule:', error);
            }
          }
        }
      });

      setSchedules(scheduleData);
      setLoading(false);
    });

    // Subscribe to employees collection
    const unsubscribeEmployees = onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const employeeData = snapshot.docs.map(doc => ({
          id: doc.id,
          fullName: doc.data().fullName,
          ...doc.data()
        }));
        console.log('Fetched employees:', employeeData);
        setEmployees(employeeData);
      }
    );

    return () => {
      unsubscribeSchedules();
      unsubscribeEmployees();
    };
  }, []);

  const sortSchedules = (schedules: Schedule[]) => {
    return [...schedules].sort((a, b) => {
      // First sort by country
      if (a.country < b.country) return -1;
      if (a.country > b.country) return 1;
      
      // Then sort by timeFrame (Day -> Afternoon -> Night)
      const timeFrameOrder = { Day: 1, Afternoon: 2, Night: 3 };
      return (timeFrameOrder[a.timeFrame as keyof typeof timeFrameOrder] || 0) - 
             (timeFrameOrder[b.timeFrame as keyof typeof timeFrameOrder] || 0);
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingAnimation variant="ring" />
      </Box>
    );
  }

  const formatTimeSlot = (hour: number, nextHour: number): string => {
    const formattedHour = hour === 24 ? '00' : hour.toString().padStart(2, '0');
    const formattedNextHour = nextHour === 24 ? '00' : nextHour.toString().padStart(2, '0');
    return `${formattedHour}:00 - ${formattedNextHour}:00`;
  };

  const generateTimeSlots = () => {
    const { start, end } = getTimeRangeForFrame(newSchedule.timeFrame);
    const interval = newSchedule.interval;
    const slots: string[] = [];
    
    let currentHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    
    while (currentHour !== endHour) {
      const startSlot = `${currentHour.toString().padStart(2, '0')}:00`;
      const nextHour = (currentHour + interval) % 24;
      const endSlot = `${nextHour.toString().padStart(2, '0')}:00`;
      slots.push(`${startSlot}-${endSlot}`);
      currentHour = nextHour;
    }
    
    // Sort slots for night shift to maintain correct order
    if (newSchedule.timeFrame === 'Night') {
      return slots.sort((a, b) => {
        const [aStart] = a.split('-');
        const [bStart] = b.split('-');
        const aHour = parseInt(aStart);
        const bHour = parseInt(bStart);
        const adjustedA = aHour < 10 ? aHour + 24 : aHour;
        const adjustedB = bHour < 10 ? bHour + 24 : bHour;
        return adjustedA - adjustedB;
      });
    }
    
    return slots;
  };

  const generateAutoSchedule = () => {
    if (!selectedDate || !newSchedule.timeFrame) {
      console.error('Missing date or timeFrame');
      return null;
    }

    console.log('Starting auto schedule generation with:', {
      selectedAgents,
      selectedTasks,
      timeFrame: newSchedule.timeFrame,
      interval: newSchedule.interval
    });

    const timeSlots = generateTimeSlots();
    if (timeSlots.length === 0) {
      console.error('No time slots generated');
      return null;
    }

    const assignments: Agent[] = [];
    
    // Initialize assignments array with empty tasks for each agent
    selectedAgents.forEach(agentId => {
      const employee = employees.find(e => e.id === agentId);
      if (employee) {
        assignments.push({
          id: agentId,
          name: employee.fullName,
          timeSlots: []
        });
      }
    });

    // For each time slot, rotate agents and tasks
    timeSlots.forEach((timeSlot, slotIndex) => {
      selectedAgents.forEach((agentId, agentPosition) => {
        const employee = employees.find(e => e.id === agentId);
        if (!employee) return;

        // Calculate task index for this agent in this time slot
        // This creates a rotation of tasks for each agent
        const taskIndex = (slotIndex + agentPosition) % selectedTasks.length;
        const taskType = selectedTasks[taskIndex];

        // Find the agent in our assignments array and add the task
        const agentAssignment = assignments.find(a => a.id === agentId);
        if (agentAssignment) {
          agentAssignment.timeSlots.push({
            startTime: timeSlot.split(' - ')[0],
            endTime: timeSlot.split(' - ')[1],
            taskType
          });
        }
      });
    });

    console.log('Generated assignments:', assignments);
    return assignments;
  };

  const handleNext = () => {
    if (activeStep === 0 && !creationMethod) {
      alert('Please select a creation method');
      return;
    }

    if (activeStep === 1 && !selectedDate) {
      alert('Please select a date');
      return;
    }

    if (activeStep === 2 && !newSchedule.timeFrame) {
      alert('Please select a time frame');
      return;
    }

    // Validate automatic mode requirements before final step
    if (creationMethod === 'automatic' && activeStep === 3) {
      if (selectedAgents.length === 0) {
        alert('Please select at least one agent');
        return;
      }
      if (selectedTasks.length === 0) {
        alert('Please select at least one task');
        return;
      }
      
      console.log('Validating automatic schedule generation');
      const generatedAssignments = generateAutoSchedule();
      if (generatedAssignments) {
        setAutoAssignments(generatedAssignments);
        setAgents(generatedAssignments);
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClickOpen = () => {
    setOpen(true);
    setActiveStep(0);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveStep(0);
    setSelectedDate(null);
    setAgents([]);
    setSelectedAgent('');
    setSelectedTimeSlot('');
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
    setCreationMethod(null);
    setSelectedAgents([]);
    setSelectedTasks([]);
    setAutoAssignments([]);
    setNewSchedule({
      timeFrame: '',
      startTime: '',
      endTime: '',
      interval: 2,
      seniorName: '',
      country: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSchedule((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getTimeRangeForFrame = (timeFrame: string): { start: string; end: string } => {
    switch (timeFrame) {
      case 'Day':
        return { start: '08:00', end: '20:00' };
      case 'Afternoon':
        return { start: '12:00', end: '00:00' };
      case 'Night':
        return { start: '20:00', end: '08:00' };
      default:
        return { start: '08:00', end: '20:00' };
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedDate) return;

    console.log('Creating schedule with method:', creationMethod);

    let finalAgents: Agent[] = [];
    
    if (creationMethod === 'automatic') {
      console.log('Generating automatic schedule before save');
      const generatedAssignments = generateAutoSchedule();
      if (!generatedAssignments) {
        console.error('Failed to generate assignments');
        return;
      }
      finalAgents = generatedAssignments;
    } else {
      finalAgents = agents;
    }

    console.log('Final agents for schedule:', finalAgents);

    try {
      const scheduleData = {
        date: selectedDate.toISOString(),
        ...newSchedule,
        agents: finalAgents,
        status: 'draft',
      };
      console.log('Saving schedule data:', scheduleData);

      const scheduleRef = await addDoc(collection(db, 'schedules'), scheduleData);

      // Update assignedSchedules for each agent
      for (const agent of finalAgents) {
        const employeeDoc = doc(db, 'employees', agent.id);
        await updateDoc(employeeDoc, {
          assignedSchedules: arrayUnion(scheduleRef.id)
        });
      }

      handleClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handlePublishSchedule = async (scheduleId: string) => {
    try {
      await updateDoc(doc(db, 'schedules', scheduleId), {
        status: 'published',
        lastStatusUpdate: Timestamp.now()
      });
    } catch (error) {
      console.error('Error publishing schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule?.agents) {
        // Remove schedule from all assigned agents
        for (const agent of schedule.agents) {
          const employeeDoc = doc(db, 'employees', agent.id);
          await updateDoc(employeeDoc, {
            assignedSchedules: arrayRemove(scheduleId)
          });
        }
      }

      await deleteDoc(doc(db, 'schedules', scheduleId));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleArchiveSchedule = async (schedule: Schedule) => {
    try {
      const scheduleRef = doc(db, 'schedules', schedule.id);
      await updateDoc(scheduleRef, {
        status: 'archived'
      });
    } catch (error) {
      console.error('Error archiving schedule:', error);
    }
  };

  const handleViewSchedule = (schedule: Schedule) => {
    console.log('Opening edit dialog for schedule:', schedule);
    setViewingSchedule(schedule);
  };

  const handleCloseViewDialog = () => {
    setViewingSchedule(null);
  };

  const handleViewDetails = (schedule: Schedule) => {
    setSelectedViewSchedule(schedule);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedViewSchedule(null);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Select Creation Method
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: creationMethod === 'manual' ? 2 : 1,
                      borderColor: creationMethod === 'manual' ? 'primary.main' : 'grey.300',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => handleCreationMethodSelect('manual')}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <EditIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                      <Typography variant="h6" gutterBottom>
                        Manual Creation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create schedule manually by selecting time slots and assigning tasks to agents
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: creationMethod === 'automatic' ? 2 : 1,
                      borderColor: creationMethod === 'automatic' ? 'primary.main' : 'grey.300',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => handleCreationMethodSelect('automatic')}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <AutoFixHighIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                      <Typography variant="h6" gutterBottom>
                        Automatic Creation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Let the system automatically generate an optimized schedule (Beta Testing)
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                sx={{ width: '100%', mb: 2 }}
                slots={{
                  textField: (params: TextFieldProps) => <TextField {...params} />
                }}
              />
            </LocalizationProvider>
            <TextField
              margin="dense"
              name="seniorName"
              label="Senior in Charge"
              fullWidth
              value={newSchedule.seniorName}
              onChange={handleInputChange}
              sx={{ mt: 2 }}
            />
            <TextField
              margin="dense"
              name="country"
              label="Country"
              select
              fullWidth
              value={newSchedule.country}
              onChange={handleInputChange}
              sx={{ mt: 2 }}
            >
              {countries.map((country) => (
                <MenuItem key={country} value={country}>
                  {country}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Time Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Frame</InputLabel>
                    <Select
                      value={newSchedule.timeFrame}
                      onChange={(e) => {
                        const selectedFrame = e.target.value;
                        const { start, end } = getTimeRangeForFrame(selectedFrame);
                        setNewSchedule(prev => ({
                          ...prev,
                          timeFrame: selectedFrame,
                          startTime: start,
                          endTime: end
                        }));
                      }}
                      label="Time Frame"
                    >
                      {timeFrames.map(frame => (
                        <MenuItem key={frame.value} value={frame.value}>
                          {frame.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Interval (hours)</InputLabel>
                    <Select
                      value={newSchedule.interval}
                      onChange={(e) => setNewSchedule(prev => ({
                        ...prev,
                        interval: Number(e.target.value)
                      }))}
                      label="Interval (hours)"
                    >
                      <MenuItem value={2}>2 Hours</MenuItem>
                      <MenuItem value={3}>3 Hours</MenuItem>
                      <MenuItem value={4}>4 Hours</MenuItem>
                      <MenuItem value={6}>6 Hours</MenuItem>
                      <MenuItem value={8}>8 Hours</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      case 3:
        if (creationMethod === 'automatic') {
          return (
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Automatic Assignment Configuration
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Select Agents</Typography>
                    <Autocomplete
                      multiple
                      size="small"
                      options={employees}
                      getOptionLabel={(option) => option.fullName}
                      value={employees.filter(emp => selectedAgents.includes(emp.id))}
                      onChange={(_, newValue) => {
                        setSelectedAgents(newValue.map(v => v.id));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search and Select Agents"
                          variant="outlined"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Select Tasks</Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedTasks.includes('Chat')}
                          onChange={(e) => {
                            setSelectedTasks(e.target.checked ? ['Chat'] : []);
                          }}
                        />
                      }
                      label="Chat"
                    />
                  </Grid>
                </Grid>

              </Paper>

              {autoAssignments.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Generated Assignments
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Agent</TableCell>
                          <TableCell>Time Slot</TableCell>
                          <TableCell>Task</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {autoAssignments.map(agent => 
                          agent.timeSlots.map((timeSlot, index) => (
                            <TableRow key={`${agent.id}-${index}`}>
                              <TableCell>{agent.name}</TableCell>
                              <TableCell>{timeSlot.startTime} - {timeSlot.endTime}</TableCell>
                              <TableCell>{timeSlot.taskType}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          );
        } else {
          return (
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Agent Task Assignment
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
                    <Autocomplete
                      size="small"
                      options={employees}
                      getOptionLabel={(option) => option.fullName}
                      value={employees.find(emp => emp.id === selectedAgent) || null}
                      onChange={(_, newValue) => {
                        setSelectedAgent(newValue ? newValue.id : '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search and Select Agent"
                          variant="outlined"
                        />
                      )}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Time Slot</InputLabel>
                      <Select
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        label="Time Slot"
                      >
                        {generateTimeSlots().map(slot => {
                          const currentAgent = agents.find(a => a.id === selectedAgent);
                          const isSlotTakenByCurrentAgent = currentAgent?.timeSlots.some(t => t.startTime === slot.split('-')[0] && t.endTime === slot.split('-')[1]);
                          
                          return (
                            <MenuItem 
                              key={slot} 
                              value={slot}
                              disabled={isSlotTakenByCurrentAgent}
                            >
                              {slot}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Task Type</InputLabel>
                      <Select
                        value={selectedTaskType}
                        onChange={(e) => setSelectedTaskType(e.target.value as TaskType)}
                        label="Task Type"
                      >
                        {taskTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeBreak}
                          onChange={(e) => setIncludeBreak(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Include Break"
                      sx={{ m: 0 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={1}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleAddTask}
                      disabled={!selectedAgent || !selectedTimeSlot || !selectedTaskType}
                    >
                      Assign
                    </Button>
                  </Grid>

                  <Grid item xs={12} sm={12}>
                    <Typography variant="body2" color="text.secondary">
                      Note: Ensure correct time slot format (HH:MM - HH:MM)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Assignments Table */}
              {agents.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Assigned Tasks
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Agent</TableCell>
                          {generateTimeSlots().map((slot) => (
                            <TableCell key={slot} align="center" sx={{ fontWeight: 'bold' }}>
                              {slot}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell sx={{ fontWeight: 500 }}>{agent.name}</TableCell>
                            {generateTimeSlots().map((timeSlot) => {
                              const task = agent.timeSlots.find(t => t.startTime === timeSlot.split('-')[0] && t.endTime === timeSlot.split('-')[1]);
                              return (
                                <TableCell key={timeSlot} align="center" sx={{ 
                                  backgroundColor: task ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                  border: task ? '1px solid rgba(224, 224, 224, 1)' : undefined
                                }}>
                                  {task ? (
                                    <Box>
                                      <Typography variant="body2">
                                        {task.taskType}
                                      </Typography>
                                      {task.hasBreak && (
                                        <Chip 
                                          label="Break" 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                          sx={{ mt: 0.5, minWidth: '70px' }}
                                        />
                                      )}
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemoveTask(agent.id, agent.timeSlots.findIndex(handleTaskComparison))}
                                        sx={{ ml: 1 }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  ) : '-'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </Box>
          );
        }
      default:
        return 'Unknown step';
    }
  };

  const handleAddTask = () => {
    if (!selectedAgent || !selectedTimeSlot || !selectedTaskType) return;

    setAgents(prev => prev.map(agent => {
      if (agent.id === selectedAgent) {
        // Check if a task already exists for this time slot
        const existingTaskIndex = agent.timeSlots.findIndex(t => t.startTime === selectedTimeSlot.split('-')[0] && t.endTime === selectedTimeSlot.split('-')[1]);
        if (existingTaskIndex !== -1) {
          // Update existing task
          const updatedTasks = [...agent.timeSlots];
          updatedTasks[existingTaskIndex] = {
            startTime: selectedTimeSlot.split('-')[0],
            endTime: selectedTimeSlot.split('-')[1],
            taskType: selectedTaskType,
            hasBreak: includeBreak
          };
          return { ...agent, timeSlots: updatedTasks };
        } else {
          // Add new task
          return {
            ...agent,
            timeSlots: [
              ...agent.timeSlots,
              {
                startTime: selectedTimeSlot.split('-')[0],
                endTime: selectedTimeSlot.split('-')[1],
                taskType: selectedTaskType,
                hasBreak: includeBreak
              }
            ]
          };
        }
      }
      return agent;
    }));

    // Clear selections
    setSelectedTimeSlot('');
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
  };

  const selectNextTimeSlot = (currentSlot: string) => {
    const timeSlots = generateTimeSlots();
    const currentIndex = timeSlots.findIndex(slot => slot === currentSlot);
    if (currentIndex !== -1 && currentIndex < timeSlots.length - 1) {
      return timeSlots[currentIndex + 1];
    }
    return '';
  };

  const handleCreationMethodSelect = (method: 'manual' | 'automatic') => {
    setCreationMethod(method);
    setSelectedDate(new Date()); // Set today's date when selecting creation method
  };

  const handleToggleSchedule = (scheduleId: string) => {
    setExpandedSchedules(prev => {
      if (prev.includes(scheduleId)) {
        return prev.filter(id => id !== scheduleId);
      }
      if (prev.length >= 2) {
        return [prev[1], scheduleId];
      }
      return [...prev, scheduleId];
    });
  };

  const sortTimeSlots = (timeSlots: any[]) => {
    return timeSlots.sort((a, b) => {
      // Convert time to comparable numbers (e.g., "20:00" -> 2000, "00:00" -> 0)
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      // Adjust times after midnight to be larger than evening times
      const adjustedATime = aTime < 1000 ? aTime + 2400 : aTime;
      const adjustedBTime = bTime < 1000 ? bTime + 2400 : bTime;
      return adjustedATime - adjustedBTime;
    });
  };

  const handleTaskComparison = (t: { startTime: string; endTime: string }) => {
    return t.startTime === selectedTimeSlot.split('-')[0] && t.endTime === selectedTimeSlot.split('-')[1];
  };

  const handleRemoveTask = (agentId: string, taskIndex: number) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        const updatedTasks = [...agent.timeSlots];
        updatedTasks.splice(taskIndex, 1);
        return { ...agent, timeSlots: updatedTasks };
      }
      return agent;
    }));
  };

  const renderAgentSchedule = (agent: any) => {
    const sortedTimeSlots = [...(agent.timeSlots || [])].sort((a, b) => {
      // Convert times to comparable numbers (e.g., "08:00" -> 800)
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      // For night shift, adjust times after midnight to be larger than evening times
      const adjustedATime = selectedViewSchedule?.timeFrame === 'Night' && aTime < 1000 ? aTime + 2400 : aTime;
      const adjustedBTime = selectedViewSchedule?.timeFrame === 'Night' && bTime < 1000 ? bTime + 2400 : bTime;
      return adjustedATime - adjustedBTime;
    });

    return (
      <Box key={agent.id} sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 2 }}>
          {agent.name}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time Slot</TableCell>
                <TableCell>Task</TableCell>
                <TableCell align="right">Break</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTimeSlots.map((slot: any) => (
                <TableRow key={slot.startTime}>
                  <TableCell>{slot.startTime} - {slot.endTime}</TableCell>
                  <TableCell>{slot.taskType}</TableCell>
                  <TableCell align="right">
                    {slot.hasBreak && (
                      <Chip 
                        label="Break" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ mt: 0.5, minWidth: '70px' }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Schedule Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Create Schedule
        </Button>
      </Box>

      {/* Schedules Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time Frame</TableCell>
              <TableCell>Senior</TableCell>
              <TableCell>Country</TableCell>
              <TableCell align="right">Agents</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortSchedules(schedules).map((schedule) => (
              <React.Fragment key={schedule.id}>
                <TableRow
                  sx={{
                    '& > *': { borderBottom: 'unset' },
                    cursor: 'pointer',
                    backgroundColor: expandedSchedules.includes(schedule.id) ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: expandedSchedules.includes(schedule.id) ? 'action.selected' : 'action.hover',
                    },
                  }}
                  onClick={() => handleToggleSchedule(schedule.id)}
                >
                  <TableCell>{new Date(schedule.date).toLocaleDateString()}</TableCell>
                  <TableCell>{schedule.timeFrame}</TableCell>
                  <TableCell>{schedule.seniorName}</TableCell>
                  <TableCell>{schedule.country}</TableCell>
                  <TableCell align="right">{schedule.agents?.length || 0}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          backgroundColor: schedule.status === 'published' ? 'success.main' : schedule.status === 'archived' ? 'error.main' : 'warning.main',
                          color: 'white',
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          mr: 2,
                          fontSize: '0.875rem'
                        }}
                      >
                        {schedule.status}
                      </Box>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(schedule);
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSchedule(schedule);
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      {schedule.status === 'draft' && (
                        <IconButton
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublishSchedule(schedule.id);
                          }}
                          size="small"
                          sx={{ mr: 1 }}
                        >
                          <PublishIcon />
                        </IconButton>
                      )}
                      <IconButton
                        color="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveSchedule(schedule);
                        }}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <ArchiveIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSchedule(schedule.id);
                        }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={expandedSchedules.includes(schedule.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 1 }}>
                        {console.log('Schedule being expanded:', schedule)}
                        {console.log('Schedule agents:', schedule.agents)}
                        {console.log('Time slots:', getTimeSlots(schedule.timeFrame))}
                        <Typography variant="subtitle1" gutterBottom component="div">
                          Schedule Details
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Agent</TableCell>
                                {getTimeSlots(schedule.timeFrame).map((slot) => (
                                  <TableCell key={slot} align="center" sx={{ fontWeight: 'bold', minWidth: '150px' }}>
                                    {slot}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {schedule.agents?.map((agent) => (
                                <TableRow key={agent.id}>
                                  {console.log('Processing agent:', agent.name, 'TimeSlots:', JSON.stringify(agent.timeSlots, null, 2))}
                                  <TableCell sx={{ fontWeight: 500 }}>{agent.name}</TableCell>
                                  {getTimeSlots(schedule.timeFrame).map((timeSlot) => {
                                    const [slotStart, slotEnd] = timeSlot.split('-');
                                    console.log(`Looking for time slot ${timeSlot} in agent ${agent.name}'s timeSlots:`, JSON.stringify(agent.timeSlots, null, 2));
                                    
                                    // Convert times to comparable numbers (e.g., "08:00" -> 800)
                                    const slotStartNum = parseInt(slotStart.replace(':', ''));
                                    const slotEndNum = parseInt(slotEnd.replace(':', ''));
                                    
                                    const task = agent.timeSlots?.find(t => {
                                      const taskStartNum = parseInt(t.startTime.replace(':', ''));
                                      const taskEndNum = parseInt(t.endTime.replace(':', ''));
                                      
                                      // For night shift, adjust times after midnight
                                      const adjustedTaskStartNum = schedule.timeFrame === 'Night' && taskStartNum < 1000 ? taskStartNum + 2400 : taskStartNum;
                                      const adjustedTaskEndNum = schedule.timeFrame === 'Night' && taskEndNum < 1000 ? taskEndNum + 2400 : taskEndNum;
                                      const adjustedSlotStartNum = schedule.timeFrame === 'Night' && slotStartNum < 1000 ? slotStartNum + 2400 : slotStartNum;
                                      const adjustedSlotEndNum = schedule.timeFrame === 'Night' && slotEndNum < 1000 ? slotEndNum + 2400 : slotEndNum;
                                      
                                      console.log(`Comparing slot times:
                                        Display Slot: ${slotStart}-${slotEnd} (${adjustedSlotStartNum}-${adjustedSlotEndNum})
                                        Task Slot: ${t.startTime}-${t.endTime} (${adjustedTaskStartNum}-${adjustedTaskEndNum})`);
                                      
                                      // Check if the time ranges overlap
                                      const overlap = (
                                        // Task starts during the slot
                                        (adjustedTaskStartNum >= adjustedSlotStartNum && adjustedTaskStartNum < adjustedSlotEndNum) ||
                                        // Task ends during the slot
                                        (adjustedTaskEndNum > adjustedSlotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
                                        // Task completely contains the slot
                                        (adjustedTaskStartNum <= adjustedSlotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
                                      );
                                      
                                      console.log(`Overlap result: ${overlap}`);
                                      return overlap;
                                    });

                                    return (
                                      <TableCell key={timeSlot} align="center" sx={{ 
                                        backgroundColor: task ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                        border: task ? '1px solid rgba(224, 224, 224, 1)' : undefined
                                      }}>
                                        {task ? (
                                          <Box>
                                            <Typography variant="body2">
                                              {task.taskType}
                                            </Typography>
                                            {task.hasBreak && (
                                              <Chip 
                                                label="Break" 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                                sx={{ mt: 0.5, minWidth: '70px' }}
                                              />
                                            )}
                                          </Box>
                                        ) : '-'}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Schedule Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Schedule</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {getStepContent(activeStep)}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>Back</Button>
          )}
          {activeStep === steps.length - 1 ? (
            <Button onClick={handleCreateSchedule} variant="contained">
              Create Schedule
            </Button>
          ) : (
            <Button onClick={handleNext} variant="contained">
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View/Edit Schedule Dialog */}
      {viewingSchedule && (
        <EditScheduleDialog
          open={true}
          onClose={handleCloseViewDialog}
          schedule={viewingSchedule}
          employees={employees}
          onUpdate={() => {
            // Refresh the schedules list
            const q = query(
              collection(db, 'schedules'),
              where('status', 'in', ['draft', 'published'])
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const scheduleData: Schedule[] = snapshot.docs.map(doc => ({
                id: doc.id,
                date: doc.data().date,
                timeFrame: doc.data().timeFrame,
                startTime: doc.data().startTime,
                endTime: doc.data().endTime,
                interval: doc.data().interval,
                seniorName: doc.data().seniorName,
                country: doc.data().country,
                agents: doc.data().agents || [],
                status: doc.data().status || 'draft',
                lastStatusUpdate: doc.data().lastStatusUpdate || null
              }));
              setSchedules(scheduleData);
            });
            return () => unsubscribe();
          }}
        />
      )}

      {/* View Schedule Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Schedule Details
          <IconButton
            onClick={handleCloseDetails}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedViewSchedule && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Date</Typography>
                  <Typography>{new Date(selectedViewSchedule.date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Time Frame</Typography>
                  <Typography>{selectedViewSchedule.timeFrame}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Senior</Typography>
                  <Typography>{selectedViewSchedule.seniorName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Country</Typography>
                  <Typography>{selectedViewSchedule.country}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>Assignments</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Agent</TableCell>
                      {selectedViewSchedule.agents[0]?.timeSlots.sort((a, b) => {
                        const aTime = parseInt(a.startTime.replace(':', ''));
                        const bTime = parseInt(b.startTime.replace(':', ''));
                        const adjustedATime = selectedViewSchedule.timeFrame === 'Night' && aTime < 1000 ? aTime + 2400 : aTime;
                        const adjustedBTime = selectedViewSchedule.timeFrame === 'Night' && bTime < 1000 ? bTime + 2400 : bTime;
                        return adjustedATime - adjustedBTime;
                      }).map(task => (
                        <TableCell key={task.startTime} align="center" sx={{ fontWeight: 'bold' }}>
                          {task.startTime} - {task.endTime}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedViewSchedule.agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{agent.name}</TableCell>
                        {agent.timeSlots.sort((a, b) => {
                          const aTime = parseInt(a.startTime.replace(':', ''));
                          const bTime = parseInt(b.startTime.replace(':', ''));
                          const adjustedATime = selectedViewSchedule.timeFrame === 'Night' && aTime < 1000 ? aTime + 2400 : aTime;
                          const adjustedBTime = selectedViewSchedule.timeFrame === 'Night' && bTime < 1000 ? bTime + 2400 : bTime;
                          return adjustedATime - adjustedBTime;
                        }).map((task, index) => (
                          <TableCell key={`${task.startTime}-${index}`} align="center">
                            <Box>
                              <Typography variant="body2">
                                {task.taskType}
                              </Typography>
                              {task.hasBreak && (
                                <Chip 
                                  label="Break" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ mt: 0.5, minWidth: '70px' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
