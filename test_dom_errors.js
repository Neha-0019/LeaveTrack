
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('templates/index.html', 'utf-8');

const dom = new JSDOM(html, {
  url: 'http://127.0.0.1:5000/',
  runScripts: 'dangerously',
  resources: 'usable'
});

dom.window.console.error = (...args) => {
    console.log('CONSOLE ERROR:', ...args);
};

dom.window.fetch = async (url, options) => {
  if (url === '/leaves') {
    return { ok: true, json: async () => [{id: 1, employee_id: 1, employee_name: 'Alice Manager', start_date: '2026-01-01', end_date: '2026-01-02', status: 'PENDING', reason: 'Test', half_day_start: false, half_day_end: false}] };
  }
  if (url.startsWith('/employees/')) {
    return { ok: true, json: async () => ({id: 1, name: 'Alice Manager', role: 'manager', leave_balance: 20, token: 'abc'}) };
  }
  return { ok: false, json: async () => ({}) };
};

dom.window.lucide = { createIcons: () => {} }; 

setTimeout(() => {
    // Attempt login to test if DOM starts correctly
    dom.window.document.getElementById('login_id').value = '1';
    dom.window.handleLogin().then(() => {
        console.log('Login simulated successfully.');
    }).catch(e => console.log('ERROR:', e));
}, 500);
