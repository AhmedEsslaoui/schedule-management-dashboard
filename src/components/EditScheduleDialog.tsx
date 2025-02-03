import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { Edit as EditIcon, Check as CheckIcon } from '@mui/icons-material';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatTimeSlot } from '../utils/timeZones';

interface Task {
  timeSlot: string;
  taskType: TaskType;
  hasBreak?: boolean;
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
  | 'Kenya Calls'
  | 'Sick'
  | 'No Show';

interface Agent {
  id: string;
  name: string;
  tasks: Task[];
}

interface Employee {
  id: string;
  fullName: string;
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
}

interface EditScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  onUpdate: () => void;
  employees: Employee[];
}

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
  { value: 'Kenya Calls' as TaskType, label: 'Kenya Calls' },
  { value: 'Sick' as TaskType, label: 'Sick' },
  { value: 'No Show' as TaskType, label: 'No Show' }
];

const generateTimeSlots = (schedule: Schedule) => {
  const slots = [];
  let currentTime = new Date();
  currentTime.setHours(parseInt(schedule.startTime.split(':')[0]), 0, 0);
  
  const endTime = new Date();
  const endHour = parseInt(schedule.endTime.split(':')[0]);
  // Handle midnight case (convert 24 to 0)
  endTime.setHours(endHour === 24 ? 0 : endHour, 0, 0);
  if (endHour === 24 || endHour === 0) {
    endTime.setDate(endTime.getDate() + 1); // Add one day for midnight
  }
  
  while (currentTime < endTime) {
    const startHour = currentTime.getHours();
    currentTime.setHours(currentTime.getHours() + schedule.interval);
    const endHour = currentTime.getHours();
    
    // Format as "HH:00 - HH:00"
    slots.push(`${formatTimeSlot(startHour)} - ${formatTimeSlot(endHour)}`);
  }
  
  return slots;
};

const generateInitialTasks = (timeSlots: string[]): Task[] => {
  const tasks: Task[] = [];
  const breakSlotIndex = Math.floor(timeSlots.length / 2);
  
  timeSlots.forEach((timeSlot, index) => {
    const task: Task = {
      timeSlot,
      taskType: 'Chat',
      hasBreak: index === breakSlotIndex
    };
    tasks.push(task);
  });
  
  return tasks;
};

