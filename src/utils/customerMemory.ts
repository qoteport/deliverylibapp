export interface SavedCustomerDetails {
  name?: string;
  phone?: string;
  destinationArea?: string;
  address?: string;
  gpsCoords?: { lat: number; lng: number } | null;
  lastUpdated?: string;
}

const STORAGE_KEY = 'aura_customer_memory';

/**
 * Retrieve stored customer details from local browser memory
 */
export function getCustomerMemory(): SavedCustomerDetails {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read customer memory from storage', err);
  }
  return {};
}

/**
 * Persist customer details into local browser memory
 */
export function saveCustomerMemory(details: Partial<SavedCustomerDetails>): void {
  try {
    const current = getCustomerMemory();
    const updated: SavedCustomerDetails = {
      ...current,
      ...details,
      lastUpdated: new Date().toISOString(),
    };
    // Clean out undefined or empty string values if replacement provided
    if (details.name !== undefined) updated.name = details.name;
    if (details.phone !== undefined) updated.phone = details.phone;
    if (details.destinationArea !== undefined) updated.destinationArea = details.destinationArea;
    if (details.address !== undefined) updated.address = details.address;
    if (details.gpsCoords !== undefined) updated.gpsCoords = details.gpsCoords;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save customer memory to storage', err);
  }
}
