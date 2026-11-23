import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: page('./index.html'),
        login: page('./login.html'),
        register: page('./register.html'),
        projects: page('./projects.html'),
        project: page('./project.html'),
        task: page('./task.html'),
        admin: page('./admin.html'),
      },
    },
  },
});
