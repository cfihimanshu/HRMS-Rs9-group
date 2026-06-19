import React, { useState, useEffect } from "react";
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
  setActiveTab?: (tab: string) => void;
  toggleModal?: (modalId: string, open: boolean) => void;
  stats?: any;
}

export function ESSDashboard({ user, triggerToast, setActiveTab, toggleModal, stats }: ESSProps) {
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
        <div className="flex items-center gap-3">
          {(!stats?.currentUserCompliance?.hasSod) && (
            <button 
              onClick={() => toggleModal ? toggleModal("sodModal", true) : setActiveTab?.("attendance")} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              <Clock className="w-4 h-4" /> Declare SOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasSod && !stats?.currentUserCompliance?.hasEod) && (
            <button 
              onClick={() => toggleModal ? toggleModal("eodModal", true) : setActiveTab?.("attendance")} 
              className="bg-[#714B67] hover:bg-[#5F3F56] text-white px-5 py-2.5 rounded-lg text-xs font-black shadow-lg shadow-[#714B67]/20 flex items-center gap-2 transition-all"
            >
              <CalendarCheck className="w-4 h-4" /> Submit EOD
            </button>
          )}
          {(stats?.currentUserCompliance?.hasEod) && (
             <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 flex items-center gap-2">
               <CalendarCheck className="w-4 h-4" /> Day Completed
             </span>
          )}
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
          <button onClick={() => setActiveTab && setActiveTab("ess-leaves")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Apply Leave</span>
          </button>
          <button onClick={() => setActiveTab && setActiveTab("ess-payroll")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>View Payslip</span>
          </button>
          <button onClick={() => setActiveTab && setActiveTab("ess-expenses")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm ${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}>
            <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
            <span className={`text-xs font-bold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Claim Expense</span>
          </button>
          <button onClick={() => toggleModal ? toggleModal(!stats?.currentUserCompliance?.hasSod ? "sodModal" : "eodModal", true) : setActiveTab?.("attendance")} className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all shadow-sm border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40`}>
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" />
            <span className={`text-xs font-bold text-indigo-700 dark:text-indigo-300`}>Fill SOD / EOD</span>
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [baseSalary, setBaseSalary] = useState(13000);
  const [timingDays, setTimingDays] = useState(25);
  const [taskDays, setTaskDays] = useState(25);
  const [outputPercent, setOutputPercent] = useState(100);
  const [payrollMonth, setPayrollMonth] = useState("March");
  const [payrollYear, setPayrollYear] = useState(2026);
  const [processedPayslips, setProcessedPayslips] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const isAdmin = ["Owner", "Director", "HR Head"].includes(user?.role);

  // Math Calculations based on the rules:
  // Base Month: 30 days - 4 Sundays - 1 PL = 25 payable days
  const standardPayableDays = 25;
  
  const timingWeight = 0.30;
  const taskWeight = 0.30;
  const outputWeight = 0.40;

  const maxTimingAmount = baseSalary * timingWeight;
  const maxTaskAmount = baseSalary * taskWeight;
  const maxOutputAmount = baseSalary * outputWeight;

  const timingContribution = (timingDays / standardPayableDays) * maxTimingAmount;
  const taskContribution = (taskDays / standardPayableDays) * maxTaskAmount;
  const outputContribution = (outputPercent / 100) * maxOutputAmount;

  const calculatedNetSalary = Math.round(timingContribution + taskContribution + outputContribution);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch processed payslips
      const pRes = await fetch("/api/payroll");
      const pData = await pRes.json();
      if (pData.success) {
        setProcessedPayslips(pData.data);
      }

      // If Admin, fetch employee list
      if (isAdmin) {
        const empRes = await fetch("/api/employees");
        const empData = await empRes.json();
        if (empData.success) {
          setEmployees(empData.data);
          if (empData.data.length > 0) {
            setSelectedEmpId(empData.data[0].mongo_id);
            setBaseSalary(empData.data[0].employeeProfile?.baseSalary || 13000);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.mongo_id === empId);
    if (emp && emp.employeeProfile?.baseSalary) {
      setBaseSalary(emp.employeeProfile.baseSalary);
    } else {
      setBaseSalary(13000);
    }
  };

  const handleProcessPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      triggerToast("Please select an employee.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        employeeId: selectedEmpId,
        month: payrollMonth,
        year: Number(payrollYear),
        basicPay: Math.round(timingContribution),
        hra: 0,
        conveyance: Math.round(taskContribution),
        specialAllowance: Math.round(outputContribution),
        pfDeduction: 0,
        ptDeduction: 0,
        tdsDeduction: 0
      };

      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`🎉 Payroll processed successfully for ${payrollMonth} ${payrollYear}`);
        fetchData();
      } else {
        triggerToast(`Error: ${data.error}`);
      }
    } catch (err) {
      triggerToast("Failed to process payroll.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-gray-100">
      <div>
        <h1 className="text-xl font-black text-slate-800 dark:text-white">Payroll & Dynamic Salary Command</h1>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
          {isAdmin 
            ? "Calculate, audit and process employee salaries based on timing, tasks, and output performance weights."
            : "Monitor salary structures, payslips and use the payout simulator."
          }
        </p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payroll Generator Form */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase text-[#714B67] dark:text-[#a78bfa] tracking-wider mb-6 font-mono">
              Calculate Salary & Generate Payslip
            </h2>
            
            <form onSubmit={handleProcessPayroll} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Select Employee</label>
                  <select 
                    value={selectedEmpId} 
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2.5 rounded text-xs mt-1 text-slate-800 dark:text-gray-100" 
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.mongo_id} value={emp.mongo_id}>
                        {emp.name} ({emp.employeeProfile?.employeeId || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Payroll Month</label>
                  <select 
                    value={payrollMonth} 
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2.5 rounded text-xs mt-1 text-slate-800 dark:text-gray-100" 
                    required
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 font-mono">Payroll Year</label>
                  <input 
                    type="number" 
                    value={payrollYear} 
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2.5 rounded text-xs mt-1 text-slate-800 dark:text-gray-100" 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/50 dark:border-gray-800">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 dark:text-gray-400 font-mono block">Base Salary</label>
                  <input 
                    type="number" 
                    value={baseSalary} 
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1 font-bold" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 dark:text-gray-400 font-mono block">Timing Days (Max 25)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25"
                    step="0.5"
                    value={timingDays} 
                    onChange={(e) => setTimingDays(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 dark:text-gray-400 font-mono block">Work Task Days (Max 25)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25"
                    step="0.5"
                    value={taskDays} 
                    onChange={(e) => setTaskDays(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 dark:text-gray-400 font-mono block">Output Level (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={outputPercent} 
                    onChange={(e) => setOutputPercent(parseInt(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                    required
                  />
                </div>
              </div>

              {/* Dynamic Formula Board */}
              <div className="border border-slate-100 dark:border-gray-800 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900">
                <div className="flex justify-between border-b dark:border-gray-800 pb-2 text-xs font-semibold">
                  <div className="text-slate-500 dark:text-gray-400">
                    Timing Weight (30%): <span className="text-slate-400">({timingDays}/25 days)</span>
                  </div>
                  <div className="text-slate-800 dark:text-gray-100 font-bold">₹{Math.round(timingContribution).toLocaleString()} / ₹{Math.round(maxTimingAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between border-b dark:border-gray-800 pb-2 text-xs font-semibold">
                  <div className="text-slate-500 dark:text-gray-400">
                    Work Task Input (30%): <span className="text-slate-400">({taskDays}/25 days)</span>
                  </div>
                  <div className="text-slate-800 dark:text-gray-100 font-bold">₹{Math.round(taskContribution).toLocaleString()} / ₹{Math.round(maxTaskAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between border-b dark:border-gray-800 pb-2 text-xs font-semibold">
                  <div className="text-slate-500 dark:text-gray-400">
                    Output Performance (40%): <span className="text-slate-400">({outputPercent}%)</span>
                  </div>
                  <div className="text-slate-800 dark:text-gray-100 font-bold">₹{Math.round(outputContribution).toLocaleString()} / ₹{Math.round(maxOutputAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between pt-2 text-sm font-black uppercase">
                  <div className="text-slate-850 dark:text-white">Calculated Net Payout</div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-lg">₹{calculatedNetSalary.toLocaleString()}</div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedEmpId}
                className="w-full bg-[#714B67] hover:bg-[#5F3F56] text-white py-3 rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : "Approve & Save Processed Payslip"}
              </button>
            </form>
          </div>

          {/* Configuration Card */}
          <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-black uppercase text-[#714B67] dark:text-[#a78bfa] tracking-wider font-mono">
              Calculation Rules
            </h2>
            
            <div className="text-xs leading-relaxed space-y-3 font-semibold text-slate-600 dark:text-gray-300">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700">
                <span className="font-black text-slate-800 dark:text-white block mb-1">📅 Base Month Duration</span>
                30 Days Month - 4 Sundays - 1 PL = <strong className="text-purple-600 dark:text-purple-400">25 Payable Days</strong>.
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700">
                <span className="font-black text-slate-800 dark:text-white block mb-1">⏱️ Timing Portion (30%)</span>
                Calculated on check-in timing logs and compliance ratio over 25 days.
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700">
                <span className="font-black text-slate-800 dark:text-white block mb-1">📋 Work Task Input (30%)</span>
                Weighted on daily task commitments (SOD/EOD task reports submitted).
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-100 dark:border-gray-700">
                <span className="font-black text-slate-800 dark:text-white block mb-1">🚀 Quality Output (40%)</span>
                Linked directly to final output achievements and quality scores.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase text-[#714B67] dark:text-[#a78bfa] tracking-wider mb-4 font-mono">
            {isAdmin ? "Processed Payslip Registry" : "My Personal Salary structure & Simulator"}
          </h2>

          {!isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Employee Payout Simulator */}
              <div className="p-5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200 dark:border-gray-800">
                <h3 className="text-xs font-black text-[#714B67] dark:text-[#a78bfa] uppercase mb-4 tracking-wider">Salary Calculator & Simulator</h3>
                <div className="space-y-4 text-xs font-bold">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-500 font-mono">Base Salary Target</label>
                    <input 
                      type="number" 
                      value={baseSalary} 
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-500 font-mono">Timing Days</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="25"
                        value={timingDays} 
                        onChange={(e) => setTimingDays(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-500 font-mono">Task Days</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="25"
                        value={taskDays} 
                        onChange={(e) => setTaskDays(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-500 font-mono">Output %</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={outputPercent} 
                        onChange={(e) => setOutputPercent(parseInt(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded text-xs mt-1" 
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg space-y-2 border">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Timing (30%):</span>
                      <span>₹{Math.round(timingContribution)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Tasks (30%):</span>
                      <span>₹{Math.round(taskContribution)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Output (40%):</span>
                      <span>₹{Math.round(outputContribution)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t text-xs font-black uppercase text-slate-800 dark:text-white">
                      <span>Simulated Net Payout:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">₹{calculatedNetSalary}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanatory Policy Card */}
              <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs leading-relaxed space-y-3 font-semibold text-slate-600 dark:text-gray-300">
                <h3 className="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Salary Payout Policy</h3>
                <p>Your monthly salary is dynamically calculated based on three metrics over a <strong>25-day payable month</strong> (30 days total - 4 Sundays - 1 PL):</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>30% Timing Weight</strong>: Attendance hours, check-in and check-out logs.</li>
                  <li><strong>30% Work Task Weight</strong>: Daily task inputs, SOD / EOD commitments.</li>
                  <li><strong>40% Output Weight</strong>: Performance quality scores and target completions.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Payslips Registry List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500 font-black uppercase font-mono tracking-wider">
                  {isAdmin && <th className="pb-3 pr-2">Employee</th>}
                  <th className="pb-3 px-2">Month / Year</th>
                  <th className="pb-3 px-2">Timing portion (30%)</th>
                  <th className="pb-3 px-2">Task portion (30%)</th>
                  <th className="pb-3 px-2">Output portion (40%)</th>
                  <th className="pb-3 px-2">Net Pay</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-slate-700 dark:text-gray-300 font-medium">
                {processedPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400 dark:text-gray-500 italic">
                      No processed payroll records found.
                    </td>
                  </tr>
                ) : (
                  processedPayslips.map((slip, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-800/40">
                      {isAdmin && (
                        <td className="py-3 pr-2 font-bold text-slate-800 dark:text-white">
                          {slip.employee?.name || "Employee"}
                        </td>
                      )}
                      <td className="py-3 px-2 font-mono">{slip.month} {slip.year}</td>
                      <td className="py-3 px-2">₹{slip.basicPay?.toLocaleString()}</td>
                      <td className="py-3 px-2">₹{slip.conveyance?.toLocaleString()}</td>
                      <td className="py-3 px-2">₹{slip.specialAllowance?.toLocaleString()}</td>
                      <td className="py-3 px-2 text-emerald-600 dark:text-emerald-400 font-black">₹{slip.netPay?.toLocaleString()}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40">
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <button 
                          className="bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-700 hover:border-indigo-500 hover:text-indigo-650 p-1.5 rounded shadow-sm transition-all"
                          onClick={() => triggerToast(`Downloading payslip invoice for ${slip.month} ${slip.year}`)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
