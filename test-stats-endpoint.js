const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  console.log("Connected to MongoDB");
  
  try {
    // 1. Candidate Stats
    const totalCandidates = await mongoose.connection.db.collection('candidates').countDocuments();
    const pendingCandidates = await mongoose.connection.db.collection('candidates').countDocuments({ status: "Pending" });
    const selectedCandidates = await mongoose.connection.db.collection('candidates').countDocuments({ status: "Selected" });
    const highRiskCandidates = await mongoose.connection.db.collection('candidates').countDocuments({ status: "High Risk" });
    console.log("Candidate counts:", { totalCandidates, pendingCandidates, selectedCandidates, highRiskCandidates });

    // 2. Interview Stats
    const pendingInterviews = await mongoose.connection.db.collection('interviews').countDocuments({ status: "Pending" });
    console.log("Pending interviews:", pendingInterviews);

    // 3. User Master Roles count
    const totalEmployees = await mongoose.connection.db.collection('users').countDocuments({ role: { $in: ["Employee", "Trainer"] } });
    const totalAssociates = await mongoose.connection.db.collection('associates').countDocuments({ status: "active" });
    const totalVendors = await mongoose.connection.db.collection('vendors').countDocuments({ status: "active" });
    const totalFranchises = await mongoose.connection.db.collection('franchises').countDocuments({ status: "active" });
    console.log("User counts:", { totalEmployees, totalAssociates, totalVendors, totalFranchises });

    // 4. Operations metrics
    const trainingPending = await mongoose.connection.db.collection('trainings').countDocuments({ status: { $ne: "Activation" } });
    const activeProbations = await mongoose.connection.db.collection('probations').countDocuments({ status: "active" });
    const activeGrievances = await mongoose.connection.db.collection('grievances').countDocuments({ status: "Open" });
    console.log("Ops counts:", { trainingPending, activeProbations, activeGrievances });

    // 5. Alert counts
    const criticalRiskAlerts = await mongoose.connection.db.collection('riskalerts').countDocuments({ status: "Open", level: "Critical" });
    const totalRiskAlerts = await mongoose.connection.db.collection('riskalerts').countDocuments({ status: "Open" });
    console.log("Risk alerts:", { criticalRiskAlerts, totalRiskAlerts });

    // 6. Attendance, SOD/EOD compliances (today's counts)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    
    const sodReportsToday = await mongoose.connection.db.collection('sodreports').find({ date: today }).toArray();
    const sodEmployeeIds = sodReportsToday.map((r) => r.employee ? r.employee.toString() : 'null');
    const uniqueSodEmployees = sodEmployeeIds.filter((v, i, a) => a.indexOf(v) === i);

    const eodReportsToday = await mongoose.connection.db.collection('eodreports').find({ date: today }).toArray();
    const eodEmployeeIds = eodReportsToday.map((r) => r.employee ? r.employee.toString() : 'null');
    const uniqueEodEmployees = eodEmployeeIds.filter((v, i, a) => a.indexOf(v) === i);

    const totalEmployeesCount = await mongoose.connection.db.collection('users').countDocuments({ role: { $in: ["Employee", "Trainer"] } });

    const attendanceRecords = await mongoose.connection.db.collection('attendances').find({ date: today, status: "Present" }).toArray();
    const attendanceEmployeeIds = attendanceRecords.map((r) => r.employee ? r.employee.toString() : 'null');
    const combinedIds = [...uniqueSodEmployees, ...uniqueEodEmployees, ...attendanceEmployeeIds];
    const finalPresentIds = combinedIds.filter((v, i, a) => a.indexOf(v) === i);
    
    const presentCount = finalPresentIds.length;
    const absentCount = Math.max(0, totalEmployeesCount - uniqueSodEmployees.length);

    const leavesCount = await mongoose.connection.db.collection('leaves').countDocuments({
      status: "Approved",
      startDate: { $lte: endOfToday },
      endDate: { $gte: today }
    });

    let lateCount = 0;
    for (const sod of sodReportsToday) {
      const localHour = new Date(sod.createdAt).getHours();
      if (localHour >= 11) {
        lateCount++;
      }
    }

    const sodPercent = totalEmployeesCount > 0 ? Math.round((uniqueSodEmployees.length / totalEmployeesCount) * 100) : 0;
    const eodPercent = totalEmployeesCount > 0 ? Math.round((uniqueEodEmployees.length / totalEmployeesCount) * 100) : 0;

    // 7. HR Dashboard specific metrics
    const todayInterviewsList = await mongoose.connection.db.collection('interviews').find({ scheduleTime: { $gte: today, $lte: endOfToday } }).toArray();
    const todayInterviewsCount = todayInterviewsList.length;

    // Vetting registry candidates (passed all 3 rounds) who are not verified
    const interviewsSelected = await mongoose.connection.db.collection('interviews').find({ status: "Selected" }).toArray();
    const candidateInterviewsMap = {};
    interviewsSelected.forEach((iv) => {
      if (iv.candidate) {
        const cid = iv.candidate.toString();
        if (!candidateInterviewsMap[cid]) {
          candidateInterviewsMap[cid] = new Set();
        }
        candidateInterviewsMap[cid].add(iv.round);
      }
    });
    const eligibleCandIds = Object.keys(candidateInterviewsMap).filter(cid => {
      const rounds = candidateInterviewsMap[cid];
      return rounds.has(1) && rounds.has(2) && rounds.has(3);
    });
    const verifiedDocs = await mongoose.connection.db.collection('verifications').find({
      candidate: { $in: eligibleCandIds.map(id => new mongoose.Types.ObjectId(id)) },
      status: "Verified"
    }).toArray();
    const verifiedIds = new Set(verifiedDocs.map(v => v.candidate.toString()));
    const pendingVerificationsCount = eligibleCandIds.filter(cid => !verifiedIds.has(cid)).length;

    const rejectedCandidatesCount = await mongoose.connection.db.collection('candidates').countDocuments({ status: "Rejected" });
    const activeExits = await mongoose.connection.db.collection('exitrecords').countDocuments({ status: "active" });

    // 8. Department Dashboard metrics
    const tasksToday = sodReportsToday.reduce((acc, curr) => {
      return acc + (curr.callsPlanned || 0) + (curr.meetings || 0) + (curr.fieldVisits || 0);
    }, 0);

    console.log("Calculated metrics successfully!");
  } catch (err) {
    console.error("Error executing stats queries:", err);
  }

  mongoose.disconnect();
}).catch(console.error);
