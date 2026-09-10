import { useEffect, useState, useMemo } from 'react'
import { db } from '../services/db'
import { TrendingUp, CalendarDays, Wallet, ArrowLeftRight, Phone, Filter, Crown, Clock } from 'lucide-react'
import { CATEGORIES } from '../services/mockData'
import * as XLSX from 'xlsx'

function fmt(n) { return '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:0 }) }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) }
function fmtMonth(d) { return new Date(d).toLocaleDateString('en-IN', { month:'short', year:'2-digit' }) }

/* ── Bar Chart ── */
function BarChart({ data, valueKey='gross', labelKey='label', color='#3E2723', height=100 }) {
  const max = Math.max(1, ...data.map(d=>d[valueKey]))
  const labelH = 14
  const chartH = height - labelH
  return (
    <div style={{ height, display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, display:'flex', alignItems:'flex-end', gap:'2px', paddingBottom:'2px' }}>
        {data.map((d,i)=>{
          const h = Math.max(2, Math.round((d[valueKey]/max)*chartH))
          const peak = d[valueKey]===max && max>0
          return (
            <div key={i} title={`${d[labelKey]}: ${fmt(d[valueKey])}`} style={{ flex:1, height:`${h}px`, background:peak?'#B9972E':color, borderRadius:'3px 3px 0 0', minWidth:0 }} />
          )
        })}
      </div>
      <div style={{ display:'flex', gap:'2px', height:labelH }}>
        {data.map((d,i)=>(
          <span key={i} style={{ flex:1, fontSize:'8px', color:'var(--text-secondary)', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:'14px' }}>{d[labelKey]}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Line Chart with labels + legend ── */
function LineChart({ data, color='#B9972E', height=80, label='Gross' }) {
  const max = Math.max(1, ...data.map(d=>d.gross))
  const w = 300, pad = 10, labelH = 14
  const chartH = height - labelH
  const step = (w - pad*2) / Math.max(1, data.length - 1)
  const pts = data.map((d,i)=> `${pad + i*step},${chartH - pad - (d.gross/max)*(chartH - pad*2)}`).join(' ')
  const area = `${pad},${chartH - pad} ${pts} ${pad + (data.length-1)*step},${chartH - pad}`
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
        <span style={{ width:'14px', height:'3px', borderRadius:'2px', background:color, display:'inline-block' }} />
        <span style={{ fontSize:'10px', color:'var(--text-secondary)', fontWeight:600 }}>{label}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display:'block' }}>
        <polygon points={area} fill={color} opacity={0.08} />
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts} />
        {data.map((d,i)=>{
          const x = pad + i*step, y = chartH - pad - (d.gross/max)*(chartH - pad*2)
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} stroke="#fff" strokeWidth="1" />
        })}
        {data.map((d,i)=>{
          const skip = data.length > 8 && i % Math.ceil(data.length / 7) !== 0 && i !== data.length - 1
          if(skip) return null
          const x = pad + i*step
          return <text key={i} x={x} y={height - 1} textAnchor="middle" fontSize="8" fill="#8D6E63" fontWeight="500">{d.label}</text>
        })}
      </svg>
    </div>
  )
}

/* ── Pie Chart ── */
function PieChart({ data, size=110 }) {
  const total = data.reduce((s,d)=>s+d.value,0) || 1
  let acc = 0
  const r = size*0.42, cx = size/2, cy = size/2
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d,i)=>{
          const start = acc/total * 2 * Math.PI
          acc += d.value
          const end = acc/total * 2 * Math.PI
          const large = (end - start) > Math.PI ? 1 : 0
          const x1 = cx + r*Math.cos(start - Math.PI/2), y1 = cy + r*Math.sin(start - Math.PI/2)
          const x2 = cx + r*Math.cos(end - Math.PI/2), y2 = cy + r*Math.sin(end - Math.PI/2)
          if(d.value===0) return null
          if(data.length===1) return <circle key={i} cx={cx} cy={cy} r={r} fill={d.color} />
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={d.color} stroke="#fff" strokeWidth="1.5" />
        })}
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
        {data.map((d,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'2px', background:d.color, flexShrink:0 }} />
            <span style={{ color:'var(--text-primary)', fontWeight:600 }}>{d.label}</span>
            <span style={{ color:'var(--text-secondary)' }}>{fmt(d.value)} ({((d.value/total)*100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [invoices, setInvoices] = useState([])
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterPayment, setFilterPayment] = useState('All')
  const [aTab, setATab] = useState('overview')
  useEffect(()=>{ db.getInvoices().then(d=>{ d.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)); setInvoices(d) }) },[])

  const filteredForStats = useMemo(()=>{
    return invoices.filter(inv=>{
      if(filterCategory!=='All'){ if(!(inv.items||[]).some(it=>(it.product.category||'Mens')===filterCategory)) return false }
      if(filterPayment!=='All' && (inv.paymentMethod||'Cash')!==filterPayment) return false
      return true
    })
  },[invoices, filterCategory, filterPayment])

  const [aPage, setAPage] = useState(1); const aPerPage = Number(import.meta.env.VITE_PAGINATION_ANALYTICS) || 7
  useEffect(()=> setAPage(1), [filterCategory, filterPayment, aTab])

  const { dayData, monthData, hourData, kpis, recentBillsAll, highestDay } = useMemo(()=>{
    const now = new Date()
    const dayMap = {}
    for(let i=13;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); dayMap[d.toISOString().slice(0,10)]={ label:fmtDate(d), gross:0, count:0 } }
    const monthMap = {}
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); monthMap[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`]={ label:fmtMonth(d), gross:0, count:0 } }
    const hourMap = { '10-12':{label:'10-12',gross:0,count:0}, '12-15':{label:'12-15',gross:0,count:0}, '15-18':{label:'15-18',gross:0,count:0}, '18-21':{label:'18-21',gross:0,count:0} }
    let totalGross=0, totalCashIn=0, totalBalanceOut=0
    let peakDay = { label:'—', gross:0 }
    filteredForStats.forEach(inv=>{
      const d = new Date(inv.timestamp||inv.dateTime)
      const dayK = d.toISOString().slice(0,10)
      const monK = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const gross = Number(inv.grandTotal||0)
      if(dayMap[dayK]){ dayMap[dayK].gross+=gross; dayMap[dayK].count++ }
      if(monthMap[monK]){ monthMap[monK].gross+=gross; monthMap[monK].count++ }
      const hr = d.getHours()
      if(hr>=10&&hr<12) hourMap['10-12'].gross+=gross
      else if(hr<15) hourMap['12-15'].gross+=gross
      else if(hr<18) hourMap['15-18'].gross+=gross
      else hourMap['18-21'].gross+=gross
      totalGross+=gross; totalCashIn+=Number(inv.cashGiven||0); totalBalanceOut+=Number(inv.balance||0)>0?Number(inv.balance):0
    })
    Object.values(dayMap).forEach(v=>{ if(v.gross>peakDay.gross) peakDay={label:v.label,gross:v.gross} })
    return { dayData:Object.values(dayMap), monthData:Object.values(monthMap), hourData:Object.values(hourMap), kpis:{totalGross,totalCashIn,totalBalanceOut,count:filteredForStats.length,avg:filteredForStats.length?totalGross/filteredForStats.length:0}, recentBillsAll:[...filteredForStats].sort((a,b)=>new Date(b.timestamp||b.dateTime)-new Date(a.timestamp||a.dateTime)), highestDay:peakDay }
  },[filteredForStats])

  const exportAnalytics = ()=>{
    const rows = filteredForStats.map(inv=>({
      Date:new Date(inv.timestamp||inv.dateTime).toLocaleDateString('en-IN'),
      Time:new Date(inv.timestamp||inv.dateTime).toLocaleTimeString('en-IN'),
      CategoryMix:Object.entries(inv.categoryBreakdown||{}).map(([k,v])=>`${k}:${Math.round(v)}`).join(' | '),
      Customer:inv.customerName||'', Phone:inv.customerPhone||'', Payment:inv.paymentMethod||'Cash',
      GrandTotal:Number(inv.grandTotal||0).toFixed(2)
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'FilteredBills')
    XLSX.writeFile(wb, `Meenatchi_Analytics_${filterCategory}_${filterPayment}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const categoryPieData = useMemo(()=>{
    const sums = {}; CATEGORIES.forEach(c=>sums[c]=0)
    filteredForStats.forEach(inv=>(inv.items||[]).forEach(it=>{ const cat=it.product.category||'Mens'; sums[cat]=(sums[cat]||0)+it.product.price*it.quantity }))
    const colors = ['#3E2723','#B9972E','#8D6E63']
    return CATEGORIES.map((c,i)=>({ label:c, value:sums[c], color:colors[i%3] }))
  },[filteredForStats])

  const paymentPieData = useMemo(()=>{
    const sums = { Cash:0, UPI:0, Card:0 }
    filteredForStats.forEach(inv=>{ const p=inv.paymentMethod||'Cash'; sums[p]=(sums[p]||0)+Number(inv.grandTotal||0) })
    const colors = ['#3E2723','#B9972E','#8D6E63']
    return Object.entries(sums).map(([k,v],i)=>({ label:k, value:v, color:colors[i%3] }))
  },[filteredForStats])

  const billsPage = recentBillsAll.slice((aPage-1)*aPerPage, aPage*aPerPage)

  return (
    <div className="page-root" style={{ overflow:'auto' }}>
      <header className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
          <div>
            <h2 className="header-title"><TrendingUp size={16} color="#B9972E" style={{ display:'inline', verticalAlign:'middle', marginRight:'6px' }}/> Analytics</h2>
            <p className="text-sm">Bar + Line + Pie mixed • Type • Payment • Time trends</p>
          </div>
          <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
            <Filter size={12} color="#8D6E63"/>
            <label style={{ fontSize:'10px', color:'var(--text-secondary)', margin:0, textTransform:'none', fontWeight:600 }}>Type</label>
            <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="input" style={{ width:'100px', height:'28px', fontSize:'11px' }}>
              <option value="All">All</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <label style={{ fontSize:'10px', color:'var(--text-secondary)', margin:0, textTransform:'none', fontWeight:600 }}>Pay</label>
            <select value={filterPayment} onChange={e=>setFilterPayment(e.target.value)} className="input" style={{ width:'90px', height:'28px', fontSize:'11px' }}>
              <option value="All">All</option><option>Cash</option><option>UPI</option><option>Card</option>
            </select>
            <button onClick={exportAnalytics} className="btn-secondary btn-sm">Export</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:'4px', marginTop:'8px', flexWrap:'wrap' }}>
          {[
            {id:'overview',label:'Overview'},
            {id:'type',label:'By Type'},
            {id:'payment',label:'By Payment'},
            {id:'time',label:'Time-wise'},
            {id:'bills',label:`Bills (${recentBillsAll.length})`}
          ].map(t=>(
            <button key={t.id} onClick={()=>setATab(t.id)} className={aTab===t.id?'btn-primary':'btn-secondary'} style={{ padding:'5px 10px', fontSize:'11px', background:aTab===t.id?'#3E2723':'#fff', border:aTab===t.id?'1px solid #B9972E':'1px solid #E9D9B8', color:aTab===t.id?'#FFD54F':'#8D6E63' }}>{t.label}</button>
          ))}
        </div>
      </header>

      {/* ═══ OVERVIEW — KPIs + Mixed Charts ═══ */}
      {aTab==='overview' && (<>
        <div className="analytics-kpi-row" style={{ flexShrink:0 }}>
          <div className="card" style={{ padding:'6px 10px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text-secondary)', display:'flex', gap:'4px', alignItems:'center' }}><Crown size={11} color="#B9972E"/> HIGHEST DAY</div>
            <div style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--text-primary)' }}>{highestDay.label}</div>
            <div style={{ fontSize:'11px', color:'var(--accent-gold)', fontWeight:700 }}>{fmt(highestDay.gross)}</div>
          </div>
          <div className="card" style={{ padding:'6px 10px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text-secondary)' }}>TOTAL GROSS</div>
            <div style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--text-primary)' }}>{fmt(kpis.totalGross)}</div>
            <div style={{ fontSize:'10px', color:'var(--text-tertiary)' }}>{kpis.count} bills • avg {fmt(kpis.avg)}</div>
          </div>
          <div className="card" style={{ padding:'6px 10px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text-secondary)', display:'flex', gap:'4px', alignItems:'center' }}><Wallet size={11} color="#B9972E"/> CASH IN</div>
            <div style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--text-primary)' }}>{fmt(kpis.totalCashIn)}</div>
          </div>
          <div className="card" style={{ padding:'6px 10px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'var(--text-secondary)', display:'flex', gap:'4px', alignItems:'center' }}><ArrowLeftRight size={11} color="#B9972E"/> BALANCE OUT</div>
            <div style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--danger)' }}>{fmt(kpis.totalBalanceOut)}</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', flex:1, minHeight:0 }}>
          {/* Left: Daily bar + line — fills full height */}
          <div className="card" style={{ padding:'8px 10px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px', flexShrink:0 }}>Daily Trend — Bar + Line {filterCategory!=='All'?`• ${filterCategory}`:''}</div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ flex:3, minHeight:0 }}><BarChart data={dayData} height={140} /></div>
              <div style={{ borderTop:'1px solid #E9D9B8', paddingTop:'2px', flexShrink:0 }}>
                <LineChart data={dayData} color="#B9972E" height={80} label="Daily Gross Trend" />
              </div>
            </div>
          </div>

          {/* Right: 3 cards stacked — equal height */}
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', minHeight:0 }}>
            <div className="card" style={{ padding:'8px 10px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px', flexShrink:0 }}>Category — Pie + Bar</div>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px', alignItems:'center', minHeight:0 }}>
                <PieChart data={categoryPieData} size={90} />
                <BarChart data={categoryPieData.map(c=>({label:c.label,gross:c.value}))} height={100} color="#B9972E" />
              </div>
            </div>
            <div className="card" style={{ padding:'8px 10px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px', flexShrink:0 }}>Payment — Pie + Bar</div>
              <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px', alignItems:'center', minHeight:0 }}>
                <PieChart data={paymentPieData} size={90} />
                <BarChart data={paymentPieData.map(p=>({label:p.label,gross:p.value}))} height={100} color="#8D6E63" />
              </div>
            </div>
            <div className="card" style={{ padding:'8px 10px', flexShrink:0 }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px' }}>Hourly — Bar + Line</div>
              <BarChart data={hourData} height={55} color="#3E2723" />
              <div style={{ borderTop:'1px solid #E9D9B8', marginTop:'2px', paddingTop:'2px' }}>
                <LineChart data={hourData} color="#B9972E" height={45} label="Hourly Gross" />
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ BY TYPE — Pie + KPIs ═══ */}
      {aTab==='type' && (<>
        <div className="analytics-grid-2" style={{ flexShrink:0 }}>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Revenue by Type — Pie</div>
            <PieChart data={categoryPieData} size={110} />
          </div>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Revenue by Type — Bar</div>
            <BarChart data={categoryPieData.map(c=>({label:c.label,gross:c.value}))} height={100} color="#3E2723" />
          </div>
        </div>
        <div className="analytics-grid-3">
          {CATEGORIES.map(cat=>{
            const sum = filteredForStats.reduce((s,inv)=>s+(inv.items||[]).filter(it=>(it.product.category||'Mens')===cat).reduce((a,it)=>a+it.product.price*it.quantity,0),0)
            const count = filteredForStats.reduce((s,inv)=>s+(inv.items||[]).filter(it=>(it.product.category||'Mens')===cat).reduce((a,it)=>a+it.quantity,0),0)
            return <div key={cat} className="card" style={{ padding:'8px 10px', textAlign:'center' }}><div style={{ fontSize:'11px', color:'var(--text-secondary)', fontWeight:700 }}>{cat}</div><div style={{ fontSize:'1rem', fontWeight:800, color:'var(--text-primary)' }}>{fmt(sum)}</div><div style={{ fontSize:'10px', color:'var(--text-tertiary)' }}>{count} units</div></div>
          })}
        </div>
      </>)}

      {/* ═══ BY PAYMENT — Pie + Bar ═══ */}
      {aTab==='payment' && (<>
        <div className="analytics-grid-2" style={{ flexShrink:0 }}>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Payment Mode — Pie</div>
            <PieChart data={paymentPieData} size={110} />
          </div>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Payment Mode — Bar</div>
            <BarChart data={paymentPieData.map(p=>({label:p.label,gross:p.value}))} height={120} color="#3E2723" />
          </div>
        </div>
      </>)}

      {/* ═══ TIME-WISE — Bar + Line ═══ */}
      {aTab==='time' && (<>
        <div className="analytics-grid-2" style={{ flex:1, minHeight:0 }}>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', display:'flex', gap:'4px', alignItems:'center', marginBottom:'4px' }}><Clock size={12}/> Hourly — Bar</div>
            <BarChart data={hourData} height={130} color="#8D6E63" />
          </div>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Hourly — Line</div>
            <LineChart data={hourData} color="#B9972E" height={130} label="Hourly Gross" />
          </div>
        </div>
        <div className="analytics-grid-2">
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'2px' }}>Monthly — Bar + Line</div>
            <BarChart data={monthData} height={70} color="#3E2723" />
            <div style={{ borderTop:'1px solid #E9D9B8', marginTop:'2px', paddingTop:'2px' }}>
              <LineChart data={monthData} color="#B9972E" height={45} label="Monthly Gross Trend" />
            </div>
          </div>
          <div className="card" style={{ padding:'8px 10px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)', marginBottom:'4px' }}>Category by Hour — Pie</div>
            <PieChart data={categoryPieData} size={95} />
          </div>
        </div>
      </>)}

      {/* ═══ BILLS — Full paginated table (ONLY here) ═══ */}
      {aTab==='bills' && (
        <div className="page-body">
          <div className="card" style={{ padding:0, flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'8px 12px', borderBottom:'1px solid #E9D9B8', background:'#FFFBF5', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:'var(--text-primary)' }}>Bills — {filterCategory!=='All'?filterCategory:'All Types'} • {filterPayment!=='All'?filterPayment:'All Payments'} • {recentBillsAll.length} total</span>
              <span style={{ fontSize:'10px', color:'var(--text-tertiary)' }}>Page {aPage}/{Math.max(1,Math.ceil(recentBillsAll.length/aPerPage))}</span>
            </div>
            <div style={{ flex:1, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'11px' }}>
                <thead style={{ position:'sticky', top:0, zIndex:1 }}>
                  <tr style={{ textAlign:'left', borderBottom:'1px solid #E9D9B8', background:'#FFFBF5' }}>
                    <th style={{ padding:'6px 10px', color:'var(--text-secondary)', fontSize:'10px' }}>DATE</th>
                    <th style={{ padding:'6px 10px', color:'var(--text-secondary)', fontSize:'10px' }}>INVOICE</th>
                    <th style={{ padding:'6px 10px', color:'var(--text-secondary)', fontSize:'10px' }}>CUSTOMER</th>
                    <th style={{ padding:'6px 10px', color:'var(--text-secondary)', fontSize:'10px' }}>PAYMENT</th>
                    <th style={{ padding:'6px 10px', textAlign:'right', color:'var(--text-secondary)', fontSize:'10px' }}>GROSS</th>
                    <th style={{ padding:'6px 10px', textAlign:'right', color:'var(--text-secondary)', fontSize:'10px' }}>CASH IN</th>
                    <th style={{ padding:'6px 10px', textAlign:'right', color:'var(--text-secondary)', fontSize:'10px' }}>BAL</th>
                  </tr>
                </thead>
                <tbody>
                  {billsPage.length===0? <tr><td colSpan={7} style={{ padding:'20px', textAlign:'center', color:'var(--text-tertiary)' }}>No bills for this filter</td></tr> :
                    billsPage.map(b=>(
                      <tr key={b.id} style={{ borderBottom:'1px solid #FFF3D6' }}>
                        <td style={{ padding:'6px 10px', color:'var(--text-secondary)' }}>{new Date(b.timestamp||b.dateTime).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                        <td style={{ padding:'6px 10px', fontFamily:'monospace', fontWeight:600 }}>{b.invoiceNo||b.id}</td>
                        <td style={{ padding:'6px 10px' }}>{b.customerName||'Walk-in'} {b.customerPhone?<span style={{color:'var(--text-tertiary)'}}>• {b.customerPhone}</span>:''}</td>
                        <td style={{ padding:'6px 10px' }}><span style={{ background:'#FFF3D6', border:'1px solid #E9D9B8', padding:'1px 6px', borderRadius:'999px', fontWeight:700, fontSize:'10px' }}>{b.paymentMethod||'Cash'}</span></td>
                        <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:700 }}>{fmt(b.grandTotal)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right' }}>{fmt(b.cashGiven)}</td>
                        <td style={{ padding:'6px 10px', textAlign:'right', color: Number(b.balance)>0?'var(--danger)':'var(--text-secondary)' }}>{fmt(Number(b.balance)>0?b.balance:0)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <div style={{ flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 12px', borderTop:'1px solid #E9D9B8', background:'#FFFBF5' }}>
              <span style={{ fontSize:'10px', color:'var(--text-tertiary)' }}>Page {aPage} of {Math.max(1,Math.ceil(recentBillsAll.length/aPerPage))}</span>
              <div style={{ display:'flex', gap:'4px' }}>
                <button disabled={aPage<=1} onClick={()=>setAPage(p=>Math.max(1,p-1))} className="btn-secondary btn-sm" style={{opacity:aPage<=1?0.5:1}}>Prev</button>
                <button disabled={aPage>=Math.ceil(recentBillsAll.length/aPerPage)} onClick={()=>setAPage(p=>p+1)} className="btn-secondary btn-sm" style={{opacity:aPage>=Math.ceil(recentBillsAll.length/aPerPage)?0.5:1}}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
