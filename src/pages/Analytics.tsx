import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isWithinInterval, parseISO } from 'date-fns';
import { alpha } from '@mui/material/styles';
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
  | 'Kenya Calls';

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
  { value: 'Kenya Calls' as TaskType, label: 'Kenya Calls' }
];

interface AgentTaskAnalytics {
  name: string;
  tasks: {
    [K in TaskType]?: number;
  };
  totalHours: number;
}

interface AnalyticsData {
  agentAnalytics: AgentTaskAnalytics[];
}

export default function Analytics() {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [uniqueAgents, setUniqueAgents] = useState<string[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    agentAnalytics: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch unique countries and agents
  useEffect(() => {
    const fetchUniqueValues = async () => {
      const schedulesRef = collection(db, 'schedules');
      const schedulesSnapshot = await getDocs(schedulesRef);
      
      const uniqueAgentsSet = new Set<string>();

      schedulesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.agents) {
          data.agents.forEach((agent: any) => {
            if (agent.name) uniqueAgentsSet.add(agent.name);
          });
        }
      });

      setUniqueAgents(Array.from(uniqueAgentsSet));
    };

    fetchUniqueValues();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schedulesRef = collection(db, 'schedules');
        let schedulesQuery = query(schedulesRef);

        // Apply country filter if selected
        if (selectedCountry) {
          schedulesQuery = query(schedulesRef, where('country', '==', selectedCountry));
        }

        const schedulesSnapshot = await getDocs(schedulesQuery);
        const agentTaskMap = new Map<string, { tasks: { [key: string]: number }, totalHours: number }>();

        schedulesSnapshot.docs.forEach((doc) => {
          const schedule = doc.data();
          const scheduleDate = parseISO(schedule.date);
          
          // Skip if outside date range
          if (startDate && endDate) {
            if (!isWithinInterval(scheduleDate, { start: startDate, end: endDate })) {
              return;
            }
          }

          // Process agent tasks
          if (schedule.agents) {
            schedule.agents.forEach((agent: any) => {
              // Skip if agent filter is active and doesn't match
              if (selectedAgent && agent.name !== selectedAgent) {
                return;
              }

              if (!agentTaskMap.has(agent.name)) {
                agentTaskMap.set(agent.name, { tasks: {}, totalHours: 0 });
              }
              
              const agentData = agentTaskMap.get(agent.name)!;
              
              agent.tasks.forEach((task: any) => {
                const taskType = task.taskType;
                const hours = schedule.interval;
                
                agentData.tasks[taskType] = (agentData.tasks[taskType] || 0) + hours;
                agentData.totalHours += hours;
              });
            });
          }
        });

        const agentAnalytics = Array.from(agentTaskMap.entries()).map(([name, data]) => ({
          name,
          tasks: data.tasks,
          totalHours: data.totalHours
        }));

        setAnalyticsData({ agentAnalytics });
        setLoading(false);

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedCountry, selectedAgent]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingAnimation variant="circular" size="large" />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Box sx={{ px: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 1, color: '#111827' }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#6B7280' }}>
            Track agent performance and task distribution over time.
          </Typography>
        </Box>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            mb: 3,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue: Date | null) => {
                setStartDate(newValue);
              }}
              sx={{ mr: 2 }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue: Date | null) => {
                setEndDate(newValue);
              }}
              sx={{ mr: 2 }}
            />
            <FormControl sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel id="country-select-label">Country</InputLabel>
              <Select
                labelId="country-select-label"
                value={selectedCountry}
                onChange={(e: SelectChangeEvent) => {
                  setSelectedCountry(e.target.value);
                }}
                label="Country"
              >
                <MenuItem value="">All Countries</MenuItem>
                <MenuItem value="egypt">Egypt</MenuItem>
                <MenuItem value="morocco">Morocco</MenuItem>
                <MenuItem value="africa">Africa</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="agent-select-label">Agent</InputLabel>
              <Select
                labelId="agent-select-label"
                value={selectedAgent}
                onChange={(e: SelectChangeEvent) => {
                  setSelectedAgent(e.target.value);
                }}
                label="Agent"
              >
                <MenuItem value="">All Agents</MenuItem>
                {uniqueAgents.map((agent) => (
                  <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 1200, background: 'none' }} size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#374151', 
                      background: alpha('#111827', 0.04),
                      borderBottom: '1px solid #E5E7EB',
                      width: '150px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Agent Name
                  </TableCell>
                  {taskTypes.map((type) => (
                    <TableCell 
                      key={type.value}
                      sx={{
                        fontWeight: 600,
                        color: '#374151',
                        background: alpha('#111827', 0.04),
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: 'normal',
                        width: '120px',
                        padding: '8px',
                        lineHeight: 1.2,
                        '& span': {
                          display: 'block',
                          wordBreak: 'break-word'
                        }
                      }}
                    >
                      <span>{type.label}</span>
                    </TableCell>
                  ))}
                  <TableCell 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#374151', 
                      background: alpha('#111827', 0.04),
                      borderBottom: '1px solid #E5E7EB',
                      width: '100px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Total Hours
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analyticsData.agentAnalytics.map((agent) => (
                  <TableRow 
                    key={agent.name}
                    sx={{
                      background: 'none',
                      '&:hover': {
                        background: '#F9FAFB',
                      }
                    }}
                  >
                    <TableCell 
                      sx={{ 
                        color: '#374151', 
                        background: 'none', 
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.name}
                    </TableCell>
                    {taskTypes.map((type) => (
                      <TableCell 
                        key={type.value}
                        sx={{
                          color: '#374151',
                          background: 'none',
                          borderBottom: '1px solid #E5E7EB',
                          padding: '8px',
                        }}
                      >
                        {agent.tasks[type.value] || 0}
                      </TableCell>
                    ))}
                    <TableCell 
                      sx={{ 
                        color: '#374151', 
                        background: 'none', 
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.totalHours}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
}
