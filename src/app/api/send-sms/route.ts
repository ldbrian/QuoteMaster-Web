import { NextResponse } from 'next/server';
import Core from '@alicloud/pop-core';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 🚨 1. 防呆检查：确保 Vercel 真的拿到了钥匙！
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: '后端缺失Supabase管理员钥匙，请去Vercel检查并重新Deploy' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 🚨 2. 先存入数据库！(增加极度严苛的报错拦截)
    const { error: dbError } = await supabase.from('otp_codes').insert([{ phone, code: otpCode }]);
    
    if (dbError) {
      console.error("数据库存入失败:", dbError);
      return NextResponse.json({ error: `账本存入失败: ${dbError.message}` }, { status: 500 });
    }

    // 🚀 3. 数据库存成功了，我们再去扣费发短信！
    const client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'https://dypnsapi.aliyuncs.com', 
      apiVersion: '2017-05-25'
    });

    const params = {
      "PhoneNumber": phone, 
      "SignName": "云渚科技验证平台", // 保持你代码里这个能发出去的签名
      "TemplateCode": "100001",     
      "TemplateParam": JSON.stringify({ code: otpCode, min: "5" }) 
    };

    const requestOption = { method: 'POST' as const, timeout: 10000 };
    const result: any = await client.request('SendSmsVerifyCode', params, requestOption);

    if (result.Code !== 'OK') {
      throw new Error(result.Message || '阿里云返回错误状态');
    }

    return NextResponse.json({ success: true, message: '短信发送成功' });

  } catch (error: any) {
    console.error("接口崩溃:", error);
    return NextResponse.json({ error: error.message || '系统错误' }, { status: 500 });
  }
}