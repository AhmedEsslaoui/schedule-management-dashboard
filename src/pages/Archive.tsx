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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import { RestoreFromTrash as RestoreIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Task {
  startTime: string;
  endTime: string;
  taskType: string;
  hasBreak?: boolean;
}

interface Agent {
  id: string;
  name: string;
  timeSlots: Task[];
}

interface Schedule {
  id: string;
  date: string;
  timeFrame: string;
  seniorName: string;
  country: string;
  agents: Agent[];
  status: 'draft' | 'published' | 'archived';
}

export default function Archive() {
  const [archivedSchedules, setArchivedSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'schedules'),
      where('status', '==', 'archived')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Schedule));
      setArchivedSchedules(schedules);
    });

    return () => unsubscribe();
  }, []);

  const handleRestoreSchedule = async (schedule: Schedule) => {
    try {
      const scheduleRef = doc(db, 'schedules', schedule.id);
      await updateDoc(scheduleRef, {
        status: 'draft'
      });
    } catch (error) {
      console.error('Error restoring schedule:', error);
    }
  };

  const handleViewDetails = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedSchedule(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Archived Schedules
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time Frame</TableCell>
              <TableCell>Senior</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Agents</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {archivedSchedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{new Date(schedule.date).toLocaleDateString()}</TableCell>
                <TableCell>{schedule.timeFrame}</TableCell>
                <TableCell>{schedule.seniorName}</TableCell>
                <TableCell>{schedule.country}</TableCell>
                <TableCell>{schedule.agents.length}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={() => handleViewDetails(schedule)}
                      color="primary"
                      title="View Details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleRestoreSchedule(schedule)}
                      color="primary"
                      title="Restore Schedule"
                    >
                      <RestoreIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {archivedSchedules.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No archived schedules found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Schedule Details
        </DialogTitle>
        <DialogContent>
          {selectedSchedule && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Date</Typography>
                  <Typography>{new Date(selectedSchedule.date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Time Frame</Typography>
                  <Typography>{selectedSchedule.timeFrame}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Senior</Typography>
                  <Typography>{selectedSchedule.seniorName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Country</Typography>
                  <Typography>{selectedSchedule.country}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Agents and Tasks</Typography>
                  {(selectedSchedule.agents || []).map((agent) => (
                    <Paper key={agent.id} sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {agent.name}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {(agent.timeSlots || []).map((task, index) => (
                          <Chip
                            key={index}
                            label={`${task.startTime}-${task.endTime}: ${task.taskType}${task.hasBreak ? ' (Break)' : ''}`}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
