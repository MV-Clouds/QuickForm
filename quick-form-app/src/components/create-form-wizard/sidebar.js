import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Folder,
  Star,
  Layers,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  Settings2,
} from "lucide-react";

const Sidebar = ({ username, selected = "home", open, setOpen, onSelect }) => {
  const navOptions = [
    {
      label: "Home",
      icon:
        selected === "home" ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.07002 0.819849L1.14002 6.36985C0.360021 6.98985 -0.139979 8.29985 0.0300209 9.27985L1.36002 17.2398C1.60002 18.6598 2.96002 19.8098 4.40002 19.8098H15.6C17.03 19.8098 18.4 18.6498 18.64 17.2398L19.97 9.27985C20.13 8.29985 19.63 6.98985 18.86 6.36985L11.93 0.829849C10.86 -0.0301508 9.13002 -0.0301508 8.07002 0.819849Z"
              fill="url(#paint0_linear_0_1)"
              fillOpacity="0.8"
            />
            <path
              d="M10 16V13"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient
                id="paint0_linear_0_1"
                x1="19.9998"
                y1="9.99672"
                x2="-0.00317383"
                y2="9.99672"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.0480769" stopColor="#0B295E" />
                <stop offset="1" stopColor="#1D6D9E" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.07 2.81985L3.14002 8.36985C2.36002 8.98985 1.86002 10.2998 2.03002 11.2798L3.36002 19.2398C3.60002 20.6598 4.96002 21.8098 6.40002 21.8098H17.6C19.03 21.8098 20.4 20.6498 20.64 19.2398L21.97 11.2798C22.13 10.2998 21.63 8.98985 20.86 8.36985L13.93 2.82985C12.86 1.96985 11.13 1.96985 10.07 2.81985Z"
              stroke="#0B0A0A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 18V15"
              stroke="#0B0A0A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      key: "home",
    },
    {
      label: "Folders",
      icon:
        selected === "folders" ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.2222 7.55534H11.6978C11.265 7.55515 10.8472 7.39713 10.5227 7.11089L8.50311 5.33312M18.2222 7.55534C18.6937 7.55534 19.1459 7.74264 19.4793 8.07604C19.8127 8.40944 20 8.86162 20 9.33312V17.3331C20 17.8046 19.8127 18.2568 19.4793 18.5902C19.1459 18.9236 18.6937 19.1109 18.2222 19.1109H5.77778C5.30628 19.1109 4.8541 18.9236 4.5207 18.5902C4.1873 18.2568 4 17.8046 4 17.3331V6.66645C4 6.19495 4.1873 5.74277 4.5207 5.40937C4.8541 5.07597 5.30628 4.88867 5.77778 4.88867H7.32889C7.76163 4.88886 8.17944 5.04688 8.504 5.33312M18.2222 7.55534C18.2222 6.96597 17.9881 6.40074 17.5713 5.98399C17.1546 5.56724 16.5894 5.33312 16 5.33312H8.50311"
              fill="url(#paint0_linear_1523_5190)"
              fillOpacity="0.8"
            />
            <path
              d="M18.2222 7.55534H11.6978C11.265 7.55515 10.8472 7.39713 10.5227 7.11089L8.50311 5.33312H16C16.5894 5.33312 17.1546 5.56724 17.5713 5.98399C17.9881 6.40074 18.2222 6.96597 18.2222 7.55534ZM18.2222 7.55534C18.6937 7.55534 19.1459 7.74264 19.4793 8.07604C19.8127 8.40944 20 8.86162 20 9.33312V17.3331C20 17.8046 19.8127 18.2568 19.4793 18.5902C19.1459 18.9236 18.6937 19.1109 18.2222 19.1109H5.77778C5.30628 19.1109 4.8541 18.9236 4.5207 18.5902C4.1873 18.2568 4 17.8046 4 17.3331V6.66645C4 6.19495 4.1873 5.74277 4.5207 5.40937C4.8541 5.07597 5.30628 4.88867 5.77778 4.88867H7.32889C7.76163 4.88886 8.17944 5.04688 8.504 5.33312"
              stroke="#EDF8FF"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient
                id="paint0_linear_1523_5190"
                x1="20"
                y1="11.9998"
                x2="4"
                y2="11.9998"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.0480769" stopColor="#0B295E" />
                <stop offset="1" stopColor="#1D6D9E" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.2222 7.55534H11.6978C11.265 7.55515 10.8472 7.39713 10.5227 7.11089L8.50311 5.33312H16C16.5894 5.33312 17.1546 5.56724 17.5713 5.98399C17.9881 6.40074 18.2222 6.96597 18.2222 7.55534ZM18.2222 7.55534C18.6937 7.55534 19.1459 7.74264 19.4793 8.07604C19.8127 8.40944 20 8.86162 20 9.33312V17.3331C20 17.8046 19.8127 18.2568 19.4793 18.5902C19.1459 18.9236 18.6937 19.1109 18.2222 19.1109H5.77778C5.30628 19.1109 4.8541 18.9236 4.5207 18.5902C4.1873 18.2568 4 17.8046 4 17.3331V6.66645C4 6.19495 4.1873 5.74277 4.5207 5.40937C4.8541 5.07597 5.30628 4.88867 5.77778 4.88867H7.32889C7.76163 4.88886 8.17944 5.04688 8.504 5.33312"
              stroke="#0B0A0A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),

      key: "folders",
    },
    {
      label: "Favourite",
      icon:
        selected === "favourite" ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.72238 6.72642C10.736 4.90881 11.2424 4 12 4C12.7576 4 13.264 4.90881 14.2776 6.72642L14.54 7.19682C14.828 7.71362 14.972 7.97203 15.196 8.14243C15.42 8.31283 15.7 8.37603 16.26 8.50243L16.7688 8.61763C18.7368 9.06323 19.72 9.28563 19.9544 10.0384C20.188 10.7904 19.5176 11.5752 18.176 13.1441L17.8288 13.5497C17.448 13.9953 17.2568 14.2185 17.1712 14.4937C17.0856 14.7697 17.1144 15.0673 17.172 15.6617L17.2248 16.2033C17.4272 18.2969 17.5288 19.3433 16.916 19.8081C16.3032 20.2729 15.3816 19.8489 13.54 19.0009L13.0624 18.7817C12.5392 18.5401 12.2776 18.4201 12 18.4201C11.7224 18.4201 11.4608 18.5401 10.9376 18.7817L10.4608 19.0009C8.61837 19.8489 7.69677 20.2729 7.08476 19.8089C6.47116 19.3433 6.57276 18.2969 6.77516 16.2033L6.82796 15.6625C6.88556 15.0673 6.91436 14.7697 6.82796 14.4945C6.74316 14.2185 6.55196 13.9953 6.17116 13.5505L5.82396 13.1441C4.48235 11.576 3.81194 10.7912 4.04554 10.0384C4.27915 9.28563 5.26395 9.06243 7.23196 8.61763L7.74077 8.50243C8.29997 8.37603 8.57917 8.31283 8.80397 8.14243C9.02878 7.97203 9.17198 7.71362 9.45998 7.19682L9.72238 6.72642Z"
              fill="url(#paint0_linear_1523_6272)"
              fillOpacity="0.8"
            />
            <defs>
              <linearGradient
                id="paint0_linear_1523_6272"
                x1="20.0002"
                y1="12"
                x2="3.99976"
                y2="12"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.0480769" stopColor="#0B295E" />
                <stop offset="1" stopColor="#1D6D9E" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.72238 6.72642C10.736 4.90881 11.2424 4 12 4C12.7576 4 13.264 4.90881 14.2776 6.72642L14.54 7.19682C14.828 7.71362 14.972 7.97203 15.196 8.14243C15.42 8.31283 15.7 8.37603 16.26 8.50243L16.7688 8.61763C18.7368 9.06323 19.72 9.28563 19.9544 10.0384C20.188 10.7904 19.5176 11.5752 18.176 13.1441L17.8288 13.5497C17.448 13.9953 17.2568 14.2185 17.1712 14.4937C17.0856 14.7697 17.1144 15.0673 17.172 15.6617L17.2248 16.2033C17.4272 18.2969 17.5288 19.3433 16.916 19.8081C16.3032 20.2729 15.3816 19.8489 13.54 19.0009L13.0624 18.7817C12.5392 18.5401 12.2776 18.4201 12 18.4201C11.7224 18.4201 11.4608 18.5401 10.9376 18.7817L10.4608 19.0009C8.61837 19.8489 7.69677 20.2729 7.08476 19.8089C6.47116 19.3433 6.57276 18.2969 6.77516 16.2033L6.82796 15.6625C6.88556 15.0673 6.91436 14.7697 6.82796 14.4945C6.74316 14.2185 6.55196 13.9953 6.17116 13.5505L5.82396 13.1441C4.48235 11.576 3.81194 10.7912 4.04554 10.0384C4.27915 9.28563 5.26395 9.06243 7.23196 8.61763L7.74077 8.50243C8.29997 8.37603 8.57917 8.31283 8.80397 8.14243C9.02878 7.97203 9.17198 7.71362 9.45998 7.19682L9.72238 6.72642Z"
              stroke="#0B0A0A"
              strokeWidth="1.5"
            />
          </svg>
        ),

      key: "favourite",
    },
    { label: "Fieldset", icon: <Layers size={20} />, key: "fieldset" },
    {
      label: "Integrations",
      icon: <Settings2 size={20} />,
      key: "integration",
    },
    {
      label: "Bin",
      icon:
        selected === "bin" ? (
          <svg
            width="17"
            height="17"
            viewBox="0 0 17 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.17378 4.9566C3.00885 4.9566 2.88347 5.10481 2.9108 5.26746L4.85856 16.8574H12.8586L14.8063 5.26746C14.8337 5.10481 14.7083 4.9566 14.5433 4.9566H3.17378ZM15.2586 2.17974C15.4058 2.17974 15.5252 2.29913 15.5252 2.4464V3.23538C15.5252 3.38266 15.4058 3.50205 15.2586 3.50205H2.45856C2.31129 3.50205 2.19189 3.38266 2.19189 3.23538V2.4464C2.19189 2.29913 2.31129 2.17974 2.45856 2.17974H5.99923C6.59923 2.17974 7.08656 1.45312 7.08656 0.857422H10.6306C10.6306 1.45312 11.1172 2.17974 11.7179 2.17974H15.2586Z"
              fill="url(#paint0_linear_1523_12958)"
              fillOpacity="0.8"
            />
            <defs>
              <linearGradient
                id="paint0_linear_1523_12958"
                x1="15.5252"
                y1="8.85742"
                x2="2.19189"
                y2="8.85742"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.0480769" stopColor="#0B295E" />
                <stop offset="1" stopColor="#1D6D9E" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="16"
            height="20"
            viewBox="0 0 48 48"
          >
            <path d="M 24 4 C 20.491685 4 17.570396 6.6214322 17.080078 10 L 10.238281 10 A 1.50015 1.50015 0 0 0 9.9804688 9.9785156 A 1.50015 1.50015 0 0 0 9.7578125 10 L 6.5 10 A 1.50015 1.50015 0 1 0 6.5 13 L 8.6386719 13 L 11.15625 39.029297 C 11.427329 41.835926 13.811782 44 16.630859 44 L 31.367188 44 C 34.186411 44 36.570826 41.836168 36.841797 39.029297 L 39.361328 13 L 41.5 13 A 1.50015 1.50015 0 1 0 41.5 10 L 38.244141 10 A 1.50015 1.50015 0 0 0 37.763672 10 L 30.919922 10 C 30.429604 6.6214322 27.508315 4 24 4 z M 24 7 C 25.879156 7 27.420767 8.2681608 27.861328 10 L 20.138672 10 C 20.579233 8.2681608 22.120844 7 24 7 z M 11.650391 13 L 36.347656 13 L 33.855469 38.740234 C 33.730439 40.035363 32.667963 41 31.367188 41 L 16.630859 41 C 15.331937 41 14.267499 40.033606 14.142578 38.740234 L 11.650391 13 z M 20.476562 17.978516 A 1.50015 1.50015 0 0 0 19 19.5 L 19 34.5 A 1.50015 1.50015 0 1 0 22 34.5 L 22 19.5 A 1.50015 1.50015 0 0 0 20.476562 17.978516 z M 27.476562 17.978516 A 1.50015 1.50015 0 0 0 26 19.5 L 26 34.5 A 1.50015 1.50015 0 1 0 29 34.5 L 29 19.5 A 1.50015 1.50015 0 0 0 27.476562 17.978516 z"></path>
          </svg>
        ),

      key: "bin",
    },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-40 flex flex-col justify-between border-r border-gray-200"
        >
          <div>
            {/* Logo */}
            <div className="flex items-center px-6 py-6 border-b border-gray-100">
              <img
                src={"/quickform-logo.png"}
                alt="Quick Form"
                className="h-10 w-12"
              />
              <span className="">
                <img src={"images/quickformtext.png"} alt="Quick Form" />
              </span>
            </div>
            {/* Nav */}
            <nav className="mt-6 flex flex-col gap-1">
              {navOptions.map((opt) => (
                <button
                  key={opt.key}
                  className={`relative flex items-center gap-2 px-6 py-3 text-base font-medium rounded-sm transition-colors duration-200 overflow-hidden ${
                    selected === opt.key ? "" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => onSelect && onSelect(opt.key)}
                >
                  {selected === opt.key && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-2 rounded-r-lg"
                      style={{
                        background:
                          "linear-gradient(180deg, #0B295E 0%, #1D6D9E 100%)",
                        boxShadow: "2px 0 8px 0 #0B295E33",
                      }}
                    ></div>
                  )}
                  <div
                    style={
                      selected === opt.key
                        ? {
                            background: "rgb(227, 244, 255)",
                            color: "#0B295E",
                            width: "100%",
                            padding: "10px 0 10px 0",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }
                        : { display: "flex", alignItems: "center", gap: "12px" }
                    }
                  >
                    <span className="">{opt.icon}</span>
                    <span className="">{opt.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
          <div className="flex flex-col gap-2 pb-4">
            <button className="flex items-center gap-3 px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-base font-medium">
              <Settings size={20} />
              <span>Settings</span>
            </button>
            <div className="flex items-center gap-3 px-6 py-2 text-gray-700 font-semibold">
              <User size={20} />
              {username ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 60 }}
                >
                  {username}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 60 }}
                  className="h-5 w-24 bg-gray-200 rounded animate-pulse"
                />
              )}
            </div>
            <button
              className="absolute -right-4 bottom-8 bg-white border border-gray-200 shadow-lg rounded-full p-1 hover:bg-blue-50 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
        </motion.aside>
      )}
      {!open && (
        <motion.aside
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
          className="fixed left-0 top-0 h-full w-16 bg-white shadow-xl z-40 flex flex-col justify-between border-r border-gray-200"
          style={{ minWidth: 64 }}
        >
          <div className="flex flex-col items-center pt-4 gap-2">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="mb-4"
            >
              <img
                src={"/quickform-logo.png"}
                alt="Quick Form"
                className="h-10 w-10 rounded-lg shadow-sm"
              />
            </motion.div>
            {/* Nav Icons */}
            <nav className="flex flex-col gap-2 items-center w-full">
              {navOptions.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileHover={{ scale: 1.15, backgroundColor: "#F1F5F9" }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200 group ${
                    selected === opt.key
                      ? "bg-blue-50 shadow border border-indigo-200"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => onSelect && onSelect(opt.key)}
                  style={{
                    outline:
                      selected === opt.key ? "2px solid #1D6D9E" : "none",
                  }}
                >
                  <span className="flex items-center justify-center">
                    {opt.icon}
                  </span>
                  {/* Tooltip */}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 0, x: 10 }}
                    whileHover={{ opacity: 1, x: 56 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none whitespace-nowrap z-50 group-hover:opacity-100 group-hover:translate-x-4"
                    style={{ minWidth: 80 }}
                  >
                    {opt.label}
                  </motion.span>
                </motion.button>
              ))}
            </nav>
          </div>
          <div className="flex flex-col items-center pb-4 gap-2">
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: "#E0EDFF" }}
              whileTap={{ scale: 0.95 }}
              className="bg-white border border-gray-200 shadow-lg rounded-full p-2 hover:bg-blue-50 transition-colors"
              onClick={() => setOpen(true)}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={24} />
            </motion.button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
