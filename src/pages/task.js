import { initPage } from '../common.js';
import { supabase } from '../services/supabase.js';

initPage('task');

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#title');
const descriptionInput = document.querySelector('#description');
const statusInput = document.querySelector('#status');
const fileInput = document.querySelector('#task-files');
const heading = document.querySelector('h1');

const params = new URLSearchParams(window.location.search);
const projectId = params.get('project_id');
const taskId = params.get('id');

const filesSection = document.createElement('div');
filesSection.className = 'mt-4';
filesSection.innerHTML = `
  <h2 class="h6">Прикачени файлове</h2>
  <div id="attachments-list" class="list-group"></div>
`;
form?.append(filesSection);

const attachmentsList = document.querySelector('#attachments-list');

function showAttachmentsMessage(message) {
  const item = document.createElement('div');
  item.className = 'list-group-item text-muted';
  item.textContent = message;
  attachmentsList.replaceChildren(item);
}

async function loadAttachments(currentTaskId) {
  const { data: attachments, error } = await supabase
    .from('attachments')
    .select('id, file_name, storage_path')
    .eq('task_id', currentTaskId)
    .order('created_at', { ascending: false });

  if (error) {
    showAttachmentsMessage(`Не успях да заредя файловете: ${error.message}`);
    return;
  }

  if (!attachments.length) {
    showAttachmentsMessage('Няма прикачени файлове.');
    return;
  }

  const items = await Promise.all(
    attachments.map(async (attachment) => {
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex justify-content-between align-items-center gap-3';

      const name = document.createElement('span');
      name.textContent = attachment.file_name;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline-primary btn-sm';
      button.textContent = 'Изтегли';

      button.addEventListener('click', async () => {
        button.disabled = true;

        const { data, error: downloadError } = await supabase.storage
          .from('task-files')
          .createSignedUrl(attachment.storage_path, 60);

        button.disabled = false;

        if (downloadError) {
          alert(`Не успях да подготвя файла за изтегляне: ${downloadError.message}`);
          return;
        }

        window.location.href = data.signedUrl;
      });

      const deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.className = 'btn btn-outline-danger btn-sm';
deleteButton.textContent = 'Изтрий';

deleteButton.addEventListener('click', async () => {
  if (!confirm(`Да изтрия файла „${attachment.file_name}“?`)) return;

  deleteButton.disabled = true;

  const { error: storageError } = await supabase.storage
    .from('task-files')
    .remove([attachment.storage_path]);

  if (storageError) {
    deleteButton.disabled = false;
    alert(`Файлът не беше изтрит: ${storageError.message}`);
    return;
  }

  const { error: rowError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachment.id);

  if (rowError) {
    alert(`Файлът е изтрит от хранилището, но записът не беше премахнат: ${rowError.message}`);
    await loadAttachments(currentTaskId);
    return;
  }

  await loadAttachments(currentTaskId);
});

item.append(name, button, deleteButton);

      return item;
    })
  );

  attachmentsList.replaceChildren(...items);
}

async function start() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    alert('Първо влез в профила си.');
    window.location.href = '/login.html';
    return;
  }

  if (!projectId) {
    alert('Не е избран проект. Отвори проекта и натисни „Нова задача“ оттам.');
    window.location.href = '/projects.html';
    return;
  }

  if (!taskId) {
    showAttachmentsMessage('Запази задачата, преди да качиш файлове.');
    return;
  }

  heading.textContent = 'Редакция на задача';

  const { data: task, error } = await supabase
    .from('tasks')
    .select('title, description, status')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    alert(`Не успях да заредя задачата: ${error.message}`);
    return;
  }

  titleInput.value = task.title;
  descriptionInput.value = task.description || '';
  statusInput.value = task.status;

  await loadAttachments(taskId);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    alert('Сесията ви липсва. Влез отново.');
    window.location.href = '/login.html';
    return;
  }

  if (!projectId) {
    alert('Не е избран проект.');
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Запазва се…';

  try {
    const taskData = {
      project_id: projectId,
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      status: statusInput.value,
    };

    let savedTaskId = taskId;

    if (taskId) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', taskId)
        .eq('project_id', projectId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...taskData, created_by: user.id })
        .select('id')
        .single();

      if (error) throw error;
      savedTaskId = data.id;
    }

    const selectedFiles = Array.from(fileInput?.files || []);

    for (const file of selectedFiles) {
      const safeName = file.name.replace(/[^\w.-]+/g, '_');
      const storagePath = `${savedTaskId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase
        .from('attachments')
        .insert({
          task_id: savedTaskId,
          file_name: file.name,
          storage_path: storagePath,
          uploaded_by: user.id,
        });

      if (metadataError) {
        await supabase.storage.from('task-files').remove([storagePath]);
        throw metadataError;
      }
    }

    window.location.href =
      `/task.html?id=${encodeURIComponent(savedTaskId)}` +
      `&project_id=${encodeURIComponent(projectId)}`;
  } catch (error) {
    alert(`Не успях да запазя задачата или файла: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Запази';
  }
});

start();

