"use client";

type UploadZoneProps = {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
};

export function UploadZone({ onFileSelect, isProcessing }: UploadZoneProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }

  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition ${
        isProcessing
          ? "border-slate-300 bg-slate-50"
          : "border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50/40"
      }`}
    >
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={isProcessing}
        onChange={handleChange}
      />
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-base font-medium text-slate-800">
        Drop isometric PDF or PNG
      </p>
      <p className="mt-1 text-sm text-slate-500">
        All drawings are processed with OCR — PDF, PNG, or JPG.
      </p>
    </label>
  );
}
