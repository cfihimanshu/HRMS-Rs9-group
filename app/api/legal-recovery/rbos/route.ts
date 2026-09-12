import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/apiAuth";
import sequelize from "@/lib/sequelize";
import BranchMaster from "@/models/sequelize/BranchMaster";
import LegalRbo from "@/models/sequelize/LegalRbo";

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");

async function listRbos() {
  const [saved, branches] = await Promise.all([
    LegalRbo.findAll({ attributes: ["name"], raw: true }),
    BranchMaster.findAll({ attributes: ["rbo"], raw: true }),
  ]);
  const names = new Map<string, string>();
  for (const value of [...saved.map(row => row.name), ...branches.map(row => row.rbo)]) {
    const name = normalizeName(String(value || ""));
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

export async function GET() {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    await sequelize.authenticate();
    return NextResponse.json({ success: true, data: await listRbos() });
  } catch (error: any) {
    console.error("RBO GET Error:", error.message);
    return NextResponse.json({ success: false, error: "RBO list could not be loaded" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession();
    if (auth.response) return auth.response;
    const body = await request.json();
    const name = typeof body.name === "string" ? normalizeName(body.name) : "";
    if (!name || name.length > 255) {
      return NextResponse.json({ success: false, error: "Enter an RBO name (maximum 255 characters)" }, { status: 400 });
    }
    await sequelize.authenticate();
    const existing = (await listRbos()).find(value => value.toLowerCase() === name.toLowerCase());
    const [rbo, created] = await LegalRbo.findOrCreate({ where: { name: existing || name } });
    return NextResponse.json({ success: true, data: rbo.name }, { status: created ? 201 : 200 });
  } catch (error: any) {
    console.error("RBO POST Error:", error.message);
    return NextResponse.json({ success: false, error: "RBO could not be saved. Please try again." }, { status: 500 });
  }
}
