import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AllEmployees from "@/components/dashboard/AllEmployees";

export default async function EmployeeManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only HR, HR Head, and Owner can access
  const allowedRoles = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"];
  const user = session.user as any;
  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                  Dashboard
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-600 font-medium">Employee Management</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        {/* Main Content */}
        <AllEmployees />
      </div>
    </div>
  );
}
