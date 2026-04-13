const state = {
  token: localStorage.getItem('admin_token'),
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  view: 'dashboard',
};

const titles = {
  dashboard: 'Πίνακας Ελέγχου',
  shows: 'Παραστάσεις',
  schedule: 'Πρόγραμμα',
  theatres: 'Θέατρα',
  reservations: 'Κρατήσεις',
  users: 'Χρήστες',
};

const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const main = document.getElementById('main-content');
const pageTitle = document.getElementById('page-title');
const headerUsername = document.getElementById('header-username');
const loading = document.getElementById('loading-overlay');
const loginError = document.getElementById('login-error');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function money(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function showLoading(show) {
  loading.classList.toggle('hidden', !show);
}

function toast(message, type = 'ok') {
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'error' : ''}`;
  item.textContent = message;
  document.getElementById('toast-container').appendChild(item);
  setTimeout(() => item.remove(), 3500);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) logout(false);
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_user', JSON.stringify(user));
}

function logout(showToast = true) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  app.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  if (showToast) toast('Αποσυνδέθηκες');
}

function showApp() {
  loginScreen.classList.add('hidden');
  app.classList.remove('hidden');
  headerUsername.textContent = state.user?.name || 'Admin';
  renderView(state.view);
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.classList.add('hidden');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    showLoading(true);
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!data.user?.is_admin) {
      throw new Error('Ο λογαριασμός δεν έχει δικαιώματα διαχειριστή');
    }
    setSession(data.token, data.user);
    showApp();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  } finally {
    showLoading(false);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => logout());

document.querySelectorAll('.nav-item').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    state.view = link.dataset.view;
    renderView(state.view);
  });
});

async function renderView(view) {
  pageTitle.textContent = titles[view];
  document.querySelectorAll('.nav-item').forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  try {
    showLoading(true);
    if (view === 'dashboard') await renderDashboard();
    if (view === 'shows') await renderShows();
    if (view === 'schedule') await renderSchedule();
    if (view === 'theatres') await renderTheatres();
    if (view === 'reservations') await renderReservations();
    if (view === 'users') await renderUsers();
  } catch (err) {
    main.innerHTML = `<div class="card"><p class="muted">${escapeHtml(err.message)}</p></div>`;
    toast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function renderDashboard() {
  const [stats, recent, upcoming] = await Promise.all([
    api('/api/admin/stats'),
    api('/api/admin/recent-reservations'),
    api('/api/admin/upcoming-shows'),
  ]);

  main.innerHTML = `
    <div class="grid stats-grid">
      ${stat('Χρήστες', stats.total_users)}
      ${stat('Παραστάσεις', stats.total_shows)}
      ${stat('Κρατήσεις', stats.total_reservations)}
      ${stat('Έσοδα', money(stats.total_revenue))}
      ${stat('Προσεχείς ώρες', stats.upcoming_shows)}
      ${stat('Πληρότητα', `${stats.occupancy}%`)}
    </div>
    <div class="grid two-col" style="margin-top:16px">
      <div class="card">
        <h3 class="section-title">Πρόσφατες κρατήσεις</h3>
        ${simpleList(recent, (r) => `${r.user_name} - ${r.show_title} - ${money(r.total)}`)}
      </div>
      <div class="card">
        <h3 class="section-title">Προσεχείς παραστάσεις</h3>
        ${simpleList(upcoming, (s) => `${formatDate(s.date)} ${s.time.slice(0, 5)} - ${s.show_title} (${s.available_seats}/${s.total_seats})`)}
      </div>
    </div>
  `;
}

function stat(label, value) {
  return `
    <div class="stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function simpleList(items, render) {
  if (!items.length) return '<p class="muted">Δεν υπάρχουν δεδομένα.</p>';
  return `<table><tbody>${items.map((item) => `<tr><td>${escapeHtml(render(item))}</td></tr>`).join('')}</tbody></table>`;
}

