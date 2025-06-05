import {
  Home,
  ListChecks,
  Bell,
  Shuffle,
  Smile,
  Upload,
  LucideIcon,
  User,
  Mail
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/",
          label: "Home",
          icon: Home
        },
        {
          href: "/fields",
          label: "Fields",
          icon: ListChecks
        },
        {
          href: "/notification",
          label: "Notification",
          icon: Bell
        },
        {
          href: "/mapping",
          label: "Mapping",
          icon: Shuffle
        },
        {
          href: "/thankyou",
          label: "Thank You",
          icon: Smile
        },
        {
          href: "/publish",
          label: "Publish",
          icon: Upload
        }
      ]
    }
  ];
}
export function getUserList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/notify",
          label: "Notification",
          icon: Mail
        },
       {
          href: "/users",
          label: "Profile",
          icon: User
        },
      ]
    }]
}