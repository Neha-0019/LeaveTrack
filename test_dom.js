
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('templates/index.html', 'utf-8');

const dom = new JSDOM(html, {
  url: 'http://127.0.0.1:5000/',
  runScripts: 'dangerously',
  resources: 'usable'
});

dom.window.fetch = async (url, options) => {
  if (url === '/leaves') {
    return { ok: true, json: async () => [{id: 1, employee_id: 1, start_date: '2026-01-01', end_date: '2026-01-02', status: 'PENDING', reason: 'Test'}] };
  }
  if (url.startsWith('/employees/')) {
    return { ok: true, json: async () => ({id: 1, name: 'Alice Manager', role: 'manager', leave_balance: 20}) };
  }
  return { ok: false, json: async () => ({}) };
};

dom.window.fetchUser = async (id) => {
    return {id: 1, name: 'Alice Manager', role: 'manager', leave_balance: 20, token: 'abc'};
};

dom.window.currentUser = {id: 1, name: 'Alice Manager', role: 'manager', leave_balance: 20, token: 'abc'};
dom.window.lucide = { createIcons: () => {} }; 

setTimeout(() => {
    dom.window.loadDashboardData().then(() => {
        const row = dom.window.document.querySelector('.clickable-row');
        if (!row) return console.log('No row');
        console.log('Before click:', dom.window.document.getElementById('tracker_1').className);
        row.click();
        console.log('After click:', dom.window.document.getElementById('tracker_1').className);
    });
}, 500);
