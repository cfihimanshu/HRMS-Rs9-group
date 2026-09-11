"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Clock3, FileText, Plus, Receipt, ShieldCheck, Trash2, Upload, X } from "lucide-react";

export const SECURITY_WORKFLOW_STAGES = [
  { key: "bank_visit", label: "Bank Visit & Discussion", hint: "Bank mein kya baat hui, poori meeting note likhein." },
  { key: "quotation", label: "Quotation Submitted", hint: "Quotation/rate proposal ki copy upload karein." },
  { key: "rate_meeting", label: "Rate Decision Meeting", hint: "Rate approve/reject aur bank ka decision record karein." },
  { key: "work_order", label: "Work Order Received", hint: "Bank ka work order upload karein." },
  { key: "agreement", label: "Agreement Signed", hint: "Signed agreement ki copy upload karein." },
  { key: "notary", label: "Notary Completed", hint: "Notarised document ka proof upload karein." },
  { key: "authority_letter", label: "Site Authority Letter", hint: "Bank se mila site authority letter upload karein." },
  { key: "guard_deployment", label: "Guards Deployed", hint: "Guard deployment details aur joining/site proof upload karein." },
  { key: "billing", label: "Bill Generated", hint: "Deployment ke baad generated bill upload karein." },
  { key: "payment_followup", label: "Payment Follow-up", hint: "Bill follow-up ki calls/meetings aur payment update likhein." },
] as const;

type StageKey = (typeof SECURITY_WORKFLOW_STAGES)[number]["key"];
type FollowUpEntry = { id: string; type: string; date: string; time: string; contactName: string; contactDetail: string; details: string; outcome: string; nextFollowUpDate: string; proofUrls: string[]; billingMonth?: string };
type MonthlyGuardPayment = { guardId: string; guardName: string; amount: number };
type MoneyLog = { id: string; date: string; amount: number; note: string; guardId?: string; guardName?: string };
type MonthlyCycle = { month: string; guardPayable: number; guardPayments?: MonthlyGuardPayment[]; clientPaymentLogs?: MoneyLog[]; guardPaymentLogs?: MoneyLog[]; guardPaidAmount?: number; billNo: string; billDate: string; billAmount: number; billInvoiceUrl: string; receivedAmount: number; paymentStatus: "Due" | "Partially Paid" | "Payment Done"; followUps: FollowUpEntry[] };
type StageState = { status: "pending" | "in_progress" | "completed" | "rejected"; date: string; notes: string; proofUrls: string[]; followUps?: FollowUpEntry[] };
type DeployedGuard = { name: string; phone: string; photoUrl: string; monthlySalary: string; shiftType: string; shiftTiming: string; startDate: string; endDate: string; shiftRate: string; allowancePerShift: string };
const newGuard = (): DeployedGuard => ({ name: "", phone: "", photoUrl: "", monthlySalary: "", shiftType: "8 Hours Morning Shift", shiftTiming: "08:00 AM - 04:00 PM", startDate: "", endDate: "", shiftRate: "", allowancePerShift: "" });
const toLocalDateTimeInput = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const emptyStages = () => SECURITY_WORKFLOW_STAGES.reduce((result, stage) => {
  result[stage.key] = { status: "pending", date: "", notes: "", proofUrls: [] };
  return result;
}, {} as Record<StageKey, StageState>);

