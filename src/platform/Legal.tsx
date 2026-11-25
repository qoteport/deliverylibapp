import React, { useEffect } from "react";
import content from "./legal-content.json";
export function LegalPage({ privacy = false }: { privacy?: boolean }) {
  const page = privacy ? content.privacy : content.terms;
  useEffect(() => {
    const old = document.title;
    document.title = page.title + " | Aura Liberia";
    return () => {
      document.title = old;
    };
  }, [page.title]);
  return (
    <article className="a-page a-legal">
      <span className="a-eyebrow">
        AURA LIBERIA · YOUR INFORMATION & YOUR CHOICES
      </span>
      <h1>{page.title}</h1>
      <p>
        Updated <time dateTime="2026-11-23">{content.updated}</time>
      </p>
      <p className="a-legal-intro">{page.intro}</p>
      <nav
        aria-label="Legal documents"
        className="a-row"
        style={{ flexWrap: "wrap", margin: "24px 0" }}
      >
        <a className="a-button secondary" href="/terms">
          Terms & Conditions
        </a>
        <a className="a-button secondary" href="/privacy">
          Privacy Policy
        </a>
      </nav>
      <nav aria-label="On this page" className="a-card">
        <h2>On this page</h2>
        <ol>
          {page.sections.map((s) => (
            <li key={s.id}>
              <a href={"#" + s.id}>{s.title.replace(/^\d+\. /, "")}</a>
            </li>
          ))}
        </ol>
      </nav>
      {page.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          style={{ scrollMarginTop: 160 }}
        >
          <h2>{section.title}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {"links" in section &&
            (section.links as { label: string; url: string }[]).map((l) => (
              <p key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label} ↗
                </a>
              </p>
            ))}
        </section>
      ))}
      <aside className="a-card">
        <h2>Operator & contact</h2>
        <p>{content.operator}</p>
        {content.contactEmail ? (
          <a href={"mailto:" + content.contactEmail}>{content.contactEmail}</a>
        ) : (
          <p>Operator and privacy contact details are awaiting confirmation.</p>
        )}
      </aside>
      <p>
        <a href="/">Back to Aura</a>
      </p>
    </article>
  );
}
export function LegalLinks() {
  return (
    <nav aria-label="Legal" className="a-legal-links">
      <a href="/terms">Terms & Conditions</a>
      <a href="/privacy">Privacy Policy</a>
    </nav>
  );
}
