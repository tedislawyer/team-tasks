import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('project');

const projectId = new URLSearchParams(window.location.search).get('id');
const title = document.querySelector('#project-title');
const description = document.querySelector('#project-description');
const tasksList = document.querySelector('#tasks-list');
const newTaskLink = document.querySelector('a[href="/task.html"]');

if (newTaskLink && projectId) {
  newTaskLink.href = `/task.html?project_id=${encodeURIComponent(projectId)}`;
}

async function loadProject() {
  if (!projectId) {
    title.textContent = 'Проектът не е избран';
    description.textContent = 'Върни се към списъка с проекти и отвори проект.';
    return;
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', projectId)
    .single();

  if (projectError) {
    title.textContent = 'Не успях да заредя проекта';
    description.textContent = projectError.message;
    return;
  }

  title.textContent = project.name;
  description.textContent = project.description || 'Няма описание за този проект.';

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, description, status')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (tasksError) {
    tasksList.textContent = `Не успях да заредя задачите: ${tasksError.message}`;
    return;
  }

  if (tasks.length === 0) {
    tasksList.textContent = 'Все още няма задачи по този проект.';
    return;
  }

  tasksList.replaceChildren(
    ...tasks.map((task) => {
      const item = document.createElement('a');
      item.className = 'list-group-item list-group-item-action';
      item.href = `/task.html?id=${encodeURIComponent(task.id)}&project_id=${encodeURIComponent(projectId)}`;

      const heading = document.createElement('div');
      heading.className = 'fw-semibold';
      heading.textContent = task.title;

      const detail = document.createElement('div');
      detail.className = 'small text-muted';
      detail.textContent = `${task.status} — ${task.description || 'Без описание'}`;

      item.append(heading, detail);
      return item;
    })
  );
}

loadProject();

