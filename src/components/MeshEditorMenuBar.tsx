import { Box, Pencil, Grid3X3, Minus, Triangle } from 'lucide-react';
import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarShortcut,
  MenubarTrigger,
} from './ui/menubar';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import { cn } from '../lib/utils';
import type { EditorMode, EditMode } from '../types';

/**
 * Props for the MeshEditorMenuBar component.
 */
export interface MeshEditorMenuBarProps {
  /** Current editor mode (object or edit) */
  mode: EditorMode;
  /** Current edit sub-mode (vertex, edge, or face) */
  editMode: EditMode;
  /** Callback when editor mode changes */
  onModeChange: (mode: EditorMode) => void;
  /** Callback when edit sub-mode changes */
  onEditModeChange: (editMode: EditMode) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A shadcn-styled menu bar for the mesh editor.
 *
 * Provides a Mode menu for switching between object/edit modes and
 * a ButtonGroup for selecting the edit sub-mode (vertex, edge, face).
 *
 * @example
 * ```tsx
 * <MeshEditorMenuBar
 *   mode="edit"
 *   editMode="vertex"
 *   onModeChange={setMode}
 *   onEditModeChange={setEditMode}
 * />
 * ```
 */
export function MeshEditorMenuBar({
  mode,
  editMode,
  onModeChange,
  onEditModeChange,
  className,
}: MeshEditorMenuBarProps) {
  const handleModeChange = (value: string) => {
    onModeChange(value as EditorMode);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Mode Menu */}
      <Menubar className="border-none shadow-none bg-transparent p-0">
        <MenubarMenu>
          <MenubarTrigger className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
            {mode === 'object' ? (
              <Box className="mr-2 h-4 w-4" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            {mode === 'object' ? 'Object Mode' : 'Edit Mode'}
          </MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={mode} onValueChange={handleModeChange}>
              <MenubarRadioItem value="object">
                <Box className="mr-2 h-4 w-4" />
                Object Mode
                <MenubarShortcut>Tab</MenubarShortcut>
              </MenubarRadioItem>
              <MenubarRadioItem value="edit">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Mode
                <MenubarShortcut>Tab</MenubarShortcut>
              </MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Selection ButtonGroup - Only visible in Edit Mode */}
      {mode === 'edit' && (
        <ButtonGroup>
          <Button
            variant={editMode === 'vertex' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onEditModeChange('vertex')}
            aria-label="Vertex mode"
          >
            <Grid3X3 className="mr-1 h-4 w-4" />
            Vertex
          </Button>
          <Button
            variant={editMode === 'edge' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onEditModeChange('edge')}
            aria-label="Edge mode"
          >
            <Minus className="mr-1 h-4 w-4" />
            Edge
          </Button>
          <Button
            variant={editMode === 'face' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onEditModeChange('face')}
            aria-label="Face mode"
          >
            <Triangle className="mr-1 h-4 w-4" />
            Face
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
}
