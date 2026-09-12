import { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Search, ScanBarcode, Trash2, Percent, Banknote, Phone, CreditCard, QrCode, Wallet, Save, RotateCcw, FileText, X } from 'lucide-react';

const SHOP = {
  name: 'MEENATCHI FOOTWEAR',
  tamil: 'மீனாட்சி',
  tagline: 'FOR EVERY STEP, WE CARE',
  address: '123, Main Road, Near Bus Stand, Tamil Nadu - 626001',
  phone: '9944009490',
  gstin: '33ABCDE1234F1Z5',
  email: 'meenatchifootwear@gmail.com',
}

export default function Billing({ invoiceItems, setInvoiceItems, currentUser }) {
  const [masterProducts, setMasterProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualQty, setManualQty] = useState(1);
  const searchRef = useRef(null);
  const [discounts, setDiscounts] = useState([]);
  const [activeDiscountId, setActiveDiscountId] = useState(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [customDiscount, setCustomDiscount] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash | UPI | Card
  const [paymentRef, setPaymentRef] = useState('');
  const [paperSize, setPaperSize] = useState('a4'); // default A4
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', barcode: '', size: '', brand: '', sgst: '', cgst: '' });
  const [editingQty, setEditingQty] = useState(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');
  const [invPage, setInvPage] = useState(1);
  const invPerPage = Number(import.meta.env.VITE_PAGINATION_BILLING) || 8;
  const masterProductsRef = useRef([]);
  const [drafts, setDrafts] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const isGuest = currentUser?.type === 'guest';

  useEffect(() => { loadProducts(); loadDiscounts(); loadDrafts(); }, []);
  // Auto-fill name from phone lookup (Tab-friendly)
  useEffect(()=>{ if(customerPhone.length>=4){ db.getCustomers().then(map=>{ const c=map[customerPhone]; if(c && c.name && !customerName) setCustomerName(c.name); }) } },[customerPhone]);
  const loadProducts = async () => {
    const data = await db.getProducts();
    const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
    masterProductsRef.current = sorted; setMasterProducts(sorted); return sorted;
  };
  const loadDiscounts = async () => {
    const data = await db.getDiscounts(); setDiscounts(data);
    const activeId = await db.getActiveDiscountId(); setActiveDiscountId(activeId);
    if (activeId) setSelectedDiscountId(activeId);
  };
  const loadDrafts = async () => { const d = await db.getDrafts(); setDrafts(d); };

  const holdDraft = async () => {
    if (invoiceItems.length === 0) return;
    const draft = {
      items: invoiceItems,
      customerPhone, customerName, paymentMethod, paymentRef,
      cashGiven, selectedDiscountId, customDiscount, paperSize,
      itemCount: invoiceItems.length,
      grandTotal: invoiceItems.reduce((s, i) => s + i.product.price * i.quantity, 0),
      label: `${invoiceItems.length} items • ₹${invoiceItems.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(0)}`
    };
    await db.saveDraft(draft);
    setInvoiceItems([]); setCashGiven(''); setCustomerPhone(''); setCustomerName(''); setPaymentRef(''); setCustomDiscount('');
    await loadDrafts();
  };

  const recallDraft = async (draft) => {
    setInvoiceItems(draft.items || []);
    setCustomerPhone(draft.customerPhone || '');
    setCustomerName(draft.customerName || '');
    setPaymentMethod(draft.paymentMethod || 'Cash');
    setPaymentRef(draft.paymentRef || '');
    setCashGiven(draft.cashGiven || '');
    setSelectedDiscountId(draft.selectedDiscountId || '');
    setCustomDiscount(draft.customDiscount || '');
    setPaperSize(draft.paperSize || 'a4');
    await db.deleteDraft(draft.id);
    await loadDrafts();
    setShowDrafts(false);
  };

  const deleteDraft = async (id) => {
    await db.deleteDraft(id);
    await loadDrafts();
  };
  const getCurrentDiscountPercent = () => {
    if (customDiscount !== '' && !isNaN(parseFloat(customDiscount))) { const v=parseFloat(customDiscount); if(v>=0&&v<=100) return v; }
    if (selectedDiscountId) { const d=discounts.find(x=>x.id===selectedDiscountId); if(d) return parseFloat(d.percent)||0; }
    return 0;
  };
  const currentDiscountPercent = getCurrentDiscountPercent();
  const currentDiscountName = (()=>{ if(customDiscount!==''&&!isNaN(parseFloat(customDiscount))) return `Custom ${currentDiscountPercent}%`; if(selectedDiscountId){const d=discounts.find(x=>x.id===selectedDiscountId); return d?`${d.name} (${d.percent}%)`:''} return 'No Discount'; })();

  const performSearch = (val) => {
    if(val.trim().length===0){ setSearchSuggestions([]); setShowSuggestions(false); return; }
    const q=val.toLowerCase().trim();
    const suggestions=masterProducts.filter(p=>{ const name=(p.name||'').toLowerCase(); const brand=(p.brand||'').toLowerCase(); const size=String(p.size||'').toLowerCase(); const barcode=String(p.barcode||'').toLowerCase(); return name.includes(q)||brand.includes(q)||size.includes(q)||barcode.includes(q); }).slice(0,8);
    setSearchSuggestions(suggestions); setShowSuggestions(suggestions.length>0);
  };
  const handleSearchChange = (e)=>{ const val=e.target.value; setSearchQuery(val); performSearch(val); };
  const handleSearchKeyDown = (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); const q=searchQuery.trim(); if(!q) return;
      const exact=masterProducts.find(p=>String(p.barcode||'').toLowerCase()===q.toLowerCase());
      if(exact){ addItemToInvoice(exact, parseFloat(manualQty)||1); setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false); setManualQty(1); return; }
      if(searchSuggestions.length===1){ selectSuggestion(searchSuggestions[0]); return; }
      handleManualAdd(e);
    }
  };
  const selectSuggestion = (product)=>{ addItemToInvoice(product, parseFloat(manualQty)||1); setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false); setManualQty(1); searchRef.current?.focus(); };
  const addItemToInvoice = (product, quantity)=>{ setInvoiceItems(prev=>{ const existing=prev.find(item=>item.product.id===product.id); if(existing){ return prev.map(item=> item.product.id===product.id? {...item, quantity: Math.round((item.quantity+quantity)*1000)/1000}:item ); } return [...prev, {product, quantity, id: Date.now().toString()+Math.random().toString(36).slice(2,5)}]; }); };
  const handleManualAdd = (e)=>{ if(e) e.preventDefault(); if(!searchQuery.trim()) return; const q=searchQuery.trim().toLowerCase(); let matched=masterProducts.find(p=>String(p.barcode||'').toLowerCase()===q); if(!matched) matched=masterProducts.find(p=>(p.name||'').toLowerCase()===q); if(!matched) matched=masterProducts.find(p=>(p.name||'').toLowerCase().includes(q)||q.includes((p.name||'').toLowerCase())); if(matched){ addItemToInvoice(matched, parseFloat(manualQty)||1); setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false); setManualQty(1);} else { const looksBarcode=/^[A-Za-z0-9\-]{5,}$/.test(searchQuery.trim()); setNewProduct({name:searchQuery.trim(), price:'', barcode: looksBarcode?searchQuery.trim():'', size:'', brand:'', sgst:'', cgst:''}); setShowModal(true);} };
  const removeItem=(id)=> setInvoiceItems(prev=> { const next = prev.filter(item=> item.id!==id); return next; });
  // pagination for invoice preview — like other POS (Vyapar/Marg) — show 8 per page, scroll inside, paginate print
  const invTotalPages = Math.max(1, Math.ceil(invoiceItems.length / invPerPage));
  const paginatedInvoiceItems = invoiceItems.slice((invPage-1)*invPerPage, invPage*invPerPage);
  useEffect(()=> { if(invPage > invTotalPages) setInvPage(invTotalPages); }, [invoiceItems.length, invTotalPages]);
  useEffect(()=> { setInvPage(1); }, [invoiceItems.length===0]);
  const startEditQty=(item)=>{ setEditingQty(item.id); setEditingQtyVal(String(item.quantity)); };
  const commitEditQty=(id)=>{ const val=parseFloat(editingQtyVal); if(!isNaN(val)&&val>0){ setInvoiceItems(prev=> prev.map(item=> item.id===id? {...item, quantity:val}:item)); } setEditingQty(null); setEditingQtyVal(''); };
  const handleAddNewProductSubmit= async(e)=>{ e.preventDefault(); if(!newProduct.name||!newProduct.price) return; const dup=masterProducts.some(p=> p.name.toLowerCase().trim()===newProduct.name.toLowerCase().trim() && String(p.size||'')===String(newProduct.size||'')); if(dup){ alert(`Product "${newProduct.name}" already exists!`); return; } const saved=await db.addProduct({ name:newProduct.name.trim(), price:parseFloat(newProduct.price)||0, barcode:(newProduct.barcode||'').trim(), brand:(newProduct.brand||'').trim(), size:(newProduct.size||'').trim(), sgst:parseFloat(newProduct.sgst)||0, cgst:parseFloat(newProduct.cgst)||0 }); const fresh=await loadProducts(); const productToAdd=fresh.find(p=>p.id===saved.id)||saved; addItemToInvoice(productToAdd,1); setShowModal(false); setSearchQuery(''); setNewProduct({name:'',price:'',barcode:'',size:'',brand:'',sgst:'',cgst:''}); };

  // Calculations with SGST/CGST split, discount before GST
  const subtotal=invoiceItems.reduce((s,i)=> s+i.product.price*i.quantity,0);
  const discountAmount=subtotal*(currentDiscountPercent/100);
  const taxable=subtotal-discountAmount;
  let sgstAmount=0, cgstAmount=0;
  invoiceItems.forEach(i=> {
    const base=i.product.price*i.quantity;
    const share=subtotal>0? (base/subtotal)*discountAmount:0;
    const after=base-share;
    sgstAmount += after * ((parseFloat(i.product.sgst)||0)/100);
    cgstAmount += after * ((parseFloat(i.product.cgst)||0)/100);
  });
  const gstAmount = sgstAmount + cgstAmount;
  const grandTotal=taxable+gstAmount;
  const cashGivenAmount=parseFloat(cashGiven)||0;
  const balance = paymentMethod==='Cash' ? (cashGivenAmount - grandTotal) : 0;
  const pointsPreview=Math.floor(grandTotal/100);
  const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const invoiceNo = 'INV-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(invoiceItems.length).padStart(2,'0');

  useEffect(()=>{
    const h = async ()=>{
      if(invoiceItems.length===0) return;
      if(paymentMethod==='Cash' && cashGivenAmount < grandTotal && cashGivenAmount!==0){
        if(!confirm(`Cash given ₹${cashGivenAmount.toFixed(2)} is less than Grand Total ₹${grandTotal.toFixed(2)}. Continue?`)) return;
      }
      const pts=pointsPreview;
      const categoryBreakdown = invoiceItems.reduce((acc,it)=>{ const cat=it.product.category||'Mens'; acc[cat]=(acc[cat]||0)+it.product.price*it.quantity; return acc; },{})
      await db.saveInvoice({
        invoiceNo, shop: SHOP, dateTime: new Date().toISOString(),
        items: invoiceItems, subtotal, discountPercent: currentDiscountPercent, discountName: currentDiscountName, discountAmount, taxable, sgstAmount, cgstAmount, gstAmount, grandTotal,
        paymentMethod, paymentRef: paymentRef.trim()||null,
        cashGiven: paymentMethod==='Cash'? cashGivenAmount: grandTotal, balance: paymentMethod==='Cash'? balance:0,
        customerPhone: customerPhone.trim()||null, customerName: customerName.trim()||null, pointsEarned:pts, categoryBreakdown
      });
      if(customerPhone.trim()) await db.addPoints(customerPhone.trim(), pts, customerName.trim());
      else if(customerName.trim()) await db.upsertCustomer(customerPhone.trim()||'walkin-'+Date.now(), customerName.trim());
      setInvoiceItems([]); setCashGiven(''); setCustomerPhone(''); setCustomerName(''); setPaymentRef('');
      setTimeout(()=> window.print(), 100);
    };
    document.addEventListener('billing:checkout', h);
    return ()=> document.removeEventListener('billing:checkout', h);
  });

  // F5 Hold / F6 Recall last / F7 Toggle drafts
  useEffect(()=>{
    const hold = ()=> holdDraft();
    const recallLast = async ()=>{ const d = await db.getDrafts(); if(d.length>0) recallDraft(d[0]); };
    const toggleDrafts = ()=> setShowDrafts(v=>!v);
    document.addEventListener('billing:hold', hold);
    document.addEventListener('billing:recall-last', recallLast);
    document.addEventListener('billing:toggle-drafts', toggleDrafts);
    return ()=>{
      document.removeEventListener('billing:hold', hold);
      document.removeEventListener('billing:recall-last', recallLast);
      document.removeEventListener('billing:toggle-drafts', toggleDrafts);
    };
  });

  return (
    <div className="page-root">
      <div className="no-print page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div><div className="header-title">Billing <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-secondary)' }}> — F2 • F4 • F5 Hold • F6 Recall • F7 Drafts</span></div><div className="text-sm">{paperSize==='small'?'Small Paper (80mm)':'A4 Sheet'} • HID scanner</div></div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={paperSize} onChange={e=>setPaperSize(e.target.value)} className="select" style={{ height: '30px', padding: '4px 8px', fontSize: '11px', width: '110px' }}><option value="small">Small Paper</option><option value="a4">A4 Sheet</option></select>
          <span style={{ fontSize: '11px', color: '#8D6E63', fontWeight: 600 }}>{invoiceItems.length} items • {pointsPreview} pts</span>
          <button onClick={holdDraft} disabled={invoiceItems.length===0 || isGuest} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', opacity: (invoiceItems.length===0 || isGuest) ? 0.5 : 1, cursor: isGuest ? 'not-allowed' : 'pointer' }}><Save size={12}/> Hold (F5)</button>
          <button onClick={()=>setShowDrafts(v=>!v)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}><FileText size={12}/> Drafts {drafts.length>0 && <span style={{ background:'#B9972E', color:'#fff', borderRadius:'999px', padding:'0 5px', fontSize:'10px', fontWeight:700 }}>{drafts.length}</span>}</button>
          <button onClick={()=>document.dispatchEvent(new CustomEvent('billing:checkout'))} disabled={isGuest} className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, background: '#3E2723', border: '1px solid #B9972E', opacity: isGuest ? 0.5 : 1, cursor: isGuest ? 'not-allowed' : 'pointer' }}>Checkout (F4)</button>
        </div>
      </div>

      {/* Drafts Panel — slide in from right */}
      {showDrafts && (
        <div className="no-print" style={{ position:'fixed', top:0, right:0, bottom:0, width:'340px', background:'#fff', borderLeft:'2px solid #B9972E', boxShadow:'-4px 0 20px rgba(0,0,0,0.15)', zIndex:50, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #E9D9B8', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FFFBF5' }}>
            <div style={{ fontWeight:700, fontSize:'13px', color:'#3E2723', display:'flex', alignItems:'center', gap:'6px' }}><FileText size={14} color="#B9972E"/> Held Drafts ({drafts.length})</div>
            <button onClick={()=>setShowDrafts(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#8D6E63' }}><X size={16}/></button>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:'8px' }}>
            {drafts.length===0 ? (
              <div style={{ textAlign:'center', padding:'30px 10px', color:'#BC9A7A', fontSize:'12px' }}>No held drafts yet.<br/>Press <b>F5</b> or click <b>Hold</b> to save current billing.</div>
            ) : drafts.map(d=>(
              <div key={d.id} style={{ border:'1px solid #E9D9B8', borderRadius:'10px', padding:'10px', marginBottom:'8px', background:'#FFFBF5' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'12px', color:'#3E2723' }}>{d.label}</div>
                    <div style={{ fontSize:'10px', color:'#8D6E63' }}>{new Date(d.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    {d.customerName && <div style={{ fontSize:'10px', color:'#8D6E63' }}>Customer: {d.customerName} {d.customerPhone?`• ${d.customerPhone}`:''}</div>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={()=>recallDraft(d)} className="btn-primary" style={{ flex:1, padding:'5px 8px', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', background:'#B9972E' }}><RotateCcw size={11}/> Recall</button>
                  <button onClick={()=>deleteDraft(d.id)} className="btn-secondary" style={{ padding:'5px 8px', fontSize:'11px', color:'#8D2E00', border:'1px solid #fecaca' }}><Trash2 size={11}/></button>
                </div>
              </div>
            ))}
          </div>
          {drafts.length>0 && (
            <div style={{ padding:'8px', borderTop:'1px solid #E9D9B8', background:'#FFFBF5' }}>
              <button onClick={async()=>{ if(confirm('Clear all drafts?')){ await db.clearDrafts(); await loadDrafts(); }}} className="btn-secondary" style={{ width:'100%', padding:'6px', fontSize:'11px', color:'#8D2E00', border:'1px solid #fecaca' }}>Clear All Drafts</button>
            </div>
          )}
        </div>
      )}

      <div className="billing-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="billing-sidebar no-print" style={{ gap: '10px' }}>
          <div className="card" style={{ padding: '10px 12px', borderColor: '#E9D9B8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#8D6E63', marginBottom: '6px' }}><ScanBarcode size={14} color="#B9972E"/> SCAN / SEARCH</div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#BC9A7A' }} />
              <input ref={searchRef} className="input" value={searchQuery} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} onFocus={()=>searchQuery&&setShowSuggestions(true)} onBlur={()=>setTimeout(()=>setShowSuggestions(false),140)} placeholder="Scan barcode or type name/size" autoComplete="off" style={{ paddingLeft: '28px', height: '36px', fontSize: '0.88rem', borderColor: '#E9D9B8' }} />
              {showSuggestions && searchSuggestions.length>0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #E9D9B8', borderRadius: '10px', marginTop: '4px', boxShadow: 'var(--shadow-lg)', maxHeight: '220px', overflowY: 'auto' }}>
                  {searchSuggestions.map(p=> (
                    <div key={p.id} onMouseDown={()=>selectSuggestion(p)} style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #FFF3D6' }}>
                      <div><div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3E2723' }}>{p.name} {p.size? `• ${p.size}`:''} <span style={{ color: '#8D6E63', fontWeight: 400 }}>{p.brand?`(${p.brand})`:''}</span></div><div style={{ fontSize: '11px', color: '#BC9A7A', fontFamily: 'monospace' }}>{p.barcode||'no barcode'}</div></div>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#3E2723' }}>₹{Number(p.price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <div style={{ flex: '0 0 72px' }}><label style={{ fontSize: '10px', marginBottom: '2px' }}>QTY</label><input className="input" type="number" min="1" value={manualQty} onChange={e=>setManualQty(e.target.value)} style={{ height: '32px', padding: '6px 8px' }} /></div>
              <button onClick={handleManualAdd} className="btn-primary" disabled={isGuest} style={{ flex: 1, height: '32px', marginTop: '14px', padding: '0', fontSize: '0.82rem', fontWeight: 700, background: '#B9972E', border: 'none', opacity: isGuest ? 0.5 : 1, cursor: isGuest ? 'not-allowed' : 'pointer' }}>Add</button>
            </div>
          </div>

          <div className="card" style={{ padding: '10px 12px', borderColor: '#E9D9B8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#8D6E63', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><Percent size={12} color="#B9972E"/> DISCOUNT (before GST)</div>
            {discounts.length>0 && (
              <select className="select" value={selectedDiscountId} onChange={e=>{setSelectedDiscountId(e.target.value); setCustomDiscount('');}} style={{ height: '32px', padding: '6px 8px', fontSize: '0.82rem' }}>
                <option value="">No Discount</option>
                {discounts.map(d=> <option key={d.id} value={d.id}>{d.name} {d.percent}% {d.id===activeDiscountId?'★':''}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input className="input" type="number" min="0" max="100" step="0.5" value={customDiscount} onChange={e=>setCustomDiscount(e.target.value)} placeholder="Manual % (cashier)" style={{ height: '32px', padding: '6px 8px', fontSize: '0.82rem' }} />
              <div style={{ fontSize: '11px', color: currentDiscountPercent>0?'#3E2723':'#BC9A7A', fontWeight: 700, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{currentDiscountPercent>0? `-${currentDiscountPercent}%`: '0%'}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', borderColor: '#E9D9B8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#8D6E63' }}>CUSTOMER & PAYMENT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div><label style={{ fontSize: '10px', marginBottom: '2px', display: 'flex', gap: '4px' }}><Phone size={10}/> PHONE *</label><input className="input" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit" style={{ height: '32px', padding: '6px 8px', fontSize: '0.82rem' }} /></div>
              <div><label style={{ fontSize: '10px', marginBottom: '2px' }}>NAME</label><input className="input" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Optional" style={{ height: '32px', padding: '6px 8px', fontSize: '0.82rem' }} /></div>
            </div>
            <label style={{ fontSize: '10px', marginBottom: '2px', marginTop: '4px' }}>PAYMENT METHOD</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                {id:'Cash', icon: Wallet, label:'Cash'},
                {id:'UPI', icon: QrCode, label:'UPI'},
                {id:'Card', icon: CreditCard, label:'Card'},
              ].map(m=> (
                <button key={m.id} type="button" onClick={()=>setPaymentMethod(m.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 4px', borderRadius: '8px', border: paymentMethod===m.id? '2px solid #B9972E':'1px solid #E9D9B8', background: paymentMethod===m.id? '#FFF3D6':'#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: paymentMethod===m.id? '#3E2723':'#8D6E63' }}>
                  <m.icon size={16} color={paymentMethod===m.id? '#B9972E':'#8D6E63'} /> {m.label}
                </button>
              ))}
            </div>
            {paymentMethod==='UPI' && <input className="input" value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="UPI Txn ID / UTR (optional)" style={{ height: '32px', fontSize: '0.82rem' }} />}
            {paymentMethod==='Card' && <input className="input" value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="Last 4 digits / Auth code" style={{ height: '32px', fontSize: '0.82rem' }} />}
            {paymentMethod==='Cash' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                <div><label style={{ fontSize: '10px', marginBottom: '2px', display: 'flex', gap: '4px' }}><Banknote size={10}/> CASH IN</label><input type="number" className="input" value={cashGiven} onChange={e=>setCashGiven(e.target.value)} placeholder="₹" style={{ height: '32px', padding: '6px 8px' }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, background: balance>=0?'#FFF3D6':'#FBE9D0', border: `1px solid ${balance>=0?'#E9D9B8':'#D7A0A0'}`, color: balance>=0?'#3E2723':'#8D2E00', padding: '6px 8px', borderRadius: '8px' }}><span>Bal</span><span>₹{balance.toFixed(0)}</span></div></div>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#8D6E63' }}>{customerPhone? `${pointsPreview} pts → ${customerPhone} (1 pt/₹100)` : 'Add phone to earn loyalty points'}</div>
          </div>

          {/* Totals shown only in invoice preview — removed duplicate to fit 100% */}

        </div>

        {/* Invoice Preview — small thermal paper centered */}
        <div className="billing-main">
          <div className={`card invoice-card ${paperSize==='small'?'small-paper':'a4-paper'}`} style={{ padding: '10px', background: '#fff', minHeight: 0, borderColor: '#E9D9B8' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #B9972E', paddingBottom: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#3E2723' }}>{SHOP.name}</div>
              <div style={{ fontSize: '11px', color: '#8D6E63' }}>{SHOP.tamil} • {SHOP.tagline}</div>
              <div style={{ fontSize: '11px', color: '#5D4037', marginTop: '4px' }}>{SHOP.address} | Ph: {SHOP.phone} | {SHOP.email}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#3E2723' }}>GSTIN: {SHOP.gstin}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', marginBottom: '10px', background: '#FFFBF5', border: '1px solid #E9D9B8', borderRadius: '8px', padding: '8px 10px' }}>
              <div>
                <div><b>Invoice:</b> {invoiceNo}</div>
                <div><b>Date/Time:</b> {nowStr}</div>
                <div><b>Payment:</b> <span style={{ background: '#3E2723', color: '#FFD54F', padding: '1px 6px', borderRadius: '999px', fontSize: '10px' }}>{paymentMethod}</span> {paymentRef? `• ${paymentRef}`:''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><b>Customer:</b> {customerName || 'Walk-in'}</div>
                <div><b>Phone:</b> {customerPhone || '—'} {customerPhone? `• +${pointsPreview} pts`:''}</div>
                <div><b>Cashier:</b> {currentUser?.username || 'Admin'} • {invoiceItems.length} item(s)</div>
              </div>
            </div>

            {/* Screen: paginated + scrollable like Vyapar/Marg — Print: full list */}
            <div className="no-print invoice-scroll" style={{ border: '1px solid #E9D9B8', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ maxHeight: '38vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}><tr style={{ borderBottom: '2px solid #3E2723', textAlign: 'left', fontSize: '10px', letterSpacing: '0.03em', color: '#3E2723' }}>
                <th style={{ padding: '6px 4px', width: '28px' }}>#</th>
                <th style={{ padding: '6px 4px' }}>DESCRIPTION</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '48px' }}>QTY</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '70px' }}>RATE</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '70px' }}>AMT</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '90px' }}>GST%</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '80px' }}>TOTAL</th>
                <th style={{ padding: '6px 4px', width: '28px' }}></th>
              </tr></thead>
              <tbody>
                {paginatedInvoiceItems.length===0 && invoiceItems.length===0? <tr><td colSpan={8} style={{ padding: '18px', textAlign: 'center', color: '#BC9A7A' }}>Scan barcode to add shoes — scroll inside preview, pagination below</td></tr> :
                  paginatedInvoiceItems.length===0? <tr><td colSpan={8} style={{ padding: '12px', textAlign: 'center', color: '#8D6E63' }}>No items on this page</td></tr> :
                  paginatedInvoiceItems.map((item, idx)=> {
                    const globalIdx = (invPage-1)*invPerPage + idx;
                    const base=item.product.price*item.quantity;
                    const share=subtotal>0? (base/subtotal)*discountAmount:0;
                    const after=base-share;
                    const sgstPct=parseFloat(item.product.sgst)||0, cgstPct=parseFloat(item.product.cgst)||0;
                    const sgstAmt=after*sgstPct/100, cgstAmt=after*cgstPct/100;
                    const total=after+sgstAmt+cgstAmt;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #FFF3D6' }}>
                        <td style={{ padding: '6px 4px', color: '#8D6E63' }}>{globalIdx+1}</td>
                        <td style={{ padding: '6px 4px' }}><div style={{ fontWeight: 600, color: '#3E2723' }}>{item.product.name}</div><div style={{ fontSize: '10px', color: '#8D6E63' }}>{[item.product.brand?`Brand:${item.product.brand}`:'', item.product.size?`Size:${item.product.size}`:'', item.product.barcode?`Bar:${item.product.barcode}`:'' ].filter(Boolean).join(' • ')}</div></td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>{editingQty===item.id? <input type="number" min="1" value={editingQtyVal} onChange={e=>setEditingQtyVal(e.target.value)} onBlur={()=>commitEditQty(item.id)} onKeyDown={e=>e.key==='Enter'&&commitEditQty(item.id)} autoFocus style={{ width: '44px', height: '24px', border: '1px solid #B9972E', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }} /> : <span onClick={()=>startEditQty(item)} style={{ cursor: 'pointer', border: '1px dashed #D7C0A0', borderRadius: '999px', padding: '1px 7px', fontWeight: 700, color: '#3E2723' }}>{item.quantity}</span>}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{Number(item.product.price).toFixed(2)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{after.toFixed(2)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontSize: '10px', color: '#8D6E63' }}>{sgstPct>0||cgstPct>0? `${sgstPct}%+${cgstPct}%`:'—'}<br/><span style={{ color: '#3E2723' }}>₹{(sgstAmt+cgstAmt).toFixed(2)}</span></td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#3E2723' }}>₹{total.toFixed(2)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>{isGuest ? '—' : <button onClick={()=>removeItem(item.id)} style={{ border: '1px solid #E9D9B8', background: '#fff', color: '#8D2E00', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={10}/></button>}</td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
            </div>
            {invoiceItems.length > invPerPage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderTop: '1px solid #E9D9B8', background: '#FFFBF5', fontSize: '11px' }}>
                <span style={{ color: '#8D6E63' }}>Page {invPage} of {invTotalPages} • {invoiceItems.length} items</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button disabled={invPage<=1} onClick={()=>setInvPage(p=>Math.max(1,p-1))} className="btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', opacity: invPage<=1?0.5:1 }}>Prev</button>
                  <button disabled={invPage>=invTotalPages} onClick={()=>setInvPage(p=>Math.min(invTotalPages,p+1))} className="btn-secondary" style={{ padding: '3px 8px', fontSize: '11px', opacity: invPage>=invTotalPages?0.5:1 }}>Next</button>
                </div>
              </div>
            )}
            </div>
            {/* Print: full list without pagination */}
            <div className="print-only">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead><tr style={{ borderBottom: '2px solid #3E2723', textAlign: 'left', fontSize: '10px', letterSpacing: '0.03em', color: '#3E2723' }}>
                <th style={{ padding: '6px 4px', width: '28px' }}>#</th>
                <th style={{ padding: '6px 4px' }}>DESCRIPTION</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', width: '48px' }}>QTY</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '70px' }}>RATE</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '70px' }}>AMT</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '90px' }}>GST%</th>
                <th style={{ padding: '6px 4px', textAlign: 'right', width: '80px' }}>TOTAL</th>
              </tr></thead>
              <tbody>
                {invoiceItems.map((item, idx)=> {
                    const base=item.product.price*item.quantity;
                    const share=subtotal>0? (base/subtotal)*discountAmount:0;
                    const after=base-share;
                    const sgstPct=parseFloat(item.product.sgst)||0, cgstPct=parseFloat(item.product.cgst)||0;
                    const sgstAmt=after*sgstPct/100, cgstAmt=after*cgstPct/100;
                    const total=after+sgstAmt+cgstAmt;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #FFF3D6' }}>
                        <td style={{ padding: '6px 4px', color: '#8D6E63' }}>{idx+1}</td>
                        <td style={{ padding: '6px 4px' }}><div style={{ fontWeight: 600, color: '#3E2723' }}>{item.product.name}</div><div style={{ fontSize: '10px', color: '#8D6E63' }}>{[item.product.brand?`Brand:${item.product.brand}`:'', item.product.size?`Size:${item.product.size}`:'', item.product.barcode?`Bar:${item.product.barcode}`:'' ].filter(Boolean).join(' • ')}</div></td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{Number(item.product.price).toFixed(2)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>₹{after.toFixed(2)}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontSize: '10px', color: '#8D6E63' }}>{sgstPct>0||cgstPct>0? `${sgstPct}%+${cgstPct}%`:'—'}<br/><span style={{ color: '#3E2723' }}>₹{(sgstAmt+cgstAmt).toFixed(2)}</span></td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: '#3E2723' }}>₹{total.toFixed(2)}</td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <div style={{ width: '300px', border: '1px solid #E9D9B8', borderRadius: '10px', overflow: 'hidden', fontSize: '0.78rem', background: '#FFFBF5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', borderBottom: '1px solid #E9D9B8' }}><span style={{ color: '#8D6E63' }}>Subtotal</span><b style={{ color: '#3E2723' }}>₹{subtotal.toFixed(2)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #E9D9B8', color: currentDiscountPercent>0?'#5D4037':'#8D6E63' }}><span>Discount {currentDiscountPercent?`(${currentDiscountName})`:''}</span><b>-₹{discountAmount.toFixed(2)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', borderBottom: '1px solid #E9D9B8' }}><span style={{ color: '#8D6E63' }}>Taxable Amt</span><b>₹{taxable.toFixed(2)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #E9D9B8' }}><span style={{ color: '#8D6E63' }}>SGST</span><span>₹{sgstAmount.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '2px solid #B9972E' }}><span style={{ color: '#8D6E63' }}>CGST</span><span>₹{cgstAmount.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#3E2723', color: '#FFD54F', fontWeight: 800 }}><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#3E2723', background: '#fff' }}>
                  <div><b>Payment:</b> {paymentMethod} {paymentRef? `(${paymentRef})`:''} • <b>Points:</b> +{pointsPreview}</div>
                  {paymentMethod==='Cash' && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}><span>Cash Given: <b>₹{cashGivenAmount.toFixed(2)}</b></span><span style={{ color: balance>=0?'#3E2723':'#8D2E00' }}>Balance: <b>₹{balance.toFixed(2)}</b></span></div>}
                  {paymentMethod!=='Cash' && <div>Amount Paid: <b>₹{grandTotal.toFixed(2)}</b> via {paymentMethod}</div>}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px dashed #E9D9B8', paddingTop: '8px', fontSize: '10px', color: '#8D6E63', textAlign: 'center' }}>
              <div>Declaration: Goods once sold will not be taken back • Warranty as per manufacturer • Subject to Tamil Nadu jurisdiction</div>
              <div style={{ fontWeight: 700, color: '#3E2723', marginTop: '6px' }}>Thank you for shopping at Meenatchi Footwear! • For Every Step, We Care 🙏</div>
              <div style={{ fontSize: '9px', marginTop: '2px' }}>This is a computer generated invoice • {nowStr} • {invoiceNo}</div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(62,39,35,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '12px' }}>
          <div className="card" style={{ width: '480px', maxWidth: '100%', padding: '14px', borderColor: '#E9D9B8' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#3E2723' }}>Add New Shoe</h3>
            <form onSubmit={handleAddNewProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input className="input" value={newProduct.name} onChange={e=>setNewProduct(p=>({...p, name:e.target.value}))} placeholder="Product Name *" required style={{ height: '34px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><input className="input" value={newProduct.brand} onChange={e=>setNewProduct(p=>({...p, brand:e.target.value}))} placeholder="Brand" style={{ height: '34px' }} /><input className="input" value={newProduct.size} onChange={e=>setNewProduct(p=>({...p, size:e.target.value}))} placeholder="Size" style={{ height: '34px' }} /></div>
              <div style={{ display: 'flex', gap: '6px' }}><input className="input" value={newProduct.barcode} onChange={e=>setNewProduct(p=>({...p, barcode:e.target.value}))} placeholder="Barcode (scan)" style={{ height: '34px' }} /><span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', border: '1px solid #E9D9B8', borderRadius: '8px', background: '#FFF3D6' }}><ScanBarcode size={14} color="#B9972E"/></span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <input className="input" type="number" step="0.01" value={newProduct.price} onChange={e=>setNewProduct(p=>({...p, price:e.target.value}))} placeholder="Price ₹ *" required style={{ height: '34px' }} />
                <input className="input" type="number" step="0.1" value={newProduct.sgst} onChange={e=>setNewProduct(p=>({...p, sgst:e.target.value}))} placeholder="SGST %" style={{ height: '34px' }} />
                <input className="input" type="number" step="0.1" value={newProduct.cgst} onChange={e=>setNewProduct(p=>({...p, cgst:e.target.value}))} placeholder="CGST %" style={{ height: '34px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>Cancel</button><button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem', background: '#3E2723' }}>Save & Add</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
