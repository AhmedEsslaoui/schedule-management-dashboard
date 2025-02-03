import { addHours } from 'date-fns';

const TIME_ZONES = {
  egypt: { name: 'Africa/Cairo', offset: 2 }, // UTC+2
  morocco: { name: 'Africa/Casablanca', offset: 1 }, // UTC+1
  africa: { name: 'Africa/Cairo', offset: 2 }, // Using Egypt timezone for Africa as specified
};

const SHIFT_TIMES = {
  Day: { start: 8, end: 20 },      // 08:00 - 20:00
  Afternoon: { start: 12, end: 0 }, // 12:00 - 00:00
  Night: { start: 20, end: 8 }     // 20:00 - 08:00
};

const getCountryOffset = (country: string): number => {
  const lowercaseCountry = country.toLowerCase();
  return TIME_ZONES[lowercaseCountry as keyof typeof TIME_ZONES]?.offset || TIME_ZONES.egypt.offset;
};

export const getTimeZone = (country: string): string => {
  const lowercaseCountry = country.toLowerCase();
  return TIME_ZONES[lowercaseCountry as keyof typeof TIME_ZONES]?.name || TIME_ZONES.egypt.name;
};

export const formatTimeSlot = (hour: number): string => {
  // Convert 24 to 00 for midnight
  const displayHour = hour === 24 ? '00' : hour.toString().padStart(2, '0');
  return `${displayHour}:00`;
};

export const isScheduleExpired = (date: string, timeFrame: string, country: string): boolean => {
  console.log('Checking expiry for:', { date, timeFrame, country });
  
  const scheduleDate = new Date(date);
  const countryOffset = getCountryOffset(country);
  
  // Get current time in country's timezone
  const now = new Date();
  const nowInCountryTime = new Date(now.getTime() + (countryOffset * 60 * 60 * 1000));
  
  console.log('Times:', {
    scheduleDate: scheduleDate.toISOString(),
    nowInCountryTime: nowInCountryTime.toISOString()
  });

  // First check if the schedule date is in the future
  const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
  const todayDateOnly = new Date(nowInCountryTime.getFullYear(), nowInCountryTime.getMonth(), nowInCountryTime.getDate());
  
  console.log('Date comparison:', {
    scheduleDateOnly: scheduleDateOnly.toISOString(),
    todayDateOnly: todayDateOnly.toISOString(),
    isFuture: scheduleDateOnly > todayDateOnly
  });

  // If schedule is for a future date, it's not expired
  if (scheduleDateOnly > todayDateOnly) {
    console.log('Schedule is in the future, not expired');
    return false;
  }
  
  // Get the end time for the shift
  const shift = SHIFT_TIMES[timeFrame as keyof typeof SHIFT_TIMES];
  const shiftEnd = shift.end;
  console.log('Shift end hour:', shiftEnd);
  
  // Set the schedule end time
  const scheduleEndTime = new Date(scheduleDate);
  scheduleEndTime.setUTCHours(shiftEnd - countryOffset, 0, 0, 0);
  
  // Handle shifts that cross midnight
  if (shift.start > shift.end && shiftEnd < 12) {
    scheduleEndTime.setDate(scheduleEndTime.getDate() + 1);
  }
  
  // Add 1 hour for expiry
  const expiryTime = addHours(scheduleEndTime, 1);
  
  // Convert expiry time to country timezone for comparison
  const expiryInCountryTime = new Date(expiryTime.getTime() + (countryOffset * 60 * 60 * 1000));
  
  console.log('Final times:', {
    scheduleEndTime: scheduleEndTime.toISOString(),
    expiryTime: expiryTime.toISOString(),
    expiryInCountryTime: expiryInCountryTime.toISOString(),
    isExpired: nowInCountryTime > expiryInCountryTime
  });

  return nowInCountryTime > expiryInCountryTime;
};
