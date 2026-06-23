// /features/portfolio/projectIcons.tsx
// Shared lucide fallback icons, keyed by project id.
//
// These are only used when a project has no `image` logo (every project
// currently ships a brand SVG under /logos/<id>.svg) and as the placeholder
// while that image loads. Keeping a single map here stops the /portfolio
// listing and the project detail page from drifting apart — that dual-source
// drift is what previously broke the Rooivalk → Nexamesh link.
import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Network,
  Shield,
  Key,
  Vault,
  Car,
  Users,
  Bot,
  Waypoints,
  Receipt,
  MessagesSquare,
  Share2,
  Globe,
  Code,
  Layers,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  mystira: BookOpen,
  cognitivemesh: Network,
  nexamesh: Shield,
  airkey: Key,
  veritasvault: Vault,
  hop: Car,
  chaufher: Users,
  autopr: Bot,
  sluice: Waypoints,
  docket: Receipt,
  convolens: MessagesSquare,
  omnipost: Share2,
  "phoenixvc-website": Globe,
  "design-system": Code,
};

/** Returns the lucide fallback icon for a project id, sized as requested. */
export function getProjectIcon(id: string, size = 32): React.ReactElement {
  const Icon = ICONS[id] ?? Layers;
  return <Icon size={size} />;
}
