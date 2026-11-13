import { AssetImage } from "@/components/AssetImage";
import { projects, type ProjectKey } from "@/lib/projects";

/** The mark's file name, without the query that refreshes caches on the landing page. */
export const markFile = (key: ProjectKey) => projects[key].mark.split("?")[0];

/** A register of marks: each with its name, its role and its file. */
export function MarkList({ keys, className }: { keys: ProjectKey[]; className?: string }) {
  return (
    <ul className={className ? `cols marks ${className}` : "cols marks"}>
      {keys.map(key => (
        <li key={key}>
          <AssetImage file={markFile(key)} />
          <span className="name">{projects[key].name}</span>
          <span className="role">{projects[key].role}</span>
          <span className="file">{markFile(key)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Every mark at 32 px, to check that it still reads. */
export function SmallMarks({ keys }: { keys: ProjectKey[] }) {
  return (
    <ul className="small-marks" aria-label="The marks at 32 pixels">
      {keys.map(key => (
        <li key={key}>
          <AssetImage file={markFile(key)} alt={projects[key].name} />
        </li>
      ))}
    </ul>
  );
}
