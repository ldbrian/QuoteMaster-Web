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
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // 引用预览区域，用于导出 PDF
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quoteData) return null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + parseInt(validDays));
  const validUntil = validUntilDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // 🚀 1. 真正的 PDF 导出引擎（解决卡死问题）
  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    
    // 开启 Loading 状态，防止重复点击
    setIsExportingPDF(true);

    // 🌟 核心修复：用 setTimeout 把繁重的渲染任务推迟一帧，让 React 有时间把 Loading 动画渲染出来，避免假死！
    setTimeout(async () => {
      try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        
        const element = previewRef.current;
        if (!element) return;
        const opt = {
          margin:       0,
          filename:     `Quotation_${styleNo || 'QM_Quote'}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { 
            scale: 2, // 恢复 2 倍高清画质
            useCORS: true, 
            logging: false,
            // 🌟 核心修复：在截图瞬间，强制清除克隆 DOM 的阴影，彻底消灭 lab() 颜色崩溃源
            onclone: (clonedDoc: Document) => {
              const elements = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < elements.length; i++) {
                const el = elements[i] as HTMLElement;
                el.style.boxShadow = 'none';
                el.style.filter = 'none';
              }
            }
          }, 
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        // 加上 await，等彻底生成完再关掉 Loading
        await html2pdf().set(opt).from(element).save();
      } catch (error) {
        console.error("PDF 导出失败:", error);
        alert("导出遇到问题，请重试。");
      } finally {
        setIsExportingPDF(false); // 关闭 Loading
      }
    }, 100); 
  };

  // 📊 2. 真正的 Excel 导出引擎（消灭假闭环）
  const handleExportExcel = async () => {
    try {
      // 动态加载 xlsx 库
      const XLSX = await import('xlsx');
      
      // 组装要写入 Excel 的数据
      const excelData = (quoteData.bom || []).map((item: any) => ({
        "项目明细 (Description)": item.item || item.name,
        "预估单价 (Unit Price USD)": Number(item.cost).toFixed(2)
      }));
      
      // 如果有利润/杂费，加在倒数第二行
      if (quoteData.margin > 0) {
        excelData.push({
          "项目明细 (Description)": "Premium / Risk Buffer",
          "预估单价 (Unit Price USD)": Number(quoteData.margin).toFixed(2)
        });
      }
      
      // 最后一行加上总价
      excelData.push({
        "项目明细 (Description)": "TOTAL FOB PRICE",
        "预估单价 (Unit Price USD)": Number(quoteData.final_price).toFixed(2)
      });

      // 生成工作簿并下载
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quotation");
      
      XLSX.writeFile(workbook, `Quotation_${styleNo || 'QM_Quote'}.xlsx`);
    } catch (error) {
      console.error("Excel 导出失败:", error);
      alert("Excel 生成失败，请检查依赖是否正确安装。");
    }
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
            <button 
              onClick={handleExportPDF} 
              disabled={isExportingPDF}
              className={`w-full text-white font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-colors ${
                isExportingPDF ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isExportingPDF ? (
                <>正在渲染高清文件，请稍候...</>
              ) : (
                <><FileText className="w-4 h-4" /> 导出精美 PDF</>
              )}
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
            <div className="shadow-2xl h-fit"></div>
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