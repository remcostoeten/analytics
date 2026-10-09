import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid gap-3">
      <h1 className="text-base font-medium">Not found</h1>
      <p className="text-muted text-sm">There is no project with that id.</p>
      <Link href="/" className="caps text-fg">
        Back to home
      </Link>
    </section>
  );
}
