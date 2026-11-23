import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('admin');

const tableBody = document.querySelector('#users-table');

async function loadAdminUsers() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    alert('Влез в профила си, за да отвориш администрацията.');
    window.location.href = '/login.html';
    return;
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="text-danger">Тази страница е само за администратор.</td></tr>';
    return;
  }

  const { data: users, error } = await supabase.rpc('admin_list_users');

  if (error) {
    tableBody.innerHTML =
      `<tr><td colspan="4" class="text-danger">Не успях да заредя потребителите: ${error.message}</td></tr>`;
    return;
  }

  if (!users.length) {
    tableBody.innerHTML =
      '<tr><td colspan="4" class="text-muted">Няма регистрирани потребители.</td></tr>';
    return;
  }

  tableBody.replaceChildren(
    ...users.map((item) => {
      const row = document.createElement('tr');

      for (const value of [
        item.full_name || '—',
        item.email || '—',
        item.role || 'user',
      ]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }

      const actionCell = document.createElement('td');
      actionCell.textContent = item.id === user.id ? 'Ти' : '';
      row.append(actionCell);

      return row;
    })
  );
}

loadAdminUsers();

