/* ==========================================================================
   VENDOR BRIDGE - Dashboard SPA controller
   ========================================================================== */
const ALL = ['Admin', 'Procurement Officer', 'Vendor', 'Manager'];

const App = {
  user: null,
  meta: null,
  charts: {},
  state: { vendors: [], rfqs: [], quotations: [], pos: [], invoices: [], users: [] },

  MENU: [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', roles: ALL },
    { id: 'vendors', label: 'Vendors', icon: 'bi-people-fill', roles: ['Admin', 'Procurement Officer', 'Manager'] },
    { id: 'rfqs', label: 'RFQs', icon: 'bi-file-earmark-text-fill', roles: ALL },
    { id: 'quotations', label: 'Quotations', icon: 'bi-cash-stack', roles: ALL },
    { id: 'comparison', label: 'Compare Quotes', icon: 'bi-bar-chart-steps', roles: ['Admin', 'Procurement Officer', 'Manager'] },
    { id: 'approvals', label: 'Approvals', icon: 'bi-check2-square', roles: ['Admin', 'Manager'] },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: 'bi-receipt-cutoff', roles: ALL },
    { id: 'invoices', label: 'Invoices', icon: 'bi-receipt', roles: ALL },
    { id: 'activities', label: 'Activity Logs', icon: 'bi-clock-history', roles: ['Admin', 'Procurement Officer', 'Manager'] },
    { id: 'reports', label: 'Reports & Analytics', icon: 'bi-graph-up-arrow', roles: ['Admin', 'Procurement Officer', 'Manager'] },
    { id: 'users', label: 'User Management', icon: 'bi-person-fill-gear', roles: ['Admin'] },
  ],

  // ---------------------------------------------------------------- init
  async init() {
    this.user = VB.getUser();
    if (!this.user || !VB.getToken()) { location.href = 'index.html'; return; }

    // header
    document.getElementById('userName').textContent = this.user.name;
    document.getElementById('userRole').textContent = this.user.role;
    document.getElementById('userEmail').textContent = this.user.email;
    document.getElementById('userAvatar').textContent = (this.user.name || 'U').charAt(0).toUpperCase();

    this.buildMenu();

    try { this.meta = (await VB.get('/meta')).data; }
    catch (e) { this.meta = {}; }

    window.addEventListener('hashchange', () => this.route());
    this.route();
    this.loadNotifications();
    setInterval(() => this.loadNotifications(), 60000);
  },

  can(roles) { return roles.includes(this.user.role); },

  buildMenu() {
    const nav = document.getElementById('navMenu');
    nav.innerHTML = this.MENU
      .filter((m) => this.can(m.roles))
      .map((m) => `<a class="nav-link" id="nav-${m.id}" onclick="App.go('${m.id}')"><i class="bi ${m.icon}"></i> ${m.label}</a>`)
      .join('');
  },

  go(id) { location.hash = id; this.toggleSidebar(false); },

  route() {
    const id = (location.hash || '#dashboard').slice(1).split('?')[0];
    const item = this.MENU.find((m) => m.id === id) || this.MENU[0];
    if (!this.can(item.roles)) return this.go('dashboard');

    document.querySelectorAll('.nav-link').forEach((n) => n.classList.remove('active'));
    const active = document.getElementById(`nav-${item.id}`);
    if (active) active.classList.add('active');
    document.getElementById('pageTitle').textContent = item.label;

    const fn = `render_${item.id.replace(/-/g, '_')}`;
    if (this[fn]) this[fn]();
  },

  view(html) { document.getElementById('view').innerHTML = html; },
  loading() { this.view('<div class="spinner-wrap"><div class="spinner-border text-primary"></div></div>'); },

  toggleSidebar(force) {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    const show = force === undefined ? !sb.classList.contains('show') : force;
    sb.classList.toggle('show', show);
    bd.classList.toggle('show', show);
  },

  logout(e) {
    if (e) e.preventDefault();
    VB.clearAuth();
    location.href = 'index.html';
  },

  // ---------------------------------------------------------------- modal
  openModal({ title, body, footer, size }) {
    document.getElementById('vbModalTitle').textContent = title || '';
    document.getElementById('vbModalBody').innerHTML = body || '';
    document.getElementById('vbModalFooter').innerHTML = footer || '<button class="btn btn-light" data-bs-dismiss="modal">Close</button>';
    const dialog = document.getElementById('vbModalDialog');
    dialog.className = 'modal-dialog modal-dialog-centered ' + (size || '');
    const m = bootstrap.Modal.getOrCreateInstance(document.getElementById('vbModal'));
    m.show();
    return m;
  },
  closeModal() {
    const m = bootstrap.Modal.getInstance(document.getElementById('vbModal'));
    if (m) m.hide();
  },

  // ---------------------------------------------------------------- helpers
  async fetchList(url) { return (await VB.get(url)).data || []; },

  async pdf(url, filename, mode) {
    try {
      const res = await VB.request('GET', url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      
      if (mode === 'print') {
        const w = window.open(objUrl, '_blank');
        if (w) w.onload = () => setTimeout(() => w.print(), 300);
        setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
        return;
      }

      // Show in Preview Modal
      document.getElementById('vbModalTitle').innerHTML = `<i class="bi bi-file-earmark-pdf text-danger"></i> Document Preview`;
      document.getElementById('vbModalBody').innerHTML = `
        <iframe src="${objUrl}#toolbar=0" style="width: 100%; height: 65vh; border-radius: 8px; border: 1px solid var(--vb-border);" frameborder="0"></iframe>
      `;
      document.getElementById('vbModalFooter').innerHTML = `
        <button class="btn btn-light" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-primary" onclick="const a=document.createElement('a');a.href='${objUrl}';a.download='${filename}';a.click();"><i class="bi bi-download"></i> Download PDF</button>
      `;
      const modal = new bootstrap.Modal(document.getElementById('vbModal'));
      
      // Cleanup object URL when modal closes
      document.getElementById('vbModal').addEventListener('hidden.bs.modal', function cleanup() {
        URL.revokeObjectURL(objUrl);
        document.getElementById('vbModal').removeEventListener('hidden.bs.modal', cleanup);
      });
      
      modal.show();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  formVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; },
  emptyState(icon, text) { return `<div class="empty"><i class="bi ${icon}"></i><p class="mt-2">${text}</p></div>`; },

  exportCSV(filename, rows) {
    if (!rows || !rows.length) return VB.toast('No data to export', 'error');
    const keys = Object.keys(rows[0]);
    const csvContent = [
      keys.join(','),
      ...rows.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ================================================================ DASHBOARD
  async render_dashboard() {
    this.loading();
    try {
      const [stats, charts, summary] = await Promise.all([
        VB.get('/dashboard/stats'), VB.get('/dashboard/charts'), VB.get('/dashboard/summary'),
      ]);
      const s = stats.data;
      const kpis = [
        { label: 'Total Vendors', value: s.totalVendors, icon: 'bi-people', cls: 'indigo' },
        { label: 'Active RFQs', value: s.activeRFQs, icon: 'bi-file-earmark-text', cls: 'blue' },
        { label: 'Pending Approvals', value: s.pendingApprovals, icon: 'bi-hourglass-split', cls: 'amber' },
        { label: 'Approved RFQs', value: s.approvedRFQs, icon: 'bi-check2-circle', cls: 'green' },
        { label: 'Purchase Orders', value: s.purchaseOrders, icon: 'bi-receipt-cutoff', cls: 'purple' },
        { label: 'Invoices Generated', value: s.invoices, icon: 'bi-receipt', cls: 'teal' },
        { label: 'Monthly Spending', value: VB.inr(s.monthlySpending), icon: 'bi-calendar-month', cls: 'rose' },
        { label: 'Total Procurement Value', value: VB.inr(s.totalProcurementValue), icon: 'bi-cash-coin', cls: 'slate' },
      ];

      const quickActions = this.quickActionsFor();

      this.view(`
        <div class="row g-3 mb-1">
          ${kpis.map((k) => `
            <div class="col-6 col-md-4 col-xl-3">
              <div class="kpi ${k.cls}">
                <div class="kpi-top">
                  <span class="kpi-label">${k.label}</span>
                  <span class="kpi-icon"><i class="bi ${k.icon}"></i></span>
                </div>
                <div class="kpi-value">${k.value}</div>
              </div>
            </div>`).join('')}
        </div>

        ${quickActions ? `
        <div class="card mt-3"><div class="card-body">
          <div class="section-title mb-3"><i class="bi bi-lightning-charge-fill text-warning"></i> Quick Actions</div>
          <div class="row g-3">${quickActions}</div>
        </div></div>` : ''}

        <div class="row g-3 mt-1">
          <div class="col-lg-8">
            <div class="card h-100"><div class="card-header">Monthly Procurement Trends</div>
              <div class="card-body"><canvas id="chartTrend" height="110"></canvas></div></div>
          </div>
          <div class="col-lg-4">
            <div class="card h-100"><div class="card-header">RFQ Status Distribution</div>
              <div class="card-body"><canvas id="chartRfq" height="180"></canvas></div></div>
          </div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-lg-6">
            <div class="card h-100"><div class="card-header">Spending by Category</div>
              <div class="card-body"><canvas id="chartCat" height="170"></canvas></div></div>
          </div>
          <div class="col-lg-6">
            <div class="card h-100"><div class="card-header">Vendor Performance Score</div>
              <div class="card-body"><canvas id="chartVendor" height="170"></canvas></div></div>
          </div>
        </div>

        <div class="row g-3 mt-1">
          <div class="col-lg-7">
            <div class="card h-100"><div class="card-header">Recent Activities</div>
              <div class="card-body" id="recentActivities"></div></div>
          </div>
          <div class="col-lg-5">
            <div class="card h-100"><div class="card-header">Vendor Summary</div>
              <div class="card-body" id="vendorSummary"></div></div>
          </div>
        </div>
      `);

      this.drawCharts(charts.data);
      this.renderRecentActivities(summary.data.recentActivities);
      this.renderVendorSummary(summary.data.vendorByCategory);
    } catch (e) {
      this.view(this.emptyState('bi-exclamation-triangle', e.message));
    }
  },

  quickActionsFor() {
    const r = this.user.role;
    const a = [];
    if (r === 'Admin' || r === 'Procurement Officer') {
      a.push(['rfqs', 'bi-file-earmark-plus', 'New RFQ']);
      a.push(['vendors', 'bi-person-plus', 'Add Vendor']);
      a.push(['purchase-orders', 'bi-receipt-cutoff', 'Purchase Orders']);
      a.push(['invoices', 'bi-receipt', 'Invoices']);
    }
    if (r === 'Manager') {
      a.push(['approvals', 'bi-check2-square', 'Review Approvals']);
      a.push(['comparison', 'bi-bar-chart-steps', 'Compare Quotes']);
      a.push(['rfqs', 'bi-file-earmark-text', 'View RFQs']);
    }
    if (r === 'Vendor') {
      a.push(['rfqs', 'bi-file-earmark-text', 'View RFQs']);
      a.push(['quotations', 'bi-cash-stack', 'My Quotations']);
      a.push(['purchase-orders', 'bi-receipt-cutoff', 'My Orders']);
    }
    if (!a.length) return '';
    return a.map(([id, icon, label]) => `
      <div class="col-6 col-md-3"><div class="quick-action" onclick="App.go('${id}')">
        <i class="bi ${icon}"></i><div>${label}</div></div></div>`).join('');
  },

  drawCharts(d) {
    Object.values(this.charts).forEach((c) => c && c.destroy());
    this.charts = {};
    const palette = ['#4f46e5', '#6366f1', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e'];

    if (document.getElementById('chartTrend')) {
      this.charts.trend = new Chart('chartTrend', {
        type: 'line',
        data: {
          labels: d.monthlyTrend.labels,
          datasets: [{
            label: 'Procurement (₹)', data: d.monthlyTrend.values,
            borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.12)',
            fill: true, tension: 0.35, pointBackgroundColor: '#4f46e5',
          }],
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => '₹' + (v / 1000) + 'k' } } } },
      });
    }
    if (document.getElementById('chartRfq')) {
      this.charts.rfq = new Chart('chartRfq', {
        type: 'doughnut',
        data: { labels: d.rfqStatus.labels, datasets: [{ data: d.rfqStatus.values, backgroundColor: palette }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } },
      });
    }
    if (document.getElementById('chartCat')) {
      this.charts.cat = new Chart('chartCat', {
        type: 'doughnut',
        data: { labels: d.spendingByCategory.labels, datasets: [{ data: d.spendingByCategory.values, backgroundColor: palette }] },
        options: { plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } },
      });
    }
    if (document.getElementById('chartVendor')) {
      this.charts.vendor = new Chart('chartVendor', {
        type: 'bar',
        data: { labels: d.vendorPerformance.labels, datasets: [{ label: 'Score', data: d.vendorPerformance.values, backgroundColor: '#6366f1', borderRadius: 6 }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100 } } },
      });
    }
  },

  renderRecentActivities(items) {
    const el = document.getElementById('recentActivities');
    if (!el) return;
    if (!items.length) { el.innerHTML = this.emptyState('bi-clock-history', 'No activity yet'); return; }
    const icon = (a) => ({
      'User Login': 'bi-box-arrow-in-right', 'Vendor Added': 'bi-person-plus', 'RFQ Created': 'bi-file-earmark-plus',
      'Quotation Submitted': 'bi-cash-stack', 'Approval Completed': 'bi-check2-circle', 'PO Generated': 'bi-receipt-cutoff',
      'Invoice Generated': 'bi-receipt',
    }[a] || 'bi-dot');
    el.innerHTML = items.map((a) => `
      <div class="activity-item">
        <div class="activity-dot"><i class="bi ${icon(a.action)}"></i></div>
        <div class="flex-grow-1">
          <div style="font-weight:600; font-size:14px;">${VB.escape(a.action)}</div>
          <div class="muted" style="font-size:13px;">${VB.escape(a.description || '')}</div>
        </div>
        <div class="muted" style="font-size:12px; white-space:nowrap;">${VB.timeAgo(a.createdAt)}</div>
      </div>`).join('');
  },

  renderVendorSummary(byCat) {
    const el = document.getElementById('vendorSummary');
    if (!el) return;
    if (!byCat.length) { el.innerHTML = this.emptyState('bi-people', 'No vendors yet'); return; }
    const total = byCat.reduce((s, c) => s + c.count, 0);
    el.innerHTML = byCat.map((c) => {
      const pct = Math.round((c.count / total) * 100);
      return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1"><span style="font-weight:600;">${VB.escape(c._id)}</span><span class="muted">${c.count}</span></div>
        <div class="progress" style="height:8px;"><div class="progress-bar" style="width:${pct}%; background:#4f46e5;"></div></div>
      </div>`;
    }).join('');
  },

  // ================================================================ VENDORS
  async render_vendors() {
    this.loading();
    const cats = (this.meta.vendorCategories || []);
    const sts = (this.meta.vendorStatuses || []);
    const canEdit = this.can(['Admin', 'Procurement Officer']);
    const canDelete = this.can(['Admin']);
    try {
      const vendors = await this.fetchList('/vendors?limit=200');
      this.state.vendors = vendors;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="vSearch" placeholder="🔍 Search vendors..." oninput="App.filterVendors()" />
          <select class="form-select" style="max-width:170px" id="vCat" onchange="App.filterVendors()">
            <option value="">All Categories</option>${cats.map((c) => `<option>${c}</option>`).join('')}
          </select>
          <select class="form-select" style="max-width:160px" id="vStatus" onchange="App.filterVendors()">
            <option value="">All Status</option>${sts.map((c) => `<option>${c}</option>`).join('')}
          </select>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn-outline-success" onclick="App.exportCSV('vendors.csv', App.state.vendors)"><i class="bi bi-file-earmark-spreadsheet"></i> Export</button>
            ${canEdit ? '<button class="btn btn-primary" onclick="App.vendorForm()"><i class="bi bi-plus-lg"></i> Add Vendor</button>' : ''}
          </div>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>Vendor ID</th><th>Company</th><th>Contact</th><th>Category</th><th>Rating</th><th>Performance</th><th>Status</th>
          ${canEdit ? '<th class="text-end">Actions</th>' : ''}
        </tr></thead><tbody id="vendorRows"></tbody></table></div>
      `);
      this.renderVendorRows(vendors, canEdit, canDelete);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderVendorRows(vendors, canEdit, canDelete) {
    const el = document.getElementById('vendorRows');
    if (!vendors.length) { el.innerHTML = `<tr><td colspan="8">${this.emptyState('bi-people', 'No vendors found')}</td></tr>`; return; }
    el.innerHTML = vendors.map((v) => `
      <tr>
        <td><span class="fw-semibold">${VB.escape(v.vendorId)}</span></td>
        <td><div class="fw-semibold">${VB.escape(v.companyName)}</div><div class="muted" style="font-size:12px">${VB.escape(v.email)}</div></td>
        <td>${VB.escape(v.contactPerson)}<div class="muted" style="font-size:12px">${VB.escape(v.phone)}</div></td>
        <td>${VB.badge(v.category)}</td>
        <td>${VB.stars(v.rating)} <span class="muted">${v.rating}</span></td>
        <td><div class="progress" style="height:6px;width:80px"><div class="progress-bar bg-primary" style="width:${v.performanceScore}%"></div></div><span class="muted" style="font-size:12px">${v.performanceScore}/100</span></td>
        <td>${VB.badge(v.status)}</td>
        ${canEdit ? `<td class="text-end">
          <button class="btn btn-sm btn-light" onclick="App.vendorForm('${v._id}')" title="Edit"><i class="bi bi-pencil"></i></button>
          ${canDelete ? `<button class="btn btn-sm btn-light text-danger" onclick="App.deleteVendor('${v._id}')" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
        </td>` : ''}
      </tr>`).join('');
  },

  filterVendors() {
    const q = this.formVal('vSearch').toLowerCase();
    const cat = this.formVal('vCat'); const st = this.formVal('vStatus');
    const filtered = this.state.vendors.filter((v) =>
      (!cat || v.category === cat) && (!st || v.status === st) &&
      (!q || (v.companyName + v.contactPerson + v.email + v.vendorId + v.gstNumber).toLowerCase().includes(q)));
    this.renderVendorRows(filtered, this.can(['Admin', 'Procurement Officer']), this.can(['Admin']));
  },

  vendorForm(id) {
    const v = id ? this.state.vendors.find((x) => x._id === id) : {};
    const cats = this.meta.vendorCategories || [];
    const sts = this.meta.vendorStatuses || [];
    this.openModal({
      title: id ? 'Edit Vendor' : 'Add Vendor',
      size: 'modal-lg',
      body: `<form id="vendorForm" class="row g-3">
        <div class="col-md-6"><label class="form-label">Company Name *</label><input class="form-control" id="f_companyName" value="${VB.escape(v.companyName || '')}" required></div>
        <div class="col-md-6"><label class="form-label">Contact Person *</label><input class="form-control" id="f_contactPerson" value="${VB.escape(v.contactPerson || '')}" required></div>
        <div class="col-md-6"><label class="form-label">Email *</label><input type="email" class="form-control" id="f_email" value="${VB.escape(v.email || '')}" required></div>
        <div class="col-md-6"><label class="form-label">Phone *</label><input class="form-control" id="f_phone" value="${VB.escape(v.phone || '')}" required></div>
        <div class="col-md-6"><label class="form-label">GST Number</label><input class="form-control" id="f_gstNumber" value="${VB.escape(v.gstNumber || '')}" placeholder="27ABCDE1234F1Z5"></div>
        <div class="col-md-6"><label class="form-label">Category *</label><select class="form-select" id="f_category">${cats.map((c) => `<option ${v.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="col-12"><label class="form-label">Address</label><input class="form-control" id="f_address" value="${VB.escape(v.address || '')}"></div>
        <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" id="f_status">${sts.map((c) => `<option ${v.status === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-4"><label class="form-label">Rating (0-5)</label><input type="number" step="0.5" min="0" max="5" class="form-control" id="f_rating" value="${v.rating ?? 3}"></div>
        <div class="col-md-4"><label class="form-label">Performance (0-100)</label><input type="number" min="0" max="100" class="form-control" id="f_performanceScore" value="${v.performanceScore ?? 70}"></div>
      </form>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" onclick="App.saveVendor('${id || ''}')">${id ? 'Update' : 'Create'} Vendor</button>`,
    });
  },

  async saveVendor(id) {
    const payload = {
      companyName: this.formVal('f_companyName'), contactPerson: this.formVal('f_contactPerson'),
      email: this.formVal('f_email'), phone: this.formVal('f_phone'), gstNumber: this.formVal('f_gstNumber'),
      category: this.formVal('f_category'), address: this.formVal('f_address'), status: this.formVal('f_status'),
      rating: Number(this.formVal('f_rating')), performanceScore: Number(this.formVal('f_performanceScore')),
    };
    if (!payload.companyName || !payload.contactPerson || !payload.email || !payload.phone) {
      return VB.toast('Please fill all required fields.', 'error');
    }
    try {
      if (id) await VB.put(`/vendors/${id}`, payload);
      else await VB.post('/vendors', payload);
      this.closeModal();
      VB.toast(`Vendor ${id ? 'updated' : 'created'} successfully.`);
      this.render_vendors();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  deleteVendor(id) {
    const v = this.state.vendors.find((x) => x._id === id);
    this.confirm(`Delete vendor "${v ? v.companyName : ''}"? This cannot be undone.`, async () => {
      try { await VB.del(`/vendors/${id}`); VB.toast('Vendor deleted.'); this.render_vendors(); }
      catch (e) { VB.toast(e.message, 'error'); }
    });
  },

  // ================================================================ RFQs
  async render_rfqs() {
    this.loading();
    const sts = this.meta.rfqStatuses || [];
    const canManage = this.can(['Admin', 'Procurement Officer']);
    const isVendor = this.user.role === 'Vendor';
    try {
      const rfqs = await this.fetchList('/rfqs?limit=200');
      this.state.rfqs = rfqs;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="rSearch" placeholder="🔍 Search RFQs..." oninput="App.filterRFQs()" />
          <select class="form-select" style="max-width:170px" id="rStatus" onchange="App.filterRFQs()">
            <option value="">All Status</option>${sts.map((c) => `<option>${c}</option>`).join('')}
          </select>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn-outline-success" onclick="App.exportCSV('rfqs.csv', App.state.rfqs)"><i class="bi bi-file-earmark-spreadsheet"></i> Export</button>
            <div class="btn-group">
              <button class="btn btn-outline-secondary ${this.state.rfqView !== 'kanban' ? 'active' : ''}" onclick="App.state.rfqView='list';App.render_rfqs()"><i class="bi bi-list-ul"></i></button>
              <button class="btn btn-outline-secondary ${this.state.rfqView === 'kanban' ? 'active' : ''}" onclick="App.state.rfqView='kanban';App.render_rfqs()"><i class="bi bi-kanban"></i></button>
            </div>
            ${canManage ? '<button class="btn btn-primary" onclick="App.rfqForm()"><i class="bi bi-plus-lg"></i> New RFQ</button>' : ''}
          </div>
        </div>
        ${this.state.rfqView === 'kanban' ? `<div id="rfqKanbanBoard" class="d-flex gap-3 overflow-x-auto pb-3" style="min-height: 60vh;"></div>` : `
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>RFQ #</th><th>Title</th><th>Product</th><th>Qty</th><th>Deadline</th><th>Vendors</th><th>Status</th><th class="text-end">Actions</th>
        </tr></thead><tbody id="rfqRows"></tbody></table></div>
        `}
      `);
      if (this.state.rfqView === 'kanban') {
        this.renderRFQKanban(rfqs, canManage, isVendor);
      } else {
        this.renderRFQRows(rfqs, canManage, isVendor);
      }
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderRFQRows(rfqs, canManage, isVendor) {
    const el = document.getElementById('rfqRows');
    if (!rfqs.length) { el.innerHTML = `<tr><td colspan="8">${this.emptyState('bi-file-earmark-text', 'No RFQs found')}</td></tr>`; return; }
    el.innerHTML = rfqs.map((r) => `
      <tr>
        <td class="fw-semibold">${VB.escape(r.rfqNumber)}</td>
        <td>${VB.escape(r.title)}<div class="muted" style="font-size:12px">${VB.escape(r.productCategory)}</div></td>
        <td>${VB.escape(r.productName)}</td>
        <td>${r.quantity} ${VB.escape(r.unit || '')}</td>
        <td>${VB.date(r.deadline)}</td>
        <td><span class="badge bg-light text-dark border">${(r.assignedVendors || []).length} vendor(s)</span></td>
        <td>${VB.badge(r.status)}</td>
        <td class="text-end" style="white-space:nowrap">
          <button class="btn btn-sm btn-light" onclick="App.viewRFQ('${r._id}')" title="View"><i class="bi bi-eye"></i></button>
          ${this.can(['Admin', 'Procurement Officer', 'Manager']) ? `<button class="btn btn-sm btn-light" onclick="App.go('comparison');setTimeout(()=>App.loadComparison('${r._id}'),300)" title="Compare"><i class="bi bi-bar-chart-steps"></i></button>` : ''}
          ${isVendor && ['Sent', 'Open'].includes(r.status) ? `<button class="btn btn-sm btn-primary" onclick="App.quotationForm('${r._id}')">Submit Quote</button>` : ''}
          ${canManage ? `<button class="btn btn-sm btn-light" onclick="App.rfqForm('${r._id}')" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-light text-danger" onclick="App.deleteRFQ('${r._id}')" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');
  },

  filterRFQs() {
    const q = this.formVal('rSearch').toLowerCase(); const st = this.formVal('rStatus');
    const f = this.state.rfqs.filter((r) => (!st || r.status === st) &&
      (!q || (r.rfqNumber + r.title + r.productName).toLowerCase().includes(q)));
    if (this.state.rfqView === 'kanban') {
      this.renderRFQKanban(f, this.can(['Admin', 'Procurement Officer']), this.user.role === 'Vendor');
    } else {
      this.renderRFQRows(f, this.can(['Admin', 'Procurement Officer']), this.user.role === 'Vendor');
    }
  },

  renderRFQKanban(rfqs, canManage, isVendor) {
    const el = document.getElementById('rfqKanbanBoard');
    if (!el) return;
    
    // Define the columns/statuses we want in the board
    const columns = ['Draft', 'Sent', 'Open', 'Closed', 'Approved', 'Rejected'];
    
    let html = '';
    columns.forEach(status => {
      const colRfqs = rfqs.filter(r => r.status === status);
      
      html += `
        <div class="kanban-col bg-light rounded p-2" style="min-width: 300px; width: 300px; flex-shrink: 0; display: flex; flex-direction: column;" 
             ondragover="event.preventDefault(); this.classList.add('bg-secondary', 'bg-opacity-10')" 
             ondragleave="this.classList.remove('bg-secondary', 'bg-opacity-10')" 
             ondrop="event.preventDefault(); this.classList.remove('bg-secondary', 'bg-opacity-10'); App.dropRFQ(event, '${status}')">
          <div class="d-flex justify-content-between align-items-center mb-3 px-1">
            <h6 class="mb-0 fw-bold">${status}</h6>
            <span class="badge bg-secondary rounded-pill">${colRfqs.length}</span>
          </div>
          <div class="kanban-cards d-flex flex-column gap-2" style="flex-grow: 1;">
            ${colRfqs.map(r => `
              <div class="card shadow-sm cursor-pointer border-0 kanban-card" 
                   draggable="${canManage ? 'true' : 'false'}" 
                   ondragstart="event.dataTransfer.setData('text/plain', '${r._id}'); event.target.classList.add('opacity-50')"
                   ondragend="event.target.classList.remove('opacity-50')"
                   onclick="App.viewRFQ('${r._id}')">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between mb-2">
                    <span class="badge bg-primary bg-opacity-10 text-primary border-0">${VB.escape(r.rfqNumber)}</span>
                    <span class="text-muted small"><i class="bi bi-clock"></i> ${VB.date(r.deadline)}</span>
                  </div>
                  <h6 class="card-title mb-1 fw-semibold">${VB.escape(r.title)}</h6>
                  <p class="card-text text-muted small mb-2 text-truncate">${VB.escape(r.productName)}</p>
                  
                  <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                    <span class="badge bg-light text-dark border"><i class="bi bi-people"></i> ${(r.assignedVendors || []).length}</span>
                    <div class="btn-group" onclick="event.stopPropagation()">
                      ${this.can(['Admin', 'Procurement Officer', 'Manager']) ? `<button class="btn btn-sm btn-light py-0 px-2" onclick="App.go('comparison');setTimeout(()=>App.loadComparison('${r._id}'),300)" title="Compare Quotes"><i class="bi bi-bar-chart-steps"></i></button>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
            ${colRfqs.length === 0 ? `<div class="p-3 text-center text-muted small border border-dashed rounded bg-white">Drop RFQs here</div>` : ''}
          </div>
        </div>
      `;
    });
    
    el.innerHTML = html;
  },

  async dropRFQ(e, newStatus) {
    const rfqId = e.dataTransfer.getData('text/plain');
    if (!rfqId) return;
    
    const rfq = this.state.rfqs.find(r => r._id === rfqId);
    if (!rfq || rfq.status === newStatus) return;
    
    try {
      await VB.put('/rfqs/' + rfqId, { status: newStatus });
      VB.toast(`RFQ moved to ${newStatus}`);
      rfq.status = newStatus;
      
      // Re-render
      if (this.state.rfqView === 'kanban') {
        this.renderRFQKanban(this.state.rfqs, this.can(['Admin', 'Procurement Officer']), this.user.role === 'Vendor');
      }
    } catch (err) {
      VB.toast(err.message, 'error');
    }
  },

  async rfqForm(id) {
    const cats = this.meta.vendorCategories || [];
    const units = this.meta.units || [];
    const sts = this.meta.rfqStatuses || [];
    const vendors = this.state.vendors.length ? this.state.vendors : await this.fetchList('/vendors?limit=200');
    this.state.vendors = vendors;
    const r = id ? this.state.rfqs.find((x) => x._id === id) : {};
    const assigned = (r.assignedVendors || []).map((a) => (typeof a === 'string' ? a : a._id));
    const today = new Date(); today.setDate(today.getDate() + 14);
    const defDeadline = (r.deadline ? new Date(r.deadline) : today).toISOString().slice(0, 10);

    this.openModal({
      title: id ? 'Edit RFQ' : 'New RFQ', size: 'modal-lg',
      body: `<form id="rfqForm" class="row g-3">
        <div class="col-md-8"><label class="form-label">RFQ Title *</label><input class="form-control" id="f_title" value="${VB.escape(r.title || '')}"></div>
        <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" id="f_status">${sts.map((c) => `<option ${r.status === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-6"><label class="form-label">Product Name *</label><input class="form-control" id="f_productName" value="${VB.escape(r.productName || '')}"></div>
        <div class="col-md-6"><label class="form-label">Category *</label><select class="form-select" id="f_productCategory">${cats.map((c) => `<option ${r.productCategory === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-4"><label class="form-label">Quantity *</label><input type="number" min="1" class="form-control" id="f_quantity" value="${r.quantity || 1}"></div>
        <div class="col-md-4"><label class="form-label">Unit</label><select class="form-select" id="f_unit">${units.map((c) => `<option ${r.unit === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-4"><label class="form-label">Deadline *</label><input type="date" class="form-control" id="f_deadline" value="${defDeadline}"></div>
        <div class="col-12"><label class="form-label">Description</label><textarea class="form-control" id="f_description" rows="2">${VB.escape(r.description || '')}</textarea></div>
        <div class="col-12"><label class="form-label">Specifications</label><textarea class="form-control" id="f_specifications" rows="2">${VB.escape(r.specifications || '')}</textarea></div>
        <div class="col-12"><label class="form-label">Assign Vendors <span class="muted">(Ctrl/Cmd-click to multi-select)</span></label>
          <select multiple class="form-select" id="f_assignedVendors" size="5">
            ${vendors.filter((v) => v.status === 'Active').map((v) => `<option value="${v._id}" ${assigned.includes(v._id) ? 'selected' : ''}>${VB.escape(v.companyName)} — ${v.category}</option>`).join('')}
          </select></div>
      </form>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" onclick="App.saveRFQ('${id || ''}')">${id ? 'Update' : 'Create'} RFQ</button>`,
    });
  },

  async saveRFQ(id) {
    const sel = document.getElementById('f_assignedVendors');
    const assignedVendors = sel ? Array.from(sel.selectedOptions).map((o) => o.value) : [];
    const payload = {
      title: this.formVal('f_title'), productName: this.formVal('f_productName'),
      productCategory: this.formVal('f_productCategory'), quantity: Number(this.formVal('f_quantity')),
      unit: this.formVal('f_unit'), deadline: this.formVal('f_deadline'),
      description: this.formVal('f_description'), specifications: this.formVal('f_specifications'),
      status: this.formVal('f_status'), assignedVendors,
    };
    if (!payload.title || !payload.productName || !payload.quantity || !payload.deadline) {
      return VB.toast('Please fill all required fields.', 'error');
    }
    try {
      if (id) await VB.put(`/rfqs/${id}`, payload);
      else await VB.post('/rfqs', payload);
      this.closeModal();
      VB.toast(`RFQ ${id ? 'updated' : 'created'} successfully.`);
      this.render_rfqs();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  deleteRFQ(id) {
    const r = this.state.rfqs.find((x) => x._id === id);
    this.confirm(`Delete RFQ "${r ? r.rfqNumber : ''}"?`, async () => {
      try { await VB.del(`/rfqs/${id}`); VB.toast('RFQ deleted.'); this.render_rfqs(); }
      catch (e) { VB.toast(e.message, 'error'); }
    });
  },

  async viewRFQ(id) {
    try {
      const r = (await VB.get(`/rfqs/${id}`)).data;
      const vendors = (r.assignedVendors || []).map((v) => `<span class="badge bg-light text-dark border me-1">${VB.escape(v.companyName)}</span>`).join('') || '<span class="muted">None</span>';
      this.openModal({
        title: `${r.rfqNumber} — ${VB.escape(r.title)}`, size: 'modal-lg',
        body: `<div class="row g-3">
          <div class="col-md-6"><div class="muted small">Product</div><div class="fw-semibold">${VB.escape(r.productName)}</div></div>
          <div class="col-md-3"><div class="muted small">Category</div>${VB.badge(r.productCategory)}</div>
          <div class="col-md-3"><div class="muted small">Status</div>${VB.badge(r.status)}</div>
          <div class="col-md-3"><div class="muted small">Quantity</div><div class="fw-semibold">${r.quantity} ${VB.escape(r.unit || '')}</div></div>
          <div class="col-md-3"><div class="muted small">Deadline</div><div class="fw-semibold">${VB.date(r.deadline)}</div></div>
          <div class="col-md-6"><div class="muted small">Created By</div><div>${VB.escape((r.createdBy && r.createdBy.name) || '-')}</div></div>
          <div class="col-12"><div class="muted small">Description</div><div>${VB.escape(r.description || '-')}</div></div>
          <div class="col-12"><div class="muted small">Specifications</div><div>${VB.escape(r.specifications || '-')}</div></div>
          <div class="col-12"><div class="muted small">Assigned Vendors</div><div>${vendors}</div></div>
          ${r.approval && r.approval.decidedAt ? `<div class="col-12"><div class="alert alert-light border mb-0"><b>Approval:</b> ${VB.badge(r.status)} by ${VB.escape((r.approval.decidedBy && r.approval.decidedBy.name) || '-')} on ${VB.date(r.approval.decidedAt)}<br><span class="muted">${VB.escape(r.approval.remarks || '')}</span></div></div>` : ''}
        </div>`,
        footer: `<button class="btn btn-light" data-bs-dismiss="modal">Close</button>
          ${this.can(['Admin', 'Procurement Officer', 'Manager']) ? `<button class="btn btn-primary" onclick="App.closeModal();App.go('comparison');setTimeout(()=>App.loadComparison('${r._id}'),300)">Compare Quotations</button>` : ''}`,
      });
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ QUOTATIONS
  async render_quotations() {
    this.loading();
    const isVendor = this.user.role === 'Vendor';
    const canManage = this.can(['Admin', 'Procurement Officer']);
    try {
      const quotations = await this.fetchList('/quotations?limit=200');
      this.state.quotations = quotations;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="qSearch" placeholder="🔍 Search quotations..." oninput="App.filterQuotations()" />
          <div class="ms-auto">${(isVendor || canManage) ? '<button class="btn btn-primary" onclick="App.quotationForm()"><i class="bi bi-plus-lg"></i> Submit Quotation</button>' : ''}</div>
        </div>
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>Quote #</th><th>RFQ</th><th>Vendor</th><th>Price/Unit</th><th>Total (₹)</th><th>Delivery</th><th>Warranty</th><th>Status</th>${canManage ? '<th></th>' : ''}
        </tr></thead><tbody id="quoteRows"></tbody></table></div>
      `);
      this.renderQuoteRows(quotations, canManage);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderQuoteRows(quotations, canManage) {
    const el = document.getElementById('quoteRows');
    if (!quotations.length) { el.innerHTML = `<tr><td colspan="9">${this.emptyState('bi-cash-stack', 'No quotations found')}</td></tr>`; return; }
    el.innerHTML = quotations.map((q) => `
      <tr>
        <td class="fw-semibold">${VB.escape(q.quotationNumber)}</td>
        <td>${q.rfq ? VB.escape(q.rfq.rfqNumber) : '-'}<div class="muted" style="font-size:12px">${q.rfq ? VB.escape(q.rfq.title) : ''}</div></td>
        <td>${q.vendor ? VB.escape(q.vendor.companyName) : '-'}</td>
        <td>${VB.inr(q.pricePerUnit)}</td>
        <td class="fw-semibold">${VB.inr(q.totalAmount)}</td>
        <td>${q.deliveryTimeline} days</td>
        <td>${VB.escape(q.warranty || '-')}</td>
        <td>${VB.badge(q.status)}</td>
        ${canManage ? `<td class="text-end"><select class="form-select form-select-sm" style="width:130px" onchange="App.updateQuoteStatus('${q._id}', this.value)">
          ${(this.meta.quotationStatuses || []).map((s) => `<option ${q.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select></td>` : ''}
      </tr>`).join('');
  },

  filterQuotations() {
    const q = this.formVal('qSearch').toLowerCase();
    const f = this.state.quotations.filter((x) =>
      (x.quotationNumber + (x.rfq ? x.rfq.rfqNumber + x.rfq.title : '') + (x.vendor ? x.vendor.companyName : '')).toLowerCase().includes(q));
    this.renderQuoteRows(f, this.can(['Admin', 'Procurement Officer']));
  },

  async updateQuoteStatus(id, status) {
    try { await VB.put(`/quotations/${id}`, { status }); VB.toast(`Quotation marked ${status}.`); }
    catch (e) { VB.toast(e.message, 'error'); }
  },

  async quotationForm(rfqId) {
    const isVendor = this.user.role === 'Vendor';
    // RFQs available to quote on
    let rfqs = this.state.rfqs.length ? this.state.rfqs : await this.fetchList('/rfqs?limit=200');
    rfqs = rfqs.filter((r) => ['Sent', 'Open', 'Draft'].includes(r.status));
    if (!rfqs.length) return VB.toast('No open RFQs available to quote on.', 'error');
    const vendors = this.state.vendors.length ? this.state.vendors : (isVendor ? [] : await this.fetchList('/vendors?limit=200'));
    if (!isVendor) this.state.vendors = vendors;

    const selectedRfq = rfqId ? rfqs.find((r) => r._id === rfqId) || rfqs[0] : rfqs[0];

    this.openModal({
      title: 'Submit Quotation', size: 'modal-lg',
      body: `<form id="quoteForm" class="row g-3">
        <div class="col-md-${isVendor ? '12' : '6'}"><label class="form-label">RFQ *</label>
          <select class="form-select" id="f_rfq">${rfqs.map((r) => `<option value="${r._id}" ${selectedRfq && selectedRfq._id === r._id ? 'selected' : ''}>${r.rfqNumber} — ${VB.escape(r.title)} (Qty: ${r.quantity})</option>`).join('')}</select></div>
        ${isVendor ? '' : `<div class="col-md-6"><label class="form-label">Vendor *</label>
          <select class="form-select" id="f_vendor">${vendors.map((v) => `<option value="${v._id}">${VB.escape(v.companyName)}</option>`).join('')}</select></div>`}
        <div class="col-md-4"><label class="form-label">Price Per Unit (₹) *</label><input type="number" min="0" step="0.01" class="form-control" id="f_pricePerUnit"></div>
        <div class="col-md-4"><label class="form-label">GST / Tax %</label><input type="number" min="0" class="form-control" id="f_taxPercent" value="18"></div>
        <div class="col-md-4"><label class="form-label">Delivery (days) *</label><input type="number" min="1" class="form-control" id="f_deliveryTimeline" value="7"></div>
        <div class="col-md-6"><label class="form-label">Warranty</label><input class="form-control" id="f_warranty" placeholder="e.g. 1 Year"></div>
        <div class="col-md-6"><label class="form-label">Additional Notes</label><input class="form-control" id="f_notes"></div>
      </form>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" onclick="App.saveQuotation()">Submit Quotation</button>`,
    });
  },

  async saveQuotation() {
    const payload = {
      rfq: this.formVal('f_rfq'),
      pricePerUnit: Number(this.formVal('f_pricePerUnit')),
      taxPercent: Number(this.formVal('f_taxPercent') || 18),
      deliveryTimeline: Number(this.formVal('f_deliveryTimeline')),
      warranty: this.formVal('f_warranty'), notes: this.formVal('f_notes'),
    };
    const vendorEl = document.getElementById('f_vendor');
    if (vendorEl) payload.vendor = vendorEl.value;
    if (!payload.rfq || !payload.pricePerUnit || !payload.deliveryTimeline) {
      return VB.toast('Please fill all required fields.', 'error');
    }
    try {
      await VB.post('/quotations', payload);
      this.closeModal();
      VB.toast('Quotation submitted successfully.');
      this.render_quotations();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ COMPARISON
  async render_comparison() {
    this.loading();
    try {
      const rfqs = await this.fetchList('/rfqs?limit=200');
      this.state.rfqs = rfqs;
      const candidates = rfqs.filter((r) => ['Open', 'Closed', 'Approved', 'Sent'].includes(r.status));
      this.view(`
        <div class="card mb-3"><div class="card-body">
          <label class="form-label fw-semibold">Select an RFQ to compare quotations</label>
          <select class="form-select" id="cmpRfq" onchange="App.loadComparison(this.value)" style="max-width:520px">
            <option value="">— Choose RFQ —</option>
            ${candidates.map((r) => `<option value="${r._id}">${r.rfqNumber} — ${VB.escape(r.title)} (${r.status})</option>`).join('')}
          </select>
        </div></div>
        <div id="cmpResult">${this.emptyState('bi-bar-chart-steps', 'Select an RFQ above to view the side-by-side comparison.')}</div>
      `);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  async loadComparison(rfqId) {
    if (!rfqId) return;
    const sel = document.getElementById('cmpRfq'); if (sel) sel.value = rfqId;
    const box = document.getElementById('cmpResult');
    if (box) box.innerHTML = '<div class="spinner-wrap"><div class="spinner-border text-primary"></div></div>';
    try {
      const res = await VB.get(`/quotations/compare/${rfqId}`);
      const aiRes = await VB.get(`/quotations/compare/${rfqId}/ai-insights`).catch(() => null);
      
      const { rfq, data: quotes, highlights } = res;
      const canApprove = this.can(['Admin', 'Manager']);
      const canManage = this.can(['Admin', 'Procurement Officer']);
      if (!quotes.length) { box.innerHTML = this.emptyState('bi-inbox', 'No quotations submitted for this RFQ yet.'); return; }

      let aiCardHtml = '';
      if (aiRes && aiRes.insight) {
        // Convert markdown bold (**text**) to HTML <strong>
        const formattedInsight = aiRes.insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        aiCardHtml = `
          <div class="card mb-3 border-info bg-info bg-opacity-10">
            <div class="card-body">
              <div class="d-flex gap-3 align-items-center">
                <div class="fs-1 text-info"><i class="bi bi-robot"></i></div>
                <div>
                  <h6 class="text-info mb-1 fw-bold">AI Smart Suggestion</h6>
                  <p class="mb-0 text-dark">${formattedInsight}</p>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      box.innerHTML = `
        ${aiCardHtml}
        <div class="card mb-3"><div class="card-body d-flex flex-wrap gap-4 align-items-center">
          <div><div class="muted small">RFQ</div><div class="fw-semibold">${rfq.rfqNumber} — ${VB.escape(rfq.title)}</div></div>
          <div><div class="muted small">Quantity</div><div class="fw-semibold">${rfq.quantity} ${VB.escape(rfq.unit || '')}</div></div>
          <div><div class="muted small">Status</div>${VB.badge(rfq.status)}</div>
          <div class="ms-auto muted small"><span class="tag-best">BEST</span> = lowest price / fastest / top rated</div>
        </div></div>
        <div class="table-wrap"><table class="table align-middle"><thead><tr>
          <th>Vendor</th><th>Quotation Amount</th><th>Price/Unit</th><th>Delivery</th><th>Rating</th><th>Warranty</th><th>Status</th>
          ${canApprove || canManage ? '<th class="text-end">Action</th>' : ''}
        </tr></thead><tbody>
          ${quotes.map((q) => {
        const low = String(q._id) === String(highlights.lowestPriceId);
        const fast = String(q._id) === String(highlights.fastestId);
        const top = String(q._id) === String(highlights.topRatedId);
        return `<tr class="${low ? 'compare-best' : ''}">
            <td class="fw-semibold">${q.vendor ? VB.escape(q.vendor.companyName) : '-'}</td>
            <td class="fw-semibold">${VB.inr(q.totalAmount)} ${low ? '<span class="tag-best">LOWEST</span>' : ''}</td>
            <td>${VB.inr(q.pricePerUnit)}</td>
            <td>${q.deliveryTimeline} days ${fast ? '<span class="tag-best">FASTEST</span>' : ''}</td>
            <td>${VB.stars(q.vendor ? q.vendor.rating : 0)} ${top ? '<span class="tag-best">TOP</span>' : ''}</td>
            <td>${VB.escape(q.warranty || '-')}</td>
            <td>${VB.badge(q.status)}</td>
            ${canApprove ? `<td class="text-end"><button class="btn btn-sm btn-success" onclick="App.approveWithQuote('${rfq._id}','${q._id}')" ${rfq.status === 'Approved' || rfq.status === 'Closed' ? 'disabled' : ''}><i class="bi bi-check2"></i> Approve</button></td>`
            : canManage ? `<td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="App.updateQuoteStatus('${q._id}','Accepted').then(()=>App.loadComparison('${rfq._id}'))">Accept</button></td>` : ''}
          </tr>`;
      }).join('')}
        </tbody></table></div>
        ${canManage && rfq.status === 'Approved' ? `<div class="mt-3"><button class="btn btn-primary" onclick="App.generatePOFromAccepted('${rfq._id}')"><i class="bi bi-receipt-cutoff"></i> Generate Purchase Order from Accepted Quote</button></div>` : ''}
      `;
    } catch (e) { box.innerHTML = this.emptyState('bi-exclamation-triangle', e.message); }
  },

  approveWithQuote(rfqId, quotationId) {
    this.openModal({
      title: 'Approve RFQ',
      body: `<p>Approve this RFQ and accept the selected vendor's quotation?</p>
        <label class="form-label">Approval Remarks</label>
        <textarea class="form-control" id="f_remarks" rows="3" placeholder="Optional remarks...">Approved — best value among submitted quotations.</textarea>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success" onclick="App.doApprove('${rfqId}','${quotationId}')">Confirm Approval</button>`,
    });
  },

  async doApprove(rfqId, quotationId) {
    try {
      await VB.post(`/approvals/${rfqId}/approve`, { remarks: this.formVal('f_remarks'), acceptedQuotation: quotationId });
      this.closeModal(); VB.toast('RFQ approved & quotation accepted.');
      this.loadComparison(rfqId);
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  async generatePOFromAccepted(rfqId) {
    try {
      const quotes = await this.fetchList(`/quotations?rfq=${rfqId}&status=Accepted&limit=10`);
      if (!quotes.length) return VB.toast('No accepted quotation found for this RFQ.', 'error');
      await VB.post('/purchase-orders', { quotationId: quotes[0]._id });
      VB.toast('Purchase Order generated successfully.');
      this.go('purchase-orders');
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ APPROVALS
  async render_approvals() {
    this.loading();
    try {
      const [queue, history] = await Promise.all([
        VB.get('/approvals/queue'), VB.get('/approvals/history'),
      ]);
      this.view(`
        <ul class="nav nav-pills mb-3" id="apvTabs">
          <li class="nav-item"><a class="nav-link active" data-bs-toggle="pill" href="#apvQueue">Pending Queue <span class="badge bg-danger ms-1">${queue.data.length}</span></a></li>
          <li class="nav-item"><a class="nav-link" data-bs-toggle="pill" href="#apvHistory">History</a></li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="apvQueue">
            <div class="table-wrap"><table class="table align-middle"><thead><tr>
              <th>RFQ #</th><th>Title</th><th>Product</th><th>Quotes</th><th>Deadline</th><th>Status</th><th class="text-end">Actions</th>
            </tr></thead><tbody>
              ${queue.data.length ? queue.data.map((r) => `<tr>
                <td class="fw-semibold">${VB.escape(r.rfqNumber)}</td>
                <td>${VB.escape(r.title)}</td>
                <td>${VB.escape(r.productName)}</td>
                <td><span class="badge bg-light text-dark border">${r.quotationCount} quote(s)</span></td>
                <td>${VB.date(r.deadline)}</td>
                <td>${VB.badge(r.status)}</td>
                <td class="text-end" style="white-space:nowrap">
                  <button class="btn btn-sm btn-light" onclick="App.go('comparison');setTimeout(()=>App.loadComparison('${r._id}'),300)" title="Compare"><i class="bi bi-bar-chart-steps"></i></button>
                  <button class="btn btn-sm btn-success" onclick="App.approveQuick('${r._id}')"><i class="bi bi-check2"></i></button>
                  <button class="btn btn-sm btn-danger" onclick="App.rejectQuick('${r._id}')"><i class="bi bi-x-lg"></i></button>
                  <button class="btn btn-sm btn-warning" onclick="App.requestChangesQuick('${r._id}')">Changes</button>
                </td></tr>`).join('') : `<tr><td colspan="7">${this.emptyState('bi-check2-all', 'Nothing pending. All caught up!')}</td></tr>`}
            </tbody></table></div>
          </div>
          <div class="tab-pane fade" id="apvHistory">
            <div class="table-wrap"><table class="table align-middle"><thead><tr>
              <th>RFQ #</th><th>Title</th><th>Decision</th><th>By</th><th>Date</th><th>Remarks</th>
            </tr></thead><tbody>
              ${history.data.length ? history.data.map((r) => `<tr>
                <td class="fw-semibold">${VB.escape(r.rfqNumber)}</td>
                <td>${VB.escape(r.title)}</td>
                <td>${VB.badge(r.status)}</td>
                <td>${VB.escape((r.approval && r.approval.decidedBy && r.approval.decidedBy.name) || '-')}</td>
                <td>${VB.date(r.approval && r.approval.decidedAt)}</td>
                <td class="muted">${VB.escape((r.approval && r.approval.remarks) || '-')}</td>
              </tr>`).join('') : `<tr><td colspan="6">${this.emptyState('bi-clock-history', 'No approval history yet')}</td></tr>`}
            </tbody></table></div>
          </div>
        </div>
      `);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  approveQuick(id) {
    this.openModal({
      title: 'Approve RFQ',
      body: `<label class="form-label">Approval Remarks</label><textarea class="form-control" id="f_remarks" rows="3">Approved.</textarea>
        <div class="form-text mt-2">Tip: use "Compare" to accept a specific vendor's quotation.</div>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-success" onclick="App.doSimpleApprove('${id}')">Approve</button>`,
    });
  },
  async doSimpleApprove(id) {
    try { await VB.post(`/approvals/${id}/approve`, { remarks: this.formVal('f_remarks') }); this.closeModal(); VB.toast('RFQ approved.'); this.render_approvals(); }
    catch (e) { VB.toast(e.message, 'error'); }
  },
  rejectQuick(id) {
    this.openModal({
      title: 'Reject RFQ',
      body: `<label class="form-label">Reason for rejection</label><textarea class="form-control" id="f_remarks" rows="3" placeholder="Provide a reason..."></textarea>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-danger" onclick="App.doReject('${id}')">Reject</button>`,
    });
  },
  async doReject(id) {
    try { await VB.post(`/approvals/${id}/reject`, { remarks: this.formVal('f_remarks') }); this.closeModal(); VB.toast('RFQ rejected.'); this.render_approvals(); }
    catch (e) { VB.toast(e.message, 'error'); }
  },
  requestChangesQuick(id) {
    this.openModal({
      title: 'Request Changes',
      body: `<label class="form-label">What changes are required?</label><textarea class="form-control" id="f_remarks" rows="3"></textarea>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-warning" onclick="App.doRequestChanges('${id}')">Send Request</button>`,
    });
  },
  async doRequestChanges(id) {
    try { await VB.post(`/approvals/${id}/request-changes`, { remarks: this.formVal('f_remarks') }); this.closeModal(); VB.toast('Changes requested.'); this.render_approvals(); }
    catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ PURCHASE ORDERS
  async render_purchase_orders() {
    this.loading();
    const canManage = this.can(['Admin', 'Procurement Officer']);
    try {
      const pos = await this.fetchList('/purchase-orders?limit=200');
      this.state.pos = pos;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="poSearch" placeholder="🔍 Search PO..." oninput="App.filterPOs()" />
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn-outline-success" onclick="App.exportCSV('pos.csv', App.state.pos)"><i class="bi bi-file-earmark-spreadsheet"></i> Export</button>
            ${canManage ? '<button class="btn btn-primary" onclick="App.generatePOModal()"><i class="bi bi-plus-lg"></i> Generate PO</button>' : ''}
          </div>
        </div>
        <div class="table-wrap"><table class="table align-middle"><thead><tr>
          <th>PO #</th><th>Vendor</th><th>RFQ</th><th>Product</th><th>Qty</th><th>GST</th><th>Total (₹)</th><th>Status</th><th class="text-end">Actions</th>
        </tr></thead><tbody id="poRows"></tbody></table></div>
      `);
      this.renderPORows(pos);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderPORows(pos) {
    const el = document.getElementById('poRows');
    if (!pos.length) { el.innerHTML = `<tr><td colspan="9">${this.emptyState('bi-receipt-cutoff', 'No purchase orders yet')}</td></tr>`; return; }
    el.innerHTML = pos.map((p) => `
      <tr>
        <td class="fw-semibold">${VB.escape(p.poNumber)}</td>
        <td>${p.vendor ? VB.escape(p.vendor.companyName) : '-'}</td>
        <td>${p.rfq ? VB.escape(p.rfq.rfqNumber) : '-'}</td>
        <td>${VB.escape(p.productName)}</td>
        <td>${p.quantity} ${VB.escape(p.unit || '')}</td>
        <td>${VB.inr(p.taxAmount)}<div class="muted" style="font-size:11px">${p.taxPercent}%</div></td>
        <td class="fw-semibold">${VB.inr(p.totalAmount)}</td>
        <td>${VB.badge(p.status)}</td>
        <td class="text-end" style="white-space:nowrap">
          <button class="btn btn-sm btn-light" onclick="App.pdf('/purchase-orders/${p._id}/pdf','${p.poNumber}.pdf','view')" title="View PDF"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-light" onclick="App.pdf('/purchase-orders/${p._id}/pdf','${p.poNumber}.pdf','download')" title="Download"><i class="bi bi-download"></i></button>
          <button class="btn btn-sm btn-light" onclick="App.pdf('/purchase-orders/${p._id}/pdf','${p.poNumber}.pdf','print')" title="Print"><i class="bi bi-printer"></i></button>
        </td>
      </tr>`).join('');
  },

  filterPOs() {
    const q = this.formVal('poSearch').toLowerCase();
    const f = this.state.pos.filter((p) => (p.poNumber + (p.vendor ? p.vendor.companyName : '') + p.productName).toLowerCase().includes(q));
    this.renderPORows(f);
  },

  async generatePOModal() {
    try {
      const accepted = await this.fetchList('/quotations?status=Accepted&limit=200');
      const existingPOs = this.state.pos.length ? this.state.pos : await this.fetchList('/purchase-orders?limit=200');
      const usedQuotes = new Set(existingPOs.map((p) => String(p.quotation)));
      const candidates = accepted.filter((q) => q.rfq && q.rfq.status === 'Approved' && !usedQuotes.has(String(q._id)));
      if (!candidates.length) {
        return this.openModal({ title: 'Generate Purchase Order', body: this.emptyState('bi-inbox', 'No approved RFQs with an accepted quotation are awaiting a PO. Approve an RFQ and accept a quotation first.') });
      }
      this.openModal({
        title: 'Generate Purchase Order', size: 'modal-lg',
        body: `<p class="muted">Select an accepted quotation to generate a Purchase Order:</p>
          <div class="list-group">
            ${candidates.map((q) => `<label class="list-group-item d-flex align-items-center gap-3">
              <input type="radio" name="poQuote" value="${q._id}" class="form-check-input mt-0">
              <div class="flex-grow-1"><div class="fw-semibold">${q.vendor ? VB.escape(q.vendor.companyName) : '-'} — ${VB.inr(q.totalAmount)}</div>
                <div class="muted small">${q.rfq.rfqNumber} • ${VB.escape(q.rfq.title)} • ${q.deliveryTimeline} days</div></div>
            </label>`).join('')}
          </div>`,
        footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-primary" onclick="App.doGeneratePO()">Generate PO</button>`,
      });
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  async doGeneratePO() {
    const sel = document.querySelector('input[name="poQuote"]:checked');
    if (!sel) return VB.toast('Please select a quotation.', 'error');
    try {
      await VB.post('/purchase-orders', { quotationId: sel.value });
      this.closeModal(); VB.toast('Purchase Order generated.'); this.render_purchase_orders();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ INVOICES
  async render_invoices() {
    this.loading();
    const canManage = this.can(['Admin', 'Procurement Officer']);
    try {
      const invoices = await this.fetchList('/invoices?limit=200');
      this.state.invoices = invoices;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="invSearch" placeholder="🔍 Search invoices..." oninput="App.filterInvoices()" />
          <div class="ms-auto">${canManage ? '<button class="btn btn-primary" onclick="App.generateInvoiceModal()"><i class="bi bi-plus-lg"></i> Generate Invoice</button>' : ''}</div>
        </div>
        <div class="table-wrap"><table class="table align-middle"><thead><tr>
          <th>Invoice #</th><th>PO Ref</th><th>Vendor</th><th>Product</th><th>Total (₹)</th><th>Due Date</th><th>Payment</th><th class="text-end">Actions</th>
        </tr></thead><tbody id="invRows"></tbody></table></div>
      `);
      this.renderInvoiceRows(invoices, canManage);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderInvoiceRows(invoices, canManage) {
    const el = document.getElementById('invRows');
    if (!invoices.length) { el.innerHTML = `<tr><td colspan="8">${this.emptyState('bi-receipt', 'No invoices yet')}</td></tr>`; return; }
    el.innerHTML = invoices.map((i) => `
      <tr>
        <td class="fw-semibold">${VB.escape(i.invoiceNumber)}</td>
        <td>${i.purchaseOrder ? VB.escape(i.purchaseOrder.poNumber) : '-'}</td>
        <td>${i.vendor ? VB.escape(i.vendor.companyName) : '-'}</td>
        <td>${VB.escape(i.productName)}</td>
        <td class="fw-semibold">${VB.inr(i.totalAmount)}</td>
        <td>${VB.date(i.dueDate)}</td>
        <td>${canManage ? `<select class="form-select form-select-sm" style="width:120px" onchange="App.updateInvoiceStatus('${i._id}', this.value)">
          ${(this.meta.invoiceStatuses || []).map((s) => `<option ${i.paymentStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>` : VB.badge(i.paymentStatus)}</td>
        <td class="text-end" style="white-space:nowrap">
          <button class="btn btn-sm btn-light" onclick="App.pdf('/invoices/${i._id}/pdf','${i.invoiceNumber}.pdf','view')" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-light" onclick="App.pdf('/invoices/${i._id}/pdf','${i.invoiceNumber}.pdf','download')" title="Download"><i class="bi bi-download"></i></button>
          <button class="btn btn-sm btn-light" onclick="App.pdf('/invoices/${i._id}/pdf','${i.invoiceNumber}.pdf','print')" title="Print"><i class="bi bi-printer"></i></button>
          ${canManage ? `<button class="btn btn-sm btn-light text-primary" onclick="App.emailInvoice('${i._id}')" title="Email"><i class="bi bi-envelope"></i></button>` : ''}
        </td>
      </tr>`).join('');
  },

  filterInvoices() {
    const q = this.formVal('invSearch').toLowerCase();
    const f = this.state.invoices.filter((i) => (i.invoiceNumber + (i.vendor ? i.vendor.companyName : '') + i.productName).toLowerCase().includes(q));
    this.renderInvoiceRows(f, this.can(['Admin', 'Procurement Officer']));
  },

  async updateInvoiceStatus(id, paymentStatus) {
    try { await VB.put(`/invoices/${id}`, { paymentStatus }); VB.toast(`Invoice marked ${paymentStatus}.`); }
    catch (e) { VB.toast(e.message, 'error'); }
  },

  async emailInvoice(id) {
    try { const r = await VB.post(`/invoices/${id}/email`, {}); VB.toast(r.message || 'Invoice emailed.'); }
    catch (e) { VB.toast(e.message, 'error'); }
  },

  async generateInvoiceModal() {
    try {
      const pos = this.state.pos.length ? this.state.pos : await this.fetchList('/purchase-orders?limit=200');
      const invoices = this.state.invoices.length ? this.state.invoices : await this.fetchList('/invoices?limit=200');
      const invoicedPOs = new Set(invoices.map((i) => String(i.purchaseOrder && (i.purchaseOrder._id || i.purchaseOrder))));
      const candidates = pos.filter((p) => !invoicedPOs.has(String(p._id)));
      if (!candidates.length) {
        return this.openModal({ title: 'Generate Invoice', body: this.emptyState('bi-inbox', 'All purchase orders already have invoices. Generate a PO first.') });
      }
      this.openModal({
        title: 'Generate Invoice', size: 'modal-lg',
        body: `<p class="muted">Select a Purchase Order to invoice:</p>
          <div class="list-group">
            ${candidates.map((p) => `<label class="list-group-item d-flex align-items-center gap-3">
              <input type="radio" name="invPo" value="${p._id}" class="form-check-input mt-0">
              <div class="flex-grow-1"><div class="fw-semibold">${p.poNumber} — ${VB.inr(p.totalAmount)}</div>
                <div class="muted small">${p.vendor ? VB.escape(p.vendor.companyName) : '-'} • ${VB.escape(p.productName)}</div></div>
            </label>`).join('')}
          </div>`,
        footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
          <button class="btn btn-primary" onclick="App.doGenerateInvoice()">Generate Invoice</button>`,
      });
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  async doGenerateInvoice() {
    const sel = document.querySelector('input[name="invPo"]:checked');
    if (!sel) return VB.toast('Please select a purchase order.', 'error');
    try {
      await VB.post('/invoices', { purchaseOrderId: sel.value });
      this.closeModal(); VB.toast('Invoice generated.'); this.render_invoices();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ ACTIVITIES
  async render_activities() {
    this.loading();
    try {
      const items = await this.fetchList('/activities?limit=100');
      this.view(`<div class="card"><div class="card-header">Activity Timeline</div><div class="card-body" id="actTimeline"></div></div>`);
      const el = document.getElementById('actTimeline');
      if (!items.length) { el.innerHTML = this.emptyState('bi-clock-history', 'No activity recorded'); return; }
      el.innerHTML = items.map((a) => `
        <div class="activity-item">
          <div class="activity-dot"><i class="bi bi-record-circle"></i></div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between"><span class="fw-semibold">${VB.escape(a.action)}</span><span class="muted small">${VB.dateTime(a.createdAt)}</span></div>
            <div class="muted" style="font-size:13.5px">${VB.escape(a.description || '')}</div>
            <div class="muted" style="font-size:12px"><i class="bi bi-person"></i> ${VB.escape(a.userName || 'System')}</div>
          </div>
        </div>`).join('');
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  // ================================================================ REPORTS
  async render_reports() {
    this.loading();
    try {
      const [stats, charts, vendors] = await Promise.all([
        VB.get('/dashboard/stats'), VB.get('/dashboard/charts'), this.fetchList('/vendors?limit=200'),
      ]);
      const s = stats.data; const c = charts.data;
      const topVendors = [...vendors].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 8);
      this.view(`
        <div class="d-flex justify-content-end mb-3 gap-2">
          <button class="btn btn-outline-primary" onclick="window.print()"><i class="bi bi-printer"></i> Print / PDF</button>
          <button class="btn btn-primary" onclick="App.exportVendorsCSV()"><i class="bi bi-file-earmark-spreadsheet"></i> Export Vendors (CSV)</button>
        </div>
        <div class="row g-3 mb-1">
          <div class="col-md-3"><div class="kpi indigo"><span class="kpi-label">Total Procurement Spend</span><div class="kpi-value">${VB.inr(s.totalProcurementValue)}</div></div></div>
          <div class="col-md-3"><div class="kpi green"><span class="kpi-label">Purchase Orders</span><div class="kpi-value">${s.purchaseOrders}</div></div></div>
          <div class="col-md-3"><div class="kpi amber"><span class="kpi-label">Invoices</span><div class="kpi-value">${s.invoices}</div></div></div>
          <div class="col-md-3"><div class="kpi blue"><span class="kpi-label">Approved RFQs</span><div class="kpi-value">${s.approvedRFQs}</div></div></div>
        </div>
        <div class="row g-3 mt-1">
          <div class="col-lg-6"><div class="card"><div class="card-header">Category-wise Spending</div><div class="card-body"><canvas id="rptCat" height="200"></canvas></div></div></div>
          <div class="col-lg-6"><div class="card"><div class="card-header">Monthly Procurement Trend</div><div class="card-body"><canvas id="rptTrend" height="200"></canvas></div></div></div>
        </div>
        <div class="card mt-3"><div class="card-header">Vendor Performance Report</div>
          <div class="table-wrap" style="box-shadow:none;border:0"><table class="table mb-0"><thead><tr><th>Vendor</th><th>Category</th><th>Rating</th><th>Performance</th><th>Status</th></tr></thead><tbody>
            ${topVendors.map((v) => `<tr><td class="fw-semibold">${VB.escape(v.companyName)}</td><td>${VB.badge(v.category)}</td><td>${VB.stars(v.rating)}</td>
              <td><div class="progress" style="height:6px;width:120px"><div class="progress-bar bg-success" style="width:${v.performanceScore}%"></div></div>${v.performanceScore}/100</td><td>${VB.badge(v.status)}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
      `);
      Object.values(this.charts).forEach((ch) => ch && ch.destroy()); this.charts = {};
      const palette = ['#4f46e5', '#6366f1', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b'];
      this.charts.rptCat = new Chart('rptCat', { type: 'pie', data: { labels: c.spendingByCategory.labels, datasets: [{ data: c.spendingByCategory.values, backgroundColor: palette }] }, options: { plugins: { legend: { position: 'right' } } } });
      this.charts.rptTrend = new Chart('rptTrend', { type: 'bar', data: { labels: c.monthlyTrend.labels, datasets: [{ label: '₹', data: c.monthlyTrend.values, backgroundColor: '#4f46e5', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } });
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  async exportVendorsCSV() {
    try {
      const vendors = await this.fetchList('/vendors?limit=500');
      const head = ['Vendor ID', 'Company', 'Contact', 'Email', 'Phone', 'GST', 'Category', 'Status', 'Rating', 'Performance'];
      const rows = vendors.map((v) => [v.vendorId, v.companyName, v.contactPerson, v.email, v.phone, v.gstNumber, v.category, v.status, v.rating, v.performanceScore]);
      const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendors-report.csv'; a.click();
      VB.toast('Vendor report exported.');
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  // ================================================================ USERS (Admin)
  async render_users() {
    this.loading();
    try {
      const users = await this.fetchList('/users?limit=200');
      this.state.users = users;
      this.view(`
        <div class="table-toolbar">
          <input class="form-control search" id="uSearch" placeholder="🔍 Search users..." oninput="App.filterUsers()" />
          <div class="ms-auto"><button class="btn btn-primary" onclick="App.userForm()"><i class="bi bi-plus-lg"></i> Add User</button></div>
        </div>
        <div class="table-wrap"><table class="table align-middle"><thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th class="text-end">Actions</th>
        </tr></thead><tbody id="userRows"></tbody></table></div>
      `);
      this.renderUserRows(users);
    } catch (e) { this.view(this.emptyState('bi-exclamation-triangle', e.message)); }
  },

  renderUserRows(users) {
    const el = document.getElementById('userRows');
    if (!users.length) { el.innerHTML = `<tr><td colspan="6">${this.emptyState('bi-person', 'No users')}</td></tr>`; return; }
    el.innerHTML = users.map((u) => `
      <tr>
        <td class="fw-semibold">${VB.escape(u.name)}</td>
        <td>${VB.escape(u.email)}</td>
        <td>${VB.badge(u.role)}</td>
        <td>${VB.badge(u.status)}</td>
        <td>${VB.date(u.createdAt)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-light" onclick="App.userForm('${u._id}')" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-light text-danger" onclick="App.deleteUser('${u._id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  },

  filterUsers() {
    const q = this.formVal('uSearch').toLowerCase();
    this.renderUserRows(this.state.users.filter((u) => (u.name + u.email + u.role).toLowerCase().includes(q)));
  },

  userForm(id) {
    const u = id ? this.state.users.find((x) => x._id === id) : {};
    const roles = this.meta.roles || ALL;
    this.openModal({
      title: id ? 'Edit User' : 'Add User',
      body: `<form class="row g-3">
        <div class="col-12"><label class="form-label">Full Name *</label><input class="form-control" id="f_name" value="${VB.escape(u.name || '')}"></div>
        <div class="col-12"><label class="form-label">Email *</label><input type="email" class="form-control" id="f_email" value="${VB.escape(u.email || '')}" ${id ? 'readonly' : ''}></div>
        ${id ? '' : '<div class="col-12"><label class="form-label">Password</label><input type="password" class="form-control" id="f_password" placeholder="Default: password123"></div>'}
        <div class="col-md-6"><label class="form-label">Role</label><select class="form-select" id="f_role">${roles.map((r) => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="col-md-6"><label class="form-label">Status</label><select class="form-select" id="f_status"><option ${u.status === 'Active' ? 'selected' : ''}>Active</option><option ${u.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>
      </form>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-primary" onclick="App.saveUser('${id || ''}')">${id ? 'Update' : 'Create'} User</button>`,
    });
  },

  async saveUser(id) {
    const payload = { name: this.formVal('f_name'), role: this.formVal('f_role'), status: this.formVal('f_status') };
    if (!id) { payload.email = this.formVal('f_email'); payload.password = this.formVal('f_password') || 'password123'; }
    if (!payload.name) return VB.toast('Name is required.', 'error');
    try {
      if (id) await VB.put(`/users/${id}`, payload);
      else { if (!payload.email) return VB.toast('Email is required.', 'error'); await VB.post('/users', payload); }
      this.closeModal(); VB.toast(`User ${id ? 'updated' : 'created'}.`); this.render_users();
    } catch (e) { VB.toast(e.message, 'error'); }
  },

  deleteUser(id) {
    this.confirm('Delete this user account?', async () => {
      try { await VB.del(`/users/${id}`); VB.toast('User deleted.'); this.render_users(); }
      catch (e) { VB.toast(e.message, 'error'); }
    });
  },

  // ================================================================ NOTIFICATIONS
  async loadNotifications() {
    try {
      const res = await VB.get('/notifications');
      document.getElementById('notifDot').classList.toggle('d-none', res.unread === 0);
      const list = document.getElementById('notifList');
      if (!res.data.length) { list.innerHTML = `<div class="p-3 text-center muted">No notifications</div>`; return; }
      list.innerHTML = res.data.map((n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="App.readNotification('${n._id}')">
          <div class="t">${VB.escape(n.title)}</div>
          <div class="m">${VB.escape(n.message || '')}</div>
          <div class="time">${VB.timeAgo(n.createdAt)} • ${VB.escape(n.type)}</div>
        </div>`).join('');
    } catch (e) { /* silent */ }
  },
  async readNotification(id) { try { await VB.put(`/notifications/${id}/read`, {}); this.loadNotifications(); } catch (e) {} },
  async markAllNotifications(e) { if (e) e.preventDefault(); try { await VB.put('/notifications/read-all', {}); this.loadNotifications(); VB.toast('All notifications marked read.'); } catch (err) {} },

  // ---------------------------------------------------------------- confirm
  confirm(message, onYes) {
    this.openModal({
      title: 'Please confirm',
      body: `<p class="mb-0">${VB.escape(message)}</p>`,
      footer: `<button class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
        <button class="btn btn-danger" id="confirmYes">Confirm</button>`,
    });
    setTimeout(() => {
      const btn = document.getElementById('confirmYes');
      if (btn) btn.onclick = () => { this.closeModal(); onYes(); };
    }, 50);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
