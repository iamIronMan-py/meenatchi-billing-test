import { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import * as XLSX from 'xlsx';
import { PackagePlus, Percent, Trash2, Edit3, ScanBarcode, Download, Upload, Search } from 'lucide-react';
import { CATEGORIES } from '../services/mockData';

const emptyForm = { name: '', price: '', barcode: '', brand: '', size: '', category: 'Mens', sgst: '', cgst: '' };

export default function Master() {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | discounts
  const barcodeRef = useRef(null);

  // Discount Master state
  const [discounts, setDiscounts] = useState([]);
  const [discountForm, setDiscountForm] = useState({ name: '', percent: '' });
  const [activeDiscountId, setActiveDiscountId] = useState(null);

  useEffect(() => { loadProducts(); loadDiscounts(); }, []);

  const loadProducts = async () => {
    const data = await db.getProducts();
    setProducts(data);
  };
  const loadDiscounts = async () => {
    const data = await db.getDiscounts();
    setDiscounts(data);
    const active = await db.getActiveDiscountId();
    setActiveDiscountId(active);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    const isDuplicate = products.some(p =>
      p.id !== editingId &&
      p.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
      String(p.size || '').trim().toLowerCase() === String(formData.size || '').trim().toLowerCase() &&
      String(p.brand || '').trim().toLowerCase() === String(formData.brand || '').trim().toLowerCase()
    );
    if (isDuplicate) {
      alert(`Product "${formData.name}" with same brand/size already exists!`);
      return;
    }
    const payload = {
      name: formData.name.trim(),
      price: parseFloat(formData.price) || 0,
      barcode: (formData.barcode || '').trim(),
      brand: (formData.brand || '').trim(),
      size: (formData.size || '').trim(),
      category: formData.category || 'Mens',
      sgst: parseFloat(formData.sgst) || 0,
      cgst: parseFloat(formData.cgst) || 0,
    };
    if (editingId) {
      await db.updateProduct(editingId, payload);
      setEditingId(null);
    } else {
      await db.addProduct(payload);
    }
    setFormData(emptyForm);
    loadProducts();
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: String(product.price),
      barcode: product.barcode || '',
      brand: product.brand || '',
      size: product.size || '',
      category: product.category || 'Mens',
      sgst: String(product.sgst || ''),
      cgst: String(product.cgst || ''),
    });
    setActiveTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleCancelEdit = () => { setEditingId(null); setFormData(emptyForm); };
  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      await db.deleteProduct(id);
      if (editingId === id) { setEditingId(null); setFormData(emptyForm); }
      loadProducts();
    }
  };

  // Discount handlers
  const handleDiscountSubmit = async (e) => {
    e.preventDefault();
    if (!discountForm.name || discountForm.percent === '') return;
    const pct = parseFloat(discountForm.percent);
    if (isNaN(pct) || pct < 0 || pct > 100) { alert('Percent must be 0-100'); return; }
    await db.addDiscount({ name: discountForm.name.trim(), percent: pct });
    setDiscountForm({ name: '', percent: '' });
    loadDiscounts();
  };
  const handleSetActiveDiscount = async (id) => {
    await db.setActiveDiscount(id);
    loadDiscounts();
  };
  const handleDeleteDiscount = async (id) => {
    if (window.confirm('Delete this discount?')) {
      await db.deleteDiscount(id);
      loadDiscounts();
    }
  };

  // HID scanner helper: pressing Enter in barcode field saves quickly if product exists by barcode
  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // focus price if barcode looks filled, just convenience
      document.querySelector('input[name="price"]')?.focus();
    }
  };

  // Excel import (Name, Price, Barcode, Brand, Size, Category)
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let added = 0, skipped = 0;
      let startRow = 0;
      if (data[0] && String(data[0][0]).toLowerCase().includes('name')) startRow = 1;
      for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        const rawName = String(row[0] || '').trim();
        const price = parseFloat(row[1]) || 0;
        const barcode = String(row[2] || '').trim();
        const brand = String(row[3] || '').trim();
        const size = String(row[4] || '').trim();
        const category = (String(row[5]||'').trim()||'Mens');
        if (!rawName) continue;
        const isDup = products.some(p => p.name.toLowerCase().trim() === rawName.toLowerCase().trim() && String(p.size||'')===size && String(p.brand||'')===brand);
        if (isDup) { skipped++; continue; }
        await db.addProduct({ name: rawName, price, barcode, brand, size, category: CATEGORIES.includes(category)?category:'Mens', sgst: 0, cgst: 0 });
        added++;
      }
      alert(`Import done — Added: ${added}, Skipped duplicates: ${skipped}`);
      loadProducts();
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };
  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Product Name,Price,Barcode,Brand,Size,Category\nNike Air Max,4999,8901234567890,Nike,9,Mens\nAdidas Runner,3999,8901234567891,Adidas,8,Women\n";
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "shoe_mart_import_template.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportFilteredExcel = () => {
    const rows = filteredProducts.map(p => ({
      'Product Name': p.name,
      Brand: p.brand || '',
      Size: p.size || '',
      Category: p.category || 'Mens',
      Price: p.price,
      Barcode: p.barcode || '',
      'SGST %': p.sgst || 0,
      'CGST %': p.cgst || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    const catTag = filterCategory !== 'All' ? `_${filterCategory}` : ''
    XLSX.writeFile(wb, `Meenatchi_Products${catTag}_${new Date().toISOString().slice(0,10)}.xlsx`)
  };

  const [filterCategory, setFilterCategory] = useState('All');
  const [page, setPage] = useState(1);
  const perPage = Number(import.meta.env.VITE_PAGINATION_MASTER) || 8;

  const filteredProducts = products.filter(p => {
    const q = searchFilter.toLowerCase().trim();
    const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || String(p.size || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q);
    const matchCat = filterCategory==='All' || (p.category||'Mens')===filterCategory;
    return matchQ && matchCat;
  });
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const paginatedProducts = filteredProducts.slice((page-1)*perPage, page*perPage);
  // reset page when filter changes
  useEffect(()=> setPage(1), [searchFilter, filterCategory]);

  return (
    <div className="page-root">
      <header className="page-header">
        <h2 className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PackagePlus size={16} /> Master</h2>
        <p className="text-sm">Type: Mens/Women/Kids • Brand/Size • HID scanner</p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          <button onClick={() => setActiveTab('products')} className={activeTab === 'products' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '0.82rem', background: activeTab==='products'? '#3E2723':'#fff', border: activeTab==='products'? '1px solid #B9972E':'1px solid #E9D9B8' }}>Products ({products.length})</button>
          <button onClick={() => setActiveTab('discounts')} className={activeTab === 'discounts' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', background: activeTab==='discounts'? '#3E2723':'#fff', border: activeTab==='discounts'? '1px solid #B9972E':'1px solid #E9D9B8' }}><Percent size={14} /> Discounts {activeDiscountId ? '★' : ''}</button>
        </div>
      </header>

      {activeTab === 'products' ? (
        <div className="master-grid">
          <div className="card" style={{ borderColor: '#E9D9B8' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', color: '#3E2723' }}>{editingId ? <><Edit3 size={14} /> Edit Product</> : <><PackagePlus size={14} /> Add Shoe Product</>}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><label>Product Name *</label><input className="input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Air Max 270" required style={{ height: '34px' }} /></div>
              <div><label>Type *</label><select className="select" name="category" value={formData.category} onChange={handleChange} style={{ height: '36px', width: '100%', padding: '6px 24px 6px 10px', fontSize: '13px' }}><option>Mens</option><option>Women</option><option>Kids</option></select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label>Brand</label><input className="input" name="brand" value={formData.brand} onChange={handleChange} placeholder="Nike / Puma" style={{ height: '34px' }} /></div>
                <div><label>Size *</label><input className="input" name="size" value={formData.size} onChange={handleChange} placeholder="e.g. 9 / 42" style={{ height: '34px' }} /></div>
              </div>
              <div><label>Barcode / QR * <span style={{ fontWeight: 400, textTransform: 'none', color: '#BC9A7A' }}>(HID: scan here, Tab→next)</span></label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input ref={barcodeRef} className="input" name="barcode" value={formData.barcode} onChange={handleChange} onKeyDown={handleBarcodeKeyDown} placeholder="Scan barcode" style={{ flex: 1, height: '34px' }} />
                  <span title="HID scanner" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', border: '1px solid #E9D9B8', borderRadius: '8px', background: '#FFF3D6', color: '#B9972E' }}><ScanBarcode size={16} /></span>
                </div>
              </div>
              <div><label>Price (₹) *</label><input className="input" type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" required style={{ height: '34px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label>SGST (%)</label><input className="input" type="number" step="0.1" name="sgst" value={formData.sgst} onChange={handleChange} placeholder="0" style={{ height: '34px' }} /></div>
                <div><label>CGST (%)</label><input className="input" type="number" step="0.1" name="cgst" value={formData.cgst} onChange={handleChange} placeholder="0" style={{ height: '34px' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, fontWeight: 700 }}>{editingId ? 'Update Product' : 'Save Product'}</button>
                {editingId && <button type="button" onClick={handleCancelEdit} className="btn-secondary">Cancel</button>}
              </div>
              <p style={{ margin: '0', color: '#BC9A7A', fontSize: '11px' }}>Tab to next field • HID: focus barcode → scan → Tab</p>
            </form>
          </div>

          <div className="card" style={{ borderColor: '#E9D9B8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#3E2723' }}>Catalog</h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="select" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} style={{ height: '30px', padding: '4px 8px', fontSize: '11px', width: '90px', color: '#3E2723' }}><option>All</option><option>Mens</option><option>Women</option><option>Kids</option></select>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#BC9A7A' }} />
                  <input className="input" style={{ width: '150px', paddingLeft: '22px', height: '30px', fontSize: '11px' }} placeholder="Search..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
                </div>
                <button onClick={downloadTemplate} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={12} /> Template</button>
                <div style={{ position: 'relative' }}>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={12} /> Import</button>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
                <button onClick={exportFilteredExcel} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#FFF3D6', borderColor: '#E9D9B8' }}><Download size={12} /> Export Filtered ({filteredProducts.length})</button>
              </div>
            </div>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #E9D9B8', fontSize: '11px', letterSpacing: '0.04em', color: '#8D6E63' }}>
                    <th style={{ padding: '6px' }}>PRODUCT</th>
                    <th style={{ padding: '6px' }}>TYPE</th>
                    <th style={{ padding: '6px' }}>PRICE</th>
                    <th style={{ padding: '6px' }}>BARCODE</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '18px', textAlign: 'center', color: '#BC9A7A' }}>{searchFilter ? 'No match' : 'No products yet — add or import'}</td></tr>
                  ) : (
                    paginatedProducts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #FFF3D6', background: editingId === p.id ? '#FFFBF5' : 'transparent' }}>
                        <td style={{ padding: '6px', fontWeight: 600, fontSize: '0.82rem', color: '#3E2723' }}>{p.name} <span style={{ fontSize: '10px', background: p.category==='Mens'? '#E9D9B8' : p.category==='Women'? '#FFE0B2' : '#FFF3D6', border: '1px solid #D7C0A0', padding: '1px 5px', borderRadius: '999px', color: '#3E2723' }}>{p.category||'Mens'}</span></td>
                        <td style={{ padding: '6px', color: '#8D6E63', fontSize: '11px' }}>{p.category||'Mens'}</td>
                        <td style={{ padding: '6px', fontWeight: 700, fontSize: '0.82rem' }}>₹{Number(p.price).toFixed(0)}</td>
                        <td style={{ padding: '6px', color: '#BC9A7A', fontSize: '11px', fontFamily: 'monospace' }}>{p.barcode || '—'}</td>
                        <td style={{ padding: '6px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => handleEdit(p)} style={{ background: '#FFFBF5', color: '#3E2723', border: '1px solid #E9D9B8', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit3 size={10} /> Edit</button>
                          <button onClick={() => handleDelete(p.id)} style={{ background: '#fff', color: '#8D2E00', border: '1px solid #E9D9B8', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Trash2 size={10} /> Del</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E9D9B8' }}>
                <span style={{ fontSize: '11px', color: '#8D6E63' }}>Page {page} of {totalPages} • {filteredProducts.length} total</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', opacity: page<=1?0.5:1 }}>Prev</button>
                  <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', opacity: page>=totalPages?0.5:1 }}>Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '12px', alignItems: 'start' }}>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', color: '#3E2723' }}><Percent size={14} /> Create Discount for the Day</h3>
            <p className="text-sm">Cashier can also override at billing time. Discount is applied <b>before GST</b>.</p>
            <form onSubmit={handleDiscountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <div><label>Discount Name *</label><input className="input" value={discountForm.name} onChange={e => setDiscountForm(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Weekend 10%" required /></div>
              <div><label>Percent (%) *</label><input className="input" type="number" min="0" max="100" step="0.5" value={discountForm.percent} onChange={e => setDiscountForm(s => ({ ...s, percent: e.target.value }))} placeholder="e.g. 10" required /></div>
              <button type="submit" className="btn-primary" style={{ fontWeight: 700 }}>Add Discount</button>
            </form>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '0.92rem', color: '#3E2723' }}>Discounts ({discounts.length})</h3>
            {discounts.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem 0', fontSize: '12px' }}>No discounts yet — create one on the left.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {discounts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: `1px solid ${d.id===activeDiscountId ? '#B9972E' : 'var(--border-color)'}`, borderRadius: '10px', background: d.id===activeDiscountId ? '#FFFBF5' : '#fff' }}>
                    <div>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>{d.name} <span style={{ background: d.id===activeDiscountId ? '#3E2723' : '#E9D9B8', color: d.id===activeDiscountId ? '#fff' : '#3E2723', padding: '1px 6px', borderRadius: '999px', fontSize: '10px' }}>{d.percent}%{d.id===activeDiscountId ? ' ★ Today' : ''}</span></div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>Created {new Date(d.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {d.id === activeDiscountId ? (
                        <button onClick={() => handleSetActiveDiscount(null)} className="btn-secondary btn-sm">Clear Today</button>
                      ) : (
                        <button onClick={() => handleSetActiveDiscount(d.id)} className="btn-primary btn-sm" style={{background:'#B9972E'}}>Set as Today</button>
                      )}
                      <button onClick={() => handleDeleteDiscount(d.id)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', fontSize: '11px' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '10px' }}>“Set as Today” marks the discount cashier sees pre-selected in Billing. Cashier can still change or enter custom % manually.</p>
          </div>
        </div>
      )}
    </div>
  );
}
