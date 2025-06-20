import {
  Home,
  ListChecks,
  Bell,
  Shuffle,
  Smile,
  Upload,
  User,
  Mail,
  LayoutTemplateIcon,
} from "lucide-react";

export const mainMenuList = [
  {
    groupLabel: "Dashboard",
    menus: [
      { href: "/", label: "Home", icon: Home },
      { href: "/fields", label: "Fields", icon: ListChecks },
    ],
  },
  {
    groupLabel: "Settings",
    menus: [
      { href: "/notification", label: "Notification", icon: Bell },
      { href: "/flow", label: "Mapping", icon: Shuffle },
      { href: "/thankyou", label: "Thank You", icon: Smile },
      { href: "/publish", label: "Publish", icon: Upload },
      { href: "/template", label: "Templates", icon: LayoutTemplateIcon },
    ],
  },
];

export const userMenuList = [
  {
    groupLabel: "User",
    menus: [
      { href: "/notify", label: "Notification", icon: Mail },
      { href: "/users", label: "Profile", icon: User },
    ],
  },
];