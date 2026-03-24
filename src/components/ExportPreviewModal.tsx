'use client';

import React, { useState, useRef } from 'react';
import { X, FileText, FileSpreadsheet, Printer, ShieldCheck } from 'lucide-react'; 

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: any; // 现在接收的是包含 plans: { plan_a, plan_b, plan_c } 的新结构
}

export default function ExportPreviewModal({ isOpen, onClose, quoteData }: ExportPreviewModalProps) {
  const [clientName, setClientName] = useState('');
  const [styleNo, setStyleNo] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [remarks, setRemarks] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quoteData || !quoteData.plans) return null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + parseInt(validDays));
  const validUntil = validUntilDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const planKeys = ['plan_a', 'plan_b', 'plan_c'] as const;

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    setIsExportingPDF(true);

    try {
      const htmlToImage = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      
      const element = previewRef.current;
      
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 0.98,
        pixelRatio: 2, 
        backgroundColor: '#ffffff' 
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation_${styleNo || 'QM_Quote'}.pdf`);
      
    } catch (error) {
      console.error("PDF 导出崩溃:", error);
      alert("导出遇到问题，请重试。");
    } finally {
      setIsExportingPDF(false); 
    }
  };

  // 🌟 Excel 导出也严格执行数据防火墙，只导出清洗后的数据
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const excelData = planKeys.map((key) => {
        const plan = quoteData.plans[key];
        return {
          "Option": plan.name,
          "Material & Specs": plan.simplified_materials,
          "MOQ (pcs)": plan.moq,
          "Estimated FOB Price": plan.fob_price_range
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // 调整列宽
      worksheet['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 15 }, { wch: 25 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quoted Options");
      XLSX.writeFile(workbook, `Quotation_${styleNo || 'QM_Quote'}.xlsx`);
    } catch (error) {
      console.error("Excel 导出失败:", error);
      alert("Excel 生成失败，请检查依赖是否正确安装。");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 transition-opacity">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 左侧：装配控制台 */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0">
          <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              Client PDF Generator
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 防火墙提示 */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-900">数据防火墙已激活</p>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">底价、工厂内控工艺单已自动隐藏。此文档处于“安全对外”模式。</p>
              </div>
            </div>

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
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Validity / 有效期</label>
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
                <><FileText className="w-4 h-4" /> 导出净化版 PDF</>
              )}
            </button>
            <button onClick={handleExportExcel} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> 导出安全版 Excel
            </button>
          </div>
        </div>

        {/* 右侧：A4 纸实时预览 */}
        <div className="w-full md:w-2/3 bg-slate-200 flex flex-col h-full relative">
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/50 backdrop-blur hover:bg-white text-slate-600 rounded-full shadow-sm transition-all hidden md:block">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
            <div className="shadow-2xl h-fit">
            
            {/* A4 纸张容器 */}
            <div 
              ref={previewRef}
              className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-8 md:p-12 text-slate-800 font-sans flex flex-col relative"
              style={{ aspectRatio: '210/297' }}
            >
              {/* 纸张头部 */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">OFFICIAL QUOTATION</h1>
                  <p className="text-sm font-medium text-slate-500 mt-1">Multi-tier Sourcing Strategy</p>
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
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Item / Style</p>
                  <p className="text-base font-bold text-slate-800 border-b border-slate-200 pb-1 min-h-[1.5rem]">
                    {styleNo || quoteData.product_name || <span className="text-slate-300 italic">Please enter style no...</span>}
                  </p>
                </div>
              </div>

              {/* A/B/C 三阶报价矩阵 */}
              <div className="flex-1 mb-8">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Proposed Sourcing Options</p>
                <div className="flex flex-col gap-5">
                  {planKeys.map((key, index) => {
                    const plan = quoteData.plans[key];
                    if (!plan) return null;
                    return (
                      <div key={index} className="border border-slate-300 rounded-lg p-5 bg-slate-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                          <div className="text-right">
                            <span className="text-sm text-slate-500 mr-2">Est. FOB:</span>
                            <span className="text-xl font-bold text-blue-700 font-mono">{plan.fob_price_range}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                          <strong>Materials & Specs:</strong> {plan.simplified_materials}
                        </p>
                        <div className="inline-block bg-white border border-slate-200 rounded px-3 py-1 text-sm font-medium text-slate-700">
                          Requires MOQ: <span className="font-bold text-slate-900">{plan.moq} pcs</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 额外备注 */}
              {remarks && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Remarks</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">{remarks}</p>
                </div>
              )}

              {/* ⚠️ 终极免责声明 & 水印 */}
              <div className="mt-auto pt-6 border-t border-slate-200 relative">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-justify uppercase pr-32">
                  <strong>DISCLAIMER:</strong> THIS QUOTATION IS ESTIMATED AND SUBJECT TO FINAL CONFIRMATION BASED ON PHYSICAL COUNTER-SAMPLES. PRICES MAY FLUCTUATE DUE TO RAW MATERIAL COSTS AND CURRENCY EXCHANGE RATES.
                </p>
                {/* 🌟 品牌护城河：Slogan 水印 */}
                <div className="absolute right-0 bottom-0">
                  <p className="text-xs font-black text-slate-300 italic tracking-wide">
                    Powered by QuoteMaster AI Engine™
                  </p>
                </div>
              </div>

            </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}