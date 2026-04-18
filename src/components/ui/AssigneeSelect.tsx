import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Assignee } from "@/hooks/useAssignees";
import { cn } from "@/lib/utils";
import { PlusCircle, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface AssigneeSelectProps {
  assignees: Assignee[];
  value: string;
  onChange: (name: string) => void;
  onCreateAssignee: (name: string) => Promise<Assignee>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AssigneeSelect({
  assignees,
  value,
  onChange,
  onCreateAssignee,
  placeholder,
  disabled = false,
  className,
}: AssigneeSelectProps) {
  const { t } = useTranslation("common");
  const resolvedPlaceholder = placeholder ?? t("pickers.selectAssignee");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = assignees.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const exactMatch = assignees.some((a) => a.name.toLowerCase() === search.trim().toLowerCase());
  const showCreate = search.trim().length > 0 && !exactMatch;

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!search.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const newAssignee = await onCreateAssignee(search.trim());
      onChange(newAssignee.name);
      setSearch("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to create assignee:", err);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal bg-surface-input border-glass hover:bg-surface-hover-strong hover:text-foreground h-9",
            !value && "text-muted-foreground",
            className,
          )}
        >
          {value ? (
            <span className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 opacity-50" />
              {value}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 opacity-50" />
              {resolvedPlaceholder}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 glass-panel border-glass shadow-float"
        align="start"
      >
        <div className="p-2 border-b border-glass">
          <Input
            ref={inputRef}
            placeholder={t("pickers.searchOrCreate")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreate) {
                e.preventDefault();
                handleCreate();
              }
            }}
            className="bg-surface-input border-glass text-sm h-8"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.length === 0 && !showCreate && (
            <div className="text-xs text-muted-foreground text-center py-4">No matching assignees.</div>
          )}
          {filtered.map((assignee) => {
            const isSelected = assignee.name === value;
            return (
              <button
                key={assignee.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-surface-hover text-foreground",
                )}
                onClick={() => handleSelect(assignee.name)}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-surface-hover-strong text-muted-foreground",
                  )}
                >
                  {assignee.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{assignee.name}</span>
              </button>
            );
          })}
          {showCreate && (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors hover:bg-surface-hover text-primary"
              onClick={handleCreate}
              disabled={isCreating}
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {isCreating ? t("pickers.creating") : t("pickers.createItem", { name: search.trim() })}
              </span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
