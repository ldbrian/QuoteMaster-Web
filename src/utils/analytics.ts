// src/utils/analytics.ts
export const trackEvent = async (eventName: string, eventData: any = {}, userId: string | null = null) => {
  try {
    // 注意：这里的 URL 需要换成你实际的后端地址，如果前端配了代理，直接用 '/api/track' 即可
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''; 
    await fetch(`${apiUrl}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_data: eventData,
        user_id: userId
      })
    });
  } catch (error) {
    // 埋点失败静默处理，绝不弹窗打扰用户
    console.error("Analytics Error:", error);
  }
};