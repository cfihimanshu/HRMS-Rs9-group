import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class Candidate extends Model {
  public id!: string;
  public job!: string;
  public name!: string;
  public mobile!: string;
  public email!: string;
  public address!: string;
  public qualification!: string;
  public experience!: string;
  public currentSalary!: string;
  public expectedSalary!: string;
  public noticePeriod!: string;
  public sideBusiness!: string;
  public loanPressure!: string;
  public courtCase!: string;
  public targetWork!: string;
  public fieldWork!: string;
  public backgroundVerification!: string;
  public confidentialityAgreement!: string;
  public resume!: string;
  public photo!: string;
  public aadhaar!: string;
  public pan!: string;
  public salarySlip!: string;
  public bankStatement!: string;
  public candidateSummary!: string;
  public skillMatchScore!: number;
  public stabilityScore!: number;
  public riskScore!: number;
  public loyaltyPossibility!: number;
  public fraudRisk!: string;
  public suggestedQuestions!: string;
  public recommendation!: string;
  public screenedAt!: Date;
  public status!: string;
  public currentRound!: number;
  public drivingLicense!: string;
  public sourceOfJobInfo!: string;
  public declaration!: string;
  public preferredLocation!: string;
  public lastEmployerDetails!: string;
  public whatsappNumber!: string;
  public willingToTravel!: string;
  public verticalField!: string;
  public joiningTime!: string;
  public applicationDate!: string;
  public gender!: string;
  public resumeLink!: string;
  public skills!: string;
  public age!: string;
  public course!: string;
  public collegeName!: string;
  public previousDesignation!: string;
  public previousCompanyName!: string;

  public uploads!: any;
  public riskAnswers!: any;
  public screeningResult!: any;
  public createdAt!: Date;
  public updatedAt!: Date;

  public toJSON(): object {
    const values = { ...this.get() } as any;
    values.riskAnswers = {
      sideBusiness: values.sideBusiness,
      loanPressure: values.loanPressure,
      courtCase: values.courtCase,
      targetWork: values.targetWork,
      fieldWork: values.fieldWork,
      backgroundVerification: values.backgroundVerification,
      confidentialityAgreement: values.confidentialityAgreement,
    };
    values.uploads = {
      resume: values.resume,
      photo: values.photo,
      aadhaar: values.aadhaar,
      pan: values.pan,
      salarySlip: values.salarySlip,
      bankStatement: values.bankStatement,
    };
    values.screeningResult = {
      candidateSummary: values.candidateSummary,
      skillMatchScore: values.skillMatchScore,
      stabilityScore: values.stabilityScore,
      riskScore: values.riskScore,
      loyaltyPossibility: values.loyaltyPossibility,
      fraudRisk: values.fraudRisk,
      suggestedQuestions: values.suggestedQuestions,
      recommendation: values.recommendation,
      screenedAt: values.screenedAt,
    };
    return values;
  }
}