async function renderShows() {
  const [shows, theatres] = await Promise.all([
    api('/api/admin/shows'),
    api('/api/admin/theatres'),
  ]);

  main.innerHTML = `
    <div class="grid two-col">
      <form class="card form-grid" id="show-form">
        <h3 class="section-title">Νέα παράσταση</h3>
        ${selectField('theatre_id', 'Θέατρο', theatres.map((t) => [t.theatre_id, t.name]))}
        ${inputField('title', 'Τίτλος')}
        ${textareaField('description', 'Περιγραφή')}
        ${inputField('duration', 'Διάρκεια λεπτά', 'number')}
        ${inputField('age_rating', 'Ηλικιακή σήμανση', 'text', '12+')}
        ${inputField('genre', 'Είδος', 'text', 'Τραγωδία')}
        <button class="btn btn-primary">Δημιουργία</button>
      </form>
      <div class="card">
        <h3 class="section-title">Παραστάσεις</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Τίτλος</th><th>Θέατρο</th><th>Είδος</th><th>Κρατήσεις</th><th>Έσοδα</th><th></th></tr></thead>
            <tbody>
              ${shows.map((show) => `
                <tr>
                  <td>${escapeHtml(show.title)}</td>
                  <td>${escapeHtml(show.theatre_name)}</td>
                  <td>${escapeHtml(show.genre || '-')}</td>
                  <td>${show.reservation_count}</td>
                  <td>${money(show.revenue)}</td>
                  <td><button class="btn btn-danger" data-action="delete-show" data-id="${show.show_id}">Διαγραφή</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('show-form').addEventListener('submit', handleCreateShow);
}

async function renderTheatres() {
  const theatres = await api('/api/admin/theatres');
  main.innerHTML = `
    <div class="grid two-col">
      <form class="card form-grid" id="theatre-form">
        <h3 class="section-title">Νέο θέατρο</h3>
        ${inputField('name', 'Όνομα')}
        ${inputField('location', 'Τοποθεσία')}
        ${textareaField('description', 'Περιγραφή')}
        <button class="btn btn-primary">Δημιουργία</button>
      </form>
      <div class="card">
        <h3 class="section-title">Θέατρα</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Όνομα</th><th>Τοποθεσία</th><th>Περιγραφή</th><th></th></tr></thead>
            <tbody>
              ${theatres.map((t) => `
                <tr>
                  <td>${escapeHtml(t.name)}</td>
                  <td>${escapeHtml(t.location)}</td>
                  <td>${escapeHtml(t.description || '-')}</td>
                  <td><button class="btn btn-danger" data-action="delete-theatre" data-id="${t.theatre_id}">Διαγραφή</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.getElementById('theatre-form').addEventListener('submit', handleCreateTheatre);
}

async function renderSchedule() {
  const [showtimes, shows] = await Promise.all([
    api('/api/admin/showtimes'),
    api('/api/admin/shows'),
  ]);

  main.innerHTML = `
    <div class="grid two-col">
      <form class="card form-grid" id="showtime-form">
        <h3 class="section-title">Νέα ώρα παράστασης</h3>
        ${selectField('show_id', 'Παράσταση', shows.map((s) => [s.show_id, s.title]))}
        ${inputField('date', 'Ημερομηνία', 'date')}
        ${inputField('time', 'Ώρα', 'time')}
        ${inputField('hall', 'Αίθουσα')}
        ${inputField('total_seats', 'Σύνολο θέσεων', 'number', '120')}
        ${inputField('vip_price', 'Τιμή VIP', 'number', '35')}
        ${inputField('std_price', 'Τιμή κανονική', 'number', '20')}
        ${inputField('stu_price', 'Τιμή φοιτητική', 'number', '12')}
        <button class="btn btn-primary">Δημιουργία</button>
      </form>
      <div class="card">
        <h3 class="section-title">Πρόγραμμα</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ημερομηνία</th><th>Ώρα</th><th>Παράσταση</th><th>Αίθουσα</th><th>Θέσεις</th><th></th></tr></thead>
            <tbody>
              ${showtimes.map((st) => `
                <tr>
                  <td>${formatDate(st.date)}</td>
                  <td>${escapeHtml(st.time.slice(0, 5))}</td>
                  <td>${escapeHtml(st.show_title)}</td>
                  <td>${escapeHtml(st.hall)}</td>
                  <td>${st.available_seats}/${st.total_seats}</td>
                  <td><button class="btn btn-danger" data-action="delete-showtime" data-id="${st.showtime_id}">Διαγραφή</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.getElementById('showtime-form').addEventListener('submit', handleCreateShowtime);
}

