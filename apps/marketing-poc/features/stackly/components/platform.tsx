import { Button, Dim, Eyebrow, Heading } from "./primitives";
import { Reveal } from "./reveal";

export function Platform() {
  return (
    <section className="relative overflow-hidden px-8 py-28">
      <div className="dust dust-right pointer-events-none absolute right-0 bottom-0 h-[380px] w-[520px]" />
      <Reveal className="relative mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <Eyebrow>The platform</Eyebrow>
          <div className="mt-3">
            <Heading>
              <Dim>Plan in minutes.</Dim>
              <br />
              <Dim>Adjust in seconds.</Dim> Ship with
              <br />
              confidence <Dim>at any scale.</Dim>
            </Heading>
          </div>
        </div>
        <div className="lg:pb-3">
          <p className="max-w-sm text-[17px] leading-[1.5] text-mist">
            A workspace that moves with your team. Track every change, then ship the version your
            users actually asked for.
          </p>
          <div className="mt-8 flex gap-3">
            <Button tone="metal">Start for free</Button>
            <Button tone="dark" arrow>
              Talk to sales
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
