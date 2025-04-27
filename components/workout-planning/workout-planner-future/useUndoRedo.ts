import { useState } from "react";
import { Phase } from "../types";

export function useUndoRedo(initialState: Phase[]) {
    const [phases, setPhases] = useState<Phase[]>(initialState);
    const [history, setHistory] = useState<Phase[][]>([]);
    const [future, setFuture] = useState<Phase[][]>([]);
    const [isDirty, setIsDirty] = useState(false);

    const pushHistory = (newPhases: Phase[]) => {
        setHistory((prev) => [...prev, phases]);
        setFuture([]);
        setPhases(newPhases);
        setIsDirty(true);
    };

    const undo = () => {
        if (history.length === 0) return;
        setFuture((f) => [phases, ...f]);
        setPhases(history[history.length - 1]);
        setHistory((h) => h.slice(0, -1));
        setIsDirty(true);
    };

    const redo = () => {
        if (future.length === 0) return;
        setHistory((h) => [...h, phases]);
        setPhases(future[0]);
        setFuture((f) => f.slice(1));
        setIsDirty(true);
    };

    const resetHistory = (newPhases: Phase[]) => {
        setPhases(newPhases);
        setHistory([]);
        setFuture([]);
        setIsDirty(false);
    };

    return {
        phases,
        setPhases,
        history,
        future,
        isDirty,
        setIsDirty,
        pushHistory,
        undo,
        redo,
        resetHistory,
    };
}
