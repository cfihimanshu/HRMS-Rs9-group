import re

with open("components/dashboard/legal-recovery/LegalWorkLogsView.tsx", "r") as f:
    content = f.read()

content = content.replace("export default function LegalWorkLogsView({ workLogs, cases, loading, onRefresh }: { workLogs: any[], cases: any[], loading: boolean, onRefresh?: () => void }) {",
"export default function LegalWorkLogsView({ workLogs, branches, banks, loading, onRefresh }: { workLogs: any[], branches: any[], banks: any[], loading: boolean, onRefresh?: () => void }) {")

content = content.replace("const [selectedCase, setSelectedCase] = useState<number | null>(null);",
"""const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  const getBankName = (bankId: number) => {
    return banks?.find((b: any) => b.id == bankId)?.bankName || "Unknown Bank";
  };""")

content = content.replace("const filteredCases = cases.filter(c => {",
"""const filteredBranches = branches.filter(b => {
    const bankName = getBankName(b.bankId);""")

content = content.replace("c?.bankName", "bankName")
content = content.replace("c?.branchName", "b?.branchName")
content = content.replace("c?.aoName", "b?.aoName")
content = content.replace("c.bankName", "getBankName(b.bankId)")
content = content.replace("c.branchName", "b.branchName")
content = content.replace("c.aoName", "b.aoName")
content = content.replace("c.id", "b.id")
content = content.replace("filteredCases", "filteredBranches")
content = content.replace("cases match your search", "branches match your search")

content = content.replace("const handleMarkTaskDone = async (caseId: number, category: string, subCategory: string, remarks: string) => {",
"const handleMarkTaskDone = async (branchId: number, category: string, subCategory: string, remarks: string) => {")

content = content.replace("masterId: caseId,", "masterId: branchId,")
content = content.replace("const taskKey = `${caseId}-${category}-${subCategory}`;", "const taskKey = `${branchId}-${category}-${subCategory}`;")
content = content.replace("const getCompletedTaskLog = (caseId: number, category: string, subCategory: string) => {",
"const getCompletedTaskLog = (branchId: number, category: string, subCategory: string) => {")
content = content.replace("log.masterId === caseId", "log.masterId === branchId")
content = content.replace("const getTaskCompletionData = (caseId: number, category: string) => {",
"const getTaskCompletionData = (branchId: number, category: string) => {")
content = content.replace("getCompletedTaskLog(caseId,", "getCompletedTaskLog(branchId,")
content = content.replace("const getCaseDetails = (masterId: number) => {",
"const getBranchDetails = (masterId: number) => {")
content = content.replace("return cases.find(c => b.id === masterId);",
"return branches.find(b => b.id === masterId);")
# Need to make sure earlier replacements didn't ruin this. 
# Original: return cases.find(c => c.id === masterId);
# Wait, c.id was replaced by b.id!
content = content.replace("return cases.find(c => b.id === masterId);", "return branches.find((b: any) => b.id === masterId);")
content = content.replace("return cases.find(c => c.id === masterId);", "return branches.find((b: any) => b.id === masterId);")

content = content.replace("getCaseDetails(log.masterId);", "getBranchDetails(log.masterId);")
content = content.replace("const c = getBranchDetails", "const bObj = getBranchDetails")

content = content.replace("bObj?.bankName", "getBankName(bObj?.bankId)")

# In exportWorkLogsCSV
content = content.replace("`\"${bankName || 'N/A'}\"`", "`\"${bObj ? getBankName(bObj.bankId) : 'N/A'}\"`")

content = content.replace("No Case Selected", "No Branch Selected")
content = content.replace("Select a case", "Select a branch")
content = content.replace("Search Cases...", "Search Branches...")

# For the panel
content = content.replace("selectedCase", "selectedBranch")
content = content.replace("cases.find(caseObj => caseObj.id === selectedBranch)", "branches.find((branchObj: any) => branchObj.id === selectedBranch)")
content = content.replace("setSelectedCase", "setSelectedBranch")

# Reports th
content = content.replace("Case Details", "Branch Details")

with open("components/dashboard/legal-recovery/LegalWorkLogsView.tsx", "w") as f:
    f.write(content)

