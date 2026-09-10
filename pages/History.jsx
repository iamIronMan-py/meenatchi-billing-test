import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Receipt, Printer, Phone, Download, Calendar, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function History() {
  const [invoices, setInvoices] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [searchPhone, setSearchPhone] = useState('');
  const [hPage, setHPage] = useState(1);
  const hPerPage = Number(import.meta.env.VITE_PAGINATION_HISTORY) || 7;
  useEffect(() => { loadInvoices(); }, []);
  const loadInvoices = async () => {
    const data = await db.getInvoices();
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setInvoices(data);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.timestamp || inv.dateTime);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate && d > new Date(toDate + 'T23:59:59')) return false;
      if (filterPayment !== 'All' && (inv.paymentMethod||'Cash') !== filterPayment) return false;
      if (searchPhone && !(String(inv.customerPhone||'').includes(searchPhone) || String(inv.customerName||'').toLowerCase().includes(searchPhone.toLowerCase()) || String(inv.invoiceNo||inv.id).toLowerCase().includes(searchPhone.toLowerCase()))) return false;
      return true;
    })
  }, [invoices, fromDate, toDate, filterPayment, searchPhone])
  const hTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / hPerPage));
  const paginatedHistory = useMemo(()=> filteredInvoices.slice((hPage-1)*hPerPage, hPage*hPerPage), [filteredInvoices, hPage]);
  useEffect(()=> setHPage(1), [fromDate, toDate, filterPayment, searchPhone]);

  const exportAuditExcel = () => {
    // Sheet 1: Summary
    const totalGross = filteredInvoices.reduce((s,i)=> s+Number(i.grandTotal||0),0)
    const totalTaxable = filteredInvoices.reduce((s,i)=> s+Number(i.taxable||0),0)
    const totalSgst = filteredInvoices.reduce((s,i)=> s+Number(i.sgstAmount||0),0)
    const totalCgst = filteredInvoices.reduce((s,i)=> s+Number(i.cgstAmount||0),0)
    const totalDiscount = filteredInvoices.reduce((s,i)=> s+Number(i.discountAmount||0),0)
    const summaryRows = [
      { Particular: 'Filtered Invoices', Value: filteredInvoices.length },
      { Particular: 'Date Range', Value: `${fromDate||'Start'} to ${toDate||'Now'}` },
      { Particular: 'Total Gross (incl GST)', Value: totalGross.toFixed(2) },
      { Particular: 'Total Taxable', Value: totalTaxable.toFixed(2) },
      { Particular: 'Total Discount', Value: totalDiscount.toFixed(2) },
      { Particular: 'Total SGST', Value: totalSgst.toFixed(2) },
      { Particular: 'Total CGST', Value: totalCgst.toFixed(2) },
      { Particular: 'Total GST (SGST+CGST)', Value: (totalSgst+totalCgst).toFixed(2) },
    ]
    // Sheet 2: Invoices
    const invRows = filteredInvoices.map(inv => ({
      'Invoice No': inv.invoiceNo||inv.id,
      Date: new Date(inv.timestamp||inv.dateTime).toLocaleDateString('en-IN'),
      Time: new Date(inv.timestamp||inv.dateTime).toLocaleTimeString('en-IN'),
      'Customer Name': inv.customerName||'Walk-in',
      Phone: inv.customerPhone||'',
      'Payment': inv.paymentMethod||'Cash',
      'Payment Ref': inv.paymentRef||'',
      'Subtotal': Number(inv.subtotal||0).toFixed(2),
      'Discount %': inv.discountPercent||0,
      'Discount Amt': Number(inv.discountAmount||0).toFixed(2),
      'Taxable': Number(inv.taxable||0).toFixed(2),
      'SGST': Number(inv.sgstAmount||0).toFixed(2),
      'CGST': Number(inv.cgstAmount||0).toFixed(2),
      'Grand Total': Number(inv.grandTotal||0).toFixed(2),
      'Cash Given': Number(inv.cashGiven||0).toFixed(2),
      Balance: Number(inv.balance||0).toFixed(2),
      'Points': inv.pointsEarned||0,
    }))
    // Sheet 3: Line Items
    const lineRows = []
    filteredInvoices.forEach(inv => {
      (inv.items||[]).forEach(it => {
        const base = it.product.price * it.quantity
        lineRows.push({
          'Invoice No': inv.invoiceNo||inv.id,
          Date: new Date(inv.timestamp||inv.dateTime).toLocaleDateString('en-IN'),
          Category: it.product.category||'Mens',
          Product: it.product.name,
          Brand: it.product.brand||'',
          Size: it.product.size||'',
          Barcode: it.product.barcode||'',
          Qty: it.quantity,
          Rate: it.product.price,
          'Line Amt': base.toFixed(2),
          'SGST %': it.product.sgst||0,
          'CGST %': it.product.cgst||0,
          Customer: inv.customerName||'',
          Phone: inv.customerPhone||'',
        })
      })
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), 'Invoices')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lineRows), 'LineItems')
    const rangeTag = fromDate||toDate ? `_${fromDate||'start'}_to_${toDate||'now'}` : ''
    XLSX.writeFile(wb, `Meenatchi_Audit${rangeTag}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const exportAuditPDF = () => {
    const totalGross = filteredInvoices.reduce((s,i)=> s+Number(i.grandTotal||0),0)
    const totalTaxable = filteredInvoices.reduce((s,i)=> s+Number(i.taxable||0),0)
    const totalSgst = filteredInvoices.reduce((s,i)=> s+Number(i.sgstAmount||0),0)
    const totalCgst = filteredInvoices.reduce((s,i)=> s+Number(i.cgstAmount||0),0)
    const totalDiscount = filteredInvoices.reduce((s,i)=> s+Number(i.discountAmount||0),0)
    const totalCash = filteredInvoices.reduce((s,i)=> s+Number(i.cashGiven||0),0)
    const totalBal = filteredInvoices.reduce((s,i)=> s+Number(i.balance||0),0)
    const dateRange = `${fromDate||'All'} to ${toDate||'Now'}`
    const generatedAt = new Date().toLocaleString('en-IN')
    const shop = { name:'MEENATCHI FOOTWEAR', tamil:'மீனாட்சி', address:'123, Main Road, Near Bus Stand, Tamil Nadu - 626001', phone:'9944009490', gstin:'33ABCDE1234F1Z5', email:'meenatchifootwear@gmail.com' }

    let invRows = ''
    filteredInvoices.forEach((inv, idx) => {
      const d = new Date(inv.timestamp||inv.dateTime).toLocaleString('en-IN')
      invRows += `<tr>
        <td>${idx+1}</td>
        <td>${inv.invoiceNo||inv.id}</td>
        <td>${d}</td>
        <td>${inv.customerName||'Walk-in'}</td>
        <td>${inv.customerPhone||'—'}</td>
        <td>${inv.paymentMethod||'Cash'}</td>
        <td class="r">₹${Number(inv.subtotal||0).toFixed(2)}</td>
        <td class="r">${inv.discountPercent||0}%</td>
        <td class="r">-₹${Number(inv.discountAmount||0).toFixed(2)}</td>
        <td class="r">₹${Number(inv.taxable||0).toFixed(2)}</td>
        <td class="r">₹${Number(inv.sgstAmount||0).toFixed(2)}</td>
        <td class="r">₹${Number(inv.cgstAmount||0).toFixed(2)}</td>
        <td class="r b">₹${Number(inv.grandTotal||0).toFixed(2)}</td>
        <td class="r">${Number(inv.cashGiven||0).toFixed(2)}</td>
        <td class="r">${Number(inv.balance||0).toFixed(2)}</td>
      </tr>`
    })

    let lineRows = ''
    filteredInvoices.forEach(inv => {
      (inv.items||[]).forEach(it => {
        const base = it.product.price * it.quantity
        lineRows += `<tr>
          <td>${inv.invoiceNo||inv.id}</td>
          <td>${new Date(inv.timestamp||inv.dateTime).toLocaleDateString('en-IN')}</td>
          <td>${it.product.category||'Mens'}</td>
          <td>${it.product.name}</td>
          <td>${it.product.brand||'—'}</td>
          <td>${it.product.size||'—'}</td>
          <td>${it.product.barcode||'—'}</td>
          <td class="c">${it.quantity}</td>
          <td class="r">₹${Number(it.product.price).toFixed(2)}</td>
          <td class="r">₹${base.toFixed(2)}</td>
          <td class="c">${it.product.sgst||0}%</td>
          <td class="c">${it.product.cgst||0}%</td>
          <td>${inv.customerName||'Walk-in'}</td>
          <td>${inv.customerPhone||'—'}</td>
        </tr>`
      })
    })

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GST Audit - ${dateRange}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; color: #222; line-height: 1.3; }
  .page { page-break-after: always; padding: 0; }
  .page:last-child { page-break-after: auto; }
  .header { text-align: center; border-bottom: 2px solid #B9972E; padding-bottom: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 16px; color: #3E2723; margin-bottom: 2px; }
  .header .sub { font-size: 10px; color: #8D6E63; }
  .header .gstin { font-size: 10px; font-weight: 700; color: #3E2723; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 10px; padding: 6px 10px; background: #FFF8EE; border: 1px solid #E9D9B8; border-radius: 4px; }
  .meta div { }
  .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
  .summary-item { padding: 6px 8px; border: 1px solid #E9D9B8; border-radius: 4px; background: #FFFBF5; }
  .summary-item .label { font-size: 8px; color: #8D6E63; text-transform: uppercase; font-weight: 600; }
  .summary-item .value { font-size: 12px; font-weight: 700; color: #3E2723; }
  .section-title { font-size: 11px; font-weight: 700; color: #3E2723; margin: 10px 0 4px; padding-bottom: 3px; border-bottom: 1px solid #E9D9B8; }
  table { width: 100%; border-collapse: collapse; font-size: 8px; }
  th { background: #FFF3D6; color: #3E2723; font-weight: 700; font-size: 8px; text-transform: uppercase; padding: 4px 5px; border: 1px solid #E9D9B8; text-align: left; }
  td { padding: 3px 5px; border: 1px solid #f0e8d8; }
  tr:nth-child(even) { background: #FFFBF5; }
  .r { text-align: right; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .total-row { background: #3E2723 !important; color: #FFD54F; font-weight: 700; }
  .total-row td { border-color: #3E2723; padding: 5px; }
  .footer { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #E9D9B8; font-size: 8px; color: #8D6E63; text-align: center; }
  @media print { .no-print { display: none !important; } @page { size: A4 landscape; margin: 10mm; } }
</style></head><body>
<div class="no-print" style="text-align:center;padding:8px;background:#3E2723;color:#FFD54F;font-size:11px;border-radius:0 0 4px 4px;margin-bottom:8px;">
  Press Ctrl+P to save as PDF • Choose A4 Landscape for best fit
</div>

<div class="page">
  <div class="header">
    <h1>${shop.name} <span style="font-size:11px;color:#8D6E63;">${shop.tamil}</span></h1>
    <div class="sub">${shop.address} | Ph: ${shop.phone} | ${shop.email}</div>
    <div class="gstin">GSTIN: ${shop.gstin}</div>
  </div>

  <div class="meta">
    <div><b>GST Audit Report</b></div>
    <div>Period: ${dateRange}</div>
    <div>Generated: ${generatedAt}</div>
    <div>Total Invoices: ${filteredInvoices.length}</div>
  </div>

  <div class="summary-box">
    <div class="summary-item"><div class="label">Total Gross (incl GST)</div><div class="value">₹${totalGross.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total Taxable</div><div class="value">₹${totalTaxable.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total Discount</div><div class="value">₹${totalDiscount.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total GST (SGST+CGST)</div><div class="value">₹${(totalSgst+totalCgst).toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total SGST</div><div class="value">₹${totalSgst.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total CGST</div><div class="value">₹${totalCgst.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total Cash Received</div><div class="value">₹${totalCash.toFixed(2)}</div></div>
    <div class="summary-item"><div class="label">Total Balance Pending</div><div class="value" style="color:#8D2E00">₹${totalBal.toFixed(2)}</div></div>
  </div>

  <div class="section-title">Invoice-wise Summary (${filteredInvoices.length} invoices)</div>
  <table>
    <thead><tr>
      <th>#</th><th>Invoice No</th><th>Date</th><th>Customer</th><th>Phone</th><th>Payment</th>
      <th class="r">Subtotal</th><th class="r">Disc%</th><th class="r">Disc Amt</th><th class="r">Taxable</th>
      <th class="r">SGST</th><th class="r">CGST</th><th class="r">Grand Total</th><th class="r">Cash In</th><th class="r">Balance</th>
    </tr></thead>
    <tbody>
      ${invRows}
      <tr class="total-row">
        <td colspan="6">TOTAL (${filteredInvoices.length} invoices)</td>
        <td class="r">₹${totalTaxable.toFixed(2)}</td>
        <td></td><td class="r">-₹${totalDiscount.toFixed(2)}</td>
        <td class="r">₹${totalTaxable.toFixed(2)}</td>
        <td class="r">₹${totalSgst.toFixed(2)}</td>
        <td class="r">₹${totalCgst.toFixed(2)}</td>
        <td class="r">₹${totalGross.toFixed(2)}</td>
        <td class="r">₹${totalCash.toFixed(2)}</td>
        <td class="r">₹${totalBal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page">
  <div class="header">
    <h1>${shop.name} — Line Items Detail</h1>
    <div class="sub">GST Audit • ${dateRange} • ${lineRows.split('<tr').length - 1} line items</div>
  </div>

  <div class="section-title">Product-wise Detail (All Line Items)</div>
  <table>
    <thead><tr>
      <th>Invoice</th><th>Date</th><th>Category</th><th>Product</th><th>Brand</th><th>Size</th><th>Barcode</th>
      <th class="c">Qty</th><th class="r">Rate</th><th class="r">Amount</th>
      <th class="c">SGST%</th><th class="c">CGST%</th><th>Customer</th><th>Phone</th>
    </tr></thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="footer">
    Meenatchi Footwear • GSTIN: ${shop.gstin} • This is a computer-generated GST Audit Report • ${generatedAt}
  </div>
</div>
</body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(()=> w.print(), 300)
  }

  const setQuickRange = (type) => {
    const now = new Date()
    if (type==='thisMonth') { setFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)); setToDate(now.toISOString().slice(0,10)) }
    if (type==='lastMonth') { const d=new Date(now.getFullYear(), now.getMonth()-1, 1); const e=new Date(now.getFullYear(), now.getMonth(), 0); setFromDate(d.toISOString().slice(0,10)); setToDate(e.toISOString().slice(0,10)) }
    if (type==='thisYear') { setFromDate(new Date(now.getFullYear(),0,1).toISOString().slice(0,10)); setToDate(now.toISOString().slice(0,10)) }
    if (type==='clear') { setFromDate(''); setToDate(''); setFilterPayment('All'); setSearchPhone('') }
  }
  const handlePrint = (invoice) => {
    const printWindow = window.open('', '_blank');
    const subtotal = invoice.subtotal ?? invoice.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const discountAmt = invoice.discountAmount ?? 0;
    const discountPct = invoice.discountPercent ?? 0;
    const taxable = invoice.taxable ?? (subtotal - discountAmt);
    const sgst = invoice.sgstAmount ?? (invoice.gstAmount ? invoice.gstAmount/2 : 0);
    const cgst = invoice.cgstAmount ?? (invoice.gstAmount ? invoice.gstAmount/2 : 0);
    const gstAmt = invoice.gstAmount ?? (sgst+cgst);
    const logoUrl = window.location.origin + '/logo.jpeg';
    const shop = invoice.shop || { name: 'MEENATCHI FOOTWEAR', tagline: 'FOR EVERY STEP, WE CARE', address: 'Main Road', phone: '9944009490', gstin: '33ABCDE1234F1Z5' };
    const dateStr = new Date(invoice.timestamp || invoice.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    printWindow.document.write(`
      <html><head><link rel="icon" href="${logoUrl}"></head><body style="font-family: Inter, sans-serif; padding: 1.5rem; color:#3E2723; background:#fff;">
        <div style="text-align:center; border-bottom:2px solid #B9972E; padding-bottom:10px; margin-bottom:12px;">
          <div style="font-weight:800; color:#3E2723; font-size:18px;">${shop.name}</div>
          <div style="font-size:11px; color:#8D6E63;">${shop.tagline} • ${shop.address} • Ph: ${shop.phone}</div>
          <div style="font-size:11px; font-weight:700; color:#3E2723;">GSTIN: ${shop.gstin}</div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; background:#FFFBF5; border:1px solid #E9D9B8; border-radius:8px; padding:8px 10px; margin-bottom:10px;">
          <div><b>Invoice:</b> ${invoice.invoiceNo || invoice.id}<br/><b>Date/Time:</b> ${dateStr}<br/><b>Payment:</b> ${invoice.paymentMethod||'Cash'} ${invoice.paymentRef? '('+invoice.paymentRef+')':''}</div>
          <div style="text-align:right;"><b>Customer:</b> ${invoice.customerName||'Walk-in'}<br/><b>Phone:</b> ${invoice.customerPhone||'—'}<br/><b>Points:</b> +${invoice.pointsEarned||0}</div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr style="border-bottom:2px solid #3E2723; text-align:left; font-size:10px; color:#3E2723;"><th>#</th><th>DESCRIPTION</th><th style="text-align:center;">QTY</th><th style="text-align:right;">RATE</th><th style="text-align:right;">AMT</th><th style="text-align:right;">GST%</th><th style="text-align:right;">TOTAL</th></tr>
          ${invoice.items.map((item, idx)=>{
            const base=item.product.price*item.quantity;
            const share=subtotal? (base/subtotal)*discountAmt:0;
            const after=base-share;
            const sgstPct=parseFloat(item.product.sgst)||0, cgstPct=parseFloat(item.product.cgst)||0;
            const sgstAmtItem=after*sgstPct/100, cgstAmtItem=after*cgstPct/100;
            const total=after+sgstAmtItem+cgstAmtItem;
            return `<tr style="border-bottom:1px solid #FFF3D6;"><td style="padding:5px 4px; color:#8D6E63;">${idx+1}</td><td style="padding:5px 4px;"><b style="color:#3E2723;">${item.product.name}</b><br/><span style="font-size:10px; color:#8D6E63;">${[item.product.brand?`Brand:${item.product.brand}`:'', item.product.size?`Size:${item.product.size}`:'', item.product.barcode].filter(Boolean).join(' • ')}</span></td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">₹${Number(item.product.price).toFixed(2)}</td><td style="text-align:right;">₹${after.toFixed(2)}</td><td style="text-align:right; font-size:10px;">${sgstPct||cgstPct?sgstPct+'%+'+cgstPct+'%':'—'}<br/>₹${(sgstAmtItem+cgstAmtItem).toFixed(2)}</td><td style="text-align:right; font-weight:700; color:#3E2723;">₹${total.toFixed(2)}</td></tr>`;
          }).join('')}
        </table>
        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
          <div style="width:320px; border:1px solid #E9D9B8; border-radius:10px; overflow:hidden; font-size:12px; background:#FFFBF5;">
            <div style="display:flex; justify-content:space-between; padding:6px 10px; background:#fff; border-bottom:1px solid #E9D9B8;"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #E9D9B8;"><span>Discount ${discountPct?`(${discountPct}%)`:''}</span><span>-₹${discountAmt.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; padding:6px 10px; background:#fff; border-bottom:1px solid #E9D9B8;"><span>Taxable</span><span>₹${taxable.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #E9D9B8; font-size:11px; color:#8D6E63;"><span>SGST</span><span>₹${sgst.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; padding:6px 10px; border-bottom:2px solid #B9972E; font-size:11px; color:#8D6E63;"><span>CGST</span><span>₹${cgst.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; padding:8px 10px; background:#3E2723; color:#FFD54F; font-weight:800;"><span>Grand Total</span><span>₹${Number(invoice.grandTotal).toFixed(2)}</span></div>
            <div style="padding:8px 10px; font-size:11px; background:#fff;">
              <div><b>Payment:</b> ${invoice.paymentMethod||'Cash'} ${invoice.paymentRef? '('+invoice.paymentRef+')':''} • ${invoice.paymentMethod==='Cash'? 'Cash Given: ₹'+Number(invoice.cashGiven||0).toFixed(2)+' • Balance: ₹'+Number(invoice.balance||0).toFixed(2) : 'Paid: ₹'+Number(invoice.grandTotal).toFixed(2)}</div>
              <div><b>Customer Phone:</b> ${invoice.customerPhone||'—'} • <b>Points:</b> +${invoice.pointsEarned||0}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:12px; border-top:1px dashed #E9D9B8; padding-top:8px; font-size:10px; color:#8D6E63; text-align:center;">
          <div>Declaration: Goods once sold will not be taken back • Subject to Tamil Nadu jurisdiction</div>
          <div style="font-weight:700; color:#3E2723; margin-top:4px;">Thank you for shopping at Meenatchi Footwear! • For Every Step, We Care</div>
          <div style="font-size:9px;">Computer generated invoice • ${dateStr} • ${invoice.invoiceNo||invoice.id}</div>
        </div>
        <script>window.print();<\/script>
      </body></html>`);
    printWindow.document.close();
  };
  return (
    <div className="page-root">
      <header className="page-header">
        <h2 className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Receipt size={16} color="#B9972E" /> Invoice History</h2>
        <p className="text-sm">Reprint • Filter by date for GST filing & audit</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '10px', alignItems: 'center', marginTop: '10px', background: '#FFFBF5', border: '1px solid #E9D9B8', borderRadius: '10px', padding: '8px 10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8D6E63' }}><Calendar size={12}/> From<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="input" style={{ height: '30px', padding: '4px 6px', width: '130px', color: '#3E2723' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8D6E63' }}>To<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="input" style={{ height: '30px', padding: '4px 6px', width: '130px', color: '#3E2723' }} /></div>
            <select value={filterPayment} onChange={e=>setFilterPayment(e.target.value)} className="select" style={{ height: '30px', padding: '4px 6px', fontSize: '11px', width: '100px', color: '#3E2723', background: '#fff' }}><option>All</option><option>Cash</option><option>UPI</option><option>Card</option></select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}><Phone size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#BC9A7A' }} /><input value={searchPhone} onChange={e=>setSearchPhone(e.target.value)} placeholder="Search Phone / Name / Bill No (center)" className="input" style={{ height: '32px', paddingLeft: '26px', width: '100%', fontSize: '12px', borderColor: '#B9972E', background: '#fff' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button onClick={()=>setQuickRange('thisMonth')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>This Month</button>
            <button onClick={()=>setQuickRange('lastMonth')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Last Month</button>
            <button onClick={()=>setQuickRange('thisYear')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>This Year</button>
            <button onClick={()=>setQuickRange('clear')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>Clear</button>
            <button onClick={exportAuditExcel} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={12}/> Excel</button>
            <button onClick={exportAuditPDF} className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', background: '#3E2723', border: '1px solid #B9972E', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={12}/> PDF Audit</button>
          </div>
        </div>
      </header>
      <div className="card" style={{ flex: 1, overflow: 'hidden', padding: 0, borderColor: '#E9D9B8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #E9D9B8', background: '#FFF3D6' }}>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>INVOICE</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>DATE & TIME</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}><Phone size={12}/> PHONE</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>PAYMENT</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>ITEMS</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>TOTAL</th>
            <th style={{ padding: '8px 10px', color: '#3E2723', fontSize: '11px' }}>ACTION</th>
          </tr></thead>
          <tbody>
            {paginatedHistory.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: '#BC9A7A' }}>No invoices for filter — try Clear</td></tr>
            ) : (
              paginatedHistory.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #FFF3D6' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem', color: '#3E2723' }}>{inv.invoiceNo || inv.id}</td>
                  <td style={{ padding: '8px 10px', color: '#8D6E63', fontSize: '0.82rem' }}>{new Date(inv.timestamp || inv.dateTime).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.82rem' }}>{inv.customerPhone || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: '0.82rem' }}><span style={{ background: inv.paymentMethod==='UPI'? '#FFF3D6' : inv.paymentMethod==='Card'? '#FFFBF5' : '#FFF8EE', border: '1px solid #E9D9B8', padding: '2px 6px', borderRadius: '999px', fontWeight: 700, color: '#3E2723' }}>{inv.paymentMethod||'Cash'}</span></td>
                  <td style={{ padding: '8px 10px' }}>{inv.items.length}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: '#3E2723' }}>₹{Number(inv.grandTotal).toFixed(2)}</td>
                  <td style={{ padding: '8px 10px' }}><button onClick={() => handlePrint(inv)} className="btn-primary" style={{ padding: '6px 10px', fontSize: '0.78rem', background: '#3E2723', border: '1px solid #B9972E' }}><Printer size={12} /> Reprint</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderTop: '1px solid #E9D9B8', background: '#FFFBF5' }}>
          <span style={{ fontSize: '11px', color: '#8D6E63' }}>Page {hPage} of {hTotalPages} • {filteredInvoices.length} bills filtered • {invoices.length} total</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button disabled={hPage<=1} onClick={()=>setHPage(p=>Math.max(1,p-1))} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', opacity: hPage<=1?0.5:1 }}>Prev</button>
            <button disabled={hPage>=hTotalPages} onClick={()=>setHPage(p=>Math.min(hTotalPages,p+1))} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', opacity: hPage>=hTotalPages?0.5:1 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
