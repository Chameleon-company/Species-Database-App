import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { CloudUpload } from "lucide-react";
import { cn } from "@sda/ui/lib/utils";

type FileDropzoneProps = {
  accept: string;
  onFile: (file: File) => void;
  title: ReactNode;
  dropTitle: ReactNode;
  hint: ReactNode;
  disabled?: boolean;
};

/** Click or drop target that reports the first chosen file and then resets its input. */
export default function FileDropzone({ accept, onFile, title, dropTitle, hint, disabled = false }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    handleDrag(e);
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-60",
        dragActive ? "border-primary bg-accent" : "border-border bg-brand-subtle hover:bg-accent"
      )}
    >
      <CloudUpload className="size-6.5 text-brand-accent" />
      <span className="mt-1 text-compact font-semibold text-foreground">{dragActive ? dropTitle : title}</span>
      <span className="text-label font-normal tracking-normal text-muted-foreground">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
