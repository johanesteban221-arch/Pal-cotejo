import Nav from "../../components/Nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
