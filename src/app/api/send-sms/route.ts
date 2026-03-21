import { NextResponse } from 'next/server';
import Core from '@alicloud/pop-core';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'https://dypnsapi.aliyuncs.com', // ⚠️ 核心：换回个人免认证的网关
      apiVersion: '2017-05-25'
    });

    const params = {
      "PhoneNumber": phone, // ⚠️ 注意：系统A叫 PhoneNumber，没有 s
      "SignName": "云渚科技验证平台", // ⚠️ 直接写死系统A给你的签名
      "TemplateCode": "100001",     // ⚠️ 直接写死系统A给你的模板
      "TemplateParam": JSON.stringify({ code: otpCode, min: "5" }) // 加上了刚才漏掉的数字！
    };

    // ⚠️ 系统A的发射动作叫 SendSmsVerifyCode 
    const requestOption = { method: 'POST' as const, timeout: 10000 };
    const result: any = await client.request('SendSmsVerifyCode', params, requestOption);

    if (result.Code !== 'OK') {
      throw new Error(result.Message || '阿里云返回错误状态');
    }
    if (result.Code !== 'OK') {
      throw new Error(result.Message || '阿里云返回错误状态');
    }

    // 👇 把下面这段新的记账代码加在这里 👇
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // 注意：这里必须用超级管理员钥匙
    );
    await supabase.from('otp_codes').insert([{ phone, code: otpCode }]);

    return NextResponse.json({ success: true, message: '短信发送成功' });

  } catch (error: any) {
    console.error("阿里云短信发送崩溃:", error);
    return NextResponse.json({ error: error.message || '短信发送失败' }, { status: 500 });
  }
}