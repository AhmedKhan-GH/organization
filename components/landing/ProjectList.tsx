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

function Entry({ project, size }: { project: Project; size: string }) {
  return (
    <>
      <AssetImage file={project.mark} width={size} height={size} />
      <span className="kicker">Project</span>
      <span className="name">{project.name}</span>
      <span className="role">{project.role}</span>
      <span className="desc">{project.description}</span>
    </>
  );
}

/**
 * A lead project on its own row, then the others side by side. A project with its own site links to it; the whole
 * entry is the link.
 */
export function ProjectList({ lead, rest }: { lead: Project; rest: Project[] }) {
  return (
    <ul className="projects">
      <li className="lead">
        <Entry project={lead} size="128" />
      </li>
      {rest.map(project => (
        <li key={project.name}>
          {project.href ? (
            <a className="card" href={project.href}>
              <Entry project={project} size="88" />
            </a>
          ) : (
            <Entry project={project} size="88" />
          )}
        </li>
      ))}
    </ul>
  );
}
