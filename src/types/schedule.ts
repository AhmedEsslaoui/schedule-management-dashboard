export type TaskType = 
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
  | '-'
  | 'Sick'
  | 'No Show';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  taskType: TaskType;
  hasBreak?: boolean;
}

export interface AgentSchedule {
  agentId: string;
  agentName: string;
  timeSlots: TimeSlot[];
  hasBreak?: boolean;  // Track if agent has been assigned a break
}

export interface Schedule {
  id?: string;
  title: string;
  date: string;
  agents: AgentSchedule[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface AgentDistribution {
  country: 'Egypt' | 'Morocco' | 'Africa';
  tasks: {
    Chat: number;
    Email: number;
    Call: number;
  };
  total: number;
}

// Helper function to check if a break can be assigned
export function canAssignBreak(
  schedule: Schedule,
  timeSlot: string,
  agentId: string
): boolean {
  // Check if any other agent has break at this time
  const hasBreakConflict = schedule.agents.some(agent => 
    agent.agentId !== agentId && 
    agent.timeSlots.some(slot => 
      slot.hasBreak && 
      `${slot.startTime}-${slot.endTime}` === timeSlot
    )
  );

  return !hasBreakConflict;
}

export function getCurrentTimeSlot(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes() >= 30 ? '30' : '00';
  return `${hours}:${minutes}`;
}

export function isAgentOnTask(timeSlots: TimeSlot[], taskType: TaskType, currentTime: string): boolean {
  return timeSlots.some(slot => {
    const start = slot.startTime;
    const end = slot.endTime;
    return (
      currentTime >= start &&
      currentTime < end &&
      (
        slot.taskType === taskType ||
        (taskType === 'Chat' && slot.taskType.includes('Chat'))
      )
    );
  });
}
