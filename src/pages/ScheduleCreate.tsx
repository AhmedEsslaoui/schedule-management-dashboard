import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

type TaskType = 'Chat' | 'Email' | 'Call' | 'Break';

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

interface AgentSchedule {
  agentId: string;
  agentName: string;
  timeSlots: {
    startTime: string;
    endTime: string;
    taskType: TaskType;
  }[];
}

interface Schedule {
  title: string;
  date: string;
  agents: AgentSchedule[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

const taskTypes: { value: TaskType; label: string }[] = [
  { value: 'Chat', label: 'Chats' },
  { value: 'Email', label: 'Emails' },
  { value: 'Call', label: 'Calls' },
  { value: 'Break', label: 'Break' },
];

export default function ScheduleCreate() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('Chat');
  const [includeBreak, setIncludeBreak] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Basic Information', 'Time Configuration', 'Agent Assignment'];

  const generateTimeSlots = () => {
    const slots = [];
    let currentTime = new Date(`2000-01-01T09:00`);
    const endTimeDate = new Date(`2000-01-01T17:00`);
  
    while (currentTime < endTimeDate) {
      const slotStart = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      currentTime.setHours(currentTime.getHours() + 1);
      const slotEnd = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      slots.push(`${slotStart}-${slotEnd}`);
    }
    
    return slots;
  };

  const handleTaskAssignment = () => {
    if (!selectedAgent || !selectedTimeSlot || !selectedTaskType) {
      alert('Please fill in all fields');
      return;
    }

    setAgents(prevAgents => {
      const updatedAgents = [...prevAgents];
      const agentIndex = updatedAgents.findIndex(a => a.id === selectedAgent);
      
      if (agentIndex !== -1) {
        if (!updatedAgents[agentIndex].tasks) {
          updatedAgents[agentIndex].tasks = [];
        }

        updatedAgents[agentIndex].tasks.push({
          timeSlot: selectedTimeSlot,
          taskType: selectedTaskType,
          hasBreak: includeBreak
        });
      }
      return updatedAgents;
    });

    // Reset form
    setSelectedAgent('');
    setSelectedTimeSlot('');
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={date}
                onChange={(newValue) => setDate(newValue)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configure Schedule Time Frame
            </Typography>
            {/* Time configuration content */}
          </Box>
        );
      case 2:
        const timeSlots = generateTimeSlots();
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Assign Agents to Tasks
            </Typography>
            
            {/* Add New Agent */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Add New Agent
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Agent Name"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  size="small"
                  sx={{ width: 200 }}
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    if (newAgentName.trim()) {
                      setAgents([
                        ...agents,
                        { id: Date.now().toString(), name: newAgentName, tasks: [] }
                      ]);
                      setNewAgentName('');
                    }
                  }}
                >
                  Add Agent
                </Button>
              </Box>
            </Paper>

            {/* Task Assignment */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Assign Tasks
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Agent</InputLabel>
                  <Select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    label="Select Agent"
                  >
                    {agents.map((agent) => (
                      <MenuItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Time Slot</InputLabel>
                  <Select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    label="Time Slot"
                  >
                    {timeSlots.map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {slot}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Task Type</InputLabel>
                  <Select
                    value={selectedTaskType}
                    onChange={(e) => setSelectedTaskType(e.target.value as TaskType)}
                    label="Task Type"
                  >
                    {taskTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setIncludeBreak(!includeBreak)}
                    >
                      {includeBreak ? 'Remove Break' : 'Add Break'}
                    </IconButton>
                  }
                  label={includeBreak ? 'Break assigned' : 'No break assigned'}
                  sx={{ m: 0 }}
                />

                <Button
                  variant="contained"
                  onClick={handleTaskAssignment}
                  disabled={!selectedAgent || !selectedTimeSlot || !selectedTaskType}
                  fullWidth
                  size="small"
                >
                  Assign
                </Button>
              </Box>

              {/* Assignments Table */}
              <Box sx={{ mt: 2 }}>
                {agents.map(agent => 
                  agent.tasks?.map((task, index) => (
                    <Box key={`${agent.id}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>
                        {agent.name} - {task.timeSlot} - {task.taskType}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setAgents(prevAgents => {
                            const updatedAgents = [...prevAgents];
                            const agentIndex = updatedAgents.findIndex(a => a.id === agent.id);
                            if (agentIndex !== -1) {
                              updatedAgents[agentIndex].tasks = updatedAgents[agentIndex].tasks.filter(
                                (_, i) => i !== index
                              );
                            }
                            return updatedAgents;
                          });
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  const handleSubmit = async () => {
    try {
      if (!title || !date || agents.length === 0) {
        alert('Please fill in all required fields');
        return;
      }

      const schedule: Schedule = {
        title,
        date: date.toISOString().split('T')[0],
        agents: agents.map(agent => ({
          agentId: agent.id,
          agentName: agent.name,
          timeSlots: agent.tasks.map(task => ({
            startTime: task.timeSlot.split('-')[0],
            endTime: task.timeSlot.split('-')[1],
            taskType: task.taskType
          }))
        })),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'schedules'), schedule);
      // navigate('/schedules');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Failed to create schedule');
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box sx={{ mt: 4 }}>
        {getStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => setActiveStep((prev) => prev - 1)}
            sx={{ mr: 1 }}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              color="primary"
            >
              Create Schedule
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setActiveStep((prev) => prev + 1)}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
