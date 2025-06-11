/**
 * ExerciseTableInline - Refactored Component
 * 
 * This file now imports the refactored component to maintain backward compatibility
 * while using the new modular architecture.
 * 
 * The original 1,047-line file has been broken down into:
 * - ExerciseTableHeader.tsx (47 lines)
 * - ExerciseTableRow.tsx (124 lines) 
 * - ExerciseEditRow.tsx (200 lines)
 * - ExerciseDropdown.tsx (85 lines)
 * - exercise-table-utils.ts (50 lines)
 * - ExerciseTableInlineRefactored.tsx (320 lines)
 * 
 * Total: ~826 lines across 6 focused files vs 1,047 lines in 1 file
 */
import ExerciseTableInlineRefactored from "./exercise-table/ExerciseTableInlineRefactored";

// Re-export the refactored component as the default export
// This maintains backward compatibility with existing imports
export default ExerciseTableInlineRefactored;