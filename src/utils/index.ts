import { TimeSlot } from '../types';

export const timeFramePresets = [
  { label: 'Morning', start: '08:00', end: '16:00' },
  { label: 'Day', start: '09:00', end: '17:00' },
  { label: 'Night', start: '17:00', end: '01:00' },
] as const;

export const countries = ['Egypt', 'Morocco', 'Africa'] as const;

export function generateTimeSlots(startTime: string, endTime: string, intervalHours: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentTime = startTime;

  while (currentTime < endTime) {
    const [hours, minutes] = currentTime.split(':').map(Number);
    let newHours = hours + intervalHours;
    
    // Handle overnight shifts
    if (newHours >= 24) {
      newHours = newHours - 24;
    }
    
    const endTimeSlot = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    slots.push({
      start: currentTime,
      end: endTimeSlot,
    });

    currentTime = endTimeSlot;
  }

  return slots;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function calculateTotalHours(timeSlots: TimeSlot[]): number {
  return timeSlots.reduce((total, slot) => {
    const [startHours, startMinutes] = slot.start.split(':').map(Number);
    const [endHours, endMinutes] = slot.end.split(':').map(Number);
    
    let hours = endHours - startHours;
    const minutes = endMinutes - startMinutes;
    
    // Handle overnight shifts
    if (hours < 0) {
      hours = 24 + hours;
    }
    
    return total + hours + minutes / 60;
  }, 0);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function isOverlappingSchedule(
  date: string,
  startTime: string,
  endTime: string,
  existingSchedules: { date: string; startTime: string; endTime: string }[]
): boolean {
  const newStart = new Date(`${date}T${startTime}`);
  const newEnd = new Date(`${date}T${endTime}`);

  return existingSchedules.some(schedule => {
    const scheduleDate = new Date(schedule.date);
    if (scheduleDate.toDateString() !== new Date(date).toDateString()) {
      return false;
    }

    const existingStart = new Date(`${schedule.date}T${schedule.startTime}`);
    const existingEnd = new Date(`${schedule.date}T${schedule.endTime}`);

    return (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    );
  });
}
