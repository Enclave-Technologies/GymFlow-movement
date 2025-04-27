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
    duration: number;
}

export interface Session {
    id: string;
    name: string;
    duration: number;
    isExpanded: boolean;
    exercises: Exercise[];
}

export interface Phase {
    id: string;
    name: string;
    isActive: boolean;
    isExpanded: boolean;
    sessions: Session[];
}
