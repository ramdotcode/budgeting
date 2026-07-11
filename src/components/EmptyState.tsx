export default function EmptyState({
  icon,
  message,
  children,
}: {
  icon: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm text-gray-500">{message}</p>
      {children}
    </div>
  );
}
