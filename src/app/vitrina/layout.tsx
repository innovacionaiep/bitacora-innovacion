export default function VitrinaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-white">{children}</div>
  );
}
