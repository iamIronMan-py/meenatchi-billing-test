// Shoe Mart DB - localStorage with products, invoices, discounts (SQLite-style mock capable)
const STORE_KEY = 'shoe_mart_products';
const INVOICE_STORE_KEY = 'shoe_mart_invoices';
const DISCOUNT_STORE_KEY = 'shoe_mart_discounts';
const ACTIVE_DISCOUNT_KEY = 'shoe_mart_active_discount_id';
const CUSTOMER_STORE_KEY = 'shoe_mart_customers';
const SEEDED_KEY = 'shoe_mart_seeded_v2';
const DRAFT_KEY = 'shoe_mart_drafts';
const USER_STORE_KEY = 'shoe_mart_users';
const AUTH_SESSION_KEY = 'shoe_mart_auth';

// Migration from old keys if present
(function migrate() {
  if (!localStorage.getItem(STORE_KEY) && localStorage.getItem('annamalai_products')) {
    localStorage.setItem(STORE_KEY, localStorage.getItem('annamalai_products'));
  }
  if (!localStorage.getItem(INVOICE_STORE_KEY) && localStorage.getItem('annamalai_invoices')) {
    localStorage.setItem(INVOICE_STORE_KEY, localStorage.getItem('annamalai_invoices'));
  }
})();

