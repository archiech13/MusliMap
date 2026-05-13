export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-12 overflow-y-auto">
      {children}
    </div>
  );
}
