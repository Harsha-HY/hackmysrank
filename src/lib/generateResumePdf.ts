// Generates a PDF Blob from a built_resume JSON object using html2pdf.js.
// Renders an offscreen DOM node, prints to PDF, then cleans up.

type BuiltResume = {
  fullName?: string;
  headline?: string;
  phone?: string;
  email?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  photoUrl?: string; // signed url
  summary?: string;
  experiences?: Array<{ company?: string; title?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }>;
  education?: Array<{ school?: string; degree?: string; field?: string; startYear?: string; endYear?: string; grade?: string }>;
  skills?: string[];
  projects?: Array<{ name?: string; description?: string; stack?: string; github?: string; demo?: string }>;
  certs?: Array<{ name?: string; issuer?: string; year?: string }>;
};

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function fmtMonth(iso?: string): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  if (!y) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m ? months[parseInt(m, 10) - 1] : ""} ${y}`.trim();
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `
    <section style="margin-bottom:14px">
      <h2 style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#666;text-transform:uppercase;margin:0 0 6px;border-bottom:1px solid #eee;padding-bottom:3px">${title}</h2>
      ${body}
    </section>`;
}

export function buildResumeHTML(r: BuiltResume): string {
  const contact = [r.email, r.phone, r.location].filter(Boolean).map(esc).join(" • ");
  const links = [
    r.linkedin && `LinkedIn: ${esc(r.linkedin)}`,
    r.github && `GitHub: ${esc(r.github)}`,
    r.portfolio && `Portfolio: ${esc(r.portfolio)}`,
  ].filter(Boolean).join(' <span style="color:#888">•</span> ');

  const header = `
    <header style="display:flex;align-items:flex-start;gap:16px;margin-bottom:8px">
      ${r.photoUrl ? `<img src="${esc(r.photoUrl)}" crossorigin="anonymous" style="height:80px;width:80px;border-radius:50%;object-fit:cover;border:1px solid #ddd" />` : ""}
      <div style="flex:1">
        <h1 style="font-size:28px;font-weight:800;line-height:1.1;margin:0">${esc(r.fullName) || "Your Name"}</h1>
        ${r.headline ? `<p style="font-size:13px;color:#444;margin:4px 0 0">${esc(r.headline)}</p>` : ""}
        ${contact ? `<p style="font-size:11px;color:#555;margin:6px 0 0">${contact}</p>` : ""}
        ${links ? `<p style="font-size:11px;color:#0a66c2;margin:2px 0 0">${links}</p>` : ""}
      </div>
    </header>
    <hr style="border:0;border-top:1px solid #ddd;margin:8px 0 14px" />`;

  const summary = r.summary ? section("Summary", `<p style="font-size:11.5px;line-height:1.5;margin:0">${esc(r.summary)}</p>`) : "";

  const experiences = (r.experiences || []).length
    ? section("Experience", (r.experiences || []).map((e) => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <div><strong style="font-size:12.5px">${esc(e.company) || "Company"}</strong><span style="font-size:11.5px;color:#444"> — ${esc(e.title) || "Title"}</span></div>
            <span style="font-size:10.5px;color:#666">${fmtMonth(e.startDate)} – ${e.current ? "Present" : fmtMonth(e.endDate)}</span>
          </div>
          ${e.description ? `<ul style="margin:4px 0 0;padding-left:16px;font-size:11px;line-height:1.45">${
            e.description.split(/\n+/).filter(Boolean).map((line) => `<li>${esc(line.replace(/^\s*[-•*\d.)]+\s*/, ""))}</li>`).join("")
          }</ul>` : ""}
        </div>`).join(""))
    : "";

  const education = (r.education || []).length
    ? section("Education", (r.education || []).map((ed) => `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:11.5px">
          <div>
            <strong>${esc(ed.school) || "School"}</strong>
            <div style="color:#444">${esc(ed.degree)}${ed.field ? `, ${esc(ed.field)}` : ""}${ed.grade ? ` — ${esc(ed.grade)}` : ""}</div>
          </div>
          <span style="font-size:10.5px;color:#666">${esc(ed.startYear)} – ${esc(ed.endYear)}</span>
        </div>`).join(""))
    : "";

  const skills = (r.skills || []).length
    ? section("Skills", `<p style="font-size:11.5px;line-height:1.6;margin:0">${(r.skills || []).map(esc).join(" • ")}</p>`)
    : "";

  const projects = (r.projects || []).length
    ? section("Projects", (r.projects || []).map((p) => `
        <div style="margin-bottom:8px;font-size:11.5px">
          <strong>${esc(p.name) || "Project"}</strong>${p.stack ? `<span style="color:#666"> — ${esc(p.stack)}</span>` : ""}
          ${p.description ? `<p style="margin:2px 0 0;line-height:1.45">${esc(p.description)}</p>` : ""}
          ${(p.github || p.demo) ? `<p style="font-size:10.5px;color:#0a66c2;margin:2px 0 0">${
            [p.github && `GitHub: ${esc(p.github)}`, p.demo && `Demo: ${esc(p.demo)}`].filter(Boolean).join(' <span style="color:#888">•</span> ')
          }</p>` : ""}
        </div>`).join(""))
    : "";

  const certs = (r.certs || []).length
    ? section("Certifications", (r.certs || []).map((c) => `
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span><strong>${esc(c.name)}</strong>${c.issuer ? ` — ${esc(c.issuer)}` : ""}</span>
          <span style="color:#666">${esc(c.year)}</span>
        </div>`).join(""))
    : "";

  return `
    <div style="font-family:Inter,Calibri,Arial,sans-serif;color:#1a1a1a;background:#fff;padding:32px;width:8.5in;min-height:11in;box-sizing:border-box">
      ${header}${summary}${experiences}${education}${skills}${projects}${certs}
    </div>`;
}

export async function generateResumePdfBlob(resume: BuiltResume): Promise<Blob> {
  const html2pdf = (await import("html2pdf.js")).default;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.innerHTML = buildResumeHTML(resume);
  document.body.appendChild(container);
  try {
    const worker: any = (html2pdf as any)()
      .set({
        margin: 0,
        filename: `${(resume.fullName || "Resume").replace(/\s+/g, "_")}_HireZap.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(container.firstElementChild as HTMLElement);
    const blob: Blob = await worker.outputPdf("blob");
    return blob;
  } finally {
    container.remove();
  }
}
