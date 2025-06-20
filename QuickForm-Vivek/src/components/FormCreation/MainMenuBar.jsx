import React from 'react';

function MainMenuBar({ isSidebarOpen, toggleSidebar }) {
  return (
    <aside
      className={`fixed top-0 left-0 z-20 h-screen transition-all ease-in-out duration-300 ${
        isSidebarOpen ? 'w-64' : 'w-16'
      } dark:bg-gray-900`}
    >
      <div className="absolute top-[600px] -right-[16px] z-20">
        <button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-md w-8 h-8"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`lucide lucide-chevron-left h-4 w-4 transition-transform ease-in-out duration-700 ${
              isSidebarOpen ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>
      <div className="relative h-full flex flex-col px-3agnesium-4 overflow-y-auto shadow-md dark:shadow-zinc-800">
        <a
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-primary underline-offset-4 hover:underline h-9 px-4 py-2 transition-transform ease-in-out duration-300 mt-4 translate-x-0"
          href="/dashboard"
        >
          <img
            src="/quickform-logo.png"
            alt="Logo Icon"
            className={`${isSidebarOpen ? 'w-12':'w-20'}`}
          />
          <h1
            className={`ml-2 font-bold text-lg whitespace-nowrap transition-[transform,opacity] ease-in-out duration-300
              ${isSidebarOpen ? 'translate-x-0 opacity-100' : 'hidden'}`
            }
          >
            <span style={{ color: 'rgb(0, 204, 255)' }}>QUICK </span>
            <span style={{ color: 'rgb(3, 52, 167)' }}>FORM</span>
          </h1>
        </a>
        <div
          dir="ltr"
          className="relative overflow-hidden [&>div>div[style]]:!block"
          style={{ position: 'relative', '--radix-scroll-area-corner-width': '0px', '--radix-scroll-area-corner-height': '0px' }}
        >
          <style>{`
            [data-radix-scroll-area-viewport] {
              scrollbar-width: none;
              -ms-overflow-style: none;
              -webkit-overflow-scrolling: touch;
            }
            [data-radix-scroll-area-viewport]::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div
            data-radix-scroll-area-viewport=""
            className="h-full w-full rounded-[inherit]"
            style={{ overflow: 'hidden scroll' }}
          >
            <div style={{ minWidth: '100%', display: 'table' }}>
              <nav className="mt-8 h-full w-full">
                <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] items-start space-y-1 px-2">
                  <li className="w-full">
                    <div className="w-full">
                      <a
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-home"
                          >
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Home
                        </p>
                      </a>
                    </div>
                  </li>
                  <li className="w-full">
                    <div className="w-full">
                      <a
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/fields"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-square-pen"
                          >
                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Fields
                        </p>
                      </a>
                    </div>
                    <div className="w-full">
                      <a
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/notification"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-mail"
                          >
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Notifications
                        </p>
                      </a>
                    </div>
                    <div className="w-full">
                      <a
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/mapping"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-bar-chart2"
                          >
                            <line x1="18" x2="18" y1="20" y2="10" />
                            <line x1="12" x2="12" y1="20" y2="4" />
                            <line x1="6" x2="6" y1="20" y2="14" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Mapping
                        </p>
                      </a>
                    </div>
                  </li>
                  <li className="w-full">
                    <div className="w-full">
                      <a
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/conditions"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-info"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Conditions
                        </p>
                      </a>
                    </div>
                    <div className="w-full">
                      <a
                        className="inline-flex items-center  whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10 mb-1"
                        data-state="closed"
                        href="/thankyou"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-hand-helping"
                          >
                            <path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14" />
                            <path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
                            <path d="m2 13 6 6" />
                          </svg>
                        </span>
                        <p className={`max-w-[200px] truncate translate-x-0 opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Thank You
                        </p>
                      </a>
                    </div>
                  </li>
                  <div className="w-full absolute bottom-8">
                    <li className="w-full flex items-end">
                      <button
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10"
                        data-state="closed"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-bell"
                          >
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                          </svg>
                        </span>
                        <p className={`whitespace-nowrap opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Notifications
                        </p>
                      </button>
                    </li>
                    <li className="w-full flex items-end">
                      <button
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10"
                        data-state="closed"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-settings"
                          >
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l-.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l-.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                        <p className={`whitespace-nowrap opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Settings
                        </p>
                      </button>
                    </li>
                    <li className="w-full flex items-end">
                      <button
                        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full justify-start h-10"
                        data-state="closed"
                      >
                        <span className="mr-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-user"
                          >
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </span>
                        <p className={`whitespace-nowrap opacity-100 ${isSidebarOpen ? '' : 'hidden'}`}>
                          Profile
                        </p>
                      </button>
                    </li>
                  </div>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default MainMenuBar;