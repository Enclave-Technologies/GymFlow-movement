export interface Exercise {
  id: string;
  order: string;
  motion: string;
  targetArea: string;
  description: string;
  sets?: string;
  reps?: string;
  tut?: string;
  tempo?: string;
  rest?: string;
  additionalInfo?: string;
  duration?: number;
}

export interface Session {
  id: string;
  name: string;
  duration: number;
  exercises: Exercise[];
  isExpanded: boolean;
}

export interface Phase {
  id: string;
  name: string;
  isActive: boolean;
  sessions: Session[];
  isExpanded: boolean;
}

export interface DraggableSessionProps {
  phase: Phase;
  session: Session;
  index: number;
  toggleSessionExpansion: (phaseId: string, sessionId: string) => void;
  deleteSession: (phaseId: string, sessionId: string) => void;
  duplicateSession: (phaseId: string, sessionId: string) => void;
  addExercise: (phaseId: string, sessionId: string) => void;
  startSession: (sessionId: string, phaseId: string) => void;
  saveSession: (phaseId: string, sessionId: string) => void;
  startingSessionId: string | null;
  savingSessionId: string | null;
  startEditSession: (sessionId: string, name: string) => void;
  moveSession: (phaseId: string, dragIndex: number, hoverIndex: number) => void;
  renderExercisesTable: (phase: Phase, session: Session) => React.ReactNode;
  editingSession: string | null;
  editSessionValue: string;
  saveSessionEdit: () => void;
  setEditSessionValue: (value: string) => void;
}

export interface DragItem {
    id: string;
    index: number;
    phaseId: string;
    type: string;
  }
