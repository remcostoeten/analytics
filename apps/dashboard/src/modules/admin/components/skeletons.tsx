import { Bone } from "@/modules/shell/components/skeletons";
import { Heading } from "@/shared/ui/heading";

type Field = { label: string; control: number; help?: boolean };

const projectFields: Field[] = [
  { label: "Domain", control: 38, help: true },
  { label: "Project id", control: 38, help: true },
  { label: "Name", control: 38, help: true },
  { label: "Visibility", control: 38 },
  { label: "Allowed origins", control: 80, help: true },
];

const tokenFields: Field[] = [
  { label: "Name", control: 38, help: true },
  { label: "Scope", control: 38 },
  { label: "Projects", control: 80, help: true },
  { label: "Expires on", control: 38, help: true },
];

const settingsFields = [61, 61, 125, 83, 138];
const keyCards = [144, 94, 136];

function FormSkeleton({ fields, button }: { fields: Field[]; button: number }) {
  return (
    <div className="grid max-w-xl gap-5" aria-hidden="true">
      {fields.map((field) => (
        <div key={field.label} className="grid gap-1.5">
          <span className="caps text-muted">{field.label}</span>
          <Bone height={field.control} />
          {field.help ? <Bone width={260} height={16} /> : null}
        </div>
      ))}
      <Bone width={button} height={32} />
    </div>
  );
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="card divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="grid gap-0.5">
            <Bone width={120} height={20} />
            <Bone width={80} height={16} />
          </span>
          <Bone width={130} height={17} />
        </li>
      ))}
    </ul>
  );
}

/**
 * @name AdminProjectsSkeleton
 * @description The project list in the admin module before it is read.
 *
 * @example
 * <AdminProjectsSkeleton />
 */
export function AdminProjectsSkeleton() {
  return (
    <>
      <Heading title="Projects">
        <Bone width={103} height={32} />
      </Heading>
      <RowsSkeleton rows={3} />
    </>
  );
}

/**
 * @name AdminProjectSkeleton
 * @description One project's settings, connection and keys before the project is read.
 *
 * @example
 * <AdminProjectSkeleton />
 */
export function AdminProjectSkeleton() {
  return (
    <>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <Bone width={160} height={32} />
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-hidden="true">
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted">Settings</h2>
          <div className="grid gap-5">
            {settingsFields.map((height, index) => (
              <Bone key={index} height={height} />
            ))}
            <Bone width={64} height={32} />
          </div>
        </section>
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted">Connection</h2>
          <Bone height={20} />
          <h2 className="caps text-muted">Keys</h2>
          <div className="grid gap-4">
            {keyCards.map((height, index) => (
              <Bone key={index} height={height} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * @name NewProjectSkeleton
 * @description The new project form before access is checked.
 *
 * @example
 * <NewProjectSkeleton />
 */
export function NewProjectSkeleton() {
  return (
    <>
      <Heading title="New project" />
      <FormSkeleton fields={projectFields} button={100} />
    </>
  );
}

/**
 * @name TokensSkeleton
 * @description The API token list and form before the tokens are read.
 *
 * @example
 * <TokensSkeleton />
 */
export function TokensSkeleton() {
  return (
    <>
      <Heading title="API tokens" />
      <p className="max-w-xl text-sm text-muted">
        For scripts, CI, the docs query page and other frontends. Sites send events with their
        project keys, not with a token.
      </p>
      <RowsSkeleton rows={2} />
      <section className="grid gap-4">
        <h2 className="caps text-muted">New token</h2>
        <FormSkeleton fields={tokenFields} button={110} />
      </section>
    </>
  );
}
