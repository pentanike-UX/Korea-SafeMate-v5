import { MapPrimaryShell } from "@/components/map-shell/map-primary-shell";

export default function MapCanvasLayout({ children }: { children: React.ReactNode }) {
  return <MapPrimaryShell>{children}</MapPrimaryShell>;
}