export const db = {
  // --- Customers (phone → name/points) for reward mechanism
  async getCustomers() {
    const data = localStorage.getItem(CUSTOMER_STORE_KEY);
    return data ? JSON.parse(data) : {};
  },
  async getCustomerList() {
    const map = await this.getCustomers();
    return Object.values(map).sort((a,b)=> (b.points||0)-(a.points||0));
  },
  async upsertCustomer(phone, name) {
    if (!phone) return;
    const customers = await this.getCustomers();
    const key = String(phone).trim();
    const prev = customers[key] || { phone: key, name: name||'', points: 0, visits: 0 };
    if (name) prev.name = name;
    customers[key] = prev;
    localStorage.setItem(CUSTOMER_STORE_KEY, JSON.stringify(customers));
    return prev;
  },
  async addPoints(phone, pts, name) {
    if (!phone) return;
    const customers = await this.getCustomers();
    const key = String(phone).trim();
    const prev = customers[key] || { phone: key, name: name||'', points: 0, visits: 0 };
    if (name) prev.name = name;
    prev.points = (prev.points || 0) + pts;
    prev.visits = (prev.visits || 0) + 1;
    prev.lastSeen = new Date().toISOString();
    customers[key] = prev;
    localStorage.setItem(CUSTOMER_STORE_KEY, JSON.stringify(customers));
    return prev;
  },

  // --- Products ---
  async getProducts() {
    const data = localStorage.getItem(STORE_KEY);
    return data ? JSON.parse(data) : [];
  },
  async addProduct(product) {
    const products = await this.getProducts();
    const newProduct = { id: Date.now().toString(), ...product };
    products.push(newProduct);
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    return newProduct;
  },
  async updateProduct(id, updates) {
    let products = await this.getProducts();
    products = products.map(p => p.id === id ? { ...p, ...updates } : p);
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    return products.find(p => p.id === id);
  },
  async deleteProduct(id) {
    let products = await this.getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
  },

  // --- Invoices ---
  async getInvoices() {
    const data = localStorage.getItem(INVOICE_STORE_KEY);
    return data ? JSON.parse(data) : [];
  },
  async saveInvoice(invoiceData) {
    const invoices = await this.getInvoices();
    const newInvoice = {
      id: 'INV-' + Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...invoiceData
    };
    invoices.push(newInvoice);
    localStorage.setItem(INVOICE_STORE_KEY, JSON.stringify(invoices));
    return newInvoice;
  },

  // --- Discounts (Master: discount for the day) ---
  async getDiscounts() {
    const data = localStorage.getItem(DISCOUNT_STORE_KEY);
    return data ? JSON.parse(data) : [];
  },
  async addDiscount(discount) {
    const discounts = await this.getDiscounts();
    const newDiscount = { id: Date.now().toString(), createdAt: new Date().toISOString(), isActive: false, ...discount };
    discounts.push(newDiscount);
    localStorage.setItem(DISCOUNT_STORE_KEY, JSON.stringify(discounts));
    return newDiscount;
  },
  async updateDiscount(id, updates) {
    let discounts = await this.getDiscounts();
    discounts = discounts.map(d => d.id === id ? { ...d, ...updates } : d);
    localStorage.setItem(DISCOUNT_STORE_KEY, JSON.stringify(discounts));
    return discounts.find(d => d.id === id);
  },
  async deleteDiscount(id) {
    let discounts = await this.getDiscounts();
    discounts = discounts.filter(d => d.id !== id);
    localStorage.setItem(DISCOUNT_STORE_KEY, JSON.stringify(discounts));
    // clear active if deleted
    if (localStorage.getItem(ACTIVE_DISCOUNT_KEY) === id) {
      localStorage.removeItem(ACTIVE_DISCOUNT_KEY);
    }
  },
  async getActiveDiscountId() {
    return localStorage.getItem(ACTIVE_DISCOUNT_KEY) || null;
  },
  async setActiveDiscount(id) {
    if (id) localStorage.setItem(ACTIVE_DISCOUNT_KEY, id);
    else localStorage.removeItem(ACTIVE_DISCOUNT_KEY);
    // ensure only one active flag mirrors storage
    const discounts = await this.getDiscounts();
    const updated = discounts.map(d => ({ ...d, isActive: d.id === id }));
    localStorage.setItem(DISCOUNT_STORE_KEY, JSON.stringify(updated));
  },
  async getActiveDiscount() {
    const id = await this.getActiveDiscountId();
    if (!id) return null;
    const discounts = await this.getDiscounts();
    return discounts.find(d => d.id === id) || null;
  },

  // --- Seeding / mock populate (SQLite sample vibe)
  async isSeeded() { return localStorage.getItem(SEEDED_KEY) === '1'; },

  // --- Drafts (Hold/Recall billing sessions) ---
  async getDrafts() {
    const data = localStorage.getItem(DRAFT_KEY);
    return data ? JSON.parse(data) : [];
  },
  async saveDraft(draft) {
    const drafts = await this.getDrafts();
    const newDraft = { id: 'DRAFT-' + Date.now().toString(), timestamp: new Date().toISOString(), ...draft };
    drafts.unshift(newDraft);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    return newDraft;
  },
  async deleteDraft(id) {
    let drafts = await this.getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  },
  async clearDrafts() {
    localStorage.removeItem(DRAFT_KEY);
  },
  async clearAll() {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(INVOICE_STORE_KEY);
    localStorage.removeItem(DISCOUNT_STORE_KEY);
    localStorage.removeItem(ACTIVE_DISCOUNT_KEY);
    localStorage.removeItem(CUSTOMER_STORE_KEY);
    localStorage.removeItem(SEEDED_KEY);
    localStorage.removeItem(USER_STORE_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  },
  async seedMock({ products, customers, discounts, invoices }) {
    localStorage.setItem(STORE_KEY, JSON.stringify(products||[]));
    const custMap = {};
    (customers||[]).forEach(c=> custMap[String(c.phone)] = { phone: String(c.phone), name: c.name||'', points: c.points||0, visits: c.visits||0, lastSeen: new Date().toISOString() });
    localStorage.setItem(CUSTOMER_STORE_KEY, JSON.stringify(custMap));
    localStorage.setItem(DISCOUNT_STORE_KEY, JSON.stringify(discounts||[]));
    localStorage.setItem(INVOICE_STORE_KEY, JSON.stringify(invoices||[]));
    localStorage.setItem(SEEDED_KEY, '1');
  },

  // --- Users / Auth ---
  async getUsers() {
    const data = localStorage.getItem(USER_STORE_KEY);
    return data ? JSON.parse(data) : [];
  },
  async seedDefaultUsers() {
    const users = await this.getUsers();
    if (users.length === 0) {
      const defaultUsers = [
        { id: 'u-admin', username: 'admin', password: 'admin123', type: 'admin', createdAt: new Date().toISOString() },
        { id: 'u-cashier', username: 'cashier', password: 'cashier123', type: 'cashier', createdAt: new Date().toISOString() },
        { id: 'u-guest', username: 'guest', password: 'guest123', type: 'guest', createdAt: new Date().toISOString() },
      ];
      localStorage.setItem(USER_STORE_KEY, JSON.stringify(defaultUsers));
    }
  },
  async authenticate(username, password) {
    const users = await this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      const session = { id: user.id, username: user.username, type: user.type, loginTime: new Date().toISOString() };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      return session;
    }
    return null;
  },
  async getCurrentUser() {
    const data = localStorage.getItem(AUTH_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },
  async logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
  },
  async addUser(userData) {
    const users = await this.getUsers();
    if (users.find(u => u.username === userData.username)) return null;
    const newUser = { id: 'u-' + Date.now().toString(), createdAt: new Date().toISOString(), ...userData };
    users.push(newUser);
    localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
    return newUser;
  },
  async updateUser(id, updates) {
    let users = await this.getUsers();
    users = users.map(u => u.id === id ? { ...u, ...updates } : u);
    localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
    return users.find(u => u.id === id);
  },
  async deleteUser(id) {
    let users = await this.getUsers();
    users = users.filter(u => u.id !== id);
    localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
  },
};
