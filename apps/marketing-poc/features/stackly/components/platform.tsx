import { Button, Eyebrow, Heading } from "./primitives";

export function Platform() {
  return (
    <section className="frame-vignette border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow>The platform</Eyebrow>
          <div className="mt-4">
            <Heading>
              Plan in minutes.
              <br />
              Adjust in seconds. Ship with
              <br />
              <span className="text-mist">confidence at any scale.</span>
            </Heading>
          </div>
        </div>
        <div className="lg:pb-2">
          <p className="max-w-sm text-mist">
            A workspace that moves with your team. Track every change, then ship the version your
            users actually asked for.
          </p>
          <div className="mt-8 flex gap-3">
            <Button tone="light">Start for free</Button>
            <Button tone="dark" arrow>
              Talk to sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