Candidate.init(
  {
    
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    job: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    experience: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentSalary: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expectedSalary: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    noticePeriod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sideBusiness: {
      type: DataTypes.STRING,
      field: "riskAnswers.sideBusiness",
      allowNull: true,
    },
    loanPressure: {
      type: DataTypes.STRING,
      field: "riskAnswers.loanPressure",
      allowNull: true,
    },
    courtCase: {
      type: DataTypes.STRING,
      field: "riskAnswers.courtCase",
      allowNull: true,
    },
    targetWork: {
      type: DataTypes.STRING,
      field: "riskAnswers.targetWork",
      allowNull: true,
    },
    fieldWork: {
      type: DataTypes.STRING,
      field: "riskAnswers.fieldWork",
      allowNull: true,
    },
    backgroundVerification: {
      type: DataTypes.STRING,
      field: "riskAnswers.backgroundVerification",
      allowNull: true,
    },
    confidentialityAgreement: {
      type: DataTypes.STRING,
      field: "riskAnswers.confidentialityAgreement",
      allowNull: true,
    },
    resume: {
      type: DataTypes.STRING,
      field: "uploads.resume",
      allowNull: true,
    },
    photo: {
      type: DataTypes.STRING,
      field: "uploads.photo",
      allowNull: true,
    },
    aadhaar: {
      type: DataTypes.STRING,
      field: "uploads.aadhaar",
      allowNull: true,
    },
    pan: {
      type: DataTypes.STRING,
      field: "uploads.pan",
      allowNull: true,
    },
    salarySlip: {
      type: DataTypes.STRING,
      field: "uploads.salarySlip",
      allowNull: true,
    },
    bankStatement: {
      type: DataTypes.STRING,
      field: "uploads.bankStatement",
      allowNull: true,
    },
    candidateSummary: {
      type: DataTypes.STRING,
      field: "screeningResult.candidateSummary",
      allowNull: true,
    },
    skillMatchScore: {
      type: DataTypes.FLOAT,
      field: "screeningResult.skillMatchScore",
      allowNull: true,
    },
    stabilityScore: {
      type: DataTypes.FLOAT,
      field: "screeningResult.stabilityScore",
      allowNull: true,
    },
    riskScore: {
      type: DataTypes.FLOAT,
      field: "screeningResult.riskScore",
      allowNull: true,
    },
    loyaltyPossibility: {
      type: DataTypes.FLOAT,
      field: "screeningResult.loyaltyPossibility",
      allowNull: true,
    },
    fraudRisk: {
      type: DataTypes.STRING,
      field: "screeningResult.fraudRisk",
      allowNull: true,
    },
    suggestedQuestions: {
      type: DataTypes.TEXT,
      field: "screeningResult.suggestedQuestions",
      allowNull: true,
    },
    recommendation: {
      type: DataTypes.STRING,
      field: "screeningResult.recommendation",
      allowNull: true,
    },
    screenedAt: {
      type: DataTypes.DATE,
      field: "screeningResult.screenedAt",
      allowNull: true,
    },
    currentRound: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    drivingLicense: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceOfJobInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    declaration: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    preferredLocation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastEmployerDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    whatsappNumber: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    willingToTravel: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verticalField: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    joiningTime: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    applicationDate: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resumeLink: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    skills: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    age: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    course: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    collegeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    previousDesignation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    previousCompanyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    uploads: {
      type: DataTypes.VIRTUAL,
      get() {
        return {
          resume: this.getDataValue('resume'),
          photo: this.getDataValue('photo'),
          aadhaar: this.getDataValue('aadhaar'),
          pan: this.getDataValue('pan'),
          salarySlip: this.getDataValue('salarySlip'),
          bankStatement: this.getDataValue('bankStatement'),
        };
      },
      set(value: any) {
        if (value) {
          if (value.resume !== undefined) this.setDataValue('resume', value.resume);
          if (value.photo !== undefined) this.setDataValue('photo', value.photo);
          if (value.aadhaar !== undefined) this.setDataValue('aadhaar', value.aadhaar);
          if (value.pan !== undefined) this.setDataValue('pan', value.pan);
          if (value.salarySlip !== undefined) this.setDataValue('salarySlip', value.salarySlip);
          if (value.bankStatement !== undefined) this.setDataValue('bankStatement', value.bankStatement);
        }
      }
    },
    riskAnswers: {
      type: DataTypes.VIRTUAL,
      get() {
        return {
          sideBusiness: this.getDataValue('sideBusiness'),
          loanPressure: this.getDataValue('loanPressure'),
          courtCase: this.getDataValue('courtCase'),
          targetWork: this.getDataValue('targetWork'),
          fieldWork: this.getDataValue('fieldWork'),
          backgroundVerification: this.getDataValue('backgroundVerification'),
          confidentialityAgreement: this.getDataValue('confidentialityAgreement'),
        };
      },
      set(value: any) {
        if (value) {
          if (value.sideBusiness !== undefined) this.setDataValue('sideBusiness', value.sideBusiness);
          if (value.loanPressure !== undefined) this.setDataValue('loanPressure', value.loanPressure);
          if (value.courtCase !== undefined) this.setDataValue('courtCase', value.courtCase);
          if (value.targetWork !== undefined) this.setDataValue('targetWork', value.targetWork);
          if (value.fieldWork !== undefined) this.setDataValue('fieldWork', value.fieldWork);
          if (value.backgroundVerification !== undefined) this.setDataValue('backgroundVerification', value.backgroundVerification);
          if (value.confidentialityAgreement !== undefined) this.setDataValue('confidentialityAgreement', value.confidentialityAgreement);
        }
      }
    },
    screeningResult: {
      type: DataTypes.VIRTUAL,
      get() {
        return {
          candidateSummary: this.getDataValue('candidateSummary'),
          skillMatchScore: this.getDataValue('skillMatchScore'),
          stabilityScore: this.getDataValue('stabilityScore'),
          riskScore: this.getDataValue('riskScore'),
          loyaltyPossibility: this.getDataValue('loyaltyPossibility'),
          fraudRisk: this.getDataValue('fraudRisk'),
          suggestedQuestions: this.getDataValue('suggestedQuestions'),
          recommendation: this.getDataValue('recommendation'),
          screenedAt: this.getDataValue('screenedAt'),
        };
      },
      set(value: any) {
        if (value) {
          if (value.candidateSummary !== undefined) this.setDataValue('candidateSummary', value.candidateSummary);
          if (value.skillMatchScore !== undefined) this.setDataValue('skillMatchScore', value.skillMatchScore);
          if (value.stabilityScore !== undefined) this.setDataValue('stabilityScore', value.stabilityScore);
          if (value.riskScore !== undefined) this.setDataValue('riskScore', value.riskScore);
          if (value.loyaltyPossibility !== undefined) this.setDataValue('loyaltyPossibility', value.loyaltyPossibility);
          if (value.fraudRisk !== undefined) this.setDataValue('fraudRisk', value.fraudRisk);
          if (value.suggestedQuestions !== undefined) this.setDataValue('suggestedQuestions', typeof value.suggestedQuestions === 'string' ? value.suggestedQuestions : JSON.stringify(value.suggestedQuestions));
          if (value.recommendation !== undefined) this.setDataValue('recommendation', value.recommendation);
          if (value.screenedAt !== undefined) this.setDataValue('screenedAt', value.screenedAt);
        }
      }
    }
  },
  {
    sequelize,
    tableName: "candidates",
    timestamps: true,
  }
);

export default Candidate;