const parseStages = (item: any) => {
  const base = emptyStages();
  if (!item?.workflowJson) return base;
  try {
    const parsed = JSON.parse(item.workflowJson);
    for (const stage of SECURITY_WORKFLOW_STAGES) {
      if (parsed?.[stage.key]) base[stage.key] = { ...base[stage.key], ...parsed[stage.key], proofUrls: parsed[stage.key].proofUrls || [] };
    }
  } catch {}
  return base;
};
const parseMonthlyCycles = (item: any): MonthlyCycle[] => {
  try { const value = JSON.parse(item?.workflowJson || "{}").monthlyCycles; return Array.isArray(value) ? value : []; } catch { return []; }
};
const initialBillingMonth = (item: any) => {
  const cycles = parseMonthlyCycles(item);
  if (cycles.length) {
    const latestMonth = [...cycles].sort((a, b) => b.month.localeCompare(a.month))[0].month;
    const [year, month] = latestMonth.split("-").map(Number);
    return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
  }
  if (item?.billNo && item?.billDate) {
    const date = new Date(`${String(item.billDate).slice(0, 10)}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 1);
    return date.toISOString().slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
};

export default function SecurityWorkflowModal({ item, nbfcsList, nbfcBranchesList, onClose, onSaved, triggerToast }: {
  item: any | null;
  nbfcsList: any[];
  nbfcBranchesList: any[];
  onClose: () => void;
  onSaved: () => void;
  triggerToast: (message: string) => void;
}) {
  const [company, setCompany] = useState(item?.company || "Force009");
  const [companies, setCompanies] = useState<any[]>([]);
  const [nbfcs, setNbfcs] = useState<any[]>(nbfcsList || []);
  const [branches, setBranches] = useState<any[]>(nbfcBranchesList || []);
  const [nbfcId, setNbfcId] = useState(String(item?.nbfcId || ""));
  const [branchId, setBranchId] = useState(String(item?.branchId || ""));
  const [nbfcName, setNbfcName] = useState(item?.nbfcName || "");
  const [branchName, setBranchName] = useState(item?.branchName || "");
  const [agentName, setAgentName] = useState(String(item?.agentName || ""));
  const [followUpAt, setFollowUpAt] = useState(() => toLocalDateTimeInput(item?.followUpAt));
  const [siteLocation, setSiteLocation] = useState(String(item?.location || ""));
  const [stages, setStages] = useState<Record<StageKey, StageState>>(() => parseStages(item));
  const [activeKey, setActiveKey] = useState<StageKey>(() => (item?.workflowStage as StageKey) || "bank_visit");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addMaster, setAddMaster] = useState<"company" | "nbfc" | "branch" | null>(null);
  const [masterForm, setMasterForm] = useState({ name: "", code: "" });
  const [savingMaster, setSavingMaster] = useState(false);
  const [dbGuards, setDbGuards] = useState<any[]>([]);
  const [showGuardMasterForm, setShowGuardMasterForm] = useState(false);
  const [guardMasterForm, setGuardMasterForm] = useState({ name: "", phone: "", photoUrl: "", monthlySalary: "" });
  const [savingGuardMaster, setSavingGuardMaster] = useState(false);
  const [billDetails, setBillDetails] = useState({
    billNo: String(item?.billNo || ""), billDate: String(item?.billDate || ""),
    billAmount: item?.billAmount ? String(item.billAmount) : "", billInvoiceUrl: String(item?.billInvoiceUrl || ""),
  });
  const [billingMonth, setBillingMonth] = useState(() => initialBillingMonth(item));
  const [monthlyCycles, setMonthlyCycles] = useState<MonthlyCycle[]>(() => parseMonthlyCycles(item));
  const [savingMonth, setSavingMonth] = useState(false);
  const [guardPayable, setGuardPayable] = useState(0);
  const guardPayableManuallyEdited = React.useRef(false);
  const [monthlyReceived, setMonthlyReceived] = useState("");
  const [monthlyGuardPayments, setMonthlyGuardPayments] = useState<MonthlyGuardPayment[]>([]);
  const [manualGuardId, setManualGuardId] = useState("");
  const [manualGuardAmount, setManualGuardAmount] = useState("");
  const [clientPaymentLogs, setClientPaymentLogs] = useState<MoneyLog[]>([]);
  const [guardPaymentLogs, setGuardPaymentLogs] = useState<MoneyLog[]>([]);
  const [paymentEditMonth, setPaymentEditMonth] = useState<string | null>(null);
  const [paymentModalMonth, setPaymentModalMonth] = useState<string | null>(null);
  const [popupClientAmount, setPopupClientAmount] = useState("");
  const [popupGuardAmount, setPopupGuardAmount] = useState("");
  const [popupGuardAmounts, setPopupGuardAmounts] = useState<Record<string, string>>({});
  const [popupPaymentDate, setPopupPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpEntry>({ id: "", type: "Call", date: new Date().toISOString().slice(0, 10), time: "", contactName: "", contactDetail: "", details: "", outcome: "", nextFollowUpDate: "", proofUrls: [], billingMonth: new Date().toISOString().slice(0, 7) });
  const [customCommunicationType, setCustomCommunicationType] = useState("");
  const [guards, setGuards] = useState<DeployedGuard[]>(() => {
    try {
      const parsed = JSON.parse(item?.guardDetailsJson || "[]");
      return Array.isArray(parsed) && parsed.length ? parsed.map((guard: any) => ({ ...newGuard(), ...guard })) : [];
    } catch { return []; }
  });

  useEffect(() => {
    fetch("/api/legal-recovery/company").then((response) => response.json()).then((result) => setCompanies(Array.isArray(result.data) ? result.data : [])).catch(() => setCompanies([]));
    Promise.all([
      fetch("/api/legal-recovery/nbfc").then((response) => response.json()),
      fetch("/api/legal-recovery/nbfc-branches").then((response) => response.json()),
    ]).then(([nbfcResult, branchResult]) => {
      const freshNbfcs = Array.isArray(nbfcResult.data) ? nbfcResult.data : [];
      const freshBranches = Array.isArray(branchResult.data) ? branchResult.data : [];
      setNbfcs(freshNbfcs);
      setBranches(freshBranches);
      const matchedNbfc = freshNbfcs.find((entry: any) => String(entry.id) === String(item?.nbfcId || "") || String(entry.nbfcName).trim().toLowerCase() === String(item?.nbfcName || "").trim().toLowerCase());
      if (matchedNbfc) {
        setNbfcId(String(matchedNbfc.id));
        setNbfcName(matchedNbfc.nbfcName || "");
        const matchedBranch = freshBranches.find((entry: any) => String(entry.nbfcId) === String(matchedNbfc.id) && (String(entry.id) === String(item?.branchId || "") || String(entry.branchName).trim().toLowerCase() === String(item?.branchName || "").trim().toLowerCase()));
        if (matchedBranch) { setBranchId(String(matchedBranch.id)); setBranchName(matchedBranch.branchName || ""); }
      }
    }).catch(() => {});
    fetch("/api/legal-recovery/guards")
      .then((response) => response.json())
      .then((result) => setDbGuards(Array.isArray(result.data) ? result.data : []))
      .catch(() => setDbGuards([]));
  }, []);

  useEffect(() => {
    if (!item?.id || !billingMonth) return setGuardPayable(0);
    let cancelled = false;
    guardPayableManuallyEdited.current = false;
    const cycle = monthlyCycles.find((entry) => entry.month === billingMonth);
    if (cycle) {
      setGuardPayable(Number(cycle.guardPayable || 0));
      guardPayableManuallyEdited.current = true;
    }
    fetch(`/api/legal-recovery/security/guard-attendance?securityId=${item.id}&month=${billingMonth}`)
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && !cycle && !guardPayableManuallyEdited.current) setGuardPayable((result.data || []).reduce((sum: number, row: any) => sum + Number(row.payoutAmount || 0), 0));
      })
      .catch(() => { if (!cancelled && !cycle && !guardPayableManuallyEdited.current) setGuardPayable(0); });
    if (cycle) {
      setBillDetails({ billNo: cycle.billNo, billDate: cycle.billDate, billAmount: String(cycle.billAmount || ""), billInvoiceUrl: cycle.billInvoiceUrl });
      setMonthlyReceived(String(cycle.receivedAmount || ""));
      setMonthlyGuardPayments(cycle.guardPayments || []);
      setClientPaymentLogs(cycle.clientPaymentLogs || []);
      setGuardPaymentLogs(cycle.guardPaymentLogs || []);
    } else if (monthlyCycles.length > 0 || !item?.billNo) {
      setBillDetails({ billNo: "", billDate: "", billAmount: "", billInvoiceUrl: "" });
      setMonthlyReceived("");
      setMonthlyGuardPayments([]);
      setClientPaymentLogs([]);
      setGuardPaymentLogs([]);
    }
    return () => { cancelled = true; };
  }, [billingMonth, item?.id]);

  const addManualGuardPayment = () => {
    const guard = dbGuards.find((entry) => String(entry.id) === manualGuardId);
    const amount = Number(manualGuardAmount || 0);
    if (!guard || amount <= 0) return triggerToast("Select guard and enter a valid payable amount");
    setMonthlyGuardPayments((current) => [...current.filter((entry) => entry.guardId !== manualGuardId), { guardId: manualGuardId, guardName: guard.name, amount }]);
    setManualGuardId(""); setManualGuardAmount("");
  };

  const persistMonthlyCycles = async (cycles: MonthlyCycle[]) => {
    if (!item?.id) return false;
    const sortedCycles = [...cycles].sort((a, b) => b.month.localeCompare(a.month));
    const latestCycle = sortedCycles[0];
    const billingStage: StageState = {
      ...stages.billing,
      status: latestCycle ? "completed" : "pending",
      date: latestCycle?.billDate || "",
      notes: "",
      proofUrls: [],
    };
    const workflowToSave = { ...stages, billing: billingStage, monthlyCycles: sortedCycles };
    const response = await fetch("/api/legal-recovery/security", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        workflowStage: "billing",
        workflowJson: JSON.stringify(workflowToSave),
        billNo: latestCycle?.billNo || "",
        billDate: latestCycle?.billDate || null,
        billAmount: latestCycle?.billAmount || 0,
        billInvoiceUrl: latestCycle?.billInvoiceUrl || "",
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Monthly details could not be saved");
    setStages((current) => ({ ...current, billing: billingStage }));
    return true;
  };

  const saveMonthlyCycle = async () => {
    const billAmount = Number(billDetails.billAmount || 0);
    const loggedReceived = clientPaymentLogs.reduce((sum, log) => sum + log.amount, 0);
    const receivedAmount = clientPaymentLogs.length ? loggedReceived : Number(monthlyReceived || 0);
    if (!billingMonth || !billDetails.billNo.trim() || !billDetails.billDate || billAmount <= 0 || !billDetails.billInvoiceUrl) return triggerToast("Month, invoice number, date, bill amount and bill copy are required");
    if (receivedAmount < 0 || receivedAmount > billAmount) return triggerToast("Received amount cannot exceed bill amount");
    const previous = monthlyCycles.find((entry) => entry.month === billingMonth);
    const manualPayable = monthlyGuardPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const effectiveGuardPayable = monthlyGuardPayments.length ? manualPayable : guardPayable;
    const guardPaidAmount = guardPaymentLogs.reduce((sum, log) => sum + log.amount, 0);
    if (guardPaidAmount > effectiveGuardPayable) return triggerToast("Guard paid amount cannot exceed guard payable amount");
    const cycle: MonthlyCycle = { month: billingMonth, guardPayable: effectiveGuardPayable, guardPayments: monthlyGuardPayments, clientPaymentLogs, guardPaymentLogs, guardPaidAmount, billNo: billDetails.billNo.trim(), billDate: billDetails.billDate, billAmount, billInvoiceUrl: billDetails.billInvoiceUrl, receivedAmount, paymentStatus: receivedAmount >= billAmount ? "Payment Done" : receivedAmount > 0 ? "Partially Paid" : "Due", followUps: previous?.followUps || [] };
    const nextCycles = [...monthlyCycles.filter((entry) => entry.month !== billingMonth), cycle].sort((a, b) => b.month.localeCompare(a.month));
    setSavingMonth(true);
    try {
      const savedToDatabase = await persistMonthlyCycles(nextCycles);
      setMonthlyCycles(nextCycles);
      if (!savedToDatabase) triggerToast("Monthly entry added. Create Workflow to save it in the database.");
    } catch (error: any) {
      triggerToast(error.message || "Monthly details could not be saved");
      return;
    } finally {
      setSavingMonth(false);
    }
    const [year, month] = billingMonth.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
    setBillingMonth(nextMonth);
    setPaymentEditMonth(null);
    setBillDetails({ billNo: "", billDate: "", billAmount: "", billInvoiceUrl: "" });
    setGuardPayable(0); setMonthlyReceived(""); setMonthlyGuardPayments([]); setClientPaymentLogs([]); setGuardPaymentLogs([]);
    setManualGuardId(""); setManualGuardAmount("");
    if (item?.id) triggerToast("Monthly bill and guard payable saved in the database.");
  };

  const cancelPaymentEntry = () => {
    const sourceMonth = paymentEditMonth || billingMonth;
    const [year, month] = sourceMonth.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
    setPaymentEditMonth(null);
    setBillingMonth(nextMonth);
    setBillDetails({ billNo: "", billDate: `${nextMonth}-01`, billAmount: "", billInvoiceUrl: "" });
    setGuardPayable(0); setMonthlyReceived(""); setMonthlyGuardPayments([]); setClientPaymentLogs([]); setGuardPaymentLogs([]);
    triggerToast("Payment entry cancelled. No monthly record was changed.");
  };

  const savePaymentPopup = async () => {
    const clientAmount = Number(popupClientAmount || 0);
    const cycle = monthlyCycles.find((entry) => entry.month === paymentModalMonth);
    if (!cycle) return triggerToast("Monthly invoice not found");
    const hasGuardBreakdown = Boolean(cycle.guardPayments?.length);
    const guardAmounts = (cycle.guardPayments || []).map((guard) => ({ ...guard, paidNow: Number(popupGuardAmounts[guard.guardId] || 0) }));
    const guardAmount = hasGuardBreakdown ? guardAmounts.reduce((sum, guard) => sum + guard.paidNow, 0) : Number(popupGuardAmount || 0);
    if (!paymentModalMonth || !popupPaymentDate || clientAmount < 0 || guardAmount < 0 || clientAmount + guardAmount <= 0) return triggerToast("Enter client received or guard paid amount");
    for (const guard of guardAmounts) {
      const alreadyPaid = (cycle.guardPaymentLogs || []).filter((log) => log.guardId === guard.guardId).reduce((sum, log) => sum + log.amount, 0);
      if (guard.paidNow < 0 || alreadyPaid + guard.paidNow > guard.amount) return triggerToast(`${guard.guardName} payment cannot exceed payable amount`);
    }
    const nextReceived = Number(cycle.receivedAmount || 0) + clientAmount;
    const nextGuardPaid = Number(cycle.guardPaidAmount || 0) + guardAmount;
    if (nextReceived > cycle.billAmount) return triggerToast("Client received cannot exceed bill amount");
    if (nextGuardPaid > cycle.guardPayable) return triggerToast("Guard paid cannot exceed guard payable");
    const nextCycles: MonthlyCycle[] = monthlyCycles.map((entry) => entry.month !== paymentModalMonth ? entry : {
      ...entry,
      receivedAmount: nextReceived,
      guardPaidAmount: nextGuardPaid,
      clientPaymentLogs: clientAmount > 0 ? [...(entry.clientPaymentLogs || []), { id: `client_${Date.now()}`, date: popupPaymentDate, amount: clientAmount, note: "Client payment received" }] : (entry.clientPaymentLogs || []),
      guardPaymentLogs: guardAmount > 0 ? [...(entry.guardPaymentLogs || []), ...(hasGuardBreakdown
        ? guardAmounts.filter((guard) => guard.paidNow > 0).map((guard) => ({ id: `guard_${guard.guardId}_${Date.now()}`, date: popupPaymentDate, amount: guard.paidNow, note: `Payment paid to ${guard.guardName}`, guardId: guard.guardId, guardName: guard.guardName }))
        : [{ id: `guard_${Date.now()}`, date: popupPaymentDate, amount: guardAmount, note: "Guard payment paid" }])] : (entry.guardPaymentLogs || []),
      paymentStatus: nextReceived >= entry.billAmount ? "Payment Done" : nextReceived > 0 ? "Partially Paid" : "Due"
    });
    setSavingMonth(true);
    try {
      await persistMonthlyCycles(nextCycles);
      setMonthlyCycles(nextCycles);
    } catch (error: any) {
      triggerToast(error.message || "Payment could not be saved");
      return;
    } finally {
      setSavingMonth(false);
    }
    setPaymentModalMonth(null); setPopupClientAmount(""); setPopupGuardAmount(""); setPopupGuardAmounts({});
    triggerToast("Payment saved in the database.");
  };

  const deleteMonthlyCycle = async (month: string) => {
    if (!window.confirm("Delete this monthly bill and its payment history?")) return;
    const nextCycles = monthlyCycles.filter((cycle) => cycle.month !== month);
    setSavingMonth(true);
    try {
      await persistMonthlyCycles(nextCycles);
      setMonthlyCycles(nextCycles);
    } catch (error: any) {
      triggerToast(error.message || "Monthly entry could not be deleted");
      return;
    } finally {
      setSavingMonth(false);
    }
    if (billingMonth === month || paymentEditMonth === month) {
      const [year, monthNumber] = month.split("-").map(Number);
      const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 7);
      setPaymentEditMonth(null);
      setBillingMonth(nextMonth);
      setBillDetails({ billNo: "", billDate: `${nextMonth}-01`, billAmount: "", billInvoiceUrl: "" });
      setGuardPayable(0); setMonthlyReceived(""); setMonthlyGuardPayments([]); setClientPaymentLogs([]); setGuardPaymentLogs([]);
    }
    if (paymentModalMonth === month) setPaymentModalMonth(null);
    triggerToast("Monthly entry deleted from the database.");
  };

  const addToMaster = async () => {
    if (!masterForm.name.trim()) return triggerToast("Name required hai");
    if (addMaster === "branch" && !masterForm.code.trim()) return triggerToast("Branch code required hai");
    setSavingMaster(true);
    try {
      const config = addMaster === "company"
        ? { url: "/api/legal-recovery/company", body: { companyName: masterForm.name.trim() } }
        : addMaster === "nbfc"
          ? { url: "/api/legal-recovery/nbfc", body: { nbfcName: masterForm.name.trim(), nbfcCode: masterForm.code.trim() || null } }
          : { url: "/api/legal-recovery/nbfc-branches", body: { nbfcId: nbfcId || 1, branchName: masterForm.name.trim(), branchCode: masterForm.code.trim() } };
      const response = await fetch(config.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Master save failed");
      const created = result.data;
      if (addMaster === "company") { setCompanies((prev) => [...prev, created]); setCompany(created.companyName); }
      else if (addMaster === "nbfc") { setNbfcs((prev) => [...prev, created]); setNbfcId(String(created.id)); setNbfcName(created.nbfcName); setBranchId(""); setBranchName(""); }
      else { setBranches((prev) => [...prev, created]); setBranchId(String(created.id)); setBranchName(created.branchName); }
      triggerToast(`${addMaster === "nbfc" ? "NBFC" : addMaster === "branch" ? "Branch" : "Company"} master mein add ho gaya`);
      setAddMaster(null); setMasterForm({ name: "", code: "" });
    } catch (error: any) { triggerToast(error.message || "Master save failed"); }
    finally { setSavingMaster(false); }
  };

  const completed = useMemo(() => Object.values(stages).filter((stage) => stage.status === "completed").length, [stages]);
  const updateStage = (key: StageKey, patch: Partial<StageState>) => setStages((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  const updateGuard = (index: number, patch: Partial<DeployedGuard>) => setGuards((prev) => prev.map((guard, guardIndex) => guardIndex === index ? { ...guard, ...patch } : guard));

  const uploadGuardPhoto = async (index: number, file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Photo upload failed");
      updateGuard(index, { photoUrl: result.url });
    } catch (error: any) { triggerToast(error.message || "Photo upload failed"); }
    finally { setUploading(false); }
  };

  const addGuardToMaster = async () => {
    if (!guardMasterForm.name.trim()) return triggerToast("Guard name required hai");
    if (!guardMasterForm.phone.trim()) return triggerToast("Guard mobile number required hai");
    setSavingGuardMaster(true);
    try {
      const response = await fetch("/api/legal-recovery/guards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guardMasterForm.name.trim(),
          phone: guardMasterForm.phone.trim(),
          photoUrl: guardMasterForm.photoUrl,
          monthlySalary: guardMasterForm.monthlySalary,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Guard master save failed");
      const saved = result.data;
      setDbGuards((prev) => [...prev.filter((guard) => String(guard.id) !== String(saved.id) && guard.name !== saved.name), saved].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setGuards((prev) => [...prev, { ...newGuard(), name: saved.name, phone: saved.phone || "", photoUrl: saved.photoUrl || "", monthlySalary: String(saved.monthlySalary || "") }]);
      setGuardMasterForm({ name: "", phone: "", photoUrl: "", monthlySalary: "" });
      setShowGuardMasterForm(false);
      triggerToast("Guard Master mein add aur deployment mein select ho gaya");
    } catch (error: any) { triggerToast(error.message || "Guard master save failed"); }
    finally { setSavingGuardMaster(false); }
  };

  const uploadProofs = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/documents/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.success || !result.url) throw new Error(result.error || `Could not upload ${file.name}`);
        urls.push(result.url);
      }
      updateStage(activeKey, { proofUrls: [...stages[activeKey].proofUrls, ...urls] });
      triggerToast(`${urls.length} proof document uploaded`);
    } catch (error: any) {
      triggerToast(error.message || "Proof upload failed");
    } finally { setUploading(false); }
  };

  const uploadBillCopy = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/documents/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.success || !result.url) throw new Error(result.error || "Bill upload failed");
      setBillDetails((prev) => ({ ...prev, billInvoiceUrl: result.url }));
      triggerToast("Bill copy uploaded successfully");
    } catch (error: any) { triggerToast(error.message || "Bill upload failed"); }
    finally { setUploading(false); }
  };

  const uploadFollowUpProofs = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append("file", file);
        const response = await fetch("/api/documents/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok || !result.success || !result.url) throw new Error(result.error || `Could not upload ${file.name}`);
        urls.push(result.url);
      }
      setFollowUpDraft((prev) => ({ ...prev, proofUrls: [...prev.proofUrls, ...urls] }));
      triggerToast(`${urls.length} follow-up proof uploaded`);
    } catch (error: any) { triggerToast(error.message || "Follow-up proof upload failed"); }
    finally { setUploading(false); }
  };

  const addFollowUpEntry = () => {
    const selectedInvoice = monthlyCycles.find((cycle) => cycle.month === billingMonth);
    if (!selectedInvoice) return triggerToast("Select a saved invoice before adding a payment follow-up");
    if (followUpDraft.type === "Other" && !customCommunicationType.trim()) return triggerToast("Custom communication type required hai");
    if (!followUpDraft.date || !followUpDraft.contactName.trim() || !followUpDraft.contactDetail.trim() || !followUpDraft.details.trim()) return triggerToast("Date, contact person, contact detail aur communication details required hain");
    if (!followUpDraft.proofUrls.length) return triggerToast("Har follow-up ke saath kam se kam ek proof required hai");
    const entry = { ...followUpDraft, billingMonth, type: followUpDraft.type === "Other" ? customCommunicationType.trim() : followUpDraft.type, id: `followup_${Date.now()}` };
    updateStage("payment_followup", { status: "in_progress", date: entry.date, followUps: [...(stages.payment_followup.followUps || []), entry] });
    setMonthlyCycles((current) => current.map((cycle) => cycle.month === billingMonth ? { ...cycle, followUps: [...cycle.followUps, entry] } : cycle));
    setFollowUpDraft({ id: "", type: "Call", date: new Date().toISOString().slice(0, 10), time: "", contactName: "", contactDetail: "", details: "", outcome: "", nextFollowUpDate: "", proofUrls: [], billingMonth });
    setCustomCommunicationType("");
    triggerToast("Payment follow-up entry added; Update Workflow karke save karein");
  };

  const save = async () => {
    if (!company.trim() || !nbfcName.trim()) return triggerToast("Company aur Bank / NBFC name required hai");
    const draftBillComplete = Boolean(billingMonth && billDetails.billNo.trim() && billDetails.billDate && Number(billDetails.billAmount) > 0 && billDetails.billInvoiceUrl);
    const manualPayable = monthlyGuardPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const effectiveGuardPayable = monthlyGuardPayments.length ? manualPayable : guardPayable;
    const loggedReceived = clientPaymentLogs.reduce((sum, log) => sum + log.amount, 0);
    const receivedAmount = clientPaymentLogs.length ? loggedReceived : Number(monthlyReceived || 0);
    const guardPaidAmount = guardPaymentLogs.reduce((sum, log) => sum + log.amount, 0);
    if (draftBillComplete && receivedAmount > Number(billDetails.billAmount)) return triggerToast("Received amount cannot exceed bill amount");
    if (draftBillComplete && guardPaidAmount > effectiveGuardPayable) return triggerToast("Guard paid amount cannot exceed guard payable amount");
    const existingDraftCycle = monthlyCycles.find((cycle) => cycle.month === billingMonth);
    const draftCycle: MonthlyCycle | null = draftBillComplete ? {
      month: billingMonth, guardPayable: effectiveGuardPayable, guardPayments: monthlyGuardPayments,
      clientPaymentLogs, guardPaymentLogs, guardPaidAmount, billNo: billDetails.billNo.trim(),
      billDate: billDetails.billDate, billAmount: Number(billDetails.billAmount), billInvoiceUrl: billDetails.billInvoiceUrl,
      receivedAmount, paymentStatus: receivedAmount >= Number(billDetails.billAmount) ? "Payment Done" : receivedAmount > 0 ? "Partially Paid" : "Due",
      followUps: existingDraftCycle?.followUps || []
    } : null;
    const cyclesToSave = draftCycle
      ? [...monthlyCycles.filter((cycle) => cycle.month !== billingMonth), draftCycle].sort((a, b) => b.month.localeCompare(a.month))
      : monthlyCycles;
    const hasMonthlyGuard = cyclesToSave.some((cycle) => (cycle.guardPayments || []).some((guard) => guard.guardName.trim()) || cycle.guardPayable > 0);
    if (stages.guard_deployment.status === "completed" && !guards.some((guard) => guard.name.trim()) && !hasMonthlyGuard) {
      return triggerToast("Guards Deployed complete karne se pehle kam se kam ek guard add karein");
    }
    if (stages.authority_letter.status === "completed" && !siteLocation.trim()) {
      return triggerToast("Site Authority Letter complete karne se pehle site location required hai");
    }
    setSaving(true);
    try {
      const latestCycle = cyclesToSave[0];
      const billIsComplete = Boolean(latestCycle || (billDetails.billNo.trim() && billDetails.billDate && Number(billDetails.billAmount) > 0 && billDetails.billInvoiceUrl));
      const stagesToSave = {
        ...stages,
        billing: { ...stages.billing, status: billIsComplete ? "completed" as const : "pending" as const, date: billIsComplete ? (latestCycle?.billDate || billDetails.billDate) : "", notes: "", proofUrls: [] },
        payment_followup: { ...stages.payment_followup, status: stages.payment_followup.status === "completed" ? "completed" as const : (stages.payment_followup.followUps?.length ? "in_progress" as const : "pending" as const), notes: "", proofUrls: [] },
      };
      (stagesToSave as any).monthlyCycles = cyclesToSave;
      for (const stageMeta of SECURITY_WORKFLOW_STAGES) {
        const stage = stagesToSave[stageMeta.key];
        if (stage.status !== "completed" && stage.status !== "rejected") continue;
        if (stageMeta.key === "billing") {
          if (!billIsComplete) return triggerToast("Bill task complete karne ke liye invoice number, date, amount aur bill copy required hai");
          continue;
        }
        if (stageMeta.key === "payment_followup") {
          if (!stage.followUps?.length) return triggerToast("Payment Follow-up complete karne se pehle proof ke saath follow-up entry add karein");
          continue;
        }
        if (!stage.date || !stage.notes.trim() || !stage.proofUrls.length) {
          return triggerToast(`${stageMeta.label} complete karne ke liye date, progress details aur proof required hain`);
        }
      }
      await Promise.all(guards.filter((guard) => guard.name.trim()).map((guard) => fetch("/api/legal-recovery/guards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guard.name.trim(), phone: guard.phone.trim(), photoUrl: guard.photoUrl, monthlySalary: guard.monthlySalary }),
      })));
      const response = await fetch("/api/legal-recovery/security", {
        method: item?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(item?.id ? { id: item.id } : {}), company: company.trim(), nbfcId: nbfcId || null, nbfcName: nbfcName.trim(),
          branchId: branchId || null, branchName: branchName.trim(), agentName: agentName.trim(), followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null, location: siteLocation.trim(), workflowStage: activeKey,
          workflowJson: JSON.stringify(stagesToSave), source: item?.source || "Security Workflow",
          guardDetailsJson: JSON.stringify(guards), totalDailyGuards: guards.length,
          guardName: guards[0]?.name || "", guardPhone: guards[0]?.phone || "", guardPhotoUrl: guards[0]?.photoUrl || "",
          shiftHours: guards[0]?.shiftType?.match(/\d+/)?.[0] || null,
          shiftRate: guards.reduce((sum, guard) => sum + Number(guard.shiftRate || 0), 0),
          allowancePerShift: guards.reduce((sum, guard) => sum + Number(guard.allowancePerShift || 0), 0),
          billNo: latestCycle?.billNo || billDetails.billNo.trim(), billDate: latestCycle?.billDate || billDetails.billDate || null,
          billAmount: latestCycle?.billAmount || Number(billDetails.billAmount || 0), billInvoiceUrl: latestCycle?.billInvoiceUrl || billDetails.billInvoiceUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Workflow save failed");
      triggerToast("Security workflow saved successfully");
      onSaved();
      onClose();
    } catch (error: any) { triggerToast(error.message || "Workflow save failed"); }
    finally { setSaving(false); }
  };

  const active = stages[activeKey];
  const meta = SECURITY_WORKFLOW_STAGES.find((stage) => stage.key === activeKey)!;
  const selectedFollowUpInvoice = monthlyCycles.find((cycle) => cycle.month === billingMonth);
  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/55 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b flex items-center justify-between bg-slate-50">
          <div><h2 className="font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600"/> Security Work Pipeline</h2><p className="text-xs text-slate-500 mt-1">Bank visit se billing aur payment follow-up tak · {completed}/10 completed</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
        </header>
        <div className="grid lg:grid-cols-[330px_1fr] min-h-0 flex-1">
          <aside className="border-r bg-slate-50 p-3 overflow-y-auto">
            {SECURITY_WORKFLOW_STAGES.map((stage, index) => {
              const value = stages[stage.key];
              return <button key={stage.key} onClick={() => setActiveKey(stage.key)} className={`w-full text-left p-3 mb-2 rounded-xl border flex gap-3 ${activeKey === stage.key ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${value.status === "completed" ? "bg-emerald-500 text-white" : value.status === "rejected" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-700"}`}>{value.status === "completed" ? "✓" : index + 1}</span>
                <span><b className="text-xs text-slate-800">{stage.label}</b><span className="block text-[10px] text-slate-500 capitalize mt-0.5">{value.status.replace("_", " ")}{stage.key === "payment_followup" && value.followUps?.length ? ` · ${value.followUps.length} follow-ups` : value.proofUrls.length ? ` · ${value.proofUrls.length} proof` : ""}</span></span>
              </button>;
            })}
          </aside>
          <main className="p-5 overflow-y-auto">
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <label className="text-xs font-bold text-slate-600">Company *<select value={company} onChange={(e) => e.target.value === "__add__" ? (setAddMaster("company"), setMasterForm({ name: "", code: "" })) : setCompany(e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-white"><option value="">Select Company</option>{companies.map((entry) => <option key={entry.id || entry.companyName} value={entry.companyName}>{entry.companyName}</option>)}<option value="__add__">＋ Add New Company</option></select></label>
              <label className="text-xs font-bold text-slate-600">Bank / NBFC *<select value={nbfcId} onChange={(e) => { if (e.target.value === "__add__") { setAddMaster("nbfc"); setMasterForm({ name: "", code: "" }); return; } const found = nbfcs.find((entry) => String(entry.id) === e.target.value); setNbfcId(e.target.value); setNbfcName(found?.nbfcName || ""); setBranchId(""); setBranchName(""); }} className="mt-1 w-full border rounded-lg p-2.5 bg-white"><option value="">Select Bank / NBFC</option>{nbfcs.map((entry) => <option key={entry.id} value={String(entry.id)}>{entry.nbfcName}{entry.nbfcCode ? ` (${entry.nbfcCode})` : ""}</option>)}<option value="__add__">＋ Add New Bank / NBFC</option></select></label>
              <label className="text-xs font-bold text-slate-600">Branch<select value={branchId} disabled={!nbfcId} onChange={(e) => { if (e.target.value === "__add__") { setAddMaster("branch"); setMasterForm({ name: "", code: "" }); return; } const found = branches.find((entry) => String(entry.id) === e.target.value); setBranchId(e.target.value); setBranchName(found?.branchName || ""); }} className="mt-1 w-full border rounded-lg p-2.5 bg-white disabled:bg-slate-100"><option value="">{nbfcId ? "Select Branch" : "Select NBFC first"}</option>{branches.filter((entry) => String(entry.nbfcId) === nbfcId).map((entry) => <option key={entry.id} value={String(entry.id)}>{entry.branchName}{entry.branchCode ? ` (${entry.branchCode})` : ""}</option>)}{nbfcId && <option value="__add__">＋ Add New Branch</option>}</select></label>
              <label className="text-xs font-bold text-slate-600">Agent Name / Work Source<input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Jiske through kaam aaya" className="mt-1 w-full border rounded-lg p-2.5 bg-white"/></label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Next Follow-up Date & Time<input type="datetime-local" value={followUpAt} min={toLocalDateTimeInput(new Date())} onChange={(e) => setFollowUpAt(e.target.value)} className="mt-1 w-full border border-amber-300 rounded-lg p-2.5 bg-amber-50"/><span className="block mt-1 text-[10px] font-normal text-slate-500">Due time par Owner, Security team aur Sales Head ko email, web-push aur dashboard alert jayega.</span></label>
            </div>
            {addMaster && <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-xl p-3"><div className="flex justify-between"><b className="text-xs text-indigo-900">Add New {addMaster === "nbfc" ? "Bank / NBFC" : addMaster === "branch" ? "Branch" : "Company"} Master</b><button onClick={() => setAddMaster(null)}><X className="w-4 h-4"/></button></div><div className={`grid ${addMaster === "company" ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-[1fr_180px_auto]"} gap-2 mt-2`}><input autoFocus placeholder="Name *" value={masterForm.name} onChange={(e) => setMasterForm((prev) => ({ ...prev, name: e.target.value }))} className="border rounded-lg p-2 text-xs"/>{addMaster !== "company" && <input placeholder={addMaster === "branch" ? "Branch Code *" : "Code"} value={masterForm.code} onChange={(e) => setMasterForm((prev) => ({ ...prev, code: e.target.value }))} className="border rounded-lg p-2 text-xs"/>}<button type="button" onClick={addToMaster} disabled={savingMaster} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black disabled:opacity-50">{savingMaster ? "Adding..." : "Add & Select"}</button></div></div>}
            <section className="border rounded-2xl p-4">
              <h3 className="font-black text-slate-900">{meta.label}</h3><p className="text-xs text-slate-500 mt-1">{meta.hint}</p>
              {activeKey !== "billing" && activeKey !== "payment_followup" && <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <label className="text-xs font-bold text-slate-600">Stage Status<select value={active.status} onChange={(e) => updateStage(activeKey, { status: e.target.value as StageState["status"] })} className="mt-1 w-full border rounded-lg p-2.5 bg-white"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="rejected">Rejected / Work Not Awarded</option></select></label>
                <label className="text-xs font-bold text-slate-600">Date<input type="date" value={active.date} onChange={(e) => updateStage(activeKey, { date: e.target.value })} className="mt-1 w-full border rounded-lg p-2.5"/></label>
              </div>}
              {activeKey !== "billing" && activeKey !== "payment_followup" && <label className="block text-xs font-bold text-slate-600 mt-4">Discussion / Details<textarea value={active.notes} onChange={(e) => updateStage(activeKey, { notes: e.target.value })} rows={5} placeholder={meta.hint} className="mt-1 w-full border rounded-xl p-3 resize-y"/></label>}
              {activeKey === "authority_letter" && <label className="block text-xs font-bold text-slate-600 mt-4">Site Location / Complete Address *<textarea value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} rows={3} placeholder="Security guard deployment ki complete site location/address likhein" className="mt-1 w-full border border-indigo-300 rounded-xl p-3 resize-y"/></label>}
              {activeKey === "guard_deployment" && <div className="mt-5 border-t pt-4">
                <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-black text-slate-900">Guard Deployment Details</h4><p className="text-[11px] text-slate-500">Guard, contact, joining date aur rate details add karein.</p></div><div className="flex gap-2"><button type="button" onClick={() => setShowGuardMasterForm((value) => !value)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1"><Plus className="w-4 h-4"/> Add Guard to Master</button><button type="button" onClick={() => setGuards((prev) => [...prev, newGuard()])} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black flex items-center gap-1"><Plus className="w-4 h-4"/> Add Guard</button></div></div>
                {showGuardMasterForm && <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3"><div className="flex justify-between items-center"><b className="text-xs text-emerald-900">Add New Guard in Master</b><button type="button" onClick={() => setShowGuardMasterForm(false)}><X className="w-4 h-4"/></button></div><div className="grid sm:grid-cols-[1fr_180px_160px_auto] gap-2 mt-2"><input autoFocus placeholder="Guard Name *" value={guardMasterForm.name} onChange={(e) => setGuardMasterForm((prev) => ({ ...prev, name: e.target.value }))} className="border rounded-lg p-2 text-xs"/><input type="tel" placeholder="Mobile Number *" value={guardMasterForm.phone} onChange={(e) => setGuardMasterForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^0-9+ -]/g, "") }))} className="border rounded-lg p-2 text-xs"/><input type="number" min="0" step="0.01" placeholder="Salary ₹" value={guardMasterForm.monthlySalary} onChange={(e) => setGuardMasterForm((prev) => ({ ...prev, monthlySalary: e.target.value }))} className="border rounded-lg p-2 text-xs"/><button type="button" onClick={addGuardToMaster} disabled={savingGuardMaster} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black disabled:opacity-50">{savingGuardMaster ? "Saving..." : "Save & Select"}</button></div></div>}
                {guards.length === 0 ? <button type="button" onClick={() => setGuards([newGuard()])} className="mt-3 w-full border-2 border-dashed rounded-xl p-5 text-xs font-bold text-indigo-700">+ Add first deployed guard</button> : <div className="space-y-3 mt-3">{guards.map((guard, index) => <div key={index} className="bg-slate-50 border rounded-xl p-3">
                  <div className="flex justify-between items-center mb-3"><b className="text-xs text-slate-800">Guard #{index + 1}</b><button type="button" onClick={() => setGuards((prev) => prev.filter((_, i) => i !== index))} className="text-rose-600"><Trash2 className="w-4 h-4"/></button></div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="text-[11px] font-bold text-slate-600">Select / Type Guard<select value={dbGuards.some((entry) => entry.name === guard.name) ? guard.name : ""} onChange={(e) => { const found = dbGuards.find((entry) => entry.name === e.target.value); if (found) updateGuard(index, { name: found.name, phone: found.phone || "", photoUrl: found.photoUrl || "", monthlySalary: String(found.monthlySalary || "") }); }} className="mt-1 w-full border rounded-lg p-2 bg-white"><option value="">Type name below / Select master</option>{dbGuards.map((entry) => <option key={entry.id || entry.name} value={entry.name}>{entry.name} {entry.phone ? `(${entry.phone})` : ""}</option>)}</select></label>
                    <label className="text-[11px] font-bold text-slate-600">Guard Name *<input value={guard.name} onChange={(e) => updateGuard(index, { name: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label>
                    <label className="text-[11px] font-bold text-slate-600">Phone<input value={guard.phone} onChange={(e) => updateGuard(index, { phone: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label>
                    <label className="text-[11px] font-bold text-slate-600">Monthly Salary ₹<input type="number" min="0" step="0.01" value={guard.monthlySalary} onChange={(e) => updateGuard(index, { monthlySalary: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label>
                    <label className="text-[11px] font-bold text-slate-600">Guard Photo<span className="mt-1 flex border rounded-lg p-2 bg-white items-center gap-2"><Camera className="w-4 h-4 text-indigo-600"/><span className="truncate flex-1 font-normal">{guard.photoUrl ? "Photo uploaded" : "Upload photo"}</span><input type="file" accept="image/*" className="max-w-[90px] text-[9px]" onChange={(e) => uploadGuardPhoto(index, e.target.files?.[0])}/></span></label>
                    <label className="text-[11px] font-bold text-slate-600">Deployment From<input type="date" value={guard.startDate} onChange={(e) => updateGuard(index, { startDate: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label>
                    <div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-bold text-slate-600">Shift Rate ₹<input type="number" value={guard.shiftRate} onChange={(e) => updateGuard(index, { shiftRate: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label><label className="text-[11px] font-bold text-slate-600">Allowance ₹<input type="number" value={guard.allowancePerShift} onChange={(e) => updateGuard(index, { allowancePerShift: e.target.value })} className="mt-1 w-full border rounded-lg p-2"/></label></div>
                  </div>
                </div>)}</div>}
              </div>}
              {activeKey === "billing" && <div className="mt-5 border-t pt-4">
                <div><h4 className="text-sm font-black text-slate-900">Monthly Invoice & Guard Payment</h4><p className="text-[11px] text-slate-500">Har month ka client invoice, attendance-based guard payable aur payment status save karein.</p></div>
                {paymentEditMonth && <div className="mt-3 flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2"><span className="text-xs font-bold text-indigo-900">Editing bill for {new Date(`${paymentEditMonth}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span><button type="button" onClick={cancelPaymentEntry} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700">Cancel Edit</button></div>}
                <div className="grid sm:grid-cols-2 gap-3 mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <label className="text-[11px] font-bold text-slate-600">Billing Month *<input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-white"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Guard Payable (Attendance / Manual)<div className="relative mt-1"><span className="absolute left-3 top-2.5 text-sm font-black text-amber-700">₹</span><input type="number" min="0" step="0.01" value={guardPayable} onChange={(e) => { guardPayableManuallyEdited.current = true; setGuardPayable(Math.max(0, Number(e.target.value || 0))); }} className="w-full rounded-lg border bg-white py-2.5 pl-7 pr-2 text-sm font-black text-amber-700 focus:border-amber-500 focus:outline-none"/></div></label>
                </div>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <div><h5 className="text-xs font-black text-slate-800">Manual Guard Payment for Old Month</h5><p className="mt-0.5 text-[10px] text-slate-500">If attendance is unavailable, select a guard and enter the payable amount.</p></div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                    <select value={manualGuardId} onChange={(e) => setManualGuardId(e.target.value)} className="border rounded-lg p-2.5 bg-white text-xs"><option value="">-- Select Guard --</option>{dbGuards.map((guard) => <option key={guard.id} value={guard.id}>{guard.name}{guard.phone ? ` (${guard.phone})` : ""}</option>)}</select>
                    <input type="number" min="0" step="0.01" value={manualGuardAmount} onChange={(e) => setManualGuardAmount(e.target.value)} placeholder="Payable amount ₹" className="border rounded-lg p-2.5 bg-white text-xs"/>
                    <button type="button" onClick={addManualGuardPayment} className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white">Add Guard</button>
                  </div>
                  {monthlyGuardPayments.length > 0 && <div className="mt-2 space-y-1">{monthlyGuardPayments.map((payment) => <div key={payment.guardId} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-[11px]"><span><b>{payment.guardName}</b> · ₹{payment.amount.toLocaleString("en-IN")}</span><button type="button" onClick={() => setMonthlyGuardPayments((current) => current.filter((entry) => entry.guardId !== payment.guardId))}><Trash2 className="h-4 w-4 text-rose-600"/></button></div>)}<div className="text-right text-xs font-black text-amber-800">Manual Total: ₹{monthlyGuardPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString("en-IN")}</div></div>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <label className="text-[11px] font-bold text-slate-600">Invoice Number *<input value={billDetails.billNo} onChange={(e) => setBillDetails((prev) => ({ ...prev, billNo: e.target.value }))} placeholder="e.g. SEC/2026/001" className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Invoice Date *<input type="date" value={billDetails.billDate} onChange={(e) => setBillDetails((prev) => ({ ...prev, billDate: e.target.value }))} className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Bill Amount (₹) *<input type="number" min="0" step="0.01" value={billDetails.billAmount} onChange={(e) => setBillDetails((prev) => ({ ...prev, billAmount: e.target.value }))} placeholder="0.00" className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Upload Bill Copy *<span className="mt-1 flex items-center gap-2 border rounded-lg p-2 bg-white"><Receipt className="w-4 h-4 text-indigo-600"/><span className="flex-1 truncate font-normal">{billDetails.billInvoiceUrl ? "Bill uploaded" : "Choose PDF / image / document"}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" className="max-w-[105px] text-[9px]" onChange={(e) => uploadBillCopy(e.target.files?.[0])}/></span></label>
                </div>
                {billDetails.billInvoiceUrl && <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2"><FileText className="w-4 h-4 text-indigo-600"/><button type="button" onClick={() => setPreviewUrl(billDetails.billInvoiceUrl)} className="text-xs font-bold text-indigo-700 underline">View Uploaded Bill</button><button type="button" onClick={() => setBillDetails((prev) => ({ ...prev, billInvoiceUrl: "" }))} className="ml-auto text-rose-600"><Trash2 className="w-4 h-4"/></button></div>}
                <div className="mt-3 flex justify-end"><button type="button" onClick={saveMonthlyCycle} disabled={savingMonth} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{savingMonth ? "Saving..." : "Save This Month"}</button></div>
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-black text-slate-800">Monthly History ({monthlyCycles.length})</h4>
                  {monthlyCycles.map((cycle) => {
                    const guardPaid = Number(cycle.guardPaidAmount || 0);
                    return <div key={cycle.month} className="rounded-xl border bg-white p-3 text-[11px]">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
                        <b>{new Date(`${cycle.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b>
                        <span>Invoice: <b>{cycle.billNo}</b><button type="button" onClick={() => setPreviewUrl(cycle.billInvoiceUrl)} className="mt-1 flex items-center gap-1 font-black text-indigo-700 underline"><FileText className="h-3 w-3"/> View Proof</button></span>
                        <span>Bill: <b>₹{cycle.billAmount.toLocaleString("en-IN")}</b></span>
                        <span>Received: <b>₹{cycle.receivedAmount.toLocaleString("en-IN")}</b></span>
                        <span>Guard Payable: <b>₹{cycle.guardPayable.toLocaleString("en-IN")}</b></span>
                        <span>Guard Paid: <b>₹{guardPaid.toLocaleString("en-IN")}</b><br/>Due ₹{Math.max(0, cycle.guardPayable-guardPaid).toLocaleString("en-IN")}</span>
                        <span className="text-indigo-700">Cash Profit: <b>₹{(cycle.receivedAmount-guardPaid).toLocaleString("en-IN")}</b></span>
                        <span className={cycle.paymentStatus === "Payment Done" ? "text-emerald-700" : "text-rose-700"}><b>{cycle.paymentStatus}</b><br/>Client Pending ₹{Math.max(0, cycle.billAmount-cycle.receivedAmount).toLocaleString("en-IN")}</span>
                        <div className="flex flex-wrap gap-1"><button type="button" onClick={() => { setPaymentModalMonth(cycle.month); setPopupClientAmount(""); setPopupGuardAmount(""); setPopupGuardAmounts({}); setPopupPaymentDate(new Date().toISOString().slice(0, 10)); }} className="rounded-lg bg-emerald-600 px-2 py-1.5 text-[10px] font-black text-white">Log Payment</button><button type="button" onClick={() => { setPaymentEditMonth(cycle.month); setBillingMonth(cycle.month); setActiveKey("billing"); }} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] font-black text-indigo-700">Edit</button><button type="button" onClick={() => deleteMonthlyCycle(cycle.month)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] font-black text-rose-700">Delete</button></div>
                      </div>
                      {(cycle.guardPayments || []).length > 0 && <div className="mt-3 border-t pt-2"><b className="text-slate-700">Guards ({cycle.guardPayments!.length})</b><div className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{cycle.guardPayments!.map((guard) => { const paid = (cycle.guardPaymentLogs || []).filter((log) => log.guardId === guard.guardId).reduce((sum, log) => sum + log.amount, 0); return <div key={guard.guardId} className="rounded-lg bg-amber-50 px-2 py-1.5"><b>{guard.guardName}</b><span className="ml-1 text-slate-600">Payable ₹{guard.amount.toLocaleString("en-IN")} · Paid ₹{paid.toLocaleString("en-IN")} · Due ₹{Math.max(0, guard.amount-paid).toLocaleString("en-IN")}</span></div>; })}</div></div>}
                    </div>;
                  })}
                </div>
              </div>}
              {activeKey === "payment_followup" && <div className="mt-5 border-t pt-4 space-y-4">
                <div><h4 className="text-sm font-black text-slate-900">Add Payment Follow-up</h4><p className="text-[11px] text-slate-500">Call, visit, WhatsApp, email, reminder letter ya kisi bhi communication ka complete proof record karein.</p></div>
                <label className="block text-[11px] font-bold text-slate-600">Invoice / Bill *<select value={selectedFollowUpInvoice ? billingMonth : ""} onChange={(e) => setBillingMonth(e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-white"><option value="">-- Select saved invoice --</option>{monthlyCycles.map((cycle) => <option key={cycle.month} value={cycle.month}>{new Date(`${cycle.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · {cycle.billNo} · Invoice date {new Date(`${cycle.billDate}T00:00:00`).toLocaleDateString("en-IN")} · Pending ₹{Math.max(0, cycle.billAmount-cycle.receivedAmount).toLocaleString("en-IN")}</option>)}</select></label>
                {selectedFollowUpInvoice && <div className="grid grid-cols-2 gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-[11px] sm:grid-cols-4"><span>Service Month<br/><b>{new Date(`${selectedFollowUpInvoice.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b></span><span>Invoice Number<br/><b>{selectedFollowUpInvoice.billNo}</b></span><span>Invoice Date<br/><b>{new Date(`${selectedFollowUpInvoice.billDate}T00:00:00`).toLocaleDateString("en-IN")}</b></span><span>Client Pending<br/><b className="text-rose-700">₹{Math.max(0, selectedFollowUpInvoice.billAmount-selectedFollowUpInvoice.receivedAmount).toLocaleString("en-IN")}</b></span></div>}
                <div className="bg-slate-50 border rounded-xl p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="text-[11px] font-bold text-slate-600">Communication Type *<select value={followUpDraft.type} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full border rounded-lg p-2.5 bg-white"><option>Call</option><option>Bank Visit</option><option>WhatsApp</option><option>Email</option><option>Reminder Letter</option><option>Video Meeting</option><option>Other</option></select></label>
                  {followUpDraft.type === "Other" && <label className="text-[11px] font-bold text-slate-600">Type Communication *<input autoFocus value={customCommunicationType} onChange={(e) => setCustomCommunicationType(e.target.value)} placeholder="e.g. Courier, SMS, Portal Message" className="mt-1 w-full border border-indigo-300 rounded-lg p-2.5 bg-white"/></label>}
                  <label className="text-[11px] font-bold text-slate-600">Date *<input type="date" value={followUpDraft.date} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, date: e.target.value }))} className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Time<input type="time" value={followUpDraft.time} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, time: e.target.value }))} className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Contact Person *<input value={followUpDraft.contactName} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, contactName: e.target.value }))} placeholder="Kis se baat/meeting hui" className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Number / Email / Address *<input value={followUpDraft.contactDetail} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, contactDetail: e.target.value }))} placeholder={followUpDraft.type === "Call" || followUpDraft.type === "WhatsApp" ? "Mobile number" : followUpDraft.type === "Email" ? "Email address" : "Contact / visit details"} className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Next Follow-up Date<input type="date" value={followUpDraft.nextFollowUpDate} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, nextFollowUpDate: e.target.value }))} className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Communication Details *<textarea value={followUpDraft.details} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, details: e.target.value }))} rows={3} placeholder="Kya baat hui aur payment ke baare mein kya response mila" className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">Outcome / Commitment<input value={followUpDraft.outcome} onChange={(e) => setFollowUpDraft((prev) => ({ ...prev, outcome: e.target.value }))} placeholder="e.g. Payment Friday tak release hoga" className="mt-1 w-full border rounded-lg p-2.5"/></label>
                  <label className="text-[11px] font-bold text-slate-600">Proof *<span className="mt-1 flex items-center gap-2 border rounded-lg p-2 bg-white"><Upload className="w-4 h-4 text-indigo-600"/><span className="flex-1 truncate font-normal">{followUpDraft.proofUrls.length ? `${followUpDraft.proofUrls.length} proof uploaded` : "Recording / screenshot / letter"}</span><input type="file" multiple accept="image/*,audio/*,video/*,.pdf,.doc,.docx" className="max-w-[90px] text-[9px]" onChange={(e) => uploadFollowUpProofs(e.target.files)}/></span></label>
                  {followUpDraft.proofUrls.length > 0 && <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">{followUpDraft.proofUrls.map((url, index) => <div key={url} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1"><button type="button" onClick={() => setPreviewUrl(url)} className="text-[10px] text-indigo-700 underline">View Proof {index + 1}</button><button type="button" onClick={() => setFollowUpDraft((prev) => ({ ...prev, proofUrls: prev.proofUrls.filter((_, i) => i !== index) }))}><X className="w-3 h-3 text-rose-600"/></button></div>)}</div>}
                  <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><button type="button" onClick={addFollowUpEntry} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black"><Plus className="w-4 h-4 inline mr-1"/> Add Follow-up Entry</button></div>
                </div>
                <div><h4 className="text-xs font-black text-slate-800 mb-2">Follow-up History ({active.followUps?.length || 0})</h4>{!active.followUps?.length ? <div className="border-2 border-dashed rounded-xl p-4 text-center text-xs text-slate-400">No payment follow-up logged yet.</div> : <div className="space-y-2">{[...(active.followUps || [])].reverse().map((entry, reverseIndex) => <div key={entry.id} className="border rounded-xl p-3 bg-white"><div className="flex justify-between gap-2"><div><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-black">{entry.type}</span><b className="ml-2 text-xs text-slate-800">{entry.contactName}</b><span className="ml-1 text-[10px] text-slate-500">({entry.contactDetail})</span></div><button type="button" onClick={() => updateStage("payment_followup", { followUps: (active.followUps || []).filter((_, index) => index !== (active.followUps!.length - 1 - reverseIndex)) })}><Trash2 className="w-4 h-4 text-rose-600"/></button></div><p className="text-[10px] text-slate-500 mt-1">{entry.date} {entry.time || ""}{entry.nextFollowUpDate ? ` · Next: ${entry.nextFollowUpDate}` : ""}</p><p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{entry.details}</p>{entry.outcome && <p className="text-xs font-bold text-emerald-700 mt-1">Outcome: {entry.outcome}</p>}<div className="flex gap-2 mt-2">{entry.proofUrls.map((url, index) => <button type="button" key={url} onClick={() => setPreviewUrl(url)} className="text-[10px] text-indigo-700 underline">View Proof {index + 1}</button>)}</div></div>)}</div>}</div>
              </div>}
              {activeKey !== "billing" && activeKey !== "payment_followup" && <div className="mt-4"><p className="text-xs font-bold text-slate-600 mb-2">Proof Documents</p><label className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 cursor-pointer hover:bg-indigo-50"><Upload className="w-4 h-4"/>{uploading ? "Uploading..." : "Upload one or multiple proofs"}<input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => uploadProofs(e.target.files)}/></label>
                <div className="grid sm:grid-cols-2 gap-2 mt-3">{active.proofUrls.map((url, index) => <div key={`${url}-${index}`} className="border rounded-lg p-2 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-600"/><button type="button" onClick={() => setPreviewUrl(url)} className="text-xs text-indigo-700 underline truncate flex-1 text-left">View Proof {index + 1}</button><button onClick={() => updateStage(activeKey, { proofUrls: active.proofUrls.filter((_, i) => i !== index) })} className="text-rose-600"><X className="w-4 h-4"/></button></div>)}</div>
              </div>}
              {activeKey !== "billing" && activeKey !== "payment_followup" && <div className="flex gap-2 mt-4"><button onClick={() => updateStage(activeKey, { status: "completed", date: active.date || new Date().toISOString().slice(0, 10) })} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Mark Completed</button><button onClick={() => updateStage(activeKey, { status: "in_progress" })} className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black flex items-center gap-1"><Clock3 className="w-4 h-4"/> In Progress</button></div>}
            </section>
          </main>
        </div>
        <footer className="p-4 border-t bg-slate-50 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border text-xs font-bold">Cancel</button><button onClick={save} disabled={saving || uploading} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-black disabled:opacity-50">{saving ? "Saving..." : item?.id ? "Update Workflow" : "Create Workflow"}</button></footer>
      </div>
      {paymentModalMonth && (() => {
        const cycle = monthlyCycles.find((entry) => entry.month === paymentModalMonth);
        if (!cycle) return null;
        const clientAmount = Number(popupClientAmount || 0);
        const hasGuardBreakdown = Boolean(cycle.guardPayments?.length);
        const guardAmount = hasGuardBreakdown
          ? Object.values(popupGuardAmounts).reduce((sum, amount) => sum + Number(amount || 0), 0)
          : Number(popupGuardAmount || 0);
        const totalReceived = Number(cycle.receivedAmount || 0) + clientAmount;
        const totalGuardPaid = Number(cycle.guardPaidAmount || 0) + guardAmount;
        return <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4"><div><h3 className="font-black text-slate-900">Log Monthly Payment</h3><p className="mt-1 text-xs text-slate-500">{new Date(`${cycle.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · Invoice {cycle.billNo}</p></div><button type="button" onClick={() => setPaymentModalMonth(null)} className="rounded-lg p-2 hover:bg-slate-200"><X className="h-5 w-5"/></button></div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-3 text-xs sm:grid-cols-4"><span>Bill<br/><b>₹{cycle.billAmount.toLocaleString("en-IN")}</b></span><span>Client Pending<br/><b className="text-rose-700">₹{Math.max(0, cycle.billAmount-cycle.receivedAmount).toLocaleString("en-IN")}</b></span><span>Guard Payable<br/><b>₹{cycle.guardPayable.toLocaleString("en-IN")}</b></span><span>Guard Due<br/><b className="text-amber-700">₹{Math.max(0, cycle.guardPayable-Number(cycle.guardPaidAmount || 0)).toLocaleString("en-IN")}</b></span></div>
              <label className="block text-xs font-bold text-slate-600">Payment Date *<input type="date" value={popupPaymentDate} onChange={(e) => setPopupPaymentDate(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5"/></label>
              <label className="block text-xs font-bold text-emerald-800">Client Payment Received (₹)<input type="number" min="0" step="0.01" value={popupClientAmount} onChange={(e) => setPopupClientAmount(e.target.value)} placeholder="Enter received amount" className="mt-1 w-full rounded-lg border border-emerald-200 p-2.5"/></label>
              {hasGuardBreakdown ? <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3"><h4 className="text-xs font-black text-amber-900">Guard Payments</h4><div className="mt-2 space-y-2">{cycle.guardPayments!.map((guard) => { const paid = (cycle.guardPaymentLogs || []).filter((log) => log.guardId === guard.guardId).reduce((sum, log) => sum + log.amount, 0); const due = Math.max(0, guard.amount-paid); return <label key={guard.guardId} className="grid items-center gap-2 rounded-lg border bg-white p-2 text-xs sm:grid-cols-[1fr_150px]"><span><b>{guard.guardName}</b><span className="block text-[10px] text-slate-500">Payable ₹{guard.amount.toLocaleString("en-IN")} · Paid ₹{paid.toLocaleString("en-IN")} · Due ₹{due.toLocaleString("en-IN")}</span></span><input type="number" min="0" max={due} step="0.01" value={popupGuardAmounts[guard.guardId] || ""} onChange={(e) => setPopupGuardAmounts((current) => ({ ...current, [guard.guardId]: e.target.value }))} placeholder="Pay now ₹" className="w-full rounded-lg border border-amber-200 p-2.5"/></label>; })}</div></div> : <label className="block text-xs font-bold text-amber-800">Guard Payment Paid (₹)<input type="number" min="0" step="0.01" value={popupGuardAmount} onChange={(e) => setPopupGuardAmount(e.target.value)} placeholder="Enter paid amount" className="mt-1 w-full rounded-lg border border-amber-200 p-2.5"/></label>}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs sm:grid-cols-4"><span>Total Received<br/><b>₹{totalReceived.toLocaleString("en-IN")}</b></span><span>Total Guard Paid<br/><b>₹{totalGuardPaid.toLocaleString("en-IN")}</b></span><span>Client Pending<br/><b>₹{Math.max(0, cycle.billAmount-totalReceived).toLocaleString("en-IN")}</b></span><span>Cash Profit<br/><b className="text-indigo-700">₹{(totalReceived-totalGuardPaid).toLocaleString("en-IN")}</b></span></div>
            </div>
            <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-4"><button type="button" onClick={() => { setPaymentModalMonth(null); setPopupClientAmount(""); setPopupGuardAmount(""); setPopupGuardAmounts({}); }} disabled={savingMonth} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold disabled:opacity-50">Cancel</button><button type="button" onClick={savePaymentPopup} disabled={savingMonth} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{savingMonth ? "Saving..." : "Save Payment"}</button></div>
          </div>
        </div>;
      })()}
      {previewUrl && <div className="fixed inset-0 z-[100010] bg-slate-950/70 p-4 flex items-center justify-center"><div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden"><div className="p-3 border-b flex justify-between items-center"><b className="text-sm">Document Preview</b><div className="flex gap-2"><a href={previewUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Open Original</a><button onClick={() => setPreviewUrl(null)} className="p-1.5 bg-slate-100 rounded-lg"><X className="w-4 h-4"/></button></div></div>{/\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(previewUrl) ? <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center"><img src={previewUrl} alt="Proof document" className="max-w-full h-auto object-contain"/></div> : <iframe title="Proof document preview" src={previewUrl} className="w-full flex-1 border-0"/>}</div></div>}
    </div>
  );
}