export default function EditScheduleDialog({ open, onClose, schedule, onUpdate, employees }: EditScheduleDialogProps) {
  const [editedSchedule, setEditedSchedule] = useState<Schedule>({ ...schedule });
  const [editingTask, setEditingTask] = useState<{ agentId: string; taskIndex: number } | null>(null);
  const [selectingAgent, setSelectingAgent] = useState(false);
  const [selectedNewAgent, setSelectedNewAgent] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>('Chat');
  const [includeBreak, setIncludeBreak] = useState(false);

  useEffect(() => {
    setEditedSchedule({ ...schedule });
  }, [schedule]);

  const handleClose = () => {
    setEditedSchedule({ ...schedule });
    setEditingTask(null);
    setSelectingAgent(false);
    setSelectedNewAgent('');
    setSelectedAgent('');
    setSelectedTimeSlot('');
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
    onClose();
  };

  const handleDeleteAgent = async (agentId: string) => {
    const updatedAgents = editedSchedule.agents.filter(agent => agent.id !== agentId);
    setEditedSchedule({ ...editedSchedule, agents: updatedAgents });
  };

  const handleAddAgent = () => {
    if (!selectedNewAgent) return;

    const employee = employees.find((emp: Employee) => emp.id === selectedNewAgent);
    if (!employee) return;

    const agentExists = editedSchedule.agents.some(agent => agent.id === selectedNewAgent);
    if (agentExists) {
      alert('This agent is already assigned to the schedule');
      return;
    }

    const timeSlots = generateTimeSlots(schedule);
    const tasks = generateInitialTasks(timeSlots);

    const newAgent: Agent = {
      id: employee.id,
      name: employee.fullName,
      tasks
    };

    setEditedSchedule({
      ...editedSchedule,
      agents: [...editedSchedule.agents, newAgent]
    });

    setSelectingAgent(false);
    setSelectedNewAgent('');
  };

  const handleConfirmTaskEdit = (agentId: string, taskIndex: number) => {
    const agent = editedSchedule.agents.find(a => a.id === agentId);
    if (!agent) return;

    const updatedAgents = [...editedSchedule.agents];
    const agentIndex = updatedAgents.findIndex(a => a.id === agentId);
    
    if (selectedTaskType) {
      updatedAgents[agentIndex].tasks[taskIndex] = {
        ...updatedAgents[agentIndex].tasks[taskIndex],
        taskType: selectedTaskType,
        hasBreak: includeBreak
      };
    }

    setEditedSchedule({ ...editedSchedule, agents: updatedAgents });
    setEditingTask(null);
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
  };

  const handleTaskAssignment = () => {
    if (!selectedAgent || !selectedTimeSlot || !selectedTaskType) return;

    const employee = employees.find((emp: Employee) => emp.id === selectedAgent);
    if (!employee) return;

    // Check if agent already exists
    const existingAgentIndex = editedSchedule.agents.findIndex(a => a.id === selectedAgent);
    if (existingAgentIndex === -1) {
      alert('Agent not found in the schedule');
      return;
    }

    const isTimeSlotTaken = editedSchedule.agents[existingAgentIndex].tasks.some(
      task => task.timeSlot === selectedTimeSlot
    );

    if (isTimeSlotTaken) {
      alert('This time slot is already assigned for this agent');
      return;
    }

    const newTask: Task = {
      timeSlot: selectedTimeSlot,
      taskType: selectedTaskType,
      hasBreak: includeBreak
    };

    const updatedAgents = [...editedSchedule.agents];
    updatedAgents[existingAgentIndex].tasks.push(newTask);

    setEditedSchedule({ ...editedSchedule, agents: updatedAgents });

    setSelectedAgent('');
    setSelectedTimeSlot('');
    setSelectedTaskType('Chat');
    setIncludeBreak(false);
  };

  const handleSave = async () => {
    try {
      const scheduleRef = doc(db, 'schedules', editedSchedule.id);
      const { id, ...scheduleWithoutId } = editedSchedule;
      await updateDoc(scheduleRef, scheduleWithoutId);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Schedule - {new Date(schedule.date).toLocaleDateString()} ({schedule.timeFrame})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Agents</Typography>
              <Button
                startIcon={<EditIcon />}
                onClick={() => setSelectingAgent(true)}
                variant="outlined"
                size="small"
              >
                Add Agent
              </Button>
            </Box>
            <Box>
              {editedSchedule.agents.map((agent) => (
                <React.Fragment key={agent.id}>
                  <Box
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">{agent.name}</Typography>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteAgent(agent.id)}
                        color="error"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ pl: 2 }}>
                      {agent.tasks.map((task, taskIndex) => (
                        <Box 
                          key={taskIndex} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            mb: 0.5,
                            gap: 1
                          }}
                        >
                          {editingTask?.agentId === agent.id && editingTask?.taskIndex === taskIndex ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                              <FormControl size="small" sx={{ minWidth: 200 }}>
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
                              <FormControl>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={includeBreak}
                                      onChange={(e) => setIncludeBreak(e.target.checked)}
                                    />
                                  }
                                  label="Include 1hr Break"
                                />
                              </FormControl>
                              <IconButton
                                size="small"
                                onClick={() => handleConfirmTaskEdit(agent.id, taskIndex)}
                                sx={{ ml: 1 }}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {task.timeSlot} - {task.taskType}
                                {task.hasBreak && <span> (+1hr Break)</span>}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingTask({ agentId: agent.id, taskIndex });
                                  setSelectedTaskType(task.taskType);
                                  setIncludeBreak(!!task.hasBreak);
                                }}
                                sx={{ ml: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Divider />
                </React.Fragment>
              ))}
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Agent</InputLabel>
                  <Select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    label="Select Agent"
                  >
                    {editedSchedule.agents.map((agent) => (
                      <MenuItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Time Slot</InputLabel>
                  <Select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    label="Time Slot"
                  >
                    {generateTimeSlots(schedule).map((slot) => (
                      <MenuItem key={slot} value={slot}>
                        {slot}
                      </MenuItem>
                    ))}
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
                    {taskTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
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

              <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleTaskAssignment}
                  disabled={!selectedAgent || !selectedTimeSlot || !selectedTaskType}
                  fullWidth
                  size="small"
                >
                  Assign
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Selection Dialog */}
      <Dialog 
        open={selectingAgent} 
        onClose={() => setSelectingAgent(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Employee to Add</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Employee</InputLabel>
            <Select
              value={selectedNewAgent}
              onChange={(e) => setSelectedNewAgent(e.target.value)}
              label="Select Employee"
            >
              {employees.map((emp) => (
                <MenuItem 
                  key={emp.id} 
                  value={emp.id}
                >
                  {emp.fullName}
                  {editedSchedule.agents.some(agent => agent.id === emp.id) && ' (Already Added)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectingAgent(false)}>Cancel</Button>
          <Button 
            onClick={handleAddAgent}
            variant="contained"
            disabled={!selectedNewAgent || editedSchedule.agents.some(agent => agent.id === selectedNewAgent)}
          >
            Add Employee
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
