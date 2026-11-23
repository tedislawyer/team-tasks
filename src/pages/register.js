import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('register');

const form = document.querySelector('#register-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fullName = document.querySelector('#full-name').value.trim();
  const email = document.querySelector('#email').value.trim();
  const password = document.querySelector('#password').value;
  const button = form.querySelector('button[type="submit"]');

  button.disabled = true;
  button.textContent = 'Регистрираме…';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  button.disabled = false;
  button.textContent = 'Регистрация';

  if (error) {
    alert(`Регистрацията не мина: ${error.message}`);
    return;
  }

  alert('Регистрацията е изпратена. Провери имейла си за потвърждение.');
  window.location.href = '/login.html';
});
