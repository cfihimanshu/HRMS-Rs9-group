import React, { useState } from "react";
import { 
  CalendarCheck, 
  FileText, 
  Coins, 
  Download,
  Plus,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import StatCard from "./StatCard";

interface ESSProps {
  user: any;
  triggerToast: (msg: string) => void;
}

export function ESSDashboard({ user, triggerToast }: ESSProps) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
            Employee Self-Service (ESS) Dashboard
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Welcome back, {user?.name}. Here is your quick overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Present Days (This Month)" 
          value="21 / 22" 
          trend="95% Attendance" 
          trendUp={true} 
          icon={<CalendarCheck className="w-5 h-5 text-indigo-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Leave Balance (CL)" 
          value="4.5" 
          trend="Remaining for the year" 
          trendUp={true} 
          icon={<FileText className="w-5 h-5 text-rose-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Leave Balance (SL)" 
          value="7" 
          trend="Remaining for the year" 
          trendUp={true} 
          icon={<FileText className="w-5 h-5 text-emerald-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Upcoming Holiday" 
          value="Diwali" 
          trend="Nov 12, 2026" 
          trendUp={true} 
          icon={<AlertCircle className="w-5 h-5 text-amber-500" />} 
          dark={isDark}
        />
      </div>

      <div className={`p-6 rounded-xl border shadow-sm ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200"}`}>
        <h2 className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Apply Leave</span>
          </button>
          <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>View Payslip</span>
          </button>
          <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Claim Expense</span>
          </button>
          <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <Clock className="w-6 h-6 text-rose-600 dark:text-rose-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Mark Attendance</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ESSLeaves({ user, triggerToast }: ESSProps) {
  const [showApply, setShowApply] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]); // Will fetch from DB later

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-1">Apply for leaves and track your approval status.</p>
        </div>
        <button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => setShowApply(!showApply)}
        >
          {showApply ? "View History" : <><Plus className="w-4 h-4" /> Apply Leave</>}
        </button>
      </div>

      {showApply ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <h2 className="text-sm font-black text-slate-800 mb-4">New Leave Request</h2>
          <form className="space-y-4" onSubmit={async (e) => { 
            e.preventDefault(); 
            const form = e.target as HTMLFormElement;
            try {
              const res = await fetch("/api/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: (form.elements.namedItem("type") as HTMLSelectElement).value,
                  days: Number((form.elements.namedItem("days") as HTMLInputElement).value),
                  startDate: (form.elements.namedItem("startDate") as HTMLInputElement).value,
                  endDate: (form.elements.namedItem("endDate") as HTMLInputElement).value,
                  reason: (form.elements.namedItem("reason") as HTMLTextAreaElement).value
                })
              });
              const data = await res.json();
              if (data.success) {
                triggerToast("Leave request submitted successfully.");
                setShowApply(false);
              } else {
                triggerToast("Failed: " + data.error);
              }
            } catch (err) {
              triggerToast("Error submitting leave request.");
            }
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Leave Type</label>
                <select name="type" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required>
                  <option value="Casual Leave">Casual Leave (Balance: 4.5)</option>
                  <option value="Sick Leave">Sick Leave (Balance: 7)</option>
                  <option value="Earned Leave">Earned Leave (Balance: 0)</option>
                  <option value="Unpaid Leave">Loss of Pay / Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Duration (Days)</label>
                <input name="days" type="number" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" placeholder="e.g. 1" required min="0.5" step="0.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">From Date</label>
                <input name="startDate" type="date" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 font-mono">To Date</label>
                <input name="endDate" type="date" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" required />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Reason for Leave</label>
              <textarea name="reason" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs mt-1" rows={3} placeholder="Please provide a valid reason..." required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-xs font-bold shadow">
              Submit Leave Request
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider mb-4 font-mono">Leave History</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black uppercase font-mono tracking-wider">
                <th className="pb-3 pr-2">Date</th>
                <th className="pb-3 px-2">Type</th>
                <th className="pb-3 px-2">Days</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 pl-2">Approver Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 italic">No leave records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ESSPayroll({ user, triggerToast }: ESSProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div>
        <h1 className="text-xl font-black text-slate-800">My Payslips & Salary</h1>
        <p className="text-xs text-slate-500 mt-1">View your salary structure and download monthly payslips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider mb-4 font-mono">Fixed Salary Structure (Monthly)</h2>
          <div className="space-y-3 text-xs font-bold">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Basic Pay</span>
              <span className="text-slate-800">₹15,000</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">House Rent Allowance (HRA)</span>
              <span className="text-slate-800">₹6,000</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Special Allowance</span>
              <span className="text-slate-800">₹4,000</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">PF Deduction (Employee)</span>
              <span className="text-rose-600">-₹1,800</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-800 font-black uppercase">Net In-Hand Salary</span>
              <span className="text-emerald-600 font-black text-sm">₹23,200</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-[#714B67] tracking-wider mb-4 font-mono">Payslip History</h2>
          <div className="space-y-2 text-xs">
            {["March 2026", "February 2026", "January 2026"].map((month) => (
              <div key={month} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-slate-700">Payslip - {month}</span>
                </div>
                <button 
                  className="bg-white border border-slate-300 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 p-2 rounded shadow-sm transition-all"
                  onClick={() => triggerToast(`Downloading ${month} Payslip (Demo)`)}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ESSExpenses({ user, triggerToast }: ESSProps) {
  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Expense Claims</h1>
          <p className="text-xs text-slate-500 mt-1">Submit receipts for reimbursement.</p>
        </div>
        <button 
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-2"
          onClick={() => triggerToast("New Claim form opening... (Demo)")}
        >
          <Plus className="w-4 h-4" /> File New Claim
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Coins className="w-12 h-12 text-amber-500/30 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Expense Claims</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">You haven't filed any reimbursement requests yet. Click the button above to upload a bill.</p>
        </div>
      </div>
    </div>
  );
}
