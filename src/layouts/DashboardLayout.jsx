import { NavLink, Outlet } from "react-router-dom"

import {
  LayoutDashboard,
  Database,
  FlaskConical,
  Trophy,
  GitCompare,
  Lightbulb,
  Settings,
  Sparkles,
} from "lucide-react"


function DashboardLayout() {

  const workspaceLinks = [
    {
      name: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Dataset",
      path: "/dataset",
      icon: Database,
    },
    {
      name: "Experiments",
      path: "/experiments",
      icon: FlaskConical,
    },
  ]

  const analysisLinks = [
    {
      name: "Model Arena",
      path: "/model-arena",
      icon: Trophy,
    },
    {
      name: "Compare",
      path: "/compare",
      icon: GitCompare,
    },
    {
      name: "Insights",
      path: "/insights",
      icon: Lightbulb,
    },
  ]

  const navClasses = ({ isActive }) => `
    flex items-center gap-3 rounded-lg px-3 py-2.5
    text-sm font-medium transition-all duration-200
    ${
      isActive
        ? "bg-violet-50 text-violet-700"
        : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    }
  `

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-neutral-900">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="flex w-64 flex-col border-r border-neutral-200 bg-white px-4 py-6">

          {/* Brand */}
          <div className="mb-10 px-2">

            <div className="flex items-center gap-3">

              <div className="
                flex h-9 w-9 items-center justify-center
                rounded-xl bg-neutral-900 text-white
              ">
                <Sparkles size={17} strokeWidth={2} />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-neutral-900">
                  MLens
                </h1>

                <p className="text-[11px] text-neutral-400">
                  Machine Learning Lab
                </p>
              </div>

            </div>

          </div>


          {/* WORKSPACE */}
          <div className="mb-8">

            <p className="
              mb-2 px-3
              text-[10px] font-semibold uppercase
              tracking-[0.16em] text-neutral-400
            ">
              Workspace
            </p>

            <nav className="space-y-1">

              {workspaceLinks.map((link) => {

                const Icon = link.icon

                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === "/"}
                    className={navClasses}
                  >
                    <Icon size={17} strokeWidth={1.8} />

                    <span>
                      {link.name}
                    </span>
                  </NavLink>
                )

              })}

            </nav>

          </div>


          {/* ANALYSIS */}
          <div>

            <p className="
              mb-2 px-3
              text-[10px] font-semibold uppercase
              tracking-[0.16em] text-neutral-400
            ">
              Analysis
            </p>

            <nav className="space-y-1">

              {analysisLinks.map((link) => {

                const Icon = link.icon

                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={navClasses}
                  >
                    <Icon size={17} strokeWidth={1.8} />

                    <span>
                      {link.name}
                    </span>
                  </NavLink>
                )

              })}

            </nav>

          </div>


          {/* BOTTOM */}
          <div className="mt-auto">

            <div className="mb-4 border-t border-neutral-100" />

            <button
              className="
                flex w-full items-center gap-3
                rounded-lg px-3 py-2.5
                text-sm font-medium text-neutral-500
                transition hover:bg-neutral-100 hover:text-neutral-900
              "
            >
              <Settings size={17} strokeWidth={1.8} />

              <span>
                Settings
              </span>
            </button>


            {/* Version */}
            <div className="mt-5 px-3">

              <p className="text-[10px] text-neutral-400">
                MLens
              </p>

              <p className="mt-0.5 text-[10px] text-neutral-300">
                Interactive ML Laboratory · v0.1
              </p>

            </div>

          </div>

        </aside>


        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1">

          <div className="min-h-screen px-8 py-7 lg:px-10">

            <Outlet />

          </div>

        </main>

      </div>

    </div>
  )
}


export default DashboardLayout