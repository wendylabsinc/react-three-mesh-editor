import { Box, Pencil, Grid3X3, Minus, Triangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { cn } from '../lib/utils';
import type { EditorMode, EditMode } from '../types';

export interface MeshEditorMenuBarProps {
  mode: EditorMode;
  editMode: EditMode;
  onModeChange: (mode: EditorMode) => void;
  onEditModeChange: (editMode: EditMode) => void;
  className?: string;
}

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

  const handleEditModeChange = (value: string) => {
    if (value) {
      onEditModeChange(value as EditMode);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-md border bg-background p-2 shadow-sm',
        className
      )}
    >
      {/* Mode Select */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Mode:</span>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="object">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                <span>Object Mode</span>
              </div>
            </SelectItem>
            <SelectItem value="edit">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                <span>Edit Mode</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Edit Mode Toggle Group - Only visible in Edit Mode */}
      {mode === 'edit' && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Selection:
            </span>
            <ToggleGroup
              type="single"
              value={editMode}
              onValueChange={handleEditModeChange}
              variant="outline"
            >
              <ToggleGroupItem value="vertex" aria-label="Vertex mode">
                <Grid3X3 className="mr-1 h-4 w-4" />
                Vertex
              </ToggleGroupItem>
              <ToggleGroupItem value="edge" aria-label="Edge mode">
                <Minus className="mr-1 h-4 w-4" />
                Edge
              </ToggleGroupItem>
              <ToggleGroupItem value="face" aria-label="Face mode">
                <Triangle className="mr-1 h-4 w-4" />
                Face
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </>
      )}
    </div>
  );
}
