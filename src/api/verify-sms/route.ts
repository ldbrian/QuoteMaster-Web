import { NextResponse } from 'next/server';
const Core = require('@alicloud/pop-core');

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    var client = new Core({
      accessKeyId: 'LTAI5tND7jYJhwjB28vtVoy2',
      accessKeySecret: '8iKxK2FKb2ktQOxJIakru1RrBQpnlF',
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