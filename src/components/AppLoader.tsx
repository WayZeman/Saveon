export function AppLoader({ className = "min-h-[40vh]" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="loader-spinner" role="status" aria-label="Loading" />
    </div>
  );
}
