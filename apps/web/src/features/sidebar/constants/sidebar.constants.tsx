import { SidebarGroup, SidebarItemGroup, SidebarItemLink } from "../types";
import { navItems, resourceItems } from "@/constants/navigation";

// First, define the sidebar links with proper typing
export const SIDEBAR_LINKS: SidebarItemGroup[] = [
  {
    type: "group",
    label: "Navigation",
    title: "Navigation",
    active: false,
    children: navItems
      .filter((item) => item.label !== "Projects")
      .map((item) => ({
        type: "link",
        label: item.label,
        icon: item.icon,
        href: item.href,
        active: false,
      })) as SidebarItemLink[],
  },
  {
    type: "group",
    label: "Resources",
    title: "Resources",
    active: false,
    children: resourceItems.map((item) => ({
      type: "link",
      label: item.label,
      icon: item.icon,
      href: item.href,
      active: false,
    })) as SidebarItemLink[],
  },
];

// Create sidebar groups from the links with proper type safety
export const DEFAULT_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    // No header for the primary nav group — "Main Navigation" over the obvious
    // top-level links is redundant. Empty title hides the section heading.
    title: "",
    items:
      (SIDEBAR_LINKS.find(
        (item) => item.label === "Navigation",
      )?.children.filter(
        (child) => child.type === "link",
      ) as SidebarItemLink[]) || [],
  },
  {
    // Header dropped too — a "Resources" heading over a single link reads heavy
    // once the primary group is unlabeled. Theme Designer shows as a plain link.
    title: "",
    items:
      (SIDEBAR_LINKS.find(
        (item) => item.label === "Resources",
      )?.children.filter(
        (child) => child.type === "link",
      ) as SidebarItemLink[]) || [],
  },
];
