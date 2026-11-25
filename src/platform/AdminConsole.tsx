import { SocialModeration } from "./Social";
import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  ChevronRight,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  UserRound,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import {
  Button,
  Dialog,
  Empty,
  Notice,
  Photo,
  Busy,
  Field,
  Select,
} from "./ui";
import { Row, label } from "./model";
import { usePlatform } from "./context";
export function AdminConsole() {
  const [social, setSocial] = useState(false);
  const session = useRemote("/v1/admin/session"),
    { requireLogin, toast } = usePlatform();
  const [tab, setTab] = useState("applications"),
    [items, setItems] = useState<Row[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [filter, setFilter] = useState("pending"),
    [kind, setKind] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [audit, setAudit] = useState<Row[]>([]);
  const load = async (after?: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await command(
        `/v1/admin/${tab}${after ? "?after=" + encodeURIComponent(after) : ""}`,
      );
      if (tab === "applications") {
        setItems((old) => (after ? [...old, ...data.items] : data.items));
      } else setAudit((old) => (after ? [...old, ...data.items] : data.items));
      setCursor(data.nextCursor);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (session.data) void load();
  }, [!!session.data, tab]);
  if (session.loading) return <Busy text="Checking administrator access..." />;
  if (!session.data)
    return (
      <section className="a-page narrow">
        <div className="a-card">
          <ShieldCheck size={34} />
          <h1>Administrator access</h1>
          <p>
            Use your Aura account with a protected administrator membership.
            Customer and business accounts cannot approve applications.
          </p>
          <Notice error={session.error} />
          <Button
            onClick={async () => {
              if (await requireLogin()) session.reload();
            }}
          >
            Sign in / check access
          </Button>
        </div>
      </section>
    );
  const visible = items.filter(
    (a) =>
      (!filter || a.reviewStatus === filter) &&
      (!kind || a.kind === kind) &&
      `${a.name} ${a.ownerUid} ${a.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="a-page">
      <div className="a-admin-intro">
        <div>
          <span className="a-eyebrow">PLATFORM OPERATIONS</span>
          <h1>
            A clearer view.
            <br />
            Better decisions.
          </h1>
          <p>
            Review businesses, support applicants and keep a record of every
            decision.
          </p>
        </div>
        <div className="a-admin-badge">
          <ShieldCheck size={22} />
          {label(session.data.role)}
        </div>
      </div>
      <div className="a-metrics">
        {[
          [
            "Awaiting review",
            items.filter((a) => a.reviewStatus === "pending").length,
            Clock,
          ],
          [
            "Approved",
            items.filter((a) => a.reviewStatus === "approved").length,
            CheckCircle2,
          ],
          [
            "Changes requested",
            items.filter((a) => a.reviewStatus === "changes_requested").length,
            FileCheck2,
          ],
        ].map(([name, value, Icon]: any) => (
          <div key={name} className="a-card">
            <Icon size={22} />
            <small>{name}</small>
            <strong>{value}</strong>
            <span>In loaded applications</span>
          </div>
        ))}
      </div>
      <div className="a-tabs">
        <Button secondary onClick={() => setSocial(true)}>
          Events & Community
        </Button>
        {social && <SocialModeration onClose={() => setSocial(false)} />}
        <button
          className={tab === "applications" ? "active" : ""}
          onClick={() => setTab("applications")}
        >
          Business applications
        </button>
        <button
          className={tab === "audit" ? "active" : ""}
          onClick={() => setTab("audit")}
        >
          <History size={17} />
          Decision history
        </button>
        <Button secondary onClick={() => load()} disabled={busy}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>
      <Notice error={error} retry={() => load()} />
      {tab === "applications" ? (
        <>
          <div className="a-admin-filters">
            <div className="a-search">
              <Search size={18} />
              <input
                placeholder="Search business, applicant or reference"
                aria-label="Search applications"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              label="Review status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "", label: "All statuses" },
                ...[
                  "pending",
                  "approved",
                  "changes_requested",
                  "rejected",
                  "suspended",
                ].map((v) => ({ value: v, label: label(v) })),
              ]}
            />
            <Select
              label="Business type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "", label: "All business types" },
                ...[
                  "restaurant",
                  "supermarket",
                  "lifestyle",
                  "property",
                  "motors",
                  "driver",
                  "rides",
                ].map((v) => ({ value: v, label: label(v) })),
              ]}
            />
          </div>
          <div className="a-card a-admin-list">
            <div className="a-list-heading">
              <h2>Applications</h2>
              <span>{visible.length} shown</span>
            </div>
            {!visible.length && !busy ? (
              <Empty title="No applications match">
                <p>Change the filters or load the next page.</p>
              </Empty>
            ) : (
              visible.map((a) => (
                <button
                  className="a-review-row"
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                >
                  <span className="a-business-mark">
                    {String(a.name || "B").slice(0, 1)}
                  </span>
                  <span>
                    <strong>{a.name}</strong>
                    <small>
                      {label(a.kind)} · {a.id}
                    </small>
                  </span>
                  <span className={`a-status ${a.reviewStatus}`}>
                    {label(a.reviewStatus)}
                  </span>
                  <ChevronRight size={19} />
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="a-card">
          <h2>Decision history</h2>
          {audit.map((a) => (
            <article key={a.id} className="a-audit">
              <div>
                <strong>
                  {label(a.action)} · {a.applicationId}
                </strong>
                <span className={`a-status ${a.status}`}>
                  {label(a.status)}
                </span>
              </div>
              <p>{a.reason || "Approved after review"}</p>
              <small>
                {new Date(a.createdAt).toLocaleString()} · Administrator{" "}
                {a.actorUid}
              </small>
            </article>
          ))}
          {!audit.length && !busy && <Empty title="No decisions yet" />}
        </div>
      )}
      {busy && <Busy />}
      {cursor && (
        <Button secondary disabled={busy} onClick={() => load(cursor)}>
          Load more
        </Button>
      )}
      {selected && (
        <ApplicationReview
          id={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            toast("Decision saved. The applicant will be notified.");
            void load();
          }}
        />
      )}
    </section>
  );
}
function ApplicationReview({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const detail = useRemote(`/v1/admin/applications/${id}`),
    [action, setAction] = useState("approve"),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const op = useRef(crypto.randomUUID());
  const app = detail.data?.application,
    profile = detail.data?.profile || {},
    owner = detail.data?.owner || {};
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await command(
        `/v1/admin/applications/${id}/review`,
        { action, reason, expectedVersion: app.version },
        op.current,
      );
      onSaved();
    } catch (e: any) {
      setError(friendly(e));
      if (e.status && e.status < 500) {
        op.current = crypto.randomUUID();
        if (e.code === "VERSION_CONFLICT") detail.reload();
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title="Review application"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      {detail.loading ? (
        <Busy />
      ) : app ? (
        <div className="a-review-detail">
          <div>
            <Photo
              src={profile.heroImage}
              alt={app.name}
              className="a-business-photo"
            />
            <span className="a-eyebrow">{label(app.kind)}</span>
            <h2>{profile.name || app.name}</h2>
            <span className={`a-status ${app.reviewStatus}`}>
              {label(app.reviewStatus)}
            </span>
            <p>{profile.description || "No business description supplied."}</p>
            <dl className="a-definition">
              <dt>Contact phone</dt>
              <dd>{profile.phone || owner.phone || "Not supplied"}</dd>
              <dt>Business address</dt>
              <dd>{profile.address || "Not supplied"}</dd>
              <dt>Neighborhood</dt>
              <dd>{profile.neighborhood || "Not supplied"}</dd>
              <dt>Applicant</dt>
              <dd>{owner.name || owner.uid}</dd>
              <dt>Email</dt>
              <dd>{owner.email || "Not supplied"}</dd>
              <dt>Profile</dt>
              <dd>{app.profileComplete ? "Complete" : "Needs completion"}</dd>
            </dl>
            {profile.coords && (
              <a
                href={`https://www.google.com/maps?q=${profile.coords.lat},${profile.coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="a-text-link"
              >
                <MapPin size={16} />
                View business location
              </a>
            )}
          </div>
          <div className="a-review-actions">
            <h3>Make a decision</h3>
            <p>
              The applicant receives your decision and the reason below. This
              updates access and publication together.
            </p>
            <Select
              label="Decision"
              disabled={busy}
              value={action}
              onChange={(v) => {
                setAction(v);
                op.current = crypto.randomUUID();
              }}
              options={[
                { value: "approve", label: "Approve business" },
                { value: "request_changes", label: "Request changes" },
                { value: "reject", label: "Reject application" },
                { value: "suspend", label: "Suspend business" },
              ]}
            />
            <Field
              label={
                action === "approve"
                  ? "Review note (optional)"
                  : "Reason for the applicant"
              }
            >
              <textarea
                maxLength={1000}
                value={reason}
                disabled={busy}
                onChange={(e) => {
                  setReason(e.target.value);
                  op.current = crypto.randomUUID();
                }}
                placeholder="Explain what was reviewed or what needs to change."
                rows={5}
              />
            </Field>
            {action === "approve" &&
              !app.profileComplete &&
              !["driver", "rides"].includes(app.kind) && (
                <p className="a-warning">
                  The business profile must be completed before approval.
                </p>
              )}
            <Notice error={error || detail.error} />
            <Button
              danger={["reject", "suspend"].includes(action)}
              disabled={
                busy || (action !== "approve" && reason.trim().length < 5)
              }
              onClick={submit}
            >
              {busy ? "Saving decision..." : "Save decision"}
            </Button>
            <small>
              Review version {app.version}. Conflicting edits are rejected.
            </small>
          </div>
        </div>
      ) : (
        <Notice error={detail.error} retry={detail.reload} />
      )}
    </Dialog>
  );
}
