interface WorldTime {
  datetime: string;
  timezone: string;
}

interface ShiftTime {
  start: number;
  end: number;
  crossesNextDay: boolean;
}

const SHIFT_TIMES: { [key: string]: ShiftTime } = {
  Day: { start: 8, end: 20, crossesNextDay: false },      // 08:00 - 20:00 same day
  Afternoon: { start: 14, end: 2, crossesNextDay: true }, // 14:00 - 02:00 next day
  Night: { start: 20, end: 8, crossesNextDay: true }      // 20:00 - 08:00 next day
};

export function getCurrentTime(): WorldTime {
  const now = new Date();
  return {
    datetime: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export function parseTime(time: string): Date {
  return new Date(time);
}

export function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function isScheduleExpired(scheduleDate: string, timeFrame: string): boolean {
  const schedule = parseTime(scheduleDate);
  const currentTime = getCurrentTime().datetime;
  const currentDateTime = parseTime(currentTime);
  
  // Get shift configuration
  const shift = SHIFT_TIMES[timeFrame];
  if (!shift) {
    console.error('Invalid timeFrame:', timeFrame);
    return false;
  }
  
  // Set up schedule start and end times
  const scheduleStart = new Date(schedule);
  scheduleStart.setHours(shift.start, 0, 0, 0);
  
  const scheduleEnd = new Date(schedule);
  scheduleEnd.setHours(shift.end, 0, 0, 0);
  
  // Adjust end time if shift crosses to next day
  if (shift.crossesNextDay) {
    scheduleEnd.setDate(scheduleEnd.getDate() + 1);
  }
  
  // Add 1 hour grace period to the end time
  const expiryTime = new Date(scheduleEnd);
  expiryTime.setHours(expiryTime.getHours() + 1);
  
  console.log('Schedule timing check:', {
    timeFrame,
    scheduleDate: schedule.toISOString(),
    currentTime: currentDateTime.toISOString(),
    scheduleStart: scheduleStart.toISOString(),
    scheduleEnd: scheduleEnd.toISOString(),
    expiryTime: expiryTime.toISOString(),
    shift
  });
  
  // Compare with current time
  return currentDateTime > expiryTime;
}
