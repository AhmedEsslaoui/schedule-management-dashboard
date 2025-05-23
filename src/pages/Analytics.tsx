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
  Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { alpha } from '@mui/material/styles';
import LoadingAnimation from '../components/LoadingAnimation';
import DownloadIcon from '@mui/icons-material/Download';

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
  | 'Emails + Kenya';

type TaskCounts = {
  [key: string]: number | undefined;
  'Chat'?: number;
  'Chat/Appeals+Reviews'?: number;
  'Appeals/Reviews'?: number;
  'Appeals/Reviews/Calls'?: number;
  'Calls'?: number;
  'Chat/Appeals'?: number;
  'Chat/Appeals/Reviews'?: number;
  'Chat/Appeals/Reviews/Calls'?: number;
  'Chat/Emails+Groups+Calls'?: number;
  'Emails/Appeals/Calls'?: number;
  'Reviews +Kenya'?: number;
  'Chat + kenya'?: number;
  'Emails + Kenya'?: number;
};

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
  { value: 'Emails + Kenya' as TaskType, label: 'Emails + Kenya' }
];

interface AgentTaskAnalytics {
  name: string;
  tasks: TaskCounts;
  totalHours: number;
}

interface AnalyticsData {
  agentAnalytics: AgentTaskAnalytics[];
}

const countryMap: { [key: string]: string } = {
  'egypt': 'Egypt',
  'morocco': 'Morocco',
  'africa': 'Africa'
};

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
        setLoading(true);
        const schedulesRef = collection(db, 'schedules');
        let schedulesQuery = query(schedulesRef);

        // Apply country filter if selected
        if (selectedCountry) {
          schedulesQuery = query(schedulesRef, where('country', '==', selectedCountry));
        }

        const schedulesSnapshot = await getDocs(schedulesQuery);
        const agentAnalytics: { [key: string]: AgentTaskAnalytics } = {};

        schedulesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          // Process data if we have agents and either no date filter or matching date range
          if (data.agents && (!startDate || !endDate || 
              isWithinInterval(parseISO(data.date), { 
                start: startOfDay(startDate), 
                end: endOfDay(endDate) 
              }))) {
            data.agents.forEach((agent: any) => {
              if (!agentAnalytics[agent.name]) {
                agentAnalytics[agent.name] = {
                  name: agent.name,
                  tasks: {},
                  totalHours: 0
                };
              }

              agent.tasks?.forEach((task: any) => {
                // Skip counting hours for '-' task type
                if (task.taskType === '-') return;

                // Parse time slot
                const [startTime, endTime] = task.timeSlot.split(' - ');
                const [startHour] = startTime.split(':');
                const [endHour] = endTime.split(':');
                
                // Calculate hours, defaulting to schedule interval if parsing fails
                let hours = 0;
                if (startHour && endHour) {
                  hours = parseInt(endHour) - parseInt(startHour);
                  if (hours < 0) hours += 24; // Handle overnight shifts
                } else if (data.interval) {
                  hours = data.interval;
                }

                const taskType = task.taskType as keyof TaskCounts;
                if (!agentAnalytics[agent.name].tasks[taskType]) {
                  agentAnalytics[agent.name].tasks[taskType] = 1;
                } else {
                  agentAnalytics[agent.name].tasks[taskType] = (agentAnalytics[agent.name].tasks[taskType] || 0) + 1;
                }
                agentAnalytics[agent.name].totalHours += hours;
              });

              agent.timeSlots?.forEach((task: any) => {
                // Skip counting hours for '-' task type
                if (task.taskType === '-') return;

                // Parse time slot
                const startTime = task.startTime;
                const endTime = task.endTime;
                const [startHour] = startTime.split(':');
                const [endHour] = endTime.split(':');
                
                // Calculate hours, defaulting to schedule interval if parsing fails
                let hours = 0;
                if (startHour && endHour) {
                  hours = parseInt(endHour) - parseInt(startHour);
                  if (hours < 0) hours += 24; // Handle overnight shifts
                } else if (data.interval) {
                  hours = data.interval;
                }

                const taskType = task.taskType as keyof TaskCounts;
                if (!agentAnalytics[agent.name].tasks[taskType]) {
                  agentAnalytics[agent.name].tasks[taskType] = 1;
                } else {
                  agentAnalytics[agent.name].tasks[taskType] = (agentAnalytics[agent.name].tasks[taskType] || 0) + 1;
                }
                agentAnalytics[agent.name].totalHours += hours;
              });
            });
          }
        });

        // Filter by selected agent if specified
        let filteredAnalytics = Object.values(agentAnalytics);
        if (selectedAgent) {
          filteredAnalytics = filteredAnalytics.filter(a => a.name === selectedAgent);
        }

        setAnalyticsData({ agentAnalytics: filteredAnalytics });
        setLoading(false);

      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedCountry, selectedAgent]);

  const handleDownloadCSV = () => {
    // Create CSV header
    const headers = ['Agent Name', ...taskTypes.map(type => type.label), 'Total Hours'];
    
    // Create CSV rows
    const rows = analyticsData.agentAnalytics.map(agent => {
      return [
        agent.name,
        ...taskTypes.map(type => agent.tasks[type.value] || 0),
        agent.totalHours
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                <MenuItem value="Egypt">Egypt</MenuItem>
                <MenuItem value="Morocco">Morocco</MenuItem>
                <MenuItem value="Africa">Africa</MenuItem>
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
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadCSV}
              sx={{
                height: 'fit-content',
                alignSelf: 'center',
                borderColor: '#E5E7EB',
                color: '#374151',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  backgroundColor: '#F9FAFB',
                }
              }}
            >
              Download CSV
            </Button>
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
