import React, { useEffect, useRef, useState } from "react";
import { command } from "../utils/commandApi";
import { useRemote, friendly } from "./hooks";
import { usePlatform } from "./context";
import { Row, money, label } from "./model";
import { Button, Field, Select, Notice, Photo, Busy } from "./ui";
import { LocationDialog, SmallMap } from "./Location";
export function Rides() {
  const { requireLogin } = usePlatform(),
    mine = useRemote("/v1/rides", undefined, 3000),
    [pickup, setPickup] = useState<Row | null>(null),
    [destination, setDestination] = useState<Row | null>(null),
    [choosing, setChoosing] = useState(""),
    [vehicle, setVehicle] = useState("taxi"),
    [preview, setPreview] = useState<Row | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const key = useRef(crypto.randomUUID());
  const navigation = useRemote(
    mine.data?.active?.driverId
      ? `/v1/rides/${mine.data.active.id}/navigation`
      : null,
    {},
    15000,
  );
  const nearby = useRemote(
    mine.data?.active && !mine.data.active.driverId ? "/v1/rides/nearby" : null,
    { rideId: mine.data?.active?.id },
    4000,
  );
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ride = mine.data?.active,
    active =
      ride && !["completed", "cancelled", "expired"].includes(ride.status),
    candidates = nearby.data?.vehicles || [],
    markers = [
      { ...(active ? ride.pickupCoords : pickup?.coords), label: "P" },
      {
        ...(active ? ride.destinationCoords : destination?.coords),
        label: "D",
      },
      ...(ride?.driverLocation
        ? [{ ...ride.driverLocation, label: "Car" }]
        : candidates
            .filter((c: Row) => Number.isFinite(c.lat))
            .map((c: Row) => ({
              ...c,
              label: c.vehicleType === "kekeh" ? "Keke" : "Car",
            }))),
    ].filter((m) => Number.isFinite(m.lat));
  const action = async (action: string) => {
    setBusy(true);
    try {
      await command(`/v1/rides/${ride.id}/action`, {
        action,
        expectedVersion: ride.version,
      });
      mine.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="a-page narrow">
      <span className="a-eyebrow">YOUR CITY. YOUR NEXT STOP.</span>
      <h1>{active ? "Your ride, in motion." : "Where are you heading?"}</h1>
      <p>Choose your route. Review your driver's price before confirming.</p>
      <SmallMap
        markers={markers}
        route={
          active
            ? navigation.data?.route?.polyline?.encodedPolyline ||
              ride.route?.polyline?.encodedPolyline
            : preview?.polyline?.encodedPolyline
        }
        height={420}
      />
      <Notice error={error || mine.error} retry={mine.reload} />
      {active ? (
        <>
          <div className="a-card">
            <h2>{label(ride.status)}</h2>
            <p>
              {ride.pickupAddress} → {ride.destinationAddress}
            </p>
            {["requested", "searching", "driver_notified"].includes(
              ride.status,
            ) && (
              <>
                <Busy
                  text={
                    candidates.length
                      ? "Reaching nearby drivers..."
                      : "Finding an available driver..."
                  }
                />
                <p>
                  Search window:{" "}
                  {Math.max(0, Math.ceil((ride.expiresAt - now) / 60000))}{" "}
                  minutes remaining
                </p>
              </>
            )}
            {ride.status === "search_decision" && (
              <>
                <p>No driver has responded. Keep looking?</p>
                <Button
                  disabled={busy}
                  onClick={() => action("keep_searching")}
                >
                  Keep searching
                </Button>
              </>
            )}
            {ride.status === "price_proposed" && (
              <>
                <h3>
                  {ride.proposedDriverName} proposes{" "}
                  {money(ride.proposedPriceMinor / 100)}
                </h3>
                <Button disabled={busy} onClick={() => action("confirm")}>
                  Confirm price
                </Button>
                <Button
                  secondary
                  disabled={busy}
                  onClick={() => action("decline_price")}
                >
                  Find another driver
                </Button>
              </>
            )}
            {ride.driverProfile && (
              <div className="a-list-card">
                <Photo
                  src={ride.driverProfile.photoUrl}
                  style={{ width: 64, height: 64, borderRadius: "50%" }}
                />
                <h3>{ride.driverProfile.name}</h3>
                <p>
                  {Object.values(ride.driverProfile.vehicleDetails || {}).join(
                    " · ",
                  )}
                </p>
                {ride.driverProfile.phone && (
                  <a
                    className="a-button"
                    href={`tel:${ride.driverProfile.phone}`}
                  >
                    Call driver
                  </a>
                )}
              </div>
            )}
            <Button secondary disabled={busy} onClick={() => action("cancel")}>
              Cancel ride
            </Button>
          </div>
          {!ride.driverId &&
            candidates.slice(0, 5).map((c: Row) => (
              <div className="a-list-card" key={c.uid || c.id}>
                <Photo
                  src={c.photoUrl}
                  style={{ width: 48, height: 48, borderRadius: "50%" }}
                />
                <strong>{c.name}</strong>
                <p>
                  {label(c.vehicleType)} ·{" "}
                  {c.distanceMeters
                    ? `${(c.distanceMeters / 1000).toFixed(1)} km away`
                    : "Nearby"}
                </p>
              </div>
            ))}
        </>
      ) : (
        <div className="a-card">
          <Button secondary onClick={() => setChoosing("pickup")}>
            {pickup?.address || "Choose pickup"}
          </Button>
          <Button
            secondary
            style={{ marginTop: 12 }}
            onClick={() => setChoosing("destination")}
          >
            {destination?.address || "Choose destination"}
          </Button>
          <Select
            label="Vehicle"
            value={vehicle}
            onChange={setVehicle}
            options={["motorbike", "kekeh", "taxi", "suv"]}
          />
          {preview && (
            <p>
              {(preview.distanceMeters / 1000).toFixed(1)} km · about{" "}
              {Math.ceil(parseInt(preview.duration) / 60)} min
            </p>
          )}
          <Button
            disabled={busy || !pickup || !destination}
            onClick={async () => {
              if (!(await requireLogin())) return;
              setBusy(true);
              try {
                if (!preview) {
                  const r = await command("/v1/rides/preview", {
                    pickupCoords: pickup!.coords,
                    destinationCoords: destination!.coords,
                  });
                  setPreview(r.route);
                } else {
                  await command(
                    "/v1/rides",
                    {
                      pickupAddress: pickup!.address,
                      destinationAddress: destination!.address,
                      pickupCoords: pickup!.coords,
                      destinationCoords: destination!.coords,
                      vehicleType: vehicle,
                    },
                    key.current,
                  );
                  mine.reload();
                  key.current = crypto.randomUUID();
                }
              } catch (e) {
                setError(friendly(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy
              ? "Please wait..."
              : preview
                ? "Find a driver"
                : "Review route"}
          </Button>
        </div>
      )}
      {choosing && (
        <LocationDialog
          title={choosing === "pickup" ? "Your pickup" : "Your destination"}
          onClose={() => setChoosing("")}
          onChoose={(v) => {
            if (choosing === "pickup") setPickup(v);
            else setDestination(v);
            setPreview(null);
            key.current = crypto.randomUUID();
            setChoosing("");
          }}
        />
      )}
    </section>
  );
}
export function Driver() {
  const delivery = new URLSearchParams(location.search).get("mode") !== "rides",
    base = delivery ? "/v1/delivery-driver" : "/v1/ride-driver",
    state = useRemote(base, undefined, 4000),
    [vehicle, setVehicle] = useState("taxi"),
    [contactPhone, setContactPhone] = useState(""),
    [vehicleDetails, setVehicleDetails] = useState<Row>({
      make: "",
      model: "",
      color: "",
      plate: "",
    }),
    [pricing, setPricing] = useState<Row>({
      baseMinor: 100,
      perKmMinor: 50,
      minimumMinor: 200,
    }),
    [price, setPrice] = useState(""),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [tracking, setTracking] = useState(false);
  const watch = useRef<number | null>(null),
    assigned = useRef<string | null>(null);
  useEffect(() => {
    assigned.current = state.data?.presence?.activeOrderId || null;
  }, [state.data]);
  useEffect(
    () => () => {
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
    },
    [],
  );
  useEffect(() => {
    if (state.data?.presence?.pricing) {
      setPricing(state.data.presence.pricing);
      setVehicle(state.data.presence.vehicleType);
      setContactPhone(state.data.presence.phone || "");
      setVehicleDetails(state.data.presence.vehicleDetails || {});
    }
  }, [!!state.data]);
  const presence = async (status: string) => {
    setBusy(true);
    setError(null);
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    setTracking(false);
    const send = async (fix?: GeolocationPosition) => {
      const location = fix
        ? {
            lat: fix.coords.latitude,
            lng: fix.coords.longitude,
            accuracy: fix.coords.accuracy,
            capturedAt: fix.timestamp,
            mocked: false,
          }
        : undefined;
      await command(
        base + "/presence",
        delivery
          ? { status, location }
          : {
              online: status !== "offline",
              available: status === "available",
              vehicleType: vehicle,
              contactPhone,
              vehicleDetails,
              pricing,
              location,
            },
      );
      if (delivery && assigned.current && location)
        await command(`/v1/orders/${assigned.current}/location`, location);
    };
    try {
      if (status === "offline") await send();
      else {
        if (!navigator.geolocation)
          throw new Error("This browser does not support location.");
        await new Promise<void>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            (f) => {
              send(f).then(resolve, reject);
            },
            () => reject(new Error("Allow precise location to go online.")),
            { enableHighAccuracy: true, timeout: 15000 },
          ),
        );
        let last = Date.now();
        watch.current = navigator.geolocation.watchPosition(
          (f) => {
            if (Date.now() - last < 10000) return;
            last = Date.now();
            void send(f).catch((e) => setError(friendly(e)));
          },
          () => setError("Location sharing stopped. Check your permissions."),
          { enableHighAccuracy: true, maximumAge: 5000 },
        );
        setTracking(true);
      }
      state.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  const ride = state.data?.ride;
  const act = async (path: string, body: Row) => {
    setBusy(true);
    try {
      await command(path, body);
      state.reload();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="a-page narrow">
      <h1>{delivery ? "Your delivery workspace" : "Your driver workspace"}</h1>
      <p>
        {tracking
          ? "Sharing your location while this page is open."
          : "Keep this page open while accepting work. Go online with a fresh GPS fix."}
      </p>
      <Notice error={error || state.error} retry={state.reload} />
      <div className="a-card">
        <h2>
          {label(
            state.data?.presence?.status ||
              (state.data?.presence?.online ? "Online" : "Offline"),
          )}
        </h2>
        {!delivery && (
          <>
            <Select
              label="Vehicle"
              value={vehicle}
              onChange={setVehicle}
              options={["motorbike", "kekeh", "taxi", "suv"]}
            />
            <Field label="Driver contact phone (+231...)">
              <input
                type="tel"
                maxLength={25}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </Field>
            <div className="a-two">
              {["make", "model", "color", "plate"].map((k) => (
                <Field key={k} label={label(k)}>
                  <input
                    maxLength={40}
                    value={vehicleDetails[k] || ""}
                    onChange={(e) =>
                      setVehicleDetails({
                        ...vehicleDetails,
                        [k]: e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            {[
              ["baseMinor", "Base price"],
              ["perKmMinor", "Per kilometre"],
              ["minimumMinor", "Minimum fare"],
            ].map(([k, t]) => (
              <Field key={k} label={t + " (USD)"}>
                <input
                  type="number"
                  min={0}
                  step=".01"
                  value={pricing[k] / 100}
                  onChange={(e) =>
                    setPricing({
                      ...pricing,
                      [k]: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </Field>
            ))}
          </>
        )}
        <div className="a-row" style={{ gap: 12, flexWrap: "wrap" }}>
          {["available", "busy", "offline"].map((s) => (
            <Button
              key={s}
              disabled={busy}
              secondary={s !== "available"}
              onClick={() => presence(s)}
            >
              {label(s)}
            </Button>
          ))}
        </div>
      </div>
      {ride && (
        <div className="a-card">
          <h2>{label(ride.status)}</h2>
          <p>
            {ride.pickupAddress} → {ride.destinationAddress}
          </p>
          {ride.status === "driver_notified" ? (
            <>
              <Field label="Proposed fare (USD), or leave blank for default">
                <input
                  type="number"
                  min=".01"
                  max={1000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Button
                disabled={busy}
                onClick={() =>
                  act(`/v1/rides/${ride.id}/respond`, {
                    action: "propose",
                    expectedVersion: ride.version,
                    ...(price
                      ? { priceMinor: Math.round(Number(price) * 100) }
                      : {}),
                  })
                }
              >
                Accept & propose price
              </Button>
              <Button
                secondary
                disabled={busy}
                onClick={() =>
                  act(`/v1/rides/${ride.id}/respond`, {
                    action: "reject",
                    expectedVersion: ride.version,
                  })
                }
              >
                Decline
              </Button>
            </>
          ) : (
            [
              "accepted",
              "driver_en_route",
              "driver_arrived",
              "in_progress",
            ].includes(ride.status) && (
              <Button
                disabled={busy}
                onClick={() =>
                  act(`/v1/rides/${ride.id}/action`, {
                    action: (
                      {
                        accepted: "driver_en_route",
                        driver_en_route: "driver_arrived",
                        driver_arrived: "in_progress",
                        in_progress: "completed",
                      } as Row
                    )[ride.status],
                    expectedVersion: ride.version,
                  })
                }
              >
                {
                  (
                    {
                      accepted: "Head to pickup",
                      driver_en_route: "I have arrived",
                      driver_arrived: "Start trip",
                      in_progress: "Complete ride",
                    } as Row
                  )[ride.status]
                }
              </Button>
            )
          )}
        </div>
      )}
      {delivery && (
        <DeliveryWork
          state={state.data}
          reload={state.reload}
          act={act}
          busy={busy}
        />
      )}
    </section>
  );
}
function DeliveryWork({
  state,
  reload,
  act,
  busy,
}: {
  state: Row | null;
  reload: () => void;
  act: (p: string, b: Row) => Promise<void>;
  busy: boolean;
}) {
  const orders = useRemote("/v1/orders?scope=driver", undefined, 5000);
  return (
    <>
      {state?.offer && (
        <div className="a-card">
          <h2>New delivery request</h2>
          <h3>{state.offer.restaurantName}</h3>
          <p>
            {state.offer.restaurantAddress} to {state.offer.deliveryArea}
          </p>
          <p>
            Pickup {(state.offer.pickupDistanceMeters / 1000).toFixed(1)} km
            away · Delivery fee {money(state.offer.deliveryFee)}
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              act(`/v1/orders/${state.offer.orderId}/delivery-respond`, {
                action: "accept",
                token: state.offer.token,
              })
            }
          >
            Accept delivery
          </Button>
          <Button
            secondary
            disabled={busy}
            onClick={() =>
              act(`/v1/orders/${state.offer.orderId}/delivery-respond`, {
                action: "decline",
                token: state.offer.token,
              })
            }
          >
            Decline
          </Button>
        </div>
      )}
      {(orders.data?.orders || []).map((o: Row) => (
        <div className="a-card" key={o.id}>
          <h3>{o.restaurantName}</h3>
          <p>{o.deliveryAddress}</p>
          <p>{label(o.fulfillmentStage || o.status)}</p>
          {!["completed", "cancelled"].includes(o.status) && (
            <Button
              disabled={busy}
              onClick={() =>
                act(
                  `/v1/orders/${o.id}/` +
                    (o.orderType === "supermarket"
                      ? "fulfillment"
                      : "transition"),
                  o.orderType === "supermarket"
                    ? {
                        stage: (
                          {
                            ready_for_dispatch: "dispatched",
                            dispatched: "out_for_delivery",
                            out_for_delivery: "delivered",
                          } as Row
                        )[o.fulfillmentStage],
                        expectedVersion: o.version,
                      }
                    : {
                        status:
                          o.status === "plating" ? "en-route" : "completed",
                        expectedVersion: o.version,
                      },
                )
              }
            >
              Update delivery progress
            </Button>
          )}
        </div>
      ))}
    </>
  );
}
