import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress
} from '@mui/material';

interface Schedule {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  country: string;
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const schedulesRef = collection(db, 'schedules');
        let schedulesQuery;
        
        if (!isAdmin) {
          // Non-admin users can only see published schedules
          schedulesQuery = query(schedulesRef, where('status', '==', 'published'));
        } else {
          // Admin users can see all schedules
          schedulesQuery = query(schedulesRef);
        }

        const querySnapshot = await getDocs(schedulesQuery);
        const schedulesData: Schedule[] = [];
        
        querySnapshot.forEach((doc) => {
          schedulesData.push({
            id: doc.id,
            ...doc.data() as Omit<Schedule, 'id'>
          });
        });

        setSchedules(schedulesData);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [isAdmin]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {isAdmin ? 'Schedule Management' : 'Published Schedules'}
      </Typography>

      {isAdmin && (
        <Box mb={3}>
          <Button variant="contained" color="primary">
            Create New Schedule
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {schedules.map((schedule) => (
          <Grid item xs={12} sm={6} md={4} key={schedule.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {schedule.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {schedule.description}
                </Typography>
                <Typography variant="body2">
                  Country: {schedule.country}
                </Typography>
                <Typography variant="body2">
                  Period: {new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}
                </Typography>
                {isAdmin && (
                  <Typography variant="body2" color={schedule.status === 'published' ? 'primary' : 'error'}>
                    Status: {schedule.status}
                  </Typography>
                )}
              </CardContent>
              {isAdmin && (
                <CardActions>
                  <Button size="small" color="primary">
                    Edit
                  </Button>
                  {schedule.status !== 'published' && (
                    <Button size="small" color="primary">
                      Publish
                    </Button>
                  )}
                  <Button size="small" color="error">
                    Delete
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {schedules.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            {isAdmin ? 'No schedules found. Create one to get started!' : 'No published schedules available.'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
