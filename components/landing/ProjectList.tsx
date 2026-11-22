import { AssetImage } from "@/components/AssetImage";
import type { Project } from "@/lib/projects";

/** One ruled section of the page, with its bronze label. */
export function IndexSection({ id, className, label, children }: { id: string; className: string; label: string; children: React.ReactNode }) {
  return (
    <section className={className} id={id}>
      <div className="wrap">
        <div className="label">
          <span className="eyebrow">{label}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

function Entry({ project, size, kicker }: { project: Project; size: string; kicker?: string }) {
  return (
    <>
      <AssetImage file={project.mark} width={size} height={size} />
      {kicker ? <span className="kicker">{kicker}</span> : null}
      <span className="name">{project.name}</span>
      <span className="role">{project.role}</span>
      <span className="desc">{project.description}</span>
      {project.href ? <span className="url">{new URL(project.href).host} ↗</span> : null}
    </>
  );
}

/** The entry, as a link to the project's own site when it has one; the whole entry is the link. */
function Linked({ project, size, kicker }: { project: Project; size: string; kicker?: string }) {
  return project.href ? (
    <a className="card" href={project.href}>
      <Entry project={project} size={size} kicker={kicker} />
    </a>
  ) : (
    <Entry project={project} size={size} kicker={kicker} />
  );
}

/**
 * A lead project on its own row, then the others side by side. Each entry shows the mark, the name and the subtitle
 * under it; `kicker` adds a label above the name, which the applications leave out.
 */
export function ProjectList({ lead, rest, kicker }: { lead: Project; rest: Project[]; kicker?: string }) {
  return (
    <ul className="projects">
      <li className="lead">
        <Linked project={lead} size="128" kicker={kicker} />
      </li>
      {rest.map(project => (
        <li key={project.name}>
          <Linked project={project} size="88" kicker={kicker} />
        </li>
      ))}
    </ul>
  );
}
