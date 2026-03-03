// Override do admin layout para a página de login (sem nav)
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
