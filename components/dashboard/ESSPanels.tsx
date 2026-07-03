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

  const dynamicStats = stats?.currentUserStats || {
    presentDays: 0,
    totalWorkingDays: 22,
    attendancePercent: 100,
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 0,
    holidayName: "Diwali",
    holidayDate: "Nov 12, 2026"
  };

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
          value={`${dynamicStats.presentDays} / ${dynamicStats.totalWorkingDays}`} 
          trend={`${dynamicStats.attendancePercent}% Attendance`} 
          trendUp={dynamicStats.attendancePercent >= 90} 
          icon={<CalendarCheck className="w-5 h-5 text-indigo-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Casual Leave (This Month)" 
          value={String(dynamicStats.casualLeaveTaken ?? 0)} 
          trend="Taken in current month" 
          trendUp={true} 
          icon={<FileText className="w-5 h-5 text-rose-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Sick Leave (This Month)" 
          value={String(dynamicStats.sickLeaveTaken ?? 0)} 
          trend="Taken in current month" 
          trendUp={true} 
          icon={<FileText className="w-5 h-5 text-emerald-500" />} 
          dark={isDark}
        />
        <StatCard 
          title="Upcoming Holiday" 
          value={dynamicStats.holidayName} 
          trend={dynamicStats.holidayDate} 
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

export function ESSLeaves({ user, triggerToast, stats }: ESSProps) {
  const [showApply, setShowApply] = useState(false);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dynamicStats = stats?.currentUserStats || {
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 0
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaves");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);
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
                fetchLeaves();
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
                  <option value="Casual Leave">Casual Leave (Balance: {dynamicStats.casualLeave})</option>
                  <option value="Sick Leave">Sick Leave (Balance: {dynamicStats.sickLeave})</option>
                  <option value="Earned Leave">Earned Leave (Balance: {dynamicStats.earnedLeave})</option>
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">Loading...</td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">No leave records found.</td>
                </tr>
              ) : (
                leaves.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                    <td className="py-3 pr-2 whitespace-nowrap">{new Date(l.startDate).toLocaleDateString()}</td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {l.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono">{l.days}</td>
                    <td className="py-3 px-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' : l.status === 'Pending HR Approval' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                         {l.status}
                       </span>
                    </td>
                    <td className="py-3 pl-2 text-slate-500 text-[11px] italic">
                       {l.status !== "Pending Manager Approval" && l.status !== "Pending HR Approval" ? 
                         (l.approvedBy?.name ? `By: ${l.approvedBy?.name} ${l.remarks ? `(${l.remarks})` : ''}` : '') : 
                         'Awaiting Approval'}
                    </td>
                  </tr>
                ))
              )}
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
  const isAdmin = ["Owner", "Director", "HR Head"].includes(user?.role);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/payroll");
      const pData = await pRes.json();
      if (pData.success) {
        setProcessedPayslips(pData.data);
      }

      if (isAdmin) {
        const empRes = await fetch("/api/employees");
        const empData = await empRes.json();
        if (empData.success) {
          setEmployees(empData.data);
          if (empData.data.length > 0) {
            setSelectedEmpId(empData.data[0].id);
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
    const emp = employees.find(e => e.id === empId);
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
    <div className="space-y-8 animate-fade-in text-[#1C1C1A]">
      
      {/* Header */}
      <div className="border-b border-[#E8E4DF] pb-5">
        <span className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold">Compensation</span>
        <h1 className="text-xl font-light tracking-wide font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
          Payroll & Salary Administration
        </h1>
        <p className="text-[10px] text-[#9C9890] uppercase tracking-wider mt-1.5 font-semibold">
          {isAdmin 
            ? "Calculate, audit and process employee salaries based on performance weights."
            : "Monitor salary structures, payslips and run simulators."
          }
        </p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payroll Generator Form */}
          <div className="lg:col-span-2 bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest mb-6">
              Calculate Salary & Generate Payslip
            </h2>
            
            <form onSubmit={handleProcessPayroll} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Select Employee</label>
                  <select 
                    value={selectedEmpId} 
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeProfile?.employeeId || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Payroll Month</label>
                  <select 
                    value={payrollMonth} 
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Payroll Year</label>
                  <input 
                    type="number" 
                    value={payrollYear} 
                    onChange={(e) => setPayrollYear(Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2.5 rounded-lg text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF]">
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Base Salary</label>
                  <input 
                    type="number" 
                    value={baseSalary} 
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 font-bold text-[#1C1C1A] outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Timing Days (Max 25)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25"
                    step="0.5"
                    value={timingDays} 
                    onChange={(e) => setTimingDays(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Task Days (Max 25)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="25"
                    step="0.5"
                    value={taskDays} 
                    onChange={(e) => setTaskDays(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider block">Output Level (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={outputPercent} 
                    onChange={(e) => setOutputPercent(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                    required
                  />
                </div>
              </div>

              {/* Dynamic Formula Board */}
              <div className="border border-[#E8E4DF] rounded-xl p-4 space-y-3 bg-[#FCFBF9]">
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Timing Portion (30%): <span className="text-[#9C9890]">({timingDays}/25 days)</span>
                  </div>
                  <div className="text-[#1C1C1A] font-bold">₹{Math.round(timingContribution).toLocaleString()} / ₹{Math.round(maxTimingAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Work Task Input (30%): <span className="text-[#9C9890]">({taskDays}/25 days)</span>
                  </div>
                  <div className="text-[#1C1C1A] font-bold">₹{Math.round(taskContribution).toLocaleString()} / ₹{Math.round(maxTaskAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between border-b border-[#E8E4DF]/50 pb-2 text-[11px] font-medium">
                  <div className="text-[#5D5B57]">
                    Output Performance (40%): <span className="text-[#9C9890]">({outputPercent}%)</span>
                  </div>
                  <div className="text-[#1C1C1A] font-bold">₹{Math.round(outputContribution).toLocaleString()} / ₹{Math.round(maxOutputAmount).toLocaleString()}</div>
                </div>
                <div className="flex justify-between pt-2 text-xs font-bold uppercase tracking-widest text-[#1C1C1A]">
                  <div>Calculated Net Payout</div>
                  <div className="text-[#6B8F71] text-sm">₹{calculatedNetSalary.toLocaleString()}</div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedEmpId}
                className="w-full bg-[#C9A84C] hover:bg-[#B3923E] text-white py-3 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all shadow-[0_2px_15px_rgba(201,168,76,0.15)]"
              >
                {loading ? "Processing..." : "Approve & Save Processed Payslip"}
              </button>
            </form>
          </div>

          {/* Configuration Card */}
          <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 space-y-4 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest">
              Calculation Rules
            </h2>
            
            <div className="text-[11px] leading-relaxed space-y-3 font-medium text-[#5D5B57]">
              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">📅 Base Month Duration</span>
                30 Days Month - 4 Sundays - 1 PL = <strong className="text-[#C9A84C]">25 Payable Days</strong>.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">⏱️ Timing Portion (30%)</span>
                Calculated on check-in timing logs and compliance ratio over 25 days.
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">📋 Work Task Input (30%)</span>
                Weighted on daily task commitments (SOD/EOD task reports submitted).
              </div>

              <div className="p-3 bg-[#FAFAF7] rounded-lg border border-[#E8E4DF]">
                <span className="font-semibold text-[#1C1C1A] block mb-1">🚀 Quality Output (40%)</span>
                Linked directly to final output achievements and quality scores.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#FCFBF9] border border-[#E8E4DF] rounded-xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
          <h2 className="text-[10px] font-bold uppercase text-[#C9A84C] tracking-widest mb-6">
            {isAdmin ? "Processed Payslip Registry" : "My Personal Salary structure & Simulator"}
          </h2>

          {!isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Employee Payout Simulator */}
              <div className="p-5 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF]">
                <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase mb-4 tracking-widest">Salary Calculator & Simulator</h3>
                <div className="space-y-4 text-[11px] font-medium">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Base Salary Target</label>
                    <input 
                      type="number" 
                      value={baseSalary} 
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Timing Days</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="25"
                        value={timingDays} 
                        onChange={(e) => setTimingDays(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Task Days</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="25"
                        value={taskDays} 
                        onChange={(e) => setTaskDays(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-[#9C9890] tracking-wider">Output %</label>
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={outputPercent} 
                        onChange={(e) => setOutputPercent(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] p-2 rounded text-xs mt-1 text-[#1C1C1A] outline-none" 
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-[#FCFBF9] rounded-lg space-y-2 border border-[#E8E4DF]">
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Timing (30%):</span>
                      <span>₹{Math.round(timingContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Tasks (30%):</span>
                      <span>₹{Math.round(taskContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5D5B57]">Output (40%):</span>
                      <span>₹{Math.round(outputContribution)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E8E4DF] text-xs font-semibold uppercase tracking-wider text-[#1C1C1A]">
                      <span>Simulated Net Payout:</span>
                      <span className="text-[#C9A84C]">₹{calculatedNetSalary}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanatory Policy Card */}
              <div className="p-5 bg-[#FAFAF7] rounded-xl border border-[#E8E4DF] text-[11px] leading-relaxed space-y-3 font-medium text-[#5D5B57]">
                <h3 className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest">Salary Payout Policy</h3>
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
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[#E8E4DF] text-[#9C9890] font-bold uppercase tracking-wider">
                  {isAdmin && <th className="pb-3 pr-2">Employee</th>}
                  <th className="pb-3 px-2">Month / Year</th>
                  <th className="pb-3 px-2">Basic Salary</th>
                  <th className="pb-3 px-2">Timing Portion</th>
                  <th className="pb-3 px-2">Task Portion</th>
                  <th className="pb-3 px-2 text-center">Net Salary</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DF] text-[#5D5B57] font-medium">
                {processedPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-[#9C9890] italic">
                      No processed payroll records found.
                    </td>
                  </tr>
                ) : (
                  processedPayslips.map((slip, i) => (
                    <tr key={i} className="hover:bg-[#FAFAF7]">
                      {isAdmin && (
                        <td className="py-4 pr-2 font-serif text-sm font-light text-[#1C1C1A]">
                          {slip.employee?.name || "Employee"}
                        </td>
                      )}
                      <td className="py-4 px-2 font-semibold text-[#1C1C1A]">{slip.month} {slip.year}</td>
                      <td className="py-4 px-2">₹{baseSalary.toLocaleString()}</td>
                      <td className="py-4 px-2">₹{slip.basicPay?.toLocaleString()}</td>
                      <td className="py-4 px-2">₹{slip.conveyance?.toLocaleString()}</td>
                      <td className="py-4 px-2 text-center">
                        <span className="px-3 py-1.5 rounded bg-[#C9A84C] text-white font-bold text-xs tracking-wider shadow-[0_2px_10px_rgba(201,168,76,0.15)]">
                          ₹{slip.netPay?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-[#E2EFE0] text-[#4E6D53]">
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-4 pl-2 text-right">
                        <button 
                          onClick={() => triggerToast(`Payslip generated for ${slip.employee?.name || "Staff"}`)}
                          className="border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-white px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-bold transition-all"
                        >
                          Generate Payslip
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
