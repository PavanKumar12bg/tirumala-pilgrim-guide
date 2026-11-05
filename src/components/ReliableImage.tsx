import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Transparent pixel leaves the existing neutral background visible on failure.
const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export function ReliableImage(props: ComponentProps<"img">) {
  return <ImageRequest key={props.src} {...props} />;
}

function ImageRequest({ className, onLoad, onError, ...props }: ComponentProps<"img">) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return <img {...props}
    src={state === "failed" ? EMPTY_IMAGE : props.src}
    className={cn(className, state !== "ready" && "bg-secondary")}
    onLoad={event => { if (state !== "failed") setState("ready"); onLoad?.(event); }}
    onError={event => { if (state !== "failed") { setState("failed"); onError?.(event); } }}
  />;
}