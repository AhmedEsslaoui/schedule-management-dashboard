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
  | 'Reviews +Kenya'
  | 'Chat + kenya'
  | 'Emails + Kenya'
  | '-'
  | 'Sick'
  | 'No Show';

const timeFrames = [
  { value: 'Day', label: 'Day (08:00 - 20:00)' },
  { value: 'Afternoon', label: 'Afternoon (14:00 - 02:00)' },
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
  { value: 'Reviews +Kenya' as TaskType, label: 'Reviews +Kenya' },
  { value: 'Chat + kenya' as TaskType, label: 'Chat + kenya' },
  { value: 'Emails + Kenya' as TaskType, label: 'Emails + Kenya' },
  { value: '-' as TaskType, label: '-' },
  { value: 'Sick' as TaskType, label: 'Sick' },
  { value: 'No Show' as TaskType, label: 'No Show' }
];

const countries = ['Egypt', 'Morocco', 'Africa'];
const steps = ['Creation Method', 'Basic Information', 'Time Configuration', 'Agent Assignment'];

const getTimeSlots = (timeFrame: string, interval: number = 2) => {
  const formatSlot = (start: number, end: number) => {
    const startStr = (start === 24 ? '00' : start.toString().padStart(2, '0'));
    const endStr = (end === 24 ? '00' : end.toString().padStart(2, '0'));
    return `${startStr}:00-${endStr}:00`;
  };

  const generateSlots = (start: number, end: number) => {
    const slots: string[] = [];
    let current = start;
    
    while (current < end) {
      const next = Math.min(current + interval, end);
      slots.push(formatSlot(current, next));
      current += interval;
    }
    
    return slots;
  };

  switch (timeFrame) {
    case 'Day':
      return generateSlots(8, 20);
    case 'Afternoon':
      // For afternoon shift (14:00-02:00), handle the day change
      if (interval === 3) {
        return ['14:00-17:00', '17:00-20:00', '20:00-23:00', '23:00-02:00'];
      } else {
        return ['14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00', '22:00-00:00', '00:00-02:00'];
      }
    case 'Night':
      // Night shift remains special case due to day change
      if (interval === 3) {
        return ['20:00-23:00', '23:00-02:00', '02:00-05:00', '05:00-08:00'];
      } else {
        return ['20:00-22:00', '22:00-00:00', '00:00-02:00', '02:00-04:00', '04:00-06:00', '06:00-08:00'];
      }
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
            else if (agent.timeSlots && Array.isArray(agent.timeSlots)) {
              timeSlots = agent.timeSlots.map((slot: any) => ({
                startTime: slot.startTime?.trim(),
                endTime: slot.endTime?.trim(),
                taskType: slot.taskType,
                hasBreak: slot.hasBreak || false
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
            } catch (error) {
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
        setEmployees(employeeData);
      }
    );

    return () => {
      unsubscribeSchedules();
      unsubscribeEmployees();
    };
  }, []);

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
    const slots: string[] = [];
    let hour = parseInt(start.split(':')[0]);
    const interval = newSchedule.interval || 2;

    if (newSchedule.timeFrame === 'Night') {
      // Special handling for night shift
      const nightSlots = [
        '20:00 - 23:00',
        '23:00 - 02:00',
        '02:00 - 05:00',
        '05:00 - 08:00'
      ];
      return nightSlots;
    }

    if (newSchedule.timeFrame === 'Afternoon') {
      // Special handling for afternoon shift with 3-hour intervals
      const afternoonSlots = [];
      let currentHour = 14; // Start at 14:00
      
      // Handle hours from 14:00 to midnight
      while (currentHour < 24) {
        const nextHour = Math.min(currentHour + interval, 24);
        afternoonSlots.push(formatTimeSlot(currentHour, nextHour));
        currentHour += interval;
      }

      // Handle hours after midnight up to 02:00
      currentHour = 0;
      while (currentHour < 2) {
        const nextHour = Math.min(currentHour + interval, 2);
        afternoonSlots.push(formatTimeSlot(currentHour, nextHour));
        currentHour += interval;
      }
      
      return afternoonSlots;
    }

    // Handle other shifts
    if (end <= start) {
      while (hour < 24) {
        const nextHour = (hour + interval) <= 24 ? hour + interval : 0;
        slots.push(formatTimeSlot(hour, nextHour));
        hour += interval;
      }
      hour = 0;
    }

    while (hour < parseInt(end.split(':')[0])) {
      const nextHour = Math.min(hour + interval, parseInt(end.split(':')[0]));
      slots.push(formatTimeSlot(hour, nextHour));
      if (nextHour === parseInt(end.split(':')[0])) {
        break;
      }
      hour += interval;
    }

    return slots;
  };

  const generateAutoSchedule = () => {
    if (!selectedDate || !newSchedule.timeFrame) {
      return null;
    }

    const timeSlots = getTimeSlots(newSchedule.timeFrame, newSchedule.interval);
    if (timeSlots.length === 0) {
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
          const [startTime, endTime] = timeSlot.split('-').map(t => t.trim());
          agentAssignment.timeSlots.push({
            startTime,
            endTime,
            taskType
          });
        }
      });
    });

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
        return { start: '14:00', end: '02:00' };
      case 'Night':
        return { start: '20:00', end: '08:00' };
      default:
        return { start: '08:00', end: '20:00' };
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedDate || !newSchedule.timeFrame || !newSchedule.seniorName || !newSchedule.country) {
      alert('Please fill in all required fields');
      return;
    }

    // For manual creation, validate that there are agents with tasks
    if (creationMethod === 'manual' && (!agents.length || !agents.some(agent => agent.timeSlots.length > 0))) {
      alert('Please assign at least one task to an agent');
      return;
    }

    let finalAgents: Agent[] = [];
    
    if (creationMethod === 'automatic') {
      const generatedAssignments = generateAutoSchedule();
      if (!generatedAssignments || generatedAssignments.length === 0) {
        alert('Failed to generate automatic schedule. Please try again or use manual creation.');
        return;
      }
      finalAgents = generatedAssignments;
    } else {
      finalAgents = agents;
    }

    try {
      const { start, end } = getTimeRangeForFrame(newSchedule.timeFrame);
      const scheduleData = {
        date: selectedDate.toISOString(),
        timeFrame: newSchedule.timeFrame,
        startTime: start,
        endTime: end,
        interval: newSchedule.interval || 2,
        seniorName: newSchedule.seniorName,
        country: newSchedule.country,
        agents: finalAgents,
        status: 'draft',
        lastStatusUpdate: null
      };

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
      alert('Failed to create schedule. Please try again.');
    }
  };

  const handlePublishSchedule = async (scheduleId: string) => {
    try {
      await updateDoc(doc(db, 'schedules', scheduleId), {
        status: 'published',
        lastStatusUpdate: Timestamp.now()
      });
    } catch (error) {
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
    }
  };

  const handleArchiveSchedule = async (schedule: Schedule) => {
    try {
      const scheduleRef = doc(db, 'schedules', schedule.id);
      await updateDoc(scheduleRef, {
        status: 'archived'
      });
    } catch (error) {
    }
  };

  const handleViewSchedule = (schedule: Schedule) => {
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
                          id="task-chat-checkbox"
                          checked={selectedTasks.includes('Chat')}
                          onChange={(e) => {
                            setSelectedTasks(e.target.checked ? ['Chat'] : []);
                          }}
                        />
                      }
                      label="Chat"
                      htmlFor="task-chat-checkbox"
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
                        {getTimeSlots(newSchedule.timeFrame, newSchedule.interval).map(slot => {
                          // Only check time slots for the currently selected agent
                          const currentAgent = agents.find(a => a.id === selectedAgent);
                          const isSlotTaken = currentAgent?.timeSlots.some(t => {
                            // Convert times to comparable numbers
                            const taskStartNum = parseInt(t.startTime.replace(':', ''));
                            const taskEndNum = parseInt(t.endTime.replace(':', ''));
                            const slotStartNum = parseInt(slot.split('-')[0].replace(':', ''));
                            const slotEndNum = parseInt(slot.split('-')[1].replace(':', ''));

                            // For exact matching
                            if (t.startTime === slot.split('-')[0] && t.endTime === slot.split('-')[1]) {
                              return true;
                            }

                            // For night shift, adjust numbers for comparison
                            if (newSchedule.timeFrame === 'Night') {
                              // Adjust end times after midnight
                              const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
                              const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
                              
                              // Check if the slots overlap
                              return (
                                // Check if task starts during the slot
                                (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
                                // Check if task ends during the slot
                                (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
                                // Check if task completely contains the slot
                                (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
                              );
                            }

                            // For day and afternoon shifts, use exact matching only
                            return false;
                          });
                          return (
                            <MenuItem 
                              key={slot} 
                              value={slot}
                              disabled={isSlotTaken}
                              sx={{
                                '&.Mui-disabled': {
                                  opacity: 0.7,
                                  backgroundColor: 'rgba(0, 0, 0, 0.05)'
                                }
                              }}
                            >
                              {slot}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
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
                          id="task-break-checkbox"
                          checked={includeBreak}
                          onChange={(e) => setIncludeBreak(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Include Break"
                      htmlFor="task-break-checkbox"
                      sx={{ m: 0 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      fullWidth
                      onClick={handleAddTask}
                      disabled={!selectedAgent || !selectedTimeSlot || !selectedTaskType}
                    >
                      Assign
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Assignments Table */}
              {agents.length > 0 && (
                <Paper sx={{ p: 2, mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Assigned Tasks
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Agent</TableCell>
                          {getTimeSlots(newSchedule.timeFrame, newSchedule.interval).map((slot) => (
                            <TableCell key={slot} align="center">
                              {slot}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell component="th" scope="row">
                              {agent.name}
                            </TableCell>
                            {getTimeSlots(newSchedule.timeFrame, newSchedule.interval).map((slot) => {
                              const [slotStart, slotEnd] = slot.split('-');
                              const task = agent.timeSlots.find(t => {
                                // Convert times to comparable numbers
                                const taskStartNum = parseInt(t.startTime.replace(':', ''));
                                const taskEndNum = parseInt(t.endTime.replace(':', ''));
                                const slotStartNum = parseInt(slotStart.replace(':', ''));
                                const slotEndNum = parseInt(slotEnd.replace(':', ''));

                                // For exact matching
                                if (t.startTime === slotStart && t.endTime === slotEnd) {
                                  return true;
                                }

                                // For night shift, adjust numbers for comparison
                                if (newSchedule.timeFrame === 'Night') {
                                  // Adjust end times after midnight
                                  const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
                                  const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
                                  
                                  // Check if the slots overlap
                                  return (
                                    // Check if task starts during the slot
                                    (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
                                    // Check if task ends during the slot
                                    (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
                                    // Check if task completely contains the slot
                                    (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
                                  );
                                }

                                // For day and afternoon shifts, use exact matching only
                                return false;
                              });
                              return (
                                <TableCell key={slot} align="center" sx={{
                                  backgroundColor: task ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                  border: task ? '1px solid rgba(224, 224, 224, 1)' : undefined
                                }}>
                                  {task && (
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
                                  )}
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

  const selectNextAvailableTimeSlot = (currentSlot: string) => {
    const allSlots = getTimeSlots(newSchedule.timeFrame, newSchedule.interval);
    const currentIndex = allSlots.findIndex(slot => slot === currentSlot);
    
    if (currentIndex === -1 || currentIndex === allSlots.length - 1) {
      return ''; // No next slot available
    }

    // Find the next slot that isn't taken by the current agent
    for (let i = currentIndex + 1; i < allSlots.length; i++) {
      const slot = allSlots[i];
      const currentAgent = agents.find(a => a.id === selectedAgent);
      const isSlotTaken = currentAgent?.timeSlots.some(t => {
        // Convert times to comparable numbers
        const taskStartNum = parseInt(t.startTime.replace(':', ''));
        const taskEndNum = parseInt(t.endTime.replace(':', ''));
        const slotStartNum = parseInt(slot.split('-')[0].replace(':', ''));
        const slotEndNum = parseInt(slot.split('-')[1].replace(':', ''));

        // For exact matching
        if (t.startTime === slot.split('-')[0] && t.endTime === slot.split('-')[1]) {
          return true;
        }

        // For night shift, adjust numbers for comparison
        if (newSchedule.timeFrame === 'Night') {
          // Adjust end times after midnight
          const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
          const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
          
          // Check if the slots overlap
          return (
            // Check if task starts during the slot
            (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
            // Check if task ends during the slot
            (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
            // Check if task completely contains the slot
            (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
          );
        }

        // For day and afternoon shifts, use exact matching only
        return false;
      });

      if (!isSlotTaken) {
        return slot;
      }
    }

    return ''; // No available slots found
  };

  const handleAddTask = () => {
    if (!selectedAgent || !selectedTimeSlot || !selectedTaskType) return;

    const [startTime, endTime] = selectedTimeSlot.split('-').map(t => t.trim());
    
    setAgents(prevAgents => {
      const updatedAgents = [...prevAgents];
      const agentIndex = updatedAgents.findIndex(a => a.id === selectedAgent);
      
      // Check if agent already has a task in this time slot
      const hasConflict = agentIndex !== -1 && updatedAgents[agentIndex].timeSlots.some(slot => {
        // Convert times to comparable numbers
        const taskStartNum = parseInt(slot.startTime.replace(':', ''));
        const taskEndNum = parseInt(slot.endTime.replace(':', ''));
        const slotStartNum = parseInt(startTime.replace(':', ''));
        const slotEndNum = parseInt(endTime.replace(':', ''));

        // For exact matching
        if (slot.startTime === startTime && slot.endTime === endTime) {
          return true;
        }

        // For night shift, adjust numbers for comparison
        if (newSchedule.timeFrame === 'Night') {
          // Adjust end times after midnight
          const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
          const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
          
          // Check if the slots overlap
          return (
            // Check if task starts during the slot
            (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
            // Check if task ends during the slot
            (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
            // Check if task completely contains the slot
            (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
          );
        }

        // For day and afternoon shifts, use exact matching only
        return false;
      });
      
      if (hasConflict) {
        alert('Agent already has a task assigned for this time slot');
        return prevAgents;
      }
      
      if (agentIndex === -1) {
        // Add new agent
        const employee = employees.find(e => e.id === selectedAgent);
        if (employee) {
          updatedAgents.push({
            id: selectedAgent,
            name: employee.fullName,
            timeSlots: [{
              startTime,
              endTime,
              taskType: selectedTaskType,
              hasBreak: includeBreak
            }]
          });
        }
      } else {
        // Update existing agent
        const existingAgent = updatedAgents[agentIndex];
        existingAgent.timeSlots.push({
          startTime,
          endTime,
          taskType: selectedTaskType,
          hasBreak: includeBreak
        });
      }
      
      return updatedAgents;
    });

    // Find next available time slot
    const timeSlots = getTimeSlots(newSchedule.timeFrame, newSchedule.interval);
    const currentIndex = timeSlots.findIndex(slot => slot === selectedTimeSlot);
    if (currentIndex < timeSlots.length - 1) {
      setSelectedTimeSlot(timeSlots[currentIndex + 1]);
    } else {
      setSelectedTimeSlot('');
      setSelectedTaskType('Chat');
      setIncludeBreak(false);
    }
  };

  const handleRemoveTask = (agentId: string, taskIndex: number) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => {
        if (agent.id === agentId) {
          const newTimeSlots = [...agent.timeSlots];
          newTimeSlots.splice(taskIndex, 1);
          return {
            ...agent,
            timeSlots: newTimeSlots
          };
        }
        return agent;
      }).filter(agent => agent.timeSlots.length > 0) // Remove agent if they have no tasks
    );
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

  const renderAgentSchedule = (agent: any) => {
    const sortedTimeSlots = [...(agent.timeSlots || [])].sort((a, b) => {
      // Convert times to comparable numbers (e.g., "08:00" -> 800)
      const aTime = parseInt(a.startTime.replace(':', ''));
      const bTime = parseInt(b.startTime.replace(':', ''));
      // For night shift, adjust times after midnight to be larger than evening times
      const adjustedATime = selectedViewSchedule?.timeFrame === 'Night' && aTime < 1000 
        ? aTime + 2400 
        : aTime;
      const adjustedBTime = selectedViewSchedule?.timeFrame === 'Night' && bTime < 1000 
        ? bTime + 2400 
        : bTime;
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
            {schedules.map((schedule) => (
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
                        <Typography variant="subtitle1" gutterBottom component="div">
                          Schedule Details
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Agent</TableCell>
                                {getTimeSlots(schedule.timeFrame, schedule.interval).map((slot) => (
                                  <TableCell key={slot} align="center" sx={{ fontWeight: 'bold', minWidth: '150px' }}>
                                    {slot.replace('-', ' - ')}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {schedule.agents?.map((agent) => (
                                <TableRow key={agent.id}>
                                  <TableCell sx={{ fontWeight: 500 }}>{agent.name}</TableCell>
                                  {getTimeSlots(schedule.timeFrame, schedule.interval).map((timeSlot) => {
                                    const [slotStart, slotEnd] = timeSlot.split('-');
                                    const task = agent.timeSlots?.find(t => {
                                      // Convert times to comparable numbers
                                      const taskStartNum = parseInt(t.startTime.replace(':', ''));
                                      const taskEndNum = parseInt(t.endTime.replace(':', ''));
                                      const slotStartNum = parseInt(slotStart.replace(':', ''));
                                      const slotEndNum = parseInt(slotEnd.replace(':', ''));

                                      // For exact matching
                                      if (t.startTime === slotStart && t.endTime === slotEnd) {
                                        return true;
                                      }

                                      // For night shift, adjust numbers for comparison
                                      if (schedule.timeFrame === 'Night') {
                                        // Adjust end times after midnight
                                        const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
                                        const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
                                        
                                        // Check if the slots overlap
                                        return (
                                          // Check if task starts during the slot
                                          (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
                                          // Check if task ends during the slot
                                          (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
                                          // Check if task completely contains the slot
                                          (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
                                        );
                                      }

                                      // For day and afternoon shifts, use exact matching only
                                      return false;
                                    });
                                    return (
                                      <TableCell key={timeSlot} align="center">
                                        {task && (
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
                                        )}
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
                      {getTimeSlots(selectedViewSchedule.timeFrame, selectedViewSchedule.interval).map((slot) => (
                        <TableCell key={slot} align="center" sx={{ fontWeight: 'bold' }}>
                          {slot.replace('-', ' - ')}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedViewSchedule.agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{agent.name}</TableCell>
                        {getTimeSlots(selectedViewSchedule.timeFrame, selectedViewSchedule.interval).map((timeSlot) => {
                          const [slotStart, slotEnd] = timeSlot.split('-');
                          const task = agent.timeSlots.find(t => {
                            // Convert times to comparable numbers
                            const taskStartNum = parseInt(t.startTime.replace(':', ''));
                            const taskEndNum = parseInt(t.endTime.replace(':', ''));
                            const slotStartNum = parseInt(slotStart.replace(':', ''));
                            const slotEndNum = parseInt(slotEnd.replace(':', ''));

                            // For exact matching
                            if (t.startTime === slotStart && t.endTime === slotEnd) {
                              return true;
                            }

                            // For night shift, adjust numbers for comparison
                            if (selectedViewSchedule.timeFrame === 'Night') {
                              // Adjust end times after midnight
                              const adjustedTaskEndNum = taskEndNum < taskStartNum ? taskEndNum + 2400 : taskEndNum;
                              const adjustedSlotEndNum = slotEndNum < slotStartNum ? slotEndNum + 2400 : slotEndNum;
                              
                              // Check if the slots overlap
                              return (
                                // Check if task starts during the slot
                                (taskStartNum >= slotStartNum && taskStartNum < adjustedSlotEndNum) ||
                                // Check if task ends during the slot
                                (adjustedTaskEndNum > slotStartNum && adjustedTaskEndNum <= adjustedSlotEndNum) ||
                                // Check if task completely contains the slot
                                (taskStartNum <= slotStartNum && adjustedTaskEndNum >= adjustedSlotEndNum)
                              );
                            }

                            // For day and afternoon shifts, use exact matching only
                            return false;
                          });
                          return (
                            <TableCell key={timeSlot} align="center">
                              {task && (
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
                              )}
                            </TableCell>
                          );
                        })}
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
