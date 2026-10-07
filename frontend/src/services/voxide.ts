import { VoxideClient } from "@voxide/react";

const publicKey = import.meta.env.VITE_VOXIDE_PUBLIC_KEY || "pk_live_default";

export const ai = new VoxideClient({
  publicKey,
});