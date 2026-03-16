'use client';

import React, { useState, useRef } from 'react';
import { X, Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: any;
}

export default function ExportPreviewModal({ isOpen, onClose, quoteData }: ExportPreviewModalProps) {
  // 业务员配置状态
  const [clientName, setClientName] = useState('');
  const [styleNo, setStyleNo] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [remarks, setRemarks] = useState('');

  // 引用预览区域，用于导出 PDF
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quoteData) return null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + parseInt(validDays));
  const validUntil = validUntilDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // 🚀 接入真实的 PDF 导出引擎
  const handleExportPDF = async () => {
    if (!previewRef.current) {
      alert("预览区域未加载，无法导出！");
      return;
    }

    try {
      // 动态引入 html2pdf，完美避开 Next.js 的 SSR 报错坑
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = previewRef.current;
      
      // 配置 PDF 参数，确保 A4 尺寸和高清画质
      const opt = {
        margin:       0,
        filename:     `Quotation_${styleNo || 'QM_Quote'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // 生成并下载 PDF
      html2pdf().set(opt).from(element).save();
      
    } catch (error) {
      console.error("PDF 导出失败:", error);
      alert("导出失败，请检查网络或控制台日志。");
    }
  };

  // 预留的 Excel 导出接口（待开发）
  const handleExportExcel = () => {
    alert("📊 导出 Excel 核心逻辑准备就绪！我们将在下一步接入 xlsx 库生成真实的电子表格。");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 transition-opacity">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 左侧：装配控制台 (w-1/3) */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              报价单生成配置
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Client / 客户抬头</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Zara Home Inc." 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Style No. / 客户款号</label>
              <input 
                type="text" 
                value={styleNo}
                onChange={(e) => setStyleNo(e.target.value)}
                placeholder="e.g. ZH-2026-FW-01" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Validity / 报价有效期</label>
              <select 
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Remarks / 额外备注</label>
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="在此输入需要补充给客户的说明条款..." 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              />
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 space-y-3 shrink-0">
            <button onClick={handleExportPDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-colors">
              <FileText className="w-4 h-4" /> 导出精美 PDF
            </button>
            <button onClick={handleExportExcel} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> 导出可编辑 Excel
            </button>
          </div>
        </div>

        {/* 右侧：A4 纸实时预览 (w-2/3) */}
        <div className="w-full md:w-2/3 bg-slate-200 flex flex-col h-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/50 backdrop-blur hover:bg-white text-slate-600 rounded-full shadow-sm transition-all hidden md:block">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            {/* A4 纸张容器 */}
            <div 
              ref={previewRef}
              className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 text-slate-800 font-sans flex flex-col"
              style={{ aspectRatio: '210/297' }}
            >
              {/* 纸张头部 */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">QUOTATION</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1">QuoteMaster Technology Co., Ltd.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">Date: <span className="font-normal">{today}</span></p>
                  <p className="text-sm font-bold text-slate-800 mt-1">Valid Until: <span className="font-normal text-rose-600">{validUntil}</span></p>
                </div>
              </div>

              {/* 客户与产品信息 */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Quoted To</p>
                  <p className="text-base font-bold text-slate-800 border-b border-slate-200 pb-1 min-h-[1.5rem]">
                    {clientName || <span className="text-slate-300 italic">Please enter client name...</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Style No. / Item</p>
                  <p className="text-base font-bold text-slate-800 border-b border-slate-200 pb-1 min-h-[1.5rem]">
                    {styleNo || quoteData.product_name || <span className="text-slate-300 italic">Please enter style no...</span>}
                  </p>
                </div>
              </div>

              {/* BOM 表格 */}
              <div className="mb-8 flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cost Breakdown (FOB Shanghai)</p>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-y border-slate-300">
                      <th className="py-3 px-4 font-bold text-sm text-slate-700">Description</th>
                      <th className="py-3 px-4 font-bold text-sm text-slate-700 text-right">Unit Price (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteData.bom?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-3 px-4 text-sm text-slate-600">{item.item || item.name}</td>
                        <td className="py-3 px-4 text-sm text-slate-800 font-mono text-right">${Number(item.cost).toFixed(2)}</td>
                      </tr>
                    ))}
                    {quoteData.margin > 0 && (
                      <tr className="border-b border-slate-100">
                        <td className="py-3 px-4 text-sm text-slate-600">Premium / Risk Buffer</td>
                        <td className="py-3 px-4 text-sm text-slate-800 font-mono text-right">${Number(quoteData.margin).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-b-2 border-slate-800">
                      <td className="py-4 px-4 font-black text-slate-900 text-right uppercase">Total FOB Price:</td>
                      <td className="py-4 px-4 font-black text-blue-700 text-xl font-mono text-right">
                        ${Number(quoteData.final_price).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 额外备注 */}
              {remarks && (
                <div className="mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Remarks</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">{remarks}</p>
                </div>
              )}

              {/* ⚠️ 核心痛点解决：免责声明 (放在纸张最底部) */}
              <div className="mt-auto pt-8 border-t border-slate-200">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-justify uppercase">
                  <strong>DISCLAIMER:</strong> THIS QUOTATION IS ESTIMATED BY QUOTEMASTER AI BASED ON IMAGE ANALYSIS AND PROVIDED PRELIMINARY DATA. PRICES ARE FOR REFERENCE ONLY AND SUBJECT TO CHANGE BASED ON FINAL PHYSICAL SAMPLES, MATERIAL MARKET FLUCTUATIONS, AND THE OFFICIAL PROFORMA INVOICE (PI). FREIGHT COSTS (IF ANY) ARE SUBJECT TO REAL-TIME CONFIRMATION.
                </p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}