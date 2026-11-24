import { TableQr } from "./TableQr";
import React, { useState } from "react";
import { Row } from "./model";
import { Button, Dialog, Field, Select, Notice } from "./ui";
import { command } from "../utils/commandApi";
import { friendly } from "./hooks";
import { LocationDialog } from "./Location";
export function RoomPlan({
  tables,
  selected,
  onSelect,
  onMove,
}: {
  tables: Row[];
  selected?: string;
  onSelect: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  return (
    <div
      className="a-table-plan"
      style={{
        position: "relative",
        height: 360,
        background: "#eef3ef",
        borderRadius: 20,
        overflow: "hidden",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        onMove?.(
          e.dataTransfer.getData("text/plain"),
          Math.min(0.92, Math.max(0.08, (e.clientX - r.left) / r.width)),
          Math.min(0.9, Math.max(0.1, (e.clientY - r.top) / r.height)),
        );
      }}
    >
      {tables.map((t) => (
        <button
          key={t.id}
          draggable={!!onMove}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
          onClick={() => onSelect(t.id)}
          onKeyDown={(e) => {
            if (
              onMove &&
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              onMove(
                t.id,
                Math.min(
                  0.92,
                  Math.max(
                    0.08,
                    t.layoutX +
                      (e.key === "ArrowRight"
                        ? 0.03
                        : e.key === "ArrowLeft"
                          ? -0.03
                          : 0),
                  ),
                ),
                Math.min(
                  0.9,
                  Math.max(
                    0.1,
                    t.layoutY +
                      (e.key === "ArrowDown"
                        ? 0.03
                        : e.key === "ArrowUp"
                          ? -0.03
                          : 0),
                  ),
                ),
              );
            }
          }}
          style={{
            position: "absolute",
            left: `${(t.layoutX ?? 0.5) * 100}%`,
            top: `${(t.layoutY ?? 0.5) * 100}%`,
            transform: "translate(-50%,-50%)",
            width: t.shape === "rectangle" ? 110 : 85,
            height: 66,
            borderRadius: t.shape === "round" ? "50%" : 12,
            border:
              selected === t.id ? "3px solid #07874d" : "1px solid #a9bdb0",
            background: t.active ? "white" : "#d2d6d3",
            color: "#18251c",
          }}
        >
          <strong>{t.name}</strong>
          <br />
          <small>{t.seats || 4} seats</small>
        </button>
      ))}
    </div>
  );
}
export function TablesEditor({
  merchantId,
  restaurant,
  onClose,
  onSaved,
}: {
  merchantId: string;
  restaurant: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qrTable, setQrTable] = useState<string | null>(null);
  const [tables, setTables] = useState<Row[]>(restaurant.diningTables || []),
    [selected, setSelected] = useState(""),
    [area, setArea] = useState("Main room"),
    [pin, setPin] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const current = tables.find((t) => t.id === selected),
    patch = (v: Row) =>
      setTables((a) => a.map((t) => (t.id === selected ? { ...t, ...v } : t)));
  const add = (count: number) => {
    if (tables.length + count > 100) return;
    const coord = restaurant.coords;
    if (!coord) {
      setError("Save the kitchen location in your business profile first.");
      return;
    }
    const added = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `Table ${tables.length + i + 1}`,
      area,
      active: true,
      seats: 4,
      shape: "square",
      lat: coord.lat,
      lng: coord.lng,
      radiusMeters: 3,
      layoutX: 0.17 + (i % 3) * 0.32,
      layoutY: 0.2 + Math.floor(i / 3) * 0.3,
    }));
    setTables((a) => [...a, ...added]);
    setSelected(added[0].id);
  };
  return (
    <Dialog title="Tables & seating zones" onClose={onClose} wide>
      <p>
        Arrange each room, then give tables clear names. GPS is a suggestion;
        guests confirm their table.
      </p>
      <Field label="Seating area">
        <input
          value={area}
          maxLength={60}
          onChange={(e) => setArea(e.target.value)}
        />
      </Field>
      <div
        className="a-row"
        style={{ gap: 12, margin: "20px 0", flexWrap: "wrap" }}
      >
        <Button secondary onClick={() => add(1)}>
          Add table
        </Button>
        <Button secondary onClick={() => add(6)}>
          Six-table layout
        </Button>
      </div>
      <RoomPlan
        tables={tables.filter((t) => t.area === area)}
        selected={selected}
        onSelect={setSelected}
        onMove={(id, layoutX, layoutY) =>
          setTables((a) =>
            a.map((t) => (t.id === id ? { ...t, layoutX, layoutY } : t)),
          )
        }
      />
      <p>
        <small>
          Drag a table to move it, or focus it and use the arrow keys.
        </small>
      </p>
      <div className="a-row" style={{ flexWrap: "wrap", gap: 8 }}>
        {Array.from(new Set(tables.map((t) => t.area))).map((a) => (
          <Button key={a} secondary onClick={() => setArea(a)}>
            {a}
          </Button>
        ))}
      </div>
      {qrTable && (
        <TableQr
          merchantId={merchantId}
          tableId={qrTable}
          onClose={() => setQrTable(null)}
        />
      )}
      {current && (
        <div className="a-card">
          <Button
            secondary
            disabled={!current.active}
            onClick={() => setQrTable(current.id)}
          >
            Table QR code
          </Button>
          <p>Save table changes before printing a code.</p>
          <Field label="Table name">
            <input
              value={current.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <Field label="Seats">
            <input
              type="number"
              min={1}
              max={24}
              value={current.seats}
              onChange={(e) => patch({ seats: Number(e.target.value) })}
            />
          </Field>
          <Select
            label="Shape"
            value={current.shape}
            options={["square", "round", "rectangle"]}
            onChange={(shape) => patch({ shape })}
          />
          <Field label="Available for guests">
            <input
              type="checkbox"
              checked={current.active}
              onChange={(e) => patch({ active: e.target.checked })}
            />
          </Field>
          <Field label="GPS zone radius (metres)">
            <input
              type="number"
              min={2}
              max={30}
              value={current.radiusMeters}
              onChange={(e) => patch({ radiusMeters: Number(e.target.value) })}
            />
          </Field>
          <div className="a-row" style={{ gap: 12, flexWrap: "wrap" }}>
            <Button secondary onClick={() => setPin(true)}>
              Adjust zone pin
            </Button>
            <Button
              danger
              onClick={() => {
                setTables((a) => a.filter((t) => t.id !== selected));
                setSelected("");
              }}
            >
              Remove table
            </Button>
          </div>
        </div>
      )}
      <Notice error={error} />
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await command(`/v1/business/${merchantId}/profile`, {
              diningTables: tables,
              diningTablesVersion: restaurant.diningTablesVersion || 0,
            });
            onSaved();
          } catch (e) {
            setError(friendly(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving..." : "Save seating layout"}
      </Button>
      {pin && current && (
        <LocationDialog
          initial={{ coords: { lat: current.lat, lng: current.lng } }}
          title="Table zone"
          onClose={() => setPin(false)}
          onChoose={(v) => {
            patch({ lat: v.coords.lat, lng: v.coords.lng });
            setPin(false);
          }}
        />
      )}
    </Dialog>
  );
}
