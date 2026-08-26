import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import JobFormField from "@/models/sequelize/JobFormField";
import JobFormFieldOption from "@/models/sequelize/JobFormFieldOption";

export async function GET() {
  try {
    // 1. Sync tables
    await JobFormField.sync();
    await JobFormFieldOption.sync();

    // 2. Count existing fields
    const count = await JobFormField.count();
    if (count === 0) {
      console.log("[SEEDING] Populating default dynamic job application form config...");

      const defaultFields = [
        { id: "email", label: "Email", type: "email", required: true, hasOther: false, order: 10 },
        { id: "highestEducation", label: "Highest Education", type: "radio", required: true, hasOther: true, order: 20 },
        { id: "cvUpload", label: "Upload Your CV", type: "file", required: true, hasOther: false, order: 30 },
        { id: "name", label: "Name", type: "text", required: true, hasOther: false, order: 40 },
        { id: "drivingLicense", label: "Vehicle and Driving License Availability", type: "radio", required: true, hasOther: true, order: 50 },
        { id: "sourceOfJobInfo", label: "Source of Job Information", type: "radio", required: true, hasOther: true, order: 60 },
        { id: "declaration", label: "I declare that the information provided is true.", type: "radio", required: true, hasOther: false, order: 70 },
        { id: "applicationDate", label: "Date of Application", type: "date_time", required: true, hasOther: false, order: 80 },
        { id: "currentCity", label: "Current City (State-District-City-Village)", type: "text", required: true, hasOther: false, order: 90 },
        { id: "currentSalary", label: "Current / Last Salary (Supported by Your 1-Year Bank Statement)", type: "text", required: true, hasOther: false, order: 100 },
        { id: "joiningTime", label: "Joining Time", type: "radio", required: true, hasOther: false, order: 110 },
        { id: "preferredLocation", label: "Preferred Location (Jaipur HO / District Field / Any)", type: "radio", required: true, hasOther: true, order: 120 },
        { id: "lastEmployerDetails", label: "Current / Last Employer Details (Company Name/Owner Name/Contact Details)", type: "textarea", required: false, hasOther: false, order: 130 },
        { id: "expectedWages", label: "Minimum Expected Wages/Payout", type: "select", required: true, hasOther: false, order: 140 },
        { id: "whatsappNumber", label: "WhatsApp Number (if different)", type: "text", required: true, hasOther: false, order: 150 },
        { id: "photoUpload", label: "Upload Your Passport-Size Photo", type: "file", required: false, hasOther: false, order: 160 },
        { id: "verticalField", label: "Which Role Are You Applying For?", type: "radio", required: true, hasOther: true, order: 170 },
        { id: "totalExperience", label: "Total Experience in the Same Field", type: "radio", required: true, hasOther: true, order: 180 },
        { id: "willingToTravel", label: "Willing to Travel (Yes / No)", type: "radio", required: true, hasOther: true, order: 190 },
        { id: "mobile", label: "Mobile Number", type: "text", required: true, hasOther: false, order: 200 },
        { id: "additionalInfo", label: "Any Other Information Relevant to Your Application", type: "textarea", required: true, hasOther: false, order: 210 },
        { id: "verticalFieldSelection", label: "Vertical / Relevant Field", type: "radio", required: true, hasOther: true, order: 220 },
      ];

      const defaultOptions: { [key: string]: string[] } = {
        highestEducation: [
          "Non-Graduate",
          "Graduate",
          "Post Graduate",
          "Proffessional (CA, Advocate, Engineer, Valuer, Doctor)"
        ],
        drivingLicense: [
          "Own Vehicle and have Valid Driving License",
          "Own Vehicle but do not have driving License",
          "Do not Own Vehicle but have valid driving license",
          "No vehicle No license"
        ],
        sourceOfJobInfo: [
          "Dainik Bhaskar",
          "Indeed",
          "Reference"
        ],
        declaration: [
          "Yes",
          "No"
        ],
        joiningTime: [
          "Immediate",
          "1-3 days",
          "4-7 Days",
          "8-15 days",
          "Beyond 15 days"
        ],
        preferredLocation: [
          "Jaipur HO",
          "District Field",
          "Ready to relocate Any where",
          "Ahmedabad",
          "Gurgaon",
          "Hyderabad",
          "Chandigarh",
          "Mumbai",
          "Work started from Home",
          "Work from home only"
        ],
        expectedWages: [
          "₹10,000 - ₹15,000",
          "₹15,000 - ₹20,000",
          "₹20,000 - ₹30,000",
          "₹30,000 - ₹40,000",
          "₹40,000 - ₹50,000",
          "₹50,000+"
        ],
        verticalField: [
          "HR Recruiter",
          "Sales Manager",
          "Team Leader",
          "Tele Sales Associate",
          "Editor",
          "Video Creator / Graphic Designer",
          "News Anchor",
          "Local Reporter / Surveyor",
          "Channel Partner",
          "Web Developer (Fullstack/WordPress)",
          "Digital Marketing Executive",
          "Legal Associate",
          "Recovery Manager",
          "Bank Recovery Associate",
          "Tele-Legal Associate",
          "Computer Typist (Legal work exp.)",
          "Accountant",
          "Assistant / Office Staff",
          "Driver / Maid (Semi-skilled)",
          "Content Creator",
          "Retired Banker",
          "Courier / Delivery Related",
          "Strategy and Advisor",
          "Free Lancer / Agent",
          "Google Automation Architect",
          "VikasMitra (Local Field Associate)"
        ],
        totalExperience: [
          "Fresher (0-1 Years)",
          "More than 1 but less than 2 Year",
          "2-5 Year",
          "5+ Year"
        ],
        willingToTravel: [
          "Yes",
          "No"
        ],
        verticalFieldSelection: [
          "Digital News Media",
          "Legal",
          "Bank Recovery",
          "Web Development",
          "Back Office work",
          "Field Work",
          "Computer Typing",
          "HR Recruitment",
          "Driver",
          "Maid",
          "Startup Consultancy",
          "Admin",
          "Accounts",
          "Sales",
          "Digital Marketing",
          "IT/Web Development/Software/App Development",
          "Courier / Delivery",
          "Security & Surveillance"
        ]
      };

      // Bulk create fields
      await JobFormField.bulkCreate(defaultFields);

      // Construct and bulk create options
      const optionsToInsert: any[] = [];
      for (const fieldId of Object.keys(defaultOptions)) {
        defaultOptions[fieldId].forEach((value, idx) => {
          optionsToInsert.push({
            fieldId,
            value,
            order: (idx + 1) * 10
          });
        });
      }
      await JobFormFieldOption.bulkCreate(optionsToInsert);
    }

    // 3. Retrieve all fields and options ordered by their 'order' properties
    const fields = await JobFormField.findAll({ order: [["order", "ASC"]] });
    const options = await JobFormFieldOption.findAll({ order: [["order", "ASC"]] });

    return NextResponse.json({
      success: true,
      data: {
        fields,
        options,
      }
    });
  } catch (err: any) {
    console.error("Failed to load job form configuration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
