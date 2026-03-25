import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, PlusCircle, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/hooks/useCategories";

interface CategoryMultiSelectProps {
    categories: Category[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    onCreateCategory: (name: string) => Promise<Category>;
    placeholder?: string;
    disabled?: boolean;
}

export function CategoryMultiSelect({
    categories,
    selectedIds,
    onChange,
    onCreateCategory,
    placeholder = "Select categories...",
    disabled = false,
}: CategoryMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const exactMatch = categories.some(
        c => c.name.toLowerCase() === search.trim().toLowerCase()
    );
    const showCreate = search.trim().length > 0 && !exactMatch;

    const selectedCategories = categories.filter(c => selectedIds.includes(c.id));

    const toggleCategory = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(s => s !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const handleCreate = async () => {
        if (!search.trim() || isCreating) return;
        setIsCreating(true);
        try {
            const newCat = await onCreateCategory(search.trim());
            onChange([...selectedIds, newCat.id]);
            setSearch("");
        } catch (err) {
            console.error("Failed to create category:", err);
        } finally {
            setIsCreating(false);
        }
    };

    const removeCategory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(selectedIds.filter(s => s !== id));
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
                        "w-full justify-start text-left font-normal bg-surface-input border-glass hover:bg-surface-hover-strong hover:text-foreground min-h-[40px] h-auto py-1.5",
                        selectedIds.length === 0 && "text-muted-foreground"
                    )}
                >
                    {selectedCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedCategories.map(cat => (
                                <span
                                    key={cat.id}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-glass"
                                    style={cat.color ? {
                                        backgroundColor: `${cat.color}20`,
                                        borderColor: `${cat.color}40`,
                                        color: cat.color,
                                    } : undefined}
                                >
                                    {cat.name}
                                    <X
                                        className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100"
                                        onClick={(e) => removeCategory(cat.id, e)}
                                    />
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Tag className="w-4 h-4 opacity-50" />
                            {placeholder}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 glass-panel border-glass shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
                align="start"
            >
                <div className="p-2 border-b border-glass">
                    <Input
                        ref={inputRef}
                        placeholder="Search or create..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => {
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
                        <div className="text-xs text-muted-foreground text-center py-4">
                            {categories.length === 0
                                ? "No categories yet. Type to create one."
                                : "No matching categories."}
                        </div>
                    )}
                    {filtered.map(cat => {
                        const isSelected = selectedIds.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                                    isSelected
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-surface-hover text-foreground"
                                )}
                                onClick={() => toggleCategory(cat.id)}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                                    isSelected ? "bg-primary border-primary" : "border-glass"
                                )}>
                                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                </div>
                                {cat.color && (
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                )}
                                <span className="truncate">{cat.name}</span>
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
                                {isCreating ? "Creating..." : `Create "${search.trim()}"`}
                            </span>
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
