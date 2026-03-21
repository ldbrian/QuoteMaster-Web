import { NextResponse } from 'next/server';
import Core from '@alicloud/pop-core';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });
    }

    // 1. 生成 6 位随机验证码
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 初始化阿里云 SDK
    // ⚠️ 确保你的 .env.local 里有这四个变量
    const client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'https://dysmsapi.aliyuncs.com', // ⚠️ 已经帮你改成正确的短信网关了
      apiVersion: '2017-05-25'
    });

    // 3. 构造请求参数
    const params = {
      "PhoneNumbers": phone,
      "SignName": process.env.ALIYUN_SMS_SIGN_NAME,       // 你的测试签名
      "TemplateCode": process.env.ALIYUN_SMS_TEMPLATE_CODE,   // 你的测试模板 CODE
      "TemplateParam": JSON.stringify({ code: otpCode })  // ⚠️ 修复报错的核心：把验证码传给模板里的 ${code}
    };

    const requestOption = { method: 'POST' as const };

    // 4. 正式向阿里云发射！
    const result: any = await client.request('SendSms', params, requestOption);

    if (result.Code !== 'OK') {
      throw new Error(result.Message || '阿里云返回错误状态');
    }

    // ==========================================
    // 🚨 注意：这里你需要把 phone 和 otpCode 存到数据库里
    // 比如存进 Supabase 的 otp_codes 表，或者直接更新进 profiles 表
    // 这样验证接口 /api/verify-sms 才知道客户填的对不对
    // ==========================================

    return NextResponse.json({ success: true, message: '短信发送成功' });

  } catch (error: any) {
    console.error("阿里云短信发送崩溃:", error);
    return NextResponse.json({ error: error.message || '短信发送失败，请联系管理员' }, { status: 500 });
  }
}