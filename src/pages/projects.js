import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('projects');

const newProjectButton = document.querySelector('#new-project-btn');
const projectsList = document.querySelector('#projects-list');

function showMessage(message, className = 'text-muted') {
  const paragraph = document.createElement('p');
  paragraph.className = className;
  paragraph.textContent = message;
  projectsList.replaceChildren(paragraph);
}

function renderProjects(projects) {
  if (projects.length === 0) {
    showMessage('Все още няма проекти.');
    return;
  }

  const cards = projects.map((project) => {
    const card = document.createElement('div');
    card.className = 'col-12 col-md-6 col-lg-4';

    const link = document.createElement('a');
    link.href = `/project.html?id=${encodeURIComponent(project.id)}`;
    link.className = 'card card-body h-100 text-decoration-none shadow-sm';

    const title = document.createElement('h2');
    title.className = 'h5 text-primary';
    title.textContent = project.name;

    const description = document.createElement('p');
    description.className = 'text-muted mb-0';
    description.textContent = project.description || 'Отвори проекта, за да видиш задачите.';

    link.append(title, description);
    card.append(link);
    return card;
  });

  projectsList.replaceChildren(...cards);
}

async function loadProjects() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(`Не успях да заредя проектите: ${error.message}`, 'text-danger');
    return;
  }

  renderProjects(projects);
}

async function checkUserAndLoadProjects() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    showMessage(`Грешка при проверка на профила: ${error.message}`, 'text-danger');
    return;
  }

  if (!user) {
    showMessage('За да виждаш и създаваш проекти, първо влез в профила си.');
    return;
  }

  await loadProjects();
}

newProjectButton?.addEventListener('click', async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    alert('Първо влез в профила си, за да създадеш проект.');
    window.location.href = '/login.html';
    return;
  }

  const name = prompt('Въведи име на проекта:');
  if (!name || !name.trim()) return;

  newProjectButton.disabled = true;

  const { error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      owner_id: user.id,
    });

  newProjectButton.disabled = false;

  if (error) {
    alert(`Проектът не беше запазен: ${error.message}`);
    return;
  }

  await loadProjects();
});

checkUserAndLoadProjects();
