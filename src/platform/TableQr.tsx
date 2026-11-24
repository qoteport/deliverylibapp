import React from "react";
import { useRemote } from "./hooks";
import { Dialog, Notice, Busy } from "./ui";
export function TableQr({
  merchantId,
  tableId,
  onClose,
}: {
  merchantId: string;
  tableId: string;
  onClose: () => void;
}) {
  const qr = useRemote(
    `/v1/dining/${merchantId}/${tableId}/qr`,
    undefined,
    0,
    false,
  );
  return (
    <Dialog title="Table QR code" onClose={onClose}>
      <Notice error={qr.error} retry={qr.reload} />
      {qr.loading ? (
        <Busy />
      ) : (
        qr.data && (
          <>
            <h2>{qr.data.restaurantName}</h2>
            <p>
              {qr.data.table.area} · {qr.data.table.name}
            </p>
            <img
              width={280}
              height={380}
              alt="Scan to order at this table"
              src={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(qr.data.cardSvg || qr.data.svg)
              }
            />
            <p>
              Scan, choose your food and order. This table is included
              automatically.
            </p>
            <p>
              <a href={qr.data.url}>{qr.data.url}</a>
            </p>
            <a
              className="a-button"
              download={`Aura-table-${tableId}.svg`}
              href={
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(qr.data.cardSvg || qr.data.svg)
              }
            >
              Download table card for printing
            </a>
          </>
        )
      )}
    </Dialog>
  );
}
