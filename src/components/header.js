import { supabase } from '../services/supabase.js';

const mainLinks = [
  { page: 'projects', href: '/projects.html', label: 'Проекти' },
  { page: 'admin', href: '/admin.html', label: 'Администрация' },
];

const authLinks = [
  { page: 'login', href: '/login.html', label: 'Вход' },
  { page: 'register', href: '/register.html', label: 'Регистрация' },
];

function renderLinks(links, activePage) {
  return links
    .map(({ page, href, label }) => {
      const active = page === activePage;
      return `
        <li class="nav-item">
          <a class="nav-link ${active ? 'active' : ''}" href="${href}"
             ${active ? 'aria-current="page"' : ''}>${label}</a>
        </li>`;
    })
    .join('');
}

function renderAuthLinks(authNav, user, activePage) {
  if (!user) {
    authNav.innerHTML = renderLinks(authLinks, activePage);
    return;
  }

  authNav.replaceChildren();

  const userItem = document.createElement('li');
  userItem.className = 'nav-item d-flex align-items-center';

  const userLabel = document.createElement('span');
  userLabel.className = 'navbar-text me-3';
  userLabel.textContent = user.email || 'Влязъл потребител';

  const logoutButton = document.createElement('button');
  logoutButton.type = 'button';
  logoutButton.className = 'btn btn-outline-light btn-sm';
  logoutButton.textContent = 'Изход';

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`Изходът неуспешен: ${error.message}`);
      logoutButton.disabled = false;
      return;
    }

    window.location.href = '/login.html';
  });

  userItem.append(userLabel, logoutButton);
  authNav.append(userItem);
}

export function renderHeader(activePage) {
  const header = document.querySelector('#app-header');
  if (!header) return;

  header.innerHTML = `
    <nav class="navbar navbar-expand-md navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand fw-bold" href="/">TeamTasks</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                data-bs-target="#mainNav" aria-controls="mainNav"
                aria-expanded="false" aria-label="Меню">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto">${renderLinks(mainLinks, activePage)}</ul>
          <ul class="navbar-nav" id="auth-nav"></ul>
        </div>
      </div>
    </nav>`;

  const authNav = header.querySelector('#auth-nav');

  supabase.auth.getUser().then(({ data, error }) => {
    if (error) {
      renderAuthLinks(authNav, null, activePage);
      return;
    }

    renderAuthLinks(authNav, data.user, activePage);
  });
}