async function renderReservations() {
  const reservations = await api('/api/admin/reservations');
  main.innerHTML = `
    <div class="card">
      <h3 class="section-title">Κρατήσεις</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Χρήστης</th><th>Παράσταση</th><th>Ημερομηνία</th><th>Κατάσταση</th><th>Σύνολο</th><th></th></tr></thead>
          <tbody>
            ${reservations.map((r) => `
              <tr>
                <td>#${r.reservation_id}</td>
                <td>${escapeHtml(r.user_name)}<br><span class="muted">${escapeHtml(r.user_email)}</span></td>
                <td>${escapeHtml(r.show_title)}<br><span class="muted">${escapeHtml(r.theatre_name)}</span></td>
                <td>${formatDate(r.date)} ${escapeHtml(r.time.slice(0, 5))}</td>
                <td><span class="status status-${r.status}">${escapeHtml(r.status)}</span></td>
                <td>${money(r.total)}</td>
                <td>${r.status === 'confirmed' ? `<button class="btn btn-danger" data-action="cancel-reservation" data-id="${r.reservation_id}">Ακύρωση</button>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderUsers() {
  const users = await api('/api/admin/users');
  main.innerHTML = `
    <div class="card">
      <h3 class="section-title">Χρήστες</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Όνομα</th><th>Email</th><th>Admin</th><th>Κρατήσεις</th><th>Σύνολο</th></tr></thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td>#${u.user_id}</td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${u.is_admin ? 'Ναι' : 'Όχι'}</td>
                <td>${u.reservation_count}</td>
                <td>${money(u.total_spent)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function inputField(name, label, type = 'text', value = '') {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" required />
    </div>
  `;
}

function textareaField(name, label) {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}"></textarea>
    </div>
  `;
}

function selectField(name, label, options) {
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" required>
        ${options.map(([value, text]) => `<option value="${value}">${escapeHtml(text)}</option>`).join('')}
      </select>
    </div>
  `;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function handleCreateShow(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  data.theatre_id = Number(data.theatre_id);
  data.duration = Number(data.duration);
  await submit('/api/admin/shows', data, 'Η παράσταση δημιουργήθηκε');
}

async function handleCreateTheatre(event) {
  event.preventDefault();
  await submit('/api/admin/theatres', formData(event.currentTarget), 'Το θέατρο δημιουργήθηκε');
}

async function handleCreateShowtime(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  ['show_id', 'total_seats', 'vip_price', 'std_price', 'stu_price'].forEach((key) => {
    data[key] = Number(data[key]);
  });
  await submit('/api/admin/showtimes', data, 'Η ώρα παράστασης δημιουργήθηκε');
}

async function submit(path, data, message) {
  try {
    showLoading(true);
    await api(path, { method: 'POST', body: JSON.stringify(data) });
    toast(message);
    renderView(state.view);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    showLoading(false);
  }
}

main.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const confirmText = {
    'delete-show': 'Να διαγραφεί αυτή η παράσταση;',
    'delete-theatre': 'Να διαγραφεί αυτό το θέατρο;',
    'delete-showtime': 'Να διαγραφεί αυτή η ώρα παράστασης;',
    'cancel-reservation': 'Να ακυρωθεί αυτή η κράτηση;',
  }[action];

  if (!confirm(confirmText)) return;

  const paths = {
    'delete-show': `/api/admin/shows/${id}`,
    'delete-theatre': `/api/admin/theatres/${id}`,
    'delete-showtime': `/api/admin/showtimes/${id}`,
    'cancel-reservation': `/api/admin/reservations/${id}`,
  };

  try {
    showLoading(true);
    await api(paths[action], { method: 'DELETE' });
    toast('Η ενέργεια ολοκληρώθηκε');
    renderView(state.view);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    showLoading(false);
  }
});

if (state.token && state.user?.is_admin) {
  showApp();
} else {
  logout(false);
}
