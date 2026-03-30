// src/utils/analytics.ts
export const trackEvent = async (eventName: string, eventData: any = {}, userId: string | null = null) => {
  try {
    // 🌟 核心修改：如果环境变量有配后端完整地址就用配置的，如果没有，默认走相对路径（自动拼上当前前端域名）
    // 如果你的前后端已经通过反向代理配置在同一个域名下（比如都在 qm-ai.pro 下），这招最管用！
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''; 
    const targetUrl = apiUrl ? `${apiUrl}/api/track` : '/api/track';

    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_data: eventData,
        user_id: userId
      })
    });
  } catch (error) {
    console.error("Analytics Error:", error);
  }
};