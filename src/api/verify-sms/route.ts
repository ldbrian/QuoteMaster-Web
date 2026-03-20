import { NextResponse } from 'next/server';
const Core = require('@alicloud/pop-core');

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    var client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: 'https://dypnsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });

    var params = {
      "PhoneNumber": phone,
      "VerifyCode": code
    };

    var requestOption = { method: 'POST', formatParams: false };

    const result = await client.request('CheckSmsVerifyCode', params, requestOption);
    
    if (result.Code === 'OK') {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ success: false, message: result.Message || "验证码错误" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("SMS Verify Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}