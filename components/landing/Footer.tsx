import { AssetImage } from "@/components/AssetImage";
import { applications, projects } from "@/lib/projects";
import { contact, github } from "@/lib/site";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div className="house">
            <AssetImage file="sternbild-logo.svg" />
            <span className="house-text">
              <span className="house-name">STERNBILD</span>
              <span className="house-url">sternbild.org</span>
            </span>
          </div>
          <div className="cols">
            <div>
              <span className="col-h">Apps</span>
              {applications.map(key => {
                const project = projects[key];
                return <a key={key} href={project.href}>{project.name}</a>;
              })}
            </div>
            <div>
              <span className="col-h">Sternbild</span>
              <a href={github}>GitHub ↗</a>
              <a href={contact}>Contact</a>
            </div>
          </div>
        </div>
        <div className="colophon">© 2026 Ahmed Khan</div>
      </div>
    </footer>
  );
}
