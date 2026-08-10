/**
 * Auth pages layout — no QueryProvider / ConditionalLayout / Chat.
 * Root SessionProvider still wraps this tree.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
