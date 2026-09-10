// Central mock catalog for SQLite-style sample DB
export const BRANCHES = ['Main Branch', 'Anna Nagar', 'T.Nagar']
export const CATEGORIES = ['Mens', 'Women', 'Kids']

export const mockProducts = [
  { name: 'Air Max 270', brand: 'Nike', category: 'Mens', branch: 'Main Branch', size: '9', price: 7499, barcode: '890100100001', sgst: 6, cgst: 6 },
  { name: 'Air Max 270', brand: 'Nike', category: 'Mens', branch: 'Main Branch', size: '10', price: 7499, barcode: '890100100002', sgst: 6, cgst: 6 },
  { name: 'Revolution 6', brand: 'Nike', category: 'Women', branch: 'Anna Nagar', size: '7', price: 4599, barcode: '890100100003', sgst: 6, cgst: 6 },
  { name: 'Revolution 6', brand: 'Nike', category: 'Kids', branch: 'Main Branch', size: '4', price: 3299, barcode: '890100100004', sgst: 6, cgst: 6 },
  { name: 'Runner Lite', brand: 'Adidas', category: 'Mens', branch: 'T.Nagar', size: '9', price: 5999, barcode: '890100100005', sgst: 6, cgst: 6 },
  { name: 'Cloudfoam', brand: 'Adidas', category: 'Women', branch: 'Main Branch', size: '6', price: 5299, barcode: '890100100006', sgst: 6, cgst: 6 },
  { name: 'Smash V2', brand: 'Puma', category: 'Mens', branch: 'Main Branch', size: '8', price: 3999, barcode: '890100100007', sgst: 6, cgst: 6 },
  { name: 'Carina', brand: 'Puma', category: 'Women', branch: 'Anna Nagar', size: '5', price: 4499, barcode: '890100100008', sgst: 6, cgst: 6 },
  { name: 'One8 Junior', brand: 'Puma', category: 'Kids', branch: 'T.Nagar', size: '3', price: 2799, barcode: '890100100009', sgst: 6, cgst: 6 },
  { name: 'Chuck Taylor', brand: 'Converse', category: 'Mens', branch: 'Main Branch', size: '9', price: 3499, barcode: '890100100010', sgst: 6, cgst: 6 },
  { name: 'Chuck Taylor', brand: 'Converse', category: 'Women', branch: 'Main Branch', size: '6', price: 3499, barcode: '890100100011', sgst: 6, cgst: 6 },
  { name: 'Old Skool', brand: 'Vans', category: 'Mens', branch: 'Main Branch', size: '9', price: 4999, barcode: '890100100012', sgst: 6, cgst: 6 },
  { name: 'Sk8-Hi Kids', brand: 'Vans', category: 'Kids', branch: 'Anna Nagar', size: '2', price: 3999, barcode: '890100100013', sgst: 6, cgst: 6 },
  { name: 'Lace Up Formal', brand: 'Bata', category: 'Mens', branch: 'T.Nagar', size: '8', price: 2999, barcode: '890100100014', sgst: 6, cgst: 6 },
  { name: 'Ballerina', brand: 'Bata', category: 'Women', branch: 'Main Branch', size: '6', price: 1999, barcode: '890100100015', sgst: 6, cgst: 6 },
  { name: 'School Champ', brand: 'Bata', category: 'Kids', branch: 'Main Branch', size: '4', price: 1499, barcode: '890100100016', sgst: 6, cgst: 6 },
]

export const mockCustomers = [
  { phone: '9876543210', name: 'Arun Kumar', points: 42, visits: 5 },
  { phone: '8765432109', name: 'Priya S', points: 18, visits: 2 },
  { phone: '7654321098', name: 'Karthik R', points: 67, visits: 8 },
  { phone: '6543210987', name: 'Meena L', points: 12, visits: 1 },
  { phone: '9988776655', name: 'Suresh Babu', points: 31, visits: 4 },
  { phone: '9001234567', name: 'Ananya Devi', points: 55, visits: 6 },
]

export const mockDiscounts = [
  { name: 'Weekend 10%', percent: 10 },
  { name: 'Festive 15%', percent: 15 },
  { name: 'Kids Special 5%', percent: 5 },
]

export function generateMockInvoices(products, customers) {
  const invoices = []
  const now = new Date()
  const branches = BRANCHES
  const paymentMethods = ['Cash', 'UPI', 'Card']
  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(Math.random() * 28)
    const hour = 10 + Math.floor(Math.random() * 11) // 10-21
    const d = new Date(now); d.setDate(now.getDate() - daysAgo); d.setHours(hour, Math.floor(Math.random()*60), 0, 0)
    const customer = customers[Math.floor(Math.random()*customers.length)]
    const branch = branches[Math.floor(Math.random()*branches.length)]
    const itemCount = 1 + Math.floor(Math.random()*3)
    const items = []
    let subtotal = 0
    for(let k=0;k<itemCount;k++){
      const p = products[Math.floor(Math.random()*products.length)]
      const qty = 1 + Math.floor(Math.random()*2)
      items.push({ product: p, quantity: qty, id: `mock-${i}-${k}` })
      subtotal += p.price * qty
    }
    const discountPct = Math.random()<0.3 ? [5,10,15][Math.floor(Math.random()*3)] : 0
    const discountAmt = subtotal * discountPct/100
    const taxable = subtotal - discountAmt
    let sgst=0, cgst=0
    items.forEach(it=>{ const base=it.product.price*it.quantity; const share=subtotal?(base/subtotal)*discountAmt:0; const after=base-share; sgst+=after*(parseFloat(it.product.sgst)||0)/100; cgst+=after*(parseFloat(it.product.cgst)||0)/100 })
    const grand = taxable + sgst + cgst
    const paymentMethod = paymentMethods[Math.floor(Math.random()*paymentMethods.length)]
    invoices.push({
      id: 'INV-'+d.toISOString().slice(0,10).replace(/-/g,'')+'-'+String(100+i),
      invoiceNo: 'INV-'+d.toISOString().slice(0,10).replace(/-/g,'')+'-'+String(100+i),
      timestamp: d.toISOString(),
      dateTime: d.toISOString(),
      shop: { name: 'MEENATCHI FOOTWEAR', tagline: 'FOR EVERY STEP, WE CARE', address: '123 Main Road', phone: '9944009490', gstin: '33ABCDE1234F1Z5' },
      items, subtotal, discountPercent: discountPct, discountName: discountPct? `${discountPct}% Off`:'', discountAmount: discountAmt, taxable, sgstAmount: sgst, cgstAmount: cgst, gstAmount: sgst+cgst, grandTotal: grand,
      branch,
      paymentMethod, paymentRef: paymentMethod==='UPI'? 'UTR'+Math.floor(100000+Math.random()*900000) : paymentMethod==='Card'? '**** '+Math.floor(1000+Math.random()*9000) : null,
      cashGiven: paymentMethod==='Cash'? Math.ceil(grand/100)*100 : grand,
      balance: paymentMethod==='Cash'? Math.ceil(grand/100)*100 - grand : 0,
      customerPhone: customer.phone,
      customerName: customer.name,
      pointsEarned: Math.floor(grand/100),
      categoryBreakdown: items.reduce((acc,it)=>{ const cat=it.product.category||'Mens'; acc[cat]=(acc[cat]||0)+it.product.price*it.quantity; return acc; },{})
    })
  }
  return invoices.sort((a,b)=> new Date(a.timestamp)-new Date(b.timestamp))
}
