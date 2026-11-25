import React, { createContext, useContext } from "react";
import { Row, Kind } from "./model";
export type Line = {
  item: Row;
  kind: Kind;
  quantity: number;
  addons?: string[];
  spiceLevel?: string;
  notes?: string;
  size?: string;
  color?: string;
};
export const go = (path: string) => {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
};
export type PlatformState = {
  requireLogin: () => Promise<boolean>;
  toast: (message: string) => void;
  confirm: (
    title: string,
    message: string,
    action?: string,
  ) => Promise<boolean>;
  cart: Line[];
  setCart: React.Dispatch<React.SetStateAction<Line[]>>;
  add: (line: Line) => Promise<void>;
  saved: Set<string>;
  toggleSaved: (kind: string, itemId: string) => Promise<void>;
  openChat: (kind: string, id: string) => Promise<void>;
};
export const Platform = createContext<PlatformState>(null!);
export const usePlatform = () => useContext(Platform);
