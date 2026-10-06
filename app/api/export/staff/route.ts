import { NextResponse } from 'next/server';
import sequelize, { connectSequelize } from '@/lib/sequelize';
import { QueryTypes } from 'sequelize';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.RS9_API_KEY;

    if (!apiKey) {
      console.error('RS9_API_KEY is not defined in the environment.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectSequelize();

    const results = await sequelize.query(`
      SELECT 
        u.id as UserID,
        ep.employeeId as StaffID,
        u.name as Name,
        u.email as Email,
        u.mobile as Mobile,
        d.name as Department,
        des.name as Designation,
        u.status as Status
      FROM users u
      LEFT JOIN employeeprofiles ep ON u.id = ep.user
      LEFT JOIN departments d ON ep.department = d.id
      LEFT JOIN designations des ON ep.designation = des.id
    `, {
      type: QueryTypes.SELECT
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Failed to fetch staff mapping', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
