export type LiveStatus = "offline" | "connecting" | "connected" | "error";

export type LiveLine = {
  id: string;
  role: "agent" | "system" | "user";
  text: string;
};
