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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Publish as PublishIcon, AutoFixHigh as AutoFixHighIcon, Archive as ArchiveIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import EditScheduleDialog from '../components/EditScheduleDialog';
import LoadingAnimation from '../components/LoadingAnimation';
import { isScheduleExpired } from '../utils/worldTime';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface Agent {
  id: string;
  name: string;
  tasks: {
    timeSlot: string;
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
  | 'Emails (New)+Appeals+Calls'
  | 'Emails (Need attention)+Reviews+Groups+Calls'
  | 'Appeals/Reviews/Calls/App follow'
  | 'Emails'
  | 'Sick'
  | 'No Show'
  | 'Kenya Calls';

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
  { value: 'Emails (New)+Appeals+Calls' as TaskType, label: 'Emails (New)+Appeals+Calls' },
  { value: 'Emails (Need attention)+Reviews+Groups+Calls' as TaskType, label: 'Emails (Need attention)+Reviews+Groups+Calls' },
  { value: 'Appeals/Reviews/Calls/App follow' as TaskType, label: 'Appeals/Reviews/Calls/App follow' },
  { value: 'Emails' as TaskType, label: 'Emails' },
  { value: 'Sick' as TaskType, label: 'Sick' },
  { value: 'No Show' as TaskType, label: 'No Show' },
  { value: 'Kenya Calls' as TaskType, label: 'Kenya Calls' }
];

const countries = ['Egypt', 'Morocco', 'Africa'];
const steps = ['Creation Method', 'Basic Information', 'Time Configuration', 'Agent Assignment'];

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
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to schedules collection
    const q = query(
      collection(db, 'schedules'),
      where('status', 'in', ['draft', 'published'])
    );

    const unsubscribeSchedules = onSnapshot(q, (snapshot) => {
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

    // Handle overnight shifts
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

    console.log('Generated time slots:', slots);
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
          tasks: []
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
          agentAssignment.tasks.push({
            timeSlot,
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
                label="Schedule Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                sx={{ width: '100%', mb: 2 }}
                renderInput={(params) => (
                  <TextField {...params} />
                )}
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
                          agent.tasks.map((task, index) => (
                            <TableRow key={`${agent.id}-${index}`}>
                              <TableCell>{agent.name}</TableCell>
                              <TableCell>{task.timeSlot}</TableCell>
                              <TableCell>{task.taskType}</TableCell>
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
                          const isSlotTakenByCurrentAgent = currentAgent?.tasks.some(t => t.timeSlot === slot);
                          
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
                      onClick={() => {
                        if (!selectedAgent || !selectedTimeSlot || !selectedTaskType) return;

                        const employee = employees.find(emp => emp.id === selectedAgent);
                        if (!employee) return;

                        // Check if agent already exists
                        const existingAgentIndex = agents.findIndex(a => a.id === selectedAgent);
                        
                        if (existingAgentIndex !== -1) {
                          // Add task to existing agent
                          if (agents[existingAgentIndex].tasks.some(t => t.timeSlot === selectedTimeSlot)) {
                            alert('This time slot is already assigned');
                            return;
                          }
                          
                          setAgents(prev => prev.map((agent, index) => 
                            index === existingAgentIndex
                              ? {
                                  ...agent,
                                  tasks: [...agent.tasks, { 
                                    timeSlot: selectedTimeSlot, 
                                    taskType: selectedTaskType,
                                    hasBreak: includeBreak 
                                  }]
                                }
                              : agent
                          ));
                        } else {
                          // Add new agent with task
                          setAgents(prev => [...prev, {
                            id: employee.id,
                            name: employee.fullName,
                            tasks: [{ 
                              timeSlot: selectedTimeSlot, 
                              taskType: selectedTaskType,
                              hasBreak: includeBreak 
                            }]
                          }]);
                          // Set the new agent as expanded
                          setExpandedAgent(employee.id);
                        }

                        // Reset selections
                        const nextSlot = selectNextTimeSlot(selectedTimeSlot);
                        setSelectedTimeSlot(nextSlot);
                        setSelectedTaskType('Chat');
                        setIncludeBreak(false);
                      }}
                      disabled={!selectedAgent || !selectedTimeSlot || !selectedTaskType}
                    >
                      Assign
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Assignments Table */}
              {agents.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Assigned Tasks
                  </Typography>
                  {agents.map((agent, agentIndex) => (
                    <Accordion 
                      key={agent.id} 
                      expanded={expandedAgent === agent.id}
                      onChange={(_, isExpanded) => {
                        setExpandedAgent(isExpanded ? agent.id : null);
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`agent-${agent.id}-content`}
                        id={`agent-${agent.id}-header`}
                      >
                        <Typography>{agent.name}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Time Slot</TableCell>
                                <TableCell>Task</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {agent.tasks.map((task, taskIndex) => (
                                <TableRow key={`${agent.id}-${taskIndex}`}>
                                  <TableCell>{task.timeSlot}</TableCell>
                                  <TableCell>
                                    {task.taskType}
                                    {task.hasBreak && (
                                      <Typography 
                                        component="span" 
                                        sx={{ 
                                          ml: 1,
                                          color: 'primary.main',
                                          bgcolor: 'primary.light',
                                          px: 1,
                                          py: 0.25,
                                          borderRadius: 1,
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        +1hr Break
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setAgents(prev => {
                                          const updatedAgents = prev.map(a => {
                                            if (a.id === agent.id) {
                                              const updatedTasks = a.tasks.filter((_, i) => i !== taskIndex);
                                              return updatedTasks.length ? { ...a, tasks: updatedTasks } : null;
                                            }
                                            return a;
                                          }).filter(Boolean) as Agent[];
                                          return updatedAgents;
                                        });
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              )}
            </Box>
          );
        }
      default:
        return 'Unknown step';
    }
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
              <TableCell>Status</TableCell>
              <TableCell>Agents</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{new Date(schedule.date).toLocaleDateString()}</TableCell>
                <TableCell>{schedule.timeFrame}</TableCell>
                <TableCell>{schedule.seniorName}</TableCell>
                <TableCell>{schedule.country}</TableCell>
                <TableCell>
                  <Box
                    sx={{
                      backgroundColor: schedule.status === 'published' ? 'success.main' : schedule.status === 'archived' ? 'error.main' : 'warning.main',
                      color: 'white',
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block'
                    }}
                  >
                    {schedule.status}
                  </Box>
                </TableCell>
                <TableCell>{schedule.agents?.length || 0}</TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={() => handleViewSchedule(schedule)}
                    title="View Details"
                  >
                    <EditIcon />
                  </IconButton>
                  {schedule.status === 'draft' && (
                    <IconButton
                      color="success"
                      onClick={() => handlePublishSchedule(schedule.id)}
                      title="Publish"
                    >
                      <PublishIcon />
                    </IconButton>
                  )}
                  {schedule.status !== 'archived' && (
                    <IconButton
                      color="default"
                      onClick={() => handleArchiveSchedule(schedule)}
                      title="Archive Schedule"
                    >
                      <ArchiveIcon />
                    </IconButton>
                  )}
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
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
    </Box>
  );
}
