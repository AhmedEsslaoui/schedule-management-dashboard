export interface Employee {
  id: string;
  fullName: string;
  email: string;
  country: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface ScheduleCell {
  employeeId: string;
  task?: string;
}

export interface Schedule {
  id: string;
  date: string;
  timeFrame: string;
  startTime: string;
  endTime: string;
  interval: number;
  seniorName: string;
  country: string;
  status: 'draft' | 'published';
  timeSlots: TimeSlot[];
  assignments: Record<string, ScheduleCell[]>;
}

export type Country = 'Egypt' | 'Morocco' | 'Africa';

export interface AnalyticsData {
  employeeHours: {
    name: string;
    hours: number;
  }[];
  countryDistribution: {
    name: string;
    value: number;
  }[];
  timeFrameDistribution: {
    name: string;
    schedules: number;
  }[];
}
