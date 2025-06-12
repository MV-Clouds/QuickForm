import { useState } from "react";
// import { useLocation } from "next/navigation";
// import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { mainMenuList, userMenuList } from "../lib/menu-list";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white-900 shadow-lg transition-all duration-300 ${
        isOpen ? "w-60" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-500 hover:bg-gray-100 w-full text-left"
        >
          {isOpen ? "Close" : "Open"}
        </button>
        <nav className="flex-1 overflow-y-auto">
          {mainMenuList.map((group, index) => (
            <div key={index} className="mb-4">
              {isOpen && group.groupLabel ? (
                <p className="text-sm font-medium text-gray-500 px-4 pb-2">
                  {group.groupLabel}
                </p>
              ) : !isOpen && group.groupLabel ? (
                <div className="relative group">
                  <div className="flex justify-center p-2">
                    <Ellipsis className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="absolute left-full ml-2 hidden group-hover:block bg-gray-800 text-white text-sm p-1 rounded z-10">
                    {group.groupLabel}
                  </div>
                </div>
              ) : null}
              {group.menus.map((menu, idx) => (
                <div key={idx} className="relative group">
                  <Link
                    to={menu.href} // <-- use 'to' instead of 'href'
                    className={`flex ${
                      isOpen ? "justify-start" : "justify-center"
                    } p-2 ${
                      location.pathname.startsWith(menu.href)
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <menu.icon className="h-5 w-5" />
                    {isOpen && <span className="ml-4">{menu.label}</span>}
                  </Link>
                  {!isOpen && (
                    <div className="absolute left-full ml-2 hidden group-hover:block bg-gray-800 text-white text-sm p-1 rounded z-10">
                      {menu.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <nav className="mt-auto overflow-y-auto">
          {userMenuList.map((group, index) => (
            <div key={index} className="mb-4">
              {isOpen && group.groupLabel ? (
                <p className="text-sm font-medium text-gray-500 px-4 pb-2">
                  {group.groupLabel}
                </p>
              ) : !isOpen && group.groupLabel ? (
                <div className="relative group">
                  <div className="flex justify-center p-2">
                    <Ellipsis className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="absolute left-full ml-2 hidden group-hover:block bg-gray-800 text-white text-sm p-1 rounded z-10">
                    {group.groupLabel}
                  </div>
                </div>
              ) : null}
              {group.menus.map((menu, idx) => (
                <div key={idx} className="relative group">
                  <Link
                    to={menu.href} // <-- use 'to' instead of 'href'
                    className={`flex ${
                      isOpen ? "justify-start" : "justify-center"
                    } p-2 ${
                      location.pathname.startsWith(menu.href)
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <menu.icon className="h-5 w-5" />
                    {isOpen && <span className="ml-4">{menu.label}</span>}
                  </Link>
                  {!isOpen && (
                    <div className="absolute left-full ml-2 hidden group-hover:block bg-gray-800 text-white text-sm p-1 rounded z-10">
                      {menu.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}