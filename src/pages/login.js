import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('login');

const form = document.querySelector('#login-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const button = form.querySelector('button[type="submit"]');

  button.disabled = true;
  button.textContent = 'Влизане…';

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  button.disabled = false;
  button.textContent = 'Вход';

  if (error) {
    alert(`Входът неуспешен: ${error.message}`);
    return;
  }

  window.location.href = '/projects.html';
});
