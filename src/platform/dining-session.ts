export function rememberTable(merchantId: string, tableId: string) {
  sessionStorage.setItem(
    "aura_table_session",
    JSON.stringify({ merchantId, tableId, until: Date.now() + 7200000 }),
  );
  sessionStorage.setItem("aura_dining_merchant", merchantId);
}
export function rememberedTable(merchantId: string) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("aura_table_session") || "null",
    );
    return value?.merchantId === merchantId && value.until > Date.now()
      ? value.tableId
      : "";
  } catch {
    return "";
  }
}
