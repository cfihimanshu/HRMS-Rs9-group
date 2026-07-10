import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import JobFormField from "@/models/sequelize/JobFormField";
import JobFormFieldOption from "@/models/sequelize/JobFormFieldOption";

export async function GET() {
  try {
    // 1. Sync tables
    await JobFormField.sync({ alter: true });
    await JobFormFieldOption.sync({ alter: true });

    // 2. Count existing fields
    const count = await JobFormField.count();
    if (count === 0) {
      console.log("[SEEDING] Populating default dynamic job application form config...");

      const defaultFields = [
        { id: "email", label: "Email / ईमेल", type: "email", required: true, hasOther: false, order: 10 },
        { id: "highestEducation", label: "Highest Education / उच्चतम शिक्षा", type: "radio", required: true, hasOther: true, order: 20 },
        { id: "cvUpload", label: "Upload your CV / अपना सीवी अपलोड करें", type: "file", required: true, hasOther: false, order: 30 },
        { id: "name", label: "Name / नाम", type: "text", required: true, hasOther: false, order: 40 },
        { id: "drivingLicense", label: "Vehicle and Driving License availability / वाहन और ड्राइविंग लाइसेंस की उपलब्धता", type: "radio", required: true, hasOther: true, order: 50 },
        { id: "sourceOfJobInfo", label: "Source of Job Information / नौकरी की जानकारी का स्रोत", type: "radio", required: true, hasOther: true, order: 60 },
        { id: "declaration", label: "I declare that the information given is true. / मैं घोषणा करता हूँ कि दी गई जानकारी सही है।", type: "radio", required: true, hasOther: false, order: 70 },
        { id: "applicationDate", label: "Date of Application / आवेदन की तारीख", type: "date_time", required: true, hasOther: false, order: 80 },
        { id: "currentCity", label: "Current City / वर्तमान शहर (State-District-City-Village)", type: "text", required: true, hasOther: false, order: 90 },
        { id: "currentSalary", label: "Current / Last Salary (Supported by your 1-year Bank Statement) / वर्तमान / अंतिम वेतन", type: "text", required: true, hasOther: false, order: 100 },
        { id: "joiningTime", label: "Joining Time / कार्यभार संभालने का समय", type: "radio", required: true, hasOther: false, order: 110 },
        { id: "preferredLocation", label: "Preferred Location (Jaipur HO / District Field / Any) / पसंदीदा कार्यस्थल", type: "radio", required: true, hasOther: true, order: 120 },
        { id: "lastEmployerDetails", label: "Current / Last Employer Details (Company Name/Owner Name/Contact Details)", type: "textarea", required: false, hasOther: false, order: 130 },
        { id: "expectedWages", label: "Minimum Expected Wages/Payout you expect from us? / न्यूनतम अपेक्षित वेतन", type: "select", required: true, hasOther: false, order: 140 },
        { id: "whatsappNumber", label: "WhatsApp Number (if different) / व्हाट्सएप नंबर", type: "text", required: true, hasOther: false, order: 150 },
        { id: "photoUpload", label: "Upload Your Passport Size Photo / अपना पासपोर्ट साइज फोटो अपलोड करें", type: "file", required: false, hasOther: false, order: 160 },
        { id: "verticalField", label: "Which role are you applying for? / आप किस पद के लिए आवेदन कर रहे हैं?", type: "radio", required: true, hasOther: true, order: 170 },
        { id: "totalExperience", label: "Total Experience in the same vertical for which you are applying? / कुल अनुभव", type: "radio", required: true, hasOther: true, order: 180 },
        { id: "willingToTravel", label: "Willing for Travel (Yes / No) / यात्रा के लिए तैयार हैं?", type: "radio", required: true, hasOther: true, order: 190 },
        { id: "mobile", label: "Mobile No. / मोबाइल नंबर", type: "text", required: true, hasOther: false, order: 200 },
        { id: "additionalInfo", label: "Anything else you want to submit relevant to your selection for the applied Post / कोई अन्य प्रासंगिक जानकारी", type: "textarea", required: true, hasOther: false, order: 210 },
        { id: "verticalFieldSelection", label: "Vertical / Relevant Field / प्रासंगिक कार्यक्षेत्र", type: "radio", required: true, hasOther: true, order: 220 },
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
