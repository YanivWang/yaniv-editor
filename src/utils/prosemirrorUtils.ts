/**
 * ProseMirror Utilities
 * @description Shared utility functions for ProseMirror operations
 */

/**
 * Validate selection range against document
 * @param selection - The selection range to validate
 * @param docSize - The document content size
 * @returns True if selection is valid
 */
export function isValidSelection(
  selection: { from: number; to: number },
  docSize: number,
): boolean {
  return (
    selection.from >= 0 &&
    selection.to >= 0 &&
    selection.from <= docSize &&
    selection.to <= docSize &&
    selection.from <= selection.to
  );
}
