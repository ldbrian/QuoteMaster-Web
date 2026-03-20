import { NextResponse } from 'next/server';
const Core = require('@alicloud/pop-core');

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    // ⚠️ 警告：跑通之后记得去阿里云重置密码并在这里替换！
    var client = new Core({
      accessKeyId: 'LTAI5tND7jYJhwjB28vtVoy2',
      accessKeySecret: '8iKxK2FKb2ktQOxJIakru1RrBQpnlF',
      endpoint: 'https://dypnsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });

    var params = {
      "PhoneNumber": phone,
      "SignName": "速通互联验证码", // 你截图里的官方送的测试签名
      "TemplateCode": "100001",   // 你截图里的官方送的测试模板
      "SchemeName": "QuoteMasterTest" 
    };

    var requestOption = { method: 'POST', formatParams: false };

    const result = await client.request('SendSmsVerifyCode', params, requestOption);
    
    if (result.Code === 'OK') {
        return NextResponse.json({ success: true, result });
    } else {
        throw new Error(result.Message || "短信发送失败");
    }
  } catch (error: any) {
    console.error("SMS Send Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}